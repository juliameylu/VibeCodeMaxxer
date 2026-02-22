-- SLO Planner v1 schema contract (Supabase/Postgres)

create table if not exists profiles (
  id uuid primary key,
  email text not null unique,
  display_name text,
  cal_poly_email text,
  onboarding_complete boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  categories text[] default '{}',
  vibe text,
  budget text,
  transport text,
  updated_at timestamptz default now()
);

create table if not exists connections (
  user_id uuid primary key references profiles(id) on delete cascade,
  calendar_google_connected boolean default false,
  calendar_ics_connected boolean default false,
  canvas_connected boolean default false,
  canvas_mode text,
  updated_at timestamptz default now()
);

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
  availability_blocks_json jsonb,
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

create index if not exists idx_user_availabilities_user_time on user_availabilities (user_id, start_at, end_at);

create table if not exists reservations (
  id uuid primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  item_id text not null,
  item_title text not null,
  provider text not null,
  slot_start_at timestamptz not null,
  slot_end_at timestamptz not null,
  notes text,
  participants_json jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);
