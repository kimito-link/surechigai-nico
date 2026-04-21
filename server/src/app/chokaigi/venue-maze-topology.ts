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
  "国際展示場メイン棟（HALL1〜8）と9〜11棟は、公式施設ガイドで示される2階の歩行者動線（メッセモール／エスプラナード等のペデストリアン）で連結されます。下図はその「複数の連絡口をもつ迷路型動線」をパックマン風に簡略化した示意です。正確な位置・出入口は公式PDFと会場掲示をご確認ください。";

/** viewBox 座標系（VenueWanderMini.svg と一致） */
export const MAZE_VIEW = { w: 100, h: 82 } as const;

type Seg = [[number, number], [number, number]];

/** 通路中心線（ペレット配置・参考用）。上: メイン棟前後の東西動線、下: 9〜11 前後の動線、縦: 連絡イメージ */
export const WALKWAY_CENTER_SEGMENTS: Seg[] = [
  // メイン棟直下の東西ウォーク（セントラルモール的な帯のイメージ）
  [[8, 28], [92, 28]],
  // 連絡①: 帯 → 9〜11 エリア（公式で言及のある複数連絡のうち西寄り）
  [[22, 28], [22, 40]],
  // 連絡②: 中央
  [[50, 28], [50, 40]],
  // 連絡③: 東寄り
  [[78, 28], [78, 40]],
  // 9〜11 前後の東西動線
  [[10, 46], [90, 46]],
  // H11 〜 幕張イベントホール方面
  [[82, 46], [92, 46]],
];

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
  // 端の重複をざっくり除去
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
