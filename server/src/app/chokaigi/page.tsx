/** viewport / canonical: chokaigi/layout.tsx */
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
import { YukkuriDialogue } from "./YukkuriDialogue";

export default function ChokaigiPage() {
  return (
    <main className={styles.shell}>
      <article>
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
              <span className={styles.badge}>ニコニコ超会議 · 企画予告</span>
              <h1>{HERO_HEADING}</h1>
              <p>{HERO_LEAD}</p>
            </div>
          </div>
        </header>

        <YukkuriDialogue />

        <ChokaigiExperienceSection />

        <section
          className={styles.section}
          aria-labelledby={USAGE_SECTION_HEADING_ID}
        >
          <h2 id={USAGE_SECTION_HEADING_ID}>{USAGE_SECTION_TITLE}</h2>
          <p className={styles.sectionLead}>{USAGE_SECTION_INTRO}</p>
          <UsageGuide />
          <p className={styles.mapFinePrint}>{USAGE_FOOTNOTE}</p>
        </section>

        <section className={styles.section} aria-labelledby="venue-heading">
          <h2 id="venue-heading">{VENUE_SECTION_TITLE}</h2>
          <p className={styles.sectionLead}>{VENUE_SECTION_INTRO}</p>
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

          {/* ① 概略図SVG: モバイルはチェックボックスで折りたたみ、デスクトップは常時表示 */}
          <div className={styles.mapSvgBlock}>
            <input
              type="checkbox"
              id="chokaigi-svg-toggle"
              className={styles.mapSvgToggleInput}
            />
            <label
              htmlFor="chokaigi-svg-toggle"
              className={styles.mapSvgToggleLabel}
            >
              <span className={styles.mapSvgToggleLabelText}>
                {MAP_SCHEMATIC_TITLE}（地図イメージを表示）
              </span>
              <span className={styles.mapSvgToggleChevron} aria-hidden="true">
                ▾
              </span>
            </label>
            <div className={styles.mapSvgReveal}>
              <h3 className={`${styles.mapSubheading} ${styles.mapSvgDesktopHeading}`}>
                {MAP_SCHEMATIC_TITLE}
              </h3>
              <p className={styles.mapFinePrint}>{MAP_SCHEMATIC_NOTE}</p>
              <div className={styles.mapSvgOuter}>
                <VenueMapIllustration />
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="after-event-heading">
          <h2 id="after-event-heading">{AFTER_EVENT_SECTION_TITLE}</h2>
          <JapanVenueLocator />
          <div className={styles.aspiration}>
            {AFTER_EVENT_SECTION_PARAGRAPHS.map((para, i) => (
              <p key={i} className={styles.aspirationPara}>
                {para}
              </p>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="guides-heading">
          <h2 id="guides-heading">3人のゆっくりガイド（君斗りんく）</h2>
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
            他者に見えるのは粗いエリア（例: 500m グリッドに丸めた位置）に留め、目的外の共有はしません。利用開始時の説明同意・オプトアウトの導線は公開時に明記します。
          </p>
        </section>

        <footer className={styles.footer}>
          <p className={styles.footerNav}>
            <a href="/">サイトトップ</a>
            <span aria-hidden="true"> · </span>
            <a href="/chokaigi">この企画LP（/chokaigi）</a>
          </p>
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
