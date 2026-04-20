"use client";

import { useState } from "react";
import styles from "./VenueMapInteractive.module.css";
import { MAIN_HALLS, SUB_HALLS, AREA_COLORS, type Hall, type Section } from "./venue-map-data";
import { GUIDES } from "./lp-content";

const ALL_HALLS: Hall[] = [...MAIN_HALLS, ...SUB_HALLS];

const HALL_TIPS: Record<number, string> = {
  8: "超音楽祭やクリエイタークロスがある大ホール！",
  7: "超神社と超コスプレはここ！ファミマもあるよ",
  6: "超カレーと超盆踊り！お腹すいたらここ",
  5: "フード密集地帯！何を食べるか迷う〜",
  4: "正面入口！KADOKAWAブースも必見",
  3: "超スペシャルステージ！要チェック",
  2: "超物販ゾーン！お財布と相談",
  1: "踊ってみた・歌ってみたステージ！",
  9: "ゲームエリア！実況者に会えるかも",
  10: "超デスゲームなど体験ブース満載",
  11: "超ヤバシティ！コスプレイヤー必見",
};

type AreaCategory = {
  id: string;
  label: string;
  color: string;
  icon: string;
};

const AREA_CATEGORIES: AreaCategory[] = [
  { id: "stage", label: "ステージ", color: "#1565c0", icon: "🎤" },
  { id: "food", label: "フード", color: "#ef6c00", icon: "🍜" },
  { id: "goods", label: "物販", color: "#0288d1", icon: "🛍️" },
  { id: "exp", label: "体験", color: "#e91e63", icon: "🎮" },
  { id: "cosplay", label: "コスプレ", color: "#8e24aa", icon: "📸" },
  { id: "cc", label: "クリエイター", color: "#2e7d32", icon: "🎨" },
];

