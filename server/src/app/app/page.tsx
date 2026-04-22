"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import ProfileCard from "./components/ProfileCard";
import LocationButton from "./components/LocationButton";
import Stats from "./components/Stats";
import styles from "./app.module.css";
import { clearUuidToken, getUuidToken, setUuidToken } from "@/lib/clientAuth";
import { AiErrorShare } from "@/app/components/AiErrorShare";
import { buildAiErrorReport, maskToken } from "@/lib/aiErrorReport";

export default function AppPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const [, setUuidTick] = useState(0);
  const [authSyncState, setAuthSyncState] = useState<
    "idle" | "syncing" | "error"
  >("idle");
  const [authSyncError, setAuthSyncError] = useState<string | null>(null);
  const registerGenRef = useRef(0);
  const prevClerkIdRef = useRef<string | null>(null);
  const userRef = useRef(user);
  userRef.current = user;
  const [registerSettled, setRegisterSettled] = useState(false);

  const resolvedUuid =
    typeof window !== "undefined" ? getUuidToken() : null;

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  // サインイン中は毎回サーバー側 UUID と揃える（古い/別DBの localStorage 残りによる 401 を防ぐ）
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) return;

    if (
      prevClerkIdRef.current != null &&
      prevClerkIdRef.current !== user.id
    ) {
      clearUuidToken();
      setUuidTick((n) => n + 1);
    }
    prevClerkIdRef.current = user.id;

    const myGen = ++registerGenRef.current;
    let cancelled = false;
    const u = userRef.current ?? user;
    if (!u?.id) return;
    const twitterAccount = u.externalAccounts?.find(
      (a) =>
        (a.provider as string) === "oauth_x" ||
        (a.provider as string) === "oauth_twitter"
    );

    const hadToken = Boolean(getUuidToken());
    if (!hadToken) {
      setAuthSyncState("syncing");
      setAuthSyncError(null);
    }
    setRegisterSettled(false);

    fetch("/api/auth/register-direct", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        clerkId: u.id,
        email: u.primaryEmailAddress?.emailAddress || null,
        twitterHandle: twitterAccount?.username || null,
        displayName: u.fullName || u.firstName || null,
        avatarUrl: u.imageUrl || null,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (cancelled || myGen !== registerGenRef.current) return;
        if (!res.ok) {
          const msg =
            typeof data?.error === "string"
              ? data.error
              : "サーバーとの同期に失敗しました";
          setAuthSyncError(msg);
          setAuthSyncState("error");
          return;
        }
        if (data?.user?.uuid) {
          setUuidToken(data.user.uuid);
          setAuthSyncState("idle");
          setAuthSyncError(null);
          setUuidTick((n) => n + 1);
        } else {
          setAuthSyncError("ユーザー情報の取得に失敗しました");
          setAuthSyncState("error");
        }
      })
      .catch(() => {
        if (!cancelled && myGen === registerGenRef.current) {
          setAuthSyncError("ネットワークエラーが発生しました");
          setAuthSyncState("error");
        }
      })
      .finally(() => {
        if (!cancelled && myGen === registerGenRef.current) {
          setRegisterSettled(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user?.id]);

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

  const xAccount = user?.externalAccounts?.find(
    (a) => (a.provider as string) === "oauth_x" || (a.provider as string) === "oauth_twitter"
  );
  const displayName = user?.fullName || user?.firstName || "匿名さん";
  const twitterHandle = xAccount?.username ? `@${xAccount.username}` : "";
  const authSyncAiReport = useMemo(
    () =>
      authSyncError
        ? buildAiErrorReport({
            feature: "dashboard/auth-sync",
            userMessage: authSyncError,
            error: authSyncError,
            request: {
              method: "POST",
              url: "/api/auth/register-direct",
            },
            context: {
              isLoaded,
              isSignedIn,
              clerkUserId: user?.id ?? null,
              authSyncState,
              authUuidMasked: maskToken(resolvedUuid),
            },
          })
        : null,
    [authSyncError, authSyncState, isLoaded, isSignedIn, resolvedUuid, user?.id]
  );

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
          onClick={() => {
            clearUuidToken();
            signOut({ redirectUrl: "/logged-out" });
          }}
          className={styles.signOutButton}
        >
          ログアウト
        </button>
      </div>

      {authSyncState === "error" && authSyncError && (
        <div className={styles.syncErrorBanner} role="alert">
          <span>{authSyncError}</span>
          <button
            type="button"
            className={styles.syncRetryButton}
            onClick={() => window.location.reload()}
          >
            再読み込み
          </button>
          <div className={styles.syncErrorReport}>
            <AiErrorShare report={authSyncAiReport} />
          </div>
        </div>
      )}

      <div className={styles.content}>
        <ProfileCard />
        <LocationButton
          authUuid={resolvedUuid}
          authSyncing={
            authSyncState === "syncing" || !registerSettled
          }
          authSyncError={authSyncError}
        />
        <Stats authUuid={resolvedUuid} statsReady={registerSettled} />
      </div>
    </main>
  );
}
