-- Migration 001: Initial Relational & Vector Schema
-- Enable pgvector extension
create extension if not exists vector;

-- Profiles (linked to auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  learning_goals text,
  preferred_subjects text,
  skill_level text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Documents (PDFs uploaded)
create table if not exists documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  file_url text,
  status text default 'processing', -- processing, completed, failed
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Document Chunks (for RAG with vector embeddings)
create table if not exists document_chunks (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references documents on delete cascade not null,
  content text not null,
  embedding vector(384), -- Using all-MiniLM-L6-v2 which has 384 dimensions
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Index for fast vector similarity search
create index if not exists idx_document_chunks_vec on document_chunks using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Chat History
create table if not exists chat_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  message text not null,
  role text not null check (role in ('user', 'assistant')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Study Notes
create table if not exists study_notes (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references documents on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  summary text,
  key_points jsonb,
  concepts jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Bookmarks
create table if not exists bookmarks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text not null, -- 'note', 'chat_response'
  reference_id uuid,
  content text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Progress
create table if not exists progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  topic text not null,
  mastery_score float default 0.0,
  questions_asked integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Notifications
create table if not exists notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  message text not null,
  read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RAG Search Function
create or replace function match_document_chunks (
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
returns table (
  id uuid,
  document_id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  join documents d on d.id = dc.document_id
  where d.user_id = p_user_id
    and 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
