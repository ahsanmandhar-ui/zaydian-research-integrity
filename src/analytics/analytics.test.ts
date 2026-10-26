import { describe, it, expect } from 'vitest'
import { mean, median, stdDev, crossTab, pearson } from './analytics'

describe('analytics', () => {
  it('computes basic stats', () => {
    expect(mean([1, 2, 3])).toBe(2)
    expect(median([1, 2, 3, 4])).toBe(2.5)
    expect(stdDev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 2)
  })
  it('cross tabs and correlation', () => {
    const rows = [{ g: 'A', r: 'x' }, { g: 'A', r: 'y' }, { g: 'B', r: 'x' }]
    const ct = crossTab(rows, 'g', 'r')
    expect(ct.A.x).toBe(1)
    expect(pearson([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5)
  })
})
