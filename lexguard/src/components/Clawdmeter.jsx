import { useEffect, useRef, useState } from 'react'

// Clawdmeter — a floating desk-gadget-style widget showing real Claude usage.
// Mirrors the hardware device: a dark rounded screen in a white bezel with two
// windows (Current 5-hour block · Weekly) and a live "resets in" countdown.
// Data comes from the dev-only /api/usage route, so App.jsx mounts this behind
// import.meta.env.DEV and the whole widget is tree-shaken out of the production
// bundle. The `gone` state below is the in-dev fallback for when that route
// errors out (e.g. ccusage unavailable).

const POLL_MS = 60_000

// "1h 32m" / "4d 8h" — compact, matches the device
function until(iso){
  if(!iso) return '—'
  let ms = new Date(iso).getTime() - Date.now()
  if(ms <= 0) return 'now'
  const d = Math.floor(ms / 864e5); ms -= d * 864e5
  const h = Math.floor(ms / 36e5);  ms -= h * 36e5
  const m = Math.floor(ms / 6e4)
  if(d) return `${d}d ${h}h`
  if(h) return `${h}h ${m}m`
  return `${m}m`
}

function Meter({ label, row }){
  if(!row) return null
  return (
    <div className="clawd-row">
      <div className="clawd-row-top">
        <span className="clawd-pct">{row.pct}%</span>
        <span className="clawd-reset">Resets in {until(row.resetAt)}</span>
      </div>
      <div className="clawd-bar"><i style={{ width: `${row.pct}%` }} /></div>
      <div className="clawd-row-bot">
        <span className="clawd-label">{label}</span>
        <span className="clawd-cost">${row.costUSD}</span>
      </div>
    </div>
  )
}

export default function Clawdmeter(){
  const [data, setData] = useState(null)
  const [gone, setGone] = useState(false)          // route missing → hide entirely
  const [open, setOpen] = useState(() => { try{ return localStorage.getItem('clawd_open') !== '0' }catch{ return true } })
  const [, tick] = useState(0)                     // 1s re-render for the countdown
  const timer = useRef()

  async function load(){
    try{
      const r = await fetch('/api/usage', { cache: 'no-store' })
      if(!r.ok) throw new Error('no route')
      const j = await r.json()
      if(!j?.ok) throw new Error(j?.error || 'bad data')
      setData(j); setGone(false)
    }catch{
      // if we never got data, assume the endpoint isn't available here
      setData(d => { if(!d) setGone(true); return d })
    }
  }

  useEffect(() => { load(); const iv = setInterval(load, POLL_MS); return () => clearInterval(iv) }, [])
  useEffect(() => { timer.current = setInterval(() => tick(t => t + 1), 1000); return () => clearInterval(timer.current) }, [])
  useEffect(() => { try{ localStorage.setItem('clawd_open', open ? '1' : '0') }catch{} }, [open])

  if(gone) return null

  if(!open) return (
    <button className="clawd-fab" title="เปิด Clawdmeter" onClick={() => setOpen(true)}>
      <ChatIcon/>{data && <b>{data.current.pct}%</b>}
    </button>
  )

  return (
    <div className="clawd-wrap">
      <div className="clawd-bezel">
        <div className="clawd-screen">
          <div className="clawd-head">
            <span className="clawd-title"><ChatIcon/> Usage</span>
            <button className="clawd-x" title="ย่อ" onClick={() => setOpen(false)}>×</button>
          </div>

          {data ? (
            <>
              <Meter label="Current" row={data.current} />
              <Meter label="Weekly"  row={data.weekly} />
              <div className="clawd-foot">
                <span className="clawd-dot" />{data.status}
                {data.model && <em>{data.model.replace('claude-', '')}</em>}
              </div>
            </>
          ) : (
            <div className="clawd-loading">กำลังอ่าน usage…</div>
          )}
        </div>
      </div>
    </div>
  )
}

function ChatIcon(){
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9A1.5 1.5 0 0 1 18.5 16H9l-4 4v-4H5.5A1.5 1.5 0 0 1 4 14.5v-9Z"
        fill="currentColor"/>
    </svg>
  )
}
