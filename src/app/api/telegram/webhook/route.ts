import { NextRequest, NextResponse } from "next/server";
import { createBotWebhookHandler } from "@/lib/telegram/bot";
import { secretsMatch } from "@/lib/http-security";

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
  if (!webhookSecret) {
    console.error("[Webhook] TELEGRAM_WEBHOOK_SECRET is not configured.");
    return new NextResponse("Webhook unavailable", { status: 503 });
  }

  const incomingSecret = req.headers.get("x-telegram-bot-api-secret-token");
  if (!secretsMatch(incomingSecret, webhookSecret)) {
    // Return 200 so Telegram does not retry attacker-generated payloads.
    console.warn("[Webhook] Received request with invalid secret token.");
    return new NextResponse("OK", { status: 200 });
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlerPromise = handler(req).catch((err: any) => {
      // Handle errors from grammY or our bot handlers — never expose internals
      console.error("[Webhook] Handler error:", err?.message ?? "Unknown error");
      return new NextResponse("OK", { status: 200 });
    });

    return await Promise.race([handlerPromise, timeoutPromise]);
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errMessage = (error as any)?.message || String(error);
    console.error("[Webhook] Unexpected error:", errMessage);
    // Always return 200 so Telegram doesn't retry and disable the webhook
    return new NextResponse("OK", { status: 200 });
  }
}
