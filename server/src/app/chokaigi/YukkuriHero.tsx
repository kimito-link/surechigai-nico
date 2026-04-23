"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import type { YukkuriDialogue } from "@/lib/yukkuriExplainClient";
import { useYukkuriExplain } from "@/lib/useYukkuriExplain";
import { YukkuriVoicePlayer } from "@/app/components/YukkuriVoicePlayer";
import { yukkuriExplainedPagePath, yukkuriShareTweetUrl } from "@/lib/yukkuriShareUrls";
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

function buildTweetUrl(handle: string) {
  return yukkuriShareTweetUrl(BASE_URL, handle);
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

  /** サーバー描画の HeroStats を、解説 API 成功直後に再取得してチップの人数を更新する */
  useEffect(() => {
    if (!dialogue || loading) return;
    if (error) return;
    router.refresh();
  }, [dialogue, loading, error, router]);

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
            誰のX IDでも解説できます。会場ですれ違う・いいね・オフ会のきっかけは、下のすれ違い参加登録から
          </p>
        )}
      </form>

      {/* キャラクター3人 — 縦積み＋左右交互（ジグザグ）レイアウト。
       *   解説中 (isTalking) は position:fixed オーバーレイになる。DOM flow から抜けるため
       *   以下のボイスプレイヤー/シェア行もオーバーレイの内側にまとめて描画する
       *   （外に置くと `.registerCta` / `.shareRow` が上に詰め上がって透過した隙間から透けてしまう）。
       */}
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

        {/* 解説中のアクション（ボイス + シェア + 次のアクション）はオーバーレイ内に収める */}
        {isTalking && dialogue && (
          <div className={styles.talkingFooter}>
            <YukkuriVoicePlayer dialogue={dialogue} autoPlayOnReady />
            <p className={styles.canonicalPageNote}>
              この紹介は <strong>@{raw}</strong> 専用URLに保存されています（同じ人を再解説すると本文が更新されます）。
            </p>
            <Link href={yukkuriExplainedPagePath(raw)} className={styles.canonicalPageLink}>
              紹介ページを開く →
            </Link>
            <div className={styles.shareRow}>
              <a
                href={buildTweetUrl(raw)}
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
                  title="位置の交換ですれ違い検出。いいねやオフ会のきっかけにも"
                >
                  すれ違いに参加（位置・オフ会）
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
          </div>
        )}
      </div>

      {/* 登録 CTA は「解説していない時」のファーストビュー用。
       *   解説中は上のオーバーレイに同等の登録ボタンが入っているので重複を避けるため非表示にする。 */}
      {!isTalking && isLoaded && !isSignedIn && (
        <div className={styles.registerCta}>
          <p className={styles.registerCtaText}>
            すれ違い通信は企画の核です。みんなで位置を交換して近くとマッチし、Xでいいねやオフ会のきっかけに。参加はこちら（ゆっくり解説とは別ボタン）
          </p>
          <button
            type="button"
            className={styles.btnRegister}
            onClick={() => router.push("/sign-in")}
          >
            すれ違いに参加する（Xでログイン）
          </button>
        </div>
      )}
      {!isTalking && isLoaded && isSignedIn && (
        <div className={styles.registerCta}>
          <p className={styles.registerCtaText}>
            すれ違い通信に参加中。位置の送信・マッチ確認はアプリから
          </p>
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
      </div>
    </section>
  );
}
