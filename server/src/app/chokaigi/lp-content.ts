/**
 * 超会議 LP のコピー・URL 契約（テストから参照される単一ソース）
 * Next.js 既定は末尾スラッシュなしのため canonical も `/chokaigi` に合わせる。
 */
export const CANONICAL_PATH = "/chokaigi";

const DEFAULT_SITE_ORIGIN = "https://api.surechigai.app";

/**
 * 本番では NEXT_PUBLIC_SITE_ORIGIN を設定（末尾スラッシュなし・www なし想定）。
 * 空文字・空白のみ・不正な URL だと layout の metadataBase が例外になり 500 になるためフォールバックする。
 */
export function siteOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_ORIGIN ?? DEFAULT_SITE_ORIGIN).trim();
  const withoutSlash = raw.replace(/\/$/, "");
  if (!withoutSlash) {
    return DEFAULT_SITE_ORIGIN;
  }
  try {
    const u = new URL(withoutSlash);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return DEFAULT_SITE_ORIGIN;
    }
    return withoutSlash;
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }
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

/** ゆっくり掛け合いセクション */
export const YUKKURI_DIALOGUE_TITLE = "ゆっくり超解説（このLPとアプリの話）";

export const YUKKURI_DIALOGUE_LEAD =
  "下の掛け合いは、動画のゆっくり解説っぽく読めるようにしたものです。りんくが全体、こん太がワクワク、たぬ姉が現実を補足——の三段オチもどきです。細かい仕様は公開時に更新される場合があります。";

export type YukkuriSpeakerId = "rink" | "konta" | "tanunee";

export const YUKKURI_MAIN_SCRIPT: ReadonlyArray<{
  speaker: YukkuriSpeakerId;
  text: string;
}> = [
  {
    speaker: "rink",
    text: "どうも、企画の流れを説明するりんくです。ここは「ニコニコ超会議」向けの、すれちがいライトの予告ページだよ。長くなるから、飲み物用意してね。",
  },
  {
    speaker: "konta",
    text: "こん太だよ。同じ会場にいるニコニコユーザーと、すれ違いっぽい縁をつないで、短いメッセージが送れたらいいな、って話。ワクワクするよね。",
  },
  {
    speaker: "tanunee",
    text: "たぬ姉よ。ワクワクは分かるけど、まずは落ち着いて。補足だけど、位置はマッチング用に粗く扱う前提。秒単位で人を追うアプリじゃないから、そのへんはページ下のプライバシーも読んでちょうだい。",
  },
  {
    speaker: "konta",
    text: "たぬ姉さん、厳しい……！でも分かる。推し活の熱で全部許そうとしてる自分がいるから、ルールは大事だね。",
  },
  {
    speaker: "rink",
    text: "スマホアプリ「すれちがいライト」側では、会期中は位置の送信やバックグラウンド更新が入る想定だよ。あと、すれ違いの検出や、匿名のやりとり、ゆっくりの僕たちのガイド表示なんかもここに載せていく予定。",
  },
  {
    speaker: "konta",
    text: "アプリを開いて参加モードに入るイメージだね。推しのブースに向かう横で、「今同じ空気吸ってるニコ厨いたらうれしい」みたいな。長文じゃなくてひとことで十分、がコンセプトに近いかな。",
  },
  {
    speaker: "tanunee",
    text: "「ひとこと」って言っても、相手の迷惑にならない範囲よ。ブロックや通報、オプトアウトの話は、本番公開のときにちゃんと画面に出すわ。ここでは方針だけ掴んでおいて。",
  },
  {
    speaker: "rink",
    text: "三人で言い足りないことは、公開時に追記していくね。質問が増えたら、FAQ 的にまとめるのもアリかも。",
  },
  {
    speaker: "konta",
    text: "幕張広いし、歩くだけで体力ゲージ削れるよね……。だからこそ、マップ頼りは正義。",
  },
  {
    speaker: "rink",
    text: "このページの真ん中あたりから先は、会場マップの話。スマホだと細かい地図は読みづらいから、公式PDFを開くボタンを最初に置いてあるよ。",
  },
  {
    speaker: "tanunee",
    text: "「PDF が一番正」は忘れないで。画面のスクショより、公式が更新した版を見るのが安全よ。",
  },
  {
    speaker: "konta",
    text: "ホール別の一覧もあるから、Ctrl+F とかでブース名を探せる。迷子対策に、ホール番号だけメモっておくのもアリ。……僕、去年ロビーで三回方向転換したからね。",
  },
  {
    speaker: "rink",
    text: "③の「ホール別ガイド」では、国際展示場の HALL 1〜8 をカードで並べてあるよ。メイン棟・2F のイメージで、各カードに概要と代表ブースが載るから、スマホでも一覧だけは読みやすいはず。",
  },
  {
    speaker: "konta",
    text: "例えば HALL 1 は、超踊ってみた・超歌ってみた系のステージに、休憩スペースや「とりあえず」休憩所みたいなネーミングのエリアもあるって。踊り歌いのあとはちゃんと休もうね。",
  },
  {
    speaker: "tanunee",
    text: "ステージ名や A1・A11 みたいなブロック表記は、このページの目安よ。細かい位置づけは②の公式PDFと、当日の掲示を見てちょうだい。",
  },
  {
    speaker: "konta",
    text: "HALL 2 は超物販に、THE VOC@LOiD 超 M@STER とか、自衛隊のブースもあるの。物販列、心の準備しておこう……。",
  },
  {
    speaker: "rink",
    text: "HALL 3 には超スペシャルステージがあって、クリエイター系のエリアもまとまってるから、「どのホールに何があるか」をここでざっくり頭に入れておくと動きやすいよ。",
  },
  {
    speaker: "tanunee",
    text: "HALL 4 は KADOKAWA や超インフォ、中央エントランス近辺。迷子になったら、まず情報を取りに行くのも手よ。歩きっぱなしは危ないから、水分補給と休憩も忘れないでね。",
  },
  {
    speaker: "rink",
    text: "一番下のほうに、ゾーンの概略図（SVG）もあるよ。スマホだと折りたたみになってるから、全体の位置関係を見たいときに開いてね。",
  },
  {
    speaker: "konta",
    text: "SVG 開いた瞬間「あ、ここにいたのか」ってなるやつ。わかる人にはわかる。",
  },
  {
    speaker: "tanunee",
    text: "PDFのブース位置は必ず公式の図面で確認して。ここにあるのは「迷子になりにくいための目安」よ。当日の掲示が最優先。",
  },
  {
    speaker: "rink",
    text: "最後にまとめると——近くにいるニコニコユーザーと、軽くつながるための予告ページ。細部はこれからも更新していくから、たまに覗いてちょうだい。",
  },
  {
    speaker: "konta",
    text: "会場で会えたらうれしいな、くらいのテンションで頼むよ。無理な追っかけはナシで！",
  },
  {
    speaker: "tanunee",
    text: "その意見に一票。……それじゃ、下にスクロールして、マップとホール一覧をゆっくり見ていってちょうだい。",
  },
];

