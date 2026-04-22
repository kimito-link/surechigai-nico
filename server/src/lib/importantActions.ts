/**
 * 「重要アクション」= ログイン促進・追加入力を出してよいタイミングの設計メモ。
 * Auth-less First: 未ログインでも検索・会場・ライブマップは通す。
 *
 * ログイン / 追加プロフィールを求めるのは主に以下:
 * - 位置・すれちがい記録など **個人に紐づくデータの書き込み**
 * - **通報・モデレーション** などトラストが必要な操作
 * - **アカウント設定の永続化**（ニックネーム・ひとことのサーバ保存など）
 *
 * 実装側は `requiresSignIn` やモーダルではなく、該当ボタン押下時に `/sign-in` へ
 * またはインラインで Clerk の SignInButton を出すイベント駆動に寄せる。
 */

export const IMPORTANT_ACTION_POLICY_VERSION = "2026-04-22" as const;

export type ImportantActionKind =
  | "persist_profile"
  | "share_location"
  | "moderation"
  | "account_settings";
