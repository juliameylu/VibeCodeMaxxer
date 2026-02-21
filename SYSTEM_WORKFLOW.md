# SYSTEM_WORKFLOW.md

## End-to-End Step-by-Step Workflow

This workflow combines `FRONTEND_CONTRACT.md` and `BACKEND_CONTRACT.md` into one execution sequence for implementation and runtime behavior.

## 1) Bootstrap + Environment

1. Set env vars:
   - `VITE_API_BASE_URL`
   - `VITE_DEMO_MODE`
2. Start Supabase-backed backend services.
3. Ensure RLS is active for plan/member-scoped access.
4. Confirm deterministic fixtures when `VITE_DEMO_MODE=true`.

## 2) Authentication

1. User opens app.
2. Frontend triggers Supabase Auth (magic link/email OTP).
3. Frontend receives JWT.
4. All API requests include `Authorization: Bearer <jwt>`.
5. Backend derives `user_id` from JWT and ignores client-forged IDs.

## 3) Home Flow (`/home`)

1. Frontend calls `GET /api/plans?mine=true`.
2. Backend returns plans where user is owner/member.
3. Frontend subscribes to realtime updates for plans.
4. UI shows list of plans + `Create Plan` CTA.

## 4) Create Plan (`/plan/new`)

1. User submits:
   - `kind`
   - `location_hint`
   - `timezone`
   - `transport_mode`
2. Frontend calls `POST /api/plans`.
3. Backend creates `plans` row in `draft` status.
4. Frontend redirects to `/plan/:plan_id`.

## 5) Invite + Join Flow (`/join/:token`)

1. Invite link contains token.
2. User authenticates if needed.
3. Frontend calls `POST /api/plans/join` with token.
4. Backend validates invite token and membership rules.
5. Backend inserts/updates `plan_members` to `joined`.
6. Frontend redirects to `/plan/:plan_id`.

## 6) Plan Setup (`/plan/:plan_id`)

1. Frontend loads:
   - plan
   - members
   - existing availability
2. Frontend subscribes to realtime changes for:
   - `plan_members`
   - `availability_windows`
   - `plans.status`
3. Users submit manual availability via `POST /api/availability/manual`.
4. Backend stores free windows in `availability_windows`.
5. Plan transitions to `collecting_availability` as appropriate.

## 7) Compute Time Options

1. User clicks `Compute Options`.
2. Frontend calls `POST /api/plans/:plan_id/compute-options` with:
   - `rank_strategy`
   - `limit`
3. Backend:
   - fetches joined members’ availability
   - computes overlaps
   - applies transport feasibility baseline
   - ranks (`soonest` or `scored`)
   - inserts `plan_time_options`
4. Backend sets plan status to `options_ready` when ready.
5. Frontend redirects to `/plan/:plan_id/results`.

## 8) Results + Regenerate (`/plan/:plan_id/results`)

1. Frontend renders ranked `plan_time_options`.
2. If user regenerates:
   - call compute endpoint with `exclude_option_ids[]`.
3. Backend recomputes and excludes prior options.
4. Frontend updates only affected sections (no full reload).

## 9) Voting Flow

1. Users vote yes/no/maybe on options.
2. Frontend calls `POST /api/plans/:plan_id/vote`.
3. Backend upserts into `plan_votes` (unique per option/user).
4. Realtime broadcasts `vote_updated`.
5. Frontend applies optimistic UI + confirms with realtime/state.

## 10) Suggestion Generation

1. User requests suggestions for a selected option.
2. Frontend calls `POST /api/plans/:plan_id/suggestions`.
3. Backend calls `POST /api/recommendations` with:
   - plan kind
   - location
   - selected time window
   - constraints/transport context
4. Backend stores top K in `plan_suggestions`.
5. Frontend renders suggestion cards.

## 11) Recommendation Feedback Loop

1. Frontend logs user interactions:
   - impression
   - clicked
   - liked
   - dismissed
2. Frontend/backend posts `POST /api/recommendation-feedback`.
3. ML service consumes feedback for ranking improvements.

## 12) Lock Plan

1. Owner selects final option.
2. Frontend calls `POST /api/plans/:plan_id/lock`.
3. Backend sets status to `locked`.
4. Frontend disables further voting/edit actions.
5. Realtime emits `plan_locked`.

## 13) Optional Reservation Flow (Post-Lock)

1. Frontend creates reservation intent:
   - `POST /api/reservation-intents`
   - include `Idempotency-Key` header
2. Backend enforces idempotency:
   - same key + same payload => same response
   - same key + different payload => `409`
3. Optional captcha verification:
   - `POST /api/verification/captcha`
4. Payment intent creation:
   - `POST /api/payments/create-intent`
5. Frontend polls reservation status:
   - `GET /api/reservation-intents/:intent_id`
6. Backend advances status lifecycle:
   - `pending -> verified -> payment_pending -> confirmed`
   - or `failed/expired/cancelled`

## 14) Messaging Flow

1. On lock/confirmation, backend queues message delivery.
2. Backend writes `message_deliveries`.
3. Messaging provider sends email/SMS/push.
4. Delivery status updates tracked in backend.

## 15) Realtime Update Model

Frontend subscribes to:

- `plans`
- `plan_members`
- `plan_time_options`
- `plan_votes`
- `plan_suggestions`

On event:

1. Patch only impacted UI sections.
2. Avoid full-page refetch unless required.

## 16) Caching Behavior

1. Cache keys: page + filter payload.
2. TTL target: 10 minutes for explore/suggestions/secondary pages.
3. If cache fresh: render immediately.
4. If stale: fetch and replace cache.
5. Demo and live payload shapes remain identical.

## 17) Data + Security Guardrails

1. UTC ISO timestamps only.
2. No secrets in frontend.
3. No direct third-party provider calls from client.
4. Add fields only unless version bump.
5. RLS rules enforce membership-scoped access.

## 18) MVP Build Order (Recommended)

1. Auth + `/home`
2. Create plan + join flow
3. Availability entry
4. Compute options + results page
5. Voting + realtime
6. Suggestions integration
7. Lock flow
8. Reservation intent + payment intent
9. Messaging + final polish
