/**
 * 第三者の素材・ライブラリ・API を使っている箇所のクレジット集約。
 *
 * 追加するときは「何を / どこで / ライセンス / 必要な帰属表示」の 4 点セットで
 * 書くこと。特に CC BY-SA / CC BY のように帰属が必須なものは、
 * 表示漏れがないよう `required: true` を明示する。
 */

export type ThirdPartyCredit = {
  /** 画面表示用ラベル */
  label: string;
  /** 種別（画面上のグルーピングにも使う） */
  category: "map" | "data" | "character" | "other";
  /** ライセンス名 */
  license: string;
  /** 帰属表示が必須か */
  required: boolean;
  /** 一次ソース URL */
  href?: string;
  /** どこで使っているか（開発者向けメモ） */
  usedFor?: string;
  /** ライセンス全文ページ（あれば） */
  licenseHref?: string;
  /** 追加の注釈（任意） */
  note?: string;
};

export const THIRD_PARTY_CREDITS: readonly ThirdPartyCredit[] = [
  // ===== 地図・地理データ =====
  {
    label: "Blank map of Japan.svg（Erida539 / Lincun）",
    category: "map",
    license: "CC BY-SA 3.0",
    required: true,
    href: "https://commons.wikimedia.org/wiki/File:Blank_map_of_Japan.svg",
    licenseHref: "https://creativecommons.org/licenses/by-sa/3.0/deed.ja",
    usedFor: "ファーストビュー背景の日本列島シルエット",
    note: "派生物のため、このサイトで再配布する地図シルエット SVG も CC BY-SA 3.0 を継承します。",
  },
  {
    label: "Geolonia 市区町村ポリゴン（Open Reverse Geocoder）",
    category: "data",
    license: "MIT（コード） / CC BY 4.0（データ）",
    required: true,
    href: "https://github.com/geolonia/open-reverse-geocoder",
    licenseHref: "https://github.com/geolonia/open-reverse-geocoder/blob/master/LICENSE",
    usedFor: "クライアントサイド逆ジオコーディング（位置情報 → 市区町村名）",
  },
  {
    label: "Uber H3（h3-js）",
    category: "data",
    license: "Apache License 2.0",
    required: false,
    href: "https://github.com/uber/h3-js",
    licenseHref: "https://www.apache.org/licenses/LICENSE-2.0",
    usedFor: "すれちがい判定のための空間インデックス",
  },

  // ===== キャラクター・アートワーク =====
  {
    label: "りんく・こん太・たぬ姉（オリジナルキャラクター）",
    category: "character",
    license: "本プロジェクトのオリジナル",
    required: false,
    usedFor: "ゆっくり解説 UI のマスコット",
    note: "デザイン提供者の表記がある場合は Special Thanks X ID 一覧を参照。",
  },
] as const;
