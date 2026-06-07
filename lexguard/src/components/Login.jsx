import { useState } from 'react'
import { signIn, hasSupabase } from '../lib/supabase.js'

// รหัสเข้าใช้งานแบบง่ายสำหรับทีม (ไม่แสดงบนหน้าจอ)
const SIMPLE_USER = '12345'
const SIMPLE_PASS = '12345'

export default function Login({ onAuthed }) {
  const [user, setUser] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
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

  return (
    <div className="login">
      {/* IT / network animated backdrop */}
      <div className="login-grid" aria-hidden />
      <div className="login-aurora" aria-hidden />
      <ul className="login-nodes" aria-hidden>{Array.from({ length: 12 }).map((_, i) => <li key={i} />)}</ul>

      <div className="login-wrap">
        <div className="login-card">
          {/* spinning globe + orbit (JasTel mark) */}
          <div className="globe-stage">
            <div className="globe"><span className="globe-shine" /></div>
            <div className="orbit"><span className="orbit-dot" /></div>
          </div>

          <h1 className="login-title"><span className="j-orange">Jas</span><span className="j-blue">Tel</span></h1>
          <p className="login-tagline">ระบบทะเบียนกฎหมาย SHE<br /><span>Safety · Health · Environment</span></p>

          <form className="login-form" onSubmit={submit}>
            <input className="login-input" type="text" placeholder="ชื่อผู้ใช้" autoComplete="username"
              value={user} onChange={e => setUser(e.target.value)} required />
            <input className="login-input" type="password" placeholder="รหัสผ่าน" autoComplete="current-password"
              value={pw} onChange={e => setPw(e.target.value)} required />
            {err && <div className="login-err">{err}</div>}
            <button className="login-btn" disabled={busy} type="submit">
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
