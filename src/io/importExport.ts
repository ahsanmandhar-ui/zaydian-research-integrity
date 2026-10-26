import * as XLSX from 'xlsx'
import { db } from '../db'
import { listVariables } from '../dataset/variables'
import { createRecord } from '../dataset/records'

export function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [headers.join(',')]
  for (const row of rows) lines.push(headers.map((h) => escape(row[h])).join(','))
  return lines.join('\n')
}

export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.trim().split(/\r?\n/)
  const headers = lines[0].split(',').map((h) => h.trim())
  const rows = lines.slice(1).map((line) => line.split(',').map((c) => c.trim()))
  return { headers, rows }
}

export async function exportProjectCsv(projectId: number): Promise<string> {
  const vars = await listVariables(projectId)
  const headers = vars.map((v) => v.name)
  const records = await db.records.where('projectId').equals(projectId).toArray()
  const rows = records.map((r) => r.values)
  return toCsv(headers, rows)
}

export async function importProjectCsv(projectId: number, csv: string): Promise<number> {
  const { headers, rows } = parseCsv(csv)
  const vars = await listVariables(projectId)
  const nameToVar = new Map(vars.map((v) => [v.name, v]))
  let count = 0
  for (const row of rows) {
    const values: Record<string, unknown> = {}
    headers.forEach((h, i) => {
      const v = nameToVar.get(h)
      if (!v) return
      const raw = row[i]
      if (v.type === 'numeric') values[h] = raw === '' ? null : Number(raw)
      else if (v.type === 'boolean') values[h] = raw === 'true'
      else values[h] = raw
    })
    await createRecord(projectId, values)
    count++
  }
  return count
}

export function exportXlsx(sheetName: string, headers: string[], rows: Record<string, unknown>[]): ArrayBuffer {
  const ws = XLSX.utils.json_to_sheet(rows, { header: headers })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

export function importXlsx(buffer: ArrayBuffer): { headers: string[]; rows: Record<string, unknown>[] } {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)
  const headers = rows.length ? Object.keys(rows[0]) : []
  return { headers, rows }
}
