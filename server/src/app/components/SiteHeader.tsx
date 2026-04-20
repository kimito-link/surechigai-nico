"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useUser, useClerk } from "@clerk/nextjs";
import styles from "./SiteHeader.module.css";

const NAV_LINKS = [
  { href: "/", label: "ホーム" },
  { href: "/chokaigi", label: "超会議で使う" },
  { href: "/chokaigi#usage-heading", label: "つかいかた" },
] as const;

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logo} onClick={closeMenu}>
          <img
            src="/chokaigi/logos/kimito-link-logo.png"
            alt="すれちがいライト"
            className={styles.logoImg}
          />
        </Link>

        <nav className={styles.desktopNav} aria-label="メインメニュー">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={styles.navLink}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className={styles.authArea}>
          {isSignedIn ? (
            <button
              onClick={() => signOut()}
              className={styles.userButton}
            >
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt=""
                  className={styles.userAvatar}
                />
              ) : (
                <span className={styles.userInitial}>
                  {user?.firstName?.[0] || "U"}
                </span>
              )}
            </button>
          ) : (
            <Link href="/sign-in" className={styles.signInButton}>
              ログイン
            </Link>
          )}
        </div>

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
      >
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={styles.mobileNavLink}
            onClick={closeMenu}
          >
            {link.label}
          </Link>
        ))}
        <div className={styles.mobileAuthArea}>
          {isSignedIn ? (
            <button
              onClick={() => {
                signOut();
                closeMenu();
              }}
              className={styles.mobileSignOutButton}
            >
              ログアウト
            </button>
          ) : (
            <Link
              href="/sign-in"
              className={styles.mobileSignInButton}
              onClick={closeMenu}
            >
              ログイン
            </Link>
          )}
        </div>
      </nav>

      {menuOpen && (
        <div
          className={styles.overlay}
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}
    </header>
  );
}
