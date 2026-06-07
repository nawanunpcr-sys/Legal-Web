import { useState } from 'react'
import { signIn, signUp, hasSupabase } from '../lib/supabase.js'

export default function Login({ onAuthed, onBypass }) {
  const [mode, setMode] = useState('in')   // 'in' | 'up'
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')

  async function submit(e) {
    e.preventDefault()
    setErr(''); setMsg(''); setBusy(true)
    try {
      if (mode === 'in') {
        const s = await signIn(email.trim(), pw)
        onAuthed(s)
      } else {
        const s = await signUp(email.trim(), pw)
        if (s) onAuthed(s)
        else setMsg('สร้างบัญชีแล้ว — โปรดยืนยันอีเมลก่อนเข้าสู่ระบบ')
      }
    } catch (e2) {
      setErr(e2.message || 'เข้าสู่ระบบไม่สำเร็จ')
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
            <input className="login-input" type="email" placeholder="อีเมล" autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)} required />
            <input className="login-input" type="password" placeholder="รหัสผ่าน" autoComplete="current-password"
              value={pw} onChange={e => setPw(e.target.value)} required />

            {err && <div className="login-err">{err}</div>}
            {msg && <div className="login-msg">{msg}</div>}

            <button className="login-btn" disabled={busy} type="submit">
              {busy ? 'กำลังดำเนินการ…' : mode === 'in' ? 'เข้าสู่ระบบ' : 'สร้างบัญชี'}
            </button>
          </form>

          <button className="login-switch" onClick={() => { setErr(''); setMsg(''); setMode(m => m === 'in' ? 'up' : 'in') }}>
            {mode === 'in' ? 'ยังไม่มีบัญชี? สร้างบัญชีใหม่' : 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ'}
          </button>

          {!hasSupabase && (
            <button className="login-demo" onClick={onBypass}>เข้าชมแบบเดโม (ไม่เชื่อมต่อฐานข้อมูล)</button>
          )}
        </div>
        <div className="login-foot">© {new Date().getFullYear() + 543} ComplyRegister · จัสเทล เน็ทเวิร์ค</div>
      </div>
    </div>
  )
}
