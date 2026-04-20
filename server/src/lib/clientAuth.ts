/**
 * クライアント側 UUID トークン管理
 */

const UUID_TOKEN_KEY = "uuid_token";

export function setUuidToken(uuid: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(UUID_TOKEN_KEY, uuid);
  }
}

export function getUuidToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(UUID_TOKEN_KEY);
}

export function clearUuidToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(UUID_TOKEN_KEY);
  }
}

export function createAuthHeader(): { Authorization?: string } {
  const uuid = getUuidToken();
  if (!uuid) return {};
  return { Authorization: `Bearer uuid:${uuid}` };
}
