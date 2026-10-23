import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { enqueueOp, pendingOps, markApplied } from './oplog'
import { applyRemoteOps } from './protocol'

beforeEach(async () => {
  await db.open()
  await Promise.all([db.syncOperations.clear(), db.conflicts.clear()])
})

describe('sync', () => {
  it('enqueues and applies remote ops', async () => {
    const op = await enqueueOp({ deviceId: 'd1', entityType: 'project', entityId: '1', op: 'create', payload: { name: 'P' }, createdAt: Date.now() })
    expect((await pendingOps()).length).toBe(1)
    await markApplied(op.id!)
    expect((await pendingOps()).length).toBe(0)
    const res = await applyRemoteOps([{ id: 999, deviceId: 'd2', entityType: 'project', entityId: '2', op: 'create', payload: {}, createdAt: Date.now() }])
    expect(res.applied).toBe(1)
  })
})
