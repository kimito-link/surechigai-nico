"use client";

import { useState, type FormEvent } from "react";
import styles from "./chokaigi.module.css";

type Dialogue = { rink: string; konta: string; tanunee: string };

const CHARS: Array<{ key: keyof Dialogue; label: string; speaker: "rink" | "konta" | "tanunee" }> = [
  { key: "rink",    label: "りんく", speaker: "rink" },
  { key: "konta",   label: "こん太", speaker: "konta" },
  { key: "tanunee", label: "たぬ姉", speaker: "tanunee" },
];

export function StickyXSearchBar() {
  const [handle, setHandle]     = useState("");
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const dismiss = () => { setDialogue(null); setError(""); };

  const handleSubmit = async (e: FormEvent) => {
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

  return (
    <>
      <div className={styles.stickyXBar} role="search" aria-label="Xアカウント ゆっくり紹介">
        <form className={styles.stickyXForm} onSubmit={handleSubmit}>
          <span className={styles.stickyXLabel} aria-hidden="true">🎙️ あなたのX</span>
          <span className={styles.stickyXAt} aria-hidden="true">@</span>
          <input
            type="text"
            className={styles.stickyXInput}
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="XのID を入力"
            aria-label="XアカウントのID"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            type="submit"
            className={styles.stickyXSubmit}
            disabled={loading || !handle.trim()}
          >
            {loading ? "解説中…" : "紹介して！"}
          </button>
        </form>
      </div>

      {(dialogue || error) && (
        <>
          <div
            className={styles.stickyXOverlay}
            onClick={dismiss}
            aria-hidden="true"
          />
          <div className={styles.stickyXPanel} role="region" aria-label="ゆっくり紹介結果">
            <button
              type="button"
              className={styles.stickyXPanelClose}
              onClick={dismiss}
              aria-label="閉じる"
            >
              ✕
            </button>
            {error && (
              <p className={styles.stickyXPanelError} role="alert">{error}</p>
            )}
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
