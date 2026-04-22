/** viewport / canonical: chokaigi/layout.tsx */
import Link from "next/link";
import Image from "next/image";
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
  SPECIAL_THANKS_X_ONLY,
} from "./special-thanks-links";
import { RomiProfileCard } from "./RomiProfileCard";
import { SpecialThanksProfileCard } from "./SpecialThanksProfileCard";
import { XLogoIcon } from "./XLogoIcon";

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

            <a href="#map-heading" className={styles.featureCard}>
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

            <a href="#creator-cross-search-heading" className={styles.featureCard}>
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

            <a href="#yukkuri-dialogue-heading" className={styles.featureCard}>
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

            <a href="#venue-tour-3d-heading" className={styles.featureCard}>
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

            <a href="#usage-heading" className={styles.featureCard}>
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

            <a href="#venue-heading" className={styles.featureCard}>
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

            <a href="#after-event-heading" className={styles.featureCard}>
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

            <a href="#privacy-heading" className={styles.featureCard}>
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

            <a href="#special-thanks-heading" className={styles.featureCard}>
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
            <a href="#yukkuri-dialogue-heading" className={styles.mapDialogueHintLink}>
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
                  {SPECIAL_THANKS_X_ONLY.map((link) => (
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
                  ))}
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
