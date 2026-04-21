"use client";

import { useEffect, useState } from "react";
import { getUuidToken } from "@/lib/clientAuth";
import styles from "../app.module.css";

interface StatsData {
  encounterCount: number;
  streak: number;
}

type StatsProps = {
  authUuid?: string | null;
  /** false の間は API を叩かない（register-direct 完了前の古い UUID 防止） */
  statsReady?: boolean;
};

export default function Stats({
  authUuid,
  statsReady = true,
}: StatsProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!statsReady) {
      setIsLoading(true);
      return;
    }

    let cancelled = false;

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const uuid =
          authUuid !== undefined ? authUuid : getUuidToken();
        if (!uuid) {
          if (!cancelled) {
            setStats({ encounterCount: 0, streak: 0 });
            setIsLoading(false);
          }
          return;
        }

        const [encountersRes, userRes] = await Promise.all([
          fetch("/api/encounters?limit=1000", {
            credentials: "include",
            headers: {
              Authorization: `Bearer uuid:${uuid}`,
            },
          }),
          fetch("/api/users/me", {
            credentials: "include",
            headers: {
              Authorization: `Bearer uuid:${uuid}`,
            },
          }),
        ]);

        const encountersData = encountersRes.ok ? await encountersRes.json() : { encounters: [] };
        const userData = userRes.ok ? await userRes.json() : { user: { streak_count: 0 } };

        const encounterCount = encountersData.encounters?.length || 0;
        const streak = userData.user?.streak_count || 0;

        if (!cancelled) {
          setStats({
            encounterCount,
            streak,
          });
        }
      } catch {
        if (!cancelled) setStats({ encounterCount: 0, streak: 0 });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchStats();
    return () => {
      cancelled = true;
    };
  }, [authUuid, statsReady]);

  if (isLoading) {
    return (
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p>読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.statsGrid}>
      <div className={styles.statCard}>
        <div className={styles.statValue}>{stats?.encounterCount || 0}</div>
        <div className={styles.statLabel}>すれ違い数</div>
      </div>
      <div className={styles.statCard}>
        <div className={styles.statValue}>{stats?.streak || 0}</div>
        <div className={styles.statLabel}>連続日数</div>
      </div>
    </div>
  );
}
