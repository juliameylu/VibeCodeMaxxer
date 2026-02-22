# FRONTEND_CONTRACT.md

## Frontend Contract (Supabase + Plan-Based Architecture)

This document defines:

- Auth expectations
- Page routes + responsibilities
- API usage patterns
- Realtime subscriptions
- Caching behavior
- Demo-mode behavior
- Shared types for code generation agents

This serves as a baseline UI + API contract so multiple AI agents can generate consistent frontend code with the same look and behavior.

## 0) Environment Variables

`VITE_API_BASE_URL=https://api.yourdomain.com`  
`VITE_DEMO_MODE=true | false`

- If `VITE_DEMO_MODE=true` -> return deterministic fixtures.
- If `false` -> call real backend endpoints.
- Payload shapes must remain identical in demo and live modes.

## 1) Authentication (Supabase)

- Use Supabase Auth (magic link / email OTP).
- All API calls must include `Authorization: Bearer <jwt>`.
- `user_id` is derived server-side (frontend does not control it).

## 2) Core Pages + Responsibilities

### `/home`

Purpose:

- Show list of user’s plans.
- CTA: “Create Plan”.

Calls:

- `GET /api/plans?mine=true`

Realtime:

- Subscribe to plans where user is a member.

### `/plan/new`

Purpose:

- Create a new plan.

Fields:

- `kind` (`restaurant | event | any`)
- `location_hint`
- `timezone`
- `transport_mode` (`driving | walking | transit | biking`)

Calls:

- `POST /api/plans`

After creation:

- Redirect to `/plan/:plan_id`

### `/join/:token`

Purpose:

- Join a plan via invite link.

Flow:

- Ensure authenticated (magic link if needed).
- Call:

`POST /api/plans/join`
```json
{
  "token": "<invite_token>"
}
```

- Redirect to `/plan/:plan_id`

### `/plan/:plan_id`

Purpose:

- Plan overview
- Members list
- Availability submission
- Compute time options

Sections:

- Members (joined / invited)
- Availability entry
- Compute Options button

Availability submission:

`POST /api/availability/manual`
```json
{
  "plan_id": "plan_001",
  "windows": [
    { "start_ts": "...Z", "end_ts": "...Z" }
  ]
}
```

Compute options:

`POST /api/plans/:plan_id/compute-options`
```json
{
  "rank_strategy": "soonest",
  "limit": 10
}
```

After compute:

- Redirect to `/plan/:plan_id/results`

Realtime:

- Subscribe to:
  - `plan_members`
  - `availability_windows`
  - `plans.status`

### `/plan/:plan_id/results`

Purpose:

- Display ranked time options.
- Allow regenerate.
- Allow vote.
- Show activity suggestions.
- Lock final choice.

Display Time Options

Each option:

- `start_ts`
- `end_ts`
- (optional `score`)

Regenerate

Button: “Regenerate Times”

Call:

`POST /api/plans/:plan_id/compute-options`
```json
{
  "rank_strategy": "soonest",
  "exclude_option_ids": ["opt_001", "opt_002"],
  "limit": 10
}
```

Behavior:

- Backend returns new windows excluding previous ones.

Vote on Option

`POST /api/plans/:plan_id/vote`
```json
{
  "option_id": "opt_001",
  "vote": "yes" | "no" | "maybe"
}
```

- Votes are upserted.

Realtime:

- Subscribe to `plan_votes`.

Fetch Suggestions for a Time Option

`POST /api/plans/:plan_id/suggestions`
```json
{
  "option_id": "opt_001",
  "top_k": 3
}
```

Displays:

- `title`
- `entity_id`
- `reason`
- `metadata`

Lock Plan

`POST /api/plans/:plan_id/lock`
```json
{
  "option_id": "opt_001"
}
```

After lock:

- Plan status becomes `locked`
- Disable voting

### `/profile`

Purpose:

- Edit user preferences.

Fields:

