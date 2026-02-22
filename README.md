# VibeCodeMaxxer

## Jarvis overnight automation setup

This repository includes the shared nightly Jarvis setup:

- `.jarvis/tasks/*`
- `.jarvis/prompts/base_system.md`
- `scripts/seed/seed_mock_users.js`
- `scripts/jarvis/create_pr.sh`
- `.github/workflows/jarvis-nightly.yml`

## Exactly how to run GitHub Actions (shared repo)

You only need to do this once for the shared repository (not once per teammate machine):

1. Add repo secret `OPENAI_API_KEY`:
   - GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
2. Enable workflow write permissions:
   - GitHub → **Settings** → **Actions** → **General** → set **Workflow permissions** to **Read and write**.
   - Enable **Allow GitHub Actions to create and approve pull requests**.
3. Merge `.github/workflows/jarvis-nightly.yml` to `main`.
4. Manual validation run:
   - GitHub → **Actions** → **Jarvis Nightly Agents** → **Run workflow**.
5. Nightly auto-run:
   - After merge, the cron schedule runs automatically each night.

## How the workflow now behaves

- Runs 4 feature tracks in matrix (`recommendations`, `reservations`, `seeding`, `logging`).
- Creates a unique branch per feature + run attempt:
  - `jarvis/<feature_slug>/run-<run_id>-attempt-<run_attempt>`
- Includes a concise feature summary artifact (`task`, `feature`, `focus`, run info).
- Commits/pushes/opens PR only if there are changes beyond `origin/main`.

## Mock reservation behavior

- UI now has a **TRY NOW** reservation bot entry point on Dashboard that opens a reservation-capable event detail.
- Event details booking uses in-repo mock API (`/api/reservation-intents`) instead of external booking for reservation intent.
- Reservation intent is created with idempotency key, then auto-confirms shortly after for demo flow.
