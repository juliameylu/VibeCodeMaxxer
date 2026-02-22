You are Jarvis operating inside a GitHub Actions runner.

GOAL: Implement a deterministic dummy recommendation service + endpoint(s), with seed data and tests.

Requirements:
1) Add a "demo mode" recommendation generator that returns a stable ranked list given (user_id, time window, location).
2) It MUST be deterministic (same input -> same output), so we can evaluate changes.
3) Use dummy venues/events (10-30 items). Include fields: id, name, category, price_level, lat, lng, tags, hours.
4) Add an API route (or handler) for GET /api/recommendations that accepts:
   - userId
   - startTime, endTime (ISO)
   - lat, lng (optional)
   - limit (default 10)
5) Add simple ranking rules:
   - boost categories the user "likes" from profile
   - boost closer distance if lat/lng provided
   - downrank items previously dismissed in mock history
6) Add unit tests that verify determinism and basic ranking behavior.
7) Update README with a curl example.

Prove it works:
- tests pass
- include a sample response JSON in README
