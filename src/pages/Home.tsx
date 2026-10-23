import { useEffect, useState } from 'react'
import { db } from '../db'
export default function Home(){
  const [p,setP]=useState(0); const [r,setR]=useState(0)
  useEffect(()=>{ db.projects.count().then(setP); db.records.count().then(setR) },[])
  return <section><h1>Home</h1><p>Projects: {p}</p><p>Records: {r}</p></section>
}
