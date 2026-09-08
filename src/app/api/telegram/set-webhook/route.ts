import { NextRequest, NextResponse } from "next/server";
import { secretsMatch } from "@/lib/http-security";

export const runtime = "nodejs";

// POST avoids exposing the setup secret in URLs, logs and browser history.
export async function POST(req: NextRequest) {
  const setupSecret = process.env.SETUP_SECRET;
  const incomingSecret = req.headers.get("x-setup-secret");

  if (!secretsMatch(incomingSecret, setupSecret)) {
    return NextResponse.json(
      { error: "Forbidden." },
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
