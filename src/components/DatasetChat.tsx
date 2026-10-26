import { useEffect, useState } from 'react'
import { db } from '../db'
import { currentUser } from '../auth/auth'
import { recordOperation } from '../sync/oplog'

export default function DatasetChat({ projectId, role, open, onClose }: { projectId: string; role: string; open: boolean; onClose: () => void }) {
  const [msgs, setMsgs] = useState<any[]>([])
  const [text, setText] = useState('')
  const [showDeleted, setShowDeleted] = useState(false)
  const [members, setMembers] = useState<any[]>([])
  const [mention, setMention] = useState<number | null>(null)

  async function load() {
    const me = await currentUser()
    const all = await db.chatMessages.where('projectId').equals(projectId).toArray()
    if (me?.id) {
      for (const m of all) {
        if (m.authorId !== 'me' && !(m.seenBy || []).includes(me.id)) {
          await db.chatMessages.update(m.id!, { seenBy: [...(m.seenBy || []), me.id], deliveredTo: [...(m.deliveredTo || []), me.id] })
        }
      }
    }
    const fresh = await db.chatMessages.where('projectId').equals(projectId).toArray()
    setMsgs(fresh.filter(m => !m.deletedAt || (role === 'admin' && showDeleted)))
    const us = await db.users.toArray()
    const roles = await db.roles.toArray()
    const rmap = Object.fromEntries(roles.map(r => [r.id, r.name]))
    const now = Date.now()
    if (me?.id) await db.users.update(me.id, { lastSeenAt: now })
    setMembers(us.filter(u => !u.revokedAt).map(u => ({ ...u, roleName: rmap[u.roleId], online: (u.lastSeenAt || 0) > now - 5 * 60 * 1000 })))
  }
  useEffect(() => { if (open) load() }, [projectId, showDeleted, open])

  async function send() {
    if (!text.trim()) return
    const me = await currentUser()
    const mentions = mention ? [mention] : []
    const id = await db.chatMessages.add({ projectId, authorId: 'me', text, createdAt: Date.now(), mentions, deliveredTo: me?.id ? [me.id] : [], seenBy: me?.id ? [me.id] : [] })
    if (me?.id) await db.auditLog.add({ entityType: 'chatMessage', entityId: String(id), action: 'create', actorId: me.id, details: { projectId, text: text.slice(0, 100) }, createdAt: Date.now() })
    const peer = await db.peers.toCollection().first()
    const deviceId = peer?.deviceId || crypto.randomUUID()
    const msg = await db.chatMessages.get(id)
    if (msg) await recordOperation('chatMessage', String(id), 'create', msg, deviceId)
    setText('')
    setMention(null)
    load()
  }

  async function softDelete(id: number) {
    await db.chatMessages.update(id, { deletedAt: Date.now(), deletedBy: 'me' })
    load()
  }
  async function hardDelete(id: number) {
    if (role !== 'admin') return
    await db.chatMessages.delete(id)
    load()
  }

  if (!open) return null



  return (
    <div style={{ position:'fixed', right:16, bottom:16, zIndex:1000, transform:'scale(1)', opacity:1, transition:'transform .25s cubic-bezier(.2,.8,.2,1), opacity .2s', transformOrigin:'bottom right', fontFamily:'var(--sans)' }}>
      <div style={{ width:480, height:'80vh', background:'var(--bg-2)', color:'var(--text)', border:'1px solid var(--accent-border)', borderRadius:16, boxShadow:'var(--shadow)', display:'flex', flexDirection:'column' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:12, borderBottom:'1px solid var(--accent-border)' }}>
          <h3 style={{ margin:0, color:'var(--text-h)' }}>Project Chat</h3>
          <button className="zri-badge" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding:8, borderBottom:'1px solid var(--accent-border)' }}>
          <div style={{ fontSize:12, fontWeight:600, marginBottom:4 }}>Team</div>
          {members.map(m => (
            <div key={m.id} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12 }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background: m.online ? 'var(--success)' : 'var(--border)' }} />
              <span>{m.displayName}</span>
              <span style={{ color:'var(--text)' }}>({m.roleName})</span>
            </div>
          ))}
        </div>
        {role === 'admin' && <label style={{ padding:8, display:'block' }}><input type="checkbox" checked={showDeleted} onChange={e=>setShowDeleted(e.target.checked)} /> Show deleted</label>}
        <div style={{ flex:1, overflow:'auto', padding:8 }}>
          {msgs.map((m,i) => {
            const mine = m.authorId === 'me'
            return (
            <div key={m.id} style={{ display:'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom:8, animation:`fadeIn .2s ease ${i*0.03}s both` }}>
              <div style={{ maxWidth:'75%', padding:'8px 12px', background: mine ? 'var(--accent-bg)' : 'var(--bg)', border:'1px solid var(--accent-border)', borderRadius: mine ? '16px 16px 4px 16px' : '16px 16px 16px 4px', opacity: m.deletedAt ? .5 : 1 }}>
                <div style={{ fontSize:11, color:'var(--text)' }}>{m.authorId} • {new Date(m.createdAt).toLocaleTimeString()}</div>
                <div>{m.deletedAt ? '[deleted]' : m.text}</div>
                {mine && !m.deletedAt && (
                  <div style={{ fontSize:12, textAlign:'right', color: (m.seenBy||[]).length >= (members.length || 1) ? 'var(--success)' : 'var(--text)', marginTop:4 }}>
                    {(m.seenBy||[]).length >= (members.length || 1) ? '✓✓' : (m.deliveredTo||[]).length > 1 ? '✓✓' : '✓'}
                  </div>
                )}
                {role !== 'viewer' && !m.deletedAt && <button className="zri-badge" onClick={()=>softDelete(m.id)}>Delete</button>}
                {role === 'admin' && <button className="zri-badge" onClick={()=>hardDelete(m.id)}>Purge</button>}
              </div>
            </div>
            )
          })}
        </div>
        <div style={{ display:'flex', gap:4, padding:8, borderTop:'1px solid var(--accent-border)', alignItems:'center' }}>
          <select value={mention ?? ''} onChange={e=>setMention(e.target.value ? Number(e.target.value) : null)} style={{ width:110 }}>
            <option value="">@mention</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.displayName}</option>)}
          </select>
          <input value={text} onChange={e=>setText(e.target.value)} style={{ flex:1 }} placeholder="Message..." />
          <button className="zri-badge" onClick={send}>Send</button>
        </div>
      </div>
    </div>
  )
}
