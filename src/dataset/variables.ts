import { db, type Variable } from '../db'

export type VariableInput = Omit<Variable, 'id' | 'createdAt' | 'updatedAt'>

export async function listVariables(projectId: number): Promise<Variable[]> {
  return db.variables.where('projectId').equals(projectId).sortBy('order')
}

export async function createVariable(input: VariableInput): Promise<Variable> {
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
  await db.variables.update(id, { ...patch, updatedAt: Date.now() })
  const v = await db.variables.get(id)
  if (!v) throw new Error('variable not found')
  return v
}

export async function deleteVariable(id: number): Promise<void> {
  await db.variables.delete(id)
}

export function validateValue(variable: Variable, value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    return variable.missingValues?.includes(String(value)) ? null : null
  }
  switch (variable.type) {
    case 'numeric':
      return typeof value === 'number' && Number.isFinite(value) ? null : 'expected number'
    case 'boolean':
      return typeof value === 'boolean' ? null : 'expected boolean'
    case 'date':
      return !Number.isNaN(Date.parse(String(value))) ? null : 'expected date'
    case 'string':
      return typeof value === 'string' ? null : 'expected string'
    default:
      return null
  }
}