- `price_max`
- `distance_max_m`
- `diet_tags`
- `event_tags`
- `quiet_hours`

Calls:

- `GET /api/user/preferences`
- `PUT /api/user/preferences`

### `/explore` (Optional / Solo Mode)

Purpose:

- Solo recommendations.

Calls:

- `POST /api/recommendations`

Uses:

- time window (tonight/weekend quick buttons)
- location
- transport

Client caching required (see below).

## 3) Reservation Flow (Optional Post-Lock)

If reservation is triggered:

1. Create intent

`POST /api/reservation-intents`  
Headers:  
`Idempotency-Key: <uuid>`

2. Verify captcha (if enabled)

`POST /api/verification/captcha`

3. Create payment intent

`POST /api/payments/create-intent`

4. Poll status

`GET /api/reservation-intents/:intent_id`

## 4) Realtime (Supabase)

Frontend must subscribe to:

- `plans` (filtered by membership)
- `plan_members`
- `plan_time_options`
- `plan_votes`
- `plan_suggestions`

On updates:

- Re-render affected UI sections
- Do not refetch entire plan unnecessarily

## 5) Client Caching Rules

For:

- `/explore`
- Activity suggestions
- Secondary pages

Rules:

- Cache by page + filter payload
- TTL: 10 minutes
- If fresh -> render immediately
- If stale -> fetch + replace cache
- Demo mode must mimic identical behavior

## 6) Shared Type Definitions (Baseline)

```ts
type PlanStatus =
  | "draft"
  | "collecting_availability"
  | "options_ready"
  | "locked"
  | "cancelled";

type TransportMode =
  | "driving"
  | "walking"
  | "transit"
  | "biking";

type VoteValue = "yes" | "no" | "maybe";

interface Plan {
  plan_id: string;
  owner_user_id: string;
  kind: "restaurant" | "event" | "any";
  timezone: string;
  location_hint: string;
  transport_mode: TransportMode;
  status: PlanStatus;
  created_at: string;
  updated_at: string;
}

interface TimeOption {
  option_id: string;
  start_ts: string;
  end_ts: string;
  score?: number;
  rank_strategy: "soonest" | "scored";
}

interface Suggestion {
  sugg_id: string;
  entity_id: string;
  title: string;
  score: number;
  reason: string;
  metadata?: Record<string, any>;
}
```

## 7) Demo Mode Requirements

When `VITE_DEMO_MODE=true`:

- Return deterministic mock plans.
- Simulate status transitions.
- Simulate votes.
- Simulate regenerate producing new options.
- Simulate suggestions.
- Preserve exact payload shapes.
- Do NOT change field names between demo and production.

## 8) UI Consistency Rules (For AI Code Generation)

All pages must:

- Use same spacing + layout system
- Use same button style for:
  - Primary actions (solid)
  - Secondary (outline)
- Use consistent card component for:
  - Time options
  - Suggestions
  - Plans
- Use consistent loading states
- Use optimistic updates for voting

## 9) Non-Negotiables

- No direct third-party API calls from frontend.
- No secrets in client.
- All timestamps in UTC.
- Do not remove required fields without version bump.
- Regenerate must exclude previously returned options.

## 10) iPhone Deployment and Jarvis Call UX

- Frontend must remain compatible with Capacitor iOS packaging.
- API calls from mobile webview must support configurable base URL via `VITE_API_BASE_URL`.
- `Jarvis` route (`/jarvis`, `/ai`) must expose a reservation-call panel in the new main UI.
- Reservation call payload in Jarvis demo mode:
  - `restaurant_name`
  - `reservation_time`
  - `party_size`
  - `special_request`
  - `group_id` set to `creator-only`
- Frontend must poll call job status and render:
  - `status`
  - `reservation_decision`
  - `decision_digit`

---

If you want, I can next generate:

- A Supabase SQL schema file
- A minimal frontend folder structure (React/Next/Vite)
- Or a single OpenAPI-style contract JSON both frontend and backend can share.
