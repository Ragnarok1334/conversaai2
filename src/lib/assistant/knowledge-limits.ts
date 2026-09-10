export const MIN_KNOWLEDGE_CHARS = 60
export const MAX_KNOWLEDGE_BLOCK_CHARS = 3_000
export const MAX_KNOWLEDGE_TOTAL_CHARS = 12_000

export function getKnowledgeTotalLength(blocks: unknown): number {
  if (!Array.isArray(blocks)) return 0
  return blocks.reduce((total, block) => {
    if (!block || typeof block !== 'object') return total
    const content = (block as { content?: unknown }).content
    return total + (typeof content === 'string' ? content.trim().length : 0)
  }, 0)
}
