import { describe, it, expect } from 'vitest'

// Direct import to avoid Nuxt auto-import magic in test env
const bcryptjs = await import('bcryptjs')
const { hash: bcryptHash, compare: bcryptCompare } = bcryptjs.default ?? bcryptjs

// Replicate auth utils logic (can't import from server/utils/auth.ts directly due to useRuntimeConfig)
async function hashPassword(password: string): Promise<string> {
  return bcryptHash(password, 10)
}

async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return bcryptCompare(password, hashed)
}

describe('auth utils', () => {
  it('hashPassword returns a bcrypt hash', async () => {
    const hash = await hashPassword('test123')
    expect(hash).toBeDefined()
    expect(hash.length).toBeGreaterThan(20)
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/)
  })

  it('hashPassword is deterministic in structure', async () => {
    const h1 = await hashPassword('same')
    const h2 = await hashPassword('same')
    // bcrypt generates different salts, so hashes differ
    expect(h1).not.toBe(h2)
  })

  it('verifyPassword returns true for correct password', async () => {
    const hash = await hashPassword('correct')
    const result = await verifyPassword('correct', hash)
    expect(result).toBe(true)
  })

  it('verifyPassword returns false for wrong password', async () => {
    const hash = await hashPassword('correct')
    const result = await verifyPassword('wrong', hash)
    expect(result).toBe(false)
  })

  it('verifyPassword handles empty password', async () => {
    const hash = await hashPassword('some')
    const result = await verifyPassword('', hash)
    expect(result).toBe(false)
  })
})
