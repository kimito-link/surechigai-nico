"use client";

import { useEffect, useRef } from "react";
import MangamuraPranksterLink from "@/app/components/MangamuraPranksterLink";
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

      <div className={styles.thanksCreditLinks}>
        <p className={styles.thanksCreditLinksTitle}>
          ✨ 星野ロミさんがつくった、偉大なサービスたち ✨
        </p>
        <p className={styles.thanksCreditBody}>
          星野ロミさんは、たくさんの人が使う <strong>すごいサービス</strong>
          を自分の手でつくってきた、まさに<strong>天才プログラマー</strong>
          。そんなお方が途中まで書いてくださったコードを、私たちが引き継がせていただいているんです…！
        </p>
        <ul className={styles.thanksCreditLinksList}>
          <li>
            <a
              href="https://socialxup.com/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.thanksCreditLink}
            >
              <span className={styles.thanksCreditLinkName}>
                🌟 SocialXup（ほんとに便利！）
              </span>
              <span className={styles.thanksCreditLinkDesc}>
                X のフォロワー・フォロー数の推移を追跡できる神ツール。
                「あの人、いつからフォロワー増えたの？」が一瞬でわかります。
              </span>
            </a>
          </li>
          <li>
            <a
              href="https://threads.socialxup.com/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.thanksCreditLink}
            >
              <span className={styles.thanksCreditLinkName}>
                🌟 SocialXup for Threads（これも便利！）
              </span>
              <span className={styles.thanksCreditLinkDesc}>
                Threads 版のユーザー数推移ツール。
                Threads を伸ばしたい人は絶対ブックマーク推奨です。
              </span>
            </a>
          </li>
          <li>
            <a
              href="https://mmake.net/"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.thanksCreditLink}
            >
              <span className={styles.thanksCreditLinkName}>
                🎓 まんがくらぶ（mmake.net）
              </span>
              <span className={styles.thanksCreditLinkDesc}>
                あの星野ロミさんから<strong>直接プログラミングを学べる</strong>
                初心者向けオンラインスクール。
                <strong>天才の技術を学べるのだー！</strong>
                コードを書いてサービスを立ち上げたい人は覗いてみる価値アリです。
              </span>
            </a>
          </li>
          <li>
            <MangamuraPranksterLink
              href="https://mangamura.org/"
              className={styles.thanksCreditLink}
            >
              <span className={styles.thanksCreditLinkName}>
                mangamura.org
              </span>
              <span className={styles.thanksCreditLinkDesc}>
                漫画村 <span aria-label="おばけ">👻</span> ※もうないらしい
              </span>
            </MangamuraPranksterLink>
          </li>
        </ul>
      </div>
    </section>
  );
}
