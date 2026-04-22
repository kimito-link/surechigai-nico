import { NextRequest, NextResponse } from "next/server";

/** ローカル / Tunnel の Ollama は応答が長い。Edge ではなく Node ランタイムを使う。 */
export const runtime = "nodejs";
/** Vercel 等で長めの生成を許可（未対応ホストでは無視） */
export const maxDuration = 300;

const CACHE_TTL_OK = 3600; // 1時間キャッシュ（成功）
const CACHE_TTL_FAIL = 20; // 20秒キャッシュ（失敗）— 一時障害時の再試行余地を残す

/**
 * OpenRouter 無料モデル候補。
 * - `:free` 付きでも 20 req/min・200 req/day（未入金時）の制限がある。
 * - 2026 年 4 月時点で存在が確認できた slug のみ列挙する。
 * - 並び順は「速い/小さい → 大きく高品質」。
 */
const MODELS = [
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
  "mistralai/mistral-small-3.2-24b-instruct:free",
  "meta-llama/llama-3.3-70b-instruct:free",
];

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const OPENROUTER_CREDITS_URL = "https://openrouter.ai/api/v1/credits";

/**
 * 合計予算 (ms)。`maxDuration = 300` に対しバッファを取り 240s とする。
 * モデルごとのタイムアウトは「残予算 ÷ 残モデル数」で動的配分する。
 */
const TOTAL_BUDGET_MS = 240_000;
/** 各モデルに与える最小タイムアウト (ms) */
const PER_MODEL_MIN_MS = 20_000;

const DEFAULT_OLLAMA_TIMEOUT_MS = 120_000;
const OLLAMA_HEALTH_TIMEOUT_MS = 4_000;

const SYSTEM_PROMPT = `あなたはニコニコ超会議2026「すれちがいライト」アプリのガイドキャラクター3人です。
クリエイタークロス参加者やXユーザーを紹介するゆっくり解説を行います。

キャラクター設定:
- rink（りんく）: 明るく元気な応援系。語尾は「〜だよ！」「〜すごいね！」。2文以内。
- konta（こん太）: 知識豊富で説明上手。「〜なんだよ！」「なるほど〜」が口癖。2文以内。
- tanunee（たぬ姉）: 温かく包容力のある姉御肌。「〜だよね〜」「応援してるよ！」が口癖。2文以内。

ユーザーのXプロフィール情報（名前・自己紹介・フォロワー数など）をもとに、
その人らしい個別の紹介をしてください。情報が少ない場合はハンドルから想像して個性を出してください。

必ず以下のJSON形式のみで返答してください。他のテキストは一切不要です:
{"rink":"セリフ","konta":"セリフ","tanunee":"セリフ"}`;

type Dialogue = { rink: string; konta: string; tanunee: string };

type LlmErrorCode =
  | "E_YUKKURI_LLM_TIMEOUT"
  | "E_YUKKURI_LLM_UPSTREAM_401"
  | "E_YUKKURI_LLM_UPSTREAM_402"
  | "E_YUKKURI_LLM_UPSTREAM_404"
  | "E_YUKKURI_LLM_UPSTREAM_429"
  | "E_YUKKURI_LLM_UPSTREAM_5XX"
  | "E_YUKKURI_LLM_UPSTREAM_OTHER"
  | "E_YUKKURI_LLM_EMPTY_CHOICE"
  | "E_YUKKURI_LLM_PARSE"
  | "E_YUKKURI_LLM_NETWORK";

type CallResult =
  | { ok: true; text: string; model: string; elapsedMs: number }
  | {
      ok: false;
      model: string;
      elapsedMs: number;
      errorCode: LlmErrorCode;
      status?: number;
      bodySnippet?: string;
      errorMessage?: string;
    };

type CachedPayload =
  | { ok: true; dialogue: Dialogue }
  | { ok: false; errorCode: string; status?: number; message?: string };

// ---------------- Upstash キャッシュ ----------------

