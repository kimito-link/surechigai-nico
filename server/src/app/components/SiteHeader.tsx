import Link from "next/link";
import { headers } from "next/headers";
import { SiteHeaderClient } from "./SiteHeaderClient";
import { SITE_HEADER_HIDDEN_PATHS, SITE_NAV_LINKS } from "./siteHeaderConstants";
import styles from "./SiteHeader.module.css";

export async function SiteHeader() {
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "/";

  if (SITE_HEADER_HIDDEN_PATHS.some((p) => pathname.startsWith(p))) {
    return null;
  }

  return (
    <SiteHeaderClient
      pathname={pathname}
      logo={
        <Link href="/" className={styles.logo}>
          <img
            src="/chokaigi/logos/kimito-link-logo.png"
            alt="すれちがいライト"
            className={styles.logoImg}
          />
        </Link>
      }
      desktopNav={
        <nav className={styles.desktopNav} aria-label="メインメニュー">
          {SITE_NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={styles.navLink}>
              {link.label}
            </Link>
          ))}
        </nav>
      }
    />
  );
}
