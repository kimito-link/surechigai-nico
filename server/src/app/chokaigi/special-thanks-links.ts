/**
 * Special Thanks データ定義
 *
 * - SPECIAL_THANKS_PROFILES: 「ロミさんカード」のように個別紹介したい方々
 * - SPECIAL_THANKS_X_ONLY: X アカウントのみでの軽量ご協力者
 * - SPECIAL_THANKS_LINKS: 後方互換用（フラット一覧）。既存のプレビュー処理や
 *   クレジットページのチップ表示等で利用している箇所があるため残しておく。
 *
 * LP から詳細ページ、`/chokaigi/special-thanks` への導線は
 * SPECIAL_THANKS_PROFILES を優先して使う想定。
 */

export type SpecialThanksSiteLink = {
  label: string;
  href: string;
  tagline?: string;
};

export type SpecialThanksXLink = {
  label: string;
  href: string;
};

export type SpecialThanksProfile = {
  /** 安定した DOM id / React key として使う識別子 */
  id: string;
  /** 表示名（人物名 or 屋号） */
  name: string;
  /** 肩書き・所在地など、1 行で添える短いタイトル */
  title?: string;
  /** リボン文言（未指定ならリボンを出さない） */
  ribbon?: string;
  /** 紹介文。段落を分けたいときは配列で複数渡す */
  intro: ReadonlyArray<string>;
  /**
   * ハイライト扱い（カードを特別に装飾）。
   * 現状は「ロゴ制作の Soletta さん」のみが true。
   */
  highlight?: boolean;
  /** 公式サイトなどの外部リンク */
  sites?: ReadonlyArray<SpecialThanksSiteLink>;
  /** X アカウント */
  xHandles?: ReadonlyArray<SpecialThanksXLink>;
};

