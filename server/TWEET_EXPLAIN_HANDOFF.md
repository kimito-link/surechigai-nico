# ツイート URL 解説 機能 — DB 引き継ぎ（Codex 担当）

## 概要

「X のツイート URL を貼り付けたら、りんく・こん太・たぬ姉の 3 人がそのツイートを
ゆっくり解説する」新機能のフロント側（UI / API / ライブラリ）を Claude 側で実装済み。
**Railway の MySQL に新テーブル `yukkuri_explained_tweet` を追加する作業が Codex 側の残タスク**。

- フロント（Claude 担当）: 実装済み・デプロイ可
- DB（Codex 担当）: テーブル未作成。作成前でもフロントは壊れない（try/catch で握りつぶし）

テーブル作成前の挙動:
- `/chokaigi` の「ツイート URL 解説」→ 生成結果は表示される（アーカイブ保存だけ失敗ログに落ちる）
- `/yukkuri/explained/tweet/{tweetId}` → 404（`getYukkuriExplainedTweet` が null）

テーブル作成後の挙動（自動で）:
- 新規生成分から `yukkuri_explained_tweet` に蓄積
- 詳細ページが閲覧可能（フロント再デプロイ不要）

---

## 作成する CREATE TABLE（本番 Railway MySQL 向け）

```sql
CREATE TABLE yukkuri_explained_tweet (
  tweet_id            VARCHAR(32)  NOT NULL,
  x_handle            VARCHAR(64)  NOT NULL,
  author_display_name VARCHAR(200) NULL,
  author_avatar_url   VARCHAR(500) NULL,
  tweet_text          TEXT         NOT NULL,
  tweeted_at          DATETIME     NULL,
  rink                TEXT         NOT NULL,
  konta               TEXT         NOT NULL,
  tanunee             TEXT         NOT NULL,
  source              VARCHAR(64)  NULL,
  first_explained_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                            ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (tweet_id),
  KEY idx_handle (x_handle),
  KEY idx_updated (updated_at)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;
```

### 各カラムの意味

| カラム | 型 | 説明 |
| --- | --- | --- |
| `tweet_id` | `VARCHAR(32)` | X のツイート ID（`1234567890` の数字列）。PK。Claude 側で `replace(/\D/g, "").slice(0, 32)` して投入。 |
| `x_handle` | `VARCHAR(64)` | 投稿者ハンドル（`@` 無し、小文字）。既存 `yukkuri_explained.x_handle` と同じ正規化。 |
| `author_display_name` | `VARCHAR(200)` | X 表示名。取得失敗時は NULL。 |
| `author_avatar_url` | `VARCHAR(500)` | `pbs.twimg.com/...` の URL。取得失敗時は NULL。 |
| `tweet_text` | `TEXT` | ツイート本文。フロント側で 4000 文字でスライス済み。 |
| `tweeted_at` | `DATETIME` | ツイート投稿時刻（ISO8601 → MySQL DATETIME）。欠損時 NULL。 |
| `rink` / `konta` / `tanunee` | `TEXT` | 3 キャラのセリフ（120 字前後、clampYukkuriDialogue 済み）。 |
| `source` | `VARCHAR(64)` | LLM ソース（`openrouter` / 将来 `ollama` 等）。運営デバッグ用途で UI 非表示。 |
| `first_explained_at` | `DATETIME` | 初回解説日時。UPSERT でも変更しない。 |
| `updated_at` | `DATETIME` | 更新日時。ON UPDATE CURRENT_TIMESTAMP。 |

### キー設計の根拠

- **PK = `tweet_id`** : 1 tweet につき 1 行。同じツイートを再解説したら UPSERT で本文とセリフが上書きされる。
- **`idx_handle`** : 「@handle のツイート解説一覧」を今後出せるように。`listYukkuriExplainedTweetByHandle` が `WHERE x_handle = ? ORDER BY updated_at DESC` で叩く。
- **`idx_updated`** : アーカイブ全体を新しい順に並べるクエリ用（将来の `/yukkuri/explained/tweet` 一覧ページ実装時）。
- **文字セット**: 既存 `yukkuri_explained` が `utf8` になっている問題（絵文字 🎉 で `ER_TRUNCATED_WRONG_VALUE_FOR_FIELD`）の反省から、**新テーブルは最初から `utf8mb4_unicode_ci` で作る**こと。

