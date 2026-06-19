const RECALL_REGION = process.env.RECALL_REGION ?? "us-west-2";
const RECALL_BASE = `https://${RECALL_REGION}.recall.ai/api/v1`;

function recallHeaders(apiKey: string) {
  return {
    Authorization: `Token ${apiKey}`,
    "Content-Type": "application/json",
  };
}

export interface RecallBot {
  id: string;
  status_changes: Array<{ code: string; created_at: string }>;
  meeting_participants?: Array<{ name: string }>;
}

export async function createBot(
  meetingUrl: string,
  recallApiKey: string
): Promise<RecallBot> {
  const res = await fetch(`${RECALL_BASE}/bot`, {
    method: "POST",
    headers: recallHeaders(recallApiKey),
    body: JSON.stringify({
      meeting_url: meetingUrl,
      bot_name: "MeetingMind",
      output_transcription_options: {
        provider: "assembly_ai",
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Recall.ai createBot failed ${res.status}: ${body}`);
  }

  return res.json() as Promise<RecallBot>;
}

export interface BotStatusResult {
  status: string;
  participants: string[];
  raw: RecallBot;
}

export async function getBotStatus(
  botId: string,
  recallApiKey: string
): Promise<BotStatusResult> {
  const res = await fetch(`${RECALL_BASE}/bot/${botId}`, {
    headers: recallHeaders(recallApiKey),
  });

  if (!res.ok) throw new Error(`getBotStatus failed: ${res.status}`);

  const data = await res.json() as RecallBot;

  console.log("Full Recall response:", JSON.stringify(data, null, 2));

  // status_changes is an array ordered oldest→newest; take the last entry's code
  const statusChanges = Array.isArray(data.status_changes) ? data.status_changes : [];
  const lastChange = statusChanges[statusChanges.length - 1];
  const lastStatus = lastChange?.code ?? "unknown";

  console.log(`[Recall] botId=${botId} statusChanges=${statusChanges.length} lastCode=${lastStatus}`);

  const participants =
    data.meeting_participants?.map((p) => p.name) ?? [];

  return { status: lastStatus, participants, raw: data };
}

export async function removeBot(
  botId: string,
  recallApiKey: string
): Promise<void> {
  const res = await fetch(`${RECALL_BASE}/bot/${botId}`, {
    method: "DELETE",
    headers: recallHeaders(recallApiKey),
  });

  if (!res.ok && res.status !== 404) {
    throw new Error(`removeBot failed: ${res.status}`);
  }
}

interface TranscriptWord {
  text: string;
  start_time: number;
}

interface TranscriptEntry {
  speaker: string;
  words: TranscriptWord[];
}

export async function getBotTranscript(
  botId: string,
  recallApiKey: string
): Promise<TranscriptEntry[]> {
  const res = await fetch(`${RECALL_BASE}/bot/${botId}/transcript`, {
    headers: recallHeaders(recallApiKey),
  });

  if (!res.ok) throw new Error(`getBotTranscript failed: ${res.status}`);

  return res.json() as Promise<TranscriptEntry[]>;
}

export function parseTranscript(
  recallTranscript: TranscriptEntry[],
  participantNames?: { manager?: string; employee?: string }
): string {
  // Build speaker name map: "Speaker 1" → real name
  const nameMap: Record<string, string> = {};
  if (participantNames) {
    if (participantNames.manager) nameMap["Speaker 1"] = participantNames.manager;
    if (participantNames.employee) nameMap["Speaker 2"] = participantNames.employee;
  }

  const lines: string[] = [];
  for (const entry of recallTranscript) {
    const words = entry.words.map((w) => w.text).join(" ").trim();
    if (!words) continue;
    const speaker = nameMap[entry.speaker] ?? entry.speaker;
    lines.push(`${speaker}: ${words}`);
  }

  return lines.join("\n");
}

// Map Recall.ai bot status codes → our meeting status
export function mapRecallStatus(recallCode: string): string {
  const map: Record<string, string> = {
    ready: "bot_joining",
    joining_call: "bot_joining",
    in_waiting_room: "bot_joining",
    in_call_not_recording: "recording",
    in_call_recording: "recording",
    call_ended: "processing",
    done: "processing",
    fatal: "failed",
  };
  return map[recallCode] ?? "bot_joining";
}
