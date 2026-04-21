import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const handle  = searchParams.get("h") ?? "???";
  const rink    = searchParams.get("r") ?? "こんにちは！";
  const konta   = searchParams.get("k") ?? "よろしくね！";
  const tanunee = searchParams.get("t") ?? "応援してるよ！";

  const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n) + "…" : s;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "linear-gradient(135deg, #060c1a 0%, #0f1e3a 60%, #1a3060 100%)",
          display: "flex",
          flexDirection: "column",
          fontFamily: "'Noto Sans JP', sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 背景ドット */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(26,88,152,0.15) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
          display: "flex",
        }} />

        {/* ヘッダー */}
        <div style={{
          display: "flex", alignItems: "center", gap: "16px",
          padding: "32px 56px 0",
        }}>
          <div style={{
            background: "#DD6500", borderRadius: "999px",
            padding: "6px 20px", color: "#fff",
            fontSize: "18px", fontWeight: 700,
            display: "flex",
          }}>
            すれちがいライト
          </div>
          <div style={{ color: "#7aa8d8", fontSize: "18px", display: "flex" }}>
            ゆっくり解説
          </div>
        </div>

        {/* ハンドル */}
        <div style={{
          padding: "18px 56px 0",
          color: "#fff", fontSize: "34px", fontWeight: 700,
          display: "flex",
        }}>
          @{handle}
        </div>

        {/* キャラクターバブル */}
        <div style={{
          display: "flex", flexDirection: "column",
          gap: "14px", padding: "20px 56px 0", flex: 1,
        }}>
          {[
            { label: "りんく",  color: "#ff7eb3", text: rink },
            { label: "こん太",  color: "#7ec8ff", text: konta },
            { label: "たぬ姉", color: "#a8e6a3", text: tanunee },
          ].map(({ label, color, text }) => (
            <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <div style={{
                background: color, borderRadius: "999px",
                padding: "4px 14px", fontSize: "16px", fontWeight: 700,
                color: "#060c1a", flexShrink: 0, minWidth: "68px",
                display: "flex", justifyContent: "center",
              }}>
                {label}
              </div>
              <div style={{
                background: "rgba(255,255,255,0.1)", borderRadius: "12px",
                padding: "10px 16px", color: "#f0f4ff", fontSize: "20px",
                lineHeight: "1.5", display: "flex", flex: 1,
              }}>
                {truncate(text, 45)}
              </div>
            </div>
          ))}
        </div>

        {/* フッター */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 56px 28px",
        }}>
          <div style={{ color: "#7aa8d8", fontSize: "16px", display: "flex" }}>
            #すれちがいライト　#ニコニコ超会議2026
          </div>
          <div style={{ color: "#4a7ab5", fontSize: "16px", display: "flex" }}>
            surechigai-nico.link
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
