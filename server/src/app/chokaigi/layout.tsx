import type { Metadata, Viewport } from "next";
import { ChokaigiJsonLd } from "./ChokaigiJsonLd";
import {
  LP_DESCRIPTION,
  LP_TITLE,
  canonicalUrl,
  siteOrigin,
} from "./lp-content";
import styles from "./chokaigi.module.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f1e7",
};

export const metadata: Metadata = {
  metadataBase: new URL(`${siteOrigin()}/`),
  title: LP_TITLE,
  description: LP_DESCRIPTION,
  alternates: {
    canonical: canonicalUrl(),
  },
  openGraph: {
    title: LP_TITLE,
    description: LP_DESCRIPTION,
    url: canonicalUrl(),
    locale: "ja_JP",
    type: "website",
    siteName: "すれちがいライト",
  },
  twitter: {
    card: "summary_large_image",
    title: LP_TITLE,
    description: LP_DESCRIPTION,
  },
};

export default function ChokaigiLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.pageRoot}>
      <ChokaigiJsonLd />
      {children}
    </div>
  );
}
