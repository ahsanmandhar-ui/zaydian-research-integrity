import { useEffect, useState } from 'react'
import { db } from '../db'

export default function Projects() {
  const [projects, setProjects] = useState<any[]>([])
  const [name, setName] = useState('')
  async function load() { setProjects(await db.projects.toArray()) }
  useEffect(() => { load() }, [])
  async function create() {
    if (!name.trim()) return
    await db.projects.add({ name, description: '', ownerId: 1, createdAt: Date.now(), updatedAt: Date.now() })
    setName('')
    load()
  }
  return (
    <section>
      <h1>Projects</h1>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" />
      <button onClick={create}>Create</button>
      <ul>{projects.map((p) => <li key={p.id}>{p.name}</li>)}</ul>
    </section>
  )
}
