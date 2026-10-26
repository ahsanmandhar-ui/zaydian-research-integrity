import { db, type Variable } from '../db'

export type VariableInput = Omit<Variable, 'id' | 'createdAt' | 'updatedAt'>

export async function listVariables(projectId: number): Promise<Variable[]> {
  return db.variables.where('projectId').equals(projectId).sortBy('order')
}

export async function createVariable(input: VariableInput): Promise<Variable> {
  const proj = await db.projects.get(input.projectId)
  if (proj?.locked) throw new Error('Dataset is locked — no further edits allowed')
  const existing = await db.variables.where('projectId').equals(input.projectId).toArray()
  if (existing.some((v) => v.name === input.name)) {
    throw new Error('variable name must be unique within project')
  }
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(input.name)) {
    throw new Error('invalid variable name')
  }
  const now = Date.now()
  const id = await db.variables.add({ ...input, createdAt: now, updatedAt: now })
  const v = await db.variables.get(id)
  if (!v) throw new Error('failed to create variable')
  return v
}

export async function updateVariable(id: number, patch: Partial<Variable>): Promise<Variable> {
  const v = await db.variables.get(id)
  if (v) {
    const proj = await db.projects.get(v.projectId)
    if (proj?.locked) throw new Error('Dataset is locked — no further edits allowed')
  }
  await db.variables.update(id, { ...patch, updatedAt: Date.now() })
  const updated = await db.variables.get(id)
  if (!updated) throw new Error('variable not found')
  return updated
}

export async function deleteVariable(id: number): Promise<void> {
  const v = await db.variables.get(id)
  if (v) {
    const proj = await db.projects.get(v.projectId)
    if (proj?.locked) throw new Error('Dataset is locked — no further edits allowed')
  }
  if (v && (v.name === 'phone' || v.name === 'email')) throw new Error(v.name + ' column cannot be deleted')
  await db.variables.delete(id)
}

export function validateValue(variable: Variable, value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return null
  }
  switch (variable.type) {
    case 'numeric': {
      const n = typeof value === 'number' ? value : Number(String(value).trim())
      return Number.isFinite(n) ? null : 'expected number'
    }
    case 'boolean': {
      const s = String(value).toLowerCase().trim()
      return (s === 'true' || s === 'false' || s === '1' || s === '0') ? null : 'expected boolean (true/false)'
    }
    case 'date':
      return !Number.isNaN(Date.parse(String(value))) ? null : 'expected date (YYYY-MM-DD)'
    case 'string':
      return null
    default:
      return null
  }
}
