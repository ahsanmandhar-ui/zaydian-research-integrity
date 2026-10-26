import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { db } from '../db'
import { registerFirstAdmin, login } from '../auth/auth'
import Projects from './Projects'

beforeEach(async () => {
  await db.open()
  await Promise.all([db.roles.clear(), db.users.clear(), db.invitations.clear(), db.sessions.clear(), db.projects.clear(), db.memberships.clear(), db.auditLog.clear()])
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

describe('Projects deletion', () => {
  it('admin can delete project and audit logs', async () => {
    const admin = await registerFirstAdmin('admin@test.com', 'Admin', 'Secret123!')
    await login('admin@test.com', 'Secret123!')
    const pid = await db.projects.add({ name: 'P1', description: 'd', ownerId: admin.id!, trackingId: 'T1', createdAt: Date.now(), updatedAt: Date.now() })
    expect(pid).toBeTruthy()
    render(<Projects />)
    await waitFor(() => expect(screen.getByText('P1')).toBeTruthy())
    fireEvent.click(screen.getByText('Delete project'))
    await waitFor(() => expect(screen.getByText('Project deleted')).toBeTruthy())
    expect(await db.projects.count()).toBe(0)
    const logs = await db.auditLog.toArray()
    expect(logs.some(l => l.entityType === 'project' && l.action === 'delete' && l.actorId === admin.id)).toBe(true)
  })
})