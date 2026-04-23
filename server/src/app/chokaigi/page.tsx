/** viewport / canonical: chokaigi/layout.tsx */
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import LiveParticipants from "../components/LiveParticipants";
import {
  GUIDES,
  HERO_HEADING,
  HERO_LEAD,
  LOGO_CREATOR_CROSS_ALT,
  LOGO_CREATOR_CROSS_HORIZONTAL_SRC,
  LOGO_CREATOR_CROSS_VERTICAL_SRC,
  LOGO_KIMITO_LINK_ALT,
  LOGO_KIMITO_LINK_HEIGHT,
  LOGO_KIMITO_LINK_SRC,
  LOGO_KIMITO_LINK_WIDTH,
  LP_TITLE,
  AFTER_EVENT_SECTION_PARAGRAPHS,
  AFTER_EVENT_SECTION_TITLE,
  MAP_HALL_LIST_DIALOGUE_HINT_AFTER,
  MAP_HALL_LIST_DIALOGUE_HINT_BEFORE,
  MAP_HALL_LIST_NOTE,
  MAP_HALL_LIST_TITLE,
  MAP_PDF_MOBILE_EMPHASIS,
  MAP_PDF_NOTE,
  MAP_PDF_PRIMARY_CTA_LABEL,
  MAP_PDF_SECONDARY_CTA_LABEL,
  MAP_PDF_TITLE,
  MAP_QUICK_STEPS,
  MAP_SCHEMATIC_NOTE,
  MAP_SCHEMATIC_TITLE,
  MAP_SECTION_INTRO,
  MAP_SECTION_TITLE,
  RINK_FOLLOWERS_THANKS_MESSAGE,
  USAGE_FOOTNOTE,
  USAGE_SECTION_HEADING_ID,
  USAGE_SECTION_INTRO,
  USAGE_SECTION_TITLE,
  VENUE_SECTION_INTRO,
  VENUE_SECTION_POINTS,
  VENUE_SECTION_TITLE,
  venueMapPdfAbsoluteUrl,
} from "./lp-content";
import styles from "./chokaigi.module.css";
import { VenueMapIllustration } from "./VenueMapIllustration";
import { VenueHallList } from "./VenueHallList";
import { PdfDesktopEmbed } from "./PdfDesktopEmbed";
import { JapanVenueLocator } from "./JapanVenueLocator";
import { VenueWanderMini } from "./VenueWanderMini";
import { UsageGuide } from "./UsageGuide";
import { ChokaigiExperienceSection } from "./ChokaigiExperienceSection";
import { VenueTour3D } from "./VenueTour3D";
import { YukkuriDialogue } from "./YukkuriDialogue";
import { VenueMapInteractive } from "./VenueMapInteractive";
import { CharacterTip } from "./CharacterTip";
import { VenueLiveMap } from "./VenueLiveMap";
import { CreatorCrossSearch } from "./CreatorCrossSearch";
import { StarField } from "./StarField";
import { YukkuriHero } from "./YukkuriHero";
import {
  SPECIAL_THANKS_PROFILES,
  SPECIAL_THANKS_POKKURI_X_HREF,
  SPECIAL_THANKS_X_ONLY,
  SPECIAL_THANKS_YURIPON_X_HREF,
} from "./special-thanks-links";
import { PokkuriThanksXListItem } from "./PokkuriThanksXListItem";
import { YuriponThanksXListItem } from "./YuriponThanksXListItem";
import { RomiProfileCard } from "./RomiProfileCard";
import { SpecialThanksProfileCard } from "./SpecialThanksProfileCard";
import { XLogoIcon } from "./XLogoIcon";
import { TSUIOKU_NO_KIRAMEKI_LP_HREF } from "@/app/components/yukkuri-service-dialogues";

const SPECIAL_THANKS_HIGHLIGHT_PROFILES = SPECIAL_THANKS_PROFILES.filter(
  (profile) => profile.highlight
);
const SPECIAL_THANKS_NORMAL_PROFILES = SPECIAL_THANKS_PROFILES.filter(
  (profile) => !profile.highlight
);

