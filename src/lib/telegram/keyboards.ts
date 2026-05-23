import { InlineKeyboard } from "grammy";
import { CONTACT_INFO } from "@/lib/contact";
import { safeUrl } from "@/lib/telegram/safe-url";

// Centralized safe URLs — all validated at module load time
const SITE          = "https://conversaai.store";
const REGISTER_URL  = safeUrl("https://conversaai.store/register");
const PLANS_URL     = safeUrl("https://conversaai.store/#precios");
const CONTACT_URL   = safeUrl("https://conversaai.store/contact");
const FEATURES_URL  = safeUrl("https://conversaai.store/#funciones");
const WHATSAPP_URL  = safeUrl(CONTACT_INFO.whatsapp, CONTACT_URL);
const TELEGRAM_URL  = safeUrl(CONTACT_INFO.telegram, CONTACT_URL);

// ─── Main Menu ────────────────────────────────────────────────────────────────
export function mainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .url("📝 Crear cuenta gratis", REGISTER_URL)
    .url("💎 Ver planes", PLANS_URL)
    .row()
    .url("💬 WhatsApp", WHATSAPP_URL)
    .url("🌐 Sitio web", SITE);
}

// ─── Plans ────────────────────────────────────────────────────────────────────
export function plansKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .url("✨ Crear cuenta gratis", REGISTER_URL)
    .row()
    .url("🔍 Ver todos los planes", PLANS_URL)
    .url("💬 WhatsApp", WHATSAPP_URL);
}

// ─── Contact ──────────────────────────────────────────────────────────────────
// NOTE: mailto: is NOT supported in Telegram inline buttons (causes BUTTON_URL_INVALID).
// We always link to the web contact page for email.
export function contactKeyboard(): InlineKeyboard {
  const kb = new InlineKeyboard()
    .url("💬 WhatsApp", WHATSAPP_URL)
    .url("🌐 Contacto web", CONTACT_URL);

  // Only add Telegram button if URL is a valid t.me link
  if (TELEGRAM_URL !== CONTACT_URL) {
    kb.row().url("✈️ Telegram", TELEGRAM_URL);
  }

  return kb;
}

// ─── Demo ─────────────────────────────────────────────────────────────────────
export function demoKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .url("🚀 Comenzar ahora", REGISTER_URL)
    .row()
    .url("📖 Ver funciones", FEATURES_URL)
    .url("💬 WhatsApp", WHATSAPP_URL);
}

// ─── Commands ─────────────────────────────────────────────────────────────────
export function commandsKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .url("📝 Crear cuenta", REGISTER_URL)
    .url("💎 Ver planes", PLANS_URL)
    .row()
    .url("📬 Contacto", CONTACT_URL);
}
