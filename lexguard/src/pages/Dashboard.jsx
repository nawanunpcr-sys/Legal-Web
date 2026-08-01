// Dashboard page — overview KPIs, category bars, NC list, quarterly chart, report deadlines.
// P19 · จัดใหม่: เห็นโดยไม่ต้องเลื่อน = การ์ด "ต้องทำตอนนี้" + KPI strip
//   ที่เหลือ (CatBars/NC list/สถิติรายเดือน) พับเก็บ ค่าเริ่มต้น=พับ จำสถานะใน localStorage
import { useState, useMemo } from 'react'
import { Pill, Tag, ActiveBadge, thDate, daysTo, TH_MONTHS, monthlyByAnnounce, announceYears, announceMonth, sumReqStats, usePersist } from '../lib/ui.jsx'
import { I } from '../components/icons.jsx'

/* P19 · ส่วนที่พับเก็บได้ — จำสถานะเปิด/ปิดต่อบล็อกใน localStorage (ค่าเริ่มต้น = พับ) */
function Collapsible({ storageKey, title, right, children, defaultOpen = false }) {
  const [open, setOpen] = usePersist(storageKey, defaultOpen)
  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ display: 'inline-flex', transition: 'transform .18s ease', transform: open ? 'rotate(90deg)' : 'none', color: 'var(--ink-faint)' }}><I n="chevron" /></span>
        <h3 style={{ margin: 0, fontSize: 14.5 }}>{title}</h3>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }} onClick={e => e.stopPropagation()}>{right}</span>
      </button>
      {open && <div className="panel-b" style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>{children}</div>}
    </div>
  )
}

/* P19 · การ์ด "ต้องทำตอนนี้" — รวม MonthDueCard(เดิม) + ReportDeadlinesPanel(เดิม) เป็นการ์ดเดียว
   3 ตัวเลข: เกินกำหนด / ครบกำหนดใน 7 วัน / รอผู้เกี่ยวข้องตอบ — คลิกแต่ละตัวกระโดดไปหน้าที่เกี่ยวข้อง
   (เกินกำหนด, ครบกำหนดใน 7 วัน → "รายการที่ต้องทำ" ซึ่ง group หัวข้อ "เกินกำหนด"/"สัปดาห์นี้" ให้อยู่แล้ว
    รอผู้เกี่ยวข้องตอบ → "ทะเบียนกฎหมาย" เพราะเป็นข้อมูลระดับข้อปฏิบัติ ไม่ใช่ task ใน lg_tasks) */
