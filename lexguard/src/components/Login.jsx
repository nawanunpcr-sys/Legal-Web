import { useState } from 'react'
import { signIn, hasSupabase } from '../lib/supabase.js'

// รหัสเข้าใช้งานแบบง่ายสำหรับทีม
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
    // 1) รหัสง่ายสำหรับทีม
    if (u === SIMPLE_USER && pw === SIMPLE_PASS) {
      onAuthed('local')
      return
    }
    // 2) เผื่อมีบัญชี Supabase จริง (อีเมล)
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
      <div className="login-bg" aria-hidden />
      <div className="login-wrap">
        <div className="login-card">
          <div className="login-mark">CR</div>
          <h1 className="login-title">ComplyRegister</h1>
          <p className="login-tagline">ทะเบียนกฎหมาย SHE.<br /><span>เรียบง่าย. แม่นยำ. สอดคล้อง.</span></p>

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

          <div className="login-demo">รหัสเข้าใช้งาน: 12345 / 12345</div>
        </div>
        <div className="login-foot">© {new Date().getFullYear() + 543} ComplyRegister · จัสเทล เน็ทเวิร์ค</div>
      </div>
    </div>
  )
}
