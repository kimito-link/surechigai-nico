import type { YukkuriLine } from "./YukkuriIntroLink";

export const MANGAMURA_PUNCHLINE_PATH = "/chokaigi/mangamura-punchline";

export type YukkuriDialogue = {
  title: string;
  lines: ReadonlyArray<YukkuriLine>;
  ctaLabel: string;
  ctaHref?: string;
};

export const SOCIALXUP_DIALOGUE: YukkuriDialogue = {
  title: "🌟 SocialXup（ソーシャルエックスアップ）",
  lines: [
    {
      who: "rink",
      text: "これは X のフォロワー数とフォロー数の推移を、ぜーんぶ記録してくれる神ツールだよ！",
    },
    {
      who: "konta",
      text: "えっ、過去のフォロワーのグラフまで見れるの！？推し活に超使えるじゃん！",
    },
    {
      who: "tanunee",
      text: "無料で使えるのだー。マーケティングやリサーチにもめちゃ便利だよー",
    },
  ],
  ctaLabel: "SocialXup を開く",
};

export const SOCIALXUP_THREADS_DIALOGUE: YukkuriDialogue = {
  title: "🌟 SocialXup for Threads",
  lines: [
    {
      who: "rink",
      text: "こっちは Threads 版の SocialXup だよ！フォロワー推移を Threads でも追える〜",
    },
    {
      who: "konta",
      text: "Threads もグラフで見れんの！？マジ便利じゃん！",
    },
    {
      who: "tanunee",
      text: "Threads を伸ばしたい人はブックマーク推奨なのだー",
    },
  ],
  ctaLabel: "Threads 版を開く",
};

export const MMAKE_DIALOGUE: YukkuriDialogue = {
  title: "🎓 mmake.net",
  lines: [
    {
      who: "rink",
      text: "漫画村の元運営者、星野ロミさんから直接プログラミングを教えてもらえるオンラインスクールだよ！",
    },
    {
      who: "konta",
      text: "え、あの天才から学べるってマジ！？すっげぇー！",
    },
    {
      who: "tanunee",
      text: "初心者向けなのだー。コードを書いて自分でサービスを立ち上げたい人にぴったりだよー",
    },
  ],
  ctaLabel: "mmake.net を開く",
};

export const MANGAMURA_DIALOGUE: YukkuriDialogue = {
  title: "📚 mangamura.org",
  lines: [
    {
      who: "rink",
      text: "これは…星野ロミさんが昔つくった、伝説のサイトだよ…",
    },
    {
      who: "konta",
      text: "へぇー！どんなサイトなの？",
    },
    {
      who: "tanunee",
      text: "うーん…百聞は一見にしかず、なのだー。とりあえず実際に見てみる？",
    },
  ],
  ctaLabel: "mangamura.org にアクセスする",
  ctaHref: MANGAMURA_PUNCHLINE_PATH,
};

/**
 * Soletta（佐藤ゆうかさん）のゆっくり解説。
 * 『ロゴから、クリエイターのシンセカイが始まった』という起点の物語を
 * 少し長めに 7 発話で展開する。他ツールの解説より厚めなのは意図的。
 */
export const SOLETTA_DIALOGUE: YukkuriDialogue = {
  title: "🎨 Soletta（ソレッタ）— ロゴから始まった、クリエイターのシンセカイ",
  lines: [
    {
      who: "rink",
      text: "みんなにちゃんと紹介したい方がいるんだ。このアプリのロゴを創ってくれた、大阪・高槻の佐藤ゆうかさん。屋号は Soletta（ソレッタ）さんだよ。",
    },
    {
      who: "konta",
      text: "えっ、あのロゴ、プロのデザイナーさんに創ってもらってたの！？どうりで、見てるとなんかホッとする温度感なんだよね〜。",
    },
    {
      who: "tanunee",
      text: "佐藤さんはね、ただ『見た目』をキレイに整える人じゃなくて、『想い』と『らしさ』を一緒にデザインしてくれる伴走デザイナーさんなのだー。",
    },
    {
      who: "rink",
      text: "40 項目もあるヒアリングシートで、頭の中のふわふわしたイメージを、ひとつずつ言葉にしていくんだよ。『本当に届けたい人は誰？』『どう感じてほしい？』って。",
    },
    {
      who: "konta",
      text: "ほえぇ…。『すれちがいライト』も最初、『クリエイター同士がやさしくつながる、星屑みたいな光』っていうぼんやりしたコンセプトだったって聞いた！",
    },
    {
      who: "tanunee",
      text: "そこから佐藤さんが、コンセプト設計 → ストーリー → ロゴ、って順番に一緒に組み立ててくれたのだー。ロゴが決まった瞬間、世界観の軸が定まって、色やキャラの空気感までスルスル整っていったのだー。",
    },
    {
      who: "rink",
      text: "だから、『クリエイターのシンセカイ』の入口は、ほんとに佐藤さんのロゴから始まったんだ。ぼくたち 3 人の立ち絵も、このロゴと同じ世界の住人なんだよ。",
    },
    {
      who: "konta",
      text: "これは紹介せずにいられない…！ロゴやブランド、ホームページの相談したい人は、ぜひ Soletta さんに話してみてほしい〜！",
    },
    {
      who: "tanunee",
      text: "北摂エリアが拠点だけど、オンラインでの相談もOKなのだー。『何から始めればいいか分からない』段階から一緒に整理してくれるから、最初のひと言のハードルがとっても低いのだー。",
    },
    {
      who: "rink",
      text: "このアプリを好きになってくれたみんなに、このロゴを創ってくれた佐藤さんのことも、ぜひ知ってほしい。ボタンから公式サイトを見にいけるよ！",
    },
  ],
  ctaLabel: "Soletta 公式サイトを開く",
};

