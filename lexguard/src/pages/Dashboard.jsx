// Dashboard page — overview KPIs, ring, category bars, timeline, activity, quarterly chart.
// Includes Ring, CatBars, Timeline, ActivityTimeline, ReportDeadlinesPanel, QuarterlyAddRepealChart.
// Moved verbatim from App.jsx (pure refactor).
import { useState, useMemo } from 'react'
import { StageBar } from '../components/ProcessTracker.jsx'
import { CaseStepper, groupCases, effStatus } from '../components/LawTracker.jsx'
import { Pill, Tag, ActiveBadge, thDate, daysTo, lawBEYear, beYearFromDate, TH_MONTHS, QUARTER_LABEL } from '../lib/ui.jsx'
import { MonthlyCheckPanel } from './Registry.jsx'

/* ─────────────────────────── DASHBOARD ─────────────────────────── */
function Ring({pct,met=0,nc=0}){
  const r=62, c=2*Math.PI*r
  const req = met+nc
  const metFrac = req? met/req : 1
  const ncFrac  = req? nc/req  : 0
  const gap = req && nc>0 ? 3 : 0
  const [hover,setHover]=useState(null)
  const fmt = n => Number.isInteger(n)?n:n.toFixed(1)
  const center =
    hover==='met' ? {big:met, lab:'ข้อสอดคล้อง', col:'var(--ok)'} :
    hover==='nc'  ? {big:nc,  lab:'ยังไม่สอดคล้อง', col:'var(--bad)'} :
                    {big:fmt(pct)+'%', lab:'สอดคล้อง', col:'var(--ok)'}
  return <div className="ring">
    <svg width="150" height="150" viewBox="0 0 150 150">
      <circle cx="75" cy="75" r={r} fill="none" stroke="var(--ring-track,rgba(255,255,255,.14))" strokeWidth="8"/>
      <circle cx="75" cy="75" r={r} fill="none" stroke="#34D0A0" strokeLinecap="round"
        strokeWidth={hover==='met'?11:8}
        strokeDasharray={`${Math.max(0,c*metFrac-gap)} ${c}`} strokeDashoffset={0}
        style={{transition:'stroke-dashoffset 1s var(--ease-out), stroke-width .18s',cursor:'pointer'}}
        onMouseEnter={()=>setHover('met')} onMouseLeave={()=>setHover(null)}/>
      {nc>0 && <circle cx="75" cy="75" r={r} fill="none" stroke="#FF8A73" strokeLinecap="round"
        strokeWidth={hover==='nc'?11:8}
        strokeDasharray={`${Math.max(0,c*ncFrac-gap)} ${c}`} strokeDashoffset={-c*metFrac}
        style={{transition:'stroke-dashoffset 1s var(--ease-out), stroke-width .18s',cursor:'pointer'}}
        onMouseEnter={()=>setHover('nc')} onMouseLeave={()=>setHover(null)}/>}
    </svg>
    <div className="center">
      <div className="pct" style={{color:center.col}}>{center.big}</div>
      <div className="pl">{center.lab}</div>
    </div>
  </div>
}
function CatBars({laws,cats}){
  const byCat={}; laws.forEach(l=>{(byCat[l.cat]=byCat[l.cat]||[]).push(l)})
  return <div className="catbars-grid">
    {cats.filter(c=>byCat[c.code]).map(c=>{
      let r=0,m=0; byCat[c.code].forEach(l=>l.reqs.forEach(x=>{r++;if(x.status==='met')m++}))
      const p=r?Math.round(m/r*100):100
      const unmet=r-m
      return <div className="catbar" key={c.code}>
        <div className="top">
          <span className="nm">{c.code} · {c.name}</span>
          <span className="cat-meta">
            {unmet>0
              ? <span className="cat-remain">เหลือ {unmet} ข้อ</span>
              : <span className="cat-done">ครบ {r} ข้อ ✓</span>}
            <b className="num" style={{color:c.color}}>{p}%</b>
          </span>
        </div>
        <div className="track"><div className="fill" style={{width:p+'%',background:`linear-gradient(90deg, ${c.color} 0%, color-mix(in srgb, ${c.color} 88%, #fff) 100%)`}}/></div>
      </div>
    })}
  </div>
}

