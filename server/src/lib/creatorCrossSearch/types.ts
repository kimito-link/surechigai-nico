export type AccountLinkKind = "official" | "related" | "search";

export type CreatorCrossSearchAccountLink = {
  label: string;
  href: string;
  kind: AccountLinkKind;
};

export type CreatorCrossSearchEntryDto = {
  id: string;
  hallNo: string;
  hallLabel: string;
  code?: string;
  name: string;
  sub?: string;
  intro?: string;
  mapAnchor: string;
  accountLinks: CreatorCrossSearchAccountLink[];
  detailUrl?: string;
};

export type SearchSuggestionDto = {
  key: string;
  value: string;
  label: string;
  kind: "name" | "booth" | "x";
};

export type XHandleCandidateDto = {
  handle: string;
  href: string;
  count: number;
};

export type HallOptionDto = {
  hallNo: string;
  label: string;
};

export type CreatorCrossSearchApiResponse = {
  entries: CreatorCrossSearchEntryDto[];
  hallOptions: HallOptionDto[];
  totalHits: number;
  isTruncated: boolean;
  suggestions: SearchSuggestionDto[];
  xHandleCandidates: XHandleCandidateDto[];
  hasMatch: boolean;
  featuredMatches: number;
};

export function accountKindLabel(kind: AccountLinkKind): string {
  switch (kind) {
    case "official":
      return "公式";
    case "related":
      return "関係者";
    case "search":
      return "検索";
  }
}