export function VenueMapInteractive() {
  const [selectedHall, setSelectedHall] = useState<Hall | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const getFilteredSections = (hall: Hall) => {
    if (!filterCategory) return hall.sections;
    return hall.sections.filter((s) => s.area === filterCategory);
  };

  const getGuideForHall = (hallNo: number) => {
    const idx = (hallNo - 1) % 3;
    return GUIDES[idx];
  };

  return (
    <div className={styles.container}>
      {/* カテゴリフィルター */}
      <div className={styles.filterBar}>
        <button
          className={`${styles.filterBtn} ${!filterCategory ? styles.filterBtnActive : ""}`}
          onClick={() => setFilterCategory(null)}
        >
          すべて
        </button>
        {AREA_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`${styles.filterBtn} ${filterCategory === cat.id ? styles.filterBtnActive : ""}`}
            style={{
              "--cat-color": cat.color,
            } as React.CSSProperties}
            onClick={() => setFilterCategory(filterCategory === cat.id ? null : cat.id)}
          >
            <span className={styles.filterIcon}>{cat.icon}</span>
            <span className={styles.filterLabel}>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* メインマップ */}
      <div className={styles.mapArea}>
        {/* 上段: HALL 1-8 */}
        <div className={styles.mainHallsLabel}>
          <span className={styles.floorBadge}>2F</span>
          メイン棟 HALL 1〜8
        </div>
        <div className={styles.mainHalls}>
          {[...MAIN_HALLS].reverse().map((hall) => {
            const isSelected = selectedHall?.no === hall.no;
            const filteredCount = filterCategory
              ? hall.sections.filter((s) => s.area === filterCategory).length
              : hall.sections.length;
            const hasMatch = !filterCategory || filteredCount > 0;

            return (
              <button
                key={hall.no}
                className={`${styles.hallCard} ${isSelected ? styles.hallCardSelected : ""} ${!hasMatch ? styles.hallCardDimmed : ""}`}
                style={{
                  "--hall-color": hall.headerColor,
                } as React.CSSProperties}
                onClick={() => setSelectedHall(isSelected ? null : hall)}
              >
                <div className={styles.hallHeader}>{hall.label}</div>
                <div className={styles.hallBody}>
                  {hall.sections.find((s) => s.featured)?.name || hall.sections[0]?.name}
                </div>
                {filterCategory && filteredCount > 0 && (
                  <div className={styles.matchBadge}>{filteredCount}</div>
                )}
              </button>
            );
          })}
        </div>

        {/* 入口表示 */}
        <div className={styles.entranceIndicator}>
          <div className={styles.entranceArrow}>↑</div>
          <div className={styles.entranceText}>正面入口（HALL 4）</div>
        </div>

        {/* 下段: HALL 9-11 */}
        <div className={styles.subHallsLabel}>
          <span className={styles.floorBadge}>1F</span>
          HALL 9〜11
        </div>
        <div className={styles.subHalls}>
          {SUB_HALLS.map((hall) => {
            const isSelected = selectedHall?.no === hall.no;
            const filteredCount = filterCategory
              ? hall.sections.filter((s) => s.area === filterCategory).length
              : hall.sections.length;
            const hasMatch = !filterCategory || filteredCount > 0;

            return (
              <button
                key={hall.no}
                className={`${styles.hallCard} ${isSelected ? styles.hallCardSelected : ""} ${!hasMatch ? styles.hallCardDimmed : ""}`}
                style={{
                  "--hall-color": hall.headerColor,
                } as React.CSSProperties}
                onClick={() => setSelectedHall(isSelected ? null : hall)}
              >
                <div className={styles.hallHeader}>{hall.label}</div>
                <div className={styles.hallBody}>
                  {hall.sections.find((s) => s.featured)?.name || hall.sections[0]?.name}
                </div>
                {filterCategory && filteredCount > 0 && (
                  <div className={styles.matchBadge}>{filteredCount}</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 選択ホール詳細 */}
      {selectedHall && (
        <div className={styles.detailPanel}>
          <div className={styles.detailHeader}>
            <div
              className={styles.detailTitle}
              style={{ backgroundColor: selectedHall.headerColor }}
            >
              {selectedHall.label}
            </div>
            <button
              className={styles.closeBtn}
              onClick={() => setSelectedHall(null)}
            >
              ✕
            </button>
          </div>

          {/* ガイドコメント */}
          <div className={styles.guideTip}>
            <img
              src={getGuideForHall(Number(selectedHall.no)).imageSrc}
              alt=""
              className={styles.guideAvatar}
            />
            <div className={styles.guideBubble}>
              {HALL_TIPS[Number(selectedHall.no)] || "チェックしてみてね！"}
            </div>
          </div>

          {/* セクション一覧 */}
          <div className={styles.sectionList}>
            {getFilteredSections(selectedHall).map((sec, i) => {
              const color = AREA_COLORS[sec.area];
              return (
                <div
                  key={i}
                  className={`${styles.sectionItem} ${sec.featured ? styles.sectionFeatured : ""}`}
                  style={{
                    backgroundColor: color.fill,
                    borderColor: color.stroke,
                  }}
                >
                  {sec.code && <span className={styles.sectionCode}>{sec.code}</span>}
                  <span className={styles.sectionName}>{sec.name}</span>
                  {sec.sub && <span className={styles.sectionSub}>{sec.sub}</span>}
                  {sec.featured && <span className={styles.featuredStar}>⭐</span>}
                </div>
              );
            })}
          </div>

          {getFilteredSections(selectedHall).length === 0 && (
            <div className={styles.noMatch}>
              このカテゴリのエリアはありません
            </div>
          )}
        </div>
      )}

      {/* 凡例 */}
      <div className={styles.legend}>
        <div className={styles.legendTitle}>色の見方</div>
        <div className={styles.legendItems}>
          {AREA_CATEGORIES.map((cat) => (
            <div key={cat.id} className={styles.legendItem}>
              <span
                className={styles.legendDot}
                style={{ backgroundColor: cat.color }}
              />
              <span>{cat.icon} {cat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
