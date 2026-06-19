import { Hono } from "hono";
import { authMiddleware } from "../lib/auth.js";
import { supabase } from "../lib/supabase.js";
import { parseRepoUrl, getRepoInfo } from "../services/github.js";
import { getApiKeys } from "../services/apiKeys.js";
import { indexRepo, searchRelevantFiles } from "../services/rag.js";

const repos = new Hono<{ Variables: { userId: string } }>();

repos.use("*", authMiddleware);

// GET /api/repos
repos.get("/", async (c) => {
  const userId = c.get("userId");
  const { data, error } = await supabase
    .from("repos")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

// POST /api/repos/connect
repos.post("/connect", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ url: string }>();

  if (!body.url) return c.json({ error: "url is required" }, 400);

  // Check GitHub token saved
  const keys = await getApiKeys(userId);
  if (!keys.githubToken) {
    return c.json({ error: "GitHub token not found. Add it in Settings first." }, 400);
  }

  let owner: string, repo: string;
  try {
    ({ owner, repo } = parseRepoUrl(body.url));
  } catch {
    return c.json({ error: "Invalid GitHub URL" }, 400);
  }

  // Verify repo exists
  let repoInfo;
  try {
    repoInfo = await getRepoInfo(owner, repo, keys.githubToken);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to access repo";
    return c.json({ error: msg }, 400);
  }

  // Insert into DB
  const { data, error } = await supabase
    .from("repos")
    .insert({
      user_id: userId,
      name: repoInfo.name,
      owner,
      url: body.url.replace(/\/$/, ""),
      indexed: false,
      file_count: 0,
    })
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data, 201);
});

// POST /api/repos/:id/index
repos.post("/:id/index", async (c) => {
  const userId = c.get("userId");
  const repoId = c.req.param("id");

  // Update status to indexing (we use a metadata flag)
  await supabase
    .from("repos")
    .update({ indexed: false })
    .eq("id", repoId)
    .eq("user_id", userId);

  // Run indexing in background
  indexRepo(repoId, userId).catch((err: unknown) => {
    console.error(`Indexing failed for repo ${repoId}:`, err);
  });

  return c.json({ status: "indexing_started" });
});

// DELETE /api/repos/:id
repos.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const repoId = c.req.param("id");

  const { error } = await supabase
    .from("repos")
    .delete()
    .eq("id", repoId)
    .eq("user_id", userId);

  if (error) return c.json({ error: error.message }, 500);
  return c.json({ success: true });
});

// GET /api/repos/:id/search?q=query
repos.get("/:id/search", async (c) => {
  const userId = c.get("userId");
  const repoId = c.req.param("id");
  const query = c.req.query("q");

  if (!query) return c.json({ error: "q parameter is required" }, 400);

  try {
    const results = await searchRelevantFiles(query, [repoId], userId, 10);
    return c.json(results);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Search failed";
    return c.json({ error: msg }, 500);
  }
});

export default repos;
