import { useState } from 'react'
import { db } from '../db'
import QRCode from 'qrcode'
// currentUser not needed

export default function VerifyDataset() {
  const [key, setKey] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  async function verify() {
    if (!key.trim()) { setError('Please enter a key'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const normalized = key.replace(/-/g, '').toUpperCase()
      // Try local first
      const ck = await db.completionKeys.where('cryptoKey').equals(normalized).first()
      let cd = ck ? await db.completedDatasets.get(ck.completedDatasetId) : null
      
      // If not found locally, try cloud
      if (!cd) {
        const cloudData = await (await import('../firebase/verify')).fetchCompletionFromCloud(normalized)
        if (cloudData) {
          cd = cloudData
          // Cache locally for offline access
          const newId = await db.completedDatasets.add(cloudData as any)
          await db.completionKeys.add({ cryptoKey: normalized, completedDatasetId: newId as number, createdAt: Date.now() })
        }
      }
      
      if (!cd) { setError('Invalid key — no matching completed dataset'); return }
      const org = await db.organizations.get(cd.organizationId)
      setResult({ ...cd, organizationName: org?.name || 'Unknown' })
      // Check if superseded
      if (cd.supersededBy) {
        const newer = await db.completedDatasets.get(cd.supersededBy)
        if (newer) (window as any).__supersededNewer = newer
      }
      try {
        const url = await QRCode.toDataURL(normalized, { width: 180, margin: 2 })
        setQrDataUrl(url)
      } catch { setQrDataUrl(null) }
    } catch (e: any) {
      setError(e?.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <h1>Verify Dataset Authenticity</h1>
      <div className="zri-card" style={{ maxWidth: 500, margin: '0 auto' }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Paste a completion key to verify a completed dataset.</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input value={key} onChange={e => setKey(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX" style={{ flex: 1 }} />
          <button onClick={verify} disabled={loading}>{loading ? 'Verifying...' : 'Verify'}</button>
        </div>
        {error && <div style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</div>}
        {result && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, color: 'var(--text-h)', fontSize: 16 }}>✅ Dataset Verified</div>
            <div style={{ marginTop: 8, fontSize: 14 }}>
              <div><strong>Organization:</strong> {result.organizationName}</div>
              <div><strong>Topic:</strong> {result.topicName}</div>
              <div><strong>Participants:</strong> {result.participants}</div>
              <div><strong>Authors:</strong></div>
              <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
                {result.authors?.map((a: any, i: number) => (
                  <li key={i}>{a.name} ({a.role}) — {a.email}</li>
                ))}
              </ul>
              <div><strong>Conflict of Interest:</strong> {result.conflictOfInterest || 'None declared'}</div>
              <div><strong>Sponsors:</strong> {result.sponsors || 'None'}</div>
              <div><strong>Study Location:</strong> {result.studyLocation}</div>
              <div><strong>Completed:</strong> {new Date(result.completedAt).toLocaleString()}</div>
              <div><strong>Crypto Key:</strong> <code>{result.cryptoKey}</code></div>
              {result.supersededBy && <div style={{ marginTop: 4, color: '#f59e0b', fontWeight: 600, fontSize: 13 }}>⚠️ Superseded — a newer version exists</div>}
              {!result.supersededBy && <div style={{ marginTop: 4, color: '#22c55e', fontWeight: 600, fontSize: 13 }}>✅ Current version</div>}
               {qrDataUrl && <div style={{ marginTop: 12, textAlign: 'center' }}><img src={qrDataUrl} alt="QR code for key" style={{ border: '1px solid var(--border)', borderRadius: 8 }} /><div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Scan to share key</div></div>}
              <div><strong>Edit Count:</strong> {result.editCount}</div>
              {result.editCount > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontWeight: 600, color: '#3b82f6' }}>Edited Sections ({result.editCount} edits)</div>
                  {result.editHistory?.map((e: any, i: number) => (
                    <div key={i} style={{ fontSize: 12, marginTop: 4, borderLeft: '3px solid #3b82f6', paddingLeft: 8, background: 'rgba(59,130,246,0.08)' }}>
                      Edit #{i + 1}: {e.changedFields.join(', ')} — {new Date(e.editedAt).toLocaleString()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}