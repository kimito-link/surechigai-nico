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
  "ニコニコ超会議で生まれるみんなのすれ違いが、やがて日本中にひろがり、クリエイター同士が応援しあえる——そんなやさしいつながりを支えたい企画の予告ページです。小さな応援のクリエイターが星屑のように集い、ひとつの超会議という光となって放物線のように遠くまで届くイメージを大切にしています。会場では迷子になりにくい案内と、近くの参加者を見つけやすくする導線を用意します。実際の連絡や会話はXアカウント同士で行う想定です。近接マッチングには参加中の位置情報（一定間隔の送信・バックグラウンド更新を含む）が必要です。りんく・こん太・たぬ姉の3人が楽しくガイドします。";

export const HERO_HEADING = "超会議で、すれ違った人とひとこと";

export const HERO_LEAD =
  "ニコニコ超会議で出会うみんなの「すれ違い」が、やがて日本中にひろがり、クリエイターみんなが応援しあえる。そんな優しい世界を築いていけたら——それを願って、この企画を組んでいます。\n\nひとりひとりの小さな応援するクリエイターは、星屑のようにちりばみ、ニコニコ超会議というひとつの「光」にあつまり、放物線を描くような巨大なひかりになっていく。そんなイメージで、画面の向こうの応援も、会場の空気も、つながりとして描いています。\n\nすれ違い検出には、会期中に端末から位置情報を継続的に送る設計が前提です（秒単位のトラッキングではなく、マッチング用の間欠送信・既存アプリと同様の扱いを想定）。会場が広くてもエリアを頼りに迷子になりにくくし、近くの参加者を見つけやすくします。実際の会話はXアカウント同士で行う前提で、本サイト内にDM機能は持たせません。";

/** ゆっくり掛け合いセクション */
export const YUKKURI_DIALOGUE_TITLE = "ゆっくり超解説（このLPとアプリの話）";

export const YUKKURI_DIALOGUE_LEAD =
  "下の掛け合いは、動画のゆっくり解説っぽく楽しく読めるようにしたものです。りんくが全体、こん太がワクワク、たぬ姉が現実を補足——の三段オチもどきです。細かい仕様は公開時に更新される場合があります。";

/** 没入・演出・AR お試し（ページ内アンカー） */
export const EXPERIENCE_SECTION_HEADING_ID = "experience-heading";

export const EXPERIENCE_SECTION_TITLE = "没入と演出（画面に飛び出すイメージ）";

export const EXPERIENCE_SECTION_LEAD =
  "スクロールに合わせてカードがひとつずつ現れるようにしてあります。星屑のように散らばった応援が、ひとつの光に集まって弧を描く——そんな比喩に近い「見せ方」も意識しています。視界の動きを減らしたい設定では、派手な動きを抑えます。アプリ本番でも、ガイドと会場情報がタイミングよく見える導線を目指します。";

export const EXPERIENCE_REVEAL_CARDS: ReadonlyArray<{ title: string; body: string }> = [
  {
    title: "飛び出し感（奥行き）",
    body: "カードに軽い奥行きと影を付け、手前に浮かぶイメージで情報を区切ります。小さな光が重なって大きな弧になる、という世界観の手前に置くイメージです。",
  },
  {
    title: "段階表示",
    body: "一度に全部は出さず、読む順番が視線で追いやすいよう分割表示します。",
  },
  {
    title: "マップ連動（構想）",
    body: "今後は会場マップと近づけ、位置の手掛かりと合わせて見せる案も検討します。",
  },
] as const;

export const AR_EXPERIENCE_TITLE = "AR・WebXRを見込んだガイド";

export const AR_EXPERIENCE_INTRO =
  "対応端末では WebXR（immersive-ar）で空間に注釈を載せる構想や、モバイルのビューア系とも相性を見ます。まずはブラウザが AR セッションを受け付けるかを表示し、カメラの上にゆっくりの立ち絵を重ねるお試しができます（下のボタン）。";

export const AR_WEBXR_STATUS_CHECKING = "WebXR を確認しています…";

export const AR_WEBXR_STATUS_YES =
  "このブラウザは immersive-ar の検出に応答しました（実アプリ連携は今後の予定です）。";

export const AR_WEBXR_STATUS_NO =
  "この環境では immersive-ar が未対応か、拒否されています。カメラのお試しは利用できる場合があります。";

export const AR_WEBXR_STATUS_ERROR = "WebXR の確認中にエラーが出ました。";

