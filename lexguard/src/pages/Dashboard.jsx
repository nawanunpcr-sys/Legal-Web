// Dashboard page — overview KPIs, category bars, NC list, quarterly chart, report deadlines.
import { useState, useMemo } from 'react'
import { Pill, Tag, ActiveBadge, thDate, daysTo, TH_MONTHS, QUARTER_LABEL } from '../lib/ui.jsx'
import { buildObligations, monthCounts } from '../lib/calendar.js'

/* P13 · Task 2 — การ์ด "เดือนนี้ต้องทำ" (นับจาก logic เดียวกับหน้าปฏิทินกฎหมาย) */
function MonthDueCard({ reports, comms, workflow, lawMap, onOpenCalendar }) {
  const now = new Date()
  const { total, overdue } = useMemo(() => {
    const obligations = buildObligations({ reports, comms, workflow, lawMap })
    return monthCounts({ obligations, reports, comms, workflow }, now.getFullYear(), now.getMonth(), true)
  }, [reports, comms, workflow, lawMap])
  const accent = overdue > 0 ? 'var(--bad)' : total > 0 ? 'var(--review)' : 'var(--ok)'
  return (
    <div className="panel" style={{ marginBottom: 16, borderTop: '3px solid ' + accent, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 22 }}>🗓️</span>
      <div style={{ flex: 1, minWidth: 220 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>
          เดือนนี้มี <b className="num" style={{ color: accent }}>{total}</b> รายการต้องทำ
          {overdue > 0 && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--bad)' }}> (เกินกำหนด {overdue})</span>}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 2 }}>รายงานราชการ · การสื่อสาร · การทวนสอบ ที่ครบกำหนดในเดือน {TH_MONTHS[now.getMonth()]} {now.getFullYear() + 543}</div>
      </div>
      <button className="btn btn-primary" style={{ padding: '7px 16px' }} onClick={onOpenCalendar}>เปิดปฏิทิน →</button>
    </div>
  )
}

/* ─────────────────────────── DASHBOARD ─────────────────────────── */
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
    <div className="panel q-compact" style={{marginTop:16}}>
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

export default function Dashboard({laws,cats,catMap,onOpen,quarterStats=[],reports=[],onGoReports,onGoView,monthsData=[],comms=[],workflow=[],lawMap={}}){
  // วันที่ตรวจสอบรายเดือนล่าสุด (เชื่อมกับการเช็คในหน้าทะเบียน & ความสอดคล้อง)
  const lastCheck = useMemo(()=>{
    const done=(monthsData||[]).filter(m=>m.checked_at && (m.status||m.checked))
    if(!done.length) return null
    return done.sort((a,b)=>new Date(b.checked_at)-new Date(a.checked_at))[0]
  },[monthsData])

  const active = useMemo(()=>laws.filter(l=>l.status!=='repealed' && l.active!==false),[laws])
  const inactive = useMemo(()=>laws.filter(l=>l.status!=='repealed' && l.active===false),[laws])
  const fLaws  = active   // ใช้อยู่เท่านั้น (ไม่นับ Inactive)

  const goRegistry = mode => { try{ localStorage.setItem('cr_registry_mode', JSON.stringify(mode)) }catch{} ; onGoView&&onGoView('registry') }

  const stats = useMemo(()=>{
    let req=0,met=0; fLaws.forEach(l=>l.reqs.forEach(r=>{req++;if(r.status==='met')met++}))
    return { total:fLaws.length, req, met, nc:req-met, pct:req?(met/req*100):100 }
  },[fLaws])

  const bad=fLaws.filter(l=>l.status==='bad')
  const strip=[
    {val:(active.length+inactive.length).toLocaleString('en-US'), lab:'กฎหมายในทะเบียน (ฉบับ)'},
    {val:String(cats.length),                 lab:'หมวด (LA–LG)'},
    {val:stats.req.toLocaleString('en-US'),   lab:'ข้อกำหนดรายข้อ'},
    {val:stats.nc.toLocaleString('en-US'),    lab:'ยังไม่สอดคล้อง (ข้อ)', bad:true, go:()=>goRegistry('compliance')},
    {val:stats.pct.toFixed(1)+'%',            lab:'ความสอดคล้อง ('+stats.met+'/'+stats.req+')', accent:true},
  ]

  return <div className="view">
    <MonthDueCard reports={reports} comms={comms} workflow={workflow} lawMap={lawMap} onOpenCalendar={()=>onGoView&&onGoView('calendar')}/>
    <div className="dash-strip">
      {strip.map((s,i)=>(<div className={'dash-strip-cell'+(s.go?' stat-link':'')} key={i}
        role={s.go?'button':undefined} tabIndex={s.go?0:undefined} onClick={s.go||undefined}
        onKeyDown={s.go?(e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); s.go() } }):undefined}
        style={s.go?{cursor:'pointer'}:undefined}>
        <div className={'dash-strip-val'+(s.accent?' is-accent':'')} style={s.bad?{color:'var(--bad)'}:undefined}>{s.val}</div>
        <div className="dash-strip-lab">{s.lab}</div>
      </div>))}
    </div>

    {/* ความสอดคล้องตามหมวดกฎหมาย */}
    <div style={{marginTop:16}}>
      <div className="dash-sec-h">ความสอดคล้องตามหมวดกฎหมาย</div>
      <div className="panel">
        <div className="panel-b"><CatBars laws={fLaws} cats={cats}/></div>
      </div>
    </div>

    {/* ตรวจสอบ ณ วันที่ ... — เชื่อมกับการเช็ครายเดือนในหน้าทะเบียน & ความสอดคล้อง */}
    <div className="panel" style={{marginTop:12,padding:'10px 16px',display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}
      onClick={()=>onGoView&&onGoView('registry')} role="button" tabIndex={0}
      onKeyDown={e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); onGoView&&onGoView('registry') } }}>
      <span style={{fontSize:16}}>🗓️</span>
      <span style={{fontSize:13}}>ตรวจสอบรายเดือนล่าสุด ณ วันที่ <b>{lastCheck?thDate(lastCheck.checked_at):'—ยังไม่ได้ตรวจสอบ'}</b>
        {lastCheck?.checked_by && <span style={{color:'var(--ink-faint)'}}> · โดย {lastCheck.checked_by}</span>}</span>
      <span style={{marginLeft:'auto',color:'var(--brand)',fontSize:12.5,fontWeight:500}}>ไปตรวจสอบรายเดือน →</span>
    </div>

    <div style={{marginTop:36}}>
      <div className="dash-sec-h">ภาพรวมรายไตรมาส</div>
      <QuarterlyAddRepealChart quarterStats={quarterStats} cats={cats} catMap={catMap}/>
    </div>

    <ReportDeadlinesPanel reports={reports} onGoReports={onGoReports} danger/>

    {/* รายการที่ยังไม่สอดคล้อง — ย้ายมาไว้ล่างสุดของหน้า */}
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