/**
 * 大木ハルミさん（アーティスト）とのエピソードを、
 * 「一緒にたくさんのゆっくり動画を作らせていただいた」文脈で紹介。
 */
export const OKI_HARUMI_DIALOGUE: YukkuriDialogue = {
  title: "🎤 大木ハルミさん — 一緒にゆっくり動画を作らせていただいた方",
  lines: [
    {
      who: "rink",
      text: "ぼくたちの “ゆっくり解説” には、じつはルーツがあるんだ。アーティストの大木ハルミさんとは、これまで一緒にたくさんのゆっくり動画を作らせていただいたんだよ。",
    },
    {
      who: "konta",
      text: "えっ、このテンションのベースって、その動画制作で育ってきたってこと〜！？",
    },
    {
      who: "tanunee",
      text: "そうなのだー。『むずかしい話をやさしく』『にぎやかなのに疲れない』っていうぼくらの間合いは、ハルミさんの世界観に寄り添う中で、ちょっとずつ形になってきたのだー。",
    },
    {
      who: "rink",
      text: "だからこのアプリでも、ハルミさんと一緒に磨いてきた『やさしく伝える』姿勢を大切にしてるんだ。",
    },
    {
      who: "konta",
      text: "ハルミさんの音楽や活動、めっちゃ応援したい〜！公式サイトからチェックしてみてね！",
    },
  ],
  ctaLabel: "大木ハルミさん 公式サイトを開く",
};

/**
 * アフランカフェ — 『伝説のカフェ』として、ここから多くの出会いが
 * 生まれてきた文脈で紹介。
 */
export const AHURAN_DIALOGUE: YukkuriDialogue = {
  title: "☕ アフランカフェ — すごい良い出会いをくれる、伝説のカフェ",
  lines: [
    {
      who: "rink",
      text: "このアプリの『クリエイターのシンセカイ』って、実は一軒のカフェからたくさんの出会いが広がって生まれてるんだよ。",
    },
    {
      who: "konta",
      text: "えっ、どこどこ〜！？",
    },
    {
      who: "tanunee",
      text: "『アフランカフェ』なのだー。ただのカフェじゃなくて、通うたびに人と人がふしぎに繋がっていく、ちょっとした “伝説のカフェ” なのだー。",
    },
    {
      who: "rink",
      text: "ほんとに、このアプリにまつわる大切な出会いのほとんどが、このカフェ発だったって言ってもいいくらい。人が交差する場所って、こういう空気感なんだなって毎回思う。",
    },
    {
      who: "konta",
      text: "『すれ違いを大切にしよう』って発想も、このカフェの雰囲気からインスピもらってるのかも〜。",
    },
    {
      who: "tanunee",
      text: "興味をもった人は、ぜひ公式サイトから覗いてみてほしいのだー。行ける距離なら、一度その空気を体験してほしい場所なのだー。",
    },
  ],
  ctaLabel: "アフランカフェ 公式サイトを開く",
};

/**
 * OTO（One To One／しなる先生）— ロゴ制作の佐藤さんと
 * 出会えたきっかけを作ってくれた方への感謝の解説。
 */
