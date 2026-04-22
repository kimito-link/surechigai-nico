"use client";

import Image from "next/image";
import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import type { YukkuriDialogue } from "@/lib/yukkuriExplainClient";
import { useYukkuriExplain } from "@/lib/useYukkuriExplain";
import { YukkuriVoicePlayer } from "@/app/components/YukkuriVoicePlayer";
import { AUTH_LESS_FIRST_COPY } from "./lp-content";
import { ChokaigiConceptBanner } from "./ChokaigiConceptBanner";
import styles from "./YukkuriHero.module.css";

type Dialogue = YukkuriDialogue;

const CHARS = [
  { key: "rink"    as const, label: "りんく",  src: "/chokaigi/yukkuri/rink.png",    color: "#ff7eb3" },
  { key: "konta"   as const, label: "こん太",  src: "/chokaigi/yukkuri/konta.png",   color: "#7ec8ff" },
  { key: "tanunee" as const, label: "たぬ姉", src: "/chokaigi/yukkuri/tanunee.png", color: "#a8e6a3" },
];

const BASE_URL = "https://surechigai-nico.link";

function buildShareCardUrl(handle: string, d: Dialogue) {
  const url = new URL(`${BASE_URL}/yukkuri`);
  url.searchParams.set("h", handle);
  url.searchParams.set("r", d.rink);
  url.searchParams.set("k", d.konta);
  url.searchParams.set("t", d.tanunee);
  return url.toString();
}

