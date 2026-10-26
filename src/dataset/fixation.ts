import { db, type Variable } from '../db'
import { listVariables } from './variables'
import { updateCell } from './records'

export function isLocked(meta: any, field: string): boolean {
  const m = meta?.[field]
  if (!m) return false
  // A cell is considered locked if it has been manually edited by a real user.
  const hist = m.history || []
  return hist.some((h: any) => h.userId && h.userId !== 0)
}

export async function computeFixValue(records: any[], variable: Variable): Promise<any> {
  const vals = records.map(r => r.values?.[String(variable.id)] ?? r.values?.[variable.name]).filter((v: any) => v !== null && v !== undefined && String(v).trim() !== '')
  if (!vals.length) return null
  if (variable.type === 'numeric') {
    const nums = vals.map(Number).filter(Number.isFinite)
    if (!nums.length) return null
    const sorted = nums.slice().sort((a,b)=>a-b)
    const mid = Math.floor(sorted.length/2)
    return sorted.length % 2 ? sorted[mid] : (sorted[mid-1]+sorted[mid])/2
  }
  // mode for categorical/string/boolean
  const counts = new Map<any, number>()
  for (const v of vals) counts.set(v, (counts.get(v)||0)+1)
  let best: any = vals[0], bestN = 0
  for (const [k,n] of counts) if (n > bestN) { best = k; bestN = n }
  return best
}

export async function applyFixation(projectId: number, userId: number = 0): Promise<number> {
  const vars = await listVariables(projectId)
  const records = await db.records.where('projectId').equals(projectId).toArray()
  let fixed = 0
  for (const rec of records) {
    for (const v of vars) {
      const raw = rec.values?.[String(v.id)] ?? rec.values?.[v.name]
      const isEmpty = raw === null || raw === undefined || (typeof raw === 'string' && raw.trim() === '')
      if (!isEmpty) continue
      if (isLocked(rec.cellMeta, v.name)) continue
      const val = await computeFixValue(records, v)
      if (val === null || val === undefined) continue
      try {
        await updateCell(rec.id as number, v.name, val, userId)
        fixed++
      } catch {
        // skip
      }
    }
  }
  return fixed
}
