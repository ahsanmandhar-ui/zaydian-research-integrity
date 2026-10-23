import { useEffect, useState } from 'react'
import { db } from '../db'
export default function Dashboards(){
  const [items,setItems]=useState<any[]>([])
  useEffect(()=>{ db.departmentDashboards.toArray().then(setItems) },[])
  return <section><h1>Dashboards</h1><ul>{items.map((d:any)=><li key={d.id}>{d.name}</li>)}</ul></section>
}
