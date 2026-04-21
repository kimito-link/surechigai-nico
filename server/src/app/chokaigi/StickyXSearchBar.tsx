"use client";

import { useState, useRef, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./chokaigi.module.css";

type Dialogue = { rink: string; konta: string; tanunee: string };

const CHARS: Array<{ key: keyof Dialogue; label: string; speaker: "rink" | "konta" | "tanunee" }> = [
  { key: "rink",    label: "りんく", speaker: "rink" },
  { key: "konta",   label: "こん太", speaker: "konta" },
  { key: "tanunee", label: "たぬ姉", speaker: "tanunee" },
];

export function StickyXSearchBar() {
  const router = useRouter();
  const [handle, setHandle]     = useState("");
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const hasInput = handle.trim().length > 0;

  const dismiss = () => { setDialogue(null); setError(""); };

  const handleYukkuri = async (e: FormEvent) => {
    e.preventDefault();
    const raw = handle.trim().replace(/^@+/, "");
    if (!raw) return;
    setLoading(true);
    setError("");
    setDialogue(null);
    try {
      const res = await fetch("/api/yukkuri-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xHandle: raw, name: `@${raw}` }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Dialogue = await res.json();
      setDialogue(data);
    } catch {
      setError("失敗しました。もう一度お試しください。");
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
              <div className={styles.yukkuriCreatorTalkDialogue}>
                {CHARS.map(({ key, label, speaker }) => (
                  <div key={key} className={styles.yukkuriCreatorRow} data-speaker={speaker}>
                    <span className={styles.yukkuriCreatorLabel}>{label}</span>
                    <div className={styles.yukkuriCreatorBubble}>{dialogue[key]}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
