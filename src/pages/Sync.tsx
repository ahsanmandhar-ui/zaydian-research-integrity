import { useEffect, useState } from 'react'
import { db } from '../db'
export default function Sync(){
  const [peers,setPeers]=useState<any[]>([])
  useEffect(()=>{ db.peers.toArray().then(setPeers) },[])
  return <section><h1>Sync</h1><ul>{peers.map((p:any)=><li key={p.id}>{p.name} ({p.status})</li>)}</ul></section>
}
