import { describe, it, expect } from 'vitest'
import { unitFactor, mdToSmd } from '../lib/effectConversion'

describe('effect conversion', () => {
  it('unit factor mg/dl to mmol/l', () => {
    expect(unitFactor('glucose', 'mg/dL', 'mmol/L')).toBeCloseTo(0.0555, 4)
  })
  it('md to smd', () => {
    expect(mdToSmd(5, 10)).toBeCloseTo(0.5, 2)
  })
})