import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-connection",
  "te",
  "trailer",
]);

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const pathStr = (path ?? []).join("/");
    const search = req.nextUrl.search;
    const target = `https://frontend-api.clerk.services/${pathStr}${search}`;

    const headers = new Headers();
    req.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower !== "host" && !HOP_BY_HOP.has(lower)) {
        headers.set(key, value);
      }
    });

    const body =
      req.method === "GET" || req.method === "HEAD" ? undefined : req.body;

    const res = await fetch(target, {
      method: req.method,
      headers,
      body,
    });

    const resHeaders = new Headers();
    res.headers.forEach((value, key) => {
      if (!HOP_BY_HOP.has(key.toLowerCase())) {
        resHeaders.set(key, value);
      }
    });

    return new NextResponse(res.body, {
      status: res.status,
      headers: resHeaders,
    });
  } catch (err) {
    console.error("[clerk-proxy] error:", err);
    return NextResponse.json(
      { error: "proxy error", detail: String(err) },
      { status: 502 }
    );
  }
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const HEAD = handler;
export const OPTIONS = handler;
