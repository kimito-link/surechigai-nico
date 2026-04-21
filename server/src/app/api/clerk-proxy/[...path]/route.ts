import { NextRequest, NextResponse } from "next/server";

// Clerk の実際のバックエンド（Cloudflare 上にある）
const FAPI_ORIGIN = "https://frontend-api.clerk.services";
// Clerk に渡す Host ヘッダー（どのインスタンスか識別）
const FAPI_HOST = "clerk.surechigai-nico.link";

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
  const { path } = await params;
  const pathStr = (path ?? []).join("/");
  const search = req.nextUrl.search;
  const targetUrl = `${FAPI_ORIGIN}/${pathStr}${search}`;

  const forwardHeaders = new Headers();
  req.headers.forEach((value, key) => {
    if (key.toLowerCase() !== "host" && !HOP_BY_HOP.has(key.toLowerCase())) {
      forwardHeaders.set(key, value);
    }
  });
  forwardHeaders.set("host", FAPI_HOST);

  const body =
    req.method === "GET" || req.method === "HEAD"
      ? undefined
      : await req.arrayBuffer();

  const clerkRes = await fetch(targetUrl, {
    method: req.method,
    headers: forwardHeaders,
    body,
  });

  const resHeaders = new Headers();
  clerkRes.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      resHeaders.set(key, value);
    }
  });

  return new NextResponse(clerkRes.body, {
    status: clerkRes.status,
    statusText: clerkRes.statusText,
    headers: resHeaders,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const HEAD = handler;
export const OPTIONS = handler;
