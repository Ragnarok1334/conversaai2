import { CONTACT_INFO } from "@/lib/contact";

const SITE = "https://conversaai.store";

// ─── Welcome / Start ──────────────────────────────────────────────────────────
export const welcomeMessage = `👋 *¡Hola! Soy el bot oficial de ConversaAI.*

Puedo ayudarte a conocer la plataforma, revisar planes, resolver dudas y guiarte para crear tu primer asistente de IA.

*Comandos útiles:*
/plans — Ver planes y precios
/demo — Cómo crear tu asistente
/contact — Hablar con soporte
/commands — Ver todos los comandos

También puedes escribirme directamente y te responderé con IA. 🤖`;

// ─── Help ─────────────────────────────────────────────────────────────────────
export const helpMessage = `🤖 *Ayuda — ConversaAI Bot*

*¿Qué es ConversaAI?*
Una plataforma SaaS para crear asistentes de inteligencia artificial que automatizan conversaciones, captan leads y atienden clientes las 24 horas.

*¿Qué puede hacer este bot?*
• Responder tus preguntas sobre ConversaAI
• Mostrarte planes y precios
• Guiarte para crear tu primer asistente
• Conectarte con nuestro equipo

*Comandos disponibles:*
/start — Menú principal
/plans — Ver planes y precios
/demo — Cómo empezar paso a paso
/contact — Contactar soporte
/commands — Ver todos los comandos

*¿Necesitas ayuda humana?*
Usa /contact para escribirnos por WhatsApp o correo.

🌐 ${SITE}`;

// ─── Plans ────────────────────────────────────────────────────────────────────
export const plansMessage = `💎 *Planes de ConversaAI*

Elige el plan que mejor se adapta a tu negocio:

🆓 *Free — $0/mes*
• 1 asistente
• 100 mensajes/mes
• Webchat básico

⚡ *Pro — $19/mes*
• 5 asistentes
• 5,000 mensajes/mes
• Telegram + WhatsApp
• Captura de leads

🚀 *Business — $49/mes*
• 20 asistentes
• 50,000 mensajes/mes
• Todos los canales
• Analytics avanzado

🏢 *Enterprise — Personalizado*
• Sin límites
• SLA garantizado
• Soporte dedicado

👉 Regístrate gratis en *conversaai.store*`;

// ─── Contact ──────────────────────────────────────────────────────────────────
// Note: We deliberately keep URLs out of message text so they don't conflict
// with inline button URLs. Text stays clean; links go in the keyboard.
export const contactMessage = `📬 *Puedes contactarnos por estos canales:*

💬 *WhatsApp* — Respuesta en minutos

${CONTACT_INFO.telegram && CONTACT_INFO.telegram.startsWith("https://t.me/") ? `✈️ *Telegram* — Escríbenos directo\n\n` : ""}📧 *Email* — ${CONTACT_INFO.email}

🕐 *Horario:* ${CONTACT_INFO.schedule}`;

// ─── Demo ─────────────────────────────────────────────────────────────────────
export const demoMessage = `🚀 *¿Cómo crear tu asistente de IA?*

Sigue estos 5 pasos:

*1️⃣ Crea tu cuenta*
Regístrate gratis en conversaai.store/register

*2️⃣ Crea tu asistente*
Define nombre, tono, objetivo y personalidad

*3️⃣ Agrega conocimiento*
FAQs, catálogos, horarios, servicios

*4️⃣ Pruébalo*
Usa el chat de prueba y ajusta las respuestas

*5️⃣ Conecta tu canal*
Publica en Telegram, WhatsApp o tu sitio web

¡Listo! Tu asistente atenderá clientes automáticamente 🎉`;

// ─── Commands ─────────────────────────────────────────────────────────────────
export const commandsMessage = `📋 *Comandos disponibles*

/start — Iniciar conversación y ver bienvenida
/help — Ver ayuda detallada
/plans — Ver planes y precios
/contact — Contactar soporte humano
/demo — Cómo crear tu primer asistente
/commands — Ver esta lista

💡 *Tip:* También puedes escribirme cualquier pregunta y te responderé con IA.`;

// ─── Fallback (OpenAI falla) ───────────────────────────────────────────────────
export const fallbackMessage = `Gracias por escribirnos. Ahora mismo no pude generar una respuesta automática, pero puedes usar /contact para hablar con nosotros directamente. 🙏`;
