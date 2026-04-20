import styles from "./chokaigi.module.css";
import {
  AREA_COLORS,
  EVENT_HALL,
  LEGEND_AREA,
  LEGEND_ENTRIES,
  MAIN_HALLS,
  OVERVIEW_MAP,
  SUB_HALLS,
  SUB_HALLS_CONTAINER,
  type Hall,
  type Section,
} from "./venue-map-data";
import {
  IconArrowDown,
  IconCharge,
  IconFood,
  IconInfo,
  IconNorth,
  IconShrine,
  IconSmoking,
  IconStar,
  IconToilet,
} from "./venue-map-icons";

const VB = { w: 1280, h: 820 };

function SectionRect({
  sec,
  hall,
}: {
  sec: Section;
  hall: Hall;
}) {
  const headerH = 22;
  const innerX = hall.x + sec.x;
  const innerY = hall.y + headerH + sec.y;
  const color = AREA_COLORS[sec.area];
  const fs = sec.fs ?? 9;
  const textColor = color.text ?? "#2c2117";

  return (
    <g>
      <rect
        x={innerX}
        y={innerY}
        width={sec.w}
        height={sec.h}
        rx={sec.featured ? 4 : 2.5}
        fill={color.fill}
        stroke={color.stroke}
        strokeWidth={sec.featured ? 1.5 : 1}
        opacity={sec.area === "stage" ? 0.95 : 0.85}
      />
      {sec.featured && sec.area === "stage" ? (
        <IconStar cx={innerX + 10} cy={innerY + 10} size={7} />
      ) : null}
      {sec.area === "shrine" ? (
        <IconShrine cx={innerX + sec.w / 2} cy={innerY + sec.h * 0.35} size={9} />
      ) : null}
      {sec.area === "info" ? (
        <IconInfo cx={innerX + 10} cy={innerY + sec.h / 2} size={5} />
      ) : null}
      {sec.area === "toilet" ? (
        <IconToilet cx={innerX + sec.w / 2} cy={innerY + sec.h * 0.35} size={6} />
      ) : null}
      {sec.area === "entrance" ? (
        <IconArrowDown cx={innerX + sec.w / 2} cy={innerY + sec.h * 0.45} size={18} />
      ) : null}
      {sec.area === "food" && sec.w > 40 ? (
        <IconFood cx={innerX + 8} cy={innerY + 9} size={4} />
      ) : null}

      {/* 出展コード */}
      {sec.code ? (
        <text
          x={innerX + 3}
          y={innerY + (sec.area === "stage" ? 22 : 10)}
          fill={sec.area === "stage" ? "#fff" : "#6d4c41"}
          fontSize={sec.code.length > 3 ? 6.5 : 7.5}
          fontWeight={700}
          fontFamily="inherit"
          opacity={0.9}
        >
          {sec.code}
        </text>
      ) : null}

      {/* 名前 */}
      <text
        x={innerX + sec.w / 2}
        y={
          sec.featured
            ? innerY + sec.h / 2 + (sec.sub ? -2 : 2)
            : innerY + sec.h / 2 + (sec.sub ? -2 : 3)
        }
        textAnchor="middle"
        fill={textColor}
        fontSize={fs}
        fontWeight={sec.featured ? 700 : 600}
        fontFamily="inherit"
      >
        {sec.name}
      </text>
      {sec.sub ? (
        <text
          x={innerX + sec.w / 2}
          y={innerY + sec.h / 2 + fs + 2}
          textAnchor="middle"
          fill={sec.area === "stage" ? "#e3f2fd" : "#6d4c41"}
          fontSize={Math.max(6.5, fs - 2)}
          fontFamily="inherit"
        >
          {sec.sub}
        </text>
      ) : null}
    </g>
  );
}

