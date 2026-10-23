import { db } from '../db'

export interface PeerIdentity {
  deviceId: string
  publicKey: string
  privateKey: CryptoKey
}

export async function createPeerIdentity(): Promise<PeerIdentity> {
  const keyPair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  const pub = await crypto.subtle.exportKey('spki', keyPair.publicKey)
  const deviceId = crypto.randomUUID()
  const publicKey = btoa(String.fromCharCode(...new Uint8Array(pub)))
  await db.peers.add({ deviceId, publicKey, pairedAt: Date.now() })
  return { deviceId, publicKey, privateKey: keyPair.privateKey }
}

export function generatePairingCode(): string {
  const bytes = new Uint8Array(4)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
}

export async function revokePeer(deviceId: string): Promise<void> {
  const peer = await db.peers.where('deviceId').equals(deviceId).first()
  if (peer?.id) await db.peers.update(peer.id, { revokedAt: Date.now() })
}
