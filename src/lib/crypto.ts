export async function generateEcdhKeyPair() {
  return await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey'])
}

export async function exportPublicKey(key: CryptoKey) {
  const raw = await crypto.subtle.exportKey('spki', key)
  return btoa(String.fromCharCode(...new Uint8Array(raw)))
}

export async function importPublicKey(b64: string) {
  const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  return await crypto.subtle.importKey('spki', raw, { name: 'ECDH', namedCurve: 'P-256' }, true, [])
}

export async function deriveAesGcm(privateKey: CryptoKey, publicKey: CryptoKey) {
  return await crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encryptText(aesKey: CryptoKey, text: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, new TextEncoder().encode(text))
  return { iv: Array.from(iv), ct: Array.from(new Uint8Array(ct)) }
}

export async function decryptText(aesKey: CryptoKey, payload: { iv: number[]; ct: number[] }) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(payload.iv) }, aesKey, new Uint8Array(payload.ct))
  return new TextDecoder().decode(pt)
}
