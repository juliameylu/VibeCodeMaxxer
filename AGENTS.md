# Agent Integration Contract

This document defines the shared API/data contract between:
- Reservation + Apple Pay orchestration agents
- ML recommendation agents

Goal: both teams can build independently with dummy data now and merge with minimal conflicts later.

## Scope

The reservation side will consume ML recommendations and produce reservation/payment outcomes.
The ML side will consume user context and outcome feedback.

## Environments

- `VITE_DEMO_MODE=true`: use fixtures/dummy data.
- `VITE_DEMO_MODE=false`: call real services.
- Never commit API keys or secrets.

## Endpoints Reservation Side Uses

### 1) Get recommendations (from ML service)

- `POST /api/recommendations`

Request:
```json
{
  "user_id": "u_123",
  "time_window": {
    "start_ts": "2026-02-22T17:00:00Z",
    "end_ts": "2026-02-22T21:00:00Z",
    "timezone": "America/Los_Angeles"
  },
  "context": {
    "kind": "restaurant",
    "location_hint": "San Luis Obispo, CA",
    "party_size": 2
  },
  "constraints": {
    "price_max": "$$$",
    "distance_max_m": 3000,
    "must_open_now": false
  }
}
```

Response:
```json
{
  "request_id": "req_abc",
  "recommendations": [
    {
      "rec_id": "rec_001",
      "user_id": "u_123",
      "kind": "restaurant",
      "entity_id": "yelp_business_id_or_event_id",
      "title": "Luna Red",
      "score": 0.91,
      "reason": "Matches cuisine + distance + preferred time",
      "generated_at": "2026-02-22T16:59:59Z",
      "metadata": {
        "price": "$$",
        "distance_m": 850
      }
    }
  ]
}
```

### 2) Create reservation intent (reservation service)

- `POST /api/reservation-intents`

Request:
```json
{
  "user_id": "u_123",
  "rec_id": "rec_001",
  "entity_id": "yelp_business_id_or_event_id",
  "slot_start": "2026-02-22T19:00:00Z",
  "slot_end": "2026-02-22T20:30:00Z",
  "party_size": 2
}
```

Response:
```json
{
  "intent_id": "intent_001",
  "status": "pending",
  "expires_at": "2026-02-22T17:10:00Z"
}
```

### 3) Verify captcha / risk gate (reservation service)

- `POST /api/verification/captcha`

Request:
```json
{
  "intent_id": "intent_001",
  "captcha_token": "token_from_client"
}
```

Response:
```json
{
  "intent_id": "intent_001",
  "verified": true
}
```

### 4) Start payment (reservation/payments service)

- `POST /api/payments/create-intent`

Request:
```json
{
  "intent_id": "intent_001",
  "user_id": "u_123",
  "amount_cents": 500,
  "currency": "usd",
  "provider": "stripe_apple_pay"
}
```

Response:
```json
{
  "payment_intent_id": "pi_123",
  "client_secret": "pi_123_secret_xxx",
  "status": "requires_payment_method"
}
```

### 5) Confirm reservation status (reservation service)

- `GET /api/reservation-intents/:intent_id`

Response:
```json
{
  "intent_id": "intent_001",
  "status": "confirmed",
  "provider_ref": "booking_789",
  "confirmed_at": "2026-02-22T17:05:00Z"
}
```

## Feedback Endpoint ML Should Consume

### 6) Outcome events for model learning

- `POST /api/recommendation-feedback`

Request examples:
```json
{
  "event_type": "recommendation_clicked",
  "user_id": "u_123",
  "rec_id": "rec_001",
  "entity_id": "yelp_business_id_or_event_id",
  "ts": "2026-02-22T17:01:10Z"
}
```

```json
{
  "event_type": "reservation_confirmed",
  "user_id": "u_123",
  "rec_id": "rec_001",
  "intent_id": "intent_001",
  "payment_intent_id": "pi_123",
  "ts": "2026-02-22T17:05:00Z"
}
```

## Shared Minimal Schema

Use these core fields to avoid merge issues:

- `users`: `user_id`, `timezone`
- `preferences`: `user_id`, `price_max`, `distance_max_m`, `diet_tags[]`, `event_tags[]`
- `availability_windows`: `user_id`, `start_ts`, `end_ts`, `source`
- `recommendations`: `rec_id`, `user_id`, `kind`, `entity_id`, `score`, `reason`, `generated_at`
- `reservation_intents`: `intent_id`, `user_id`, `rec_id`, `slot_start`, `slot_end`, `party_size`, `status`
- `payment_intents`: `payment_intent_id`, `intent_id`, `amount_cents`, `currency`, `status`, `provider`
- `reservation_outcomes`: `intent_id`, `provider_ref`, `status`, `confirmed_at`

## Dummy Data Rules (for now)

- Return deterministic mock values with valid IDs (`rec_*`, `intent_*`, `pi_*`).
- Keep payload shape identical between demo and real.
- Include `status` transitions in mocks (`pending -> verified -> payment_pending -> confirmed`).

## Best Use of ML Output for Reservation Automation

Recommended approach:
1. Treat ML as ranking, not final authority.
2. Apply hard business filters first:
   - free-time fit
   - open/available slot
   - budget
   - distance cap
3. Use top 3 ML candidates after filters.
4. Attempt booking in priority order.
5. Log outcomes back to ML via feedback endpoint.

Why this is best:
- Prevents high-score but infeasible picks.
- Keeps reservation success rate high.
- Creates clean training labels from real outcomes (`clicked`, `booked`, `paid`, `cancelled`).

## Ownership Split

- ML agents own: `/api/recommendations`, ranking features, `score` + `reason`.
- Reservation agents own: intents, captcha verification, payment orchestration, booking status.
- Shared ownership: schema versioning + feedback event contract.

## Versioning

- Include `schema_version` in responses once you begin iteration.
- Do not remove existing required fields; only add optional fields.
