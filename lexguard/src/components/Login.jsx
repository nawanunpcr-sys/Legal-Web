import { useState } from 'react'
import { signIn, signInWithOAuth, hasSupabase } from '../lib/supabase.js'

const SIMPLE_USER = '12345'
const SIMPLE_PASS = '12345'

export default function Login({ onAuthed }) {
  const [user, setUser] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [oauthBusy, setOauthBusy] = useState('')
  const [err, setErr] = useState('')

  async function submit(e) {
    e.preventDefault()
    setErr(''); setBusy(true)
    const u = user.trim()
    if (u === SIMPLE_USER && pw === SIMPLE_PASS) { onAuthed('local'); return }
    if (hasSupabase && u.includes('@')) {
      try { const s = await signIn(u, pw); onAuthed(s); return }
      catch (e2) { setErr(e2.message || 'เข้าสู่ระบบไม่สำเร็จ') }
    } else {
      setErr('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
    }
    setBusy(false)
  }

  async function handleOAuth(provider) {
    if (!hasSupabase) { setErr('ยังไม่ได้ตั้งค่า Supabase'); return }
    setErr(''); setOauthBusy(provider)
    try { await signInWithOAuth(provider) }
    catch (e) { setErr(e.message || 'เข้าสู่ระบบผ่าน '+provider+' ไม่สำเร็จ'); setOauthBusy('') }
  }

  return (
    <div className="login">
      <div className="login-grid" aria-hidden />
      <div className="login-aurora" aria-hidden />
      <svg className="login-net" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <g className="net-links">
          {[[120,140,360,300],[360,300,180,520],[360,300,640,180],[640,180,900,320],[900,320,1080,180],[640,180,720,520],[900,320,820,640],[180,520,460,700],[720,520,820,640],[460,700,820,640],[1080,180,1120,460]].map((l,i)=>(
            <line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} style={{ animationDelay: (i*0.4)+'s' }} />
          ))}
        </g>
        <g className="net-nodes">
          {[[120,140],[360,300],[180,520],[640,180],[900,320],[1080,180],[720,520],[820,640],[460,700],[1120,460]].map((n,i)=>(
            <circle key={i} cx={n[0]} cy={n[1]} r="4" style={{ animationDelay: (i*0.5)+'s' }} />
          ))}
        </g>
      </svg>
      <div className="login-racks" aria-hidden>{Array.from({ length: 7 }).map((_, i) => (
        <div className="rack" key={i}>{Array.from({ length: 6 }).map((__, j) => <span key={j} style={{ animationDelay: ((i + j) * 0.3) + 's' }} />)}</div>
      ))}</div>

      <div className="login-wrap">
        <div className="login-card">
          <div className="globe-stage">
            <div className="globe"><span className="globe-shine" /></div>
            <div className="orbit"><span className="orbit-dot" /></div>
          </div>

          <h1 className="login-title"><span className="j-orange">Jas</span><span className="j-blue">Tel</span></h1>
          <p className="login-tagline">ระบบทะเบียนกฎหมาย SHE<br /><span>Safety · Health · Environment</span></p>

          {/* OAuth buttons */}
          <div className="oauth-row">
            <button
              className="oauth-btn oauth-google"
              disabled={!!oauthBusy}
              onClick={() => handleOAuth('google')}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              {oauthBusy === 'google' ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบด้วย Google'}
            </button>
            <button
              className="oauth-btn oauth-microsoft"
              disabled={!!oauthBusy}
              onClick={() => handleOAuth('azure')}
            >
              <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden>
                <rect x="1"  y="1"  width="10" height="10" fill="#F35325"/>
                <rect x="12" y="1"  width="10" height="10" fill="#81BC06"/>
                <rect x="1"  y="12" width="10" height="10" fill="#05A6F0"/>
                <rect x="12" y="12" width="10" height="10" fill="#FFBA08"/>
              </svg>
              {oauthBusy === 'azure' ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบด้วย Microsoft'}
            </button>
          </div>

          <div className="login-divider"><span>หรือเข้าสู่ระบบด้วยบัญชีองค์กร</span></div>

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

          <a className="login-site" href="https://www.jastel.co.th/" target="_blank" rel="noreferrer">www.jastel.co.th</a>
        </div>
        <div className="login-foot">© {new Date().getFullYear() + 543} JasTel Network · ทะเบียนกฎหมาย SHE</div>
      </div>
    </div>
  )
}
