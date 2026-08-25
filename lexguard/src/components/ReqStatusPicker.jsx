// P21 · ตัวเลือกสถานะการประเมิน 4 สถานะ + ช่องเหตุผล — ใช้ร่วมกันทุกที่ที่ให้ผู้ใช้ตัดสินสถานะ
//
// ทำไมต้องเป็น component เดียว: ก่อนหน้านี้ปุ่มเลือกสถานะถูกเขียนซ้ำ 3 ที่
// (AddLawFlow · LawDrawer ฟอร์มข้อใหม่ · LawDrawer ปุ่มสลับรายข้อ) ด้วยรหัสย่อและกติกาคนละชุด
// พอเพิ่มจาก 2 เป็น 4 สถานะ และมีกติกา "บังคับเหตุผล" เข้ามา การเขียนซ้ำจะทำให้
// บางทางเข้าบังคับ บางทางไม่บังคับ ซึ่งแปลว่าด่านฝั่งหน้าจอมีรูโดยที่ไม่มีใครเห็น
//
// ปุ่มแสดงทั้งรหัสย่อและชื่อไทยเสมอ ("C — สอดคล้อง") และไม่ใช้สีเป็นตัวสื่อความหมายเพียงอย่างเดียว
import { useState } from 'react'
import { REQ_STATUS, REQ_STATUS_ORDER, reasonRequired, ASSESS_CRITERIA } from '../lib/supabase.js'

/* P22 ขั้นที่ 3 · เกณฑ์ตัดสิน 4 สถานะ — แสดงได้ทุกจุดที่มีการประเมิน
   ผู้ประเมิน 5 ท่านให้ผลต่างกันเพราะแต่ละคนใช้นิยามของตัวเอง ปุ่มนี้ทำให้ทุกคน
   อ่านนิยามชุดเดียวกันได้ ณ จุดที่กำลังตัดสิน ไม่ใช่ในคู่มือที่ไม่มีใครเปิด */
export function CriteriaHint({ compact = false }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(o => !o)}
        title="ดูเกณฑ์ตัดสิน 4 สถานะ"
        style={{ border: '1px solid var(--line)', background: 'none', borderRadius: 999, width: 18, height: 18,
          fontSize: 11, lineHeight: 1, cursor: 'pointer', color: 'var(--ink-faint)', padding: 0, flexShrink: 0 }}>i</button>
      {open && (
        <div style={{ marginTop: 8, padding: '11px 13px', borderRadius: 8, background: 'var(--surface-2)',
          border: '1px solid var(--line)', fontSize: compact ? 11.5 : 12, lineHeight: 1.7, width: '100%' }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>เกณฑ์ตัดสิน 4 สถานะ — ใช้ชุดเดียวกันทุกคน</div>
          {ASSESS_CRITERIA.map(c => (
            <div key={c.key} style={{ marginBottom: 7 }}>
              <b>{c.code} — {c.label}</b>: {c.rule}
              <div style={{ color: 'var(--ink-faint)' }}>{c.detail}</div>
            </div>
          ))}
          <div style={{ color: 'var(--ink-faint)', borderTop: '1px solid var(--line-soft)', paddingTop: 6 }}>
            อัตราความสอดคล้องคิดจากฐาน C + NC เท่านั้น — Ack และ ไม่เกี่ยวข้อง ไม่ถูกนับในตัวหาร
          </div>
        </div>
      )}
    </>
  )
}

export default function ReqStatusPicker({
  value,                 // 'met' | 'unmet' | 'acknowledged' | 'not_applicable' | 'waiting' | null
  reason = '',
  onChange,              // (nextStatus) => void
  onReasonChange,        // (nextReason) => void
  allowWaiting = false,  // แสดงตัวเลือก "รอผู้เกี่ยวข้องประเมิน" ด้วยหรือไม่
  disabled = false,
  showDesc = true,
}) {
  const needReason = reasonRequired(value)
  return (
    <div style={{display:'flex',flexDirection:'column',gap:7}}>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
        <CriteriaHint compact/>
        {REQ_STATUS_ORDER.map(k => (
          <button key={k} type="button" disabled={disabled} title={REQ_STATUS[k].desc}
            className={`req-choice ${k}${value === k ? ' on' : ''}`}
            onClick={() => onChange(k)}>
            {REQ_STATUS[k].code} — {REQ_STATUS[k].label}
          </button>
        ))}
        {allowWaiting && (
          <button type="button" disabled={disabled}
            title="ยังไม่ตัดสินความสอดคล้อง — ไม่ถูกนับในอัตราความสอดคล้อง"
            className={`req-choice wait${value === 'waiting' ? ' on' : ''}`}
            onClick={() => onChange('waiting')}>
            รอผู้เกี่ยวข้องประเมิน
          </button>
        )}
      </div>

      {showDesc && REQ_STATUS[value] &&
        <p style={{fontSize:11.5,color:'var(--ink-faint)',margin:0,lineHeight:1.5}}>{REQ_STATUS[value].desc}</p>}

      {REQ_STATUS[value] && onReasonChange && (
        <div>
          <textarea className="form-input" rows={2} disabled={disabled} value={reason}
            onChange={e => onReasonChange(e.target.value)}
            placeholder={needReason
              ? 'เหตุผลประกอบสถานะ (บังคับ) — เช่น เป็นบทนิยาม ไม่มีหน้าที่ต้องปฏิบัติ / องค์กรไม่มีกิจกรรมที่เข้าข่าย'
              : 'เหตุผลประกอบสถานะ (ไม่บังคับ)'}/>
          {needReason && !reason.trim() &&
            <p style={{fontSize:11.5,color:'var(--bad)',margin:'3px 0 0'}}>
              สถานะ "{REQ_STATUS[value].label}" ต้องระบุเหตุผลประกอบก่อนจึงจะบันทึกได้
            </p>}
        </div>
      )}
    </div>
  )
}
