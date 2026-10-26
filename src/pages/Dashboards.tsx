import { useEffect, useState } from 'react'
import { db } from '../db'
export default function Dashboards(){
  const [stats,setStats]=useState({projects:0,records:0,variables:0,peers:0,published:0,conflicts:0})
  useEffect(()=>{
    (async()=>{
      const [projects,records,variables,peers,published,conflicts]=await Promise.all([
        db.projects.count(), db.records.count(), db.variables.count(), db.peers.count(), db.publishedItems.count(), db.conflicts.count()
      ])
      setStats({projects,records,variables,peers,published,conflicts})
    })()
  },[])
  const cards = [
    {label:'Projects', value:stats.projects},
    {label:'Records', value:stats.records},
    {label:'Variables', value:stats.variables},
    {label:'Peers', value:stats.peers},
    {label:'Published', value:stats.published},
    {label:'Conflicts', value:stats.conflicts},
  ]
  return (
    <section>
      <h1>Dashboards</h1>
      <div className="zri-grid zri-stagger">
        {cards.map((c)=>(
          <div className="zri-card" key={c.label}>
            <div style={{color:'var(--text)',fontSize:14}}>{c.label}</div>
            <div className="zri-number">{c.value}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
