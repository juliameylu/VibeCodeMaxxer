# BACKEND_CONTRACT.md

## Backend System Contract (Supabase Baseline)

This document defines the backend architecture and API contract for:

- Authentication (Supabase)
- User data + preferences
- Calendar sync + availability ingestion
- Group Plan system
- Overlap computation + time window ranking
- Activity recommendations (ML service)
- Reservation orchestration
- Payments (Apple Pay / Stripe-style)
- Messaging
- Realtime updates

This contract is designed as a baseline spec for code generation agents, ensuring consistent behavior and schema across features.

## 0) Infrastructure Baseline

**Platform Choice: Supabase**

We use Supabase for:

- Postgres database
- Auth (magic link / email OTP)
- Realtime subscriptions
- Storage (optional)
- Row-Level Security (RLS)

No custom WebSocket servers required.

## 1) Authentication + Identity

- All endpoints require authentication unless explicitly public.
- `user_id` is derived from Supabase Auth JWT.
- Client-provided `user_id` must be ignored or validated against auth context.
- All timestamps must be UTC ISO-8601.

## 2) Canonical ID Prefixes

All IDs must be prefixed:

- `u_*` -> `user_id`
- `plan_*` -> `plan_id`
- `inv_*` -> `invite_id`
- `opt_*` -> `time option`
- `vote_*` -> `vote`
- `sugg_*` -> `suggestion`
- `rec_*` -> `recommendation`
- `intent_*` -> `reservation intent`
- `pi_*` -> `payment intent`
- `msg_*` -> `message delivery`

Entity IDs must be prefixed:

- `restaurant:<id>`
- `event:<id>`

## 3) Core Tables

### `users`

- `user_id` (pk)
- `email`
- `timezone`
- `created_at`
- `updated_at`

### `preferences`

- `user_id` (pk, fk users)
- `price_max`
- `distance_max_m`
- `diet_tags` (text[])
- `event_tags` (text[])
- `favorite_categories` (text[])
- `quiet_hours_start`
- `quiet_hours_end`
- `updated_at`

## 4) Plan System (Primary Collaboration Object)

A Plan is the container for:

- Members
- Availability
- Computed time options
- Suggested activities
- Votes
- Final lock state

### `plans`

- `plan_id` (pk)
- `owner_user_id` (fk users)
- `title` (nullable)
- `kind` (`restaurant | event | any`)
- `timezone`
- `location_hint`
- `transport_mode` (`driving | walking | transit | biking`)
- `status` (`draft | collecting_availability | options_ready | locked | cancelled`)
- `created_at`
- `updated_at`

### `plan_members`

- `plan_id` (fk plans)
- `user_id` (fk users)
- `role` (`owner | member`)
- `status` (`invited | joined`)
- `joined_at`
- PK: (`plan_id`, `user_id`)

### `plan_invites`

- `invite_id` (pk)
- `plan_id`
- `token` (unique)
- `email` (nullable)
- `expires_at`
- `used_at`
- `created_at`

### `plan_time_options`

Generated overlapping time windows.

- `option_id` (pk)
- `plan_id`
- `start_ts`
- `end_ts`
- `rank_strategy` (`soonest | scored`)
- `score` (nullable float)
- `generated_at`

Default ranking: soonest first.

Optional ranking: computed score based on:

- overlap duration
- user preferences
- transport feasibility
- quiet hour penalties

### `plan_votes`

- `vote_id` (pk)
- `plan_id`
- `option_id`
- `user_id`
- `vote` (`yes | no | maybe`)
- `updated_at`

Unique: (`option_id`, `user_id`)
Votes are upsertable.

### `plan_suggestions`

Top 1-3 suggested activities per time option.

- `sugg_id` (pk)
- `plan_id`
- `option_id`
- `rec_id` (nullable)
- `entity_id`
- `title`
- `score`
- `reason`
- `metadata` (jsonb)
- `generated_at`

## 5) Availability System

Availability is stored as free windows.

### `availability_windows`

- `window_id` (pk)
- `user_id`
- `start_ts`
- `end_ts`
- `source` (`calendar_sync | manual | ics_import`)

### `calendar_accounts`

