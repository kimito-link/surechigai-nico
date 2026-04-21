# surechigai-nico

すれちがいライト関連のモノレポです。

| ディレクトリ | 内容 |
|-------------|------|
| `server/` | **Next.js 15**（API・`/chokaigi` LP など） |
| `app/` | モバイルアプリ（Expo 等） |

## Vercel でデプロイするとき

1. **Root Directory** を `server` に設定する。  
2. **Environment Variables** に `NEXT_PUBLIC_SITE_ORIGIN` を追加する（本番のオリジン、`https://`・末尾スラッシュなし・www なし推奨）。  
3. Clerk を使う場合は以下も設定する。  
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`（本番キー）
   - `CLERK_SECRET_KEY`（本番キー）
   - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
   - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
4. `NEXT_PUBLIC_CLERK_PROXY_URL` は設定しない（このアプリは Clerk Frontend API へ直接接続）。  
5. Cloudflare DNS で Clerk カスタムドメインを使う場合、`clerk.<your-domain>` の CNAME は **DNS only（灰色雲）** にする。  
6. Build はデフォルトの `next build` で問題ありません。

ローカル: `cd server` → `npm install` → `npm run dev`