async function getCached(handle: string): Promise<CachedPayload | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token || !handle) return null;
  try {
    const res = await fetch(`${url}/get/yukkuri:${encodeURIComponent(handle)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: string | null };
    if (!data.result) return null;
    try {
      const parsed = JSON.parse(data.result) as unknown;
      if (
        parsed &&
        typeof parsed === "object" &&
        "rink" in parsed &&
        "konta" in parsed &&
        "tanunee" in parsed
      ) {
        return { ok: true, dialogue: parsed as Dialogue };
      }
      if (parsed && typeof parsed === "object" && "errorCode" in parsed) {
        return parsed as CachedPayload;
      }
    } catch {
      /* legacy raw dialogue 文字列なども捨てる */
    }
    return null;
  } catch {
    return null;
  }
}

async function setCached(handle: string, payload: CachedPayload) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token || !handle) return;
  try {
    const ttl = payload.ok ? CACHE_TTL_OK : CACHE_TTL_FAIL;
    await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["SET", `yukkuri:${handle}`, JSON.stringify(payload), "EX", ttl],
      ]),
    });
  } catch {
    console.warn("[yukkuri-explain] upstash setCached failed");
  }
}

// ---------------- X プロフィール ----------------

type XProfile = {
  name?: string;
  description?: string;
  followersCount?: number;
  tweetCount?: number;
};

async function fetchXProfile(
  handle: string,
  bearerToken: string
): Promise<XProfile | null> {
  try {
    const url = `https://api.twitter.com/2/users/by/username/${encodeURIComponent(handle)}?user.fields=name,description,public_metrics`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    if (!res.ok) {
      console.warn(
        `[yukkuri-explain] x-profile fetch failed status=${res.status} handle=${handle}`
      );
      return null;
    }
    const data = (await res.json()) as {
      data?: {
        name?: string;
        description?: string;
        public_metrics?: { followers_count?: number; tweet_count?: number };
      };
    };
    if (!data.data) return null;
    return {
      name: data.data.name,
      description: data.data.description,
      followersCount: data.data.public_metrics?.followers_count,
      tweetCount: data.data.public_metrics?.tweet_count,
    };
  } catch (err) {
    console.warn(
      `[yukkuri-explain] x-profile threw=${(err as Error).name} message=${(err as Error).message}`
    );
    return null;
  }
}

function buildUserMessage(
  body: {
    name?: string;
    xHandle?: string;
    booth?: string;
    hallLabel?: string;
    sub?: string;
    intro?: string;
  },
  profile: XProfile | null
): string {
  const handle = body.xHandle?.replace(/^@/, "") ?? "";
  const lines = [
    handle ? `Xアカウント: @${handle}` : null,
    profile?.name
      ? `表示名: ${profile.name}`
      : body.name
        ? `名前: ${body.name}`
        : null,
    profile?.description ? `自己紹介: ${profile.description}` : null,
    profile?.followersCount != null
      ? `フォロワー数: ${profile.followersCount.toLocaleString()}人`
      : null,
    profile?.tweetCount != null
      ? `ツイート数: ${profile.tweetCount.toLocaleString()}件`
      : null,
    body.booth ? `ブース: ${body.booth}` : null,
    body.hallLabel ? `場所: ${body.hallLabel}` : null,
    body.sub ? `ジャンル/日程: ${body.sub}` : null,
    body.intro ? `紹介文: ${body.intro}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  return `以下のXユーザーを3人でゆっくり個別紹介してください:\n${lines}`;
}

// ---------------- 応答パース ----------------

function isDialogue(p: Record<string, unknown>): p is Dialogue {
  return (
    typeof p.rink === "string" &&
    typeof p.konta === "string" &&
    typeof p.tanunee === "string"
  );
}

function extractDialogue(text: string): Dialogue | null {
  const cleaned = text.replace(/```(?:json)?\n?/g, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    if (isDialogue(parsed)) return parsed;
  } catch {
    /* fall through */
  }
  const match = cleaned.match(/\{[\s\S]*?\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    if (isDialogue(parsed)) return parsed;
  } catch {
    /* fall through */
  }
  return null;
}

// ---------------- LLM 呼び出し ----------------

function classifyHttpStatus(status: number): LlmErrorCode {
  if (status === 401) return "E_YUKKURI_LLM_UPSTREAM_401";
  if (status === 402) return "E_YUKKURI_LLM_UPSTREAM_402";
  if (status === 404) return "E_YUKKURI_LLM_UPSTREAM_404";
  if (status === 429) return "E_YUKKURI_LLM_UPSTREAM_429";
  if (status >= 500) return "E_YUKKURI_LLM_UPSTREAM_5XX";
  return "E_YUKKURI_LLM_UPSTREAM_OTHER";
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  userMessage: string,
  timeoutMs: number
): Promise<CallResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://surechigai-nico.link/",
        "X-Title": "すれちがいライト ゆっくり解説",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });
    const elapsedMs = Date.now() - started;
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const errorCode = classifyHttpStatus(res.status);
      console.warn(
        `[yukkuri-explain] openrouter model=${model} status=${res.status} elapsed=${elapsedMs}ms body=${body.slice(0, 300)}`
      );
      return { ok: false, model, elapsedMs, errorCode, status: res.status, bodySnippet: body.slice(0, 300) };
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    if (!text) {
      console.warn(
        `[yukkuri-explain] openrouter model=${model} empty_choice elapsed=${elapsedMs}ms`
      );
      return { ok: false, model, elapsedMs, errorCode: "E_YUKKURI_LLM_EMPTY_CHOICE" };
    }
    return { ok: true, text, model, elapsedMs };
  } catch (err) {
    const elapsedMs = Date.now() - started;
    const name = (err as Error).name;
    const isTimeout = name === "AbortError" || name === "TimeoutError";
    console.warn(
      `[yukkuri-explain] openrouter model=${model} threw=${name} message=${(err as Error).message} elapsed=${elapsedMs}ms`
    );
    return {
      ok: false,
      model,
      elapsedMs,
      errorCode: isTimeout ? "E_YUKKURI_LLM_TIMEOUT" : "E_YUKKURI_LLM_NETWORK",
      errorMessage: `${name}: ${(err as Error).message}`.slice(0, 300),
    };
  } finally {
    clearTimeout(timer);
  }
}

