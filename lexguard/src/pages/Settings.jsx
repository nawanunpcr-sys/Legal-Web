// Settings page — org profile & display settings (admin only; gated in App).
// Moved verbatim from App.jsx (pure refactor).
import { useState } from 'react'
import { toast } from '../lib/toast.js'

export default function SettingsPage({ settings, onSave }) {
  const [f, setF] = useState(settings)
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const F = [
    ['company_name', 'ชื่อระบบ / บริษัท (หัวเมนู)'],
    ['subtitle', 'คำบรรยายใต้ชื่อ'],
    ['brand_mark', 'อักษรย่อโลโก้ (เช่น CR)'],
    ['org_name', 'ชื่อองค์กร (มุมล่าง)'],
    ['user_name', 'ชื่อผู้ใช้ (มุมล่าง)'],
  ]
  async function save() { setBusy(true); try { await onSave(f) } catch (e) { toast('บันทึกไม่สำเร็จ: ' + e.message) } setBusy(false) }
  return (
    <div className="view">
      <div className="panel" style={{ maxWidth: 560 }}>
        <div className="panel-h"><h3>ข้อมูลองค์กร & การแสดงผล</h3></div>
        <div className="panel-b">
          {F.map(([k, label]) => (
            <div key={k}><label className="form-label">{label}</label>
              <input className="form-input" value={f[k] || ''} onChange={e => set(k, e.target.value)} maxLength={k === 'brand_mark' ? 4 : 80} /></div>
          ))}
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'กำลังบันทึก…' : 'บันทึกการตั้งค่า'}</button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 14, lineHeight: 1.6 }}>การเปลี่ยนแปลงจะแสดงผลที่หัวเมนูและมุมล่างของแถบด้านข้างทันที</p>
        </div>
      </div>
    </div>
  )
}

