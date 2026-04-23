# CLAUDE.md

このリポジトリで Claude Code を動かすときの運用ルール。

## 絶対ルール

**実装前に必ず plan モードで設計を出してから書け。**

- ファイルを編集する前に、**何を / なぜ / どこを触るか**を先に言語化する
- 複数ファイルに手を入れる変更は特に、先に計画を提示してから実装に入る
- 「とりあえず書き始めて走りながら考える」は禁止（トークン浪費と暴走の元）
- 小さな 1 行修正や typo 修正はこの限りではない

## 補足ガイド

- **探索と編集は分離**: 先に Read / Grep / Glob で把握 → 計画 → 編集。探索中にいきなり Edit しない
- **コミットは明示的に頼まれてから**: ユーザーが「コミットして」と言うまで自動コミットしない
- **型チェック・ビルドで壊れたら止まる**: `tsc --noEmit` / `npm run build` が通らない状態で完了宣言しない
- **日本語プロジェクトなので応答も日本語**: コメント・ログ・説明文は日本語

## プロジェクトの大まかな地図

- ルート: モノレポ的な構成（`app/`, `server/`）
- 本番の Next.js: `server/`（Vercel の Root Directory は `server`）
- 本番ドメイン: `surechigai-nico.link`
- 詳細は [`HANDOFF.md`](./HANDOFF.md) を参照

## 役割分担

- **フロントエンド / Next.js / UI / LLM まわり** → Claude 担当
- **Railway の MySQL / DB 運用** → Codex 担当
- ただし緊急時はどちらも触って構わない。DB スキーマの変更は `server/scripts/ensure-chokaigi-tables.sql` に
  まとめてあり、Vercel build 時に自動適用される設計なのでスキーマ変更 ≒ コード変更で済む。

## テスト

- **単体テスト**: `cd server && npm run test:unit`（TypeScript の純粋関数群を Node --test で）
- **従来のテスト**: `cd server && npm run test`（.test.mjs）
- **両方**: `cd server && npm run test:all`
- **E2E**: `cd server && npm run test:e2e`（Playwright。デフォルトは `chokaigi` 系のみ）

単体テスト対象の目安: UI / IO を持たない pure function。ファイルごとに `server/tests/<name>.test.ts` を作る。
既存: `tweetUrl`, `yukkuriShareUrls`, `yukkuriDialogueClamp`

## デプロイ動線

- Vercel の Root Directory は `server/`。
- `npm run build` が走ると、**先に `ensure-chokaigi-tables.mjs` が動いて Railway MySQL のスキーマを冪等に反映**する。
  つまり「DB マイグレーションを別手順で流す」必要はない。新しいテーブル / カラムを足すときは
  `server/scripts/ensure-chokaigi-tables.sql` に追記するだけで OK。
- スキーマ適用は `CREATE TABLE IF NOT EXISTS` / `ALTER ... CONVERT TO utf8mb4` / information_schema 確認付き ADD COLUMN で冪等。

## 本番運用の索引

- **会期中のトラブル対応**: [`CHOKAIGI_RUNBOOK.md`](./CHOKAIGI_RUNBOOK.md) — スマホからでも辿れる切り分け手順集
- **ヘルスチェック**: `GET /api/health/yukkuri` で DB / Cron / カバレッジを一括取得（詳細は `?detail=1`）
- **手動 backfill**: `POST /api/admin/yukkuri-backfill?dryRun=0` (Basic 認証)

## 新しい公開 API を足す時の注意

`/chokaigi` LP は未ログインで使われる。新しい API route を追加するときは **`server/src/middleware.ts` の
`isPublicRoute` 配列にも追加すること**（忘れると Clerk が sign-in にリダイレクトし、クライアントは
JSON を期待しているので `*_CLIENT_BAD_SHAPE` で落ちる）。既存例: `/api/yukkuri-explain`,
`/api/yukkuri-explain-tweet`, `/api/og`, `/api/health/*`。
