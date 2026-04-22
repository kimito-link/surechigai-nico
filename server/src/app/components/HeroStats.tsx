import Link from "next/link";
import { loadHomeStats } from "@/lib/homeStats";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatCount(n: number): string {
  return n.toLocaleString("ja-JP");
}

/**
 * TOP ファーストビュー用の 3 チップ統計バー。
 * 各チップは a/Link 要素として導線化し、
 *  - 現在参加中 → 同一ページ下部の #live-participants-heading へスクロール
 *  - 登録数     → /creators（都道府県別 一覧）
 *  - ゆっくり解説 → /chokaigi#yukkuri-dialogue-heading（ゆっくり掛け合い）
 * を目指す。数字が 0 でも押せるよう常に表示する（導線優先）。
 */
export default async function HeroStats() {
  const stats = await loadHomeStats();

  return (
    <div className={styles.heroStatsRow} aria-label="参加状況サマリー">
      <Link
        href="#live-participants-heading"
        className={`${styles.heroStatsChip} ${styles.heroStatsChipLive}`}
      >
        <span className={styles.heroStatsChipDot} aria-hidden="true" />
        <span className={styles.heroStatsChipLabel}>現在参加中</span>
        <span className={styles.heroStatsChipNumber}>
          {formatCount(stats.activeNow)}
        </span>
        <span className={styles.heroStatsChipUnit}>人</span>
      </Link>

      <Link
        href="/creators"
        className={styles.heroStatsChip}
      >
        <span className={styles.heroStatsChipIcon} aria-hidden="true">
          👥
        </span>
        <span className={styles.heroStatsChipLabel}>すれちがい通信 登録</span>
        <span className={styles.heroStatsChipNumber}>
          {formatCount(stats.registeredTotal)}
        </span>
        <span className={styles.heroStatsChipUnit}>人</span>
      </Link>

      <Link
        href="/chokaigi#yukkuri-dialogue-heading"
        className={styles.heroStatsChip}
      >
        <span className={styles.heroStatsChipIcon} aria-hidden="true">
          🎤
        </span>
        <span className={styles.heroStatsChipLabel}>ゆっくり解説された</span>
        <span className={styles.heroStatsChipNumber}>
          {formatCount(stats.yukkuriExplained)}
        </span>
        <span className={styles.heroStatsChipUnit}>人</span>
      </Link>

      {stats.encountersTotal > 0 && (
        <span
          className={`${styles.heroStatsChip} ${styles.heroStatsChipStatic}`}
          aria-label="累計すれちがい回数"
        >
          <span className={styles.heroStatsChipIcon} aria-hidden="true">
            ✨
          </span>
          <span className={styles.heroStatsChipLabel}>累計すれちがい</span>
          <span className={styles.heroStatsChipNumber}>
            {formatCount(stats.encountersTotal)}
          </span>
          <span className={styles.heroStatsChipUnit}>回</span>
        </span>
      )}
    </div>
  );
}
