import { supabase } from "../lib/supabase.js";
import { getApiKeys } from "./apiKeys.js";
import { getRepoInfo, getFileTree, getFileContent } from "./github.js";
import { embedTexts, embedSingleText } from "./embeddings.js";
import { buildFileSummary } from "./fileSummarizer.js";

const SUMMARY_BATCH_SIZE = 50;

interface RepoRow {
  id: string;
  owner: string;
  name: string;
}

export async function indexRepo(
  repoId: string,
  userId: string
): Promise<{ success: boolean; filesIndexed: number }> {
  const keys = await getApiKeys(userId);
  if (!keys.githubToken) throw new Error("GitHub token not saved in settings");
  if (!keys.openrouterKey) throw new Error("OpenRouter key not saved in settings");

  // Get repo details
  const { data: repo, error: repoErr } = await supabase
    .from("repos")
    .select("id, owner, name")
    .eq("id", repoId)
    .eq("user_id", userId)
    .single();

  if (repoErr || !repo) throw new Error("Repo not found");
  const repoRow = repo as RepoRow;

  // Get file list
  const filePaths = await getFileTree(repoRow.owner, repoRow.name, keys.githubToken);

  // Fetch content and build summaries
  const summaries: Array<{ path: string; summary: string }> = [];

  for (const filePath of filePaths) {
    const content = await getFileContent(repoRow.owner, repoRow.name, filePath, keys.githubToken);
    if (!content) continue;
    const summary = buildFileSummary(filePath, content);
    summaries.push({ path: filePath, summary });
  }

  if (summaries.length === 0) {
    return { success: true, filesIndexed: 0 };
  }

  // Embed in batches
  const allEmbeddings: number[][] = [];
  for (let i = 0; i < summaries.length; i += SUMMARY_BATCH_SIZE) {
    const batch = summaries.slice(i, i + SUMMARY_BATCH_SIZE);
    const vecs = await embedTexts(
      batch.map((s) => s.summary),
      keys.openrouterKey
    );
    allEmbeddings.push(...vecs);
  }

  // Delete old embeddings for this repo
  await supabase.from("repo_embeddings").delete().eq("repo_id", repoId);

  // Upsert new embeddings
  const rows = summaries.map((s, i) => ({
    repo_id: repoId,
    file_path: s.path,
    content_summary: s.summary,
    embedding: JSON.stringify(allEmbeddings[i]),
    metadata: { filePath: s.path },
  }));

  // Insert in chunks of 100
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabase
      .from("repo_embeddings")
      .insert(rows.slice(i, i + 100));
    if (error) throw new Error(`Failed to insert embeddings: ${error.message}`);
  }

  // Mark repo as indexed
  await supabase
    .from("repos")
    .update({
      indexed: true,
      indexed_at: new Date().toISOString(),
      file_count: summaries.length,
    })
    .eq("id", repoId);

  return { success: true, filesIndexed: summaries.length };
}

interface MatchRow {
  file_path: string;
  content_summary: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

export interface SearchResult {
  repoId: string;
  filePath: string;
  contentSummary: string;
  similarity: number;
}

export async function searchRelevantFiles(
  query: string,
  repoIds: string[],
  userId: string,
  limit = 5
): Promise<SearchResult[]> {
  const keys = await getApiKeys(userId);
  if (!keys.openrouterKey) throw new Error("OpenRouter key not saved in settings");

  const queryEmbedding = await embedSingleText(query, keys.openrouterKey);

  const allResults: SearchResult[] = [];

  for (const repoId of repoIds) {
    const { data, error } = await supabase.rpc("match_embeddings", {
      query_embedding: queryEmbedding,
      match_threshold: 0.3,
      match_count: limit,
      p_repo_id: repoId,
    });

    if (error || !data) continue;

    for (const row of data as MatchRow[]) {
      allResults.push({
        repoId,
        filePath: row.file_path,
        contentSummary: row.content_summary,
        similarity: row.similarity,
      });
    }
  }

  // Re-rank by similarity descending
  allResults.sort((a, b) => b.similarity - a.similarity);
  return allResults.slice(0, limit);
}

// ─── Meeting Context Builder ──────────────────────────────────────────────────

const CODE_KEYWORDS = [
  // UI elements
  "button", "form", "page", "modal", "navbar", "hero", "card", "table", "input",
  "header", "footer", "sidebar", "dropdown", "menu", "icon", "image", "banner",
  // Technical terms
  "api", "endpoint", "database", "auth", "login", "component", "route", "hook",
  "function", "service", "model", "schema", "migration", "query", "cache",
  "authentication", "authorization", "token", "session", "middleware", "config",
  // Feature-adjacent
  "dashboard", "settings", "profile", "search", "filter", "upload", "download",
  "notification", "email", "payment", "checkout", "cart", "order",
];

function extractKeyPhrases(transcript: string): string[] {
  const words = transcript.toLowerCase().split(/\s+/);
  const found = new Set<string>();

  // Match known keywords
  for (const word of words) {
    const clean = word.replace(/[^a-z]/g, "");
    if (CODE_KEYWORDS.includes(clean)) found.add(clean);
  }

  // Match capitalized words that might be feature names (from original transcript)
  const capitalizedMatches = transcript.match(/\b[A-Z][a-zA-Z]{3,}\b/g) ?? [];
  for (const m of capitalizedMatches) {
    if (!["The", "This", "That", "When", "What", "Where", "With", "From", "Have", "Will", "Your", "They", "Also", "Then", "Here"].includes(m)) {
      found.add(m.toLowerCase());
    }
  }

  return Array.from(found).slice(0, 10);
}

export async function buildMeetingContext(
  transcript: string,
  userId: string
): Promise<string> {
  // Get all indexed repos for this user
  const { data: repos } = await supabase
    .from("repos")
    .select("id")
    .eq("user_id", userId)
    .eq("indexed", true);

  if (!repos || repos.length === 0) return "";

  const repoIds = (repos as Array<{ id: string }>).map((r) => r.id);
  const phrases = extractKeyPhrases(transcript);
  if (phrases.length === 0) return "";

  // Search for each phrase, collect all unique files
  const seen = new Set<string>();
  const allFiles: Array<{ path: string; summary: string; similarity: number }> = [];

  let keys: Awaited<ReturnType<typeof getApiKeys>> | null = null;
  try {
    keys = await getApiKeys(userId);
  } catch {
    return "";
  }

  if (!keys?.openrouterKey) return "";

  for (const phrase of phrases) {
    try {
      const results = await searchRelevantFiles(phrase, repoIds, userId, 5);
      for (const r of results) {
        if (!seen.has(r.filePath)) {
          seen.add(r.filePath);
          allFiles.push({ path: r.filePath, summary: r.contentSummary, similarity: r.similarity });
        }
      }
    } catch {
      // skip failed searches
    }
  }

  if (allFiles.length === 0) return "";

  // Sort by similarity, take top 20
  allFiles.sort((a, b) => b.similarity - a.similarity);
  const top = allFiles.slice(0, 20);

  const lines = top.map((f) => `${f.path} — ${f.summary}`).join("\n");
  return `Connected Repository Files:\n${lines}`;
}
