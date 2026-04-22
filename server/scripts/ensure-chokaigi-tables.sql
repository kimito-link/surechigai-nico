-- 超会議の位置取得・共有に必要なテーブルだけを「無ければ作る」
-- Railway の MySQL: 接続先 DB を Vercel の MYSQL_DATABASE / 接続 URL と同じにしてから実行する
--（Query タブで DB を選んでから、全文を貼り付けて実行）

-- 前提: `users` テーブルが既に存在（register-direct で作成済み）
-- もし users すらない場合は init-db.sql 全体を先に流してください。

-- ============================================================
-- locations テーブル（位置情報ログ / POST /api/locations）
-- ============================================================
CREATE TABLE IF NOT EXISTS locations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  point GEOMETRY NOT NULL SRID 4326 COMMENT '正確な緯度経度（POINT型）',
  lat_grid DECIMAL(10,6) NOT NULL COMMENT '500mグリッド丸め緯度',
  lng_grid DECIMAL(10,6) NOT NULL COMMENT '500mグリッド丸め経度',
  municipality VARCHAR(50) NULL COMMENT '市区町村名（逆ジオコーディング）',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  SPATIAL INDEX idx_point (point),
  INDEX idx_user_created (user_id, created_at),
  INDEX idx_created_at (created_at),
  INDEX idx_grid (lat_grid, lng_grid, created_at),
  INDEX idx_municipality (municipality, created_at),
  CONSTRAINT fk_locations_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- blocks テーブル（ライブマップのブロック除外用 / GET /api/chokaigi/live-map）
-- ============================================================
CREATE TABLE IF NOT EXISTS blocks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  blocker_id BIGINT UNSIGNED NOT NULL COMMENT 'ブロックしたユーザー',
  blocked_id BIGINT UNSIGNED NOT NULL COMMENT 'ブロックされたユーザー',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX idx_unique_block (blocker_id, blocked_id),
  INDEX idx_blocked (blocked_id),
  CONSTRAINT fk_blocks_blocker
    FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_blocks_blocked
    FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- yukkuri_explained（ゆっくり解説アーカイブ・TOP のヒーロー統計に使う）
--   POST /api/yukkuri-explain 成功時 / キャッシュヒット時に upsert。
--   SELECT COUNT(*) と Redis SCARD の max を表示する仕様（homeStats.ts 参照）。
-- ============================================================
CREATE TABLE IF NOT EXISTS yukkuri_explained (
  x_handle VARCHAR(30) NOT NULL COMMENT 'X ハンドル（小文字・@なし）',
  display_name VARCHAR(200) NULL COMMENT '解説リクエスト時の表示名',
  rink TEXT NOT NULL,
  konta TEXT NOT NULL,
  tanunee TEXT NOT NULL,
  source VARCHAR(64) NULL COMMENT 'ollama / fallback / cache_hit 等',
  first_explained_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (x_handle),
  INDEX idx_yukkuri_explained_updated (updated_at)
) ENGINE=InnoDB;
