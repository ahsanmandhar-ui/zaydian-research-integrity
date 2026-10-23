import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { upsertDashboard, getDashboard } from './departments'

beforeEach(async () => {
  await db.open()
  await db.departmentDashboards.clear()
})

describe('dashboards', () => {
  it('upserts dashboard', async () => {
    await upsertDashboard('stats', { widgets: [1] })
    const d = await getDashboard('stats')
    expect((d?.config as any).widgets).toEqual([1])
    await upsertDashboard('stats', { widgets: [2] })
    const d2 = await getDashboard('stats')
    expect((d2?.config as any).widgets).toEqual([2])
  })
})
