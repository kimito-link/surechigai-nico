"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  fetchYukkuriExplain,
  yukkuriExplainUserMessage,
  type YukkuriDialogue,
} from "@/lib/yukkuriExplainClient";
import { YukkuriVoicePlayer } from "@/app/components/YukkuriVoicePlayer";
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
  const [handle, setHandle]     = useState("");
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const raw = handle.trim().replace(/^@+/, "");
  const hasInput = raw.length > 0;

  const handleYukkuri = async (e: FormEvent) => {
    e.preventDefault();
    if (!raw) return;
    setLoading(true);
    setError("");
    setDialogue(null);
    try {
      const data = await fetchYukkuriExplain({ xHandle: raw, name: `@${raw}` });
      setDialogue(data);
    } catch (e) {
      setError(yukkuriExplainUserMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.hero} aria-label="ゆっくり解説ヒーロー">
      <p className={styles.headline}>
        誰を紹介してもらう？
      </p>

      {/* キャラクター3人 */}
      <div className={`${styles.chars}${dialogue ? ` ${styles.charsWithBubble}` : ""}`}>
        {CHARS.map(({ key, label, src, color }, i) => (
          <div key={key} className={styles.charCard} style={{ animationDelay: `${i * 0.18}s` }}>
            <div className={styles.charImgWrap}>
              <Image src={src} alt={label} width={100} height={100} className={styles.charImg} />
            </div>
            <span className={styles.charLabel} style={{ background: color, color: "#0a0e1a" }}>
              {label}
            </span>
            {dialogue && (
              <div className={styles.charBubble}>
                {dialogue[key]}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 解説フォーム */}
      <form className={styles.form} onSubmit={handleYukkuri}>
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
          />
        </div>

        <button
          type="submit"
          className={styles.btnYukkuri}
          disabled={loading || !hasInput}
        >
          {loading ? "解説中…" : "ゆっくり解説してもらう"}
        </button>

        {!hasInput && (
          <p className={styles.hint}>
            自分でも他の人でも入力できます
          </p>
        )}
      </form>

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
      {error && <p className={styles.error} role="alert">{error}</p>}

      {/* 結果後のシェア */}
      {dialogue && (
        <>
          <YukkuriVoicePlayer dialogue={dialogue} />
          <div className={styles.shareRow}>
            <a
              href={buildTweetUrl(raw, dialogue)}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.shareBtn}
            >
              Xでシェアする
            </a>
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
    </section>
  );
}
