# すれちがいライト - ニコニコ超会議 2026 当日運用手引き

会期中に何か起きたときの「まず見るところ」「まず叩くコマンド」の索引。
スマホからでも読めるよう短くまとめてある。

---

## 0. 最初に叩く 3 つ

```bash
# 1) サイトが生きているか
curl -s -o /dev/null -w "%{http_code}\n" https://surechigai-nico.link/

# 2) /chokaigi が生きているか
curl -s -o /dev/null -w "%{http_code}\n" https://surechigai-nico.link/chokaigi

# 3) ゆっくり解説 DB が生きているか + 直近 backfill が回ってるか
curl -s https://surechigai-nico.link/api/health/yukkuri | jq
```

`/api/health/yukkuri` のレスポンスで見るキー:

| key | 意味 | 健全値 |
|------|------|--------|
| `yukkuriExplainedTable.exists` | DB テーブル到達可否 | `true` |
| `yukkuriExplainedTable.count` | アーカイブ件数 | 単調増加 |
| `archive.coveragePct` | name + avatar 埋まり率 | 80%以上 |
| `activeNow30min.count` | 直近 30 分のアクティブユーザー | 会期中は増える |
| `lastBackfillAt` | backfill Cron の最終実行時刻 | 24h 以内 |
| `lastBackfillFailed` | 最終 backfill の失敗件数 | できれば 0、20 以下 |

---

## 1. サイト全体が落ちた

**まず**: Vercel ダッシュボード → Deployments → 最新が `Error` / `Build failed` か確認。

**Build failed の場合**:
- 直近のデプロイ失敗理由は Vercel の Deploy ログに出る
- よくある原因:
  - `ensure-chokaigi-tables.mjs` が DB 接続失敗 → **Build 時に Railway MySQL が落ちている、または MYSQL_PUBLIC_URL が Build Env に無い**
  - TypeScript 型エラー → 直前の push のコードが壊れている
- 緊急ロールバック: Vercel → Deployments → 最後の ✅ をクリック → "Promote to Production"

**500 / 504 が返る場合**:
- Railway MySQL のダッシュボードで MySQL サービスの状態を確認
- Upstash Redis が落ちていても多くのエンドポイントは動く（機能縮退で動く設計）

---

## 2. X でシェアが動かない

**症状**: シェアボタン押しても X composer が空白、OGP カード出ない、本文出ない。

**まず**: 既に対策済み。押した瞬間に「本文 + URL」がクリップボードに入るので、
空白で開いた場合は **Ctrl+V / ⌘V で貼り付け** を案内（UI にも出ている）。

**テストコマンド**:
```bash
# シェア URL を出力（このまま開いて composer に反映されるか確認）
echo "https://x.com/intent/post?text=$(python3 -c 'import urllib.parse; print(urllib.parse.quote("りんく・こん太・たぬ姉に @hosino_romi さんをゆっくり解説してもらったよ！\n#すれちがいライト #ニコニコ超会議2026\nhttps://surechigai-nico.link/yukkuri/explained/hosino_romi"))')"
```

**クリップボード書き込みが効かない場合**:
- iOS Safari のプライベートモードでは `navigator.clipboard.writeText` が動かない
- 手動コピー用の `window.prompt` にフォールバック済み（自動で出る）

---

## 3. ゆっくり解説 (LLM) が動かない

**症状**: 解説ボタン押しても 30 秒以上帰ってこない、エラーが出る。

**原因候補**:

a) **OpenRouter のレート / 障害**:
```bash
curl -s "https://surechigai-nico.link/api/admin/health/yukkuri" -u admin:PASSWORD | jq
# upstashRedis.redisScard.count が増えているか
```
Redis が全 backoff の状態を持つ。`OPENROUTER_GLOBAL_BACKOFF` キーが
立っているとしばらく呼ばない。Upstash Redis ダッシュボードで確認。

b) **X API (Twitter) トークン切れ**:
- `/api/admin/yukkuri-backfill?dryRun=1` を admin Basic 認証付きで叩いて、
  `aborted: "token_invalid"` が返れば `TWITTER_BEARER_TOKEN` を更新
- Vercel → Environment Variables で更新後、Redeploy

c) **Railway MySQL 不安定**:
- `/api/health/yukkuri` が 500 / timeout なら MySQL 側。Railway で再起動。

---

## 4. backfill Cron が止まっている

**症状**: `/api/health/yukkuri` の `lastBackfillAt` が古いまま（24h 以上更新されない）。

**確認**:
1. Vercel → Cron Jobs で `/api/admin/yukkuri-backfill` のスケジュールと最終実行を見る
2. 手動トリガー: admin Basic 認証付きで `POST /api/admin/yukkuri-backfill?dryRun=0`
3. `lastBackfillFailed` が全件数近いなら token / API 側の問題
4. `lastBackfillAt` が更新されたら OK

