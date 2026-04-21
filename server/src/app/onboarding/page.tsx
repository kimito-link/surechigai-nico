"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { setUuidToken } from "@/lib/clientAuth";

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user?.id) {
      router.push("/sign-in");
      return;
    }

    const register = async () => {
      try {
        const twitterAccount = user.externalAccounts?.find(
          (a) =>
            (a.provider as string) === "oauth_x" ||
            (a.provider as string) === "oauth_twitter"
        );
        await fetch("/api/auth/register-direct", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clerkId: user.id,
            email: user.primaryEmailAddress?.emailAddress || null,
            twitterHandle: twitterAccount?.username || null,
            displayName: user.fullName || user.firstName || null,
            avatarUrl: user.imageUrl || null,
          }),
        }).then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            setUuidToken(data.user.uuid);
          }
        });
      } catch (e) {
        console.warn("DB registration skipped:", e);
      }
      router.push("/app");
    };

    register();
  }, [isLoaded, isSignedIn, user, router]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#FFF9F2",
        fontSize: "1.1rem",
        color: "#5c5248",
      }}
    >
      <p>登録中...</p>
    </div>
  );
}
