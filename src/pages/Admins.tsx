import { useEffect, useState } from 'react'
import { db } from '../db'
import { currentUser, registerUserByAdmin, revokeUser, hasPermission, changeUserRole, assignUserToProject, removeUserFromProject, listProjectAssignments } from '../auth/auth'
import { decryptField } from '../security/crypto'
export default function Admins() {
  const [user, setUser] = useState<any>(null)
  const [admins, setAdmins] = useState<any[]>([])
  const [form, setForm] = useState({ email:'', name:'', password:'' })
  const [role, setRole] = useState('admin')
  const [msg, setMsg] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [backupMsg, setBackupMsg] = useState('')
  const [backupPassphrase, setBackupPassphrase] = useState('')
  const [projectAssignments, setProjectAssignments] = useState<any[]>([])
  const [orgProjects, setOrgProjects] = useState<any[]>([])
  const [assignUserId, setAssignUserId] = useState<number | ''>('')
  const [assignProjectId, setAssignProjectId] = useState<number | ''>('')
  const [assignPost, setAssignPost] = useState('data_collector')
  const [assignMsg, setAssignMsg] = useState('')
  const POSTS = ['data_collector', 'analyst', 'supervisor', 'manuscript_writer', 'research_head']
  async function exportBackup() {
    const snapshot: Record<string, any[]> = {}
    for (const t of db.tables) snapshot[t.name] = await t.toArray()
    const json = JSON.stringify(snapshot, null, 2)
    if (backupPassphrase) {
      const { deriveKey, encrypt } = await import('../security/crypto')
      const salt = crypto.getRandomValues(new Uint8Array(16))
      const key = await deriveKey(backupPassphrase, salt)
      const { iv, ciphertext } = await encrypt(json, key)
      const payload = JSON.stringify({ encrypted: true, salt: btoa(String.fromCharCode(...salt)), iv, ciphertext })
      const blob = new Blob([payload], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'zri-backup-encrypted.json'
      a.click()
      URL.revokeObjectURL(url)
      setBackupMsg('Encrypted backup exported')
    } else {
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'zri-backup.json'
      a.click()
      URL.revokeObjectURL(url)
      setBackupMsg('Backup exported (unencrypted)')
    }
    if (user) await db.auditLog.add({ entityType: 'system', entityId: 'backup', action: 'export', actorId: user.id, details: { tables: db.tables.length, encrypted: !!backupPassphrase }, createdAt: Date.now() })
  }
  async function importBackup(file: File) {
    if (!confirm('Restore backup? This will replace existing data.')) return
    const text = await file.text()
    let snapshot: any
    try {
      const parsed = JSON.parse(text)
      if (parsed.encrypted) {
        const pass = prompt('Enter backup passphrase:')
        if (!pass) { setBackupMsg('Passphrase required'); return }
        const { deriveKey, decrypt } = await import('../security/crypto')
        const salt = Uint8Array.from(atob(parsed.salt), c => c.charCodeAt(0))
        const key = await deriveKey(pass, salt)
        const decrypted = await decrypt({ iv: parsed.iv, ciphertext: parsed.ciphertext }, key)
        snapshot = JSON.parse(decrypted)
      } else {
        snapshot = parsed
      }
    } catch (e: any) {
      setBackupMsg('Failed to parse backup: ' + (e?.message || ''))
      return
    }
    for (const t of db.tables) {
      await t.clear()
      if (Array.isArray(snapshot[t.name])) await t.bulkAdd(snapshot[t.name])
    }
    setBackupMsg('Backup restored')
    if (user) await db.auditLog.add({ entityType: 'system', entityId: 'backup', action: 'restore', actorId: user.id, details: { tables: db.tables.length }, createdAt: Date.now() })
    load()
  }
  async function load() {
    const u = await currentUser()
    setUser(u)
    setIsAdmin(!!(u && await hasPermission(u, '*')))
    const roles = await db.roles.toArray()
    const allUsers = u?.organizationId ? await db.users.where('organizationId').equals(u.organizationId).toArray() : await db.users.toArray()
    const us = allUsers
    us.sort((a: any, b: any) => (a.id || 0) - (b.id || 0))
    const decrypted = await Promise.all(us.map(async (x: any) => ({ ...x, displayName: await (async () => { try { return await decryptField(x.displayName) } catch { return x.displayName } })(), roleName: roles.find((r: any) => r.id === x.roleId)?.name || 'user' })))
    setAdmins(decrypted)
    // Load project assignments for all projects in org
    const projs = u?.organizationId ? await db.projects.where('organizationId').equals(u.organizationId).toArray() : await db.projects.toArray()
    setOrgProjects(projs)
    const allAssignments: any[] = []
    for (const p of projs) {
      const asg = await listProjectAssignments(p.id as number)
      allAssignments.push(...asg.map((a: any) => ({ ...a, projectName: p.name })))
    }
    setProjectAssignments(allAssignments)
  }
  useEffect(()=>{load()},[])
  async function createAdmin() {
    if (!user) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setMsg('Invalid email'); return }
    if (form.password.length < 8) { setMsg('Password must be at least 8 characters'); return }
    try {
      await registerUserByAdmin(user, form.email, form.name, form.password, role)
      setForm({email:'',name:'',password:''}); setMsg('User created'); load()

    } catch (e:any) { setMsg(e.message) }
  }
  async function removeAdmin(id:number) {
    const primaryId = admins.length ? admins[0].id : null;
    if (!user || user.id !== primaryId) { setMsg('Only primary admin can remove'); return }
    if (id === user.id) { setMsg('Cannot remove yourself'); return }
    try { await revokeUser(id); setMsg('User removed'); load() } catch (e:any) { setMsg(e.message) }
  }

  async function doAssign() {
    if (!user) return
    if (assignUserId === '' || assignProjectId === '') { setAssignMsg('Select user and project'); return }
    try {
      await assignUserToProject(user, Number(assignUserId), Number(assignProjectId), assignPost)
      setAssignMsg('Assigned')
      setAssignUserId(''); setAssignProjectId(''); setAssignPost('data_collector')
      load()
    } catch (e: any) { setAssignMsg(e.message) }
  }

  async function doRemoveFromProject(projectId: number, userId: number) {
    if (!user) return
    try {
      await removeUserFromProject(user, userId, projectId)
      load()
    } catch (e: any) { setMsg(e.message) }
  }
  return (
    <section>
      <h1>Admin Management</h1>
      <div className="zri-card" style={{background:'linear-gradient(135deg,#aa3bff22,#c084fc22)', animation:'pageIn .3s'}}>
        <h2>Create User (Admin / Team Lead / Researcher)</h2>
        {!isAdmin && <div style={{color:'red'}}>Admin access required to create users.</div>}
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} disabled={!isAdmin} />
          <input placeholder="Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} disabled={!isAdmin} />
          <input type="password" placeholder="Password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} disabled={!isAdmin} />
          <select value={role} onChange={e=>setRole(e.target.value)} disabled={!isAdmin}>
            <option value='admin'>admin</option>
            <option value='team_lead'>team_lead</option>
            <option value='researcher'>researcher</option>
          </select>
          <button onClick={createAdmin} disabled={!isAdmin}>Add User</button>
        </div>
        {msg && <div style={{color:'var(--accent)'}}>{msg}</div>}
      </div>
      <div className="zri-grid zri-stagger" style={{marginTop:16, alignItems:'flex-start'}}>
        {admins.map(a=>(
          <div className="zri-card" key={a.id}>
            <div style={{fontWeight:700,color:'var(--text-h)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.displayName}</div>
            <div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.email}</div>
            <div>Role: {a.roleName}</div>
            <div>Last login: {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString() : 'Never'}</div>
            {user && user.id === admins[0]?.id && a.id !== user.id && (
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:8}}>
                <select defaultValue={a.roleName} onChange={async (e)=>{ try { await changeUserRole(user, a.id, e.target.value); setMsg('Role updated'); load() } catch(err:any){ setMsg(err.message) } }}>
                  <option value='admin'>admin</option>
                  <option value='team_lead'>team_lead</option>
                  <option value='researcher'>researcher</option>
                  <option value='reviewer'>reviewer</option>
                  <option value='viewer'>viewer</option>
                </select>
                <button onClick={()=>removeAdmin(a.id)}>Remove</button>
              </div>
            )}
          </div>
        ))}
      </div>
      {!isAdmin && <div style={{color:'red',marginTop:16}}>Admin access required to assign users to projects.</div>}
      {isAdmin && (
        <div className="zri-card" style={{marginTop:16, background:'linear-gradient(135deg,rgba(170,59,255,.12),rgba(192,132,252,.12))'}}>
          <h2>Assign User to Project (Post)</h2>
          {assignMsg && <div style={{color:'var(--accent)',marginBottom:8}}>{assignMsg}</div>}
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
            <select value={assignUserId} onChange={e=>setAssignUserId(e.target.value===''?'':Number(e.target.value))} style={{minWidth:180}}>
              <option value="">Select user</option>
              {admins.map((a:any)=> <option key={a.id} value={a.id}>{a.displayName} ({a.email})</option>)}
            </select>
            <select value={assignProjectId} onChange={e=>setAssignProjectId(e.target.value===''?'':Number(e.target.value))} style={{minWidth:180}}>
              <option value="">Select project</option>
              {orgProjects.map((p:any)=> <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={assignPost} onChange={e=>setAssignPost(e.target.value)}>
              {POSTS.map(p=> <option key={p} value={p}>{p}</option>)}
            </select>
            <button onClick={doAssign}>Assign</button>
          </div>
          <h3>Current Assignments</h3>
          <div style={{overflowX:'auto'}}>
            <table border={1} style={{width:'100%',borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  <th>User</th><th>Project</th><th>Post</th><th>Permissions</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {projectAssignments.map((a:any)=>(
                  <tr key={a.id}>
                    <td>{a.user?.displayName || a.userId}</td>
                    <td>{a.projectName || a.projectId}</td>
                    <td>{a.role}</td>
                    <td>{(a.permissions||[]).join(', ') || 'none'}</td>
                    <td><button onClick={()=>doRemoveFromProject(a.projectId, a.userId)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="zri-card" style={{marginTop:16}}>
        <h2>Backup / Restore</h2>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
          <input type="password" placeholder="Backup passphrase (optional)" value={backupPassphrase} onChange={e=>setBackupPassphrase(e.target.value)} style={{minWidth:200}} />
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button onClick={exportBackup} disabled={!isAdmin}>Export Backup</button>
          <label className="zri-badge" style={{cursor:'pointer'}}>
            Import Backup
            <input type="file" accept="application/json" style={{display:'none'}} onChange={(e)=>{ const f=e.target.files?.[0]; if(f) importBackup(f) }} disabled={!isAdmin} />
          </label>
        </div>
        {backupMsg && <div style={{color:'var(--accent)',marginTop:8}}>{backupMsg}</div>}
      </div>
    </section>
  )
}
