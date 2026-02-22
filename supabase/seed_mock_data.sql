-- Seed data for local testing against supabase/schema.sql
-- Safe to re-run (uses upserts).

insert into profiles (id, email, display_name, cal_poly_email, onboarding_complete, created_at, updated_at)
values
  ('95bbf252-fbd8-42c5-a6fb-04f50e4924ef', 'ceyannabadyal@gmail.com', 'Ceyanna Badyal', 'ceyannabadyal@calpoly.edu', true, now(), now()),
  ('2e4ec7d1-1b2e-4efe-a3b8-f912d4e539b6', 'meow@gmail.com', 'Meow', 'meow@calpoly.edu', true, now(), now()),
  ('6f0f8e72-8717-4b8d-a2ea-e2dca4e5f111', 'faith@calpoly.edu', 'Faith Johnson', 'faith@calpoly.edu', true, now(), now()),
  ('61fbbf57-b7c6-4ddd-aa9f-caf3afba2222', 'maria@calpoly.edu', 'Maria Lopez', 'maria@calpoly.edu', true, now(), now()),
  ('3f1b578d-51e6-4f84-b0f5-9cf6d4dc3333', 'devin@calpoly.edu', 'Devin Patel', 'devin@calpoly.edu', true, now(), now())
on conflict (id) do update
set
  email = excluded.email,
  display_name = excluded.display_name,
  cal_poly_email = excluded.cal_poly_email,
  onboarding_complete = excluded.onboarding_complete,
  updated_at = now();

insert into preferences (
  user_id,
  categories,
  vibe,
  budget,
  transport,
  price_max,
  distance_max_m,
  diet_tags,
  event_tags,
  favorite_categories,
  updated_at
)
values
  ('95bbf252-fbd8-42c5-a6fb-04f50e4924ef', array['food','coffee','events'], 'adventurous', 'medium', 'drive', '$$$', 5000, array['vegetarian'], array['concerts','talks'], array['restaurants','events','campus'], now()),
  ('2e4ec7d1-1b2e-4efe-a3b8-f912d4e539b6', array['coffee','study','events'], 'chill', 'low', 'walk', '$$', 2500, array['gluten-free'], array['study','coffee'], array['coffee','events'], now()),
  ('61fbbf57-b7c6-4ddd-aa9f-caf3afba2222', array['food','community'], 'social', 'medium', 'walk', '$$$', 3000, array[]::text[], array['community'], array['restaurants','community'], now()),
  ('3f1b578d-51e6-4f84-b0f5-9cf6d4dc3333', array['events','sports'], 'active', 'medium', 'bike', '$$$', 4000, array[]::text[], array['sports','music'], array['events','outdoor'], now()),
  ('6f0f8e72-8717-4b8d-a2ea-e2dca4e5f111', array['events','food'], 'balanced', 'medium', 'walk', '$$$', 3200, array['dairy-free'], array['talks','community'], array['events','coffee'], now())
on conflict (user_id) do update
set
  categories = excluded.categories,
  vibe = excluded.vibe,
  budget = excluded.budget,
  transport = excluded.transport,
  price_max = excluded.price_max,
  distance_max_m = excluded.distance_max_m,
  diet_tags = excluded.diet_tags,
  event_tags = excluded.event_tags,
  favorite_categories = excluded.favorite_categories,
  updated_at = now();

insert into connections (
  user_id,
  calendar_google_connected,
  calendar_ics_connected,
  canvas_connected,
  canvas_mode,
  last_calendar_sync_at,
  updated_at
)
values
  ('95bbf252-fbd8-42c5-a6fb-04f50e4924ef', true, false, true, 'token', now(), now()),
  ('2e4ec7d1-1b2e-4efe-a3b8-f912d4e539b6', true, false, false, null, now(), now()),
  ('61fbbf57-b7c6-4ddd-aa9f-caf3afba2222', true, true, true, 'oauth', now(), now()),
  ('3f1b578d-51e6-4f84-b0f5-9cf6d4dc3333', true, false, false, null, now(), now()),
  ('6f0f8e72-8717-4b8d-a2ea-e2dca4e5f111', true, false, true, 'oauth', now(), now())
on conflict (user_id) do update
set
  calendar_google_connected = excluded.calendar_google_connected,
  calendar_ics_connected = excluded.calendar_ics_connected,
  canvas_connected = excluded.canvas_connected,
  canvas_mode = excluded.canvas_mode,
  last_calendar_sync_at = excluded.last_calendar_sync_at,
  updated_at = now();

