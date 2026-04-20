import { ImageResponse } from "next/og";
import { LP_TITLE } from "./lp-content";

/**
 * SNS向け OG 画像（1200×630）。
 * Satori は WOFF2/TTF 読み込みが環境依存のため、組み込みフォントで英字のみ描画。
 * 日本語の見出し・説明は layout の metadata / Twitter Card テキストで配信されます。
 */
export const alt = LP_TITLE;

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          background:
            "linear-gradient(145deg, #1a3d5c 0%, #255d9b 42%, #e8dac4 100%)",
          padding: 56,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 18,
            maxWidth: 1000,
          }}
        >
          <span
            style={{
              fontSize: 26,
              color: "rgba(255,255,255,0.88)",
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
            }}
          >
            Nico Nico Chokaigi · preview
          </span>
          <span
            style={{
              fontSize: 56,
              fontWeight: 700,
              color: "#ffffff",
              lineHeight: 1.15,
            }}
          >
            Surechigai Lite
          </span>
          <span
            style={{
              fontSize: 24,
              color: "rgba(255,255,255,0.92)",
              lineHeight: 1.4,
            }}
          >
            Anonymous “passing-by” notes at the venue — plan overview
          </span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <span style={{ fontSize: 22, color: "#3a2f24", fontWeight: 700 }}>
            Makuhari Messe · map / PDF on page
          </span>
          <span style={{ fontSize: 18, color: "rgba(60,48,36,0.75)" }}>
            /chokaigi
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
