import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

function key(): Buffer {
  const raw = (process.env.META_TOKEN_ENCRYPTION_KEY || process.env.WHATSAPP_TOKEN_ENCRYPTION_KEY)?.trim()
  if (!raw) throw new Error('META_TOKEN_ENCRYPTION_KEY no está configurada.')
  const value = Buffer.from(raw, 'base64')
  if (value.length !== 32) throw new Error('META_TOKEN_ENCRYPTION_KEY debe contener 32 bytes en Base64.')
  return value
}

export function encryptFacebookToken(token: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  return ['v1', iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.')
}

export function decryptFacebookToken(value: string): string {
  const [version, iv, tag, encrypted] = value.split('.')
  if (version !== 'v1' || !iv || !tag || !encrypted) throw new Error('Credencial de Facebook inválida.')
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64url'))
  decipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8')
}
