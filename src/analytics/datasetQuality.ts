export interface QualityReport {
  n: number
  missingByVar: Record<string, number>
  distinct: Record<string, Set<any>>
  dupRows: number
  constantCols: number
  highCard: number
  score: number
  missingPct: number
  missingTotal: number
  totalEdits: number
  integrityIndex: number
  catCounts: Record<string, Record<string, number>>
  outlierFixed: number
  editStability: number
  numericSummary: Record<string, { mean: number; median: number; min: number; max: number }>
}

export function computeQuality(vars: any[], records: any[]): QualityReport {
  const n = records.length
  const missingByVar: Record<string, number> = {}
  const distinct: Record<string, Set<any>> = {}
  for (const v of vars) { missingByVar[v.name] = 0; distinct[v.name] = new Set() }
  let dupRows = 0
  const seen = new Set<string>()
  const rowSig = (r: any) => {
    const o: Record<string, any> = {}
    for (const k of Object.keys(r.values || {}).sort()) o[k] = r.values[k]
    return JSON.stringify(o)
  }
  for (const r of records) {
    const key = rowSig(r)
    if (seen.has(key)) dupRows++
    seen.add(key)
    for (const v of vars) {
      const val = r.values?.[String(v.id)] ?? r.values?.[v.name]
      const missingVals = (v.missingValues || []).map((x: any) => String(x).trim().toLowerCase())
      const isEmpty = val === null || val === undefined || String(val).trim() === '' || missingVals.includes(String(val).trim().toLowerCase())
      if (isEmpty) missingByVar[v.name]++
      else distinct[v.name].add(val)
    }
  }
  const constantCols = vars.filter(v => distinct[v.name].size <= 1).length
  const highCard = vars.filter(v => v.type === 'string' && distinct[v.name].size > 50).length
  const catCounts: Record<string, Record<string, number>> = {}
  for (const v of vars) {
    if (v.type !== 'string') continue
    catCounts[v.name] = {}
    for (const r of records) {
      const val = String(r.values?.[v.name] ?? r.values?.[String(v.id)] ?? '').trim()
      if (val) catCounts[v.name][val] = (catCounts[v.name][val] || 0) + 1
    }
  }
  let outlierFixed = 0
  for (const v of vars) {
    if (v.type !== 'numeric') continue
    const nums = records.map(r => Number(r.values?.[v.name] ?? r.values?.[String(v.id)])).filter(Number.isFinite)
    if (nums.length < 4) continue
    const sorted = nums.slice().sort((a, b) => a - b)
    const q1 = sorted[Math.floor(sorted.length * 0.25)]
    const q3 = sorted[Math.floor(sorted.length * 0.75)]
    const iqr = q3 - q1
    const lo = q1 - 1.5 * iqr, hi = q3 + 1.5 * iqr
    for (const r of records) {
      const val = Number(r.values?.[v.name] ?? r.values?.[String(v.id)])
      if (Number.isFinite(val) && (val < lo || val > hi)) outlierFixed++
    }
  }
  const totalEdits = records.reduce((n, r) => n + vars.reduce((m, v) => m + ((r.cellMeta?.[v.name]?.history || []).length), 0), 0)
  const totalCells = n * (vars.length || 1)
  const editStability = 1 - Math.min(1, totalEdits / (totalCells * 3 || 1))
  const missingTotal = Object.values(missingByVar).reduce((a, b) => a + b, 0)
  const missingPct = totalCells ? (missingTotal / totalCells) * 100 : 0
  const completeness = totalCells ? (totalCells - missingTotal) / totalCells : 1
  let validCount = 0
  for (const r of records) for (const v of vars) {
    const val = r.values?.[v.name] ?? r.values?.[String(v.id)]
    const missingVals = (v.missingValues || []).map((x: any) => String(x).trim().toLowerCase())
    const empty = val === null || val === undefined || String(val).trim() === '' || missingVals.includes(String(val).trim().toLowerCase())
    if (empty) continue
    let ok = true
    if (v.type === 'numeric') ok = Number.isFinite(Number(String(val).trim()))
    else if (v.type === 'boolean') ok = ['true', 'false', '1', '0'].includes(String(val).trim().toLowerCase())
    else if (v.type === 'date') ok = !isNaN(new Date(String(val)).getTime())
    if (ok) validCount++
  }
  const validity = totalCells ? validCount / totalCells : 1
  const uniqueness = n ? (new Set(records.map(r => rowSig(r))).size / n) : 1
  const consistency = totalCells ? Math.max(0, 1 - (outlierFixed / totalCells)) : 1
  const integrityIndex = Math.round(100 * (0.30 * completeness + 0.25 * validity + 0.15 * uniqueness + 0.15 * consistency + 0.15 * editStability))
  let score = 100
  score -= Math.min(40, missingPct * 0.8)
  score -= Math.min(20, (dupRows / (n || 1)) * 100 * 2)
  score -= Math.min(15, constantCols * 5)
  score -= Math.min(15, highCard * 3)
  score = Math.max(0, Math.round(score))
    const numericSummary: Record<string, { mean: number; median: number; min: number; max: number }> = {}
  for (const v of vars) {
    if (v.type !== 'numeric') continue
    const nums = records.map(r => Number(r.values?.[v.name] ?? r.values?.[String(v.id)])).filter(Number.isFinite)
    if (!nums.length) { numericSummary[v.name] = { mean: 0, median: 0, min: 0, max: 0 }; continue }
    const sorted = nums.slice().sort((a,b)=>a-b)
    const mean = nums.reduce((a,b)=>a+b,0)/nums.length
    const mid = Math.floor(sorted.length/2)
    const median = sorted.length%2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2
    numericSummary[v.name] = { mean, median, min: sorted[0], max: sorted[sorted.length-1] }
  }
  return { n, missingByVar, distinct, dupRows, constantCols, highCard, score, missingPct, missingTotal, totalEdits, integrityIndex, catCounts, outlierFixed, editStability, numericSummary }
}