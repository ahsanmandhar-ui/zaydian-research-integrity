import { useEffect, useState } from 'react'
import { db } from '../db'
export default function Home(){
  const [projects,setProjects]=useState<any[]>([])
  const [records,setRecords]=useState(0)
  useEffect(()=>{ db.projects.toArray().then(setProjects); db.records.count().then(setRecords) },[])
  return (
    <section>
      <h1>Home</h1>
      <p>Projects: {projects.length}</p>
      <p>Records: {records}</p>
      <ul>{projects.map((p:any)=><li key={p.id}>{p.name} - {p.description}</li>)}</ul>
    </section>
  )
}
