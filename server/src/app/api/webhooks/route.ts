import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

function unsupportedWebhook(req: NextRequest) {
  console.warn("Webhook endpoint is not configured yet:", req.nextUrl.pathname);
  return Response.json(
    {
      error: "webhook endpoint is not configured",
      path: req.nextUrl.pathname,
    },
    { status: 501 }
  );
}

export async function GET(req: NextRequest) {
  return unsupportedWebhook(req);
}

export async function POST(req: NextRequest) {
  return unsupportedWebhook(req);
}

export async function PUT(req: NextRequest) {
  return unsupportedWebhook(req);
}

export async function PATCH(req: NextRequest) {
  return unsupportedWebhook(req);
}

export async function DELETE(req: NextRequest) {
  return unsupportedWebhook(req);
}
