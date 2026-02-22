alter table if exists reservation_call_jobs
  add column if not exists confirmed_reservation_id text;

alter table if exists reservation_call_jobs
  add column if not exists confirmed_plan_id uuid;
