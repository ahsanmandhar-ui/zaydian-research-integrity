import { useState } from 'react'
import { type EmptyCell } from '../dataset/export'

export interface ExportModalProps {
  emptyCells: EmptyCell[]
  excludedVars: string[]
  onContinue: (includeSensitive: boolean, applyAutoFix: boolean, format: 'csv' | 'json' | 'both') => void
  onCancel: () => void
}

export default function ExportModal({ emptyCells, excludedVars, onContinue, onCancel }: ExportModalProps) {
  const [includeSensitive, setIncludeSensitive] = useState(false)
  const [applyAutoFix, setApplyAutoFix] = useState(false)
  const [format, setFormat] = useState<'csv' | 'json' | 'both'>('both')

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="glass-panel" style={{ background: 'var(--glass-bg)', padding: 20, borderRadius: 12, width: 520, maxHeight: '80vh', overflow: 'auto' }}>
        <h3>Export Dataset</h3>
        <p style={{ color: 'var(--text-muted)' }}>Empty cells are flagged red. Continue downloads as-is.</p>

        <div style={{ marginBottom: 12 }}>
          <label><input type="checkbox" checked={includeSensitive} onChange={e => setIncludeSensitive(e.target.checked)} /> Include sensitive fields (email/phone)</label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label><input type="checkbox" checked={applyAutoFix} onChange={e => setApplyAutoFix(e.target.checked)} /> Apply auto-fix before export</label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Format: </label>
          <select value={format} onChange={e => setFormat(e.target.value as any)}>
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
            <option value="both">Both</option>
          </select>
        </div>

        {excludedVars.length > 0 && (
          <div style={{ marginBottom: 12, color: 'var(--text-muted)' }}>
            Excluded (sensitive): {excludedVars.join(', ')}
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <strong>Empty cells (red):</strong>
          <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid var(--border)', padding: 8, marginTop: 4 }}>
            {emptyCells.length === 0 && <span style={{ color: 'var(--text-muted)' }}>None</span>}
            {emptyCells.map((c, i) => (
              <div key={i} style={{ color: '#ef4444' }}>Row {c.row} — {c.variable}</div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel}>Cancel</button>
          <button onClick={() => onContinue(includeSensitive, applyAutoFix, format)}>Continue & Download</button>
        </div>
      </div>
    </div>
  )
}