export const VENUE_SECTION_TITLE = "会場でも迷子にならない・ニコニコユーザーと交信";

export const VENUE_SECTION_INTRO =
  "超会議は広いので、まずは公式の会場案内や掲示を確認し、集合ポイントを決めておくのがおすすめです。本企画では、粗いエリア表示とすれ違いマッチを組み合わせ、同じ空気の中にいるニコニコユーザーと、負担の少ない形でつながれることを目指します。";

export const AFTER_EVENT_SECTION_TITLE = "超会議のあとも——全国でつながりたい";

export const AFTER_EVENT_SECTION_BODY =
  "イベントが終わったあとも、同じニコニコ文化が好きな人たちが、あとから全国どこからでもすれ違いやひとことを通じてつながれたらうれしい、という想いがあります。実装の段階や範囲は追って整理しますが、まずは会場内の体験を大切にしつつ、その先の広がりも視野に入れます。";

/** すれ違い通信セクション（ページ内アンカー） */
export const USAGE_SECTION_HEADING_ID = "usage-heading";

export const USAGE_SECTION_TITLE = "すれ違い通信の使いかた（イメージ）";

export const USAGE_SECTION_INTRO =
  "会期中にスマホアプリ「すれちがいライト」から参加し、近くを通ったニコニコユーザー同士でつながる流れのたたき台です。画面・文言・手順の細部は公開版で変わる場合があります。";

/** 番号付きの流れ（公開時にアプリのオンボーディングと揃える想定） */
export const USAGE_STEPS = [
  "アプリを開き、案内にしたがって参加（会期中のすれ違い検出）をオンにします。",
  "端末から位置情報を一定間隔で送り、マッチング用に粗く扱われます（秒単位で相手を追いかける用途ではありません）。",
  "すれ違いが検出されると、同じ会場の空気を共有しているニコニコユーザーと匿名でマッチする想定です。",
  "届いたメッセージは短くやりとりし、長文やしつこい連投は避けます。気分が乗らなければ無視してかまいません。",
  "ブロック・通報・オプトアウトなど、自分のペースを守る導線は本番アプリに用意します。",
] as const;

export const USAGE_FOOTNOTE =
  "本サイトは企画予告です。API の稼働・アプリの配信・ストアの案内は、公開時のお知らせを優先してください。";

/** ルート / の短い要約（詳細は /chokaigi へ） */
export const HOME_USAGE_SECTION_TITLE = "すれ違い通信のひとこと";

export const HOME_USAGE_SECTION_INTRO =
  "会場ですれ違ったニコニコユーザーと、匿名で短いメッセージを交わすイメージです。細部は公開版に合わせて更新します。";

export const HOME_USAGE_HIGHLIGHTS = [
  "アプリで参加し、会期中だけ位置を間欠送信（マッチング用・粗い位置に丸めて扱います）。",
  "近くを通った人とマッチしたら、短文でひとこと。相手のペースを尊重します。",
] as const;

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

/** ③直下：掛け合いは別セクション（YukkuriDialogue）にあることを明示（リンク文言は page で挿入） */
export const MAP_HALL_LIST_DIALOGUE_HINT_BEFORE =
  "掛け合い（りんく・こん太・たぬ姉）はページ上部の";
export const MAP_HALL_LIST_DIALOGUE_HINT_AFTER =
  "にあります。ここ（下のカード）は公式PDFベースの一覧のみです。";

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

/** ゆっくり掛け合い（立ち絵は GUIDES と同一パス） */
export const YUKKURI_SPEAKER_META: Record<
  YukkuriSpeakerId,
  { label: string; imageSrc: string; imageAlt: string }
> = {
  rink: {
    label: GUIDES[0].name,
    imageSrc: GUIDES[0].imageSrc,
    imageAlt: "りんくのゆっくり立ち絵",
  },
  konta: {
    label: GUIDES[1].name,
    imageSrc: GUIDES[1].imageSrc,
    imageAlt: "こん太のゆっくり立ち絵",
  },
  tanunee: {
    label: GUIDES[2].name,
    imageSrc: GUIDES[2].imageSrc,
    imageAlt: "たぬ姉のゆっくり立ち絵",
  },
};
