import { useEffect, useState } from 'react'
import { registerConfirm } from '../lib/confirm.js'

export default function ConfirmHost() {
  const [req, setReq] = useState(null)
  useEffect(() => registerConfirm(setReq), [])
  if (!req) return null
  const close = v => { req.resolve(v); setReq(null) }
  return (
    <>
      <div className="scrim" style={{ zIndex: 500 }} onClick={() => close(false)} />
      <div className="modal" style={{ zIndex: 501, width: 400, top: '30vh' }}>
        <div className="modal-body" style={{ padding: '24px 24px 8px', fontSize: 14, lineHeight: 1.6 }}>{req.message}</div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={() => close(false)}>ยกเลิก</button>
          <button className={'btn ' + (req.danger ? 'btn-danger' : 'btn-primary')} onClick={() => close(true)}>{req.okLabel}</button>
        </div>
      </div>
    </>
  )
}
