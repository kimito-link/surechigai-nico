import { NextRequest, NextResponse } from "next/server";
import { clampYukkuriDialogue } from "@/lib/yukkuriDialogueClamp";
import { recordYukkuriExplainedHandleRedis, YUKKURI_EXPLAINED_SET_KEY } from "@/lib/homeStats";
import { upsertYukkuriExplainedArchive } from "@/lib/yukkuriExplainedArchive";
import {
  OFFICIAL_CREATORCROSS_ENTRIES,
  type OfficialCreatorCrossEntry,
} from "@/app/chokaigi/creatorcross-official-data";

/** ローカル / Tunnel の Ollama は応答が長い。Edge ではなく Node ランタイムを使う。 */
export const runtime = "nodejs";
/** Vercel 等で長めの生成を許可（未対応ホストでは無視） */
export const maxDuration = 300;

const CACHE_TTL_OK = 24 * 60 * 60; // 24時間キャッシュ（成功）
const CACHE_TTL_FAIL = 20; // 20秒キャッシュ（失敗）— 一時障害時の再試行余地を残す
const CACHE_TTL_MEM_OK_MS = 2 * 60 * 60 * 1000; // 2時間（インスタンス内）
// 超会議 2026 本番: Ollama（家庭内 PC）だけだと「たまに落ちる」「帯域不安定」で
// 会場の体験が止まるので、OpenRouter を Ollama フォールバックとして有効化する。
// 有料モデル（haiku / gpt-4o-mini）を主力に、:free をラストリゾートに配置。
// コスト上限は OpenRouter ダッシュボード側で設定（¥10,000 相当）。
// 緊急時に再封印したい場合はこのフラグを true にして commit すればすぐ止められる。
const OPENROUTER_DISABLED = false;
const OPENROUTER_GLOBAL_BACKOFF_KEY = "yukkuri:openrouter:backoff:global";
const OPENROUTER_GLOBAL_BACKOFF_MAX_SEC = 180;
const OPENROUTER_MODEL_COOLDOWN_MS = 120_000;

/**
 * OpenRouter モデル候補。
 * - 超会議本番では「有料モデル（速くて安定）→ :free（コスト 0 だが 20 req/min・200 req/day の枠）」の順で試す。
 * - 先頭が成功すれば終わるので、通常時は有料の claude-3-5-haiku / gpt-4o-mini で完結する。
 * - 枠やバックオフで弾かれた場合だけ :free に落ちる多段防御。
 * - コスト上限は OpenRouter ダッシュボード側（Credit limit ¥10,000）で Hard cap する。
 */
