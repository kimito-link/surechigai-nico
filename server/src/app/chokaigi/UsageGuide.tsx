"use client";

import { GUIDES } from "./lp-content";
import styles from "./chokaigi.module.css";

const STEPS = [
  {
    guideIndex: 0,
    screen: "start",
    speech: "Xでログインして「参加する」をタップ！すれ違い検出がオンになるよ",
  },
  {
    guideIndex: 1,
    screen: "detect",
    speech: "位置情報を使って、近くにいるニコニコユーザー（Xアカウント）を見つけるんだ",
  },
  {
    guideIndex: 2,
    screen: "match",
    speech: "すれ違いが見つかると、相手のXプロフィールが見えるわよ♪ 気になったらタップしてね",
  },
  {
    guideIndex: 0,
    screen: "message",
    speech: "やりとりはX側で！ リプやDMで話しかけてみよう。気が乗らなければスルーでOK！",
  },
  {
    guideIndex: 1,
    screen: "cheer",
    speech:
      "お互いのXでいいねやリプを送りあって、励ましあって応援しあおう！",
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
          <text x="30" y="22" textAnchor="middle" fontSize="4" fill="#c98e2b" fontWeight="600">
            すれ違い！
          </text>
          {/* 相手のプロフィールカード */}
          <circle cx="30" cy="40" r="6" fill="#e8dfd3" stroke="#255d9b" strokeWidth="1" />
          <text x="30" y="54" textAnchor="middle" fontSize="3.5" fill="#3a2f24" fontWeight="700">
            @niconiko_user
          </text>
          <text x="30" y="60" textAnchor="middle" fontSize="2.5" fill="#888">
            Xアカウント
          </text>
          {/* X へのリンクボタン */}
          <rect x="16" y="70" width="28" height="9" rx="4.5" fill="#0f1419" />
          <text x="30" y="76.5" textAnchor="middle" fontSize="3.2" fill="#fff" fontWeight="700">
            Xで見る
          </text>
        </>
      )}

      {type === "message" && (
        <>
          <text x="30" y="20" textAnchor="middle" fontSize="3.5" fill="#5c5248">
            Xプロフィール
          </text>
          {/* X ロゴ風バナー */}
          <rect x="8" y="26" width="44" height="14" rx="2" fill="#0f1419" />
          <text x="30" y="35" textAnchor="middle" fontSize="6" fill="#fff" fontWeight="900">
            𝕏
          </text>
          {/* ハンドル */}
          <text x="30" y="48" textAnchor="middle" fontSize="3" fill="#3a2f24" fontWeight="700">
            @niconiko_user
          </text>
          {/* アクションボタン（フォロー / リプ / DM） */}
          <rect x="10" y="54" width="12" height="8" rx="4" fill="#1d9bf0" />
          <text x="16" y="59.5" textAnchor="middle" fontSize="2.8" fill="#fff" fontWeight="700">
            フォロー
          </text>
          <rect x="24" y="54" width="12" height="8" rx="4" fill="#fff" stroke="#1d9bf0" strokeWidth="0.6" />
          <text x="30" y="59.5" textAnchor="middle" fontSize="2.8" fill="#1d9bf0" fontWeight="700">
            リプ
          </text>
          <rect x="38" y="54" width="12" height="8" rx="4" fill="#fff" stroke="#1d9bf0" strokeWidth="0.6" />
          <text x="44" y="59.5" textAnchor="middle" fontSize="2.8" fill="#1d9bf0" fontWeight="700">
            DM
          </text>
          <text x="30" y="78" textAnchor="middle" fontSize="2.5" fill="#888">
            やりとりはX側で
          </text>
        </>
      )}

      {type === "cheer" && (
        <>
          <text x="30" y="22" textAnchor="middle" fontSize="4" fill="#c98e2b" fontWeight="600">
            応援しあおう！
          </text>
          {/* 2人のXアバター */}
          <circle cx="18" cy="46" r="6" fill="#e8dfd3" stroke="#255d9b" strokeWidth="1" />
          <circle cx="42" cy="46" r="6" fill="#e8dfd3" stroke="#c98e2b" strokeWidth="1" />
          {/* 飛び交うハート（いいね） */}
          <text x="28" y="38" fontSize="5" fill="#e0245e">♥</text>
          <text x="32" y="44" fontSize="4" fill="#e0245e">♥</text>
          {/* リプ吹き出し */}
          <path
            d="M 26 52 Q 30 52 30 55 Q 30 57 28 57 L 26 59 L 26 57 Q 24 57 24 55 Q 24 52 26 52 Z"
            fill="#1d9bf0"
          />
          {/* アクションバー（いいね / リプ） */}
          <rect x="10" y="68" width="18" height="9" rx="4.5" fill="#fff" stroke="#e0245e" strokeWidth="0.6" />
          <text x="19" y="74.3" textAnchor="middle" fontSize="3.2" fill="#e0245e" fontWeight="700">
            ♥ いいね
          </text>
          <rect x="32" y="68" width="18" height="9" rx="4.5" fill="#fff" stroke="#1d9bf0" strokeWidth="0.6" />
          <text x="41" y="74.3" textAnchor="middle" fontSize="3.2" fill="#1d9bf0" fontWeight="700">
            💬 リプ
          </text>
          <text x="30" y="85" textAnchor="middle" fontSize="2.5" fill="#888">
            Xで励ましあおう
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
