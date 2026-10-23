import { db, type ProjectLink } from '../db'

export async function addLink(projectId: number, label: string, url: string, createdBy: number): Promise<ProjectLink> {
  const id = await db.projectLinks.add({ projectId, label, url, createdBy, createdAt: Date.now() })
  const l = await db.projectLinks.get(id)
  if (!l) throw new Error('failed to add link')
  return l
}

export async function listLinks(projectId: number): Promise<ProjectLink[]> {
  return db.projectLinks.where('projectId').equals(projectId).toArray()
}

export async function removeLink(id: number): Promise<void> {
  await db.projectLinks.delete(id)
}
