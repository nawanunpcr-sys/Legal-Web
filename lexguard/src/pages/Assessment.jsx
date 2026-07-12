// หน้าประเมิน (item 3) — มุมมองของหน่วยงาน (ผู้ประเมิน)
//   • ตัวกรอง "หน่วยงานของฉัน" (จำค่าล่าสุดใน localStorage)
//   • ประเมินรายข้อกำหนด: C (สอดคล้อง) / NC (ไม่สอดคล้อง) + ชื่อผู้ประเมิน (บังคับ)
//   • กด NC → บังคับสร้างแผนปรับปรุงทันที (ห้ามบันทึก NC โดยไม่มีแผน)
//   • ทุกการกระทำ log ลง lg_activity_log (ผ่าน onAssess/onCreatePlan)
import { useState, useEffect, useMemo } from 'react'
import { useAuth, NO_PERM } from '../lib/auth.js'
import { usePersist, thDate, daysTo } from '../lib/ui.jsx'
import { I } from '../components/icons.jsx'
import PlanModal from '../components/PlanModal.jsx'

export default function Assessment({ flow = [], laws = [], departments = [], deptMap = {}, catMap, plans = [], presetDept, onAssess, onFlowStatus, onCreatePlan, onOpen }) {
  const { can } = useAuth()
  const [myDept, setMyDept] = usePersist('lex_my_dept', '')       // เก็บ id หน่วยงาน (text)
  const [assessor, setAssessor] = usePersist('lex_assessor', '')  // ชื่อผู้ประเมิน (จำไว้)
  const [planFor, setPlanFor] = useState(null)                    // {req, law}
  const lawMap = useMemo(() => Object.fromEntries(laws.map(l => [l.id, l])), [laws])

  // มาจากการคลิกการ์ด dashboard → ตั้งหน่วยงานให้อัตโนมัติ
  useEffect(() => {
    if (!presetDept) return
    const d = departments.find(x => x.name === presetDept)
    if (d) setMyDept(String(d.id))
  }, [presetDept, departments])   // eslint-disable-line

  // งานประเมินของหน่วยงานที่เลือก
  const myFlow = useMemo(() => {
    const list = myDept ? flow.filter(f => String(f.assigned_dept_id) === String(myDept)) : flow
    return list.slice().sort((a, b) => (a.assess_status === 'done') - (b.assess_status === 'done'))
  }, [flow, myDept])

  const openPlanReq = useMemo(() => {
    const s = new Set(); plans.forEach(p => { if (p.status !== 'done' && p.requirement_id) s.add(p.requirement_id) }); return s
  }, [plans])

  function markC(req, law) { if (!assessor.trim()) return; onAssess(req, law, 'met', assessor.trim()) }
  function markNC(req, law) { if (!assessor.trim()) return; setPlanFor({ req, law }) }
  async function submitPlan(payload) {
    // บันทึก NC ก่อน แล้วสร้างแผนปรับปรุง (ห้ามมี NC ที่ไม่มีแผน)
    await onAssess(planFor.req, planFor.law, 'unmet', assessor.trim())
    await onCreatePlan({ ...payload, requirement_id: planFor.req.id, law_id: planFor.law.id })
    setPlanFor(null)
  }

  const needAssessor = !assessor.trim()

  return (
    <div className="view">
      {/* แถบเครื่องมือ: หน่วยงานของฉัน + ชื่อผู้ประเมิน */}
      <div className="panel" style={{ marginBottom: 14, padding: 14, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ minWidth: 200 }}>
          <label className="form-label">หน่วยงานของฉัน</label>
          <select className="form-input" value={myDept} onChange={e => setMyDept(e.target.value)}>
            <option value="">— ทุกหน่วยงาน —</option>
            {departments.filter(d => d.active !== false).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div style={{ minWidth: 200 }}>
          <label className="form-label">ชื่อผู้ประเมิน <span style={{ color: 'var(--bad)' }}>*</span></label>
          <input className="form-input" value={assessor} onChange={e => setAssessor(e.target.value)} placeholder="ระบุชื่อผู้ทำการประเมิน" />
          {/* TODO(auth): map ชื่อผู้ประเมินเป็น Supabase Auth รายคนภายหลัง */}
        </div>
        {needAssessor && <div style={{ fontSize: 12, color: 'var(--bad)', alignSelf: 'center' }}>* กรอกชื่อผู้ประเมินก่อนจึงจะประเมินได้</div>}
      </div>

      {myFlow.length === 0 && (
        <div className="panel" style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--ink-faint)' }}>
          ไม่มีงานประเมินสำหรับหน่วยงานนี้
        </div>
      )}

      {myFlow.map(f => {
        const law = lawMap[f.law_id]
        if (!law) return null
        const overdue = f.assess_due_date && f.assess_status !== 'done' && daysTo(f.assess_due_date) < 0
        const nc = law.reqs.filter(r => r.status === 'unmet').length
        const cat = catMap?.[law.cat]
        return (
          <div className="panel" key={f.id} style={{ marginBottom: 14 }}>
            <div className="panel-h">
              <span style={{ width: 10, height: 10, borderRadius: 3, background: cat?.color || '#888', flexShrink: 0 }} />
              <span className="law-code">{law.code}</span>
              <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{(law.name || '').slice(0, 80)}</span>
              <span className={'pill ' + (f.assess_status === 'done' ? 'p-ok' : 'p-warn')} style={{ fontSize: 11 }}>{deptMap[f.assigned_dept_id] || 'หน่วยงาน'}</span>
              {f.assess_due_date && <span className={'pill ' + (overdue ? 'p-bad' : 'p-warn')} style={{ fontSize: 11 }}>{overdue ? 'เลยกำหนด · ' : 'ครบกำหนด '}{thDate(f.assess_due_date)}</span>}
            </div>
            <div className="panel-b">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span className="sub">{law.reqs.length} ข้อกำหนด · สอดคล้อง {law.reqs.filter(r => r.status === 'met').length} · NC {nc}</span>
                <button className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 11 }} onClick={() => onOpen && onOpen(law)}>เปิดรายละเอียด →</button>
              </div>
              {law.reqs.map(r => {
                const hasPlan = openPlanReq.has(r.id)
                return (
                  <div key={r.id} className="impr-row" style={{ alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 450, lineHeight: 1.5 }}>{(r.text || '').slice(0, 160)}{(r.text || '').length > 160 ? '…' : ''}</div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                        {r.responsible && <span className="meta-chip">{r.responsible}</span>}
                        {r.evaluated_by && <span className="meta-chip">ประเมินโดย {r.evaluated_by}</span>}
                        {hasPlan && <span className="meta-chip" style={{ color: 'var(--warn)', background: 'var(--warn-bg)', borderColor: 'var(--warn-bg)' }}>มีแผนปรับปรุง</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className={'btn ' + (r.status === 'met' ? 'btn-primary' : 'btn-ghost')} style={{ padding: '4px 12px', fontSize: 12 }}
                        disabled={!can('edit') || needAssessor} title={needAssessor ? 'กรอกชื่อผู้ประเมินก่อน' : (can('edit') ? '' : NO_PERM)}
                        onClick={() => markC(r, law)}>C</button>
                      <button className={'btn ' + (r.status === 'unmet' ? 'btn-danger' : 'btn-ghost')} style={{ padding: '4px 12px', fontSize: 12 }}
                        disabled={!can('edit') || needAssessor} title={needAssessor ? 'กรอกชื่อผู้ประเมินก่อน' : (can('edit') ? '' : NO_PERM)}
                        onClick={() => markNC(r, law)}>NC</button>
                    </div>
                  </div>
                )
              })}
              <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
                {f.assess_status !== 'done'
                  ? <button className="btn btn-primary" disabled={!can('edit') || needAssessor} title={needAssessor ? 'กรอกชื่อผู้ประเมินก่อน' : ''}
                      onClick={() => onFlowStatus(f.id, 'done', assessor.trim())}>เสร็จการประเมิน ✓</button>
                  : <span className="pill p-ok">ประเมินเสร็จแล้ว · {f.assessed_by || ''}</span>}
                {f.assess_status === 'done' && <button className="btn btn-ghost" onClick={() => onFlowStatus(f.id, 'in_progress', assessor.trim())}>กลับมาแก้</button>}
              </div>
            </div>
          </div>
        )
      })}

      {planFor && <PlanModal req={planFor.req} law={planFor.law} departments={departments}
        defaultDeptName={deptMap[myFlow.find(f => f.law_id === planFor.law.id)?.assigned_dept_id]}
        defaultOwner={assessor} onClose={() => setPlanFor(null)} onSubmit={submitPlan} forNC />}
    </div>
  )
}
