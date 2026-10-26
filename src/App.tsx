import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Projects from './pages/Projects'
import Dataset from './pages/Dataset'
import Sync from './pages/Sync'
import Vault from './pages/Vault'
import AnalyticsPage from './pages/Analytics'
import Dashboards from './pages/Dashboards'
import Studies from './pages/Studies'
import PublishedVaultPage from './pages/PublishedVault'
import ToastHost from './components/Toast'
import AdvancedAnalytics from './pages/AdvancedAnalytics'
import Admins from './pages/Admins'
import Master from './pages/Master'
import Observability from './pages/Observability'
import VerifyDataset from './pages/VerifyDataset'
import Login from './pages/Login'
import { ensureRoles, ensurePrimaryAdmin, login, currentUser, logout, verifyMfa, hasPermission, listProjectsForUser } from './auth/auth'
import type { User } from './db'
import Splash3D from './components/Splash3D'
import { seedDemoData } from './seed'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [isMaster, setIsMaster] = useState(false)
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null)
  const [canSeePublished, setCanSeePublished] = useState(false)
  const [canSeeDataset, setCanSeeDataset] = useState(false)
  const [canSeeAdmins, setCanSeeAdmins] = useState(false)
  const [canSeeAdvanced, setCanSeeAdvanced] = useState(false)
  const [canSeeStudies, setCanSeeStudies] = useState(false)
  const [canSeeDashboards, setCanSeeDashboards] = useState(false)
  const [canSeeSync, setCanSeeSync] = useState(false)
  const [canSeeProjects, setCanSeeProjects] = useState(false)
  const [canSeeObservability, setCanSeeObservability] = useState(false)
  useEffect(() => {
    (async () => {
      if (!user) {
        setIsMaster(false); setCanSeePublished(false); setCanSeeDataset(false);
        setCanSeeAdmins(false); setCanSeeAdvanced(false); setCanSeeStudies(false);
        setCanSeeDashboards(false); setCanSeeSync(false); setCanSeeProjects(false);
        setCanSeeObservability(false);
        return
      }
      const master = await hasPermission(user, 'org:manage')
      setIsMaster(master)
      const isAdmin = await hasPermission(user, '*')
      // Project-scoped: check if user has any membership with relevant permissions
      const projects = await listProjectsForUser(user.id!)
      const hasPublished = projects.some((p: any) => p.permissions?.includes('published:read')) || isAdmin || master
      const hasDataset = projects.some((p: any) => p.permissions?.includes('dataset:read')) || isAdmin || master || await hasPermission(user, 'dataset:write') || await hasPermission(user, 'project:read')
      const hasAdvanced = projects.some((p: any) => p.permissions?.includes('dataset:analyze')) || isAdmin || master
      const hasProjectMembership = projects.length > 0
      setCanSeePublished(hasPublished)
      setCanSeeDataset(hasDataset)
      setCanSeeAdmins(isAdmin || master)
      setCanSeeAdvanced(hasAdvanced || isAdmin || master)
      setCanSeeStudies(isAdmin || master || hasProjectMembership)
      setCanSeeDashboards(isAdmin || master || hasProjectMembership)
      setCanSeeSync(true)
      setCanSeeProjects(isAdmin || master || hasProjectMembership)
      setCanSeeObservability(isAdmin || master)
    })()
  }, [user])
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    if (!sessionExpiresAt) return
    const check = () => {
      const remaining = sessionExpiresAt - Date.now()
      if (remaining < 5 * 60 * 1000 && remaining > 0) {
        window.dispatchEvent(new CustomEvent('zri:toast', { detail: 'Session expiring soon. Please save your work.' }))
      }
      if (remaining <= 0) {
        logout(); setUser(null); setSessionExpiresAt(null)
      }
    }
    const interval = setInterval(check, 30000)
    check()
    return () => clearInterval(interval)
  }, [sessionExpiresAt])
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  const [lightOn, setLightOn] = useState<boolean>(() => localStorage.getItem('zri-lights') === 'on')
  const [cursor, setCursor] = useState({ x: -1000, y: -1000 })
  useEffect(() => {
    const onMove = (e: MouseEvent) => setCursor({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])
  useEffect(() => {
    const onMoveBtn = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement)?.closest?.('button') as HTMLElement | null
      if (!btn) return
      const r = btn.getBoundingClientRect()
      btn.style.setProperty('--mx', `${e.clientX - r.left}px`)
      btn.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
    window.addEventListener('mousemove', onMoveBtn)
    return () => window.removeEventListener('mousemove', onMoveBtn)
  }, [])
  useEffect(() => {
    const theme = lightOn ? 'light' : 'dark'
    document.documentElement.dataset.theme = theme
    localStorage.setItem('zri-lights', lightOn ? 'on' : 'off')
  }, [lightOn])
  const [splash, setSplash] = useState(true)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 1500)
    return () => clearTimeout(t)
  }, [])
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [query, setQuery] = useState('')
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCommandPaletteOpen(v => !v) }
      if (e.key === '?') { setShortcutsOpen(v => !v) }
      if (e.key === 'Escape') { setCommandPaletteOpen(false); setShortcutsOpen(false) }
    }
    const onMoveAll = (e: MouseEvent) => {
      document.querySelectorAll('button').forEach(btn => {
        const r = btn.getBoundingClientRect()
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2
        const dx = e.clientX - cx, dy = e.clientY - cy
        const dist = Math.hypot(dx, dy)
        if (dist < 120) (btn as HTMLElement).style.transform = `translate(${dx * 0.12}px, ${dy * 0.12}px)`
        else (btn as HTMLElement).style.transform = ''
      })
      document.querySelectorAll('.zri-card').forEach(card => {
        const r = card.getBoundingClientRect()
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          const x = (e.clientX - r.left) / r.width - 0.5
          const y = (e.clientY - r.top) / r.height - 0.5
          const el = card as HTMLElement
          el.style.transform = 'perspective(900px) rotateX(' + (-y * 6) + 'deg) rotateY(' + (x * 6) + 'deg) translateY(-2px)'
        } else (card as HTMLElement).style.transform = ''
      })
    }
    const onClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement)?.closest?.('button') as HTMLElement | null
      if (!btn) return
      const r = btn.getBoundingClientRect()
      const ripple = document.createElement('span')
      ripple.className = 'ripple'
      ripple.style.left = `${e.clientX - r.left}px`
      ripple.style.top = `${e.clientY - r.top}px`
      btn.appendChild(ripple)
      setTimeout(() => ripple.remove(), 600)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousemove', onMoveAll)
    window.addEventListener('click', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousemove', onMoveAll)
      window.removeEventListener('click', onClick)
    }
  }, [])
  useEffect(() => {
    (async () => {
      await ensureRoles()
      let u = await currentUser()
      if (u && u.email.toLowerCase() !== 'ahsanmandhar@gmail.com') { await logout(); u = null }
      if (!u) {
        try { await ensurePrimaryAdmin('ahsanmandhar@gmail.com', 'Primary Admin', 'Sadeed543@') } catch {}
      }
      if (u) await seedDemoData(u.id!)
      setUser(u)
      if (u) {
        const { db } = await import('./db')
        const session = await db.sessions.where('userId').equals(u.id!).first()
        if (session) setSessionExpiresAt(session.expiresAt)
      }
      setReady(true)
    })()
  }, [])
  async function handleLogin(email: string, password: string, mfaCode?: string) {
    const u = await login(email, password)
    if (u.mfaSecret && !(await verifyMfa(u, mfaCode || ''))) {
      throw new Error('Invalid MFA code')
    }
    if (u) await seedDemoData(u.id!)
    setUser(u)
  }
  if (splash) return <Splash3D />
  if (!ready) return <div>Loading...</div>
  // Allow public access to verify page
  if (window.location.pathname === '/verify') {
    return (
      <BrowserRouter>
        <main id="main-content" className="zri-shell" style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
          <VerifyDataset />
        </main>
      </BrowserRouter>
    )
  }
  if (!user) return <Login onLogin={handleLogin} />
  return (
    <BrowserRouter>
  <a href="#main-content" className="skip-link" style={{position:'absolute',left:-9999}}>Skip to main content</a>
      <nav className="zri-nav" aria-label="Primary">
        <div className="zri-nav-user">
          <span>{user ? user.displayName : 'Guest'}</span>
        {user?.organizationId && <span className="zri-badge">Org #{user.organizationId}</span>}
        </div>
        <div className="zri-nav-links">
        <span title={online?'Online':'Offline'} style={{display:'inline-block',width:10,height:10,borderRadius:'50%',background:online?'#22c55e':'#ef4444',marginRight:12,boxShadow:online?'0 0 8px #22c55e':'none'}} />
        <NavLink to="/">Home</NavLink>
          <NavLink to="/verify">Verify Dataset</NavLink>
        {canSeeProjects && <NavLink to="/projects">Projects</NavLink>}
        {canSeeDataset && <NavLink to="/dataset">Dataset</NavLink>}
        {canSeeSync && <NavLink to="/sync">Sync</NavLink>}
        {canSeeDashboards && <NavLink to="/dashboards">Dashboards</NavLink>}
        {canSeeStudies && <NavLink to="/studies">Studies</NavLink>}
        {canSeePublished && <NavLink to="/published">Published</NavLink>}
        {canSeeAdvanced && <NavLink to="/advanced">Advanced</NavLink>}
        {canSeeAdmins && <NavLink to="/admins">Admins</NavLink>}
        {canSeeObservability && <NavLink to="/observability">Observability</NavLink>}
        {isMaster && <NavLink to="/master">Master</NavLink>}
        </div>
        <div className="zri-nav-actions">
        <button onClick={async()=>{ await logout(); setUser(null); setSessionExpiresAt(null) }}>Logout</button>
        <button onClick={()=>setLightOn(v=>!v)}>{lightOn?'Lights Off':'Lights On'}</button>
        </div>
      </nav>
      <div className={`cursor-glow ${lightOn?'glow-light':'glow-dark'}`} style={{left:cursor.x,top:cursor.y}} />
      {commandPaletteOpen && (
        <div className="zri-modal-backdrop" onClick={() => setCommandPaletteOpen(false)}>
          <div className="zri-modal" onClick={e => e.stopPropagation()}>
            <input autoFocus placeholder="Search pages..." value={query} onChange={e => setQuery(e.target.value)} />
            <div className="zri-modal-list">
              {['/', '/projects', '/dataset', '/sync', '/vault', '/analytics', '/dashboards', '/studies', '/published', '/advanced', '/admins']
                .filter(p => p.includes(query.toLowerCase()))
                .map(p => <button key={p} onClick={() => { window.location.href = p; setCommandPaletteOpen(false) }}>{p}</button>)}
            </div>
          </div>
        </div>
      )}
      {shortcutsOpen && (
        <div className="zri-modal-backdrop" onClick={() => setShortcutsOpen(false)}>
          <div className="zri-modal" onClick={e => e.stopPropagation()}>
            <h3>Keyboard Shortcuts</h3>
            <div>Ctrl/Cmd+K: Command palette</div>
            <div>?: Shortcuts</div>
            <div>Esc: Close</div>
          </div>
        </div>
      )}
      <main id="main-content" className="zri-shell">
        {!ready ? <div>Loading...</div> : (
          <main id="main-content" tabIndex={-1}>
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/dataset" element={<Dataset />} />
            <Route path="/sync" element={<Sync />} />
            <Route path="/vault" element={<Vault />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/dashboards" element={<Dashboards />} />
            <Route path="/studies" element={<Studies />} />
            <Route path="/published" element={<PublishedVaultPage />} />
            <Route path="/advanced" element={<AdvancedAnalytics />} />
            <Route path="/admins" element={<Admins />} />
            <Route path="/master" element={isMaster ? <Master /> : <Navigate to="/" replace />} />
            <Route path="/observability" element={<Observability />} />
            <Route path="/verify" element={<VerifyDataset />} />
          </Routes>
      </main>
        )}
      </main>
    <ToastHost />
    </BrowserRouter>
  )
}

