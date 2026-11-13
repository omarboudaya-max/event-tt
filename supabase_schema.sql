-- ============================================================================
-- MEDRH 10ème Édition — "PIT STOP & GO !"
-- Atelier : Le Leadership inclusif au service de la performance collective
-- Animation : Meriam BEN TANFOUS | Visualisation : Malak DERBEL
-- ============================================================================
-- NOTE: The app works IMMEDIATELY out-of-the-box via Supabase Realtime Channels
-- (Broadcast + Presence) even BEFORE running this SQL script!
-- Running this SQL script in your Supabase SQL Editor adds persistent Postgres
-- storage across server restarts and full historical export.
-- ============================================================================

create table if not exists public.pitstop_sessions (
  room_code text primary key,
  phase text not null default 'LOBBY',
  current_tour integer not null default 1,
  timer_seconds integer not null default 720,
  timer_running boolean not null default false,
  active_wheel_table integer not null default 1,
  active_sub_question integer not null default 0,
  spotlight_idea_id text,
  updated_at timestamptz not null default now()
);

create table if not exists public.pitstop_players (
  id text primary key,
  room_code text not null,
  name text not null,
  company text default '',
  role text not null default 'VOYAGEUR', -- 'HOTE' | 'VOYAGEUR'
  initial_table integer not null default 1, -- 1, 2, or 3
  current_table integer not null default 1, -- 1, 2, or 3
  score integer not null default 0,
  joined_at timestamptz not null default now()
);

create table if not exists public.pitstop_ideas (
  id text primary key,
  room_code text not null,
  table_id integer not null, -- 1, 2, or 3
  sub_question_idx integer not null, -- 0, 1, or 2
  tour integer not null default 1, -- 1, 2, or 3
  author_id text not null,
  author_name text not null,
  author_role text not null default 'VOYAGEUR',
  content text not null,
  votes integer not null default 0,
  voters jsonb not null default '[]'::jsonb,
  is_key_finding boolean not null default false,
  hote_summary_note text default '',
  created_at timestamptz not null default now()
);

-- Enable Row Level Security (Open for live event workshop participation)
alter table public.pitstop_sessions enable row level security;
alter table public.pitstop_players enable row level security;
alter table public.pitstop_ideas enable row level security;

drop policy if exists "Public access pitstop_sessions" on public.pitstop_sessions;
create policy "Public access pitstop_sessions" on public.pitstop_sessions for all using (true) with check (true);

drop policy if exists "Public access pitstop_players" on public.pitstop_players;
create policy "Public access pitstop_players" on public.pitstop_players for all using (true) with check (true);

drop policy if exists "Public access pitstop_ideas" on public.pitstop_ideas;
create policy "Public access pitstop_ideas" on public.pitstop_ideas for all using (true) with check (true);

-- Enable Realtime on these tables
alter publication supabase_realtime add table public.pitstop_sessions;
alter publication supabase_realtime add table public.pitstop_players;
alter publication supabase_realtime add table public.pitstop_ideas;
