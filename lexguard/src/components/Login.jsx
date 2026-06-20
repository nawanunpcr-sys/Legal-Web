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
      {/* telecom / data-center animated backdrop */}
      <div className="login-grid" aria-hidden />
      <div className="login-aurora" aria-hidden />
      {/* network mesh with flowing data links */}
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
      {/* server-rack LED strip */}
      <div className="login-racks" aria-hidden>{Array.from({ length: 7 }).map((_, i) => (
        <div className="rack" key={i}>{Array.from({ length: 6 }).map((__, j) => <span key={j} style={{ animationDelay: ((i + j) * 0.3) + 's' }} />)}</div>
      ))}</div>

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
