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

const DIALOGUE_BY_HREF: Record<string, YukkuriDialogue> = {
  "https://socialxup.com/": SOCIALXUP_DIALOGUE,
  "https://threads.socialxup.com/": SOCIALXUP_THREADS_DIALOGUE,
  "https://mmake.net/": MMAKE_DIALOGUE,
  "https://mangamura.org/": MANGAMURA_DIALOGUE,
};

export function getYukkuriDialogue(href: string): YukkuriDialogue | undefined {
  return DIALOGUE_BY_HREF[href];
}
