import { describe, it, expect } from 'vitest'
import { detectCycle, isCycle, topologicalSort } from '../../server/utils/task-deps'

describe('detectCycle', () => {
  const tasks = [
    { id: 'a', parentId: null },
    { id: 'b', parentId: 'a' },
    { id: 'c', parentId: 'b' },
  ]

  it('returns false when no cycle exists', () => {
    expect(detectCycle(tasks, 'c', 'a')).toBe(false)
  })

  it('returns true when assigning would create cycle', () => {
    // Current: a→null, b→a, c→b. c already reaches a via parent chain.
    // If we try to set a's parent to c, from c tracing up: c→b→a(? check a)
    // Wait: detectCycle(taskId, proposedParentId) — if we set taskId's parent to proposedParentId
    const result = detectCycle(tasks, 'a', 'c')
    // From c tracing up: c→b→a → would find a, so cycle
    expect(result).toBe(true)
  })

  it('direct self-reference is a cycle', () => {
    expect(detectCycle(tasks, 'a', 'a')).toBe(true)
  })

  it('isCycle is same function as detectCycle', () => {
    expect(isCycle).toBe(detectCycle)
  })

  it('chain with cycle detection', () => {
    // Create a cycle: a→b→c→a
    const cycleTasks = [
      { id: 'a', parentId: 'c' },
      { id: 'b', parentId: 'a' },
      { id: 'c', parentId: 'b' },
    ]
    expect(detectCycle(cycleTasks, 'a', 'c')).toBe(true)
  })
})

describe('topologicalSort', () => {
  it('sorts simple dependency chain', () => {
    const tasks = [
      { id: 'a', parentId: null },
      { id: 'b', parentId: 'a' },
      { id: 'c', parentId: 'b' },
    ]
    const result = topologicalSort(tasks)
    expect(result.sorted).toEqual(['a', 'b', 'c'])
    expect(result.cycles).toHaveLength(0)
  })

  it('handles multiple roots', () => {
    const tasks = [
      { id: 'a', parentId: null },
      { id: 'b', parentId: null },
      { id: 'c', parentId: 'a' },
    ]
    const result = topologicalSort(tasks)
    expect(result.sorted[0]).toBe('a')
    expect(result.sorted[1]).toBe('b')
    expect(result.sorted[2]).toBe('c')
    expect(result.cycles).toHaveLength(0)
  })

  it('detects cycle', () => {
    const tasks = [
      { id: 'a', parentId: 'c' },
      { id: 'b', parentId: 'a' },
      { id: 'c', parentId: 'b' },
    ]
    const result = topologicalSort(tasks)
    expect(result.sorted).toHaveLength(0)
    expect(result.cycles.length).toBeGreaterThan(0)
  })

  it('handles empty list', () => {
    const result = topologicalSort([])
    expect(result.sorted).toEqual([])
    expect(result.cycles).toEqual([])
  })
})
