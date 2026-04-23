# Codex 向け依頼メモ（2026-04 時点）

Claude 側で触れない DB 領域は Codex 担当（`MEMORY.md` の切り分けに従う）。
超会議 2026 に向けて、フロントの v3 ヒーローが依存する DB スキーマと集計を下記の通り追加してほしい。

---

## 進捗メモ（2026-04-24 Claude による暫定実装）

超会議 2026-04-25 直前の状況で、ユーザー指示により Claude が `§1 / §2 / §3 / §4` を
DB/API/フロントまで一気通貫で暫定実装済み。
関連コミット: `3b59b2c`, `2e99038`, `8a5c6c4`, `90c325d`, `55d583f`, `6a5307d`
(＋ 本メモ更新と同時にテスト追加 `visibilityFilter.test.ts`)。

### DB / API（Codex 領域の先行実装）

- **§1 スキーマ**: `ensure-chokaigi-tables.mjs` に idempotent ADD COLUMN を追加済み。
  `home_prefecture VARCHAR(8) NULL` と `location_visibility TINYINT NOT NULL DEFAULT 0`。
- **§1 API (自分)**: `GET /api/users/me` 返却に追加、`PATCH /api/users/me` で受付 + バリデーション。
  `server/src/lib/prefectureCodes.ts` に JIS X 0401 コード⇔県名の共通ヘルパを新設（単体テスト付き）。
- **§1 API (マッチ)**: `/api/encounters` の GET で `other_home_prefecture` を
  `CASE WHEN u.location_visibility >= 1 THEN u.home_prefecture ELSE NULL END` として返却（§1 表 3 行目）。
- **§1 API (集計)**: `/api/creators/prefecture-counts` と `/api/creators/by-prefecture` が
  optional `?visibilityMin=1|2` を受け、渡したときだけ `u.location_visibility >= ?` で絞る
  （§1 表 4 行目）。既存の未指定呼び出しは従来挙動のまま。
  パースロジックは `server/src/lib/visibilityFilter.ts` に切り出し、単体テストで lock。
  **設計メモ**: `/creators` と `/creators/[pref]` のページは `visibilityMin` を渡さない設計。
  これらのページは `location_logs.municipality`（過去に訪れた県）に基づく表示で、
  自己申告の `home_prefecture` とは別軸。CODEX-NEXT §1 の公開範囲は「自己申告した参加県」を
  対象にしており、位置ログの municipality に遡って適用しない。visibilityMin は
  「解説アーカイブ・ヒーロー地図ピン等の新規コンシューマ」のみ opt-in で使う。
- **§2 アーカイブ JOIN**: `yukkuriExplainedArchive.ts` の list/get で users と LEFT JOIN。
  `is_surechigai_member` (boolean) と `home_prefecture` (visibility >= 2 のときだけ) を返す。
- **§3 解説プロンプトへの県注入**: `/api/yukkuri-explain` の POST で DB 側再チェック
  (`LOWER(users.twitter_handle)` でマッチし `location_visibility >= 2` のときのみ注入)。
- **§4 bothCount**: `/api/admin/stats` の overview に `both_count` を追加。

### フロント（Claude 領域、2026-04-24 深夜のセッションで完了）

- **オンボーディング**: `ProfileStep.tsx` に参加県セレクト + 公開範囲ラジオを追加。
  初期値は県=未選択 / 公開範囲=0（完全非公開）。
- **既存ユーザー向け設定カード**: `/app` のホームに `PrefectureSettingsCard.tsx` を追加。
  `GET /api/users/me` で現状読み取り、`PATCH /api/users/me` で保存。
  register-direct で UUID が揃うまで叩かない（`ready` prop で制御）。
- **マッチ画面の県バッジ**: `EncounterCard.tsx` に `other_home_prefecture` を反映。
  `🏠 〇〇から` バッジをアバター周りに表示。
- **解説アーカイブ**: `/yukkuri/explained`（一覧）と `/yukkuri/explained/[handle]`（詳細）に
  `📍 すれちがい参加中` バッジと `🏠 〇〇から` バッジを追加。
- **CSS**: `app.module.css` と `explained.module.css` に上記バッジの style を追加。

### 残タスク

- **§6 ヒーロー地図ピン**（`ChokaigiConceptBanner.tsx` の SVG アニメに県別ピンを載せる）は
  既存実装が 455 行の複雑な SVG で、overnight 単独作業はリスクが高すぎると判断して見送り。
  会期後に落ち着いてから着手する。API (`/api/creators/prefecture-counts?visibilityMin=2`) は既に
  出来ているので、UI 側だけの作業で完結する。
- **Codex 側の本来の作業**:
  `users.twitter_handle` にアプリから値を populate するアカウント連携。
  現状 `twitter_handle` がどこからも書き込まれていないので、上記 §2/§3/§4 と §1 の
  encounters/creators JOIN は全て「ヒット 0 件」扱いになる。X 連携が入った瞬間から
  自動的に機能し始める設計。

---

## 1. 【優先・超会議までに欲しい】参加県（home_prefecture）と公開範囲

### 目的

- 超会議で「〇〇から来たんです」の自己紹介のきっかけに使う
- **デフォルト非公開**。ユーザーが明示的に公開レベルを上げたときだけ見える
- フロント `YukkuriHero` の v3 シナジー文で "見せたい人にだけ見せられる" と謳っている実装

### スキーマ変更（`users` または相当テーブル）

```sql
ALTER TABLE users
  ADD COLUMN home_prefecture VARCHAR(8) NULL
    COMMENT '都道府県コード JIS X 0401 の 01..47。NULL は未設定',
  ADD COLUMN location_visibility TINYINT NOT NULL DEFAULT 0
    COMMENT '0=完全非公開 / 1=マッチ相手のみ / 2=全体公開';
```

