import { useEffect, useState } from 'react'
import { db } from '../db'
import { currentUser, hasPermission } from '../auth/auth'
import { encryptField, decryptField } from '../security/crypto'

async function generateStudyId() {
  const day = new Date().toISOString().slice(0,10).replace(/-/g,'')
  const prefix = `STU-${day}-`
  const existing = await db.studies.where('studyId').startsWith(prefix).count()
  return `${prefix}${String(existing+1).padStart(3,'0')}`
}

const STATUS_OPTIONS = ['Not Submitted', 'Submitted', 'Abstract Accepted', 'Published']
const PHASE_OPTIONS = ['Idea Stage', 'Design', 'Data Collection', 'Analysis', 'Manuscript', 'Submitted', 'Published']

export default function Studies() {
  const [rows, setRows] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [newDept, setNewDept] = useState('')
  const [commentText, setCommentText] = useState('')
  const [commentStudyId, setCommentStudyId] = useState('')
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const [error, setError] = useState('')
  const [collabInput, setCollabInput] = useState('')
  const [projectIds, setProjectIds] = useState<Set<string>>(new Set())
  const [form, setForm] = useState<any>({ studyId:'', trackingId:'', publicationType:'other', title:'', primaryDepartment:'', firstAuthor:'', currentPhase:'Idea Stage', synopsisStatus:'Under Review', manuscriptStructure:'Full Article', submissionStatus:'Not Submitted', targetVenue:'', presentationType:'Not Applicable', collaboratingDepartments:'', ethicsApproval:false, ethicsApprovalNumber:'', ethicsExpiryDate:'', coiDeclared:false, authorContributions:false, dataAvailability:false, ethicsAmendments:'', ethicsConditions:'', consentObtained:false, consentDate:'', withdrawn:false, withdrawalDate:'' }) 

  async function ensureDepartments() {
    let ds = await db.departments.toArray()
    if (ds.length === 0) {
      const names = new Set<string>()
      const studies = await db.studies.toArray()
      const published = await db.publishedRecords.toArray()
      for (const s of [...studies, ...published]) {
        if (s.primaryDepartment) names.add(s.primaryDepartment)
        if (s.collaboratingDepartments) s.collaboratingDepartments.split(',').map((x:string)=>x.trim()).filter(Boolean).forEach((x:string)=>names.add(x))
      }
      const now = Date.now()
      for (const n of names) await db.departments.add({ name: n, createdAt: now })
      ds = await db.departments.toArray()
    }
    setDepartments(ds.sort((a:any,b:any)=>a.name.localeCompare(b.name)))
  }

  async function load() {
    const u = await currentUser(); setUser(u)
    if (u) setIsAdmin(await hasPermission(u,'*'))
    const orgId = u?.organizationId
    const rawStudies = orgId ? await db.studies.where('organizationId').equals(orgId).toArray() : await db.studies.toArray()
    const decryptedStudies = await Promise.all(rawStudies.map(async (s: any) => ({ ...s, firstAuthor: await decryptField(s.firstAuthor || '') })))
    setRows(decryptedStudies)
    const ps = orgId ? await db.projects.where('organizationId').equals(orgId).toArray() : await db.projects.toArray()
    setProjectIds(new Set(ps.map((p:any)=>p.trackingId).filter(Boolean)))
    await ensureDepartments()
  }

  useEffect(() => { load() }, [])

  function collabList(value?: string) {
    return (value || '').split(',').map((x:string)=>x.trim()).filter(Boolean)
  }

  function setCollab(list: string[]) {
    setForm((f:any)=>({ ...f, collaboratingDepartments: list.join(', ') }))
  }

  async function save() {
    setError('')
    const u = await currentUser()
    if (form.trackingId && !projectIds.has(form.trackingId)) {
      const ok = window.confirm('Dataset ID is not registered. Leave it blank if your publication is not related to a dataset?')
      if (ok) form.trackingId = ''
      else { setError('Dataset ID not found'); return }
    }
    const studyId = form.studyId || await generateStudyId()
    if (form.ethicsApproval && !form.ethicsApprovalNumber?.trim()) { setError('Ethics approval number is required'); return }
    if (form.ethicsApproval && form.ethicsExpiryDate && new Date(form.ethicsExpiryDate).getTime() < Date.now()) { setError('Ethics approval has expired'); return }
    if (form.consentObtained && !form.consentDate?.trim()) { setError('Consent date is required'); return }
    if (form.withdrawn && !form.withdrawalDate?.trim()) { setError('Withdrawal date is required'); return }
    if (form.consentObtained && form.withdrawn && form.consentDate && form.withdrawalDate && new Date(form.withdrawalDate).getTime() < new Date(form.consentDate).getTime()) { setError('Withdrawal date must be after consent date'); return }
    const now = Date.now()
    const dup = (await db.studies.toArray()).find((s:any)=> s.id !== form.id && s.title.toLowerCase() === form.title.trim().toLowerCase())
    if (dup) { setError('Duplicate study title detected'); return }
    const encFirstAuthor = await encryptField(form.firstAuthor || '')
    if (form.id) { await db.studies.update(form.id, { ...form, firstAuthor: encFirstAuthor, studyId, updatedBy: u?.id, updatedAt: now }); await db.auditLog.add({ entityType: 'study', entityId: String(form.id), action: 'update', actorId: u?.id, details: { studyId, title: form.title }, createdAt: Date.now() }) }
    else { const newId = await db.studies.add({ ...form, firstAuthor: encFirstAuthor, studyId, organizationId: u?.organizationId, createdBy: u?.id, updatedBy: u?.id, createdAt: now, updatedAt: now }); await db.auditLog.add({ entityType: 'study', entityId: String(newId), action: 'create', actorId: u?.id, details: { studyId, title: form.title }, createdAt: Date.now() }) }
    await db.auditLog.add({ entityType:'study', entityId: studyId, action: form.id?'update':'create', details: { title: form.title }, createdAt: now })
    setForm({ studyId:'', trackingId:'', publicationType:'other', title:'', primaryDepartment: departments[0]?.name || '', firstAuthor:'', currentPhase:'Idea Stage', synopsisStatus:'Under Review', manuscriptStructure:'Full Article', submissionStatus:'Not Submitted', targetVenue:'', presentationType:'Not Applicable', collaboratingDepartments:'', ethicsApproval:false, ethicsApprovalNumber:'', ethicsExpiryDate:'', coiDeclared:false, authorContributions:false, dataAvailability:false, ethicsAmendments:'', ethicsConditions:'', consentObtained:false, consentDate:'', withdrawn:false, withdrawalDate:'' })
    load()
    window.dispatchEvent(new CustomEvent('zri:toast',{detail: form.id?'Study updated':'Study added'}))
  }

  async function del(id:number) { await db.studies.delete(id); window.dispatchEvent(new CustomEvent('zri:toast',{detail:'Study deleted'})); load() }

  async function updateSubmission(id:number, status:string) {
    const row = rows.find((r:any)=>r.id===id)
    if (status === 'Published') {
      const missing = []
      if (!row?.ethicsApproval) missing.push('ethics approval')
      if (!row?.coiDeclared) missing.push('COI declared')
      if (!row?.authorContributions) missing.push('author contributions')
      if (!row?.dataAvailability) missing.push('data availability')
      if (!row?.consentObtained && !row?.withdrawn) missing.push('consent')
      if (missing.length) { setError(`Cannot publish: missing ${missing.join(', ')}`); return }
    }
    await db.studies.update(id, { submissionStatus: status, updatedAt: Date.now() })
    setError('')

    load()
  }

  async function updatePhase(id:number, phase:string) {
    const row = rows.find((r:any)=>r.id===id)
    const cur = row?.currentPhase || 'Idea Stage'
    if (PHASE_OPTIONS.indexOf(phase) < PHASE_OPTIONS.indexOf(cur)) { setError('Cannot move phase backward'); return }
    await db.studies.update(id, { currentPhase: phase, updatedAt: Date.now() })
    setError('')
    load()
  }
  async function addDepartment() {
    const name = newDept.trim()
    if (!name) return
    const exists = departments.some((d:any)=>d.name.toLowerCase()===name.toLowerCase())
    if (!exists) {
      await db.departments.add({ name, createdAt: Date.now() })
      const u = await currentUser()
      await db.auditLog.add({ entityType: 'department', entityId: name, action: 'create', actorId: u?.id, details: { name }, createdAt: Date.now() })
    }
    setNewDept('')
    await ensureDepartments()
  }

  async function removeDepartment(id:number) {
    const d = await db.departments.get(id)
    await db.departments.delete(id)
    const u = await currentUser()
    await db.auditLog.add({ entityType: 'department', entityId: String(id), action: 'delete', actorId: u?.id, details: { name: d?.name }, createdAt: Date.now() })
    await ensureDepartments()
  }

  async function addCollabDept(name:string) {
    if (!name) return
    const list = collabList(form.collaboratingDepartments)
    if (!list.includes(name)) setCollab([...list, name])
  }

  function removeCollabDept(name:string) {
    setCollab(collabList(form.collaboratingDepartments).filter((x:string)=>x!==name))
  }

  return (
    <section>
      <h1>Ongoing & Submitted Studies</h1>
      <div className="zri-card" style={{marginBottom:16}}>
        <h2>Departments</h2>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
          <input placeholder="New department" value={newDept} onChange={e=>setNewDept(e.target.value)} />
          <button onClick={addDepartment}>Add Department</button>
          <button onClick={async ()=>{ const ds=(await db.departments.toArray()).map((d:any)=>d.name); const orphans=(await db.studies.toArray()).filter((s:any)=>!ds.includes(s.primaryDepartment)); for(const o of orphans) await db.studies.delete(o.id!); await load() }}>Clean orphans</button>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {departments.map((d:any)=>(
            <span key={d.id} className="zri-badge" style={{gap:6}}>
              {d.name}
              <button style={{padding:0,border:'none',background:'transparent',color:'var(--danger)',cursor:'pointer'}} onClick={()=>removeDepartment(d.id)}>×</button>
            </span>
          ))}
        </div>
      </div>
      <div className="zri-card" style={{marginBottom:16}}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <input placeholder="Dataset Tracking ID (RIC-...)" value={form.trackingId} onChange={e=>setForm({...form,trackingId:e.target.value})} />
          <select value={form.publicationType} onChange={e=>setForm({...form,publicationType:e.target.value})}>
            <option value="meta-analysis">Meta-analysis</option>
            <option value="narrative-review">Narrative review</option>
            <option value="systematic-review">Systematic review</option>
            <option value="rct">RCT</option>
            <option value="cohort">Cohort</option>
            <option value="case-report">Case report</option>
            <option value="other">Other</option>
          </select>
          <input placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
          <select value={form.primaryDepartment} onChange={e=>setForm({...form,primaryDepartment:e.target.value})}>
            <option value="">Primary department</option>
            {departments.map((d:any)=><option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          <input placeholder="First Author" value={form.firstAuthor} onChange={e=>setForm({...form,firstAuthor:e.target.value})} />
          <select value={form.submissionStatus} onChange={e=>setForm({...form,submissionStatus:e.target.value})}>
            {STATUS_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",margin:"8px 0"}}>
            <input placeholder="Ethics approval number" value={form.ethicsApprovalNumber || ''} onChange={e=>setForm({...form, ethicsApprovalNumber:e.target.value})} />
            <input type="date" placeholder="Ethics expiry date" value={form.ethicsExpiryDate || ''} onChange={e=>setForm({...form, ethicsExpiryDate:e.target.value})} />
            <input aria-label="Ethics amendments" placeholder="Ethics amendments (semicolon separated)" value={form.ethicsAmendments || ''} onChange={e=>setForm({...form, ethicsAmendments:e.target.value})} />
            <textarea aria-label="Ethics conditions" placeholder="Ethics conditions / notes" value={form.ethicsConditions || ''} onChange={e=>setForm({...form, ethicsConditions:e.target.value})} />
            <label><input type="checkbox" checked={!!form.ethicsApproval} onChange={e=>setForm({...form,ethicsApproval:e.target.checked})} /> Ethics</label>
            <label><input type="checkbox" checked={!!form.coiDeclared} onChange={e=>setForm({...form,coiDeclared:e.target.checked})} /> COI</label>
            <label><input type="checkbox" checked={!!form.authorContributions} onChange={e=>setForm({...form,authorContributions:e.target.checked})} /> Author contributions</label>
            <label><input type="checkbox" checked={!!form.dataAvailability} onChange={e=>setForm({...form,dataAvailability:e.target.checked})} /> Data availability</label>
            <label><input type="checkbox" checked={!!form.consentObtained} onChange={e=>setForm({...form,consentObtained:e.target.checked})} /> Consent obtained</label>
<label>Consent date <input type="date" placeholder="Consent date" value={form.consentDate || ''} onChange={e=>setForm({...form, consentDate:e.target.value})} /></label>
<label><input type="checkbox" checked={!!form.withdrawn} onChange={e=>setForm({...form,withdrawn:e.target.checked})} /> Withdrawn</label>
<label>Withdrawal date <input type="date" placeholder="Withdrawal date" value={form.withdrawalDate || ''} onChange={e=>setForm({...form, withdrawalDate:e.target.value})} /></label>
          </div>
          <div style={{color:"var(--danger)"}}>{error}</div>
          <button onClick={save}>{form.id?'Update':'Add'} Study</button>
        </div>
        <div style={{marginTop:12}}>
          <div style={{marginBottom:6,fontWeight:600}}>Collaborating departments</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
            {collabList(form.collaboratingDepartments).map((name:string)=>(
              <span key={name} className="zri-badge">
                {name}
                <button style={{padding:0,border:'none',background:'transparent',color:'var(--danger)',cursor:'pointer',marginLeft:4}} onClick={()=>removeCollabDept(name)}>×</button>
              </span>
            ))}
          </div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <select value={collabInput} onChange={e=>setCollabInput(e.target.value)}>
              <option value="">Add collaborating department</option>
              {departments.map((d:any)=><option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
            <button onClick={()=>{ addCollabDept(collabInput); setCollabInput('') }}>Add</button>
          </div>
        </div>
      </div>
      <div className="zri-card" style={{overflowX:'auto'}}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead><tr><th>ID</th><th>Dataset ID</th><th>Title</th><th>Dept</th><th>Author</th><th>Phase</th><th>Collaboration</th><th>Submission</th><th>Pub Ready</th><th></th></tr></thead>
          <tbody>
            {rows.map(r=>(
              <tr key={r.id}>
                <td>{r.studyId}</td>
                <td style={{color: r.trackingId && !projectIds.has(r.trackingId) ? 'orange' : undefined, fontWeight: r.trackingId && !projectIds.has(r.trackingId) ? 700 : 400}}>{r.trackingId || '-'}</td>
                <td>{r.title}</td>
                <td>{r.primaryDepartment}</td>
                <td>{r.firstAuthor}</td>
                <td>
                  <select value={PHASE_OPTIONS.includes(r.currentPhase) ? r.currentPhase : 'Idea Stage'} onChange={e=>updatePhase(r.id, e.target.value)}>
                    {PHASE_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td>{r.collaboratingDepartments || '-'}</td>
                <td>
                  <select value={STATUS_OPTIONS.includes(r.submissionStatus) ? r.submissionStatus : 'Not Submitted'} onChange={e=>updateSubmission(r.id, e.target.value)}>
                    {STATUS_OPTIONS.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td>{r.ethicsApproval && r.coiDeclared && r.authorContributions && r.dataAvailability && (r.consentObtained || r.withdrawn) ? 'Yes' : 'No'}</td>
                <td>
                  {user && (isAdmin || user.id === r.createdBy) && <button title={r.createdBy ? `Created by ${r.createdBy}` : ''} onClick={()=>{ setForm(r); }}>Edit</button>}
                  {user && (isAdmin || user.id === r.createdBy) && <button onClick={()=>del(r.id)}>Del</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="zri-card" style={{marginTop:16}}>
        <h3>Study Comments</h3>
        <div style={{display:'flex',gap:8,marginBottom:8}}>
          <input placeholder="Study ID" value={commentStudyId} onChange={e=>setCommentStudyId(e.target.value)} />
          <input placeholder="Comment" value={commentText} onChange={e=>setCommentText(e.target.value)} style={{flex:1}} />
          <button onClick={async ()=>{ if(!commentStudyId||!commentText) return; await db.studyComments.add({studyId:commentStudyId,text:commentText,createdAt:Date.now()}); setCommentText(''); window.dispatchEvent(new CustomEvent('zri:toast',{detail:'Comment added'})) }}>Add</button>
        </div>
      </div>
    </section>
  )
}









