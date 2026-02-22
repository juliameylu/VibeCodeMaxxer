-- Seed data for local/testing flows
insert into profiles (id, email, display_name, cal_poly_email, onboarding_complete)
values
  ('11111111-1111-1111-1111-111111111111', 'real.user@calpoly.edu', 'Real User', 'real.user@calpoly.edu', true),
  ('22222222-2222-2222-2222-222222222222', 'dummy.friend@guest.local', 'Dummy Friend', null, true)
on conflict (id) do nothing;

insert into preferences (user_id, categories, vibe, budget, transport)
values
  ('11111111-1111-1111-1111-111111111111', array['food','concerts','campus'], 'active', 'medium', 'car'),
  ('22222222-2222-2222-2222-222222222222', array['food','outdoor'], 'chill', 'low', 'walk')
on conflict (user_id) do nothing;

insert into connections (user_id, calendar_google_connected, calendar_ics_connected, canvas_connected, canvas_mode)
values
  ('11111111-1111-1111-1111-111111111111', true, false, false, null),
  ('22222222-2222-2222-2222-222222222222', false, true, false, null)
on conflict (user_id) do nothing;

insert into user_availabilities (id, user_id, start_at, end_at, source)
values
  ('aaaaaaaa-1111-1111-1111-111111111111','11111111-1111-1111-1111-111111111111', now() + interval '1 hour', now() + interval '2 hour', 'google_calendar'),
  ('bbbbbbbb-2222-2222-2222-222222222222','22222222-2222-2222-2222-222222222222', now() + interval '90 minutes', now() + interval '150 minutes', 'manual')
on conflict (id) do nothing;

insert into reservations (id, user_id, item_id, item_title, provider, slot_start_at, slot_end_at, notes, participants_json)
values
  ('cccccccc-3333-3333-3333-333333333333','11111111-1111-1111-1111-111111111111','event-brew-quiet','The Brew Coffeehouse','yelp', now() + interval '1 hour', now() + interval '2 hour', 'Window table if possible', '["11111111-1111-1111-1111-111111111111","22222222-2222-2222-2222-222222222222"]'::jsonb)
on conflict (id) do nothing;
