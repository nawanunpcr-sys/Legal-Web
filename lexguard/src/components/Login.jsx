import { useState } from 'react'
import { appSignIn } from '../lib/auth.js'

export default function Login({ onAuthed }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [logoOk, setLogoOk] = useState(true)

  function handleSubmit(e) {
    e.preventDefault()
    setErr(''); setBusy(true)
    try { onAuthed(appSignIn(username, password)) }
    catch (e2) { setErr(e2.message || 'เข้าสู่ระบบไม่สำเร็จ'); setBusy(false) }
  }

  return (
    <div className="login">
      <div className="login-bg" aria-hidden />
      <div className="login-glow" aria-hidden />

      <div className="login-wrap">
        <div className="login-hero">
          {logoOk
            ? <img src="/jastel-logo.png" alt="JasTel Network" className="login-logo" onError={() => setLogoOk(false)} />
            : <div className="login-mark">SHE</div>}
          <h1 className="login-title">ทะเบียนกฎหมาย SHE</h1>
          <p className="login-tagline">Safety · Health · Environment</p>
          <p className="login-sub">ระบบบริหารทะเบียนกฎหมายและการประเมินความสอดคล้อง</p>
          <p className="login-company">บริษัท จัสเทล เน็ทเวิร์ค จำกัด · Jastel Network Co., Ltd.</p>
        </div>

        <div className="login-card">
          <form className="login-form" onSubmit={handleSubmit}>
            <label className="login-field">
              <span className="login-lbl">ชื่อผู้ใช้ · Username</span>
              <input
                className="login-input"
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="ชื่อผู้ใช้"
              />
            </label>

            <label className="login-field">
              <span className="login-lbl">รหัสผ่าน · Password</span>
              <div className="login-pw">
                <input
                  className="login-input"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="รหัสผ่าน"
                />
                <button type="button" className="login-pw-toggle" onClick={() => setShowPw(s => !s)} tabIndex={-1}>
                  {showPw ? 'ซ่อน' : 'แสดง'}
                </button>
              </div>
            </label>

            {err && <div className="login-err">{err}</div>}

            <button type="submit" className="login-btn" disabled={busy}>
              {busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <a className="login-site" href="https://www.jastel.co.th/" target="_blank" rel="noreferrer">www.jastel.co.th</a>
        </div>

        <div className="login-foot">© {new Date().getFullYear() + 543} JasTel Network · ทะเบียนกฎหมาย SHE</div>
      </div>
    </div>
  )
}
