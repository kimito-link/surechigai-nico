"use client";

import { useState, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  fetchYukkuriExplain,
  yukkuriExplainUserMessage,
  type YukkuriDialogue,
} from "@/lib/yukkuriExplainClient";
import { YukkuriVoicePlayer } from "@/app/components/YukkuriVoicePlayer";
import styles from "./chokaigi.module.css";

type Dialogue = YukkuriDialogue;

const CHARS: Array<{ key: keyof Dialogue; label: string; speaker: "rink" | "konta" | "tanunee" }> = [
  { key: "rink",    label: "りんく", speaker: "rink" },
  { key: "konta",   label: "こん太", speaker: "konta" },
  { key: "tanunee", label: "たぬ姉", speaker: "tanunee" },
];

const BASE_URL = "https://surechigai-nico.link";

function buildShareCardUrl(handle: string, dialogue: Dialogue): string {
  const url = new URL(`${BASE_URL}/yukkuri`);
  url.searchParams.set("h", handle);
  url.searchParams.set("r", dialogue.rink);
  url.searchParams.set("k", dialogue.konta);
  url.searchParams.set("t", dialogue.tanunee);
  return url.toString();
}

function buildTweetUrl(handle: string, dialogue: Dialogue): string {
  const cardUrl = buildShareCardUrl(handle, dialogue);
  const text = `りんく・こん太・たぬ姉に @${handle} さんをゆっくり解説してもらったよ！\n#すれちがいライト #ニコニコ超会議2026\n${cardUrl}`;
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

export function StickyXSearchBar() {
  const router = useRouter();
  const [handle, setHandle]     = useState("");
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const hasInput = handle.trim().length > 0;
  const rawHandle = handle.trim().replace(/^@+/, "");

  const dismiss = () => { setDialogue(null); setError(""); };

  const handleYukkuri = async (e: FormEvent) => {
    e.preventDefault();
    if (!rawHandle) return;
    setLoading(true);
    setError("");
    setDialogue(null);
    try {
      const data = await fetchYukkuriExplain({
        xHandle: rawHandle,
        name: `@${rawHandle}`,
      });
      setDialogue(data);
    } catch (e) {
      setError(yukkuriExplainUserMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    router.push("/sign-in");
  };

  return (
    <>
      <div className={styles.stickyXBar} role="region" aria-label="検索・登録バー">
        <form className={styles.stickyXForm} onSubmit={handleYukkuri}>
          <span className={styles.stickyXAt} aria-hidden="true">@</span>
          <input
            ref={inputRef}
            type="text"
            className={styles.stickyXInput}
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="あなたのX ID"
            aria-label="XアカウントのID"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          {hasInput && (
            <>
              <button
                type="submit"
                className={styles.stickyXBtnYukkuri}
                disabled={loading}
              >
                {loading ? "…" : "ゆっくり解説"}
              </button>
              <button
                type="button"
                className={styles.stickyXBtnRegister}
                onClick={handleRegister}
              >
                すれ違い登録
              </button>
            </>
          )}
          {!hasInput && (
            <span className={styles.stickyXHint}>
              入力すると解説・登録できます
            </span>
          )}
        </form>
      </div>

      {(dialogue || error) && (
        <>
          <div className={styles.stickyXOverlay} onClick={dismiss} aria-hidden="true" />
          <div className={styles.stickyXPanel} role="region" aria-label="ゆっくり紹介結果">
            <button
              type="button"
              className={styles.stickyXPanelClose}
              onClick={dismiss}
              aria-label="閉じる"
            >
              ✕
            </button>
            {error && <p className={styles.stickyXPanelError} role="alert">{error}</p>}
            {dialogue && (
              <>
                <div className={styles.yukkuriCreatorTalkDialogue}>
                  {CHARS.map(({ key, label, speaker }) => (
                    <div key={key} className={styles.yukkuriCreatorRow} data-speaker={speaker}>
                      <span className={styles.yukkuriCreatorLabel}>{label}</span>
                      <div className={styles.yukkuriCreatorBubble}>{dialogue[key]}</div>
                    </div>
                  ))}
                </div>
                <YukkuriVoicePlayer dialogue={dialogue} compact />
                <div className={styles.stickyXShareRow}>
                  <a
                    href={buildTweetUrl(rawHandle, dialogue)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.stickyXShareBtn}
                  >
                    Xでシェア
                  </a>
                  <button
                    type="button"
                    className={styles.stickyXBtnRegister}
                    onClick={handleRegister}
                  >
                    すれ違い登録へ
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
