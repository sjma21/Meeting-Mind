import { Hono } from "hono";
import { authMiddleware } from "../lib/auth.js";
import { supabase } from "../lib/supabase.js";
import { getApiKeys } from "../services/apiKeys.js";
import {
  createBot,
  getBotStatus,
  getBotTranscript,
  parseTranscript,
  removeBot,
  mapRecallStatus,
} from "../services/recall.js";
import { analyzeMeetingTranscript } from "../services/analysisService.js";

const meetings = new Hono<{ Variables: { userId: string } }>();

meetings.use("*", authMiddleware);

// ─── Shared helper ────────────────────────────────────────────────────────────

interface MeetingRow {
  id: string;
  user_id: string;
  created_at: string;
  status: string;
  recall_bot_id: string | null;
  duration: number | null;
  transcript: string | null;
  participant_names: { manager?: string; employee?: string } | null;
}

async function finalizeMeeting(
  meeting: MeetingRow,
  recallKey: string
): Promise<{ transcript: string; duration: number }> {
  let text = "";
  let segmentCount = 0;

  try {
    const raw = await getBotTranscript(meeting.recall_bot_id!, recallKey);
    text = parseTranscript(raw, meeting.participant_names ?? undefined);
    segmentCount = raw.length;
  } catch (err) {
    // 400 = transcription not configured for this bot (bot was created without a provider).
    // Save a placeholder so we don't retry on every poll.
    console.warn(`[Meeting ${meeting.id}] Transcript unavailable:`, err);
    text = "[No transcript — transcription was not enabled for this meeting]";
  }

  const startedAt = new Date(meeting.created_at).getTime();
  const endedAt = Date.now();
  const duration = Math.round((endedAt - startedAt) / 1000);

  // Save transcript and move to "processing" — Claude analysis runs async next
  await supabase
    .from("meetings")
    .update({
      transcript: text,
      status: "processing",
      ended_at: new Date(endedAt).toISOString(),
      duration,
    })
    .eq("id", meeting.id);

  console.log(`[Meeting ${meeting.id}] Transcript saved. segments=${segmentCount} duration=${duration}s. Starting analysis...`);

  // Trigger Claude analysis async — do not await, status polling will catch "ready"
  analyzeMeetingTranscript(meeting.id, meeting.user_id).catch((err) =>
    console.error(`[Meeting ${meeting.id}] Analysis error:`, err)
  );
  return { transcript: text, duration };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/meetings
meetings.get("/", async (c) => {
  const userId = c.get("userId");

  const { data, error } = await supabase
    .from("meetings")
    .select(`*, reports(id, summary), tasks(count)`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// POST /api/meetings
meetings.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{
    name: string;
    meetingUrl: string;
    managerName: string;
    employeeName: string;
  }>();

  if (!body.name || !body.meetingUrl) {
    return c.json({ error: "name and meetingUrl are required" }, 400);
  }

  const keys = await getApiKeys(userId);
  if (!keys.recallKey) {
    return c.json({ error: "Add your Recall.ai API key in Settings first" }, 400);
  }

  let bot;
  try {
    bot = await createBot(body.meetingUrl, keys.recallKey);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to create bot";
    return c.json({ error: msg }, 502);
  }

  const { data, error } = await supabase
    .from("meetings")
    .insert({
      user_id: userId,
      name: body.name,
      meeting_url: body.meetingUrl,
      recall_bot_id: bot.id,
      status: "bot_joining",
      participant_names: {
        manager: body.managerName,
        employee: body.employeeName,
      },
    })
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data, 201);
});

// GET /api/meetings/:id
meetings.get("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const { data, error } = await supabase
    .from("meetings")
    .select(`*, reports(*), tasks(*)`)
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error) return c.json({ error: error.message }, 404);
  return c.json(data);
});

// GET /api/meetings/:id/status
// Always calls Recall.ai directly — no webhook dependency.
// When the call ends, auto-fetches and saves transcript.
meetings.get("/:id/status", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const { data: meeting, error } = await supabase
    .from("meetings")
    .select("id, user_id, created_at, recall_bot_id, status, duration, transcript, participant_names")
    .eq("id", id)
    .eq("user_id", userId)
    .single<MeetingRow>();

  if (error || !meeting) return c.json({ error: "Meeting not found" }, 404);

  // Terminal statuses — no need to call Recall.ai
  if (meeting.status === "ready" || meeting.status === "failed") {
    return c.json({ status: meeting.status, botStatus: meeting.status, duration: meeting.duration });
  }

  const keys = await getApiKeys(userId);

  if (!meeting.recall_bot_id || !keys.recallKey) {
    return c.json({ status: meeting.status, botStatus: "unknown", duration: meeting.duration });
  }

  let botStatus = "unknown";
  let updatedStatus = meeting.status;
  let updatedDuration = meeting.duration;

  try {
    const result = await getBotStatus(meeting.recall_bot_id, keys.recallKey);
    botStatus = result.status;
    updatedStatus = mapRecallStatus(botStatus);

    console.log(`[Meeting ${id}] recallCode=${botStatus} mappedStatus=${updatedStatus} storedStatus=${meeting.status}`);

    const callEnded = botStatus === "done" || botStatus === "call_ended";

    if (callEnded && !meeting.transcript) {
      // finalizeMeeting handles transcript errors internally and always saves
      // something + sets status to "ready" — no inner try/catch needed.
      const finalized = await finalizeMeeting(meeting, keys.recallKey);
      updatedDuration = finalized.duration;
      updatedStatus = "ready";
    } else if (callEnded && meeting.transcript) {
      // Transcript already saved but status may be wrong — fix it
      if (meeting.status !== "ready") {
        await supabase.from("meetings").update({ status: "ready" }).eq("id", id);
      }
      updatedStatus = "ready";
    } else if (updatedStatus !== meeting.status) {
      await supabase
        .from("meetings")
        .update({ status: updatedStatus })
        .eq("id", id);
    }
  } catch (err) {
    console.error(`[Meeting ${id}] getBotStatus failed:`, err);
  }

  return c.json({ status: updatedStatus, botStatus, duration: updatedDuration });
});

