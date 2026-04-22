import type { Metadata } from "next";
import Link from "next/link";

type Props = { searchParams: Promise<Record<string, string>> };

function buildOgImageUrl(params: Record<string, string>) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://surechigai-nico.link";
  const url = new URL(`${base}/api/og`);
  ["h", "r", "k", "t"].forEach((key) => {
    if (params[key]) url.searchParams.set(key, params[key]);
  });
  return url.toString();
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const handle = params.h ?? "???";
  const ogImage = buildOgImageUrl(params);
  const title = `@${handle} のゆっくり解説 | すれちがいライト`;
  const description = `りんく・こん太・たぬ姉が @${handle} さんを紹介しました！ #すれちがいライト #ニコニコ超会議2026`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function YukkuriSharePage({ searchParams }: Props) {
  const params = await searchParams;
  const handle  = params.h ?? "";
  const rink    = params.r ?? "";
  const konta   = params.k ?? "";
  const tanunee = params.t ?? "";

  return (
    <div style={{
      minHeight: "60vh",
      background: "#060c1a",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      fontFamily: "sans-serif",
      color: "#f0f4ff",
      gap: "1.5rem",
    }}>
      <div style={{ fontSize: "1.1rem", color: "#7aa8d8" }}>すれちがいライト ゆっくり解説</div>
      <div style={{ fontSize: "2rem", fontWeight: 700 }}>@{handle}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%", maxWidth: "480px" }}>
        {[
          { label: "りんく",  color: "#ff7eb3", text: rink },
          { label: "こん太",  color: "#7ec8ff", text: konta },
          { label: "たぬ姉", color: "#a8e6a3", text: tanunee },
        ].map(({ label, color, text }) => (
          <div key={label} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <span style={{
              background: color, borderRadius: "999px",
              padding: "2px 12px", color: "#060c1a",
              fontWeight: 700, fontSize: "0.85rem", flexShrink: 0,
            }}>{label}</span>
            <span style={{
              background: "rgba(255,255,255,0.08)", borderRadius: "10px",
              padding: "8px 12px", fontSize: "0.95rem", lineHeight: 1.6,
            }}>{text}</span>
          </div>
        ))}
      </div>

      <Link href="/chokaigi" style={{
        display: "inline-block",
        background: "#DD6500", color: "#fff",
        padding: "0.65rem 1.5rem", borderRadius: "999px",
        fontWeight: 700, textDecoration: "none", fontSize: "0.95rem",
      }}>
        自分も解説してもらう →
      </Link>
    </div>
  );
}
