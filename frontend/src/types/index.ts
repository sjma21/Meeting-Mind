export interface Meeting {
  id: string;
  name: string;
  meeting_url?: string;
  recall_bot_id?: string;
  status: "bot_joining" | "recording" | "processing" | "ready" | "failed";
  duration?: number;
  participant_names?: { manager?: string; employee?: string };
  transcript?: string;
  error_message?: string;
  created_at: string;
  ended_at?: string;
  reports?: Report[];
  tasks?: Task[];
}

export interface Report {
  id: string;
  meeting_id: string;
  summary: string;
  topics: Array<{ title: string; duration: number }>;
  decisions: string[];
  follow_up_questions: string[];
  unassigned_tasks: string[];
  participant_roles: Array<{
    name: string;
    detectedRole: "manager" | "employee";
    confidence: number;
  }>;
  manager_name: string;
  employee_name: string;
  created_at: string;
}

export interface TaskFile {
  path: string;
  lineNumber: number | null;
  description: string;
}

export interface Task {
  id: string;
  meeting_id: string;
  user_id: string;
  title: string;
  description?: string;
  assignee_name?: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in_progress" | "done";
  deadline?: string | null;
  exact_quote?: string;
  files?: TaskFile[];
  claude_prompt?: string;
  notes?: string;
  created_at: string;
}

export interface Repo {
  id: string;
  userId: string;
  name: string;
  owner: string;
  url: string;
  indexed: boolean;
  indexedAt?: string;
  fileCount: number;
  createdAt: string;
}

export interface ApiKeys {
  claudeKey?: string;
  openrouterKey?: string;
  recallKey?: string;
  githubToken?: string;
}

export interface MeetingReport {
  meeting: Meeting;
  report: Report | null;
  tasks: Task[];
}
