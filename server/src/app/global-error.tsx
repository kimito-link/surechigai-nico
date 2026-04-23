"use client";

import { useEffect } from "react";
import { SegmentErrorFallback } from "./components/SegmentErrorFallback";

/**
 * ルート layout.tsx 内で起きたエラーを捕捉する（root layout 自体がレンダー不能なとき）。
 * 独自の html/body が必須のため、通常の SiteHeader 等は出ない。
 */
export default function GlobalError({
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
    <html lang="ja">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "#f7f1e7",
          fontFamily:
            '"Segoe UI", "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif',
        }}
      >
        <SegmentErrorFallback
          title="表示を再開できませんでした"
          description="ページ全体の読み込みに失敗しました。再試行するか、トップから開き直してください。"
          reset={reset}
        />
      </body>
    </html>
  );
}
