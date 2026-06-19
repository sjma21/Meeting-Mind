-- Enable pgvector extension
create extension if not exists vector;

-- Profiles table
create table if not exists profiles (
  id uuid references auth.users primary key,
  name text,
  created_at timestamptz default now()
);

-- API keys table (one row per user)
create table if not exists api_keys (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  claude_key text,
  openrouter_key text,
  recall_key text,
  github_token text,
  created_at timestamptz default now(),
  unique(user_id)
);

-- Repos table
create table if not exists repos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  owner text not null,
  url text not null,
  indexed boolean default false,
  indexed_at timestamptz,
  file_count int default 0,
  created_at timestamptz default now()
);

-- Repo embeddings table
create table if not exists repo_embeddings (
  id uuid default gen_random_uuid() primary key,
  repo_id uuid references repos(id) on delete cascade,
  file_path text not null,
  content_summary text,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamptz default now()
);

-- Meetings table
create table if not exists meetings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  meeting_url text,
  recall_bot_id text,
  status text default 'scheduled',
  -- scheduled, bot_joining, recording, processing, ready, failed
  duration int,
  participant_names jsonb,
  transcript text,
  error_message text,
  created_at timestamptz default now(),
  ended_at timestamptz
);

-- Reports table
create table if not exists reports (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid references meetings(id) on delete cascade,
  summary text,
  topics jsonb,
  decisions jsonb,
  follow_up_questions jsonb,
  unassigned_tasks jsonb,
  participant_roles jsonb,
  manager_name text,
  employee_name text,
  created_at timestamptz default now()
);

-- Tasks table
create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid references meetings(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  description text,
  assignee_name text,
  priority text default 'medium',
  status text default 'pending',
  deadline text,
  exact_quote text,
  files jsonb,
  claude_prompt text,
  notes text,
  created_at timestamptz default now()
);

-- Semantic search function
create or replace function match_embeddings(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_repo_id uuid
)
returns table (
  file_path text,
  content_summary text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    file_path,
    content_summary,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  from repo_embeddings
  where repo_id = p_repo_id
  and 1 - (embedding <=> query_embedding) > match_threshold
  order by embedding <=> query_embedding
  limit match_count;
$$;
