import type { Metadata } from "next";
import Link from "next/link";
import { YukkuriShareVoice } from "./YukkuriShareVoice";
import styles from "./page.module.css";

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

const BADGE_CLASS = {
  りんく: styles.badgeRink,
  こん太: styles.badgeKonta,
  たぬ姉: styles.badgeTanunee,
} as const;

export default async function YukkuriSharePage({ searchParams }: Props) {
  const params = await searchParams;
  const handle = params.h ?? "";
  const rink = params.r ?? "";
  const konta = params.k ?? "";
  const tanunee = params.t ?? "";

  return (
    <div className={styles.shell}>
      <div className={styles.kicker}>すれちがいライト ゆっくり解説</div>
      <div className={styles.handle}>@{handle}</div>

      <div className={styles.dialogueList}>
        {[
          { label: "りんく" as const, text: rink },
          { label: "こん太" as const, text: konta },
          { label: "たぬ姉" as const, text: tanunee },
        ].map(({ label, text }) => (
          <div key={label} className={styles.dialogueRow}>
            <span className={BADGE_CLASS[label]}>{label}</span>
            <span className={styles.bubble}>{text}</span>
          </div>
        ))}
      </div>

      <YukkuriShareVoice rink={rink} konta={konta} tanunee={tanunee} />

      <Link href="/chokaigi" className={styles.cta}>
        自分も解説してもらう →
      </Link>
    </div>
  );
}
