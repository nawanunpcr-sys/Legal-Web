import { useEffect, useState } from 'react'
import { subscribeToasts } from '../lib/toast.js'

export default function Toaster() {
  const [items, setItems] = useState([])
  useEffect(() => subscribeToasts(ev => {
    if (ev.type === 'add') setItems(p => [...p, ev.t])
    else setItems(p => p.filter(t => t.id !== ev.id))
  }), [])
  return (
    <div className="toaster">
      {items.map(t => <div key={t.id} className={'toast toast-' + t.type}>{t.message}</div>)}
    </div>
  )
}
