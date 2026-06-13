import { Bot, webhookCallback } from "grammy";
import {
  welcomeMessage,
  helpMessage,
  plansMessage,
  contactMessage,
  demoMessage,
  commandsMessage,
  fallbackMessage,
} from "@/lib/telegram/messages";
import {
  mainMenuKeyboard,
  contactKeyboard,
  plansKeyboard,
  demoKeyboard,
  commandsKeyboard,
} from "@/lib/telegram/keyboards";
import { generateConversaBotReply } from "@/lib/telegram/openai-bot";

// ─── Lead Saving (best-effort, non-blocking) ──────────────────────────────────
async function saveTelegramLead(
  telegramUserId: string,
  username: string | undefined,
  firstName: string | undefined,
  lastName: string | undefined,
  message: string
) {
  try {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.warn("[ConversaBot] Could not save lead:", err?.message ?? err);
  }
}

// ─── Bot Factory ──────────────────────────────────────────────────────────────
export function createConversaBot(): Bot {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error(
      "[ConversaBot] TELEGRAM_BOT_TOKEN is not set. Bot cannot start."
    );
  }

  const bot = new Bot(token);

  // ── /start ────────────────────────────────────────────────────────────────────
  bot.command("start", async (ctx) => {
    const user = ctx.from;
    if (user) {
      saveTelegramLead(
        String(user.id),
        user.username,
        user.first_name,
        user.last_name,
        "/start"
      ).catch(() => {}); // fire-and-forget
    }

    await ctx.reply(welcomeMessage, {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard(),
    });
  });

  // ── /help ─────────────────────────────────────────────────────────────────────
  bot.command("help", async (ctx) => {
    await ctx.reply(helpMessage, {
      parse_mode: "Markdown",
      reply_markup: mainMenuKeyboard(),
    });
  });

  // ── /plans ────────────────────────────────────────────────────────────────────
  bot.command("plans", async (ctx) => {
    const user = ctx.from;
    if (user) {
      saveTelegramLead(
        String(user.id),
        user.username,
        user.first_name,
        user.last_name,
        "/plans"
      ).catch(() => {});
    }

    await ctx.reply(plansMessage, {
      parse_mode: "Markdown",
      reply_markup: plansKeyboard(),
    });
  });

  // ── /contact ──────────────────────────────────────────────────────────────────
  bot.command("contact", async (ctx) => {
    try {
      await ctx.reply(contactMessage, {
        parse_mode: "Markdown",
        reply_markup: contactKeyboard(),
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("[ConversaBot] /contact error:", err?.message ?? err);
      // Fallback: send plain text without parse_mode if Markdown fails
      try {
        await ctx.reply(
          "Puedes contactarnos por:\n\n• WhatsApp\n• Email: soporte@conversaai.store\n• Web: conversaai.store/contact",
          { reply_markup: contactKeyboard() }
        );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (fallbackErr: any) {
        console.error("[ConversaBot] /contact fallback error:", fallbackErr?.message);
      }
    }
  });

  // ── /demo ─────────────────────────────────────────────────────────────────────
  bot.command("demo", async (ctx) => {
    await ctx.reply(demoMessage, {
      parse_mode: "Markdown",
      reply_markup: demoKeyboard(),
    });
  });

  // ── /commands ─────────────────────────────────────────────────────────────────
  bot.command("commands", async (ctx) => {
    await ctx.reply(commandsMessage, {
      parse_mode: "Markdown",
      reply_markup: commandsKeyboard(),
    });
  });

  // ── Free-text → OpenAI ────────────────────────────────────────────────────────
  bot.on("message:text", async (ctx) => {
    const user = ctx.from;
    const userMessage = ctx.message.text;

    if (user) {
      saveTelegramLead(
        String(user.id),
        user.username,
        user.first_name,
        user.last_name,
        userMessage
      ).catch(() => {});
    }

    await ctx.replyWithChatAction("typing");

    try {
      const reply = await generateConversaBotReply(userMessage);
      await ctx.reply(reply, {
        reply_markup: mainMenuKeyboard(),
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("[ConversaBot] Reply error:", err?.message ?? err);
      await ctx.reply(fallbackMessage, {
        reply_markup: contactKeyboard(),
      });
    }
  });

  // ── Global error handler ──────────────────────────────────────────────────────
  bot.catch((err) => {
    console.error("[ConversaBot] Unhandled error:", err.message);
  });

  return bot;
}

// ─── Webhook Handler Factory ──────────────────────────────────────────────────
export function createBotWebhookHandler() {
  const bot = createConversaBot();
  return webhookCallback(bot, "std/http");
}
