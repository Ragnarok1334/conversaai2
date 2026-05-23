// ─── URL Validation Helpers for Telegram Inline Buttons ──────────────────────
// Telegram only accepts http:// and https:// URLs in inline keyboard buttons.
// mailto:, tel:, tg:, and other schemes are rejected with BUTTON_URL_INVALID.

const FALLBACK_URL = "https://conversaai.store/contact";

/**
 * Returns true only if the URL is safe to use in a Telegram InlineKeyboard button.
 * Telegram requires http:// or https:// scheme.
 */
export function isValidTelegramButtonUrl(url: string | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Returns the URL if valid for Telegram buttons, otherwise returns the fallback.
 * Always logs a warning when falling back.
 */
export function safeUrl(url: string | undefined, fallback: string = FALLBACK_URL): string {
  if (isValidTelegramButtonUrl(url)) {
    return url as string;
  }
  console.warn(`[ConversaBot] Invalid button URL replaced with fallback. Original: "${url}" → Fallback: "${fallback}"`);
  return fallback;
}
