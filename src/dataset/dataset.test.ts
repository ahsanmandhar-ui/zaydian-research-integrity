import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { createVariable, validateValue } from './variables'
import { createRecord, updateCell, listRecords } from './records'

beforeEach(async () => {
  await db.open()
  await Promise.all([db.projects.clear(), db.variables.clear(), db.records.clear()])
  await db.projects.add({ name: 'P', ownerId: 1, createdAt: Date.now(), updatedAt: Date.now() })
})

describe('dataset', () => {
  it('creates variables and records with validation', async () => {
    const v = await createVariable({ projectId: 1, name: 'age', type: 'numeric', order: 0 })
    expect(v.name).toBe('age')
    const rec = await createRecord(1, {})
    await updateCell(rec.id!, 'age', 30)
    const rows = await listRecords(1)
    expect(rows[0].values.age).toBe(30)
    expect(validateValue(v, 'x')).toBe('expected number')
    await expect(updateCell(rec.id!, 'age', 'x')).rejects.toThrow()
  })
  it('rejects duplicate variable names', async () => {
    await createVariable({ projectId: 1, name: 'age', type: 'numeric', order: 0 })
    await expect(createVariable({ projectId: 1, name: 'age', type: 'numeric', order: 1 })).rejects.toThrow()
  })
})
