"use client";

import { useEffect, useState } from "react";

interface Stats {
  overview: {
    total_users: number;
    total_encounters: number;
    dau: number;
    wau: number;
    mau: number;
    inactive_7d: number;
  };
  retention: {
    d1_registered: number;
    d1_retained: number;
    d1_rate: number | null;
  };
  daily_dau: { date: string; count: number }[];
  today_events: { event_type: string; count: number }[];
}

const EVENT_LABELS: Record<string, string> = {
  app_open: "アプリ起動",
  app_background: "バックグラウンド",
  encounter_view: "すれ違い詳細閲覧",
  like: "リアクション",
  hitokoto_set: "ひとこと設定",
  song_set: "曲設定",
};

interface ReportedUser {
  user_id: number;
  nickname: string;
  hitokoto: string | null;
  avatar_url: string | null;
  is_suspended: number;
  suspended_at: string | null;
  report_count: number;
  reasons: string;
  last_reported_at: string;
  latest_detail: string | null;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [reports, setReports] = useState<ReportedUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  const adminHeaders: HeadersInit = {
    Authorization: "Basic " + btoa("admin:admin"),
  };

  const fetchReports = () => {
    fetch("/api/admin/reports", { headers: adminHeaders })
      .then((r) => r.json())
      .then((data) => { if (data.reports) setReports(data.reports); })
      .catch(() => {});
  };

