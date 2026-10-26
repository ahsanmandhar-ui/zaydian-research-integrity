import { describe, it, expect } from 'vitest'
import { computeQuality } from './datasetQuality'

describe('computeQuality', () => {
  it('empty inputs', () => {
    const r = computeQuality([], [])
    expect(r.n).toBe(0)
    expect(r.integrityIndex).toBeGreaterThanOrEqual(0)
  })
  it('detects duplicates', () => {
    const vars = [{ name: 'a', type: 'string' }]
    const records = [{ values: { a: 'x' } }, { values: { a: 'x' } }]
    const r = computeQuality(vars, records)
    expect(r.dupRows).toBe(1)
  })
})