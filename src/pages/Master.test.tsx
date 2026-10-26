import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { db } from '../db'
import { ensureRoles } from '../auth/auth'
import { registerFirstAdmin, login } from '../auth/auth'
import Master from './Master'

beforeEach(async () => {
  await db.open()
  await Promise.all([
    db.roles.clear(), db.users.clear(), db.invitations.clear(), db.sessions.clear(),
    db.organizations.clear(), db.projects.clear(), db.studies.clear(),
    db.syncOperations.clear(), db.accessRequests.clear(), db.auditLog.clear(),
  ])
  await ensureRoles()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

describe('Master org lifecycle', () => {
  it('seeds master, creates org with admin creds, deletes org, records audit log', async () => {
    const master = await registerFirstAdmin('master@test.com', 'Master', 'Secret123!')
    await login('master@test.com', 'Secret123!')
    render(<Master />)

    await waitFor(() => expect(screen.getByRole('heading', { name: /Organizations/i })).toBeTruthy())

    // open create form
    fireEvent.click(screen.getByRole('button', { name: /create organization/i }))
    fireEvent.change(screen.getByPlaceholderText('Org name'), { target: { value: 'Org Two' } })
    fireEvent.change(screen.getByPlaceholderText('Admin name'), { target: { value: 'Org Admin' } })
    fireEvent.change(screen.getByPlaceholderText('Admin email'), { target: { value: 'orgadmin@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('Admin password'), { target: { value: 'Secret123!' } })
    fireEvent.click(screen.getByRole('button', { name: /^create$/i }))

    await waitFor(() => expect(screen.getByText(/organization created/i)).toBeTruthy())

    const org = await db.organizations.where('name').equals('Org Two').first()
    expect(org).toBeTruthy()
    const orgAdmin = await db.users.where('email').equals('orgadmin@test.com').first()
    expect(orgAdmin?.organizationId).toBe(org!.id)

    // open delete form for Org Two
    const cards = screen.getAllByText('Org Two')
    const card = cards[0].closest('.zri-card') as HTMLElement
    const deleteBtn = Array.from(card.querySelectorAll('button')).find(b => /delete org/i.test(b.textContent || '')) as HTMLButtonElement
    fireEvent.click(deleteBtn)

    await waitFor(() => screen.getByPlaceholderText('Org admin email'))
    fireEvent.change(screen.getByPlaceholderText('Org admin email'), { target: { value: 'orgadmin@test.com' } })
    fireEvent.change(screen.getByPlaceholderText('Org admin password'), { target: { value: 'Secret123!' } })
    fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }))

    await waitFor(() => expect(screen.getByText(/organization deleted/i)).toBeTruthy())

    expect(await db.organizations.where('name').equals('Org Two').count()).toBe(0)
    const logs = await db.auditLog.toArray()
    expect(logs.some(l => l.entityType === 'organization' && l.action === 'delete' && l.actorId === master.id)).toBe(true)
  })
})
