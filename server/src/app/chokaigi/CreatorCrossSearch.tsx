"use client";

import { useMemo, useState } from "react";
import styles from "./chokaigi.module.css";
import { VENUE_GOOGLE_MAPS_URL } from "./lp-content";
import { MAIN_HALLS, SUB_HALLS } from "./venue-map-data";

type CreatorEntry = {
  id: string;
  hallNo: string;
  hallLabel: string;
  code?: string;
  name: string;
  sub?: string;
  mapAnchor: string;
  accountLinks: AccountLink[];
  searchText: string;
};

type AccountLink = {
  label: string;
  href: string;
  kind: "official" | "related" | "search";
};

type RegistryAccountItem = {
  label: string;
  kind?: "official" | "related" | "search";
  handle?: string;
  keyword?: string;
  href?: string;
};

const CREATOR_SECTION_RE = /クリエイター|VOC@LOiD|ボカ|絵師|演奏|音声合成|初音ミク|M@STER/i;

/**
 * ここに直接アカウントを入れると、検索リンクより優先して表示される。
 * key はブースコード優先。コードが無い場合は「HALL番号:名称」で登録できる。
 */
const X_ACCOUNT_REGISTRY: Record<string, RegistryAccountItem[]> = {
  A10: [
    { label: "君斗りんく（公式）", handle: "streamerfunch", kind: "official" },
    { label: "関係者: りんく", keyword: "りんく", kind: "related" },
    { label: "関係者: こん太", keyword: "こん太", kind: "related" },
    { label: "関係者: たぬ姉", keyword: "たぬ姉", kind: "related" },
  ],
  A17: [{ label: "クリプトン公式", handle: "cfm_miku", kind: "official" }],
  "3:A9": [{ label: "ボカロ名刺交換（検索）", keyword: "the_voca", kind: "search" }],
};

/**
 * 検索窓ヒット用の別名（参加者名/ローマ字/企画名）を登録。
 */
const EXTRA_SEARCH_TERMS_REGISTRY: Record<string, string[]> = {
  A10: [
    "君斗",
    "君斗りんく",
    "kimito",
    "kimito-link",
    "kimito link",
    "すれちがいライト",
    "streamerfunch",
    "クリエイター応援",
  ],
};

function normalizeHandle(handle: string) {
  return handle.trim().replace(/^@+/, "");
}

function toXProfileUrl(handle: string) {
  return `https://x.com/${normalizeHandle(handle)}`;
}

function toXUserSearchUrl(keyword: string) {
  const q = encodeURIComponent(`${keyword} 超会議`);
  return `https://x.com/search?q=${q}&src=typed_query&f=user`;
}

function splitKeywords(text?: string) {
  if (!text) return [];
  return text
    .split(/[\/／・×x,，|｜\s]+/)
    .map((v) => v.trim())
    .filter((v) => v.length >= 2 && !/^\d+$/.test(v));
}

function buildRegistryKeys(hallNo: string, code: string | undefined, name: string) {
  const keys: string[] = [];
  if (code) keys.push(code);
  keys.push(`${hallNo}:${name}`);
  return keys;
}

function buildSearchTermsFromRegistry(hallNo: string, code: string | undefined, name: string) {
  return buildRegistryKeys(hallNo, code, name)
    .flatMap((key) => EXTRA_SEARCH_TERMS_REGISTRY[key] ?? [])
    .filter(Boolean);
}

function registryItemToLink(item: RegistryAccountItem): AccountLink | null {
  const kind = item.kind ?? "official";
  if (item.href) {
    return { label: item.label, href: item.href, kind };
  }
  if (item.handle) {
    return { label: item.label, href: toXProfileUrl(item.handle), kind };
  }
  if (item.keyword) {
    return { label: item.label, href: toXUserSearchUrl(item.keyword), kind };
  }
  return null;
}

function dedupeLinks(links: AccountLink[]) {
  const seen = new Set<string>();
  const result: AccountLink[] = [];
  for (const link of links) {
    if (seen.has(link.href)) continue;
    seen.add(link.href);
    result.push(link);
  }
  return result;
}

