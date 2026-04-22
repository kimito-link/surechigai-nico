"use client";

import { useState, type FormEvent } from "react";
import {
  fetchYukkuriExplain,
  yukkuriExplainUserMessage,
  type YukkuriDialogue,
} from "@/lib/yukkuriExplainClient";
import styles from "./chokaigi.module.css";

type Dialogue = YukkuriDialogue;

const CHARS: Array<{ key: keyof Dialogue; label: string; speaker: "rink" | "konta" | "tanunee" }> = [
  { key: "rink",    label: "りんく", speaker: "rink" },
  { key: "konta",   label: "こん太", speaker: "konta" },
  { key: "tanunee", label: "たぬ姉", speaker: "tanunee" },
];

export function XHandleYukkuri() {
  const [handle, setHandle]   = useState("");
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const raw = handle.trim().replace(/^@+/, "");
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
    <div className={styles.xHandleYukkuri}>
      <p className={styles.xHandleYukkuriLead}>
        あなたのXアカウントを入れると、りんくたちが紹介してくれます！
      </p>
      <form className={styles.xHandleYukkuriForm} onSubmit={handleSubmit}>
        <span className={styles.xHandleAt}>@</span>
        <input
          type="text"
          className={styles.xHandleInput}
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="あなたのXハンドル"
          aria-label="XアカウントのID"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          type="submit"
          className={styles.xHandleSubmit}
          disabled={loading || !handle.trim()}
        >
          {loading ? "解説中…" : "紹介して！"}
        </button>
      </form>

      {error && (
        <p className={styles.yukkuriCreatorTalkError} role="alert">{error}</p>
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
