import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../db'
import { publishVersion, listPublished, isPublished } from './published'

beforeEach(async () => {
  await db.open()
  await db.publishedItems.clear()
})

describe('published vault', () => {
  it('publishes and lists', async () => {
    const p = await publishVersion(1, 10, 1)
    expect(p.versionId).toBe(10)
    expect(await isPublished(10)).toBe(true)
    expect((await listPublished(1)).length).toBe(1)
  })
})
