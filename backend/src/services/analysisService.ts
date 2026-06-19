import { supabase } from "../lib/supabase.js";
import { getApiKeys } from "./apiKeys.js";
import { analyzeMeeting } from "./claude.js";
import { buildMeetingContext } from "./rag.js";

interface MeetingRecord {
  id: string;
  name: string;
  transcript: string | null;
  participant_names: { manager?: string; employee?: string } | null;
  created_at: string;
}

export async function analyzeMeetingTranscript(
  meetingId: string,
  userId: string
): Promise<{ success: boolean; reportId?: string; taskCount?: number }> {
  // ── Step 1: Load meeting ────────────────────────────────────────────────────
  const { data: meeting, error: meetErr } = await supabase
    .from("meetings")
    .select("id, name, transcript, participant_names, created_at")
    .eq("id", meetingId)
    .single<MeetingRecord>();

  if (meetErr || !meeting) {
    console.error(`[Analysis ${meetingId}] Meeting not found`);
    return { success: false };
  }

  const transcript = meeting.transcript ?? "";
  if (transcript.length < 100) {
    console.warn(`[Analysis ${meetingId}] Transcript too short (${transcript.length} chars), skipping`);
    await supabase.from("meetings").update({ status: "ready" }).eq("id", meetingId);
    return { success: false };
  }

  const managerName = meeting.participant_names?.manager ?? "Manager";
  const employeeName = meeting.participant_names?.employee ?? "Employee";

  // ── Step 2: Keys ────────────────────────────────────────────────────────────
  const keys = await getApiKeys(userId);
  if (!keys.claudeKey) {
    console.error(`[Analysis ${meetingId}] No Claude API key`);
    await supabase
      .from("meetings")
      .update({ status: "failed", error_message: "Claude API key not configured" })
      .eq("id", meetingId);
    return { success: false };
  }

  // Mark as processing so UI shows the right state
  await supabase.from("meetings").update({ status: "processing" }).eq("id", meetingId);

  // ── Step 3: Build RAG context ───────────────────────────────────────────────
  let repoContext = "";
  try {
    repoContext = await buildMeetingContext(transcript, userId);
    if (repoContext) {
      console.log(`[Analysis ${meetingId}] RAG context built (${repoContext.split("\n").length} files)`);
    }
  } catch (ragErr) {
    console.warn(`[Analysis ${meetingId}] RAG context failed, continuing without:`, ragErr);
  }

  // ── Step 4: Claude analysis ─────────────────────────────────────────────────
  let analysis;
  try {
    analysis = await analyzeMeeting(keys.claudeKey, {
      transcript,
      managerName,
      employeeName,
      repoContext,
      meetingName: meeting.name,
    });
    console.log(`[Analysis ${meetingId}] Claude returned ${analysis.tasks.length} tasks`);
  } catch (claudeErr) {
    const msg = claudeErr instanceof Error ? claudeErr.message : "Claude analysis failed";
    console.error(`[Analysis ${meetingId}] Claude error:`, claudeErr);
    await supabase
      .from("meetings")
      .update({ status: "failed", error_message: msg })
      .eq("id", meetingId);
    return { success: false };
  }

  // ── Step 5: Save report ─────────────────────────────────────────────────────
  const { data: report, error: reportErr } = await supabase
    .from("reports")
    .insert({
      meeting_id: meetingId,
      summary: analysis.summary,
      topics: analysis.topics,
      decisions: analysis.decisions,
      follow_up_questions: analysis.followUpQuestions,
      unassigned_tasks: analysis.unassignedTasks,
      participant_roles: analysis.participantRoles,
      manager_name: managerName,
      employee_name: employeeName,
    })
    .select("id")
    .single();

  if (reportErr) {
    console.error(`[Analysis ${meetingId}] Failed to save report:`, reportErr.message);
    await supabase
      .from("meetings")
      .update({ status: "failed", error_message: reportErr.message })
      .eq("id", meetingId);
    return { success: false };
  }

  // ── Step 6: Save tasks ──────────────────────────────────────────────────────
  if (analysis.tasks.length > 0) {
    const taskRows = analysis.tasks.map((t) => ({
      meeting_id: meetingId,
      user_id: userId,
      title: t.title,
      description: t.description,
      assignee_name: t.assigneeName,
      priority: t.priority,
      status: "pending" as const,
      deadline: t.deadline ?? null,
      exact_quote: t.exactQuote,
      files: t.files,
      claude_prompt: t.claudePrompt,
    }));

    const { error: taskErr } = await supabase.from("tasks").insert(taskRows);
    if (taskErr) {
      console.error(`[Analysis ${meetingId}] Task insert error:`, taskErr.message);
    }
  }

  // ── Step 7: Mark ready ──────────────────────────────────────────────────────
  await supabase.from("meetings").update({ status: "ready" }).eq("id", meetingId);

  console.log(`[Analysis ${meetingId}] Complete. report=${report.id} tasks=${analysis.tasks.length}`);
  return { success: true, reportId: report.id, taskCount: analysis.tasks.length };
}
