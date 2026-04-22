export type AiErrorReportInput = {
  feature: string;
  userMessage: string;
  error?: unknown;
  request?: {
    method: string;
    url: string;
    status?: number;
  };
  context?: Record<string, unknown>;
};

type NormalizedError = {
  name: string;
  message: string;
  stack: string;
};

function normalizeError(error: unknown): NormalizedError {
  if (error instanceof Error) {
    return {
      name: error.name || "Error",
      message: error.message || "(empty message)",
      stack: error.stack || "(no stack)",
    };
  }
  if (typeof error === "string") {
    return {
      name: "Error",
      message: error,
      stack: "(non-error thrown value)",
    };
  }
  return {
    name: "UnknownError",
    message: "(unknown error object)",
    stack: "(no stack)",
  };
}

export function maskToken(value: string | null | undefined): string {
  if (!value) return "(none)";
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function buildAiErrorReport(input: AiErrorReportInput): string {
  const now = new Date();
  const err = normalizeError(input.error);
  const href = typeof window !== "undefined" ? window.location.href : "(unknown)";
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "(unknown)";
  const language = typeof navigator !== "undefined" ? navigator.language : "(unknown)";
  const timezone =
    typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "(unknown)";

  const lines: string[] = [
    "[AI_DEBUG_REPORT v1]",
    `timestamp_iso: ${now.toISOString()}`,
    `timestamp_local: ${now.toLocaleString("ja-JP")}`,
    `feature: ${input.feature}`,
    `user_message: ${input.userMessage}`,
    `page_url: ${href}`,
    `timezone: ${timezone}`,
    `language: ${language}`,
    `user_agent: ${ua}`,
    "",
    "[error]",
    `name: ${err.name}`,
    `message: ${err.message}`,
    "",
    "[stack]",
    err.stack,
  ];

  if (input.request) {
    lines.push(
      "",
      "[request]",
      `method: ${input.request.method}`,
      `url: ${input.request.url}`,
      `status: ${input.request.status ?? "(unknown)"}`
    );
  }

  if (input.context) {
    lines.push("", "[context_json]", JSON.stringify(input.context, null, 2));
  }

  return lines.join("\n");
}
