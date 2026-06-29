# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MeetingMind is an AI-powered meeting assistant for engineering 1:1s. It:
1. Joins video calls via a Recall.ai bot to record and transcribe
2. Analyzes transcripts with Claude to extract tasks, decisions, and summaries
3. Uses RAG over indexed GitHub repos to provide code-aware context in analysis

## Monorepo Structure

pnpm workspaces with two packages:
- `backend/` — Hono (Node.js) REST API on port 3001
- `frontend/` — React + Vite SPA on port 5173

## Commands

```bash
# Run both together
pnpm dev

# Individual
pnpm dev:backend
pnpm dev:frontend

# Build
pnpm build
```

Backend uses `tsx watch` for hot reload. No test suite exists yet.

## Environment Setup

Copy `.env.example` to `.env` in both `backend/` and `frontend/`. The Supabase project URL and keys are pre-filled in `.env.example`. The backend also needs `RECALL_REGION` (default: `us-west-2`) and `FRONTEND_URL`.

## Backend Architecture

**Framework:** Hono on `@hono/node-server`

**Entry point:** `backend/src/index.ts` — registers routes and CORS (allows any `localhost:*` port + `FRONTEND_URL`).

**Auth:** `authMiddleware` in `lib/auth.ts` validates Supabase JWT from `Authorization: Bearer <token>` and sets `userId` in the Hono context. Every route except `/health` is protected.

**Routes** (all under `/api/`):
- `auth` — save/get/test API keys
- `meetings` — full meeting lifecycle (create, status polling, report, bot removal, recovery, analysis trigger, dev transcript injection)
- `repos` — connect/index/search/delete GitHub repos
- `tasks` — list/update tasks
- `webhooks` — Recall.ai webhook receiver (currently supplementary; status is polled directly)

**Meeting lifecycle:**
```
POST /api/meetings → Recall bot created → status: bot_joining
GET /api/meetings/:id/status (polled by frontend) →
  maps Recall codes → our statuses:
    joining_call/in_waiting_room → bot_joining
    in_call_* → recording
    done/call_ended → triggers finalizeMeeting()
      → saves transcript → status: processing
      → async: analyzeMeetingTranscript() → status: ready | failed
```

**Analysis pipeline** (`services/analysisService.ts`):
1. Load meeting + transcript from Supabase
2. Get user API keys
3. Build RAG context from indexed repos (`services/rag.ts`)
4. Call Claude (`services/claude.ts`) — model: `claude-sonnet-4-6`, falls back to simpler prompt on failure
5. Save `reports` row + `tasks` rows to Supabase
6. Set meeting status → `ready`

**RAG** (`services/rag.ts`):
- Repos are indexed by fetching file tree from GitHub, building summaries (`services/fileSummarizer.ts`), embedding via OpenRouter (`services/embeddings.ts`), and storing in `repo_embeddings` (pgvector, 1536-dim)
- At analysis time, keywords are extracted from the transcript and used to vector-search relevant files via `match_embeddings` Supabase RPC

**API keys** are stored per-user in the `api_keys` table (Claude key, OpenRouter key, Recall.ai key, GitHub token). The backend never uses its own LLM keys — everything comes from the user's stored keys.

## Frontend Architecture

**Stack:** React 18, React Router v7, Tailwind CSS, Supabase Auth UI

**Auth:** `useAuth` hook wraps Supabase session. `ProtectedRoute` redirects to `/auth` if unauthenticated. `AppLayout` wraps all protected pages with the sidebar nav.

**API calls:** All go through `src/lib/api.ts` which attaches the Supabase JWT and redirects to `/auth` on 401.

**Meeting status polling:** `useMeetingStatus` hook polls `GET /api/meetings/:id/status` every 5 seconds while status is not terminal (`ready` or `failed`).

**Pages:**
- `/` — `LandingPage` (public)
- `/auth` — Supabase Auth UI
- `/dashboard` — active meetings list
- `/meeting/new` — create meeting form
- `/meeting/:id` — `MeetingLivePage` (live status + inject-transcript dev tool)
- `/meeting/:id/report` — `MeetingReportPage` (summary, tasks, decisions)
- `/repos` — connect and index GitHub repos
- `/history` — past meetings
- `/settings` — API key management

## Database (Supabase + pgvector)

Schema in `supabase/migrations/schema.sql`. Key tables:
- `profiles` — linked to `auth.users`
- `api_keys` — one row per user, stores all third-party keys
- `meetings` — statuses: `scheduled | bot_joining | recording | processing | ready | failed`
- `reports` — one per meeting, JSON fields for topics/decisions/tasks
- `tasks` — extracted action items with `claude_prompt` ready for Claude Code
- `repos` / `repo_embeddings` — GitHub repo index with pgvector embeddings

The `match_embeddings` SQL function handles cosine-similarity search (threshold 0.3, returns top N).

## Development Notes

- **Inject transcript for testing:** `POST /api/meetings/:id/inject-transcript` with `{ transcript: "..." }` skips the Recall.ai flow and triggers analysis directly. The `MeetingLivePage` exposes a UI for this in development.
- **Stuck meeting recovery:** `POST /api/meetings/:id/recover` re-checks bot status and re-fetches transcript if needed.
- Recall.ai transcripts are fetched from an S3 presigned URL (polled up to 3× with 5s delay). If the URL isn't ready, the meeting is marked `failed`.
- The Claude service calls the Anthropic API directly (not SDK) using the user-supplied key.
