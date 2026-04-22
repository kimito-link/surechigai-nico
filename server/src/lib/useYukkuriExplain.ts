"use client";

import { useCallback, useRef, useState } from "react";
import {
  fetchYukkuriExplain,
  yukkuriExplainUserMessage,
  YUKKURI_EXPLAIN_TIMEOUT_MS,
  type YukkuriDialogue,
} from "./yukkuriExplainClient";

export function useYukkuriExplain() {
  const [dialogue, setDialogue] = useState<YukkuriDialogue | null>(null);
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

    timeoutRef.current = setTimeout(() => {
      timeoutFiredRef.current = true;
      ac.abort();
    }, YUKKURI_EXPLAIN_TIMEOUT_MS);

    try {
      const result = await fetchYukkuriExplain(body, { signal: ac.signal });
      setDialogue(result);
    } catch (e) {
      if (ac.signal.aborted) {
        if (userCancelledRef.current) {
          userCancelledRef.current = false;
          return;
        }
        if (timeoutFiredRef.current) {
          timeoutFiredRef.current = false;
          setError(
            yukkuriExplainUserMessage(
              new DOMException("The operation timed out.", "TimeoutError")
            )
          );
          return;
        }
        return;
      }
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

  return { dialogue, loading, error, explain, reset, cancelInFlight };
}
