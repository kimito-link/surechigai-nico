"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { setUuidToken } from "@/lib/clientAuth";
import styles from "./onboarding.module.css";
import ProfileStep from "./steps/ProfileStep";
import LocationStep from "./steps/LocationStep";
import AvatarStep from "./steps/AvatarStep";
import CompleteStep from "./steps/CompleteStep";

type Step = "init" | "profile" | "location" | "avatar" | "complete";

const defaultProfile = {
  nickname: "",
  ageGroup: "unset",
  gender: "unset",
  hitokoto: "",
};

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [step, setStep] = useState<Step>("init");
  const [uuid, setUuid] = useState<string | null>(null);
  const [profile, setProfile] = useState(defaultProfile);
  const [regError, setRegError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user?.id) {
      router.push("/sign-in");
      return;
    }
    if (step !== "init") return;

    let cancelled = false;
    (async () => {
      try {
        const twitterAccount = user.externalAccounts?.find(
          (a) =>
            (a.provider as string) === "oauth_x" ||
            (a.provider as string) === "oauth_twitter"
        );
        const res = await fetch("/api/auth/register-direct", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clerkId: user.id,
            email: user.primaryEmailAddress?.emailAddress || null,
            twitterHandle: twitterAccount?.username || null,
            displayName: user.fullName || user.firstName || null,
            avatarUrl: user.imageUrl || null,
          }),
        });
        const data = (await res.json().catch(() => null)) as {
          error?: string;
          user?: { uuid?: string };
        } | null;
        if (cancelled) return;
        if (!res.ok) {
          setRegError(
            typeof data?.error === "string" && data.error.length > 0
              ? data.error
              : "登録に失敗しました"
          );
          return;
        }
        if (data?.user?.uuid) {
          setUuidToken(data.user.uuid);
          setUuid(data.user.uuid);
        }
        const initialNick =
          user.firstName || user.fullName || twitterAccount?.username || "";
        setProfile((p) => ({
          ...p,
          nickname: initialNick ? String(initialNick).slice(0, 20) : "",
        }));
        setStep("profile");
      } catch {
        if (!cancelled) setRegError("登録処理中にエラーが発生しました");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, user, router, step]);

  if (!isLoaded) {
    return (
      <div className={styles.registerLoading}>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (regError) {
    return (
      <div className={styles.registerLoading}>
        <p role="alert">{regError}</p>
        <button
          type="button"
          className={`${styles.button} ${styles.narrowCtaButton}`}
          onClick={() => router.push("/app")}
        >
          ダッシュボードへ
        </button>
      </div>
    );
  }

  if (step === "init" || !uuid) {
    return (
      <div className={styles.registerLoading}>
        <p>アカウントを準備しています…</p>
      </div>
    );
  }

  const progressPct =
    step === "profile" ? 25 : step === "location" ? 50 : step === "avatar" ? 75 : 100;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>はじめに</h1>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
        </div>
        <p className={styles.stepCounter}>
          {step === "profile" && "1/4 プロフィール"}
          {step === "location" && "2/4 位置情報"}
          {step === "avatar" && "3/4 アバター"}
          {step === "complete" && "4/4 完了"}
        </p>
      </header>
      <div className={styles.content}>
        {step === "profile" && (
          <ProfileStep
            initialData={profile}
            onComplete={(d) => {
              setProfile(d);
              setStep("location");
            }}
          />
        )}
        {step === "location" && (
          <LocationStep
            uuid={uuid}
            onComplete={() => setStep("avatar")}
            onError={(msg) => {
              window.alert(msg);
            }}
            onBack={() => setStep("profile")}
          />
        )}
        {step === "avatar" && (
          <AvatarStep
            uuid={uuid}
            nickname={profile.nickname}
            onComplete={() => setStep("complete")}
            onBack={() => setStep("location")}
            onSkip={() => setStep("complete")}
          />
        )}
        {step === "complete" && (
          <CompleteStep
            nickname={profile.nickname || "ゲスト"}
            onComplete={() => router.push("/app")}
          />
        )}
      </div>
    </div>
  );
}