export const SPECIAL_THANKS_PROFILES: ReadonlyArray<SpecialThanksProfile> = [
  {
    id: "soletta",
    highlight: true,
    ribbon: "🎨 ロゴを創ってくださった方",
    name: "佐藤 ゆうか さん（Soletta／ソレッタ）",
    title: "大阪・高槻のロゴ・ブランディング伴走デザイナー",
    intro: [
      "すれちがいライト、そして星屑のように広がる『クリエイターのシンセカイ』の世界観は、佐藤さんの手で生まれたロゴとコンセプトからすべてが始まりました。",
      "『見た目』ではなく『伝わる軸』を、プロジェクトの根っこにそっと授けてくださったほんとうの意味でのデザインの原点です。40 項目のヒアリングで、ふわっとした想いを言葉に、そして一枚のロゴへ——。ロゴをクリックすると、りんく・こん太・たぬ姉が少し長めに解説してくれます。",
    ],
    sites: [
      {
        label: "Soletta（ソレッタ）公式サイト",
        href: "https://soletta.jp/",
        tagline: "大阪・北摂（高槻）／ロゴ・ブランディング・伴走デザイナー",
      },
    ],
    xHandles: [{ label: "@yuka_designer", href: "https://x.com/yuka_designer" }],
  },
  {
    id: "oki-harumi",
    name: "大木 ハルミ さん",
    title: "アーティスト／『sakura』『WARP』など、魔法のような曲をたくさん生み出す方",
    intro: [
      "大木ハルミさんは、『sakura』『WARP』をはじめ、魔法のような素敵な曲をたくさん生み出しているアーティストさんです。一曲ずつに物語と世界観があって、聴くたびに心の温度がふわっと上がる——そんな表現者です。",
      "そして……実はこっそり、ハルミさんと一緒に 30 分におよぶゆっくり動画を作らせていただきました。まだ公開はしていません。もったいぶるようで申し訳ないですが、ぜひその日を楽しみにしていてください。",
    ],
    sites: [
      {
        label: "大木ハルミさん 公式サイト",
        href: "https://ohalu.bitfan.id/",
        tagline: "Official Site（オフィシャル）",
      },
    ],
    xHandles: [{ label: "@0308harumi", href: "https://x.com/0308harumi" }],
  },
  {
    id: "ahuran",
    name: "アフランカフェ",
    title: "すごい良い出会いをくれる、伝説のカフェ",
    intro: [
      "『クリエイターのシンセカイ』構想にまつわる大切な出会いのほとんどは、このカフェから生まれていると言ってもいいくらいです。アフランカフェはただのカフェではなく、人と人をふしぎな縁でつないでくれる、ちょっとした “伝説のカフェ” なのです。",
      "このアプリの企画が形になっていく過程でも、アフランカフェでの時間と出会いがなければ、たどり着けなかった場所がたくさんあります。",
    ],
    sites: [
      {
        label: "アフランカフェ 公式ホームページ",
        href: "https://www.ahuranproject.com/",
        tagline: "Ahuran Project / Cafe Official Site",
      },
    ],
    xHandles: [{ label: "@ahuran", href: "https://x.com/ahuran" }],
  },
  {
    id: "oto1to1",
    name: "OTO（One To One／オーティーオー）— しなる先生",
    title: "ダンスのプロ／佐藤さん（Soletta）との出会いをくれた方",
    intro: [
      "OTO（One To One）さんは、ダンスのプロとして活動しているしなる先生。実は、ロゴを創ってくださった佐藤さん（Soletta／ソレッタ）と出会えたきっかけは、しなる先生からのご縁でした。",
      "しなる先生がいなければ、このアプリのロゴも、いまの世界観も存在していません。ほんとうに、ありがとうございます。ゆっくり 3 人がしなる先生への感謝を少しだけ語らせてもらいます。",
    ],
    sites: [
      {
        label: "oto1to1 公式サイト",
        href: "https://oto1to1.com/",
        tagline: "One To One（オーティーオー）／しなる先生の活動",
      },
    ],
    xHandles: [{ label: "@OTO1to1", href: "https://x.com/OTO1to1" }],
  },
  {
    id: "shiraitchan",
    name: "しらいっ さん（@ewbcwj_lv）",
    title:
      "ニコニコ生放送の現役配信者（茨城出身 18 歳）／RAIVEN 歌舞伎町店で活動中",
    intro: [
      "とにかく、かわいすぎる現役配信者さん。見た目もかわいいし、配信中の空気感・話しぶりもかわいくて、いい意味で『ふわっと画面を明るくしてくれる』タイプの方です。",
      "じつはこのアプリ（というより、ゆっくり解説の歴史そのもの）が動き出すきっかけをくれた恩人でもあります。『君斗りんく@クリエイター応援ちゃんねる』がまだ “弱小アカウント” と呼んでいい規模だったころから、しらいっさんは気持ちよくゆっくり解説動画を作らせてくださっていました。あのときの『いいですよ』がなければ、ここまで物語は続いていません。感謝が、止まりません。",
      "そのしらいっさん自身も、いまはどんどん人気が上がっていて、配信するたびにキラキラが増している最中。下の X バッジをクリックすると、ゆっくり 3 人がそのエピソードも熱めに語ってくれます。",
    ],
    xHandles: [{ label: "@ewbcwj_lv", href: "https://x.com/ewbcwj_lv" }],
  },
  {
    id: "imagawa-gyarara",
    name: "今川ギララ さん（@Tottokotokobusi）",
    title:
      "ニコニコ生放送の生主／雑談センスが “ラジオ級” の配信者（新潟・新潟市）",
    intro: [
      "とにかく、雑談が、おもしろい。ふとした会話からぐんぐん話を広げていくセンスがあって、聴いているとそれだけで “ラジオ代わり” になるタイプの生主さんです。",
      "体感としては、伊集院光さんのラジオを聴いているときのような、話のリズム・間・オチの置き方があって、ひとりでちゃんとラジオが一本成立してしまうおもしろさ。ニコニコ生放送の配信ももちろん面白いのですが、今後はプロデューサー的な動きにも広がっていきそうで、個人的にもとても楽しみにしています。",
      "実は今川さんについても、ゆっくり解説の動画を作らせていただきました。下の X バッジをクリックすると、ゆっくり 3 人がそのあたりも熱めに語ってくれます。",
    ],
    xHandles: [
      { label: "@Tottokotokobusi", href: "https://x.com/Tottokotokobusi" },
    ],
  },
  {
    id: "oomayu",
    name: "オオマユ さん（@oomayu12345）",
    title: "ニコニコ生放送の配信者／面接練習企画で人柄がよく伝わる方",
    intro: [
      "オオマユさんは、ニコニコ生放送で活動されている配信者さんです。とくに「面接練習」企画では、本番さながらのやりとりのなかで、誠実さやユーモア、ちょっとした抜け感まで含めて——その人柄のよさがすごくよく伝わってきます。企画の向き不向きというより、『この人と一緒に場をつくっていきたい』と思わせる空気がある、そんな配信だと感じています。",
      "オフでは資格の勉強にも一生懸命取り組まれていて、配信と現実の両方でちゃんと前を向いている姿が、画面越しでも伝わってきます。",
      "インターネットの掲示板まわりは、ひとによっては悪口や冷たい書き込みがつきものな場所も多いのですが、オオマユさんのスレでは応援や温かい反応が目立つ——『人柄がよくて、自然と応援したくなる魅力的な人』だからこそ、そういう空気が生まれているのだと思います。配信も日常のひとコマも、下の X から追いかけやすいので、よろしければフォローしてみてください。",
    ],
    xHandles: [{ label: "@oomayu12345", href: "https://x.com/oomayu12345" }],
  },
  {
    id: "maaru",
    name: "まぁる さん（まぁる20.0／@m20210411）",
    title: "ニコニコ生放送の人気配信者／よく喋る20歳",
    intro: [
      "まぁるさんは、ニコニコ生放送で活動されている、いまとても人気の配信者さんです。見た目の印象もよくて、画面に映るだけで視聴者のテンションが上がる——そんな “美人配信者” としても名が通っています。",
      "配信のエピソードは、ひとつひとつが本当におもしろくて、雑談の振り方やオチの感じ、ふとしたリアクションまで含めて『全部おもしろい』と言ってしまいたくなるタイプ。かわいさとトークのキレが両方そろっていて、だからこそファンが自然と増えていく、愛され方をしている方だと感じています。",
      "かわいい衣装でコスプレしているときはアイドル配信のような華やかさ、部屋着にメガネのときは素のキャラが前面に出る——など、見せ方のギャップも楽しめるのが魅力です。配信の案内や日常のひとコマは、下の X から追いかけやすいので、よろしければフォローしてみてください。",
    ],
    xHandles: [
      { label: "@m20210411", href: "https://x.com/m20210411" },
      { label: "@m20220215", href: "https://x.com/m20220215" },
    ],
  },
  {
    id: "miidesu",
    name: "みぃです さん（@bakusyokuM）",
    title:
      "パフォーマンス／声優／配信／イラスト／YouTube ── 才能すべてを持つ “すーぱーくりえいたー”",
    intro: [
      "実は、このアプリの案内役『りんく』の声も、みぃですさんが担当してくださっています。",
      "パフォーマンス、声優、配信、イラスト、YouTube と、活動ジャンルは広いのに、ひとつひとつのクオリティがとにかく高い。そのうえ頭が超絶良くて、話すとロジカルで的確、さらに声もかわいい／見た目もかわいい／気配りまで完璧という、バランスが壊れているとしか言いようのない “すーぱーくりえいたー” です。",
      "このアプリの世界観を声の面から支えてくださっている、大切な方。下の X バッジをクリックすると、ゆっくり 3 人が熱量多めにご紹介します。",
    ],
    xHandles: [{ label: "@bakusyokuM", href: "https://x.com/bakusyokuM" }],
  },
  {
    id: "shirase",
    name: "しらせ さん（@shirase_0404）",
    title:
      "あぶそりゅーと☆せぶん ピンク担当／ニコ生発『いんたーねっとあいどる』（17 歳 高校 2 年生）",
    intro: [
      "あぶそりゅーと☆せぶん（@abuso2525）のピンク担当、しらせちゃん。プロフィールのサムネを見ていただくと一発で伝わるとおり、とびきりかわいい現役の女の子アイドルです。笑顔がきらきらしていて、正統派の『ふわっと柔らかい女の子アイドル』感があって、見ているだけで画面が明るくなります。",
      "そしてしらせちゃん、配信の中で 今川ギララさん（@Tottokotokobusi）のことを 一度ちょっと “あんぱい（安牌）” と言って言及したことがあります。これは今川さんをバカにしているわけではなくて、むしろ逆で——『今川さんは、好きな配信者として名前を出しても、男性関係として突かれるような危険な情報がない方。だから安心して名前を出せる＝“あんぱい”、しかも出すとむしろ自分のイメージが上がる、使いやすい』——という文脈のほめ言葉に近い呼び方なんです。いわゆるふたりが頻繁に絡んでいる、というわけではなく、しらせちゃんが今川さんの話を軽く振ったことがあった、というエピソード。",
      "そしてもうひとつ。しらせちゃん自身も『踊コレ』のステージで堂々と踊っていて、かわいいだけじゃなく、ちゃんと “かっこいい”。ぼくらも 1 ファンとして、しらせちゃんの踊コレを全力応援しています。下の X バッジをクリックすると、ゆっくり 3 人がそのあたりの “推し文脈” も熱めに語ってくれます。",
    ],
    xHandles: [
      { label: "@shirase_0404", href: "https://x.com/shirase_0404" },
    ],
  },
  {
    id: "yuzuchi",
    name: "ゆずち さん（@yuzuchis_mammy）",
    title:
      "あぶそりゅーと☆せぶん 青担当／ニコ生主発の “絶対アイドル”（演技も歌もベテラン感）",
    intro: [
      "あぶそりゅーと☆せぶん（@abuso2525）の青担当、ゆずちさん。ニコ生主としてすでに活躍しつつ、中高生ニコ生主を集めた『絶対アイドル』ユニットのメンバーとしてステージにも立っています。",
      "ゆずちさんを見て、まず驚くのが——もう、演技も歌も“ベテラン感”があるんです。まだ若いのに、舞台に立ったときの佇まいや、歌い上げる時の呼吸の使い方、表情の付け方まで、ふつうに“プロっぽい”。『上手い』で終わらず、“聴かせる／見せる”ところまで持っていけるタイプで、すでに出来上がっている空気をまとっています。",
      "あぶそりゅーと☆せぶんの中でも、ステージに並ぶとゆずちさんのところで目が止まる——そのくらいの存在感があります。ぼくらはこの先、もっと大きなステージでも必ず通用する方だと本気で思っています。下の X バッジをクリックすると、ゆっくり 3 人がそのあたりの『存在感／ベテラン感』も熱めに語ってくれます。",
    ],
    xHandles: [
      { label: "@yuzuchis_mammy", href: "https://x.com/yuzuchis_mammy" },
    ],
  },
  {
    id: "sinseinaru",
    name: "しんせいねう さん（@sinseinaru）",
    title:
      "あぶそりゅーと☆せぶん 緑担当／『限界くらげを世界にお届け』な歌い手アイドル",
    intro: [
      "あぶそりゅーと☆せぶん（@abuso2525）の緑担当、しんせいねうさん。自称は『限界くらげを世界にお届け』という、プロフの時点でもう愛しい方なのですが——本当にすごいのは、歌です。",
      "これは身内びいきではなくて、本気の話。ねうさんの歌を聴いた動画、ぼくらも何度も見返してしまいました。『あ、もう 1 回聴きたい』となって、気づいたらリピートで 5 回くらい観てしまう——そういうタイプの歌です。声質なのか、歌い方のニュアンスなのか、はっきり言葉にはできないけれど、聴くたびに『あ、やっぱりいいな……』と“もう一回ボタン” を押させてくる。じわ〜っと来るタイプなので、ぜひ何度か聴いてみてほしいのです。",
      "だからこそ、現地・会場で聴けた人だけで終わらせるのはあまりにもったいない。現地に来れなかった人にも、この歌はちゃんと届いてほしい——そう本気で思っています。下の X バッジをクリックすると、ゆっくり 3 人がねうさんの歌の魅力を、たっぷり語ってくれます。",
    ],
    xHandles: [
      { label: "@sinseinaru", href: "https://x.com/sinseinaru" },
    ],
  },
  {
    id: "abuso-seven",
    name: "あぶそりゅーと☆せぶん（@abuso2525）",
    title:
      "中高生ニコ生主を集めた期間限定アイドルユニット／ニコニコ超会議 2026 クリクロ出演",
    intro: [
      "❤ しらせ ❤ しらいっ 💚 しんせいねう 💙 ゆずち 💙 みぃです——中高生ニコ生主を集めた、期間限定アイドルユニット『あぶそりゅーと☆せぶん』公式アカウントです。",
      "このユニットのステージは、本当に、感動でした。最後のほうはぼくらも正直、涙がにじみました。『けいおん！』の最終回で流れるあの空気——『ああ、今この瞬間、この 5 人がここで一緒にステージに立っているんだ』という尊さが、そのまま会場に満ちていく——そんな感覚。期間限定ユニットだからこその『今、ここ』の重みが、歌とダンスに乗って返ってくる、特別な時間でした。",
      "そしてじつは——あぶそりゅーと☆せぶんを主役にした『ゆっくり解説』の台本、もう書いてあるんです。まだ動画としては形にできていなくて、今は夢の中の企画。でも台本は確かに存在していて、ぼくらもずっと『いつか実現させたい』と思っています。下の X バッジをクリックすると、ゆっくり 3 人がその想いも込めて、ユニットのすごさをたっぷり語ってくれます。",
    ],
    xHandles: [
      { label: "@abuso2525", href: "https://x.com/abuso2525" },
    ],
  },
] as const;

