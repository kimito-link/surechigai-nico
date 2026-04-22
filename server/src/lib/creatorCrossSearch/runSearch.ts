import { MAIN_HALLS, SUB_HALLS } from "@/app/chokaigi/venue-map-data";
import { OFFICIAL_CREATORCROSS_ENTRIES } from "@/app/chokaigi/creatorcross-official-data";
import type {
  CreatorCrossSearchApiResponse,
  CreatorCrossSearchEntryDto,
  HallOptionDto,
  SearchSuggestionDto,
  XHandleCandidateDto,
} from "./types";

type CreatorEntry = {
  id: string;
  hallNo: string;
  hallLabel: string;
  code?: string;
  name: string;
  sub?: string;
  intro?: string;
  mapAnchor: string;
  accountLinks: Array<{
    label: string;
    href: string;
    kind: "official" | "related" | "search";
  }>;
  detailUrl?: string;
  searchText: string;
};

type AccountLink = CreatorEntry["accountLinks"][number];

type RegistryAccountItem = {
  label: string;
  kind?: "official" | "related" | "search";
  handle?: string;
  keyword?: string;
  href?: string;
};

const CREATOR_SECTION_RE = /クリエイター|VOC@LOiD|ボカ|絵師|演奏|音声合成|初音ミク|M@STER/i;
const DEFAULT_VISIBLE_COUNT = 60;
const SUGGESTION_LIMIT = 12;

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

function sortAccountLinks(links: AccountLink[]) {
  const rank: Record<AccountLink["kind"], number> = {
    official: 0,
    related: 1,
    search: 2,
  };

  return [...links].sort((a, b) => rank[a.kind] - rank[b.kind]);
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

  return sortAccountLinks(dedupeLinks([...registered, ...keywordLinks]));
}

function extractXHandleFromUrl(href: string) {
  try {
    const url = new URL(href);
    const host = url.hostname.toLowerCase();
    const isXHost =
      host === "x.com" ||
      host === "www.x.com" ||
      host === "twitter.com" ||
      host === "www.twitter.com";
    if (!isXHost) return "";

    const first = url.pathname.split("/").filter(Boolean)[0] ?? "";
    if (!first) return "";
    const blocked = new Set([
      "home",
      "search",
      "explore",
      "settings",
      "messages",
      "notifications",
      "i",
      "intent",
      "share",
      "hashtag",
    ]);
    if (blocked.has(first.toLowerCase())) return "";

    return normalizeHandle(first);
  } catch {
    return "";
  }
}

function buildOfficialAccountLinks(
  links: Array<{ label: string; href: string; handle: string }>,
  name: string
) {
  const mapped: AccountLink[] = [];
  for (const link of links) {
    const explicit = normalizeHandle(link.handle ?? "");
    const inferred = extractXHandleFromUrl(link.href);
    const handle = explicit || inferred;
    if (!handle) continue;
    mapped.push({
      label: `X: @${handle}`,
      href: toXProfileUrl(handle),
      kind: "official",
    });
  }

  if (mapped.length === 0) {
    mapped.push({
      label: `${name} をX検索`,
      href: toXUserSearchUrl(name),
      kind: "search",
    });
  }

  return dedupeLinks(mapped).slice(0, 4);
}

function hallSortValue(hallNo: string) {
  const n = Number(hallNo);
  return Number.isFinite(n) && n > 0 ? n : 99;
}

function createMapEntries(): CreatorEntry[] {
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

  return entries;
}

function createOfficialEntries(): CreatorEntry[] {
  return OFFICIAL_CREATORCROSS_ENTRIES.map((item) => {
    const hallNo = item.hallNo || "";
    const hallLabel = hallNo ? `HALL ${hallNo}` : "クリエイタークロス";
    const sub = [item.genre.join(" / "), item.days.join("・")]
      .filter(Boolean)
      .join(" ｜ ");
    const accountLinks = buildOfficialAccountLinks(item.links, item.name);

    return {
      id: `official-${item.id}`,
      hallNo,
      hallLabel,
      code: item.booth || undefined,
      name: item.name,
      sub: sub || undefined,
      mapAnchor: hallNo ? `#hall-card-${hallNo}` : "#map-heading",
      accountLinks,
      intro: item.intro || undefined,
      detailUrl: item.detailUrl,
      searchText: [
        hallNo,
        hallLabel,
        item.booth,
        item.name,
        item.intro,
        ...item.genre,
        ...item.categories,
        ...item.days,
        ...accountLinks.map((v) => v.label),
      ]
        .join(" ")
        .toLowerCase(),
    };
  });
}

let cachedEntries: CreatorEntry[] | null = null;
let cachedHallOptions: HallOptionDto[] | null = null;

function getCreatorEntries(): CreatorEntry[] {
  if (!cachedEntries) {
    cachedEntries = [...createMapEntries(), ...createOfficialEntries()].sort((a, b) => {
      const hallDiff = hallSortValue(a.hallNo) - hallSortValue(b.hallNo);
      if (hallDiff !== 0) return hallDiff;
      return a.name.localeCompare(b.name, "ja");
    });
    cachedHallOptions = Array.from(
      new Map(
        cachedEntries
          .filter((e) => e.hallNo)
          .map((e) => [e.hallNo, { hallNo: e.hallNo, label: e.hallLabel }])
      ).values()
    ).sort((a, b) => hallSortValue(a.hallNo) - hallSortValue(b.hallNo));
  }
  return cachedEntries;
}

