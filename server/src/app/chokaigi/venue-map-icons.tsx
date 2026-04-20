/**
 * 会場マップで使う小アイコン集。純SVGで実装し依存なし。
 */
import type { ReactElement } from "react";

export type IconProps = { cx: number; cy: number; size?: number };

/** 星（大ステージ） */
export function IconStar({ cx, cy, size = 10 }: IconProps): ReactElement {
  const r = size;
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    pts.push(`${cx + rad * Math.cos(angle)},${cy + rad * Math.sin(angle)}`);
  }
  return <polygon points={pts.join(" ")} fill="#ffeb3b" stroke="#f57f17" strokeWidth="0.8" />;
}

/** 鳥居（超神社） */
export function IconShrine({ cx, cy, size = 12 }: IconProps): ReactElement {
  const s = size;
  return (
    <g stroke="#b71c1c" strokeWidth="1.5" strokeLinecap="round" fill="none">
      <line x1={cx - s} y1={cy - s * 0.6} x2={cx + s} y2={cy - s * 0.6} />
      <line x1={cx - s * 0.9} y1={cy - s * 0.3} x2={cx + s * 0.9} y2={cy - s * 0.3} />
      <line x1={cx - s * 0.6} y1={cy - s * 0.6} x2={cx - s * 0.6} y2={cy + s * 0.8} />
      <line x1={cx + s * 0.6} y1={cy - s * 0.6} x2={cx + s * 0.6} y2={cy + s * 0.8} />
    </g>
  );
}

/** インフォメーション i */
export function IconInfo({ cx, cy, size = 7 }: IconProps): ReactElement {
  return (
    <g>
      <circle cx={cx} cy={cy} r={size} fill="#f9a825" stroke="#f57f17" strokeWidth="1" />
      <text
        x={cx}
        y={cy + size * 0.5}
        textAnchor="middle"
        fill="#fff"
        fontSize={size * 1.2}
        fontWeight={700}
        fontFamily="inherit"
      >
        i
      </text>
    </g>
  );
}

/** トイレ WC */
export function IconToilet({ cx, cy, size = 8 }: IconProps): ReactElement {
  return (
    <g>
      <rect
        x={cx - size}
        y={cy - size * 0.6}
        width={size * 2}
        height={size * 1.2}
        rx={2}
        fill="#6a1b9a"
      />
      <text
        x={cx}
        y={cy + size * 0.3}
        textAnchor="middle"
        fill="#fff"
        fontSize={size * 0.9}
        fontWeight={700}
        fontFamily="inherit"
      >
        WC
      </text>
    </g>
  );
}

/** フード（ナイフ・フォーク） */
export function IconFood({ cx, cy, size = 6 }: IconProps): ReactElement {
  return (
    <g stroke="#ef6c00" strokeWidth="1.5" strokeLinecap="round" fill="none">
      <line x1={cx - size * 0.7} y1={cy - size} x2={cx - size * 0.7} y2={cy + size} />
      <line x1={cx + size * 0.7} y1={cy - size} x2={cx + size * 0.7} y2={cy + size} />
      <line x1={cx - size} y1={cy - size} x2={cx - size * 0.4} y2={cy - size * 0.3} />
      <line x1={cx - size * 0.4} y1={cy - size} x2={cx - size} y2={cy - size * 0.3} />
    </g>
  );
}

/** 充電・稲妻 */
export function IconCharge({ cx, cy, size = 7 }: IconProps): ReactElement {
  const s = size;
  return (
    <polygon
      points={`${cx - s * 0.3},${cy - s} ${cx + s * 0.4},${cy - s * 0.2} ${cx},${cy - s * 0.1} ${cx + s * 0.4},${cy + s} ${cx - s * 0.4},${cy + s * 0.1} ${cx + s * 0.1},${cy}`}
      fill="#ffc107"
      stroke="#f57f17"
      strokeWidth="0.8"
    />
  );
}

/** 喫煙 */
export function IconSmoking({ cx, cy, size = 7 }: IconProps): ReactElement {
  return (
    <g>
      <rect x={cx - size} y={cy - 2} width={size * 2} height={4} fill="#90a4ae" rx={0.5} />
      <path d={`M ${cx - size * 0.3} ${cy - 5} q 3 -3 0 -6`} stroke="#b0bec5" strokeWidth="1" fill="none" />
    </g>
  );
}

/** 下向き矢印（中央エントランス用大） */
export function IconArrowDown({ cx, cy, size = 22 }: IconProps): ReactElement {
  const s = size;
  return (
    <polygon
      points={`${cx - s * 0.35},${cy - s * 0.5} ${cx + s * 0.35},${cy - s * 0.5} ${cx + s * 0.35},${cy} ${cx + s * 0.7},${cy} ${cx},${cy + s * 0.7} ${cx - s * 0.7},${cy} ${cx - s * 0.35},${cy}`}
      fill="#2196f3"
      stroke="#0d47a1"
      strokeWidth="1.2"
      opacity="0.9"
    />
  );
}

/** 方位N */
export function IconNorth({ cx, cy, size = 22 }: IconProps): ReactElement {
  return (
    <g>
      <circle cx={cx} cy={cy} r={size} fill="rgba(255,255,255,0.95)" stroke="rgba(88,62,28,0.3)" strokeWidth="1" />
      <text
        x={cx}
        y={cy - size * 0.15}
        textAnchor="middle"
        fill="#3e2723"
        fontSize={size * 0.55}
        fontWeight={700}
        fontFamily="inherit"
      >
        N
      </text>
      <path d={`M ${cx} ${cy - size * 0.45} L ${cx} ${cy - size * 1.3}`} stroke="#c98e2b" strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}
