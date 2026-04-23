import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

/**
 * OGP カード画像（1200×630 PNG）。
 *
 * レイアウト意図:
 * - **中央に対象アカウントのアバター円**（ぱっと見で「誰を紹介しているか」が分かる）
 * - **りんく（左上）/ こん太（右上）/ たぬ姉（左下）** がアバターを囲む配置で
 *   「3キャラが紹介している」構図を作る
 * - 各キャラの近くに短い 1 行セリフのフキダシを置く（長いと読めないので 24 字で切る）
 *
 * Satori 制約メモ:
 * - すべての `div` に `display: flex` などが必要（text 子を持つなら特に）
 * - `<img src>` は絶対 URL 必須。キャラ PNG は `new URL(req.url).origin` から組む
 * - `position: absolute` は OK（親に `position: relative` があれば）
 */

export const runtime = "edge";

const CARD_W = 1200;
const CARD_H = 630;

// カード上のセリフは 1 行で視認できる長さに切る。
// ページ本文側（`YUKKURI_DIALOGUE_OG_PREVIEW_CHARS`）よりさらに短く絞る。
const CARD_LINE_MAX = 24;

function truncate(s: string, n: number): string {
  if (!s) return "";
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function initialOf(handle: string): string {
  // trim を先に行う。逆順だと「先頭空白 + @」の入力で `^@+` が一致せず @ が残る。
  const h = (handle ?? "?").trim().replace(/^@+/, "");
  return (h[0] ?? "?").toUpperCase();
}

/**
 * `?a=<avatar_url>` は外部から任意に付けられるため、信頼できる CDN だけ通す。
 *
 * アバターは運用上 X の CDN (`pbs.twimg.com`) しか届かない（DB 経由でもライブ取得でも
 * X API のレスポンスを保存したものしか使わない）。ここで allowlist を効かせることで:
 *  - Edge runtime の `ImageResponse` が任意の外部ホストへ fetch するのを防ぎ、弱い SSRF と
 *    遅延エンドポイントを使った OGP DoS を封じる
 *  - allowlist 外は null に落ちるので `initialOf()` の頭文字フォールバックが出るだけで、
 *    カード自体は正常に生成される
 */
function sanitizeAvatarUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 500) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  // pbs.twimg.com（プロフィール画像）と abs.twimg.com（デフォルトアイコン）を許可。
  const host = parsed.hostname.toLowerCase();
  if (host === "pbs.twimg.com" || host === "abs.twimg.com") {
    return parsed.toString();
  }
  return null;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = url.origin;
  const sp = url.searchParams;

  const handle = sp.get("h") ?? "???";
  const rink = truncate(sp.get("r") ?? "この人、気になる！", CARD_LINE_MAX);
  const konta = truncate(sp.get("k") ?? "応援してるよ！", CARD_LINE_MAX);
  const tanunee = truncate(sp.get("t") ?? "超会議で会いたいね", CARD_LINE_MAX);
  const avatar = sanitizeAvatarUrl(sp.get("a"));
  const name = sp.get("n") || null;

  const charRink = `${origin}/chokaigi/yukkuri/rink.png`;
  const charKonta = `${origin}/chokaigi/yukkuri/konta.png`;
  const charTanunee = `${origin}/chokaigi/yukkuri/tanunee.png`;

  return new ImageResponse(
    (
      <div
        style={{
          width: `${CARD_W}px`,
          height: `${CARD_H}px`,
          background:
            "linear-gradient(135deg, #060c1a 0%, #0f1e3a 55%, #1a3060 100%)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "'Noto Sans JP', sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 背景ドット */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle, rgba(122,168,216,0.12) 1.2px, transparent 1.2px)",
            backgroundSize: "36px 36px",
            display: "flex",
          }}
        />

        {/* ヘッダー */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "22px 48px 0",
            zIndex: 2,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                background: "#DD6500",
                borderRadius: "999px",
                padding: "6px 18px",
                color: "#fff",
                fontSize: "18px",
                fontWeight: 700,
                display: "flex",
              }}
            >
              すれちがいライト
            </div>
            <div style={{ color: "#7aa8d8", fontSize: "18px", display: "flex" }}>
              × ゆっくり解説
            </div>
          </div>
          <div
            style={{
              color: "#ffd278",
              fontSize: "22px",
              fontWeight: 700,
              display: "flex",
            }}
          >
            @{handle} を紹介！
          </div>
        </div>

        {/* 中央アバター（金×桃のグラデーションリング） */}
        <div
          style={{
            position: "absolute",
            left: `${(CARD_W - 260) / 2}px`,
            top: "95px",
            width: "260px",
            height: "260px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3,
          }}
        >
          <div
            style={{
              width: "260px",
              height: "260px",
              borderRadius: "999px",
              background:
                "linear-gradient(135deg, #ffd278 0%, #ff7eb3 60%, #7ec8ff 100%)",
              padding: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
            }}
          >
            <div
              style={{
                width: "248px",
                height: "248px",
                borderRadius: "999px",
                background: "#0a1530",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {avatar ? (
                <img
                  src={avatar}
                  width={248}
                  height={248}
                  style={{
                    width: "248px",
                    height: "248px",
                    borderRadius: "999px",
                    objectFit: "cover",
                    display: "flex",
                  }}
                />
              ) : (
                <div
                  style={{
                    fontSize: "120px",
                    fontWeight: 900,
                    color: "#ffd278",
                    display: "flex",
                  }}
                >
                  {initialOf(handle)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* display_name + @handle (アバター直下) */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "368px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 3,
            padding: "0 48px",
            gap: "2px",
          }}
        >
          {name ? (
            <div
              style={{
                color: "#fff",
                fontSize: "30px",
                fontWeight: 800,
                display: "flex",
                maxWidth: "520px",
                textShadow: "0 2px 8px rgba(0,0,0,0.55)",
              }}
            >
              {truncate(name, 18)}
            </div>
          ) : null}
          <div
            style={{
              color: "#ffd278",
              fontSize: "24px",
              fontWeight: 700,
              display: "flex",
              textShadow: "0 2px 8px rgba(0,0,0,0.55)",
            }}
          >
            @{handle}
          </div>
        </div>

        {/* 左: りんく 画像 */}
        <div
          style={{
            position: "absolute",
            left: "25px",
            top: "90px",
            width: "200px",
            height: "200px",
            display: "flex",
            zIndex: 4,
          }}
        >
          <img
            src={charRink}
            width={200}
            height={200}
            style={{ display: "flex" }}
          />
        </div>
        {/* 左: りんく フキダシ */}
        <div
          style={{
            position: "absolute",
            left: "20px",
            top: "298px",
            width: "260px",
            padding: "12px 18px",
            background: "rgba(255,126,179,0.2)",
            border: "2px solid #ff7eb3",
            borderRadius: "16px",
            display: "flex",
            flexDirection: "column",
            zIndex: 4,
          }}
        >
          <div
            style={{
              color: "#ff7eb3",
              fontSize: "15px",
              fontWeight: 800,
              display: "flex",
            }}
          >
            りんく
          </div>
          <div
            style={{
              color: "#ffe8f0",
              fontSize: "18px",
              display: "flex",
              lineHeight: "1.4",
              marginTop: "4px",
            }}
          >
            {rink}
          </div>
        </div>

        {/* 右: こん太 画像 */}
        <div
          style={{
            position: "absolute",
            right: "25px",
            top: "90px",
            width: "200px",
            height: "200px",
            display: "flex",
            zIndex: 4,
          }}
        >
          <img
            src={charKonta}
            width={200}
            height={200}
            style={{ display: "flex" }}
          />
        </div>
        {/* 右: こん太 フキダシ */}
        <div
          style={{
            position: "absolute",
            right: "20px",
            top: "298px",
            width: "260px",
            padding: "12px 18px",
            background: "rgba(126,200,255,0.2)",
            border: "2px solid #7ec8ff",
            borderRadius: "16px",
            display: "flex",
            flexDirection: "column",
            zIndex: 4,
          }}
        >
          <div
            style={{
              color: "#7ec8ff",
              fontSize: "15px",
              fontWeight: 800,
              display: "flex",
            }}
          >
            こん太
          </div>
          <div
            style={{
              color: "#e0efff",
              fontSize: "18px",
              display: "flex",
              lineHeight: "1.4",
              marginTop: "4px",
            }}
          >
            {konta}
          </div>
        </div>

        {/* 下: たぬ姉 画像（左下） */}
        <div
          style={{
            position: "absolute",
            left: "285px",
            top: "445px",
            width: "140px",
            height: "140px",
            display: "flex",
            zIndex: 4,
          }}
        >
          <img
            src={charTanunee}
            width={140}
            height={140}
            style={{ display: "flex" }}
          />
        </div>
        {/* 下: たぬ姉 フキダシ（横に広く伸ばす） */}
        <div
          style={{
            position: "absolute",
            left: "445px",
            top: "460px",
            width: "470px",
            padding: "12px 18px",
            background: "rgba(168,230,163,0.2)",
            border: "2px solid #a8e6a3",
            borderRadius: "16px",
            display: "flex",
            flexDirection: "column",
            zIndex: 4,
          }}
        >
          <div
            style={{
              color: "#a8e6a3",
              fontSize: "15px",
              fontWeight: 800,
              display: "flex",
            }}
          >
            たぬ姉
          </div>
          <div
            style={{
              color: "#e8fbe4",
              fontSize: "18px",
              display: "flex",
              lineHeight: "1.4",
              marginTop: "4px",
            }}
          >
            {tanunee}
          </div>
        </div>

        {/* フッター */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 48px 14px",
            zIndex: 5,
          }}
        >
          <div style={{ color: "#7aa8d8", fontSize: "15px", display: "flex" }}>
            #すれちがいライト　#ニコニコ超会議2026
          </div>
          <div style={{ color: "#4a7ab5", fontSize: "15px", display: "flex" }}>
            surechigai-nico.link
          </div>
        </div>
      </div>
    ),
    { width: CARD_W, height: CARD_H }
  );
}