// POST /api/meetings/:id/recover
// Manual recovery for stuck meetings — fetches current bot state and transcript.
meetings.post("/:id/recover", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const { data: meeting, error } = await supabase
    .from("meetings")
    .select("id, user_id, created_at, recall_bot_id, status, duration, transcript, participant_names")
    .eq("id", id)
    .eq("user_id", userId)
    .single<MeetingRow>();

  if (error || !meeting) return c.json({ error: "Meeting not found" }, 404);
  if (!meeting.recall_bot_id) return c.json({ error: "No bot associated with this meeting" }, 400);

  const keys = await getApiKeys(userId);
  if (!keys.recallKey) return c.json({ error: "Recall.ai API key missing" }, 400);

  let botStatus = "unknown";
  let recovered: Record<string, unknown> = {};

  try {
    const result = await getBotStatus(meeting.recall_bot_id, keys.recallKey);
    botStatus = result.status;
    const mappedStatus = mapRecallStatus(botStatus);

    const callEnded = botStatus === "done" || botStatus === "call_ended";

    if (callEnded) {
      if (!meeting.transcript) {
        const finalized = await finalizeMeeting(meeting, keys.recallKey);
        recovered = {
          transcriptSaved: true,
          transcriptLength: finalized.transcript.length,
          duration: finalized.duration,
          status: "ready",
        };
      } else {
        if (meeting.status !== "ready") {
          await supabase.from("meetings").update({ status: "ready" }).eq("id", id);
        }
        recovered = {
          transcriptSaved: false,
          note: "Transcript already existed",
          status: "ready",
        };
      }
    } else {
      // Call hasn't ended — update status and return current state
      if (mappedStatus !== meeting.status) {
        await supabase
          .from("meetings")
          .update({ status: mappedStatus })
          .eq("id", id);
      }
      recovered = { status: mappedStatus, botStatus, note: "Call still in progress" };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Recovery failed";
    return c.json({ error: msg, botStatus }, 502);
  }

  return c.json({ ok: true, botStatus, ...recovered });
});

// POST /api/meetings/:id/analyze — manually trigger / re-trigger Claude analysis
meetings.post("/:id/analyze", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const { data: meeting, error } = await supabase
    .from("meetings")
    .select("id, transcript")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !meeting) return c.json({ error: "Meeting not found" }, 404);
  if (!meeting.transcript) return c.json({ error: "No transcript to analyze yet" }, 400);

  await supabase.from("meetings").update({ status: "processing" }).eq("id", id);

  analyzeMeetingTranscript(id, userId).catch((err) =>
    console.error(`[Meeting ${id}] Re-analysis error:`, err)
  );

  return c.json({ status: "analysis_started" });
});

// GET /api/meetings/:id/report — full report with tasks
meetings.get("/:id/report", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const { data: meeting, error: meetErr } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (meetErr || !meeting) return c.json({ error: "Meeting not found" }, 404);

  const { data: report } = await supabase
    .from("reports")
    .select("*")
    .eq("meeting_id", id)
    .single();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("meeting_id", id)
    .order("created_at", { ascending: true });

  return c.json({ meeting, report: report ?? null, tasks: tasks ?? [] });
});

// DELETE /api/meetings/:id/bot
meetings.delete("/:id/bot", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const { data: meeting, error } = await supabase
    .from("meetings")
    .select("recall_bot_id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !meeting) return c.json({ error: "Meeting not found" }, 404);

  const keys = await getApiKeys(userId);
  if (meeting.recall_bot_id && keys.recallKey) {
    try {
      await removeBot(meeting.recall_bot_id, keys.recallKey);
    } catch (e) {
      console.error("removeBot error:", e);
    }
  }

  await supabase
    .from("meetings")
    .update({ status: "processing", ended_at: new Date().toISOString() })
    .eq("id", id);

  return c.json({ success: true });
});

export default meetings;
