#!/usr/bin/env bash
# 公開 health チェック（認証不要）
#   Usage: scripts/ops/health.sh
#   環境変数: VERCEL_HOST （未設定時は本番ドメイン）
set -euo pipefail

HOST="${VERCEL_HOST:-https://surechigai-nico.link}"
URL="${HOST}/api/health/yukkuri"

echo "[health] GET ${URL}" >&2
curl -sS -w "\n[health] HTTP %{http_code}\n" "${URL}"