function HallBlock({ hall }: { hall: Hall }) {
  return (
    <g>
      {/* ホール外枠（背景） */}
      <rect
        x={hall.x}
        y={hall.y + 22}
        width={hall.w}
        height={hall.h - 22}
        rx={6}
        fill={hall.bodyFill}
        stroke="rgba(88,62,28,0.25)"
        strokeWidth="1"
      />
      {/* ヘッダー帯 */}
      <rect
        x={hall.x}
        y={hall.y}
        width={hall.w}
        height={22}
        rx={5}
        fill={hall.headerColor}
        stroke="rgba(0,0,0,0.15)"
        strokeWidth="1"
      />
      <text
        x={hall.x + hall.w / 2}
        y={hall.y + 15}
        textAnchor="middle"
        fill="#fff"
        fontSize="12"
        fontWeight={700}
        fontFamily="inherit"
      >
        {hall.label}
      </text>
      {/* セクション */}
      {hall.sections.map((sec, i) => (
        <SectionRect key={`${hall.no}-${i}`} sec={sec} hall={hall} />
      ))}
    </g>
  );
}

/** 幕張イベントホール（1F/2F 二重円） */
function EventHallBlock() {
  const cx = EVENT_HALL.arena.cx;
  const cy = EVENT_HALL.arena.cy;
  return (
    <g>
      {/* 外枠 */}
      <rect
        x={EVENT_HALL.x}
        y={EVENT_HALL.y + 22}
        width={EVENT_HALL.w}
        height={EVENT_HALL.h - 22}
        rx={10}
        fill="#e1f5fe"
        stroke="rgba(21,101,192,0.35)"
        strokeWidth="1"
      />
      <rect
        x={EVENT_HALL.x}
        y={EVENT_HALL.y}
        width={EVENT_HALL.w}
        height={22}
        rx={5}
        fill="#1976d2"
      />
      <text
        x={EVENT_HALL.x + EVENT_HALL.w / 2}
        y={EVENT_HALL.y + 15}
        textAnchor="middle"
        fill="#fff"
        fontSize="12"
        fontWeight={700}
        fontFamily="inherit"
      >
        {EVENT_HALL.label}
      </text>
      {/* 2Fロビー */}
      <text x={EVENT_HALL.x + 16} y={EVENT_HALL.y + 42} fill="#0d47a1" fontSize="9" fontWeight={700} fontFamily="inherit">
        2F
      </text>
      <text x={EVENT_HALL.x + EVENT_HALL.w - 40} y={EVENT_HALL.y + 42} fill="#0d47a1" fontSize="9" fontWeight={700} fontFamily="inherit">
        2F 通路
      </text>
      {/* アリーナ外円（2F観覧） */}
      <ellipse
        cx={cx}
        cy={cy}
        rx={EVENT_HALL.arena.rx + 10}
        ry={EVENT_HALL.arena.ry + 8}
        fill="#bbdefb"
        stroke="#1565c0"
        strokeWidth="1"
        strokeDasharray="3 2"
      />
      <text
        x={cx}
        y={cy - EVENT_HALL.arena.ry - 14}
        textAnchor="middle"
        fill="#1565c0"
        fontSize="8"
        fontFamily="inherit"
      >
        2F 観覧席
      </text>
      {/* 1Fアリーナ */}
      <ellipse
        cx={cx}
        cy={cy}
        rx={EVENT_HALL.arena.rx}
        ry={EVENT_HALL.arena.ry}
        fill="#e3f2fd"
        stroke="#1565c0"
        strokeWidth="1.5"
      />
      {/* 中央ステージ */}
      <rect
        x={cx - 30}
        y={cy - 12}
        width={60}
        height={24}
        rx={3}
        fill="#1565c0"
        stroke="#0d47a1"
      />
      <IconStar cx={cx - 20} cy={cy - 1} size={5} />
      <text
        x={cx}
        y={cy + 4}
        textAnchor="middle"
        fill="#fff"
        fontSize="9"
        fontWeight={700}
        fontFamily="inherit"
      >
        E1 超ボカニコ
      </text>
      <text
        x={cx}
        y={cy + EVENT_HALL.arena.ry - 8}
        textAnchor="middle"
        fill="#0d47a1"
        fontSize="8"
        fontFamily="inherit"
      >
        1F アリーナ
      </text>
      {/* E2 / E3 */}
      <rect
        x={EVENT_HALL.x + 18}
        y={EVENT_HALL.y + EVENT_HALL.h - 58}
        width={96}
        height={36}
        rx={3}
        fill="#fce4ec"
        stroke="#e91e63"
        strokeWidth="1"
      />
      <text x={EVENT_HALL.x + 22} y={EVENT_HALL.y + EVENT_HALL.h - 46} fill="#6d4c41" fontSize="7" fontWeight={700} fontFamily="inherit">
        E2
      </text>
      <text
        x={EVENT_HALL.x + 66}
        y={EVENT_HALL.y + EVENT_HALL.h - 40}
        textAnchor="middle"
        fill="#2c2117"
        fontSize="8"
        fontWeight={600}
        fontFamily="inherit"
      >
        超スキマ勇者
      </text>
      <rect
        x={EVENT_HALL.x + EVENT_HALL.w - 114}
        y={EVENT_HALL.y + EVENT_HALL.h - 58}
        width={96}
        height={36}
        rx={3}
        fill="#fce4ec"
        stroke="#e91e63"
        strokeWidth="1"
      />
      <text x={EVENT_HALL.x + EVENT_HALL.w - 110} y={EVENT_HALL.y + EVENT_HALL.h - 46} fill="#6d4c41" fontSize="7" fontWeight={700} fontFamily="inherit">
        E3
      </text>
      <text
        x={EVENT_HALL.x + EVENT_HALL.w - 66}
        y={EVENT_HALL.y + EVENT_HALL.h - 40}
        textAnchor="middle"
        fill="#2c2117"
        fontSize="7.5"
        fontWeight={600}
        fontFamily="inherit"
      >
        超しりとり バベル
      </text>
    </g>
  );
}

