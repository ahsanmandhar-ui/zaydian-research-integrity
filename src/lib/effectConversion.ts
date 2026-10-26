// Effect size and unit conversion utilities for meta-analysis

export function mdToSmd(md: number, sd: number): number {
  if (!Number.isFinite(md) || !Number.isFinite(sd) || sd <= 0) return NaN
  return md / sd
}

export function smdToMd(smd: number, sd: number): number {
  if (!Number.isFinite(smd) || !Number.isFinite(sd)) return NaN
  return smd * sd
}

export function smdToOrLog(smd: number): number {
  if (!Number.isFinite(smd)) return NaN
  return smd * (Math.PI / Math.sqrt(3))
}

export function orLogToSmd(logOr: number): number {
  if (!Number.isFinite(logOr)) return NaN
  return logOr * (Math.sqrt(3) / Math.PI)
}

export function orToRr(or: number, p0: number): number {
  if (!Number.isFinite(or) || !Number.isFinite(p0) || p0 <= 0 || p0 >= 1) return NaN
  const denom = (1 - p0) + p0 * or
  if (denom <= 0) return NaN
  return or / denom
}

export function rrToOr(rr: number, p0: number): number {
  if (!Number.isFinite(rr) || !Number.isFinite(p0) || p0 <= 0 || p0 >= 1) return NaN
  const denom = 1 - p0 * rr
  if (denom <= 0) return NaN
  return (rr * (1 - p0)) / denom
}

export function hrToRr(hr: number, s0: number): number {
  if (!Number.isFinite(hr) || !Number.isFinite(s0) || s0 <= 0 || s0 >= 1) return NaN
  const num = 1 - Math.exp(hr * Math.log(s0))
  const denom = 1 - s0
  if (denom === 0) return NaN
  return num / denom
}

export function logit(p: number): number {
  if (!Number.isFinite(p) || p <= 0 || p >= 1) return NaN
  return Math.log(p / (1 - p))
}

export function expit(x: number): number {
  if (!Number.isFinite(x)) return NaN
  return 1 / (1 + Math.exp(-x))
}

export function probit(p: number): number {
  if (!Number.isFinite(p) || p <= 0 || p >= 1) return NaN
  const a1 = -3.969683028665376e+01
  const a2 = 2.209460984245205e+02
  const a3 = -2.759285104469687e+02
  const a4 = 1.383577518672690e+02
  const a5 = -3.066479806614716e+01
  const a6 = 2.506628277459239e+00
  const b1 = -5.447609879822406e+01
  const b2 = 1.615858368580409e+02
  const b3 = -1.556989798598866e+02
  const b4 = 6.680131188771972e+01
  const b5 = -1.328068155288572e+01
  const c1 = -7.784894002430293e-03
  const c2 = -3.223964580411365e-01
  const c3 = -2.400758277161838e+00
  const c4 = -2.549732539343734e+00
  const c5 = -1.248296370824766e+00
  const d1 = 7.745450142783414e-04
  const d2 = 3.231098530000524e-01
  const d3 = 2.466081618939109e+00
  const d4 = 1.163666450326399e+00
  const pLow = 0.02425
  const pHigh = 1 - pLow
  let q, r
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p))
    return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1))
  } else if (p <= pHigh) {
    q = p - 0.5
    r = q * q
    return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
      (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1)
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p))
    return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1))
  }
}

const UNIT_FACTORS: Record<string, Record<string, number>> = {
  'mg/dL->mmol/L': { glucose: 1 / 18.018, cholesterol: 1 / 38.67, triglycerides: 1 / 88.57 },
  'mmol/L->mg/dL': { glucose: 18.018, cholesterol: 38.67, triglycerides: 88.57 },
}

export function unitFactor(analyte: string, from: string, to: string): number {
  if (from === to) return 1
  const key = `${from}->${to}`
  const map = UNIT_FACTORS[key]
  if (!map) return 1
  return map[analyte.toLowerCase()] ?? 1
}

export function convertValue(value: number, analyte: string, from: string, to: string): number {
  if (!Number.isFinite(value)) return NaN
  return value * unitFactor(analyte, from, to)
}
