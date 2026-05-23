import { NextRequest, NextResponse } from "next/server";
import { createBotWebhookHandler } from "@/lib/telegram/bot";

export const runtime = "nodejs";

// ─── GET ─ health check ──────────────────────────────────────────────────────
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Telegram webhook active",
    timestamp: new Date().toISOString(),
  });
}

// ─── POST ─ receive Telegram updates ────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // Validate webhook secret (recommended by Telegram)
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (webhookSecret) {
      const incomingSecret = req.headers.get("x-telegram-bot-api-secret-token");
      if (incomingSecret !== webhookSecret) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
    }

    const handler = createBotWebhookHandler();
    return await handler(req);
  } catch (err: any) {
    // Never expose internal errors or tokens
    console.error("[Webhook] Error processing update:", err?.message);
    // Return 200 to prevent Telegram from disabling the webhook
    return new NextResponse("OK", { status: 200 });
  }
}
