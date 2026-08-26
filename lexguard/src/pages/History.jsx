// P10 · Task 5 — ประวัติการทำรายการ (Activity Log) แยกตามหมวด LA–LG.
// คลิกกฎหมาย → เห็น timeline ว่ากฎหมายตัวนี้ทำอะไรไปบ้าง เมื่อไหร่ โดยใคร.
import { useState, useMemo } from 'react'
import { Tag, thDate, TH_MONTHS } from '../lib/ui.jsx'
import { I } from '../components/icons.jsx'
import { buildMonthlyReport } from '../components/PdfExport.jsx'
import { useAuth } from '../lib/auth.js'

const ACT_META = {
  create:      { t:'เพิ่มใหม่',      c:'var(--ok)'     },
  register:    { t:'เพิ่มเข้าทะเบียน', c:'var(--ok)'    },
  import:      { t:'นำเข้า (AI)',     c:'var(--brand)'  },
  monitor:     { t:'เปิดทวนสอบ',      c:'var(--brand)'  },
  assess:      { t:'ประเมิน',         c:'var(--review)' },
  plan:        { t:'สร้างแผน',        c:'var(--warn)'   },
  plan_close:  { t:'ปิดแผน',          c:'var(--ok)'     },
  repeal:      { t:'ยกเลิก',          c:'var(--bad)'    },
  restore:     { t:'กู้คืน',           c:'var(--review)' },
  requirement: { t:'แก้สถานะ',        c:'var(--warn)'   },
  verify:      { t:'ตรวจทาน',         c:'var(--brand)'  },
  screen:      { t:'คัดกรอง',         c:'var(--review)' },
  assign:      { t:'มอบหมาย',         c:'var(--review)' },
  finalize:    { t:'ยืนยันสมบูรณ์',    c:'var(--ok)'     },
  duplicate_override: { t:'ยืนยันเพิ่มซ้ำ', c:'var(--review)' },
}
const hhmm = s => { const d=new Date(s); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0') }

function LawTimeline({ items }) {
  return (
    <div style={{padding:'6px 8px 12px 30px'}}>
      {items.length===0 && <div style={{fontSize:12.5,color:'var(--ink-faint)'}}>ยังไม่มีประวัติสำหรับกฎหมายนี้</div>}
      {items.map(a=>{ const m=ACT_META[a.action]||{t:a.action,c:'var(--ink-faint)'}
        return (
          <div key={a.id} className="tl-row" style={{cursor:'default'}}>
            <span className="tl-tag" style={{background:m.c}}>{m.t}</span>
            <span className="num" style={{fontSize:11,color:'var(--ink-faint)',minWidth:96}}>{thDate(a.created_at)} {hhmm(a.created_at)}</span>
            <span style={{flex:1,fontSize:12.5}}>{a.detail||a.law_name}</span>
            {a.actor && <span className="tag" title="ผู้ทำรายการ">{a.actor}</span>}
          </div>
        )})}
    </div>
  )
}

export default function History({ activity = [], laws = [], catMap = {}, settings = {}, workflowRows = [], searchLog = [] }) {
  const { can } = useAuth()
  const [cat, setCat] = useState('all')
  const [openId, setOpenId] = useState(null)
  const now = new Date()
  const [pmonth, setPmonth] = useState(now.getMonth() + 1)
  const [pyear, setPyear] = useState(now.getFullYear())

  const years = useMemo(() => {
    const ys = new Set([now.getFullYear()])
    activity.forEach(a => { const y = new Date(a.created_at).getFullYear(); if (!isNaN(y)) ys.add(y) })
    return [...ys].sort((a, b) => b - a)
  }, [activity])   // eslint-disable-line react-hooks/exhaustive-deps

  function exportPdf() {
    const catName = Object.fromEntries(Object.entries(catMap).map(([k, v]) => [k, v?.name || k]))
    buildMonthlyReport({ month: pmonth, year: pyear, settings, activity, workflowRows, searchLog, laws, catName, issuer: settings.user_name })
    setTimeout(() => window.print(), 80)
  }

  const lawMap = useMemo(()=>Object.fromEntries(laws.map(l=>[l.id,l])),[laws])
  // law_id → activity[] (เรียงใหม่→เก่า)
  const byLaw = useMemo(()=>{
    const g={}
    activity.forEach(a=>{ if(a.law_id==null) return; (g[a.law_id]=g[a.law_id]||[]).push(a) })
    Object.values(g).forEach(arr=>arr.sort((x,y)=>new Date(y.created_at)-new Date(x.created_at)))
    return g
  },[activity])

  // กฎหมายที่มีประวัติ จัดกลุ่มตามหมวด
  const rows = useMemo(()=>Object.keys(byLaw)
    .map(id=>lawMap[id]).filter(Boolean)
    .filter(l=>cat==='all'||l.cat===cat)
    .map(l=>({ law:l, items:byLaw[l.id], last:byLaw[l.id][0]?.created_at }))
    .sort((a,b)=>new Date(b.last)-new Date(a.last))
  ,[byLaw,lawMap,cat])

  const cats = useMemo(()=>[...new Set(Object.keys(byLaw).map(id=>lawMap[id]?.cat).filter(Boolean))].sort(),[byLaw,lawMap])

  return (
    <div className="view">
      <div className="panel" style={{padding:'12px 16px',marginBottom:14,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
        <span style={{fontSize:13,fontWeight:600}}>สรุปประจำเดือน (PDF)</span>
        <select className="form-input" style={{maxWidth:130,margin:0,padding:'5px 8px'}} value={pmonth} onChange={e=>setPmonth(+e.target.value)}>
          {TH_MONTHS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
        </select>
        <select className="form-input" style={{maxWidth:110,margin:0,padding:'5px 8px'}} value={pyear} onChange={e=>setPyear(+e.target.value)}>
          {years.map(y=><option key={y} value={y}>ปี {y+543}</option>)}
        </select>
        <button className="btn btn-primary" style={{marginLeft:'auto'}} onClick={exportPdf}><I n="download"/>Export สรุปประจำเดือน</button>
      </div>
      <div className="filterbar">
        <span className={'chip'+(cat==='all'?' active':'')} onClick={()=>setCat('all')}>ทุกหมวด</span>
        {cats.map(c=><span key={c} className={'chip'+(cat===c?' active':'')} onClick={()=>setCat(c)}>{c} — {catMap[c]?.name}</span>)}
        <span style={{marginLeft:'auto',fontSize:12.5,color:'var(--ink-faint)'}}>{rows.length} ฉบับมีประวัติ</span>
      </div>

      <div className="panel">
        <div className="panel-b">
          {rows.length===0 && <div style={{textAlign:'center',color:'var(--ink-faint)',padding:32,fontSize:13}}>ยังไม่มีประวัติในหมวดนี้</div>}
          {rows.map(({law,items,last})=>{
            const open = openId===law.id
            return (
              <div key={law.id} style={{borderBottom:'1px solid var(--line-soft)'}}>
                <div style={{display:'flex',alignItems:'center',gap:10,padding:'11px 6px',cursor:'pointer'}} onClick={()=>setOpenId(open?null:law.id)}>
                  <span style={{color:'var(--ink-faint)',width:14}}>{open?'▾':'▸'}</span>
                  <Tag c={law.cat} color={catMap[law.cat]?.color}/>
                  <span className="law-code">{law.code}</span>
                  <span style={{flex:1,fontSize:13}}>{(law.name||'').slice(0,66)}</span>
                  <span className="pill" style={{fontSize:11,background:'var(--grayfill)',color:'var(--ink-soft)'}}>{items.length} รายการ</span>
                  <span className="sub" style={{whiteSpace:'nowrap',minWidth:80,textAlign:'right'}}>{thDate(last)}</span>
                </div>
                {open && <LawTimeline items={items}/>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
