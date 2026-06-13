export const CONTACT_INFO = {
  // Plain email address — used in text messages only, NOT in inline buttons
  email: "contacto@conversaai.store",

  // WhatsApp — must be https://wa.me/PHONENUMBER (no spaces, no dashes)
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER 
    ? `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}`
    : null,

  // Telegram bot — must be https://t.me/USERNAME (no @ symbol)
  telegram: process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || "https://t.me/conversaaix",

  // Schedule text (displayed in messages, not as a URL)
  schedule: "Lunes a viernes, 8:00 a 18:00"
}
