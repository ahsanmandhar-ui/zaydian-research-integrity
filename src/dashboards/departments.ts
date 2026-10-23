import { db, type DepartmentDashboard } from '../db'

export async function upsertDashboard(department: string, config: unknown): Promise<DepartmentDashboard> {
  const existing = await db.departmentDashboards.where('department').equals(department).first()
  const now = Date.now()
  if (existing?.id) {
    await db.departmentDashboards.update(existing.id, { config, updatedAt: now })
    const d = await db.departmentDashboards.get(existing.id)
    if (!d) throw new Error('not found')
    return d
  }
  const id = await db.departmentDashboards.add({ department, config, createdAt: now, updatedAt: now })
  const d = await db.departmentDashboards.get(id)
  if (!d) throw new Error('not found')
  return d
}

export async function listDashboards(): Promise<DepartmentDashboard[]> {
  return db.departmentDashboards.toArray()
}

export async function getDashboard(department: string): Promise<DepartmentDashboard | undefined> {
  return db.departmentDashboards.where('department').equals(department).first()
}
