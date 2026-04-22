const SESSION_KEY = "sl_analytics_sid";

export function getAnalyticsSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `s_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return "";
  }
}

type ProductPayload = Record<string, string | number | boolean | null | undefined>;

export async function sendAnalyticsBeacon(body: unknown): Promise<void> {
  try {
    await fetch("/api/analytics/beacon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    /* 計測失敗は体験に影響させない */
  }
}

export function trackProductEvent(name: string, payload: ProductPayload = {}): void {
  const path =
    typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "";
  void sendAnalyticsBeacon({
    kind: "product",
    name,
    path,
    sid: getAnalyticsSessionId(),
    ts: Date.now(),
    payload,
  });
}
