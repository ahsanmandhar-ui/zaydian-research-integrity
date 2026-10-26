export async function deriveKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 600000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encrypt(plaintext: string, key: CryptoKey): Promise<{ iv: string; ciphertext: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))
  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ct))),
  }
}

export async function decrypt(payload: { iv: string; ciphertext: string }, key: CryptoKey): Promise<string> {
  const iv = Uint8Array.from(atob(payload.iv), (c) => c.charCodeAt(0))
  const ct = Uint8Array.from(atob(payload.ciphertext), (c) => c.charCodeAt(0))
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(pt)
}

export async function generateCompletionKey(_data: {
  topicName: string
  participants: string
  authors: { name: string; role: string; email: string }[]
  conflictOfInterest: string
  sponsors: string
  studyLocation: string
  completedBy: number
  completedAt: number
}): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const randomBytes = crypto.getRandomValues(new Uint8Array(16))
  let key = ''
  for (let i = 0; i < 16; i++) {
    key += chars[randomBytes[i] % chars.length]
    if ((i + 1) % 4 === 0 && i < 15) key += '-'
  }
  return key
}

export async function getStorageKey(): Promise<CryptoKey> {
  const deviceId = localStorage.getItem('zri.device.id') || crypto.randomUUID()
  if (!localStorage.getItem('zri.device.id')) localStorage.setItem('zri.device.id', deviceId)
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(deviceId), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode('zri-storage-salt'), iterations: 100000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptField(plaintext: string): Promise<string> {
  const key = await getStorageKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))
  return 'enc:' + btoa(String.fromCharCode(...iv)) + ':' + btoa(String.fromCharCode(...new Uint8Array(ct)))
}

export async function decryptField(ciphertext: string): Promise<string> {
  if (!ciphertext || !ciphertext.startsWith('enc:')) return ciphertext
  const key = await getStorageKey()
  const parts = ciphertext.slice(4).split(':')
  const iv = Uint8Array.from(atob(parts[0]), c => c.charCodeAt(0))
  const ct = Uint8Array.from(atob(parts[1]), c => c.charCodeAt(0))
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(pt)
}