export default function ChokaigiPage() {
  return (
    <main className={styles.shell}>
      <StarField />
      <article>
        {/* ===== ファーストビュー：キャラ3人 + 検索 + 2択 ===== */}
        <YukkuriHero />

        <div className={styles.unofficialBar} role="note">
          このページは有志による非公式アプリ企画です。ニコニコ超会議の公式サイトではありません。
        </div>

        <Link href="/creators" className={styles.firstViewCreatorsBanner}>
          <span className={styles.firstViewCreatorsBannerIcon} aria-hidden="true">
            🗾
          </span>
          <span className={styles.firstViewCreatorsBannerText}>
            <span className={styles.firstViewCreatorsBannerTitle}>
              47 都道府県別クリエイター一覧
            </span>
            <span className={styles.firstViewCreatorsBannerLead}>
              いま全国のどこに参加者がいる？ 県ごとのクリエイターがズラッと見られます →
            </span>
          </span>
        </Link>

        <header className={styles.hero}>
          <div className={styles.heroBand}>
            <div className={styles.heroBrandCol}>
              <div className={styles.heroBrandRow}>
                <Image
                  src={LOGO_CREATOR_CROSS_VERTICAL_SRC}
                  alt={LOGO_CREATOR_CROSS_ALT}
                  width={450}
                  height={450}
                  className={styles.logoVertical}
                  sizes="(max-width: 639px) 112px, 140px"
                  priority
                />
                <a
                  className={styles.heroKimitoLink}
                  href="https://kimito-link.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Kimito-Link（君斗りんく）公式サイトへ"
                >
                  <Image
                    src={LOGO_KIMITO_LINK_SRC}
                    alt={LOGO_KIMITO_LINK_ALT}
                    width={LOGO_KIMITO_LINK_WIDTH}
                    height={LOGO_KIMITO_LINK_HEIGHT}
                    className={styles.logoKimitoHero}
                    sizes="(max-width: 639px) 42vw, 200px"
                  />
                </a>
              </div>
            </div>
            <div className={styles.heroCopy}>
              <span className={styles.badge}>非公式アプリ企画 · ニコニコ超会議2026</span>
              <h1>{HERO_HEADING}</h1>
              <p>{HERO_LEAD}</p>
            </div>
          </div>
        </header>

        <YukkuriDialogue />

        <section
          className={styles.section}
          aria-labelledby="live-participants-lp-heading"
        >
          <h2 id="live-participants-lp-heading">
            全国のどこで、誰が参加しているのか
          </h2>
          <p className={styles.sectionLead}>
            都道府県ごとにピンが立つ日本地図。
            <strong>送信した位置はずっと残り続け</strong>、
            長野・福岡・北海道…全国どこからでも、参加した人のピンが累計で表示されます。
          </p>
          <CharacterTip
            character="rink"
            message="地図を見るだけで「この県の人が今アクティブなんだ〜」ってわかるよ！超会議の日にはここがもっと賑やかになるはず。"
          />
          <Suspense fallback={null}>
            <LiveParticipants />
          </Suspense>
        </section>

        <section className={styles.section} aria-labelledby="features-heading">
          <h2 id="features-heading">
            すれちがいライトでできること（機能まるごとガイド）
          </h2>
          <p className={styles.sectionLead}>
            超会議 2026 に向けて少しずつ積み上げてきた機能を、ひとまとめにまとめました。
            「どんなアプリ？」「結局なにができるの？」と聞かれたら、このリストを見せるだけで大丈夫。
          </p>
          <CharacterTip
            character="rink"
            message="ひとつずつ全部ためしてみたくなっちゃうかも〜！気になる機能のカードをタップすると、その場所にジャンプできるよ。"
          />

          <div className={styles.featuresGrid}>
            <Link href="/app" className={styles.featureCard}>
              <span className={styles.featureIcon} aria-hidden="true">
                📡
              </span>
              <div className={styles.featureBody}>
                <h3 className={styles.featureTitle}>
                  位置を送るだけで、すれ違える
                </h3>
                <p className={styles.featureDesc}>
                  アプリを開いて「現在地を送信」をポンッと押すだけ。近くを歩いている参加者と自動でマッチングして、
                  <strong>すれ違い／ご近所／同じ街／同じ地域／おさんぽ</strong> の 5 段階で記録されます。
                </p>
                <span className={styles.featureCta}>ダッシュボードへ →</span>
              </div>
            </Link>

            <Link href="/creators" className={styles.featureCard}>
              <span className={styles.featureIcon} aria-hidden="true">
                🗾
              </span>
              <div className={styles.featureBody}>
                <h3 className={styles.featureTitle}>
                  47 都道府県別クリエイター一覧
                </h3>
                <p className={styles.featureDesc}>
                  これまでに参加された方を、都道府県ごとにズラッと表示。
                  転勤で複数県に滞在した方は <strong>どちらの県にも掲載</strong>。
                  <strong>30 分以内に動いている人には LIVE バッジ</strong>。
                </p>
                <span className={styles.featureCta}>都道府県から探す →</span>
              </div>
            </Link>

            <a href="/chokaigi#map-heading" className={styles.featureCard}>
              <span className={styles.featureIcon} aria-hidden="true">
                🗺️
              </span>
              <div className={styles.featureBody}>
                <h3 className={styles.featureTitle}>
                  3 種類の会場マップ
                </h3>
                <p className={styles.featureDesc}>
                  ① ホールをタップして詳細がひらく <strong>インタラクティブマップ</strong>、
                  ② 幕張メッセ<strong>公式 PDF マップ</strong>のダウンロード、
                  ③ 文字で読める <strong>ホール別ガイド</strong>（Ctrl+F で検索可）。
                </p>
                <span className={styles.featureCta}>会場マップを見る →</span>
              </div>
            </a>

            <a href="/chokaigi#creator-cross-search-heading" className={styles.featureCard}>
              <span className={styles.featureIcon} aria-hidden="true">
                🔍
              </span>
              <div className={styles.featureBody}>
                <h3 className={styles.featureTitle}>
                  CreatorCross 全件検索
                </h3>
                <p className={styles.featureDesc}>
                  超会議 2026「CreatorCross」エリアの <strong>出展者 1,000 件超</strong>をその場で全文検索。
                  名前・ホール・ブース番号・X ハンドルから、会いたいクリエイターを即座に発見。
                </p>
                <span className={styles.featureCta}>検索してみる →</span>
              </div>
            </a>

            <a href="/chokaigi#yukkuri-dialogue-heading" className={styles.featureCard}>
              <span className={styles.featureIcon} aria-hidden="true">
                💬
              </span>
              <div className={styles.featureBody}>
                <h3 className={styles.featureTitle}>
                  ゆっくり超解説（3 人の掛け合い）
                </h3>
                <p className={styles.featureDesc}>
                  <strong>りんく・こん太・たぬ姉</strong> の 3 人が、会場の回り方・ホールごとの見どころ・よくある質問までテンポよく解説。
                  <strong>VOICEVOX 音声</strong>で読み上げにも対応。
                </p>
                <span className={styles.featureCta}>掛け合いを見る →</span>
              </div>
            </a>

            <div className={styles.featureCard}>
              <span className={styles.featureIcon} aria-hidden="true">
                🤖
              </span>
              <div className={styles.featureBody}>
                <h3 className={styles.featureTitle}>
                  AI ゆっくり紹介カード
                </h3>
                <p className={styles.featureDesc}>
                  ページ冒頭のフォームに X ID を入れるだけで、
                  <strong>3 人があなた専用の紹介台本</strong>を生成。
                  そのまま X でシェアできるカードにもなります。
                </p>
                <span className={styles.featureCtaStatic}>
                  ↑ ページ冒頭のフォームから
                </span>
              </div>
            </div>

            <a href="/chokaigi#kimito-tsuioku-kirameki" className={styles.featureCard}>
              <span className={styles.featureIcon} aria-hidden="true">
                ✨
              </span>
              <div className={styles.featureBody}>
                <h3 className={styles.featureTitle}>
                  追憶の煌めき（君斗リンク工房）
                </h3>
                <p className={styles.featureDesc}>
                  ニコ生コメント記録の Chrome 拡張。初めての人向けの<strong>長い文章ガイド</strong>と公式へのボタンは、
                  <strong>下の専用ブロック</strong>にまとめてあります。
                </p>
                <span className={styles.featureCta}>特大ガイドへジャンプ →</span>
              </div>
            </a>

            <a href="/chokaigi#venue-tour-3d-heading" className={styles.featureCard}>
              <span className={styles.featureIcon} aria-hidden="true">
                🎢
              </span>
              <div className={styles.featureBody}>
                <h3 className={styles.featureTitle}>
                  3D 会場ツアー
                </h3>
                <p className={styles.featureDesc}>
                  メイン 1〜8 + サブ 9〜11 の<strong>全 11 ホールを自動スクロール</strong>。
                  各ホールでキャラ 3 人が見どころを案内。当日のイメージトレーニングにどうぞ。
                </p>
                <span className={styles.featureCta}>ツアーに乗る →</span>
              </div>
            </a>

            <a href="/chokaigi#usage-heading" className={styles.featureCard}>
              <span className={styles.featureIcon} aria-hidden="true">
                📖
              </span>
              <div className={styles.featureBody}>
                <h3 className={styles.featureTitle}>
                  5 ステップの使いかたガイド
                </h3>
                <p className={styles.featureDesc}>
                  サインイン → 位置送信 → マッチ成立 → X で連絡 → 超会議で合流。
                  <strong>スマホのイラスト付き</strong>で、はじめての方でも迷わない導線に。
                </p>
                <span className={styles.featureCta}>使いかたを見る →</span>
              </div>
            </a>

            <a href="/chokaigi#venue-heading" className={styles.featureCard}>
              <span className={styles.featureIcon} aria-hidden="true">
                🚶
              </span>
              <div className={styles.featureBody}>
                <h3 className={styles.featureTitle}>
                  会場の回り方（こん太のコツ）
                </h3>
                <p className={styles.featureDesc}>
                  広大な幕張メッセを効率よく回るための
                  <strong>ルート設計のコツ</strong>を、こん太が 3 つのポイントで解説。
                  <strong>VenueWanderMini</strong> で回遊イメージも確認。
                </p>
                <span className={styles.featureCta}>回り方を読む →</span>
              </div>
            </a>

            <a href="/chokaigi#after-event-heading" className={styles.featureCard}>
              <span className={styles.featureIcon} aria-hidden="true">
                🚀
              </span>
              <div className={styles.featureBody}>
                <h3 className={styles.featureTitle}>
                  超会議が終わったあとも、ずっと
                </h3>
                <p className={styles.featureDesc}>
                  超会議 2026 は、あくまで始まり。
                  <strong>全国のイベント・日常のすれ違いにも広げていく構想</strong>を、
                  日本地図上でビジュアル化しています。
                </p>
                <span className={styles.featureCta}>構想を読む →</span>
              </div>
            </a>

            <a href="/chokaigi#privacy-heading" className={styles.featureCard}>
              <span className={styles.featureIcon} aria-hidden="true">
                🔐
              </span>
              <div className={styles.featureBody}>
                <h3 className={styles.featureTitle}>
                  プライバシー最優先の設計
                </h3>
                <p className={styles.featureDesc}>
                  他の参加者に見える位置は
                  <strong>粗いエリア（500m グリッドなど）に丸めた範囲のみ</strong>。
                  アプリ内 DM は設けず、やりとりは <strong>X アカウント同士</strong>で。
                </p>
                <span className={styles.featureCta}>方針を読む →</span>
              </div>
            </a>

            <a href="/chokaigi#special-thanks-heading" className={styles.featureCard}>
              <span className={styles.featureIcon} aria-hidden="true">
                🙏
              </span>
              <div className={styles.featureBody}>
                <h3 className={styles.featureTitle}>
                  Special Thanks（偉大な方々に感謝）
                </h3>
                <p className={styles.featureDesc}>
                  このアプリの原点・<strong>星野ロミさん</strong>を別枠カードで特別紹介。
                  ロゴを手がけた Soletta さんをはじめ、協力者ひとりひとりをきちんと紹介します。
                </p>
                <span className={styles.featureCta}>クレジットを見る →</span>
              </div>
            </a>
          </div>

          <CharacterTip
            character="tanunee"
            message="機能は全部「超会議を楽しんでもらう」ための道具なのだー。気負わずに、好きなものだけつまんで使ってくれたらうれしいのだー。"
            position="right"
          />
        </section>

        <section
          id="kimito-tsuioku-kirameki"
          className={`${styles.section} ${styles.kimitoKiramekiSection}`}
          aria-labelledby="kimito-tsuioku-kirameki-heading"
        >
          <h2 id="kimito-tsuioku-kirameki-heading">
            君斗りんくの追憶の煌めき
            <span className={styles.kimitoKiramekiSubtitle}>(きらめき)</span>
          </h2>
          <p className={styles.sectionLead}>
            ここは<strong>初めて見る人向け</strong>の、長めの説明コーナーです。
            キャラの掛け合いではなく、文章だけで「何のサービスか」「自分に関係あるか」「次に何をすればいいか」がわかるように書きました。
            このページのメインである<strong>すれちがいライト（位置のすれちがい）</strong>とは別の、
            <strong>君斗リンク工房</strong>の Chrome 拡張の紹介です。
          </p>

          <div className={styles.kimitoKiramekiPanel}>
            <h3 className={styles.kimitoKiramekiH3}>30秒でいうと</h3>
            <p className={styles.kimitoKiramekiP}>
              <strong>ニコニコ生放送を見ているときに流れてくる応援コメントを、あなたのパソコン側に記録しておくための Chrome 拡張</strong>です。
              配信が終わったあとでも、「誰がどんな言葉をくれたか」を一覧やファイルとして振り返りやすくする、というのが大まかな目的です。
            </p>

            <h3 className={styles.kimitoKiramekiH3}>なぜ必要なの？（よくあるモヤモヤ）</h3>
            <p className={styles.kimitoKiramekiP}>
              コメント欄はどんどん流れます。配信者さんは、時間の都合で全員に返信できないことも普通にあります。
              それ自体は誰のせいでもないのですが、「ちゃんと届いていたのかな」「自分の応援、空振りだったのかな」と感じると、応援がしんどくなることがあります。
            </p>
            <p className={styles.kimitoKiramekiP}>
              この拡張は、<strong>数を競うため</strong>ではなく、
              <strong>「書いた」「そこにいた」という事実を、自分の手元に残す</strong>ことに寄り添う発想で作られています（公式サイトの言葉の要約です）。
            </p>

            <h3 className={styles.kimitoKiramekiH3}>具体的にできること（イメージ）</h3>
            <p className={styles.kimitoKiramekiP}>
              細かい画面や用語の定義は<strong>公式サイトの文章が正</strong>ですが、イメージだけ先に共有します。
            </p>
            <ul className={styles.kimitoKiramekiBullets}>
              <li>
                <strong>視聴ページで流れる応援コメントを、PC に蓄積していく</strong>
                （あとから一覧で眺められるイメージ）
              </li>
              <li>
                <strong>HTML として保存</strong>して、ブラウザで開き直したり共有したりする流れ（手順は公式 LP）
              </li>
              <li>
                <strong>配信の振り返り向けの分析ページ</strong>があり、グラフなど入りのページを{" "}
                <strong>.html ファイルとしてダウンロード</strong>できる、という説明があります（公式 LP の「マーケ分析」まわり）
              </li>
            </ul>
            <p className={styles.kimitoKiramekiP}>
              対応ブラウザやインストール方法（Chrome ウェブストアなど）は、PC の環境によって変わります。
              <strong>実際に押すボタンや注意書きは、必ず公式サイト側で確認してください。</strong>
            </p>

            <h3 className={styles.kimitoKiramekiH3}>すれちがいライトとのちがい（混同しやすいので）</h3>
            <div className={styles.kimitoKiramekiCompare} role="region" aria-label="ふたつのサービスの比較">
              <div className={styles.kimitoKiramekiCompareCol}>
                <p className={styles.kimitoKiramekiCompareTitle}>このページのすれちがいライト</p>
                <p className={styles.kimitoKiramekiCompareBody}>
                  イベントや日常で、<strong>近くにいる参加者と位置情報ベースですれちがい記録</strong>ができるアプリ企画です。
                  X でつながる前提で、超会議向けのマップや検索などもここにあります。
                </p>
              </div>
              <div className={styles.kimitoKiramekiCompareCol}>
                <p className={styles.kimitoKiramekiCompareTitle}>追憶の煌めき（工房）</p>
                <p className={styles.kimitoKiramekiCompareBody}>
                  <strong>ニコ生の視聴画面</strong>を見ながら、
                  <strong>応援コメントを自分の PC に残す</strong> Chrome 拡張です。配信アーカイブとは別の「記録の仕方」が主役になります。
                </p>
              </div>
            </div>

            <h3 className={styles.kimitoKiramekiH3}>公式サイトの読み方（迷子にならない順番）</h3>
            <ol className={styles.kimitoKiramekiSteps}>
              <li>
                <span className={styles.kimitoKiramekiStepLabel}>1</span>
                <span>
                  まず LP をひらいて、上の<strong>ページ内リンク（章）</strong>から「知りたいこと」に飛ぶ（用語が多いので、いちばん気になる章からでOK）
                </span>
              </li>
              <li>
                <span className={styles.kimitoKiramekiStepLabel}>2</span>
                <span>
                  「拡張の見え方」「HTML 保存」「マーケ分析」など、目的に近い章を読む
                </span>
              </li>
              <li>
                <span className={styles.kimitoKiramekiStepLabel}>3</span>
                <span>
                  最後に<strong>導入・試用</strong>の章へ進み、自分の環境に合わせてインストールや試用の手順を踏む
                </span>
              </li>
            </ol>

            <h3 className={styles.kimitoKiramekiH3}>この先のロードマップについて</h3>
            <p className={styles.kimitoKiramekiP}>
              公式の説明では、今後 <strong>YouTube</strong> など<strong>他の配信プラットフォーム</strong>にも広げていく構想が触れられています。
              ただし「いつ」「どの形で」は変わりうるので、<strong>最新の一文は公式サイトを見るのが確実</strong>です。
            </p>

            <div className={styles.kimitoKiramekiCtaWrap}>
              <a
                href={TSUIOKU_NO_KIRAMEKI_LP_HREF}
                className={styles.kimitoKiramekiCta}
                target="_blank"
                rel="noopener noreferrer"
              >
                公式サイトを開く（追憶の煌めき）
              </a>
              <p className={styles.kimitoKiramekiCtaNote}>
                別タブで tsuioku-no-kirameki.com が開きます。スマホの X アプリ内ブラウザでは表示が制限されることがあるので、必要なら通常のブラウザで開き直してください。
              </p>
            </div>

            <p className={styles.mapFinePrint}>
              本ブロックは有志の超会議 LP からの案内であり、拡張の開発・サポート窓口ではありません。
              不具合・契約・削除方法などは、公式サイトの案内に従ってください。
            </p>
          </div>
        </section>

        <ChokaigiExperienceSection />

        <VenueTour3D />

        <section
          className={styles.section}
          aria-labelledby={USAGE_SECTION_HEADING_ID}
        >
          <h2 id={USAGE_SECTION_HEADING_ID}>{USAGE_SECTION_TITLE}</h2>
          <p className={styles.sectionLead}>{USAGE_SECTION_INTRO}</p>
          <CharacterTip
            character="rink"
            message="アプリの操作はシンプルだよ！歩いてるだけで、近くにいる人と自動でマッチングするんだ。"
          />
          <UsageGuide />
          <CharacterTip
            character="tanunee"
            message="初めての人も安心してね。困ったら私たちがサポートするから！"
            position="right"
          />
          <p className={styles.mapFinePrint}>{USAGE_FOOTNOTE}</p>
        </section>

        <section className={styles.section} aria-labelledby="venue-heading">
          <h2 id="venue-heading">{VENUE_SECTION_TITLE}</h2>
          <p className={styles.sectionLead}>{VENUE_SECTION_INTRO}</p>
          <CharacterTip
            character="konta"
            message="幕張は迷路みたいに広いからね！回るルートをざっくり決めておくと、迷子にもなりにくいよ。"
          />
          <ul className={styles.tipList}>
            {VENUE_SECTION_POINTS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <VenueWanderMini />
        </section>

        <section className={styles.section} aria-labelledby="map-heading">
          <h2 id="map-heading">{MAP_SECTION_TITLE}</h2>
          <p className={styles.sectionLead}>{MAP_SECTION_INTRO}</p>
          <CharacterTip
            character="rink"
            message="各ホールをタップすると詳細が見れるよ！行きたいブースを見つけてね。"
          />

          {/* インタラクティブマップ */}
          <h3 className={styles.mapSubheading}>ホールをタップして詳細を見る</h3>
          <VenueMapInteractive />
          <VenueLiveMap />
          <CreatorCrossSearch />

          <ol className={styles.mapHowToList}>
            {MAP_QUICK_STEPS.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ol>

          {/* ② 公式PDF: モバイル優先で先に表示（最も確実な情報源） */}
          <h3 className={styles.mapSubheading}>{MAP_PDF_TITLE}</h3>
          <p className={styles.mapFinePrint}>{MAP_PDF_NOTE}</p>
          <div className={styles.mapPdfCtaRow}>
            <a
              className={styles.mapPrimaryCta}
              href={venueMapPdfAbsoluteUrl()}
              target="_blank"
              rel="noopener noreferrer"
            >
              {MAP_PDF_PRIMARY_CTA_LABEL}
            </a>
            <a
              className={styles.mapSecondaryCta}
              href={venueMapPdfAbsoluteUrl()}
              download="chokaigi2026_map.pdf"
            >
              {MAP_PDF_SECONDARY_CTA_LABEL}
            </a>
          </div>
          <p className={`${styles.mapFinePrint} ${styles.mapMobileEmphasis}`}>
            {MAP_PDF_MOBILE_EMPHASIS}
          </p>
          {/* モバイルの iframe 相性問題を避けるため、埋め込みはデスクトップ幅のみ描画 */}
          <PdfDesktopEmbed />

          {/* ③ ホール別ガイド（モバイルの主役・テキスト検索可能） */}
          <h3 className={styles.mapSubheading}>{MAP_HALL_LIST_TITLE}</h3>
          <p className={styles.mapFinePrint}>{MAP_HALL_LIST_NOTE}</p>
          <p className={styles.mapDialogueHint}>
            {MAP_HALL_LIST_DIALOGUE_HINT_BEFORE}
            <a href="/chokaigi#yukkuri-dialogue-heading" className={styles.mapDialogueHintLink}>
              「ゆっくり超解説」
            </a>
            {MAP_HALL_LIST_DIALOGUE_HINT_AFTER}
          </p>
          <VenueHallList />

          {/* 詳細マップ（折りたたみ） */}
          <details className={styles.detailMapBlock}>
            <summary className={styles.detailMapSummary}>
              📍 詳細マップを表示
            </summary>
            <div className={styles.detailMapContent}>
              <p className={styles.mapFinePrint}>
                👆 スマホでは横スクロールで全体を見れます。PCでは全体が見やすいです。
              </p>
              <div className={styles.mapSvgScroll}>
                <VenueMapIllustration />
              </div>
            </div>
          </details>
        </section>

        <section className={styles.section} aria-labelledby="after-event-heading">
          <h2 id="after-event-heading">{AFTER_EVENT_SECTION_TITLE}</h2>
          <CharacterTip
            character="tanunee"
            message="超会議が終わっても、すれちがいライトは続くよ！全国のイベントで使えるようになるかも…？"
            position="right"
          />
          <JapanVenueLocator />
          <div className={styles.aspiration}>
            {AFTER_EVENT_SECTION_PARAGRAPHS.map((para, i) => (
              <p key={i} className={styles.aspirationPara}>
                {para}
              </p>
            ))}
          </div>
          <CharacterTip
            character="konta"
            message="みんなの声を聞いて、もっと良くしていくからね！楽しみにしててね〜！"
          />
        </section>

        <section className={styles.section} aria-labelledby="guides-heading">
          <h2 id="guides-heading">3人のゆっくりガイド（君斗りんく）</h2>
          <CharacterTip
            character="rink"
            message="ここまで読んでくれてありがとう！僕たち3人のことも知ってもらえたら嬉しいな。"
          />
          <p className={styles.sectionLead}>
            ページ冒頭の「ゆっくり超解説」でも登場した3人。アプリ内でも同じトーンで案内する想定です。立ち絵・プロフィールは{" "}
            <a
              href="https://kimito-link.com/characters/"
              target="_blank"
              rel="noopener noreferrer"
            >
              kimito-link のキャラ紹介
            </a>
            と同じ世界観です。
          </p>
          <div className={styles.grid}>
            {GUIDES.map((g) => (
              <div key={g.name} className={styles.card}>
                <a
                  className={styles.cardFigure}
                  href={g.profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${g.name}のキャラクター紹介（kimito-link）へ`}
                >
                  <Image
                    src={g.imageSrc}
                    alt=""
                    width={200}
                    height={200}
                    className={styles.avatarImg}
                    sizes="(max-width: 640px) 45vw, 200px"
                    priority={g.name === "りんく"}
                  />
                </a>
                <h3 className={styles.cardTitle}>
                  <a
                    href={g.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {g.name}
                  </a>
                </h3>
                <p className={styles.role}>{g.role}</p>
                <p className={styles.cardBody}>{g.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="privacy-heading">
          <h2 id="privacy-heading">プライバシー（方針）</h2>
          <p className={styles.note}>
            <strong>すれ違いを成立させるには、参加中の位置情報が必要です。</strong>
            すれちがいライト本体と同様、一定間隔での送信やバックグラウンド更新を想定します（マッチャーは数分単位など、実装に合わせて調整）。
            他者に見えるのは粗いエリア（例: 500m グリッドに丸めた位置）に留め、目的外の共有はしません。本サイト内にDM機能は設けず、実際の連絡はXアカウント同士で行う前提です。利用開始時の説明同意・オプトアウトの導線は公開時に明記します。
          </p>
          <p className={styles.note}>
            <strong>位置情報は「ここに居た」という記録として累計で残ります。</strong>
            マップや都道府県別のクリエイター一覧には、各ユーザーの<em>最新の位置</em>だけを表示します（過去の経路は他者には見えません）。
            退会（アカウント削除）をリクエストした時点で、あなたの位置情報はすべて即座に消去されます。
          </p>
        </section>

        <footer className={styles.footer}>
          <p className={styles.footerNav}>
            <a href="/">サイトトップ</a>
            <span aria-hidden="true"> · </span>
            <a href="/chokaigi">この企画LP（/chokaigi）</a>
          </p>
          <RomiProfileCard />

          <section className={styles.footerThanks} aria-labelledby="special-thanks-heading">
            <h2 id="special-thanks-heading" className={styles.footerThanksHeading}>
              Special Thanks
            </h2>
            <p className={styles.footerThanksIntro}>
              本企画にご協力いただいたみなさまを、ひとりずつご紹介します。
            </p>
            <CharacterTip
              character="rink"
              message={RINK_FOLLOWERS_THANKS_MESSAGE}
              className={styles.footerThanksRinkTip}
            />

            {SPECIAL_THANKS_HIGHLIGHT_PROFILES.length > 0 ? (
              <div className={styles.thanksHighlight}>
                {SPECIAL_THANKS_HIGHLIGHT_PROFILES.map((profile) => (
                  <SpecialThanksProfileCard key={profile.id} profile={profile} />
                ))}
              </div>
            ) : null}

            {SPECIAL_THANKS_NORMAL_PROFILES.length > 0 ? (
              <div className={styles.thanksProfileGrid}>
                {SPECIAL_THANKS_NORMAL_PROFILES.map((profile) => (
                  <SpecialThanksProfileCard key={profile.id} profile={profile} />
                ))}
              </div>
            ) : null}

            {SPECIAL_THANKS_X_ONLY.length > 0 ? (
              <div className={styles.thanksXOnly}>
                <h3 className={styles.thanksXOnlyHeading}>
                  X でご応援いただいているみなさま
                </h3>
                <ul className={styles.footerThanksList}>
                  {SPECIAL_THANKS_X_ONLY.map((link) =>
                    link.href === SPECIAL_THANKS_YURIPON_X_HREF ? (
                      <YuriponThanksXListItem key={link.href} />
                    ) : link.href === SPECIAL_THANKS_POKKURI_X_HREF ? (
                      <PokkuriThanksXListItem key={link.href} />
                    ) : (
                      <li key={link.href} className={styles.footerThanksItem}>
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.footerThanksLink}
                        >
                          <XLogoIcon className={styles.footerThanksLinkIcon} />
                          <span className={styles.footerThanksLinkLabel}>
                            {link.label}
                          </span>
                        </a>
                      </li>
                    )
                  )}
                </ul>
              </div>
            ) : null}

            <div className={styles.footerThanksMore}>
              <Link
                href="/chokaigi/special-thanks"
                className={styles.footerThanksMoreButton}
              >
                Special Thanks・クレジット一覧を見る
              </Link>
              <p className={styles.footerThanksMoreSubText}>
                地図・VOICEVOX 等の外部素材・ライブラリのクレジットも
                こちらのページにまとめています。
              </p>
            </div>
          </section>
          <div className={styles.footerBrand}>
            <Image
              src={LOGO_CREATOR_CROSS_HORIZONTAL_SRC}
              alt={LOGO_CREATOR_CROSS_ALT}
              width={720}
              height={240}
              className={styles.logoHorizontal}
              sizes="(max-width: 640px) 92vw, 400px"
            />
            <a
              className={styles.footerKimitoLink}
              href="https://kimito-link.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Kimito-Link（君斗りんく）公式サイトへ"
            >
              <Image
                src={LOGO_KIMITO_LINK_SRC}
                alt=""
                width={LOGO_KIMITO_LINK_WIDTH}
                height={LOGO_KIMITO_LINK_HEIGHT}
                className={styles.logoKimitoFooter}
                sizes="(max-width: 640px) 70vw, 200px"
              />
            </a>
          </div>
          <p>
            {LP_TITLE} — キャラクター・世界観は kimito-link に準拠した案内です。
          </p>
        </footer>
      </article>
    </main>
  );
}
