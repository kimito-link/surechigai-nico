/**
 * ひとこと24時間リセット cron ジョブ
 * 1時間ごとに実行: crontab -e → 0 * * * * cd /path/to/server && npx tsx src/cron/resetHitokoto.ts
 *
 * hitokoto_set_atから24時間経過したひとことをNULLにリセット
 */

import mysql from "mysql2/promise";
import "dotenv/config";

async function resetExpiredHitokoto() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "CHANGE_ME",
    password: process.env.DB_PASSWORD || "CHANGE_ME",
    database: process.env.DB_NAME || "surechigai",
    timezone: "+09:00",
  });

  try {
    const [result] = await pool.execute(
      `UPDATE users SET hitokoto = NULL, hitokoto_set_at = NULL
       WHERE hitokoto IS NOT NULL
         AND hitokoto_set_at < DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    );
    const affected = (result as { affectedRows: number }).affectedRows;
    if (affected > 0) {
      console.log(`[resetHitokoto] ${affected}件のひとことをリセット`);
    }
  } catch (error) {
    console.error("[resetHitokoto] エラー:", error);
  } finally {
    await pool.end();
  }
}

resetExpiredHitokoto();
