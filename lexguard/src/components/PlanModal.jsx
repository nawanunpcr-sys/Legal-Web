// Modal สร้าง/แก้แผนปรับปรุง (ใช้ทั้งตอนกด NC ในหน้าประเมิน และหน้าแผนปรับปรุง)
// forNC = true → ข้อความเน้นว่า "บังคับสร้างแผนก่อนบันทึก NC"
import { useState } from 'react'
import { I } from './icons.jsx'

export default function PlanModal({ req, law, departments = [], defaultDeptName, defaultOwner, initial, onClose, onSubmit, forNC }) {
  const active = departments.filter(d => d.active !== false)
  const defDept = initial?.owner_dept_id || (defaultDeptName ? active.find(d => d.name === defaultDeptName)?.id : '') || ''
  const [plan, setPlan] = useState(initial?.plan_text || '')
  const [deptId, setDeptId] = useState(defDept ? String(defDept) : '')
  const [owner, setOwner] = useState(initial?.owner_name || defaultOwner || '')
  const [due, setDue] = useState(initial?.due_date || '')
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!plan.trim()) return
    setBusy(true)
    try {
      await onSubmit({ plan_text: plan.trim(), owner_dept_id: deptId ? Number(deptId) : null, owner_name: owner.trim() || null, due_date: due || null })
    } catch { setBusy(false) }
  }

  return (<>
    <div className="scrim" style={{ zIndex: 320 }} onClick={onClose} />
    <div className="modal" style={{ zIndex: 321, width: 540 }}>
      <div className="modal-head">
        <h3>{initial ? 'แก้ไขแผนปรับปรุง' : 'สร้างแผนปรับปรุง'}{forNC ? ' (บังคับสำหรับ NC)' : ''}</h3>
        <button className="close" onClick={onClose}><I n="x" /></button>
      </div>
      <div className="modal-body">
        {(law || req) && (
          <div style={{ fontSize: 13, marginBottom: 10, padding: 10, background: 'var(--surface-2)', borderRadius: 8 }}>
            {law && <div><b className="law-code">{law.code}</b> {(law.name || '').slice(0, 70)}</div>}
            {req && <div style={{ color: 'var(--ink-soft)', marginTop: 4 }}>ข้อกำหนด: {(req.text || '').slice(0, 130)}</div>}
          </div>
        )}
        {forNC && <div style={{ fontSize: 12, color: 'var(--bad)', marginBottom: 10 }}>ข้อนี้ประเมินเป็น “ไม่สอดคล้อง (NC)” — ต้องมีแผนปรับปรุงก่อนจึงจะบันทึกได้</div>}
        <label className="form-label">แผนปรับปรุง / จะทำอะไร <span style={{ color: 'var(--bad)' }}>*</span></label>
        <textarea className="form-input" rows={3} value={plan} onChange={e => setPlan(e.target.value)} placeholder="เช่น จัดทำแผนอบรมและขออนุมัติหลักสูตร ภายในไตรมาสหน้า" autoFocus />
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">หน่วยงานรับผิดชอบ</label>
            <select className="form-input" value={deptId} onChange={e => setDeptId(e.target.value)}>
              <option value="">— เลือกหน่วยงาน —</option>
              {active.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label">ผู้รับผิดชอบ</label>
            <input className="form-input" value={owner} onChange={e => setOwner(e.target.value)} placeholder="ชื่อผู้รับผิดชอบ" />
          </div>
        </div>
        <label className="form-label">วันครบกำหนด (due date)</label>
        <input className="form-input" type="date" value={due || ''} onChange={e => setDue(e.target.value)} />
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-primary" disabled={!plan.trim() || busy} onClick={save}>{busy ? 'กำลังบันทึก…' : (initial ? 'บันทึก' : 'สร้างแผน')}</button>
      </div>
    </div>
  </>)
}
