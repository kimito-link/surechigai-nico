"use client";

import { useState, useRef, useEffect, useCallback, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { YukkuriDialogue } from "@/lib/yukkuriExplainClient";
import { useYukkuriExplain } from "@/lib/useYukkuriExplain";
import { classifyYukkuriInput } from "@/lib/tweetUrl";
import {
  yukkuriExplainedPagePath,
  yukkuriShareClipboardBundle,
  yukkuriShareTweetUrl,
  yukkuriTweetShareClipboardBundle,
  yukkuriTweetShareTweetUrl,
} from "@/lib/yukkuriShareUrls";
import styles from "./chokaigi.module.css";

type Dialogue = YukkuriDialogue;

const CHARS: Array<{ key: keyof Dialogue; label: string; speaker: "rink" | "konta" | "tanunee" }> = [
  { key: "rink", label: "りんく", speaker: "rink" },
  { key: "konta", label: "こん太", speaker: "konta" },
  { key: "tanunee", label: "たぬ姉", speaker: "tanunee" },
];

const BASE_URL = "https://surechigai-nico.link";

/**
 * シェア先 URL の組み立て。
 * - ハンドル解説モード → アカウント紹介ページ (`/yukkuri/explained/{handle}`) を共有
 * - ツイート解説モード → ツイート解説ページ (`/yukkuri/explained/tweet/{tweetId}`) を共有
 *   ハンドルの紹介ページを共有してしまうとシェアカードが「そのアカウント全体の紹介」
 *   として表示され、解説対象のツイートが伝わらないため。
 */
type ShareTarget =
  | { kind: "handle"; handle: string }
  | { kind: "tweet"; tweetId: string; handle: string };

function buildTweetUrl(target: ShareTarget): string {
  if (target.kind === "tweet") {
    return yukkuriTweetShareTweetUrl(BASE_URL, target.tweetId, target.handle);
  }
  return yukkuriShareTweetUrl(BASE_URL, target.handle);
}

/**
 * クリップボードに「本文＋URL」を仕込んでから X を開く。
 *
 * X の Windows / Mac デスクトップアプリが intent URL を奪って空白の composer を
 * 開くケースがあるので、その場合でも Ctrl+V / ⌘V でリカバリできるように
 * 事前にクリップボードを埋めておく。
 */
async function primeClipboardForShare(target: ShareTarget): Promise<void> {
  try {
    const bundle =
      target.kind === "tweet"
        ? yukkuriTweetShareClipboardBundle(BASE_URL, target.tweetId, target.handle)
        : yukkuriShareClipboardBundle(BASE_URL, target.handle);
    await navigator.clipboard.writeText(bundle);
  } catch {
    // クリップボード API が使えない環境では諦める（intent は独立に機能する）。
  }
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
  const { dialogue, tweetContext, loading, error, explain, reset, cancelInFlight } =
    useYukkuriExplain();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  const hasInput = handle.trim().length > 0;
  const rawHandle = handle.trim().replace(/^@+/, "");
  // 入力を「ハンドル」「ツイート URL」「認識不能」に分類する。
  // 送信時にこの分類結果で API を振り分け、UI 表示にも流用する。
  const classified = useMemo(() => classifyYukkuriInput(handle), [handle]);
  const panelOpen = Boolean(loading || dialogue || error);
  // パネル内でのハンドル表記は優先順で決める:
  //   1) ツイート解説が成功していれば投稿者の handle
  //   2) 入力がハンドルとして有効ならその値
  //   3) fallback: 生の入力から @ を除いた文字列
  const displayHandle =
    tweetContext?.handle ??
    (classified.kind === "handle" ? classified.handle : rawHandle);

  // シェア先のターゲット。ツイート解説モードなら「そのツイート 1 件の解説ページ」
  // を共有し、ハンドル解説モードなら「アカウント紹介ページ」を共有する。
  // tweetContext が解決している間はツイート側を優先し、API 側で tweet が認識
  // できなかった場合（fallback でハンドル解説になった場合）はハンドル側に戻る。
  const shareTarget = useMemo<ShareTarget>(() => {
    if (tweetContext) {
      return { kind: "tweet", tweetId: tweetContext.tweetId, handle: tweetContext.handle };
    }
    return { kind: "handle", handle: displayHandle };
  }, [tweetContext, displayHandle]);

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
    // ツイート URL なら tweet 解説 API に振り分け。
    // ハンドルなら既存のハンドル解説 API。
    // どちらでもない（認識不能）場合は何もせず return。
    if (classified.kind === "tweet") {
      void explain({ tweetUrl: handle.trim() });
      return;
    }
    if (classified.kind === "handle") {
      void explain({
        xHandle: classified.handle,
        name: `@${classified.handle}`,
      });
      return;
    }
    // unknown は静かに return（submit ボタンは hasInput の間だけ表示されるが、
    // ユーザーが URL でもハンドルでもない文字列を入れて submit した場合は無反応にする）。
  };

  const handleRegister = () => {
    router.push("/sign-in");
  };

  return (
    <>
      <div className={styles.stickyXBar} role="region" aria-label="X ID・ゆっくり解説とすれ違い登録">
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
            placeholder="X ID または ツイート URL"
            aria-label="X アカウントの ID、または解説したいツイートの URL"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          {hasInput && (
            <>
              <button
                type="submit"
                className={styles.stickyXBtnYukkuri}
                disabled={loading || classified.kind === "unknown"}
                title={
                  classified.kind === "tweet"
                    ? "このツイートをゆっくり解説する"
                    : classified.kind === "handle"
                      ? `@${classified.handle} をゆっくり解説する`
                      : "X ID か、x.com のツイート URL を入力してください"
                }
              >
                {loading
                  ? "…"
                  : classified.kind === "tweet"
                    ? "ツイート解説"
                    : "ゆっくり解説"}
              </button>
              <button
                type="button"
                className={styles.stickyXBtnRegister}
                onClick={handleRegister}
                title="会場で位置を交換してすれ違い検出。いいねやオフ会のきっかけにも（ログイン）"
              >
                すれ違い登録
              </button>
            </>
          )}
          {!hasInput && (
            <span className={styles.stickyXHintWrap} aria-live="polite">
              <span className={styles.stickyXHintLong}>
                X ID かツイート URL を入れると「ゆっくり解説」。会場ですれ違い検出するなら右のボタンから登録
              </span>
              <span className={styles.stickyXHintShort}>解説 or すれ違い登録</span>
            </span>
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
                    disabled={classified.kind === "unknown"}
                    onClick={() => {
                      // 再試行は元の入力種別（ツイート URL / ハンドル）を保持したまま
                      // もう一度同じ API を叩く。過去は常に handle explain を叩いて
                      // いたため、ツイート URL 入力に対して再試行を押すと URL 文字列が
                      // ハンドルとして API に渡り、確実に失敗していた。
                      reset();
                      if (classified.kind === "tweet") {
                        void explain({ tweetUrl: handle.trim() });
                        return;
                      }
                      if (classified.kind === "handle") {
                        void explain({
                          xHandle: classified.handle,
                          name: `@${classified.handle}`,
                        });
                      }
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
                {/* ツイート解説モードの場合は、どのツイートを解説したかを先に示す。
                    本文を出すことで「自分のツイート URL が正しく読み込まれた」ことが
                    ひと目で分かり、違うツイートが出てきていないかの確認もしやすい。 */}
                {tweetContext && (
                  <p className={styles.stickyXCanonNote}>
                    <a
                      href={`https://x.com/${tweetContext.handle}/status/${tweetContext.tweetId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.stickyXCanonLink}
                    >
                      @{tweetContext.handle} のツイートを解説中 →
                    </a>
                  </p>
                )}
                <div className={styles.yukkuriCreatorTalkDialogue}>
                  {CHARS.map(({ key, label, speaker }) => (
                    <div key={key} className={styles.yukkuriCreatorRow} data-speaker={speaker}>
                      <span className={styles.yukkuriCreatorLabel}>{label}</span>
                      <div className={styles.yukkuriCreatorBubble}>{dialogue[key]}</div>
                    </div>
                  ))}
                </div>
                <div className={styles.stickyXShareRow}>
                  {/* Xシェアボタン: shareTarget がハンドル/ツイートのどちらかを判別し、
                      それぞれ最適なシェア URL（アカウント紹介 or ツイート解説ページ）を
                      返す。ツイート解説をハンドル紹介ページとして拡散してしまうと OGP
                      カードが「そのアカウント全体の紹介」になり、どのツイートについて
                      反応したのか伝わらないため、個別ページにリンクするのがポイント。 */}
                  <a
                    href={buildTweetUrl(shareTarget)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.stickyXShareBtn}
                    onMouseDown={() => {
                      void primeClipboardForShare(shareTarget);
                    }}
                    onClick={async (e) => {
                      e.preventDefault();
                      try {
                        await primeClipboardForShare(shareTarget);
                      } catch {}
                      window.open(buildTweetUrl(shareTarget), "_blank", "noopener,noreferrer");
                    }}
                  >
                    Xでシェア
                  </a>
                  <button
                    type="button"
                    className={styles.stickyXBtnRegister}
                    onClick={handleRegister}
                    title="位置情報の交換ですれ違い検出。いいねやオフ会のきっかけにも"
                  >
                    すれ違い参加（位置・オフ会）
                  </button>
                </div>
                <p className={styles.stickyXShareHint}>
                  Xアプリで空白で開いたら<strong>そのまま貼り付け</strong>でOKです（本文＋URLはコピー済）。
                </p>
                {/* 保存 URL の案内。
                    ハンドル解説 → /yukkuri/explained/{handle}
                    ツイート解説 → /yukkuri/explained/tweet/{tweetId}
                    ツイート解説側は DB テーブル未作成の環境では 404 になるが、
                    Codex が `yukkuri_explained_tweet` テーブルを作成した瞬間に
                    自動で閲覧可能になる（UI 側は追加デプロイ不要）。 */}
                {tweetContext ? (
                  <p className={styles.stickyXCanonNote}>
                    <Link
                      href={`/yukkuri/explained/tweet/${encodeURIComponent(tweetContext.tweetId)}`}
                      className={styles.stickyXCanonLink}
                    >
                      このツイート解説の保存ページ →
                    </Link>
                  </p>
                ) : (
                  <p className={styles.stickyXCanonNote}>
                    <Link
                      href={yukkuriExplainedPagePath(displayHandle)}
                      className={styles.stickyXCanonLink}
                    >
                      @{displayHandle} の紹介ページ（保存URL）→
                    </Link>
                  </p>
                )}
              </>
            )}
          </div>
        </>
      )}
    </>
  );
}
