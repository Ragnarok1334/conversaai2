import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// ─── GET ─ check current webhook status ──────────────────────────────────────
export async function GET(req: NextRequest) {
  const setupSecret = process.env.SETUP_SECRET;
  const { searchParams } = new URL(req.url);
  const incomingSecret = searchParams.get("secret");

  if (!setupSecret || incomingSecret !== setupSecret) {
    return NextResponse.json(
      { error: "Forbidden. Provide ?secret=YOUR_SETUP_SECRET in the URL." },
      { status: 403 }
    );
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN not configured." },
      { status: 500 }
    );
  }

  const res = await fetch(
    `https://api.telegram.org/bot${token}/getWebhookInfo`
  );

  const data = await res.json();

  return NextResponse.json({
    ok: data.ok,
    webhookInfo: data.result,
  });
}
