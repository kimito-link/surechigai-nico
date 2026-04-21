import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /** Playwright 等が baseURL を 127.0.0.1 にすると /_next への開発時リクエストが警告になるため */
  allowedDevOrigins: ["127.0.0.1"],
  // 注意: App Router 既定は末尾スラッシュなし。/chokaigi → /chokaigi/ の redirects を足すと
  // Next の /chokaigi/ → /chokaigi 正規化と衝突しリダイレクトループになる。
  async rewrites() {
    return [
      // svgavatars PHP → Next.js API リライト
      {
        source: "/svgavatars/php/save-ready-avatar.php",
        destination: "/api/avatar/save",
      },
      {
        source: "/svgavatars/php/temp-avatar-save.php",
        destination: "/api/avatar/temp-save",
      },
      {
        source: "/svgavatars/php/temp-avatar-download.php",
        destination: "/api/avatar/temp-download",
      },
    ];
  },
};

export default nextConfig;
