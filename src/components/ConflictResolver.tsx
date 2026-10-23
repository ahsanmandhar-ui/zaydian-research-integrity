import { useState } from 'react'
import { resolveConflict } from '../sync/protocol'

export function ConflictResolver({ conflictId }: { conflictId: number }) {
  const [status, setStatus] = useState('')
  async function resolve() {
    await resolveConflict(conflictId, 'remote')
    setStatus('resolved')
  }
  return <div><h2>Conflict Resolver</h2><button onClick={resolve}>Resolve</button><p>{status}</p></div>
}
