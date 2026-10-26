import { db, type SyncOperation } from '../db'

export async function enqueueOp(op: Omit<SyncOperation, 'id'>): Promise<SyncOperation> {
  const id = await db.syncOperations.add(op as SyncOperation)
  const created = await db.syncOperations.get(id)
  if (!created) throw new Error('failed to enqueue')
  return created
}

export async function pendingOps(deviceId?: string): Promise<SyncOperation[]> {
  const all = await db.syncOperations.toArray()
  return all.filter((o) => !o.appliedAt && (!deviceId || o.deviceId !== deviceId))
}

export async function markApplied(opId: number): Promise<void> {
  await db.syncOperations.update(opId, { appliedAt: Date.now() })
}

export async function durableQueueSize(): Promise<number> {
  const all = await db.syncOperations.toArray()
  return all.filter((o) => !o.appliedAt).length
}

export async function recordOperation(entityType: string, entityId: string, op: SyncOperation['op'], payload: unknown, deviceId: string): Promise<SyncOperation> {
  return enqueueOp({ deviceId, entityType, entityId, op, payload, createdAt: Date.now() })
}
