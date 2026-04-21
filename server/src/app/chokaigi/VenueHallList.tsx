import styles from "./chokaigi.module.css";
import { HALL_GUIDE_NOTE, HALL_SUMMARIES } from "./lp-content";
import {
  AREA_COLORS,
  EVENT_HALL,
  MAIN_HALLS,
  SUB_HALLS,
  type Hall,
  type Section,
} from "./venue-map-data";

type HallCardProps = {
  hall: Hall;
  /** カード下部に表示する簡潔な特徴説明 */
  summary: string;
  anchorId: string;
};

const AREA_LABEL: Record<string, string> = {
  stage: "ステージ",
  food: "フード",
  cc: "クリエイター",
  exp: "体験",
  goods: "物販",
  info: "インフォ",
  toilet: "トイレ",
  shrine: "神社",
  cosplay: "コスプレ",
  gaming: "ゲーム",
  entrance: "入口",
  smoking: "喫煙所",
  charge: "充電",
};

/** 公式PDFベースの代表表示順（guidePriority）を最優先し、次に featured / 種別で抽出 */
function topSections(sections: Section[], limit = 8): Section[] {
  const priority: Record<string, number> = {
    stage: 1,
    shrine: 1,
    entrance: 1,
    info: 2,
    toilet: 2,
    goods: 3,
    cosplay: 3,
    gaming: 3,
    cc: 4,
    exp: 5,
    food: 5,
    charge: 6,
    smoking: 6,
  };
  const scored = sections
    .map((s, i) => ({
      s,
      i,
      guide: s.guidePriority ?? 99,
      score: (s.featured ? 0 : 10) + (priority[s.area] ?? 9),
    }))
    .sort((a, b) => a.guide - b.guide || a.score - b.score || a.i - b.i);
  return scored.slice(0, limit).map((x) => x.s);
}

function hallSummary(hallNo: string | number): string {
  return HALL_SUMMARIES[String(hallNo)] ?? "主要エリア（目安）";
}

function eventSummary(): string {
  return HALL_SUMMARIES.event ?? "主要ステージ（目安）";
}

function HallCard({ hall, summary, anchorId }: HallCardProps) {
  const top = topSections(hall.sections, 6);
  return (
    <article id={anchorId} className={`${styles.hallCard} ${styles.hallCardAnchorTarget}`}>
      <div
        className={styles.hallCardBar}
        style={{ backgroundColor: hall.headerColor }}
        aria-hidden="true"
      />
      <div className={styles.hallCardHead}>
        <h4 className={styles.hallCardTitle}>
          <span className={styles.hallCardLabel}>{hall.label}</span>
          <span className={styles.hallCardSummary}>{summary}</span>
        </h4>
      </div>
      <ul className={styles.hallCardList}>
        {top.map((s, i) => {
          const color = AREA_COLORS[s.area];
          return (
            <li key={`${hall.no}-${i}`} className={styles.hallCardItem}>
              <div className={styles.hallCardItemTop}>
                {s.featured ? (
                  <span className={styles.hallCardStar} title="目立つエリア">
                    ★
                  </span>
                ) : null}
                <span
                  className={styles.hallCardBadge}
                  style={{
                    backgroundColor: color.fill,
                    borderColor: color.stroke,
                    color: color.text ?? "#2c2117",
                  }}
                >
                  {AREA_LABEL[s.area]}
                </span>
                {s.code ? (
                  <span className={styles.hallCardCode}>{s.code}</span>
                ) : null}
              </div>
              <div className={styles.hallCardName}>
                {s.name}
                {s.sub ? (
                  <span className={styles.hallCardSub}> · {s.sub}</span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {hall.sections.length > top.length ? (
        <details className={styles.hallCardDetails}>
          <summary className={styles.hallCardDetailsSummary}>
            このホールの全ブースを見る（{hall.sections.length}件）
          </summary>
          <ul className={styles.hallCardFullList}>
            {hall.sections.map((s, i) => (
              <li key={`full-${hall.no}-${i}`}>
                {s.code ? <strong>{s.code}</strong> : null}
                {s.code ? " " : ""}
                {s.name}
                {s.sub ? `（${s.sub}）` : ""}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {hall.note ? <p className={styles.hallCardNote}>📍 {hall.note}</p> : null}
    </article>
  );
}

export function VenueHallList() {
  return (
    <div className={styles.hallListWrap}>
      <p className={styles.hallGuideNote}>{HALL_GUIDE_NOTE}</p>

      {/* メイン棟 HALL 1〜8 */}
      <h3 className={styles.hallGroupHeading}>
        国際展示場 HALL 1〜8（メイン棟・2F）
      </h3>
      <div className={styles.hallCardGrid}>
        {[...MAIN_HALLS]
          .sort((a, b) => Number(a.no) - Number(b.no))
          .map((hall) => (
            <HallCard
              key={hall.no}
              hall={hall}
              summary={hallSummary(hall.no)}
              anchorId={`hall-card-${hall.no}`}
            />
          ))}
      </div>

      {/* HALL 9〜11 */}
      <h3 className={styles.hallGroupHeading}>国際展示場 HALL 9〜11</h3>
      <div className={styles.hallCardGrid}>
        {SUB_HALLS.map((hall) => (
          <HallCard
            key={hall.no}
            hall={hall}
            summary={hallSummary(hall.no)}
            anchorId={`hall-card-${hall.no}`}
          />
        ))}
      </div>

      {/* 幕張イベントホール */}
      <h3 className={styles.hallGroupHeading}>幕張イベントホール</h3>
      <article
        id="hall-card-event"
        className={`${styles.hallCard} ${styles.hallCardAnchorTarget}`}
      >
        <div
          className={styles.hallCardBar}
          style={{ backgroundColor: "#1976d2" }}
          aria-hidden="true"
        />
        <div className={styles.hallCardHead}>
          <h4 className={styles.hallCardTitle}>
            <span className={styles.hallCardLabel}>イベントホール</span>
            <span className={styles.hallCardSummary}>{eventSummary()}</span>
          </h4>
        </div>
        <ul className={styles.hallCardList}>
          {EVENT_HALL.sections.map((s, i) => {
            const color = AREA_COLORS[s.area];
            return (
              <li key={`ev-${i}`} className={styles.hallCardItem}>
                <div className={styles.hallCardItemTop}>
                  {s.featured ? (
                    <span className={styles.hallCardStar} title="目立つエリア">
                      ★
                    </span>
                  ) : null}
                  <span
                    className={styles.hallCardBadge}
                    style={{
                      backgroundColor: color.fill,
                      borderColor: color.stroke,
                      color: color.text ?? "#2c2117",
                    }}
                  >
                    {AREA_LABEL[s.area]}
                  </span>
                  {s.code ? (
                    <span className={styles.hallCardCode}>{s.code}</span>
                  ) : null}
                </div>
                <div className={styles.hallCardName}>
                  {s.name}
                  {s.sub ? (
                    <span className={styles.hallCardSub}> · {s.sub}</span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
        <p className={styles.hallCardNote}>📍 1F アリーナ（中央ステージ）／ 2F 観覧席</p>
      </article>
    </div>
  );
}
