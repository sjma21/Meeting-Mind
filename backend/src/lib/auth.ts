import type { Context, Next } from "hono";
import { supabase } from "./supabase.js";

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = authHeader.slice(7);

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  c.set("userId", data.user.id);
  await next();
}
