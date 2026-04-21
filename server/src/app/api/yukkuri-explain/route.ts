import { NextRequest, NextResponse } from "next/server";

const MODEL = "google/gemma-2-9b-it:free";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM_PROMPT = `あなたはニコニコ超会議2026「すれちがいライト」アプリのガイドキャラクター3人です。
クリエイタークロス参加者を紹介するゆっくり解説を行います。

キャラクター設定:
- rink（りんく）: 明るく元気な応援系。語尾は「〜だよ！」「〜すごいね！」。2文以内。
- konta（こん太）: 知識豊富で説明上手。「〜なんだよ！」「なるほど〜」が口癖。2文以内。
- tanunee（たぬ姉）: 温かく包容力のある姉御肌。「〜だよね〜」「応援してるよ！」が口癖。2文以内。

必ず以下のJSON形式のみで返答してください。余分なテキストは不要です:
{"rink":"セリフ","konta":"セリフ","tanunee":"セリフ"}`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY が未設定です" }, { status: 500 });
  }

  const body = await req.json() as {
    name?: string;
    booth?: string;
    hallLabel?: string;
    sub?: string;
    intro?: string;
  };

  const lines = [
    body.name     ? `参加者名: ${body.name}` : null,
    body.booth    ? `ブース: ${body.booth}` : null,
    body.hallLabel? `場所: ${body.hallLabel}` : null,
    body.sub      ? `ジャンル/日程: ${body.sub}` : null,
    body.intro    ? `紹介文: ${body.intro}` : null,
  ].filter(Boolean).join("\n");

  const userMessage = `以下の参加者を3人でゆっくり紹介してください:\n${lines}`;

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
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        max_tokens: 400,
        temperature: 0.85,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText }, { status: res.status });
    }

    const data = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content ?? "";

    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "不正なレスポンス形式", raw: text }, { status: 500 });
    }

    const dialogue = JSON.parse(jsonMatch[0]) as {
      rink: string;
      konta: string;
      tanunee: string;
    };
    return NextResponse.json(dialogue);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
