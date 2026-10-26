import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { createVariable } from '../dataset/variables'
import { exportProjectCsv, importProjectCsv } from './importExport'

beforeEach(async () => {
  await db.open()
  await Promise.all([db.projects.clear(), db.variables.clear(), db.records.clear()])
  await db.projects.add({ name: 'P', ownerId: 1, createdAt: Date.now(), updatedAt: Date.now() })
  await createVariable({ projectId: 1, name: 'age', type: 'numeric', order: 0 })
})

describe('io csv', () => {
  it('roundtrips csv', async () => {
    await importProjectCsv(1, 'age\n30\n40')
    const csv = await exportProjectCsv(1)
    expect(csv).toContain('30')
    expect(csv).toContain('40')
  })
})
