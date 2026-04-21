"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import styles from "./SiteHeader.module.css";

const NAV_LINKS = [
  { href: "/", label: "ホーム" },
  { href: "/chokaigi", label: "超会議で使う" },
  { href: "/chokaigi#usage-heading", label: "つかいかた" },
] as const;

const HIDDEN_PATHS = ["/sign-in", "/sign-up", "/onboarding", "/app"];

function XIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.258 5.625L18.243 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropOpen, setUserDropOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    if (!userDropOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setUserDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userDropOpen]);

  const closeMenu = () => setMenuOpen(false);

  if (HIDDEN_PATHS.some((p) => pathname?.startsWith(p))) return null;

  // ClerkはTwitter OAuthでログインするとusernameにTwitterハンドルが入る
  const twitterHandle = user?.username;
  const displayName = user?.fullName || user?.firstName || twitterHandle || "ユーザー";

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
          {/* isLoaded でフリッカー防止 */}
          {isLoaded && isSignedIn ? (
            <div className={styles.userPillWrap} ref={dropRef}>
              <button
                className={styles.userPill}
                onClick={() => setUserDropOpen((v) => !v)}
                aria-expanded={userDropOpen}
                aria-label="アカウントメニューを開く"
              >
                <span className={styles.onlineDot} aria-hidden="true" />
                {user?.imageUrl ? (
                  <img
                    src={user.imageUrl}
                    alt=""
                    className={styles.userPillAvatar}
                  />
                ) : (
                  <span className={styles.userPillInitial}>
                    {displayName[0]}
                  </span>
                )}
                <span className={styles.userPillInfo}>
                  <span className={styles.userPillName}>{displayName}</span>
                  <span className={styles.userPillBadge}>
                    <XIcon size={11} />
                    ログイン中
                  </span>
                </span>
                <svg
                  className={`${styles.chevron} ${userDropOpen ? styles.chevronOpen : ""}`}
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2 4l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              {userDropOpen && (
                <div className={styles.userDropdown}>
                  {twitterHandle && (
                    <p className={styles.dropHandle}>@{twitterHandle}</p>
                  )}
                  <button
                    className={styles.dropItem}
                    onClick={() => {
                      setUserDropOpen(false);
                      signOut({ redirectUrl: "/logged-out" });
                    }}
                  >
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          ) : isLoaded && !isSignedIn ? (
            <Link href="/sign-in" className={styles.signInButton}>
              <XIcon size={14} />
              Xでログイン
            </Link>
          ) : null}
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

      {/* モバイルナビ */}
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
          {/* ログイン中ユーザー情報 */}
          {isLoaded && isSignedIn && (
            <div className={styles.mobileUserInfo}>
              {user?.imageUrl && (
                <img
                  src={user.imageUrl}
                  alt=""
                  className={styles.mobileAvatar}
                />
              )}
              <div className={styles.mobileUserText}>
                <span className={styles.mobileUserName}>{displayName}</span>
                {twitterHandle && (
                  <span className={styles.mobileHandle}>
                    @{twitterHandle}
                  </span>
                )}
                <span className={styles.mobileBadge}>
                  <XIcon size={11} />
                  ログイン中
                </span>
              </div>
            </div>
          )}

          {isLoaded && isSignedIn ? (
            <button
              onClick={() => {
                signOut({ redirectUrl: "/logged-out" });
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
              <XIcon size={15} />
              Xでログイン
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
