import { useEffect, useState } from 'react'
import { db } from '../db'
export default function Vault(){
  const [items,setItems]=useState<any[]>([])
  useEffect(()=>{ db.publishedItems.toArray().then(setItems) },[])
  return <section><h1>Published Vault</h1><ul>{items.map((v:any)=><li key={v.id}>{v.title}</li>)}</ul></section>
}