---

## UPSERT SQL（参考 — フロント側が発行する文）

`server/src/lib/yukkuriExplainedTweetArchive.ts` が以下の SQL を発行:

```sql
INSERT INTO yukkuri_explained_tweet
  (tweet_id, x_handle, author_display_name, author_avatar_url,
   tweet_text, tweeted_at, rink, konta, tanunee, source)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
  x_handle            = VALUES(x_handle),
  author_display_name = COALESCE(VALUES(author_display_name), author_display_name),
  author_avatar_url   = COALESCE(VALUES(author_avatar_url),   author_avatar_url),
  tweet_text          = VALUES(tweet_text),
  tweeted_at          = COALESCE(VALUES(tweeted_at), tweeted_at),
  rink                = VALUES(rink),
  konta               = VALUES(konta),
  tanunee             = VALUES(tanunee),
  source              = VALUES(source),
  updated_at          = CURRENT_TIMESTAMP;
```

- 表示名・アバター・投稿時刻は `COALESCE` で「新しい値が NULL なら既存を維持」。
  再解説時に X API が一時的に 403 等を返したケースでも、過去にちゃんと取れた値を失わない。
- `first_explained_at` は UPDATE 時に触らない（初回解説時刻を保持）。
- `updated_at` は `ON UPDATE` の DEFAULT に任せたかったが、MySQL 5.x 系の挙動差を避けて明示的にも SET する形になっている。

---

## 動作確認手順（テーブル作成後）

1. 超会議 LP（`/chokaigi`）右下のスティッキーバー入力欄に、任意の X ツイート URL を貼る
   例: `https://x.com/jack/status/20`
2. 「ツイート解説」ボタンが出ることを確認し、クリック
3. モーダルに 3 キャラのセリフが出ることを確認
4. モーダル下部「このツイート解説の保存ページ →」をクリック
5. `/yukkuri/explained/tweet/{tweetId}` が開き、本文と 3 キャラ解説が表示される
6. DB 側で `SELECT * FROM yukkuri_explained_tweet ORDER BY updated_at DESC LIMIT 5;` で 1 行入っていることを確認

### 既存テーブルとの棲み分け

| テーブル | 粒度 | 用途 |
| --- | --- | --- |
| `yukkuri_explained` | 1 ハンドル 1 行 | ハンドル入力解説（既存） |
| `yukkuri_explained_tweet` | 1 ツイート 1 行 | ツイート URL 解説（新規） |

同じハンドルの複数ツイートを解説すると、`yukkuri_explained_tweet` に複数行が入る。
両テーブルは独立しており、結合クエリは今のところ不要。

---

## フロント側の関連ファイル（参考）

| ファイル | 役割 |
| --- | --- |
| `server/src/app/api/yukkuri-explain-tweet/route.ts` | ツイート URL 解説 API（POST） |
| `server/src/lib/tweetUrl.ts` | ツイート URL の正規表現パーサ |
| `server/src/lib/xTweet.ts` | X API v2 呼び出し（`/2/tweets/:id` + 投稿者 expansion） |
| `server/src/lib/yukkuriExplainedTweetArchive.ts` | 当テーブルへの UPSERT / SELECT 関数 |
| `server/src/app/yukkuri/explained/tweet/[tweetId]/page.tsx` | ツイート解説の保存ページ |
| `server/src/app/chokaigi/StickyXSearchBar.tsx` | 入力振り分け（ハンドル / ツイート URL）UI |
| `server/src/lib/useYukkuriExplain.ts` | Hook。`body.tweetUrl` の有無で API を振り分け。 |

---

## Codex 側の残タスク（まとめ）

- [ ] Railway MySQL で `yukkuri_explained_tweet` テーブルを上記 SQL で作成（utf8mb4）
- [ ] 既存 `yukkuri_explained` テーブルも `utf8mb4` に ALTER（既存タスク。本件とは独立だが、絵文字対応のため推奨）
- [ ] `/api/admin/health/yukkuri` に `tweetArchiveRows`（`SELECT COUNT(*) FROM yukkuri_explained_tweet`）も足すと運用監視しやすい（optional）

テーブル作成後は動作確認手順を 1 回流して `SELECT` で 1 行入ることを確認してもらえれば OK。
