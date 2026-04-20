import { useState, useCallback } from "react";
import { getEncounters } from "../lib/api";
import { useAppStore } from "../store";

export function useEncounters() {
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { encounters, setEncounters, addEncounters, isLoading, setLoading } = useAppStore();

  const loadEncounters = useCallback(async (reset = false) => {
    if (isLoading) return;
    setLoading(true);

    try {
      const targetPage = reset ? 1 : page;
      const result = await getEncounters(targetPage);

      if (reset) {
        setEncounters(result.encounters);
        setPage(2);
      } else {
        addEncounters(result.encounters);
        setPage((p) => p + 1);
      }

      setHasMore(result.encounters.length >= result.limit);
    } catch (error) {
      console.error("すれちがい取得エラー:", error);
    } finally {
      setLoading(false);
    }
  }, [page, isLoading, setEncounters, addEncounters, setLoading]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadEncounters(true);
    setRefreshing(false);
  }, [loadEncounters]);

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      loadEncounters(false);
    }
  }, [hasMore, isLoading, loadEncounters]);

  return { encounters, refresh, loadMore, refreshing, isLoading, hasMore };
}
