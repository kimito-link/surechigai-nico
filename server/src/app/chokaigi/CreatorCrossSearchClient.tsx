"use client";

import dynamic from "next/dynamic";
import styles from "./chokaigi.module.css";

const CreatorCrossSearchImpl = dynamic(
  () =>
    import("./CreatorCrossSearchImpl").then((m) => m.CreatorCrossSearchImpl),
  {
    loading: () => (
      <div className={styles.creatorSearchDynamicLoading} aria-busy="true" aria-live="polite">
        <p className={styles.creatorSearchLoading}>参加者検索を読み込み中…</p>
      </div>
    ),
    ssr: false,
  }
);

/** 検索 UI のみクライアント・遅延ロード（見出しは親で SSR） */
export function CreatorCrossSearchClient() {
  return <CreatorCrossSearchImpl />;
}
