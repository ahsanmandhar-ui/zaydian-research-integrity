import { useEffect, useState } from 'react'
import { db } from '../db'
import { generateRicId } from '../utils/ricId'
import { currentUser, hasPermission } from '../auth/auth'
const POSTS = ['team_lead','post','manuscript_writer','data_analyst','data_collector','supervisor']
export default function Projects() {
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [members, setMembers] = useState<Record<number, any[]>>({})
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [teamLeadId, setTeamLeadId] = useState<number | ''>('')
  const [users, setUsers] = useState<any[]>([])
  const [selectedProject, setSelectedProject] = useState<number | null>(null)
  const [memberUserId, setMemberUserId] = useState<number | ''>('')
  const [memberRole, setMemberRole] = useState('post')
  const [msg, setMsg] = useState('')
  async function load() {
    const u = await currentUser(); setUser(u)
    const orgUsers = u?.organizationId ? await db.users.where('organizationId').equals(u.organizationId).toArray() : await db.users.toArray()
    setUsers(orgUsers)
    const all = u?.organizationId ? await db.projects.where('organizationId').equals(u.organizationId).toArray() : await db.projects.toArray()
    if (!u) { setProjects([]); return }
    const admin = await hasPermission(u, '*')
    setIsAdmin(admin)
    if (admin) { setProjects(all); return }
    const mems = await db.memberships.where('userId').equals(u.id!).toArray()
    const ids = new Set(mems.filter(m=>m.role==='team_lead').map(m=>m.projectId))
    setProjects(all.filter(p=>ids.has(p.id!)))
  }
  useEffect(() => { load() }, [])
  async function loadMembers(pid:number) {
    const ms = await db.memberships.where('projectId').equals(pid as number).toArray()
    const enriched = await Promise.all(ms.map(async m=>({ ...m, user: await db.users.get(m.userId) })))
    setMembers(prev=>({...prev,[pid as number]:enriched}))
  }
  async function createProject() {
    if (!name.trim() || !user) return
    const isAdmin = await hasPermission(user, '*')
    if (!isAdmin) { setMsg('Only admin can create projects'); return }
    const trackingId = await generateRicId()
    const id = await db.projects.add({ name, description: desc, ownerId: Number(teamLeadId)||user.id, trackingId, organizationId: user?.organizationId, createdAt: Date.now(), updatedAt: Date.now() })
    setMsg(`Project created. ID issued: ${trackingId}`)
    const u = await currentUser()
    await db.auditLog.add({ entityType: 'project', entityId: String(id), action: 'create', actorId: u?.id, details: { name, description: desc, trackingId, teamLeadId }, createdAt: Date.now() })
    window.dispatchEvent(new CustomEvent('zri:toast',{detail:`ID issued ${trackingId}`}))
    if (teamLeadId) await db.memberships.add({ projectId: id as number, userId: Number(teamLeadId), role: 'team_lead', createdAt: Date.now() })
    setName(''); setDesc(''); setTeamLeadId(''); load()
  }
  async function addMember() {
    if (!selectedProject || !memberUserId) return
    const u = user
    const isAdmin = u && await hasPermission(u,'*')
    const isLead = u && (await db.memberships.where('projectId').equals(selectedProject).and(m=>m.userId===u.id && m.role==='team_lead').count())>0
    if (!isAdmin && !isLead) { setMsg('Not allowed'); return }
    await db.memberships.add({ projectId: selectedProject, userId: Number(memberUserId), role: memberRole, createdAt: Date.now() })
    setMemberUserId(''); loadMembers(selectedProject)
  }
  async function selectProject(pid:number) { setSelectedProject(pid); loadMembers(pid) }
  async function deleteProject(pid: number) {
    if (!user || !isAdmin) { setMsg('Only admin can delete projects'); return }
    if (!confirm('Delete this project and its related data?')) return
    try {
      await db.memberships.where('projectId').equals(pid).delete()
      await db.variables.where('projectId').equals(pid).delete()
      await db.records.where('projectId').equals(pid).delete()
      await db.versions.where('projectId').equals(pid).delete()
      await db.submissions.where('projectId').equals(pid).delete()
      await db.votes.where('projectId').equals(pid).delete()
      await db.publishedItems.where('projectId').equals(pid).delete()
      await db.projectLinks.where('projectId').equals(pid).delete()
      const chats = await db.chatMessages.toArray()
      for (const c of chats.filter((c:any)=>String(c.projectId)===String(pid))) await db.chatMessages.delete(c.id!)
      await db.projects.delete(pid)
      await db.auditLog.add({ entityType: 'project', entityId: String(pid), action: 'delete', actorId: user.id, details: { name: projects.find(p=>p.id===pid)?.name }, createdAt: Date.now() })
      if (selectedProject === pid) setSelectedProject(null)
      setMsg('Project deleted')
      load()
    } catch (e:any) { setMsg(e?.message || 'Delete failed') }
  }
  return (
    <section>
      <h1>Projects</h1>
      {isAdmin && (
        <div className="zri-card" style={{marginBottom:16, background:'linear-gradient(135deg,rgba(170,59,255,.12),rgba(192,132,252,.12))'}}>
          <h2>Create Project (Admin)</h2>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Project name" />
            <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Description" />
            <select value={teamLeadId} onChange={e=>setTeamLeadId(e.target.value?Number(e.target.value):'')}>
              <option value="">Select team lead</option>
              {users.map(u=><option key={u.id} value={u.id}>{u.displayName}</option>)}
            </select>
            <button onClick={createProject}>Create Project</button>
          </div>
        </div>
      )}
      {msg && <div style={{color:'var(--accent)'}}>{msg}</div>}
      <div className="zri-grid zri-stagger">
        {projects.map(p=>(
          <div className="zri-card" key={p.id} style={{cursor:'pointer', border: selectedProject===p.id?'2px solid var(--accent)':'1px solid var(--border)'}} onClick={()=>selectProject(p.id!)}>
            <div style={{fontWeight:700,color:'var(--text-h)'}}>{p.name}</div>
            <div style={{fontSize:12, color:'var(--accent)', fontWeight:600}}>ID: {p.trackingId || 'Pending'}</div>
            <div style={{fontSize:14}}>{p.description || 'No description'}</div>
            {isAdmin && <button onClick={(e)=>{ e.stopPropagation(); deleteProject(p.id!) }} style={{marginTop:8}}>Delete project</button>}
          </div>
        ))}
      </div>
      {selectedProject && (
        <div className="zri-card" style={{marginTop:16, animation:'pageIn .25s'}}>
          <h2>Team for Project {selectedProject}</h2>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
            <select value={memberUserId} onChange={e=>setMemberUserId(e.target.value?Number(e.target.value):'')}>
              <option value="">Select user</option>
              {users.map(u=><option key={u.id} value={u.id}>{u.displayName}</option>)}
            </select>
            <select value={memberRole} onChange={e=>setMemberRole(e.target.value)}>
              {POSTS.map(r=><option key={r} value={r}>{r}</option>)}
            </select>
            <button onClick={addMember}>Add Member</button>
          </div>
          <table border={1} style={{width:'100%'}}>
            <thead><tr><th>User</th><th>Role</th></tr></thead>
            <tbody>
              {(members[selectedProject]||[]).map(m=>(
                <tr key={m.id}><td>{m.user?.displayName||m.userId}</td><td>{m.role}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
