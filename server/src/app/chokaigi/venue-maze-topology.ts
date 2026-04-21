/**
 * 幕張メッセ「国際展示場」周辺の動線を、LP用ミニマップに落とすための参照メモ。
 *
 * 出典（一般公開情報）:
 * - 幕張メッセ公式サイト「国際展示場 9〜11」等: 2階ペデストリアンにより
 *   国際展示場 1〜8 と 9〜11、国際会議場、幕張イベントホール等が連携利用可能とされる。
 * - 「メッセモール」等 2F のプロムナード動線が各館をつなぐ（公式フロアガイド・施設紹介）。
 *
 * 注意: 本ファイルの座標は **示意**。正確な扉位置・幅・当日の一方通行は
 * 必ず公式PDF（/chokaigi/map/…）と会場掲示を優先すること。
 */

export const VENUE_MAZE_TOPOLOGY_NOTE =
  "国際展示場メイン棟（HALL1〜8）と9〜11棟は、公式施設ガイドで示される2階の歩行者動線（メッセモール／エスプラナード等のペデストリアン）で連結されます。下図はその「複数の連絡口をもつ迷路型動線」をパックマン風に細分化した示意です。正確な位置・出入口は公式PDFと会場掲示をご確認ください。";

/** viewBox 座標系（VenueWanderMini.svg と一致） */
export const MAZE_VIEW = { w: 100, h: 88 } as const;

/** メイン棟 H8→H1 のスロット（左から H8） */
export const MAIN_HALL_LAYOUT = {
  left: 4.5,
  slot: 11.2,
  gap: 0.55,
  y: 7,
  h: 14,
} as const;

export function mainHallRect(index0to7: number) {
  const w = MAIN_HALL_LAYOUT.slot - MAIN_HALL_LAYOUT.gap;
  return {
    x: MAIN_HALL_LAYOUT.left + index0to7 * MAIN_HALL_LAYOUT.slot,
    y: MAIN_HALL_LAYOUT.y,
    w,
    h: MAIN_HALL_LAYOUT.h,
  };
}

/** 2F 歩行者帯 */
export const MALL_BAND = { x: 3.5, y: 22, w: 93, h: 6.8 } as const;

/** 上階→下階の連絡（本数を増やして細分化） */
export const BRIDGE_X = [16, 28, 40, 52, 64, 76, 88] as const;

/** 9〜11 各ホール（左から H9） */
export const SUB_HALLS_LAYOUT = [
  { x: 4, y: 45, w: 29.5, h: 12 },
  { x: 35.25, y: 45, w: 29.5, h: 12 },
  { x: 66.5, y: 45, w: 29.5, h: 12 },
] as const;

type Seg = [[number, number], [number, number]];

function pushSegs(out: Seg[], segs: Seg[]) {
  out.push(...segs);
}

/** 細分化した通路中心線（ペレット・動線イメージ用） */
export function buildFineWalkwaySegments(): Seg[] {
  const s: Seg[] = [];
  const mallCy = MALL_BAND.y + MALL_BAND.h * 0.35;
  const mallCy2 = MALL_BAND.y + MALL_BAND.h * 0.7;
  const hallBottom = MAIN_HALL_LAYOUT.y + MAIN_HALL_LAYOUT.h;

  // 2F 帯：二層の東西レーン
  pushSegs(s, [
    [[6, mallCy], [94, mallCy]],
    [[6, mallCy2], [94, mallCy2]],
  ]);

  // 各ホール列の中心から帯へ降りる短い縦（8本）
  for (let i = 0; i < 8; i++) {
    const { x, w } = mainHallRect(i);
    const cx = x + w / 2;
    pushSegs(s, [[[cx, hallBottom], [cx, mallCy]]]);
  }

  // 連絡口：帯から下層へ（7 本）
  const lowerY = 43;
  for (const bx of BRIDGE_X) {
    pushSegs(s, [[[bx, mallCy2], [bx, lowerY]]]);
  }

  // 下層：東西を複数レーン（迷路の「横穴」）
  pushSegs(s, [
    [[5, 43], [95, 43]],
    [[5, 47], [95, 47]],
    [[5, 51], [95, 51]],
    [[5, 55], [95, 55]],
  ]);

  // 各サブホール内の縦短絡（ブース列のイメージ）
  for (const hall of SUB_HALLS_LAYOUT) {
    const x1 = hall.x + hall.w / 3;
    const x2 = hall.x + (2 * hall.w) / 3;
    const ym = hall.y + hall.h / 2;
    pushSegs(s, [
      [[x1, hall.y + 1.2], [x1, hall.y + hall.h - 1.2]],
      [[x2, hall.y + 1.2], [x2, hall.y + hall.h - 1.2]],
      [[hall.x + 1, ym], [hall.x + hall.w - 1, ym]],
    ]);
  }

  // H11 〜 幕張イベントホール（斜め・曲がり）
  pushSegs(s, [
    [[82, 51], [90, 58]],
    [[90, 58], [90, 64]],
    [[78, 55], [84, 62]],
  ]);

  return s;
}

export const WALKWAY_CENTER_SEGMENTS: Seg[] = buildFineWalkwaySegments();

export function pelletsAlongSegments(
  segments: Seg[],
  spacing: number
): { cx: number; cy: number }[] {
  const out: { cx: number; cy: number }[] = [];
  for (const [[x0, y0], [x1, y1]] of segments) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    const n = Math.max(1, Math.floor(len / spacing));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      out.push({ cx: x0 + dx * t, cy: y0 + dy * t });
    }
  }
  const key = (p: { cx: number; cy: number }) =>
    `${p.cx.toFixed(2)},${p.cy.toFixed(2)}`;
  const seen = new Set<string>();
  return out.filter((p) => {
    const k = key(p);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
