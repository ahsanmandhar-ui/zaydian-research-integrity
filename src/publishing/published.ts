import { db, type PublishedItem } from '../db'

export async function publishVersion(projectId: number, versionId: number, publishedBy: number): Promise<PublishedItem> {
  const id = await db.publishedItems.add({ projectId, versionId, publishedBy, publishedAt: Date.now() })
  const item = await db.publishedItems.get(id)
  if (!item) throw new Error('failed to publish')
  return item
}

export async function listPublished(projectId?: number): Promise<PublishedItem[]> {
  if (projectId) return db.publishedItems.where('projectId').equals(projectId).reverse().sortBy('publishedAt')
  return db.publishedItems.reverse().sortBy('publishedAt')
}

export async function isPublished(versionId: number): Promise<boolean> {
  const found = await db.publishedItems.where('versionId').equals(versionId).first()
  return !!found
}
