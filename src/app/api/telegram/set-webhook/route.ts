import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

export const runtime = "nodejs";

const MAX_SETUP_SECRET_LENGTH = 512;

function validSetupSecret(incomingSecret: string | null, setupSecret: string | undefined) {
  if (!setupSecret || setupSecret.length < 16 || setupSecret.length > MAX_SETUP_SECRET_LENGTH) return false;
  if (!incomingSecret || incomingSecret.length > MAX_SETUP_SECRET_LENGTH) return false;

  const incoming = Buffer.from(incomingSecret, "utf8");
  const expected = Buffer.from(setupSecret, "utf8");
  return incoming.length === expected.length && timingSafeEqual(incoming, expected);
}

// GET /api/telegram/set-webhook
// This is an operational endpoint. Keep the setup secret out of URLs because
// query strings can be retained in browser history, proxy logs and analytics.
export async function GET(req: NextRequest) {
  const setupSecret = process.env.SETUP_SECRET;
  const incomingSecret = req.headers.get("x-setup-secret");

  if (!validSetupSecret(incomingSecret, setupSecret)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!token || !siteUrl || !webhookSecret) {
    return NextResponse.json({ error: "Telegram webhook configuration is incomplete." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  if (webhookSecret.length < 16 || webhookSecret.length > MAX_SETUP_SECRET_LENGTH) {
    return NextResponse.json({ error: "Telegram webhook configuration is invalid." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(siteUrl);
    if (baseUrl.protocol !== "https:") throw new Error("HTTPS required");
  } catch {
    return NextResponse.json({ error: "Application URL configuration is invalid." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  const webhookUrl = new URL("/api/telegram/webhook", baseUrl).toString();
  const telegramApiUrl = `https://api.telegram.org/bot${token}/setWebhook`;

  try {
    const res = await fetch(telegramApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl, secret_token: webhookSecret }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error("[GET /api/telegram/set-webhook] Telegram returned HTTP", res.status);
      return NextResponse.json({ error: "No se pudo configurar el webhook de Telegram." }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }

    let data: { ok?: boolean };
    try {
      data = await res.json();
    } catch {
      return NextResponse.json({ error: "Respuesta inválida de Telegram." }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }

    if (data.ok !== true) {
      console.error("[GET /api/telegram/set-webhook] Telegram rejected webhook registration");
      return NextResponse.json({ error: "Telegram rechazó la configuración del webhook." }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ ok: true, configured: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(
      "[GET /api/telegram/set-webhook] exception",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json({ error: "No se pudo configurar el webhook de Telegram." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