function normalizeOllamaBase(baseUrl: string) {
  return baseUrl.replace(/\/$/, "");
}

async function callOllama(
  baseUrl: string,
  model: string,
  userMessage: string,
  timeoutMs: number,
  apiKey?: string
): Promise<CallResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const auth = apiKey?.trim() || "ollama";
  try {
    const res = await fetch(`${normalizeOllamaBase(baseUrl)}/v1/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });
    const elapsedMs = Date.now() - started;
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.warn(
        `[yukkuri-explain] ollama model=${model} status=${res.status} elapsed=${elapsedMs}ms body=${body.slice(0, 300)}`
      );
      return { ok: false, model, elapsedMs, errorCode: classifyHttpStatus(res.status), status: res.status };
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    if (!text) {
      console.warn(
        `[yukkuri-explain] ollama model=${model} empty_choice elapsed=${elapsedMs}ms`
      );
      return { ok: false, model, elapsedMs, errorCode: "E_YUKKURI_LLM_EMPTY_CHOICE" };
    }
    return { ok: true, text, model, elapsedMs };
  } catch (err) {
    const elapsedMs = Date.now() - started;
    const name = (err as Error).name;
    const isTimeout = name === "AbortError" || name === "TimeoutError";
    console.warn(
      `[yukkuri-explain] ollama model=${model} threw=${name} message=${(err as Error).message} elapsed=${elapsedMs}ms`
    );
    return {
      ok: false,
      model,
      elapsedMs,
      errorCode: isTimeout ? "E_YUKKURI_LLM_TIMEOUT" : "E_YUKKURI_LLM_NETWORK",
      errorMessage: `${name}: ${(err as Error).message}`.slice(0, 300),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function pingOllama(baseUrl: string, apiKey?: string): Promise<boolean> {
  const url = `${normalizeOllamaBase(baseUrl)}/v1/models`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OLLAMA_HEALTH_TIMEOUT_MS);
  const auth = apiKey?.trim() || "ollama";
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${auth}` },
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function checkOpenRouterModels(
  apiKey: string
): Promise<{ reachable: boolean; creditsOk: boolean | null; knownModels: Record<string, boolean> }> {
  const known: Record<string, boolean> = Object.fromEntries(MODELS.map((m) => [m, false]));
  let reachable = false;
  try {
    const res = await fetch(OPENROUTER_MODELS_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(4_000),
    });
    reachable = res.ok;
    if (res.ok) {
      const data = (await res.json()) as { data?: Array<{ id?: string }> };
      const ids = new Set((data.data ?? []).map((m) => m.id).filter(Boolean) as string[]);
      for (const slug of MODELS) {
        // :free を外したベース slug も許容
        if (ids.has(slug) || ids.has(slug.replace(/:free$/, ""))) {
          known[slug] = true;
        }
      }
    }
  } catch {
    reachable = false;
  }

  let creditsOk: boolean | null = null;
  try {
    const res = await fetch(OPENROUTER_CREDITS_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(4_000),
    });
    if (res.ok) {
      const data = (await res.json()) as { data?: { total_credits?: number; total_usage?: number } };
      const balance =
        (data.data?.total_credits ?? 0) - (data.data?.total_usage ?? 0);
      creditsOk = balance >= 0;
    } else if (res.status === 401) {
      creditsOk = false;
    }
  } catch {
    /* noop */
  }

  return { reachable, creditsOk, knownModels: known };
}

