import { useEffect, useState } from 'react'
import { db } from '../db'
import { currentUser, hasPermission } from '../auth/auth'
import { encryptField, decryptField } from '../security/crypto'
import { showToast } from '../components/Toast'
import { burstConfetti } from '../components/Confetti'

type Author = { name: string; email: string; institution?: string }

export default function PublishedVaultPage() {
  const [rows, setRows] = useState<any[]>([])
  const [departments, setDepartments] = useState<any[]>([])
  const [canManage, setCanManage] = useState(false)
  const [form, setForm] = useState<any>({ studyId: '', trackingId: '', publicationType: 'other', title: '', firstAuthor: '', authors: [] as Author[], primaryDepartment: '', journal: '', publicationDate: '', doi: '', takeaway: '' })
  const [authorModal, setAuthorModal] = useState(false)
  const [authorForm, setAuthorForm] = useState<Author>({ name: '', email: '', institution: '' })
  const [editingAuthorIndex, setEditingAuthorIndex] = useState<number | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  async function load() {
    const rawRows = await db.publishedRecords.toArray()
    const decryptedRows = await Promise.all(rawRows.map(async (r: any) => ({
      ...r,
      firstAuthor: await decryptField(r.firstAuthor || ''),
      authors: r.authors ? await Promise.all(r.authors.map(async (a: any) => ({
        ...a,
        name: await decryptField(a.name || ''),
        email: await decryptField(a.email || '')
      }))) : []
    })))
    setRows(decryptedRows)
    setDepartments((await db.departments.toArray()).sort((a: any, b: any) => a.name.localeCompare(b.name)))
    const u = await currentUser()
    setCanManage(!!u && (await hasPermission(u, '*') || await hasPermission(u, 'team:manage')))
  }
  async function onTrackingChange(id: string) {
    setForm((f: any) => ({ ...f, trackingId: id }))
    if (id) {
      const p = await db.projects.where('trackingId').equals(id).first()
      if (p) setForm((f: any) => ({ ...f, trackingId: id, publicationDate: new Date(p.createdAt).toISOString().slice(0, 10) }))
    }
  }

  useEffect(() => { load() }, [])

  function openAddAuthor() {
    setEditingAuthorIndex(null)
    setAuthorForm({ name: '', email: '', institution: '' })
    setAuthorModal(true)
  }
  function openEditAuthor(i: number) {
    setEditingAuthorIndex(i)
    setAuthorForm({ ...form.authors[i] })
    setAuthorModal(true)
  }
  function saveAuthor() {
    if (!authorForm.name.trim()) return
    const next = [...(form.authors || [])]
    if (editingAuthorIndex === null) next.push(authorForm)
    else next[editingAuthorIndex] = authorForm
    setForm((f: any) => ({ ...f, authors: next }))
    setAuthorModal(false)
  }
  function removeAuthor(i: number) {
    const next = [...(form.authors || [])]
    next.splice(i, 1)
    setForm((f: any) => ({ ...f, authors: next }))
  }
  function onDragStart(i: number) { setDragIndex(i) }
  function onDragOver(e: React.DragEvent, i: number) {
    e.preventDefault()
    if (dragIndex === null || dragIndex === i) return
    const next = [...(form.authors || [])]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(i, 0, moved)
    setForm((f: any) => ({ ...f, authors: next }))
    setDragIndex(i)
  }
  function onDragEnd() { setDragIndex(null) }

  async function save() {
    if (!form.title.trim()) return
    const now = Date.now()
    const doi = (form.doi || '').trim()
    if (doi) {
      const dup = (await db.publishedRecords.toArray()).find((r: any) => r.id !== form.id && (r.doi || '').toLowerCase() === doi.toLowerCase())
      if (dup) { showToast('Duplicate DOI detected'); return }
    }
    const authors = form.authors || []
    const u = await currentUser()
    const encFirstAuthor = await encryptField(form.firstAuthor || '')
    const encAuthors = await Promise.all(authors.map(async (a: any) => ({ ...a, name: await encryptField(a.name || ''), email: await encryptField(a.email || '') })))
    if (form.id) { await db.publishedRecords.update(form.id, { ...form, firstAuthor: encFirstAuthor, authors: encAuthors, updatedAt: now }); await db.auditLog.add({ entityType: 'publishedRecord', entityId: String(form.id), action: 'update', actorId: u?.id, details: { title: form.title }, createdAt: Date.now() }) }
    else { const newId = await db.publishedRecords.add({ ...form, firstAuthor: encFirstAuthor, authors: encAuthors, createdAt: now, updatedAt: now }); await db.auditLog.add({ entityType: 'publishedRecord', entityId: String(newId), action: 'create', actorId: u?.id, details: { title: form.title }, createdAt: Date.now() }) }
    setForm({ studyId: '', trackingId: '', publicationType: 'other', title: '', firstAuthor: '', authors: [], primaryDepartment: departments[0]?.name || '', journal: '', publicationDate: '', doi: '', takeaway: '' })
    load()
    showToast('Published record saved')
    burstConfetti()
  }
  // del function removed - inline delete handler used instead

  return (
    <section>
      <h1>Published Vault</h1>
      <div className="zri-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input placeholder="Study ID" value={form.studyId} onChange={e => setForm({ ...form, studyId: e.target.value })} />
          <input placeholder="Dataset Tracking ID (RIC-...)" value={form.trackingId} onChange={e => onTrackingChange(e.target.value)} />
          <select value={form.publicationType} onChange={e => setForm({ ...form, publicationType: e.target.value })}>
            <option value="meta-analysis">Meta-analysis</option>
            <option value="narrative-review">Narrative review</option>
            <option value="systematic-review">Systematic review</option>
            <option value="rct">RCT</option>
            <option value="cohort">Cohort</option>
            <option value="case-report">Case report</option>
            <option value="other">Other</option>
          </select>
          <input placeholder="Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <input placeholder="First Author" value={form.firstAuthor} onChange={e => setForm({ ...form, firstAuthor: e.target.value })} />
          <input placeholder="DOI" value={form.doi} onChange={e => setForm({ ...form, doi: e.target.value })} />
          <select value={form.primaryDepartment} onChange={e => setForm({ ...form, primaryDepartment: e.target.value })}>
            <option value="">Department</option>
            {departments.map((d: any) => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
          <input placeholder="Journal" value={form.journal} onChange={e => setForm({ ...form, journal: e.target.value })} />
          <input placeholder="Date" value={form.publicationDate} onChange={e => setForm({ ...form, publicationDate: e.target.value })} />
          <button onClick={save}>{form.id ? 'Update' : 'Add'} Published</button>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Authors (registered)</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
            {(form.authors || []).map((a: Author, i: number) => (
              <button key={i} draggable={canManage} onDragStart={() => onDragStart(i)} onDragOver={(e) => onDragOver(e, i)} onDragEnd={onDragEnd}
                onClick={() => canManage && openEditAuthor(i)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)' }}>
                <sup>{i + 1}</sup> {a.name} <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({a.institution || 'Unaffiliated'})</span>
              </button>
            ))}
          </div>
          {canManage && <button onClick={openAddAuthor}>+ Add Author</button>}
        </div>
      </div>

      <div className="zri-grid zri-stagger">
        {rows.map(r => (
          <div className="zri-card" key={r.id}>
            <div style={{ fontWeight: 700, color: 'var(--text-h)' }}>{r.title}</div>
            <div>{r.firstAuthor} � {r.primaryDepartment}</div>
            <div>{r.journal} � {r.publicationDate}</div>
            <div style={{ fontSize: 12 }}>{r.takeaway}</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              {(r.authors || []).map((a: Author, i: number) => (
                <span key={i} style={{ marginRight: 6 }}><sup>{i + 1}</sup>{a.name}<sub>{a.institution ? ` (${a.institution})` : ''}</sub></span>
              ))}
            </div>
            <div><button onClick={() => setForm({ ...r, authors: r.authors || [] })}>Edit</button> <button onClick={async () => { const rr = await db.publishedRecords.get(r.id); await db.publishedRecords.delete(r.id); const u = await currentUser(); await db.auditLog.add({ entityType: 'publishedRecord', entityId: String(r.id), action: 'delete', actorId: u?.id, details: { title: rr?.title }, createdAt: Date.now() }); load() }}>Del</button></div>
          </div>
        ))}
      </div>

      {authorModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="zri-card" style={{ width: 400, padding: 20 }}>
            <h3>{editingAuthorIndex === null ? 'Add Author' : 'Edit Author'}</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input placeholder="Name" value={authorForm.name} onChange={e => setAuthorForm({ ...authorForm, name: e.target.value })} />
              <input placeholder="Gmail/Email" value={authorForm.email} onChange={e => setAuthorForm({ ...authorForm, email: e.target.value })} />
              <input placeholder="Institution" value={authorForm.institution} onChange={e => setAuthorForm({ ...authorForm, institution: e.target.value })} />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                {editingAuthorIndex !== null && <button onClick={() => { removeAuthor(editingAuthorIndex); setAuthorModal(false) }}>Remove</button>}
                <button onClick={() => setAuthorModal(false)}>Cancel</button>
                <button onClick={saveAuthor}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
