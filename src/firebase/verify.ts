import { db_firestore } from './config'
import { doc, setDoc, getDoc } from 'firebase/firestore'

/**
 * Push completion data to Firebase Firestore (public read by key)
 */
export async function pushCompletionToCloud(data: {
  cryptoKey: string
  projectId: number
  organizationId: number
  completedBy: number
  completedAt: number
  topicName: string
  participants: string
  authors: { name: string; role: string; email: string }[]
  conflictOfInterest: string
  sponsors: string
  studyLocation: string
  editCount: number
  editHistory: { editedAt: number; editedBy: number; changedFields: string[] }[]
  version: number
  supersededBy?: number
}): Promise<void> {
  try {
    const normalized = data.cryptoKey.replace(/-/g, '').toUpperCase()
    await setDoc(doc(db_firestore, 'completions', normalized), {
      ...data,
      cryptoKey: normalized,
      syncedAt: Date.now(),
    })
  } catch (e) {
    console.error('Failed to push to cloud:', e)
  }
}

/**
 * Fetch completion data from Firebase Firestore by key
 */
export async function fetchCompletionFromCloud(key: string): Promise<any | null> {
  try {
    const normalized = key.replace(/-/g, '').toUpperCase()
    const snap = await getDoc(doc(db_firestore, 'completions', normalized))
    if (snap.exists()) {
      return snap.data()
    }
    return null
  } catch (e) {
    console.error('Failed to fetch from cloud:', e)
    return null
  }
}