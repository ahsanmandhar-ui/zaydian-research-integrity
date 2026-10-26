import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { ensureRoles, getRoleByName } from '../auth/auth'

beforeEach(async () => {
  await db.open()
  await Promise.all([
    db.roles.clear(), db.users.clear(), db.organizations.clear(), db.projects.clear(), db.studies.clear(), db.syncOperations.clear(),
  ])
  await ensureRoles()
})

describe('org isolation', () => {
  it('queries projects by organization', async () => {
    const o1 = await db.organizations.add({ name: 'Org1', createdAt: Date.now(), updatedAt: Date.now() })
    const o2 = await db.organizations.add({ name: 'Org2', createdAt: Date.now(), updatedAt: Date.now() })
    await db.projects.add({ name: 'P1', ownerId: 1, organizationId: o1, createdAt: Date.now(), updatedAt: Date.now() } as any)
    await db.projects.add({ name: 'P2', ownerId: 1, organizationId: o2, createdAt: Date.now(), updatedAt: Date.now() } as any)
    const org1Projects = await db.projects.where('organizationId').equals(o1).toArray()
    const org2Projects = await db.projects.where('organizationId').equals(o2).toArray()
    expect(org1Projects.map(p => p.name)).toEqual(['P1'])
    expect(org2Projects.map(p => p.name)).toEqual(['P2'])
  })

  it('master role has org:manage', async () => {
    const masterRole = await getRoleByName('master')
    expect(masterRole?.permissions).toContain('org:manage')
  })
})