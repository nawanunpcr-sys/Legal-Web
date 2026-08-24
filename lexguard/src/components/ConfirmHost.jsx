import { useEffect, useState } from 'react'
import { registerConfirm } from '../lib/confirm.js'

export default function ConfirmHost() {
  const [req, setReq] = useState(null)
  const [text, setText] = useState('')
  useEffect(() => registerConfirm(r => { setText(''); setReq(r) }), [])
  if (!req) return null
  // กล่องแบบมีช่องกรอก คืนข้อความ (หรือ null เมื่อยกเลิก) · กล่องยืนยันธรรมดาคืน true/false
  const close = ok => { req.resolve(req.input ? (ok ? text.trim() : null) : ok); setReq(null) }
  const blocked = !!req.input?.required && !text.trim()
  return (
    <>
      <div className="scrim" style={{ zIndex: 500 }} onClick={() => close(false)} />
      <div className="modal" style={{ zIndex: 501, width: 440, top: '28vh' }}>
        <div className="modal-body" style={{ padding: '24px 24px 8px', fontSize: 14, lineHeight: 1.6 }}>
          {req.message}
          {req.input && (
            <div style={{ marginTop: 14 }}>
              {req.input.label && <label className="form-label">{req.input.label} <span style={{ color: 'var(--bad)' }}>*</span></label>}
              <textarea className="form-input" rows={3} autoFocus value={text}
                placeholder={req.input.placeholder} onChange={e => setText(e.target.value)} />
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={() => close(false)}>ยกเลิก</button>
          <button className={'btn ' + (req.danger ? 'btn-danger' : 'btn-primary')}
            disabled={blocked} onClick={() => close(true)}>{req.okLabel}</button>
        </div>
      </div>
    </>
  )
}
