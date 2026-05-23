import { CONTACT_INFO } from "@/lib/contact";

// ─── Welcome / Start ────────────────────────────────────────────────────────
export const welcomeMessage = `👋 *¡Hola! Soy el asistente oficial de ConversaAI.*

Te ayudo a automatizar conversaciones, captar leads y responder clientes con inteligencia artificial — las 24 horas, los 7 días de la semana.

¿En qué puedo ayudarte hoy?`;

// ─── Help ────────────────────────────────────────────────────────────────────
export const helpMessage = `🤖 *¿Cómo puedo ayudarte?*

*ConversaAI* es una plataforma SaaS que te permite crear asistentes de IA personalizados para tu negocio y conectarlos a tus canales de atención.

*Comandos disponibles:*
• /start — Menú principal
• /plans — Ver planes y precios
• /contact — Información de contacto
• /demo — Cómo empezar con ConversaAI

*¿Necesitas soporte humano?*
Escríbenos directamente por WhatsApp o correo y te atendemos a la brevedad.

🌐 *conversaai.store*`;

// ─── Plans ───────────────────────────────────────────────────────────────────
export const plansMessage = `💎 *Planes de ConversaAI*

Elige el plan que mejor se adapta a tu negocio:

🆓 *Free — $0/mes*
• 1 asistente
• 100 mensajes/mes
• Webchat básico

⚡ *Pro — $19/mes*
• 5 asistentes
• 2,000 mensajes/mes
• Telegram + WhatsApp
• Captura de leads

🚀 *Business — $49/mes*
• 15 asistentes
• 10,000 mensajes/mes
• Todos los canales
• Analytics avanzado

🏢 *Enterprise — Personalizado*
• Sin límites
• SLA garantizado
• Implementación dedicada

👉 Crea tu cuenta gratis en *conversaai.store*`;

// ─── Contact ─────────────────────────────────────────────────────────────────
export const contactMessage = `📬 *Contacta con nosotros*

Estamos aquí para ayudarte. Elige el canal que prefieras:

💬 *WhatsApp* — Respuesta en minutos
${CONTACT_INFO.whatsapp}

✈️ *Telegram* — Escríbenos directo
${CONTACT_INFO.telegram}

📧 *Email* — ${CONTACT_INFO.email}

🕐 *Horario:* ${CONTACT_INFO.schedule}

También puedes escribirnos desde nuestra web:
🌐 conversaai.store/contact`;

// ─── Demo ────────────────────────────────────────────────────────────────────
export const demoMessage = `🚀 *¿Cómo empezar con ConversaAI?*

Es muy sencillo, sigue estos pasos:

*1️⃣ Crea tu cuenta*
Regístrate gratis en conversaai.store/register

*2️⃣ Crea tu primer asistente*
Define el nombre, personalidad y objetivo de tu IA

*3️⃣ Agrega conocimiento*
Sube tus FAQs, catálogos, horarios y más

*4️⃣ Pruébalo*
Usa el chat de prueba para ajustar las respuestas

*5️⃣ Conecta tu canal*
Publica el asistente en Telegram, WhatsApp o tu sitio web

¡Listo! Tu asistente estará atendiendo clientes automáticamente 🎉

¿Tienes dudas? Estamos a un mensaje de distancia.`;

// ─── Fallback ────────────────────────────────────────────────────────────────
export const fallbackMessage = `Lo siento, en este momento no puedo generar una respuesta automática. Pero puedes contactarnos directamente:

🌐 conversaai.store/contact
💬 ${CONTACT_INFO.whatsapp}`;
