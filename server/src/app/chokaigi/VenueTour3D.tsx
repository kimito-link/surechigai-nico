"use client";

import { useState, useEffect } from "react";
import styles from "./VenueTour3D.module.css";
import { MAIN_HALLS, SUB_HALLS, EVENT_HALL, AREA_COLORS, type Hall } from "./venue-map-data";
import { GUIDES } from "./lp-content";

type TourState = "intro" | "touring" | "paused";

// 入口（HALL 4）から始まるルート順に並べ替え
// HALL 4 → 3 → 2 → 1（右へ）→ 5 → 6 → 7 → 8（左へ）→ 9 → 10 → 11（サブ棟）
const HALL_ORDER = [4, 3, 2, 1, 5, 6, 7, 8, 9, 10, 11];
const ALL_HALLS: Hall[] = HALL_ORDER.map(
  (no) => [...MAIN_HALLS, ...SUB_HALLS].find((h) => h.no === no)!
);

const TOUR_COMMENTS: Record<number | string, { guide: number; text: string }> = {
  8: { guide: 0, text: "超音楽祭だ！推しグルライブ見たい〜" },
  7: { guide: 1, text: "超神社で御朱印もらおうね" },
  6: { guide: 2, text: "超カレー食べたい…お腹すいた" },
  5: { guide: 0, text: "フード密集地帯！何食べる？" },
  4: { guide: 1, text: "KADOKAWA！グッズ買わなきゃ" },
  3: { guide: 2, text: "超スペシャルステージ見逃せない" },
  2: { guide: 0, text: "超物販…財布が…" },
  1: { guide: 1, text: "踊ってみた見に行こ〜" },
  9: { guide: 2, text: "ゲームエリアだ！実況者いるかな" },
  10: { guide: 0, text: "超デスゲーム気になる…" },
  11: { guide: 1, text: "超ヤバシティ！コスプレ最高" },
};

export function VenueTour3D() {
  const [tourState, setTourState] = useState<TourState>("intro");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [transition, setTransition] = useState(0);

  const totalHalls = ALL_HALLS.length;
  const currentHall = ALL_HALLS[currentIndex];
  const comment = currentHall ? TOUR_COMMENTS[currentHall.no] : null;

  useEffect(() => {
    if (tourState !== "touring") return;

    const interval = setInterval(() => {
      setTransition((prev) => {
        const next = prev + 2;
        if (next >= 100) {
          setCurrentIndex((idx) => {
            const nextIdx = idx + 1;
            if (nextIdx >= totalHalls) {
              setTourState("intro");
              return 0;
            }
            return nextIdx;
          });
          return 0;
        }
        return next;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [tourState, totalHalls]);

  const startTour = () => {
    setTourState("touring");
    setCurrentIndex(0);
    setTransition(0);
  };

  const togglePause = () => {
    setTourState((prev) => (prev === "touring" ? "paused" : "touring"));
  };

  const goToHall = (index: number) => {
    setCurrentIndex(index);
    setTransition(0);
  };

  const getVisibleHalls = () => {
    const visible: { hall: Hall; position: number; index: number }[] = [];
    for (let i = -1; i <= 2; i++) {
      const idx = currentIndex + i;
      if (idx >= 0 && idx < totalHalls) {
        visible.push({
          hall: ALL_HALLS[idx],
          position: i,
          index: idx,
        });
      }
    }
    return visible;
  };

  const visibleHalls = getVisibleHalls();

  return (
    <section className={styles.tourSection}>
      <h2 className={styles.sectionTitle}>会場を3Dで探索</h2>
      <p className={styles.sectionLead}>
        幕張メッセを歩くように、会場をバーチャル体験
      </p>

      <div className={styles.tourContainer}>
        <div className={styles.viewport}>
          {/* 背景 */}
          <div className={styles.bgFloor} />
          <div className={styles.bgCeiling} />
          <div className={styles.bgWallLeft} />
          <div className={styles.bgWallRight} />

          {/* ホールパネル */}
          <div className={styles.hallTrack}>
            {visibleHalls.map(({ hall, position, index }) => {
              const featured = hall.sections.find((s) => s.featured);
              const areaColor = featured
                ? AREA_COLORS[featured.area]
                : { fill: "#ffffff", stroke: "#cccccc" };

              const zOffset = position * 300 - transition * 3;
              const scale = Math.max(0.3, 1 - Math.abs(zOffset) / 600);
              const opacity = Math.max(0.2, 1 - Math.abs(zOffset) / 500);
              const isLeft = index % 2 === 0;
              const xOffset = isLeft ? -180 : 180;

              return (
                <div
                  key={hall.no}
                  className={styles.hallPanel}
                  style={{
                    transform: `
                      translateX(${xOffset}px)
                      translateZ(${zOffset}px)
                      scale(${scale})
                      rotateY(${isLeft ? 15 : -15}deg)
                    `,
                    opacity,
                    backgroundColor: areaColor.fill,
                    borderColor: areaColor.stroke,
                    zIndex: 100 - Math.abs(position),
                  }}
                >
                  <div
                    className={styles.hallHeader}
                    style={{ backgroundColor: hall.headerColor }}
                  >
                    {hall.label}
                  </div>
                  <div className={styles.hallContent}>
                    {featured && (
                      <div className={styles.featuredName}>{featured.name}</div>
                    )}
                    {featured?.sub && (
                      <div className={styles.featuredSub}>{featured.sub}</div>
                    )}
                    <div className={styles.sectionCount}>
                      {hall.sections.length}エリア
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 中央の現在ホール表示 */}
          {currentHall && (
            <div className={styles.currentHallOverlay}>
              <span
                className={styles.currentDot}
                style={{ backgroundColor: currentHall.headerColor }}
              />
              <span className={styles.currentLabel}>{currentHall.label}</span>
            </div>
          )}
        </div>

        {/* ガイドキャラクター */}
        <div className={styles.guideArea}>
          {GUIDES.map((guide, index) => (
            <div
              key={guide.name}
              className={`${styles.guideChar} ${
                comment?.guide === index ? styles.guideActive : ""
              }`}
            >
              <img
                src={guide.imageSrc}
                alt={guide.name}
                className={styles.guideImg}
              />
              {comment?.guide === index && (
                <div className={styles.guideBubble}>{comment.text}</div>
              )}
            </div>
          ))}
        </div>

        {/* コントロール */}
        <div className={styles.controls}>
          {tourState === "intro" ? (
            <button className={styles.startBtn} onClick={startTour}>
              ▶ ツアー開始
            </button>
          ) : (
            <button className={styles.pauseBtn} onClick={togglePause}>
              {tourState === "touring" ? "⏸ 一時停止" : "▶ 再開"}
            </button>
          )}
        </div>

        {/* プログレスバー */}
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{
              width: `${((currentIndex + transition / 100) / totalHalls) * 100}%`,
            }}
          />
        </div>

        {/* ホール選択（サムネイル） */}
        <div className={styles.hallSelector}>
          {ALL_HALLS.map((hall, idx) => (
            <button
              key={hall.no}
              className={`${styles.hallDot} ${idx === currentIndex ? styles.hallDotActive : ""}`}
              style={{ backgroundColor: hall.headerColor }}
              onClick={() => goToHall(idx)}
              title={hall.label}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