export const OTO1TO1_DIALOGUE: YukkuriDialogue = {
  title: "💃 OTO（One To One）— しなる先生への、感謝の解説",
  lines: [
    {
      who: "rink",
      text: "このアプリのロゴを創ってくださったのは、佐藤ゆうかさん（Soletta）。じゃあ、ぼくらがどうやって佐藤さんと出会えたのか、知ってる？",
    },
    {
      who: "konta",
      text: "えっ、知らない！どうやって！？",
    },
    {
      who: "tanunee",
      text: "OTO（One To One）さん、通称 “しなる先生” のおかげなのだー。ダンスのプロとして活動している、すてきな先生なのだー。",
    },
    {
      who: "rink",
      text: "しなる先生が佐藤さんとぼくらを繋いでくださったから、このアプリのロゴが生まれたし、世界観もここまで形にできたんだ。",
    },
    {
      who: "konta",
      text: "えぇ…しなる先生がいなかったら、このロゴもなかったってこと！？感謝しかないじゃん！",
    },
    {
      who: "tanunee",
      text: "ほんとうに、ありがとうございます。しなる先生の活動は公式サイトから見られるのだー。ダンスのレッスンも気になる人はぜひ覗いてみてほしいのだー。",
    },
    {
      who: "rink",
      text: "『縁が縁を呼ぶ』って、こういうことなんだなって思う。感謝を込めてご紹介です！",
    },
  ],
  ctaLabel: "OTO（One To One）公式サイトを開く",
};

/**
 * みぃさん（@bakusyokuM）— りんくの声を担当してくださっている
 * 多才クリエイター。才能・知性・声・ビジュアル・気配りが全部そろった
 * “すーぱーくりえいたー” として、熱量多めにご紹介。
 */
export const MIIDESU_DIALOGUE: YukkuriDialogue = {
  title: "🌟 みぃさん（@bakusyokuM） — りんくの声を担当する、すーぱーくりえいたー",
  lines: [
    {
      who: "rink",
      text: "実はね……ぼく『りんく』の声、みぃさん（@bakusyokuM）に担当してもらってるんだ！もうこの時点で感謝しかないんだけど、ちょっと聞いて！？",
    },
    {
      who: "konta",
      text: "えっ！？りんくの声って中の人いたの！？しかもパフォーマンス、声優、配信、イラスト、YouTube までこなすタイプ！？多才すぎでしょ！",
    },
    {
      who: "tanunee",
      text: "才能が、とにかく、すごすぎるのだー。どのジャンルもかじってるだけじゃなくて、ひとつひとつのクオリティがちゃんと高いのが恐ろしいのだー。",
    },
    {
      who: "rink",
      text: "しかもね、頭が超絶いいんだよ。話してると『その整理のしかた天才すぎる…』ってなるくらいロジカルで的確。気配りも半端ないんだ。",
    },
    {
      who: "konta",
      text: "待って、そのうえで声もかわいい、見た目もかわいいって……ちょっとバランス崩壊してない！？そんなキャラ物語でも見たことないよ〜！",
    },
    {
      who: "tanunee",
      text: "才能・知性・声・ビジュアル・気配り、フルスタックで全部持ってるのだー。ここまで来ると “すーぱーくりえいたー” って呼ぶしかないのだー。",
    },
    {
      who: "rink",
      text: "ぼくの声を吹き込んでくれていることも含めて、このアプリの世界観へのご貢献はほんとに大きい。プロフィールを覗いてもらえたら、いろんな活動がひと目で分かるよ！",
    },
    {
      who: "konta",
      text: "みんな、フォローしていろんな表現を楽しんでね〜！",
    },
  ],
  ctaLabel: "みぃさんの X プロフィールを開く",
};

const DIALOGUE_BY_HREF: Record<string, YukkuriDialogue> = {
  "https://socialxup.com/": SOCIALXUP_DIALOGUE,
  "https://threads.socialxup.com/": SOCIALXUP_THREADS_DIALOGUE,
  "https://mmake.net/": MMAKE_DIALOGUE,
  "https://mangamura.org/": MANGAMURA_DIALOGUE,
  "https://soletta.jp/": SOLETTA_DIALOGUE,
  "https://ohalu.bitfan.id/": OKI_HARUMI_DIALOGUE,
  "https://www.ahuranproject.com/": AHURAN_DIALOGUE,
  "https://oto1to1.com/": OTO1TO1_DIALOGUE,
  "https://x.com/bakusyokuM": MIIDESU_DIALOGUE,
};

export function getYukkuriDialogue(href: string): YukkuriDialogue | undefined {
  return DIALOGUE_BY_HREF[href];
}
