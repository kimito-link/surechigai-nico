"use client";

import type { YukkuriDialogue } from "@/lib/yukkuriExplainClient";
import { useYukkuriExplain } from "@/lib/useYukkuriExplain";
import { YukkuriVoicePlayer } from "@/app/components/YukkuriVoicePlayer";
import styles from "./chokaigi.module.css";

type Dialogue = YukkuriDialogue;

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
  const { dialogue, loading, error, explain } = useYukkuriExplain();

  const handleExplain = () => {
    void explain({ ...creator });
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
        </>
      )}
    </div>
  );
}