function NowCard({ taskRows = [], waitingCount = 0, onOpenTasks, onOpenRegistry }) {
  const { overdue, dueWeek } = useMemo(() => {
    const od = taskRows.filter(t => t.state === 'overdue').length
    const wk = taskRows.filter(t => t.state === 'todo' && (() => { const d = daysTo(t.due_date); return d >= 0 && d <= 7 })()).length
    return { overdue: od, dueWeek: wk }
  }, [taskRows])
  const nums = [
    { val: overdue, lab: 'เกินกำหนด', color: overdue > 0 ? 'var(--bad)' : 'var(--ink-faint)', onClick: onOpenTasks },
    { val: dueWeek, lab: 'ครบกำหนดใน 7 วัน', color: dueWeek > 0 ? 'var(--warn)' : 'var(--ink-faint)', onClick: onOpenTasks },
    { val: waitingCount, lab: 'รอผู้เกี่ยวข้องตอบ', color: waitingCount > 0 ? 'var(--review)' : 'var(--ink-faint)', onClick: onOpenRegistry },
  ]
  const accent = overdue > 0 ? 'var(--bad)' : (dueWeek > 0 || waitingCount > 0) ? 'var(--review)' : 'var(--ok)'
  return (
    <div className="panel" style={{ marginBottom: 16, borderTop: '3px solid ' + accent, padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 20 }}>🗓️</span>
        <h3 style={{ margin: 0, fontSize: 15 }}>ต้องทำตอนนี้</h3>
        <button className="btn btn-primary" style={{ marginLeft: 'auto', padding: '6px 14px' }} onClick={onOpenTasks}>ดูรายการที่ต้องทำ →</button>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {nums.map((n, i) => (
          <button key={i} onClick={n.onClick} type="button"
            style={{ flex: '1 1 140px', minWidth: 140, textAlign: 'left', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 14px', background: 'var(--surface-2)', cursor: 'pointer' }}>
            <div className="num" style={{ fontSize: 22, fontWeight: 800, color: n.color, lineHeight: 1.1 }}>{n.val}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{n.lab}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ─────────────────────────── DASHBOARD ─────────────────────────── */
function CatBars({laws,cats}){
  const byCat={}; laws.forEach(l=>{(byCat[l.cat]=byCat[l.cat]||[]).push(l)})
  return <div className="catbars-grid">
    {cats.filter(c=>byCat[c.code]).map(c=>{
      // P18 · แบ่งแถบ 3 สี: met(เขียว) / unmet(แดง) / waiting(เทา) — % นับเฉพาะข้อที่ประเมินแล้ว
      const s=sumReqStats(byCat[c.code]); const t=s.total||1
      return <div className="catbar" key={c.code}>
        <div className="top">
          <span className="nm">{c.code} · {c.name}</span>
          <span className="cat-meta">
            {s.unmet>0 && <span className="cat-remain">NC {s.unmet} ข้อ</span>}
            {s.waiting>0 && <span style={{fontSize:10.5,fontWeight:600,color:'var(--ink-faint)'}}>รอประเมิน {s.waiting}</span>}
            {s.unmet===0 && s.waiting===0 && s.total>0 && <span className="cat-done">ครบ {s.met} ข้อ ✓</span>}
            <b className="num" style={{color:c.color}}>{s.pct==null?'—':s.pct+'%'}</b>
          </span>
        </div>
        <div className="track" title={`สอดคล้อง ${s.met} · ไม่สอดคล้อง ${s.unmet} · รอผู้เกี่ยวข้องประเมิน ${s.waiting}`} style={{display:'flex',overflow:'hidden'}}>
          <div style={{width:(s.met/t*100)+'%',background:'var(--ok)'}}/>
          <div style={{width:(s.unmet/t*100)+'%',background:'var(--bad)'}}/>
          <div style={{width:(s.waiting/t*100)+'%',background:'var(--ink-faint)'}}/>
        </div>
      </div>
    })}
  </div>
}

function MonthlyAddRepealChart({laws,cats,catMap}){
  const toBE = y => y + 543
  const yearOptions = useMemo(()=>announceYears(laws),[laws])
  const [year,setYear] = useState(yearOptions[0] || new Date().getFullYear())

  // นับรายเดือน (12) จากวันที่ประกาศใช้ (มาใหม่) และ repeal_date (ยกเลิก)
  const {added,repealed} = useMemo(()=>monthlyByAnnounce(laws,year),[laws,year])
  // แยกตามหมวด: มาใหม่รายเดือน (ตามวันประกาศใช้) + รวมยกเลิกทั้งปี
  const byCat = useMemo(()=>{
    const m={}
    for(const l of (laws||[])){
      const a=announceMonth(l)
      if(a && a.gy===year){ const c=m[l.cat]=m[l.cat]||{added:Array(12).fill(0),repealed:0}; c.added[a.m]++ }
      if(l.repeal_date){ const x=new Date(l.repeal_date); if(!isNaN(x)&&x.getFullYear()===year){ const c=m[l.cat]=m[l.cat]||{added:Array(12).fill(0),repealed:0}; c.repealed++ } }
    }
    return m
  },[laws,year])

  const max = Math.max(1, ...added, ...repealed)
  const totalAdded = added.reduce((a,b)=>a+b,0)
  const totalRepealed = repealed.reduce((a,b)=>a+b,0)
  const catRows = cats.filter(c=>byCat[c.code]).map(c=>({c, ...byCat[c.code]}))

  return (
    <div className="panel q-compact" style={{marginTop:16}}>
      <div className="panel-h">
        <h3>กฎหมายที่เพิ่ม / ยกเลิก รายเดือน</h3>
        <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:'auto'}}>
          <button className="month-yr-btn" onClick={()=>setYear(y=>y-1)}>‹</button>
          <span style={{fontSize:13,fontWeight:600,minWidth:60,textAlign:'center'}} className="num">ปี {toBE(year)}</span>
          <button className="month-yr-btn" onClick={()=>setYear(y=>y+1)}>›</button>
        </div>
      </div>
      <div className="panel-b">
        <div style={{display:'flex',gap:18,marginBottom:16,fontSize:12.5,flexWrap:'wrap'}}>
          <span style={{display:'flex',alignItems:'center',gap:6}}><span className="dot" style={{width:8,height:8,borderRadius:2,background:'var(--chart-add)',display:'inline-block'}}/>เพิ่ม <b className="num" style={{fontSize:15,fontWeight:800,color:'var(--chart-add)'}}>{totalAdded}</b> ฉบับ</span>
          <span style={{display:'flex',alignItems:'center',gap:6}}><span className="dot" style={{width:8,height:8,borderRadius:2,background:'var(--chart-rep)',display:'inline-block'}}/>ยกเลิก <b className="num" style={{fontSize:15,fontWeight:800,color:'var(--chart-rep)'}}>{totalRepealed}</b> ฉบับ</span>
          <span style={{color:'var(--ink-faint)',marginLeft:'auto'}}>นับตามวันที่ประกาศใช้ — รายเดือน</span>
        </div>
        <div className="mchart" style={{gridTemplateColumns:'repeat(12,1fr)'}}>
          {TH_MONTHS.map((mo,i)=>(
            <div className="mchart-col" key={i}>
              <div className="qbar-vals">
                <span className={'qbar-val qbar-val-add'+(added[i]?'':' qbar-val-zero')}>{added[i]}</span>
                <span className={'qbar-val qbar-val-rep'+(repealed[i]?'':' qbar-val-zero')}>{repealed[i]}</span>
              </div>
              <div className="mchart-bars">
                <div className="mchart-bar mchart-bar-add" style={{height:(added[i]/max*100)+'%'}} title={`เพิ่ม ${added[i]} ฉบับ`}/>
                <div className="mchart-bar mchart-bar-rep" style={{height:(repealed[i]/max*100)+'%'}} title={`ยกเลิก ${repealed[i]} ฉบับ`}/>
              </div>
              <div className="mchart-lab">{mo}</div>
            </div>
          ))}
        </div>

        {catRows.length>0 && (
          <div className="tablewrap" style={{marginTop:18}}>
            <table>
              <thead>
                <tr>
                  <th rowSpan={2}>หมวด</th>
                  <th colSpan={12} style={{textAlign:'center'}}>มาใหม่ (รายเดือน) — ตามวันที่ประกาศใช้</th>
                  <th rowSpan={2} style={{textAlign:'center'}}>รวมมาใหม่</th>
                  <th rowSpan={2} style={{textAlign:'center'}}>รวมยกเลิก</th>
                </tr>
                <tr>
                  {TH_MONTHS.map(mo=><th key={'a'+mo} style={{textAlign:'center',fontSize:11}}>{mo}</th>)}
                </tr>
              </thead>
              <tbody>
                {catRows.map(({c,added,repealed})=>(
                  <tr key={c.code}>
                    <td><Tag c={c.code} color={catMap[c.code]?.color}/></td>
                    {added.map((n,i)=><td key={'a'+i} style={{textAlign:'center',fontWeight:n?700:400,color:n?'var(--ok)':'var(--ink-faint)'}} className="num">{n||'—'}</td>)}
                    <td style={{textAlign:'center',fontWeight:800,fontSize:14,color:'var(--ok)'}} className="num">{added.reduce((a,b)=>a+b,0)}</td>
                    <td style={{textAlign:'center',fontWeight:800,fontSize:14,color:repealed?'var(--bad)':'var(--ink-faint)'}} className="num">{repealed||'—'}</td>
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

// P19 · reports/onGoReports/comms/workflow/lawMap ไม่ใช้แล้ว — ReportDeadlinesPanel/MonthDueCard(เดิม)
// ถูกรวมเป็น NowCard ซึ่งอ่านจาก taskRows (view lg_tasks) อย่างเดียว
export default function Dashboard({laws,cats,catMap,onOpen,taskRows=[],onGoView,monthsData=[]}){
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

  // P18 · % นับเฉพาะข้อที่ประเมินแล้ว (met+unmet) — waiting แยกแสดงต่างหาก
  const stats = useMemo(()=>sumReqStats(fLaws),[fLaws])

  const bad=fLaws.filter(l=>l.status==='bad')
  const strip=[
    {val:(active.length+inactive.length).toLocaleString('en-US'), lab:'กฎหมายในทะเบียน (ฉบับ)'},
    {val:String(cats.length),                 lab:'หมวด (LA–LG)'},
    {val:stats.total.toLocaleString('en-US'), lab:'ข้อปฏิบัติรายข้อ'},
    {val:stats.unmet.toLocaleString('en-US'), lab:'ยังไม่สอดคล้อง (ข้อ)', bad:true, go:()=>goRegistry('compliance')},
    {val:stats.waiting.toLocaleString('en-US'), lab:'รอผู้เกี่ยวข้องประเมิน (ข้อ)'},
    {val:stats.assessed?((stats.met/stats.assessed*100).toFixed(1)+'%'):'ยังไม่ประเมิน', lab:stats.assessed?('ความสอดคล้อง ('+stats.met+'/'+stats.assessed+')'):'ยังไม่มีข้อที่ประเมิน', accent:true},
  ]

  return <div className="view">
    {/* เห็นโดยไม่ต้องเลื่อน: การ์ด "ต้องทำตอนนี้" + KPI strip */}
    <NowCard taskRows={taskRows} waitingCount={stats.waiting}
      onOpenTasks={()=>onGoView&&onGoView('tasks')} onOpenRegistry={()=>onGoView&&onGoView('registry')}/>
    <div className="dash-strip">
      {strip.map((s,i)=>(<div className={'dash-strip-cell'+(s.go?' stat-link':'')} key={i}
        role={s.go?'button':undefined} tabIndex={s.go?0:undefined} onClick={s.go||undefined}
        onKeyDown={s.go?(e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); s.go() } }):undefined}
        style={s.go?{cursor:'pointer'}:undefined}>
        <div className={'dash-strip-val'+(s.accent?' is-accent':'')} style={s.bad?{color:'var(--bad)'}:undefined}>{s.val}</div>
        <div className="dash-strip-lab">{s.lab}</div>
      </div>))}
    </div>

    {/* พับเก็บได้ — ค่าเริ่มต้น = พับ (จำสถานะใน localStorage) */}
    <Collapsible storageKey="dash_open_monthly" title="สถิติรายเดือน — กฎหมายเพิ่ม/ยกเลิก">
      <MonthlyAddRepealChart laws={laws} cats={cats} catMap={catMap}/>
    </Collapsible>

    <Collapsible storageKey="dash_open_catbars" title="ความสอดคล้องรายหมวด">
      <CatBars laws={fLaws} cats={cats}/>
      {/* ตรวจสอบ ณ วันที่ ... — เชื่อมกับการเช็ครายเดือนในหน้าทะเบียน & ความสอดคล้อง */}
      <div style={{marginTop:14,paddingTop:12,borderTop:'1px solid var(--line-soft)',display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}
        onClick={()=>onGoView&&onGoView('registry')} role="button" tabIndex={0}
        onKeyDown={e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); onGoView&&onGoView('registry') } }}>
        <span style={{fontSize:16}}>🗓️</span>
        <span style={{fontSize:13}}>ตรวจสอบรายเดือนล่าสุด ณ วันที่ <b>{lastCheck?thDate(lastCheck.checked_at):'—ยังไม่ได้ตรวจสอบ'}</b>
          {lastCheck?.checked_by && <span style={{color:'var(--ink-faint)'}}> · โดย {lastCheck.checked_by}</span>}</span>
        <span style={{marginLeft:'auto',color:'var(--brand)',fontSize:12.5,fontWeight:500}}>ไปตรวจสอบรายเดือน →</span>
      </div>
    </Collapsible>

    <Collapsible storageKey="dash_open_nclist" title="รายการที่ยังไม่สอดคล้อง — ต้องติดตาม"
      right={bad.length>0 ? <span className="pill p-bad">{bad.length} รายการ</span> : <span className="pill p-ok">ครบถ้วน ✓</span>}>
      <div className="tablewrap"><table><thead><tr><th>รหัส / ชื่อกฎหมาย</th><th>หมวด</th><th>กระทรวง</th><th>สถานะ</th></tr></thead><tbody>
        {bad.length===0 && <tr><td colSpan="4" style={{textAlign:'center',color:'var(--ok)',fontWeight:600,padding:30}}>ทุกข้อปฏิบัติสอดคล้องครบถ้วน ✓</td></tr>}
        {bad.map(l=>(<tr key={l.id} onClick={()=>onOpen(l)}>
          <td><div className="law-code" style={{display:'flex',alignItems:'center',gap:8}}>{l.code}<ActiveBadge active={l.active!==false} size="sm"/></div><div className="law-title" style={{fontSize:13}}>{l.name.slice(0,70)}{l.name.length>70?'…':''}</div></td>
          <td><Tag c={l.cat} color={catMap[l.cat]?.color}/></td>
          <td style={{fontSize:12.5,color:'var(--ink-soft)'}}>{l.ministry||'—'}</td>
          <td><Pill s={l.status}/></td>
        </tr>))}
      </tbody></table></div>
    </Collapsible>
  </div>
}
