#!/usr/bin/env bash
# バックフィル本適用（Bearer 認証 / DB が書き換わる）
#   Usage: scripts/ops/backfill-apply.sh <LIMIT> --yes
#   --yes が無い場合は誤爆防止のため拒否
#   必須: CRON_SECRET
#   任意: VERCEL_HOST
set -euo pipefail

: "${CRON_SECRET:?CRON_SECRET が未設定です。.env.ops を source してください}"

LIMIT="${1:-}"
CONFIRM="${2:-}"

if [[ -z "${LIMIT}" || "${CONFIRM}" != "--yes" ]]; then
  cat >&2 <<'USAGE'
[backfill-apply] 使い方: scripts/ops/backfill-apply.sh <LIMIT> --yes
  <LIMIT>  1 回で処理する件数（例: 5, 20）
  --yes    DB を本当に書き換える意思表示（誤爆防止）
例:
  scripts/ops/backfill-apply.sh 5 --yes
USAGE
  exit 2
fi

HOST="${VERCEL_HOST:-https://surechigai-nico.link}"
URL="${HOST}/api/admin/yukkuri-backfill?limit=${LIMIT}"

echo "[backfill-apply] !!! APPLY MODE !!! GET ${URL}" >&2
echo "[backfill-apply] DB を更新します (dryRun=false)..." >&2
curl -sS -H "Authorization: Bearer ${CRON_SECRET}" -w "\n[backfill-apply] HTTP %{http_code}\n" "${URL}"
