import styles from "./chokaigi.module.css";
import { CREATOR_SEARCH_HEADING_ID } from "./creatorCrossSearchConstants";
import { CreatorCrossSearchClient } from "./CreatorCrossSearchClient";

/**
 * 見出しと id は常に SSR される（hash 付き URL の初回スクロールが効く）。
 * 重い検索 UI は CreatorCrossSearchClient で遅延する。
 */
export function CreatorCrossSearch() {
  return (
    <section
      className={styles.creatorSearchWrap}
      aria-labelledby={CREATOR_SEARCH_HEADING_ID}
    >
      <h3 id={CREATOR_SEARCH_HEADING_ID} className={styles.mapSubheading}>
        参加者・関係者検索（クリエイタークロス）
      </h3>
      <CreatorCrossSearchClient />
    </section>
  );
}
