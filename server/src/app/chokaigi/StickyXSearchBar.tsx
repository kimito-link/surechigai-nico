"use client";

import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { YukkuriDialogue } from "@/lib/yukkuriExplainClient";
import { useYukkuriExplain } from "@/lib/useYukkuriExplain";
import { YukkuriVoicePlayer } from "@/app/components/YukkuriVoicePlayer";
import { yukkuriExplainedPagePath, yukkuriShareTweetUrl } from "@/lib/yukkuriShareUrls";
import styles from "./chokaigi.module.css";

type Dialogue = YukkuriDialogue;

const CHARS: Array<{ key: keyof Dialogue; label: string; speaker: "rink" | "konta" | "tanunee" }> = [
  { key: "rink", label: "りんく", speaker: "rink" },
  { key: "konta", label: "こん太", speaker: "konta" },
  { key: "tanunee", label: "たぬ姉", speaker: "tanunee" },
];

const BASE_URL = "https://surechigai-nico.link";

function buildTweetUrl(handle: string): string {
  return yukkuriShareTweetUrl(BASE_URL, handle);
}

function collectFocusables(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  const sel =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(root.querySelectorAll<HTMLElement>(sel)).filter(
    (el) => !el.hasAttribute("disabled")
  );
}

export function StickyXSearchBar() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const { dialogue, loading, error, explain, reset, cancelInFlight } = useYukkuriExplain();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  const hasInput = handle.trim().length > 0;
  const rawHandle = handle.trim().replace(/^@+/, "");
  const panelOpen = Boolean(loading || dialogue || error);

  const dismiss = useCallback(() => {
    cancelInFlight();
    reset();
  }, [cancelInFlight, reset]);

  useEffect(() => {
    if (!loading) {
      setElapsedSec(0);
      return;
    }
    setElapsedSec(0);
    const t = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [loading]);

  useEffect(() => {
    if (!panelOpen) return;

    const prevActive = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = collectFocusables(panel);
    const first = focusables[0] ?? closeBtnRef.current;
    window.setTimeout(() => first?.focus(), 0);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
        inputRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !focusables.length) return;
      const last = focusables[focusables.length - 1];
      const firstEl = focusables[0];
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      prevActive?.focus?.();
    };
  }, [panelOpen, dismiss]);

  const handleYukkuri = (e: FormEvent) => {
    e.preventDefault();
    if (!rawHandle) return;
    void explain({
      xHandle: rawHandle,
      name: `@${rawHandle}`,
    });
  };

  const handleRegister = () => {
    router.push("/sign-in");
  };

  return (
    <>
      <div className={styles.stickyXBar} role="region" aria-label="検索・登録バー">
        <form className={styles.stickyXForm} onSubmit={handleYukkuri}>
          <span className={styles.stickyXAt} aria-hidden="true">
            @
          </span>
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
              <button type="submit" className={styles.stickyXBtnYukkuri} disabled={loading}>
                {loading ? "…" : "ゆっくり解説"}
              </button>
              <button type="button" className={styles.stickyXBtnRegister} onClick={handleRegister}>
                すれ違い登録
              </button>
            </>
          )}
          {!hasInput && (
            <span className={styles.stickyXHint}>入力すると解説・登録できます</span>
          )}
        </form>
      </div>

      {panelOpen && (
        <>
          <button
            type="button"
            className={styles.stickyXOverlay}
            aria-label="パネルを閉じる"
            onClick={dismiss}
          />
          <div
            ref={panelRef}
            className={styles.stickyXPanel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sticky-x-dialog-title"
          >
            <h2 id="sticky-x-dialog-title" className="visually-hidden">
              ゆっくり紹介
            </h2>
            <button
              ref={closeBtnRef}
              type="button"
              className={styles.stickyXPanelClose}
              onClick={dismiss}
              aria-label="閉じる"
            >
              ✕
            </button>

            {loading && (
              <div className={styles.stickyXLoadingBox}>
                <p className={styles.stickyXLoadingText}>
                  解説を生成しています…（{elapsedSec}秒経過）
                  <br />
                  初回やサーバー負荷時は数分かかることがあります。
                </p>
                <div className={styles.stickyXLoadingActions}>
                  <button type="button" className={styles.stickyXCancelBtn} onClick={dismiss}>
                    キャンセル
                  </button>
                </div>
              </div>
            )}

            {!loading && error && (
              <>
                <p className={styles.stickyXPanelError} role="alert">
                  {error}
                </p>
                <div className={styles.stickyXLoadingActions}>
                  <button
                    type="button"
                    className={styles.stickyXBtnYukkuri}
                    onClick={() => {
                      reset();
                      if (rawHandle) void explain({ xHandle: rawHandle, name: `@${rawHandle}` });
                    }}
                  >
                    再試行
                  </button>
                  <button type="button" className={styles.stickyXCancelBtn} onClick={dismiss}>
                    閉じる
                  </button>
                </div>
              </>
            )}

            {!loading && dialogue && (
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
                    href={buildTweetUrl(rawHandle)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.stickyXShareBtn}
                  >
                    Xでシェア
                  </a>
                  <button type="button" className={styles.stickyXBtnRegister} onClick={handleRegister}>
                    すれ違い登録へ
                  </button>
                </div>
                <p className={styles.stickyXCanonNote}>
                  <Link href={yukkuriExplainedPagePath(rawHandle)} className={styles.stickyXCanonLink}>
                    @{rawHandle} の紹介ページ（保存URL）→
                  </Link>
                </p>
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
