"use client";

import { GUIDES } from "./lp-content";
import styles from "./chokaigi.module.css";

const STEPS = [
  {
    guideIndex: 0,
    screen: "start",
    speech: "アプリを開いて「参加する」をタップ！すれ違い検出がオンになるよ",
  },
  {
    guideIndex: 1,
    screen: "detect",
    speech: "位置情報を使って、近くにいるニコニコユーザーを見つけるんだ",
  },
  {
    guideIndex: 2,
    screen: "match",
    speech: "すれ違いが見つかると、匿名でマッチするわよ♪",
  },
  {
    guideIndex: 0,
    screen: "message",
    speech: "短いメッセージでやりとり。気分が乗らなければスルーでOK！",
  },
  {
    guideIndex: 1,
    screen: "safety",
    speech: "ブロックや通報もできるから、自分のペースで楽しもう",
  },
] as const;

function PhoneScreen({ type }: { type: string }) {
  return (
    <svg
      className={styles.usagePhone}
      viewBox="0 0 60 100"
      aria-hidden="true"
    >
      {/* スマホ外枠 */}
      <rect
        x="2"
        y="2"
        width="56"
        height="96"
        rx="8"
        fill="#1a1a1a"
        stroke="#333"
        strokeWidth="2"
      />
      {/* 画面 */}
      <rect
        x="6"
        y="12"
        width="48"
        height="76"
        rx="2"
        fill="#f7f1e7"
      />
      {/* ノッチ */}
      <rect x="22" y="5" width="16" height="4" rx="2" fill="#333" />
      {/* ホームバー */}
      <rect x="20" y="92" width="20" height="3" rx="1.5" fill="#444" />

      {/* 画面コンテンツ（タイプ別） */}
      {type === "start" && (
        <>
          <text x="30" y="30" textAnchor="middle" fontSize="5" fill="#3a2f24" fontWeight="700">
            すれちがいライト
          </text>
          <rect x="18" y="50" width="24" height="10" rx="5" fill="#255d9b" />
          <text x="30" y="57" textAnchor="middle" fontSize="4" fill="#fff" fontWeight="600">
            参加する
          </text>
          <circle cx="30" y="75" r="6" fill="none" stroke="#c98e2b" strokeWidth="1" />
          <text x="30" y="77" textAnchor="middle" fontSize="3" fill="#c98e2b">ON</text>
        </>
      )}

      {type === "detect" && (
        <>
          <text x="30" y="24" textAnchor="middle" fontSize="4" fill="#5c5248">
            検出中...
          </text>
          {/* 電波アイコン */}
          <circle cx="30" cy="50" r="4" fill="#255d9b" />
          <circle cx="30" cy="50" r="10" fill="none" stroke="#255d9b" strokeWidth="1" opacity="0.5" />
          <circle cx="30" cy="50" r="16" fill="none" stroke="#255d9b" strokeWidth="1" opacity="0.3" />
          <circle cx="30" cy="50" r="22" fill="none" stroke="#255d9b" strokeWidth="1" opacity="0.15" />
          <text x="30" y="80" textAnchor="middle" fontSize="3" fill="#5c5248">
            周りを探しています
          </text>
        </>
      )}

      {type === "match" && (
        <>
          <text x="30" y="24" textAnchor="middle" fontSize="4" fill="#c98e2b" fontWeight="600">
            マッチ！
          </text>
          {/* 2人のアイコン */}
          <circle cx="22" cy="45" r="6" fill="#e8dfd3" stroke="#c98e2b" strokeWidth="1" />
          <circle cx="38" cy="45" r="6" fill="#e8dfd3" stroke="#255d9b" strokeWidth="1" />
          {/* つながり線 */}
          <path d="M 28 45 L 32 45" stroke="#5c5248" strokeWidth="1" strokeDasharray="2" />
          <text x="30" y="70" textAnchor="middle" fontSize="3" fill="#5c5248">
            同じ空気を共有中
          </text>
          <text x="30" y="78" textAnchor="middle" fontSize="2.5" fill="#888">
            匿名ユーザー
          </text>
        </>
      )}

      {type === "message" && (
        <>
          <text x="30" y="20" textAnchor="middle" fontSize="3.5" fill="#5c5248">
            メッセージ
          </text>
          {/* チャット風 */}
          <rect x="10" y="28" width="22" height="10" rx="3" fill="#e0e8f0" />
          <text x="12" y="35" fontSize="3" fill="#3a2f24">こんにちは！</text>
          <rect x="28" y="42" width="18" height="10" rx="3" fill="#255d9b" />
          <text x="30" y="49" fontSize="3" fill="#fff">よろしく〜</text>
          <rect x="10" y="56" width="26" height="10" rx="3" fill="#e0e8f0" />
          <text x="12" y="63" fontSize="3" fill="#3a2f24">いい天気ですね</text>
          <text x="30" y="82" textAnchor="middle" fontSize="2.5" fill="#888">
            短く・気軽に
          </text>
        </>
      )}

      {type === "safety" && (
        <>
          <text x="30" y="22" textAnchor="middle" fontSize="3.5" fill="#5c5248">
            設定
          </text>
          {/* メニュー項目 */}
          <rect x="10" y="30" width="40" height="12" rx="2" fill="#fff" stroke="#ddd" strokeWidth="0.5" />
          <text x="14" y="38" fontSize="3" fill="#3a2f24">🔕 ブロック管理</text>
          <rect x="10" y="46" width="40" height="12" rx="2" fill="#fff" stroke="#ddd" strokeWidth="0.5" />
          <text x="14" y="54" fontSize="3" fill="#3a2f24">🚨 通報する</text>
          <rect x="10" y="62" width="40" height="12" rx="2" fill="#fff" stroke="#ddd" strokeWidth="0.5" />
          <text x="14" y="70" fontSize="3" fill="#3a2f24">⏸️ 一時停止</text>
          <text x="30" y="82" textAnchor="middle" fontSize="2.5" fill="#888">
            自分のペースで
          </text>
        </>
      )}
    </svg>
  );
}

export function UsageGuide() {
  return (
    <div className={styles.usageGuide}>
      {STEPS.map((step, i) => {
        const guide = GUIDES[step.guideIndex];
        const isEven = i % 2 === 1;
        return (
          <div
            key={i}
            className={`${styles.usageStep} ${isEven ? styles.usageStepReverse : ""}`}
          >
            <div className={styles.usageStepNum}>{i + 1}</div>
            <div className={styles.usagePhoneWrap}>
              <PhoneScreen type={step.screen} />
            </div>
            <div className={styles.usageExplain}>
              <div
                className={styles.usageAvatar}
                style={{ backgroundImage: `url("${guide.imageSrc}")` }}
                aria-hidden="true"
              />
              <div className={styles.usageBubble}>
                <span className={styles.usageName}>{guide.name}</span>
                <p className={styles.usageSpeech}>{step.speech}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
