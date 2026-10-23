import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { createVariable } from '../dataset/variables'
import { createRecord } from '../dataset/records'
import { createVersion, listVersions, restoreVersion } from './versions'

beforeEach(async () => {
  await db.open()
  await Promise.all([db.projects.clear(), db.variables.clear(), db.records.clear(), db.versions.clear()])
  await db.projects.add({ name: 'P', ownerId: 1, createdAt: Date.now(), updatedAt: Date.now() })
})

describe('versioning', () => {
  it('creates and restores versions', async () => {
    await createVariable({ projectId: 1, name: 'age', type: 'numeric', order: 0 })
    await createRecord(1, { age: 30 })
    const v1 = await createVersion(1, 1, 'save')
    await createRecord(1, { age: 40 })
    expect((await listVersions(1)).length).toBe(1)
    await restoreVersion(v1.id!)
    const records = await db.records.where('projectId').equals(1).toArray()
    expect(records.length).toBe(1)
  })
})
