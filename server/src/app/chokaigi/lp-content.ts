/**
 * 超会議 LP のコピー・URL 契約（テストから参照される単一ソース）
 * Next.js 既定は末尾スラッシュなしのため canonical も `/chokaigi` に合わせる。
 */
export const CANONICAL_PATH = "/chokaigi";

/** 本番では NEXT_PUBLIC_SITE_ORIGIN を設定（末尾スラッシュなし・www なし想定） */
export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "https://api.surechigai.app").replace(
    /\/$/,
    ""
  );
}

export function canonicalUrl(): string {
  return `${siteOrigin()}${CANONICAL_PATH}`;
}

/** 公式開催日（ISO 8601）。確定したら埋めると JSON-LD に反映されます。未設定は null。 */
export const EVENT_START_ISO: string | null = null;
export const EVENT_END_ISO: string | null = null;

/** JSON-LD / OG 用の会場名 */
export const EVENT_VENUE_NAME = "幕張メッセ";

/** schema.org Event の名前（LP タイトルより短くてもよい） */
export const JSON_LD_EVENT_NAME = "ニコニコ超会議（すれちがいライト企画予告）";

export const LP_TITLE =
  "ニコニコ超会議｜すれ違い通信（準備中） — すれちがいライト";

export const LP_DESCRIPTION =
  "会場ですれ違った縁を、匿名で短くつなぐ企画の予告ページです。迷子になりにくい案内と、同じ会場のニコニコユーザーとの軽い交信を目指し、終了後は全国のユーザーともつながれる発展を視野に入れます。近接マッチングには参加中の位置情報（一定間隔の送信・バックグラウンド更新を含む）が必要です。りんく・こん太・たぬ姉の3人がゆっくりガイドします。";

export const HERO_HEADING = "超会議で、すれ違った人とひとこと";

export const HERO_LEAD =
  "すれ違い検出には、会期中に端末から位置情報を継続的に送る設計が前提です（秒単位のトラッキングではなく、マッチング用の間欠送信・既存アプリと同様の扱いを想定）。会場が広くてもエリアを頼りに迷子になりにくくし、同じニコニコユーザー同士が匿名でひとこと交信できる導線を整えます。超会議が終わったあとも、みんなで全国どこからでもゆるくつながれたらうれしい——その先を見据えて設計します。";

export const VENUE_SECTION_TITLE = "会場でも迷子にならない・ニコニコユーザーと交信";

export const VENUE_SECTION_INTRO =
  "超会議は広いので、まずは公式の会場案内や掲示を確認し、集合ポイントを決めておくのがおすすめです。本企画では、粗いエリア表示とすれ違いマッチを組み合わせ、同じ空気の中にいるニコニコユーザーと、負担の少ない形でつながれることを目指します。";

export const AFTER_EVENT_SECTION_TITLE = "超会議のあとも——全国でつながりたい";

export const AFTER_EVENT_SECTION_BODY =
  "イベントが終わったあとも、同じニコニコ文化が好きな人たちが、あとから全国どこからでもすれ違いやひとことを通じてつながれたらうれしい、という想いがあります。実装の段階や範囲は追って整理しますが、まずは会場内の体験を大切にしつつ、その先の広がりも視野に入れます。";

/** 会場セクションの箇条書き（公開時に公式マップURL等を追記可能） */
export const VENUE_SECTION_POINTS = [
  "ホール・ブロック名・目印（看板・柱番号など）をメモしておくと迷子になりにくいです。",
  "すれ違いは匿名・短文を基本にし、相手のペースを尊重します。",
] as const;

/** public に置いた会場フロアマップ（アプリと同じパス） */
export const VENUE_MAP_PDF_PATH = "/chokaigi/map/chokaigi2026_map.pdf";

export const MAP_SECTION_TITLE = "会場マップの見方";

/** セクション冒頭（1段落） */
export const MAP_SECTION_INTRO =
  "迷子になりにくい順番はこの3ステップです。②で公式PDFの詳細を確認し、③でホール別一覧を見て、①の概略図で位置関係を補うのが最短です。当日の掲示・案内はいつも最優先です。";

/** 手順（番号付きリスト） */
export const MAP_QUICK_STEPS = [
  "まずは②の公式PDFを開き、ピンチズームで詳細を確認するのが会場では最短です。",
  "③のホール別一覧で「どのホールに何があるか」を頭に入れておく。",
  "①の概略図で「メイン棟 / 9-11 / イベントホール」の位置関係をざっくり把握する。",
  "会場内の看板・スタッフの指示があれば、それに従う。",
] as const;

/** ホール別一覧セクションの見出し・説明 */
export const MAP_HALL_LIST_TITLE = "③ ホール別ガイド（一覧・検索できます）";
export const MAP_HALL_LIST_NOTE =
  "スマートフォンで地図の細部を読むのは大変なので、テキストで一覧にしました。代表表示は公式PDFの掲載内容をもとにした目安です。各カードの「全ブースを見る」で詳細が開きます。ブラウザの検索（Ctrl/⌘+F）でブース名を探せます。";

