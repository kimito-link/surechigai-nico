#!/usr/bin/env bash
# バックフィル dry-run（Basic 認証 / DB は変更されない）
#   Usage: scripts/ops/backfill-dry.sh [LIMIT]
#   LIMIT 未指定時は 5（X API レート節約）
#   必須: ADMIN_USER, ADMIN_PASS
#   任意: VERCEL_HOST
set -euo pipefail

: "${ADMIN_USER:?ADMIN_USER が未設定です。.env.ops を source してください}"
: "${ADMIN_PASS:?ADMIN_PASS が未設定です。.env.ops を source してください}"

LIMIT="${1:-5}"
HOST="${VERCEL_HOST:-https://surechigai-nico.link}"
URL="${HOST}/api/admin/yukkuri-backfill?limit=${LIMIT}"

echo "[backfill-dry] GET ${URL} (user=${ADMIN_USER}, dryRun=true)" >&2
curl -sS -u "${ADMIN_USER}:${ADMIN_PASS}" -w "\n[backfill-dry] HTTP %{http_code}\n" "${URL}"
