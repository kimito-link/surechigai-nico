# すれちがいライト - 引き継ぎ資料

## アプリ概要

位置情報ベースのすれ違い通信アプリ。近くにいたユーザー同士を自動マッチングし、匿名でゆるくつながる。任天堂DSのすれちがい通信のスマホ版のようなコンセプト。

### コンセプト
- 位置情報をバックグラウンド送信し、近くにいたユーザー同士を5分おきに自動マッチング
- 完全匿名(UUIDベースのゲスト認証、アカウント登録不要)
- ニックネーム、アバター(DiceBear)、ひとこと(24時間で消える)、Spotify連携で自己表現
- リアクション(いいね/わかる/ウケる/いい曲)で軽いコミュニケーション
- 都道府県コレクション、バッジなどゲーミフィケーション要素

---

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Expo (React Native) + TypeScript |
| ルーティング | Expo Router (ファイルベース) |
| 状態管理 | Zustand |
| バックエンド | Next.js 15 (API Routes) + TypeScript |
| データベース | MySQL 8.0+ (SPATIAL INDEX必須) |
| 位置情報 | expo-location (バックグラウンド対応) |
| 通知 | expo-notifications + FCM (未実装) |
| 外部API | Spotify Web API (曲検索) |
| アバター | DiceBear (URL生成式) |

---

## ディレクトリ構成

```
location_matching/
  app/                     # Expo React Nativeアプリ
    app/                   # Expo Router画面
      (tabs)/              # タブ画面
        index.tsx          # ホーム(すれ違い一覧 + マップ)
        ghost.tsx          # おさんぽ(分身)
        stats.tsx          # 統計
        badges.tsx         # バッジコレクション
        settings.tsx       # 設定
      encounter/[id].tsx   # すれ違い詳細
      onboarding.tsx       # 初回起動画面
      profile-setup.tsx    # プロフィール設定
      avatar-editor.tsx    # アバター編集
      song-search.tsx      # Spotify曲検索
      reactions.tsx        # リアクション選択
      ghost-history.tsx    # おさんぽ履歴
      permission-*.tsx     # 権限リクエスト画面
      webview-page.tsx     # 利用規約/プライバシーポリシー表示
    src/
      hooks/               # カスタムフック(認証/すれ違い/位置情報)
      lib/                 # API通信、ストレージ、バックグラウンド位置情報
      components/          # 共通コンポーネント
      data/                # 都道府県データ等の静的データ
      store/               # Zustandストア
    assets/                # 画像/アイコン

  server/                  # Next.jsサーバー(APIのみ)
    src/
      app/api/             # APIエンドポイント(後述)
      app/admin/           # 管理画面(HTML)
      cron/                # 定期実行ジョブ
        matcher.ts         # すれ違いマッチング(5分毎)
        resetHitokoto.ts   # ひとこと期限切れリセット(1時間毎)
      lib/                 # DB接続、認証、Spotify、モデレーション等
    scripts/
      init-db.sql          # DBスキーマ(初期構築SQL)
    public/                # 静的ファイル
```

---

## APIエンドポイント一覧

