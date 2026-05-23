import { NextRequest, NextResponse } from "next/server";
import { createBotWebhookHandler } from "@/lib/telegram/bot";

export const runtime = "nodejs";

// ─── GET ─ health check ───────────────────────────────────────────────────────
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Telegram webhook active",
    timestamp: new Date().toISOString(),
  });
}

// ─── POST ─ receive Telegram updates ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Step 1: Validate webhook secret before doing any work
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (webhookSecret) {
    const incomingSecret = req.headers.get("x-telegram-bot-api-secret-token");
    if (incomingSecret !== webhookSecret) {
      // Return 200 even on auth failure — returning 4xx makes Telegram retry the update forever
      console.warn("[Webhook] Received request with invalid secret token.");
      return new NextResponse("OK", { status: 200 });
    }
  }

  try {
    const handler = createBotWebhookHandler();

    // Race against a hard deadline so we always respond before Vercel's 10s limit
    const DEADLINE_MS = 8500;
    const timeoutPromise = new Promise<NextResponse>((resolve) =>
      setTimeout(
        () => resolve(new NextResponse("OK", { status: 200 })),
        DEADLINE_MS
      )
    );

    const handlerPromise = handler(req).catch((err: any) => {
      // Handle errors from grammY or our bot handlers — never expose internals
      console.error("[Webhook] Handler error:", err?.message ?? "Unknown error");
      return new NextResponse("OK", { status: 200 });
    });

    return await Promise.race([handlerPromise, timeoutPromise]);
  } catch (err: any) {
    console.error("[Webhook] Unexpected error:", err?.message ?? "Unknown error");
    // Always return 200 so Telegram doesn't retry and disable the webhook
    return new NextResponse("OK", { status: 200 });
  }
}
