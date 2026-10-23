import { useEffect, useState } from 'react'
import { db } from '../db'
import { listVariables, createVariable } from '../dataset/variables'
import { listRecords, createRecord, updateCell } from '../dataset/records'

export default function Dataset() {
  const [projectId, setProjectId] = useState<number | null>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [vars, setVars] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [newVar, setNewVar] = useState('')
  useEffect(() => { db.projects.toArray().then(setProjects) }, [])
  useEffect(() => { if (projectId) { listVariables(projectId).then(setVars); listRecords(projectId).then(setRecords) } }, [projectId])
  async function addVar() {
    if (!projectId || !newVar.trim()) return
    await createVariable({ projectId, name: newVar, type: 'string', order: vars.length })
    setNewVar('')
    listVariables(projectId).then(setVars)
  }
  async function addRow() {
    if (!projectId) return
    await createRecord(projectId, {})
    listRecords(projectId).then(setRecords)
  }
  async function editCell(recId: number, field: string, value: string) {
    await updateCell(recId, field, value)
    if (projectId) listRecords(projectId).then(setRecords)
  }
  return (
    <section>
      <h1>Dataset</h1>
      <select value={projectId ?? ''} onChange={(e) => setProjectId(Number(e.target.value) || null)}>
        <option value="">Select project</option>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      {projectId && (
        <>
          <div>
            <input value={newVar} onChange={(e) => setNewVar(e.target.value)} placeholder="New variable" />
            <button onClick={addVar}>Add Variable</button>
            <button onClick={addRow}>Add Row</button>
          </div>
          <table border={1}>
            <thead><tr>{vars.map((v) => <th key={v.id}>{v.name}</th>)}</tr></thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  {vars.map((v) => (
                    <td key={v.id}>
                      <input value={r.values?.[v.name] ?? ''} onChange={(e) => editCell(r.id, v.name, e.target.value)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  )
}
