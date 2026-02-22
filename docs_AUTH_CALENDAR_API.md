# Auth + Calendar API Workflow (Mock Now, Real Later)

This document describes the current frontend flow and the backend APIs required for user identity + calendar linking.

## 1) Mock Login Credentials

Use `/login` with these demo credentials:

- faith / faith123
- maria / maria123
- devin / devin123

Session is stored in localStorage key:
- `slo_day_session_v1`

Stored fields:
- `user_id` (mock user alias for frontend session)
- `username`
- `name`
- `email`
- `timezone`
- `logged_in_at`

## 2) Backend APIs Used by Frontend

Base URL:
- `VITE_BACKEND_BASE_URL` (default `http://localhost:3001`)

### User + Preferences
- `POST /api/users`
  - body: `{ email, timezone }`
  - behavior: create-if-not-exists and return canonical backend user (`u_*`)

- `GET /api/preferences/:user_id`
  - returns stored preferences

### Calendar Link + Sync
- `POST /api/calendar/connect`
  - body: `{ user_id, provider: "google" }`
  - returns `{ auth_url, state }`

- `POST /api/calendar/callback`
  - body: `{ state, code }`
  - marks calendar account as connected

- `POST /api/calendar/sync`
  - body: `{ user_id }`
  - generates/syncs availability windows

- `GET /api/calendar/status/:user_id`
  - returns `{ status, last_sync_at, provider }`

- `GET /api/availability/:user_id?start_ts=<UTC_ISO>&end_ts=<UTC_ISO>`
  - returns availability windows in requested range

### Mock Restaurant Reservations
- `GET /api/mock-reservations/availability`
  - query: `restaurant_id`, optional `restaurant_name`, optional `date`
- `POST /api/mock-reservations/book`
  - body:
    - `user_id`
    - `restaurant_id`
    - `restaurant_name`
    - `slot_id`
    - `start_ts`
    - `end_ts`
    - `party_size`
    - `special_requests` (string[])
    - `notes` (string)
- `GET /api/mock-reservations/:user_id`

## 3) Frontend Profile Flow

On `/profile`:

1. Read logged-in mock session from localStorage.
2. For logged-in user and selected compare user:
   - `POST /api/users`
   - `GET /api/preferences/:user_id`
   - `GET /api/calendar/status/:user_id`
   - if connected: `GET /api/availability/:user_id?...`
3. On "Link Google Calendar" button click:
   - `POST /api/calendar/connect`
   - `POST /api/calendar/callback`
   - `POST /api/calendar/sync`
   - refresh status + availability
4. Compute overlap windows client-side for display.

## 4) Two-Browser Test Workflow

Use separate browser storage contexts:

- Browser A (or normal Chrome):
  1. open `/login`
  2. login as `faith / faith123`
  3. open `/profile`
  4. click "Link Google Calendar"

- Browser B (or Incognito/Firefox):
  1. open `/login`
  2. login as `maria / maria123`
  3. open `/profile`
  4. click "Link Google Calendar"

Result:
- each browser has independent session
- both hit same backend contract
- each user gets deterministic mock windows

## 5) Real Auth/Calendar Swap Later

Replace only these pieces:

- `/login` mock credential check -> real auth provider/session JWT
- localStorage session -> secure token/cookie strategy
- mock calendar connect/callback/sync -> real Google OAuth + free/busy ingestion

Keep response shapes unchanged to avoid frontend rewrites.
