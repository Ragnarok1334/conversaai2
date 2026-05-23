import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// ─── GET ─ register webhook with Telegram ────────────────────────────────────
export async function GET(req: NextRequest) {
  // Protect with SETUP_SECRET query param
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!token) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN not configured." },
      { status: 500 }
    );
  }

  if (!siteUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_SITE_URL not configured." },
      { status: 500 }
    );
  }

  const webhookUrl = `${siteUrl}/api/telegram/webhook`;

  const telegramApiUrl = `https://api.telegram.org/bot${token}/setWebhook`;

  const body: Record<string, string> = { url: webhookUrl };
  if (webhookSecret) {
    body.secret_token = webhookSecret;
  }

  const res = await fetch(telegramApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  return NextResponse.json({
    ok: data.ok,
    webhookUrl,
    telegramResponse: data,
  });
}