// ---------------- エラーレスポンス組み立て ----------------

type UserFacingError = {
  error: string;
  error_code: string;
  detail?: unknown;
};

function buildUserFacingError(failures: CallResult[]): { status: number; body: UserFacingError } {
  const codes = failures.filter((f) => !f.ok).map((f) => (f as { errorCode: string }).errorCode);
  const has = (c: string) => codes.includes(c);

  if (has("E_YUKKURI_LLM_UPSTREAM_401")) {
    return {
      status: 503,
      body: {
        error:
          "解説 AI の設定に問題があります（運営側にお知らせください）。しばらくしてからお試しください。",
        error_code: "E_YUKKURI_LLM_UPSTREAM_401",
      },
    };
  }
  if (has("E_YUKKURI_LLM_UPSTREAM_402")) {
    return {
      status: 503,
      body: {
        error:
          "解説 AI の利用枠が不足しています（運営側にお知らせください）。",
        error_code: "E_YUKKURI_LLM_UPSTREAM_402",
      },
    };
  }
  if (codes.length > 0 && codes.every((c) => c === "E_YUKKURI_LLM_UPSTREAM_429")) {
    return {
      status: 503,
      body: {
        error: "解説 AI が混雑しています。30 秒ほど待ってから再試行してください。",
        error_code: "E_YUKKURI_LLM_UPSTREAM_429",
      },
    };
  }
  if (has("E_YUKKURI_LLM_UPSTREAM_429")) {
    return {
      status: 503,
      body: {
        error:
          "解説 AI が混雑しています（一部モデルがレート制限中です）。30 秒ほど待ってから再試行してください。",
        error_code: "E_YUKKURI_LLM_UPSTREAM_429",
      },
    };
  }
  if (codes.length > 0 && codes.every((c) => c === "E_YUKKURI_LLM_TIMEOUT")) {
    return {
      status: 503,
      body: {
        error:
          "生成に時間がかかりすぎました。もう一度試すと早く返ることがあります。",
        error_code: "E_YUKKURI_LLM_TIMEOUT",
      },
    };
  }
  if (has("E_YUKKURI_LLM_TIMEOUT")) {
    return {
      status: 503,
      body: {
        error:
          "生成に時間がかかりすぎました（混在失敗）。少し時間をおいて再試行してください。",
        error_code: "E_YUKKURI_LLM_TIMEOUT",
      },
    };
  }
  if (has("E_YUKKURI_LLM_UPSTREAM_404") && codes.every((c) => c === "E_YUKKURI_LLM_UPSTREAM_404")) {
    return {
      status: 503,
      body: {
        error:
          "解説 AI のモデル設定が古くなっている可能性があります（運営側にお知らせください）。",
        error_code: "E_YUKKURI_LLM_UPSTREAM_404",
      },
    };
  }
  if (has("E_YUKKURI_LLM_PARSE") && codes.every((c) => c === "E_YUKKURI_LLM_PARSE")) {
    return {
      status: 503,
      body: {
        error:
          "解説 AI の応答形式が不正でした。再試行で改善することがあります。",
        error_code: "E_YUKKURI_LLM_PARSE",
      },
    };
  }
  if (has("E_YUKKURI_LLM_UPSTREAM_5XX")) {
    return {
      status: 503,
      body: {
        error:
          "解説 AI の上流サービスが一時的に不安定です。少し待ってから再試行してください。",
        error_code: "E_YUKKURI_LLM_UPSTREAM_5XX",
      },
    };
  }
  if (codes.length > 0 && codes.every((c) => c === "E_YUKKURI_LLM_NETWORK")) {
    return {
      status: 503,
      body: {
        error:
          "解説 AI へのネットワーク接続に失敗しました。通信状況を確認して再試行してください。",
        error_code: "E_YUKKURI_LLM_NETWORK",
        detail: failures.map((f) =>
          f.ok
            ? null
            : {
                model: f.model,
                code: f.errorCode,
                elapsedMs: f.elapsedMs,
                message: f.errorMessage ?? null,
              }
        ),
      },
    };
  }
  return {
    status: 503,
    body: {
      error: "全モデルで解説の生成に失敗しました。しばらくしてから再試行してください。",
      error_code: "E_YUKKURI_LLM_MIXED_FAILED",
      detail: failures.map((f) =>
        f.ok
          ? null
          : {
              model: f.model,
              code: f.errorCode,
              status: f.status,
              elapsedMs: f.elapsedMs,
            }
      ),
    },
  };
}

