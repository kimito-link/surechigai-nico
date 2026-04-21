import { NextRequest, NextResponse } from "next/server";
import https from "node:https";
import type { IncomingHttpHeaders } from "node:http";

export const runtime = "nodejs";

// fetch() は host ヘッダーを禁止しているため node:https を使用
const FAPI_HOSTNAME = "frontend-api.clerk.services";
const PROXY_URL = "https://surechigai-nico.link/api/clerk-proxy";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
  "proxy-connection",
  "te",
  "trailer",
]);

function httpsRequest(
  options: https.RequestOptions,
  body?: Buffer
): Promise<{ status: number; headers: IncomingHttpHeaders; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () =>
        resolve({
          status: res.statusCode ?? 500,
          headers: res.headers,
          body: Buffer.concat(chunks),
        })
      );
      res.on("error", reject);
    });
    req.on("error", reject);
    if (body && body.length > 0) req.write(body);
    req.end();
  });
}

async function handler(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const pathStr = (path ?? []).join("/");
    const search = req.nextUrl.search;

    const forwardHeaders: Record<string, string> = {
      host: FAPI_HOSTNAME,
      "clerk-proxy-url": PROXY_URL,
    };
    req.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower !== "host" && !HOP_BY_HOP.has(lower)) {
        forwardHeaders[lower] = value;
      }
    });

    const reqBody =
      req.method === "GET" || req.method === "HEAD"
        ? undefined
        : Buffer.from(await req.arrayBuffer());

    const clerkRes = await httpsRequest(
      {
        hostname: FAPI_HOSTNAME,
        port: 443,
        path: `/${pathStr}${search}`,
        method: req.method,
        headers: forwardHeaders,
      },
      reqBody
    );

    const resHeaders = new Headers();
    Object.entries(clerkRes.headers).forEach(([key, value]) => {
      if (!HOP_BY_HOP.has(key.toLowerCase()) && value) {
        resHeaders.set(key, Array.isArray(value) ? value.join(", ") : value);
      }
    });

    return new NextResponse(new Uint8Array(clerkRes.body), {
      status: clerkRes.status,
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