function getHallOptions(): HallOptionDto[] {
  getCreatorEntries();
  return cachedHallOptions ?? [];
}

function toEntryDto(entry: CreatorEntry): CreatorCrossSearchEntryDto {
  return {
    id: entry.id,
    hallNo: entry.hallNo,
    hallLabel: entry.hallLabel,
    code: entry.code,
    name: entry.name,
    sub: entry.sub,
    intro: entry.intro,
    mapAnchor: entry.mapAnchor,
    accountLinks: entry.accountLinks,
    detailUrl: entry.detailUrl,
  };
}

function buildSuggestions(
  CREATOR_ENTRIES: CreatorEntry[],
  normalized: string,
  normalizedWithoutAt: string
): SearchSuggestionDto[] {
  if (!normalized) return [];

  const byKey = new Map<string, SearchSuggestionDto>();
  const addSuggestion = (s: SearchSuggestionDto) => {
    if (byKey.has(s.key)) return;
    byKey.set(s.key, s);
  };

  for (const entry of CREATOR_ENTRIES) {
    if (
      entry.name.toLowerCase().includes(normalized) ||
      entry.searchText.includes(normalized)
    ) {
      addSuggestion({
        key: `name:${entry.name.toLowerCase()}`,
        value: entry.name,
        label: `参加者: ${entry.name}`,
        kind: "name",
      });
    }

    if (entry.code && entry.code.toLowerCase().includes(normalized)) {
      addSuggestion({
        key: `booth:${entry.code.toLowerCase()}`,
        value: entry.code,
        label: `ブース: ${entry.code}`,
        kind: "booth",
      });
    }

    for (const link of entry.accountLinks) {
      const handle = extractXHandleFromUrl(link.href);
      if (!handle) continue;
      if (!handle.toLowerCase().includes(normalizedWithoutAt)) continue;
      addSuggestion({
        key: `x:${handle.toLowerCase()}`,
        value: `@${handle}`,
        label: `X: @${handle}`,
        kind: "x",
      });
    }

    if (byKey.size >= SUGGESTION_LIMIT * 3) break;
  }

  const kindRank: Record<SearchSuggestionDto["kind"], number> = {
    x: 0,
    name: 1,
    booth: 2,
  };

  return [...byKey.values()]
    .sort((a, b) => {
      const k = kindRank[a.kind] - kindRank[b.kind];
      if (k !== 0) return k;
      return a.value.localeCompare(b.value, "ja");
    })
    .slice(0, SUGGESTION_LIMIT);
}

function buildXHandleCandidates(allMatched: CreatorEntry[]): XHandleCandidateDto[] {
  const counter = new Map<string, XHandleCandidateDto>();

  for (const entry of allMatched) {
    for (const link of entry.accountLinks) {
      const handle = extractXHandleFromUrl(link.href);
      if (!handle) continue;
      const key = handle.toLowerCase();
      const current = counter.get(key);
      if (current) {
        current.count += 1;
      } else {
        counter.set(key, {
          handle,
          href: toXProfileUrl(handle),
          count: 1,
        });
      }
    }
  }

  return [...counter.values()]
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.handle.localeCompare(b.handle, "ja");
    })
    .slice(0, 16);
}

export function runCreatorCrossSearch(qRaw: string, hallRaw: string): CreatorCrossSearchApiResponse {
  const CREATOR_ENTRIES = getCreatorEntries();
  const HALL_OPTIONS = getHallOptions();

  const normalized = qRaw.trim().toLowerCase();
  const normalizedWithoutAt = normalized.replace(/^@+/, "");
  const hallFilter = hallRaw.trim();

  let pool = normalized
    ? CREATOR_ENTRIES.filter((entry) => entry.searchText.includes(normalized))
    : CREATOR_ENTRIES;

  if (hallFilter) {
    pool = pool.filter((entry) => entry.hallNo === hallFilter);
  }

  const isFiltered = Boolean(normalized || hallFilter);
  const visible = isFiltered ? pool : pool.slice(0, DEFAULT_VISIBLE_COUNT);

  const allMatched = pool;
  const suggestions = buildSuggestions(CREATOR_ENTRIES, normalized, normalizedWithoutAt);
  const xHandleCandidates = normalized ? buildXHandleCandidates(allMatched) : [];

  const hasMatch = normalized
    ? CREATOR_ENTRIES.some((entry) => entry.searchText.includes(normalized))
    : true;

  const featuredMatches = CREATOR_ENTRIES.filter((entry) =>
    entry.searchText.includes("君斗".toLowerCase())
  ).length;

  return {
    entries: visible.map(toEntryDto),
    hallOptions: HALL_OPTIONS,
    totalHits: pool.length,
    isTruncated: !isFiltered && pool.length > visible.length,
    suggestions,
    xHandleCandidates,
    hasMatch,
    featuredMatches,
  };
}