function Timeline({laws,catMap,onOpen,curBE,fromBE}){
  const [mode,setMode]=useState('added')  // added | repealed | all
  const [openYear,setOpenYear]=useState(null)
  const byYear = useMemo(()=>{
    const ev=[]
    laws.forEach(l=>{
      if(mode!=='repealed' && l.status!=='repealed'){
        const y=lawBEYear(l.issue_date)
        if(y!=null && y>=fromBE) ev.push({year:y, kind:y===curBE?'new':'effective', law:l})
      }
      if(mode!=='added'){
        const ry=beYearFromDate(l.repeal_date)
        if(ry!=null && ry>=fromBE) ev.push({year:ry, kind:'repealed', law:l})
      }
    })
    const g={}; ev.forEach(e=>{(g[e.year]=g[e.year]||[]).push(e)})
    return Object.entries(g).map(([y,items])=>({
      year:+y, items,
      nNew:items.filter(i=>i.kind==='new').length,
      nEff:items.filter(i=>i.kind==='effective').length,
      nRep:items.filter(i=>i.kind==='repealed').length,
    })).sort((a,b)=>b.year-a.year)
  },[laws,fromBE,curBE,mode])

  const KIND={ new:{t:'ใหม่',c:'var(--ok)'}, effective:{t:'บังคับใช้',c:'var(--brand)'}, repealed:{t:'ยกเลิก',c:'var(--bad)'} }
  const totalCount = byYear.reduce((a,y)=>a+y.items.length,0)

  return (
    <div className="panel" style={{marginTop:16}}>
      <div className="panel-h"><h3>ไทม์ไลน์การเปลี่ยนแปลงกฎหมาย (3 ปีย้อนหลัง)</h3>
        <div style={{display:'flex',gap:5,marginLeft:'auto'}}>
          <span className={'chip'+(mode==='added'?' active':'')} onClick={()=>setMode('added')}>กฎหมายที่เพิ่ม/ออกใหม่</span>
          <span className={'chip'+(mode==='repealed'?' active':'')} onClick={()=>setMode('repealed')}>กฎหมายที่ยกเลิก</span>
          <span className={'chip'+(mode==='all'?' active':'')} onClick={()=>setMode('all')}>ทั้งหมด</span>
        </div>
      </div>
      <div className="panel-b">
        <div style={{fontSize:12.5,color:'var(--ink-faint)',marginBottom:12}}>
          {mode==='added'?'กฎหมายที่ออก/บังคับใช้':mode==='repealed'?'กฎหมายที่ยกเลิก':'การเปลี่ยนแปลงทั้งหมด'} · รวม {totalCount} รายการ (แยกตามปี พ.ศ.)
        </div>
        {byYear.length===0 && <div style={{textAlign:'center',color:'var(--ink-faint)',padding:24,fontSize:13}}>ไม่มีรายการในช่วงปีที่เลือก</div>}
        {byYear.map(yr=>{
          const isOpen = (openYear ?? byYear[0]?.year) === yr.year
          return (
          <div key={yr.year} className="tl-year">
            <div className="tl-head" style={{cursor:'pointer'}} onClick={()=>setOpenYear(isOpen?-1:yr.year)}>
              <span className="tl-dot"/>
              <span style={{color:'var(--ink-faint)',width:14}}>{isOpen?'▾':'▸'}</span>
              <b className="num" style={{fontSize:15}}>{yr.year}</b>
              <span className="sub" style={{marginLeft:10}}>
                {yr.nNew>0 && <span style={{color:'var(--ok)'}}>ใหม่ {yr.nNew} · </span>}
                บังคับใช้ {yr.nEff} ฉบับ{yr.nRep>0 && <span style={{color:'var(--bad)'}}> · ยกเลิก {yr.nRep}</span>}
              </span>
            </div>
            {isOpen && (
              <div className="tl-items">
                {yr.items.slice(0,40).map((e,i)=>(
                  <div key={i} className="tl-row" onClick={()=>onOpen(e.law)}>
                    <span className="tl-tag" style={{background:KIND[e.kind].c}}>{KIND[e.kind].t}</span>
                    <span className="law-code" style={{minWidth:58}}>{e.law.code}</span>
                    <span style={{flex:1,fontSize:13}}>{e.law.name.slice(0,80)}{e.law.name.length>80?'…':''}</span>
                    <Tag c={e.law.cat} color={catMap[e.law.cat]?.color}/>
                  </div>
                ))}
              </div>
            )}
          </div>
        )})}
      </div>
    </div>
  )
}

