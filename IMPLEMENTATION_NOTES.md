# Cloud Codex rollout notes

## Backend command mapping (no ambiguity)
- `npm run dev` starts **both** backend (`node backend/server.js`) and frontend (`vite`).
- `npm run backend` starts only the active backend entrypoint: `backend/server.js`.
- `npm run dev:frontend` starts only frontend UI (requires backend running separately for API routes).

## What I changed
- Added mock Google auth endpoint: `POST /api/auth/google/mock` (lets you test real-ish OAuth flow without blocking dummy user creation).
- Added availability APIs:
  - `GET /api/availability`
  - `POST /api/availability`
  - `GET /api/availability/overlap?with=<userId,userId>`
- Upgraded booking APIs:
  - `POST /api/booking/intent` now returns provider + suggested slots (single-user or group availability).
  - `POST /api/booking/confirm` stores reservation with notes + selected slot.
- Added Cal Poly NOW scraper endpoint:
  - `GET /api/calpoly-now/events?interests=music,career`
- Refactored Event Details booking modal to:
  - fetch suggested slots
  - toggle group availability
  - collect notes
  - confirm booking through backend endpoint

## DB alignment updates
- Added tables in `supabase/schema.sql`:
  - `calendar_tokens`
  - `user_availabilities`
  - `reservations`
- Added scripts:
  - `supabase/reset_app_schema.sql`
  - `supabase/seed_mock_data.sql`

## Dependencies and API keys
No new npm dependencies were required.

## Clarifications requested in review
### "Fully remove remaining edge-function booking references" means
- Remove every `https://${projectId}.supabase.co/functions/v1/.../book` booking call from UI and backend codepaths.
- Ensure booking actions only use local APIs (`/api/booking/intent`, `/api/booking/confirm`) so behavior is consistent in local + cloud runs.
- Keep non-booking edge-function usages (for example media upload) only if intentionally still part of product behavior.

### Is email auth functional right now?
- **Yes**, but there are two auth tracks in this repo:
  1. Active in-memory API auth in `backend/plannerApi.js` (`/api/auth/signup`, `/api/auth/signin`, `/api/auth/session-bootstrap`).
  2. Supabase auth flow in `src/app/pages/SignIn.tsx`.
- In-memory email auth is functional for local testing and dummy users, but it is not durable across server restarts.
- Supabase email/password depends on your Supabase project configuration and keys.

### Practical recommendation
- For deterministic local testing of preferences/availability/booking, use API auth from `backend/plannerApi.js`.
- For production-like sign-in, use Supabase or a full Google OAuth integration, then map successful auth users into your app profile tables.

### Optional env vars (recommended)
- `BACKEND_PORT` (default `8787`)
- `BACKEND_HOST` (default `0.0.0.0`)
- `CORS_ORIGIN` (comma-separated frontend origins)
- `OPENAI_API_KEY` (only needed for `/api/agent/chat` AI completion)

### External APIs
- Yelp and Ticketmaster are currently modeled as external deep links in booking responses.
- Google Calendar currently supports mock/link-state and availability plumbing.
- Cal Poly NOW uses scraping (no API key currently required).

## Setup instructions
1. Install deps: `npm install`
2. Start full app: `npm run dev`
3. Optional (DB prep):
   - apply `supabase/reset_app_schema.sql`
   - apply `supabase/schema.sql`
   - apply `supabase/seed_mock_data.sql`

## Branch matrix (clean comparison)
- `work`:
  - Email auth only (`/api/auth/signup`, `/api/auth/signin`, `/api/auth/session-bootstrap`).
  - Availability + booking + Cal Poly NOW scraper included.
- `feature/google-auth-optional`:
  - Same as `work` + `POST /api/auth/google/mock` for optional mock Google auth testing.
- `feature/yelp-autobook`:
  - Pointer branch for Yelp autobooking stream (currently same code snapshot as `feature/google-auth-optional`).
- `feature/ticketmaster-autobook`:
  - Pointer branch for Ticketmaster stream (currently same code snapshot as `feature/google-auth-optional`).
- `feature/all-additional-features` (master test branch):
  - Combined test branch with booking/availability/scraper + optional Google mock auth endpoint.

## Recommended branch to test now
- Checkout `feature/all-additional-features`.
- Run:
  1. `npm install`
  2. `npm run dev`
  3. Open `http://localhost:5173`
- Backend-only API checks (new terminal):
  1. `curl -X POST http://localhost:8787/api/auth/signup -H 'content-type: application/json' -d '{"email":"tester@example.com","password":"pw123","displayName":"Tester"}'`
  2. `curl -X POST http://localhost:8787/api/auth/google/mock -H 'content-type: application/json' -d '{"email":"tester@calpoly.edu","displayName":"Tester"}'`
  3. Use returned `sessionToken` as `x-session-token` for:
     - `POST /api/availability`
     - `POST /api/booking/intent`
     - `POST /api/booking/confirm`
     - `GET /api/calpoly-now/events?interests=music`

## How to test auth (real users + dummy users)
### Real-user style (Google mock)
1. `POST /api/auth/google/mock` with `{ "email": "you@calpoly.edu", "displayName": "You" }`
2. Save `sessionToken`.
3. Use token in `x-session-token` for all subsequent endpoints.

### Dummy user style (preferences testing)
1. `POST /api/auth/signup` with throwaway email/password.
2. `POST /api/preferences` with your preference payload.
3. `POST /api/availability` to insert availability blocks.
4. `GET /api/booking/intent` + `POST /api/booking/confirm` to validate preferences+availability flow.

## Redundancy review + permission request
Potential redundancy from your earlier note:
- The `server/src/*` alternate backend does **not** exist in this checkout; only `backend/*` is runnable right now.
- There are duplicated files like `* 2.js` / `* 2.jsx` that look like backup copies and may be removable.

Before I remove or rewrite any redundant backend/schema paths, please confirm:
1. Should I delete duplicate `* 2.*` files?
2. Do you want me to fully remove all Supabase edge-function booking references from UI now?
3. Should I make `google/mock` the default sign-in path in UI, or keep email+guest default?

## Agent split (cloud workstream proposal)
- Agent A: Auth + profile strategy (Google + dummy-user dual mode)
- Agent B: Availability model + overlap resolver + UI exposure
- Agent C: Booking bot orchestration (Yelp first path)
- Agent D: Ticketmaster one-click branch
- Agent E: Cal Poly NOW scrape + interest-matching feed
- Agent F: Schema/seed/reset + migration safety checks

This commit includes groundwork for A/B/C/E/F in one branch to unblock iterative branch splits next.