const MODELS = [
  "anthropic/claude-3-5-haiku",
  "openai/gpt-4o-mini",
  "google/gemma-4-31b-it:free",
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
- rink（りんく）: 明るく元気な応援系。語尾は「〜だよ！」「〜すごいね！」。
- konta（こん太）: 知識豊富で説明上手。「〜なんだよ！」「なるほど〜」が口癖。
- tanunee（たぬ姉）: 温かく包容力のある姉御肌。「〜だよね〜」「応援してるよ！」が口癖。

文字量のバランス（必須）:
- rink: **だいたい38〜58文字**（短くフック）。最大 **118文字** まで。
- konta: **だいたい65〜105文字**（具体・数字・固有名を中心に最も厚く）。最大 **118文字** まで。
- tanunee: **だいたい48〜82文字**（締めと寄り添い）。最大 **118文字** まで。
- 各キャラ **最大2文**（読点でつなぐ長文1文でも可）。

価値・差別化（必須）:
- 「公開プロフィールと会場データをもとに」「ポイントをぎゅっとまとめる」など、**誰にでも当てはまる定形句だけ**のセリフは禁止。
- 入力にある **表示名・自己紹介の語句・フォロワー数・ツイート数・ブース等** を必ずどれか **具体的に引用または言い換え** して入れる。情報が薄いときは **ハンドルの綴り・長さ・数字の有無** から推測した一言をこん太が言う。
- 3人のセリフで **同じ事実の繰り返し** にしない（りんくで触れたらこん太は別角度へ）。

ユーザーのXプロフィール情報（名前・自己紹介・フォロワー数など）をもとに、
その人らしい個別の紹介をしてください。

必ず以下のJSON形式のみで返答してください。他のテキストは一切不要です:
{"rink":"セリフ","konta":"セリフ","tanunee":"セリフ"}`;

type Dialogue = { rink: string; konta: string; tanunee: string };

async function scheduleArchiveSave(
  handleRaw: string,
  dialogue: Dialogue,
  body: { name?: string },
  source: string
) {
  const h = handleRaw.replace(/^@+/, "").trim();
  if (!h) return;
  await Promise.all([
    upsertYukkuriExplainedArchive({
      xHandle: h,
      displayName: body.name?.trim() || null,
      rink: dialogue.rink,
      konta: dialogue.konta,
      tanunee: dialogue.tanunee,
      source,
    }),
    recordYukkuriExplainedHandleRedis(h),
  ]);
}

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

type FailedCallResult = Extract<CallResult, { ok: false }>;

function isFailedCallResult(r: CallResult): r is FailedCallResult {
  return !r.ok;
}

type CachedPayload =
  | { ok: true; dialogue: Dialogue }
  | { ok: false; errorCode: string; status?: number; message?: string };

const memoryCache = new Map<
  string,
  { payload: CachedPayload; expiresAt: number }
>();
const modelCooldownUntil = new Map<string, number>();
let globalBackoffUntilLocal = 0;
let global429Strike = 0;

// ---------------- Upstash キャッシュ ----------------

function cacheKeyFromHandle(handle: string): string {
  return `yukkuri:${handle.toLowerCase()}`;
}

function getCachedFromMemory(handle: string): CachedPayload | null {
  const key = cacheKeyFromHandle(handle);
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }
  return hit.payload;
}

function setCachedToMemory(handle: string, payload: CachedPayload) {
  const key = cacheKeyFromHandle(handle);
  const ttlMs = payload.ok ? CACHE_TTL_MEM_OK_MS : CACHE_TTL_FAIL * 1000;
  memoryCache.set(key, { payload, expiresAt: Date.now() + ttlMs });
}

async function getCached(handle: string): Promise<CachedPayload | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token || !handle) return null;
  const memoryHit = getCachedFromMemory(handle);
  if (memoryHit) return memoryHit;
  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(cacheKeyFromHandle(handle))}`, {
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
        const payload = { ok: true, dialogue: parsed as Dialogue } as const;
        setCachedToMemory(handle, payload);
        return payload;
      }
      if (parsed && typeof parsed === "object" && "errorCode" in parsed) {
        const payload = parsed as CachedPayload;
        setCachedToMemory(handle, payload);
        return payload;
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
  if (!handle) return;
  setCachedToMemory(handle, payload);
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  try {
    const ttl = payload.ok ? CACHE_TTL_OK : CACHE_TTL_FAIL;
    // 成功時は「これまでに解説された固有ハンドル」の集合にも登録しておき、
    // TOP のヒーロー統計（ゆっくり解説された数）から参照できるようにする。
    const commands: Array<Array<string | number>> = [
      ["SET", cacheKeyFromHandle(handle), JSON.stringify(payload), "EX", ttl],
    ];
    if (payload.ok) {
      commands.push(["SADD", YUKKURI_EXPLAINED_SET_KEY, handle.toLowerCase()]);
    }
    await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
    });
  } catch {
    console.warn("[yukkuri-explain] upstash setCached failed");
  }
}

async function getGlobalBackoffUntilRedis(): Promise<number> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return 0;
  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(OPENROUTER_GLOBAL_BACKOFF_KEY)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return 0;
    const data = (await res.json()) as { result?: string | null };
    const n = Number.parseInt(data.result ?? "", 10);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

async function setGlobalBackoff(seconds: number) {
  const now = Date.now();
  const until = now + Math.max(1, seconds) * 1000;
  globalBackoffUntilLocal = Math.max(globalBackoffUntilLocal, until);
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return;
  try {
    await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["SET", OPENROUTER_GLOBAL_BACKOFF_KEY, String(until), "EX", Math.max(1, seconds)],
      ]),
    });
  } catch {
    console.warn("[yukkuri-explain] setGlobalBackoff failed");
  }
}

