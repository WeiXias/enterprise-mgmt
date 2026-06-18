import { describe, it, expect } from 'vitest'
import { success, fail, paginate } from '../../server/utils/response'

describe('success', () => {
  it('returns code 0 with data', () => {
    const result = success({ id: 1, name: 'test' })
    expect(result.code).toBe(0)
    expect(result.data).toEqual({ id: 1, name: 'test' })
  })

  it('uses default success message', () => {
    const result = success(null)
    expect(result.message).toBe('搞定了！')
  })

  it('accepts custom message', () => {
    const result = success({}, '已保存')
    expect(result.message).toBe('已保存')
  })
})

describe('fail', () => {
  it('returns non-zero code with message', () => {
    const result = fail('出错了')
    expect(result.code).toBe(-1)
    expect(result.message).toBe('出错了')
    expect(result.data).toBeNull()
  })

  it('accepts custom error code', () => {
    const result = fail('未找到', 404)
    expect(result.code).toBe(404)
  })
})

describe('paginate', () => {
  it('returns paginated structure', () => {
    const result = paginate([{ id: 1 }, { id: 2 }], 10, 1, 2)
    expect(result.code).toBe(0)
    expect(result.data).toEqual({
      list: [{ id: 1 }, { id: 2 }],
      total: 10,
      page: 1,
      pageSize: 2,
      totalPages: 5,
    })
  })

  it('calculates totalPages correctly', () => {
    const result = paginate([], 11, 1, 5)
    expect(result.data!.totalPages).toBe(3)
  })

  it('handles exactly divisible case', () => {
    const result = paginate([], 20, 1, 5)
    expect(result.data!.totalPages).toBe(4)
  })

  it('handles single page', () => {
    const result = paginate([], 3, 1, 10)
    expect(result.data!.totalPages).toBe(1)
  })

  it('handles zero total', () => {
    const result = paginate([], 0, 1, 20)
    expect(result.data!.totalPages).toBe(0)
  })
})
