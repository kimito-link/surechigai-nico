"use client";

import { useMemo } from "react";
import {
  extractPrefecture,
  latLngToPercent,
  PREFECTURES,
  type PrefectureInfo,
} from "@/lib/prefectureCoords";
import styles from "../app.module.css";

type AreaStat = { area: string; count: number };

type Props = {
  areaStats: AreaStat[];
  selfMunicipality?: string | null;
};

type AggregatedPin = {
  pref: PrefectureInfo;
  count: number;
  isSelf: boolean;
  leftPct: number;
  topPct: number;
};

/**
 * areaStats (市区町村単位) を都道府県ごとに集約し、簡易日本地図上にピン表示する。
 * 沖縄は本土バウンディングボックス外なので別枠で表示する。
 */
export default function JapanMap({ areaStats, selfMunicipality }: Props) {
  const { mainPins, okinawaPin, totalShown, unknownCount } = useMemo(() => {
    const byPrefName = new Map<string, { pref: PrefectureInfo; count: number }>();
    let unknown = 0;
    for (const stat of areaStats) {
      const pref = extractPrefecture(stat.area);
      if (!pref) {
        unknown += stat.count;
        continue;
      }
      const existing = byPrefName.get(pref.name);
      if (existing) existing.count += stat.count;
      else byPrefName.set(pref.name, { pref, count: stat.count });
    }

    const selfPref = extractPrefecture(selfMunicipality ?? null);

    const mainPins: AggregatedPin[] = [];
    let okinawaPin: AggregatedPin | null = null;
    let totalShown = 0;

    for (const { pref, count } of byPrefName.values()) {
      const isSelf = Boolean(selfPref && selfPref.name === pref.name);
      totalShown += count;
      if (pref.region === "沖縄") {
        okinawaPin = { pref, count, isSelf, leftPct: 0, topPct: 0 };
        continue;
      }
      const pos = latLngToPercent(pref.lat, pref.lng);
      if (!pos) continue;
      mainPins.push({
        pref,
        count,
        isSelf,
        leftPct: pos.leftPct,
        topPct: pos.topPct,
      });
    }

    // 多い順で描画（少ない方が上にくると重なって見えないため）
    mainPins.sort((a, b) => a.count - b.count);

    return { mainPins, okinawaPin, totalShown, unknownCount: unknown };
  }, [areaStats, selfMunicipality]);

  const maxCount = Math.max(1, ...mainPins.map((p) => p.count), okinawaPin?.count ?? 0);

  if (totalShown === 0 && !okinawaPin) {
    return (
      <p className={styles.liveMapEmpty}>
        まだ全国の参加者データがありません
      </p>
    );
  }

  return (
    <div className={styles.japanMapWrap}>
      <div className={styles.japanMapFrame} aria-label="全国の参加者分布マップ">
        {/* 都道府県アウトライン（簡易バックグラウンド） */}
        <div className={styles.japanMapBackdrop} aria-hidden="true">
          {PREFECTURES.filter((p) => p.region !== "沖縄").map((p) => {
            const pos = latLngToPercent(p.lat, p.lng);
            if (!pos) return null;
            return (
              <span
                key={`bg-${p.name}`}
                className={styles.japanMapDot}
                style={{ left: `${pos.leftPct}%`, top: `${pos.topPct}%` }}
              />
            );
          })}
        </div>

        {mainPins.map((pin) => {
          const scale = 0.7 + 0.6 * (pin.count / maxCount);
          return (
            <div
              key={pin.pref.name}
              className={`${styles.japanMapPin} ${pin.isSelf ? styles.japanMapPinMe : ""}`}
              style={{
                left: `${pin.leftPct}%`,
                top: `${pin.topPct}%`,
                transform: `translate(-50%, -50%) scale(${scale})`,
              }}
              title={`${pin.pref.name} ${pin.count}人${pin.isSelf ? "（あなた）" : ""}`}
            >
              <span className={styles.japanMapPinCount}>{pin.count}</span>
              <span className={styles.japanMapPinLabel}>{pin.pref.name}</span>
            </div>
          );
        })}
      </div>

      {okinawaPin && (
        <div className={styles.japanMapOkinawa}>
          <span className={styles.japanMapPinCount}>{okinawaPin.count}</span>
          <span className={styles.japanMapPinLabel}>沖縄県</span>
        </div>
      )}

      <p className={styles.japanMapSummary}>
        全国{totalShown}人が参加中
        {unknownCount > 0 && `（エリア特定中: ${unknownCount}人）`}
      </p>
    </div>
  );
}
