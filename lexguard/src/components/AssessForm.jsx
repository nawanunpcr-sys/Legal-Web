// Shared Process 2 form (ผู้ประเมิน) — reused by BOTH Workflow A and Workflow B.
// P21 · ผลการประเมินมี 4 สถานะ (C / NC / Ack / -) แทนที่จะมีแค่ 2
//   ไม่สอดคล้อง (NC)          → ต้องกรอกแผนปรับปรุง / มาตรการจัดการ / วันกำหนดทวนสอบ
//   เพื่อทราบ / ไม่เกี่ยวข้อง  → ต้องกรอกเหตุผล (บังคับทั้งฝั่งนี้และ CHECK ในฐานข้อมูล)
//   สอดคล้อง (C)              → เหตุผลเป็นทางเลือก
import { useState } from 'react'
import Attachments from './Attachments.jsx'
import { I } from './icons.jsx'
import { REQ_STATUS, REQ_STATUS_ORDER, ASSESS_RESULT_BY_STATUS, reasonRequired } from '../lib/supabase.js'
import { CriteriaHint } from './ReqStatusPicker.jsx'

export default function AssessForm({ law, suggest = {}, onSubmit, onCancel }) {
  const [assessor, setAssessor] = useState('')
  const [status, setStatus]     = useState('')      // met | unmet | acknowledged | not_applicable
  const [reason, setReason]     = useState('')
  const [plan, setPlan]         = useState('')
  const [measure, setMeasure]   = useState('')
  const [reverify, setReverify] = useState('')
  const [saving, setSaving]     = useState(false)

  const nc = status === 'unmet'
  const needReason = reasonRequired(status)
  const valid = assessor.trim() && status
    && (!nc || (plan.trim() && reverify))
    && (!needReason || reason.trim())

  async function submit() {
    if (!valid || saving) return
    setSaving(true)
    try {
      await onSubmit({
        assessorName: assessor.trim(),
        result: ASSESS_RESULT_BY_STATUS[status],
        reason: reason.trim(),
        plan: plan.trim(), measure: measure.trim(), reverifyDate: reverify,
      })
    }
    finally { setSaving(false) }
  }

  const now = new Date()
  const nowLabel = now.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div>
          <label className="form-label">ผู้ประเมิน <span style={{color:'var(--bad)'}}>*</span></label>
          <input className="form-input" placeholder="พิมพ์ชื่อผู้ประเมิน…"
            value={assessor} onChange={e=>setAssessor(e.target.value)}/>
        </div>
        <div>
          <label className="form-label">วันที่ประเมิน</label>
          <input className="form-input" type="text" value={nowLabel} readOnly disabled title="บันทึกเวลาจริงอัตโนมัติ"/>
        </div>
      </div>

      <label className="form-label" style={{marginTop:10,display:'flex',alignItems:'center',gap:7,flexWrap:'wrap'}}>
        ผลการทวนสอบต่อข้อปฏิบัติ <span style={{color:'var(--bad)'}}>*</span>
        {/* P22 ขั้นที่ 3 · เกณฑ์ตัดสินร่วม — ต้องอยู่ทุกจุดที่ประเมิน ไม่ใช่แค่หน้าเดียว */}
        <CriteriaHint/>
      </label>
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:10}}>
        {REQ_STATUS_ORDER.map(k=>{
          const st=REQ_STATUS[k], on=status===k
          return (
            <button key={k} type="button" onClick={()=>setStatus(k)} title={st.desc}
              className="btn"
              style={{textAlign:'left',lineHeight:1.35,padding:'9px 12px',
                background:on?st.color:'transparent', color:on?'#fff':'var(--ink)',
                borderColor:on?st.color:'var(--line)'}}>
              <b style={{fontVariantNumeric:'tabular-nums'}}>{st.code}</b> — {st.label}
            </button>
          )
        })}
      </div>
      {status && <p style={{fontSize:12,color:'var(--ink-faint)',margin:'6px 0 0',lineHeight:1.5}}>{REQ_STATUS[status].desc}</p>}

      <label className="form-label" style={{marginTop:12}}>
        เหตุผลประกอบสถานะ {needReason
          ? <span style={{color:'var(--bad)'}}>*</span>
          : <span style={{color:'var(--ink-faint)',fontWeight:400}}>(ไม่บังคับ)</span>}
      </label>
      <textarea className="form-input" rows={2} value={reason} onChange={e=>setReason(e.target.value)}
        placeholder={needReason
          ? 'ระบุเหตุผลที่จัดเป็นสถานะนี้ เช่น เป็นบทนิยาม ไม่มีหน้าที่ต้องปฏิบัติ / องค์กรไม่มีกิจกรรมที่เข้าข่าย'
          : 'บันทึกเพิ่มเติมประกอบผลการประเมิน (ถ้ามี)'}/>
      {needReason && !reason.trim() &&
        <p style={{fontSize:12,color:'var(--bad)',margin:'4px 0 0'}}>สถานะนี้ต้องระบุเหตุผลประกอบก่อนจึงจะบันทึกได้</p>}

      {nc && (
        <div style={{marginTop:12,padding:'12px 14px',background:'var(--bad-bg,rgba(180,85,63,.06))',border:'1px solid color-mix(in srgb,var(--bad) 25%,transparent)',borderRadius:9}}>
          <label className="form-label">แผนปรับปรุง <span style={{color:'var(--bad)'}}>*</span></label>
          <textarea className="form-input" rows={2} placeholder="แนวทาง/แผนการแก้ไขให้สอดคล้อง…" value={plan} onChange={e=>setPlan(e.target.value)}/>
          <label className="form-label">มาตรการจัดการ</label>
          <textarea className="form-input" rows={2} placeholder="มาตรการควบคุม/ป้องกันระหว่างดำเนินการ…" value={measure} onChange={e=>setMeasure(e.target.value)}/>
          <label className="form-label">วันกำหนดทวนสอบ <span style={{color:'var(--bad)'}}>*</span></label>
          <input className="form-input" type="date" value={reverify} onChange={e=>setReverify(e.target.value)}/>
        </div>
      )}

      <label className="form-label" style={{marginTop:12}}>เอกสารประกอบการประเมิน</label>
      {law?.id
        ? <Attachments refType="assess" refId={law.id}/>
        : <p style={{fontSize:12,color:'var(--ink-faint)'}}>บันทึกรายการก่อน จึงจะแนบไฟล์ได้</p>}

      <div className="modal-foot" style={{marginTop:14,paddingRight:0}}>
        {onCancel && <button className="btn btn-ghost" onClick={onCancel}>ยกเลิก</button>}
        <button className="btn btn-primary" disabled={!valid||saving} onClick={submit}>
          {saving ? 'กำลังบันทึก…' : <><I n="check"/>บันทึกผลประเมิน</>}
        </button>
      </div>
    </div>
  )
}
