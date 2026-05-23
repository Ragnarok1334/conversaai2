import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BOT_COMMANDS = [
  { command: "start",    description: "Iniciar conversación y ver bienvenida" },
  { command: "help",     description: "Ver ayuda y qué puede hacer el bot" },
  { command: "plans",    description: "Ver planes y precios de ConversaAI" },
  { command: "contact",  description: "Contactar soporte humano" },
  { command: "demo",     description: "Cómo crear tu primer asistente IA" },
  { command: "commands", description: "Ver todos los comandos disponibles" },
];

// ─── GET ─ register bot commands with Telegram ────────────────────────────────
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
    `https://api.telegram.org/bot${token}/setMyCommands`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commands: BOT_COMMANDS }),
    }
  );

  const data = await res.json();

  return NextResponse.json({
    ok: data.ok,
    commands: BOT_COMMANDS,
    telegramResponse: data,
  });
}
