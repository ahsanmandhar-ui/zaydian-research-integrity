import { castVote, tallyVotes } from '../voting/votes'

export function CouncilVote({ projectId, userId }: { projectId: number; userId: number }) {
  async function vote(decision: 'approve' | 'reject' | 'abstain') {
    await castVote(projectId, userId, decision)
    await tallyVotes(projectId)
  }
  return (
    <div>
      <h2>Council Vote</h2>
      <button onClick={() => vote('approve')}>Approve</button>
      <button onClick={() => vote('reject')}>Reject</button>
      <button onClick={() => vote('abstain')}>Abstain</button>
    </div>
  )
}
