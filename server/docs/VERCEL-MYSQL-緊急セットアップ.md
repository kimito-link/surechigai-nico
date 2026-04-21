# 緊急: Vercel → Railway MySQL 接続（3 分）

今のエラーは **Vercel に `mysql://` の接続文字列が入っていない**ことが原因です。コードでは直せません。**あなたの Vercel / Railway 画面で**次だけ行ってください。

## 1. Railway で文字列をコピー

1. [railway.app](https://railway.app) → 該当プロジェクト → **MySQL**（データベース）のサービスを開く。  
2. タブ **Variables** または **Connect** / **Data** 付近で **Public** / **外から接続** 用の接続を表示。  
3. **`mysql://` で始まる 1 行**（ユーザー・パスワード・ホスト・ポート・DB 名が入ったもの）を**丸ごとコピー**する。  
   - 例のホスト: `xxxxx.railway.app` や `xxxxx.rlwy.net` など**外部向け**のもの。  
   - **`mysql://` が無い行は使わない**（内部ホスト専用は Vercel から届かない）。

メモ: 変数名 `MYSQL_PUBLIC_URL` が Railway の Variables に**すでに**あるなら、**その Value の1行**をコピーすればよい。

## 2. Vercel に貼る

1. [vercel.com](https://vercel.com) → **surechigai-nico**（該当プロジェクト）  
2. **Settings** → **Environment Variables**  
3. 次を**追加**（既にある場合は**値だけ**上書き）:  
   - **Name:** `MYSQL_PUBLIC_URL`（**この綴りで**）  
   - **Value:** 手順 1 の **`mysql://` 1 行**（前後にスペースや引用符を付けない）  
   - **Environment:** **Production** にチェック（Preview 用 URL でも試すなら **Preview** にも同じを追加）  
4. **Save**

## 3. 再デプロイ（必須）

**Deployments** タブ → 最新のデプロイの **…** → **Redeploy**（または空コミットで再ビルド）。  
環境変数は**デプロイを回さないと反映されない**です。

## 4. 確認

ブラウザで開く:  
`https://あなたのドメイン/api/health/db`  

- `"ok": true` なら**成功**。あとは `/app` にログインすれば `users` に行が入る。  
- まだ `ok: false` なら、レスポンスの `hints.envMysql` でどの変数が `missing` か確認。

## よくあるミス

| ミス | 対処 |
|------|------|
| 変数名が違う（`MYSQLURL` など） | 必ず `MYSQL_PUBLIC_URL` |
| 値が `postgres://` | MySQL 用の `mysql://` を貼る（別枠用） |
| 再デプロイ忘れ | 手順 3 |
| Production に入れて Preview の URL だけ見ている | Preview 用にも同じ変数を入れるか、本番 URL で確認 |

## 補足（違う方針）

**アプリを Vercel ではなく Railway 上の Web サービスだけ**にする場合、同じプロジェクト内の **内部 MySQL URL** だけで動かせることがあります（別途ホスト名・本番 URL の向き先の変更が必要）。今は **Vercel 本番**で進めるなら、上の 1〜4 で足ります。

---

落ち着いて **1 → 2 → 3 → 4** の順だけ進めてください。ここまでできれば接続は通ります。
