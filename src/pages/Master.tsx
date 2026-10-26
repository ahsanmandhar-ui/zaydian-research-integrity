import { useEffect, useState } from 'react'
import { db } from '../db'
import { currentUser, hasPermission } from '../auth/auth'
import { createOrganizationWithAdmin, deleteOrganizationByAdmin, listAccessRequests, approveAccessRequest } from '../auth/auth'

export default function Master() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [orgs, setOrgs] = useState<any[]>([])
  const [counts, setCounts] = useState<Record<number, { users: number; projects: number; studies: number }>>({})
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [deleteOrgId, setDeleteOrgId] = useState<number | null>(null)
  const [deleteEmail, setDeleteEmail] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [accessRequests, setAccessRequests] = useState<any[]>([])
  const [approveReqId, setApproveReqId] = useState<number | null>(null)
  const [approveName, setApproveName] = useState('')
  const [approvePassword, setApprovePassword] = useState('')
  const [approveOrgId, setApproveOrgId] = useState<number | ''>('')
  const [approveProjectId, setApproveProjectId] = useState<number | ''>('')
  const [approvePost, setApprovePost] = useState('data_collector')
  const [approveProjects, setApproveProjects] = useState<any[]>([])
  const POSTS = ['data_collector', 'analyst', 'supervisor', 'manuscript_writer', 'research_head']

  useEffect(() => {
    (async () => { const u = await currentUser(); const ok = await hasPermission(u, 'org:manage'); setAllowed(ok); if (ok) await load() })()
  }, [])

  async function load() {
    let os = await db.organizations.toArray()
    if (os.length === 0) { await db.organizations.add({ name: 'Default Organization', createdAt: Date.now(), updatedAt: Date.now() }); os = await db.organizations.toArray() }
    setOrgs(os)
    const c: any = {}
    for (const o of os) {
      const oid = o.id as number
      c[oid] = { users: await db.users.where('organizationId').equals(oid).count(), projects: await db.projects.where('organizationId').equals(oid).count(), studies: await db.studies.where('organizationId').equals(oid).count() }
    }
    setCounts(c)
    setAccessRequests(await listAccessRequests())
  }

  async function purgeOrg(orgId: number) {
    if (!window.confirm('Purge local cache for this organization?')) return
    await db.projects.where('organizationId').equals(orgId).delete()
    await db.studies.where('organizationId').equals(orgId).delete()
    await db.syncOperations.where('organizationId').equals(orgId).delete()
    const u = await currentUser()
    await db.auditLog.add({ entityType: 'organization', entityId: String(orgId), action: 'purge_cache', actorId: u?.id, createdAt: Date.now() })
    await load()
  }

  async function createOrg() {
    const u = await currentUser()
    if (!u) { setMsg('not logged in'); return }
    try {
      await createOrganizationWithAdmin(u, name, adminEmail, adminName, adminPassword)
      setMsg('organization created'); setShowForm(false); setName(''); setAdminName(''); setAdminEmail(''); setAdminPassword(''); await load()
    } catch (e: any) { setMsg(e.message) }
  }

  async function deleteOrg() {
    if (deleteOrgId == null) return
    const u = await currentUser()
    if (!u) { setMsg('not logged in'); return }
    try {
      await deleteOrganizationByAdmin(u, deleteOrgId, deleteEmail, deletePassword)
      setMsg('organization deleted'); setDeleteOrgId(null); setDeleteEmail(''); setDeletePassword('')
      const still = await currentUser()
      if (!still) { window.location.reload(); return }
      await load()
    } catch (e: any) { setMsg(e.message) }
  }

  async function loadApproveProjects(orgId: number) {
    const projs = await db.projects.where('organizationId').equals(orgId).toArray()
    setApproveProjects(projs)
  }

  async function approveReq() {
    if (approveReqId == null) return
    const u = await currentUser()
    if (!u) { setMsg('not logged in'); return }
    try {
      const projectId = approveProjectId !== '' ? Number(approveProjectId) : undefined
      const post = projectId ? approvePost : undefined
      const orgId = approveOrgId !== '' ? Number(approveOrgId) : undefined
      // Update access request with selected org if provided
      if (orgId) await db.accessRequests.update(approveReqId, { organizationId: orgId })
      await approveAccessRequest(u, approveReqId, approveName, approvePassword, 'researcher', projectId, post)
      setMsg('access approved'); setApproveReqId(null); setApproveName(''); setApprovePassword(''); setApproveOrgId(''); setApproveProjectId(''); setApprovePost('data_collector'); setApproveProjects([]); await load()
    } catch (e: any) { setMsg(e.message) }
  }

  if (allowed === null) return <section><div>Loading...</div></section>
  if (!allowed) return <section><h1>Access denied</h1><p>Master role required.</p></section>

  return (
    <section>
      <h1>Master Dashboard</h1>
      <button onClick={() => setShowForm(v => !v)}>Create Organization</button>
      {msg && <div>{msg}</div>}
      {showForm && (
        <div className="zri-card" style={{marginTop:12}}>
          <input placeholder="Org name" value={name} onChange={e=>setName(e.target.value)} />
          <input placeholder="Admin name" value={adminName} onChange={e=>setAdminName(e.target.value)} />
          <input placeholder="Admin email" value={adminEmail} onChange={e=>setAdminEmail(e.target.value)} />
          <input placeholder="Admin password" type="password" value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} />
          <button onClick={createOrg}>Create</button>
        </div>
      )}
      {deleteOrgId != null && (
        <div className="zri-card" style={{marginTop:12}}>
          <h3>Delete Organization #{deleteOrgId}</h3>
          <input placeholder="Org admin email" value={deleteEmail} onChange={e=>setDeleteEmail(e.target.value)} />
          <input placeholder="Org admin password" type="password" value={deletePassword} onChange={e=>setDeletePassword(e.target.value)} />
          <button onClick={deleteOrg}>Confirm Delete</button>
          <button onClick={() => setDeleteOrgId(null)}>Cancel</button>
        </div>
      )}
      {approveReqId != null && (
        <div className="zri-card" style={{marginTop:12}}>
          <h3>Approve Access Request #{approveReqId}</h3>
          <input placeholder="Display name" value={approveName} onChange={e=>setApproveName(e.target.value)} />
          <input placeholder="Password" type="password" value={approvePassword} onChange={e=>setApprovePassword(e.target.value)} />
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
        <select value={approveOrgId} onChange={e=>{ const v = e.target.value===''?'':Number(e.target.value); setApproveOrgId(v); if(v!=='') loadApproveProjects(Number(v)) }} style={{minWidth:160}}>
          <option value="">Select organization (optional)</option>
          {orgs.map(o=> <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <select value={approveProjectId} onChange={e=>setApproveProjectId(e.target.value===''?'':Number(e.target.value))} style={{minWidth:160}}>
          <option value="">Select project (optional)</option>
          {approveProjects.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={approvePost} onChange={e=>setApprovePost(e.target.value)}>
          {POSTS.map(p=> <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div style={{marginTop:8}}>
        <button onClick={approveReq}>Approve</button>
          <button onClick={() => setApproveReqId(null)} style={{marginLeft:8}}>Cancel</button>
        </div>
      </div>
      )}
      <h2>Access Requests</h2>
      {accessRequests.length === 0 && <div>No pending requests.</div>}
      {accessRequests.map(r => (
        <div key={r.id} className="zri-card" style={{marginTop:8}}>
          <div>{r.name} ({r.email})</div>
          <div>Org: {r.organizationId ?? 'any'} | {r.message}</div>
          <button onClick={() => setApproveReqId(r.id)}>Approve</button>
        </div>
      ))}
      <h2>Organizations</h2>
      <div className="zri-grid zri-stagger" style={{marginTop:12}}>
        {orgs.map(o => (
          <div key={o.id} className="zri-card">
            <div style={{fontWeight:700,color:'var(--text-h)'}}>{o.name}</div>
            <div>Users: {counts[o.id]?.users ?? 0}</div>
            <div>Projects: {counts[o.id]?.projects ?? 0}</div>
            <div>Studies: {counts[o.id]?.studies ?? 0}</div>
            <button onClick={() => purgeOrg(o.id as number)}>Purge local cache</button>
            <button onClick={() => setDeleteOrgId(o.id as number)} style={{marginLeft:8}}>Delete org</button>
          </div>
        ))}
      </div>
      <h2>Organization Analytics</h2>
      <div className="zri-card" style={{marginTop:12}}>
        <div>Total organizations: {orgs.length}</div>
        <div>Total users: {orgs.reduce((a,o)=>a+(counts[o.id]?.users??0),0)}</div>
        <div>Total projects: {orgs.reduce((a,o)=>a+(counts[o.id]?.projects??0),0)}</div>
        <div>Total studies: {orgs.reduce((a,o)=>a+(counts[o.id]?.studies??0),0)}</div>
        <div style={{marginTop:12}}>
          {orgs.map(o => {
            const u = counts[o.id]?.users ?? 0
            const p = counts[o.id]?.projects ?? 0
            const s = counts[o.id]?.studies ?? 0
            const max = Math.max(1, ...orgs.map(x => Math.max(counts[x.id]?.users??0, counts[x.id]?.projects??0, counts[x.id]?.studies??0)))
            return (
              <div key={o.id} style={{marginBottom:12}}>
                <div style={{fontWeight:600}}>{o.name}</div>
                <div style={{display:'flex',gap:4,alignItems:'center'}}>
                  <span style={{width:60}}>Users</span>
                  <div style={{background:'var(--accent)',height:10,width:`${(u/max)*100}%`}} />
                  <span>{u}</span>
                </div>
                <div style={{display:'flex',gap:4,alignItems:'center'}}>
                  <span style={{width:60}}>Projects</span>
                  <div style={{background:'#22c55e',height:10,width:`${(p/max)*100}%`}} />
                  <span>{p}</span>
                </div>
                <div style={{display:'flex',gap:4,alignItems:'center'}}>
                  <span style={{width:60}}>Studies</span>
                  <div style={{background:'#f59e0b',height:10,width:`${(s/max)*100}%`}} />
                  <span>{s}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}