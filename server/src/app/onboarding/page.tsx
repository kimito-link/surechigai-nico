"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { setUuidToken } from "@/lib/clientAuth";
import { parseJson } from "@/lib/apiClient";
import AvatarStep from "./steps/AvatarStep";
import LocationStep from "./steps/LocationStep";
import CompleteStep from "./steps/CompleteStep";
import styles from "./onboarding.module.css";

type Step = "avatar" | "location" | "complete";

interface OnboardingState {
  step: Step;
  uuid: string | null;
  displayName: string;
  avatarConfig: Record<string, unknown> | null;
  locationError: string | null;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [state, setState] = useState<OnboardingState>({
    step: "avatar",
    uuid: null,
    displayName: "",
    avatarConfig: null,
    locationError: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initializeUser() {
      if (!isLoaded) return;
      if (!isSignedIn || !user?.id) {
        router.push("/sign-in");
        return;
      }

      try {
        const twitterAccount = user.externalAccounts?.find(
          (a) => (a.provider as string) === "oauth_x" || (a.provider as string) === "oauth_twitter"
        );
        const twitterHandle = twitterAccount?.username || null;
        const displayName = user.fullName || user.firstName || "匿名さん";

        const registerRes = await fetch("/api/auth/register-direct", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clerkId: user.id,
            email: user.primaryEmailAddress?.emailAddress || null,
            twitterHandle,
          }),
        });

        const data = await parseJson<{
          user: { uuid: string; nickname: string };
          isOnboarded: boolean;
        }>(registerRes);
        const uuid = data.user.uuid;

        setUuidToken(uuid);

        if (data.isOnboarded) {
          router.push("/app");
          return;
        }

        setState((prev) => ({
          ...prev,
          uuid,
          displayName,
        }));
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to initialize user:", err);
        setError("ユーザー登録に失敗しました");
        setTimeout(() => router.push("/sign-in"), 2000);
      }
    }

    initializeUser();
  }, [isLoaded, isSignedIn, user, router]);

  const handleAvatarComplete = (avatarConfig: Record<string, unknown>) => {
    setState((prev) => ({
      ...prev,
      avatarConfig,
      step: "location",
    }));
  };

  const handleLocationComplete = () => {
    setState((prev) => ({
      ...prev,
      step: "complete",
    }));
  };

  const handleLocationError = (error: string) => {
    setState((prev) => ({
      ...prev,
      locationError: error,
    }));
  };

  const handleComplete = () => {
    router.push("/app");
  };

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.stepCard}>
          <p style={{ color: "#dc3545" }}>{error}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingBox}>読み込み中...</div>
      </div>
    );
  }

  const currentStep = state.step;
  const totalSteps = 3;
  const stepNumber = ["avatar", "location", "complete"].indexOf(currentStep) + 1;

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>はじめましょう</h1>
        {currentStep !== "complete" && (
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${(stepNumber / totalSteps) * 100}%` }}
            />
          </div>
        )}
        {currentStep !== "complete" && (
          <p className={styles.stepCounter}>
            ステップ {stepNumber} / {totalSteps}
          </p>
        )}
      </div>

      <div className={styles.content}>
        {currentStep === "avatar" && (
          <AvatarStep
            uuid={state.uuid || ""}
            nickname={state.displayName}
            onComplete={handleAvatarComplete}
            onBack={null}
          />
        )}

        {currentStep === "location" && (
          <LocationStep
            uuid={state.uuid || ""}
            onComplete={handleLocationComplete}
            onError={handleLocationError}
            onBack={() => setState((prev) => ({ ...prev, step: "avatar" }))}
          />
        )}

        {currentStep === "complete" && (
          <CompleteStep
            nickname={state.displayName}
            onComplete={handleComplete}
          />
        )}
      </div>
    </main>
  );
}
