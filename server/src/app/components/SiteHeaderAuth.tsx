"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import styles from "./SiteHeader.module.css";

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

type BarProps = { isAppPath: boolean };

/** ヘッダー常設のログイン／アカウント（Clerk のみ） */
export function SiteHeaderAuthBar({ isAppPath }: BarProps) {
  const [userDropOpen, setUserDropOpen] = useState(false);
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const dropRef = useRef<HTMLDivElement>(null);

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

  const twitterHandle = user?.username;
  const displayName = user?.fullName || user?.firstName || twitterHandle || "ユーザー";

  return (
    <div className={styles.authArea}>
      {isLoaded && isSignedIn ? (
        <div className={styles.userPillWrap} ref={dropRef}>
          <button
            className={styles.userPill}
            onClick={() =>
              !isAppPath ? router.push("/app") : setUserDropOpen((v) => !v)
            }
            aria-expanded={userDropOpen}
            aria-label={isAppPath ? "アカウントメニューを開く" : "ダッシュボードに移動"}
          >
            <span className={styles.onlineDot} aria-hidden="true" />
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt="" className={styles.userPillAvatar} />
            ) : (
              <span className={styles.userPillInitial}>{displayName[0]}</span>
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
              {twitterHandle ? <p className={styles.dropHandle}>@{twitterHandle}</p> : null}
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
  );
}

type MobileProps = { isAppPath: boolean; closeMenu: () => void };

/** ドロワー内のログイン導線（Clerk のみ） */
export function SiteHeaderAuthMobile({ isAppPath, closeMenu }: MobileProps) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();

  const twitterHandle = user?.username;
  const displayName = user?.fullName || user?.firstName || twitterHandle || "ユーザー";

  return (
    <div className={styles.mobileAuthArea}>
      {isLoaded && isSignedIn && (
        <div className={styles.mobileUserInfo}>
          {user?.imageUrl ? (
            <img src={user.imageUrl} alt="" className={styles.mobileAvatar} />
          ) : null}
          <div className={styles.mobileUserText}>
            <span className={styles.mobileUserName}>{displayName}</span>
            {twitterHandle ? (
              <span className={styles.mobileHandle}>@{twitterHandle}</span>
            ) : null}
            <span className={styles.mobileBadge}>
              <XIcon size={11} />
              ログイン中
            </span>
          </div>
        </div>
      )}

      {isLoaded && isSignedIn ? (
        <div className={styles.mobileAuthButtons}>
          {!isAppPath && (
            <button
              onClick={() => {
                router.push("/app");
                closeMenu();
              }}
              className={styles.mobileDashboardButton}
            >
              ダッシュボード
            </button>
          )}
          <button
            onClick={() => {
              signOut({ redirectUrl: "/logged-out" });
              closeMenu();
            }}
            className={styles.mobileSignOutButton}
          >
            ログアウト
          </button>
        </div>
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
  );
}
