import { Hono } from "hono";
import { authMiddleware } from "../lib/auth.js";
import { supabase } from "../lib/supabase.js";

const tasks = new Hono<{ Variables: { userId: string } }>();

tasks.use("*", authMiddleware);

// GET /api/tasks?meetingId=&status=
tasks.get("/", async (c) => {
  const userId = c.get("userId");
  const meetingId = c.req.query("meetingId");
  const status = c.req.query("status");

  let query = supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId);

  if (meetingId) query = query.eq("meeting_id", meetingId);
  if (status) query = query.eq("status", status);

  // Priority order: high → medium → low
  const { data, error } = await query
    .order("created_at", { ascending: true });

  if (error) return c.json({ error: error.message }, 500);

  // Sort by priority in application (high → medium → low)
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sorted = (data ?? []).sort(
    (a, b) =>
      (priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1) -
      (priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1)
  );

  return c.json(sorted);
});

// PATCH /api/tasks/:id
tasks.patch("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const body = await c.req.json<{ status?: string; notes?: string }>();

  const updates: Record<string, unknown> = {};
  if (body.status !== undefined) updates.status = body.status;
  if (body.notes !== undefined) updates.notes = body.notes;

  if (Object.keys(updates).length === 0) {
    return c.json({ error: "Nothing to update" }, 400);
  }

  // Verify ownership via meeting join
  const { data: task, error: findErr } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (findErr || !task) return c.json({ error: "Task not found" }, 404);

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);
  return c.json(data);
});

export default tasks;
