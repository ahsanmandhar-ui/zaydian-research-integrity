import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { addLink, listLinks, removeLink } from './links'

beforeEach(async () => {
  await db.open()
  await db.projectLinks.clear()
})

describe('project links', () => {
  it('adds and removes links', async () => {
    const l = await addLink(1, 'docs', 'https://example.com', 1)
    expect((await listLinks(1)).length).toBe(1)
    await removeLink(l.id!)
    expect((await listLinks(1)).length).toBe(0)
  })
})
