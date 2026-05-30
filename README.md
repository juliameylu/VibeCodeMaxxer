# PolyJarvis — AI Campus Planning Agent

**Top-3 finish at the OpenAI Hackathon (Cal Poly SLO, Feb 2026)**

PolyJarvis is an agentic campus planning assistant for Cal Poly students. It connects LLM reasoning to real app state — building context from your schedule, preferences, events, and study tasks — then returns ranked recommendation cards and **confirmable actions** (RSVPs, plan drafts, booking intents, study tasks, jam joins) instead of acting autonomously.

> Repo name is `VibeCodeMaxxer` (hackathon team name); the product is **PolyJarvis**.

---

## What It Does

1. **Chat with Jarvis** — ask it to plan your day, find events, suggest places, or schedule a study block.
2. **Get recommendation cards** — ranked events, restaurants, and study opportunities based on your behavior history, preferences, and schedule context.
3. **Review proposed actions** — Jarvis proposes RSVPs, plan drafts, jam joins, and booking intents. You confirm before anything is written.
4. **Persistent state** — preferences, plans, jams, and reservations persist to Supabase and optionally snapshot to DynamoDB.
5. **Reservation workflows** — Jarvis can initiate phone reservation calls via Twilio (config-gated).

---

## Architecture

```
React/TypeScript frontend
        |
    Express backend (backend/plannerApi.js)
        |
  ┌─────────────────────────────────────────┐
  │  summarizeUserContext()                 │  ← build user state from DB
  │  rankedRecommendations()               │  ← hybrid.js ranking
  │  inferProposedActions()                │  ← proposals (no writes yet)
  │  generateAssistantReply()  ← OpenAI   │  ← LLM explains/expands
  │  POST /api/agent/actions/:id/confirm   │  ← user confirms → writes happen
  └─────────────────────────────────────────┘
        |               |
   Supabase         DynamoDB
  (primary)        (snapshot)
```

**Recommendation ranking** (`src/lib/recommendation/hybrid.js`): combines behavior-weighted interaction history, semantic token-vector similarity, novelty scoring, and epsilon exploration. Local JS — not a vector DB or embeddings service.

**Nightly eval automation** (`.github/workflows/jarvis-nightly.yml`): GitHub Actions matrix runs Codex agents across recommendation, reservation, seeding, and logging tracks; collects artifacts and opens PRs on changes.

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| AI | OpenAI Responses API, model fallbacks, deterministic fallback |
| Persistence | Supabase/PostgreSQL, DynamoDB (optional snapshot) |
| Auth | AWS Cognito JWT |
| Integrations | Twilio (config-gated), Yelp API, Cal Poly events |
| Infra | AWS App Runner, IAM-scoped access |
| Automation | GitHub Actions, OpenAI Codex tasks |

---

## Project Status

| Feature | Status |
|---------|--------|
| Agent chat + context summarization | Working |
| Recommendation cards (events, restaurants, study) | Working |
| Confirmable proposed actions | Working |
| Supabase persistence (profiles, plans, jams, reservations) | Working |
| DynamoDB snapshots | Config-gated |
| Reservation phone calls (Twilio) | Config-gated |
| SMS notifications | Disabled (`SMS_NOTIFICATIONS_ENABLED = false`) |
| Apple Pay / Calendar / Canvas integrations | Stub / mock |

---

## Quick Start (Local Dev)

### Prerequisites
- Node.js 18+
- Supabase project (or local Supabase CLI)
- OpenAI API key

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template and fill in values
cp .env.example .env.local
# edit .env.local with your keys (see Environment Variables section)

# 3. Apply database schema
# Option A: In Supabase dashboard → SQL editor → run supabase/schema.sql
# Option B: supabase db push (if using Supabase CLI with supabase/config.toml)

# 4. Start backend
node backend/server.js
# or: npm run dev:backend (if script is defined)

# 5. Start frontend (separate terminal)
npm run dev
```

Backend runs on `http://localhost:3001` by default. Frontend dev server on `http://localhost:5173`.

### Environment Variables

See `.env.example` and `server/.env.example` for all required variables. Key ones:

```
OPENAI_API_KEY=              # OpenAI API key for agent chat
SUPABASE_URL=                # Your Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=   # Service role key for backend
VITE_SUPABASE_URL=           # Supabase URL for frontend
VITE_SUPABASE_ANON_KEY=      # Supabase anon key for frontend
```

See `AWS_SETUP.md` for App Runner / Cognito / DynamoDB deployment setup.

---

## Key Files

| File | Description |
|------|-------------|
| `backend/plannerApi.js` | Core agent backend: routes, context, recommendations, actions, persistence |
| `src/lib/recommendation/hybrid.js` | Recommendation ranking (behavior, novelty, semantic, exploration) |
| `scripts/jarvis-autofeed.mjs` | Deterministic prompt traffic generator for testing/eval |
| `scripts/jarvis-train-1000.mjs` | Larger prompt bank eval script |
| `.github/workflows/jarvis-nightly.yml` | Nightly Codex automation matrix |
| `supabase/schema.sql` | Full database schema |
| `JARVIS_WORKFLOW_IMPLEMENTATION.md` | Agent workflow design notes |
| `AWS_SETUP.md` | Cloud deployment documentation |

---

## Nightly Automation

The nightly GitHub Actions workflow (`jarvis-nightly.yml`) runs 4 feature tracks in matrix (`recommendations`, `reservations`, `seeding`, `logging`). Each run creates a unique branch, collects log/diff artifacts, and opens a PR only if there are changes.

To enable:
1. Add repo secret `OPENAI_API_KEY` in GitHub → Settings → Secrets → Actions.
2. Set Workflow permissions to "Read and write" and enable PR creation.
3. Merge `jarvis-nightly.yml` to `main`. Manual trigger: Actions → Jarvis Nightly Agents → Run workflow.

---

## Known Limitations

- **Hackathon prototype** — not production infrastructure.
- SMS notifications are disabled. Twilio calling requires config.
- Apple Pay, Calendar, and Canvas integrations are stubs or mock data.
- Recommendation ranking uses local hashed token vectors, not a real embedding/vector DB.
- No automated test suite (`npm test` is not configured).
- Nightly Codex workflow proves automation configuration, not production run history.
