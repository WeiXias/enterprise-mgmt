import { describe, it, expect } from 'vitest'

function isPhone(value: string): boolean { return /^1[3-9]\d{9}$/.test(value.trim()) }
function isEmail(value: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) }
function isPositiveAmount(value: unknown): boolean { const n = Number(value); return !isNaN(n) && n > 0 }
function isLengthInRange(value: string, min: number, max: number): boolean { const len = value.trim().length; return len >= min && len <= max }

describe('validate utils', () => {
  describe('isPhone', () => {
    it('validates valid phone', () => { expect(isPhone('13812345678')).toBe(true) })
    it('validates 188', () => { expect(isPhone('18800001111')).toBe(true) })
    it('rejects short', () => { expect(isPhone('1381234567')).toBe(false) })
    it('rejects invalid prefix', () => { expect(isPhone('12812345678')).toBe(false) })
    it('rejects letters', () => { expect(isPhone('abc12345678')).toBe(false) })
    it('trims whitespace', () => { expect(isPhone(' 13812345678 ')).toBe(true) })
  })

  describe('isEmail', () => {
    it('validates standard email', () => { expect(isEmail('test@example.com')).toBe(true) })
    it('rejects missing @', () => { expect(isEmail('testexample.com')).toBe(false) })
    it('rejects missing domain', () => { expect(isEmail('test@')).toBe(false) })
    it('rejects empty', () => { expect(isEmail('')).toBe(false) })
  })

  describe('isPositiveAmount', () => {
    it('validates positive', () => { expect(isPositiveAmount(100)).toBe(true) })
    it('rejects 0', () => { expect(isPositiveAmount(0)).toBe(false) })
    it('rejects negative', () => { expect(isPositiveAmount(-10)).toBe(false) })
    it('rejects NaN', () => { expect(isPositiveAmount(NaN)).toBe(false) })
    it('handles string', () => { expect(isPositiveAmount('50')).toBe(true) })
  })

  describe('isLengthInRange', () => {
    it('validates in range', () => { expect(isLengthInRange('hello', 3, 10)).toBe(true) })
    it('rejects too short', () => { expect(isLengthInRange('ab', 3, 10)).toBe(false) })
    it('rejects too long', () => { expect(isLengthInRange('hello world!', 3, 10)).toBe(false) })
    it('trims whitespace', () => { expect(isLengthInRange('  ab  ', 3, 10)).toBe(false) })
  })
})
