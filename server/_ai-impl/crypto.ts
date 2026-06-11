import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16

function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest()
}

export function encryptApiKey(plaintext: string, secret: string): string {
  const key = deriveKey(secret)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

export function decryptApiKey(ciphertext: string, secret: string): string {
  const key = deriveKey(secret)
  const parts = ciphertext.split(':')
  if (parts.length !== 3) {
    throw new Error('无效的加密数据格式')
  }

  const iv = Buffer.from(parts[0] as string, 'hex')
  const tag = Buffer.from(parts[1] as string, 'hex')
  const encrypted = Buffer.from(parts[2] as string, 'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}
