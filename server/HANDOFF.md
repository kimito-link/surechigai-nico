# 引き継ぎ（すれちがいライト / chokaigi LP）

## リポジトリ・環境

- Next.js 15 アプリ: `surechigai-lite-handoff/server`（Vercel の Root Directory は `server`）
- 主要 URL: `/`（トップ LP）、`/chokaigi`（ニコニコ超会議向け LP）
- 本番ドメイン例: `surechigai-nico.link`（`NEXT_PUBLIC_SITE_ORIGIN` は www なし・末尾スラッシュなし）
- Clerk 認証は Frontend API 直結構成（`NEXT_PUBLIC_CLERK_PROXY_URL` / `api/clerk-proxy` は不使用）

## すでに入っているもの

- ルート `/`: `src/app/page.tsx` + `page.module.css` + `globals.css` — りんく・こん太・たぬ姉の立ち絵・カード・CTA（`/chokaigi` へ）。`lp-content` の GUIDES を利用。
- `/chokaigi`: `YukkuriDialogue.tsx`（掛け合いは `lp-content.ts` の `YUKKURI_MAIN_SCRIPT`）、立ち絵＋吹き出しジグザグ、`yukkuri-motion-style.ts` でインライン `<style>` にキーフレーム（CSS Modules とズレないようにした）。
- `PdfDesktopEmbed.tsx`: `useSyncExternalStore` + `matchMedia(min-width: 900px)` — デスクトップのみ iframe 表示。
- `lp-content.ts`: `siteOrigin()` は空 URL 等で 500 にならないようフォールバック済み。
- E2E（Playwright）: `e2e/home.spec.ts`、`chokaigi-smoke.spec.ts`、`chokaigi-flow.spec.ts`、`chokaigi-monkey.spec.ts`；`playwright.config.ts` で desktop-chrome / mobile-pixel / mobile-iphone。`npm run test:e2e:desktop` など。

## 触るとよいファイル（追加演出用）

- トップ: `src/app/page.tsx`, `src/app/page.module.css`
- chokaigi: `src/app/chokaigi/page.tsx`, `chokaigi.module.css`, `YukkuriDialogue.tsx`, `yukkuri-motion-style.ts`
- コピー単一ソース: `src/app/chokaigi/lp-content.ts`

## 未実装・アイデア（ユーザー希望）

「普通の地図じゃつまらない」 → AR、3D、ヒーロー粒子アニメ、スクロール連動のセクション演出などは**未着手**。優先する画面（`/` か `/chokaigi` か）を決めてから実装するとよい。

## 注意

- 立ち絵画像: `public/chokaigi/yukkuri/*.png`（未配置だと画像 404、レイアウトは動く）
- dev で `Cannot find module './xxx.js'` → `server` で `.next` 削除 → `npm run dev` または `npm run dev:clean`
- Cloudflare DNS で Clerk カスタムドメインを使う場合、Clerk 用 CNAME は `DNS only`（灰色雲）にする

## 新チャットで最初に書くとよい一文（例）

> `surechigai-lite-handoff/server` の `/` と `/chokaigi` を引き継ぎ。AR・3D・粒子・スクロール演出を、どのページのどのブロック優先で足したいか指定する
