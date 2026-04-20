import { useEffect, useState, useRef } from "react";
import { AppState } from "react-native";
import * as SecureStore from "expo-secure-store";
import { registerUser } from "../lib/api";
import {
  getUuid, setUuid, generateUuid,
  isOnboardingDone, isProfileSet,
} from "../lib/storage";
import { useAppStore } from "../store";

type AuthState = "loading" | "onboarding" | "profile-setup" | "permissions" | "ready";

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const setAuth = useAppStore((s) => s.setAuth);
  const initialized = useRef(false);

  const checkAuth = async () => {
    try {
      let uuid = await getUuid();

      if (!uuid) {
        uuid = generateUuid();
        const result = await registerUser(uuid);
        await setUuid(uuid);
        setAuth(uuid, result.user.id);
        setAuthState("onboarding");
        return;
      }

      try {
        const result = await registerUser(uuid);
        setAuth(uuid, result.user.id);

        if (result.isNew) {
          setAuthState("onboarding");
          return;
        }
      } catch {
        setAuth(uuid, 0);
      }

      const onboarded = await isOnboardingDone();
      if (!onboarded) {
        setAuthState("onboarding");
        return;
      }

      const profileDone = await isProfileSet();
      if (!profileDone) {
        setAuthState("profile-setup");
        return;
      }

      const permsDone = await SecureStore.getItemAsync("permissions_done");
      if (permsDone !== "true") {
        setAuthState("permissions");
        return;
      }

      setAuthState("ready");
    } catch (error) {
      console.error("認証エラー:", error);
      const uuid = await getUuid();
      if (uuid) {
        setAuthState("ready");
      } else {
        setAuthState("onboarding");
      }
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    checkAuth();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active" && authState === "loading") {
        checkAuth();
      }
    });
    return () => sub.remove();
  }, [authState]);

  return { authState, setAuthState };
}
