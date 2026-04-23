import { NextRequest, NextResponse } from "next/server";
import { clampYukkuriDialogue } from "@/lib/yukkuriDialogueClamp";
import { extractTweetId } from "@/lib/tweetUrl";
import { fetchXTweetWithAuthor, type XTweetContext } from "@/lib/xTweet";
import { upsertYukkuriExplainedTweet } from "@/lib/yukkuriExplainedTweetArchive";

/**
 * 「ツイート URL を貼り付けて、そのツイートをゆっくり解説する」新 API。
 *
 * 既存 `/api/yukkuri-explain`（ハンドル解説）との違い:
 * - 入力が「ハンドル」ではなく「ツイート URL」
 * - LLM に渡すのは `@handle` のプロフィールと公開データではなく、
 *   **その 1 ツイートの本文そのもの** + 投稿者の軽いプロフィール
 * - プロンプトは「この発言にキャラが反応する」形式で、プロフ朗読が構造的に起きない
 *
 * フォールバック方針:
 * - Ollama は使わない（会場の家庭内 PC は帯域不安定で、URL 解説は待たせたくないため）
 * - OpenRouter のみ、複数モデルを順に叩くが、1 つ成功したら終わり
 * - 全失敗したら 503 を返してクライアントに再試行させる（静的フォールバック無し）
 *
 * DB 保存:
 * - `yukkuri_explained_tweet` テーブル（Codex が後で作成）。未作成でも API は動く。
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const PER_MODEL_TIMEOUT_MS = 20_000;
const MODELS = [
  "anthropic/claude-3-5-haiku",
  "openai/gpt-4o-mini",
  "google/gemma-4-31b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
];

const SYSTEM_PROMPT = `あなたはニコニコ超会議2026「すれちがいライト」アプリのガイドキャラクター3人です。
X（旧 Twitter）のユーザーが投稿した **1 つのツイート** について、3人で反応しながら解説してください。

キャラクター設定:
- rink（りんく）: 明るく元気な応援系。語尾は「〜だよ！」「〜すごいね！」。
- konta（こん太）: 知識豊富で説明上手。「〜なんだよ！」「なるほど〜」が口癖。
- tanunee（たぬ姉）: 温かく包容力のある姉御肌。「〜だよね〜」「応援してるよ！」が口癖。

文字量のバランス（必須）:
- rink: だいたい38〜58文字、最大 **118文字**。
- konta: だいたい65〜105文字、最大 **118文字**。
- tanunee: だいたい48〜82文字、最大 **118文字**。
- 各キャラ最大2文（読点でつなぐ長文1文でも可）。

必須ルール:
- **ツイート本文の内容に 3 人とも言及する**こと。プロフィールや数字の朗読に逃げない。
- ツイート本文の **一部を具体的に引用または言い換え** してよい（全文コピペは禁止、短い抜粋のみ）。
- いいね数やリプライ数の数字は朗読しない（「たくさん反応がある」など意訳のみ）。
- ツイート ID や URL、@メンション以外の他者名は本文に無い限り捏造しない。
- 3人のセリフは別角度（共感 / 解説 / 応援など）で、同じ事実を繰り返さない。

必ず以下のJSON形式のみで返答してください。他のテキストは一切不要です:
{"rink":"セリフ","konta":"セリフ","tanunee":"セリフ"}`;

type Dialogue = { rink: string; konta: string; tanunee: string };

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

function buildUserMessage(tweet: XTweetContext): string {
  const author = tweet.author;
  const profileParts: string[] = [];
  if (author.name) profileParts.push(`表示名: ${author.name}`);
  profileParts.push(`ハンドル: @${author.username}`);
  if (author.description) {
    // bio は 180 字までに切る（プロンプト長の暴走対策）
    const bio =
      author.description.length > 180
        ? `${author.description.slice(0, 180)}…`
        : author.description;
    profileParts.push(`自己紹介: ${bio}`);
  }

  // 反応の規模感（数値そのものは朗読禁止。LLM には「状況把握の補助」として渡す）
  const metricLines: string[] = [];
  if (tweet.metrics.likeCount != null) {
    metricLines.push(`いいね数の目安: ${tweet.metrics.likeCount}`);
  }
  if (tweet.metrics.replyCount != null) {
    metricLines.push(`リプライ数の目安: ${tweet.metrics.replyCount}`);
  }

  return `【解説対象のツイート本文】
${tweet.text}

【投稿者プロフィール（補助情報）】
${profileParts.join("\n")}
${metricLines.length > 0 ? `\n${metricLines.join("\n")}` : ""}

【指示】
- まず「このツイートが何を言っているか」を 3 人で会話的に拾ってください。
- 本文から短いフレーズを 1 つ引用しても構いません（ただしセリフ全体をコピペにはしない）。
- 数字（いいね・リプライ）の朗読は禁止、規模感は「反応が多い / 共感を呼んでる」など言い換えで。
- 3 人はそれぞれ異なる角度（りんく=共感とフック、こん太=背景や具体、たぬ姉=寄り添いと応援）。`;
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  userMessage: string,
  timeoutMs: number
): Promise<{ ok: true; text: string } | { ok: false; status: number; message: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://surechigai-nico.link/",
        "X-Title": "surechigai-yukkuri-explain-tweet",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        max_tokens: 380,
        temperature: 0.72,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        status: res.status,
        message: `openrouter ${model} status=${res.status} body=${body.slice(0, 160)}`,
      };
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    if (!text) {
      return { ok: false, status: 0, message: `openrouter ${model} empty` };
    }
    return { ok: true, text };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      message: `${(err as Error).name}: ${(err as Error).message}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  // 全体を try/catch で囲って、想定外例外でも JSON を返すようにする。
  // ここが throw すると Next.js が HTML の 500 を返し、クライアントの
  // `res.json()` が落ちて `E_TWEET_EXPLAIN_CLIENT_BAD_SHAPE` になる。
  // ハンドル版 (/api/yukkuri-explain) と同じく「どの経路でも JSON エラー」を保証する。
  try {
    // 1) body parse
    let body: { tweetUrl?: string };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return NextResponse.json(
        { error: "JSON 本文が不正です", error_code: "E_TWEET_EXPLAIN_BAD_JSON" },
        { status: 400 }
      );
    }
    const tweetUrl = body.tweetUrl?.trim();
    if (!tweetUrl) {
      return NextResponse.json(
        { error: "tweetUrl が空です", error_code: "E_TWEET_EXPLAIN_NO_URL" },
        { status: 400 }
      );
    }

    // 2) URL パース
    const parsed = extractTweetId(tweetUrl);
    if (!parsed) {
      return NextResponse.json(
        {
          error:
            "ツイート URL を認識できませんでした（例: https://x.com/username/status/1234567890）",
          error_code: "E_TWEET_EXPLAIN_BAD_URL",
        },
        { status: 400 }
      );
    }

    // 3) X API でツイート + 投稿者取得
    const bearerToken = process.env.TWITTER_BEARER_TOKEN?.trim();
    if (!bearerToken) {
      return NextResponse.json(
        {
          error:
            "X API が設定されていないため、このツイート解説機能は一時的に使用できません（運営にご連絡ください）。",
          error_code: "E_TWEET_EXPLAIN_NO_BEARER",
        },
        { status: 503 }
      );
    }
    const tweet = await fetchXTweetWithAuthor(parsed.tweetId, bearerToken);
    if (!tweet) {
      return NextResponse.json(
        {
          error:
            "このツイートを取得できませんでした（削除済み・非公開アカウント・URL の打ち間違い等をご確認ください）。",
          error_code: "E_TWEET_EXPLAIN_TWEET_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // 4) LLM 呼び出し（OpenRouter のモデルを順に試す。1 つ成功で終わり）
    const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!openRouterKey) {
      return NextResponse.json(
        {
          error: "解説 AI が設定されていません（運営にご連絡ください）。",
          error_code: "E_TWEET_EXPLAIN_NO_LLM",
        },
        { status: 503 }
      );
    }

    const userMessage = buildUserMessage(tweet);
    const failures: string[] = [];
    let dialogue: Dialogue | null = null;
    let usedModel: string | null = null;

    for (const model of MODELS) {
      const r = await callOpenRouter(openRouterKey, model, userMessage, PER_MODEL_TIMEOUT_MS);
      if (!r.ok) {
        failures.push(r.message);
        // 401/402 は他モデルでも直らないので打ち切り
        if (r.status === 401 || r.status === 402) break;
        continue;
      }
      const parsedDialogue = extractDialogue(r.text);
      if (parsedDialogue) {
        dialogue = clampYukkuriDialogue(parsedDialogue);
        usedModel = model;
        break;
      }
      failures.push(`openrouter ${model} parse_failed`);
    }

    if (!dialogue || !usedModel) {
      console.warn(
        `[yukkuri-explain-tweet] all models failed tweetId=${parsed.tweetId} failures=${JSON.stringify(failures).slice(0, 400)}`
      );
      return NextResponse.json(
        {
          error:
            "ツイート解説の生成に失敗しました。しばらくしてからもう一度お試しください。",
          error_code: "E_TWEET_EXPLAIN_LLM_FAILED",
        },
        { status: 503 }
      );
    }

    // 5) 保存（テーブル未作成なら握りつぶす）
    await upsertYukkuriExplainedTweet({
      tweetId: tweet.tweetId,
      xHandle: tweet.author.username,
      authorDisplayName: tweet.author.name,
      authorAvatarUrl: tweet.author.profileImageUrl,
      tweetText: tweet.text,
      tweetedAt: tweet.createdAt ?? null,
      rink: dialogue.rink,
      konta: dialogue.konta,
      tanunee: dialogue.tanunee,
      source: "openrouter",
    });

    return NextResponse.json({
      ...dialogue,
      tweet: {
        id: tweet.tweetId,
        handle: tweet.author.username,
        displayName: tweet.author.name,
        avatarUrl: tweet.author.profileImageUrl,
        text: tweet.text,
      },
    });
  } catch (err) {
    // fetchXTweetWithAuthor の内部 fetch エラー（DNS 失敗・TLS 障害・
    // 予期せぬ JSON 構造）など、上の個別ブランチで拾い切れない例外。
    // スタックはログに残すが、クライアントへは整形した JSON を返す。
    console.error("[yukkuri-explain-tweet] unhandled exception", err);
    return NextResponse.json(
      {
        error:
          "ツイート解説でサーバ内部エラーが発生しました。少し待ってから再試行してください。",
        error_code: "E_TWEET_EXPLAIN_UNHANDLED",
      },
      { status: 500 }
    );
  }
}
