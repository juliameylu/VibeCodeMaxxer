GOAL: Implement reservation intents with idempotency.

Requirements:
1) Add POST /api/reservation-intents
2) Require Idempotency-Key header. Same key + same user -> return same intent (no duplicates).
3) Store intent fields:
   - id, userId, venueId, datetime, partySize, status, idempotencyKey, createdAt
4) Status flow (simple for now):
   - pending -> confirmed
   - pending -> cancelled
   Validate transitions.
5) Add GET /api/reservation-intents/:id to fetch status.
6) Add tests:
   - idempotency: same key returns same intent
   - invalid transition rejected
7) Add mock implementation (no real booking). This is "intent" only.

Prove it works:
- tests pass
- add curl examples to README
