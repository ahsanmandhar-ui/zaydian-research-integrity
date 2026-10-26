import { db, type DataRecord } from '../db'
import { listVariables } from './variables'
import { encryptField, decryptField } from '../security/crypto'

export async function listRecords(projectId: number): Promise<DataRecord[]> {
  const records = await db.records.where('projectId').equals(projectId).sortBy('rowIndex')
  for (const r of records) {
    if (r.values) {
      const decrypted: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(r.values)) {
        decrypted[k] = typeof v === 'string' ? await decryptField(v) : v
      }
      r.values = decrypted
    }
  }
  return records
}

export async function createRecord(projectId: number, values: Record<string, unknown> = {}): Promise<DataRecord> {
  const proj = await db.projects.get(projectId)
  if (proj?.locked) throw new Error('Dataset is locked — no further edits allowed')
  const existing = await listRecords(projectId)
  const rowIndex = existing.length ? Math.max(...existing.map((r) => r.rowIndex)) + 1 : 0
  const now = Date.now()
  const encryptedValues: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(values)) {
    encryptedValues[k] = typeof v === 'string' ? await encryptField(v) : v
  }
  const id = await db.records.add({ projectId, rowIndex, values: encryptedValues, createdAt: now, updatedAt: now })
  const r = await db.records.get(id)
  if (!r) throw new Error('failed to create record')
  if (r.values) {
    const decrypted: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(r.values)) {
      decrypted[k] = typeof v === 'string' ? await decryptField(v as string) : v
    }
    r.values = decrypted
  }
  return r
}

export async function updateCell(recordId: number, field: string, value: unknown, userId?: number): Promise<DataRecord> {
  const rec = await db.records.get(recordId)
  if (!rec) throw new Error('record not found')
  const proj = await db.projects.get(rec.projectId)
  if (proj?.locked) throw new Error('Dataset is locked — no further edits allowed')
  const vars = await listVariables(rec.projectId)
  const variable = vars.find((v) => v.name === field)
  if (variable) {
    const err = (await import('./variables')).validateValue(variable, value)
    if (err) throw new Error(err)
    // coerce to typed storage
    if (variable.type === 'numeric') {
      const n = typeof value === 'number' ? value : Number(String(value).trim())
      if (Number.isFinite(n)) value = n
    } else if (variable.type === 'boolean') {
      const s = String(value).toLowerCase().trim()
      value = s === 'true' || s === '1'
    } else if (variable.type === 'date') {
      const d = new Date(String(value))
      if (!isNaN(d.getTime())) value = d.toISOString()
    }
  }
  if (field === 'phone' && (value === null || value === undefined || String(value).trim() === '')) {
    throw new Error('phone number is required')
  }
  const now = Date.now()
  const encryptedValue = typeof value === 'string' ? await encryptField(String(value)) : value
  const values = { ...rec.values, [field]: encryptedValue }
  const meta = { ...(rec.cellMeta || {}) }
  const prev = meta[field]
  const entry = { userId: userId ?? 0, at: now, value }
  meta[field] = {
    createdBy: prev?.createdBy ?? (userId ?? 0),
    createdAt: prev?.createdAt ?? now,
    history: [...(prev?.history || []), entry],
  }
  await db.records.update(recordId, { values, cellMeta: meta, updatedAt: now })
  const updated = await db.records.get(recordId)
  if (!updated) throw new Error('record not found')
  if (updated.values) {
    const decrypted: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(updated.values)) {
      decrypted[k] = typeof v === 'string' ? await decryptField(v as string) : v
    }
    updated.values = decrypted
  }
  return updated
}

export async function deleteRecord(recordId: number): Promise<void> {
  const rec = await db.records.get(recordId)
  if (rec) {
    const proj = await db.projects.get(rec.projectId)
    if (proj?.locked) throw new Error('Dataset is locked — no further edits allowed')
  }
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
