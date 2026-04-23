# 運用ランブック

外出先・トラブル対応時にコピペで叩けるコマンド集。
値は個別に `.env.ops` を用意して `source` する前提。

## 0. 前提

- 本番ドメイン: `https://surechigai-nico.link`
- 秘匿値（`ADMIN_PASS` / `CRON_SECRET` / `TWITTER_BEARER_TOKEN`）は
  1Password / Bitwarden / メモアプリに保管。このリポジトリには置かない。

## 1. セットアップ（初回 / 新マシン）

```bash
# 1) テンプレをコピーして値を貼り付け
cp .env.ops.example .env.ops
# エディタで .env.ops を開いて ADMIN_USER / ADMIN_PASS / CRON_SECRET を記入

# 2) 現在のシェルに環境変数をロード
source .env.ops

# 3) 値が入っていることを確認（パスは冒頭 4 文字だけ）
echo "user=$ADMIN_USER pass=${ADMIN_PASS:0:4}*** cron=${CRON_SECRET:0:4}***"
```

## 2. 日常の確認（認証不要）

```bash
scripts/ops/health.sh
```

期待する返答:

```json
{
  "ok": true,
  "yukkuriExplainedTable": { "exists": true, "count": <N> },
  "archive": { "total": <N>, "withName": <N>, "withAvatar": <N>, "withBoth": <N>, "coveragePct": <0-100> },
  "activeNow30min": { "ok": true, "count": <N> }
}
```

- `coveragePct` が 100 付近なら健全
- `coveragePct` が下がっている = X API から取れない handle が増えている

## 3. 詳細 health（Basic 認証）

```bash
scripts/ops/health-admin.sh
```

追加で以下のフラグが返る:

```json
{
  "upstashRedis": { "hasUrl": <bool>, "hasToken": <bool>, "configured": <bool>, "redisScard": { ... } },
  "twitter":     { "hasBearerToken": <bool> }
}
```

- `twitter.hasBearerToken: false` → Vercel に `TWITTER_BEARER_TOKEN` 再設定
- `redisScard.ok: false` → Upstash トークン失効の可能性

## 4. バックフィル dry-run（DB は変わらない）

```bash
# 5 件で試す
scripts/ops/backfill-dry.sh 5

# 全件
scripts/ops/backfill-dry.sh 100
```

返答の `results[].action` が全て `no_change` なら差分なし。
`will_update` が並んでいたら apply で反映する。

## 5. バックフィル apply（DB 書き換え / 緊急時のみ）

通常は Vercel Cron が毎日 03:00 JST（UTC 18:00）に自動で走る。
急ぎで反映したい時だけ手動発火する。

```bash
# 誤爆防止のため --yes 必須
scripts/ops/backfill-apply.sh 5 --yes
```

返答の `dryRun: false` + `updated: N` を確認する。

## 6. Cron 手動発火と同等のこと

上記 apply と等価。Vercel Cron 設定は `server/vercel.json`:

```json
{ "path": "/api/admin/yukkuri-backfill?limit=20", "schedule": "0 18 * * *" }
```

UTC 18:00 = JST 03:00（毎日）。

## 7. よくある症状と対応

### 7-1. 「サムネイル / 名前が出ない」

1. `scripts/ops/health.sh` で `archive.withAvatar` と `withName` を確認
2. 欠けていれば `scripts/ops/backfill-dry.sh 20` で差分を見る
3. `will_update` があるなら `scripts/ops/backfill-apply.sh 20 --yes`

### 7-2. 「文字化け（Quma(�N�[�})みたいな）」

原因: MySQL コネクションの charset が utf8mb3 のまま。

- `server/src/lib/db.ts` に `charset: "utf8mb4"` が入っているか確認
- それでも化ける = 既存行が utf8mb3 で保存済み → apply で上書きすれば直る
- テーブル自体の utf8mb4 ALTER は Codex 領域

### 7-3. 「認証に失敗しました」（Basic）

- `ADMIN_USER` / `ADMIN_PASS` の値が Vercel と一致しない
- Vercel の Sensitive 変数は再表示できないので、上書き保存で揃える
- 編集後は Redeploy 必須

### 7-4. 「aborted: token_invalid」

`TWITTER_BEARER_TOKEN` が X API 側で 401/403 を返している。
バックフィルが中断され、レート枠は消費されない（S-2 で対策済み）。

- X Developer Portal でトークン再生成
- Vercel の `TWITTER_BEARER_TOKEN` を上書き → Redeploy

### 7-5. 「管理 API が未設定です」

`ADMIN_USER` または `ADMIN_PASS` が Vercel で未設定。
または設定後 Redeploy していない。

### 7-6. 「409 conflict / running」

別のバックフィルが走行中（GET_LOCK で排他済み）。1〜2 分待って再試行。

## 8. 応急処置: プロジェクト側で直接 DB 書き換え

Vercel API が死んでいる時のみ、手元から直接 MySQL に繋ぐ手段:

```bash
cd server
npm run db:ensure:chokaigi      # スキーマ確認のみ
node scripts/backfill-yukkuri-profiles.mjs --dry-run
node scripts/backfill-yukkuri-profiles.mjs
```

`.env.production.local` または `.env.local` に DB 接続情報が必要。

## 9. 参考

- 全体のハンドオフ: [`../HANDOFF.md`](../HANDOFF.md)
- Claude Code 運用ルール: [`../CLAUDE.md`](../CLAUDE.md)
