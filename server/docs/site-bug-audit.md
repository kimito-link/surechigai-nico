# サイト全体バグ監査レポート 2026-04-22

作成日: 2026-04-22
対象: `surechigai-lite-handoff/server`（Next.js 15 App Router / Clerk / MySQL 8 / Upstash Redis）
手法: 静的コードレビュー + `ts-prune` + grep（根拠となる引用元・参照元が示せるものだけ一覧化）

> **方針**: 本レポートで列挙したバグ候補のうち、P0 は同時実装で修正する。P1/P2 は `qa-improvement-plan.md` の対象として回帰テストと一緒に着手する。**根拠が示せないものは保留リストに回す**（末尾参照）。

---

## 0. エグゼクティブサマリ

| 優先 | ID | 一言サマリ | 影響 |
| ---- | -- | ---------- | ---- |
| **P0** | B-1 | `/api/admin/*` が無認証で公開 | 任意ログインユーザが他ユーザを「ひとこと非表示」に出来る / 全ユーザ統計が漏れる |
| **P0** | B-2 | `/api/auth/register-direct` が body の `clerkId` を信用 | **アカウント乗っ取り級**: 他人の clerk_id を知っていればその人の `nickname` / `twitter_handle` / `avatar_url` / `email` を上書きできる |
| **P0** | B-3 | `/api/users/me` GET で `hitokoto_set_at` を SELECT し忘れ | 24 時間経過後の「ひとこと期限切れ」判定が **永久に false** |
| P1 | B-4 | `/api/chokaigi/live-map` がエラー時に SQL メッセージを leak | 攻撃者に DB 構造ヒントを渡す |
| P1 | B-5 | `/api/voicevox/synthesize` が無認証・レート制限無し | 内部 VOICEVOX エンジンの濫用可能 |
| P1 | B-6 | `/api/encounters` で `LIMIT ?` に `String(n)` を渡している | `mysql2.execute()` で `ER_WRONG_ARGUMENTS` になりうる（稀にランタイム落ち） |
| P2 | B-7 | `ProfileCard.tsx` に `(xAccount as any)` キャスト | 型安全性の穴 |
| P2 | B-8 | `/api/users/me` PATCH で `age_group` / `gender` enum を未検証 | 不正値で DB エラー、ユーザ体験が壊れる |
| P2 | B-9 | `moderation.ts` が定義されているのに未接続 | NG ワードフィルタが実質無効 |

---

## 1. 想定仕様（推定）

> 読み取れる範囲で推定。異論があれば別途確定させる。

- **Auth-less First**: トップ / `/chokaigi` / ライブマップ閲覧 / 検索 / ゆっくり解説は未ログインで通す。位置送信・すれちがい記録・プロフィール編集はログイン必須。
- **認証方式**: ブラウザ側は Clerk。サーバ API は `Authorization: Bearer uuid:<uuid>` で `requireAuth()` を通す独自認可レイヤーが主。Admin 画面だけ Basic 認証で守る設計（のはず）。
- **位置情報**: MySQL 8 + SRID 4326、軸順序は (lat, lng) で統一（過去バグは [`location-investigation.md`](./location-investigation.md) を参照）。
- **通報モデレーション**: 通報 ≥ 2 件または `is_suspended` を Admin UI から見て手動で `suspend/unsuspend` する。

---

## 2. P0 詳細

### B-1: `/api/admin/*` が無認証

**症状**
- `GET /api/admin/stats` と `GET|PATCH /api/admin/reports` に認証処理が無い。
- コード上には `// middlewareでBasic認証済み` というコメントがあるが、**`middleware.ts` は Basic 認証を一切していない**（Clerk だけ）。
- Clerk でログインさえしていれば、一般ユーザが `PATCH /api/admin/reports { userId: 12345, action: "suspend" }` を叩ける。

**根拠**

```6:30:surechigai-lite-handoff/server/src/app/api/admin/reports/route.ts
// 通報一覧(ユーザーごとに集約) — middlewareでBasic認証済み
export async function GET() {
  const [rows] = await pool.execute<RowDataPacket[]>(`
    SELECT
      u.id AS user_id,
```

```1:5:surechigai-lite-handoff/server/src/app/api/admin/stats/route.ts
import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

