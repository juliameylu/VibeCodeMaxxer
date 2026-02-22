# VibeCodeMaxxer

## Jarvis overnight automation setup

This repository now includes the baseline folder and workflow structure for nightly Jarvis agents:

- `.jarvis/tasks/*`
- `.jarvis/prompts/base_system.md`
- `scripts/seed/seed_mock_users.js`
- `scripts/jarvis/create_pr.sh`
- `.github/workflows/jarvis-nightly.yml`

### Preconditions for GitHub Actions

To run successfully overnight, ensure the following in GitHub:

1. **Repository secret exists**
   - `OPENAI_API_KEY` at **Settings → Secrets and variables → Actions**.
2. **Actions are enabled**
   - Repository allows GitHub Actions workflows.
3. **Workflow write permissions are allowed**
   - **Settings → Actions → General → Workflow permissions** should allow read/write so branch pushes + PR creation work.
4. **Branch protection is compatible**
   - `main` may remain protected; workflow pushes to `jarvis/*` branches and opens PRs into `main`.

### Manual run

- Go to **Actions → Jarvis Nightly Agents → Run workflow**.

### Notes on current workflow behavior

- The workflow runs a matrix of four tasks in parallel.
- It uploads diffs/status/time as artifacts for each task run.
- If `./logs` exists, logs are also uploaded in artifacts.
- It commits/pushes only when there are commits beyond `origin/main`.
