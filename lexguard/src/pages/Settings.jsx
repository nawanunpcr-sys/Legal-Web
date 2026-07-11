// Settings page — org profile & display settings (admin only; gated in App).
// Moved verbatim from App.jsx (pure refactor).
import { useState } from 'react'
import { toast } from '../lib/toast.js'
import { trainingStatus } from '../lib/ui.jsx'

// การ์ดนับชั่วโมงอบรมพัฒนาความรู้ จป. 12 ชม./ปี (กรอกมือ, เก็บในเครื่อง)
function TrainingCard({ training, setTraining }) {
  const t = training || { hours: 0, target: 12, year: new Date().getFullYear() + 543 }
  const ts = trainingStatus(t)
  const pct = Math.min(100, Math.round(ts.hours / (ts.target || 12) * 100))
  const set = (k, v) => setTraining({ ...t, [k]: v })
  return (
    <div className="panel" style={{ maxWidth: 560, marginBottom: 16 }}>
      <div className="panel-h"><h3>อบรมพัฒนาความรู้ จป. (12 ชม./ปี)</h3>
        <span className="sub" style={{ marginLeft: 'auto' }}>ปี {t.year}</span></div>
      <div className="panel-b">
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div><label className="form-label">ชั่วโมงสะสม</label>
            <input className="form-input" type="number" min="0" step="0.5" style={{ width: 120 }} value={t.hours}
              onChange={e => set('hours', Number(e.target.value))} /></div>
          <div><label className="form-label">เป้าหมาย (ชม.)</label>
            <input className="form-input" type="number" min="1" style={{ width: 120 }} value={t.target}
              onChange={e => set('target', Number(e.target.value))} /></div>
          <div><label className="form-label">ปี พ.ศ.</label>
            <input className="form-input" type="number" style={{ width: 110 }} value={t.year}
              onChange={e => set('year', Number(e.target.value))} /></div>
        </div>
        <div className="track" style={{ marginTop: 14, height: 8, background: 'var(--surface-3)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ width: pct + '%', height: '100%', background: ts.done ? 'var(--ok)' : 'var(--review)' }} />
        </div>
        <div style={{ marginTop: 8, fontSize: 12.5, color: ts.done ? 'var(--ok)' : ts.alert ? 'var(--bad)' : 'var(--ink-soft)', fontWeight: 600 }}>
          {ts.done ? `ครบแล้ว ✓ (${ts.hours}/${ts.target} ชม.)`
            : `ทำได้ ${ts.hours}/${ts.target} ชม. · เหลืออีก ${ts.remain} ชม. · เหลือเวลา ${ts.daysLeft} วันในปีนี้${ts.alert ? ' — เร่งอบรม!' : ''}`}
        </div>
      </div>
    </div>
  )
}

export default function SettingsPage({ settings, onSave, training, setTraining }) {
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
      {setTraining && <TrainingCard training={training} setTraining={setTraining} />}
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