// 管理用統計API（middlewareでBasic認証済み）
export async function GET() {
```

`middleware.ts` は Clerk の `auth.protect()` だけで、Basic 認証を実装していない:

```69:75:surechigai-lite-handoff/server/src/middleware.ts
export default clerkMiddleware(async (auth, req: NextRequest) => {
  if (isUnprotectedApiPath(req.nextUrl.pathname) || isPublicRoute(req)) {
    return withPathnameHeader(req);
  }
  await auth.protect();
  return withPathnameHeader(req);
});
```

`requireAdminAuth` は存在するが **どこからも呼ばれていない**（`ts-prune` が unused を検出）:

```6:27:surechigai-lite-handoff/server/src/lib/adminAuth.ts
export function requireAdminAuth(req: NextRequest): Response | null {
  const auth = req.headers.get("authorization");

  if (!auth || !auth.startsWith("Basic ")) {
    return new Response("認証が必要です", {
      status: 401,
```

**修正方針**
1. `admin/reports/route.ts` と `admin/stats/route.ts` の先頭で `requireAdminAuth(req)` を呼ぶ。
2. `admin/page.tsx` のハードコード `Basic admin:admin` を廃止し、未認証ならブラウザの標準 Basic 認証プロンプトに任せる（`Authorization` を付けずに `credentials: "include"` で送る → 401 → ブラウザが認証ダイアログを出す → 認証情報が cookie キャッシュされ以後の fetch に自動付与される）。
3. `ADMIN_USER` / `ADMIN_PASS` 未設定時に `CHANGE_ME` で動いてしまう挙動を警告ログ化する。

**回帰テスト**
- 未ログインで `GET /api/admin/stats` → 401
- Clerk ログイン済（非管理者）で `PATCH /api/admin/reports` → 401
- Basic 認証あり → 200

### B-2: `register-direct` が body の `clerkId` を信用

**症状**
- `/api/auth/register-direct` は middleware で `isUnprotectedApiPath` に含まれ、Clerk の `auth.protect()` を通らない。
- ルート本体では body の `clerkId` をキーに `SELECT` / `UPDATE` / `INSERT` を行う。**サーバ側で Clerk セッションを照合していない**。
- 他人の `clerk_id`（Clerk のユーザ ID は公開情報に近い）を知っていれば、`POST` 一発で **その人の `nickname` / `twitter_handle` / `avatar_url` / `clerk_email` を書き換え** できる。

**根拠**

```36:44:surechigai-lite-handoff/server/src/middleware.ts
  if (
    pathname === "/api/auth/register-direct" ||
    pathname.startsWith("/api/auth/register-direct/")
  ) {
    return true;
  }
```

```55:95:surechigai-lite-handoff/server/src/app/api/auth/register-direct/route.ts
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clerkId, email, twitterHandle, displayName, avatarUrl } = body;

    if (!clerkId || typeof clerkId !== "string") {
      return Response.json({ error: "clerkId が必要です" }, { status: 400 });
    }

    const [existing] = await pool.execute<RowDataPacket[]>(
      "SELECT id, uuid, nickname, avatar_config, avatar_url FROM users WHERE clerk_id = ? AND is_deleted = FALSE",
      [clerkId]
    );

    if (existing.length > 0) {
      const user = existing[0];
      // 既存ユーザー: Twitter情報を最新に更新
      ...
      await pool.execute(
        "UPDATE users SET nickname = ?, avatar_config = ?, avatar_url = ?, twitter_handle = ?, clerk_email = ? WHERE id = ?",
        [nickname, avatarConfig, nextAvatarUrl, tw, email || null, user.id]
      );
```

**修正方針**
1. ルートで Clerk の `auth()` を使ってセッション上の `userId` を取得し、**body の `clerkId` は使わない**（あるいは一致チェックして mismatch なら 403）。
2. 未ログインなら 401 を返す。`isUnprotectedApiPath` の対象外にはしない（Clerk の `auth.protect()` はリダイレクトを起こすので、ここでは自前で 401 を返すほうが UX がよい）。
3. 他フィールド（email / twitterHandle / displayName / avatarUrl）は **Clerk サーバ SDK で取得** するのがベスト。ただし段階移行として、body の値をそのまま使いつつ clerkId だけサーバ側で確定、が現実的。

**回帰テスト**
- 未ログイン POST → 401
- ログイン中、body.clerkId が別ユーザの id → 403（または body.clerkId を無視してセッションユーザのみ更新されることを確認）
- ログイン中、body.clerkId が自分 → 200・既存ユーザ更新

### B-3: `hitokoto_expired` 判定が永久に false

**症状**
- `GET /api/users/me` は `hitokoto_set_at` を `SELECT` しておらず、24 時間で「ひとこと」を期限切れ扱いするロジックが **絶対に発火しない**。
- 結果: 24h 経過後も `/app` のプロフィールに古い「ひとこと」が残る。

**根拠**

```11:32:surechigai-lite-handoff/server/src/app/api/users/me/route.ts
const [rows] = await pool.execute<RowDataPacket[]>(
  `SELECT id, uuid, nickname, avatar_config, avatar_url, hitokoto,
          spotify_track_id, spotify_track_name, spotify_artist_name, spotify_album_image_url,
          age_group, gender, show_age_group, show_gender,
          notification_enabled, location_paused_until, streak_count, last_encounter_date, created_at
   FROM users WHERE id = ?`,
  [authResult.id]
);
// hitokoto_set_at が SELECT に無い！
// ...
const user = rows[0];
if (user.hitokoto && user.hitokoto_set_at) {   // ← 常に undefined で false
  const setAt = new Date(user.hitokoto_set_at as string).getTime();
  if (Date.now() - setAt > 24 * 60 * 60 * 1000) {
    user.hitokoto = null;
    user.hitokoto_expired = true;
  }
}
```

**修正方針**
- `SELECT` に `hitokoto_set_at` を追加するだけ。

**回帰テスト**
- users テーブルに `hitokoto_set_at = NOW() - INTERVAL 25 HOUR` のユーザを作り GET → `hitokoto === null` かつ `hitokoto_expired === true`。

---

## 3. P1 詳細

### B-4: live-map のエラーで SQL メッセージをクライアントに返す

```185:196:surechigai-lite-handoff/server/src/app/api/chokaigi/live-map/route.ts
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("会場ライブマップ取得エラー:", error);
    return Response.json(
      {
        ok: false,
        error: "会場ライブマップの取得に失敗しました",
        debug: msg,  // ← SQL エラー本文がクライアントに漏れる
      },
      { status: 503 }
    );
  }
```

**修正方針**: `NODE_ENV === "production"` のときだけ `debug` を返さない、または常にサーバ側だけに残す。

### B-5: VOICEVOX の公開・無認証

- `POST /api/voicevox/synthesize` は誰でも叩ける（middleware で `/api/voicevox` を unprotected 指定）。
- 内部 VOICEVOX エンジン URL（`VOICEVOX_BASE_URL`）をプロキシする形で使うため、**サーバ帯域と内部エンジンを削る DoS ベクタ**。
- `MAX_TEXT_LEN = 500` の制限はあるが、単発あたりの上限のみ。

**修正方針（段階）**
1. **P1**: `authenticateRequest(req)` で UUID Bearer を要求（未ログインは 401）。
2. **P2**: ユーザ毎のレート制限（Upstash Redis で `INCR + EXPIRE`、例: 10 req/min）。

### B-6: `LIMIT ?` に `String(limit)` を渡している

```60:70:surechigai-lite-handoff/server/src/app/api/encounters/route.ts
      ORDER BY e.encountered_at DESC
      LIMIT ? OFFSET ?`,
      [
        authResult.id, authResult.id,
        ...
        String(limit), String(offset),
      ]
    );
```

- `mysql2.execute()` の prepared statement は LIMIT / OFFSET に **integer を要求**する。驚くほど環境依存で壊れる（本番 MySQL 8 系ではしばしば `ER_WRONG_ARGUMENTS`）。
- 現状動いているなら `query()` 経由のパス or 型緩和が効いている可能性あり。

**修正方針**: `Number.parseInt` で整数化して数値のまま渡す。`pool.query(...)` でも同様に有効。

---

## 4. P2 詳細

### B-7: `(xAccount as any)?.externalId`

```26:26:surechigai-lite-handoff/server/src/app/app/components/ProfileCard.tsx
  const twitterId = (xAccount as any)?.externalId || "";
```

Clerk の `ExternalAccountResource` 型には `externalId` ではなく `providerUserId` が正。`any` キャストで気付かない型ずれを隠している。

### B-8: `users/me PATCH` の enum 未検証

`age_group` / `gender` を body から受け取って直接 SQL に渡している。DB 側の ENUM 制約で 1265 エラーが起きる。`allowedFields` はあるが値の検証は無い。

### B-9: `moderation.ts` が未接続

`NG_WORDS` フィルタが存在するが、`/api/users/me` PATCH（hitokoto 更新）や `/api/ghost` に**一切接続されていない**。ひとことの NG ワードチェックが素通り。

**修正方針（段階）**: P2 として `hitokoto` / `ghost_hitokoto` 更新時に `filterNgWords` をかけるか、`containsNgWord` で 400 を返す。

---

## 5. デッドコード候補（根拠付き）

`ts-prune` で unused を検出し、`Grep` で他ファイルからの参照が本当に無いことを個別確認したもの。

### 5.1 安全に削除できる（根拠: 参照ゼロ）

| ファイル/シンボル | 種別 | 削除理由の根拠 |
| ----------------- | ---- | -------------- |
| `src/lib/apiClient.ts` (全体) | ファイル | `authenticatedFetch` / `parseJson` が定義元以外で一切呼ばれていない。実際のクライアント呼び出しは各コンポーネントで `fetch` 直書きに統一されている |
| `src/lib/clerkWebhook.ts` (全体) | ファイル | `verifyClerkWebhookSignature` が未使用。`/api/webhooks` は現状 501 を返す未実装エンドポイントで、将来実装時は Svix SDK 推奨なのでこの自前 HMAC は不要 |
| `src/lib/geocoding.ts:18 reverseGeocode` | 関数 | `reverseGeocodeWithPrefecture` / `reverseGeocodeToMunicipality` は使用中だが、`reverseGeocode` だけは参照ゼロ |
| `src/lib/locationGeom.ts:41 h3CellToLatLng`<br>`src/lib/locationGeom.ts:50 h3NeighborCells`<br>`src/lib/locationGeom.ts:58 isFiniteLatLng`<br>`src/lib/locationGeom.ts:96 pointSqlLatLng` | 関数 | 全て参照ゼロ。`assertFiniteLatLng` と `toGrid` / `toH3Cell` だけが使われている |
| `src/app/chokaigi/lp-content.ts` の `USAGE_STEPS` / `JAPAN_LOCATOR_CAPTION` / `JAPAN_LOCATOR_MAP_LINK_LABEL` / `JAPAN_LOCATOR_PREF_HEADING` / `JAPAN_PREFECTURE_NAMES` | 定数 | `Grep` で `chokaigi/lp-content.ts` 以外から参照されていない |
| `src/app/chokaigi/venue-maze-topology.ts:113 WALKWAY_CENTER_SEGMENTS`<br>`src/app/chokaigi/venue-maze-topology.ts:115 pelletsAlongSegments` | 定数/関数 | 参照ゼロ |

### 5.2 保留（削除は NG、理由）

| ファイル | 保留理由 |
| -------- | -------- |
| `src/lib/adminAuth.ts` | **使わないといけない**: P0 B-1 の修正で利用する |
| `src/lib/moderation.ts` | P2 B-9 で wire-up するほうが価値があるので保留 |
| `src/lib/experiments.ts` / `src/lib/importantActions.ts` / `src/lib/uiOverlayPolicy.ts` | 「docs-as-code」として意図的に残っているポリシーファイル。バージョン番号を定数で持ち、コードレビュー対象にするための意図的な置き方 |
| `src/app/chokaigi/creatorcross-x-candidates.ts` | `scripts/generate-creatorcross-x-candidates.mjs` が生成する候補データ。まだ検索 UI 側で採用されていないが、運用データなので削除は避ける |
| `src/app/api/webhooks/route.ts` | 501 返す未実装エンドポイント。プレースホルダとして残すほうが Clerk webhook 接続時に忘れない |

### 5.3 「動的 import / 文字列参照 / 環境変数切替」で残すべきもの

- `src/middleware.ts` の `default` / `config` export: Next.js の契約インタフェース。ts-prune が unused 扱いにするが削除禁止。
- `src/app/layout.tsx` の `default` / `metadata`: Next.js の契約インタフェース。
- `src/app/chokaigi/opengraph-image.tsx` の `alt` / `contentType` / `default`: Next.js App Router が名前ベースで読みに来る OG 画像 API。**絶対に削除しない**。
- `.next/types/**` の `PageProps` / `LayoutProps`: 自動生成。Git 対象ではないので無視。

---

## 6. 実行順（P0 → P1 → P2 → デッドコード）

### 今すぐ（本 PR / 本コミットで実施）

1. **B-1 admin 認証**: `requireAdminAuth` を 2 ルートに追加。
2. **B-2 register-direct**: Clerk `auth()` で userId を確定し body の clerkId を信用しない。
3. **B-3 hitokoto_set_at**: SELECT 列に追加。
4. **デッドコード 5.1**: 参照ゼロのものだけ削除。

### 次スプリント（別 PR）

- B-4 live-map error debug 抑制
- B-5 VOICEVOX 認証
- B-6 LIMIT を integer 化
- B-8 enum 検証
- B-9 moderation wire-up

### 将来

- B-7 型定義整備
- `/api/webhooks` 実装（Svix SDK）

---

## 7. 保留リスト（根拠が弱いので未対応）

| 観察 | 未対応理由 |
| ---- | ---------- |
| `ACTIVE_WINDOW_MINUTES` がテンプレート文字列で SQL に埋め込まれている | 現状は定数で安全。動的にする計画があるなら要見直し |
| `ChokaigiJsonLd.tsx` の `JSON.stringify(event)` に `</script>` エスケープ無し | `event` は完全な定数 LP データで外部入力なし。将来動的化するときに改めて対応 |
| `notification_log` / `fcm_token` を触るコードが複数箇所に散在 | FCM 未実装（cron/matcher.ts の TODO コメント有）なので現状運用に影響なし |

---

## 8. 変更後の検証フロー

```
npm run lint
npx tsc --noEmit
npx next build
```

の 3 点が通ることを最低ラインとする。回帰テストは `qa-improvement-plan.md` の「P0 契約テスト」として追加していく。
