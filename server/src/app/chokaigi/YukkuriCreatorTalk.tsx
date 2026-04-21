"use client";

import { useState } from "react";
import styles from "./chokaigi.module.css";

type Dialogue = { rink: string; konta: string; tanunee: string };

type CreatorInfo = {
  name: string;
  booth?: string;
  hallLabel?: string;
  sub?: string;
  intro?: string;
};

const CHARS: Array<{ key: keyof Dialogue; label: string; speaker: "rink" | "konta" | "tanunee" }> = [
  { key: "rink",    label: "りんく", speaker: "rink" },
  { key: "konta",   label: "こん太", speaker: "konta" },
  { key: "tanunee", label: "たぬ姉", speaker: "tanunee" },
];

export function YukkuriCreatorTalk({ creator }: { creator: CreatorInfo }) {
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleExplain = async () => {
    setLoading(true);
    setError("");
    setDialogue(null);
    try {
      const res = await fetch("/api/yukkuri-explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(creator),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Dialogue = await res.json();
      setDialogue(data);
    } catch {
      setError("解説の取得に失敗しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.yukkuriCreatorTalk}>
      <button
        type="button"
        className={styles.yukkuriCreatorTalkBtn}
        onClick={handleExplain}
        disabled={loading}
        aria-busy={loading}
      >
        {loading ? "解説中…" : "🎙️ ゆっくり解説"}
      </button>

      {error && (
        <p className={styles.yukkuriCreatorTalkError} role="alert">
          {error}
        </p>
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
  );
}