function nextGlobalBackoffSeconds(): number {
  global429Strike = Math.min(global429Strike + 1, 6);
  const base = 12 * 2 ** (global429Strike - 1);
  const jitter = Math.floor(Math.random() * 6);
  return Math.min(OPENROUTER_GLOBAL_BACKOFF_MAX_SEC, base + jitter);
}

function resetGlobalBackoffStrike() {
  global429Strike = 0;
}

// ---------------- X プロフィール ----------------

type XProfile = {
  name?: string;
  description?: string;
  followersCount?: number;
  tweetCount?: number;
};

type OfficialCreatorContext = {
  name: string;
  intro: string;
  booth: string;
  hallNo: string;
  days: string[];
  genre: string[];
  detailUrl: string;
};

function normalizeHandleToken(input: string | null | undefined): string {
  if (!input) return "";
  const trimmed = input.trim();
  if (!trimmed) return "";
  const withoutAt = trimmed.replace(/^@+/, "");
  const urlMatch = withoutAt.match(/^https?:\/\/(?:x\.com|twitter\.com)\/([^/?#]+)/i);
  const handle = urlMatch?.[1] ?? withoutAt.split(/[/?#]/)[0] ?? "";
  return handle.trim().toLowerCase();
}

function extractHandleFromHref(href: string): string {
  try {
    const u = new URL(href);
    if (!/(^|\.)x\.com$/i.test(u.hostname) && !/(^|\.)twitter\.com$/i.test(u.hostname)) {
      return "";
    }
    const segment = u.pathname.split("/").filter(Boolean)[0] ?? "";
    return normalizeHandleToken(segment);
  } catch {
    return "";
  }
}

function collectOfficialHandles(entry: OfficialCreatorCrossEntry): string[] {
  const set = new Set<string>();
  for (const link of entry.links) {
    const fromHandle = normalizeHandleToken(link.handle);
    if (fromHandle) set.add(fromHandle);
    const fromHref = extractHandleFromHref(link.href);
    if (fromHref) set.add(fromHref);
  }
  return [...set];
}

const OFFICIAL_CREATOR_BY_HANDLE = (() => {
  const map = new Map<string, OfficialCreatorCrossEntry>();
  for (const entry of OFFICIAL_CREATORCROSS_ENTRIES) {
    for (const h of collectOfficialHandles(entry)) {
      if (!map.has(h)) {
        map.set(h, entry);
      }
    }
  }
  return map;
})();

function findOfficialCreatorContext(
  handleRaw: string | undefined,
  nameRaw: string | undefined
): OfficialCreatorContext | null {
  const handle = normalizeHandleToken(handleRaw);
  const byHandle = handle ? OFFICIAL_CREATOR_BY_HANDLE.get(handle) : undefined;
  const byName =
    !byHandle && nameRaw
      ? OFFICIAL_CREATORCROSS_ENTRIES.find(
          (entry) => entry.name.trim().toLowerCase() === nameRaw.trim().toLowerCase()
        )
      : undefined;
  const found = byHandle ?? byName;
  if (!found) return null;
  return {
    name: found.name,
    intro: found.intro,
    booth: found.booth,
    hallNo: found.hallNo,
    days: found.days,
    genre: found.genre,
    detailUrl: found.detailUrl,
  };
}

function compactText(input: string | undefined, max = 70): string {
  if (!input) return "";
  const squashed = input.replace(/\s+/g, " ").trim();
  if (!squashed) return "";
  return squashed.length > max ? `${squashed.slice(0, max)}…` : squashed;
}

/** ハンドルごとにフォールバック文言のバリエーションを振る（決定的） */
function hashHandleSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function buildFallbackDialogue(
  body: {
    name?: string;
    xHandle?: string;
    booth?: string;
    hallLabel?: string;
    sub?: string;
    intro?: string;
  },
  profile: XProfile | null,
  official: OfficialCreatorContext | null
): Dialogue {
  const rawHandle = body.xHandle?.replace(/^@+/, "").trim() ?? "";
  const seed = hashHandleSeed(rawHandle.toLowerCase() || "_");
  const handleText = rawHandle ? `@${rawHandle}` : "この方";
  const displayName = compactText(profile?.name || official?.name || body.name, 32) || handleText;
  const profileSnippet = compactText(profile?.description, 42);
  const profileLong = compactText(profile?.description, 96);
  const introText = compactText(body.intro || official?.intro, 96);
  const boothText = compactText(body.booth || official?.booth, 40);
  const placeText = compactText(
    body.hallLabel || (official?.hallNo ? `ホール${official.hallNo}` : ""),
    28
  );
  const genreText = compactText(body.sub || official?.genre.join(" / "), 44);
  const daysText = compactText(official?.days.join("・"), 32);
  const followerText =
    profile?.followersCount != null
      ? `フォロワー約${profile.followersCount.toLocaleString()}人`
      : "";
  const tweetText =
    profile?.tweetCount != null
      ? `累計投稿約${profile.tweetCount.toLocaleString()}件`
      : "";
  const detailText = compactText(official?.detailUrl, 72);

  const hl = rawHandle.length;
  const digits = (rawHandle.match(/\d/g) ?? []).length;
  const hasUnderscore = rawHandle.includes("_");

  const rinkOpeners = profileSnippet
    ? [
        `プロフの「${profileSnippet}」…${displayName}さん（${handleText}）の雰囲気、ちょっと伝わってきたよ！`,
        `${displayName}さん、自己紹介に「${profileSnippet}」ってあって個性ひかるね！${handleText} チェックだよ！`,
        `「${profileSnippet}」って書いてあって${displayName}さんらしさ全開！${handleText} もっと知りたい！`,
      ]
    : [
        `${displayName}さん（${handleText}）、いまから紹介ロールだよ！アカウントひとつで世界が広がる感じ、わくわくするね！`,
        `${handleText} の${displayName}さん、ピックアップ！どんな発信してるか想像するだけで楽しいよ！`,
        `${displayName}さん登場だよ！ハンドル ${handleText}、覚えやすくていいね！`,
        `今日の一枚は ${displayName}さん（${handleText}）！クリエイター同士のつながり、ここから育てよ！`,
        `${handleText} 経由で${displayName}さんを知れたよ。名前のリズムも含めてファンになりそう！`,
        `${displayName}さん、${handleText} という看板で参加してくれてるんだね！ありがとう！`,
      ];
  const rink = rinkOpeners[seed % rinkOpeners.length] ?? rinkOpeners[0]!;

  const kontaFactual: string[] = [`紹介対象は ${handleText} だよ。`];
  if (genreText) kontaFactual.push(`ジャンル目線だと ${genreText} がタグに見えるんだ。`);
  if (profileLong) kontaFactual.push(`自己紹介の抜粋は「${profileLong}」。`);
  else if (introText) kontaFactual.push(`公式・会場側の紹介文には「${introText}」ってあるね。`);
  if (followerText) kontaFactual.push(`${followerText}規模。`);
  if (tweetText) kontaFactual.push(`${tweetText}くらい。`);
  if (boothText) kontaFactual.push(`ブース位置は ${boothText}。`);
  if (placeText) kontaFactual.push(`場所の目印は ${placeText} あたりが近いよ。`);
  if (daysText) kontaFactual.push(`出展日は ${daysText}。`);

  const kontaSparse = [
    `ハンドルは全${hl}文字で数字が${digits}個${hasUnderscore ? "、アンダースコアで区切られてて覚えやすい" : ""}。綴りから想像するだけでもキャラが立ってくるんだよ！`,
    `「${rawHandle || "このID"}」の形は他と被りにくいから、検索やすれちがいのフックにも向いてると思うんだ！`,
    `${handleText}、文字の並びを眺めるとクリエイターっぽいリズムがあるね。プロフィールが埋まるともっと深掘りできるんだ！`,
    `アカウント年季は数字だけじゃ測れないけど、${hl}文字のハンドルは印象に残りやすいパターンなんだよ！`,
    `${handleText} って呼びやすい長さだね。イベントで名刺代わりになるのもアリだと思うんだ！`,
  ];

  let konta = kontaFactual.join("");
  if (konta.length < 52) {
    konta += kontaSparse[(seed >>> 5) % kontaSparse.length] ?? kontaSparse[0]!;
  }

  const tanuneeVariants = [
    `${displayName}さん、発信続けるの大変だけど応援してる！交流はXでやさしくいこうね。`,
    `${displayName}さん、ペース大事にね。無理せず、でも楽しんでいてほしいな！`,
    `${displayName}さん、ここからも素敵な出会いがありますように！${detailText ? `公式詳細は ${detailText} も覗いてみて。` : ""}`.trim(),
    `${displayName}さん、${handleText} 覚えたよ！現地やオンライン、どちらでも応援してる！`,
    `${displayName}さん、つながりが広がるといいな。人との距離は自分の心地よさで調整していこうね。`,
  ];
  const tanIdx = (seed >>> 9) % tanuneeVariants.length;
  let tanunee = tanuneeVariants[tanIdx] ?? tanuneeVariants[0]!;
  if (detailText && tanIdx !== 2) {
    tanunee = `${tanunee} 公式: ${detailText}`;
  }

  return clampYukkuriDialogue({ rink, konta, tanunee });
}

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
  profile: XProfile | null,
  official: OfficialCreatorContext | null
): string {
  const handle = body.xHandle?.replace(/^@+/, "").trim() ?? "";
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
    official?.name ? `公式出展名: ${official.name}` : null,
    official?.genre?.length ? `公式ジャンル: ${official.genre.join(" / ")}` : null,
    official?.days?.length ? `公式出展日: ${official.days.join(" / ")}` : null,
    official?.booth ? `公式ブース: ${official.booth}` : null,
    official?.intro ? `公式紹介文: ${official.intro}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  return `以下のXユーザーを3人でゆっくり個別紹介してください:\n${lines}

【追加ルール】
- 3人のセリフで同じ形容・同じ事実の繰り返しを避け、それぞれ別の角度から話す。
- 上に数値や固有名がある場合は必ず文中に取り込む。薄い場合はハンドルの形からの推測をこん太が一言入れる。`;
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
        // Header values must be ASCII-safe in some runtimes (ByteString requirement).
        "X-Title": "surechigai-yukkuri-explain",
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
        max_tokens: 380,
        temperature: 0.72,
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
  const ollamaConfigured = Boolean(ollamaBase && ollamaModel);

  let ollamaReachable: boolean | null = null;
  let ollamaSuspicious = false;
  if (ollamaBase) {
    ollamaReachable = await pingOllama(ollamaBase, ollamaKey);
    // 本番 (NODE_ENV=production) で 127.0.0.1/localhost 指定はほぼ事故
    const localish = /^(https?:\/\/)?(127\.0\.0\.1|localhost)/.test(ollamaBase);
    ollamaSuspicious = process.env.NODE_ENV === "production" && localish;
  }

  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const openRouter = OPENROUTER_DISABLED
    ? { configured: false as const, disabled: true as const }
    : { configured: Boolean(openRouterKey) };

  const now = Date.now();
  const globalBackoffUntilRedis = await getGlobalBackoffUntilRedis();
  const globalBackoffUntil = Math.max(globalBackoffUntilLocal, globalBackoffUntilRedis);
  const cooldowns = Object.fromEntries(
    MODELS.map((m) => {
      const until = modelCooldownUntil.get(m) ?? 0;
      return [m, until > now ? Math.ceil((until - now) / 1000) : 0];
    })
  );

  // provider ラベルは設定状態から動的に決定する。
  // - ollama + openrouter 両方設定: "ollama+openrouter"
  // - ollama だけ: "ollama_only"
  // - openrouter だけ: "openrouter_only"
  // - どちらもなし: "fallback_only"
  const providerLabel = ollamaConfigured && !OPENROUTER_DISABLED && openRouterKey
    ? "ollama+openrouter"
    : ollamaConfigured
      ? "ollama_only"
      : !OPENROUTER_DISABLED && openRouterKey
        ? "openrouter_only"
        : "fallback_only";

  return NextResponse.json({
    yukkuriExplain: "ok",
    provider: providerLabel,
    ollama: ollamaConfigured
      ? { configured: true, model: ollamaModel, reachable: ollamaReachable, suspicious: ollamaSuspicious }
      : { configured: false },
    openRouter,
    backoff: {
      global_wait_sec: globalBackoffUntil > now ? Math.ceil((globalBackoffUntil - now) / 1000) : 0,
      model_wait_sec: cooldowns,
      strike: global429Strike,
    },
    models: MODELS,
    budgets: { total_ms: TOTAL_BUDGET_MS, per_model_min_ms: PER_MODEL_MIN_MS },
  });
}

// ---------------- POST: 本体 ----------------

export async function POST(req: NextRequest) {
  const ollamaBase = process.env.OLLAMA_BASE_URL?.trim();
  const ollamaModel = process.env.OLLAMA_MODEL?.trim();
  const ollamaKey = process.env.OLLAMA_API_KEY?.trim();
  const ollamaTimeoutRaw = process.env.OLLAMA_TIMEOUT_MS?.trim();
  const ollamaTimeoutMs = ollamaTimeoutRaw
    ? Math.max(1000, Number.parseInt(ollamaTimeoutRaw, 10) || DEFAULT_OLLAMA_TIMEOUT_MS)
    : DEFAULT_OLLAMA_TIMEOUT_MS;

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

  const useOllama = Boolean(ollamaBase && ollamaModel);
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const useOpenRouter = !OPENROUTER_DISABLED && Boolean(openRouterKey);
  // 全ての先頭 @ を取り除いて trim。キャッシュキー / Redis SADD / DB PK の
  // 正規化ロジックと揃えて、`@@handle` のような入力で二重登録されないようにする。
  const handle = body.xHandle?.replace(/^@+/, "").trim() ?? "";
  const official = findOfficialCreatorContext(handle, body.name);

  // キャッシュ確認（成功 / 失敗いずれもヒットさせてレート浪費を防ぐ）
  const cached = await getCached(handle);
  if (cached) {
    if (cached.ok) {
      const dialogue = clampYukkuriDialogue(cached.dialogue);
      await scheduleArchiveSave(handle, dialogue, body, "cache_hit");
      return NextResponse.json(dialogue);
    }
    if (!useOllama && !useOpenRouter) {
      const fallback = buildFallbackDialogue(body, null, official);
      if (handle) {
        await setCached(handle, { ok: true, dialogue: fallback });
      }
      await scheduleArchiveSave(handle, fallback, body, "fallback_no_llm");
      return NextResponse.json({
        ...fallback,
        degraded: true,
        source: "fallback_no_llm",
      });
    }
    // 過去バージョンで保存された失敗キャッシュが残っている場合でも、
    // 現在の LLM 経路で再試行して体験を止めない。
    console.warn(
      `[yukkuri-explain] ignore_stale_fail_cache handle=${handle || "-"} code=${cached.errorCode}`
    );
  }

  // X プロフィール
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  const profile = bearerToken && handle ? await fetchXProfile(handle, bearerToken) : null;

  // Ollama も OpenRouter もない場合のみ静的フォールバック
  if (!useOllama && !useOpenRouter) {
    const fallback = buildFallbackDialogue(body, profile, official);
    if (handle) {
      await setCached(handle, { ok: true, dialogue: fallback });
    }
    await scheduleArchiveSave(handle, fallback, body, "fallback_no_llm");
    return NextResponse.json({
      ...fallback,
      degraded: true,
      source: "fallback_no_llm",
    });
  }

  const userMessage = buildUserMessage(body, profile, official);

  const failures: CallResult[] = [];
  const startedTotal = Date.now();
  const remainingBudget = () => TOTAL_BUDGET_MS - (Date.now() - startedTotal);

  // Ollama を先に試す（設定されている場合のみ）
  if (useOllama && ollamaBase && ollamaModel) {
    const budget = Math.min(ollamaTimeoutMs, Math.max(PER_MODEL_MIN_MS, remainingBudget()));
    const r = await callOllama(ollamaBase, ollamaModel, userMessage, budget, ollamaKey);
    if (r.ok) {
      const raw = extractDialogue(r.text);
      if (raw) {
        const dialogue = clampYukkuriDialogue(raw);
        await setCached(handle, { ok: true, dialogue });
        await scheduleArchiveSave(handle, dialogue, body, "ollama");
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

  // Ollama が失敗した（or 未設定）の場合に OpenRouter をフォールバックとして試す。
  // - グローバル 429 バックオフ中は全モデルをスキップ
  // - モデル個別のクールダウン中のものはスキップ
  // - 401 / 402（認証 / 残高不足）は次モデルでも直らないので即打ち切り
  // - 429 は global backoff を上書きして以降のモデルもスキップ
  // - 404 はそのモデル slug が消えた可能性、他モデルは続行
  if (useOpenRouter && openRouterKey) {
    const nowOuter = Date.now();
    const globalBackoffUntilRedis = await getGlobalBackoffUntilRedis();
    const globalBackoffUntil = Math.max(globalBackoffUntilLocal, globalBackoffUntilRedis);
    if (globalBackoffUntil > nowOuter) {
      console.warn(
        `[yukkuri-explain] openrouter_global_backoff_active wait=${Math.ceil((globalBackoffUntil - nowOuter) / 1000)}s`
      );
    } else {
      const eligible = MODELS.filter((m) => (modelCooldownUntil.get(m) ?? 0) <= nowOuter);
      let remainingModels = eligible.length;
      let hardStop = false;
      for (const model of eligible) {
        if (hardStop) break;
        const budgetLeft = remainingBudget();
        if (budgetLeft < PER_MODEL_MIN_MS) break;
        const perModel = Math.max(
          PER_MODEL_MIN_MS,
          Math.floor(budgetLeft / Math.max(1, remainingModels))
        );
        const r = await callOpenRouter(openRouterKey, model, userMessage, perModel);
        remainingModels -= 1;
        if (r.ok) {
          const raw = extractDialogue(r.text);
          if (raw) {
            const dialogue = clampYukkuriDialogue(raw);
            resetGlobalBackoffStrike();
            await setCached(handle, { ok: true, dialogue });
            await scheduleArchiveSave(handle, dialogue, body, "openrouter");
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
        if (r.errorCode === "E_YUKKURI_LLM_UPSTREAM_429") {
          const seconds = nextGlobalBackoffSeconds();
          await setGlobalBackoff(seconds);
          modelCooldownUntil.set(model, Date.now() + OPENROUTER_MODEL_COOLDOWN_MS);
          hardStop = true;
        } else if (
          r.errorCode === "E_YUKKURI_LLM_UPSTREAM_401" ||
          r.errorCode === "E_YUKKURI_LLM_UPSTREAM_402"
        ) {
          hardStop = true;
        } else if (r.errorCode === "E_YUKKURI_LLM_UPSTREAM_404") {
          modelCooldownUntil.set(model, Date.now() + OPENROUTER_MODEL_COOLDOWN_MS);
        }
      }
    }
  }

  if (failures.length > 0) {
    const fallback = buildFallbackDialogue(body, profile, official);
    if (handle) {
      await setCached(handle, { ok: true, dialogue: fallback });
    }
    await scheduleArchiveSave(handle, fallback, body, "fallback_llm");
    console.warn(
      `[yukkuri-explain] fallback_llm handle=${handle || "-"} failures=${JSON.stringify(
        failures.map((f) => (f.ok ? null : { m: f.model, c: f.errorCode, s: f.status, e: f.elapsedMs }))
      )}`
    );
    return NextResponse.json({
      ...fallback,
      degraded: true,
      source: "fallback_llm",
    });
  }

  // どの provider も試されていない/成功もしていない（想定外）
  return NextResponse.json(
    { error: "解説生成に失敗しました", error_code: "E_YUKKURI_UNEXPECTED" },
    { status: 500 }
  );
}
