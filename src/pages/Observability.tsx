import { useEffect, useState } from 'react'
import { db } from '../db'

export default function Observability() {
  const [logs, setLogs] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [studies, setStudies] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [entityFilter, setEntityFilter] = useState('')
  const [actorFilter, setActorFilter] = useState('')

  async function load() {
    setLogs(await db.auditLog.toArray())
    setUsers(await db.users.toArray())
    setStudies(await db.studies.toArray())
    setSessions(await db.sessions.toArray())
  }
  useEffect(() => { load() }, [])

  const filtered = logs.filter(l => (!entityFilter || l.entityType === entityFilter) && (!actorFilter || String(l.actorId) === actorFilter))

  function exportJson() {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'audit-export.json'; a.click(); URL.revokeObjectURL(url)
  }
  function exportCsv() {
    const header = ['id','entityType','entityId','actorId','action','createdAt']
    const rows = filtered.map(l => [l.id, l.entityType, l.entityId, l.actorId, l.action, new Date(l.createdAt).toISOString()])
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'audit-export.csv'; a.click(); URL.revokeObjectURL(url)
  }

  const statusCounts = studies.reduce((acc:any, s:any) => { acc[s.submissionStatus] = (acc[s.submissionStatus]||0)+1; return acc }, {})
  const pubReady = studies.filter((s:any) => s.ethicsApproval && s.coiDeclared && s.authorContributions && s.dataAvailability && (s.consentObtained || s.withdrawn)).length

  return (
    <section>
      <h1>Observability & Audit</h1>
      <div className="zri-grid" style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:12,marginBottom:16}}>
        <div className="zri-card"><div style={{fontSize:12,opacity:.7}}>Users</div><div style={{fontSize:24,fontWeight:700}}>{users.length}</div></div>
        <div className="zri-card"><div style={{fontSize:12,opacity:.7}}>Active sessions</div><div style={{fontSize:24,fontWeight:700}}>{sessions.filter(s=>s.expiresAt>Date.now()).length}</div></div>
        <div className="zri-card"><div style={{fontSize:12,opacity:.7}}>Studies</div><div style={{fontSize:24,fontWeight:700}}>{studies.length}</div></div>
        <div className="zri-card"><div style={{fontSize:12,opacity:.7}}>Publication ready</div><div style={{fontSize:24,fontWeight:700}}>{pubReady}</div></div>
        <div className="zri-card"><div style={{fontSize:12,opacity:.7}}>Audit events</div><div style={{fontSize:24,fontWeight:700}}>{logs.length}</div></div>
      </div>
      <div className="zri-card" style={{marginBottom:16}}>
        <h3>Study submission funnel</h3>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {Object.entries(statusCounts).map(([k,v]) => <span key={k} className="zri-badge">{k}: {String(v)}</span>)}
        </div>
      </div>
      <div className="zri-card">
        <h3>Audit log</h3>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
          <select value={entityFilter} onChange={e=>setEntityFilter(e.target.value)}>
            <option value="">All entities</option>
            {[...new Set(logs.map(l=>l.entityType))].map(e=><option key={e} value={e}>{e}</option>)}
          </select>
          <select value={actorFilter} onChange={e=>setActorFilter(e.target.value)}>
            <option value="">All actors</option>
            {[...new Set(logs.map(l=>l.actorId))].map(a=><option key={a} value={a}>{users.find(u=>u.id===a)?.email || a}</option>)}
          </select>
          <button onClick={exportJson}>Export JSON</button>
          <button onClick={exportCsv}>Export CSV</button>
        </div>
        <div style={{maxHeight:360,overflow:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead><tr><th>ID</th><th>Entity</th><th>Action</th><th>Actor</th><th>When</th></tr></thead>
            <tbody>
              {filtered.slice(-200).reverse().map(l=>(
                <tr key={l.id}>
                  <td>{l.id}</td>
                  <td>{l.entityType}:{l.entityId}</td>
                  <td>{l.action}</td>
                  <td>{users.find(u=>u.id===l.actorId)?.email || l.actorId}</td>
                  <td>{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
