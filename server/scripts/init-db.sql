-- すれちがい通信アプリ DB スキーマ
-- MySQL 8.0+ 必須（SPATIAL INDEX, ST_Distance_Sphere）

CREATE DATABASE IF NOT EXISTS surechigai
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE surechigai;

-- ユーザー作成（初回のみ）
-- CREATE USER IF NOT EXISTS 'surechigai'@'localhost' IDENTIFIED BY 'surechigai_pass';
-- GRANT ALL PRIVILEGES ON surechigai.* TO 'surechigai'@'localhost';
-- FLUSH PRIVILEGES;

-- ============================================================
-- users テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uuid VARCHAR(36) NOT NULL UNIQUE COMMENT 'ゲストUUID（端末生成）',
  firebase_uid VARCHAR(128) NULL UNIQUE COMMENT 'Firebase Auth UID（任意ログイン時）',
  clerk_id VARCHAR(255) NULL UNIQUE COMMENT 'Clerkユーザー ID',
  clerk_email VARCHAR(255) NULL COMMENT 'Clerk登録メール',
  twitter_handle VARCHAR(30) NULL COMMENT 'Twitter ハンドル',
  nickname VARCHAR(20) NOT NULL DEFAULT '匿名さん',
  avatar_config JSON NULL COMMENT 'DiceBear アバター設定',
  avatar_url TEXT NULL COMMENT 'プロフィール画像URL',
  hitokoto VARCHAR(100) NULL COMMENT 'ひとこと（今の気分）',
  hitokoto_set_at DATETIME NULL COMMENT 'ひとこと設定日時',
  spotify_track_id VARCHAR(64) NULL COMMENT 'Spotify トラックID',
  spotify_track_name VARCHAR(200) NULL COMMENT '曲名',
  spotify_artist_name VARCHAR(200) NULL COMMENT 'アーティスト名',
  spotify_album_image_url VARCHAR(500) NULL COMMENT 'アルバムジャケットURL',
  fcm_token VARCHAR(512) NULL COMMENT 'FCM プッシュ通知トークン',
  age_group ENUM('10s','20s','30s','40s','50s_plus','unset') NOT NULL DEFAULT 'unset' COMMENT '年代',
  gender ENUM('male','female','other','unset') NOT NULL DEFAULT 'unset' COMMENT '性別',
  show_age_group BOOLEAN NOT NULL DEFAULT FALSE COMMENT '年代を公開するか',
  show_gender BOOLEAN NOT NULL DEFAULT FALSE COMMENT '性別を公開するか',
  notification_enabled BOOLEAN NOT NULL DEFAULT TRUE COMMENT '通知ON/OFF',
  location_paused_until DATETIME NULL COMMENT '位置情報一時停止（NULLなら送信中）',
  streak_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '連続すれ違い日数',
  last_encounter_date DATE NULL COMMENT '最後にすれ違いがあった日',
  last_active_at DATETIME NULL COMMENT '最終アクティブ日時',
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE COMMENT '退会フラグ',
  is_suspended BOOLEAN NOT NULL DEFAULT FALSE COMMENT '通報による停止フラグ',
  suspended_at DATETIME NULL COMMENT '停止日時',
  ghost_lat DECIMAL(10,6) NULL COMMENT '分身の緯度',
  ghost_lng DECIMAL(10,6) NULL COMMENT '分身の経度',
  ghost_area_name VARCHAR(100) NULL COMMENT '分身のエリア名',
  ghost_prefecture VARCHAR(10) NULL COMMENT '分身の都道府県',
  ghost_municipality VARCHAR(50) NULL COMMENT '分身の市区町村',
  ghost_placed_at DATETIME NULL COMMENT '分身の配置日時',
  ghost_hitokoto VARCHAR(100) NULL COMMENT '旅のひとこと',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_firebase_uid (firebase_uid),
  INDEX idx_clerk_id (clerk_id)
) ENGINE=InnoDB;

