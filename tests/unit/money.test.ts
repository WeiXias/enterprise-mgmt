import { describe, it, expect } from 'vitest'
import { toCents, toYuan, mapToCents, mapToYuan } from '../../server/utils/money'

describe('toCents', () => {
  it('converts yuan to cents', () => {
    expect(toCents(1)).toBe(100)
    expect(toCents(12.34)).toBe(1234)
    expect(toCents(0.01)).toBe(1)
  })

  it('handles rounding correctly', () => {
    expect(toCents(0.005)).toBe(1) // 银行家舍入：0.5 分 → 1 分
    expect(toCents(0.004)).toBe(0)
  })

  it('returns 0 for null/undefined/NaN', () => {
    expect(toCents(null)).toBe(0)
    expect(toCents(undefined)).toBe(0)
    expect(toCents(NaN)).toBe(0)
  })

  it('handles zero', () => {
    expect(toCents(0)).toBe(0)
  })

  it('handles large values without overflow', () => {
    expect(toCents(999999.99)).toBe(99999999)
  })
})

describe('toYuan', () => {
  it('converts cents to yuan', () => {
    expect(toYuan(100)).toBe(1)
    expect(toYuan(1234)).toBe(12.34)
    expect(toYuan(1)).toBe(0.01)
  })

  it('handles rounding of sub-cent values', () => {
    expect(toYuan(1.6)).toBe(0.02)
    expect(toYuan(1.4)).toBe(0.01)
  })

  it('returns 0 for null/undefined/NaN', () => {
    expect(toYuan(null)).toBe(0)
    expect(toYuan(undefined)).toBe(0)
    expect(toYuan(NaN)).toBe(0)
  })

  it('handles zero', () => {
    expect(toYuan(0)).toBe(0)
  })
})

describe('mapToCents', () => {
  it('converts specified keys from yuan to cents', () => {
    const input = { name: 'test', amount: 12.34, quantity: 5 }
    const result = mapToCents(input, ['amount'])
    expect(result.name).toBe('test')
    expect(result.amount).toBe(1234)
    expect(result.quantity).toBe(5)
  })

  it('handles multiple keys', () => {
    const input = { price: 10, discount: 0.5 }
    const result = mapToCents(input, ['price', 'discount'])
    expect(result.price).toBe(1000)
    expect(result.discount).toBe(50)
  })

  it('does not mutate original object', () => {
    const input = { amount: 10 }
    const result = mapToCents(input, ['amount'])
    expect(input.amount).toBe(10)
    expect(result.amount).toBe(1000)
  })

  it('skips undefined values', () => {
    const input = { amount: undefined as unknown as number }
    const result = mapToCents(input as any, ['amount'])
    expect(result.amount).toBeUndefined()
  })
})

describe('mapToYuan', () => {
  it('converts specified keys from cents to yuan', () => {
    const input = { name: 'test', amount: 1234, quantity: 5 }
    const result = mapToYuan(input, ['amount'])
    expect(result.amount).toBe(12.34)
    expect(result.quantity).toBe(5)
  })

  it('does not mutate original object', () => {
    const input = { price: 1000 }
    const result = mapToYuan(input, ['price'])
    expect(input.price).toBe(1000)
    expect(result.price).toBe(10)
  })
})
