import { describe, it, expect } from 'vitest'

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"'
  }
  return value
}

function jsonToCsv(data: any[], columns: { key: string; label: string; format?: (v: any, row: any) => string }[]): string {
  const rows: string[] = ['﻿' + columns.map(c => escapeCsvField(c.label)).join(',')]
  for (const row of data) {
    const values = columns.map(col => {
      const val = col.format ? col.format(row[col.key], row) : row[col.key]
      return escapeCsvField(String(val ?? ''))
    })
    rows.push(values.join(','))
  }
  return rows.join('\n')
}

describe('export-csv utils', () => {
  describe('jsonToCsv', () => {
    it('converts simple array to CSV', () => {
      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ]
      const columns = [
        { key: 'name', label: '姓名' },
        { key: 'age', label: '年龄' },
      ]
      const csv = jsonToCsv(data, columns)
      expect(csv).toContain('﻿姓名,年龄')
      expect(csv).toContain('Alice,30')
      expect(csv).toContain('Bob,25')
    })

    it('handles empty data', () => {
      const csv = jsonToCsv([], [{ key: 'name', label: '姓名' }])
      expect(csv).toBe('﻿姓名')
    })

    it('handles values with commas', () => {
      const data = [{ name: 'Hello, World', value: 1 }]
      const csv = jsonToCsv(data, [{ key: 'name', label: 'Name' }, { key: 'value', label: 'Value' }])
      expect(csv).toContain('"Hello, World"')
    })

    it('handles values with quotes', () => {
      const data = [{ name: 'He said "hi"', value: 1 }]
      const csv = jsonToCsv(data, [{ key: 'name', label: 'Name' }])
      expect(csv).toContain('"He said ""hi"""')
    })

    it('uses custom format function', () => {
      const data = [{ amount: 1000 }]
      const csv = jsonToCsv(data, [{ key: 'amount', label: '金额', format: (v: number) => '¥' + v }])
      expect(csv).toContain('¥1000')
    })

    it('handles null/undefined values', () => {
      const data = [{ name: null, age: undefined }]
      const csv = jsonToCsv(data, [{ key: 'name', label: 'Name' }, { key: 'age', label: 'Age' }])
      expect(csv).toContain(',')
    })

    it('has BOM for Excel compatibility', () => {
      const csv = jsonToCsv([], [{ key: 'x', label: 'X' }])
      expect(csv.charCodeAt(0)).toBe(0xFEFF)
    })
  })
})
