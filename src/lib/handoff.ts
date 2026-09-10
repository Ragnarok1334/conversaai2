const HUMAN_REQUEST_PATTERNS = [
  /\b(hablar|comunicarme|contactar|conectar)\s+(con|a)\s+(una?\s+)?(persona|humano|humana|asesor(?:a)?|agente|ejecutiv[oa])\b/i,
  /\b(quiero|necesito|prefiero)\s+(una?\s+)?(persona|humano|humana|asesor(?:a)?|agente|ejecutiv[oa])\b/i,
  /\b(asesor(?:a)?|agente|atenci[oó]n humana|soporte humano)\b/i,
  /\b(can i|may i)\s+(speak|talk)\s+to\s+(a\s+)?(human|person|agent|representative)\b/i,
  /\b(falar|conversar)\s+com\s+(uma?\s+)?(pessoa|humano|humana|atendente)\b/i,
]

export function detectHumanHandoffRequest(message: string): boolean {
  const normalized = message.normalize('NFKC').slice(0, 1000)
  return HUMAN_REQUEST_PATTERNS.some(pattern => pattern.test(normalized))
}

export const HUMAN_HANDOFF_ACK = 'Claro. Te comunicaré con una persona del equipo. Puedes seguir escribiendo aquí y te responderán en este mismo chat.'
export const HUMAN_WAITING_MESSAGE = 'Tu mensaje fue enviado al equipo. Puedes seguir escribiendo mientras esperas una respuesta.'
