import * as SecureStore from "expo-secure-store";

const KEYS = {
  UUID: "uuid",
  ONBOARDING_DONE: "onboarding_done",
  PROFILE_SET: "profile_set",
} as const;

export async function getUuid(): Promise<string | null> {
  return SecureStore.getItemAsync(KEYS.UUID);
}

export async function setUuid(uuid: string): Promise<void> {
  await SecureStore.setItemAsync(KEYS.UUID, uuid);
}

export async function isOnboardingDone(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(KEYS.ONBOARDING_DONE);
  return value === "true";
}

export async function setOnboardingDone(): Promise<void> {
  await SecureStore.setItemAsync(KEYS.ONBOARDING_DONE, "true");
}

export async function isProfileSet(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(KEYS.PROFILE_SET);
  return value === "true";
}

export async function setProfileSet(): Promise<void> {
  await SecureStore.setItemAsync(KEYS.PROFILE_SET, "true");
}

// ローカル状態をリセット（アプリ再インストール時など）
export async function clearLocalState(): Promise<void> {
  await SecureStore.deleteItemAsync(KEYS.UUID);
  await SecureStore.deleteItemAsync(KEYS.ONBOARDING_DONE);
  await SecureStore.deleteItemAsync(KEYS.PROFILE_SET);
  await SecureStore.deleteItemAsync("permissions_done");
}

// UUID生成
export function generateUuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
