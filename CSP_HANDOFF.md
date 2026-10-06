# CSP厳格化 — Antigravity引き継ぎ

## リポジトリ・ブランチ
- `C:\Users\info\OneDrive\デスクトップ\Resilio\github\surechigai-nico`
- 作業ブランチ: `fix/csp-strict-policy`（既に作成済み、1コミット済み）
- ベース: `main`（直近コミット `6e8ee60` = ヘッダー4種追加PR #6マージ済み）

## 背景
`surechigai-nico.link` の malwarecheck.site 診断で、Content-Security-Policy (CSP) 未設定により
-8点の減点（43点→61点の内訳の一部、CSP対応で61点→69点になる見込み）。
厳格な `style-src 'self'`（`unsafe-inline` を使わない）CSPを設定するため、
サイト内の全インラインstyle (`style={{...}}`) を除去する。

## 既に完了した作業（参考実装）
`server/src/app/chokaigi/VenueMapInteractive.tsx` と同 `.module.css` で6箇所を
クラス化済み（コミット済み・`npx tsc --noEmit` エラーなし）。このdiffをパターンの
お手本にしてください:
```bash
git log -p -1 6693a8f -- server/src/app/chokaigi/VenueMapInteractive.tsx server/src/app/chokaigi/VenueMapInteractive.module.css
```
要点: 色が有限パターン（例: `headerColor` が6色の定数のどれか）の場合、
JSX側で `data-hall-color={hallColorKey(hall.headerColor)}` のように16進色→識別子キーへの
変換関数を用意し、CSS Modules側で `.hallHeader[data-hall-color="blue"] { background: #42a5f5; }`
のように固定セレクタで色を定義する。`style={{"--xxx": val}}` のようなCSS変数設定も
HTML上はインラインstyle属性になるため、CSP違反。data属性＋固定クラスで避ける。

## 残り対象ファイル（20ファイル・35箇所、全ファイルパス・行番号を実測で確認済み）

### パターンA: 固定色バリエーション → data属性 + CSS Modules固定クラス
VenueMapInteractiveと同じ要領。

| ファイル | 箇所数 | 備考 |
|---|---|---|
| `server/src/app/chokaigi/VenueHallList.tsx` | 4 | `hall.headerColor`、`AREA_COLORS`由来の`color.fill/stroke/text`。venue-map-data.tsのAREA_COLORS(13種)・HEADER_*(6種)を参照 |
| `server/src/app/chokaigi/YukkuriHero.tsx` | 2（L171, L300） | キャラクターごとの固定カラー（`pillarCharLabel`, `charLabel`）。`style={{ background: color, color: "#0a0e1a" }}` |

### パターンB: 連続的に変化する値 → useRef + useEffectでDOM直接操作
VenueMapInteractiveには無い新パターン。`element.style.xxx = value` のようにJS側でDOM要素の
styleプロパティを直接代入する分には、HTMLのインラインstyle属性としてソースに現れないため
CSPの `style-src` には抵触しない（ブラウザの挙動として確認推奨: 実際にCSP設定後、
devtoolsのConsoleでCSP違反が出ないか確認すること）。

| ファイル | 箇所数 | 内容 |
|---|---|---|
| `server/src/app/chokaigi/VenueTour3D.tsx` | 2 | ①L134: ドラッグ/遷移で連続変化する `transform`/`opacity`/`zIndex`（`xOffset`,`zOffset`,`scale`,`opacity`,`position`から算出）。②L219: 進捗バーの`width: ${...}%`。※同ファイルのL149, L174, L231(`backgroundColor: hall.headerColor` / `currentHall.headerColor`)はパターンA |
| `server/src/app/chokaigi/VenueLiveMap.tsx` | 1 | L165: `left/top: ${point.leftPct/topPct}%`（すれちがい位置のライブ座標） |
| `server/src/app/chokaigi/ChokaigiConceptBanner.tsx` | 2 | L274, L419: `animationDelay: ${delay}s`（到着タイミング・群衆ドットごとに連続的に異なる値） |
| `server/src/app/app/components/JapanMap.tsx` | 2 | L99: 地図上ドット座標。L112-116: ピン座標+`transform: scale(${scale})` |
| `server/src/app/onboarding/page.tsx` | 1 | L140: 進捗バー `width: ${progressPct}%` |
| `server/src/app/admin/page.tsx` | 1 | L205: DAUチャート棒グラフ高さ `height: ${(d.count/maxDau)*100}%` |
| `server/src/app/app/components/LocationButton.tsx` | 1 | L713-716: `liveMapPin`座標（VenueLiveMap.tsxと同種コードが別途実装されている。重複コンポーネントの可能性があるが、今回はCSP対応のみ行い統合はしない） |
| `server/src/app/chokaigi/YukkuriHero.tsx` | 1 | L286: `animationDelay: ${i * 0.18}s`（map内インデックス由来） |

### パターンC: 動的な画像URL → CSS変数 or data属性
`backgroundImage: url("${変数}")` の形。画像パスはキャラクター/クリエイターデータに紐づく。

