import { NextRequest, NextResponse } from "next/server";
import { secretsMatch } from "@/lib/http-security";

export const runtime = "nodejs";

// ─── GET ─ check current webhook status ──────────────────────────────────────
export async function GET(req: NextRequest) {
  const setupSecret = process.env.SETUP_SECRET;
  const incomingSecret = req.headers.get("x-setup-secret");

  if (!secretsMatch(incomingSecret, setupSecret)) {
    return NextResponse.json(
      { error: "Forbidden." },
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
