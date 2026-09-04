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

const BOT_COMMANDS = [
  { command: "start", description: "Iniciar conversación y ver bienvenida" },
  { command: "help", description: "Ver ayuda y qué puede hacer el bot" },
  { command: "plans", description: "Ver planes y precios de ConversaAI" },
  { command: "contact", description: "Contactar soporte humano" },
  { command: "demo", description: "Cómo crear tu primer asistente IA" },
  { command: "commands", description: "Ver todos los comandos disponibles" },
];

export async function GET(req: NextRequest) {
  const setupSecret = process.env.SETUP_SECRET;
  const incomingSecret = req.headers.get("x-setup-secret");

  if (!validSetupSecret(incomingSecret, setupSecret)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Telegram bot is not configured" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands: BOT_COMMANDS }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[GET /api/telegram/set-commands] Telegram request failed", res.status);
      return NextResponse.json({ error: "Could not register bot commands" }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }

    const data: unknown = await res.json();
    if (!data || typeof data !== "object" || !("ok" in data) || (data as { ok?: unknown }).ok !== true) {
      return NextResponse.json({ error: "Telegram rejected the command update" }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ ok: true, commands: BOT_COMMANDS }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(
      "[GET /api/telegram/set-commands] exception",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json({ error: "Could not register bot commands" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
