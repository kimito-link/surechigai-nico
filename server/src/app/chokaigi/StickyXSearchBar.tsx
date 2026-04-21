"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import styles from "./chokaigi.module.css";

type Dialogue = { rink: string; konta: string; tanunee: string };
type Mode = "introduce" | "register";

const CHARS: Array<{ key: keyof Dialogue; label: string; speaker: "rink" | "konta" | "tanunee" }> = [
  { key: "rink",    label: "りんく", speaker: "rink" },
  { key: "konta",   label: "こん太", speaker: "konta" },
  { key: "tanunee", label: "たぬ姉", speaker: "tanunee" },
];

export function StickyXSearchBar() {
  const [mode, setMode]         = useState<Mode>("introduce");
  const [handle, setHandle]     = useState("");
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const dismiss = () => { setDialogue(null); setError(""); };

  const switchMode = (next: Mode) => {
    setMode(next);
    dismiss();
  };

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
      <div className={styles.stickyXBar} role="region" aria-label="参加・紹介バー">
        {/* モード切替タブ */}
        <div className={styles.stickyXTabs}>
          <button
            type="button"
            className={`${styles.stickyXTab} ${mode === "introduce" ? styles.stickyXTabActive : ""}`}
            onClick={() => switchMode("introduce")}
          >
            🎙️ 紹介
          </button>
          <button
            type="button"
            className={`${styles.stickyXTab} ${mode === "register" ? styles.stickyXTabActive : ""}`}
            onClick={() => switchMode("register")}
          >
            ✨ 登録
          </button>
        </div>

        {/* 紹介モード */}
        {mode === "introduce" && (
          <form className={styles.stickyXForm} onSubmit={handleSubmit}>
            <span className={styles.stickyXAt} aria-hidden="true">@</span>
            <input
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
            <button
              type="submit"
              className={styles.stickyXSubmit}
              disabled={loading || !handle.trim()}
            >
              {loading ? "…" : "紹介して！"}
            </button>
          </form>
        )}

        {/* 登録モード */}
        {mode === "register" && (
          <div className={styles.stickyXRegister}>
            <span className={styles.stickyXRegisterText}>
              会場ですれ違って、クリエイターとつながろう！
            </span>
            <Link href="/sign-in" className={styles.stickyXRegisterBtn}>
              Xでログイン・参加登録
            </Link>
          </div>
        )}
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
