import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './index'

beforeEach(async () => {
  await db.open()
  await Promise.all([
    db.projects.clear(), db.memberships.clear(), db.projectLinks.clear(),
    db.roles.clear(), db.users.clear(), db.invitations.clear(), db.sessions.clear(),
    db.variables.clear(), db.records.clear(), db.versions.clear(), db.submissions.clear(),
    db.votes.clear(), db.syncOperations.clear(), db.peers.clear(), db.conflicts.clear(),
    db.publishedItems.clear(), db.departmentDashboards.clear(),
  ])
})

describe('db schema', () => {
  it('exposes all core tables', () => {
    const tables = db.tables.map((t) => t.name)
    expect(tables).toContain('projects')
    expect(tables).toContain('variables')
    expect(tables).toContain('records')
    expect(tables).toContain('versions')
    expect(tables).toContain('votes')
    expect(tables).toContain('syncOperations')
    expect(tables).toContain('conflicts')
  })
})
