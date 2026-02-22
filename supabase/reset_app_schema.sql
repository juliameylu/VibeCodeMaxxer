-- Reset only this app's public tables.
-- Safe to run multiple times.
-- Does NOT drop Supabase-managed schemas (auth/storage/realtime).

begin;

drop table if exists restaurant_reservations cascade;
drop table if exists reservations cascade; -- legacy cleanup (removed from active schema)
drop table if exists user_availabilities cascade;
drop table if exists calendar_tokens cascade;
drop table if exists ai_action_logs cascade;
drop table if exists study_tasks cascade;
drop table if exists jam_members cascade;
drop table if exists jams cascade;
drop table if exists invites cascade;
drop table if exists plan_participants cascade;
drop table if exists plan_options cascade;
drop table if exists plans cascade;
drop table if exists group_members cascade;
drop table if exists groups cascade;
drop table if exists user_event_states cascade;
drop table if exists events_catalog cascade;
drop table if exists connections cascade;
drop table if exists preferences cascade;
drop table if exists profiles cascade;

commit;

-- After running this file, apply:
-- 1) supabase/schema.sql
-- 2) supabase/seed_mock_data.sql
