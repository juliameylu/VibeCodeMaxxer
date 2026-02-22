#!/usr/bin/env bash
set -euo pipefail

TITLE=${1:-"Jarvis automated update"}
BODY=${2:-"Automated by Jarvis nightly agents."}
BASE=${BASE_BRANCH:-main}

if ! command -v gh >/dev/null 2>&1; then
  echo "gh CLI is required to open a PR." >&2
  exit 1
fi

gh pr create --title "$TITLE" --body "$BODY" --base "$BASE"