// ---------------- GET: ヘルスチェック ----------------

export async function GET() {
  const ollamaBase = process.env.OLLAMA_BASE_URL?.trim();
  const ollamaModel = process.env.OLLAMA_MODEL?.trim();
  const ollamaKey = process.env.OLLAMA_API_KEY?.trim();
  const apiKey = process.env.OPENROUTER_API_KEY;
  const ollamaConfigured = Boolean(ollamaBase && ollamaModel);

  let ollamaReachable: boolean | null = null;
  let ollamaSuspicious = false;
  if (ollamaBase) {
    ollamaReachable = await pingOllama(ollamaBase, ollamaKey);
    // 本番 (NODE_ENV=production) で 127.0.0.1/localhost 指定はほぼ事故
    const localish = /^(https?:\/\/)?(127\.0\.0\.1|localhost)/.test(ollamaBase);
    ollamaSuspicious = process.env.NODE_ENV === "production" && localish;
  }

  const openRouter = apiKey
    ? {
        configured: true as const,
        ...(await checkOpenRouterModels(apiKey)),
      }
    : { configured: false as const };

  return NextResponse.json({
    yukkuriExplain: "ok",
    ollama: ollamaConfigured
      ? { configured: true, model: ollamaModel, reachable: ollamaReachable, suspicious: ollamaSuspicious }
      : { configured: false },
    openRouter,
    models: MODELS,
    budgets: { total_ms: TOTAL_BUDGET_MS, per_model_min_ms: PER_MODEL_MIN_MS },
  });
}