export const MAP_SCHEMATIC_TITLE = "① ゾーンのイメージ（概略図）";

export const MAP_SCHEMATIC_NOTE =
  "色分けは目安です。スマホでは文字が小さくなるので、正確な位置は②のPDFまたは③のホール別一覧をご覧ください。";

export const MAP_PDF_TITLE = "② 公式の会場マップ（PDF）";

export const MAP_PDF_NOTE =
  "主催配布のPDFと同じファイルです。会場では「別タブで開く」または「保存」を優先してください。";

export const MAP_PDF_PRIMARY_CTA_LABEL = "公式PDFを開く（別タブ・推奨）";
export const MAP_PDF_SECONDARY_CTA_LABEL = "ファイルを保存";
export const MAP_PDF_MOBILE_EMPHASIS =
  "モバイルではページ内埋め込みより、上のボタンから公式PDFを直接開くほうが安定します。";
export const MAP_PDF_DESKTOP_DETAILS_SUMMARY =
  "PC向け: このページ内にPDFを表示する（重い場合があります）";
export const MAP_PDF_DESKTOP_DETAILS_NOTE =
  "ページ内表示はデスクトップ向けの補助機能です。正確な情報は公式PDFを別タブで確認してください。";

export const HALL_GUIDE_NOTE =
  "各ホールの概要・代表表示は公式PDFの掲載名をもとにした目安です。最終確認は公式PDF・会場掲示でお願いします。";

export const HALL_SUMMARIES: Record<string, string> = {
  "1": "超踊ってみた・超歌ってみた・休憩所（目安）",
  "2": "超物販・THE VOC@LOiD 超 M@STER・自衛隊（目安）",
  "3": "超スペシャルステージ・クリエイター系（目安）",
  "4": "KADOKAWA・超インフォ・中央エントランス（目安）",
  "5": "フード/体験集中エリア・大学系企画（目安）",
  "6": "超カレー・超ニコニコ盆踊り・Google Play（目安）",
  "7": "超「#コンパス」・超神社・超コスプレ（目安）",
  "8": "超音楽祭・超配信者・クリエイタークロス（目安）",
  "9": "ゲームメインステージ・マイクラスクエア（目安）",
  "10": "超デスゲーム・REAL AKIBA・超ポーカー（目安）",
  "11": "超ヤバシティ2026・ペイディコーナー（目安）",
  event: "超ボカニコ2026・超スキマ勇者・超しりとり『バベル』（目安）",
};

export function venueMapPdfAbsoluteUrl(): string {
  return `${siteOrigin()}${VENUE_MAP_PDF_PATH}`;
}

/** public/chokaigi/logos/（ニコニコ超会議 クリエイタークロス公式ロゴ・RGB） */
export const LOGO_CREATOR_CROSS_VERTICAL_SRC =
  "/chokaigi/logos/creator-cross-vertical.png";
export const LOGO_CREATOR_CROSS_HORIZONTAL_SRC =
  "/chokaigi/logos/creator-cross-horizontal.png";
export const LOGO_CREATOR_CROSS_ALT =
  "ニコニコ超会議 クリエイタークロス";

/** kimito-link 公式ロゴ（RGB・public/chokaigi/logos に配置） */
export const LOGO_KIMITO_LINK_SRC = "/chokaigi/logos/kimito-link-logo.png";
export const LOGO_KIMITO_LINK_ALT = "Kimito-Link（君斗りんく）";
export const LOGO_KIMITO_LINK_WIDTH = 800;
export const LOGO_KIMITO_LINK_HEIGHT = 600;

/** public/ 配下の立ち絵（kimito-link 由来・smile-mouth-open） */
export const GUIDES = [
  {
    name: "りんく",
    role: "企画・ルールの案内",
    body: "参加の流れや、会場でのマナーをやさしく説明します。",
    imageSrc: "/chokaigi/yukkuri/rink.png",
    profileUrl: "https://kimito-link.com/yukkurilink/",
  },
  {
    name: "こん太",
    role: "ファン目線のひとこと",
    body: "話しかけたくなる気持ちに寄り添う例や、短文のコツを出します。",
    imageSrc: "/chokaigi/yukkuri/konta.png",
    profileUrl: "https://kimito-link.com/yukkurikonta/",
  },
  {
    name: "たぬ姉",
    role: "匿名と安全のガイド",
    body: "位置はグリッド丸めなどで粗く扱い、不要な第三者共有はしません。ブロック・通報も説明します。",
    imageSrc: "/chokaigi/yukkuri/tanunee.png",
    profileUrl: "https://kimito-link.com/yukkuritanunee/",
  },
] as const;
