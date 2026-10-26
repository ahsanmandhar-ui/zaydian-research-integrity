import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'


import { useEffect, useState, useRef } from 'react'
import { db } from '../db'
import { currentUser } from '../auth/auth'
import { generateEcdhKeyPair, exportPublicKey, importPublicKey, deriveAesGcm, encryptText, decryptText } from '../lib/crypto'



export default function Sync(){
  const [peers,setPeers]=useState<any[]>([])
  useEffect(() => {
    invoke('start_tcp_listener', { port: 41235 }).catch(() => {})
    const unlisten = listen('tcp-message', async (event) => {
      try {
        const payload = JSON.parse(String(event.payload))
        const peersDb = await db.peers.toArray()
        const storedKey = await db.syncOperations.where('entityType').equals('deviceKey').first()
  if (peersDb.length && storedKey) {
          const p = peersDb[0]
          const priv = await crypto.subtle.importKey('jwk', storedKey.payload as any, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey'])
          const remotePub = await importPublicKey(p.publicKey)
          const aes = await deriveAesGcm(priv, remotePub)
          const plain = await decryptText(aes, payload)
          if (plain.startsWith('OPLOG:')) {
            const ops = JSON.parse(plain.slice(6))
           const u = await currentUser()
           for (const op of ops) {
             if (u?.organizationId && op.organizationId && op.organizationId !== u.organizationId) continue
             const exists = await db.syncOperations.where('id').equals(op.id).first()
             if (!exists) await db.syncOperations.add(op)
           }
            setMsg('Received sync: ' + ops.length + ' ops (merged)')
          } else {
            setMsg('Decrypted: ' + plain)
          }
          return

        }
      } catch {}
      setMsg('Received: ' + String(event.payload))
      relayTcpToBle(String(event.payload))
    })

    return () => { unlisten.then(f => f()) }
  }, [])

  const [status,setStatus]=useState('idle')
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg,setMsg]=useState('')
  const [pubKey,setPubKey]=useState('')
  const [deviceId,setDeviceId]=useState(localStorage.getItem('zri_device_id') || crypto.randomUUID())
  const [deviceName,setDeviceName]=useState(localStorage.getItem('zri_device_name') || 'local')
  function saveDevice() { localStorage.setItem('zri_device_id', deviceId); localStorage.setItem('zri_device_name', deviceName); setMsg('Device saved') }

  const [bleBridge,setBleBridge]=useState(localStorage.getItem('zri_ble')==='1')
  const [bleGateway, setBleGateway] = useState(localStorage.getItem('zri_ble_gateway')==='1')
  const [bleChar, setBleChar] = useState<any>(null)
  async function relayTcpToBle(data: string) {
    if (!bleChar || !bleBridge) return
    try {
      const encoder = new TextEncoder()
      const bytes = encoder.encode(data.slice(0, 20)) // BLE MTU limit
      await bleChar.writeValue(bytes)
    } catch (e) {
      console.error('BLE relay failed', e)
    }
  }
  async function connectBleGateway() {
    try {
      if (!(navigator as any).bluetooth) {
        setMsg('Web Bluetooth not supported on this device/network')
        setBleBridge(false)
        setBleGateway(false)
        localStorage.setItem('zri_ble', '0')
        localStorage.setItem('zri_ble_gateway', '0')
        return
      }
      const device = await (navigator as any).bluetooth.requestDevice({ filters: [{ services: ['0000ffe0-0000-1000-8000-00805f9b34fb'] }], optionalServices: ['0000ffe0-0000-1000-8000-00805f9b34fb'] })
      const server = await device.gatt.connect()
      const service = await server.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb')
      const char = await service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb')
      setBleChar(char)
      await char.startNotifications()
      char.addEventListener('characteristicvaluechanged', (e:any) => {
        const val = new TextDecoder().decode(e.target.value)
        setMsg('BLE -> app: ' + val)
      })
      setMsg('BLE gateway connected: ' + device.name)
    } catch (e:any) { setMsg('BLE gateway failed: ' + (e?.message || e)) }
  }
  async function toggleBleGateway() {
    const next = !bleGateway
    setBleGateway(next)
    localStorage.setItem('zri_ble_gateway', next ? '1' : '0')
    setMsg('BLE gateway ' + (next ? 'enabled' : 'disabled'))
  }
  // relayTcpToBle defined above at line 61
  async function requestBluetoothPermission(): Promise<boolean> {
    try {
      if (!(navigator as any).bluetooth) return false
      const device = await (navigator as any).bluetooth.requestDevice({ acceptAllDevices: true })
      return !!device
    } catch {
      return false
    }
  }
  async function toggleBle() {
    if (!bleBridge) {
      const ok = await requestBluetoothPermission()
      if (!ok) { setMsg('Bluetooth permission denied or unavailable'); return }
    }
    const n=!bleBridge; setBleBridge(n); localStorage.setItem('zri_ble', n?'1':'0'); setMsg('BLE bridge '+(n?'enabled':'disabled'))
  }

  const [multiHop,setMultiHop]=useState(localStorage.getItem('zri_multihop')==='1')
  function toggleMultiHop() {
    const next = !multiHop
    setMultiHop(next)
    localStorage.setItem('zri_multihop', next ? '1' : '0')
    setMsg('Multi-hop ' + (next ? 'enabled' : 'disabled'))
  }




  useEffect(()=>{ db.peers.toArray().then(setPeers) },[])
  async function checkUpdate(){
    setStatus('checking')
    setMsg('x')
    try {
      const { check } = await import('@tauri-apps/plugin-updater')
      const update:any = await check()
      if (update) {
        (window as any).__update = update
        setStatus('available')
        setMsg(`Update ${update.version} available`)
      } else {
        setStatus('none')
        setMsg('No update available')
      }
    } catch (e:any) {
      setStatus('error')
      setMsg(e?.message || 'Updater unavailable (web/dev mode)')
    }
  }
  async function installUpdate(){
    const update = (window as any).__update
    if (!update) { setMsg('No update checked'); return }
    try {
      await update.downloadAndInstall()
      const { relaunch } = await import('@tauri-apps/plugin-process')
      await relaunch()
    } catch (e:any) { setMsg(e?.message || 'Install failed') }
  }
  async function exportBackup(){
    const data:any = {}
    for (const t of db.tables) {
      data[t.name] = await t.toArray()
    }
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'zri-backup.json'; a.click()
  }
  async function importBackup(file: File){
    const text = await file.text()
    const data = JSON.parse(text)
    for (const t of db.tables) {
      if (Array.isArray(data[t.name])) {
        await t.clear()
        await t.bulkAdd(data[t.name])
      }
    }
    setMsg('Backup restored')
  }

  async function discoverNearby() {
    setStatus('scanning')
    try {
      const res = await invoke<any[]>('discover_peers', { deviceId: 'local', deviceName: 'ZRI Device', timeoutMs: 3000 })
      setPeers(res || [])
      setMsg(`Found ${res?.length || 0} nearby peers`)
    } catch (e: any) {
      setStatus('error')
      setMsg(e?.message || 'Discovery unavailable (web/dev mode)')
    }
  }
  async function pairPeer(p: any) {
    const code = window.prompt('Enter pairing code for ' + p.name)
    if (!code) return
    const remotePub = window.prompt('Paste peer public key')
    if (!remotePub) return
    await db.peers.add({ deviceId: p.id, publicKey: remotePub, pairedAt: Date.now() })
    setMsg('Paired with ' + p.name)
  }

  async function testCrypto() {
    const kp1 = await generateEcdhKeyPair()
    const kp2 = await generateEcdhKeyPair()
    const aes1 = await deriveAesGcm(kp1.privateKey, kp2.publicKey)
    const aes2 = await deriveAesGcm(kp2.privateKey, kp1.publicKey)
    const payload = await encryptText(aes1, 'hello zri')
    const plain = await decryptText(aes2, payload)
    setMsg('Crypto test: ' + plain)
  }
  async function encryptForPeer() {
    const peersDb = await db.peers.toArray()
    if (!peersDb.length) { setMsg('No paired peers'); return }
    const p = peersDb[0]
    const privJwk = localStorage.getItem('zri_privkey')
    if (!privJwk) { setMsg('Generate key first'); return }
    const priv = await crypto.subtle.importKey('jwk', JSON.parse(privJwk), { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey'])
    const remotePub = await importPublicKey(p.publicKey)
    const aes = await deriveAesGcm(priv, remotePub)
    const payload = await encryptText(aes, 'hello from zri')
    setMsg('Encrypted payload: ' + JSON.stringify(payload))
  }
  async function sendTestToPeer() {
    const peersDb = await db.peers.toArray()
    if (!peersDb.length) { setMsg('No paired peers'); return }
    const p = peersDb[0]
    const discovered = peers.find((x:any)=>x.id===p.deviceId)
    const ip = discovered?.ip || '127.0.0.1'
    const privJwk = localStorage.getItem('zri_privkey')
    if (!privJwk) { setMsg('Generate key first'); return }
    const priv = await crypto.subtle.importKey('jwk', JSON.parse(privJwk), { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey'])
    const remotePub = await importPublicKey(p.publicKey)
    const aes = await deriveAesGcm(priv, remotePub)
    const payload = await encryptText(aes, 'hello over tcp')
    await invoke('send_tcp_message', { ip, port: 41235, payload: JSON.stringify(payload) })
    setMsg('Sent encrypted payload to ' + ip)
  }
  async function sendSync() {
    const u = await currentUser()
    const all = await db.syncOperations.toArray()
    const ops = u?.organizationId ? all.filter((o:any)=>o.organizationId===u.organizationId) : all
    const peersDb = await db.peers.toArray()
    if (!peersDb.length) { setMsg('No paired peers'); return }
    const p = peersDb[0]
    const discovered = peers.find((x:any)=>x.id===p.deviceId)
    const ip = discovered?.ip || '127.0.0.1'
    const privJwk = localStorage.getItem('zri_privkey')
    if (!privJwk) { setMsg('Generate key first'); return }
    const priv = await crypto.subtle.importKey('jwk', JSON.parse(privJwk), { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey'])
    const remotePub = await importPublicKey(p.publicKey)
    const aes = await deriveAesGcm(priv, remotePub)
    const payload = await encryptText(aes, 'OPLOG:' + JSON.stringify(ops))
    await invoke('send_tcp_message', { ip, port: 41235, payload: JSON.stringify(payload) })
    setMsg('Sync sent (' + ops.length + ' ops)')
  }
  async function relayEnvelope(payload: string) {
    if (!multiHop) return
    const env = { envId: crypto.randomUUID(), ttl: 5, seen: ['local'], payload, createdAt: Date.now() }
    await db.courierCache.add(env)
    for (const p of peers) {
      try { await invoke('send_tcp_message', { ip: p.ip, port: 41235, payload: JSON.stringify({ relay: env }) }) } catch {}
    }
  }

  async function cleanupCourierCache() {
    const rows = await db.courierCache.toArray()
    const cutoff = Date.now() - 7*24*60*60*1000
    for (const r of rows) {
      if (r.createdAt < cutoff || r.ttl <= 0) await db.courierCache.delete(r.id!)
    }
  }
  async function exportCourierCache() {
    const rows = await db.courierCache.toArray()
    const blob = new Blob([JSON.stringify(rows)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download='courier-cache.json'; a.click(); URL.revokeObjectURL(url)
  }
  async function importCourierCache(file: File) {
    const text = await file.text()
    const rows = JSON.parse(text)
    await db.courierCache.bulkAdd(rows.map((r:any)=>({ envId:r.envId, ttl:r.ttl, seen:r.seen, payload:r.payload, createdAt:r.createdAt })))
    setMsg('Imported ' + rows.length + ' envelopes')
  }




  async function generateKey() {
    const kp = await generateEcdhKeyPair()
    const pub = await exportPublicKey(kp.publicKey)
    const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey)
    await db.syncOperations.add({ deviceId, entityType: 'deviceKey', entityId: deviceId, op: 'create', payload: jwk, createdAt: Date.now() })
    setPubKey(pub)
    setMsg('Key generated; share public key with peer')
  }


  return (

    <section>
      <h1>Sync</h1>
      <div style={{ position:'relative', width:220, height:220, margin:'16px auto' }}>
        <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'2px solid rgba(170,59,255,.3)', animation: status==='scanning' ? 'radarPulse 2s infinite' : 'none' }} />
        <div style={{ position:'absolute', inset:30, borderRadius:'50%', border:'2px solid rgba(170,59,255,.2)' }} />
        <div style={{ position:'absolute', inset:60, borderRadius:'50%', border:'2px solid rgba(170,59,255,.15)' }} />
        {peers.map((p,i) => {
          const angle = (i/peers.length)*2*Math.PI
          const r = 80
          const x = 110 + r*Math.cos(angle)
          const y = 110 + r*Math.sin(angle)
          return <div key={p.id} style={{ position:'absolute', left:x-8, top:y-8, width:16, height:16, borderRadius:'50%', background:'#aa3bff', boxShadow:'0 0 8px #aa3bff', transition:'all .3s' }} title={p.name} />
        })}
      </div>
      <button onClick={discoverNearby} disabled={status==='scanning'}>Discover Nearby Peers</button>
      <button onClick={generateKey}>Generate Pairing Key</button>
      <button onClick={encryptForPeer}>Encrypt for Paired Peer</button>
      <button onClick={sendTestToPeer}>Send Test to Peer</button>
      <button onClick={sendSync}>Sync Now</button>
      <button className="zri-badge" onClick={toggleMultiHop}>Multi-hop: {multiHop ? 'ON' : 'OFF'}</button>
      <button className="zri-badge" onClick={toggleBle}>BLE Bridge: {bleBridge ? 'ON' : 'OFF'}</button>
      <button className="zri-badge" onClick={toggleBleGateway}>BLE Gateway: {bleGateway ? 'ON' : 'OFF'}</button>
      <button className="zri-badge" onClick={connectBleGateway}>Connect BLE Gateway</button>
      <button className="zri-badge" onClick={()=>relayEnvelope('relay test')}>Relay Test</button>
      <button className="zri-badge" onClick={cleanupCourierCache}>Cleanup Cache</button>
      <button className="zri-badge" onClick={exportCourierCache}>Export Cache</button>
      <label className="zri-badge" style={{cursor:'pointer'}}><input type="file" accept="application/json" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0]; if(f) importCourierCache(f)}} />Import Cache</label>
      <button className="zri-badge" onClick={saveDevice}>Save Device</button>
      <input value={deviceId} onChange={e=>setDeviceId(e.target.value)} placeholder="Device ID" />
      <input value={deviceName} onChange={e=>setDeviceName(e.target.value)} placeholder="Device Name" />














      <button onClick={testCrypto}>Test Encryption</button>


      {pubKey && <textarea readOnly value={pubKey} style={{width:'100%',height:60}} />}


      {pubKey && <textarea readOnly value={pubKey} style={{width:'100%',height:60}} />}


      <ul>{peers.map((p: any) => <li key={p.id}>{p.name} ({p.ip}) <button onClick={()=>pairPeer(p)}>Pair</button></li>)}</ul>
      <div className="zri-card" style={{marginTop:16, background:'linear-gradient(135deg,rgba(170,59,255,.1),rgba(192,132,252,.1))'}}>
        <h2>App Updates</h2>
        <div style={{display:'flex',gap:8}}>
          <button onClick={checkUpdate} disabled={status==='checking'}>Check for updates</button>
          {status==='available' && <button onClick={installUpdate}>Install update</button>}
        </div>
        {msg && <div style={{marginTop:8}}>{msg}</div>}
      </div>
      <div className="zri-card" style={{marginTop:16}}>
        <h2>Backup & Restore</h2>
        <div style={{display:'flex',gap:8}}>
          <button onClick={exportBackup}>Export Backup</button>
          <button onClick={()=>fileRef.current?.click()}>Restore Backup</button>
          <input ref={fileRef} type="file" accept="application/json" style={{display:'none'}} onChange={e=>{ if(e.target.files?.[0]) importBackup(e.target.files[0]) }} />
        </div>
      </div>
    </section>
  )
}
