import { Bot, webhookCallback } from "grammy";
import {
  welcomeMessage,
  helpMessage,
  plansMessage,
  contactMessage,
  demoMessage,
  fallbackMessage,
} from "@/lib/telegram/messages";
import {
  mainMenuKeyboard,
  contactKeyboard,
  plansKeyboard,
  demoKeyboard,
} from "@/lib/telegram/keyboards";
import { generateConversaBotReply } from "@/lib/telegram/openai-bot";

// ─── Lead Saving (best-effort, non-blocking) ─────────────────────────────────
async function saveTelegramLead(
  telegramUserId: string,
  username: string | undefined,
  firstName: string | undefined,
  lastName: string | undefined,
  message: string
) {
  try {
    // Dynamic import to avoid build-time issues if supabase server is unavailable
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    await supabase.from("telegram_bot_leads").insert({
      telegram_user_id: telegramUserId,
      username: username ?? null,
      first_name: firstName ?? null,
      last_name: lastName ?? null,
      message,
      source: "telegram_official_bot",
    });
  } catch (err) {
    // Non-blocking — bot continues regardless of DB errors
    console.warn("[ConversaBot] Could not save lead:", err);
  }
}

// ─── Bot Factory ─────────────────────────────────────────────────────────────
export function createConversaBot(): Bot {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error(
      "[ConversaBot] TELEGRAM_BOT_TOKEN is not set. Bot cannot start."
    );
  }

  const bot = new Bot(token);

  // ── /start ──────────────────────────────────────────────────────────────────
  bot.command("start", async (ctx) => {
    const user = ctx.from;
    if (user) {
      await saveTelegramLead(
        String(user.id),
        user.username,
        user.first_name,
        user.last_name,
        "/start"
      );
    }

    await ctx.reply(welcomeMessage, {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard(),
    });
  });

  // ── /help ───────────────────────────────────────────────────────────────────
  bot.command("help", async (ctx) => {
    await ctx.reply(helpMessage, {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard(),
    });
  });

  // ── /plans ──────────────────────────────────────────────────────────────────
  bot.command("plans", async (ctx) => {
    const user = ctx.from;
    if (user) {
      await saveTelegramLead(
        String(user.id),
        user.username,
        user.first_name,
        user.last_name,
        "/plans"
      );
    }

    await ctx.reply(plansMessage, {
      parse_mode: "Markdown",
      reply_markup: plansKeyboard(),
    });
  });

  // ── /contact ─────────────────────────────────────────────────────────────────
  bot.command("contact", async (ctx) => {
    await ctx.reply(contactMessage, {
      parse_mode: "Markdown",
      reply_markup: contactKeyboard(),
    });
  });

  // ── /demo ─────────────────────────────────────────────────────────────────
  bot.command("demo", async (ctx) => {
    await ctx.reply(demoMessage, {
      parse_mode: "Markdown",
      reply_markup: demoKeyboard(),
    });
  });

  // ── Free-text messages → OpenAI ─────────────────────────────────────────────
  bot.on("message:text", async (ctx) => {
    const user = ctx.from;
    const userMessage = ctx.message.text;

    if (user) {
      await saveTelegramLead(
        String(user.id),
        user.username,
        user.first_name,
        user.last_name,
        userMessage
      );
    }

    // Typing indicator
    await ctx.replyWithChatAction("typing");

    try {
      const reply = await generateConversaBotReply(userMessage);
      await ctx.reply(reply, {
        reply_markup: mainMenuKeyboard(),
      });
    } catch (err) {
      console.error("[ConversaBot] Reply error:", err);
      await ctx.reply(fallbackMessage);
    }
  });

  // ── Global error handler ─────────────────────────────────────────────────────
  bot.catch((err) => {
    console.error("[ConversaBot] Unhandled error:", err.message);
  });

  return bot;
}

// ─── Webhook Handler Factory ─────────────────────────────────────────────────
export function createBotWebhookHandler() {
  const bot = createConversaBot();
  return webhookCallback(bot, "std/http");
}
