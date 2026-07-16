// Shared Process 2 form (ผู้ประเมิน) — reused by BOTH Workflow A and Workflow B.
// Result สอดคล้อง/ไม่สอดคล้อง (+ หลักฐานแนบ); ถ้า ไม่สอดคล้อง ต้องกรอกแผนปรับปรุง /
// มาตรการจัดการ / วันกำหนดทวนสอบ.
import { useState } from 'react'
import Attachments from './Attachments.jsx'
import { I } from './icons.jsx'

export default function AssessForm({ law, suggest = {}, onSubmit, onCancel }) {
  const [assessor, setAssessor] = useState('')
  const [result, setResult]     = useState('')      // 'สอดคล้อง' | 'ไม่สอดคล้อง'
  const [plan, setPlan]         = useState('')
  const [measure, setMeasure]   = useState('')
  const [reverify, setReverify] = useState('')
  const [saving, setSaving]     = useState(false)

  const nc = result === 'ไม่สอดคล้อง'
  const valid = assessor.trim() && result && (!nc || (plan.trim() && reverify))

  async function submit() {
    if (!valid || saving) return
    setSaving(true)
    try { await onSubmit({ assessorName: assessor.trim(), result, plan: plan.trim(), measure: measure.trim(), reverifyDate: reverify }) }
    finally { setSaving(false) }
  }

  const now = new Date()
  const nowLabel = now.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
        <div>
          <label className="form-label">ผู้ประเมิน <span style={{color:'var(--bad)'}}>*</span></label>
          <input className="form-input" list="assessor-list" placeholder="เลือกหรือพิมพ์ชื่อ…"
            value={assessor} onChange={e=>setAssessor(e.target.value)}/>
          <datalist id="assessor-list">{(suggest.responsibles||[]).map((r,i)=><option key={i} value={r}/>)}</datalist>
        </div>
        <div>
          <label className="form-label">วันที่ประเมิน</label>
          <input className="form-input" type="text" value={nowLabel} readOnly disabled title="บันทึกเวลาจริงอัตโนมัติ"/>
        </div>
      </div>

      <label className="form-label" style={{marginTop:10}}>ผลการทวนสอบต่อข้อกำหนด <span style={{color:'var(--bad)'}}>*</span></label>
      <div style={{display:'flex',gap:10}}>
        {['สอดคล้อง','ไม่สอดคล้อง'].map(r=>(
          <button key={r} type="button" onClick={()=>setResult(r)}
            className={'btn '+(result===r?(r==='สอดคล้อง'?'btn-primary':'btn-danger'):'btn-ghost')}
            style={{flex:1, ...(result===r&&r==='ไม่สอดคล้อง'?{background:'var(--bad)',color:'#fff',borderColor:'var(--bad)'}:{})}}>
            {r==='สอดคล้อง'?'✓ สอดคล้อง (C)':'● ไม่สอดคล้อง (NC)'}
          </button>
        ))}
      </div>

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
