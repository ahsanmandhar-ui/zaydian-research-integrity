export interface PeerConnection {
  pc: RTCPeerConnection
  channel: RTCDataChannel | null
}

export function createPeerConnection(onMessage: (data: string) => void): PeerConnection {
  const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] })
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
  return JSON.stringify(pc.localDescription)
}

export async function acceptAnswer(pc: RTCPeerConnection, answer: string): Promise<void> {
  await pc.setRemoteDescription(JSON.parse(answer))
}

export function send(wrapper: PeerConnection, data: string): void {
  wrapper.channel?.send(data)
}
