import type { Metadata } from "next";
import Link from "next/link";
import styles from "./punchline.module.css";

export const metadata: Metadata = {
  title: "mangamura.org | すれちがいライト",
  description: "星野ロミさんが手掛けた伝説のサービスへようこそ。",
  robots: { index: false, follow: false },
};

type Speaker = "rink" | "konta" | "tanunee";

const META: Record<
  Speaker,
  { name: string; avatar: string }
> = {
  rink: { name: "りんく", avatar: "/chokaigi/yukkuri/rink.png" },
  konta: { name: "こん太", avatar: "/chokaigi/yukkuri/konta.png" },
  tanunee: { name: "たぬ姉", avatar: "/chokaigi/yukkuri/tanunee.png" },
};

type Line = {
  who: Speaker;
  side: "left" | "right";
  body: React.ReactNode;
};

const LINES: Line[] = [
  {
    who: "rink",
    side: "left",
    body: <>あれ…？ もうないみたい…</>,
  },
  {
    who: "konta",
    side: "right",
    body: <>おいおい！ クリエイター応援サイトだぞ！</>,
  },
  {
    who: "tanunee",
    side: "left",
    body: <>ぜったい見ちゃダメだよー🙅‍♀️</>,
  },
  {
    who: "rink",
    side: "right",
    body: (
      <>
        それとね…
        <strong>漫画村は、ぜったいに作っちゃダメだからねー！</strong>🚨
      </>
    ),
  },
];

export default function MangamuraPunchlinePage() {
  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <div className={styles.notFoundBlock}>
          <div className={styles.badge}>404 Not Found</div>
          <h1 className={styles.title}>このサイトは、もうないみたい…</h1>
          <p className={styles.subtitle}>
            mangamura.org は、現在アクセスできません。
          </p>
        </div>

        <div className={styles.script}>
          {LINES.map((line, i) => {
            const meta = META[line.who];
            return (
              <div
                key={i}
                className={`${styles.row} ${
                  line.side === "right" ? styles.rowReverse : ""
                }`}
              >
                <div className={styles.avatarWrap}>
                  <img
                    src={meta.avatar}
                    alt={meta.name}
                    className={styles.avatar}
                  />
                  <span className={styles.nameBadge}>{meta.name}</span>
                </div>
                <div className={styles.bubble}>{line.body}</div>
              </div>
            );
          })}
        </div>

        <div className={styles.footer}>
          <Link
            href="/chokaigi/special-thanks"
            className={styles.backButton}
          >
            ← Special Thanks に戻る
          </Link>
          <Link href="/chokaigi" className={styles.secondaryLink}>
            LP トップへ
          </Link>
        </div>
      </div>
    </main>
  );
}
