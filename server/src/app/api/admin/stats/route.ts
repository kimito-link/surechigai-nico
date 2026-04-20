import pool from "@/lib/db";
import type { RowDataPacket } from "mysql2";

// 管理用統計API（middlewareでBasic認証済み）
export async function GET() {

  try {
    // DAU（今日app_openしたユニークユーザー数）
    const [dauRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT user_id) AS count FROM user_activity_log
       WHERE event_type = 'app_open' AND created_at >= CURDATE()`
    );

    // WAU（直近7日間）
    const [wauRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT user_id) AS count FROM user_activity_log
       WHERE event_type = 'app_open' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`
    );

    // MAU（直近30日間）
    const [mauRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT user_id) AS count FROM user_activity_log
       WHERE event_type = 'app_open' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
    );

    // 総ユーザー数
    const [totalUsers] = await pool.execute<RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM users WHERE is_deleted = FALSE AND uuid NOT LIKE 'debug-%'"
    );

    // 総すれ違い数
    const [totalEncounters] = await pool.execute<RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM encounters"
    );

    // 日別DAU推移（直近14日）
    const [dailyDau] = await pool.execute<RowDataPacket[]>(
      `SELECT DATE(created_at) AS date, COUNT(DISTINCT user_id) AS count
       FROM user_activity_log
       WHERE event_type = 'app_open' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date`
    );

    // D1継続率（昨日登録したユーザーのうち今日app_openした割合）
    const [d1Registered] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS count FROM users
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)
         AND created_at < CURDATE()
         AND is_deleted = FALSE`
    );
    const [d1Retained] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT al.user_id) AS count
       FROM user_activity_log al
       JOIN users u ON u.id = al.user_id
       WHERE al.event_type = 'app_open'
         AND al.created_at >= CURDATE()
         AND u.created_at >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)
         AND u.created_at < CURDATE()`
    );

    // イベント別カウント（今日）
    const [eventCounts] = await pool.execute<RowDataPacket[]>(
      `SELECT event_type, COUNT(*) AS count
       FROM user_activity_log
       WHERE created_at >= CURDATE()
       GROUP BY event_type
       ORDER BY count DESC`
    );

    // 非アクティブユーザー（7日以上app_openなし）
    const [inactiveUsers] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS count FROM users
       WHERE is_deleted = FALSE
         AND uuid NOT LIKE 'debug-%'
         AND (last_active_at IS NULL OR last_active_at < DATE_SUB(NOW(), INTERVAL 7 DAY))`
    );

    const d1Reg = d1Registered[0].count as number;
    const d1Ret = d1Retained[0].count as number;

    return Response.json({
      overview: {
        total_users: totalUsers[0].count,
        total_encounters: totalEncounters[0].count,
        dau: dauRows[0].count,
        wau: wauRows[0].count,
        mau: mauRows[0].count,
        inactive_7d: inactiveUsers[0].count,
      },
      retention: {
        d1_registered: d1Reg,
        d1_retained: d1Ret,
        d1_rate: d1Reg > 0 ? Math.round((d1Ret / d1Reg) * 100) : null,
      },
      daily_dau: dailyDau,
      today_events: eventCounts,
    });
  } catch (error) {
    console.error("統計取得エラー:", error);
    return Response.json({ error: "統計の取得に失敗しました" }, { status: 500 });
  }
}
