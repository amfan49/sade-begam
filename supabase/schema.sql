-- Sade Begam Chatbot — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor

-- ── pgvector extension (for future vector search) ─────────────────
create extension if not exists vector;

-- ── Documents / News items for RAG ───────────────────────────────
-- Populated by agent/embed.js (run after approving news)
create table if not exists documents (
  id                  uuid primary key default gen_random_uuid(),
  item_id             text unique,
  date                text,
  country             text,
  source_organization text,
  headline            text,
  excerpt             text,
  source_url          text,
  lang_original       text default 'en',
  -- pgvector column (optional: use when OpenAI embedding key is available)
  embedding           vector(1536),
  -- Full-text search (free, works immediately)
  fts                 tsvector generated always as (
    to_tsvector('simple',
      coalesce(headline, '') || ' ' ||
      coalesce(excerpt, '')  || ' ' ||
      coalesce(country, '')  || ' ' ||
      coalesce(source_organization, '')
    )
  ) stored,
  created_at          timestamptz default now()
);

create index if not exists documents_fts_idx on documents using gin(fts);
-- Uncomment when embeddings are added:
-- create index if not exists documents_vec_idx on documents using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ── Chat messages (long-term memory per session) ──────────────────
create table if not exists chat_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id text not null,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  source     text default 'web' check (source in ('web', 'telegram', 'widget')),
  created_at timestamptz default now()
);

create index if not exists chat_messages_session_idx
  on chat_messages(session_id, created_at);

-- Auto-delete messages older than 90 days (optional, keeps costs low)
-- create or replace function delete_old_messages() returns trigger language plpgsql as $$
-- begin
--   delete from chat_messages where created_at < now() - interval '90 days';
--   return new;
-- end;
-- $$;

-- ── Leads (captured by chatbot) ───────────────────────────────────
create table if not exists leads (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  phone      text,
  note       text,
  source     text default 'chatbot-web',
  session_id text,
  created_at timestamptz default now()
);

create index if not exists leads_email_idx on leads(email);

-- ── Enrollments (for check_enrollment tool) ───────────────────────
-- Add rows manually or via admin panel when users sign up
create table if not exists enrollments (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  name       text,
  course     text,
  status     text default 'pending'
             check (status in ('pending', 'active', 'completed', 'cancelled')),
  created_at timestamptz default now()
);

-- ── RPC: full-text news search (used by api/chat.js) ─────────────
create or replace function search_news(
  query_text  text,
  match_count int default 3
)
returns table (
  item_id             text,
  date                text,
  country             text,
  source_organization text,
  headline            text,
  excerpt             text
)
language sql
stable
as $$
  select item_id, date, country, source_organization, headline, excerpt
  from   documents
  where  fts @@ plainto_tsquery('simple', query_text)
  order  by ts_rank(fts, plainto_tsquery('simple', query_text)) desc
  limit  match_count;
$$;

-- ── RPC: vector similarity search (add when embeddings are ready) ─
-- create or replace function search_news_vector(
--   query_embedding vector(1536),
--   match_count     int default 3
-- )
-- returns table (item_id text, headline text, excerpt text, similarity float)
-- language sql stable as $$
--   select item_id, headline, excerpt,
--          1 - (embedding <=> query_embedding) as similarity
--   from   documents
--   order  by embedding <=> query_embedding
--   limit  match_count;
-- $$;

-- ── Row Level Security (recommended for production) ───────────────
-- alter table chat_messages enable row level security;
-- alter table leads          enable row level security;
-- create policy "service role only" on chat_messages using (auth.role() = 'service_role');
-- create policy "service role only" on leads          using (auth.role() = 'service_role');
