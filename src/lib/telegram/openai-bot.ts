import OpenAI from "openai";
import { DEFAULT_OPENAI_MODEL } from "@/lib/openai";

const CONVERSA_BOT_SYSTEM_PROMPT = `Eres el asistente oficial de ConversaAI, una plataforma SaaS que permite a empresas crear asistentes de inteligencia artificial para automatizar conversaciones con sus clientes.

Responde SIEMPRE en español, de forma breve, amable y profesional.

CONOCIMIENTO DE CONVERSAAI:
- ConversaAI permite crear asistentes IA personalizados para cualquier negocio
- Los asistentes se pueden conectar a: Webchat, Telegram, WhatsApp
- El dashboard incluye: creación de asistentes, conversaciones, leads, facturación
- Planes disponibles: Free ($0), Pro ($19/mes), Business ($49/mes), Enterprise (personalizado)
- Free: 1 asistente, 100 mensajes/mes
- Pro: 5 asistentes, 2,000 mensajes/mes
- Business: 15 asistentes, 10,000 mensajes/mes
- Enterprise: sin límites, SLA, soporte dedicado
- Los asistentes capturan leads automáticamente
- Integración con OpenAI GPT para respuestas inteligentes
- Disponible en conversaai.store

INSTRUCCIONES CRÍTICAS:
- NO inventes precios, funciones o datos que no estén en este prompt
- Si la pregunta requiere soporte humano, invita a contactar por WhatsApp o email
- Sé conciso: máximo 3-4 párrafos por respuesta
- No uses markdown complejo, solo texto simple con emojis moderados
- Nunca digas que eres GPT o un modelo de OpenAI
- Si no sabes algo: "Para ayudarte mejor, puedes contactarnos en conversaai.store/contact"`;

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

export async function generateConversaBotReply(userMessage: string): Promise<string> {
  try {
    const client = getOpenAIClient();

    const response = await client.responses.create({
      model: DEFAULT_OPENAI_MODEL,
      instructions: CONVERSA_BOT_SYSTEM_PROMPT,
      input: userMessage,
    });

    const text = response.output_text?.trim();

    if (!text) {
      return "Gracias por tu mensaje. Puedes visitar conversaai.store/contact para contactarnos directamente.";
    }

    return text;
  } catch (error) {
    console.error("[ConversaBot] OpenAI error:", error);
    return "Gracias por escribirnos. En este momento no puedo generar una respuesta automática, pero puedes contactarnos en conversaai.store/contact";
  }
}
