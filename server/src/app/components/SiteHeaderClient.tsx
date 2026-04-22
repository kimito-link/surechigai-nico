"use client";

import { useState, useEffect, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SITE_NAV_LINKS } from "./siteHeaderConstants";
import { SiteHeaderAuthBar, SiteHeaderAuthMobile } from "./SiteHeaderAuth";
import styles from "./SiteHeader.module.css";

type SiteHeaderClientProps = {
  pathname: string;
  logo: ReactNode;
  desktopNav: ReactNode;
};

export function SiteHeaderClient({ pathname, logo, desktopNav }: SiteHeaderClientProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [creatorQuickQuery, setCreatorQuickQuery] = useState("");
  const router = useRouter();
  const isChokaigiPath = pathname.startsWith("/chokaigi") || pathname === "/";
  const isAppPath = pathname.startsWith("/app");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const prevActive = document.activeElement as HTMLElement | null;
    const menu = document.getElementById("mobile-menu");
    const focusables = menu
      ? Array.from(menu.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"))
      : [];
    const first = focusables[0];
    requestAnimationFrame(() => first?.focus());

    const origOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = origOverflow;
      document.removeEventListener("keydown", onKeyDown);
      prevActive?.focus?.();
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const handleCreatorQuickSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const keyword = creatorQuickQuery.trim();
    const href = keyword
      ? `/chokaigi?creator=${encodeURIComponent(keyword)}#creator-cross-search-heading`
      : "/chokaigi#creator-cross-search-heading";
    router.push(href);
    closeMenu();
  };

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
      <div className={styles.inner}>
        <div className={styles.logoTapWrap} onClick={closeMenu} role="presentation">
          {logo}
        </div>

        {isChokaigiPath ? (
          <form className={styles.quickCreatorSearch} onSubmit={handleCreatorQuickSearch}>
            <input
              type="search"
              className={styles.quickCreatorInput}
              value={creatorQuickQuery}
              onChange={(event) => setCreatorQuickQuery(event.target.value)}
              placeholder="参加者を検索"
              aria-label="クリエイタークロス参加者を検索"
            />
            <button type="submit" className={styles.quickCreatorButton}>
              検索
            </button>
          </form>
        ) : null}

        {desktopNav}

        <SiteHeaderAuthBar isAppPath={isAppPath} />

        <button
          className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ""}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
        >
          <span className={styles.hamburgerBar} />
          <span className={styles.hamburgerBar} />
          <span className={styles.hamburgerBar} />
        </button>
      </div>

      <nav
        id="mobile-menu"
        className={`${styles.mobileNav} ${menuOpen ? styles.mobileNavOpen : ""}`}
        aria-label="モバイルメニュー"
        aria-hidden={!menuOpen}
      >
        {SITE_NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={styles.mobileNavLink}
            onClick={closeMenu}
          >
            {link.label}
          </Link>
        ))}

        <SiteHeaderAuthMobile isAppPath={isAppPath} closeMenu={closeMenu} />
      </nav>

      {menuOpen ? (
        <div className={styles.overlay} onClick={closeMenu} aria-hidden="true" />
      ) : null}
    </header>
  );
}