/**
 * X アカウントのみでご協力・応援してくださっているみなさま。
 * プロフィールカード化はせず、アットマーク一覧として表示します。
 */
export const SPECIAL_THANKS_X_ONLY: ReadonlyArray<SpecialThanksXLink> = [
  { label: "@flap_shizuku", href: "https://x.com/flap_shizuku" },
  { label: "@yuripon7777", href: "https://x.com/yuripon7777" },
  { label: "@pokkuri0803", href: "https://x.com/pokkuri0803" },
  { label: "@engineerHiyoko", href: "https://x.com/engineerHiyoko" },
  { label: "@KoichiNishizuka", href: "https://x.com/KoichiNishizuka" },
  { label: "@MireilleDartois", href: "https://x.com/MireilleDartois" },
  { label: "@Nyantaro_Kagura", href: "https://x.com/Nyantaro_Kagura" },
  { label: "@ojthon221", href: "https://x.com/ojthon221" },
  { label: "@qumakari", href: "https://x.com/qumakari" },
  { label: "@ruserock", href: "https://x.com/ruserock" },
  { label: "@suke_arts", href: "https://x.com/suke_arts" },
  { label: "@Uchu_sumi", href: "https://x.com/Uchu_sumi" },
  { label: "@Colorfulbldra", href: "https://x.com/Colorfulbldra" },
  { label: "@LQFtHRMiyCXONqM", href: "https://x.com/LQFtHRMiyCXONqM" },
  { label: "@miku_nosuke", href: "https://x.com/miku_nosuke" },
  { label: "@mini_size_piano", href: "https://x.com/mini_size_piano" },
  { label: "@mini_sub_piano", href: "https://x.com/mini_sub_piano" },
  { label: "@nicotomo_jp", href: "https://x.com/nicotomo_jp" },
  { label: "@bz_hug", href: "https://x.com/bz_hug" },
  { label: "@otoka_vim_furry", href: "https://x.com/otoka_vim_furry" },
  { label: "@Sugar_develop", href: "https://x.com/Sugar_develop" },
  { label: "@hara_helicity", href: "https://x.com/hara_helicity" },
  { label: "@papa_sidejobb", href: "https://x.com/papa_sidejobb" },
  { label: "@yuzuko120086346", href: "https://x.com/yuzuko120086346" },
] as const;

