import { Hono } from "hono";
import { authMiddleware } from "../lib/auth.js";
import { getApiKeys, saveApiKeys } from "../services/apiKeys.js";

const auth = new Hono<{ Variables: { userId: string } }>();

auth.use("*", authMiddleware);

function maskKey(key: string | undefined): string | undefined {
  if (!key || key.length < 4) return key;
  return "••••••••••••" + key.slice(-4);
}

auth.get("/keys", async (c) => {
  const userId = c.get("userId");
  const keys = await getApiKeys(userId);
  return c.json({
    claudeKey: maskKey(keys.claudeKey),
    openrouterKey: maskKey(keys.openrouterKey),
    recallKey: maskKey(keys.recallKey),
    githubToken: maskKey(keys.githubToken),
  });
});

auth.post("/keys", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{
    claudeKey?: string;
    openrouterKey?: string;
    recallKey?: string;
    githubToken?: string;
  }>();

  try {
    await saveApiKeys(userId, body);
    return c.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to save keys";
    console.error("saveApiKeys error:", msg);
    return c.json({ error: msg }, 500);
  }
});

// POST /api/auth/test/claude
auth.post("/test/claude", async (c) => {
  const { key } = await c.req.json<{ key: string }>();
  if (!key) return c.json({ ok: false, error: "No key provided" });
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
    });
    if (res.ok) return c.json({ ok: true });
    const body = await res.json() as { error?: { message?: string } };
    return c.json({ ok: false, error: body?.error?.message ?? `Status ${res.status}` });
  } catch (e: unknown) {
    return c.json({ ok: false, error: e instanceof Error ? e.message : "Network error" });
  }
});

// POST /api/auth/test/recall
auth.post("/test/recall", async (c) => {
  const { key } = await c.req.json<{ key: string }>();
  if (!key) return c.json({ ok: false, error: "No key provided" });
  try {
    const res = await fetch("https://api.recall.ai/api/v1/bot/?limit=1", {
      headers: { Authorization: `Token ${key}` },
    });
    if (res.ok) return c.json({ ok: true });
    return c.json({ ok: false, error: `Status ${res.status} — check your key` });
  } catch (e: unknown) {
    return c.json({ ok: false, error: e instanceof Error ? e.message : "Network error" });
  }
});

export default auth;
