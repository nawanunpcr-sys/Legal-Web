// หน้าแผนปรับปรุง (item 4)
//   • ตารางแผนทั้งหมด กรองตามหน่วยงาน / สถานะ / เลยกำหนด
//   • อัปเดตความคืบหน้า (open ↔ in_progress) + แนบหลักฐาน (lg_attachments ref_type='plan')
//   • ปิดแผน → บังคับกรอกหลักฐาน/สรุปผล แล้วระบบพลิก requirement NC→C อัตโนมัติ + log
import { useState, useMemo } from 'react'
import { useAuth, NO_PERM } from '../lib/auth.js'
import { thDate, daysTo } from '../lib/ui.jsx'
import { planEffectiveStatus, PLAN_STATUS } from '../lib/supabase.js'
import { I } from '../components/icons.jsx'
import Attachments from '../components/Attachments.jsx'
import PlanModal from '../components/PlanModal.jsx'

export default function Plans({ plans = [], departments = [], deptMap = {}, laws = [], lawMap = {}, presetDept, onUpdatePlan, onClosePlan, onCreatePlan, onOpen }) {
  const { can } = useAuth()
  const lm = useMemo(() => (Object.keys(lawMap).length ? lawMap : Object.fromEntries(laws.map(l => [l.id, l]))), [lawMap, laws])
  const initDept = useMemo(() => { const d = departments.find(x => x.name === presetDept); return d ? String(d.id) : '' }, [presetDept, departments])
  const [fDept, setFDept] = useState(initDept)
  const [fStatus, setFStatus] = useState('open')   // '' | open | in_progress | overdue | done
  const [expanded, setExpanded] = useState(null)
  const [closeFor, setCloseFor] = useState(null)
  const [editFor, setEditFor] = useState(null)

  const rows = useMemo(() => plans.filter(p => {
    if (fDept && String(p.owner_dept_id) !== fDept) return false
    const es = planEffectiveStatus(p)
    if (fStatus === 'open' && p.status === 'done') return false   // "ที่ยังเปิดอยู่" = ทุกอันที่ยังไม่ปิด
    if (fStatus && fStatus !== 'open' && es !== fStatus) return false
    return true
  }), [plans, fDept, fStatus])

  const counts = useMemo(() => {
    let open = 0, overdue = 0, done = 0
    plans.forEach(p => { const es = planEffectiveStatus(p); if (es === 'done') done++; else { open++; if (es === 'overdue') overdue++ } })
    return { open, overdue, done, total: plans.length }
  }, [plans])

  return (
    <div className="view">
      {/* ตัวกรอง */}
      <div className="panel" style={{ marginBottom: 14, padding: 14, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 180 }}>
          <label className="form-label">หน่วยงาน</label>
          <select className="form-input" value={fDept} onChange={e => setFDept(e.target.value)}>
            <option value="">— ทุกหน่วยงาน —</option>
            {departments.filter(d => d.active !== false).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div style={{ minWidth: 160 }}>
          <label className="form-label">สถานะ</label>
          <select className="form-input" value={fStatus} onChange={e => setFStatus(e.target.value)}>
            <option value="">ทั้งหมด</option>
            <option value="open">ยังไม่ปิด</option>
            <option value="in_progress">กำลังปรับปรุง</option>
            <option value="overdue">เลยกำหนด</option>
            <option value="done">ปิดแล้ว</option>
          </select>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="pill p-bad">เลยกำหนด {counts.overdue}</span>
          <span className="pill p-warn">ยังไม่ปิด {counts.open}</span>
          <span className="pill p-ok">ปิดแล้ว {counts.done}</span>
        </div>
      </div>

      {rows.length === 0 && (
        <div className="panel" style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--ink-faint)' }}>ไม่มีแผนปรับปรุงตามเงื่อนไขที่เลือก</div>
      )}

      {rows.map(p => {
        const es = planEffectiveStatus(p)
        const st = PLAN_STATUS[es] || PLAN_STATUS.open
        const law = p.law_id ? lm[p.law_id] : null
        const req = law?.reqs?.find(r => r.id === p.requirement_id)
        const isOpen = expanded === p.id
        const dueDays = p.due_date ? daysTo(p.due_date) : null
        return (
          <div className="panel" key={p.id} style={{ marginBottom: 12 }}>
            <div className="panel-h" style={{ cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : p.id)}>
              <span className={'pill ' + st.cls} style={{ fontSize: 11 }}>{st.label}</span>
              {law && <span className="law-code">{law.code}</span>}
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 500 }}>{(p.plan_text || '').slice(0, 90)}</span>
              {p.owner_dept_id && <span className="meta-chip">{deptMap[p.owner_dept_id]}</span>}
              {p.due_date && <span className="meta-chip" style={es === 'overdue' ? { color: 'var(--bad)', background: 'var(--bad-bg)', borderColor: 'var(--bad-bg)' } : undefined}>
                กำหนด {thDate(p.due_date)}{es === 'overdue' ? ` · เกิน ${Math.abs(dueDays)} วัน` : (dueDays != null && dueDays <= 7 && p.status !== 'done' ? ` · อีก ${dueDays} วัน` : '')}
              </span>}
              <span style={{ fontSize: 12, color: 'var(--brand)' }}>{isOpen ? '▲' : '▼'}</span>
            </div>
            {isOpen && (
              <div className="panel-b">
                <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}>{p.plan_text}</div>
                {req && <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 8, padding: 9, background: 'var(--surface-2)', borderRadius: 8 }}>
                  ข้อกำหนด (NC): {(req.text || '').slice(0, 160)}
                  {law && <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 11, marginLeft: 8 }} onClick={() => onOpen && onOpen(law)}>เปิดกฎหมาย →</button>}
                </div>}
                <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
                  {p.owner_name && <span className="meta-chip">ผู้รับผิดชอบ: {p.owner_name}</span>}
                  {p.created_by && <span className="meta-chip">สร้างโดย {p.created_by}</span>}
                  {p.closed_by && <span className="meta-chip">ปิดโดย {p.closed_by} · {thDate(p.closed_at)}</span>}
                  {p.evidence && <span className="meta-chip" style={{ color: 'var(--ok)', background: 'var(--ok-bg)', borderColor: 'var(--ok-bg)' }}>หลักฐาน: {p.evidence.slice(0, 60)}</span>}
                </div>

                {p.status !== 'done' && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
                    <label className="form-label" style={{ margin: 0 }}>ความคืบหน้า:</label>
                    <select className="form-input" style={{ width: 'auto', padding: '5px 10px' }} value={p.status} disabled={!can('edit')}
                      onChange={e => onUpdatePlan(p.id, { status: e.target.value })}>
                      <option value="open">เปิด (ยังไม่เริ่ม)</option>
                      <option value="in_progress">กำลังปรับปรุง</option>
                    </select>
                    <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 12 }} disabled={!can('edit')} onClick={() => setEditFor(p)}>แก้ไขแผน</button>
                    <button className="btn btn-primary" style={{ padding: '5px 14px', fontSize: 12, marginLeft: 'auto' }} disabled={!can('edit')} title={can('edit') ? '' : NO_PERM}
                      onClick={() => setCloseFor(p)}>ปิดแผน → พลิกเป็น C</button>
                  </div>
                )}

                <div style={{ borderTop: '1px solid var(--line-soft)', paddingTop: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>หลักฐานแนบ</div>
                  <Attachments refType="plan" refId={p.id} />
                </div>
              </div>
            )}
          </div>
        )
      })}

      {closeFor && <ClosePlanModal plan={closeFor} law={closeFor.law_id ? lm[closeFor.law_id] : null}
        onClose={() => setCloseFor(null)} onConfirm={ev => { onClosePlan(closeFor, ev); setCloseFor(null) }} />}
      {editFor && <PlanModal initial={editFor} law={editFor.law_id ? lm[editFor.law_id] : null} departments={departments}
        onClose={() => setEditFor(null)}
        onSubmit={async payload => { await onUpdatePlan(editFor.id, payload); setEditFor(null) }} />}
    </div>
  )
}