/**
 * 後方互換用のフラットなリンク一覧。
 * プロフィールと X-only をまとめて平坦化しています。
 */
export const SPECIAL_THANKS_LINKS: ReadonlyArray<{ label: string; href: string }> =
  [
    ...SPECIAL_THANKS_PROFILES.flatMap((p) => [
      ...(p.sites ?? []).map((s) => ({ label: s.label, href: s.href })),
      ...(p.xHandles ?? []).map((x) => ({ label: x.label, href: x.href })),
    ]),
    ...SPECIAL_THANKS_X_ONLY.map((x) => ({ label: x.label, href: x.href })),
  ] as const;

export const ROMI_PROFILE = {
  name: "星野 ロミ さん",
  intro:
    "このアプリのベースとなったプログラムを公開してくださった、偉大なプログラマー。たくさんの人が日常的に使う「すごいサービス」を、自身の手で次々と作り上げてきた、今も走り続ける現役の開発者です。",
  xHandles: [
    { label: "@romi_hoshino", href: "https://x.com/romi_hoshino" },
    { label: "@romi63hoshino", href: "https://x.com/romi63hoshino" },
  ],
  operatedSites: [
    {
      label: "SocialXup",
      href: "https://socialxup.com/",
      tagline: "X ユーザー数推移ツール（フォロワー・フォロー数の推移を追跡できる神ツール）",
    },
    {
      label: "SocialXup for Threads",
      href: "https://threads.socialxup.com/",
      tagline: "Threads 版のユーザー数推移ツール",
    },
    {
      label: "mmake.net",
      href: "https://mmake.net/",
      tagline:
        "漫画村元運営者が教えるプログラミングスクール／プログラミングを学べる初心者向けのオンラインスクール",
    },
    {
      label: "mangamura.org",
      href: "https://mangamura.org/",
      tagline: "星野ロミさんが手掛けた、伝説のサービス",
    },
  ],
} as const;
