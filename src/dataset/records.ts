import { db, type DataRecord } from '../db'
import { listVariables } from './variables'

export async function listRecords(projectId: number): Promise<DataRecord[]> {
  return db.records.where('projectId').equals(projectId).sortBy('rowIndex')
}

export async function createRecord(projectId: number, values: Record<string, unknown> = {}): Promise<DataRecord> {
  const existing = await listRecords(projectId)
  const rowIndex = existing.length ? Math.max(...existing.map((r) => r.rowIndex)) + 1 : 0
  const now = Date.now()
  const id = await db.records.add({ projectId, rowIndex, values, createdAt: now, updatedAt: now })
  const r = await db.records.get(id)
  if (!r) throw new Error('failed to create record')
  return r
}

export async function updateCell(recordId: number, field: string, value: unknown): Promise<DataRecord> {
  const rec = await db.records.get(recordId)
  if (!rec) throw new Error('record not found')
  const vars = await listVariables(rec.projectId)
  const variable = vars.find((v) => v.name === field)
  if (variable) {
    const err = (await import('./variables')).validateValue(variable, value)
    if (err) throw new Error(err)
  }
  const values = { ...rec.values, [field]: value }
  await db.records.update(recordId, { values, updatedAt: Date.now() })
  const updated = await db.records.get(recordId)
  if (!updated) throw new Error('record not found')
  return updated
}

export async function deleteRecord(recordId: number): Promise<void> {
  await db.records.delete(recordId)
}

export async function validateRow(projectId: number, values: Record<string, unknown>): Promise<string[]> {
  const vars = await listVariables(projectId)
  const errors: string[] = []
  for (const v of vars) {
    const err = (await import('./variables')).validateValue(v, values[v.name])
    if (err) errors.push(`${v.name}: ${err}`)
  }
  return errors
}
