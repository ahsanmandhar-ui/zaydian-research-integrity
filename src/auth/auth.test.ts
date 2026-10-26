import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { registerFirstAdmin, login, currentUser, logout, createInvitation, acceptInvitation, revokeUser, hasPermission } from './auth'

beforeEach(async () => {
  await db.open()
  await Promise.all([db.roles.clear(), db.users.clear(), db.invitations.clear(), db.sessions.clear(), db.projects.clear()])
})

describe('auth', () => {
  it('registers first admin and logs in', async () => {
    const admin = await registerFirstAdmin('admin@test.com', 'Admin', 'Secret123!')
    expect(admin.email).toBe('admin@test.com')
    await login('admin@test.com', 'Secret123!')
    const u = await currentUser()
    expect(u?.id).toBe(admin.id)
    expect(await hasPermission(u, '*')).toBe(true)
    await logout()
    expect(await currentUser()).toBeNull()
  })

  it('invitation flow and revocation', async () => {
    const admin = await registerFirstAdmin('admin@test.com', 'Admin', 'Secret123!')
    const inv = await createInvitation(admin.id!, 'user@test.com', 'researcher')
    const user = await acceptInvitation(inv.code, 'User', 'StrongPass1!')
    expect(user.email).toBe('user@test.com')
    await login('user@test.com', 'StrongPass1!')
    const u = await currentUser()
    expect(await hasPermission(u, 'dataset:write')).toBe(true)
    await revokeUser(user.id!)
    expect(await currentUser()).toBeNull()
  })
})
