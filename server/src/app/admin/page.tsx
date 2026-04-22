"use client";

import { useEffect, useState } from "react";
import styles from "./admin.module.css";

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
      .then((data) => {
        if (data.reports) setReports(data.reports);
      })
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

  if (error) return <div className={styles.error}>{error}</div>;
  if (!stats) return <div className={styles.loading}>読み込み中...</div>;

  const maxDau = Math.max(...stats.daily_dau.map((d) => d.count), 1);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>すれちがいライト 管理ダッシュボード</h1>

      <div className={styles.cardGrid}>
        <Card label="総ユーザー数" value={stats.overview.total_users} />
        <Card label="総すれ違い数" value={stats.overview.total_encounters} />
        <Card label="DAU (今日)" value={stats.overview.dau} highlight />
        <Card label="WAU (7日間)" value={stats.overview.wau} />
        <Card label="MAU (30日間)" value={stats.overview.mau} />
        <Card label="非アクティブ (7日+)" value={stats.overview.inactive_7d} warn />
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>D1継続率</h2>
        <div className={styles.card}>
          {stats.retention.d1_registered > 0 ? (
            <div>
              <span className={styles.bigNumber}>{stats.retention.d1_rate}%</span>
              <span className={styles.subText}>
                {" "}
                ({stats.retention.d1_retained} / {stats.retention.d1_registered})
              </span>
            </div>
          ) : (
            <span className={styles.subText}>昨日の新規登録なし</span>
          )}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>DAU推移 (直近14日)</h2>
        <div className={styles.card}>
          {stats.daily_dau.length > 0 ? (
            <div className={styles.chart}>
              {stats.daily_dau.map((d) => (
                <div key={d.date} className={styles.chartCol}>
                  <div className={styles.chartBarWrap}>
                    <div
                      className={styles.chartBar}
                      style={{ height: `${(d.count / maxDau) * 100}%` }}
                    />
                  </div>
                  <div className={styles.chartLabel}>{d.date.slice(5)}</div>
                  <div className={styles.chartValue}>{d.count}</div>
                </div>
              ))}
            </div>
          ) : (
            <span className={styles.subText}>データなし</span>
          )}
        </div>
      </div>

      {reports.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>通報ユーザー ({reports.length}件)</h2>
          {reports.map((r) => (
            <div
              key={r.user_id}
              className={`${styles.card} ${styles.reportCard} ${
                r.is_suspended ? styles.reportCardSuspended : styles.reportCardPending
              }`}
            >
              <div className={styles.reportRow}>
                <div className={styles.reportMain}>
                  <div className={styles.reportName}>
                    {r.nickname}
                    {r.is_suspended ? (
                      <span className={styles.badgeSuspended}>ひとこと非表示中</span>
                    ) : (
                      <span className={styles.badgePending}>要確認</span>
                    )}
                  </div>
                  <div className={styles.reportMeta}>
                    ID: {r.user_id} / 通報数: {r.report_count}件 (異なるユーザーから)
                  </div>
                  {r.hitokoto ? (
                    <div className={styles.hitokotoBox}>ひとこと: 「{r.hitokoto}」</div>
                  ) : null}
                  <div className={styles.reportReason}>
                    理由: {r.reasons} / 最終通報:{" "}
                    {new Date(r.last_reported_at).toLocaleString("ja-JP")}
                  </div>
                  {r.latest_detail ? (
                    <div className={styles.reportDetail}>詳細: {r.latest_detail}</div>
                  ) : null}
                </div>
                <div>
                  {r.is_suspended ? (
                    <button
                      type="button"
                      onClick={() => handleModAction(r.user_id, "unsuspend")}
                      className={`${styles.modButton} ${styles.modButtonUnsuspend}`}
                    >
                      非表示を解除
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleModAction(r.user_id, "suspend")}
                      className={`${styles.modButton} ${styles.modButtonSuspend}`}
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

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>今日のイベント</h2>
        <div className={styles.card}>
          {stats.today_events.length > 0 ? (
            <table className={styles.table}>
              <tbody>
                {stats.today_events.map((e) => (
                  <tr key={e.event_type}>
                    <td className={styles.td}>
                      {EVENT_LABELS[e.event_type] || e.event_type}
                    </td>
                    <td className={`${styles.td} ${styles.tdNumeric}`}>{e.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <span className={styles.subText}>データなし</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  highlight,
  warn,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  warn?: boolean;
}) {
  return (
    <div
      className={`${styles.statCard} ${
        highlight ? styles.statCardHighlight : warn ? styles.statCardWarn : ""
      }`}
    >
      <div className={styles.statLabel}>{label}</div>
      <div
        className={`${styles.statValue} ${
          highlight ? styles.statValueHighlight : warn ? styles.statValueWarn : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}
