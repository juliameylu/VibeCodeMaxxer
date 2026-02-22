# Agent Integration Notes (Frontend + Backend)

This is the single source of truth for current mock integration contracts in this branch.

## Environment

- Frontend demo mode: `VITE_DEMO_MODE=true`
- Backend base URL: `VITE_BACKEND_BASE_URL=http://localhost:3001`
- Do not place secrets in frontend `VITE_` variables.

## Identity + Session (Current)

- Frontend login is mock-only for now.
- Session payload fields used by frontend:
  - `user_id`
  - `username`
  - `name`
  - `email`
  - `timezone`
  - `logged_in_at`
- Backend canonical user IDs remain `u_*`.

## Backend Endpoints Used by Frontend

### Users

- `POST /api/users`
  - body: `{ email, timezone }`
  - returns canonical backend user (`u_*`).

### Preferences

- `GET /api/preferences/:user_id`
- `PUT /api/preferences/:user_id`

### Calendar (Mock OAuth + Sync)

- `POST /api/calendar/connect`
  - body: `{ user_id, provider }`
- `POST /api/calendar/callback`
  - body: `{ state, code }`
- `POST /api/calendar/sync`
  - body: `{ user_id }`
- `GET /api/calendar/status/:user_id`
- `GET /api/availability/:user_id?start_ts=<UTC_ISO>&end_ts=<UTC_ISO>`
- `GET /api/calendar/events/:user_id`

### Mock Reservations (Restaurants)

- `GET /api/mock-reservations/availability`
  - query: `restaurant_id`, optional `restaurant_name`, optional `date`
  - returns deterministic mock reservation slots.
  - response includes:
    - top-level: `source` (`mock_yelp`), `provider` (`yelp`), `currency` (`usd`)
    - each slot:
      - `slot_id`
      - `start_ts` / `end_ts` (UTC ISO-8601)
      - `label`
      - `seats_remaining`
      - `provider` (`yelp`)
      - `source` (`mock_yelp`)
      - `party_size_min` / `party_size_max`
      - `is_bookable`
      - `reservation_url`
      - `cancellation_policy`
      - `deposit_cents`
      - `currency` (`usd`)

- `POST /api/mock-reservations/book`
  - body:
    - `user_id`
    - `restaurant_id` (expected prefix `restaurant:<id>`)
    - `restaurant_name`
    - `slot_id`
    - `start_ts` (UTC ISO-8601)
    - `end_ts` (UTC ISO-8601)
    - `party_size`
    - `special_requests` (string[])
    - `notes` (string, freeform)
  - returns confirmed reservation + receipt metadata.
  - confirmation payload includes:
    - `provider` (`yelp`)
    - `source` (`mock_yelp`)
    - `reservation_url`
    - `cancellation_policy`

- `GET /api/mock-reservations/:user_id`
  - returns saved mock reservations for that user.

## Frontend Places Page Expectations

- Places list is recommendation-first (no free-text name/address search UI).
- Categories remain limited to `restaurant` and `coffee`.
- `openNow` filter must remain functional and map to place open-state data.
- Results are additionally constrained by availability:
  - first by logged-in user's availability windows for selected date
  - optionally by shared overlap windows with a selected compare user
- Yelp links should open the restaurant-level URL.
- In demo mode, fixture URLs are direct `/biz/...` links.
- Fallback behavior if URL is missing/generic:
  - build a Yelp search URL from restaurant name + address.
- Custom preference input should use semantic matching signals (not only name/address):
  - cuisine tags
  - menu/attribute tags
  - review snippets

## Merge/Coordination Guidance

- Keep backend response shapes stable when swapping mock -> real providers.
- Keep timestamps UTC ISO-8601.
- Keep entity prefixes:
  - restaurant entities: `restaurant:<id>`
  - event entities: `event:<id>`