insert into user_availabilities (id, user_id, start_at, end_at, source, created_at)
values
  ('11111111-aaaa-4aaa-8aaa-111111111111', '95bbf252-fbd8-42c5-a6fb-04f50e4924ef', date_trunc('day', now()) + interval '1 day 17 hours 30 minutes', date_trunc('day', now()) + interval '1 day 19 hours', 'google_calendar', now()),
  ('11111111-bbbb-4bbb-8bbb-111111111111', '95bbf252-fbd8-42c5-a6fb-04f50e4924ef', date_trunc('day', now()) + interval '1 day 20 hours 15 minutes', date_trunc('day', now()) + interval '1 day 22 hours', 'google_calendar', now()),
  ('22222222-aaaa-4aaa-8aaa-222222222222', '2e4ec7d1-1b2e-4efe-a3b8-f912d4e539b6', date_trunc('day', now()) + interval '1 day 18 hours', date_trunc('day', now()) + interval '1 day 19 hours 30 minutes', 'google_calendar', now()),
  ('22222222-bbbb-4bbb-8bbb-222222222222', '2e4ec7d1-1b2e-4efe-a3b8-f912d4e539b6', date_trunc('day', now()) + interval '1 day 20 hours', date_trunc('day', now()) + interval '1 day 21 hours 45 minutes', 'google_calendar', now()),
  ('33333333-aaaa-4aaa-8aaa-333333333333', '61fbbf57-b7c6-4ddd-aa9f-caf3afba2222', date_trunc('day', now()) + interval '1 day 17 hours 45 minutes', date_trunc('day', now()) + interval '1 day 19 hours 15 minutes', 'google_calendar', now()),
  ('33333333-bbbb-4bbb-8bbb-333333333333', '61fbbf57-b7c6-4ddd-aa9f-caf3afba2222', date_trunc('day', now()) + interval '1 day 20 hours 30 minutes', date_trunc('day', now()) + interval '1 day 22 hours 15 minutes', 'manual', now()),
  ('44444444-aaaa-4aaa-8aaa-444444444444', '3f1b578d-51e6-4f84-b0f5-9cf6d4dc3333', date_trunc('day', now()) + interval '2 day 18 hours', date_trunc('day', now()) + interval '2 day 20 hours', 'google_calendar', now()),
  ('55555555-aaaa-4aaa-8aaa-555555555555', '6f0f8e72-8717-4b8d-a2ea-e2dca4e5f111', date_trunc('day', now()) + interval '2 day 17 hours 30 minutes', date_trunc('day', now()) + interval '2 day 20 hours 15 minutes', 'google_calendar', now())
on conflict (id) do update
set
  user_id = excluded.user_id,
  start_at = excluded.start_at,
  end_at = excluded.end_at,
  source = excluded.source;

insert into events_catalog (id, title, category, description, payload, created_at)
values
  ('event:calpoly-now:mustang-welcome-concert', 'Mustang Welcome Concert', 'Music', 'Live student bands and food trucks to kick off the weekend.', '{"startTime":"2026-02-24T03:00:00.000Z","endTime":"2026-02-24T05:00:00.000Z","location":"UU Plaza","url":"https://now.calpoly.edu/","source":"calpoly_now"}'::jsonb, now()),
  ('event:calpoly-now:ai-ethics-panel', 'AI Ethics Panel', 'Talks', 'Faculty discuss ethics in generative AI on campus.', '{"startTime":"2026-03-02T20:10:00.000Z","endTime":"2026-03-02T21:00:00.000Z","location":"Frost Center 110","url":"https://now.calpoly.edu/","source":"calpoly_now"}'::jsonb, now()),
  ('event:ticketmaster:downtown-slo-indie-night', 'Downtown SLO Indie Night', 'Music', 'Ticketmaster listing for an indie showcase in downtown SLO.', '{"startTime":"2026-03-08T03:00:00.000Z","endTime":"2026-03-08T05:00:00.000Z","location":"SLO Brew Rock","url":"https://www.ticketmaster.com/search?q=Downtown%20SLO%20Indie%20Night","source":"ticketmaster"}'::jsonb, now()),
  ('event:ticketmaster:central-coast-speaker-series', 'Central Coast Speaker Series', 'Talks', 'Ticketmaster listing for the Central Coast Speaker Series.', '{"startTime":"2026-03-09T02:00:00.000Z","endTime":"2026-03-09T04:00:00.000Z","location":"Cal Poly PAC","url":"https://www.ticketmaster.com/search?q=Central%20Coast%20Speaker%20Series","source":"ticketmaster"}'::jsonb, now())
on conflict (id) do update
set
  title = excluded.title,
  category = excluded.category,
  description = excluded.description,
  payload = excluded.payload;

insert into groups (id, owner_user_id, name, created_at)
values
  ('4d4237d0-b8c0-4a28-8078-d2789e4f1001', '95bbf252-fbd8-42c5-a6fb-04f50e4924ef', 'Weekend Crew', now()),
  ('4d4237d0-b8c0-4a28-8078-d2789e4f1002', '2e4ec7d1-1b2e-4efe-a3b8-f912d4e539b6', 'Coffee Study Squad', now())
