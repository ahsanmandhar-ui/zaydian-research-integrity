import { useEffect, useState } from 'react'
import { db } from '../db'
import { validatePassword, submitAccessRequest } from '../auth/auth'

export default function Login({ onLogin }: { onLogin: (email: string, password: string, mfaCode?: string) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [mfaCode, setMfaCode] = useState('')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const [reqName, setReqName] = useState('')
  const [reqEmail, setReqEmail] = useState('')
  const [reqOrgId, setReqOrgId] = useState<number | ''>('')
  const [reqMessage, setReqMessage] = useState('')
  const [orgs, setOrgs] = useState<any[]>([])
  const [error, setError] = useState('')
  const [requestMode, setRequestMode] = useState(false)

  useEffect(() => { db.organizations.toArray().then(setOrgs) }, [])
  const [reqMsg, setReqMsg] = useState('')

  const pwError = password ? validatePassword(password) : null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Invalid email'); return }
    if (pwError) { setError(pwError); return }
    setLoading(true)
    try {
      await onLogin(email, password, mfaCode)
    } catch (err: any) {
      setError(err?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', minHeight: '100vh' }}>
      <style>{`
        @media (min-width: 900px) {
          .zri-login-grid { grid-template-columns: 1.1fr 1fr !important; }
        }
        .zri-login-card input, .zri-login-card select, .zri-login-card textarea {
          transition: border-color 150ms ease-out, box-shadow 150ms ease-out;
        }
        .zri-login-card input:focus, .zri-login-card select:focus, .zri-login-card textarea:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
        }
        .zri-login-card button[type="submit"] {
          transition: transform 150ms ease-out, background-color 150ms ease-out, box-shadow 150ms ease-out;
        }
        .zri-login-card button[type="submit"]:active {
          transform: scale(0.97);
        }
        .zri-login-card button[type="submit"]:hover:not(:disabled) {
          box-shadow: 0 4px 12px rgba(59,130,246,0.3);
        }
        .zri-login-card button[type="button"] {
          transition: transform 150ms ease-out, background-color 150ms ease-out;
        }
        .zri-login-card button[type="button"]:active {
          transform: scale(0.97);
        }
        .zri-error-msg {
          animation: zri-fade-in 200ms ease-out;
        }
        @keyframes zri-fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .zri-login-card input, .zri-login-card select, .zri-login-card textarea,
          .zri-login-card button { transition: none; }
          .zri-error-msg { animation: none; }
        }
      `}</style>
      <div className="zri-login-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', minHeight: '100vh' }}>
        <section style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)', color: '#e2e8f0', padding: '48px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h1 style={{ fontSize: 34, margin: 0 }}>Zaydian Research Integrity</h1>
          <p style={{ marginTop: 12, opacity: 0.85, maxWidth: 460 }}>
            Secure, auditable research data governance: datasets, studies, ethics, consent, and publication readiness in one place.
          </p>
          <div style={{ marginTop: 24, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a href="mailto:ahsanmandhar@gmail.com" className="zri-badge" style={{ textDecoration: 'none', cursor: 'pointer' }}>Ask Author</a>
          </div>
          <div style={{ marginTop: 32, fontSize: 13, opacity: 0.7 }}>
            Accessibility: keyboard navigation, focus-visible, reduced-motion friendly.
          </div>
        </section>
        <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <form onSubmit={submit} className="zri-card zri-login-card" style={{ width: '100%', maxWidth: 420, display: 'grid', gap: 12 }}>
            <h2 style={{ margin: 0 }}>Sign in</h2>
            <label>
              Email
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus aria-label="Email" />
            </label>
            <label>
              Password
              <div style={{ display: 'flex', gap: 8 }}>
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} aria-label="Password" style={{ flex: 1 }} />
                <button type="button" onClick={() => setShowPw(v => !v)}>{showPw ? 'Hide' : 'Show'}</button>
              </div>
            </label>
            {password && (
              <div style={{ fontSize: 12, color: pwError ? 'var(--danger)' : 'var(--accent)' }}>
                {pwError || 'Password meets policy'}
              </div>
            )}
            <label>
              MFA code (optional)
              <input value={mfaCode} onChange={e => setMfaCode(e.target.value)} placeholder="123456" aria-label="MFA code" />
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Remember this device
            </label>
            {error && <div className="zri-error-msg" style={{ color: 'var(--danger)' }}>{error}</div>}
            <button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
            <button type="button" onClick={() => alert('Password reset flow placeholder')}>Forgot password?</button>
            <button type="button" onClick={() => setRequestMode(v => !v)}>{requestMode ? 'Hide request form' : 'Request access from organization admin'}</button>
          </form>
          <div className="zri-card" style={{ width: '100%', maxWidth: 420, marginTop: 16, background: 'linear-gradient(135deg,rgba(170,59,255,.12),rgba(192,132,252,.12))' }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Hive Mission</h3>
            <p style={{ fontSize: 13, lineHeight: 1.5, margin: '8px 0 0', color: 'var(--text)' }}>
              Hive creates independent organizations that operate with end-to-end encryption. It critically aligns researchers to prevent fake data entry in research. Admin identities are verified before access is granted to their organization. This software is designed solely to prevent AI-generated datasets. Personal information — phone numbers and emails of patients — is non-exportable. To connect to the Hive, contact the author.
            </p>
          </div>

          {requestMode && (
            <form onSubmit={async (e) => { e.preventDefault(); setReqMsg(''); if (!reqName || !reqEmail) { setReqMsg('Name and email required'); return; } try { await submitAccessRequest(reqName, reqEmail, reqOrgId === '' ? undefined : Number(reqOrgId), reqMessage); await db.auditLog.add({ entityType: 'accessRequest', entityId: reqEmail, action: 'submit', actorId: undefined, details: { name: reqName, email: reqEmail, organizationId: reqOrgId === '' ? undefined : Number(reqOrgId), message: reqMessage }, createdAt: Date.now() }); setReqMsg('Access request submitted. An organization admin will review it.'); setReqName(''); setReqEmail(''); setReqOrgId(''); setReqMessage(''); } catch (err: any) { setReqMsg(err?.message || 'Failed to submit request') } }} className="zri-card zri-login-card" style={{ width: '100%', maxWidth: 420, display: 'grid', gap: 12, marginTop: 12 }}>
              <h2 style={{ margin: 0 }}>Request access</h2>
              <label>Name<input value={reqName} onChange={e => setReqName(e.target.value)} /></label>
              <label>Email<input type="email" value={reqEmail} onChange={e => setReqEmail(e.target.value)} /></label>
              <label>Organization (optional)
                <select value={reqOrgId} onChange={e => setReqOrgId(e.target.value === '' ? '' : Number(e.target.value))}>
                  <option value="">Any / Not sure</option>
                  {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </label>
              <label>Message<textarea value={reqMessage} onChange={e => setReqMessage(e.target.value)} /></label>
              {reqMsg && <div>{reqMsg}</div>}
              <button type="submit">Submit request</button>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