function buildTweetUrl(handle: string, d: Dialogue) {
  const cardUrl = buildShareCardUrl(handle, d);
  const text = `りんく・こん太・たぬ姉に @${handle} さんをゆっくり解説してもらったよ！\n#すれちがいライト #ニコニコ超会議2026\n${cardUrl}`;
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

export function YukkuriHero() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [handle, setHandle] = useState("");
  const { dialogue, loading, error, explain, reset, cancelInFlight } = useYukkuriExplain();
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (!loading) {
      setElapsedSec(0);
      return;
    }
    setElapsedSec(0);
    const t = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [loading]);

  const raw = handle.trim().replace(/^@+/, "");
  const hasInput = raw.length > 0;
  const isTalking = Boolean(dialogue);

  const handleYukkuri = (e: FormEvent) => {
    e.preventDefault();
    if (!raw) return;
    void explain({ xHandle: raw, name: `@${raw}` });
  };

  return (
    <section className={styles.hero} aria-label="ゆっくり解説ヒーロー">
      {/* 背景: 日本列島（全国 → 幕張 → 全国）のコンセプトを視覚化する背景レイヤー */}
      <ChokaigiConceptBanner />

      {/*
       * UX: 主要アクション（X ID 入力 → ゆっくり解説）を最上部に置く。
       * 以降のコンテンツは `.heroContent` で背景より前面に配置（z-index）。
       * （izanami 記事 3-1「情報の優先順位」に準拠）
       */}
      <div className={styles.heroContent}>
      {!isTalking && (
        <>
          <p className={styles.authLessFirst}>{AUTH_LESS_FIRST_COPY}</p>
          <p className={styles.headline}>
            誰を紹介してもらう？
          </p>
        </>
      )}

      {/* 解説フォーム — ダイアログが出たら上に飛んでいく */}
      <form
        className={`${styles.form} ${isTalking ? styles.formHidden : ""}`}
        onSubmit={handleYukkuri}
        aria-hidden={isTalking}
      >
        <label className={styles.inputLabel}>
          紹介してほしい人のX IDを入力
        </label>
        <div className={styles.inputRow}>
          <span className={styles.at}>@</span>
          <input
            type="text"
            className={styles.input}
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="X ID（自分でも他の人でもOK）"
            aria-label="XアカウントのID"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            tabIndex={isTalking ? -1 : 0}
          />
        </div>

        <button
          type="submit"
          className={styles.btnYukkuri}
          disabled={loading || !hasInput}
          tabIndex={isTalking ? -1 : 0}
        >
          {loading ? "解説中…" : "ゆっくり解説してもらう"}
        </button>

        {loading && (
          <div className={styles.loadingRow}>
            <p className={styles.loadingHint}>
              生成中… {elapsedSec}秒経過（長い場合は数分かかることがあります）
            </p>
            <button type="button" className={styles.btnCancelExplain} onClick={cancelInFlight}>
              キャンセル
            </button>
          </div>
        )}

        {!hasInput && (
          <p className={styles.hint}>
            自分でも他の人でも入力できます
          </p>
        )}
      </form>

      {/* キャラクター3人 — 縦積み＋左右交互（ジグザグ）レイアウト */}
      <div className={`${styles.chars}${isTalking ? ` ${styles.charsTalking}` : ""}`}>
        {CHARS.map(({ key, label, src, color }, i) => {
          const isReverse = i % 2 === 1; // 0=左, 1=右, 2=左
          return (
            <div
              key={key}
              className={`${styles.charCard} ${isReverse ? styles.charCardReverse : styles.charCardForward}${isTalking ? ` ${styles[`charCardTalking${key}`]}` : ""} ${isTalking ? styles[`charCardSpeak${i}`] : ""}`}
              style={{ animationDelay: `${i * 0.18}s` }}
            >
              <div className={styles.charAvatarColumn}>
                <div className={styles.charImgWrap}>
                  <Image src={src} alt={label} width={100} height={100} className={styles.charImg} />
                </div>
                <span className={styles.charLabel} style={{ background: color, color: "#0a0e1a" }}>
                  {label}
                </span>
              </div>
              {dialogue && (
                <p className={`${styles.charBubble} ${styles[`charBubble${i}`]} ${isReverse ? styles.charBubbleReverse : styles.charBubbleForward}`}>
                  {dialogue[key]}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* 登録は入力欄と独立したCTA */}
      {isLoaded && !isSignedIn && (
        <div className={styles.registerCta}>
          <p className={styles.registerCtaText}>自分がすれ違い通信に参加する場合はこちら</p>
          <button
            type="button"
            className={styles.btnRegister}
            onClick={() => router.push("/sign-in")}
          >
            自分を登録する（Xでログイン）
          </button>
        </div>
      )}
      {isLoaded && isSignedIn && (
        <div className={styles.registerCta}>
          <p className={styles.registerCtaText}>すれ違い通信に参加中</p>
          <button
            type="button"
            className={styles.btnRegister}
            onClick={() => router.push("/app")}
          >
            ダッシュボードへ
          </button>
        </div>
      )}

      {/* エラー */}
      {error && (
        <div className={styles.errorBlock}>
          <p className={styles.error} role="alert">
            {error}
          </p>
          <button
            type="button"
            className={styles.btnRetryExplain}
            onClick={() => {
              reset();
              if (raw) void explain({ xHandle: raw, name: `@${raw}` });
            }}
          >
            再試行
          </button>
        </div>
      )}

      {/* 結果後のシェア */}
      {dialogue && (
        <>
          <YukkuriVoicePlayer dialogue={dialogue} autoPlayOnReady />
          <div className={styles.shareRow}>
            <a
              href={buildTweetUrl(raw, dialogue)}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.shareBtn}
            >
              Xでシェアする
            </a>
            <button
              type="button"
              className={styles.btnResetExplain}
              onClick={() => {
                reset();
                setHandle("");
              }}
            >
              別の人を解説してもらう
            </button>
            {isLoaded && !isSignedIn && (
              <button
                type="button"
                className={styles.btnRegister}
                onClick={() => router.push("/sign-in")}
              >
                すれ違い通信に登録する
              </button>
            )}
            {isLoaded && isSignedIn && (
              <button
                type="button"
                className={styles.btnRegister}
                onClick={() => router.push("/app")}
              >
                ダッシュボードへ
              </button>
            )}
          </div>
        </>
      )}
      </div>
    </section>
  );
}
