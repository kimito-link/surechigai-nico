import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const MODELS = [
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
];
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

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

function extractDialogue(text: string) {
  const jsonMatch = text.match(/\{[^{}]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    if (
      typeof parsed.rink === "string" &&
      typeof parsed.konta === "string" &&
      typeof parsed.tanunee === "string"
    ) {
      return { rink: parsed.rink, konta: parsed.konta, tanunee: parsed.tanunee };
    }
  } catch {
    // fall through
  }
  return null;
}

async function callModel(apiKey: string, model: string, userMessage: string) {
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
      max_tokens: 400,
      temperature: 0.9,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? null;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY が未設定です" }, { status: 500 });
  }

  const body = await req.json() as {
    name?: string;
    xHandle?: string;
    booth?: string;
    hallLabel?: string;
    sub?: string;
    intro?: string;
  };

  // Xプロフィールをベアラートークンで取得（設定されている場合のみ）
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  const handle = body.xHandle?.replace(/^@/, "") ?? "";
  const profile = (bearerToken && handle) ? await fetchXProfile(handle, bearerToken) : null;

  const userMessage = buildUserMessage(body, profile);

  for (const model of MODELS) {
    try {
      const text = await callModel(apiKey, model, userMessage);
      if (!text) continue;
      const dialogue = extractDialogue(text);
      if (dialogue) return NextResponse.json(dialogue);
    } catch {
      // try next model
    }
  }

  return NextResponse.json({ error: "全モデルで解説の生成に失敗しました" }, { status: 503 });
}
