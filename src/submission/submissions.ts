import { db, type Submission } from '../db'
import { createVersion } from '../versioning/versions'

export async function submitProject(projectId: number, submittedBy: number): Promise<Submission> {
  const version = await createVersion(projectId, submittedBy, 'submit')
  const id = await db.submissions.add({
    projectId,
    versionId: version.id!,
    submittedBy,
    submittedAt: Date.now(),
    status: 'submitted',
  })
  const s = await db.submissions.get(id)
  if (!s) throw new Error('failed to create submission')
  return s
}

export async function listSubmissions(projectId: number): Promise<Submission[]> {
  return db.submissions.where('projectId').equals(projectId).reverse().sortBy('submittedAt')
}

export async function reviewSubmission(submissionId: number, accept: boolean): Promise<Submission> {
  await db.submissions.update(submissionId, { status: accept ? 'accepted' : 'rejected' })
  const s = await db.submissions.get(submissionId)
  if (!s) throw new Error('submission not found')
  return s
}
