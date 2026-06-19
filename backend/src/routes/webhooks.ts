import { Hono } from "hono";
import { supabase } from "../lib/supabase.js";
import {
  getBotTranscript,
  parseTranscript,
  mapRecallStatus,
} from "../services/recall.js";
import { getApiKeys } from "../services/apiKeys.js";

const webhooks = new Hono();

interface ParticipantNames {
  manager?: string;
  employee?: string;
}

interface MeetingRow {
  id: string;
  user_id: string;
  created_at: string;
  participant_names: ParticipantNames | null;
}

// POST /api/webhooks/recall  — Recall.ai event webhook
webhooks.post("/recall", async (c) => {
  try {
    const body = await c.req.json<{
      event: string;
      data: {
        bot_id?: string;
        status?: { code?: string };
        transcript?: unknown;
      };
    }>();

    const { event, data } = body;
    const botId = data?.bot_id;

    if (!botId) return c.json({ ok: true });

    // Find meeting by bot id
    const { data: meeting } = await supabase
      .from("meetings")
      .select("id, user_id, created_at, participant_names")
      .eq("recall_bot_id", botId)
      .single<MeetingRow>();

    if (!meeting) return c.json({ ok: true });

    if (event === "bot.status_change" && data.status?.code) {
      const mapped = mapRecallStatus(data.status.code);
      await supabase
        .from("meetings")
        .update({ status: mapped })
        .eq("id", meeting.id);
    }

    if (event === "transcript.data" && data.transcript) {
      // Append real-time chunk to transcript field
      const chunk =
        typeof data.transcript === "string"
          ? data.transcript
          : JSON.stringify(data.transcript);

      const { data: existing } = await supabase
        .from("meetings")
        .select("transcript")
        .eq("id", meeting.id)
        .single<{ transcript: string | null }>();

      const updated = existing?.transcript
        ? existing.transcript + "\n" + chunk
        : chunk;

      await supabase
        .from("meetings")
        .update({ transcript: updated })
        .eq("id", meeting.id);
    }

    if (event === "bot.done") {
      const keys = await getApiKeys(meeting.user_id);
      let parsedTranscript = "";

      if (keys.recallKey) {
        try {
          const raw = await getBotTranscript(botId, keys.recallKey);
          parsedTranscript = parseTranscript(
            raw,
            meeting.participant_names ?? undefined
          );
        } catch (e) {
          console.error("Failed to fetch transcript:", e);
        }
      }

      const startedAt = new Date(meeting.created_at).getTime();
      const endedAt = Date.now();
      const durationSeconds = Math.round((endedAt - startedAt) / 1000);

      await supabase
        .from("meetings")
        .update({
          transcript: parsedTranscript || undefined,
          status: "processing",
          ended_at: new Date(endedAt).toISOString(),
          duration: durationSeconds,
        })
        .eq("id", meeting.id);

      // Phase 4 will handle Claude analysis here
      console.log(
        `[Meeting ${meeting.id}] Transcript saved. Analysis would start here.`
      );
    }
  } catch (e) {
    console.error("Webhook error:", e);
  }

  // Always return 200 so Recall.ai doesn't retry
  return c.json({ ok: true });
});

// POST /api/webhooks/transcript — real-time transcript chunks
webhooks.post("/transcript", async (c) => {
  try {
    const body = await c.req.json<{
      bot_id?: string;
      data?: { transcript?: Array<{ speaker: string; words: Array<{ text: string }> }> };
    }>();

    const botId = body.bot_id;
    if (!botId) return c.json({ ok: true });

    const { data: meeting } = await supabase
      .from("meetings")
      .select("id, participant_names")
      .eq("recall_bot_id", botId)
      .single<{ id: string; participant_names: ParticipantNames | null }>();

    if (!meeting) return c.json({ ok: true });

    if (body.data?.transcript?.length) {
      const chunk = body.data.transcript
        .map((seg) => {
          const words = seg.words.map((w) => w.text).join(" ").trim();
          return words ? `${seg.speaker}: ${words}` : "";
        })
        .filter(Boolean)
        .join("\n");

      if (chunk) {
        const { data: existing } = await supabase
          .from("meetings")
          .select("transcript")
          .eq("id", meeting.id)
          .single<{ transcript: string | null }>();

        const updated = existing?.transcript
          ? existing.transcript + "\n" + chunk
          : chunk;

        await supabase
          .from("meetings")
          .update({ transcript: updated })
          .eq("id", meeting.id);
      }
    }
  } catch (e) {
    console.error("Transcript webhook error:", e);
  }

  return c.json({ ok: true });
});

export default webhooks;
