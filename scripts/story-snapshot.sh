#!/usr/bin/env bash
# Hits /api/stories/snapshot so the story archive keeps accumulating even when
# nobody has the dashboard open. Meant to be run on a schedule — see
# scripts/README-story-snapshot.md for launchd (macOS) and crontab setup.
#
# Reads CRON_SECRET (required) and DASHBOARD_URL (optional, defaults to
# http://localhost:3000) from .env.local unless they're already exported.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$DIR/.env.local"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source <(grep -E '^(CRON_SECRET|DASHBOARD_URL)=' "$ENV_FILE" || true)
  set +a
fi

if [ -z "${CRON_SECRET:-}" ]; then
  echo "story-snapshot: CRON_SECRET is not set (add it to $ENV_FILE)" >&2
  exit 1
fi

URL="${DASHBOARD_URL:-http://localhost:3000}/api/stories/snapshot"

echo "story-snapshot: $(date -u +%Y-%m-%dT%H:%M:%SZ) hitting $URL"
curl -fsS -H "Authorization: Bearer ${CRON_SECRET}" "$URL"
echo