function buildAccountLinks(
  hallNo: string,
  code: string | undefined,
  name: string,
  sub: string | undefined
): AccountLink[] {
  const registeredItems = buildRegistryKeys(hallNo, code, name).flatMap(
    (key) => X_ACCOUNT_REGISTRY[key] ?? []
  );
  const registered: AccountLink[] = registeredItems
    .map(registryItemToLink)
    .filter((v): v is AccountLink => v !== null);

  const keywords = [name, ...splitKeywords(sub)].slice(0, 6);
  const keywordLinks: AccountLink[] = keywords.map((keyword, idx) => ({
    label: idx === 0 ? `${keyword} をX検索` : `関係者: ${keyword}`,
    href: toXUserSearchUrl(keyword),
    kind: idx === 0 ? "search" : "related",
  }));

  return dedupeLinks([...registered, ...keywordLinks]);
}

function createEntries(): CreatorEntry[] {
  const halls = [...MAIN_HALLS, ...SUB_HALLS];
  const entries: CreatorEntry[] = [];

  for (const hall of halls) {
    for (const section of hall.sections) {
      const candidateText = `${section.name} ${section.sub ?? ""}`;
      const isCreatorRelated =
        section.area === "cc" || CREATOR_SECTION_RE.test(candidateText);
      if (!isCreatorRelated) continue;

      const hallNo = String(hall.no);
      const accountLinks = buildAccountLinks(
        hallNo,
        section.code,
        section.name,
        section.sub
      );

      entries.push({
        id: `${hallNo}-${section.code ?? "no-code"}-${section.name}`,
        hallNo,
        hallLabel: hall.label,
        code: section.code,
        name: section.name,
        sub: section.sub,
        mapAnchor: `#hall-card-${hallNo}`,
        accountLinks,
        searchText: [
          hallNo,
          hall.label,
          section.code ?? "",
          section.name,
          section.sub ?? "",
          ...accountLinks.map((link) => link.label),
          ...buildSearchTermsFromRegistry(hallNo, section.code, section.name),
        ]
          .join(" ")
          .toLowerCase(),
      });
    }
  }

  return entries.sort((a, b) => {
    const hallDiff = Number(a.hallNo) - Number(b.hallNo);
    if (hallDiff !== 0) return hallDiff;
    return a.name.localeCompare(b.name, "ja");
  });
}

const CREATOR_ENTRIES = createEntries();

export function CreatorCrossSearch() {
  const [query, setQuery] = useState("");
  const normalized = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalized) return CREATOR_ENTRIES;
    return CREATOR_ENTRIES.filter((entry) =>
      entry.searchText.includes(normalized)
    );
  }, [normalized]);

  return (
    <section className={styles.creatorSearchWrap} aria-labelledby="creator-cross-search-heading">
      <h3 id="creator-cross-search-heading" className={styles.mapSubheading}>
        参加者・関係者検索（クリエイタークロス）
      </h3>
      <p className={styles.mapFinePrint}>
        参加者名・団体名・ブースコード（例: りんく / A14 / VOCALOID）ですぐ検索できます。結果から該当ホールのカードへジャンプでき、各行のXリンクから公式・関係者アカウント検索やプロフィールへ移動できます。
      </p>

      <div className={styles.creatorSearchControls}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="検索ワードを入力（例: クリエイター / A14 / 絵師）"
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

      <div className={styles.creatorSearchMeta}>
        <span>{filtered.length}件ヒット</span>
        <a
          href={VENUE_GOOGLE_MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.creatorSearchMapLink}
        >
          会場をGoogleマップで開く
        </a>
      </div>

      {filtered.length > 0 ? (
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
              {entry.sub ? (
                <p className={styles.creatorSearchSub}>{entry.sub}</p>
              ) : null}
              <div className={styles.creatorSearchAccounts}>
                {entry.accountLinks.map((link, i) => (
                  <a
                    key={`${entry.id}-${i}-${link.href}`}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.creatorSearchAccountLink} ${
                      link.kind === "official"
                        ? styles.creatorSearchAccountOfficial
                        : link.kind === "related"
                          ? styles.creatorSearchAccountRelated
                          : styles.creatorSearchAccountSearch
                    }`}
                  >
                    {link.label}
                  </a>
                ))}
              </div>
              <div className={styles.creatorSearchLinks}>
                <a href={entry.mapAnchor}>このホールの詳細へ</a>
                <a href="#map-heading">会場マップへ</a>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.creatorSearchEmpty}>
          該当するブースが見つかりませんでした。別のキーワードで試してください。
        </p>
      )}
    </section>
  );
}
