import { NextResponse, type NextRequest } from "next/server";

type BeaconBody = {
  kind?: string;
  name?: string;
  id?: string;
  value?: number;
  rating?: string;
  path?: string;
  sid?: string;
  ts?: number;
  payload?: Record<string, unknown>;
};

function isSafeBeacon(body: BeaconBody): boolean {
  if (typeof body.path === "string" && body.path.length > 2048) return false;
  if (typeof body.sid === "string" && body.sid.length > 128) return false;
  if (body.kind === "web_vital") {
    return typeof body.name === "string" && body.name.length > 0 && body.name.length < 64;
  }
  if (body.kind === "product") {
    return typeof body.name === "string" && body.name.length > 0 && body.name.length < 128;
  }
  return false;
}

/**
 * 匿名計測用ビーコン（PII を送らない）。本番ではログ基盤へ転送する前提で受け口のみ。
 */
export async function POST(req: NextRequest) {
  let body: BeaconBody;
  try {
    body = (await req.json()) as BeaconBody;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!isSafeBeacon(body)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.info("[analytics:beacon]", body.kind, body.name ?? body);
  }

  return new NextResponse(null, { status: 204 });
}
