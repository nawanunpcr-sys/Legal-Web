import { useEffect, useMemo, useState } from 'react'
import { supabase, hasSupabase, fetchAll,
         setRequirementStatus, recomputeLawStatus,
         repealLaw, restoreLaw,
         markCommSent, updateCommSchedule,
         dismissNotification,
         STATUS, LAW_TYPES, RECURRENCE_LABELS } from './lib/supabase.js'
import { I } from './components/icons.jsx'
import LawDrawer from './components/LawDrawer.jsx'
import { buildReport } from './components/report.jsx'

const prog = l => !l.reqs.length ? 100 : Math.round(l.reqs.filter(r=>r.status==='met').length/l.reqs.length*100)
const thDate = s => { if(!s) return '—'; const m=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']; const d=new Date(s); return d.getDate()+' '+m[d.getMonth()]+' '+(d.getFullYear()+543) }
const daysTo = s => Math.ceil((new Date(s)-new Date())/86400000)
const Pill = ({s}) => <span className={'pill '+(STATUS[s]?.cls||'p-ok')}>{STATUS[s]?.label||s}</span>
const Tag = ({c,color}) => <span className="tag" style={{borderColor:(color||'#888')+'33',color:color||'#888'}}>{c}</span>

const NAV = [
  { id:'dashboard',  label:'Dashboard',          icon:'grid'    },
  { id:'register',   label:'ทะเบียนกฎหมาย',      icon:'book'    },
  { id:'compliance', label:'ติดตามความสอดคล้อง', icon:'check'   },
  { id:'repealed',   label:'กฎหมายที่ถูกยกเลิก', icon:'ban'     },
  { id:'comm',       label:'การสื่อสาร (ISD-86)', icon:'chat'    },
  { id:'analysis',   label:'วิเคราะห์ & สรุป AI', icon:'spark'   },
]
const TITLES = {
  dashboard: ['Dashboard',             'สรุปสถานะความสอดคล้องตามกฎหมาย SHE'],
  register:  ['ทะเบียนกฎหมาย',         'กฎหมายที่เกี่ยวข้องและสถานะการปฏิบัติ'],
  compliance:['ติดตามความสอดคล้อง',    'สถานะรายข้อกำหนดแยกตามหมวดและลำดับชั้น'],
  repealed:  ['กฎหมายที่ถูกยกเลิก',    'รายการกฎหมายที่ยกเลิก / ถูกแทนที่'],
  comm:      ['ตารางการสื่อสาร',        'การสื่อสารภายในและภายนอกองค์กร (ISD-86)'],
  analysis:  ['วิเคราะห์ & สรุป AI',   'ข้อค้นพบและข้อเสนอแนะจากการประเมิน'],
}

export default function App(){
  const [view,setView]=useState('dashboard')
  const [collapsed,setCollapsed]=useState(false)
  const [cats,setCats]=useState([]); const [laws,setLaws]=useState([]); const [comms,setComms]=useState([])
  const [notifs,setNotifs]=useState([])
  const [loading,setLoading]=useState(true); const [err,setErr]=useState('')
  const [search,setSearch]=useState(''); const [openLaw,setOpenLaw]=useState(null)
  const [showBell,setShowBell]=useState(false)

  useEffect(()=>{ (async()=>{
    if(!hasSupabase){ setErr('ยังไม่ได้ตั้งค่า Supabase (.env) — กำลังแสดงหน้าเปล่า'); setLoading(false); return }
    try{ const d=await fetchAll(); setCats(d.cats); setLaws(d.laws); setComms(d.comms); setNotifs(d.notifs) }
    catch(e){ setErr('เชื่อมต่อฐานข้อมูลไม่สำเร็จ: '+e.message) }
    setLoading(false)
  })() },[])

  const catMap = useMemo(()=>Object.fromEntries(cats.map(c=>[c.code,c])),[cats])
  const activeLaws = useMemo(()=>laws.filter(l=>l.status!=='repealed'),[laws])
  const repealedLaws = useMemo(()=>laws.filter(l=>l.status==='repealed'),[laws])

  const stats = useMemo(()=>{
    let req=0,met=0; activeLaws.forEach(l=>l.reqs.forEach(r=>{req++;if(r.status==='met')met++}))
    return { total:activeLaws.length, req, met, nc:req-met, pct: req?Math.round(met/req*100):100 }
  },[activeLaws])

  // Bell notifications: law reviews + comm deadlines + log entries
  const bellNotifications = useMemo(()=>{
    const out=[]
    activeLaws.forEach(l=>{ if(l.status==='bad') out.push({type:'bad',law:l,text:l.code+' ยังไม่สอดคล้อง',sub:l.name.slice(0,60)}) })
    activeLaws.forEach(l=>{ if(l.review_date){ const d=daysTo(l.review_date); if(d>=0&&d<=60) out.push({type:'review',law:l,days:d,text:l.code+' ครบกำหนดทบทวนใน '+d+' วัน',sub:thDate(l.review_date)}) }})
    comms.forEach(c=>{ if(c.next_scheduled_date){ const d=daysTo(c.next_scheduled_date); const nb=c.notify_days_before||7; if(d>=0&&d<=nb) out.push({type:'comm',comm:c,days:d,text:'การสื่อสาร: '+c.topic.slice(0,50),sub:'ครบกำหนดใน '+d+' วัน — '+thDate(c.next_scheduled_date)}) }})
    notifs.filter(n=>n.type==='comm_submitted').slice(0,3).forEach(n=>out.push({type:'submitted',text:n.message,sub:thDate(n.created_at)}))
    return out.sort((a,b)=>(a.type==='bad'?-1:0)-(b.type==='bad'?-1:0))
  },[activeLaws,comms,notifs])

  async function toggleReq(law, req){
    const next = req.status==='met' ? 'unmet' : 'met'
    setLaws(prev=>prev.map(l=>{
      if(l.id!==law.id) return l
      const reqs=l.reqs.map(r=>r.id===req.id?{...r,status:next}:r)
      const status=reqs.some(r=>r.status==='unmet')?'bad':'ok'
      return {...l,reqs,status}
    }))
    setOpenLaw(prev=> prev&&prev.id===law.id ? {...prev,reqs:prev.reqs.map(r=>r.id===req.id?{...r,status:next}:r),status:prev.reqs.map(r=>r.id===req.id?{...r,status:next}:r).some(r=>r.status==='unmet')?'bad':'ok'} : prev)
    try{ await setRequirementStatus(req.id,next); await recomputeLawStatus(law.id,law.reqs.map(r=>r.id===req.id?{...r,status:next}:r)) }
    catch(e){ alert('บันทึกไม่สำเร็จ: '+e.message) }
  }

  async function handleRepeal(law, data){
    try{
      await repealLaw(law.id, data)
      setLaws(prev=>prev.map(l=>l.id===law.id?{...l,status:'repealed',...data}:l))
      setOpenLaw(null)
    } catch(e){ alert('บันทึกไม่สำเร็จ: '+e.message) }
  }

  async function handleRestore(law){
    try{
      await restoreLaw(law.id)
      setLaws(prev=>prev.map(l=>l.id===law.id?{...l,status:'ok',repeal_date:null,repeal_reason:null,replaced_by_code:null,repealed_by_authority:null}:l))
      setOpenLaw(null)
    } catch(e){ alert('บันทึกไม่สำเร็จ: '+e.message) }
  }

  async function handleMarkSent(commId, fileRef){
    try{
      await markCommSent(commId, fileRef)
      const {data} = await supabase.from('lg_communications').select('*').eq('id',commId).single()
      if(data) setComms(prev=>prev.map(c=>c.id===commId?data:c))
    } catch(e){ alert('บันทึกไม่สำเร็จ: '+e.message) }
  }

  async function handleCommScheduleUpdate(commId, patch){
    try{
      await updateCommSchedule(commId, patch)
      setComms(prev=>prev.map(c=>c.id===commId?{...c,...patch}:c))
    } catch(e){ alert('บันทึกไม่สำเร็จ: '+e.message) }
  }

  function exportPDF(){ buildReport({laws:activeLaws,stats,catName:Object.fromEntries(cats.map(c=>[c.code,c.name]))}); window.print() }

  if(loading) return <div className="loading"><div className="spin"></div>กำลังโหลดข้อมูลจากฐานข้อมูล…</div>

  return (
    <div className="app">
      <aside className={'sidebar'+(collapsed?' collapsed':'')}>
        <button className="collapse-btn" onClick={()=>setCollapsed(c=>!c)} title="ย่อ/ขยายแถบเมนู">
          <I n="chevron" style={{transform:collapsed?'rotate(180deg)':'none'}}/>
        </button>
        <div className="brand">
          <div className="mark"><I n="shield" stroke="#fff"/></div>
          <div className="brand-txt"><h1>ComplyRegister</h1><span>ทะเบียนกฎหมาย SHE</span></div>
        </div>
        <div className="nav-label">เมนูหลัก</div>
        {NAV.map(n=>(
          <button key={n.id} className={'nav-item'+(view===n.id?' active':'')} onClick={()=>{setView(n.id);setShowBell(false)}} title={n.label}>
            <I n={n.icon}/><span className="label">{n.label}</span>
            {n.id==='register' && <span className="badge">{activeLaws.length}</span>}
            {n.id==='compliance' && stats.nc>0 && <span className="badge" style={{background:'var(--bad)'}}>{stats.nc}</span>}
            {n.id==='repealed' && repealedLaws.length>0 && <span className="badge" style={{background:'var(--ink-faint)'}}>{repealedLaws.length}</span>}
          </button>
        ))}
        <div className="side-foot">
          <div className="av">จ</div>
          <div><div className="nm">จป. วิชาชีพ</div><div className="rl">จัสเทล เน็ทเวิร์ค</div></div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="vt">{TITLES[view][0]}<small>{TITLES[view][1]}</small></div>
          <div className="spacer"/>
          {(view==='register'||view==='repealed') && (
            <div className="search"><I n="search"/><input placeholder="ค้นหากฎหมาย, รหัส, กระทรวง…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
          )}
          <button className="btn btn-ghost no-print" onClick={exportPDF} title="ส่งออกรายงาน PDF"><I n="download"/>ส่งออก PDF</button>
          <div style={{position:'relative'}} className="no-print">
            <button className="bell" onClick={()=>setShowBell(s=>!s)} title="การแจ้งเตือน">
              <I n="bell"/>{bellNotifications.length>0 && <span className="dot">{bellNotifications.length}</span>}
            </button>
            {showBell && (
              <div className="popover">
                <h4>การแจ้งเตือน ({bellNotifications.length})</h4>
                {bellNotifications.length===0 && <div className="noti"><div className="s" style={{padding:'8px 12px'}}>ไม่มีการแจ้งเตือน</div></div>}
                {bellNotifications.map((n,i)=>{
                  const isGood = n.type==='submitted'
                  const bg = n.type==='bad'?'var(--bad-bg)':isGood?'var(--ok-bg)':'var(--review-bg)'
                  const fg = n.type==='bad'?'var(--bad)':isGood?'var(--ok)':'var(--review)'
                  const ic = n.type==='bad'?'alert':isGood?'check':'clock'
                  return (
                    <div className="noti" key={i} onClick={()=>{ if(n.law){setOpenLaw(n.law);setShowBell(false)} if(n.comm){setView('comm');setShowBell(false)} }}>
                      <div className="ico" style={{background:bg,color:fg}}><I n={ic}/></div>
                      <div><div className="t">{n.text}</div><div className="s">{n.sub}</div></div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </header>

        <div className="content">
          {err && <div className="banner">{err}</div>}
          {view==='dashboard'  && <Dashboard laws={activeLaws} cats={cats} stats={stats} catMap={catMap} onOpen={setOpenLaw}/>}
          {view==='register'   && <Register  laws={activeLaws} catMap={catMap} search={search} onOpen={setOpenLaw}/>}
          {view==='compliance' && <Compliance laws={activeLaws} cats={cats} stats={stats} onOpen={setOpenLaw}/>}
          {view==='repealed'   && <Repealed  laws={repealedLaws} catMap={catMap} search={search} onOpen={setOpenLaw}/>}
          {view==='comm'       && <Communication comms={comms} onMarkSent={handleMarkSent} onScheduleUpdate={handleCommScheduleUpdate}/>}
          {view==='analysis'   && <Analysis  laws={activeLaws} cats={cats} stats={stats} catMap={catMap} onOpen={setOpenLaw}/>}
        </div>
      </div>

      {openLaw && (
        <LawDrawer
          law={openLaw}
          catMap={catMap}
          onClose={()=>setOpenLaw(null)}
          onToggle={toggleReq}
          onRepeal={handleRepeal}
          onRestore={handleRestore}
          prog={prog}
          thDate={thDate}
        />
      )}
      <div id="print-report"></div>
    </div>
  )
}

/* ─────────────────────────── DASHBOARD ─────────────────────────── */
function Ring({pct}){
  const r=62, c=2*Math.PI*r
  return <div className="ring"><svg width="150" height="150" viewBox="0 0 150 150">
    <circle cx="75" cy="75" r={r} fill="none" stroke="var(--line-soft)" strokeWidth="14"/>
    <circle cx="75" cy="75" r={r} fill="none" stroke="var(--brand)" strokeWidth="14" strokeLinecap="round"
      strokeDasharray={c} strokeDashoffset={c-(c*pct/100)} style={{transition:'stroke-dashoffset 1s'}}/>
  </svg><div className="center"><div className="pct">{pct}%</div><div className="pl">สอดคล้อง</div></div></div>
}
function CatBars({laws,cats}){
  const byCat={}; laws.forEach(l=>{(byCat[l.cat]=byCat[l.cat]||[]).push(l)})
  return cats.filter(c=>byCat[c.code]).map(c=>{
    let r=0,m=0; byCat[c.code].forEach(l=>l.reqs.forEach(x=>{r++;if(x.status==='met')m++}))
    const p=r?Math.round(m/r*100):100
    return <div className="catbar" key={c.code}><div className="top"><span className="nm">{c.code} · {c.name}</span><b className="num" style={{color:c.color}}>{p}%</b></div>
      <div className="track"><div className="fill" style={{width:p+'%',background:c.color}}/></div></div>
  })
}
function Dashboard({laws,cats,stats,catMap,onOpen}){
  const bad=laws.filter(l=>l.status==='bad')
  const cards=[
    {cls:'s-total',icon:'book',  lab:'กฎหมายที่มีผลบังคับใช้', val:stats.total, unit:'ฉบับ', delta:cats.length+' หมวด',             dc:'var(--brand)'},
    {cls:'s-ok',   icon:'check', lab:'ข้อกำหนดที่สอดคล้อง',    val:stats.met,   unit:'ข้อ',  delta:stats.pct+'% ของข้อกำหนด',      dc:'var(--ok)'  },
    {cls:'s-warn',  icon:'list', lab:'ข้อกำหนดทั้งหมด',         val:stats.req,   unit:'ข้อ',  delta:'ประเมินครบทุกข้อ',              dc:'var(--review)'},
    {cls:'s-bad',  icon:'alert', lab:'ยังไม่สอดคล้อง',          val:stats.nc,    unit:'ข้อ',  delta:'ต้องติดตาม',                    dc:'var(--bad)' },
  ]
  return <div className="view">
    <div className="grid stats">
      {cards.map((c,i)=>(<div className={'stat '+c.cls} key={i}>
        <div className="ic"><I n={c.icon}/></div>
        <div className="lab">{c.lab}</div>
        <div className="val num">{c.val} <small>{c.unit}</small></div>
        <div className="delta" style={{color:c.dc}}>{c.delta}</div>
      </div>))}
    </div>
    <div className="cols">
      <div className="panel"><div className="panel-h"><h3>อัตราความสอดคล้องโดยรวม</h3><span className="sub" style={{marginLeft:'auto'}}>รอบ 1 (ม.ค.–มี.ค.) 2569</span></div>
        <div className="panel-b"><div className="ring-wrap"><Ring pct={stats.pct}/>
          <div className="legend">
            <div className="row"><span className="dot" style={{background:'var(--ok)'}}/>ข้อกำหนดสอดคล้อง (C)<b className="num">{stats.met}</b></div>
            <div className="row"><span className="dot" style={{background:'var(--bad)'}}/>ยังไม่สอดคล้อง (NC)<b className="num">{stats.nc}</b></div>
            <div className="row"><span className="dot" style={{background:'var(--brand)'}}/>กฎหมายที่มีผลบังคับใช้<b className="num">{stats.total}</b></div>
            <div className="row"><span className="dot" style={{background:'var(--gold)'}}/>เอกสารอ้างอิง<b className="num">F-259</b></div>
          </div></div></div></div>
      <div className="panel"><div className="panel-h"><h3>ความสอดคล้องตามหมวดกฎหมาย</h3></div>
        <div className="panel-b"><CatBars laws={laws} cats={cats}/></div></div>
    </div>
    <div className="panel" style={{marginTop:16}}>
      <div className="panel-h"><h3>รายการที่ยังไม่สอดคล้อง — ต้องติดตาม</h3><span className="sub" style={{marginLeft:'auto'}}>คลิกเพื่อดูรายละเอียด</span></div>
      <div className="tablewrap"><table><thead><tr><th>รหัส / ชื่อกฎหมาย</th><th>หมวด</th><th>กระทรวง</th><th>สถานะ</th></tr></thead><tbody>
        {bad.length===0 && <tr><td colSpan="4" style={{textAlign:'center',color:'var(--ok)',fontWeight:600,padding:30}}>ทุกข้อกำหนดสอดคล้องครบถ้วน ✓</td></tr>}
        {bad.map(l=>(<tr key={l.id} onClick={()=>onOpen(l)}>
          <td><div className="law-code">{l.code}</div><div className="law-title" style={{fontSize:13}}>{l.name.slice(0,70)}{l.name.length>70?'…':''}</div></td>
          <td><Tag c={l.cat} color={catMap[l.cat]?.color}/></td>
          <td style={{fontSize:12.5,color:'var(--ink-soft)'}}>{l.ministry||'—'}</td>
          <td><Pill s={l.status}/></td>
        </tr>))}
      </tbody></table></div>
    </div>
  </div>
}

/* ─────────────────────────── REGISTER ─────────────────────────── */
function Register({laws,catMap,search,onOpen}){
  const [cat,setCat]=useState('all')
  const catsList=[...new Set(laws.map(l=>l.cat))].sort()
  const q=search.toLowerCase()
  const rows=laws.filter(l=>(cat==='all'||l.cat===cat)&&(!q||l.name.toLowerCase().includes(q)||l.code.toLowerCase().includes(q)||(l.ministry||'').toLowerCase().includes(q)))

  // Group by category then by hierarchy_level
  const grouped = useMemo(()=>{
    const byCat={}
    rows.forEach(l=>{
      const c=l.cat
      if(!byCat[c]) byCat[c]={}
      const tier=l.hierarchy_level||5
      if(!byCat[c][tier]) byCat[c][tier]=[]
      byCat[c][tier].push(l)
    })
    return byCat
  },[rows])

  const activeCats = catsList.filter(c=>cat==='all'||c===cat)

  return <div className="view">
    <div className="filterbar">
      <span className={'chip'+(cat==='all'?' active':'')} onClick={()=>setCat('all')}>ทุกหมวด ({laws.length})</span>
      {catsList.map(c=>(<span key={c} className={'chip'+(cat===c?' active':'')} onClick={()=>setCat(c)} style={cat===c?{borderColor:catMap[c]?.color,color:catMap[c]?.color}:{}}>{c} · {catMap[c]?.name} ({laws.filter(l=>l.cat===c).length})</span>))}
      <span className="right">พบ {rows.length} ฉบับ</span>
    </div>
    {activeCats.map(c=>(
      <div key={c} style={{marginBottom:20}}>
        <div className="hier-cat-header" style={{borderLeftColor:catMap[c]?.color||'var(--brand)'}}>
          <span style={{color:catMap[c]?.color,fontWeight:700,fontFamily:'Bai Jamjuree'}}>{c}</span>
          <span style={{marginLeft:8,color:'var(--ink-soft)'}}>{catMap[c]?.name}</span>
          <span style={{marginLeft:'auto',fontSize:12,color:'var(--ink-faint)'}}>{rows.filter(l=>l.cat===c).length} ฉบับ</span>
        </div>
        {LAW_TYPES.filter(t=>grouped[c]?.[t.level]?.length).map(t=>(
          <div key={t.level} style={{marginBottom:8}}>
            <div className="hier-tier-label">
              <span className="tier-badge">ชั้น {t.level}</span>
              {t.label}
            </div>
            <div className="panel" style={{marginTop:0,borderTopLeftRadius:0,borderTopRightRadius:0}}>
              <div className="tablewrap"><table>
                <thead><tr><th>รหัส / ชื่อกฎหมาย</th><th>กระทรวง</th><th>สถานะ</th><th>ความสอดคล้อง</th></tr></thead>
                <tbody>{grouped[c][t.level].map(l=>{const p=prog(l);return(
                  <tr key={l.id} onClick={()=>onOpen(l)}>
                    <td><div className="law-code">{l.code}</div><div className="law-title">{l.name}</div></td>
                    <td style={{fontSize:12.5,color:'var(--ink-soft)'}}>{l.ministry||'—'}</td>
                    <td><Pill s={l.status}/></td>
                    <td><div className="mini-prog"><div className="track"><div className="fill" style={{width:p+'%',background:p===100?'var(--ok)':'var(--bad)'}}/></div><span className="num">{p}%</span></div></td>
                  </tr>
                )})}</tbody>
              </table></div>
            </div>
          </div>
        ))}
        {/* Laws with no hierarchy_level assigned yet */}
        {grouped[c]?.[5] && !LAW_TYPES.slice(0,4).some(t=>grouped[c]?.[t.level]?.length) && null}
      </div>
    ))}
    {rows.length===0 && <div className="panel"><div style={{textAlign:'center',color:'var(--ink-faint)',padding:40}}>ไม่พบกฎหมายที่ตรงกับเงื่อนไข</div></div>}
  </div>
}

/* ─────────────────────────── COMPLIANCE ─────────────────────────── */
function Compliance({laws,cats,stats,onOpen}){
  const byCat={}; laws.forEach(l=>{(byCat[l.cat]=byCat[l.cat]||[]).push(l)})
  return <div className="view">
    <div className="grid" style={{gridTemplateColumns:'repeat(3,1fr)',marginBottom:16}}>
      <div className="panel" style={{padding:18}}><div style={{fontSize:13,color:'var(--ink-faint)'}}>ข้อกำหนดทั้งหมด</div><div className="num" style={{fontSize:28,fontWeight:700}}>{stats.req}</div></div>
      <div className="panel" style={{padding:18}}><div style={{fontSize:13,color:'var(--ink-faint)'}}>ผ่านการประเมิน (C)</div><div className="num" style={{fontSize:28,fontWeight:700,color:'var(--ok)'}}>{stats.met}</div></div>
      <div className="panel" style={{padding:18}}><div style={{fontSize:13,color:'var(--ink-faint)'}}>ยังไม่สอดคล้อง (NC)</div><div className="num" style={{fontSize:28,fontWeight:700,color:'var(--bad)'}}>{stats.nc}</div></div>
    </div>
    <div className="panel"><div className="panel-h"><h3>สถานะรายหมวด / ลำดับชั้นกฎหมาย</h3><span className="sub" style={{marginLeft:'auto'}}>คลิกที่กฎหมายเพื่อดูข้อกำหนดและแก้ไข</span></div>
      <div className="panel-b">
        {cats.filter(c=>byCat[c.code]).map(c=>{
          let r=0,m=0; byCat[c.code].forEach(l=>l.reqs.forEach(x=>{r++;if(x.status==='met')m++}))
          const p=r?Math.round(m/r*100):100
          // group laws in this cat by hierarchy_level
          const byTier={}; byCat[c.code].forEach(l=>{ const t=l.hierarchy_level||5; (byTier[t]=byTier[t]||[]).push(l) })
          return <details key={c.code} style={{marginBottom:12}} open={c.code==='LA'}>
            <summary style={{cursor:'pointer',display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'var(--surface-2)',border:'1px solid var(--line)',borderRadius:11,listStyle:'none'}}>
              <span style={{width:10,height:10,borderRadius:3,background:c.color}}/>
              <b style={{fontFamily:'Bai Jamjuree'}}>{c.code}</b><span style={{flex:1}}>{c.name}</span>
              <span className="num" style={{color:c.color,fontWeight:700}}>{p}%</span>
              <span style={{fontSize:12,color:'var(--ink-faint)'}}>{byCat[c.code].length} ฉบับ</span>
            </summary>
            <div style={{padding:'6px 14px'}}>
              {LAW_TYPES.filter(t=>byTier[t.level]?.length).map(tier=>(
                <div key={tier.level} style={{marginBottom:10}}>
                  <div className="hier-tier-label" style={{margin:'8px 0 4px'}}>
                    <span className="tier-badge">ชั้น {tier.level}</span>{tier.label}
                  </div>
                  {byTier[tier.level].map(l=>(
                    <div key={l.id} onClick={()=>onOpen(l)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid var(--line-soft)',cursor:'pointer',paddingLeft:12}}>
                      <span className="law-code">{l.code}</span>
                      <span style={{fontSize:13,flex:1}}>{l.name.slice(0,60)}{l.name.length>60?'…':''}</span>
                      <span style={{fontSize:12,color:'var(--ink-faint)'}} className="num">{l.reqs.filter(r=>r.status==='met').length}/{l.reqs.length} ข้อ</span>
                      <Pill s={l.status}/>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </details>
        })}
      </div></div>
  </div>
}

/* ─────────────────────────── REPEALED ─────────────────────────── */
function Repealed({laws,catMap,search,onOpen}){
  const q=search.toLowerCase()
  const rows=laws.filter(l=>!q||l.name.toLowerCase().includes(q)||l.code.toLowerCase().includes(q))
  return <div className="view">
    <div className="ai-box" style={{marginBottom:16,borderColor:'var(--bad)',background:'var(--bad-bg)'}}>
      <span className="ai-tag" style={{color:'var(--bad)'}}><I n="ban"/>กฎหมายที่ถูกยกเลิก / แทนที่</span>
      <p style={{marginBottom:0}}>รายการต่อไปนี้ถูกบันทึกว่าไม่มีผลบังคับใช้แล้ว ไม่นับในสถิติความสอดคล้อง คลิกแต่ละรายการเพื่อดูรายละเอียดหรือกู้คืน</p>
    </div>
    {rows.length===0 && <div className="panel"><div style={{textAlign:'center',color:'var(--ink-faint)',padding:40}}>ยังไม่มีกฎหมายที่ถูกบันทึกว่ายกเลิก</div></div>}
    {rows.length>0 && (
      <div className="panel"><div className="tablewrap"><table>
        <thead><tr><th>รหัส / ชื่อกฎหมาย</th><th>หมวด</th><th>วันที่ยกเลิก</th><th>เหตุผล</th><th>แทนที่ด้วย</th></tr></thead>
        <tbody>{rows.map(l=>(
          <tr key={l.id} onClick={()=>onOpen(l)} style={{cursor:'pointer',opacity:0.85}}>
            <td><div className="law-code" style={{textDecoration:'line-through',color:'var(--ink-faint)'}}>{l.code}</div><div className="law-title" style={{fontSize:13,color:'var(--ink-soft)'}}>{l.name.slice(0,70)}{l.name.length>70?'…':''}</div></td>
            <td><Tag c={l.cat} color={catMap[l.cat]?.color}/></td>
            <td style={{fontSize:12.5,color:'var(--bad)',whiteSpace:'nowrap'}}>{l.repeal_date||'—'}</td>
            <td style={{fontSize:12,color:'var(--ink-soft)',maxWidth:200}}>{l.repeal_reason?.slice(0,80)||'—'}</td>
            <td style={{fontSize:12.5}}>{l.replaced_by_code||'—'}</td>
          </tr>
        ))}</tbody>
      </table></div></div>
    )}
  </div>
}

/* ─────────────────────────── COMMUNICATION ─────────────────────────── */
function CommScheduleModal({comm,onSave,onClose}){
  const [date,setDate]=useState(comm.scheduled_date||'')
  const [rec,setRec]=useState(comm.recurrence_type||'annually')
  const [notifyDays,setNotifyDays]=useState(comm.notify_days_before||7)
  const [assignedTo,setAssignedTo]=useState(comm.assigned_to||'')
  function save(){ onSave(comm.id,{scheduled_date:date||null,recurrence_type:rec,next_scheduled_date:date||null,notify_days_before:Number(notifyDays),assigned_to:assignedTo||null}); onClose() }
  return (
    <>
      <div className="scrim" onClick={onClose}/>
      <div className="modal">
        <div className="modal-head"><h3>ตั้งค่าตารางการสื่อสาร</h3><button className="close" onClick={onClose}><I n="close"/></button></div>
        <div className="modal-body">
          <p style={{fontSize:13,color:'var(--ink-soft)',marginBottom:16}}>{comm.topic}</p>
          <label className="form-label">วันที่กำหนด (ครั้งแรก / ถัดไป)</label>
          <input className="form-input" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
          <label className="form-label">ความถี่</label>
          <select className="form-input" value={rec} onChange={e=>setRec(e.target.value)}>
            {Object.entries(RECURRENCE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select>
          <label className="form-label">แจ้งเตือนล่วงหน้า (วัน)</label>
          <input className="form-input" type="number" min="1" max="90" value={notifyDays} onChange={e=>setNotifyDays(e.target.value)}/>
          <label className="form-label">ผู้รับผิดชอบ</label>
          <input className="form-input" type="text" placeholder="ชื่อผู้รับผิดชอบ…" value={assignedTo} onChange={e=>setAssignedTo(e.target.value)}/>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={save}><I n="save"/> บันทึก</button>
        </div>
      </div>
    </>
  )
}

function MarkSentModal({comm,onSave,onClose}){
  const [fileRef,setFileRef]=useState(comm.file_reference||'')
  function save(){ onSave(comm.id,fileRef); onClose() }
  return (
    <>
      <div className="scrim" onClick={onClose}/>
      <div className="modal">
        <div className="modal-head"><h3>บันทึกการส่ง / สื่อสาร</h3><button className="close" onClick={onClose}><I n="close"/></button></div>
        <div className="modal-body">
          <p style={{fontSize:13,color:'var(--ink-soft)',marginBottom:16}}>{comm.topic}</p>
          <label className="form-label">อ้างอิงไฟล์ / เอกสารที่ส่ง (ไม่บังคับ)</label>
          <input className="form-input" type="text" placeholder="เช่น ISD-86_2569Q1.pdf หรือ URL…" value={fileRef} onChange={e=>setFileRef(e.target.value)}/>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={save}><I n="check"/> ยืนยันการส่ง</button>
        </div>
      </div>
    </>
  )
}

function Communication({comms,onMarkSent,onScheduleUpdate}){
  const [scope,setScope]=useState('internal')
  const [filter,setFilter]=useState('all')
  const [schedModal,setSchedModal]=useState(null)
  const [sentModal,setSentModal]=useState(null)
  const today=new Date()

  const rows=comms.filter(c=>{
    if(c.scope!==scope) return false
    if(filter==='upcoming'){ const d=c.next_scheduled_date?daysTo(c.next_scheduled_date):null; return d!==null&&d>=0&&d<=30 }
    if(filter==='overdue'){  const d=c.next_scheduled_date?daysTo(c.next_scheduled_date):null; return d!==null&&d<0 }
    return true
  })

  function countdownChip(c){
    if(!c.next_scheduled_date) return null
    const d=daysTo(c.next_scheduled_date)
    if(d<0)  return <span className="chip-date overdue">เกินกำหนด {Math.abs(d)} วัน</span>
    if(d===0) return <span className="chip-date today">วันนี้!</span>
    if(d<=7)  return <span className="chip-date soon">ใน {d} วัน</span>
    return <span className="chip-date ok">ใน {d} วัน</span>
  }

  return <div className="view">
    {schedModal && <CommScheduleModal comm={schedModal} onSave={onScheduleUpdate} onClose={()=>setSchedModal(null)}/>}
    {sentModal  && <MarkSentModal    comm={sentModal}  onSave={onMarkSent}       onClose={()=>setSentModal(null)}/>}
    <div className="filterbar">
      <span className={'chip'+(scope==='internal'?' active':'')} onClick={()=>setScope('internal')}>ภายในองค์กร ({comms.filter(c=>c.scope==='internal').length})</span>
      <span className={'chip'+(scope==='external'?' active':'')} onClick={()=>setScope('external')}>ภายนอกองค์กร ({comms.filter(c=>c.scope==='external').length})</span>
      <span style={{margin:'0 8px',color:'var(--line)'}}></span>
      <span className={'chip'+(filter==='all'?' active':'')} onClick={()=>setFilter('all')}>ทั้งหมด</span>
      <span className={'chip'+(filter==='upcoming'?' active':'')} onClick={()=>setFilter('upcoming')}>ครบกำหนดเร็วๆ นี้</span>
      <span className={'chip'+(filter==='overdue'?' active':'')} onClick={()=>setFilter('overdue')}>เกินกำหนด</span>
      <span className="right">เอกสารอ้างอิง ISD-86 Rev.7</span>
    </div>
    <div className="panel"><div className="tablewrap"><table>
      <thead><tr>
        <th style={{width:'28%'}}>ประเภทข้อมูล</th>
        <th>ผู้สื่อสาร</th><th>ผู้รับสาร</th><th>ความถี่</th>
        <th>กำหนดถัดไป</th><th>ผู้รับผิดชอบ</th><th style={{width:120}}>การดำเนินการ</th>
      </tr></thead>
      <tbody>{rows.map(c=>(
        <tr key={c.id}>
          <td style={{fontWeight:500,maxWidth:260,lineHeight:1.4}}>{c.topic}</td>
          <td style={{fontSize:12.5,color:'var(--ink-soft)',whiteSpace:'pre-line'}}>{c.sender}</td>
          <td style={{fontSize:12.5,color:'var(--ink-soft)'}}>{c.receiver}</td>
          <td style={{fontSize:12.5,color:'var(--ink-soft)'}}>{RECURRENCE_LABELS[c.recurrence_type]||c.frequency||'—'}</td>
          <td style={{fontSize:12,whiteSpace:'nowrap'}}>
            {c.next_scheduled_date ? <><div>{c.next_scheduled_date}</div>{countdownChip(c)}</> : <span style={{color:'var(--ink-faint)'}}>ยังไม่ตั้งค่า</span>}
          </td>
          <td style={{fontSize:12.5,color:'var(--ink-soft)'}}>{c.assigned_to||'—'}</td>
          <td>
            <div style={{display:'flex',gap:4}}>
              <button className="btn btn-ghost" style={{padding:'3px 8px',fontSize:11}} onClick={()=>setSchedModal(c)} title="ตั้งค่าตาราง"><I n="clock"/></button>
              <button className="btn btn-primary" style={{padding:'3px 8px',fontSize:11}} onClick={()=>setSentModal(c)} title="บันทึกการส่ง"><I n="check"/></button>
            </div>
          </td>
        </tr>
      ))}
      {rows.length===0 && <tr><td colSpan="7" style={{textAlign:'center',color:'var(--ink-faint)',padding:32}}>ไม่มีรายการที่ตรงกับตัวกรอง</td></tr>}
      </tbody></table></div></div>
  </div>
}

/* ─────────────────────────── ANALYSIS ─────────────────────────── */
function Analysis({laws,cats,stats,catMap,onOpen}){
  const bad=laws.filter(l=>l.status==='bad')
  const byCat={}; laws.forEach(l=>{(byCat[l.cat]=byCat[l.cat]||[]).push(l)})
  return <div className="view">
    <div className="ai-box" style={{marginBottom:20}}>
      <span className="ai-tag"><I n="spark"/>บทสรุปผู้บริหาร (สรุปโดย AI)</span>
      <p>จากทะเบียนกฎหมาย SHE ของ <b>บริษัท จัสเทล เน็ทเวิร์ค</b> (F-259, รอบ 1 ปี 2569) มีกฎหมายที่มีผลบังคับใช้ทั้งสิ้น <b>{stats.total} ฉบับ</b> ใน {cats.length} หมวด รวมข้อกำหนดที่ต้องปฏิบัติ <b>{stats.req} ข้อ</b> โดยมีอัตราความสอดคล้องโดยรวม <b>{stats.pct}%</b> ({stats.met} ข้อ) คงเหลือข้อกำหนดที่ยังไม่สอดคล้องเพียง <b>{stats.nc} ข้อ</b> ซึ่งอยู่ในหมวด LA และอยู่ระหว่างรอภาครัฐประกาศหลักสูตร/แนวทางปฏิบัติ จึงเป็นความเสี่ยงระดับต่ำที่อยู่นอกเหนือการควบคุมโดยตรง — ภาพรวมระบบจัดการกฎหมายอยู่ในเกณฑ์ดีเยี่ยมและพร้อมต่อการตรวจประเมิน</p>
    </div>
    <div className="cols" style={{marginTop:0}}>
      <div>
        <div className="panel-h" style={{border:'none',padding:'0 0 13px'}}><h3>ข้อค้นพบสำคัญ & ข้อเสนอแนะ</h3></div>
        {bad.map(l=>l.reqs.filter(r=>r.status==='unmet').map(r=>(
          <div className="insight" key={r.id} onClick={()=>onOpen(l)} style={{cursor:'pointer'}}>
            <div className="ii" style={{background:'var(--bad-bg)',color:'var(--bad)'}}><I n="alert"/></div>
            <div><span className="ic-code">{l.code} · ยังไม่สอดคล้อง</span><h4>{l.name.slice(0,70)}</h4><p>{(r.note||r.text).slice(0,150)}…</p></div>
          </div>)))}
        <div className="insight"><div className="ii" style={{background:'var(--ok-bg)',color:'var(--ok)'}}><I n="check"/></div>
          <div><span className="ic-code">จุดแข็ง</span><h4>5 หมวดสอดคล้องครบ 100%</h4><p>หมวดไฟฟ้า, อัคคีภัย, สภาพแวดล้อม, เครื่องจักร และ Service ผ่านการประเมินทุกข้อกำหนด เป็นฐานที่มั่นคงต่อการรับรองมาตรฐาน ISO 45001</p></div></div>
        <div className="insight"><div className="ii" style={{background:'var(--review-bg)',color:'var(--review)'}}><I n="clock"/></div>
          <div><span className="ic-code">ข้อเสนอแนะ</span><h4>ติดตามประกาศหลักสูตรผู้ชำนาญการ</h4><p>มอบหมายผู้รับผิดชอบติดตามประกาศกระทรวงแรงงานเรื่องหลักสูตรอบรม เพื่อขึ้นทะเบียนผู้ชำนาญการและปิดข้อ NC ทั้ง {stats.nc} ข้อทันทีเมื่อมีผลบังคับ</p></div></div>
      </div>
      <div>
        <div className="panel-h" style={{border:'none',padding:'0 0 13px'}}><h3>สัดส่วนกฎหมายรายหมวด</h3></div>
        <div className="panel"><div className="panel-b">
          {cats.filter(c=>byCat[c.code]).map(c=>{const n=byCat[c.code].length;const p=Math.round(n/stats.total*100);
            return <div className="catbar" key={c.code}><div className="top"><span className="nm">{c.code} · {c.name}</span><b className="num">{n} ฉบับ</b></div>
              <div className="track"><div className="fill" style={{width:p+'%',background:c.color}}/></div></div>})}
        </div></div>
      </div>
    </div>
  </div>
}
