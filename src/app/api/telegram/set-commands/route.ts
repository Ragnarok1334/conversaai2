import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

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

  if (!setupSecret || !incomingSecret || incomingSecret.length > 512 || incomingSecret !== setupSecret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Telegram bot is not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands: BOT_COMMANDS }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error("[GET /api/telegram/set-commands] Telegram request failed", res.status);
      return NextResponse.json({ error: "Could not register bot commands" }, { status: 502 });
    }

    const data: unknown = await res.json();
    if (!data || typeof data !== "object" || !("ok" in data) || (data as { ok?: unknown }).ok !== true) {
      return NextResponse.json({ error: "Telegram rejected the command update" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, commands: BOT_COMMANDS });
  } catch (error) {
    console.error(
      "[GET /api/telegram/set-commands] exception",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json({ error: "Could not register bot commands" }, { status: 502 });
  }
}
