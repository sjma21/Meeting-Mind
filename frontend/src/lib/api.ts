import { supabase } from "./supabase";
import type { ApiKeys, Repo, Meeting, Task, MeetingReport } from "../types";

const BASE_URL = import.meta.env.VITE_API_URL as string;

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    window.location.href = "/auth";
    return {};
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    window.location.href = "/auth";
    throw new Error("Unauthorized");
  }

  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text || `Server error ${res.status}`);
  }
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Server error ${res.status}`);
  return data as T;
}

// ─── Repo methods ────────────────────────────────────────────────────────────

export function connectRepo(url: string): Promise<Repo> {
  return request("POST", "/api/repos/connect", { url });
}

export function getRepos(): Promise<Repo[]> {
  return request("GET", "/api/repos");
}

export function indexRepo(repoId: string): Promise<{ status: string }> {
  return request("POST", `/api/repos/${repoId}/index`);
}

export function deleteRepo(repoId: string): Promise<{ success: boolean }> {
  return request("DELETE", `/api/repos/${repoId}`);
}

export interface SearchResult {
  repoId: string;
  filePath: string;
  contentSummary: string;
  similarity: number;
}

export async function searchRepo(repoId: string, query: string): Promise<SearchResult[]> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${BASE_URL}/api/repos/${repoId}/search?q=${encodeURIComponent(query)}`,
    { headers }
  );
  if (!res.ok) {
    const data = await res.json() as { error?: string };
    throw new Error(data.error ?? "Search failed");
  }
  return res.json() as Promise<SearchResult[]>;
}

// ─── Keys methods ─────────────────────────────────────────────────────────────

export function saveKeys(keys: ApiKeys): Promise<{ success: boolean }> {
  return request("POST", "/api/auth/keys", keys);
}

export function getKeys(): Promise<ApiKeys> {
  return request("GET", "/api/auth/keys");
}

export function testClaudeKey(key: string): Promise<{ ok: boolean; error?: string }> {
  return request("POST", "/api/auth/test/claude", { key });
}

export function testRecallKey(key: string): Promise<{ ok: boolean; error?: string }> {
  return request("POST", "/api/auth/test/recall", { key });
}

// ─── Meeting methods ──────────────────────────────────────────────────────────

export function getMeetings(): Promise<Meeting[]> {
  return request("GET", "/api/meetings");
}

export function getMeeting(id: string): Promise<Meeting> {
  return request("GET", `/api/meetings/${id}`);
}

export function createMeeting(payload: {
  name: string;
  meetingUrl: string;
  managerName: string;
  employeeName: string;
}): Promise<Meeting> {
  return request("POST", "/api/meetings", payload);
}

export function getMeetingStatus(id: string): Promise<{
  status: Meeting["status"];
  botStatus: string;
  duration: number | null;
}> {
  return request("GET", `/api/meetings/${id}/status`);
}

export function removeMeetingBot(id: string): Promise<{ success: boolean }> {
  return request("DELETE", `/api/meetings/${id}/bot`);
}

export function recoverMeeting(id: string): Promise<{
  ok: boolean;
  botStatus: string;
  status?: string;
  transcriptSaved?: boolean;
  duration?: number;
  note?: string;
}> {
  return request("POST", `/api/meetings/${id}/recover`);
}

export function analyzeMeeting(id: string): Promise<{ status: string }> {
  return request("POST", `/api/meetings/${id}/analyze`);
}

export function getMeetingReport(id: string): Promise<MeetingReport> {
  return request("GET", `/api/meetings/${id}/report`);
}

// ─── Task methods ─────────────────────────────────────────────────────────────

export function getTasks(params?: { meetingId?: string; status?: string }): Promise<Task[]> {
  const qs = new URLSearchParams();
  if (params?.meetingId) qs.set("meetingId", params.meetingId);
  if (params?.status) qs.set("status", params.status);
  const q = qs.toString();
  return request("GET", `/api/tasks${q ? `?${q}` : ""}`);
}

export function updateTask(
  id: string,
  updates: { status?: Task["status"]; notes?: string }
): Promise<Task> {
  return request("PATCH", `/api/tasks/${id}`, updates);
}