/** 会場全体図（ミニマップ） */
function OverviewMapBlock() {
  const { x, y, w, h, label } = OVERVIEW_MAP;
  return (
    <g>
      <rect x={x} y={y + 22} width={w} height={h - 22} rx={10} fill="#fafafa" stroke="rgba(88,62,28,0.2)" strokeWidth="1" />
      <rect x={x} y={y} width={w} height={22} rx={5} fill="#5c6bc0" />
      <text x={x + w / 2} y={y + 15} textAnchor="middle" fill="#fff" fontSize="12" fontWeight={700} fontFamily="inherit">
        {label}
      </text>

      {/* HALL 1-8 ミニマップ（横帯） */}
      <text x={x + 16} y={y + 40} fill="#455a64" fontSize="9" fontWeight={700} fontFamily="inherit">
        国際展示場 HALL 1〜8（メイン棟）
      </text>
      {[8, 7, 6, 5, 4, 3, 2, 1].map((n, i) => {
        const w1 = (w - 36) / 8;
        const hx = x + 18 + i * w1;
        return (
          <g key={n}>
            <rect x={hx} y={y + 46} width={w1 - 2} height={30} rx={2} fill="#fce4ec" stroke="#e91e63" strokeWidth="0.8" />
            <text x={hx + (w1 - 2) / 2} y={y + 64} textAnchor="middle" fill="#6d4c41" fontSize="8" fontFamily="inherit">
              H{n}
            </text>
          </g>
        );
      })}
      {/* 中央エントランス */}
      <IconArrowDown cx={x + w / 2} cy={y + 88} size={12} />
      <text x={x + w / 2} y={y + 103} textAnchor="middle" fill="#0d47a1" fontSize="7" fontWeight={700} fontFamily="inherit">
        中央エントランス
      </text>

      {/* HALL 9-11 */}
      <text x={x + 16} y={y + 128} fill="#455a64" fontSize="9" fontWeight={700} fontFamily="inherit">
        国際展示場 HALL 9〜11
      </text>
      {[9, 10, 11].map((n, i) => {
        const w1 = 64;
        const hx = x + 18 + i * (w1 + 4);
        return (
          <g key={n}>
            <rect x={hx} y={y + 134} width={w1} height={28} rx={2} fill="#f1f8e9" stroke="#689f38" strokeWidth="0.8" />
            <text x={hx + w1 / 2} y={y + 151} textAnchor="middle" fill="#33691e" fontSize="8" fontFamily="inherit">
              H{n}
            </text>
          </g>
        );
      })}

      {/* 幕張イベントホール */}
      <text x={x + 230} y={y + 128} fill="#455a64" fontSize="9" fontWeight={700} fontFamily="inherit">
        幕張イベントホール
      </text>
      <ellipse cx={x + 276} cy={y + 150} rx={40} ry={20} fill="#e3f2fd" stroke="#1565c0" strokeWidth="1" />
      <circle cx={x + 276} cy={y + 150} r={10} fill="#1565c0" />

      {/* 接続線 */}
      <path d={`M ${x + w / 2} ${y + 104} L ${x + 50} ${y + 128}`} stroke="#888" strokeWidth="1" strokeDasharray="3 2" fill="none" />
      <path d={`M ${x + w / 2} ${y + 104} L ${x + 276} ${y + 130}`} stroke="#888" strokeWidth="1" strokeDasharray="3 2" fill="none" />

      {/* 注記 */}
      <text x={x + w / 2} y={y + h - 42} textAnchor="middle" fill="#546e7a" fontSize="8" fontFamily="inherit">
        メイン棟から下（南側）にイベントホール、北側にHALL 9〜11
      </text>
      <text x={x + w / 2} y={y + h - 26} textAnchor="middle" fill="#6d4c41" fontSize="7" fontFamily="inherit">
        ※ 正確な配置は公式PDFを参照
      </text>
      <text x={x + w / 2} y={y + h - 12} textAnchor="middle" fill="#6d4c41" fontSize="7" fontFamily="inherit">
        （これはイメージ図です）
      </text>
    </g>
  );
}