- `home_prefecture` は「01..47」ゼロパディング文字列で持つ案（整数でも可。フロントは文字列で受け取りたい）
- `location_visibility` は 3 段階。**デフォルト 0（完全非公開）が必須**

### 必要な API（新規 or 拡張）

| エンドポイント | 用途 |
|---|---|
| `PATCH /api/users/me` で `homePrefecture`, `locationVisibility` を更新できるように | プロフィール設定画面から |
| `GET /api/users/me` の返却に `homePrefecture`, `locationVisibility` を含める | 設定画面の初期値表示 |
| `GET /api/creators/prefecture-counts`（既存？）が `location_visibility >= 2` のユーザーだけ集計するように | ヒーロー地図ピン用 |
| `GET /api/encounters` の返却で、マッチ相手の `home_prefecture` を `location_visibility >= 1` のときだけ返す | マッチ画面バッジ |

### 公開レベル別の扱い

| レベル | 誰から見える | どこに表示される |
|---|---|---|
| 0 完全非公開（デフォルト） | 誰にも | 出さない |
| 1 マッチ相手のみ | すれ違った相手だけ | マッチ画面のバッジ |
| 2 全体公開 | 全世界 | 解説アーカイブ・ヒーロー地図ピン・ゆっくり解説文内 |

---

## 2. ゆっくり解説アーカイブに「すれ違い参加中」フラグ

### 目的

フロントの `/yukkuri/explained` 一覧や `YukkuriExplainedShareRow` で、
「この人はすれ違いにも参加している」を視覚化したい（シナジー導線）。

### クエリ案

```sql
-- 解説アーカイブ取得時に users.location_visibility と JOIN
SELECT
  y.x_handle,
  y.display_name,
  y.avatar_url,
  y.rink, y.konta, y.tanunee,
  u.home_prefecture,
  u.location_visibility,
  (u.user_id IS NOT NULL) AS is_surechigai_member
FROM yukkuri_explained y
LEFT JOIN users u ON u.x_handle = y.x_handle
WHERE y.x_handle = ?;
```

- フロントは `is_surechigai_member=true` のときに「📍 すれ違い参加中」バッジ
- `home_prefecture` は `location_visibility >= 2` のときだけ返す

---

## 3. ゆっくり解説生成時の県コンテキスト注入

### 目的

`location_visibility = 2` の人を解説するとき、
りんく/こん太/たぬ姉が「〇〇県から超会議に来てるらしい」と一言入れられるように、
プロンプトに `publicPrefecture` を流したい。

### フロント側（Claude 担当）の入力

フロントは `useYukkuriExplain.explain({ xHandle, name, publicPrefecture? })` で
`publicPrefecture` を渡したい。Codex 側（`/api/yukkuri-explain` ハンドラ）で:

1. リクエスト body に `publicPrefecture` が来たら受け取る（任意フィールド）
2. さらに DB 側でそのハンドルの `users.location_visibility` をチェックし、
   **`>= 2` のときだけ** LLM プロンプトに県情報を混ぜる（フロント申告だけだと詐称可能なので DB 側で必ず二重チェック）
3. `< 2` なら県情報はプロンプトから除去

---

## 4. （任意）統計チップの「両方」カウント

### 現状

ヘッダーに「参加中 N / 登録 N / 解説 N」が出ている。

### 追加したい

「**解説されている × すれ違い登録している**」重なり人数 = 企画の中心値。

```sql
SELECT COUNT(*) AS both_count
FROM yukkuri_explained y
JOIN users u ON u.x_handle = y.x_handle;
```

既存 `/api/admin/stats` 系に `bothCount` を足す形で十分。

---

## 5. 運用メモ

- すべての変更は `scripts/ops/health.sh` の `archive`/`activeNow30min` と整合するよう、
  **既存エンドポイントの後方互換を壊さない**（新フィールドは optional で返す）
- `utf8mb4 ALTER`（既知 pending）を先にやると、コメント・表示名の化け対策が同時に片付く
- 超会議（2026-04-25/26 予定）までに、最低 **1.（県＋公開レベル） + 3.（解説への県注入）** だけあれば
  フロントの "見せたい人にだけ" 約束は果たせる

---

## 6. フロント側の状態（2026-04-24 時点、Claude が先行実装）

2026-04-24 深夜の overnight セッションで Claude が DB/API/フロントまで一気通貫で実装した。
詳細は冒頭の「進捗メモ」を参照。下記は会期後の整理用。

**実装済み**（動いている）:
- ヒーロー v3 コピーで「参加県は任意公開・デフォルト非公開」と謳う文言
- 解説完了オーバーレイのシナジー誘導文（`@handle` が参加中なら会場で見つかるかも）
- `/onboarding` の参加県 + 公開範囲 UI
- `/app` 既存ユーザー向け設定カード (`PrefectureSettingsCard`)
- マッチ画面の 🏠 県バッジ
- 解説アーカイブ一覧・詳細の 📍 参加中バッジと 🏠 県バッジ

**未実装（会期後に着手）**:
- ヒーロー背景 `ChokaigiConceptBanner` の県別地図ピン（既存 SVG アニメが複雑なため見送り）

**本当に Codex に依頼したい残タスク**:
- `users.twitter_handle` の populate を Clerk OAuth から自動で行うアカウント連携。
  現状 `twitter_handle` カラムが空のままで、§2/§3/§4 と §1 の encounters/creators JOIN が
  全件 0 ヒット扱いになっている。X 連携が通れば Claude 側のコードはそのまま機能し始める。
- （任意）`utf8mb4 ALTER` の全テーブル適用（既知 pending、化け対策）。