  useEffect(() => {
    fetch("/api/admin/stats", { headers: adminHeaders })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setStats(data);
      })
      .catch(() => setError("統計の取得に失敗しました"));
    fetchReports();
  }, []);

  const handleModAction = async (userId: number, action: "suspend" | "unsuspend") => {
    await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { ...adminHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    fetchReports();
  };

  if (error) return <div style={styles.error}>{error}</div>;
  if (!stats) return <div style={styles.loading}>読み込み中...</div>;

  const maxDau = Math.max(...stats.daily_dau.map((d) => d.count), 1);

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>すれちがいライト 管理ダッシュボード</h1>

      {/* 概要カード */}
      <div style={styles.cardGrid}>
        <Card label="総ユーザー数" value={stats.overview.total_users} />
        <Card label="総すれ違い数" value={stats.overview.total_encounters} />
        <Card label="DAU (今日)" value={stats.overview.dau} highlight />
        <Card label="WAU (7日間)" value={stats.overview.wau} />
        <Card label="MAU (30日間)" value={stats.overview.mau} />
        <Card label="非アクティブ (7日+)" value={stats.overview.inactive_7d} warn />
      </div>

      {/* D1継続率 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>D1継続率</h2>
        <div style={styles.card}>
          {stats.retention.d1_registered > 0 ? (
            <div>
              <span style={styles.bigNumber}>
                {stats.retention.d1_rate}%
              </span>
              <span style={styles.subText}>
                {" "}({stats.retention.d1_retained} / {stats.retention.d1_registered})
              </span>
            </div>
          ) : (
            <span style={styles.subText}>昨日の新規登録なし</span>
          )}
        </div>
      </div>

      {/* DAU推移 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>DAU推移 (直近14日)</h2>
        <div style={styles.card}>
          {stats.daily_dau.length > 0 ? (
            <div style={styles.chart}>
              {stats.daily_dau.map((d) => (
                <div key={d.date} style={styles.chartCol}>
                  <div style={styles.chartBarWrap}>
                    <div
                      style={{
                        ...styles.chartBar,
                        height: `${(d.count / maxDau) * 100}%`,
                      }}
                    />
                  </div>
                  <div style={styles.chartLabel}>{d.date.slice(5)}</div>
                  <div style={styles.chartValue}>{d.count}</div>
                </div>
              ))}
            </div>
          ) : (
            <span style={styles.subText}>データなし</span>
          )}
        </div>
      </div>

      {/* 通報ユーザー */}
      {reports.length > 0 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>通報ユーザー ({reports.length}件)</h2>
          {reports.map((r) => (
            <div key={r.user_id} style={{
              ...styles.card,
              marginBottom: 12,
              borderLeft: r.is_suspended ? "4px solid #FF3B30" : "4px solid #FFB347",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                    {r.nickname}
                    {r.is_suspended ? (
                      <span style={{ color: "#FF3B30", fontSize: 12, marginLeft: 8 }}>ひとこと非表示中</span>
                    ) : (
                      <span style={{ color: "#FFB347", fontSize: 12, marginLeft: 8 }}>要確認</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>
                    ID: {r.user_id} / 通報数: {r.report_count}件 (異なるユーザーから)
                  </div>
                  {r.hitokoto && (
                    <div style={{ fontSize: 14, color: "#333", margin: "8px 0", padding: "8px 12px", background: "#FFF", borderRadius: 8 }}>
                      ひとこと: 「{r.hitokoto}」
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "#999" }}>
                    理由: {r.reasons} / 最終通報: {new Date(r.last_reported_at).toLocaleString("ja-JP")}
                  </div>
                  {r.latest_detail && (
                    <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                      詳細: {r.latest_detail}
                    </div>
                  )}
                </div>
                <div>
                  {r.is_suspended ? (
                    <button
                      onClick={() => handleModAction(r.user_id, "unsuspend")}
                      style={{ ...styles.modButton, background: "#4A90D9" }}
                    >
                      非表示を解除
                    </button>
                  ) : (
                    <button
                      onClick={() => handleModAction(r.user_id, "suspend")}
                      style={{ ...styles.modButton, background: "#FF3B30" }}
                    >
                      ひとこと非表示にする
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 今日のイベント */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>今日のイベント</h2>
        <div style={styles.card}>
          {stats.today_events.length > 0 ? (
            <table style={styles.table}>
              <tbody>
                {stats.today_events.map((e) => (
                  <tr key={e.event_type}>
                    <td style={styles.td}>{EVENT_LABELS[e.event_type] || e.event_type}</td>
                    <td style={{ ...styles.td, textAlign: "right", fontWeight: 700 }}>{e.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <span style={styles.subText}>データなし</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, highlight, warn }: { label: string; value: number; highlight?: boolean; warn?: boolean }) {
  return (
    <div style={{ ...styles.statCard, borderColor: highlight ? "#E8734A" : warn ? "#FF3B30" : "#E0E0E0" }}>
      <div style={styles.statLabel}>{label}</div>
      <div style={{ ...styles.statValue, color: highlight ? "#E8734A" : warn ? "#FF3B30" : "#333" }}>
        {value}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 800, margin: "0 auto", padding: 24, fontFamily: "-apple-system, sans-serif" },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 24, color: "#333" },
  loading: { textAlign: "center", padding: 100, color: "#999" },
  error: { textAlign: "center", padding: 100, color: "#FF3B30" },
  cardGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 32 },
  statCard: { border: "2px solid #E0E0E0", borderRadius: 12, padding: 16, textAlign: "center" },
  statLabel: { fontSize: 12, color: "#999", marginBottom: 4 },
  statValue: { fontSize: 28, fontWeight: 800 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: "#333", marginBottom: 12 },
  card: { background: "#F9F9F9", borderRadius: 12, padding: 20 },
  bigNumber: { fontSize: 36, fontWeight: 800, color: "#E8734A" },
  subText: { fontSize: 14, color: "#999" },
  chart: { display: "flex", gap: 4, alignItems: "flex-end", height: 120 },
  chartCol: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center" },
  chartBarWrap: { width: "100%", height: 80, display: "flex", alignItems: "flex-end" },
  chartBar: { width: "100%", background: "#E8734A", borderRadius: 4, minHeight: 2 },
  chartLabel: { fontSize: 10, color: "#999", marginTop: 4 },
  chartValue: { fontSize: 10, fontWeight: 700, color: "#333" },
  table: { width: "100%", borderCollapse: "collapse" },
  td: { padding: "8px 0", borderBottom: "1px solid #EEE", fontSize: 14 },
  modButton: { color: "#FFF", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
};
