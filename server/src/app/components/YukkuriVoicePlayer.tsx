"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { YukkuriDialogue } from "@/lib/yukkuriExplainClient";
import styles from "./YukkuriVoicePlayer.module.css";

type VoicevoxGate = "unknown" | "off" | "down" | "ready";

const ORDER = [
  { key: "rink" as const, label: "りんく" },
  { key: "konta" as const, label: "こん太" },
  { key: "tanunee" as const, label: "たぬ姉" },
];
const SPEECH_STYLE: Record<(typeof ORDER)[number]["key"], { rate: number; pitch: number }> = {
  rink: { rate: 1.15, pitch: 1.3 },
  konta: { rate: 1.0, pitch: 1.0 },
  tanunee: { rate: 0.95, pitch: 0.9 },
};

type Props = {
  dialogue: YukkuriDialogue | null;
  /** 狭いパネル向け（1 列ボタン） */
  compact?: boolean;
  /** 解説表示後に自動で読み上げを試す */
  autoPlayOnReady?: boolean;
};

export function YukkuriVoicePlayer({ dialogue, compact, autoPlayOnReady = false }: Props) {
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");
  const [gate, setGate] = useState<VoicevoxGate>("unknown");
  const [speechSupported, setSpeechSupported] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoPlayedKeyRef = useRef<string>("");
  const speechTokenRef = useRef(0);

  useEffect(() => {
    if (!dialogue) {
      setGate("unknown");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetch("/api/voicevox/synthesize");
        const j = (await r.json()) as {
          configured?: boolean;
          reachable?: boolean | null;
        };
        if (cancelled) return;
        if (!j.configured) setGate("off");
        else if (j.reachable === false) setGate("down");
        else setGate("ready");
      } catch {
        if (!cancelled) setGate("down");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dialogue]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSpeechSupported(typeof window.speechSynthesis !== "undefined");
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
    if (typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined") {
      window.speechSynthesis.cancel();
    }
    speechTokenRef.current += 1;
  }, []);

  const pickJapaneseVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (typeof window === "undefined" || typeof window.speechSynthesis === "undefined") {
      return null;
    }
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;
    return (
      voices.find((v) => /^ja[-_]?jp$/i.test(v.lang)) ??
      voices.find((v) => /^ja/i.test(v.lang)) ??
      voices[0] ??
      null
    );
  }, []);

  const playBrowserFallback = useCallback(async () => {
    if (!dialogue) return;
    if (typeof window === "undefined" || typeof window.speechSynthesis === "undefined") {
      setHint("このブラウザは読み上げ機能に対応していません。");
      return;
    }
    stop();
    setBusy(true);
    setHint("");
    const token = speechTokenRef.current;
    const voice = pickJapaneseVoice();
    try {
      for (const { key, label } of ORDER) {
        if (token !== speechTokenRef.current) return;
        const text = dialogue[key].trim();
        if (!text) continue;
        const style = SPEECH_STYLE[key];
        await new Promise<void>((resolve, reject) => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = "ja-JP";
          utterance.rate = style.rate;
          utterance.pitch = style.pitch;
          utterance.volume = 1.0;
          if (voice) utterance.voice = voice;
          utterance.onend = () => resolve();
          utterance.onerror = () => reject(new Error(`${label} の読み上げに失敗しました`));
          window.speechSynthesis.speak(utterance);
        });
      }
      setHint("音質はブラウザ内蔵音声です。VOICEVOX 接続時はより自然な音声になります。");
    } catch (e) {
      if (token !== speechTokenRef.current) return;
      if (e instanceof Error) setHint(e.message);
      else setHint("ブラウザ音声の読み上げに失敗しました。");
    } finally {
      if (token === speechTokenRef.current) {
        setBusy(false);
      }
    }
  }, [dialogue, pickJapaneseVoice, stop]);

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
      const msg = (() => {
        if (e instanceof DOMException && e.name === "NotAllowedError") {
          return "自動再生がブラウザ制限でブロックされました。再生ボタンを押してください。";
        }
        if (e instanceof Error) return e.message;
        return "音声の合成・再生に失敗しました";
      })();
      setHint(msg);
    } finally {
      if (abortRef.current === ac) abortRef.current = null;
      setBusy(false);
    }
  }, [dialogue, stop]);

  useEffect(() => {
    if (!autoPlayOnReady || !dialogue || gate !== "ready" || busy) return;
    const key = `${dialogue.rink}__${dialogue.konta}__${dialogue.tanunee}`;
    if (autoPlayedKeyRef.current === key) return;
    autoPlayedKeyRef.current = key;
    void play();
  }, [autoPlayOnReady, dialogue, gate, busy, play]);

  if (!dialogue) return null;

  if (gate === "off") {
    const unsupported = !speechSupported;
    return (
      <div
        className={`${styles.wrap}${compact ? ` ${styles.wrapCompact}` : ""}`}
        role="region"
        aria-label="VOICEVOX 読み上げ"
      >
        {unsupported ? (
          <button type="button" className={styles.playBtnDisabled} disabled>
            VOICEVOX は未設定です
          </button>
        ) : (
          <button
            type="button"
            className={styles.fallbackBtn}
            onClick={() => void playBrowserFallback()}
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? "読み上げ中…" : "🔊 ブラウザ音声で読み上げ（簡易）"}
          </button>
        )}
        {busy && !unsupported ? (
          <button type="button" className={styles.stopBtn} onClick={stop}>
            停止
          </button>
        ) : null}
        <p className={styles.hintMuted}>
          {unsupported
            ? "このブラウザは読み上げ機能に対応していません。"
            : "音質はブラウザ内蔵音声です。VOICEVOX 接続時はより自然な音声になります。"}
        </p>
        {hint && (
          <p className={styles.hint} role="alert">
            {hint}
          </p>
        )}
      </div>
    );
  }

  if (gate === "unknown") {
    return (
      <div
        className={`${styles.wrap}${compact ? ` ${styles.wrapCompact}` : ""}`}
        role="status"
        aria-live="polite"
      >
        <p className={styles.probing}>読み上げ: 接続確認中…</p>
      </div>
    );
  }

  if (gate === "down") {
    const unsupported = !speechSupported;
    return (
      <div
        className={`${styles.wrap}${compact ? ` ${styles.wrapCompact}` : ""}`}
        role="region"
        aria-label="VOICEVOX 読み上げ"
      >
        {unsupported ? (
          <button type="button" className={styles.playBtnDisabled} disabled>
            VOICEVOX に接続できません
          </button>
        ) : (
          <button
            type="button"
            className={styles.fallbackBtn}
            onClick={() => void playBrowserFallback()}
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? "読み上げ中…" : "🔊 ブラウザ音声で読み上げ（簡易）"}
          </button>
        )}
        {busy && !unsupported ? (
          <button type="button" className={styles.stopBtn} onClick={stop}>
            停止
          </button>
        ) : null}
        <p className={styles.hintMuted}>
          {unsupported
            ? "このブラウザは読み上げ機能に対応していません。"
            : "音質はブラウザ内蔵音声です。VOICEVOX 接続時はより自然な音声になります。"}
        </p>
        {hint && (
          <p className={styles.hint} role="alert">
            {hint}
          </p>
        )}
      </div>
    );
  }

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
