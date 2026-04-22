import { NextRequest, NextResponse } from "next/server";

/** ローカル / Tunnel の Ollama は応答が長い。Edge ではなく Node ランタイムを使う。 */
export const runtime = "nodejs";
/** Vercel 等で長めの生成を許可（未対応ホストでは無視） */
export const maxDuration = 300;

const CACHE_TTL = 3600; // 1時間キャッシュ

async function getCached(handle: string): Promise<{ rink: string; konta: string; tanunee: string } | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token || !handle) return null;
  try {
    const res = await fetch(`${url}/get/yukkuri:${encodeURIComponent(handle)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json() as { result?: string | null };
    if (!data.result) return null;
    return JSON.parse(data.result) as { rink: string; konta: string; tanunee: string };
  } catch { return null; }
}

async function setCached(handle: string, dialogue: { rink: string; konta: string; tanunee: string }) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token || !handle) return;
  try {
    await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["SET", `yukkuri:${handle}`, JSON.stringify(dialogue), "EX", CACHE_TTL]]),
    });
  } catch { /* ignore */ }
}

const MODELS = [
  "inclusionai/ling-2.6-flash:free",
  "google/gemma-4-31b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "google/gemma-4-26b-a4b-it:free",
];
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL_TIMEOUT_MS = 5000;
const DEFAULT_OLLAMA_TIMEOUT_MS = 120_000;
const OLLAMA_HEALTH_TIMEOUT_MS = 4000;

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

type XProfile = {
  name?: string;
  description?: string;
  followersCount?: number;
  tweetCount?: number;
};

async function fetchXProfile(handle: string, bearerToken: string): Promise<XProfile | null> {
  try {
    const url = `https://api.twitter.com/2/users/by/username/${encodeURIComponent(handle)}?user.fields=name,description,public_metrics`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    if (!res.ok) return null;
    const data = await res.json() as {
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
  } catch {
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
    handle                     ? `Xアカウント: @${handle}` : null,
    profile?.name              ? `表示名: ${profile.name}` : (body.name ? `名前: ${body.name}` : null),
    profile?.description       ? `自己紹介: ${profile.description}` : null,
    profile?.followersCount != null ? `フォロワー数: ${profile.followersCount.toLocaleString()}人` : null,
    profile?.tweetCount != null     ? `ツイート数: ${profile.tweetCount.toLocaleString()}件` : null,
    body.booth                 ? `ブース: ${body.booth}` : null,
    body.hallLabel             ? `場所: ${body.hallLabel}` : null,
    body.sub                   ? `ジャンル/日程: ${body.sub}` : null,
    body.intro                 ? `紹介文: ${body.intro}` : null,
  ].filter(Boolean).join("\n");
  return `以下のXユーザーを3人でゆっくり個別紹介してください:\n${lines}`;
}

function isDialogue(p: Record<string, unknown>): p is { rink: string; konta: string; tanunee: string } {
  return typeof p.rink === "string" && typeof p.konta === "string" && typeof p.tanunee === "string";
}

function extractDialogue(text: string) {
  const cleaned = text.replace(/```(?:json)?\n?/g, "").replace(/```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    if (isDialogue(parsed)) return parsed;
  } catch { /* fall through */ }
  const match = cleaned.match(/\{[\s\S]*?\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    if (isDialogue(parsed)) return parsed;
  } catch { /* fall through */ }
  return null;
}

async function callModel(apiKey: string, model: string, userMessage: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
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
    if (!res.ok) return null;
    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeOllamaBase(baseUrl: string) {
  return baseUrl.replace(/\/$/, "");
}

/**
 * Ollama OpenAI 互換: POST /v1/chat/completions
 */
async function callOllama(
  baseUrl: string,
  model: string,
  userMessage: string,
  timeoutMs: number,
  apiKey?: string
) {
  const url = `${normalizeOllamaBase(baseUrl)}/v1/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const auth = apiKey?.trim() || "ollama";
  try {
    const res = await fetch(url, {
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
    if (!res.ok) return null;
    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
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

/** 開発・本番での LLM 設定確認用（認証不要・キーは返さない） */
export async function GET() {
  const ollamaBase = process.env.OLLAMA_BASE_URL?.trim();
  const ollamaModel = process.env.OLLAMA_MODEL?.trim();
  const ollamaKey = process.env.OLLAMA_API_KEY?.trim();
  const apiKey = process.env.OPENROUTER_API_KEY;
  const ollamaConfigured = Boolean(ollamaBase && ollamaModel);
  let ollamaReachable: boolean | null = null;
  if (ollamaBase) {
    ollamaReachable = await pingOllama(ollamaBase, ollamaKey);
  }
  return NextResponse.json({
    yukkuriExplain: "ok",
    ollama: ollamaConfigured
      ? { configured: true, model: ollamaModel, reachable: ollamaReachable }
      : { configured: false },
    openRouter: { configured: Boolean(apiKey) },
  });
}

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
          "LLM が未設定です。Ollama なら OLLAMA_BASE_URL と OLLAMA_MODEL、または OPENROUTER_API_KEY を設定してください。",
      },
      { status: 500 }
    );
  }

  const body = await req.json() as {
    name?: string;
    xHandle?: string;
    booth?: string;
    hallLabel?: string;
    sub?: string;
    intro?: string;
  };

  const handle = body.xHandle?.replace(/^@/, "") ?? "";

  // キャッシュ確認
  const cached = await getCached(handle);
  if (cached) return NextResponse.json(cached);

  // Xプロフィールをベアラートークンで取得（設定されている場合のみ）
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  const profile = (bearerToken && handle) ? await fetchXProfile(handle, bearerToken) : null;

  const userMessage = buildUserMessage(body, profile);

  if (useOllama && ollamaBase && ollamaModel) {
    try {
      const text = await callOllama(ollamaBase, ollamaModel, userMessage, ollamaTimeoutMs, ollamaKey);
      if (text) {
        const dialogue = extractDialogue(text);
        if (dialogue) {
          await setCached(handle, dialogue);
          return NextResponse.json(dialogue);
        }
      }
    } catch {
      /* OpenRouter へフォールバック */
    }
  }

  if (!apiKey) {
    return NextResponse.json(
      { error: "Ollama での生成に失敗し、フォールバック用の OPENROUTER_API_KEY もありません" },
      { status: 503 }
    );
  }

  for (const model of MODELS) {
    try {
      const text = await callModel(apiKey, model, userMessage);
      if (!text) continue;
      const dialogue = extractDialogue(text);
      if (dialogue) {
        await setCached(handle, dialogue);
        return NextResponse.json(dialogue);
      }
    } catch {
      // try next model
    }
  }

  return NextResponse.json({ error: "全モデルで解説の生成に失敗しました" }, { status: 503 });
}
