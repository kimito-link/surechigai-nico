import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const DEFAULT_SPEAKERS = { rink: 3, konta: 2, tanunee: 8 } as const;
const MAX_TEXT_LEN = 500;

function normalizeBase(url: string) {
  return url.replace(/\/$/, "");
}

function parseSpeakerId(raw: string | undefined, fallback: number): number {
  if (raw == null || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function resolveSpeakerId(speaker: string): number | null {
  if (speaker === "rink") {
    return parseSpeakerId(process.env.VOICEVOX_SPEAKER_RINK, DEFAULT_SPEAKERS.rink);
  }
  if (speaker === "konta") {
    return parseSpeakerId(process.env.VOICEVOX_SPEAKER_KONTA, DEFAULT_SPEAKERS.konta);
  }
  if (speaker === "tanunee") {
    return parseSpeakerId(process.env.VOICEVOX_SPEAKER_TANUNEE, DEFAULT_SPEAKERS.tanunee);
  }
  return null;
}

/** VOICEVOX エンジンへ 1 行合成 */
async function synthesizeToWav(
  baseUrl: string,
  text: string,
  speakerId: number
): Promise<ArrayBuffer> {
  const base = normalizeBase(baseUrl);
  const q = `${base}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`;
  const aqRes = await fetch(q, {
    method: "POST",
    signal: AbortSignal.timeout(90_000),
  });
  if (!aqRes.ok) {
    throw new Error(`audio_query HTTP ${aqRes.status}`);
  }
  const audioQuery = await aqRes.json();
  const synRes = await fetch(`${base}/synthesis?speaker=${speakerId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(audioQuery),
    signal: AbortSignal.timeout(90_000),
  });
  if (!synRes.ok) {
    throw new Error(`synthesis HTTP ${synRes.status}`);
  }
  return synRes.arrayBuffer();
}

/** 設定確認（エンジン /version） */
export async function GET() {
  const base = process.env.VOICEVOX_BASE_URL?.trim();
  if (!base) {
    return NextResponse.json({ configured: false, reachable: null });
  }
  try {
    const r = await fetch(`${normalizeBase(base)}/version`, {
      signal: AbortSignal.timeout(4000),
    });
    return NextResponse.json({ configured: true, reachable: r.ok });
  } catch {
    return NextResponse.json({ configured: true, reachable: false });
  }
}

type Body = { text?: string; speaker?: string };

export async function POST(req: NextRequest) {
  const base = process.env.VOICEVOX_BASE_URL?.trim();
  if (!base) {
    return NextResponse.json(
      {
        error:
          "VOICEVOX_BASE_URL が未設定です。エンジンを起動し .env に http://127.0.0.1:50021 等を設定してください。",
      },
      { status: 503 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "JSON が不正です" }, { status: 400 });
  }

  const textRaw = typeof body.text === "string" ? body.text.trim() : "";
  if (!textRaw) {
    return NextResponse.json({ error: "text が空です" }, { status: 400 });
  }
  const text = textRaw.slice(0, MAX_TEXT_LEN);

  const speakerKey = typeof body.speaker === "string" ? body.speaker.trim() : "";
  const speakerId = resolveSpeakerId(speakerKey);
  if (speakerId == null) {
    return NextResponse.json(
      { error: "speaker は rink / konta / tanunee のいずれかです" },
      { status: 400 }
    );
  }

  try {
    const wav = await synthesizeToWav(base, text, speakerId);
    return new NextResponse(wav, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "合成に失敗しました";
    return NextResponse.json(
      {
        error: `VOICEVOX: ${msg}。エンジンが起動しているか確認してください。`,
      },
      { status: 502 }
    );
  }
}
