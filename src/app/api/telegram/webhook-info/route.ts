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

export async function GET(req: NextRequest) {
  const setupSecret = process.env.SETUP_SECRET;
  const incomingSecret = req.headers.get("x-setup-secret");

  if (!validSetupSecret(incomingSecret, setupSecret)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Telegram bot is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error("[GET /api/telegram/webhook-info] Telegram request failed", res.status);
      return NextResponse.json({ error: "Could not retrieve webhook status." }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }

    const data: unknown = await res.json();
    if (!data || typeof data !== "object" || !("ok" in data) || (data as { ok?: unknown }).ok !== true) {
      return NextResponse.json({ error: "Telegram rejected the webhook status request." }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }

    const result = "result" in data && data.result && typeof data.result === "object"
      ? data.result as Record<string, unknown>
      : {};

    return NextResponse.json({
      ok: true,
      webhookInfo: {
        pending_update_count: typeof result.pending_update_count === "number" ? result.pending_update_count : 0,
        last_error_date: typeof result.last_error_date === "number" ? result.last_error_date : null,
        has_custom_certificate: result.has_custom_certificate === true,
        max_connections: typeof result.max_connections === "number" ? result.max_connections : null,
        ip_address: typeof result.ip_address === "string" ? result.ip_address : null,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(
      "[GET /api/telegram/webhook-info] exception",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json({ error: "Could not retrieve webhook status." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
