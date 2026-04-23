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
