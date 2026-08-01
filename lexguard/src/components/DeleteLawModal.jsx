// ยืนยันลบกฎหมายถาวร (ต้องพิมพ์รหัสกฎหมายให้ตรงก่อนปุ่มลบจะ active).
// ใช้ร่วมกันระหว่าง LawDrawer และหน้าทะเบียน (Registry row).
import { useState } from 'react'
import { I } from './icons.jsx'

export default function DeleteLawModal({ law, onConfirm, onClose }) {
  const [typed, setTyped] = useState('')
  const ok = typed.trim() === law.code
  return (
    <>
      <div className="scrim" style={{ zIndex: 400 }} onClick={onClose} />
      <div className="modal" style={{ zIndex: 401, width: 460 }}>
        <div className="modal-head">
          <h3 style={{ color: 'var(--bad)' }}>ลบกฎหมายถาวร?</h3>
          <button className="close" onClick={onClose}><I n="x" /></button>
        </div>
        <div className="modal-body">
          <div className="ai-box" style={{ borderColor: 'var(--bad)', background: 'var(--bad-bg)', marginBottom: 14 }}>
            <span className="ai-tag" style={{ color: 'var(--bad)' }}>คำเตือน</span>
            <p style={{ marginBottom: 0, fontSize: 13 }}>กำลังจะลบ <b>{law.code}</b> — {(law.name || '').slice(0, 80)}<br />
              ข้อมูลข้อปฏิบัติ การประเมิน และประวัติทั้งหมดของกฎหมายนี้จะถูกลบถาวร <b>กู้คืนไม่ได้</b> — หากกฎหมายถูกยกเลิกโดยราชการ ให้ใช้ “ยกเลิกใช้” แทนเพื่อเก็บประวัติตาม ISO 45001</p>
          </div>
          <label className="form-label">พิมพ์รหัสกฎหมาย <b>{law.code}</b> เพื่อยืนยัน</label>
          <input className="form-input" type="text" placeholder={law.code} value={typed} onChange={e => setTyped(e.target.value)} autoFocus />
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-danger" disabled={!ok} title={ok ? '' : 'พิมพ์รหัสให้ตรงก่อน'} onClick={onConfirm}><I n="ban" />ลบถาวร</button>
        </div>
      </div>
    </>
  )
}