| メソッド | パス | 機能 |
|---------|------|------|
| POST | /api/auth/register | ユーザー登録(UUID) |
| GET | /api/users/me | プロフィール取得 |
| PATCH | /api/users/me | プロフィール更新 |
| DELETE | /api/users/me | 退会 |
| GET | /api/users/[id]/badges | ユーザーのバッジ取得 |
| POST | /api/locations | 位置情報送信 |
| GET | /api/encounters | すれ違い一覧(ページング) |
| POST | /api/encounters/[id]/like | リアクション送信 |
| DELETE | /api/encounters/[id]/like | リアクション削除 |
| GET | /api/ghost | 分身状態取得 |
| POST | /api/ghost | 分身配置/移動 |
| DELETE | /api/ghost | 分身削除 |
| POST | /api/blocks | ブロック |
| DELETE | /api/blocks | ブロック解除 |
| POST | /api/reports | 通報 |
| GET | /api/stats/me | 個人統計 |
| GET | /api/stats/area | エリアアクティブ数 |
| GET | /api/prefectures | 都道府県統計 |
| GET | /api/badges | バッジ一覧+獲得状態 |
| POST | /api/activity | 行動ログ記録 |
| GET | /api/spotify/search | Spotify曲検索 |
| GET | /api/topics/today | 今日のお題 |
| GET | /api/pages/terms | 利用規約 |
| GET | /api/pages/privacy-policy | プライバシーポリシー |
| POST | /api/avatar/* | アバター画像保存/ダウンロード |
| GET | /api/admin/stats | 管理者統計 |
| GET | /api/admin/reports | 管理者通報一覧 |
| POST | /api/debug/seed | テストデータ生成 |
| POST | /api/debug/scatter | テストユーザー散布 |
| POST | /api/debug/matcher | マッチャー手動実行 |

---

## マッチングロジック (matcher.ts)

5分ごとのcronジョブで実行。ティア制で段階的にマッチング:

| ティア | 距離 | ラベル | 対象 |
|-------|------|--------|------|
| 1 | 500m | すれ違い | 全ユーザー |
| 2 | 3km | ご近所 | 直近24時間マッチ0件のユーザー |
| 3 | 10km | 同じ街 | ティア2でもマッチしなかったユーザー |
| 4 | 50km | 同じ地域 | ティア3でもマッチしなかったユーザー |
| 5 | - | おさんぽ | 分身(ゴースト)同士のマッチング(同じ市区町村) |

- 同一ペアのクールダウン: 8時間(ティア1-4)、24時間(ティア5)
- ブロック済みペアは除外
- 位置情報は500mグリッドに丸めてプライバシー保護
- 逆ジオコーディングでエリア名/都道府県を取得

---

## データベース

MySQL 8.0+ が必須(SPATIAL INDEX、ST_Distance_Sphere使用)。

### テーブル一覧
| テーブル | 概要 |
|---------|------|
| users | ユーザー(UUID認証、プロフィール、分身情報) |
| locations | 位置情報ログ(GEOMETRY型 + 500mグリッド) |
| encounters | すれ違い記録(ティア、エリア名) |
| likes | リアクション |
| blocks | ブロック |
| reports | 通報 |
| notification_log | 通知送信ログ |
| user_activity_log | 行動ログ |
| daily_topics | 日替わりお題 |
| user_prefectures | 都道府県別すれ違い記録 |
| user_badges | 獲得バッジ |

初期構築は `server/scripts/init-db.sql` を実行。

---

## セットアップ手順

### 1. データベース

```bash
# MySQL 8.0+をインストール
mysql -u root -p < server/scripts/init-db.sql
```

### 2. サーバー

```bash
cd server
npm install

# .env.localを作成(.env.exampleをコピーして値を設定)
cp .env.example .env.local
# エディタで.env.localを編集してDB接続情報等を入力

# 開発サーバー起動(ポート3002)
npm run dev
```

### 3. アプリ

```bash
cd app
npm install

# 開発サーバー起動
npx expo start
```

開発時はアプリが自動的にExpo devサーバーのIPを検出してサーバーに接続する(`app/src/lib/api.ts`)。
本番URLは `https://api.surechigai.app` に設定済み(変更可)。

### 4. Cronジョブ

```bash
# すれ違いマッチング(5分毎)
*/5 * * * * cd /path/to/server && npx tsx src/cron/matcher.ts

