import { InlineKeyboard } from "grammy";
import { CONTACT_INFO } from "@/lib/contact";

export function mainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .url("🌐 Sitio Web", "https://conversaai.store")
    .url("📝 Crear cuenta gratis", "https://conversaai.store/register")
    .row()
    .url("💎 Ver planes", "https://conversaai.store/#precios")
    .url("💬 WhatsApp", CONTACT_INFO.whatsapp)
    .row()
    .url("📬 Contacto", "https://conversaai.store/contact");
}

export function plansKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .url("✨ Crear cuenta gratis", "https://conversaai.store/register")
    .row()
    .url("🔍 Ver todos los planes", "https://conversaai.store/#precios");
}

export function contactKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .url("💬 WhatsApp", CONTACT_INFO.whatsapp)
    .url("✈️ Telegram", CONTACT_INFO.telegram)
    .row()
    .url("📧 Email", `mailto:${CONTACT_INFO.email}`)
    .url("🌐 Web", "https://conversaai.store/contact");
}

export function demoKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .url("🚀 Comenzar ahora", "https://conversaai.store/register")
    .row()
    .url("📖 Ver funciones", "https://conversaai.store/#funciones");
}
