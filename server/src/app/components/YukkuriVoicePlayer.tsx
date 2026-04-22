"use client";

import { useCallback, useRef, useState } from "react";
import type { YukkuriDialogue } from "@/lib/yukkuriExplainClient";
import styles from "./YukkuriVoicePlayer.module.css";

const ORDER = [
  { key: "rink" as const, label: "りんく" },
  { key: "konta" as const, label: "こん太" },
  { key: "tanunee" as const, label: "たぬ姉" },
];

type Props = {
  dialogue: YukkuriDialogue | null;
  /** 狭いパネル向け（1 列ボタン） */
  compact?: boolean;
};

export function YukkuriVoicePlayer({ dialogue, compact }: Props) {
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
  }, []);

  const play = useCallback(async () => {
    if (!dialogue) return;
    stop();
    const ac = new AbortController();
    abortRef.current = ac;
    setBusy(true);
    setHint("");
    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;

    try {
      for (const { key, label } of ORDER) {
        if (ac.signal.aborted) return;
        const text = dialogue[key].trim();
        if (!text) continue;

        const res = await fetch("/api/voicevox/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, speaker: key }),
          signal: ac.signal,
        });

        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(
            typeof j.error === "string" ? j.error : `HTTP ${res.status}`
          );
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        try {
          await new Promise<void>((resolve, reject) => {
            audio.src = url;
            audio.onended = () => resolve();
            audio.onerror = () => reject(new Error(`${label} の再生に失敗しました`));
            void audio.play().catch(reject);
          });
        } finally {
          URL.revokeObjectURL(url);
        }
      }
    } catch (e) {
      if (ac.signal.aborted) return;
      const msg =
        e instanceof Error ? e.message : "音声の合成・再生に失敗しました";
      setHint(msg);
    } finally {
      if (abortRef.current === ac) abortRef.current = null;
      setBusy(false);
    }
  }, [dialogue, stop]);

  if (!dialogue) return null;

  return (
    <div
      className={`${styles.wrap}${compact ? ` ${styles.wrapCompact}` : ""}`}
      role="region"
      aria-label="VOICEVOX 読み上げ"
    >
      <button
        type="button"
        className={styles.playBtn}
        onClick={() => void play()}
        disabled={busy}
        aria-busy={busy}
      >
        {busy ? "再生中…" : "▶ VOICEVOX で聞く（りんく→こん太→たぬ姉）"}
      </button>
      {busy && (
        <button type="button" className={styles.stopBtn} onClick={stop}>
          停止
        </button>
      )}
      {hint && (
        <p className={styles.hint} role="alert">
          {hint}
        </p>
      )}
    </div>
  );
}
