#!/usr/bin/env bash
# 詳細 health チェック（Basic 認証 / admin 専用）
#   Usage: scripts/ops/health-admin.sh
#   必須: ADMIN_USER, ADMIN_PASS
#   任意: VERCEL_HOST
set -euo pipefail

: "${ADMIN_USER:?ADMIN_USER が未設定です。.env.ops を source してください}"
: "${ADMIN_PASS:?ADMIN_PASS が未設定です。.env.ops を source してください}"

HOST="${VERCEL_HOST:-https://surechigai-nico.link}"
URL="${HOST}/api/admin/health/yukkuri"

echo "[health-admin] GET ${URL} (user=${ADMIN_USER})" >&2
curl -sS -u "${ADMIN_USER}:${ADMIN_PASS}" -w "\n[health-admin] HTTP %{http_code}\n" "${URL}"