| ファイル | 箇所数 | 内容 |
|---|---|---|
| `server/src/app/sign-up/[[...sign-up]]/page.tsx` | 3 | rink.png / konta.png / tanunee.png の3キャラ画像。**実際には固定3パターンのみ**（キャラクター名ごとにdata-character属性+CSS固定クラスで対応可能、パターンAと同じ手法でよい） |
| `server/src/app/sign-in/[[...sign-in]]/page.tsx` | 3 | sign-upページと全く同一内容・同一対応 |
| `server/src/app/page.tsx` | 1 | L110: `g.imageSrc`（キャラクター紹介、ガイド配列由来の動的パス） |
| `server/src/app/creators/[pref]/CreatorAvatar.tsx` | 1 | L29: `g.imageSrc`（クリエイターデータに紐づく動的URL。候補数が多い可能性があるためref+DOM直接操作(`el.style.backgroundImage = ...`)を使うこと） |
| `server/src/app/chokaigi/YukkuriDialogue.tsx` | 1 | L49: `meta.imageSrc`（speaker=キャラクターに紐づく。3キャラ固定ならパターンA的に対応可） |
| `server/src/app/chokaigi/UsageGuide.tsx` | 1 | L204: `guide.imageSrc`（ガイドキャラ3人固定ならパターンA的に対応可） |
| `server/src/app/HomeVenueWander.tsx` | 1 | L83: `g.imageSrc`（同上） |

**重要な訂正**: 下調べのサブエージェントが「CSS変数経由で解決可」と報告した箇所がありますが、
`style={{"--var": val}}` も最終的にHTML上は `style="--var:val"` というインラインstyle属性に
なるため、**CSPのstyle-src制約を受けます**。固定パターン(キャラ3種等)は data属性+CSS固定クラス、
真に動的な値(クリエイターごとの任意画像URL等、候補が多い)は **ref経由でJSのDOM操作**
（`imgRef.current.style.backgroundImage = `url(${src})`` のように、Reactのrender結果としてではなく
副作用(`useEffect`)でDOM要素に直接書き込む）で対応してください。

### パターンD: 完全な静的値 → 単純にCSS Modulesクラスへ移すだけ
動的要素が一切無い。最も簡単。

| ファイル | 箇所数 | 内容 |
|---|---|---|
| `server/src/app/sign-up/sso-callback/page.tsx` | 2 | レイアウト用の固定値（`minHeight`, `display`, `padding` 等）。普通の `.module.css` クラスに移すだけ |
| `server/src/app/sign-in/sso-callback/page.tsx` | 2 | 同上 |
| `server/src/app/chokaigi/VenueLiveMap.tsx` | 1 | L151: `minHeight: "12rem"`（エラー表示用） |
| `server/src/app/global-error.tsx` | 1 | L24-30: root layoutが使えない特殊なエラーページ用。**意図的にCSS Modulesを使わない設計とコメントで明記されている**ため、対応要否は要検討（最終手段として`<style>`タグ埋め込み+nonce方式、または例外的にこのファイルだけ`unsafe-inline`許容も検討の余地あり） |
| `server/src/app/components/SiteHeaderAuth.tsx` | 1 | L17: `flexShrink: 0`（SVGアイコン） |

## next.config.ts への追加（全ファイルのクラス化が終わってから）
現状（`server/next.config.ts`）:
```ts
headers: [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
],
```
ここに `Content-Security-Policy` を追加する。**Clerk (`@clerk/nextjs`) を認証に使っているため、
Clerkの外部スクリプト・API通信先をCSPで許可する必要がある**（`script-src`, `connect-src`,
`frame-src`等にClerkのドメインを含める。Clerk公式ドキュメントの推奨CSP設定を確認すること）。
`style-src 'self'` のみ（`unsafe-inline`なし）を目指す。`global-error.tsx`だけ対応できない場合は
その旨をPR説明に明記する。

## 検証手順（必須・省略しないこと）
1. `npx tsc --noEmit` でビルドエラーがないこと
2. `npm run dev` でローカル起動し、**実ブラウザ(Chrome)のDevTools Consoleで CSP violation が
   出ていないか**を全主要ページ（トップ、/chokaigi、/app、/sign-in、/sign-up、/admin、/onboarding）
   で確認する。characterlive.linkで過去に「CSPのハッシュ方式を入れたらページが止まった」実例が
   あるため、**実ブラウザでの確認を飛ばさないこと**
3. `grep -rn "style={{" server/src/app --include="*.tsx"` が
   `api/og/route.tsx` と `chokaigi/opengraph-image.tsx`（next/ogのImageResponse、Satoriで
   PNG画像を生成するだけでHTML/CSSに出力されないためCSP対象外）以外で0件になっていること

## PR作成
作業が終わったら、PR作成は Claude 側（この会話の司令塔）が `gh pr create` で行うので、
Antigravity側ではPR作成は不要（GitHub認証で失敗する既知の制約があるため）。
コミットをブランチ `fix/csp-strict-policy` に積んでpushしてもらえればよい。
