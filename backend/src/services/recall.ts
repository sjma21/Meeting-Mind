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
  recordings?: Array<{
    media_shortcuts?: {
      transcript?: {
        data?: {
          download_url: string | null;
        };
      };
    };
  }>;
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
      recording_config: {
        transcript: {
          provider: {
            assembly_ai_async_chunked: {},
          },
        },
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
  end_time: number;
}

interface TranscriptEntry {
  speaker: string;
  words: TranscriptWord[];
}

export async function getBotTranscript(
  botId: string,
  recallApiKey: string
): Promise<TranscriptEntry[]> {
  // Step 1: Poll bot data for the S3 download URL (up to 3 attempts, 5s apart)
  let downloadUrl: string | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 5000));

    const res = await fetch(`${RECALL_BASE}/bot/${botId}`, {
      headers: recallHeaders(recallApiKey),
    });
    if (!res.ok) throw new Error(`getBotTranscript: bot fetch failed ${res.status}`);

    const data = (await res.json()) as RecallBot;
    downloadUrl =
      data.recordings?.[0]?.media_shortcuts?.transcript?.data?.download_url ?? null;
    console.log(`[Recall] getBotTranscript attempt ${attempt + 1}/3 downloadUrl=${downloadUrl}`);
    if (downloadUrl) break;
  }

  if (!downloadUrl) throw new Error("TRANSCRIPT_PROCESSING");

  // Step 2: Fetch from S3 — public URL, no auth headers
  const s3Res = await fetch(downloadUrl);
  if (!s3Res.ok) throw new Error(`getBotTranscript: S3 fetch failed ${s3Res.status}`);

  return normalizeTranscript(await s3Res.json());
}

// Handle both array-of-utterances and AssemblyAI { utterances: [...] } formats
function normalizeTranscript(raw: unknown): TranscriptEntry[] {
  if (Array.isArray(raw)) {
    return raw as TranscriptEntry[];
  }

  const obj = raw as {
    utterances?: Array<{ speaker: string; text: string; start: number; end: number }>;
  };
  if (!obj.utterances || !Array.isArray(obj.utterances)) return [];

  return obj.utterances.map((u) => {
    const wordTexts = u.text.split(" ");
    const durationPerWord = (u.end - u.start) / wordTexts.length;
    const words: TranscriptWord[] = wordTexts.map((text, i) => ({
      text,
      start_time: (u.start + i * durationPerWord) / 1000,
      end_time: (u.start + (i + 1) * durationPerWord) / 1000,
    }));
    return { speaker: `Speaker ${u.speaker}`, words };
  });
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
