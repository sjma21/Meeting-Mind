import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import auth from "./routes/auth.js";
import meetings from "./routes/meetings.js";
import repos from "./routes/repos.js";
import webhooks from "./routes/webhooks.js";
import tasks from "./routes/tasks.js";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: (origin) => {
      // Allow any localhost port in dev, plus the configured production URL
      if (!origin || origin.startsWith("http://localhost:")) return origin;
      const prod = process.env.FRONTEND_URL;
      if (prod && origin === prod) return origin;
      return null;
    },
    credentials: true,
  })
);

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.route("/api/auth", auth);
app.route("/api/meetings", meetings);
app.route("/api/repos", repos);
app.route("/api/webhooks", webhooks);
app.route("/api/tasks", tasks);

const port = 3001;
console.log(`Backend running on http://localhost:${port}`);

serve({ fetch: app.fetch, port });
