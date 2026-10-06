import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // X-Powered-By: Next.js の露出を止める（使用フレームワークが外部から見えると狙われやすい）
  poweredByHeader: false,
  // 注意: App Router 既定は末尾スラッシュなし。/chokaigi → /chokaigi/ の redirects を足すと
  // Next の /chokaigi/ → /chokaigi 正規化と衝突しリダイレクトループになる。
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            // 注意: このアプリは近接マッチングで位置情報を使うため geolocation は self を許可する
            // （他サイトのコピペで () にすると位置情報機能が壊れる）
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
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