---

## 5. DB が壊れた / スキーマが崩れた

**事前準備**: スキーマ DDL は `server/scripts/ensure-chokaigi-tables.sql` に集約。
Vercel の次デプロイで自動適用される（`server/package.json` の `build` から呼ばれる）。

**緊急時の手動適用**:
1. Railway → MySQL → Data タブ → Query エディタ
2. `ensure-chokaigi-tables.sql` の全文を貼って実行
3. 冪等（`CREATE TABLE IF NOT EXISTS` / `ALTER ... CONVERT TO utf8mb4` / information_schema 確認付き ADD COLUMN）なので何度流しても安全

**1 テーブル壊れた場合**: backup からリストアは Railway 側の機能。
会期中は `yukkuri_explained` / `yukkuri_explained_tweet` が消えても
UI は try/catch で壊れない（DB 無しなら空アーカイブ扱いで表示）。

---

## 6. 緊急ロールバック

**UI / API を巻き戻したい**:
1. Vercel → Deployments → 巻き戻したい ✅ を右クリック
2. "Promote to Production"
3. 即反映（Serverless Function は新しい Deployment を即座に使う）

**DB スキーマを巻き戻したい**:
- これは DIY になる。`ALTER TABLE ... DROP COLUMN` 等を手動で。
- ただし今のスキーマ変更はすべて「足す方向」なので、古いコードは新しいスキーマで
  そのまま動く（互換性あり）。巻き戻しが必要になるケースは稀。

**特定のコミットを revert して push**:
```bash
git revert <hash>
git push origin main
# 自動で Vercel がデプロイし直す
```

---

## 7. ダッシュボード URL

| サービス | URL |
|----------|-----|
| Vercel | https://vercel.com/ |
| Railway | https://railway.app/ |
| Upstash Redis | https://console.upstash.com/ |
| Clerk | https://dashboard.clerk.com/ |
| Stripe | （使っていれば）https://dashboard.stripe.com/ |
| OpenRouter | https://openrouter.ai/keys |
| X Developer | https://developer.x.com/ |

---

## 8. 外形監視

| 監視項目 | URL | 閾値 |
|----------|-----|------|
| サイト全体 | https://surechigai-nico.link/ | HTTP 200 |
| /chokaigi | https://surechigai-nico.link/chokaigi | HTTP 200 |
| API health | https://surechigai-nico.link/api/health/yukkuri | HTTP 200 + `.ok === true` |
| DB 到達 | 上記の `yukkuriExplainedTable.exists === true` | - |
| Cron | 上記の `lastBackfillAt` が 24h 以内 | - |

UptimeRobot / Better Uptime 等を使う場合はこれらを組み合わせる。
(特に `/api/health/yukkuri` は 1 リクエストで DB / Cron / カバレッジ全部見られる)

---

## 9. よくある質問 (スタッフ向け)

**Q: ユーザーが「ゆっくり解説されない」と言ってきた**
- そのハンドルが `@` 付きかどうかを聞く（両方 OK）
- X の非公開アカウント / 削除済みアカウントは X API が 401/403 を返すので解説不可
- レート枠いっぱいの時は 1–5 分待ってもらう

**Q: 「ツイート URL を入れてるのに反応してくれない」**
- `x.com/{user}/status/{id}` の形式か確認
- 数字 ID が 5 桁未満なら拒否される（誤入力対策）
- 削除済みツイート / 鍵アカのツイートは X API から引けない

**Q: 「すれ違い登録したけど誰ともすれ違えない」**
- マッチングは 500m グリッド + 5 分 Cron
- 会場内でも、両方がログインかつ位置情報を送信している必要がある
- Android Chrome の位置情報許可が出ていないケースが最多

---

## 10. 会期終了後

- Vercel Cron はそのまま（backfill 継続、データ蓄積継続）
- `B-7` タスク（Cron の `limit` / `waitMs` 再調整）をここで実施
- 会期中の `/api/admin/yukkuri-backfill` 成績で limit を増やせるか判断

---

## 11. 参加県 / 公開範囲（CODEX-NEXT §1-§6）

会期直前に入った機能。会場で「県バッジが出ない」「他の人の県が見えない」系の
質問が来た時の切り分け。

### 仕様のおさらい

- **`home_prefecture`**: JIS X 0401 の `"01".."47"` 文字列（DB カラム `VARCHAR(2)`、NULL 可）
- **`location_visibility`**: `TINYINT` 0/1/2、デフォルト `0`
  - `0`: 完全非公開（他ユーザー・アーカイブ・地図ピンどこにも出ない）
  - `1`: すれちがった相手のマッチ画面にだけ 🏠 バッジが出る
  - `2`: ゆっくり解説アーカイブと地図ピンにも出る（全体公開）
