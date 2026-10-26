import { db, type AuditEntry } from '../db'

export type { AuditEntry }

export async function recordAudit(entry: Omit<AuditEntry, 'id' | 'createdAt' | 'hash' | 'previousHash'>): Promise<AuditEntry> {
  const last = await db.auditLog.orderBy('id').last()
  const previousHash = last?.hash || '0'.repeat(64)
  const createdAt = Date.now()
  const data = JSON.stringify({ entityType: entry.entityType, entityId: entry.entityId, action: entry.action, actorId: entry.actorId, details: entry.details, previousHash, createdAt })
  const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
  const hash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
  const id = await db.auditLog.add({ ...entry, previousHash, hash, createdAt })
  const full = await db.auditLog.get(id)
  if (!full) throw new Error('failed to record audit')
  return full
}

export async function verifyAuditChain(): Promise<{ valid: boolean; brokenAt?: number }> {
  const entries = await db.auditLog.orderBy('id').toArray()
  let prevHash = '0'.repeat(64)
  for (const e of entries) {
    if (e.previousHash !== prevHash) return { valid: false, brokenAt: e.id }
    if (e.hash) {
      const data = JSON.stringify({ entityType: e.entityType, entityId: e.entityId, action: e.action, actorId: e.actorId, details: e.details, previousHash: e.previousHash, createdAt: e.createdAt })
      const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
      const hash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')
      if (hash !== e.hash) return { valid: false, brokenAt: e.id }
    }
    prevHash = e.hash || prevHash
  }
  return { valid: true }
}

export async function listAudit(entityType?: string, entityId?: string): Promise<AuditEntry[]> {
  let all = await db.auditLog.toArray()
  if (entityType) all = all.filter((e) => e.entityType === entityType)
  if (entityId) all = all.filter((e) => e.entityId === entityId)
  return all
}
