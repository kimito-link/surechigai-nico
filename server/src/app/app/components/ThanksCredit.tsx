"use client";

import { useEffect, useRef } from "react";
import styles from "../app.module.css";

declare global {
  interface Window {
    twttr?: {
      widgets: {
        load: (el?: HTMLElement) => void;
      };
    };
  }
}

const TWEET_URL = "https://x.com/romi_hoshino/status/2042864577193611388";
const WIDGETS_SRC = "https://platform.twitter.com/widgets.js";

export default function ThanksCredit() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const render = () => {
      if (window.twttr?.widgets && hostRef.current) {
        window.twttr.widgets.load(hostRef.current);
      }
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${WIDGETS_SRC}"]`
    );

    if (existing) {
      render();
      return;
    }

    const script = document.createElement("script");
    script.src = WIDGETS_SRC;
    script.async = true;
    script.charset = "utf-8";
    script.addEventListener("load", render);
    document.body.appendChild(script);

    return () => {
      script.removeEventListener("load", render);
    };
  }, []);

  return (
    <section className={styles.thanksCredit} aria-label="このアプリが生まれたきっかけ">
      <h3 className={styles.thanksCreditTitle}>
        🙏 このアプリが生まれたきっかけ
      </h3>
      <p className={styles.thanksCreditBody}>
        このアプリは、星野ロミさん（
        <a
          href="https://x.com/romi_hoshino"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.thanksCreditHandle}
        >
          @romi_hoshino
        </a>
        ）が
        「3DS のすれちがい通信をスマホで復活させたい」と途中まで作ってくださったプログラムから生まれました。
      </p>
      <p className={styles.thanksCreditBody}>
        「おさんぽ」機能（分身が他県へ旅するあの仕組み）も、星野さんのアイデアです。本当にありがとうございます。
      </p>

      <div ref={hostRef} className={styles.thanksCreditEmbed}>
        <blockquote className="twitter-tweet" data-lang="ja" data-dnt="true">
          <a href={TWEET_URL}>元ツイートを見る</a>
        </blockquote>
      </div>
    </section>
  );
}
