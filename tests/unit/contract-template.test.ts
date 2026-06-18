import { describe, it, expect } from 'vitest'
import { extractPlaceholders } from '../../server/utils/contract-template'

describe('extractPlaceholders', () => {
  it('extracts simple placeholders', () => {
    const html = '<p>合同名称：{{name}}，金额：{{amount}}</p>'
    const result = extractPlaceholders(html)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ key: 'name', label: 'name' })
    expect(result[1]).toEqual({ key: 'amount', label: 'amount' })
  })

  it('deduplicates repeated placeholders', () => {
    const html = '{{name}}{{name}}{{name}}'
    const result = extractPlaceholders(html)
    expect(result).toHaveLength(1)
    expect(result[0].key).toBe('name')
  })

  it('returns empty for no placeholders', () => {
    const result = extractPlaceholders('<p>plain text</p>')
    expect(result).toEqual([])
  })

  it('handles underscore in placeholder key', () => {
    const html = '{{contract_no}} {{customer_name}}'
    const result = extractPlaceholders(html)
    expect(result.map(r => r.key)).toEqual(['contract_no', 'customer_name'])
  })

  it('handles numeric characters in key', () => {
    const html = '{{field1}} {{item_2024}}'
    const result = extractPlaceholders(html)
    expect(result.map(r => r.key)).toEqual(['field1', 'item_2024'])
  })

  it('ignores non-placeholder curly braces', () => {
    const html = '<script>const x = {}</script><p>{{name}}</p>'
    const result = extractPlaceholders(html)
    expect(result).toHaveLength(1)
    expect(result[0].key).toBe('name')
  })

  it('handles empty string', () => {
    const result = extractPlaceholders('')
    expect(result).toEqual([])
  })
})
