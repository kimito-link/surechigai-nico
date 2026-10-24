# 有料プラン導入の準備メモ（monetization readiness）

最終更新: 2026-10-25 / ブランチ `claude/x-api-expansions-and-conversion`

> 決済・価格はまだ未実装。このメモは「後で有料プランを足すときに何が必要か」の棚卸し。

## 1. コストが重い機能（コードから読める範囲）

| 機能 | 外部コスト（1 回あたり） | キャッシュ |
| --- | --- | --- |
| ハンドル解説 `/api/yukkuri-explain`（新規生成） | X: user $0.010 + タイムライン最大 10 posts $0.050 = **最大 約 $0.060** ＋ LLM（OpenRouter haiku / gpt-4o-mini 等） | 解説 24h（Redis）＋プロフィール 24h（`xProfileCache`） |
| ハンドル解説（解説キャッシュ hit） | X: プロフィールキャッシュ hit なら **$0**、miss なら $0.010 | 同上 |
| ツイート解説 `/api/yukkuri-explain-tweet` | X: post $0.005 + user $0.010（expansions）= **$0.015**。投稿者キャッシュ hit なら **$0.005** ＋ LLM | 解説結果のキャッシュは**なし**（同じツイートでも毎回 LLM） |
| プロフィール backfill Cron（1 日 3 回 × 100 件） | X: 最大 **約 $3/日**（プロフィールキャッシュ hit 分は $0） | `xProfileCache` |
| `scripts/backfill-yukkuri-profiles.mjs`（手動） | 全件 × $0.010（dry-run でも課金）。`BACKFILL_MAX_USERS` で上限可 | なし |
| すれ違い / 位置 / バッジ / Spotify 検索 / 逆ジオコーディング(Nominatim) | 従量課金の外部 API なし（DB・無料 API） | — |

単価は X API Pay-Per-Use の前提値（user $0.010 / post $0.005）。2026-11-22 以降は `expansions` で `includes` に入ったオブジェクトも課金される。

## 2. 今回入れた土台

- **日次支出ガード**（`server/src/lib/xApiBudgetCore.ts` / `xApiBudget.ts`）
  - 全体 `X_API_DAILY_BUDGET_USD`（既定 $30/日）、1 クライアント（IP ハッシュ）`X_API_DAILY_BUDGET_PER_CLIENT_USD`（既定 0＝無制限。会場 Wi-Fi で同一 IP に多人数がいるため。荒らし対策で使うなら $3/日 程度）、`X_API_SPEND_GUARD=off` で無効化
  - カウンタは Upstash Redis `xapi:spend:{UTC日付}:*`（未設定ならインスタンス内メモリ）
  - 管理者用 health（`/api/admin/health/yukkuri`）の `xApiSpend` に当日の推定支出
- **上限到達レスポンス**: HTTP 429 + `error_code: E_YUKKURI_LIMIT_REACHED / E_TWEET_EXPLAIN_LIMIT_REACHED` +
  `limit: { reason, scope: "client"|"global", resetAt, upgradeAvailable: false }`。
  UI（StickyXSearchBar）は上限時に「再試行」を出さず「すれ違い参加」へ誘導する。
  **有料プランを足すときは `upgradeAvailable: true` を返し、UI に「プランを見る」ボタンを足すだけで導線になる。**
- **ファネル計測**: `yukkuri_explain_start / _success / _error / _limit / share_click / register_click`（PII なし、`/api/analytics/beacon`）
- **招待導線**（任意）: `NEXT_PUBLIC_YUKKURI_INVITE_PROMPT=1` で解説成功後に「別の人を解説してみる」

## 3. 無料枠の目安（コードベースの試算）

- 1 人あたり 1 日: ハンドル解説の**新規生成 10 回**＋ツイート解説 **20 回**程度なら、最大でも約 $0.60 + $0.30 = $0.90。
  クライアント上限を $3 にした場合はこの約 3 倍で、通常利用は止まらない想定。
- 有料化するなら「無料: 新規生成 X 回/日、有料: 上限緩和・ツイート解説の優先 LLM」のように
  **回数**で見せるのが分かりやすい（内部は今の $ ベースのガードを流用できる）。

## 4. まだ足りないもの（有料化までの TODO）

1. **ユーザー単位の識別**: 解説 API は未ログインで使える公開 API。今は IP ハッシュ単位。
   有料枠を付けるには Clerk の `userId` で枠を持つ（`clientKey` を `userId` 優先に差し替えるだけで済む設計）。
   会場 Wi-Fi のような共有 IP では IP 単位だと誤爆するので、イベント当日はクライアント上限を緩める運用が必要。
2. **プラン状態の保存**: `users` テーブルに plan / 有効期限のカラム（`ensure-chokaigi-tables.sql` に非破壊 ADD COLUMN）。
3. **決済プロバイダ**（Stripe 等）と webhook（`/api/webhooks/*` が既にあるのでそこに追加）。※今回は未着手。
4. **ビーコンの保存先**: `/api/analytics/beacon` は受け口のみで保存していない。CVR を見るには
   ログ基盤（Vercel Log Drain / DB テーブル）への保存が必要。
5. **LLM コストの計上**: OpenRouter はダッシュボードの Credit limit 頼み。X と同じ予約・精算方式で
   LLM トークン費用もガードに入れると、プラン別原価が出せる。
6. **ツイート解説の結果キャッシュ**: 同じツイートは毎回 X + LLM を叩く。`yukkuri_explained_tweet` を
   一定時間（例 1h）再利用すれば原価が下がる（仕様判断が必要なので未実施）。
7. **アプリ（Expo）側**: 現状のタブ（ホーム / おさんぽ / 統計 / コレクション / 設定）に課金対象機能は無い。
   有料化するならアプリ内課金（App Store / Google Play の規約）を別途検討。
