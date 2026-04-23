"use client";

import { useEffect } from "react";
import { SegmentErrorFallback } from "./components/SegmentErrorFallback";

/**
 * ルートレイアウト直下の segment で発生したエラーを捕捉する。
 * （layout 自体のエラーは global-error.tsx が必要だが、まずはここで大半をカバー）
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <SegmentErrorFallback
      title="表示できませんでした"
      description="通信や一時的な不具合の可能性があります。再試行するか、しばらく待ってからお試しください。"
      reset={reset}
    />
  );
}
