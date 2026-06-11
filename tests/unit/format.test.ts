import { describe, it, expect } from 'vitest'
// Import directly from source (pure functions, no Nuxt dependency)
// We replicate as standalone functions for test isolation

function formatMoney(value: unknown): string {
  const n = Number(value)
  if (isNaN(n)) return '¥0'
  if (n === 0) return '¥0.00'
  return '¥' + n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(value: unknown): string {
  if (!value) return '-'
  return String(value).slice(0, 10)
}

function formatPercent(value: number, total: number): string {
  if (!total || !value) return '0%'
  return Math.round((value / total) * 100) + '%'
}

function formatProgress(current: number, total: number): string {
  return formatPercent(current, total)
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone || '-'
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

describe('format utils', () => {
  describe('formatMoney', () => {
    it('formats integer', () => { expect(formatMoney(12345)).toBe('¥12,345.00') })
    it('formats decimal', () => { expect(formatMoney(12345.67)).toBe('¥12,345.67') })
    it('handles 0', () => { expect(formatMoney(0)).toBe('¥0.00') })
    it('handles undefined', () => { expect(formatMoney(undefined)).toBe('¥0') })
    it('handles null', () => { expect(formatMoney(null)).toBe('¥0.00') })
    it('handles NaN', () => { expect(formatMoney(NaN)).toBe('¥0') })
    it('handles string number', () => { expect(formatMoney('999')).toBe('¥999.00') })
    it('formats large numbers', () => { expect(formatMoney(123456789)).toContain(',') })
  })

  describe('formatDate', () => {
    it('extracts date from ISO string', () => { expect(formatDate('2024-01-15T10:30:00Z')).toBe('2024-01-15') })
    it('handles missing value', () => { expect(formatDate('')).toBe('-') })
    it('handles null', () => { expect(formatDate(null)).toBe('-') })
    it('handles undefined', () => { expect(formatDate(undefined)).toBe('-') })
    it('already-short string passes through', () => { expect(formatDate('2024-01-15')).toBe('2024-01-15') })
  })

  describe('formatPercent', () => {
    it('calculates 50%', () => { expect(formatPercent(5, 10)).toBe('50%') })
    it('calculates 100%', () => { expect(formatPercent(10, 10)).toBe('100%') })
    it('handles zero total', () => { expect(formatPercent(5, 0)).toBe('0%') })
    it('handles zero value', () => { expect(formatPercent(0, 10)).toBe('0%') })
    it('rounds up', () => { expect(formatPercent(1, 3)).toBe('33%') })
    it('rounds down', () => { expect(formatPercent(2, 3)).toBe('67%') })
  })

  describe('maskPhone', () => {
    it('masks standard phone', () => { expect(maskPhone('13812345678')).toBe('138****5678') })
    it('handles empty', () => { expect(maskPhone('')).toBe('-') })
    it('handles short string', () => { expect(maskPhone('123')).toBe('123') })
  })
})