const ACT_META = {
  create:      { t:'เพิ่มใหม่',   c:'var(--ok)'    },
  import:      { t:'นำเข้า (AI)', c:'var(--brand)' },
  repeal:      { t:'ยกเลิก',      c:'var(--bad)'   },
  restore:     { t:'กู้คืน',       c:'var(--review)'},
  requirement: { t:'แก้สถานะ',    c:'var(--warn)'  },
}
function ActivityTimeline({activity,onOpenLaw,lawById}){
  const [showAll,setShowAll]=useState(false)
  const days = useMemo(()=>{
    const g={}
    activity.forEach(a=>{ const d=(a.created_at||'').slice(0,10); (g[d]=g[d]||[]).push(a) })
    return Object.entries(g).sort((a,b)=>b[0].localeCompare(a[0]))
  },[activity])
  const shownDays = showAll ? days : days.slice(0,2)
  const hhmm = s => { const d=new Date(s); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0') }
  return (
    <div className="panel" style={{marginTop:16}}>
      <div className="panel-h"><h3>บันทึกกิจกรรมล่าสุด</h3>
        <span className="sub" style={{marginLeft:'auto'}}>บันทึกอัตโนมัติทุกครั้งที่เพิ่ม / แก้ / ยกเลิก / นำเข้า</span></div>
      <div className="panel-b">
        {days.length===0 && <div style={{textAlign:'center',color:'var(--ink-faint)',padding:24,fontSize:13}}>ยังไม่มีเหตุการณ์ — เมื่อมีการเพิ่ม/แก้/ยกเลิกกฎหมาย จะบันทึกที่นี่พร้อมวันเวลา</div>}
        {shownDays.map(([date,items])=>(
          <div key={date} className="tl-year">
            <div className="tl-head"><span className="tl-dot"/><b style={{fontSize:14}}>{thDate(date)}</b><span className="sub" style={{marginLeft:10}}>{items.length} เหตุการณ์</span></div>
            <div className="tl-items">
              {items.map(a=>{ const m=ACT_META[a.action]||{t:a.action,c:'var(--ink-faint)'}; const law=lawById[a.law_id]
                return (
                  <div key={a.id} className="tl-row" onClick={()=>law&&onOpenLaw(law)}>
                    <span className="tl-tag" style={{background:m.c}}>{m.t}</span>
                    <span className="num" style={{fontSize:11,color:'var(--ink-faint)',minWidth:38}}>{hhmm(a.created_at)}</span>
                    {a.law_code && <span className="law-code" style={{minWidth:58}}>{a.law_code}</span>}
                    <span style={{flex:1,fontSize:13}}>{a.detail||a.law_name}</span>
                  </div>
                )})}
            </div>
          </div>
        ))}
        {days.length>2 && (
          <button className="btn btn-ghost" style={{marginTop:4}} onClick={()=>setShowAll(s=>!s)}>
            {showAll ? 'ย่อ' : `ดูทั้งหมด (${activity.length} เหตุการณ์)`}
          </button>
        )}
      </div>
    </div>
  )
}

function ReportDeadlinesPanel({reports=[],onGoReports,danger=false}){
  const upcoming = useMemo(()=>reports
    .filter(r=>r.next_due_date)
    .map(r=>({...r,d:daysTo(r.next_due_date)}))
    .filter(r=>r.d<0||r.d<=(r.notify_days_before||30))
    .sort((a,b)=>a.d-b.d)
  ,[reports])
  const overdue = upcoming.filter(r=>r.d<0).length
  const soon = upcoming.length - overdue
  const shown = upcoming.slice(0,6)
  const accent = overdue>0 ? 'var(--bad)' : soon>0 ? 'var(--review)' : 'var(--ok)'
  return (
    <div className={'panel'+(danger?' report-alert':'')} style={{marginTop:16, borderTop:'3px solid '+(danger?'var(--bad)':accent)}}>
      <div className="panel-h">
        <h3>{danger && <span className="report-alert-dot">⚠</span>}รายงานที่ต้องส่งให้ราชการ</h3>
        <div style={{display:'flex',gap:6,alignItems:'center',marginLeft:'auto'}}>
          {overdue>0 && <span className="pill p-bad">เกินกำหนด {overdue}</span>}
          {soon>0 && <span className="pill" style={{background:'var(--review-bg)',color:'var(--review)'}}>ใกล้ครบ {soon}</span>}
          <span className="sub" style={{cursor:'pointer',color:'var(--brand)'}} onClick={onGoReports}>ดูทั้งหมด →</span>
        </div>
      </div>
      <div className="panel-b">
        {upcoming.length===0 && <div style={{textAlign:'center',color:'var(--ink-faint)',padding:24,fontSize:13}}>ไม่มีรายงานที่ต้องส่งในช่วงนี้ ✓</div>}
        {shown.map(r=>(
          <div key={r.id} className="tl-row" onClick={onGoReports} style={{padding:'9px 6px'}}>
            <span className="tl-tag" style={{background:r.d<0?'var(--bad)':r.d<=7?'var(--warn)':'var(--review)'}}>
              {r.d<0?'เกิน '+Math.abs(r.d)+' วัน':r.d===0?'วันนี้!':'อีก '+r.d+' วัน'}
            </span>
            {r.law_code && <span className="law-code" style={{minWidth:58}}>{r.law_code}</span>}
            <span style={{flex:1,fontSize:13}}>{r.title.slice(0,60)}{r.title.length>60?'…':''}</span>
            {r.responsible && <span className="tag" title="ผู้รับผิดชอบส่ง">{r.responsible}</span>}
            <span className="sub" style={{whiteSpace:'nowrap'}}>{r.authority?r.authority.slice(0,20)+' · ':''}{thDate(r.next_due_date)}</span>
          </div>
        ))}
        {upcoming.length>shown.length && (
          <div style={{textAlign:'center',marginTop:8}}>
            <span className="sub" style={{cursor:'pointer',color:'var(--brand)'}} onClick={onGoReports}>+ อีก {upcoming.length-shown.length} รายการ</span>
          </div>
        )}
      </div>
    </div>
  )
}

function QuarterlyAddRepealChart({quarterStats,cats,catMap}){
  const toBE = y => y + 543
  const yearOptions = useMemo(()=>{
    const ys = new Set([...quarterStats.map(s=>s.year), new Date().getFullYear()])
    return [...ys].sort((a,b)=>b-a)
  },[quarterStats])
  const [year,setYear] = useState(yearOptions[0] || new Date().getFullYear())

  const {added,repealed,byCat} = useMemo(()=>{
    const added=Array(4).fill(0), repealed=Array(4).fill(0)
    const byCat = {}
    quarterStats.forEach(s=>{
      if(s.year!==year) return
      added[s.quarter-1]+=s.added; repealed[s.quarter-1]+=s.repealed
      const c = byCat[s.cat] = byCat[s.cat] || {added:Array(4).fill(0), repealed:Array(4).fill(0)}
      c.added[s.quarter-1]+=s.added; c.repealed[s.quarter-1]+=s.repealed
    })
    return {added,repealed,byCat}
  },[quarterStats,year])

  const max = Math.max(1, ...added, ...repealed)
  const totalAdded = added.reduce((a,b)=>a+b,0)
  const totalRepealed = repealed.reduce((a,b)=>a+b,0)
  const catRows = cats.filter(c=>byCat[c.code]).map(c=>({c, ...byCat[c.code]}))

  return (
    <div className="panel" style={{marginTop:16}}>
      <div className="panel-h">
        <h3>กฎหมายที่เพิ่ม / ยกเลิก รายไตรมาส</h3>
        <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:'auto'}}>
          <button className="month-yr-btn" onClick={()=>setYear(y=>y-1)}>‹</button>
          <span style={{fontSize:13,fontWeight:600,minWidth:60,textAlign:'center'}} className="num">ปี {toBE(year)}</span>
          <button className="month-yr-btn" onClick={()=>setYear(y=>y+1)}>›</button>
        </div>
      </div>
      <div className="panel-b">
        <div style={{display:'flex',gap:18,marginBottom:16,fontSize:12.5}}>
          <span style={{display:'flex',alignItems:'center',gap:6}}><span className="dot" style={{width:8,height:8,borderRadius:2,background:'var(--chart-add)',display:'inline-block'}}/>เพิ่ม <b className="num" style={{fontSize:15,fontWeight:800,color:'var(--chart-add)'}}>{totalAdded}</b> ฉบับ</span>
          <span style={{display:'flex',alignItems:'center',gap:6}}><span className="dot" style={{width:8,height:8,borderRadius:2,background:'var(--chart-rep)',display:'inline-block'}}/>ยกเลิก <b className="num" style={{fontSize:15,fontWeight:800,color:'var(--chart-rep)'}}>{totalRepealed}</b> ฉบับ</span>
          <span style={{color:'var(--ink-faint)',marginLeft:'auto'}}>ข้อมูลจากทะเบียน F-259 (Excel) — รายไตรมาส</span>
        </div>
        <div className="mchart qchart" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
          {QUARTER_LABEL.map((q,i)=>(
            <div className="mchart-col" key={i}>
              <div className="qbar-vals">
                <span className={'qbar-val qbar-val-add'+(added[i]?'':' qbar-val-zero')}>{added[i]}</span>
                <span className={'qbar-val qbar-val-rep'+(repealed[i]?'':' qbar-val-zero')}>{repealed[i]}</span>
              </div>
              <div className="mchart-bars">
                <div className="mchart-bar mchart-bar-add" style={{height:(added[i]/max*100)+'%'}} title={`เพิ่ม ${added[i]} ฉบับ`}/>
                <div className="mchart-bar mchart-bar-rep" style={{height:(repealed[i]/max*100)+'%'}} title={`ยกเลิก ${repealed[i]} ฉบับ`}/>
              </div>
              <div className="mchart-lab">{q}</div>
            </div>
          ))}
        </div>

        <div className="qsum-grid">
          {QUARTER_LABEL.map((q,i)=>(
            <div className={'qsum-card'+(added[i]||repealed[i]?'':' qsum-card--empty')} key={i}>
              <div className="qsum-q">{q}</div>
              <div className="qsum-pills">
                <span className="qsum-pill qsum-pill--add"><b className="num">{added[i]}</b><small>เพิ่ม</small></span>
                <span className="qsum-pill qsum-pill--rep"><b className="num">{repealed[i]}</b><small>ยกเลิก</small></span>
              </div>
            </div>
          ))}
        </div>

        {catRows.length>0 && (
          <div className="tablewrap" style={{marginTop:18}}>
            <table>
              <thead>
                <tr>
                  <th rowSpan={2}>หมวด</th>
                  <th colSpan={4} style={{textAlign:'center'}}>ยกเลิก (รายไตรมาส)</th>
                  <th colSpan={4} style={{textAlign:'center'}}>มาใหม่ (รายไตรมาส)</th>
                  <th rowSpan={2} style={{textAlign:'center'}}>รวมยกเลิก</th>
                  <th rowSpan={2} style={{textAlign:'center'}}>รวมมาใหม่</th>
                </tr>
                <tr>
                  {QUARTER_LABEL.map(q=><th key={'r'+q} style={{textAlign:'center',fontSize:11}}>{q}</th>)}
                  {QUARTER_LABEL.map(q=><th key={'a'+q} style={{textAlign:'center',fontSize:11}}>{q}</th>)}
                </tr>
              </thead>
              <tbody>
                {catRows.map(({c,added,repealed})=>(
                  <tr key={c.code}>
                    <td><Tag c={c.code} color={catMap[c.code]?.color}/></td>
                    {repealed.map((n,i)=><td key={'r'+i} style={{textAlign:'center',fontWeight:n?700:400,color:n?'var(--bad)':'var(--ink-faint)'}} className="num">{n||'—'}</td>)}
                    {added.map((n,i)=><td key={'a'+i} style={{textAlign:'center',fontWeight:n?700:400,color:n?'var(--ok)':'var(--ink-faint)'}} className="num">{n||'—'}</td>)}
                    <td style={{textAlign:'center',fontWeight:800,fontSize:14,color:'var(--bad)'}} className="num">{repealed.reduce((a,b)=>a+b,0)}</td>
                    <td style={{textAlign:'center',fontWeight:800,fontSize:14,color:'var(--ok)'}} className="num">{added.reduce((a,b)=>a+b,0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {catRows.length===0 && <div style={{textAlign:'center',color:'var(--ink-faint)',padding:20,fontSize:13,marginTop:8}}>ไม่มีรายการในปีที่เลือก</div>}
      </div>
    </div>
  )
}

// กฎหมายใหม่ที่ AI/agent พบ — จัดกลุ่มรายเดือน (จาก lg_law_updates ที่ยัง 'new')
function NewLawsByMonth({updates=[],onGoView}){
  const news=updates.filter(u=>u.status==='new')
  const groups=useMemo(()=>{
    const g={}
    news.forEach(u=>{
      const d=new Date(u.published_date||u.detected_at||Date.now())
      const key=isNaN(d)?'ไม่ระบุเดือน':(TH_MONTHS[d.getMonth()]+' '+(d.getFullYear()+543))
      const sort=isNaN(d)?0:d.getTime()
      ;(g[key]=g[key]||{items:[],sort}).items.push(u)
    })
    return Object.entries(g).sort((a,b)=>b[1].sort-a[1].sort)
  },[news])
  if(news.length===0) return null
  return (
    <div className="panel" style={{borderLeft:'3px solid #0071e3'}}>
      <div className="panel-h">
        <h3>🆕 กฎหมายใหม่ที่พบ (จากการค้นหาอัตโนมัติ)</h3>
        <span className="sub" style={{marginLeft:'auto',color:'var(--brand)',cursor:'pointer'}} onClick={()=>onGoView&&onGoView('staging')}>ไปที่บอร์ด →</span>
      </div>
      <div className="panel-b">
        {groups.map(([month,{items}])=>(
          <div key={month} style={{marginBottom:12}}>
            <div style={{fontSize:12.5,fontWeight:700,color:'var(--brand)',marginBottom:6}}>{month} · {items.length} ฉบับ</div>
            {items.slice(0,8).map(u=>(
              <div key={u.id} style={{display:'flex',gap:8,alignItems:'flex-start',padding:'5px 0',borderBottom:'1px solid var(--line-soft)'}}>
                <span style={{color:'var(--ok)',fontSize:12,marginTop:2}}>●</span>
                <div style={{flex:1,fontSize:12.5,lineHeight:1.5}}>{(u.title||'').slice(0,110)}
                  {u.category_guess && <span className="meta-chip" style={{marginLeft:6}}>{u.category_guess}</span>}
                  {u.source && <span className="sub" style={{marginLeft:6}}>· {u.source}</span>}
                </div>
                {u.source_url && <a href={u.source_url} target="_blank" rel="noreferrer" style={{fontSize:13,textDecoration:'none'}}>📄</a>}
              </div>
            ))}
            {items.length>8 && <div className="sub" style={{marginTop:4}}>และอีก {items.length-8} ฉบับ…</div>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ตัวเลขงานค้างแบบคลิกได้ (0 = จาง ไม่คลิก)
function WlNum({n,cls,onClick}){
  if(!n) return <span style={{color:'var(--ink-faint)'}}>0</span>
  return <span className={'pill '+cls} style={{cursor:'pointer',fontSize:12,padding:'2px 10px'}} onClick={onClick}>{n}</span>
}

export default function Dashboard({laws,cats,catMap,onOpen,updates=[],staging=[],activity=[],quarterStats=[],reports=[],onGoReports,onGoView,processItems=[],rawProcessItems=[],onGoProcess,trackerRows=[],trackerSubs={},onGoTracker,deptWorkload=[],onGoDept,reviewPending=0,monthsData=[],onToggleMonthCur,monthRow,onMarkNoNewLaws,onMarkHasNewLaws}){
  // navigate to the merged registry view in a specific mode (register / compliance)
  const goRegistry = mode => { try{ localStorage.setItem('cr_registry_mode', JSON.stringify(mode)) }catch{} ; onGoView&&onGoView('registry') }
  const trk = useMemo(()=>{
    let overdue=0
    trackerRows.forEach(r=>{ if(effStatus(r)==='overdue')overdue++ })
    return { overdue }
  },[trackerRows])
  const latestCases = useMemo(()=>groupCases(trackerRows).slice(0,3),[trackerRows])
  const subLabel = (stage,code)=>(trackerSubs[stage]||[]).find(x=>x.code===code)?.label||code
  const curBE = new Date().getFullYear()+543
  const tlFromBE = curBE-2   // ไทม์ไลน์: 3 ปีย้อนหลัง

  const active = useMemo(()=>laws.filter(l=>l.status!=='repealed' && l.active!==false),[laws])
  const fLaws  = active   // ใช้อยู่เท่านั้น (ไม่นับ Inactive)

  const stats = useMemo(()=>{
    let req=0,met=0; fLaws.forEach(l=>l.reqs.forEach(r=>{req++;if(r.status==='met')met++}))
    return { total:fLaws.length, req, met, nc:req-met, pct:req?(met/req*100):100 }
  },[fLaws])

  const bad=fLaws.filter(l=>l.status==='bad')
  const newUpdates=updates.filter(u=>u.status==='new')
  const winLabel = 'ทั้งหมด'
  const cards=[
    {cls:'s-total', lab:'กฎหมายทั้งหมด',   val:stats.total, unit:'ฉบับ', delta:cats.length+' หมวด · ดูทะเบียน →', go:()=>goRegistry('register')},
    {cls:'s-bad',   lab:'ยังไม่สอดคล้อง',   val:stats.nc, unit:'ข้อ', delta:'จาก '+stats.req+' ข้อกำหนด →', go:()=>goRegistry('compliance')},
    {cls:'s-bad',   lab:'เกินกำหนด',       val:trk.overdue, unit:'ขั้น', delta:'ต้องเร่งจัดการ →', go:onGoTracker},
    {cls:'s-ok',    lab:'สอดคล้อง',        val:stats.pct.toFixed(1)+'%', unit:'', delta:stats.met+' / '+stats.req+' ข้อ →', go:()=>goRegistry('compliance')},
  ]

  const strip=[
    {val:stats.total.toLocaleString('en-US'), lab:'กฎหมายในทะเบียน (ฉบับ)'},
    {val:String(cats.length),                 lab:'หมวด (LA–LG)'},
    {val:stats.req.toLocaleString('en-US'),   lab:'ข้อกำหนดรายข้อ'},
    {val:stats.pct.toFixed(1)+'%',            lab:'ความสอดคล้อง ('+stats.met+'/'+stats.req+')', accent:true},
  ]

  return <div className="view">
    {reviewPending>0 && (
      <div className="panel" style={{marginBottom:14,padding:'12px 16px',display:'flex',alignItems:'center',gap:12,borderLeft:'3px solid #8e44ad',cursor:'pointer'}}
        onClick={()=>onGoView&&onGoView('staging')}>
        <span style={{fontSize:22}}>🔎</span>
        <div style={{flex:1}}>
          <div style={{fontWeight:600,fontSize:14}}>รอตรวจทาน AI — {reviewPending} รายการ</div>
          <div style={{fontSize:12,color:'var(--ink-faint)'}}>ผลสรุปจาก AI/agent รอ “ผู้ตรวจสอบ” ตรวจทานก่อนเข้าสายงานคัดกรอง</div>
        </div>
        <span className="pill p-warn" style={{fontSize:12}}>{reviewPending}</span>
        <span style={{fontSize:12,color:'var(--brand)',fontWeight:500}}>ไปที่บอร์ด →</span>
      </div>
    )}
    <div className="dash-strip">
      {strip.map((s,i)=>(<div className="dash-strip-cell" key={i}>
        <div className={'dash-strip-val'+(s.accent?' is-accent':'')}>{s.val}</div>
        <div className="dash-strip-lab">{s.lab}</div>
      </div>))}
    </div>

    <div className="dash-hero" style={{marginTop:16}}>
      <div className="hero-ring">
        <div className="dash-sec-h">อัตราความสอดคล้อง</div>
        <div className="ring-wrap"><Ring pct={stats.pct} met={stats.met} nc={stats.nc}/></div>
        <div className="hero-legend">
          <span><i style={{background:'var(--ok)'}}/>สอดคล้อง <b>{stats.met}</b></span>
          <span><i style={{background:'var(--bad)'}}/>ยังไม่สอดคล้อง <b>{stats.nc}</b></span>
        </div>
      </div>
      <div className="hero-kpis">
        {cards.map((c,i)=>(<div className={'stat '+c.cls+(c.go?' stat-link':'')} key={i}
          role={c.go?'button':undefined} tabIndex={c.go?0:undefined}
          onClick={c.go||undefined}
          onKeyDown={c.go?(e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); c.go() } }):undefined}>
          <div className="lab">{c.lab}</div>
          <div className="val num">{c.val} <small>{c.unit}</small></div>
          <div className="delta">{c.delta}</div>
        </div>))}
      </div>
    </div>

    {/* ตรวจสอบรายเดือน (ย้ายมาจากหน้าทะเบียน) — รู้ว่าเดือนไหนตรวจแล้ว */}
    <div style={{marginTop:16}}>
      <MonthlyCheckPanel months={monthsData} year={new Date().getFullYear()}
        onToggle={(y,m)=>onToggleMonthCur&&onToggleMonthCur(m)}
        onMarkNoNewLaws={onMarkNoNewLaws} onMarkHasNewLaws={onMarkHasNewLaws}/>
    </div>

    <div style={{marginTop:36}}>
      <div className="dash-sec-h">ภาพรวมรายไตรมาส</div>
      <QuarterlyAddRepealChart quarterStats={quarterStats} cats={cats} catMap={catMap}/>
    </div>

    <div style={{marginTop:36}}>
      <div className="dash-sec-h">ความสอดคล้องตามหมวดกฎหมาย</div>
      <div className="panel">
        <div className="panel-b"><CatBars laws={fLaws} cats={cats}/></div>
      </div>
    </div>

    {/* กฎหมายใหม่ที่ AI พบ แยกรายเดือน */}
    <div style={{marginTop:16}}>
      <NewLawsByMonth updates={updates} onGoView={onGoView}/>
    </div>

    {/* สถานะงานในกระบวนการ (แบบเรียบง่าย) */}
    <div style={{marginTop:16}}>
      <StageBar items={processItems} onGo={onGoProcess}/>
    </div>

    <ReportDeadlinesPanel reports={reports} onGoReports={onGoReports} danger/>

    {/* งานค้างตามหน่วยงาน (item 5) — คลิกตัวเลขไปหน้าที่กรองไว้แล้ว */}
    {deptWorkload.length>0 && (
      <div className="panel" style={{marginTop:16}}>
        <div className="panel-h"><h3>งานค้างตามหน่วยงาน</h3><span className="sub" style={{marginLeft:'auto'}}>คลิกตัวเลขเพื่อไปยังงานที่กรองไว้</span></div>
        <div className="tablewrap"><table>
          <thead><tr><th>หน่วยงาน</th><th style={{textAlign:'center'}}>รอประเมิน</th><th style={{textAlign:'center'}}>NC ค้าง</th><th style={{textAlign:'center'}}>แผนเลยกำหนด</th></tr></thead>
          <tbody>
            {deptWorkload.map(d=>(
              <tr key={d.deptId}>
                <td style={{fontWeight:600,fontSize:13}}>{d.name}</td>
                <td style={{textAlign:'center'}}><WlNum n={d.waiting} cls="p-warn" onClick={()=>onGoDept&&onGoDept('assessment',d.name)}/></td>
                <td style={{textAlign:'center'}}><WlNum n={d.ncOpen} cls="p-bad" onClick={()=>onGoDept&&onGoDept('assessment',d.name)}/></td>
                <td style={{textAlign:'center'}}><WlNum n={d.planOverdue} cls="p-bad" onClick={()=>onGoDept&&onGoDept('plans',d.name)}/></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>
    )}

    {latestCases.length>0 && (
      <div className="panel" style={{marginTop:16}}>
        <div className="panel-h"><h3>ติดตามสถานะกฎหมายล่าสุด</h3>
          {onGoTracker && <span className="sub" style={{marginLeft:'auto',color:'var(--brand)',cursor:'pointer'}} onClick={onGoTracker}>ดูทั้งหมด →</span>}</div>
        <div className="panel-b" style={{display:'flex',flexDirection:'column',gap:14}}>
          {latestCases.map(c=>{ const law=laws.find(l=>l.id===c.law_id)
            return (
              <div key={c.law_id}>
                <div style={{fontSize:12.5,fontWeight:600,marginBottom:6}}><span className="law-code" style={{marginRight:8}}>{law?.code||'—'}</span>{(law?.name||'').slice(0,80)}</div>
                <CaseStepper c={c} subLabel={subLabel} onClickStage={()=>onGoTracker&&onGoTracker()}/>
              </div>
            )})}
        </div>
      </div>
    )}

    <Timeline laws={laws} catMap={catMap} onOpen={onOpen} curBE={curBE} fromBE={tlFromBE}/>

    <div className="panel" style={{marginTop:16}}>
      <div className="panel-h"><h3>รายการที่ยังไม่สอดคล้อง — ต้องติดตาม</h3><span className="sub" style={{marginLeft:'auto'}}>คลิกเพื่อดูรายละเอียด</span></div>
      <div className="tablewrap"><table><thead><tr><th>รหัส / ชื่อกฎหมาย</th><th>หมวด</th><th>กระทรวง</th><th>สถานะ</th></tr></thead><tbody>
        {bad.length===0 && <tr><td colSpan="4" style={{textAlign:'center',color:'var(--ok)',fontWeight:600,padding:30}}>ทุกข้อกำหนดสอดคล้องครบถ้วน ✓</td></tr>}
        {bad.map(l=>(<tr key={l.id} onClick={()=>onOpen(l)}>
          <td><div className="law-code" style={{display:'flex',alignItems:'center',gap:8}}>{l.code}<ActiveBadge active={l.active!==false} size="sm"/></div><div className="law-title" style={{fontSize:13}}>{l.name.slice(0,70)}{l.name.length>70?'…':''}</div></td>
          <td><Tag c={l.cat} color={catMap[l.cat]?.color}/></td>
          <td style={{fontSize:12.5,color:'var(--ink-soft)'}}>{l.ministry||'—'}</td>
          <td><Pill s={l.status}/></td>
        </tr>))}
      </tbody></table></div>
    </div>
  </div>
}

