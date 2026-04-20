import "./globals.css";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooterCta } from "./components/SiteFooterCta";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <SiteHeader />
        <div style={{ paddingTop: "56px", paddingBottom: "80px" }}>
          {children}
        </div>
        <SiteFooterCta />
      </body>
    </html>
  );
}