// ---------------- POST: 本体 ----------------

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const ollamaBase = process.env.OLLAMA_BASE_URL?.trim();
  const ollamaModel = process.env.OLLAMA_MODEL?.trim();
  const ollamaKey = process.env.OLLAMA_API_KEY?.trim();
  const ollamaTimeoutRaw = process.env.OLLAMA_TIMEOUT_MS?.trim();
  const ollamaTimeoutMs = ollamaTimeoutRaw
    ? Math.max(1000, Number.parseInt(ollamaTimeoutRaw, 10) || DEFAULT_OLLAMA_TIMEOUT_MS)
    : DEFAULT_OLLAMA_TIMEOUT_MS;

  const useOllama = Boolean(ollamaBase && ollamaModel);
  if (!useOllama && !apiKey) {
    return NextResponse.json(
      {
        error:
          "解説 AI が未設定です（運営側にお知らせください）。",
        error_code: "E_YUKKURI_LLM_NOT_CONFIGURED",
      },
      { status: 500 }
    );
  }

  let body: {
    name?: string;
    xHandle?: string;
    booth?: string;
    hallLabel?: string;
    sub?: string;
    intro?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "リクエスト本文が JSON ではありません", error_code: "E_YUKKURI_BAD_REQUEST" },
      { status: 400 }
    );
  }

  const handle = body.xHandle?.replace(/^@/, "") ?? "";

  // キャッシュ確認（成功 / 失敗いずれもヒットさせてレート浪費を防ぐ）
  const cached = await getCached(handle);
  if (cached) {
    if (cached.ok) {
      return NextResponse.json(cached.dialogue);
    }
    return NextResponse.json(
      {
        error:
          cached.message ??
          "解説 AI が混雑中です。少し待ってから再試行してください。",
        error_code: cached.errorCode,
        cached: true,
      },
      { status: 503 }
    );
  }

  // X プロフィール
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  const profile = bearerToken && handle ? await fetchXProfile(handle, bearerToken) : null;
  const userMessage = buildUserMessage(body, profile);

  const failures: CallResult[] = [];
  const startedTotal = Date.now();
  const remainingBudget = () => TOTAL_BUDGET_MS - (Date.now() - startedTotal);

  // Ollama を先に試す（設定されている場合のみ）
  if (useOllama && ollamaBase && ollamaModel) {
    const budget = Math.min(ollamaTimeoutMs, Math.max(PER_MODEL_MIN_MS, remainingBudget()));
    const r = await callOllama(ollamaBase, ollamaModel, userMessage, budget, ollamaKey);
    if (r.ok) {
      const dialogue = extractDialogue(r.text);
      if (dialogue) {
        await setCached(handle, { ok: true, dialogue });
        return NextResponse.json(dialogue);
      }
      failures.push({
        ok: false,
        model: r.model,
        elapsedMs: r.elapsedMs,
        errorCode: "E_YUKKURI_LLM_PARSE",
      });
    } else {
      failures.push(r);
    }
  }

  // OpenRouter モデル群
  if (apiKey) {
    let modelsLeft = MODELS.length;
    for (const model of MODELS) {
      const rb = remainingBudget();
      if (rb <= PER_MODEL_MIN_MS) {
        console.warn(`[yukkuri-explain] budget exhausted before model=${model} remaining=${rb}ms`);
        failures.push({
          ok: false,
          model,
          elapsedMs: 0,
          errorCode: "E_YUKKURI_LLM_TIMEOUT",
        });
        modelsLeft -= 1;
        continue;
      }
      const per = Math.max(PER_MODEL_MIN_MS, Math.floor(rb / modelsLeft));
      const r = await callOpenRouter(apiKey, model, userMessage, per);
      modelsLeft -= 1;
      if (r.ok) {
        const dialogue = extractDialogue(r.text);
        if (dialogue) {
          await setCached(handle, { ok: true, dialogue });
          console.log(
            `[yukkuri-explain] success model=${r.model} elapsed=${r.elapsedMs}ms handle=${handle || "-"}`
          );
          return NextResponse.json(dialogue);
        }
        failures.push({
          ok: false,
          model: r.model,
          elapsedMs: r.elapsedMs,
          errorCode: "E_YUKKURI_LLM_PARSE",
        });
        continue;
      }
      failures.push(r);
      // レート上限 / 認証系は継続しても無意味なので即失敗扱いに
      if (
        r.errorCode === "E_YUKKURI_LLM_UPSTREAM_401" ||
        r.errorCode === "E_YUKKURI_LLM_UPSTREAM_402"
      ) {
        break;
      }
    }
  } else if (failures.length === 0) {
    // Ollama のみ設定で失敗した場合
    failures.push({
      ok: false,
      model: ollamaModel || "ollama",
      elapsedMs: 0,
      errorCode: "E_YUKKURI_LLM_NETWORK",
    });
  }

  const { status, body: errorBody } = buildUserFacingError(failures);
  console.warn(
    `[yukkuri-explain] all_failed handle=${handle || "-"} error_code=${errorBody.error_code} failures=${JSON.stringify(
      failures.map((f) => (f.ok ? null : { m: f.model, c: f.errorCode, s: f.status, e: f.elapsedMs }))
    )}`
  );
  // 負のキャッシュ（短期）
  // 一時的な混在失敗はキャッシュせず、即再試行で復帰しやすくする
  const cacheableFailureCodes = new Set([
    "E_YUKKURI_LLM_UPSTREAM_401",
    "E_YUKKURI_LLM_UPSTREAM_402",
    "E_YUKKURI_LLM_UPSTREAM_404",
    "E_YUKKURI_LLM_UPSTREAM_429",
    "E_YUKKURI_LLM_TIMEOUT",
    "E_YUKKURI_LLM_PARSE",
  ]);
  if (handle && cacheableFailureCodes.has(errorBody.error_code)) {
    await setCached(handle, {
      ok: false,
      errorCode: errorBody.error_code,
      message: errorBody.error,
    });
  }
  const headers: Record<string, string> = {};
  if (errorBody.error_code === "E_YUKKURI_LLM_UPSTREAM_429") {
    headers["Retry-After"] = "30";
  } else if (errorBody.error_code === "E_YUKKURI_LLM_TIMEOUT") {
    headers["Retry-After"] = "15";
  } else if (errorBody.error_code === "E_YUKKURI_LLM_UPSTREAM_5XX") {
    headers["Retry-After"] = "20";
  } else if (errorBody.error_code === "E_YUKKURI_LLM_NETWORK") {
    headers["Retry-After"] = "10";
  }

  return NextResponse.json(errorBody, { status, headers });
}
