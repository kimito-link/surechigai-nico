import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { jaJP } from "@clerk/localizations";
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
        <ClerkProvider
          proxyUrl={process.env.NEXT_PUBLIC_CLERK_PROXY_URL}
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
          <SiteHeader />
          <div style={{ paddingTop: "56px", paddingBottom: "80px" }}>
            {children}
          </div>
          <SiteFooterCta />
        </ClerkProvider>
      </body>
    </html>
  );
}