/** 凡例 */
function LegendBlock() {
  const { x, y, w } = LEGEND_AREA;
  const cols = 4;
  const rowH = 18;
  const colW = (w - 16) / cols;

  return (
    <g>
      <rect x={x} y={y} width={w} height={76} rx={8} fill="rgba(255,251,245,0.95)" stroke="rgba(88,62,28,0.2)" strokeWidth="1" />
      <text x={x + 12} y={y + 16} fill="#2c2117" fontSize="11" fontWeight={700} fontFamily="inherit">
        凡例（公式マップの色分けに準拠した目安）
      </text>

      {LEGEND_ENTRIES.map((entry, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const lx = x + 14 + col * colW;
        const ly = y + 32 + row * rowH;
        const color = AREA_COLORS[entry.area];
        return (
          <g key={entry.label}>
            <rect x={lx} y={ly - 8} width={14} height={11} rx={2} fill={color.fill} stroke={color.stroke} strokeWidth="1" />
            <text x={lx + 20} y={ly + 1} fill="#2c2117" fontSize="9" fontFamily="inherit">
              {entry.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** 施設アイコン凡例 */
function FacilityLegend({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <text x={x} y={y - 4} fill="#6d4c41" fontSize="10" fontWeight={700} fontFamily="inherit">
        施設アイコン
      </text>
      <g transform={`translate(${x + 8} ${y + 14})`}>
        <IconInfo cx={0} cy={0} size={5} />
        <text x={12} y={3} fill="#2c2117" fontSize="9" fontFamily="inherit">超インフォ</text>
      </g>
      <g transform={`translate(${x + 88} ${y + 14})`}>
        <IconToilet cx={0} cy={0} size={6} />
        <text x={14} y={3} fill="#2c2117" fontSize="9" fontFamily="inherit">超おトイレ</text>
      </g>
      <g transform={`translate(${x + 170} ${y + 14})`}>
        <IconCharge cx={0} cy={0} size={6} />
        <text x={12} y={3} fill="#2c2117" fontSize="9" fontFamily="inherit">充電</text>
      </g>
      <g transform={`translate(${x + 234} ${y + 14})`}>
        <IconSmoking cx={0} cy={0} size={6} />
        <text x={14} y={3} fill="#2c2117" fontSize="9" fontFamily="inherit">超喫煙所</text>
      </g>
      <g transform={`translate(${x + 306} ${y + 14})`}>
        <IconShrine cx={0} cy={0} size={7} />
        <text x={12} y={3} fill="#2c2117" fontSize="9" fontFamily="inherit">超神社</text>
      </g>
      <g transform={`translate(${x + 370} ${y + 14})`}>
        <IconStar cx={0} cy={0} size={5} />
        <text x={12} y={3} fill="#2c2117" fontSize="9" fontFamily="inherit">大ステージ</text>
      </g>
    </g>
  );
}

/** 水分補給ふきだし */
function HydrationNote({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d="M 0 10 Q 0 0 10 0 L 268 0 Q 278 0 278 10 L 278 40 Q 278 50 268 50 L 28 50 L 14 62 L 18 50 L 10 50 Q 0 50 0 40 Z"
        fill="rgba(255, 182, 193, 0.45)"
        stroke="rgba(233, 30, 99, 0.4)"
        strokeWidth="1"
      />
      <text x={139} y={22} textAnchor="middle" fill="#ad1457" fontSize="11" fontWeight={700} fontFamily="inherit">
        水分補給＆休憩はしっかりとろう！
      </text>
      <text x={139} y={40} textAnchor="middle" fill="#6d4c41" fontSize="8" fontFamily="inherit">
        会場は広大。無理せず休みながら回ってね
      </text>
    </g>
  );
}

export function VenueMapIllustration() {
  return (
    <svg
      className={styles.venueMapSvg}
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="ニコニコ超会議2026・幕張メッセ会場の概略図。上段にメイン棟HALL 1〜8（左=8, 右=1）、下段にHALL 9〜11、幕張イベントホール、会場全体図、色分け凡例を配置。各ホールの主要ブース・ステージを公式PDFの情報を元に描画。"
    >
      <defs>
        <pattern id="gridBg" width="18" height="18" patternUnits="userSpaceOnUse">
          <path d="M 18 0 L 0 0 0 18" fill="none" stroke="rgba(88,62,28,0.05)" strokeWidth="1" />
        </pattern>
        <filter id="softShadow" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1" />
        </filter>
      </defs>

      {/* 背景 */}
      <rect width={VB.w} height={VB.h} fill="#f7f1e7" />
      <rect x="8" y="8" width={VB.w - 16} height={VB.h - 16} rx={12} fill="url(#gridBg)" />

      {/* タイトル */}
      <text x="32" y="38" fill="#2c2117" fontSize="18" fontWeight={700} fontFamily="inherit">
        ニコニコ超会議2026・幕張メッセ 超会場マップ（概略）
      </text>
      <text x="32" y="56" fill="#6d4c41" fontSize="10" fontFamily="inherit">
        左から HALL 8 → 1（HALL 1は2F入口側）／ 公式PDFの情報をもとに手書きで要約。詳細は下の公式PDFへ。
      </text>
      <text x="32" y="72" fill="#8a7a6a" fontSize="9" fontFamily="inherit">
        ブース番号・寸法・当日変更は必ず公式PDF／会場掲示が優先です。
      </text>

      {/* 方位N */}
      <IconNorth cx={1230} cy={48} size={22} />

      {/* メイン棟の大枠 */}
      <rect
        x={MAIN_HALLS[0].x - 8}
        y={MAIN_HALLS[0].y - 6}
        width={MAIN_HALLS[MAIN_HALLS.length - 1].x + MAIN_HALLS[MAIN_HALLS.length - 1].w - MAIN_HALLS[0].x + 16}
        height={MAIN_HALLS[0].h + 20}
        rx={14}
        fill="rgba(255,251,245,0.85)"
        stroke="rgba(88,62,28,0.25)"
        strokeWidth="1.5"
        filter="url(#softShadow)"
      />
      {/* メイン棟見出し */}
      <text x={MAIN_HALLS[0].x} y={MAIN_HALLS[0].y - 10} fill="#2c2117" fontSize="10" fontWeight={700} fontFamily="inherit">
        国際展示場 HALL 1〜8（メイン棟・2F）
      </text>

      {/* 上段：HALL 1〜8 */}
      {MAIN_HALLS.map((hall) => (
        <HallBlock key={hall.no} hall={hall} />
      ))}

      {/* 中央通路（メイン棟下） */}
      <rect
        x={MAIN_HALLS[0].x}
        y={MAIN_HALLS[0].y + MAIN_HALLS[0].h + 4}
        width={MAIN_HALLS[MAIN_HALLS.length - 1].x + MAIN_HALLS[MAIN_HALLS.length - 1].w - MAIN_HALLS[0].x}
        height={20}
        rx={4}
        fill="rgba(201,142,43,0.18)"
        stroke="rgba(201,142,43,0.45)"
        strokeWidth="1"
        strokeDasharray="5 3"
      />
      <text
        x={(MAIN_HALLS[0].x + MAIN_HALLS[MAIN_HALLS.length - 1].x + MAIN_HALLS[MAIN_HALLS.length - 1].w) / 2}
        y={MAIN_HALLS[0].y + MAIN_HALLS[0].h + 18}
        textAnchor="middle"
        fill="#5a3d16"
        fontSize="9"
        fontWeight={700}
        fontFamily="inherit"
      >
        中央連絡通路（メイン動線）
      </text>

      {/* 下段セクション見出し */}
      <text x={SUB_HALLS_CONTAINER.x} y={SUB_HALLS_CONTAINER.y - 8} fill="#2c2117" fontSize="11" fontWeight={700} fontFamily="inherit">
        {SUB_HALLS_CONTAINER.label}
      </text>
      {/* HALL 9-11 コンテナ */}
      <rect
        x={SUB_HALLS_CONTAINER.x - 4}
        y={SUB_HALLS_CONTAINER.y}
        width={SUB_HALLS_CONTAINER.w + 8}
        height={SUB_HALLS_CONTAINER.h}
        rx={10}
        fill="rgba(241,248,233,0.7)"
        stroke="rgba(104,159,56,0.35)"
        strokeWidth="1.5"
        filter="url(#softShadow)"
      />

      {/* 下段：HALL 9-11 */}
      {SUB_HALLS.map((hall) => (
        <HallBlock key={hall.no} hall={hall} />
      ))}

      {/* 幕張イベントホール */}
      <text x={EVENT_HALL.x} y={EVENT_HALL.y - 8} fill="#2c2117" fontSize="11" fontWeight={700} fontFamily="inherit">
        {EVENT_HALL.label}
      </text>
      <EventHallBlock />

      {/* 会場全体図 */}
      <text x={OVERVIEW_MAP.x} y={OVERVIEW_MAP.y - 8} fill="#2c2117" fontSize="11" fontWeight={700} fontFamily="inherit">
        {OVERVIEW_MAP.label}
      </text>
      <OverviewMapBlock />

      {/* 凡例 */}
      <LegendBlock />
      <FacilityLegend x={LEGEND_AREA.x + 600} y={LEGEND_AREA.y + 20} />

      {/* 水分補給ふきだし */}
      <HydrationNote x={LEGEND_AREA.x + LEGEND_AREA.w - 300} y={LEGEND_AREA.y + 6} />

      {/* フッター注意書き */}
      <text x={VB.w / 2} y={VB.h - 10} textAnchor="middle" fill="#8a7a6a" fontSize="10" fontFamily="inherit">
        手書き概略図 · ブース番号・寸法・当日変更は必ず公式PDFと会場掲示で確認してください
      </text>
    </svg>
  );
}
