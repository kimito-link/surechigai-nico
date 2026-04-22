"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getUuidToken } from "@/lib/clientAuth";
import EncounterCard, { type EncounterRow } from "../components/EncounterCard";
import styles from "../app.module.css";

const PAGE_SIZE = 20;

type TierFilter = "all" | "1" | "2" | "3" | "4" | "5";

export default function HistoryPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [encounters, setEncounters] = useState<EncounterRow[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  const fetchPage = useCallback(async (targetPage: number, append: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const uuid = getUuidToken();
      if (!uuid) {
        setError("認証情報が取得できませんでした。ページを再読み込みしてください。");
        setLoading(false);
        return;
      }
      const res = await fetch(
        `/api/encounters?page=${targetPage}&limit=${PAGE_SIZE}`,
        {
          credentials: "include",
          headers: { Authorization: `Bearer uuid:${uuid}` },
        }
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as { encounters: EncounterRow[] };
      const rows = data.encounters ?? [];
      setHasMore(rows.length === PAGE_SIZE);
      setEncounters((prev) => (append ? [...prev, ...rows] : rows));
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    fetchPage(1, false);
    setPage(1);
  }, [isSignedIn, fetchPage]);

  const filtered =
    tierFilter === "all"
      ? encounters
      : encounters.filter((e) => String(e.tier) === tierFilter);

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPage(next, true);
  };

  if (!isLoaded) {
    return <div className={styles.container}><p>読み込み中...</p></div>;
  }
  if (!isSignedIn) return null;

  return (
    <div className={styles.container}>
      <div className={styles.historyHeader}>
        <Link href="/app" className={styles.historyBackLink}>
          ← ダッシュボードに戻る
        </Link>
        <h1 className={styles.historyTitle}>すれちがい図鑑</h1>
        <p className={styles.historyLead}>
          あなたとすれちがった人の記録です。今日の出会いも、1 年後に思い出せます。
        </p>
      </div>

      <div className={styles.historyFilters} role="tablist" aria-label="すれちがい種別フィルタ">
        {(
          [
            ["all", "すべて"],
            ["1", "すれ違い"],
            ["2", "ご近所"],
            ["3", "同じ街"],
            ["4", "同じ地域"],
            ["5", "おさんぽ"],
          ] as Array<[TierFilter, string]>
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tierFilter === value}
            className={`${styles.historyFilter} ${tierFilter === value ? styles.historyFilterActive : ""}`}
            onClick={() => setTierFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className={styles.errorMessage}>{error}</p>}

      {filtered.length === 0 && !loading && (
        <div className={styles.historyEmpty}>
          <p className={styles.historyEmptyLead}>まだすれちがいがありません</p>
          <p className={styles.historyEmptyHint}>
            位置情報を送信して誰かとすれちがうと、ここに記録されます。
          </p>
          <Link href="/app" className={styles.historyEmptyCta}>
            位置情報を送信する
          </Link>
        </div>
      )}

      {filtered.length > 0 && (
        <div className={styles.encounterGrid}>
          {filtered.map((e) => (
            <EncounterCard key={e.id} encounter={e} />
          ))}
        </div>
      )}

      <div className={styles.historyFooter}>
        {loading && <p className={styles.historyLoading}>読み込み中...</p>}
        {!loading && hasMore && encounters.length > 0 && (
          <button
            type="button"
            className={styles.historyLoadMore}
            onClick={handleLoadMore}
          >
            さらに読み込む
          </button>
        )}
        {!hasMore && encounters.length > 0 && (
          <p className={styles.historyEnd}>— すべての記録を表示しました —</p>
        )}
      </div>
    </div>
  );
}
