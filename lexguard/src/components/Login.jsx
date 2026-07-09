import { useState } from 'react'
import { signInWithOAuth } from '../lib/supabase.js'
import { demoLoginAs } from '../lib/auth.js'

export default function Login({ onAuthed }) {
  const [oauthBusy, setOauthBusy] = useState('')
  const [err, setErr] = useState('')
  const [logoOk, setLogoOk] = useState(true)

  function loginAs(username) {
    setErr('')
    try { onAuthed(demoLoginAs(username)) }
    catch (e) { setErr(e.message || 'เข้าสู่ระบบไม่สำเร็จ') }
  }

  async function handleOAuth(provider) {
    setErr(''); setOauthBusy(provider)
    try { await signInWithOAuth(provider) }
    catch (e) { setErr(e.message || 'เข้าสู่ระบบผ่าน Microsoft ไม่สำเร็จ'); setOauthBusy('') }
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
          {/* Microsoft SSO — name is pulled from the Microsoft profile after sign-in */}
          <button className="oauth-btn oauth-microsoft" disabled={!!oauthBusy} onClick={() => handleOAuth('azure')}>
            <svg width="18" height="18" viewBox="0 0 23 23" aria-hidden>
              <rect x="1" y="1" width="10" height="10" fill="#F35325" />
              <rect x="12" y="1" width="10" height="10" fill="#81BC06" />
              <rect x="1" y="12" width="10" height="10" fill="#05A6F0" />
              <rect x="12" y="12" width="10" height="10" fill="#FFBA08" />
            </svg>
            {oauthBusy === 'azure' ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบด้วย Microsoft'}
          </button>

          <div className="login-divider"><span>หรือเข้าใช้งานภายใน</span></div>

          <div className="role-row">
            <button type="button" className="role-btn role-btn--admin" disabled={!!oauthBusy} onClick={() => loginAs('jorpor')}>
              <span className="role-btn-name">จป. วิชาชีพ</span>
              <span className="role-btn-role">ผู้ดูแลระบบ</span>
              <span className="role-btn-cta">เข้าใช้งาน →</span>
            </button>
            <button type="button" className="role-btn role-btn--viewer" disabled={!!oauthBusy} onClick={() => loginAs('viewer')}>
              <span className="role-btn-name">ผู้เยี่ยมชม</span>
              <span className="role-btn-role">Viewer</span>
              <span className="role-btn-cta">เข้าใช้งาน →</span>
            </button>
          </div>

          {err && <div className="login-err">{err}</div>}

          <a className="login-site" href="https://www.jastel.co.th/" target="_blank" rel="noreferrer">www.jastel.co.th</a>
        </div>

        <div className="login-foot">© {new Date().getFullYear() + 543} JasTel Network · ทะเบียนกฎหมาย SHE</div>
      </div>
    </div>
  )
}
