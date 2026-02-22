# Jarvis Workflow Implementation Notes

## What is now wired

### Branch + API wiring
- Created branch from `origin/main`: `feature/jarvis-workflow-end-to-end`.
- Mounted live backend routes in the running backend (`backend/server.js`):
  - `GET /api/events` (Cal Poly NOW + Ticketmaster feed)
  - `GET /api/places` (Yelp proxy)
  - `GET /api/mock-reservations/availability`
  - `POST /api/mock-reservations/book`
  - `GET /api/mock-reservations/:user_id`

### Explore + Booking UI flow
- Added `Restaurants` route at `/restaurants` in `src/app/routes.tsx`.
- Explore page (`src/app/pages/Explore.tsx`) now has:
  - Booking Bot CTA into `/restaurants`
  - Live event cards from `/api/events`
  - Source-specific actions:
    - Ticketmaster: one-click ticket link
    - Cal Poly NOW: RSVP/open link
  - Event reload action to force fresh scrape.
- Dashboard reservation CTA now points to `/restaurants` (no longer dead-linking to `event-brew-quiet`).

### Calendar + availability
- Added `src/lib/hooks/useUserCalendarState.js`:
  - Resolves/creates profile in Supabase.
  - Loads preferences + connections.
  - Loads availability windows from `user_availabilities`.
  - Auto-seeds deterministic fallback windows if user has none.
  - Exposes `syncMockGoogleCalendarForUser(...)` to simulate Google sync and write new windows.
- Sign-in flow (`src/app/pages/SignIn.tsx`) now:
  - Persists app session for booking/availability usage.
  - Executes mock Google sync during “Connect Calendar”.

### Reservation bot data flow
- Added `src/lib/api/backend.js` with:
  - `getMockReservationAvailability(...)`
  - `bookMockReservation(...)`
  - `listMockReservations(...)`
- Restaurants page already had notes, special requests, and availability-based slot matching.
- Added visible “My windows” and “Shared windows” chips in Restaurants UI so users can actually see availability windows used for filtering.

## Database alignment updates

Updated files:
- `supabase/schema.sql`
- `supabase/reset_app_schema.sql`
- `supabase/seed_mock_data.sql`

Schema additions/alignment include:
- Extended `preferences` fields (`price_max`, `distance_max_m`, `diet_tags`, `event_tags`, `favorite_categories`).
- Extended `connections` with `last_calendar_sync_at`.
- `user_availabilities` indexed for overlap queries.
- Added `restaurant_reservations` for detailed booking records (notes, special requests, provider/source URLs/policies).
- Removed legacy `reservations` table to keep one booking source-of-truth.
- Removed `plan_participants.availability_blocks_json`; availability source-of-truth is `user_availabilities`.

Seed now includes:
- Mock users, preferences, calendar connections.
- Multi-user availability windows (for overlap testing).
- Ticketmaster + Cal Poly NOW events.
- Group/jam data.
- Mock restaurant reservations.

## Redundancy status

1. `reservations` vs `restaurant_reservations`
- Resolved: removed `reservations`; `restaurant_reservations` is now authoritative for booking bot output.

2. `plan_participants.availability_blocks_json` vs `user_availabilities`
- Resolved: removed `availability_blocks_json` from schema; overlap logic should read `user_availabilities`.

3. Two backend stacks (`backend/*` and `server/*`)
- Partially resolved: `backend/server.js` is now the active runtime with mounted events/places/mock-reservations routes, and root `npm run dev` now starts that backend.
- Remaining cleanup: remove/deprecate duplicate `server/*` route tree after confirming nothing still imports or runs it.

## Apply + run

1. Reset + migrate + seed Supabase:
- `supabase/reset_app_schema.sql`
- `supabase/schema.sql`
- `supabase/seed_mock_data.sql`

2. Start app:
- `npm run dev`

3. Required env for live providers:
- `YELP_API_KEY` for `/api/places`
- `TICKETMASTER_API_KEY` optional (fallback fixtures are used if missing)
- Supabase env vars for server-side writes (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` preferred)
