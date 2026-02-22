GOAL: Add mock users + seed script + fake interaction history.

Requirements:
1) Add a seed script that creates:
   - 50 mock users with preferences (categories, budget, vibe, transport)
   - 200-500 interaction events (impressions/clicks/likes/dismisses)
2) Make seed deterministic using a fixed RNG seed (so tests are stable).
3) Store seed output in DB if project has DB; otherwise store in local JSON under /data/demo.
4) Add a "demo user picker" helper: given userId, return profile + history.
5) Add README instructions to run seed.

Prove it works:
- Seed is repeatable
- Include sample user JSON + sample events JSON
