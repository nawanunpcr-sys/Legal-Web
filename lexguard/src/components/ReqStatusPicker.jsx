// P21 · ตัวเลือกสถานะการประเมิน 4 สถานะ + ช่องเหตุผล — ใช้ร่วมกันทุกที่ที่ให้ผู้ใช้ตัดสินสถานะ
//
// ทำไมต้องเป็น component เดียว: ก่อนหน้านี้ปุ่มเลือกสถานะถูกเขียนซ้ำ 3 ที่
// (AddLawFlow · LawDrawer ฟอร์มข้อใหม่ · LawDrawer ปุ่มสลับรายข้อ) ด้วยรหัสย่อและกติกาคนละชุด
// พอเพิ่มจาก 2 เป็น 4 สถานะ และมีกติกา "บังคับเหตุผล" เข้ามา การเขียนซ้ำจะทำให้
// บางทางเข้าบังคับ บางทางไม่บังคับ ซึ่งแปลว่าด่านฝั่งหน้าจอมีรูโดยที่ไม่มีใครเห็น
//
// ปุ่มแสดงทั้งรหัสย่อและชื่อไทยเสมอ ("C — สอดคล้อง") และไม่ใช้สีเป็นตัวสื่อความหมายเพียงอย่างเดียว
import { REQ_STATUS, REQ_STATUS_ORDER, reasonRequired } from '../lib/supabase.js'

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
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
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
