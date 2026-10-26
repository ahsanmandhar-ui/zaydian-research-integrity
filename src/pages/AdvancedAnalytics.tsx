import { useEffect, useState } from 'react'
import { db } from '../db'
import CountUp from '../components/CountUp'
import ProgressRing from '../components/ProgressRing'

function BarChart({ data, width=420, height=200 }: { data: { label:string; value:number }[]; width?:number; height?:number }) {
  const max = Math.max(1, ...data.map(d=>d.value))
  const barW = width / Math.max(1,data.length) - 8
  return (
    <svg width={width} height={height} style={{display:'block'}}>
      {data.map((d,i) => {
        const h = (d.value/max)*(height-30)
        const x = i*(barW+8)+4
        const y = height-20-h
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} fill='var(--accent)' rx='4' />
            <text x={x+barW/2} y={height-5} fontSize='9' textAnchor='middle' fill='var(--text)'>{d.label.slice(0,10)}</text>
            <text x={x+barW/2} y={y-4} fontSize='10' textAnchor='middle' fill='var(--text-h)'>{d.value}</text>
          </g>
        )
      })}
    </svg>
  )
}

export default function AdvancedAnalytics() {
  const [studies, setStudies] = useState<any[]>([])
  const [published, setPublished] = useState<any[]>([])
  useEffect(() => { db.studies.toArray().then(setStudies); db.publishedRecords.toArray().then(setPublished) }, [])
  const total = studies.length
  const active = studies.length
  const underReview = studies.filter(s => s.submissionStatus?.includes('Under Review') || s.submissionStatus?.includes('Pending')).length
  const accepted = studies.filter(s => ['Accepted for Presentation','Selected for Journal Publication','Abstract Accepted','Published'].includes(s.submissionStatus)).length
  const publishedCount = published.length
  const rate = total ? (accepted/total*100).toFixed(1)+'%' : '0%'
  const depts = Array.from(new Set(studies.map(s=>s.primaryDepartment)))
  const authorMap: Record<string, {email:string; name:string; publications:number; types:Record<string,number>; ongoing:number}> = {}
  for (const p of published) {
    const emails = (p.authors||[]).map((a:any)=>(a.email||'').toLowerCase()).filter(Boolean)
    if (p.firstAuthor && !emails.length) emails.push((p.firstAuthor||'').toLowerCase())
    for (const e of emails) {
      if (!authorMap[e]) authorMap[e] = { email:e, name: (p.authors||[]).find((a:any)=>(a.email||'').toLowerCase()===e)?.name || p.firstAuthor || e, publications:0, types:{}, ongoing:0 }
      authorMap[e].publications += 1
      const t = p.publicationType || 'other'
      authorMap[e].types[t] = (authorMap[e].types[t]||0)+1
    }
  }
  for (const s of studies) {
    const email = (s.firstAuthor||'').toLowerCase()
    if (email && authorMap[email]) authorMap[email].ongoing += 1
  }
  const authorMetrics = Object.values(authorMap).sort((a,b)=>b.publications-a.publications)

  const deptData = depts.map(d => ({ label:d, value: studies.filter(s=>s.primaryDepartment===d).length }))
  const statuses = Array.from(new Set(studies.map(s=>s.submissionStatus)))
  const funnelData = statuses.map(st => ({ label:st, value: studies.filter(s=>s.submissionStatus===st).length }))
  const authors = Array.from(new Set(studies.map(s=>s.firstAuthor)))
  const leaderboard = authors.map(a => ({ author:a, active: studies.filter(s=>s.firstAuthor===a).length, published: studies.filter(s=>s.firstAuthor===a && ['Selected for Journal Publication','Published','Abstract Accepted'].includes(s.submissionStatus)).length }))
    .sort((a,b)=> (b.active+b.published) - (a.active+a.published))
  const monthsMap: Record<string, number> = {}
  for (const s of studies) {
    if (s.abstractSubmissionDate) {
      const m = s.abstractSubmissionDate.slice(0,7)
      monthsMap[m] = (monthsMap[m]||0)+1
    }
  }
  const monthData = Object.entries(monthsMap).map(([label,value])=>({label,value})).sort((a,b)=>a.label.localeCompare(b.label))
  // synopsis x manuscript matrix
  const synopsisStatuses = Array.from(new Set(studies.map(s=>s.synopsisStatus)))
  const manuscriptTypes = Array.from(new Set(studies.map(s=>s.manuscriptStructure)))
  // presentation mix
  const presTypes = Array.from(new Set(studies.map(s=>s.presentationType)))
  const presData = presTypes.map(p => ({ label:p||'NA', value: studies.filter(s=>s.presentationType===p).length }))
  // collaboration matrix
  const collabMap: Record<string, Record<string, number>> = {}
  for (const s of studies) {
    const primary = s.primaryDepartment
    const collabs = (s.collaboratingDepartments||'').split(',').map((x:string)=>x.trim()).filter(Boolean)
    if (!collabMap[primary]) collabMap[primary] = {}
    for (const c of collabs) {
      collabMap[primary][c] = (collabMap[primary][c]||0)+1
    }
  }
  // health scorecard simple
  const pipelineRatio = total ? active/total : 0
  const health = (pipelineRatio*20 + (underReview/Math.max(1,active))*15 + (accepted/total)*20 + (publishedCount/total)*15).toFixed(1)
  return (
    <section>
      <h1>Advanced Analytics</h1>
      <button onClick={()=>{ const rows=["studyId,title,primaryDepartment,submissionStatus"].concat((window as any).__studies?.map((s:any)=>[s.studyId,s.title,s.primaryDepartment,s.submissionStatus].join(","))||[]); const blob=new Blob([rows.join("\n")],{type:"text/csv"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="studies.csv"; a.click(); }}>Export CSV</button>
      <div className="zri-grid" style={{marginBottom:16}}>
        <div className="zri-card"><div style={{fontSize:12}}>Total Studies</div><div style={{fontSize:24,fontWeight:700}}><CountUp value={total} /></div></div>
        <div className="zri-card"><div style={{fontSize:12}}>Active</div><div style={{fontSize:24,fontWeight:700}}><CountUp value={active} /></div></div>
        <div className="zri-card"><div style={{fontSize:12}}>Under Review</div><div style={{fontSize:24,fontWeight:700}}><CountUp value={underReview} /></div></div>
        <div className="zri-card"><div style={{fontSize:12}}>Accepted/Selected</div><div style={{fontSize:24,fontWeight:700}}><CountUp value={accepted} /></div></div>
        <div className="zri-card"><div style={{fontSize:12}}>Published</div><div style={{fontSize:24,fontWeight:700}}><CountUp value={publishedCount} /></div></div>
        <div className="zri-card"><div style={{fontSize:12}}>Acceptance Rate</div><div style={{fontSize:24,fontWeight:700}}>{rate}</div></div>
        <div className="zri-card"><div style={{fontSize:12}}>Health Index</div><div style={{fontSize:24,fontWeight:700}}><ProgressRing value={Number(health)} size={56} /><CountUp value={Number(health)} /></div></div>
      </div>
      <div className="zri-card" style={{marginBottom:16}}><h3>Department Distribution</h3><BarChart data={deptData} /></div>
      <div className="zri-card" style={{marginBottom:16}}><h3>Submission Funnel</h3><BarChart data={funnelData} /></div>
      <div className="zri-card" style={{marginBottom:16}}><h3>Submission Velocity (by month)</h3><BarChart data={monthData} /></div>
      <div className="zri-card" style={{marginBottom:16}}><h3>Presentation / Venue Mix</h3><BarChart data={presData} /></div>
      <div className="zri-card" style={{marginBottom:16}}>
        <h3>Synopsis � Manuscript Matrix</h3>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th>Synopsis \ Manuscript</th>{manuscriptTypes.map(m=><th key={m}>{m}</th>)}</tr></thead>
          <tbody>{synopsisStatuses.map(ss=>(
            <tr key={ss}><td>{ss}</td>{manuscriptTypes.map(m=><td key={m}>{studies.filter(s=>s.synopsisStatus===ss && s.manuscriptStructure===m).length}</td>)}</tr>
          ))}</tbody>
        </table>
      </div>
      <div className="zri-card" style={{marginBottom:16}}>
        <h3>Cross-Department Collaboration Matrix</h3>
        <div style={{overflowX:'auto'}}>
          <table style={{borderCollapse:'collapse'}}>
            <thead><tr><th>Primary \ Collaborator</th>{depts.map(d=><th key={d}>{d}</th>)}</tr></thead>
            <tbody>{depts.map(p=>(
              <tr key={p}><td>{p}</td>{depts.map(c=><td key={c}>{collabMap[p]?.[c]||0}</td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      <div className="zri-card">
        <h3>Author Metrics (by Gmail)</h3>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th>Email</th><th>Name</th><th>Publications</th><th>Ongoing</th><th>Types</th></tr></thead>
          <tbody>{authorMetrics.map(a=><tr key={a.email}><td>{a.email}</td><td>{a.name}</td><td>{a.publications}</td><td>{a.ongoing}</td><td>{Object.entries(a.types).map(([k,v])=>`${k}:${v}`).join(', ')}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="zri-card">
        <h3>First-Author Leaderboard</h3>
        <table style={{width:'100%',borderCollapse:'collapse'}}>
          <thead><tr><th>Author</th><th>Active</th><th>Published</th></tr></thead>
          <tbody>{leaderboard.map(l=><tr key={l.author}><td>{l.author}</td><td>{l.active}</td><td>{l.published}</td></tr>)}</tbody>
        </table>
      </div>

    </section>
  )
}




