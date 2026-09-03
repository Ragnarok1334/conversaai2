import { NextRequest, NextResponse } from "next/server";
import { createBotWebhookHandler } from "@/lib/telegram/bot";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 128 * 1024;

export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!webhookSecret || webhookSecret.length < 16) {
    console.error("[Webhook] TELEGRAM_WEBHOOK_SECRET is not configured securely.");
    return new NextResponse("Service unavailable", { status: 503 });
  }

  const incomingSecret = req.headers.get("x-telegram-bot-api-secret-token");
  if (!incomingSecret || incomingSecret.length !== webhookSecret.length || incomingSecret !== webhookSecret) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const contentLength = Number.parseInt(req.headers.get("content-length") || "", 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return new NextResponse("Payload too large", { status: 413 });
  }

  try {
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
      return new NextResponse("Payload too large", { status: 413 });
    }

    const replayRequest = new Request(req.url, {
      method: "POST",
      headers: req.headers,
      body: rawBody,
    });

    const handler = createBotWebhookHandler();
    const DEADLINE_MS = 8500;
    const timeoutPromise = new Promise<NextResponse>((resolve) =>
      setTimeout(() => resolve(new NextResponse("OK", { status: 200 })), DEADLINE_MS)
    );

    const handlerPromise = handler(replayRequest).catch((err: unknown) => {
      console.error("[Webhook] Handler error:", err instanceof Error ? err.message : "Unknown error");
      return new NextResponse("OK", { status: 200 });
    });

    return await Promise.race([handlerPromise, timeoutPromise]);
  } catch (error: unknown) {
    console.error("[Webhook] Unexpected error:", error instanceof Error ? error.message : "Unknown error");
    return new NextResponse("OK", { status: 200 });
  }
}
