"use client";

import { useEffect } from "react";
import { SegmentErrorFallback } from "../components/SegmentErrorFallback";

export default function YukkuriError({
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
      title="ページを表示できませんでした"
      description="通信や一時的な不具合の可能性があります。再試行するか、しばらく待ってからお試しください。"
      reset={reset}
    />
  );
}
