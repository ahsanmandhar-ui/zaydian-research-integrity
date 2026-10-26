import { db } from '../db'

export async function generateRicId(date = new Date()): Promise<string> {
  const day = date.toISOString().slice(0,10).replace(/-/g,'')
  const prefix = `RIC-${day}-`
  const existing = await db.projects.where('trackingId').startsWith(prefix).count()
  const seq = existing + 1
  return `${prefix}${String(seq).padStart(3,'0')}`
}