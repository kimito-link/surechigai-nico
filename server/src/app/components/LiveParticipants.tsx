import Link from "next/link";
import type { RowDataPacket } from "mysql2";
import pool from "@/lib/db";
import JapanMap from "../app/components/JapanMap";
import styles from "../page.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ACTIVE_WINDOW_MINUTES = 30;
const MAX_AREAS = 15;

type CountRow = RowDataPacket & { cnt: number };
type AreaRow = RowDataPacket & { area: string; cnt: number };

async function loadStats(): Promise<{ total: number; areas: Array<{ area: string; count: number }> }> {
  try {
    const [countRows] = await pool.query<CountRow[]>(
      `SELECT COUNT(DISTINCT l.user_id) AS cnt
       FROM locations l
       INNER JOIN users u ON u.id = l.user_id
       WHERE l.created_at >= DATE_SUB(NOW(), INTERVAL ${ACTIVE_WINDOW_MINUTES} MINUTE)
         AND u.is_deleted = FALSE
         AND u.is_suspended = FALSE`
    );
    const total = countRows.length > 0 ? Number(countRows[0].cnt) : 0;

    const [areaRows] = await pool.query<AreaRow[]>(
      `SELECT l.municipality AS area, COUNT(DISTINCT l.user_id) AS cnt
       FROM locations l
       INNER JOIN (
         SELECT user_id, MAX(created_at) AS max_created_at
         FROM locations
         WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${ACTIVE_WINDOW_MINUTES} MINUTE)
         GROUP BY user_id
       ) latest ON l.user_id = latest.user_id AND l.created_at = latest.max_created_at
       INNER JOIN users u ON u.id = l.user_id
       WHERE u.is_deleted = FALSE
         AND u.is_suspended = FALSE
         AND l.municipality IS NOT NULL
       GROUP BY l.municipality
       ORDER BY cnt DESC
       LIMIT ${MAX_AREAS}`
    );
    const areas = areaRows.map((r) => ({ area: String(r.area), count: Number(r.cnt) }));

    return { total, areas };
  } catch {
    return { total: 0, areas: [] };
  }
}

export default async function LiveParticipants() {
  const { total, areas } = await loadStats();

  return (
    <div className={styles.liveStats}>
      {total > 0 ? (
        <p className={styles.liveStatsTotal}>
          現在<span className={styles.liveStatsNumber}>{total}</span>人が参加中
        </p>
      ) : (
        <p className={styles.liveStatsTotal}>
          まもなく開始 — あなたが最初の参加者かもしれません
        </p>
      )}

      {areas.length > 0 && (
        <>
          <JapanMap areaStats={areas} />
          <ul className={styles.liveStatsAreas}>
            {areas.map((a) => (
              <li key={a.area} className={styles.liveStatsArea}>
                <span className={styles.liveStatsAreaName}>{a.area}</span>
                <span className={styles.liveStatsAreaCount}>{a.count}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className={styles.liveStatsCta}>
        <p className={styles.liveStatsCtaTitle}>ログインするとできること</p>
        <ul className={styles.liveStatsCtaList}>
          <li>会場内のあなたの近くにいる参加者がピン表示されます</li>
          <li>相手の X（Twitter）アカウントが分かります</li>
          <li>位置を送信してすれ違った相手と繋がれます</li>
        </ul>
        <div className={styles.liveStatsCtaButtons}>
          <Link href="/sign-in" className={styles.liveStatsCtaPrimary}>
            ログインして参加する
          </Link>
          <Link href="/sign-up" className={styles.liveStatsCtaGhost}>
            新規登録
          </Link>
        </div>
      </div>

      <p className={styles.liveStatsNote}>
        {total > 0 ? "直近30分の匿名集計" : "参加者が増えると全国分布マップが表示されます"}
      </p>
    </div>
  );
}
