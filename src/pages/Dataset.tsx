import { useEffect, useState } from 'react'
import { db } from '../db'
import { currentUser, hasPermission, login } from '../auth/auth'
import { listVariables, createVariable, deleteVariable, updateVariable, validateValue } from '../dataset/variables'
import { listRecords, createRecord, updateCell } from '../dataset/records'
import * as XLSX from 'xlsx'
import DatasetChat from '../components/DatasetChat'
import { buildExport, downloadText } from '../dataset/export'
import ExportModal from '../components/ExportModal'
import AnalyticsTab from '../components/AnalyticsTab'

const DOC_HEADINGS = ['SYNOPSIS','IRB APPROVAL','DATA COLLECTION FORUM','ANALYSIS','MANUSCRIPT WRITING']

function cellTooltip(r:any, field:string, users:any[], vars:any[] = []) {
  const m = r.cellMeta?.[field]
  const v = vars.find((x:any)=>x.name===field)
  const typeInfo = v ? `Type: ${v.type}. ` + (
    v.type === 'numeric' ? 'Allowed: finite number (e.g. 42, 3.14). Flagged if non-numeric/empty.' :
    v.type === 'boolean' ? 'Allowed: true/false or 1/0. Flagged if other.' :
    v.type === 'date' ? 'Allowed: date (YYYY-MM-DD). Flagged if unparseable/empty.' :
    'Allowed: any text. Flagged if empty.'
  ) : ''
  if (!m) return typeInfo
  const name = (id:number) => users.find((u:any)=>u.id===id)?.displayName || ('user#'+id)
  const created = `Created by ${name(m.createdBy)} at ${new Date(m.createdAt).toLocaleString()}`
  const hist = (m.history||[]).map((h:any)=>`${name(h.userId)}: ${String(h.value)} (${new Date(h.at).toLocaleString()})`).join(' | ')
  return `${typeInfo}
${created}
History: ${hist}`
}
export default function Dataset() {
  const [projectId, setProjectId] = useState<number | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [view, setView] = useState<'data'|'analytics'>('data')
  const [zoom, setZoom] = useState<number>(100)
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set())
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [showColumnDrawer, setShowColumnDrawer] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportEmpty, setExportEmpty] = useState<any[]>([])
  const [exportExcluded, setExportExcluded] = useState<string[]>([])
  const [exportProjectName, setExportProjectName] = useState('dataset')

  const [projects, setProjects] = useState<any[]>([])
  const [vars, setVars] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])
  const [newVar, setNewVar] = useState('')
  const [newVarType, setNewVarType] = useState<'string'|'numeric'|'date'|'boolean'>('string')
  const [renameVarId, setRenameVarId] = useState<number | null>(null)
  const [renameVarName, setRenameVarName] = useState('')
  const [renameVarLabel, setRenameVarLabel] = useState('')
  const [deleteVarId, setDeleteVarId] = useState<number | null>(null)
  const [deleteVarEmail, setDeleteVarEmail] = useState('')
  const [deleteVarPassword, setDeleteVarPassword] = useState('')
  const [newVarLabel, setNewVarLabel] = useState('')
  const [msg, setMsg] = useState('')
  const [target, setTarget] = useState('')
  const [docs, setDocs] = useState<Record<string,string>>({})
  const [canEdit, setCanEdit] = useState(false)
  const [canEditData, setCanEditData] = useState(false)
  const [canManageColumns, setCanManageColumns] = useState(false)
  const [showCompleteForm, setShowCompleteForm] = useState(false)
  const [completeWarning, setCompleteWarning] = useState(false)
  const [completeAuth, setCompleteAuth] = useState(false)
  const [completeEmail, setCompleteEmail] = useState('')
  const [completePassword, setCompletePassword] = useState('')
  const [completeTopic, setCompleteTopic] = useState('')
  const [completeParticipants, setCompleteParticipants] = useState('')
  const [completeAuthors, setCompleteAuthors] = useState<{name:string;role:string;email:string}[]>([{name:'',role:'author',email:''}])
  const [completeCOI, setCompleteCOI] = useState('')
  const [completeSponsors, setCompleteSponsors] = useState('')
  const [completeLocation, setCompleteLocation] = useState('')
  const [completionMsg, setCompletionMsg] = useState('')
  const [isCompleted, setIsCompleted] = useState(false)
  const [completionData, setCompletionData] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [undoStack, setUndoStack] = useState<any[]>([])
  const [redoStack, setRedoStack] = useState<any[]>([])
  const [sortKey, setSortKey] = useState<string>('')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc')
  const [filterText, setFilterText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [u, setU] = useState<any>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && view === 'analytics') setView('data')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view])
  async function load() {
    const u = await currentUser(); setU(u)
    if (!projectId) return
    // Check if dataset is already completed
    const cd = await db.completedDatasets.where('projectId').equals(projectId).first()
    if (cd) {
      setIsCompleted(true)
      const org = await db.organizations.get(cd.organizationId)
      setCompletionData({ ...cd, organizationName: org?.name || 'Unknown' })
    } else {
      setIsCompleted(false)
      setCompletionData(null)
    }
    setUsers(await db.users.toArray())
    let vs = await listVariables(projectId)
    if (!vs.some(v=>v.name==='phone')) {
      await createVariable({ projectId, name:'phone', type:'string', order: vs.length })
      vs = await listVariables(projectId)
    }
    if (!vs.some(v=>v.name==='email')) {
      await createVariable({ projectId, name:'email', type:'string', order: vs.length })
      vs = await listVariables(projectId)
    }
    // ensure an editable placeholder column exists
    if (!vs.some(v=>v.name!=='phone' && v.name!=='email')) {
      await createVariable({ projectId, name:'column1', type:'string', label:'', order: 0 })
      vs = await listVariables(projectId)
    }
    // protected columns last
    vs = vs.slice().sort((a:any,b:any)=>{
      const pa = a.name==='phone'||a.name==='email'
      const pb = b.name==='phone'||b.name==='email'
      if (pa && !pb) return 1
      if (!pa && pb) return -1
      return (a.order??0)-(b.order??0)
    })
    setVars(vs)
    setColumnOrder(prev => {
      const ids = vs.map((v:any)=>v.id)
      if (prev.length === 0) return ids
      const protectedIds = vs.filter((v:any)=>v.name==='phone'||v.name==='email').map((v:any)=>v.id)
      const base = prev.filter((id:any)=>ids.includes(id))
      const newIds = ids.filter((id:any)=>!prev.includes(id))
      const firstProtected = base.findIndex((id:any)=>protectedIds.includes(id))
      const merged = firstProtected === -1 ? [...base, ...newIds] : [...base.slice(0, firstProtected), ...newIds, ...base.slice(firstProtected)]
      return merged
    })
    setRecords(await listRecords(projectId))
    const p = await db.projects.get(projectId)
    setTarget(String(p?.targetSampleSize ?? ''))
    setDocs(p?.documents ?? {})
    const admin = u && await hasPermission(u,'*')
    const globalLead = u && await hasPermission(u,'team:manage')
     const lead = !!(u && (globalLead || (await db.memberships.where('projectId').equals(projectId).and(m=>m.userId===u.id && m.role==='team_lead').count())>0))
    setCanEdit(!!(admin||lead))
     const mem = u && await db.memberships.where('projectId').equals(projectId).and(m=>m.userId===u.id).first()
     const isDataCollector = mem?.role === 'data_collector' || mem?.role === 'data collector'
     setCanEditData(!!(admin||lead||isDataCollector))
     setCanManageColumns(!!(admin||lead))
  }
  useEffect(() => { db.projects.toArray().then((ps) => { setProjects(ps); if (ps.length && projectId === null) setProjectId(ps[0].id as number) }) }, [])
  useEffect(() => { load() }, [projectId])

  // Pre-fill completion form when editing existing data
  useEffect(() => {
    if (showCompleteForm && completionData) {
      setCompleteTopic(completionData.topicName || '')
      setCompleteParticipants(completionData.participants || '')
      setCompleteAuthors(completionData.authors?.length ? completionData.authors : [{name:'',role:'author',email:''}])
      setCompleteCOI(completionData.conflictOfInterest || '')
      setCompleteSponsors(completionData.sponsors || '')
      setCompleteLocation(completionData.studyLocation || '')
    }
  }, [showCompleteForm, completionData])
  async function openExport() {
    if (!projectId) return
    const p = await db.projects.get(projectId)
    const name = p?.name || 'dataset'
    setExportProjectName(name)
    const res = await buildExport({ projectId, projectName: name, includeSensitive: false, applyAutoFix: false, format: 'both' })
    setExportEmpty(res.emptyCells)
    setExportExcluded(res.excludedVars)
    setExportOpen(true)
  }
  async function doExport(includeSensitive: boolean, applyAutoFix: boolean, format: 'csv'|'json'|'both') {
    if (!projectId) return
    const res = await buildExport({ projectId, projectName: exportProjectName, includeSensitive, applyAutoFix, format })
    const base = `${exportProjectName}_export_${new Date().toISOString().slice(0,10)}`
    if (res.csv) downloadText(res.csv, base + '.csv', 'text/csv;charset=utf-8')
    if (res.json) downloadText(res.json, base + '.json', 'application/json')
    setExportOpen(false)
  }
  async function addVar() {
     if (!projectId || !newVar.trim() || !canManageColumns) return
    await createVariable({ projectId, name: newVar, type: newVarType, label: newVarLabel || newVar, order: vars.length })
    setNewVar('')
    setNewVarLabel('')
    load()
  }
  async function importData(file: File) {
    if (!projectId || !canEditData) return
    const buf = await file.arrayBuffer()
    const wb = XLSX.read(buf)
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows:any[] = XLSX.utils.sheet_to_json(ws)
    let imported=0, skipped=0, errors=0
    for (const r of rows) {
      const vals:any = {}
      let rowOk=true
      for (const k of Object.keys(r)) {
        let v = r[k]
        if (typeof v === 'string') v = v.trim()
        if (k === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v))) { rowOk=false; errors++; break }
        if (k === 'phone' && v && !/^[0-9+\-()\s]+$/.test(String(v))) { rowOk=false; errors++; break }
        if (k === 'phone' || k === 'email') { vals[k]=v; continue }
        if (!vars.some(vv=>vv.name===k)) {
          await createVariable({ projectId, name:k, type:'string', order: vars.length })
        }
        vals[k]=v
      }
      if (!rowOk) { skipped++; continue }
      await createRecord(projectId, vals)
      imported++
    }
    load()
    setMsg(`Imported ${imported} rows, skipped ${skipped}, errors ${errors}`)
  }
  function exportData(type:'xlsx'|'csv') {
    const exportVars = vars.filter(v=>v.name!=='phone' && v.name!=='email')
    const data = records.map(r => {
      const o:any = {}
      for (const v of exportVars) o[v.name]=r.values?.[v.name] ?? ''
      return o
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data')
    let blob: Blob
    let filename: string
    if (type==='csv') {
      const csv = XLSX.utils.sheet_to_csv(ws)
      blob = new Blob([csv], { type:'text/csv;charset=utf-8;' })
      filename = 'dataset.csv'
    } else {
      const out = XLSX.write(wb, { bookType:'xlsx', type:'array' })
      blob = new Blob([out], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      filename = 'dataset.xlsx'
    }
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    // open in default browser/preview as well
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    setMsg(`Exported ${records.length} rows as ${filename}`)
  }

  async function addRow() {
     if (!projectId || !canEditData) return
    setMsg('')
    try { const recId = await createRecord(projectId, {}); const u = await currentUser(); await db.auditLog.add({ entityType: 'record', entityId: String(recId), action: 'create', actorId: u?.id, details: { projectId }, createdAt: Date.now() }) } catch (e:any) { setMsg(e.message); return }
    load()
  }
  function exportVersioned() {
    const ok = window.confirm('Export excludes email/phone and flags empty cells. Download now?')
    if (!ok) return
    const exportVars = vars.filter((v:any) => v.name !== 'phone' && v.name !== 'email')
    const data = records.map((r:any) => {
      const o: any = {}
      for (const v of exportVars) {
        const val = r.values?.[v.name]
        const empty = val === null || val === undefined || String(val).trim() === ''
        o[v.name] = empty ? 'EMPTY_CELL' : val
      }
      return o
    })
    // integrity index
    const totalCells = records.length * (exportVars.length || 1)
    let filled = 0, valid = 0, edits = 0
    for (const r of records) for (const v of exportVars) {
      const val = r.values?.[v.name]
      const empty = val === null || val === undefined || String(val).trim() === ''
      if (!empty) filled++
      if (!validateValue(v, val)) valid++
      edits += (r.cellMeta?.[v.name]?.history || []).length
    }
    const uniqueness = new Set(records.map((r:any) => JSON.stringify(r.values || {}))).size / (records.length || 1)
    const completeness = totalCells ? filled / totalCells : 1
    const validity = totalCells ? valid / totalCells : 1
    const editStability = 1 - Math.min(1, edits / (totalCells * 3 || 1))
    const integrityIndex = Math.round(100 * (0.35 * completeness + 0.25 * validity + 0.20 * uniqueness + 0.20 * editStability))
    const manifest = { exportVersion: '1.0', appVersion: '1.0.0', exportedAt: new Date().toISOString(), integrityIndex, rowCount: records.length, variables: exportVars.map((v:any) => ({ name: v.name, type: v.type })) }
    const jsonBlob = new Blob([JSON.stringify({ manifest, data }, null, 2)], { type: 'application/json' })
    const jsonUrl = URL.createObjectURL(jsonBlob)
    const a1 = document.createElement('a'); a1.href = jsonUrl; a1.download = 'dataset.v1.json'; a1.click()
    // CSV with empty cells flagged
    const headers = exportVars.map((v:any) => v.name)
    const rows = records.map((r:any) => exportVars.map((v:any) => {
      const val = r.values?.[v.name]
      const empty = val === null || val === undefined || String(val).trim() === ''
      return empty ? 'EMPTY_CELL' : val
    }))
    const csv = [headers.join(','), ...rows.map((row:any[]) => row.map((cell:any) => `\"${String(cell).replace(/\"/g,'\"\"')}\"`).join(','))].join('\\n')
    const csvBlob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const csvUrl = URL.createObjectURL(csvBlob)
    const a2 = document.createElement('a'); a2.href = csvUrl; a2.download = 'dataset.csv'; a2.click()
    URL.revokeObjectURL(jsonUrl); URL.revokeObjectURL(csvUrl)
    setMsg(`Exported ${records.length} rows. Integrity index: ${integrityIndex}`)
  }

  async function editCell(recId: number, field: string, value: string) {
    if (field === 'email' && value && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value)) { setMsg('Invalid email format'); return }
    if (field === 'phone' && value && !/^[0-9+\-()\s]+$/.test(value)) { setMsg('Phone must be numeric'); return }
    const rec = records.find(r=>r.id===recId)
    const old = rec?.values?.[field] ?? ''
    try {
      await updateCell(recId, field, value, u?.id)
      await db.auditLog.add({ entityType: 'record', entityId: String(recId), action: 'update', actorId: u?.id, details: { field, oldValue: old, newValue: value }, createdAt: Date.now() })
      setUndoStack(s=>[...s, {recId, field, old, value}])
      setRedoStack([])
      load()
    } catch (e:any) { setMsg(e.message) }
  }
  async function undo() {
    const last = undoStack[undoStack.length-1]
    if (!last) return
    try {
      await updateCell(last.recId, last.field, last.old, u?.id)
      setUndoStack(s=>s.slice(0,-1))
      setRedoStack(s=>[...s,last])
      load()
    } catch(e:any){ setMsg(e.message) }
  }
  async function redo() {
    const last = redoStack[redoStack.length-1]
    if (!last) return
    try {
      await updateCell(last.recId, last.field, last.value, u?.id)
      setRedoStack(s=>s.slice(0,-1))
      setUndoStack(s=>[...s,last])
      load()
    } catch(e:any){ setMsg(e.message) }
  }
  async function confirmDeleteVar() {
    if (deleteVarId == null) return
    const v = vars.find((x:any)=>x.id===deleteVarId)
    if (v && ['phone','email'].includes(v.name)) { setMsg('protected column cannot be deleted'); return }
    const u = await currentUser()
    const isHeadOrAdmin = !!(u && (await hasPermission(u,'*') || await hasPermission(u,'team:manage')))
    if (!isHeadOrAdmin || !canManageColumns) { setMsg('research head or admin only'); return }
    try {
      await login(deleteVarEmail, deleteVarPassword)
      const now = await currentUser()
      if (!now || !(await hasPermission(now,'*') || await hasPermission(now,'team:manage'))) throw new Error('invalid credentials')
      await deleteVariable(deleteVarId)
      const u = await currentUser()
      await db.auditLog.add({ entityType: 'variable', entityId: String(deleteVarId), action: 'delete', actorId: u?.id, details: { variableName: v?.name }, createdAt: Date.now() })
      setDeleteVarId(null); setDeleteVarEmail(''); setDeleteVarPassword('')
      load()
      setMsg('column deleted')
    } catch (e:any) { setMsg(e?.message || 'delete failed') }
  }
  function startRename(v:any) {
    if (!canManageColumns || ['phone','email'].includes(v.name)) return
    setRenameVarId(v.id)
    setRenameVarName(v.name)
    setRenameVarLabel(v.label || v.name)
  }
  async function saveRename() {
    if (!renameVarId) return
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(renameVarName)) { setMsg('invalid variable name'); return }
    try {
      await updateVariable(renameVarId, { name: renameVarName, label: renameVarLabel || renameVarName })
      setRenameVarId(null)
      setRenameVarName('')
      setRenameVarLabel('')
      load()
    } catch (e:any) { setMsg(e?.message || 'rename failed') }
  }
  async function saveTarget() {
    if (!projectId || !canEdit) return
    await db.projects.update(projectId, { targetSampleSize: Number(target)||0, updatedAt: Date.now() })
    load()
  }
  async function saveDoc(key:string) {
    if (!projectId || !canEdit) return
    const next = { ...docs, [key]: docs[key] }
    await db.projects.update(projectId, { documents: next, updatedAt: Date.now() })
    load()
  }
  const progress = target ? Math.min(100, Math.round((records.length / Number(target)) * 100)) : 0

  const displayVars = columnOrder.map(id => vars.find((v:any)=>v.id===id)).filter(Boolean).filter((v:any)=>!hiddenCols.has(v.id))

  return (
    <>

    <section style={{ display: view === 'data' ? 'flex' : 'none', gap: 16, alignItems: 'flex-start' }}>
      <div style={{flex:1}}>
        <h1>Dataset {projects.find(p=>p.id===projectId)?.locked ? <span style={{fontSize:14,color:'var(--danger)'}}>🔒 Locked</span> : null}</h1>
        <div style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: 12 }}>
          <span style={{ color: '#ef4444', textShadow: '0 0 6px #ef4444', fontWeight: 700 }}>empty/missing</span>
          <span style={{ color: '#f59e0b', textShadow: '0 0 6px #f59e0b', fontWeight: 700 }}>auto-fixed</span>
          <span style={{ color: '#a855f7', textShadow: '0 0 6px #a855f7', fontWeight: 700 }}>user-overridden (locked)</span>
          <span style={{ color: '#22c55e', textShadow: '0 0 6px #22c55e', fontWeight: 700 }}>valid</span>
          <button onClick={async () => {
            const numericVars = vars.filter((v:any) => v.type === 'numeric')
            for (const v of numericVars) {
              const vals = records.map((r:any) => Number(r.values?.[v.name])).filter(Number.isFinite)
              if (vals.length < 3) continue
              const mean = vals.reduce((a,b)=>a+b,0)/vals.length
              const std = Math.sqrt(vals.reduce((a,b)=>a+(b-mean)**2,0)/vals.length)
              if (std === 0) continue
              for (const r of records) {
                const val = Number(r.values?.[v.name])
                if (Number.isFinite(val) && Math.abs(val-mean) > 3*std) {
                  try { await updateCell(r.id, v.name, mean, 0) } catch {}
                }
              }
            }
            setRecords(await listRecords(projectId as number))
            setMsg('Auto-fixed outliers (marked amber)')
          }}>Auto-fix outliers</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button className="tab-btn" onClick={() => setView('data')} style={{ fontWeight: view === 'data' ? 700 : 400 }}>Data</button>
          <button className="tab-btn" onClick={() => setView('analytics')} style={{ fontWeight: view === 'analytics' ? 700 : 400 }}>Analytics</button>
        </div>
        <select value={projectId ?? ''} onChange={(e) => setProjectId(Number(e.target.value) || null)}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {projectId && (
          <>
            <div className="glass-panel" style={{ padding:8, display:'flex', flexWrap:'wrap', gap:8, alignItems:'center' }}>
             {canManageColumns && (<><input aria-label="New variable name" value={newVar} onChange={(e) => setNewVar(e.target.value)} placeholder="New variable" />
               <select value={newVarType} onChange={(e)=>setNewVarType(e.target.value as any)}><option value="string">string</option><option value="numeric">numeric</option><option value="date">date</option><option value="boolean">boolean</option></select>
               <input aria-label="Variable label" value={newVarLabel} onChange={(e)=>setNewVarLabel(e.target.value)} placeholder="Label" />
               <button onClick={addVar}>Add Variable</button></>)}
              <button onClick={addRow}>Add Row</button>
              <input placeholder="Filter..." value={filterText} onChange={e=>setFilterText(e.target.value)} />
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} aria-label="Status filter">
                <option value="all">All statuses</option>
                <option value="empty">Empty/missing</option>
                <option value="autofixed">Auto-fixed</option>
                <option value="locked">User-overridden</option>
                <option value="valid">Valid</option>
              </select>
              <select value={sortKey} onChange={e=>setSortKey(e.target.value)}>
                <option value="">Sort by</option>
                {vars.map(v=> <option key={v.id} value={v.name}>{v.name}</option>)}
              </select>
              <button onClick={()=>setSortDir(d=>d==='asc'?'desc':'asc')}>{sortDir}</button>
               <button onClick={undo} disabled={!undoStack.length}>Undo</button>
               <button onClick={redo} disabled={!redoStack.length}>Redo</button>
               <button onClick={()=>exportData("csv")}>Export CSV</button>
               <button onClick={()=>exportData("xlsx")}>Export XLSX</button>
               <button onClick={()=>setShowColumnDrawer(s=>!s)}>Columns</button>
               <label style={{ display:'flex', alignItems:'center', gap:6 }}>Zoom
                 <input className="glass-slider water-bar" type="range" min={50} max={150} value={zoom} onChange={e=>setZoom(Number(e.target.value))} />
                 <span>{zoom}%</span>
               </label>
               <button onClick={openExport}>Export (Red-flag)</button>
               <button onClick={()=>document.getElementById("importFile")?.click()}>Import</button>
               <input id="importFile" type="file" accept=".xlsx,.csv" style={{display:"none"}} onChange={e=>{ if(e.target.files?.[0]) { importData(e.target.files[0]); e.target.value="" } }} />
            </div>
            {msg && <div role="status" aria-live="polite" style={{color:'red'}}>{msg}</div>}
            <div className="zri-card" style={{marginTop:8}}>
              <strong>Data Quality</strong>
              <div>Rows: {records.length} | Variables: {vars.length}</div>
              <div>Missing values: {records.reduce((n,r)=>n + vars.filter(v=>r.values?.[v.name]===null || r.values?.[v.name]===undefined || r.values?.[v.name]==='').length,0)}</div>
              <div>Invalid values: {records.reduce((n,r)=>n + vars.filter(v=> !!validateValue(v, r.values?.[v.name])).length,0)}</div>
            </div>
            <div style={{marginTop:8}}><button onClick={exportVersioned}>Export (versioned)</button></div>
            {showColumnDrawer && (
              <div className="glass-panel" style={{ padding:8, marginBottom:8 }}>
                <strong>Columns</strong>
                <ul style={{ listStyle:'none', padding:0 }}>
                  {columnOrder.map((id, idx) => {
                    const v = vars.find((vv:any)=>vv.id===id)
                    if (!v) return null
                    return (
                      <li key={id} style={{ display:'flex', gap:8, alignItems:'center' }}>
                        <input type="checkbox" checked={!hiddenCols.has(id)} onChange={e=>{
                          setHiddenCols(prev=>{ const n=new Set(prev); if(e.target.checked) n.delete(id); else n.add(id); return n })
                        }} />
                        <span>{v.name}</span>
                        <button onClick={()=>setColumnOrder(prev=>{ const a=[...prev]; if(idx>0){ [a[idx-1],a[idx]]=[a[idx],a[idx-1]] } return a })}>↑</button>
                        <button onClick={()=>setColumnOrder(prev=>{ const a=[...prev]; if(idx<a.length-1){ [a[idx],a[idx+1]]=[a[idx+1],a[idx]] } return a })}>↓</button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
            {deleteVarId != null && (
              <div className="zri-card" style={{marginTop:12}}>
                <h3>Delete Column</h3>
                <input placeholder="Email" value={deleteVarEmail} onChange={e=>setDeleteVarEmail(e.target.value)} />
                <input placeholder="Password" type="password" value={deleteVarPassword} onChange={e=>setDeleteVarPassword(e.target.value)} />
                <button onClick={confirmDeleteVar}>Confirm Delete</button>
                <button onClick={() => { setDeleteVarId(null); setDeleteVarEmail(''); setDeleteVarPassword('') }}>Cancel</button>
              </div>
            )}
            <table className="zri-table" border={1} role="grid" aria-label="Dataset grid" style={{ fontSize: `${zoom}%` }}>
              <thead><tr>{displayVars.map((v:any) => <th key={v.id}>
                {renameVarId === v.id ? (
                  <>
                    <input value={renameVarName} onChange={e=>setRenameVarName(e.target.value)} style={{width:90}} />
                    <input value={renameVarLabel} onChange={e=>setRenameVarLabel(e.target.value)} style={{width:90}} placeholder="label" />
                    <button onClick={saveRename}>✓</button>
                    <button onClick={()=>setRenameVarId(null)}>✕</button>
                  </>
                ) : (
                  <>
                    {v.name}
                    {!['phone','email'].includes(v.name) && canManageColumns && (
                      <>
                        <button onClick={()=>startRename(v)}>rename</button>
                        <button onClick={()=>setDeleteVarId(v.id)}>x</button>
                      </>
                    )}
                  </>
                )}
              </th>)}</tr></thead>
              <tbody>
                {records
                  .filter(r => !filterText || Object.values(r.values||{}).some(x => String(x).toLowerCase().includes(filterText.toLowerCase())))
                  .filter(r => statusFilter === 'all' || displayVars.some((v:any) => {
                    const val = r.values?.[v.name]
                    const empty = val === null || val === undefined || String(val).trim() === ''
                    const hist = (r.cellMeta?.[v.name]?.history || [])
                    const locked = hist.some((h:any) => h.userId && h.userId !== 0)
                    const autoFixed = hist.some((h:any) => h.userId === 0)
                    const st = empty ? 'empty' : (locked ? 'locked' : (autoFixed ? 'autofixed' : 'valid'))
                    return st === statusFilter
                  }))
                  .slice().sort((a:any,b:any) => {
                    if (!sortKey) return 0
                    const av = a.values?.[sortKey] ?? ''
                    const bv = b.values?.[sortKey] ?? ''
                    const cmp = String(av).localeCompare(String(bv))
                    return sortDir==='asc' ? cmp : -cmp
                  })
                  .map((r) => (
                  <tr key={r.id}>
                    {displayVars.map((v:any,ci) => (
                      <td key={v.id} style={ci===0?{position:'sticky',left:0,background:'linear-gradient(135deg, rgba(94,106,210,0.35), rgba(34,197,94,0.25))', backdropFilter:'blur(8px)'}:{}}>
                        {v.type === 'boolean' ? (
                          <select className="glass-input boolean-select" disabled={!canEditData} value={r.values?.[v.name] === true ? 'true' : (r.values?.[v.name] === false ? 'false' : (r.values?.[v.name] ?? ''))} onChange={(e)=>editCell(r.id, v.name, e.target.value)} title={cellTooltip(r, v.name, users, vars)}>
                            <option value="">--</option>
                            <option value="true">true</option>
                            <option value="false">false</option>
                          </select>
                        ) : v.type === 'date' ? (
                          <input className={`glass-input ${(() => { const val = r.values?.[v.name]; const empty = val === null || val === undefined || String(val).trim() === ''; const hist = (r.cellMeta?.[v.name]?.history || []); const locked = hist.some((h:any) => h.userId && h.userId !== 0); const autoFixed = hist.some((h:any) => h.userId === 0); return empty ? 'cell-empty' : (locked ? 'cell-locked' : (autoFixed ? 'cell-autofixed' : 'cell-valid')) })()}`} type="date" disabled={!canEditData} value={(() => { const val = r.values?.[v.name]; if (!val) return ''; const d = new Date(String(val)); return isNaN(d.getTime()) ? '' : d.toISOString().slice(0,10) })()} onChange={(e)=>editCell(r.id, v.name, e.target.value)} title={cellTooltip(r, v.name, users, vars)} />
                        ) : (
                          <input className={(() => { const val = r.values?.[v.name]; const empty = val === null || val === undefined || String(val).trim() === ''; const hist = (r.cellMeta?.[v.name]?.history || []); const locked = hist.some((h:any) => h.userId && h.userId !== 0); const autoFixed = hist.some((h:any) => h.userId === 0); return empty ? 'cell-empty' : (locked ? 'cell-locked' : (autoFixed ? 'cell-autofixed' : 'cell-valid')) })()} disabled={!canEditData} value={r.values?.[v.name] ?? ''} onChange={(e) => editCell(r.id, v.name, e.target.value)} onKeyDown={(e)=>{ if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='c'){ navigator.clipboard.writeText(String(r.values?.[v.name] ?? '')) } if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='v'){ navigator.clipboard.readText().then(t=>editCell(r.id,v.name,t)).catch(()=>{}) } if(e.key==='ArrowDown'||e.key==='ArrowUp'||e.key==='ArrowLeft'||e.key==='ArrowRight'){ e.preventDefault(); const inputs=Array.from(document.querySelectorAll('table input, table select')) as HTMLElement[]; const idx=inputs.indexOf(e.target as HTMLElement); const cols=displayVars.length; let next=idx; if(e.key==='ArrowRight') next=idx+1; if(e.key==='ArrowLeft') next=idx-1; if(e.key==='ArrowDown') next=idx+cols; if(e.key==='ArrowUp') next=idx-cols; if(inputs[next]) (inputs[next] as any).focus() } }} title={cellTooltip(r, v.name, users, vars)} />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
      {projectId && (
        <aside className="zri-sidebar glass-panel" style={{ width:320, minWidth:220, maxWidth:320, position:'sticky', top:0, alignSelf:'start', flexShrink:0 }}>
          <div className="zri-card" style={{background:'linear-gradient(135deg,rgba(170,59,255,.12),rgba(192,132,252,.12))', transition:'transform .2s', cursor:'default', whiteSpace:'normal', overflow:'visible', wordBreak:'break-word'}} onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.02)')} onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}>
            <h2>Target Sample Size</h2>
            <div style={{display:'flex',gap:8}}>
              <input value={target} onChange={e=>setTarget(e.target.value)} disabled={!canEdit} />
              {canEdit && <button onClick={saveTarget}>Save</button>}
            </div>
            <div style={{marginTop:8}}>Progress: {records.length} / {target || 0}</div>
            <div>{progress}% complete</div>
          </div>
          <div className="zri-card" style={{marginTop:12, background:'linear-gradient(135deg,rgba(255,255,255,.6),rgba(170,59,255,.08))'}}>
            <h2>Documents</h2>
            {DOC_HEADINGS.map(h=>(
              <div key={h} style={{marginBottom:10, transition:'transform .2s'}} onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.03)')} onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}>
                <div style={{fontWeight:700,color:'var(--text-h)'}}>{h}</div>
                <div style={{display:'flex',gap:6}}>
                  <input value={docs[h]||''} onChange={e=>setDocs({...docs,[h]:e.target.value})} disabled={!canEdit} placeholder="Paste drive link" />
                  {canEdit && <button onClick={()=>saveDoc(h)}>Save</button>}
                  {docs[h] && <button onClick={()=>window.open(docs[h],'_blank')}>Open</button>}
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}
    {projectId && canEdit && !isCompleted && (
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <button onClick={() => setCompleteWarning(true)} style={{ background: 'var(--danger)', color: '#fff', padding: '12px 24px', fontSize: 16, fontWeight: 700, border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          Complete Dataset
        </button>
      </div>
    )}
    {isCompleted && completionData && (
      <div className="zri-card" style={{ marginTop: 24, border: '2px solid var(--success)' }}>
        <h2>✅ Dataset Completed</h2>
        <div style={{ fontSize: 14, lineHeight: 1.8 }}>
          <div><strong>Organization:</strong> {completionData.organizationName || 'N/A'}</div>
          <div><strong>Topic:</strong> {completionData.topicName}</div>
          <div><strong>Participants:</strong> {completionData.participants}</div>
          <div><strong>Authors:</strong></div>
          <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
            {completionData.authors?.map((a: any, i: number) => (
              <li key={i}>{a.name} ({a.role}) — {a.email}</li>
            ))}
          </ul>
          <div><strong>Conflict of Interest:</strong> {completionData.conflictOfInterest || 'None declared'}</div>
          <div><strong>Sponsors:</strong> {completionData.sponsors || 'None'}</div>
          <div><strong>Study Location:</strong> {completionData.studyLocation}</div>
          <div><strong>Completed:</strong> {new Date(completionData.completedAt).toLocaleString()}</div>
          <div><strong>Crypto Key:</strong> <code style={{ background: 'var(--bg-2)', padding: '2px 6px', borderRadius: 4 }}>{completionData.cryptoKey}</code></div>
          <div style={{ marginTop: 8 }}><button onClick={async () => { try { const QRCode = (await import('qrcode')).default; const url = await QRCode.toDataURL(completionData.cryptoKey, { width: 128, margin: 1 }); const w = window.open(); if (w) { w.document.write('<img src="' + url + '" />'); } } catch (e) { console.error(e) } }}>Show QR Code</button></div>
          <div><strong>Edit Count:</strong> {completionData.editCount}</div>
          {canEdit && <button onClick={() => setShowCompleteForm(true)} style={{ marginTop: 8 }}>Edit Completion Data</button>}
          {completionData.editCount > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontWeight: 600, color: '#3b82f6' }}>Edited Sections ({completionData.editCount} edits)</div>
              {completionData.editHistory?.map((e: any, i: number) => (
                <div key={i} style={{ fontSize: 12, marginTop: 4, borderLeft: '3px solid #3b82f6', paddingLeft: 8, background: 'rgba(59,130,246,0.08)' }}>
                  Edit #{i + 1}: {e.changedFields.join(', ')} — {new Date(e.editedAt).toLocaleString()}
                </div>
              ))}
            </div>
          )}
        </div>
        {canEdit && <button onClick={() => setShowCompleteForm(true)} style={{ marginTop: 12 }}>Edit Completion Data</button>}
      </div>
    )}
    <button className="zri-badge" onClick={()=>setChatOpen(true)} style={{ position:'fixed', right:16, bottom:16, zIndex:998 }}>Chat</button>
    {/* Complete Dataset Warning Popup */}
    {completeWarning && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
        <div className="zri-card" style={{ width:400, padding:20 }}>
          <h3 style={{ color:'var(--danger)' }}>Warning</h3>
          <p>This action is irreversible. No further changes will be allowed to this dataset after completion.</p>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
            <button onClick={() => setCompleteWarning(false)}>Cancel</button>
            <button onClick={() => { setCompleteWarning(false); setCompleteAuth(true) }} style={{ background:'var(--danger)', color:'#fff' }}>I Understand, Continue</button>
          </div>
        </div>
      </div>
    )}
    {/* Auth Confirmation Popup */}
    {completeAuth && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
        <div className="zri-card" style={{ width:400, padding:20 }}>
          <h3>Confirm Identity</h3>
          <p style={{ fontSize:13, color:'var(--text-muted)' }}>Enter your email and password to confirm.</p>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:12 }}>
            <input type="email" placeholder="Email" value={completeEmail} onChange={e=>setCompleteEmail(e.target.value)} />
            <input type="password" placeholder="Password" value={completePassword} onChange={e=>setCompletePassword(e.target.value)} />
          </div>
          {completionMsg && <div style={{ color:'var(--danger)', marginTop:8 }}>{completionMsg}</div>}
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
            <button onClick={() => { setCompleteAuth(false); setCompleteEmail(''); setCompletePassword('') }}>Cancel</button>
            <button onClick={async () => {
              try {
                const u = await currentUser()
                if (!u) { setCompletionMsg('Not logged in'); return }
                const { login } = await import('../auth/auth')
                await login(completeEmail, completePassword)
                setCompleteAuth(false)
                setShowCompleteForm(true)
                setCompleteEmail(''); setCompletePassword(''); setCompletionMsg('')
              } catch (e: any) {
                setCompletionMsg(e?.message || 'Authentication failed')
              }
            }}>Confirm</button>
          </div>
        </div>
      </div>
    )}
    </section>
    <section className={`glass-panel analytics-panel ${view === 'analytics' ? 'open' : ''}`} style={{ display: 'flex', gap: 16, flexDirection: 'column' }}>
    {/* Completion Form Popup */}
    {showCompleteForm && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
        <div className="zri-card" style={{ width:500, padding:20, maxHeight:'80vh', overflow:'auto' }}>
          <h3>Complete Dataset</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:12, marginTop:12 }}>
            <label>Topic Name<input value={completeTopic} onChange={e=>setCompleteTopic(e.target.value)} /></label>
            <label>Participants<input value={completeParticipants} onChange={e=>setCompleteParticipants(e.target.value)} /></label>
            <div>
              <label>Authors</label>
              {completeAuthors.map((a, i) => (
                <div key={i} style={{ display:'flex', gap:8, marginTop:4 }}>
                  <input placeholder="Name" value={a.name} onChange={e => { const next = [...completeAuthors]; next[i] = { ...next[i], name: e.target.value }; setCompleteAuthors(next) }} />
                  <input placeholder="Role" value={a.role} onChange={e => { const next = [...completeAuthors]; next[i] = { ...next[i], role: e.target.value }; setCompleteAuthors(next) }} />
                  <input placeholder="Email" value={a.email} onChange={e => { const next = [...completeAuthors]; next[i] = { ...next[i], email: e.target.value }; setCompleteAuthors(next) }} />
                  <button onClick={() => setCompleteAuthors(completeAuthors.filter((_, j) => j !== i))}>X</button>
                </div>
              ))}
              <button onClick={() => setCompleteAuthors([...completeAuthors, { name: '', role: 'author', email: '' }])} style={{ marginTop: 4 }}>+ Add Author</button>
            </div>
            <label>Conflict of Interest<textarea value={completeCOI} onChange={e=>setCompleteCOI(e.target.value)} /></label>
            <label>Sponsors<input value={completeSponsors} onChange={e=>setCompleteSponsors(e.target.value)} /></label>
            <label>Study Location<input value={completeLocation} onChange={e=>setCompleteLocation(e.target.value)} /></label>
          </div>
          {completionMsg && <div style={{ color:'var(--danger)', marginTop:8 }}>{completionMsg}</div>}
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end', marginTop:16 }}>
            <button onClick={() => { setShowCompleteForm(false); setCompletionMsg('') }}>Cancel</button>
            <button onClick={async () => {
              if (!completeTopic.trim()) { setCompletionMsg('Topic name required'); return }
              if (!completeAuthors.some(a => a.name.trim())) { setCompletionMsg('At least one author required'); return }
              try {
                const u = await currentUser()
                if (!u || !projectId) { setCompletionMsg('Not logged in or no project'); return }
                const { generateCompletionKey } = await import('../security/crypto')
                const orgId = u.organizationId || 1
                const key = await generateCompletionKey({
                  topicName: completeTopic,
                  participants: completeParticipants,
                  authors: completeAuthors.filter(a => a.name.trim()),
                  conflictOfInterest: completeCOI,
                  sponsors: completeSponsors,
                  studyLocation: completeLocation,
                  completedBy: u.id!,
                  completedAt: Date.now()
                })
                const isEdit = !!completionData
                if (isEdit) {
                  // Calculate changed fields
                  const changedFields: string[] = []
                  if (completeTopic !== completionData.topicName) changedFields.push('topicName')
                  if (completeParticipants !== completionData.participants) changedFields.push('participants')
                  if (completeCOI !== completionData.conflictOfInterest) changedFields.push('conflictOfInterest')
                  if (completeSponsors !== completionData.sponsors) changedFields.push('sponsors')
                  if (completeLocation !== completionData.studyLocation) changedFields.push('studyLocation')
                  const authorsStr = JSON.stringify(completeAuthors.filter(a => a.name.trim()))
                  if (authorsStr !== JSON.stringify(completionData.authors)) changedFields.push('authors')
                  
                  const newCd = {
                    projectId: projectId!,
                    organizationId: orgId,
                    completedBy: u.id!,
                    completedAt: Date.now(),
                    cryptoKey: key,
                    topicName: completeTopic,
                    participants: completeParticipants,
                    authors: completeAuthors.filter(a => a.name.trim()),
                    conflictOfInterest: completeCOI,
                    sponsors: completeSponsors,
                    studyLocation: completeLocation,
                    editCount: (completionData.editCount || 0) + 1,
                    editHistory: [...(completionData.editHistory || []), { editedAt: Date.now(), editedBy: u.id!, changedFields }],
                    version: (completionData.version || 1) + 1,
                    locked: true
                  }
                  const newId = await db.completedDatasets.add(newCd as any)
                  // Mark old as superseded
                  await db.completedDatasets.update(completionData.id, { supersededBy: newId })
                  // Store new key
                  await db.completionKeys.add({ cryptoKey: key, completedDatasetId: newId, createdAt: Date.now() })
                  // Audit log
                  await db.auditLog.add({ entityType: 'completedDataset', entityId: String(newId), action: 'edit', actorId: u.id, details: { changedFields, previousKey: completionData.cryptoKey }, createdAt: Date.now() })
                  // Push to cloud for external verification
                  try { const { pushCompletionToCloud } = await import('../firebase/verify'); await pushCompletionToCloud(newCd as any) } catch (e) { console.error('Cloud push failed:', e) }
                  const org = await db.organizations.get(orgId)
                  setIsCompleted(true)
                  setCompletionData({ ...newCd, organizationName: org?.name || 'Unknown', id: newId })
                } else {
                  const cd = {
                    projectId: projectId!,
                    organizationId: orgId,
                    completedBy: u.id!,
                    completedAt: Date.now(),
                    cryptoKey: key,
                    topicName: completeTopic,
                    participants: completeParticipants,
                    authors: completeAuthors.filter(a => a.name.trim()),
                    conflictOfInterest: completeCOI,
                    sponsors: completeSponsors,
                    studyLocation: completeLocation,
                    editCount: 0,
                    editHistory: [],
                    version: 1,
                    locked: true
                  }
                  const id = await db.completedDatasets.add(cd as any)
                  await db.completionKeys.add({ cryptoKey: key, completedDatasetId: id as number, createdAt: Date.now() })
                  await db.projects.update(projectId!, { locked: true })
                  await db.auditLog.add({ entityType: 'completedDataset', entityId: String(id), action: 'create', actorId: u.id, details: { projectId, cryptoKey: key }, createdAt: Date.now() })
                  // Push to cloud for external verification
                  try { const { pushCompletionToCloud } = await import('../firebase/verify'); await pushCompletionToCloud(cd as any) } catch (e) { console.error('Cloud push failed:', e) }
                  setIsCompleted(true)
                  const org = await db.organizations.get(orgId)
                  setCompletionData({ ...cd, organizationName: org?.name || 'Unknown', id })
                }
                setShowCompleteForm(false)
                setCompleteTopic(''); setCompleteParticipants(''); setCompleteAuthors([{name:'',role:'author',email:''}]); setCompleteCOI(''); setCompleteSponsors(''); setCompleteLocation(''); setCompletionMsg('')
                load()
              } catch (e: any) {
                setCompletionMsg(e?.message || 'Failed to complete dataset')
              }
            }}>{completionData ? 'Save Changes' : 'Complete'}</button>
          </div>
        </div>
      </div>
    )}
      <div style={{ flex: 1 }}>
        <h1>Analytics</h1>
        <button className="tab-btn" onClick={() => setView('data')} style={{ marginBottom: 8 }}>Back to Data (Esc)</button>
        <AnalyticsTab vars={vars} records={records} />
      </div>
    </section>
    {exportOpen && <ExportModal emptyCells={exportEmpty} excludedVars={exportExcluded} onContinue={doExport} onCancel={()=>setExportOpen(false)} />}
    <DatasetChat projectId={String(projectId)} role={u?.role || 'viewer'} open={chatOpen} onClose={()=>setChatOpen(false)} />



    </>
  )
}
