import { db } from '../db'
import { createVariable } from '../dataset/variables'
import { createRecord } from '../dataset/records'

export async function seedDemoData(ownerId: number): Promise<number> {
  const projectId = await db.projects.add({
    name: 'Demo Project',
    description: 'Sample dataset for onboarding',
    ownerId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  })
  await createVariable({ projectId, name: 'age', type: 'numeric', order: 0 })
  await createVariable({ projectId, name: 'group', type: 'string', order: 1 })
  for (let i = 0; i < 5; i++) {
    await createRecord(projectId, { age: 20 + i * 5, group: i % 2 === 0 ? 'A' : 'B' })
  }
  return projectId
}

export async function removeDemoData(projectId: number): Promise<void> {
  await db.records.where('projectId').equals(projectId).delete()
  await db.variables.where('projectId').equals(projectId).delete()
  await db.projects.delete(projectId)
}
