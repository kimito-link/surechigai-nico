# バグ発見率を上げる実行プラン

> 目的: 「UI/E2E 側に偏って API 境界値の不具合をすり抜ける」現状を脱し、
> API 層の正常系 / 異常系 / 回帰を自動で網に掛ける仕組みを整える。

関連ドキュメント:

- [`location-investigation.md`](./location-investigation.md) — 位置情報バグ調査レポート（本プランの「過去不具合は必ず回帰テスト化」の入口）

## 現状サマリ

| 指標 | 値 | 備考 |
| ---- | -- | ---- |
| API ルート数 | 36 | `src/app/api/**/route.ts` |
| 単体 / 契約テスト | 1 | `tests/*.test.mjs` |
| E2E テスト | 6 | `e2e/*.spec.ts` |
| 課題 | UI/E2E 寄り | API 境界値・異常系の検出網が薄い |

## 最優先（P0）

### 1. API 契約テストを増やす

- 36 ルートすべてに最低 1 本（正常 + 異常）を作成する。
- 優先対象: `locations` / `live-map` / `stats` / `encounters` / `auth`
- 必須ケース:
  - `400` バリデーションエラー
  - `401` 未認証
  - `403` 権限不足 / 一時停止中
  - `429` レート制限（実装が無ければ「429 の予約ケース」として `it.todo`）
  - `500` 例外パス

### 2. 境界値テストの標準化

| カテゴリ | 必須ケース |
| -------- | ---------- |
| 緯度経度 | `min/max`, 範囲外, `NaN` / `Infinity`, `null`, `string` |
| 時間窓 | `0 分`, 境界分, 期限切れ |
| 文字列 | 空, 超長, 不正形式 |
| 過去不具合 | [`location-investigation.md`](./location-investigation.md) の各項目を必ず回帰テスト化 |

### 3. CI で差分テストを強制

- API ファイル変更時: 契約テストが 1 件以上ないと CI が失敗する仕組みを導入。
- 「API 変更なのにテスト無し」の PR は機械的にブロック。
- 実装イメージ: 変更検知スクリプト（ `git diff --name-only` で `src/app/api/**/route.ts` の変更を拾い、対応する `tests/api/**` の変更有無を必須化）。

## 次点（P1）

### 4. E2E を縦断シナリオ化

- 例 1: ログイン → 位置送信 → ライブマップ反映 → 統計更新
- 例 2: 位置共有一時停止中の挙動確認（`location_paused_until` が効いているか）

### 5. 外部依存の故障注入テスト

- 対象: Geocode / Redis / DB / Voice API
- 注入シナリオ: `timeout`, `503`, 空レス
- 期待: 再試行・ユーザー向けエラー表示・ログ出力が仕様どおりか

### 6. ログ設計の標準化

すべてのエラーログに次のフィールドを必須化する。

```ts
type ErrorLog = {
  error_code: string;      // 例: E_LOC_INVALID_LATLNG
  route: string;           // 例: POST /api/locations
  request_id: string;      // ミドルウェアで採番
  user_state: "auth" | "paused" | "anonymous";
  cause: "timeout" | "validation" | "upstream" | "internal";
  message: string;
  meta?: Record<string, unknown>;
};
```

`error_code` の命名規約: `E_<ドメイン>_<原因>`（例: `E_LOC_INVALID_LATLNG`, `E_AUTH_EXPIRED`）

## 運用（P2）

### 7. 本番カナリア監視

- 5 分ごとに合成テストを実行: `health` → `auth` → `locations` → `live-map`
- SLA 逸脱で自動通知（Slack / Discord / メール）

### 8. 不具合起票テンプレ統一

起票時の必須項目（AI 共有レポートを必ず添付）:

- 再現手順
- 期待結果 / 実結果
- 端末 / ブラウザ
- 発生時刻
- 貼り付けログ（`error_code`, `request_id` を含む）

### 9. バグ密度の可視化

route 別に以下を集計し、週次レビューで投資先を更新する。

| 項目 | 集計方法 |
| ---- | -------- |
| バグ件数 | Issue ラベル `bug` + route タグ |
| 変更頻度 | `git log --follow` の件数 |
| テスト有無 | `tests/api/<route>` の存在 |

「変更頻度は高いがテストがない route」を最優先で補強する。

## 2 週間の実行順（推奨）

1. `locations` / `live-map` / `stats` / `encounters` / `auth` の契約テスト追加（15 本）
2. API 変更時の CI テスト必須ルール導入
3. E2E 縦断シナリオ 2 本追加
4. `error_code` 規約導入（`E_LOC_*`, `E_AUTH_*` など）
5. カナリア監視 1 本導入

## 完了条件（Definition of Done）

- API 変更 PR でテスト未追加はマージ不可
- 主要 API の正常 / 異常ケースが自動検証される
- 再現不能バグの割合が月次で減少する
- 本番障害の初動調査時間が短縮する

## 初期タスクに落とし込む（開始時のチェックリスト）

- [ ] `tests/api/` 配下に契約テスト用フォルダを用意
- [ ] `tests/api/_helpers.mjs` にリクエストヘルパー（認証ヘッダ生成、スタブ化された DB など）を作る
- [ ] `/api/locations` の P0 契約テスト（正常 + 400 + 401 + 403 一時停止 + 500）を最初に実装
- [ ] 上記をテンプレートにして残り 35 ルートへ展開
- [ ] CI workflow に `check-api-test-coverage.mjs`（変更 API に対応するテスト有無をチェック）を追加
- [ ] `error_code` の一覧表を `docs/error-codes.md` に切り出し、route 追加時に更新するルール化

## 既知の回帰テスト対象（location-investigation.md 由来）

- 軸順序バグ: `debug/seed`, `debug/scatter`, `stats/area` で `POINT(lat, lng)` で記録されているか
- NaN / Infinity 入力が `400` で弾かれるか（`/api/locations`）
- `accuracy > 10km` の位置送信が `skipped: true` でスキップされるか
- `location_paused_until` が有効な間、位置が DB に書き込まれないか
- Nominatim タイムアウト時も API が同期的に 5xx を返さないか（fire-and-forget 補完）
- SSE `/api/chokaigi/live-stream` が切断時にサーバー側でリソースリークしないか
- matcher の時間窓が対称（両側 `TIME_WINDOW_MINUTES`）になっているか
- H3 グリッド境界上の 2 ユーザーがティア 1 でも確実にマッチするか（k-ring = 1 で拾えるか）
