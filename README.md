# surechigai-nico

すれちがいライト関連のモノレポです。

| ディレクトリ | 内容 |
|-------------|------|
| `server/` | **Next.js 15**（API・`/chokaigi` LP など） |
| `app/` | モバイルアプリ（Expo 等） |

## Vercel でデプロイするとき

1. **Root Directory** を `server` に設定する。  
2. **Environment Variables** に `NEXT_PUBLIC_SITE_ORIGIN` を追加する（本番のオリジン、`https://`・末尾スラッシュなし・www なし推奨）。  
3. Build はデフォルトの `next build` で問題ありません。

ローカル: `cd server` → `npm install` → `npm run dev`
