import { describe, it, expect } from 'vitest'
import { computeBurndown } from '../../server/utils/burndown'

describe('computeBurndown', () => {
  const tasks = [
    { status: 'completed', createdAt: '2024-01-01 09:00:00', completedAt: '2024-01-02 10:00:00' },
    { status: 'in_progress', createdAt: '2024-01-01 09:00:00' },
    { status: 'completed', createdAt: '2024-01-01 09:00:00', completedAt: '2024-01-03 18:00:00' },
  ]

  it('returns correct day count', () => {
    const result = computeBurndown(tasks, '2024-01-01', '2024-01-05')
    expect(result.days).toHaveLength(5)
    expect(result.days[0]).toBe('2024-01-01')
    expect(result.days[4]).toBe('2024-01-05')
  })

  it('ideal line starts at total and ends at 0', () => {
    const result = computeBurndown(tasks, '2024-01-01', '2024-01-03')
    expect(result.ideal[0]).toBe(3)
    expect(result.ideal[result.ideal.length - 1]).toBe(0)
  })

  it('actual line decreases as tasks complete', () => {
    const result = computeBurndown(tasks, '2024-01-01', '2024-01-05')
    // Day 1: all 3 open (no completions before end of day 1)
    expect(result.actual[0]).toBe(3)
    // Day 5: only 1 in_progress task remains
    expect(result.actual[result.actual.length - 1]).toBe(1)
  })

  it('handles empty tasks', () => {
    const result = computeBurndown([], '2024-01-01', '2024-01-03')
    expect(result.ideal).toEqual([0, 0, 0])
    expect(result.actual).toEqual([0, 0, 0])
  })

  it('single-day range works', () => {
    const result = computeBurndown(tasks, '2024-01-01', '2024-01-01')
    expect(result.days).toHaveLength(1)
    expect(result.ideal[0]).toBe(0)
  })
})