-- ============================================================
-- locations テーブル（位置情報ログ）
-- ============================================================
CREATE TABLE IF NOT EXISTS locations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  point GEOMETRY NOT NULL SRID 4326 COMMENT '正確な緯度経度（POINT型, 軸順序は (lat, lng)）',
  lat_grid DECIMAL(10,6) NOT NULL COMMENT '500mグリッド丸め緯度',
  lng_grid DECIMAL(10,6) NOT NULL COMMENT '500mグリッド丸め経度',
  h3_r8 CHAR(15) NULL COMMENT 'Uber H3 cell index, resolution 8 (edge ~460m)',
  municipality VARCHAR(50) NULL COMMENT '市区町村名（逆ジオコーディング）',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  SPATIAL INDEX idx_point (point),
  INDEX idx_user_created (user_id, created_at),
  INDEX idx_created_at (created_at),
  INDEX idx_grid (lat_grid, lng_grid, created_at),
  INDEX idx_h3_r8 (h3_r8, created_at),
  INDEX idx_municipality (municipality, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 既存環境向けマイグレーション（冪等）: h3_r8 カラムとインデックスを後付けする
SET @db := DATABASE();
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.columns
  WHERE table_schema = @db AND table_name = 'locations' AND column_name = 'h3_r8'
);
SET @add_col_sql := IF(
  @col_exists = 0,
  'ALTER TABLE locations ADD COLUMN h3_r8 CHAR(15) NULL COMMENT ''Uber H3 cell index, resolution 8'' AFTER lng_grid',
  'SELECT 1'
);
PREPARE stmt FROM @add_col_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.statistics
  WHERE table_schema = @db AND table_name = 'locations' AND index_name = 'idx_h3_r8'
);
SET @add_idx_sql := IF(
  @idx_exists = 0,
  'ALTER TABLE locations ADD INDEX idx_h3_r8 (h3_r8, created_at)',
  'SELECT 1'
);
PREPARE stmt FROM @add_idx_sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================
-- encounters テーブル（すれちがい記録）
-- ============================================================
CREATE TABLE IF NOT EXISTS encounters (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user1_id BIGINT UNSIGNED NOT NULL COMMENT '小さい方のuser_id',
  user2_id BIGINT UNSIGNED NOT NULL COMMENT '大きい方のuser_id',
  lat_grid DECIMAL(10,6) NOT NULL COMMENT 'すれちがいエリア（500m丸め）',
  lng_grid DECIMAL(10,6) NOT NULL COMMENT 'すれちがいエリア（500m丸め）',
  area_name VARCHAR(100) NULL COMMENT 'エリア名（逆ジオコーディング）',
  prefecture VARCHAR(10) NULL COMMENT '都道府県',
  tier TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '1:すれ違い500m / 2:ご近所3km / 3:同じ街10km / 4:同じ地域50km / 5:おさんぽ',
  ghost_owner_id BIGINT UNSIGNED NULL COMMENT '分身の所有者ID(tier=5のみ)',
  encountered_at DATETIME NOT NULL COMMENT 'すれちがい検出時刻',
  notified_user1 BOOLEAN NOT NULL DEFAULT FALSE,
  notified_user2 BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user1 (user1_id, encountered_at),
  INDEX idx_user2 (user2_id, encountered_at),
  INDEX idx_pair_time (user1_id, user2_id, encountered_at),
  FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- likes テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS likes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  encounter_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL COMMENT 'いいねしたユーザー',
  reaction_type VARCHAR(20) NOT NULL DEFAULT 'like' COMMENT 'like / wakaru / ukeru / iine_song',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX idx_unique_like (encounter_id, user_id),
  FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- blocks テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS blocks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  blocker_id BIGINT UNSIGNED NOT NULL COMMENT 'ブロックしたユーザー',
  blocked_id BIGINT UNSIGNED NOT NULL COMMENT 'ブロックされたユーザー',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX idx_unique_block (blocker_id, blocked_id),
  INDEX idx_blocked (blocked_id),
  FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- reports テーブル（通報）
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reporter_id BIGINT UNSIGNED NOT NULL,
  reported_user_id BIGINT UNSIGNED NOT NULL,
  encounter_id BIGINT UNSIGNED NULL COMMENT '通報対象のすれちがい',
  reason ENUM('inappropriate_hitokoto','spam','harassment','other') NOT NULL,
  detail VARCHAR(500) NULL,
  status ENUM('pending','reviewed','resolved') NOT NULL DEFAULT 'pending',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- notification_log テーブル
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_log (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  encounter_id BIGINT UNSIGNED NULL,
  type ENUM('encounter','like','weekly_stats') NOT NULL,
  sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_sent (user_id, sent_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (encounter_id) REFERENCES encounters(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- user_activity_log テーブル（ユーザー行動ログ）
-- ============================================================
CREATE TABLE IF NOT EXISTS user_activity_log (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  event_type VARCHAR(50) NOT NULL COMMENT 'app_open / app_background / encounter_view / like / hitokoto_set / song_set',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_event (user_id, event_type, created_at),
  INDEX idx_event_created (event_type, created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- daily_topics テーブル(今日のお題)
-- ============================================================
CREATE TABLE IF NOT EXISTS daily_topics (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  topic VARCHAR(200) NOT NULL,
  scheduled_date DATE NOT NULL,
  UNIQUE KEY uk_date (scheduled_date)
) ENGINE=InnoDB;

-- ============================================================
-- user_prefectures テーブル(都道府県すれちがい記録)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_prefectures (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  prefecture VARCHAR(10) NOT NULL COMMENT '都道府県名',
  first_encountered_at DATETIME NOT NULL COMMENT '初すれちがい日時',
  encounter_count INT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'その県でのすれちがい回数',
  UNIQUE INDEX idx_user_pref (user_id, prefecture),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- user_badges テーブル(獲得バッジ)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_badges (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  badge_id VARCHAR(50) NOT NULL COMMENT 'バッジ識別子',
  earned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE INDEX idx_user_badge (user_id, badge_id),
  INDEX idx_badge (badge_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- yukkuri_explained（ゆっくり解説アーカイブ・ヒーロー統計用）
-- ============================================================
CREATE TABLE IF NOT EXISTS yukkuri_explained (
  x_handle VARCHAR(30) NOT NULL COMMENT 'X ハンドル（小文字・@なし）',
  display_name VARCHAR(200) NULL COMMENT '解説リクエスト時の表示名',
  avatar_url VARCHAR(500) NULL COMMENT 'Xプロフィール画像URL',
  rink TEXT NOT NULL,
  konta TEXT NOT NULL,
  tanunee TEXT NOT NULL,
  source VARCHAR(64) NULL COMMENT 'ollama / fallback 等',
  first_explained_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (x_handle),
  INDEX idx_yukkuri_explained_updated (updated_at)
) ENGINE=InnoDB;
