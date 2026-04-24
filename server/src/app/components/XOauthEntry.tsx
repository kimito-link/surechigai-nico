"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSignIn, useSignUp } from "@clerk/nextjs";
import { normalizePostAuthRedirect } from "@/lib/authRedirectPath";
import styles from "./XOauthEntry.module.css";

type XOauthEntryProps = {
  mode: "sign-in" | "sign-up";
};

const SIGN_IN_CALLBACK = "/sign-in/sso-callback";
const SIGN_UP_CALLBACK = "/sign-up/sso-callback";

type RedirectStarter = {
  authenticateWithRedirect: (params: {
    strategy: `oauth_${string}`;
    redirectUrl: string;
    redirectUrlComplete: string;
  }) => Promise<void>;
};

function toErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  if (/strategy|oauth_x|social connection/i.test(raw)) {
    return "Clerk 側で X / Twitter OAuth が有効か確認してください。";
  }
  return "X ログインを開始できませんでした。時間を空けて再試行してください。";
}

export function XOauthEntry({ mode }: XOauthEntryProps) {
  const searchParams = useSearchParams();
  const { isLoaded: signInLoaded, signIn } = useSignIn();
  const { isLoaded: signUpLoaded, signUp } = useSignUp();

  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isLoaded = mode === "sign-in" ? signInLoaded : signUpLoaded;
  const resource = (mode === "sign-in" ? signIn : signUp) as RedirectStarter | undefined;
  const callbackPath = mode === "sign-in" ? SIGN_IN_CALLBACK : SIGN_UP_CALLBACK;

  const redirectPath = useMemo(() => {
    const raw = searchParams.get("redirect_url");
    return normalizePostAuthRedirect(raw);
  }, [searchParams]);

  const begin = async () => {
    if (!isLoaded || !resource) return;
    setPending(true);
    setErrorMessage(null);

    try {
      await resource.authenticateWithRedirect({
        strategy: "oauth_x",
        redirectUrl: callbackPath,
        redirectUrlComplete: redirectPath,
      });
    } catch (err) {
      setPending(false);
      setErrorMessage(toErrorMessage(err));
      if (process.env.NODE_ENV === "development") {
        console.error("[auth] X OAuth start failed:", err);
      }
    }
  };

  const label = pending
    ? "X に移動中..."
    : mode === "sign-in"
      ? "X でログイン"
      : "X で登録";

  return (
    <>
      <button
        type="button"
        onClick={() => void begin()}
        disabled={!isLoaded || pending}
        className={styles.button}
      >
        {label}
      </button>
      {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
    </>
  );
}
