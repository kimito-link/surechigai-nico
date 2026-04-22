import "./globals.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { jaJP } from "@clerk/localizations";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooterCta } from "./components/SiteFooterCta";
import { PrefetchChokaigiRoutes } from "./components/PrefetchChokaigiRoutes";
import { WebVitalsReporter } from "./components/WebVitalsReporter";
import { AnalyticsNavigationTracker } from "./components/AnalyticsNavigationTracker";
import layoutStyles from "./layout.module.css";
import { LayoutSpacingEffect } from "./components/LayoutSpacingEffect";

export const metadata: Metadata = {
  icons: {
    icon: [
      { url: "/favicon-kimito-bright.svg?v=2", type: "image/svg+xml" },
      { url: "/chokaigi/logos/kimito-link-logo.png", type: "image/png" },
    ],
    shortcut: ["/favicon-kimito-bright.svg?v=2"],
    apple: ["/chokaigi/logos/kimito-link-logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <ClerkProvider
          localization={jaJP}
          appearance={{
            variables: {
              colorPrimary: "#255d9b",
              colorDanger: "#dc3545",
              colorSuccess: "#28a745",
              colorBackground: "#ffffff",
              colorForeground: "#3a2f24",
              colorMutedForeground: "#5c5248",
              colorNeutral: "#e8dfd3",
              colorBorder: "rgba(88, 62, 28, 0.15)",
              borderRadius: "1rem",
              fontFamily: "inherit",
            },
          }}
        >
          <WebVitalsReporter />
          <LayoutSpacingEffect />
          <Suspense fallback={null}>
            <AnalyticsNavigationTracker />
          </Suspense>
          <PrefetchChokaigiRoutes />
          <SiteHeader />
          <div className={layoutStyles.pageShell}>{children}</div>
          <SiteFooterCta />
        </ClerkProvider>
      </body>
    </html>
  );
}