on conflict (id) do update
set
  owner_user_id = excluded.owner_user_id,
  name = excluded.name;

insert into group_members (id, group_id, member_type, user_id, phone, email, display_name)
values
  ('9f2f2c5e-0f62-4d0e-b5b9-6f5be6a21001', '4d4237d0-b8c0-4a28-8078-d2789e4f1001', 'registered', '95bbf252-fbd8-42c5-a6fb-04f50e4924ef', null, 'ceyannabadyal@gmail.com', 'Ceyanna'),
  ('9f2f2c5e-0f62-4d0e-b5b9-6f5be6a21002', '4d4237d0-b8c0-4a28-8078-d2789e4f1001', 'registered', '2e4ec7d1-1b2e-4efe-a3b8-f912d4e539b6', null, 'meow@gmail.com', 'Meow'),
  ('9f2f2c5e-0f62-4d0e-b5b9-6f5be6a21003', '4d4237d0-b8c0-4a28-8078-d2789e4f1002', 'registered', '61fbbf57-b7c6-4ddd-aa9f-caf3afba2222', null, 'maria@calpoly.edu', 'Maria')
on conflict (id) do update
set
  group_id = excluded.group_id,
  member_type = excluded.member_type,
  user_id = excluded.user_id,
  phone = excluded.phone,
  email = excluded.email,
  display_name = excluded.display_name;

insert into plans (id, host_user_id, title, constraints_json, status, finalized_option_json, created_at)
values
  ('f704f6da-2b55-4c49-b6e3-cfd643be1001', '95bbf252-fbd8-42c5-a6fb-04f50e4924ef', 'Friday Dinner + Show', '{"budget":"$$$","categories":["restaurant","music"],"partySize":3}'::jsonb, 'draft', null, now()),
  ('f704f6da-2b55-4c49-b6e3-cfd643be1002', '2e4ec7d1-1b2e-4efe-a3b8-f912d4e539b6', 'Sunday Study + Coffee', '{"budget":"$$","categories":["coffee","study"],"partySize":2}'::jsonb, 'finalized', '{"restaurant":"Nautical Bean","time":"2026-03-09T17:00:00.000Z"}'::jsonb, now())
on conflict (id) do update
set
  host_user_id = excluded.host_user_id,
  title = excluded.title,
  constraints_json = excluded.constraints_json,
  status = excluded.status,
  finalized_option_json = excluded.finalized_option_json;

insert into restaurant_reservations (
  id,
  user_id,
  reservation_id,
  restaurant_entity_id,
  restaurant_name,
  slot_id,
  start_ts,
  end_ts,
  party_size,
  special_requests,
  notes,
  status,
  provider,
  source,
  reservation_url,
  cancellation_policy,
  created_at,
  updated_at
)
values
  ('92ec847c-6f5c-4578-985c-168f9cbe1001', '95bbf252-fbd8-42c5-a6fb-04f50e4924ef', 'rsv_000001', 'restaurant:scout-coffee-downtown', 'Scout Coffee Downtown', 'slot_demo_1730', date_trunc('day', now()) + interval '1 day 18 hours', date_trunc('day', now()) + interval '1 day 19 hours 30 minutes', 2, array['allergy-aware prep','quiet seating'], 'Peanut allergy, toddler in group.', 'confirmed', 'yelp', 'mock_yelp', 'https://www.yelp.com/reservations/scout-coffee-downtown', 'Free cancellation up to 2 hours before reservation time.', now(), now()),
  ('92ec847c-6f5c-4578-985c-168f9cbe1002', '2e4ec7d1-1b2e-4efe-a3b8-f912d4e539b6', 'rsv_000002', 'restaurant:luna-red', 'Luna Red', 'slot_demo_1900', date_trunc('day', now()) + interval '2 day 19 hours', date_trunc('day', now()) + interval '2 day 20 hours 30 minutes', 4, array['birthday/celebration'], 'Prefer patio if available.', 'confirmed', 'yelp', 'mock_yelp', 'https://www.yelp.com/reservations/luna-red', 'Free cancellation up to 2 hours before reservation time.', now(), now())
on conflict (reservation_id) do update
set
  user_id = excluded.user_id,
  restaurant_entity_id = excluded.restaurant_entity_id,
  restaurant_name = excluded.restaurant_name,
  slot_id = excluded.slot_id,
  start_ts = excluded.start_ts,
  end_ts = excluded.end_ts,
  party_size = excluded.party_size,
  special_requests = excluded.special_requests,
  notes = excluded.notes,
  status = excluded.status,
  provider = excluded.provider,
  source = excluded.source,
  reservation_url = excluded.reservation_url,
  cancellation_policy = excluded.cancellation_policy,
  updated_at = now();