export const AR_CAMERA_CTA_START = "カメラで重ね表示を試す（実験）";

export const AR_CAMERA_CTA_STOP = "カメラを停止";

export const AR_CAMERA_NOTE =
  "HTTPS またはローカル表示でのみカメラが使えることが多いです。許可ダイアログで拒否したときはブラウザの設定からオンにしてください。映像はこの端末内で表示するだけで、サーバーには送っていません。";

export const AR_CAMERA_ERROR =
  "カメラを起動できませんでした。権限・HTTPS・他アプリのカメラ占有を確認してください。";

/** AR お試しの重ね画像（既存の立ち絵パス） */
export const AR_DEMO_OVERLAY_SRC = "/chokaigi/yukkuri/rink.png";

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
    text: "こん太だよ。同じ会場にいるニコニコユーザーと、すれ違いっぽい縁をつないで、XのID交換のきっかけを作れたら最高だよね。ワクワクするよね。",
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
    text: "スマホアプリ「すれちがいライト」側では、会期中は位置の送信やバックグラウンド更新が入る想定だよ。あと、すれ違いの検出や、Xアカウントでつながる導線、ゆっくりの僕たちのガイド表示なんかもここに載せていく予定。",
  },
  {
    speaker: "konta",
    text: "アプリを開いて参加モードに入るイメージだね。推しのブースに向かう横で、「今同じ空気吸ってるニコ厨いたらうれしい」みたいな。会話そのものはXでやる、がコンセプトに近いかな。",
  },
  {
    speaker: "tanunee",
    text: "連絡はXの上でやるから、Xのマナーがそのまま大事よ。気になった人にはいいねやリプを送って、お互いを応援しあう——相手が望まないことはしない、それが基本線ね。位置情報の粗め方（グリッド丸め）やオプトアウトの話は、本番公開のときにちゃんと画面に出すわ。",
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

export const VENUE_SECTION_TITLE = "会場でも迷子にならない・ニコニコユーザーとつながる";

export const VENUE_SECTION_INTRO =
  "幕張メッセ周辺は、展示場やイベントホールが続き、まるで超巨大な迷路のように広い会場です。公式の会場案内・掲示・目印を頼りに、行きたいブースへの回るルートをざっくり決めておくと、迷子になりにくくて効率的です。超会議では、すれ違う相手を尊重し、お互いのいいところに気づき、応援の気持ち（いいねのイメージ）を重ねあえたらうれしい——そんな空気がひろがるとよいな、という想いも込めています。ブースやステージを回るクリエイター同士のすれ違いも含め、同じ空気の中にいるニコニコユーザーと、粗いエリア表示とすれ違いマッチで、負担の少ない形でつながれることを目指します。連絡や会話はXアカウント同士で行う前提です。";

export const AFTER_EVENT_SECTION_TITLE =
  "超会議のあとも——日本中で、応援しあえるすれ違いを";

/**
 * 「超会議のあと」本文（段落ごと）。ニコ生・ニコ動・余韻・来年への期待と、企画としての方針をつなぐ。
 */
export const AFTER_EVENT_SECTION_PARAGRAPHS = [
  "ふだんは、みんな、いろんな職業に、いろんな場所で、いろんな時間軸の中を生きています。",
  "象徴的なイメージとして、会場で生まれた小さなすれちがいが日本中にまき起こり、地図の上でも「いいね」で応援し合う輪が広がっていけたら——みんなが少しずつ幸せを分かち合える、そんな広がりを願っています（アプリの具体的な仕様は公開時の案内に従います）。",
  "でも、ニコニコ超会議の日は、みんなワクワクしていて、すごく楽しみにしている。2日間のお祭り。",
  "ちいさな応援のクリエイターが星屑のように集まり、ひとつの超会議という光に重なり合い、遠くまで届く放物線のような巨大なひかりになる——そんな景色を、心のどこかに描きながら、すれ違いのつながりも大切にしたいと考えています。",
  "終わってしまったあとも、ニコ生やニコ動での振り返りが、追憶の煌めきとなり——エビングハウスの忘却曲線の彼方に、あっさりとは沈まないものでありたい。",
  "あの2日間を思い出せば、今、たとえどんな辛い状況でも、煌めきと応援が自分を守ってくれる。また来年も——。",
  "そんな余韻を、すれ違いやひとことで少しだけつなげられたらうれしい、という想いを大切にしています。実装の段階や範囲は追って整理しますが、まずは会場内の体験を大切にしつつ、その先の広がりも視野に入れます。",
] as const;

/** すれ違い通信セクション（ページ内アンカー） */
export const USAGE_SECTION_HEADING_ID = "usage-heading";

export const USAGE_SECTION_TITLE = "すれ違い通信の使いかた（イメージ）";

export const USAGE_SECTION_INTRO =
  "会期中にスマホアプリ「すれちがいライト」から参加し、近くを通ったニコニコユーザー同士でつながる流れのたたき台です。画面・文言・手順の細部は公開版で変わる場合があります。";

export const USAGE_FOOTNOTE =
  "本サイトは企画予告です。API の稼働・アプリの配信・ストアの案内は、公開時のお知らせを優先してください。";

/** ルート / ヒーロー（公開向け：API 稼働など開発用表記は避ける） */
export const HOME_HERO_BADGE = "企画・公開準備中";

export const HOME_HERO_LEAD =
  "ニコニコ超会議でのみんなのすれ違いが、やがて日本中にひろがり、クリエイター同士が応援しあえる——そんな優しいつながりを支えたい、という案内です。小さな応援が星屑のように集まり、ひとつの光になるイメージで語っています。連絡や会話はXアカウント同士で行い、本サイトは出会いの導線づくりに特化します。企画予告（/chokaigi）では、りんく・こん太・たぬ姉が楽しくガイドします。";

/** Auth-less First: 主要体験は未ログインで通す（すれ違い本体は参加登録＋位置送信＝ログイン後） */
export const AUTH_LESS_FIRST_COPY =
  "ログインなしでゆっくり解説や会場ガイドも試せます。すれ違い通信は企画の核で、参加登録と位置送信でみんなと位置を交換し、近くとマッチ。Xでいいねやオフ会のきっかけにも（登録・送信はログイン後）。";

/** Special Thanks 付近：フォロー・応援への感謝（りんくの吹き出し） */
export const RINK_FOLLOWERS_THANKS_MESSAGE =
  "フォローしてくれてるみんな、応援いつも本当にありがとう。やることが多すぎて間に合ってないだけで、ちゃんと気にしてないわけじゃないから、気長に見守っててほしいな。";

/** ルート / の短い要約（詳細は /chokaigi へ） */
export const HOME_USAGE_SECTION_TITLE = "すれ違い通信のひとこと";

export const HOME_USAGE_SECTION_INTRO =
  "会場ですれ違ったニコニコユーザーとつながり、Xアカウント同士の交流につなげるイメージです。その積み重ねが、やがて日本中のクリエイター同士の応援につながったらうれしい、という気持ちを込めています。細部は公開版に合わせて更新します。";

export const HOME_USAGE_HIGHLIGHTS = [
  "アプリで参加し、会期中だけ位置を間欠送信（マッチング用・粗い位置に丸めて扱います）。",
  "近くを通った人とマッチしたら、Xアカウント同士で交流します。相手のペースを尊重します。",
  "やがては全国にひろがるすれちがいのなかで、いいねで応援し合う——そんな循環を描いています（構想・イメージです）。",
] as const;

/** 会場セクションの箇条書き（公開時に公式マップURL等を追記可能） */
export const VENUE_SECTION_POINTS = [
  "ホール・ブロック名・目印（看板・柱番号など）をメモしておくと迷子になりにくいです。",
  "本サイト内でのメッセージ機能は提供せず、連絡はXアカウント同士で行う前提です。",
  "お互いの良さに気づいて伝えあい、応援の気持ち（いいねのイメージ）を重ねあえると、みんなが少し幸せに近づくイメージです（本番の機能・文言は公開版に合わせます）。",
] as const;

/** public に置いた会場フロアマップ（アプリと同じパス） */
export const VENUE_MAP_PDF_PATH = "/chokaigi/map/chokaigi2026_map.pdf";

export const MAP_SECTION_TITLE = "会場マップの見方";

/** 日本・関東の位置イメージ（地理は超簡略・正確な境界ではありません） */
export const JAPAN_LOCATOR_TITLE = "会場の位置（日本・関東のイメージ）";

/** Google マップで会場周辺を開く（外部サイト） */
export const VENUE_GOOGLE_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=%E5%B9%95%E5%BC%B5%E3%83%A1%E3%83%83%E3%82%BB";

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
    role: "プライバシーと距離感のガイド",
    body: "位置はグリッド丸めなどで粗く扱い、不要な第三者共有はしません。やりとりはX上で、距離感を大切にできるよう声掛けします。",
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