- **重要**: フロントから来る値はすべて DB 側でダブルチェックしている。
  フロントを騙しても `location_visibility=0` のユーザーの県は出ない。

### UI 導線

| 画面 | 出る場所 | 条件 |
|------|---------|------|
| `/onboarding` (ProfileStep) | 任意選択として選べる | 初回のみ |
| `/app` (PrefectureSettingsCard) | 既存ユーザーもあとから変更可 | ログイン時 |
| `/app` (EncounterCard) | `🏠 〇〇から` バッジ | 相手が `visibility>=1` |
| `/yukkuri/explained` 一覧・詳細 | `🏠 〇〇から` バッジ | 本人が `visibility>=2` |
| ヒーロー背景の地図ピン | 将来実装予定 | - |

### 症状: 「設定したのに県が他の人に見えない」

1. 本人の `/api/users/me` で現状確認:
   ```bash
   # localStorage の uuid_token を取って
   curl -s "https://surechigai-nico.link/api/users/me" \
     -H "Authorization: Bearer uuid:{TOKEN}" | jq '.user | {home_prefecture, location_visibility}'
   ```
   - `home_prefecture` が `null` → まだ保存されていない。/app のカードで選び直す
   - `location_visibility: 0` → 設定済みでも公開範囲が非公開なので当然出ない
2. 見る側のキャッシュ: Next.js の `dynamic = "force-dynamic"` は入れてあるので
   普通は反映即時。CDN キャッシュが効いてる時は URL 末尾に `?v=2` 等で強制再取得。

### 症状: 「ゆっくり解説アーカイブに県バッジが出ない」

1. 本人の `location_visibility` が `2` かを上の手順で確認
2. アーカイブの API: `getYukkuriExplainedArchive(handle)` は
   `location_visibility >= 2` のときしか `home_prefecture` を返さない。
   `/yukkuri/explained/{handle}` を view して `<script type="application/ld+json">` や
   ページ内 HTML に `🏠` の文字列が無ければ DB クエリ側で剥がされた。
3. 該当ユーザーが本当に `visibility=2` で保存しているのに出ないなら、
   SQL 直接確認:
   ```sql
   SELECT u.home_prefecture, u.location_visibility, y.x_handle
   FROM users u
   LEFT JOIN yukkuri_explained y ON LOWER(u.twitter_handle) = y.x_handle
   WHERE y.x_handle = '{小文字handle}';
   ```

### 症状: 「クリエイター一覧 (`/chokaigi` 以降) の県集計が変」

- `/api/creators/prefecture-counts` は **デフォルトではフィルタなし**（登録者全員で集計）
- `?visibilityMin=2` を付けて初めて「公開許可済みのみ」に絞る
- opt-in 設計なので、LP の集計値が急に減った場合は **呼び出し側が `visibilityMin` を付けているか** を疑う
- パースは `parseVisibilityMin()` で吸収: `"0"` / 空文字 / 不正値 は全部 `undefined`（フィルタなし）

### 症状: 「県の未設定扱いを選び直したい」

- `/app` → 参加県カード → 「変更する」 → セレクトで「選択しない」 → 保存
- `PATCH /api/users/me` が `home_prefecture: null` を受け付ける設計

### 関連ファイル（当日何か触る時の索引）

- スキーマ: `server/scripts/ensure-chokaigi-tables.sql` (users への ADD COLUMN)
- API: `server/src/app/api/users/me/route.ts` (GET/PATCH)
- 純粋ヘルパ: `server/src/lib/prefectureCodes.ts` / `server/src/lib/visibilityFilter.ts`
- UI: `server/src/app/onboarding/steps/ProfileStep.tsx` / `server/src/app/app/components/PrefectureSettingsCard.tsx`

### 会期中の計測：`/admin` ダッシュボード

Basic 認証付きで `/admin` にアクセスすると、以下が数字で見える:

| 指標 | 意味 |
|------|------|
| `解説×すれちがい両方` | 企画中心値。`twitter_handle` populate 前は 0 |
| `参加県を登録` | `home_prefecture IS NOT NULL` の人数 |
| `公開範囲の分布` v0/v1/v2 | デフォルト非公開 / マッチ相手のみ / 全体公開 の人数 |
| `県別の参加者分布` | 県ごとの登録数と全体公開数（総数降順テーブル） |

API 直叩きしたい時は `GET /api/admin/stats` で同じ JSON が返る。

### テスト

- `npm run test:unit` に `prefectureCodes.test.ts` と `visibilityFilter.test.ts` が含まれる。
  リグレッションが怖い時は会期中でも `cd server && npm run test:unit` で回せる（DB 不要）。
