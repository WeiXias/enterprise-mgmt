import { describe, it, expect } from 'vitest'
import { generateId } from '../../server/utils/id'

describe('generateId', () => {
  it('returns a non-empty string', () => {
    const id = generateId()
    expect(id).toBeTruthy()
    expect(typeof id).toBe('string')
  })

  it('generates unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()))
    expect(ids.size).toBe(100)
  })

  it('returns valid UUID format', () => {
    const id = generateId()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })
})
