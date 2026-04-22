"use client";

import dynamic from "next/dynamic";
import styles from "./chokaigi.module.css";

const CreatorCrossSearchImpl = dynamic(
  () =>
    import("./CreatorCrossSearchImpl").then((m) => m.CreatorCrossSearchImpl),
  {
    loading: () => (
      <section
        className={styles.creatorSearchWrap}
        aria-busy="true"
        aria-label="クリエイタークロス検索を読み込み中"
      >
        <p className={styles.creatorSearchLoading}>参加者検索を読み込み中…</p>
      </section>
    ),
    ssr: false,
  }
);

/** 巨大データは別チャンクに遅延ロードし、初期バンドルを軽くする */
export function CreatorCrossSearch() {
  return <CreatorCrossSearchImpl />;
}
