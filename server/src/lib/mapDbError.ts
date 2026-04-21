/**
 * API レスポンス用。接続情報や生 SQL は含めない。
 */
export function mapDbErrorToUserMessage(error: unknown): string {
  const e = error as {
    code?: string;
    errno?: number;
    sqlMessage?: string;
    message?: string;
  };
  const code = e?.code;
  const msg = (e?.sqlMessage || e?.message || "").toLowerCase();

  if (
    code === "ER_ACCESS_DENIED_ERROR" ||
    code === "ER_ACCESS_DENIED_NO_PASSWORD_ERROR"
  ) {
    return "データベースのユーザー名またはパスワードが違います。Vercel の MYSQL_USER / MYSQL_PASSWORD（または DATABASE_URL）を確認してください。";
  }

  if (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "ETIMEDOUT" ||
    code === "ECONNRESET"
  ) {
    return "データベースに接続できません。Vercel には Railway の「Public Network」の接続情報を入れてください（推奨: 変数 MYSQL_PUBLIC_URL にコピー。内部用 MYSQLHOST だけでは Vercel から届きません）。Railway の MySQL で Public TCP Proxy が有効かも確認してください。";
  }

  if (code === "ER_BAD_DB_ERROR" || e?.errno === 1049) {
    return "データベース名が存在しません。MYSQL_DATABASE / DB_NAME が Railway の DB 名と一致するか確認してください。";
  }

  if (code === "ER_NO_SUCH_TABLE" || code === "42S02") {
    return "テーブルが見つかりません。本番 DB に init-db.sql を適用したか確認してください。";
  }

  if (code === "PROTOCOL_CONNECTION_LOST" || code === "EPIPE") {
    return "データベース接続が切れました。しばらく待って再読み込みしてください。";
  }

  if (msg.includes("certificate") || msg.includes("ssl") || msg.includes("tls")) {
    return "データベースの SSL 接続に失敗しました。リモート MySQL では DATABASE_SSL を 1 にするか、ホスト名の設定を確認してください。";
  }

  if (code === "ER_DATA_TOO_LONG" || code === "1406") {
    return "保存するデータが長すぎます。管理者に連絡してください。";
  }

  if (code === "ER_DUP_ENTRY" || code === "1062") {
    return "登録の重複が発生しました。ページを再読み込みしてください。";
  }

  if (
    code === "ER_CANT_CREATE_GEOMETRY_OBJECT" ||
    code === "1416" ||
    msg.includes("geometry") ||
    msg.includes("srid")
  ) {
    return "位置の保存用カラム（空間データ）の書き込みに失敗しました。本番 MySQL 8.0+ で init-db.sql の locations テーブル（point, SRID 4326）が作られているか確認してください。";
  }

  return "サーバーエラーが発生しました";
}
