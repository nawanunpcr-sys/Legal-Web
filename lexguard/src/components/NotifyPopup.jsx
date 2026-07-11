import { useEffect } from 'react'
import { I } from './icons.jsx'

export function notifUrgency(n) {
  if (n.type === 'bad') return 'red'
  if (typeof n.days === 'number') {
    if (n.days < 0) return 'red'
    if (n.days <= 7) return 'orange'
  }
  return 'blue'
}

// Date-driven overdue only (excludes plain non-compliant laws, which have no due date) —
// used to decide whether to bypass the once-a-day popup throttle.
export function isOverdueItem(n) {
  if (typeof n.days === 'number') return n.days < 0
  return n.type === 'bad' && n.goView === 'reports'
}

const URGENCY_COLOR = { red: 'var(--bad)', orange: 'var(--review)', blue: 'var(--accent)' }

function notifIcon(n) {
  if (n.type === 'law_update' || n.type === 'training') return 'spark'
  if (n.type === 'comm') return 'chat'
  if (n.type === 'report_jorpor' || n.type === 'effective_soon') return 'clock'
  if (n.type === 'bad' && n.goView === 'reports') return 'inbox'
  return 'alert'
}

export default function NotifyPopup({ notifs, onClose, onOpenLaw, onGoToView }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  function goTo(n) {
    if (n.law) onOpenLaw(n.law)
    else if (n.comm) onGoToView('comm')
    else if (n.goView) onGoToView(n.goView)
    onClose()
  }

  const shown = notifs.slice(0, 6)

  return (
    <>
      <div className="scrim notify-popup-scrim" onClick={onClose} />
      <div className="notify-popup" role="dialog" aria-modal="true">
        <div className="modal-head">
          <h3>🔔 รายการที่ต้องติดตาม{notifs.length > 0 && <span className="np-count">{notifs.length}</span>}</h3>
          <button className="close" onClick={onClose} aria-label="ปิด"><I n="x" /></button>
        </div>
        <div className="modal-body np-body">
          {shown.map((n, i) => {
            const u = notifUrgency(n)
            return (
              <div key={i} className="np-row" style={{ borderLeftColor: URGENCY_COLOR[u] }} onClick={() => goTo(n)}>
                <span className="np-ic" style={{ color: URGENCY_COLOR[u] }}><I n={notifIcon(n)} /></span>
                <div className="np-text">
                  <div className="np-main">{n.text}</div>
                  <div className="np-sub">{n.sub}</div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>ปิด</button>
          <button className="btn btn-primary" onClick={() => { onGoToView('notifications'); onClose() }}>ดูทั้งหมด</button>
        </div>
      </div>
    </>
  )
}
