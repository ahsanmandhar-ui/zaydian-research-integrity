import { db, type ConflictRecord } from '../db'

export interface RemoteOp {
  id: number
  deviceId: string
  entityType: string
  entityId: string
  op: 'create' | 'update' | 'delete'
  payload: unknown
  createdAt: number
}

export async function applyRemoteOps(ops: RemoteOp[]): Promise<{ applied: number; conflicts: number }> {
  let applied = 0
  let conflicts = 0
  for (const op of ops) {
    const existing = await db.syncOperations.where('id').equals(op.id).first()
    if (existing) continue
    await db.syncOperations.add({ ...op, appliedAt: Date.now() })
    if (op.entityType === 'chatMessage' && op.op === 'create') {
      const payload = op.payload as any
      const existsMsg = payload.id ? await db.chatMessages.get(payload.id) : undefined
      if (!existsMsg) await db.chatMessages.add(payload)
    }

    const localOps = await db.syncOperations.where('entityId').equals(op.entityId).toArray()
    const newerLocal = localOps.some((o) => o.deviceId !== op.deviceId && o.createdAt > op.createdAt && !o.appliedAt)
    if (newerLocal) {
      await db.conflicts.add({
        entityType: op.entityType,
        entityId: op.entityId,
        field: '*',
        localValue: null,
        remoteValue: op.payload,
        status: 'open',
        createdAt: Date.now(),
      })
      conflicts++
    } else {
      applied++
    }
  }
  return { applied, conflicts }
}

export async function resolveConflict(conflictId: number, _resolution: 'local' | 'remote'): Promise<void> {
  await db.conflicts.update(conflictId, { status: 'resolved', resolvedAt: Date.now() })
}

export async function openConflicts(): Promise<ConflictRecord[]> {
  return db.conflicts.where('status').equals('open').toArray()
}
