import { db, type AuditEntry } from '../db'

export type { AuditEntry }

export async function recordAudit(entry: Omit<AuditEntry, 'id' | 'createdAt'>): Promise<AuditEntry> {
  const id = await db.auditLog.add({ ...entry, createdAt: Date.now() })
  const full = await db.auditLog.get(id)
  if (!full) throw new Error('failed to record audit')
  return full
}

export async function listAudit(entityType?: string, entityId?: string): Promise<AuditEntry[]> {
  let all = await db.auditLog.toArray()
  if (entityType) all = all.filter((e) => e.entityType === entityType)
  if (entityId) all = all.filter((e) => e.entityId === entityId)
  return all
}
