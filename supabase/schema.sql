-- SLO Planner schema contract (Supabase/Postgres)
-- Additive-first design: this file supports fresh setup and incremental upgrades.

create table if not exists profiles (
  id uuid primary key,
  email text not null unique,
  display_name text,
  cal_poly_email text,
  phone text,
  onboarding_complete boolean default false,
  mock_calendar_data_json jsonb not null default '{}'::jsonb,
  jarvis_chat_data_json jsonb not null default '{"messages":[],"updated_at":null}'::jsonb,
  canvas_link_data_json jsonb not null default '{}'::jsonb,
  mock_friend_user_ids uuid[] not null default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles add column if not exists mock_calendar_data_json jsonb not null default '{}'::jsonb;
alter table profiles add column if not exists jarvis_chat_data_json jsonb not null default '{"messages":[],"updated_at":null}'::jsonb;
alter table profiles add column if not exists canvas_link_data_json jsonb not null default '{}'::jsonb;
alter table profiles add column if not exists mock_friend_user_ids uuid[] not null default '{}';
alter table profiles add column if not exists phone text;

create table if not exists preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  categories text[] default '{}',
  vibe text,
  budget text,
  transport text,
  price_max text,
  distance_max_m integer,
  diet_tags text[] default '{}',
  event_tags text[] default '{}',
  favorite_categories text[] default '{}',
  updated_at timestamptz default now()
);

alter table preferences add column if not exists categories text[] default '{}';
alter table preferences add column if not exists vibe text;
alter table preferences add column if not exists budget text;
alter table preferences add column if not exists transport text;
alter table preferences add column if not exists price_max text;
alter table preferences add column if not exists distance_max_m integer;
alter table preferences add column if not exists diet_tags text[] default '{}';
alter table preferences add column if not exists event_tags text[] default '{}';
alter table preferences add column if not exists favorite_categories text[] default '{}';
alter table preferences add column if not exists updated_at timestamptz default now();

create table if not exists connections (
  user_id uuid primary key references profiles(id) on delete cascade,
  calendar_google_connected boolean default false,
  calendar_ics_connected boolean default false,
  canvas_connected boolean default false,
  canvas_mode text,
  last_calendar_sync_at timestamptz,
  updated_at timestamptz default now()
);

alter table connections add column if not exists calendar_google_connected boolean default false;
alter table connections add column if not exists calendar_ics_connected boolean default false;
alter table connections add column if not exists canvas_connected boolean default false;
alter table connections add column if not exists canvas_mode text;
alter table connections add column if not exists last_calendar_sync_at timestamptz;
alter table connections add column if not exists updated_at timestamptz default now();

create table if not exists calendar_tokens (
  user_id uuid primary key references profiles(id) on delete cascade,
  provider text not null,
  access_token text,
  refresh_token text,
  scope text,
  expires_at timestamptz,
  updated_at timestamptz default now()
);

create table if not exists events_catalog (
  id text primary key,
  title text not null,
  category text not null,
  description text,
  payload jsonb,
  created_at timestamptz default now()
);

create table if not exists user_event_states (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  event_id text not null,
  state text not null,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists groups (
  id uuid primary key,
  owner_user_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists group_members (
  id uuid primary key,
  group_id uuid not null references groups(id) on delete cascade,
  member_type text not null,
  user_id uuid,
  phone text,
  email text,
  display_name text
);

create table if not exists plans (
  id uuid primary key,
  host_user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  constraints_json jsonb,
  status text,
  finalized_option_json jsonb,
  created_at timestamptz default now()
);

create table if not exists plan_options (
  id uuid primary key,
  plan_id uuid not null references plans(id) on delete cascade,
  option_json jsonb,
  score numeric,
  rank int
);

create table if not exists plan_participants (
  id uuid primary key,
  plan_id uuid not null references plans(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  rsvp text,
  comment text,
  created_at timestamptz default now()
);

create table if not exists invites (
  id uuid primary key,
  token text not null unique,
  entity_type text not null,
  entity_id text not null,
  created_by uuid references profiles(id),
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists jams (
  id uuid primary key,
  code text not null unique,
  host_user_id uuid not null references profiles(id),
  name text,
  status text,
  created_at timestamptz default now()
);

create table if not exists jam_members (
  id uuid primary key,
  jam_id uuid not null references jams(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text,
  joined_at timestamptz default now()
);

create table if not exists study_tasks (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  source text not null,
  title text not null,
  due_at timestamptz,
  course text,
  done boolean default false,
  created_at timestamptz default now()
);

create table if not exists ai_action_logs (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  prompt text,
  proposed_actions_json jsonb,
  confirmed_action_id text,
  created_at timestamptz default now()
);

create table if not exists user_availabilities (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  source text not null default 'manual',
  created_at timestamptz default now()
);

create index if not exists idx_user_availabilities_user_time
  on user_availabilities (user_id, start_at, end_at);

create table if not exists restaurant_reservations (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  reservation_id text not null unique,
  restaurant_entity_id text not null,
  restaurant_name text not null,
  slot_id text not null,
  start_ts timestamptz not null,
  end_ts timestamptz not null,
  party_size integer not null,
  special_requests text[] default '{}',
  notes text,
  status text not null default 'confirmed',
  provider text default 'yelp',
  source text default 'mock_yelp',
  reservation_url text,
  cancellation_policy text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_restaurant_reservations_user_time
  on restaurant_reservations (user_id, start_ts desc);

create table if not exists reservation_call_jobs (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  restaurant_name text not null,
  reservation_time text not null,
  party_size integer not null default 2,
  special_request text,
  group_id text,
  target_number text,
  caller_number text,
  call_sid text,
  status text not null default 'queued',
  decision_digit text default '',
  reservation_decision text not null default 'pending',
  retry_used integer not null default 0,
  max_retries integer not null default 0,
  last_error text,
  sms_state text default 'pending',
  sms_sent integer not null default 0,
  sms_failed integer not null default 0,
  sms_recipients integer not null default 0,
  sms_errors_json jsonb not null default '[]'::jsonb,
  attempts_json jsonb not null default '[]'::jsonb,
  confirmed_reservation_id text,
  confirmed_plan_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table reservation_call_jobs add column if not exists confirmed_reservation_id text;
alter table reservation_call_jobs add column if not exists confirmed_plan_id uuid;

create index if not exists idx_reservation_call_jobs_user_created
  on reservation_call_jobs (user_id, created_at desc);

create index if not exists idx_events_catalog_created_at
  on events_catalog (created_at desc);