// ปิดแผน — บังคับกรอกหลักฐาน/สรุปผล
function ClosePlanModal({ plan, law, onClose, onConfirm }) {
  const [ev, setEv] = useState('')
  return (<>
    <div className="scrim" style={{ zIndex: 320 }} onClick={onClose} />
    <div className="modal" style={{ zIndex: 321, width: 520 }}>
      <div className="modal-head"><h3>ปิดแผนปรับปรุง</h3><button className="close" onClick={onClose}><I n="x" /></button></div>
      <div className="modal-body">
        <div style={{ fontSize: 13, marginBottom: 8 }}>{law && <b className="law-code">{law.code} </b>}{(plan.plan_text || '').slice(0, 90)}</div>
        <div style={{ fontSize: 12, color: 'var(--ok)', marginBottom: 10 }}>เมื่อปิดแผน ระบบจะพลิกข้อกำหนดนี้จาก NC → สอดคล้อง (C) อัตโนมัติ พร้อมบันทึกประวัติ</div>
        <label className="form-label">หลักฐาน / สรุปผลการปรับปรุง <span style={{ color: 'var(--bad)' }}>*</span></label>
        <textarea className="form-input" rows={3} value={ev} onChange={e => setEv(e.target.value)}
          placeholder="เช่น จัดอบรมและเก็บทะเบียนผู้ผ่านการอบรมเรียบร้อย แนบไฟล์หลักฐานในรายการแล้ว" autoFocus />
        <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 6 }}>แนบไฟล์หลักฐานได้ในรายการแผน (ปุ่มแนบไฟล์)</div>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-primary" disabled={!ev.trim()} onClick={() => onConfirm(ev.trim())}>ปิดแผน + พลิกเป็น C</button>
      </div>
    </div>
  </>)
}