# ひとことリセット(1時間毎)
0 * * * * cd /path/to/server && npx tsx src/cron/resetHitokoto.ts
```

### 5. Spotify API

[Spotify Developer Dashboard](https://developer.spotify.com/dashboard) でアプリを作成し、Client IDとClient Secretを `.env.local` に設定。

---

## 主な機能の実装状況

| 機能 | 状態 | 備考 |
|------|------|------|
| ゲスト認証(UUID) | 完了 | |
| 位置情報送信(バックグラウンド) | 完了 | |
| ティア制マッチング | 完了 | 5段階 |
| すれ違い一覧表示 | 完了 | |
| リアクション | 完了 | 4種類 |
| ひとこと(24時間) | 完了 | |
| Spotify連携 | 完了 | 曲検索+表示 |
| おさんぽ(分身) | 完了 | 都道府県単位 |
| 都道府県コレクション | 完了 | |
| バッジ | 完了 | 13種類以上 |
| ブロック/通報 | 完了 | |
| 管理画面 | 完了 | Basic認証 |
| プッシュ通知(FCM) | **未実装** | スキーマとロジックは準備済み、Firebase Admin SDK導入が必要 |
| Firebase認証 | **未実装** | UUIDのみ |
| 本番デプロイ | **未実装** | |

---

## 設計上の注意点

- **位置情報のプライバシー**: 正確な緯度経度はDBのGEOMETRY型に保存するが、他ユーザーに見えるのは500mグリッドに丸めた値のみ
- **「今日のすれ違い」**: 0時リセットではなく直近24時間で計算
- **locationsデータ**: 削除しない方針(将来ビッグデータとして活用想定)
- **アバター**: DiceBearのURL生成式。毎回作り直し可能
- **お題**: 参考程度の位置づけ。ユーザーは自由入力が基本
- **ひとこと入力**: ホーム画面に配置(設定画面からは削除済み)

---

## 外部サービス依存

| サービス | 用途 | 必須 |
|---------|------|------|
| MySQL 8.0+ | データベース | 必須 |
| Spotify Web API | 曲検索 | 任意(なくても動く) |
| Firebase (FCM) | プッシュ通知 | 未実装 |
| DiceBear | アバター生成 | 必須(CDN URL) |
| 国土地理院 逆ジオコーディング | エリア名取得 | 必須 |

---

## ストア公開の最短手順（EAS Build）

**前提**: [Expo](https://expo.dev) アカウント、`eas.json` は `app/` に配置済み。本番 API は `https://api.surechigai.app`（`app/src/lib/api.ts`）。

1. **依存インストール**  
   `cd app` → `npm install`

2. **ログイン**  
   `npx eas login`

3. **プロジェクト紐付け（初回のみ）**  
   `app` 直下で `npx eas init`（既存 `slug: surechigai` と Expo 上のプロジェクトを対応）

4. **iOS**: Apple Developer Program、App Store Connect でバンドル ID `com.surechigai.app` を登録。認証情報は EAS が案内する通り Credential で管理。

5. **Android**: Google Play デベロッパー。署名キーは EAS が生成・保管可能（推奨）。

6. **本番ビルド**  
   - iOS: `npm run eas:build:ios`  
   - Android: `npm run eas:build:android`  
   - 両方: `npm run eas:build:all`  
   インタラクティブにしたい場合は `--non-interactive` を外す。

7. **ストア提出**  
   - iOS: `npm run eas:submit:ios`（App Store Connect API キーまたは Apple ID を設定済みであること）  
   - Android: `npm run eas:submit:android`

8. **審査用に揃えるもの**  
   - 位置情報・バックグラウンドの利用理由（`app.json` の `infoPlist` / 権限文言は既にあり）  
   - プライバシーポリシー URL（ストアフォーム用。Web の `public/privacy-policy.html` や自サイトを用意）  
   - スクリーンショット（各ストア要件サイズ）

**注意**: `assets/icon.png` / `splash.png` は現状オンボーディング画像の複製。**ストア公開前に 1024×1024 のアイコンとスプラッシュ差し替え推奨**。

---

## 既知の課題/今後の改善案

- プッシュ通知の実装(Firebase Admin SDK)
- Firebase Authによるアカウント連携(機種変更対応)
- 本番 API・DB の常時運用監視（`api.surechigai.app`）
- パフォーマンスチューニング(locationsテーブルが肥大化した場合)
- ストア用アイコン・スクショ・プライバシー URL の最終版
- 集客/マーケティング戦略
