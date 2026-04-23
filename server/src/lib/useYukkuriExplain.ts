"use client";

import { useCallback, useRef, useState } from "react";
import {
  fetchYukkuriExplain,
  fetchYukkuriExplainTweet,
  yukkuriExplainUserMessage,
  YUKKURI_EXPLAIN_TIMEOUT_MS,
  type YukkuriDialogue,
  type YukkuriTweetContext,
} from "./yukkuriExplainClient";

/**
 * ゆっくり解説の UI から使う hook。
 *
 * 重要な設計方針:
 *  - **失敗時は fallback のダイアログ文を埋めない**。かつては
 *    `buildLocalFallbackDialogue` で「それっぽい」セリフを埋めていたが、
 *    これだと「AI 失敗」と「AI 成功」の見た目が同じになり、ユーザーは
 *    問題に気づかず「弱い紹介文が本物」だと誤認する。
 *    → 失敗時は `dialogue` は null のまま、`error` だけを set し、
 *       UI 側でエラーブロックを大きく表示して再試行を促す。
 *
 *  - **abort の理由ごとに扱いを変える**:
 *      1. `userCancelledRef`（明示的にキャンセルボタン押下）→ 静かに終了
 *      2. `timeoutFiredRef`（フロント側 90s タイムアウト）→ timeout エラー文言
 *      3. その他の abort（iOS Safari のバックグラウンド中断 / Wi-Fi⇔LTE
 *         切替 / 電波切れ）→ ネットワーク中断エラー文言
 *    以前はケース 3 が早期 return で握りつぶされており、スマホユーザーが
 *    「解説が出ずに終わる」バグの主要な原因になっていた。
 */
export function useYukkuriExplain() {
  const [dialogue, setDialogue] = useState<YukkuriDialogue | null>(null);
  /**
   * ツイート URL 解説モードの時だけ非 null。
   * UI は「ツイート本文を表示」「元ツイートへのリンク」「投稿者アバター表示」に使う。
   * ハンドル解説モードでは常に null のまま。
   */
  const [tweetContext, setTweetContext] = useState<YukkuriTweetContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userCancelledRef = useRef(false);
  const timeoutFiredRef = useRef(false);

  const reset = useCallback(() => {
    userCancelledRef.current = false;
    timeoutFiredRef.current = false;
    abortRef.current?.abort();
    abortRef.current = null;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setDialogue(null);
    setTweetContext(null);
    setError("");
    setLoading(false);
  }, []);

  const cancelInFlight = useCallback(() => {
    userCancelledRef.current = true;
    abortRef.current?.abort();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    abortRef.current = null;
    setLoading(false);
  }, []);

  const explain = useCallback(async (body: Record<string, unknown>) => {
    userCancelledRef.current = false;
    timeoutFiredRef.current = false;
    abortRef.current?.abort();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError("");
    setDialogue(null);
    setTweetContext(null);

    timeoutRef.current = setTimeout(() => {
      timeoutFiredRef.current = true;
      ac.abort();
    }, YUKKURI_EXPLAIN_TIMEOUT_MS);

    try {
      // body.tweetUrl が文字列なら「ツイート URL 解説モード」に分岐。
      // 既存ハンドル解説 API は tweetUrl フィールドを使わないので衝突しない。
      const tweetUrl = typeof body.tweetUrl === "string" ? body.tweetUrl : null;
      if (tweetUrl && tweetUrl.length > 0) {
        const result = await fetchYukkuriExplainTweet(tweetUrl, { signal: ac.signal });
        setDialogue(result.dialogue);
        setTweetContext(result.tweet);
      } else {
        const result = await fetchYukkuriExplain(body, { signal: ac.signal });
        setDialogue(result);
      }
    } catch (e) {
      if (ac.signal.aborted) {
        // 1. ユーザー明示キャンセル → 静かに終了（UI は dismiss 済み）
        if (userCancelledRef.current) {
          userCancelledRef.current = false;
          return;
        }
        // 2. フロント側 90 秒タイムアウト
        if (timeoutFiredRef.current) {
          timeoutFiredRef.current = false;
          setError(
            yukkuriExplainUserMessage(
              new DOMException("The operation timed out.", "TimeoutError")
            )
          );
          return;
        }
        // 3. それ以外の abort（iOS Safari の background 中断 / 電波切れ / タブ遷移）
        //    以前はここで早期 return して UI が無音失敗していた。
        //    必ず error を set してユーザーに再試行を促す。
        setError(
          "通信が中断されました（電波が弱い・画面切替・アプリのバックグラウンド移行のいずれか）。もう一度お試しください。"
        );
        return;
      }
      // ネットワーク層ではなくアプリ層のエラー（HTTP エラー / JSON 不正等）
      setError(yukkuriExplainUserMessage(e));
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      timeoutFiredRef.current = false;
      setLoading(false);
      abortRef.current = null;
    }
  }, []);

  return { dialogue, tweetContext, loading, error, explain, reset, cancelInFlight };
}
