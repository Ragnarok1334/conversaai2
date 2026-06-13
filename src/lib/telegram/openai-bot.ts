import OpenAI from "openai";
import { DEFAULT_OPENAI_MODEL } from "@/lib/openai";

const OPENAI_TIMEOUT_MS = 7000;

const CONVERSA_BOT_SYSTEM_PROMPT = `Eres el asistente oficial de ConversaAI. Respondes en español, de forma breve, clara y profesional.

ConversaAI es una plataforma SaaS para crear asistentes de IA que automatizan conversaciones, captan leads y ayudan a negocios a responder clientes.

PLANES ACTUALES:
- Free: $0/mes — 1 asistente, 100 mensajes
- Pro: $19/mes — 5 asistentes, 5,000 mensajes
- Business: 20 asistentes, 50,000 mensajes
- Enterprise: personalizado, sin límites, SLA garantizado

CANALES COMPATIBLES: Webchat, Telegram (WhatsApp próximamente)

FUNCIONES PRINCIPALES:
- Crear asistentes de IA personalizados
- Captura automática de leads
- Historial de conversaciones
- Dashboard con métricas
- Integración con OpenAI

INSTRUCCIONES:
- Responde siempre en español
- Sé breve: máximo 3-4 párrafos
- No uses markdown complejo, solo texto simple con emojis moderados
- No inventes funciones o precios no listados arriba
- Nunca digas que eres GPT, ChatGPT o un modelo de OpenAI. Eres el asistente de ConversaAI
- Si el usuario pregunta por contacto o soporte humano, indícale usar el comando /contact
- Si el usuario quiere empezar, recomiéndale /demo o registrarse en conversaai.store/register
- Si no sabes algo: "Para ayudarte mejor, usa /contact para hablar con nuestro equipo."`;

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: OPENAI_TIMEOUT_MS,
    });
  }
  return openaiClient;
}

const TIMEOUT_FALLBACK =
  "Gracias por escribirnos. En este momento la IA está tardando un poco. Puedes usar /contact para hablar con nosotros directamente. 🙏";

const ERROR_FALLBACK =
  "Gracias por escribirnos. Ahora mismo no pude generar una respuesta automática, pero puedes usar /contact para hablar con nosotros.";

export async function generateConversaBotReply(userMessage: string): Promise<string> {
  // Race between OpenAI call and a hard timeout
  const timeoutPromise = new Promise<string>((resolve) =>
    setTimeout(() => resolve(TIMEOUT_FALLBACK), OPENAI_TIMEOUT_MS)
  );

  const openaiPromise = (async (): Promise<string> => {
    try {
      const client = getOpenAIClient();

      // TODO: Pendiente: integrar getModelForPlan en Telegram cuando el bot resuelva owner subscription.
      const response = await client.responses.create({
        model: DEFAULT_OPENAI_MODEL,
        instructions: CONVERSA_BOT_SYSTEM_PROMPT,
        input: userMessage,
      });

      const text = response.output_text?.trim();

      if (!text) {
        return "Gracias por tu mensaje. Puedes usar /contact para hablar con nuestro equipo directamente.";
      }

      return text;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
      // Safe logging — never log API keys or full request objects
      const msg = error?.message ?? "Unknown error";
      if (msg.toLowerCase().includes("timeout") || msg.toLowerCase().includes("timed out")) {
        console.warn("[ConversaBot] OpenAI timeout:", msg);
        return TIMEOUT_FALLBACK;
      }
      console.error("[ConversaBot] OpenAI error:", msg);
      return ERROR_FALLBACK;
    }
  })();

  return Promise.race([openaiPromise, timeoutPromise]);
}
