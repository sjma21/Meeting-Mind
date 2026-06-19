export interface ClaudeTask {
  id: string;
  title: string;
  description: string;
  assigneeName: string;
  priority: "high" | "medium" | "low";
  deadline: string | null;
  exactQuote: string;
  files: Array<{ path: string; lineNumber: null; description: string }>;
  claudePrompt: string;
  status: "pending";
}

export interface ClaudeAnalysis {
  summary: string;
  topics: Array<{ title: string; duration: number }>;
  decisions: string[];
  participantRoles: Array<{
    name: string;
    detectedRole: "manager" | "employee";
    confidence: number;
  }>;
  tasks: ClaudeTask[];
  followUpQuestions: string[];
  unassignedTasks: string[];
}

interface AnalyzeParams {
  transcript: string;
  managerName: string;
  employeeName: string;
  repoContext: string;
  meetingName: string;
}

const CLAUDE_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

function buildPrompt(p: AnalyzeParams): string {
  return `You are an expert meeting analyst for software development teams.

Analyze this meeting transcript and produce a structured JSON analysis.

Meeting: ${p.meetingName}
Manager: ${p.managerName}
Employee: ${p.employeeName}

${p.repoContext ? `${p.repoContext}\n\n` : ""}TRANSCRIPT:
${p.transcript}

Produce a JSON object with EXACTLY this structure (no markdown, no explanation, raw JSON only):
{
  "summary": "3-5 sentence meeting summary",
  "topics": [{ "title": "string", "duration": number_in_minutes }],
  "decisions": ["string"],
  "participantRoles": [
    {
      "name": "string",
      "detectedRole": "manager" or "employee",
      "confidence": 0-100
    }
  ],
  "tasks": [
    {
      "id": "task_1",
      "title": "short title under 10 words",
      "description": "detailed explanation of what needs to be done",
      "assigneeName": "${p.employeeName}",
      "priority": "high" or "medium" or "low",
      "deadline": "string or null",
      "exactQuote": "exact words from transcript where task was assigned",
      "files": [
        { "path": "string", "lineNumber": null, "description": "what to change in this file" }
      ],
      "claudePrompt": "complete ready-to-paste prompt for Claude Code with full context",
      "status": "pending"
    }
  ],
  "followUpQuestions": ["string"],
  "unassignedTasks": ["string"]
}

Rules:
- priority is "high" if a deadline is mentioned or it's client-impacting, "medium" for normal work, "low" for nice-to-have
- files array: use ONLY files from the Connected Repository Files section if provided, else empty array []
- claudePrompt must be self-contained — include task, relevant files, what to change, any constraints, deadline
- Detect manager vs employee from language patterns: manager assigns/directs, employee accepts/confirms
- exactQuote must be verbatim from the transcript
- If no tasks are found return empty tasks array
- Respond with ONLY valid JSON, nothing else`;
}

async function callClaude(
  claudeApiKey: string,
  prompt: string
): Promise<ClaudeAnalysis> {
  const res = await fetch(CLAUDE_API, {
    method: "POST",
    headers: {
      "x-api-key": claudeApiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API error ${res.status}: ${body}`);
  }

  const data = await res.json() as {
    content: Array<{ type: string; text: string }>;
  };

  const raw = data.content.find((b) => b.type === "text")?.text ?? "";

  // Strip accidental markdown fences
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  return JSON.parse(cleaned) as ClaudeAnalysis;
}

const SIMPLE_PROMPT = (p: AnalyzeParams) => `
Analyze this meeting transcript and return ONLY a JSON object.

Transcript: ${p.transcript.slice(0, 3000)}

Return JSON with these fields:
{
  "summary": "brief summary",
  "topics": [],
  "decisions": [],
  "participantRoles": [],
  "tasks": [],
  "followUpQuestions": [],
  "unassignedTasks": []
}
`;

export async function analyzeMeeting(
  claudeApiKey: string,
  params: AnalyzeParams
): Promise<ClaudeAnalysis> {
  try {
    return await callClaude(claudeApiKey, buildPrompt(params));
  } catch (firstErr) {
    console.warn("[Claude] First attempt failed, retrying with simpler prompt:", firstErr);
    try {
      return await callClaude(claudeApiKey, SIMPLE_PROMPT(params));
    } catch (secondErr) {
      throw new Error(`Claude analysis failed after two attempts: ${secondErr}`);
    }
  }
}
