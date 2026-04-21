"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import ProfileCard from "./components/ProfileCard";
import LocationButton from "./components/LocationButton";
import Stats from "./components/Stats";
import styles from "./app.module.css";
import { getUuidToken, setUuidToken } from "@/lib/clientAuth";

export default function AppPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  // UUIDがlocalStorageにない場合（新端末・キャッシュ消去後）は自動再登録
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) return;
    if (getUuidToken()) return;

    const twitterAccount = user.externalAccounts?.find(
      (a) =>
        (a.provider as string) === "oauth_x" ||
        (a.provider as string) === "oauth_twitter"
    );
    fetch("/api/auth/register-direct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clerkId: user.id,
        email: user.primaryEmailAddress?.emailAddress || null,
        twitterHandle: twitterAccount?.username || null,
        displayName: user.fullName || user.firstName || null,
        avatarUrl: user.imageUrl || null,
      }),
    })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data?.user?.uuid) setUuidToken(data.user.uuid); })
      .catch(() => {});
  }, [isLoaded, isSignedIn, user]);

  if (!isLoaded) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.card}>読み込み中...</div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null;
  }

  const xAccount = user?.externalAccounts?.[0];
  const displayName = user?.fullName || user?.firstName || "匿名さん";
  const twitterHandle = xAccount?.username ? `@${xAccount.username}` : "";

  return (
    <main className={styles.container}>
      <div className={styles.appHeader}>
        <div className={styles.loginBadge}>
          <img
            src={user?.imageUrl?.includes("img.clerk.com")
              ? `${user.imageUrl}?width=100&height=100`
              : user?.imageUrl?.replace(/_normal\./, ".") || ""}
            alt={displayName}
            className={styles.headerAvatar}
          />
          <div className={styles.loginInfo}>
            <span className={styles.loginLabel}>ログイン中</span>
            <span className={styles.loginName}>{displayName}</span>
            {twitterHandle && <span className={styles.loginHandle}>{twitterHandle}</span>}
          </div>
        </div>
        <button
          onClick={() => signOut({ redirectUrl: "/logged-out" })}
          className={styles.signOutButton}
        >
          ログアウト
        </button>
      </div>

      <div className={styles.content}>
        <ProfileCard />
        <LocationButton />
        <Stats />
      </div>
    </main>
  );
}
