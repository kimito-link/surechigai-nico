"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import styles from "./chokaigi.module.css";
import { VENUE_GOOGLE_MAPS_URL } from "./lp-content";
import { YukkuriCreatorTalk } from "./YukkuriCreatorTalk";
import { XHandleYukkuri } from "./XHandleYukkuri";
import type { CreatorCrossSearchApiResponse } from "@/lib/creatorCrossSearch/types";
import { accountKindLabel } from "@/lib/creatorCrossSearch/types";
import { trackProductEvent } from "@/lib/clientAnalytics";
import { CREATOR_SEARCH_HEADING_ID } from "./creatorCrossSearchConstants";

function toXGlobalUserSearchUrl(keyword: string) {
  const q = encodeURIComponent(keyword);
  return `https://x.com/search?q=${q}&src=typed_query&f=user`;
}

const DEFAULT_VISIBLE_COUNT = 60;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scrollCreatorSearchHeadingIntoView() {
  const el = document.getElementById(CREATOR_SEARCH_HEADING_ID);
  if (!el) return;
  const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth";
  requestAnimationFrame(() => {
    setTimeout(() => el.scrollIntoView({ behavior, block: "start" }), 120);
  });
}

export function CreatorCrossSearchImpl() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const creatorParam = searchParams.get("creator")?.trim() ?? "";

  const [query, setQuery] = useState(creatorParam);
  const [hallFilter, setHallFilter] = useState("");
  const [data, setData] = useState<CreatorCrossSearchApiResponse | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === `#${CREATOR_SEARCH_HEADING_ID}`) {
        scrollCreatorSearchHeadingIntoView();
      }
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!pathname.startsWith("/chokaigi")) return;
    if (window.location.hash === `#${CREATOR_SEARCH_HEADING_ID}`) {
      scrollCreatorSearchHeadingIntoView();
    }
  }, [pathname]);

  useEffect(() => {
    setQuery((prev) => (prev === creatorParam ? prev : creatorParam));
    if (creatorParam) {
      scrollCreatorSearchHeadingIntoView();
    }
  }, [creatorParam]);

  const fetchSearch = useCallback(
    async (q: string, hall: string, signal: AbortSignal) => {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (hall) params.set("hall", hall);
      const res = await fetch(`/api/chokaigi/creator-search?${params.toString()}`, {
        signal,
        cache: "no-store",
      });
      if (!res.ok) throw new Error("search failed");
      return (await res.json()) as CreatorCrossSearchApiResponse;
    },
    []
  );

  useEffect(() => {
    const delayMs = query.trim() ? 280 : 0;
    setLoading(true);
    setLoadError(false);

    const ac = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const next = await fetchSearch(query, hallFilter, ac.signal);
        setData(next);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setLoadError(true);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [query, hallFilter, fetchSearch]);

  const normalized = query.trim().toLowerCase();
  const xUserSearchUrl = useMemo(
    () => (normalized ? toXGlobalUserSearchUrl(query.trim()) : ""),
    [normalized, query]
  );

  const filtered = data?.entries ?? [];
  const hallOptions = data?.hallOptions ?? [];
  const totalHits = data?.totalHits ?? 0;
  const isTruncated = data?.isTruncated ?? false;
  const suggestions = data?.suggestions ?? [];
  const xHandleCandidates = data?.xHandleCandidates ?? [];
  const hasMatch = data?.hasMatch ?? true;
  const featuredMatches = data?.featuredMatches ?? 0;

  useEffect(() => {
    if (loading || loadError || !data) return;
    trackProductEvent("creator_search_results", {
      has_query: normalized.length > 0 ? 1 : 0,
      has_hall: hallFilter ? 1 : 0,
      hits: data.totalHits,
    });
  }, [loading, loadError, data, normalized.length, hallFilter]);

  return (
    <>
      <XHandleYukkuri />
      <p className={styles.mapFinePrint}>
        参加者名・団体名・ブースコード（例: 君斗 / りんく / H2 う-20 / VOCALOID）ですぐ検索できます。公式一覧の出展者データを統合し、Xリンクや会場位置へ移動できます。
      </p>

      <div className={styles.creatorSearchControls}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="検索ワードを入力（例: 君斗 / りんく / H3 / ボカロ）"
          className={styles.creatorSearchInput}
          aria-label="クリエイタークロス参加ブース検索"
        />
        <button
          type="button"
          className={styles.creatorSearchClear}
          onClick={() => setQuery("")}
          disabled={!query}
        >
          クリア
        </button>
      </div>
      <div className={styles.creatorSearchHallFilter} role="group" aria-label="ホールで絞り込む">
        <button
          type="button"
          className={`${styles.creatorSearchHallChip} ${!hallFilter ? styles.creatorSearchHallChipActive : ""}`}
          onClick={() => setHallFilter("")}
        >
          全て
        </button>
        {hallOptions.map((opt) => (
          <button
            key={opt.hallNo}
            type="button"
            className={`${styles.creatorSearchHallChip} ${hallFilter === opt.hallNo ? styles.creatorSearchHallChipActive : ""}`}
            onClick={() => setHallFilter((prev) => (prev === opt.hallNo ? "" : opt.hallNo))}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {suggestions.length > 0 ? (
        <ul className={styles.creatorSearchSuggestList} aria-label="検索サジェスト">
          {suggestions.map((s) => (
            <li key={s.key}>
              <button
                type="button"
                className={styles.creatorSearchSuggestBtn}
                onClick={() => setQuery(s.value)}
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className={styles.creatorSearchMeta}>
        <span>
          {loadError ? (
            "読み込みに失敗しました。通信状況を確認して再読み込みしてください。"
          ) : loading ? (
            "読み込み中…"
          ) : (
            <>
              {totalHits}件ヒット
              {isTruncated ? `（先頭${DEFAULT_VISIBLE_COUNT}件を表示）` : ""}
            </>
          )}
        </span>
        <a
          href={VENUE_GOOGLE_MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.creatorSearchMapLink}
        >
          会場をGoogleマップで開く
        </a>
      </div>
      {normalized ? (
        <div className={styles.creatorSearchXPanel}>
          <div className={styles.creatorSearchXHeader}>
            <span className={styles.creatorSearchXTitle}>Xアカウント候補</span>
            <a
              href={xUserSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.creatorSearchXOpen}
            >
              「{query.trim()}」をXで検索
            </a>
          </div>
          {xHandleCandidates.length > 0 ? (
            <div className={styles.creatorSearchXList}>
              {xHandleCandidates.map((item) => (
                <a
                  key={item.handle}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.creatorSearchXChip}
                >
                  @{item.handle}
                </a>
              ))}
            </div>
          ) : (
            <p className={styles.creatorSearchXEmpty}>
              該当候補が少ないため、右側のX検索リンクで広く探してください。
            </p>
          )}
        </div>
      ) : null}
      {!normalized ? (
        <p className={styles.mapFinePrint}>
          参加者数が多いため、未入力時は先頭のみ表示しています。キーワード入力で全件から検索できます。
        </p>
      ) : null}
      {normalized && !hasMatch ? (
        <p className={styles.mapFinePrint}>
          「{query}」の一致が無い場合は、表記ゆれ対策としてひらがな・カタカナ・英字でも試してください。
        </p>
      ) : null}
      {!loading && featuredMatches === 0 ? (
        <p className={styles.mapFinePrint}>君斗りんく関連の検索語も順次追加中です。</p>
      ) : null}

      {!loadError && !loading && filtered.length > 0 ? (
        <ul className={styles.creatorSearchList}>
          {filtered.map((entry) => (
            <li key={entry.id} className={styles.creatorSearchItem}>
              <div className={styles.creatorSearchItemTop}>
                <span className={styles.creatorSearchHall}>{entry.hallLabel}</span>
                {entry.code ? (
                  <span className={styles.creatorSearchCode}>{entry.code}</span>
                ) : null}
              </div>
              <p className={styles.creatorSearchName}>{entry.name}</p>
              {entry.sub ? <p className={styles.creatorSearchSub}>{entry.sub}</p> : null}
              <div className={styles.creatorSearchAccounts}>
                {entry.accountLinks.map((link, i) => (
                  <a
                    key={`${entry.id}-${i}-${link.href}`}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-kind={link.kind}
                    className={`${styles.creatorSearchAccountLink} ${
                      link.kind === "official"
                        ? styles.creatorSearchAccountOfficial
                        : link.kind === "related"
                          ? styles.creatorSearchAccountRelated
                          : styles.creatorSearchAccountSearch
                    }`}
                  >
                    <span className={styles.creatorSearchAccountKind}>
                      {accountKindLabel(link.kind)}
                    </span>
                    <span className={styles.creatorSearchAccountText}>{link.label}</span>
                  </a>
                ))}
              </div>
              <YukkuriCreatorTalk
                creator={{
                  name: entry.name,
                  booth: entry.code,
                  hallLabel: entry.hallLabel,
                  sub: entry.sub,
                  intro: entry.intro,
                }}
              />
              <div className={styles.creatorSearchLinks}>
                {entry.detailUrl ? (
                  <a href={entry.detailUrl} target="_blank" rel="noopener noreferrer">
                    公式詳細へ
                  </a>
                ) : null}
                <a href={`/chokaigi${entry.mapAnchor}`}>このホールの詳細へ</a>
                <a href="/chokaigi#map-heading">会場マップへ</a>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {!loadError && !loading && filtered.length === 0 ? (
        <p className={styles.creatorSearchEmpty}>
          該当するブースが見つかりませんでした。別のキーワードで試してください。
        </p>
      ) : null}
    </>
  );
}
