import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { submitProject, reviewSubmission } from '../submission/submissions'
import { castVote, tallyVotes } from '../voting/votes'

beforeEach(async () => {
  await db.open()
  await Promise.all([db.projects.clear(), db.versions.clear(), db.submissions.clear(), db.votes.clear()])
  await db.projects.add({ name: 'P', ownerId: 1, createdAt: Date.now(), updatedAt: Date.now() })
})

describe('submission and voting', () => {
  it('submits and reviews', async () => {
    const s = await submitProject(1, 1)
    expect(s.status).toBe('submitted')
    const r = await reviewSubmission(s.id!, true)
    expect(r.status).toBe('accepted')
  })
  it('tallies votes', async () => {
    await castVote(1, 1, 'approve')
    await castVote(1, 2, 'reject')
    const t = await tallyVotes(1)
    expect(t.approve).toBe(1)
    expect(t.reject).toBe(1)
  })
})
