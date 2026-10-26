import { useMemo, useState, useEffect } from 'react'
import { computeQuality } from '../analytics/datasetQuality'

type AnalysisType = 'overview' | 'missingness' | 'distributions' | 'categorical' | 'outliers' | 'edits'

export default function AnalyticsTab({ vars, records }: { vars: any[]; records: any[] }) {
  const [active, setActive] = useState<AnalysisType>('overview')
  const [selectedVar, setSelectedVar] = useState<string>(vars[0]?.name || '')
  useEffect(() => { if (vars.length && !vars.some(v => v.name === selectedVar)) setSelectedVar(vars[0]?.name || '') }, [vars, selectedVar])

  const stats = useMemo(() => computeQuality(vars, records), [vars, records])
  const maxMissing = Math.max(1, ...Object.values(stats.missingByVar))

  const neon = (c: string) => ({ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: c, boxShadow: `0 0 10px ${c}`, marginRight: 6, verticalAlign: 'middle' })

  return (
    <div className="glass-panel analytics-glass" style={{ padding: 16, fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--text-h)', background: 'linear-gradient(135deg, rgba(94,106,210,0.12), rgba(168,85,247,0.10), rgba(34,197,94,0.08))', backdropFilter: 'blur(12px)' }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {(['overview','missingness','distributions','categorical','outliers','edits'] as AnalysisType[]).map(t => (
          <button key={t} onClick={() => setActive(t)} aria-pressed={active === t} aria-label={t} style={{ fontWeight: active === t ? 700 : 400, background: active === t ? 'var(--accent-bg)' : 'transparent' }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => { const blob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'analytics.json'; a.click(); URL.revokeObjectURL(url) }}>Export JSON</button>
        <button onClick={() => window.print()}>Export PDF</button>
        <button onClick={() => { const rows = Object.entries(stats).map(([k,v]) => `${k},${JSON.stringify(v)}`); const blob = new Blob([rows.join('\\n')], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'analytics.csv'; a.click(); URL.revokeObjectURL(url) }}>Export CSV</button>
      </div>

      <div style={{ marginBottom: 8 }}><strong>Color code:</strong> <span style={{color:'#ef4444'}}>■ empty/missing</span> · <span style={{color:'#f59e0b'}}>■ auto-fixed</span> · <span style={{color:'#a855f7'}}>■ user-overridden (locked)</span> · <span style={{color:'#22c55e'}}>■ valid</span> · <span style={{color:'#9ca3af'}}>■ excluded</span></div>

      {active === 'overview' && (
        <div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>Health: {stats.score}/100</div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 12 }}>
            Rows: {stats.n} | Variables: {vars.length} | Missing: {stats.missingTotal} ({stats.missingPct.toFixed(1)}%) | Duplicates: {stats.dupRows} | Constant cols: {stats.constantCols} | High-cardinality: {stats.highCard}
          </div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>Integrity Index: {stats.integrityIndex}/100</div>
          <h4>Missingness by variable</h4>
          <svg width={600} height={220} viewBox="0 0 600 220" role="img" aria-label="chart"><title>Analytics chart</title><desc>Bar chart of variable metrics</desc>
            {vars.map((v, i) => {
              const val = stats.missingByVar[v.name] || 0
              const h = (val / maxMissing) * 160
              const x = i * (600 / Math.max(1, vars.length))
              return (
                <g key={v.id}>
                  <rect x={x + 4} y={220 - h - 20} width={Math.max(8, 600 / vars.length - 8)} height={h} fill="rgba(235,87,87,0.75)" style={{ filter: "drop-shadow(0 0 6px rgba(235,87,87,0.9))" }} />
                  <text x={x + 8} y={215} fontSize={9} transform={`rotate(-45 ${x + 8} 215)`}>{v.name}</text>
                </g>
              )
            })}
          </svg>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12 }}>
            <span><span style={neon('rgba(235,87,87,0.9)')} />Missing cells</span>
            <span><span style={neon('rgba(94,106,210,0.9)')} />Distinct values</span>
          </div>
        </div>
      )}

      {active === 'missingness' && (
        <div>
          <h4>Missing cells per variable</h4>
          <ul>
            {vars.map(v => (
              <li key={v.id}>{v.name}: {stats.missingByVar[v.name] || 0} missing</li>
            ))}
          </ul>
          <h4>Missing pattern heatmap</h4>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(vars.length, 8)}, 1fr)`, gap: 4, maxWidth: 480 }}>
            {vars.map(v => {
              const miss = stats.missingByVar[v.name] || 0
              const intensity = miss / (stats.n || 1)
              return <div key={v.id} title={`${v.name}: ${miss} missing`} style={{ height: 24, borderRadius: 4, background: `rgba(235,87,87,${0.15 + intensity*0.8})`, boxShadow: `0 0 6px rgba(235,87,87,${intensity})` }} />
            })}
          <h4>Missingness clusters</h4>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {['High (>30%)','Medium (10-30%)','Low (<10%)'].map(label => {
              const varsIn = vars.filter((v:any) => {
                const miss = stats.missingByVar[v.name] || 0
                const pct = stats.n ? miss/stats.n : 0
                if (label.startsWith('High')) return pct > 0.3
                if (label.startsWith('Medium')) return pct >= 0.1 && pct <= 0.3
                return pct < 0.1
              })
              return <div key={label} style={{ padding: 8, borderRadius: 8, background: 'var(--accent-bg)' }}><strong>{label}</strong>: {varsIn.map((v:any)=>v.name).join(', ') || 'none'}</div>
            })}
          </div>
          </div>
        </div>
      )}
      {active === 'distributions' && (
        <div>
          <h4>Distinct values per variable</h4>
          <svg width={600} height={220} viewBox="0 0 600 220" role="img" aria-label="chart"><title>Analytics chart</title><desc>Bar chart of variable metrics</desc>
            {vars.map((v, i) => {
              const val = stats.distinct[v.name]?.size || 0
              const maxD = Math.max(1, ...vars.map(vv => stats.distinct[vv.name]?.size || 0))
              const h = (val / maxD) * 160
              const x = i * (600 / Math.max(1, vars.length))
              return (
                <g key={v.id}>
                  <rect x={x + 4} y={220 - h - 20} width={Math.max(8, 600 / vars.length - 8)} height={h} fill="rgba(94,106,210,0.75)" style={{ filter: "drop-shadow(0 0 6px rgba(94,106,210,0.9))" }} />
                  <text x={x + 8} y={215} fontSize={9} transform={`rotate(-45 ${x + 8} 215)`}>{v.name}</text>
                </g>
              )
            })}
          </svg>
          <h4>Distribution tests</h4>
          <ul>
            {vars.filter((v:any)=>v.type==='numeric').map((v:any) => {
              const vals = records.map((r:any)=>Number(r.values?.[v.name])).filter(Number.isFinite)
              const n = vals.length
              const mean = n ? vals.reduce((a,b)=>a+b,0)/n : 0
              const std = n ? Math.sqrt(vals.reduce((a,b)=>a+(b-mean)**2,0)/n) : 0
              const skew = n && std ? vals.reduce((a,b)=>a+Math.pow((b-mean)/std,3),0)/n : 0
              return <li key={v.id}>{v.name}: n={n}, mean={mean.toFixed(3)}, sd={std.toFixed(3)}, skewness={skew.toFixed(3)}, {Math.abs(skew)<0.5?'~symmetric':'skewed'}</li>
            })}
          </ul>
          <h4>Correlation matrix (numeric)</h4>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, vars.filter((v:any)=>v.type==='numeric').length)}, 40px)`, gap: 2 }}>
            {(() => {
              const nv = vars.filter((v:any)=>v.type==='numeric')
              const mat = nv.map((a:any) => nv.map((b:any) => {
                const xa = records.map((r:any)=>Number(r.values?.[a.name])).filter(Number.isFinite)
                const xb = records.map((r:any)=>Number(r.values?.[b.name])).filter(Number.isFinite)
                const n = Math.min(xa.length, xb.length)
                if (n < 2) return 0
                const ma = xa.slice(0,n).reduce((s,x)=>s+x,0)/n
                const mb = xb.slice(0,n).reduce((s,x)=>s+x,0)/n
                const cov = xa.slice(0,n).reduce((s,x,i)=>s+(x-ma)*(xb[i]-mb),0)
                const va = Math.sqrt(xa.slice(0,n).reduce((s,x)=>s+(x-ma)**2,0))
                const vb = Math.sqrt(xb.slice(0,n).reduce((s,x)=>s+(x-mb)**2,0))
                return va && vb ? cov/(va*vb) : 0
              }))
              return mat.flat().map((c:number, i:number) => (
                <div key={i} title={c.toFixed(3)} style={{ width: 40, height: 40, borderRadius: 4, background: c>=0 ? `rgba(34,197,94,${Math.abs(c)})` : `rgba(239,68,68,${Math.abs(c)})`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, color:'#fff' }}>{c.toFixed(2)}</div>
              ))
            })()}
          </div>
        </div>
      )}
      {active === 'categorical' && (
        <div>
          <div style={{ marginBottom: 8 }}>
            <label>Variable: </label>
            <select value={selectedVar} onChange={e => setSelectedVar(e.target.value)}>
              {vars.filter(v => v.type === 'string').map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
            </select>
          </div>
          <h4>Top values: {selectedVar}</h4>
          <ul>
            {Object.entries(stats.catCounts?.[selectedVar] || {}).sort((a:any,b:any)=>b[1]-a[1]).slice(0,10).map(([k,v]) => (
              <li key={k}>{k}: {v}</li>
            ))}
          </ul>
        </div>
      )}

      {active === 'outliers' && (
        <div>
          <h4>Outlier fixation summary</h4>
          <div>Cells auto-fixed for outliers: {stats.outlierFixed}</div>
          <div style={{ color: 'var(--text-muted)' }}>Cleaned values exported as fixed.</div>
        </div>
      )}

      {active === 'edits' && (
        <div>
          <h4>Edit activity</h4>
          <div>Total edits: {stats.totalEdits}</div>
          <div style={{ color: 'var(--text-muted)' }}>Edit stability: {(stats.editStability*100).toFixed(1)}%</div>
          <div>Integrity Index: {stats.integrityIndex}/100</div>
        </div>
      )}
    </div>
  )
}