- `calendar_account_id`
- `user_id`
- `provider` (`google | apple | microsoft`)
- `status` (`connected | disconnected | token_expired`)
- `scopes`
- `last_sync_at`
- `created_at`

## 6) Overlap Computation

Endpoint:
- `POST /api/plans/:plan_id/compute-options`

Input:

- `rank_strategy` (`soonest | scored`)
- `exclude_option_ids[]`
- `limit` (default 10)

Behavior:

- Gather `availability_windows` for all joined members.
- Compute overlapping free windows.
- Filter by transport feasibility (baseline: simple distance/time threshold).
- Rank:
  - If `soonest`: sort by `start_ts` ascending.
  - If `scored`: apply overlap + preference scoring.
- Exclude any provided `option_ids`.
- Insert into `plan_time_options`.

Regeneration is achieved by excluding previously returned options.

## 7) Activity Suggestions (Recommendation Integration)

Endpoint:
- `POST /api/plans/:plan_id/suggestions`

Input:

- `option_id`
- `top_k` (default 3)

Behavior:

- Call `POST /api/recommendations`
- Inject:
  - plan kind
  - location_hint
  - time window
  - transport constraints
- Store results in `plan_suggestions`.

## 8) Recommendation Service

### `POST /api/recommendations`

Input:

- `time_window`
- `context`
- `constraints`

Returns ranked results with:

- `rec_id`
- `entity_id`
- `score`
- `reason`
- `model_version`

### `POST /api/recommendation-feedback`

Tracks:

- `impression`
- `recommendation_clicked`
- `liked`
- `dismissed`
- `reservation_confirmed`
- `reservation_cancelled`

## 9) Reservation System

### `reservation_intents`

- `intent_id`
- `user_id`
- `rec_id`
- `entity_id`
- `slot_start`
- `slot_end`
- `party_size`
- `status` (`pending | verified | payment_pending | confirmed | failed | expired | cancelled`)
- `idempotency_key`
- `created_at`
- `updated_at`

### Idempotent Creation

- `POST /api/reservation-intents`
- Header: `Idempotency-Key`

Rules:

- Same key + same payload -> return original
- Same key + different payload -> `409`
- Retention >= 24h

## 10) Payments

### `payment_intents`

- `payment_intent_id`
- `intent_id`
- `amount_cents`
- `currency`
- `provider`
- `status`
- `created_at`

### `POST /api/payments/create-intent`

Returns:

- `payment_intent_id`
- `client_secret`
- `status`

Provider webhooks handled server-side only.

## 11) Messaging

### `message_deliveries`

- `message_id`
- `user_id`
- `channel`
- `template`
- `provider_ref`
- `status`
- `sent_at`

## 12) Realtime Model (Supabase)

Clients subscribe to plan-specific changes.

Tables to watch:

- `plans`
- `plan_members`
- `availability_windows` (filtered by plan members)
- `plan_time_options`
- `plan_votes`
- `plan_suggestions`

Realtime events:

- `member_joined`
- `availability_updated`
- `options_computed`
- `vote_updated`
- `plan_locked`

## 13) Transport Constraints

Transport mode affects:

- Time window feasibility
- Suggestion ranking

Baseline logic:

- Store `transport_mode` on plan
- Apply simple distance filter

Future extension: travel-time API integration

## 14) Status Transitions

Plan:

- `draft -> collecting_availability -> options_ready -> locked -> cancelled`

Reservation:

- `pending -> verified -> payment_pending -> confirmed`
- `payment_pending -> failed | expired | cancelled`

## 15) Non-Negotiables

- No secrets in client
- No direct provider API calls from frontend
- UTC timestamps only
- Add fields only (no removal without version bump)
- Supabase RLS must enforce:
  - Users only access plans they are members of
  - Votes only editable by owner of vote
  - Invite tokens validated server-side

## 16) MVP Scope (Hackathon)

MVP Includes:

- Auth (magic link)
- Create plan
- Invite members
- Manual availability entry
- Compute overlapping windows
- Rank by soonest
- Regenerate
- Suggest 1-3 activities
- Vote
- Lock plan
- Basic reservation intent

Non-MVP:

- Advanced travel-time APIs
- Zipcar integration
- Complex scoring model
- Screenshot availability parsing
