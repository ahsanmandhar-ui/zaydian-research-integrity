import { useEffect, useState } from 'react'
import { db } from '../db'
export default function Analytics(){
  const [n,setN]=useState(0)
  useEffect(()=>{ db.records.count().then(setN) },[])
  return <section><h1>Analytics</h1><p>Total records: {n}</p></section>
}
