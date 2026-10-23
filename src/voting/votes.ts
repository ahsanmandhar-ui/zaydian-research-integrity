import { db, type Vote } from '../db'

export async function castVote(projectId: number, userId: number, decision: Vote['decision'], comment?: string, supersedes?: number): Promise<Vote> {
  const id = await db.votes.add({ projectId, userId, decision, comment, createdAt: Date.now(), supersedes })
  const v = await db.votes.get(id)
  if (!v) throw new Error('failed to cast vote')
  return v
}

export async function listVotes(projectId: number): Promise<Vote[]> {
  return db.votes.where('projectId').equals(projectId).sortBy('createdAt')
}

export async function tallyVotes(projectId: number): Promise<{ approve: number; reject: number; abstain: number }> {
  const votes = await listVotes(projectId)
  const tally = { approve: 0, reject: 0, abstain: 0 }
  for (const v of votes) tally[v.decision]++
  return tally
}
