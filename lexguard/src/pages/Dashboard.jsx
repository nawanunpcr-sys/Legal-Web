// Dashboard page — overview KPIs, category bars, NC list, quarterly chart, report deadlines.
// P19 · จัดใหม่: เห็นโดยไม่ต้องเลื่อน = การ์ด "ต้องทำตอนนี้" + KPI strip
//   ที่เหลือ (CatBars/NC list/สถิติรายเดือน) พับเก็บ ค่าเริ่มต้น=พับ จำสถานะใน localStorage
import { useState, useMemo, useEffect } from 'react'
import { RISK, RISK_ORDER, fetchUnmetSubByRisk } from '../lib/supabase.js'
import { Pill, Tag, ActiveBadge, thDate, TH_MONTHS, monthlyByAnnounce, announceYears, announceMonth, sumReqStats, usePersist, GLOSSARY } from '../lib/ui.jsx'
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

/* ─────────────────────────── DASHBOARD ─────────────────────────── */
function CatBars({laws,cats}){
  const byCat={}; laws.forEach(l=>{(byCat[l.cat]=byCat[l.cat]||[]).push(l)})
  return <div className="catbars-grid">
    {cats.filter(c=>byCat[c.code]).map(c=>{
      // P21 · แบ่งแถบ 5 สี: C(เขียว) / NC(แดง) / Ack(น้ำเงิน) / ไม่เกี่ยวข้อง(เทาอ่อน) / ยังไม่ประเมิน(เทา)
      // ตัวเลข % ยังคิดจาก C/(C+NC) เท่านั้น — แถบแสดง "สัดส่วนของข้อทั้งหมด" ซึ่งเป็นคนละเรื่องกัน
      const s=sumReqStats(byCat[c.code]); const t=s.total||1
      return <div className="catbar" key={c.code}>
        <div className="top">
          <span className="nm">{c.code} · {c.name}</span>
          <span className="cat-meta">
            {s.unmet>0 && <span className="cat-remain">NC {s.unmet} ข้อ</span>}
            {s.ack>0 && <span style={{fontSize:10.5,fontWeight:600,color:'var(--accent)'}}>Ack {s.ack}</span>}
            {s.na>0 && <span style={{fontSize:10.5,fontWeight:600,color:'var(--ink-faint)'}}>ไม่เกี่ยวข้อง {s.na}</span>}
            {s.waiting>0 && <span style={{fontSize:10.5,fontWeight:600,color:'var(--ink-faint)'}}>ยังไม่ประเมิน {s.waiting}</span>}
            {s.unmet===0 && s.waiting===0 && s.met>0 && <span className="cat-done">ครบ {s.met} ข้อ</span>}
            {/* ฐานเป็นศูนย์ (มีแต่ Ack/ไม่เกี่ยวข้อง) ต้องเป็น N/A ไม่ใช่ 0% หรือขีด */}
            <b className="num" style={{color:c.color}}>{s.pct==null?(s.ack+s.na>0?'N/A':'—'):s.pct+'%'}</b>
          </span>
        </div>
        <div className="track" title={`สอดคล้อง ${s.met} · ไม่สอดคล้อง ${s.unmet} · เพื่อทราบ ${s.ack} · ไม่เกี่ยวข้อง ${s.na} · ยังไม่ประเมิน ${s.waiting}`} style={{display:'flex',overflow:'hidden'}}>
          <div style={{width:(s.met/t*100)+'%',background:'var(--ok)'}}/>
          <div style={{width:(s.unmet/t*100)+'%',background:'var(--bad)'}}/>
          <div style={{width:(s.ack/t*100)+'%',background:'var(--accent)'}}/>
          <div style={{width:(s.na/t*100)+'%',background:'var(--line)'}}/>
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
// P20f · เอาการ์ด "ต้องทำตอนนี้" ออกจาก Dashboard แล้ว (ดูงานค้างที่หน้า "รายการที่ต้องทำ")
export default function Dashboard({laws,cats,catMap,onOpen,onGoView,monthsData=[]}){
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

  // P21 · % คิดจาก C/(C+NC) — Ack / ไม่เกี่ยวข้อง / ยังไม่ประเมิน แยกแสดงต่างหาก ไม่อยู่ในตัวหาร
  const stats = useMemo(()=>sumReqStats(fLaws),[fLaws])

  const bad=fLaws.filter(l=>l.status==='bad')

  // P24 · ข้อย่อยที่ยังไม่ได้ดำเนินการ แยกตามระดับความเสี่ยง
  const [subRisk,setSubRisk]=useState(null)
  useEffect(()=>{ let live=true
    fetchUnmetSubByRisk().then(d=>{ if(live) setSubRisk(d) }).catch(()=>{})
    return ()=>{ live=false }
  },[])


  // ── P21 · แถบสรุปด้านบน ──────────────────────────────────────────────────
  // เดิมเป็นช่องเท่ากัน 8 ช่องเรียงกันรวด พอเพิ่ม 3 สถานะใหม่เข้าไปเลยล้นเป็นสองแถว
  // และ "% ความสอดคล้อง" ซึ่งเป็นตัวเลขที่คนเปิดหน้านี้มาดูจริง ๆ ไปตกอยู่แถวล่างโดดเดี่ยว
  // จัดใหม่เป็น 2 ชั้นตามน้ำหนักความสำคัญ แทนที่จะให้ทุกตัวเลขเท่ากันหมด:
  //   ชั้นบน = % ความสอดคล้อง (ตัวเอก) + จำนวนกฎหมาย/ข้อปฏิบัติ
  //   ชั้นล่าง = แจกแจง 5 สถานะเป็นชิป · ค่าที่เป็น 0 จางลงเพื่อไม่ให้แย่งสายตา
  const pctText = stats.assessed
    ? (stats.met/stats.assessed*100).toFixed(1)+'%'
    : (stats.ack+stats.na>0 ? 'N/A' : '—')
  const pctSub = stats.assessed
    ? `${stats.met.toLocaleString('en-US')} จาก ${stats.assessed.toLocaleString('en-US')} ข้อที่เข้าฐานคำนวณ`
    : (stats.ack+stats.na>0 ? 'ไม่มีข้อที่เข้าฐานคำนวณ (มีแต่เพื่อทราบ / ไม่เกี่ยวข้อง)' : 'ยังไม่มีข้อที่ประเมิน')
  const pctNum = stats.assessed ? (stats.met/stats.assessed*100) : 0
  // P22 ขั้นที่ 6 · tip อธิบายศัพท์ตรงจุดที่ผู้ใช้เห็นคำนั้น
  const breakdown=[
    {k:'met',   lab:'สอดคล้อง',     val:stats.met,     color:'var(--ok)',  tip:GLOSSARY.met},
    // P22 · เด้งเข้าหน้าแผนปรับปรุง ซึ่งเป็นรายการข้อที่ยังไม่สอดคล้องจริงๆ
    // (เดิมพาไปแท็บความสอดคล้องในทะเบียน ซึ่งยังต้องหาต่อเองอีกทีว่าข้อไหน)
    {k:'unmet', lab:'ไม่สอดคล้อง',  val:stats.unmet,   color:'var(--bad)', go:()=>onGoView&&onGoView('improvements'), tip:GLOSSARY.unmet},
    {k:'ack',   lab:'เพื่อทราบ',    val:stats.ack,     color:'var(--accent)', tip:GLOSSARY.acknowledged},
    {k:'na',    lab:'ไม่เกี่ยวข้อง', val:stats.na,      color:'var(--ink-faint)', tip:GLOSSARY.not_applicable},
    {k:'wait',  lab:'ยังไม่ประเมิน', val:stats.waiting, color:'var(--ink-faint)', hollow:true, tip:GLOSSARY.waiting},
  ]

  return <div className="view">
    {/* P24 · ข้อย่อยที่ยังไม่ได้ดำเนินการ — ตอบได้ว่าค้างตรงจุดไหนและเร่งด่วนแค่ไหน
        ต่างจากตัวเลข NC ระดับข้อกำหนดตรงที่ละเอียดถึงระดับการกระทำ */}
    {subRisk && subRisk.total>0 && (
      <div className="panel" style={{marginBottom:14,borderLeft:'3px solid '+RISK.critical.color}}>
        <div className="panel-h" style={{cursor:'pointer'}} onClick={()=>onGoView&&onGoView('registry')}>
          <span style={{flex:1,fontSize:14,fontWeight:600}}>
            ข้อย่อยที่ยังไม่ได้ดำเนินการ ({subRisk.total.toLocaleString('en-US')} ข้อ)
          </span>
          <span style={{fontSize:12,color:'var(--ink-faint)'}}>จากกฎหมาย {subRisk.laws} ฉบับ</span>
        </div>
        <div className="panel-b" style={{paddingTop:6,display:'flex',gap:9,flexWrap:'wrap'}}>
          {RISK_ORDER.filter(k=>subRisk.byRisk[k]).map(k=>(
            <div key={k} title={RISK[k].desc} style={{
              display:'flex',alignItems:'center',gap:7,padding:'7px 13px',borderRadius:9,
              background:RISK[k].bg,border:'1px solid '+RISK[k].color+'33'}}>
              <span style={{width:9,height:9,borderRadius:'50%',background:RISK[k].color}}/>
              <span style={{fontSize:12.5,color:'var(--ink-soft)'}}>เสี่ยง{RISK[k].label}</span>
              <b className="num" style={{fontSize:16,color:RISK[k].color}}>{subRisk.byRisk[k]}</b>
            </div>
          ))}
        </div>
      </div>
    )}
    <div className="dash-summary">
      <div className="dash-summary-top">
        <div className="dash-summary-main">
          <div className="dash-summary-lab" title={GLOSSARY.pct}>ความสอดคล้องตามข้อกำหนด</div>
          <div className="dash-summary-val">{pctText}</div>
          <div className="dash-summary-sub">{pctSub}</div>
          {/* แถบนี้แทนสัดส่วน C ต่อฐาน C+NC เท่านั้น — ไม่ใช่สัดส่วนของข้อทั้งหมด */}
          {stats.assessed>0 && (
            <div className="dash-summary-bar" role="presentation">
              <span style={{width:pctNum+'%'}}/>
            </div>
          )}
        </div>
        <div className="dash-summary-side">
          <div className="dash-summary-mini">
            <b>{(active.length+inactive.length).toLocaleString('en-US')}</b>
            <span>กฎหมายในทะเบียน (ฉบับ)</span>
          </div>
          <div className="dash-summary-mini">
            <b>{stats.total.toLocaleString('en-US')}</b>
            <span>ข้อปฏิบัติรายข้อ</span>
          </div>
          <div className="dash-summary-mini">
            <b>{String(cats.length)}</b>
            <span>หมวด (LA–LG)</span>
          </div>
        </div>
      </div>

      <div className="dash-summary-split">
        {breakdown.map(b=>(
          <div key={b.k}
            className={'dash-chip'+(b.val===0?' is-zero':'')+(b.go&&b.val>0?' is-link':'')}
            role={b.go&&b.val>0?'button':undefined} tabIndex={b.go&&b.val>0?0:undefined}
            onClick={b.go&&b.val>0?b.go:undefined}
            onKeyDown={b.go&&b.val>0?(e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); b.go() } }):undefined}
            title={b.tip||''}>
            <i style={b.hollow
              ? {borderColor:b.color,background:'transparent'}
              : {background:b.color,borderColor:b.color}}/>
            <b style={b.val>0?{color:b.color}:undefined}>{b.val.toLocaleString('en-US')}</b>
            <span>{b.lab}</span>
          </div>
        ))}
      </div>
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
