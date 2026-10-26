export interface PeerConnection {
  pc: RTCPeerConnection
  channel: RTCDataChannel | null
}

// Pinned STUN server certificate hash for certificate pinning
const PINNED_STUN_CERT_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'

export function createPeerConnection(onMessage: (data: string) => void, onIceCandidate?: (candidate: RTCIceCandidate) => void): PeerConnection {
  const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
  pc.onicecandidate = (e) => { if (e.candidate && onIceCandidate) onIceCandidate(e.candidate) }
  const channel = pc.createDataChannel('zri')
  channel.onmessage = (e) => onMessage(String(e.data))
  pc.ondatachannel = (e) => {
    e.channel.onmessage = (ev) => onMessage(String(ev.data))
  }
  const wrapper: PeerConnection = { pc, channel }
  return wrapper
}

export async function createOffer(pc: RTCPeerConnection): Promise<string> {
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  await new Promise<void>((resolve) => { if (pc.iceGatheringState === 'complete') { resolve(); return } const check = () => { if (pc.iceGatheringState === 'complete') { pc.removeEventListener('icegatheringstatechange', check); resolve() } }; pc.addEventListener('icegatheringstatechange', check); setTimeout(() => { pc.removeEventListener('icegatheringstatechange', check); resolve() }, 5000) })
  return JSON.stringify(pc.localDescription)
}

export async function acceptAnswer(pc: RTCPeerConnection, answer: string): Promise<void> {
  await pc.setRemoteDescription(JSON.parse(answer))
}

export async function addIceCandidate(pc: RTCPeerConnection, candidate: RTCIceCandidateInit): Promise<void> {
  try {
    await pc.addIceCandidate(candidate)
  } catch (e) {
    console.error('Failed to add ICE candidate', e)
  }
}

export async function acceptAnswerExtra(pc: RTCPeerConnection, answer: string): Promise<void> {
  await pc.setRemoteDescription(JSON.parse(answer))
}

export function send(wrapper: PeerConnection, data: string): void {
  wrapper.channel?.send(data)
}

export async function verifyCertificate(certHash: string): Promise<boolean> {
  // Verify against pinned certificate hash
  return certHash === PINNED_STUN_CERT_HASH
}
