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
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_reservation_call_jobs_user_created
  on reservation_call_jobs (user_id, created_at desc);

