import { useState } from 'react'
import { signInWithOAuth } from '../lib/supabase.js'
import { AUTH_MODE, DEMO_USERS, ROLE_LABELS, demoSignIn } from '../lib/auth.js'

const DEMO_VARIANTS = ['ivory', 'navy', 'sage']

export default function Login({ onAuthed }) {
  const [user, setUser] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [oauthBusy, setOauthBusy] = useState('')
  const [err, setErr] = useState('')
  const isDemo = AUTH_MODE === 'demo'

  async function submit(e) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try { const s = demoSignIn(user, pw); onAuthed(s); return }
    catch (e2) { setErr(e2.message || 'เข้าสู่ระบบไม่สำเร็จ') }
    setBusy(false)
  }

  function quickLogin(u) {
    setErr('')
    try { onAuthed(demoSignIn(u.username, u.password)) }
    catch (e2) { setErr(e2.message || 'เข้าสู่ระบบไม่สำเร็จ') }
  }

  async function handleOAuth(provider) {
    setErr(''); setOauthBusy(provider)
    try { await signInWithOAuth(provider) }
    catch (e) { setErr(e.message || 'เข้าสู่ระบบผ่าน ' + provider + ' ไม่สำเร็จ'); setOauthBusy('') }
  }

  return (
    <div className="login">
      <div className="login-bg" aria-hidden />
      <div className="login-glow" aria-hidden />

      <div className="login-wrap">
        <div className="login-hero">
          <div className="login-mark">SHE</div>
          <h1 className="login-title">ทะเบียนกฎหมาย SHE</h1>
          <p className="login-tagline">Safety · Health · Environment</p>
          <p className="login-sub">ระบบบริหารทะเบียนกฎหมายและการประเมินความสอดคล้อง</p>
        </div>

        <div className="login-card">
          {/* OAuth — hidden while in demo mode */}
          {!isDemo && (
            <div className="oauth-row">
              <button className="oauth-btn oauth-google" disabled={!!oauthBusy} onClick={() => handleOAuth('google')}>
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                {oauthBusy === 'google' ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบด้วย Google'}
              </button>
              <button className="oauth-btn oauth-microsoft" disabled={!!oauthBusy} onClick={() => handleOAuth('azure')}>
                <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden>
                  <rect x="1" y="1" width="10" height="10" fill="#F35325"/>
                  <rect x="12" y="1" width="10" height="10" fill="#81BC06"/>
                  <rect x="1" y="12" width="10" height="10" fill="#05A6F0"/>
                  <rect x="12" y="12" width="10" height="10" fill="#FFBA08"/>
                </svg>
                {oauthBusy === 'azure' ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบด้วย Microsoft'}
              </button>
            </div>
          )}

          {!isDemo && <div className="login-divider"><span>หรือเข้าสู่ระบบด้วยบัญชีองค์กร</span></div>}

          <form className="login-form" onSubmit={submit}>
            <input className="login-input" type="text" placeholder="ชื่อผู้ใช้ / อีเมล" autoComplete="username"
              value={user} onChange={e => setUser(e.target.value)} required />
            <input className="login-input" type="password" placeholder="รหัสผ่าน" autoComplete="current-password"
              value={pw} onChange={e => setPw(e.target.value)} required />
            {err && <div className="login-err">{err}</div>}
            <button className="login-btn" disabled={busy || !!oauthBusy} type="submit">
              {busy ? 'กำลังดำเนินการ…' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          {isDemo && (
            <div className="demo-box">
              <div className="demo-head">
                <span className="demo-badge">โหมดทดลองใช้ (Demo)</span>
                <span className="demo-hint">รหัสผ่านทุกบัญชี: she2026</span>
              </div>
              <div className="demo-grid">
                {DEMO_USERS.map((u, i) => (
                  <button type="button" key={u.username}
                    className={'demo-card demo-card--' + DEMO_VARIANTS[i % DEMO_VARIANTS.length]}
                    onClick={() => quickLogin(u)}>
                    <span className="demo-card-name">{u.name}</span>
                    <span className="demo-card-role">{ROLE_LABELS[u.role]}</span>
                    <span className="demo-card-user">{u.username}</span>
                    <span className="demo-card-cta">เข้าใช้ด่วน →</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <a className="login-site" href="https://www.jastel.co.th/" target="_blank" rel="noreferrer">www.jastel.co.th</a>
        </div>

        <div className="login-foot">© {new Date().getFullYear() + 543} JasTel Network · ทะเบียนกฎหมาย SHE</div>
      </div>
    </div>
  )
}
