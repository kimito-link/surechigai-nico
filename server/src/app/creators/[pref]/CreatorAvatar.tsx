"use client";

import { useState } from "react";

type Props = {
  src: string | null;
  alt: string;
  fallbackInitial: string;
  className: string;
};

/**
 * X（Twitter）のアバター URL は、プロフィール画像差し替えや凍結で
 * 404 を返すことがある。読み込み失敗時にイニシャル表示へフォールバックする。
 */
export default function CreatorAvatar({
  src,
  alt,
  fallbackInitial,
  className,
}: Props) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div
        className={className}
        aria-hidden="true"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          color: "#aaa",
          fontSize: 24,
        }}
      >
        {fallbackInitial}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setErrored(true)}
    />
  );
}
