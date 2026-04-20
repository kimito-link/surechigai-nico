import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Clerkウェブフック署名検証（簡易実装）
 * 本番環境では Svix SDK を使うことを推奨
 */
export async function verifyClerkWebhookSignature(
  req: NextRequest
): Promise<{ payload: Record<string, unknown>; isValid: boolean }> {
  const payload = await req.json();
  const headers = req.headers;

  const msgId = headers.get("svix-id");
  const msgSignature = headers.get("svix-signature");
  const msgTimestamp = headers.get("svix-timestamp");

  if (!msgId || !msgSignature || !msgTimestamp) {
    return { payload, isValid: false };
  }

  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("CLERK_WEBHOOK_SECRET が設定されていません。開発環境では署名検証をスキップします。");
    return { payload, isValid: true };
  }

  try {
    const signedContent = `${msgId}.${msgTimestamp}.${JSON.stringify(payload)}`;
    const signature = Buffer.from(msgSignature, "base64");
    const secretBytes = Buffer.from(secret, "base64");

    const expectedSignature = createHmac("sha256", secretBytes)
      .update(signedContent)
      .digest();

    const isValid = timingSafeEqual(signature, expectedSignature);
    return { payload, isValid };
  } catch (error) {
    console.error("Webhook signature verification error:", error);
    return { payload, isValid: false };
  }
}
