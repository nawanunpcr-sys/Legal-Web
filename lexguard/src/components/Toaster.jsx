import { useEffect, useState } from 'react'
import { subscribeToasts } from '../lib/toast.js'

const ICON = { success: '✓', error: '✕', info: 'ℹ' }

export default function Toaster() {
  const [items, setItems] = useState([])
  useEffect(() => subscribeToasts(ev => {
    if (ev.type === 'add') setItems(p => [...p, ev.t])
    else setItems(p => p.filter(t => t.id !== ev.id))
  }), [])
  return (
    <div className="toaster" role="status" aria-live="polite">
      {items.map(t => (
        <div key={t.id} className={'toast toast-' + t.type}>
          <span className="toast-ic" aria-hidden>{ICON[t.type] || ICON.info}</span>
          <span className="toast-msg">{t.message}</span>
        </div>
      ))}
    </div>
  )
}
