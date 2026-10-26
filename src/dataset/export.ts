import { db, type Variable } from '../db'
import { applyFixation } from './fixation'

export type ExportFormat = 'csv' | 'json' | 'both'

export interface EmptyCell { row: number; variable: string }

export interface ExportOptions {
  projectId: number
  projectName: string
  includeSensitive: boolean
  applyAutoFix: boolean
  format: ExportFormat
}

export interface ExportResult {
  csv?: string
  json?: string
  emptyCells: EmptyCell[]
  fixedCells: EmptyCell[]
  excludedVars: string[]
}

const SENSITIVE = /email|phone|mobile|tel|contact/i

export function isSensitive(name: string): boolean {
  return SENSITIVE.test(name)
}

export function isEmptyValue(v: unknown): boolean {
  if (v === null || v === undefined) return true
  if (typeof v === 'string') return v.trim() === ''
  if (typeof v === 'number') return !Number.isFinite(v)
  return false
}

export function normalizeValue(v: unknown, type: Variable['type']): string | number | boolean | null {
  if (isEmptyValue(v)) return null
  if (type === 'numeric') {
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : null
  }
  if (type === 'boolean') {
    if (typeof v === 'boolean') return v
    const s = String(v).toLowerCase()
    if (s === 'true' || s === '1') return true
    if (s === 'false' || s === '0') return false
    return null
  }
  if (type === 'date') {
    const d = v instanceof Date ? v : new Date(String(v))
    return isNaN(d.getTime()) ? null : d.toISOString()
  }
  return String(v)
}
function csvEscape(field: string): string {
  if (/[",\n\r]/.test(field)) {
    return '"' + field.replace(/"/g, '""') + '"'
  }
  return field
}

export async function buildExport(opts: ExportOptions): Promise<ExportResult> {
  if (opts.applyAutoFix) {
    await applyFixation(opts.projectId, 0)
  }
  const vars = (await db.variables.where('projectId').equals(opts.projectId).toArray())
    .sort((a, b) => a.order - b.order)
  const records = await db.records.where('projectId').equals(opts.projectId).toArray()

  const includedVars = vars.filter(v => opts.includeSensitive || !isSensitive(v.name))
  const excludedVars = vars.filter(v => !opts.includeSensitive && isSensitive(v.name)).map(v => v.name)

  const emptyCells: EmptyCell[] = []
  const fixedCells: EmptyCell[] = []

  const jsonRecords = records.map((r, idx) => {
    const rowNo = r.rowIndex || idx + 1
    const values: Record<string, unknown> = {}
    for (const v of includedVars) {
      const raw = r.values?.[String(v.id)]
      const norm = normalizeValue(raw, v.type)
      values[v.name] = norm
      if (norm === null) emptyCells.push({ row: rowNo, variable: v.name })
    }
    return { id: r.id, rowIndex: rowNo, values }
  })

  const jsonPayload: any = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    project: { id: opts.projectId, name: opts.projectName },
    variables: includedVars.map(v => ({ id: v.id, name: v.name, type: v.type, order: v.order })),
    records: jsonRecords,
    emptyCells,
    fixedCells,
  }

  const canonical = JSON.stringify(jsonRecords)
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical))
  const checksum = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
  jsonPayload.checksum = checksum

  const result: ExportResult = { emptyCells, fixedCells, excludedVars }

  if (opts.format === 'csv' || opts.format === 'both') {
    const header = includedVars.map(v => csvEscape(v.name)).join(',')
    const rows = records.map((r) => {
      return includedVars.map(v => {
        const raw = r.values?.[String(v.id)]
        const norm = normalizeValue(raw, v.type)
        const s = norm === null ? 'EMPTY_CELL' : String(norm)
        return csvEscape(s)
      }).join(',')
    })
    result.csv = '\uFEFF' + [header, ...rows].join('\r\n')
  }

  if (opts.format === 'json' || opts.format === 'both') {
    result.json = JSON.stringify(jsonPayload, null, 2)
  }

  return result
}

export function downloadText(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export interface ImportSummary { records: number; variables: number; empty: number }

export async function importJson(projectId: number, text: string): Promise<ImportSummary> {
  const data = JSON.parse(text)
  if (data.schemaVersion !== 1) throw new Error('Unsupported schema version')
  const vars = data.variables as { name: string; type: Variable['type']; order: number }[]
  const existingVars = await db.variables.where('projectId').equals(projectId).toArray()
  const varIdByName = new Map<string, number>()
  for (const v of vars) {
    let found = existingVars.find(ev => ev.name === v.name)
    if (!found) {
      const id = await db.variables.add({ projectId, name: v.name, type: v.type, order: v.order, createdAt: Date.now(), updatedAt: Date.now() })
      found = await db.variables.get(id)
    }
    if (found?.id) varIdByName.set(v.name, found.id)
  }
  let emptyCount = 0
  for (const rec of data.records as { id?: number; rowIndex: number; values: Record<string, unknown> }[]) {
    const values: Record<string, unknown> = {}
    for (const [name, val] of Object.entries(rec.values || {})) {
      const vid = varIdByName.get(name)
      if (vid !== undefined) {
        values[String(vid)] = val
        if (val === null) emptyCount++
      }
    }
    if (rec.id) {
      const existing = await db.records.get(rec.id)
      if (existing) {
        await db.records.update(rec.id, { values, updatedAt: Date.now() })
      } else {
        await db.records.add({ projectId, rowIndex: rec.rowIndex, values, createdAt: Date.now(), updatedAt: Date.now() })
      }
    } else {
      await db.records.add({ projectId, rowIndex: rec.rowIndex, values, createdAt: Date.now(), updatedAt: Date.now() })
    }
  }
  return { records: data.records.length, variables: vars.length, empty: emptyCount }
}

