import { db, type Version } from '../db'
import { listVariables } from '../dataset/variables'
import { listRecords } from '../dataset/records'

export interface VersionSnapshot {
  variables: unknown[]
  records: unknown[]
}

export async function createVersion(projectId: number, createdBy: number, event: Version['event'] = 'save'): Promise<Version> {
  const variables = await listVariables(projectId)
  const records = await listRecords(projectId)
  const snapshot: VersionSnapshot = { variables, records }
  const existing = await db.versions.where('projectId').equals(projectId).toArray()
  const versionNumber = existing.length ? Math.max(...existing.map((v) => v.versionNumber)) + 1 : 1
  const id = await db.versions.add({
    projectId,
    versionNumber,
    snapshot,
    createdBy,
    createdAt: Date.now(),
    event,
  })
  const v = await db.versions.get(id)
  if (!v) throw new Error('failed to create version')
  return v
}

export async function listVersions(projectId: number): Promise<Version[]> {
  return db.versions.where('projectId').equals(projectId).reverse().sortBy('versionNumber')
}

export async function getVersion(id: number): Promise<Version | undefined> {
  return db.versions.get(id)
}

export async function restoreVersion(versionId: number): Promise<void> {
  const v = await db.versions.get(versionId)
  if (!v) throw new Error('version not found')
  const snap = v.snapshot as VersionSnapshot
  const projectId = v.projectId
  // replace variables and records
  await db.transaction('rw', db.variables, db.records, async () => {
    await db.variables.where('projectId').equals(projectId).delete()
    await db.records.where('projectId').equals(projectId).delete()
    const now = Date.now()
    for (const variable of snap.variables as any[]) {
      await db.variables.add({ ...variable, id: undefined, createdAt: now, updatedAt: now })
    }
    for (const record of snap.records as any[]) {
      await db.records.add({ ...record, id: undefined, createdAt: now, updatedAt: now })
    }
  })
}

export function diffVersions(a: Version, b: Version): { variableChanges: number; recordChanges: number } {
  const sa = a.snapshot as VersionSnapshot
  const sb = b.snapshot as VersionSnapshot
  return {
    variableChanges: Math.abs(sa.variables.length - sb.variables.length),
    recordChanges: Math.abs(sa.records.length - sb.records.length),
  }
}
