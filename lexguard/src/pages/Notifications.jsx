// Notifications page — the in-app notification center.
// Moved verbatim from App.jsx (pure refactor).
import { useState, useMemo } from 'react'

const NOTIF_META = {
  bad:       { label:'ไม่สอดคล้อง',    icon:'alert',    bg:'var(--bad-bg)',    fg:'var(--bad)'    },
  review:    { label:'ครบกำหนดทบทวน', icon:'clock',    bg:'var(--review-bg)', fg:'var(--review)' },
  comm:      { label:'กำหนดสื่อสาร',   icon:'chat',     bg:'var(--brand-tint)',fg:'var(--brand)'  },
  submitted: { label:'ส่งเรียบร้อย',   icon:'check',    bg:'var(--ok-bg)',     fg:'var(--ok)'     },
  law_update:{ label:'กฎหมายใหม่',     icon:'spark',    bg:'var(--brand-tint)',fg:'var(--brand)'  },
  report_jorpor: { label:'รายงาน จป.ว',   icon:'clock', bg:'var(--review-bg)', fg:'var(--review)' },
  effective_soon:{ label:'จะบังคับใช้',    icon:'clock', bg:'var(--review-bg)', fg:'var(--review)' },
  training:      { label:'อบรม จป.',       icon:'spark', bg:'var(--review-bg)', fg:'var(--review)' },
  report_law:    { label:'ส่งรายงานราชการ', icon:'clock', bg:'var(--review-bg)', fg:'var(--review)' },
  search_missing:{ label:'ค้นหากฎหมาย',    icon:'search', bg:'var(--review-bg)', fg:'var(--review)' },
}
export default function NotificationsPage({ notifs, onOpenLaw, onGoToView }) {
  const [filter, setFilter] = useState('all')
  const counts = useMemo(()=>({
    all: notifs.length,
    bad: notifs.filter(n=>n.type==='bad').length,
    review: notifs.filter(n=>n.type==='review').length,
    comm: notifs.filter(n=>n.type==='comm').length,
    submitted: notifs.filter(n=>n.type==='submitted').length,
  }), [notifs])
  const filtered = filter==='all' ? notifs : notifs.filter(n=>n.type===filter)

  if (notifs.length===0) return (
    <div className="view">
      <div className="panel notif-empty">
        <div className="notif-empty-ic" style={{fontSize:22}}>✓</div>
        <div style={{fontSize:16,fontWeight:600,marginBottom:6}}>ไม่มีการแจ้งเตือน</div>
        <div style={{fontSize:13,color:'var(--ink-faint)'}}>ระบบจะแจ้งเตือนเมื่อมีข้อกำหนดที่ต้องติดตามหรือกำหนดการที่ใกล้ครบ</div>
      </div>
    </div>
  )

  return (
    <div className="view">
      <div className="filterbar">
        {[['all','ทั้งหมด'],['bad','ไม่สอดคล้อง'],['review','ครบกำหนดทบทวน'],['comm','กำหนดสื่อสาร'],['submitted','ส่งแล้ว']]
          .filter(([k])=>k==='all'||counts[k]>0)
          .map(([k,lbl])=>{
            const m=NOTIF_META[k]
            return (
              <span key={k} className={'chip'+(filter===k?' active':'')}
                onClick={()=>setFilter(k)}
                style={filter===k&&k!=='all'?{background:m?.fg,color:'#fff',borderColor:m?.fg}:{}}>
                {lbl} ({k==='all'?counts.all:counts[k]})
              </span>
            )
          })}
      </div>
      <div className="notif-list">
        {filtered.map((n,i)=>{
          const m=NOTIF_META[n.type]||{label:n.type,icon:'info',bg:'var(--brand-tint)',fg:'var(--brand)'}
          return (
            <div key={i} className="notif-card" onClick={()=>{ if(n.law) onOpenLaw(n.law); else if(n.comm) onGoToView('comm'); else if(n.goView) onGoToView(n.goView); else if(n.link) window.open(n.link,'_blank','noreferrer') }}>
              <div className="notif-ico" style={{background:m.fg}}/>
              <div className="notif-body">
                <div className="notif-title">{n.text}</div>
                <div className="notif-sub">{n.sub}</div>
                {n.type==='review'&&n.days!==undefined&&<div style={{marginTop:4,fontSize:11.5,color:'var(--review)',fontWeight:600}}>เหลือเวลา {n.days} วัน</div>}
                {n.type==='report_law'&&n.days!==undefined&&<div style={{marginTop:4,fontSize:11.5,color:n.days<15?'var(--bad)':'var(--review)',fontWeight:600}}>เหลืออีก {n.days} วัน</div>}
                {n.type==='bad'&&<div style={{marginTop:4,fontSize:11.5,color:'var(--bad)',fontWeight:600}}>คลิกเพื่อดูข้อกำหนดและแก้ไข →</div>}
              </div>
              <span className="notif-badge" style={{background:m.bg,color:m.fg}}>{m.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
