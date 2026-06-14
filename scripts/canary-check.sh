#!/usr/bin/env bash
set -euo pipefail

deploy_url="${DEPLOY_URL:-${1:-}}"

if [[ -z "$deploy_url" ]]; then
  printf "Usage: DEPLOY_URL=https://your-quota.example.workers.dev %s\n" "$0" >&2
  printf "   or: %s https://your-quota.example.workers.dev\n" "$0" >&2
  exit 2
fi

deploy_url="${deploy_url%/}"
health_url="${deploy_url}/api/health"
tmp_body="$(mktemp)"
trap 'rm -f "$tmp_body"' EXIT

http_status="$(
  curl --silent --show-error --location --max-time 10 \
    --output "$tmp_body" \
    --write-out "%{http_code}" \
    "$health_url"
)"

if [[ "$http_status" != "200" ]]; then
  printf "Canary failed: %s returned HTTP %s\n" "$health_url" "$http_status" >&2
  printf "Response body:\n" >&2
  cat "$tmp_body" >&2
  printf "\n" >&2
  exit 1
fi

if ! grep -Eq '"ok"[[:space:]]*:[[:space:]]*true' "$tmp_body"; then
  printf "Canary failed: %s did not return ok:true\n" "$health_url" >&2
  printf "Response body:\n" >&2
  cat "$tmp_body" >&2
  printf "\n" >&2
  exit 1
fi

printf "Canary passed: %s returned HTTP 200 and ok:true\n" "$health_url"
