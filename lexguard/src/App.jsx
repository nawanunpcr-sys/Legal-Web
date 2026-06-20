import { useEffect, useMemo, useState } from 'react'
import { supabase, hasSupabase, fetchAll,
         setRequirementStatus, recomputeLawStatus,
         repealLaw, restoreLaw, createLaw, createLawFull,
         markCommSent, updateCommSchedule,
         dismissNotification,
         fetchComplianceMonths, toggleMonthCheck,
         fetchStaging, fetchUpdates, addStagedLaw, dismissStaged, setUpdateStatus,
         logActivity, fetchActivity, fetchCars, suggestionLists,
         fetchReports, setReportEvent, markReportSubmitted,
         getSession, onAuthChange, signOut,
         STATUS, LAW_TYPES, RECURRENCE_LABELS } from './lib/supabase.js'
import LawDrawer from './components/LawDrawer.jsx'
import CarOfi from './components/CarOfi.jsx'
import Reports from './components/Reports.jsx'
import Login from './components/Login.jsx'
import { buildReport } from './components/report.jsx'
import { exportLawsToExcel } from './lib/integrations.js'

const prog = l => !l.reqs.length ? 100 : Math.round(l.reqs.filter(r=>r.status==='met').length/l.reqs.length*100)
// Extract a Buddhist-era (พ.ศ.) year from the messy free-text issue_date
const lawBEYear = s => {
  if(!s) return null
  const four = String(s).match(/25\d\d/); if(four) return +four[0]
  const nums = String(s).match(/\d{1,4}/g); if(!nums) return null
  for(let i=nums.length-1;i>=0;i--){ const n=+nums[i]; if(n>=40&&n<=80) return 2500+n }
  return null
}
const thDate = s => { if(!s) return '—'; const m=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']; const d=new Date(s); return d.getDate()+' '+m[d.getMonth()]+' '+(d.getFullYear()+543) }
const daysTo = s => Math.ceil((new Date(s)-new Date())/86400000)
const Pill = ({s}) => <span className={'pill '+(STATUS[s]?.cls||'p-ok')}>{STATUS[s]?.label||s}</span>
const Tag = ({c,color}) => <span className="tag" style={{borderColor:(color||'#888')+'33',color:color||'#888'}}>{c}</span>

const NAV_GROUPS = [
  { label: null, items: [
    { id:'dashboard',     label:'Dashboard',            icon:'grid'    },
  ]},
  { label: 'ทะเบียน & ประเมิน', items: [
    { id:'register',      label:'ทะเบียนกฎหมาย',        icon:'book'    },
    { id:'compliance',    label:'ติดตามความสอดคล้อง',   icon:'check'   },
    { id:'improvements',  label:'แผนปรับปรุง',           icon:'alert'   },
    { id:'repealed',      label:'กฎหมายที่ถูกยกเลิก',   icon:'ban'     },
  ]},
  { label: 'การดำเนินการ', items: [
    { id:'comm',          label:'การสื่อสาร (ISD-86)',   icon:'chat'    },
    { id:'reports',       label:'การส่งรายงานราชการ',    icon:'inbox'   },
    { id:'car',           label:'CAR / OFI',             icon:'alert'   },
  ]},
  { label: 'วิเคราะห์ & AI', items: [
    { id:'analysis',      label:'วิเคราะห์ & สรุป',       icon:'spark'   },
    { id:'staging',       label:'นำเข้า / รออนุมัติ',     icon:'inbox'   },
    { id:'updates',       label:'อัปเดตกฎหมาย',          icon:'update'  },
    { id:'notifications', label:'การแจ้งเตือน',           icon:'bell'    },
  ]},
]

const TITLES = {
  dashboard:     ['Dashboard',             'สรุปสถานะความสอดคล้องตามกฎหมาย SHE'],
  register:      ['ทะเบียนกฎหมาย',         'กฎหมายที่เกี่ยวข้องและสถานะการปฏิบัติ'],
  compliance:    ['ติดตามความสอดคล้อง',    'สถานะรายข้อกำหนดแยกตามหมวดและลำดับชั้น'],
  improvements:  ['แผนปรับปรุง',           'รายการ NC และแนวทางแก้ไข (อ้างอิง PD-05)'],
  repealed:      ['กฎหมายที่ถูกยกเลิก',    'รายการกฎหมายที่ยกเลิก / ถูกแทนที่'],
  comm:          ['ตารางการสื่อสาร',        'การสื่อสารภายในและภายนอกองค์กร (ISD-86)'],
  reports:       ['การส่งรายงานราชการ',     'ติดตามและแจ้งเตือนกำหนดส่งรายงานต่อหน่วยงานรัฐ'],
  car:           ['CAR / OFI',              'คำขอให้ปฏิบัติการแก้ไข และโอกาสในการปรับปรุง'],
  analysis:      ['วิเคราะห์ & สรุป AI',   'สรุปกฎหมายเข้าทะเบียนด้วย AI (Skill)'],
  staging:       ['นำเข้า / รออนุมัติ',    'รายการที่ AI สรุปไว้ รอกดเพิ่มเข้าทะเบียน'],
  updates:       ['อัปเดตกฎหมาย · ShawPat','เฝ้าระวังกฎหมายใหม่จาก ShawPat'],
  notifications: ['ศูนย์การแจ้งเตือน',     'การแจ้งเตือนและการติดตามสถานะทั้งหมด'],
}

export default function App(){
  const [session,setSession] = useState(undefined) // undefined=checking, null=logged out
  const [navOpen,setNavOpen] = useState(true)
  const [view,setView]     = useState('dashboard')
  const [cats,setCats]     = useState([])
  const [laws,setLaws]     = useState([])
  const [comms,setComms]   = useState([])
  const [notifs,setNotifs] = useState([])
  const [loading,setLoading] = useState(true)
  const [err,setErr]       = useState('')
  const [search,setSearch] = useState('')
  const [openLaw,setOpenLaw] = useState(null)
  const [monthYear,setMonthYear] = useState(new Date().getFullYear())
  const [months,setMonths]   = useState([])
  const [staging,setStaging] = useState([])
  const [updates,setUpdates] = useState([])
  const [activity,setActivity] = useState([])
  const [cars,setCars]       = useState([])
  const [reports,setReports] = useState([])

  // auth gate
  useEffect(()=>{
    if(!hasSupabase){ setSession(null); return }
    getSession().then(s=>setSession(s||null))
    const unsub = onAuthChange(s=>setSession(s||null))
    return unsub
  },[])

  const authed = !!session || session==='demo'

  async function reloadSkills(){
    try{ const [s,u,a] = await Promise.all([fetchStaging(), fetchUpdates(), fetchActivity()]); setStaging(s); setUpdates(u); setActivity(a) }
    catch(e){ console.warn('skills reload error',e) }
  }
  async function loadCars(){ try{ setCars(await fetchCars()) }catch(e){ console.warn('cars reload',e) } }
  async function loadReports(){ try{ setReports(await fetchReports()) }catch(e){ console.warn('reports reload',e) } }

  useEffect(()=>{ if(!authed) return; (async()=>{
    if(!hasSupabase){ setErr('ยังไม่ได้ตั้งค่า Supabase (.env) — กำลังแสดงหน้าเปล่า'); setLoading(false); return }
    try{
      const [d, mData, s, u, a, cs, rp] = await Promise.all([fetchAll(), fetchComplianceMonths(new Date().getFullYear()), fetchStaging(), fetchUpdates(), fetchActivity(), fetchCars(), fetchReports()])
      setCats(d.cats); setLaws(d.laws); setComms(d.comms); setNotifs(d.notifs)
      setMonths(mData); setStaging(s); setUpdates(u); setActivity(a); setCars(cs); setReports(rp)
    }
    catch(e){ setErr('เชื่อมต่อฐานข้อมูลไม่สำเร็จ: '+e.message) }
    setLoading(false)
  })() },[authed])

  useEffect(()=>{ (async()=>{
    if(!hasSupabase) return
    try{ const mData = await fetchComplianceMonths(monthYear); setMonths(mData) }
    catch(e){ console.warn('month fetch error',e) }
  })() },[monthYear])

  const catMap      = useMemo(()=>Object.fromEntries(cats.map(c=>[c.code,c])),[cats])
  const activeLaws  = useMemo(()=>laws.filter(l=>l.status!=='repealed'),[laws])
  const repealedLaws= useMemo(()=>laws.filter(l=>l.status==='repealed'),[laws])
  const stagingBatches = useMemo(()=>{ const g={}; staging.forEach(r=>{(g[r.law_code]=g[r.law_code]||[]).push(r)}); return Object.entries(g) },[staging])
  const newUpdates  = useMemo(()=>updates.filter(u=>u.status==='new'),[updates])
  const suggest     = useMemo(()=>suggestionLists(laws,cars),[laws,cars])

  async function handleAddStaged(code, rows){
    try{ await addStagedLaw(rows); const d=await fetchAll(); setLaws(d.laws); await reloadSkills() }
    catch(e){ alert('เพิ่มเข้าทะเบียนไม่สำเร็จ: '+e.message) }
  }
  async function handleDropStaged(rows){
    try{ await dismissStaged(rows.map(r=>r.id)); await reloadSkills() }
    catch(e){ alert('บันทึกไม่สำเร็จ: '+e.message) }
  }
  async function handleMarkUpdate(id, status){
    try{ await setUpdateStatus(id,status); await reloadSkills() }
    catch(e){ alert('บันทึกไม่สำเร็จ: '+e.message) }
  }

  const stats = useMemo(()=>{
    let req=0,met=0; activeLaws.forEach(l=>l.reqs.forEach(r=>{req++;if(r.status==='met')met++}))
    return { total:activeLaws.length, req, met, nc:req-met, pct:req?Math.round(met/req*100):100 }
  },[activeLaws])

  const reportAlerts = useMemo(()=>
    reports.filter(r=>{ if(!r.next_due_date) return false; const d=daysTo(r.next_due_date); return d<0||d<=(r.notify_days_before||30) }).length
  ,[reports])

  const bellNotifications = useMemo(()=>{
    const out=[]
    activeLaws.forEach(l=>{ if(l.status==='bad') out.push({type:'bad',law:l,text:l.code+' ยังไม่สอดคล้อง',sub:l.name.slice(0,60)}) })
    activeLaws.forEach(l=>{ if(l.review_date){ const d=daysTo(l.review_date); if(d>=0&&d<=200) out.push({type:'review',law:l,days:d,text:l.code+' ครบกำหนดทบทวนใน '+d+' วัน',sub:thDate(l.review_date)}) }})
    comms.forEach(c=>{ if(c.next_scheduled_date){ const d=daysTo(c.next_scheduled_date); const nb=c.notify_days_before||7; if(d>=0&&d<=nb) out.push({type:'comm',comm:c,days:d,text:'การสื่อสาร: '+c.topic.slice(0,50),sub:'ครบกำหนดใน '+d+' วัน — '+thDate(c.next_scheduled_date)}) }})
    reports.forEach(r=>{ if(r.next_due_date){ const d=daysTo(r.next_due_date); const nb=r.notify_days_before||30; if(d<0) out.push({type:'bad',goView:'reports',text:'รายงานเกินกำหนดส่ง: '+r.title.slice(0,50),sub:'เกิน '+Math.abs(d)+' วัน — '+thDate(r.next_due_date)}); else if(d<=nb) out.push({type:'review',goView:'reports',days:d,text:'ใกล้ครบกำหนดส่งรายงาน: '+r.title.slice(0,46),sub:'อีก '+d+' วัน — '+thDate(r.next_due_date)}) }})
    cars.forEach(c=>{ if(c.status!=='closed'&&c.due_date){ const d=daysTo(c.due_date); if(d<0) out.push({type:'bad',goView:'car',text:'CAR เกินกำหนดแก้ไข: '+(c.co_no||''),sub:(c.finding||'').slice(0,55)}); else if(d<=60) out.push({type:'review',goView:'car',days:d,text:'CAR ใกล้ครบกำหนด: '+(c.co_no||''),sub:'อีก '+d+' วัน — '+thDate(c.due_date)}) }})
    newUpdates.slice(0,15).forEach(u=>out.push({type:'law_update',goView:'updates',text:'กฎหมายใหม่: '+u.title.slice(0,55),sub:'จาก ShawPat'+(u.published_date?' · '+u.published_date:'')}))
    notifs.filter(n=>n.type==='comm_submitted').slice(0,3).forEach(n=>out.push({type:'submitted',text:n.message,sub:thDate(n.created_at)}))
    return out.sort((a,b)=>(a.type==='bad'?-1:0)-(b.type==='bad'?-1:0))
  },[activeLaws,comms,notifs,newUpdates,cars,reports])

  async function toggleReq(law, req){
    const next = req.status==='met' ? 'unmet' : 'met'
    setLaws(prev=>prev.map(l=>{
      if(l.id!==law.id) return l
      const reqs=l.reqs.map(r=>r.id===req.id?{...r,status:next}:r)
      const status=reqs.some(r=>r.status==='unmet')?'bad':'ok'
      return {...l,reqs,status}
    }))
    setOpenLaw(prev=>prev&&prev.id===law.id?{...prev,reqs:prev.reqs.map(r=>r.id===req.id?{...r,status:next}:r),status:prev.reqs.map(r=>r.id===req.id?{...r,status:next}:r).some(r=>r.status==='unmet')?'bad':'ok'}:prev)
    try{
      await setRequirementStatus(req.id,next); await recomputeLawStatus(law.id,law.reqs.map(r=>r.id===req.id?{...r,status:next}:r))
      await logActivity({ action:'requirement', law_id:law.id, law_code:law.code, law_name:law.name, detail:(next==='met'?'ปรับเป็นสอดคล้อง: ':'ปรับเป็นยังไม่สอดคล้อง: ')+(req.text||'').slice(0,80) })
      fetchActivity().then(setActivity)
    }
    catch(e){ alert('บันทึกไม่สำเร็จ: '+e.message) }
  }

  async function handleRepeal(law, data){
    try{
      await repealLaw(law.id,data); setLaws(prev=>prev.map(l=>l.id===law.id?{...l,status:'repealed',...data}:l)); setOpenLaw(null)
      await logActivity({ action:'repeal', law_id:law.id, law_code:law.code, law_name:law.name, detail:data?.repeal_reason||'ยกเลิก/แทนที่' })
      fetchActivity().then(setActivity)
    }
    catch(e){ alert('บันทึกไม่สำเร็จ: '+e.message) }
  }

  async function handleRestore(law){
    try{
      await restoreLaw(law.id); setLaws(prev=>prev.map(l=>l.id===law.id?{...l,status:'ok',repeal_date:null,repeal_reason:null,replaced_by_code:null,repealed_by_authority:null}:l)); setOpenLaw(null)
      await logActivity({ action:'restore', law_id:law.id, law_code:law.code, law_name:law.name, detail:'กู้คืนกฎหมาย' })
      fetchActivity().then(setActivity)
    }
    catch(e){ alert('บันทึกไม่สำเร็จ: '+e.message) }
  }

  async function handleCreateLaw(fields){
    try{
      const newLaw=await createLaw(fields); setLaws(prev=>[...prev,newLaw])
      await logActivity({ action:'create', law_id:newLaw.id, law_code:newLaw.code, law_name:newLaw.name, detail:'เพิ่มกฎหมายใหม่เข้าทะเบียน' })
      fetchActivity().then(setActivity)
    }
    catch(e){ alert('บันทึกไม่สำเร็จ: '+e.message) }
  }

  async function handleCreateFull(fields, reqs){
    const newLaw=await createLawFull(fields, reqs)
    setLaws(prev=>[...prev,newLaw])
    await logActivity({ action:'create', law_id:newLaw.id, law_code:newLaw.code, law_name:newLaw.name, detail:'เพิ่มกฎหมายเข้าทะเบียน ('+(reqs?.length||0)+' ข้อ)' })
    fetchActivity().then(setActivity)
    return newLaw
  }

  async function handleMarkSent(commId, fileRef){
    try{
      await markCommSent(commId,fileRef)
      const {data}=await supabase.from('lg_communications').select('*').eq('id',commId).single()
      if(data) setComms(prev=>prev.map(c=>c.id===commId?data:c))
    } catch(e){ alert('บันทึกไม่สำเร็จ: '+e.message) }
  }

  async function handleCommScheduleUpdate(commId, patch){
    try{ await updateCommSchedule(commId,patch); setComms(prev=>prev.map(c=>c.id===commId?{...c,...patch}:c)) }
    catch(e){ alert('บันทึกไม่สำเร็จ: '+e.message) }
  }

  async function handleReportSetEvent(id, eventDate, offsetDays){
    try{ await setReportEvent(id, eventDate, offsetDays); await loadReports() }
    catch(e){ alert('บันทึกไม่สำเร็จ: '+e.message) }
  }
  async function handleReportSubmit(id, fileRef){
    try{ await markReportSubmitted(id, fileRef); await loadReports() }
    catch(e){ alert('บันทึกไม่สำเร็จ: '+e.message) }
  }

  async function handleToggleMonth(year, month){
    const existing = months.find(m=>m.year===year && m.month===month)
    const nowChecked = existing ? !existing.checked : true
    const checkedAt  = nowChecked ? new Date().toISOString() : null
    setMonths(prev=>{
      const hit = prev.find(m=>m.year===year && m.month===month)
      if(hit) return prev.map(m=>m.year===year&&m.month===month ? {...m,checked:nowChecked,checked_at:checkedAt} : m)
      return [...prev, {year,month,checked:nowChecked,checked_at:checkedAt}]
    })
    if(hasSupabase){ try{ await toggleMonthCheck(year,month,nowChecked) }catch(e){ alert('บันทึกไม่สำเร็จ: '+e.message) } }
  }

  function exportPDF(){ buildReport({laws:activeLaws,stats,catName:Object.fromEntries(cats.map(c=>[c.code,c.name]))}); window.print() }

  if(session===undefined) return <div className="loading"><div className="spin"/>กำลังตรวจสอบสิทธิ์…</div>
  if(!authed) return <Login onAuthed={s=>setSession(s)} onBypass={()=>setSession('demo')}/>
  if(loading) return <div className="loading"><div className="spin"/>กำลังโหลดข้อมูลจากฐานข้อมูล…</div>

  const title = TITLES[view] || ['—','']

  return (
    <div className={'app'+(navOpen?'':' nav-collapsed')}>
      <aside className={'sidebar'+(navOpen?'':' collapsed')}>
        <div className="brand" role="button" tabIndex={0} title="กลับหน้าหลัก"
          onClick={()=>setView('dashboard')}
          onKeyDown={e=>{ if(e.key==='Enter'||e.key===' ') setView('dashboard') }}>
          <div className="brand-mark">CR</div>
          <h1>ComplyRegister</h1>
          <span>ทะเบียนกฎหมาย SHE</span>
        </div>

        {NAV_GROUPS.map((group,gi)=>(
          <div key={gi} className="nav-group">
            {group.label && <div className="nav-label">{group.label}</div>}
            {group.items.map(n=>{
              const badge =
                n.id==='register'      ? activeLaws.length        :
                n.id==='compliance'    ? (stats.nc||null)         :
                n.id==='improvements'  ? (stats.nc||null)         :
                n.id==='repealed'      ? (repealedLaws.length||null) :
                n.id==='reports'       ? (reportAlerts||null)     :
                n.id==='car'           ? (cars.filter(c=>c.status!=='closed').length||null) :
                n.id==='staging'       ? (stagingBatches.length||null) :
                n.id==='updates'       ? (newUpdates.length||null)   :
                n.id==='notifications' ? (bellNotifications.length||null) : null
              return (
                <button key={n.id} className={'nav-item'+(view===n.id?' active':'')}
                  onClick={()=>setView(n.id)}>
                  <span className="label">{n.label}</span>
                  {badge && <span className="badge">{badge}</span>}
                </button>
              )
            })}
          </div>
        ))}

        <div className="side-foot">
          <div className="av">จ</div>
          <div><div className="nm">จป. วิชาชีพ</div><div className="rl">จัสเทล เน็ทเวิร์ค</div></div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="navtoggle no-print" onClick={()=>setNavOpen(o=>!o)} title={navOpen?'ปิดเมนู':'เปิดเมนู'} aria-label="toggle menu">
            <span/><span/><span/>
          </button>
          <div className="vt">{title[0]}<small>{title[1]}</small></div>
          <div className="spacer"/>
          {(view==='register'||view==='repealed') && (
            <div className="search"><input placeholder="ค้นหากฎหมาย, รหัส, กระทรวง…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
          )}
          {(view==='register'||view==='dashboard') && (
            <button className="btn btn-ghost no-print" onClick={()=>exportLawsToExcel(activeLaws,catMap)}>ส่งออก Excel</button>
          )}
          <button className="btn btn-ghost no-print" onClick={exportPDF}>ส่งออก PDF</button>
          <button className="bell no-print" onClick={()=>setView('notifications')}>
            การแจ้งเตือน{bellNotifications.length>0&&<span className="dot">{bellNotifications.length}</span>}
          </button>
          <button className="btn btn-ghost no-print" onClick={async()=>{ await signOut(); setSession(null) }}>ออกจากระบบ</button>
        </header>

        <div className="content">
          {err && <div className="banner">{err}</div>}
          {view==='dashboard'     && <Dashboard     laws={laws} cats={cats} catMap={catMap} onOpen={setOpenLaw} updates={updates} staging={stagingBatches} activity={activity} reports={reports} onGoReports={()=>setView('reports')}/>}
          {view==='register'      && <Register      laws={activeLaws} cats={cats} catMap={catMap} search={search} onOpen={setOpenLaw} onCreate={handleCreateLaw} allLaws={laws}
            months={months} monthYear={monthYear} setMonthYear={setMonthYear} onToggleMonth={handleToggleMonth}/>}
          {view==='compliance'    && <Compliance    laws={activeLaws} cats={cats} stats={stats} onOpen={setOpenLaw}/>}
          {view==='improvements'  && <Improvements  laws={activeLaws} catMap={catMap} onOpen={setOpenLaw}/>}
          {view==='repealed'      && <Repealed      laws={repealedLaws} catMap={catMap} search={search} onOpen={setOpenLaw} onRestore={handleRestore}/>}
          {view==='comm'          && <Communication comms={comms} onMarkSent={handleMarkSent} onScheduleUpdate={handleCommScheduleUpdate}/>}
          {view==='reports'       && <Reports       reports={reports} onSetEvent={handleReportSetEvent} onSubmit={handleReportSubmit}/>}
          {view==='car'           && <CarOfi        cars={cars} onReload={loadCars} suggest={suggest}/>}
          {view==='analysis'      && <Analysis      laws={activeLaws} cats={cats} catMap={catMap} allLaws={laws} onAnalyzed={reloadSkills} goView={setView} onCreateFull={handleCreateFull} suggest={suggest}/>}
          {view==='staging'       && <Staging       batches={stagingBatches} catMap={catMap} onAdd={handleAddStaged} onDrop={handleDropStaged}/>}
          {view==='updates'       && <Updates       updates={updates} onMark={handleMarkUpdate} onScanned={reloadSkills}/>}
          {view==='notifications' && <NotificationsPage notifs={bellNotifications} onOpenLaw={setOpenLaw} onGoToView={setView}/>}
        </div>
      </div>

      {openLaw && (
        <LawDrawer law={openLaw} catMap={catMap} onClose={()=>setOpenLaw(null)}
          onToggle={toggleReq} onRepeal={handleRepeal} onRestore={handleRestore}
          prog={prog} thDate={thDate}/>
      )}
      <div id="print-report"/>
    </div>
  )
}

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
      <defs>
        <linearGradient id="rgOk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3ad07e"/><stop offset="1" stopColor="#1f9d57"/></linearGradient>
        <linearGradient id="rgBad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff6b5e"/><stop offset="1" stopColor="#d6342a"/></linearGradient>
      </defs>
      <circle cx="75" cy="75" r={r} fill="none" stroke="var(--line-soft)" strokeWidth="13"/>
      <circle cx="75" cy="75" r={r} fill="none" stroke="url(#rgOk)" strokeLinecap="round"
        strokeWidth={hover==='met'?17:13}
        strokeDasharray={`${Math.max(0,c*metFrac-gap)} ${c}`} strokeDashoffset={0}
        style={{transition:'stroke-dashoffset 1s var(--ease-out), stroke-width .18s',cursor:'pointer'}}
        onMouseEnter={()=>setHover('met')} onMouseLeave={()=>setHover(null)}/>
      {nc>0 && <circle cx="75" cy="75" r={r} fill="none" stroke="url(#rgBad)" strokeLinecap="round"
        strokeWidth={hover==='nc'?17:13}
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
  return cats.filter(c=>byCat[c.code]).map(c=>{
    let r=0,m=0; byCat[c.code].forEach(l=>l.reqs.forEach(x=>{r++;if(x.status==='met')m++}))
    const p=r?Math.round(m/r*100):100
    return <div className="catbar" key={c.code}><div className="top"><span className="nm">{c.code} · {c.name}</span><b className="num" style={{color:c.color}}>{p}%</b></div>
      <div className="track"><div className="fill" style={{width:p+'%',background:c.color}}/></div></div>
  })
}

const beYearFromDate = d => { if(!d) return null; const x=new Date(d); return isNaN(x)?null:x.getFullYear()+543 }

function Timeline({laws,catMap,onOpen,curBE,fromBE}){
  const [mode,setMode]=useState('added')  // added | repealed | all
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
        {byYear.map(yr=>(
          <div key={yr.year} className="tl-year">
            <div className="tl-head">
              <span className="tl-dot"/>
              <b className="num" style={{fontSize:15}}>{yr.year}</b>
              <span className="sub" style={{marginLeft:10}}>
                {yr.nNew>0 && <span style={{color:'var(--ok)'}}>ใหม่ {yr.nNew} · </span>}
                บังคับใช้ {yr.nEff} ฉบับ{yr.nRep>0 && <span style={{color:'var(--bad)'}}> · ยกเลิก {yr.nRep}</span>}
              </span>
            </div>
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
          </div>
        ))}
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
  const days = useMemo(()=>{
    const g={}
    activity.forEach(a=>{ const d=(a.created_at||'').slice(0,10); (g[d]=g[d]||[]).push(a) })
    return Object.entries(g).sort((a,b)=>b[0].localeCompare(a[0]))
  },[activity])
  const fullDate = s => { if(!s) return ''; const m=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']; const d=new Date(s); return d.getDate()+' '+m[d.getMonth()]+' '+(d.getFullYear()+543) }
  const hhmm = s => { const d=new Date(s); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0') }
  return (
    <div className="panel" style={{marginTop:16}}>
      <div className="panel-h"><h3>ไทม์ไลน์เหตุการณ์ (ตามวันที่จริง)</h3>
        <span className="sub" style={{marginLeft:'auto'}}>บันทึกอัตโนมัติทุกครั้งที่เพิ่ม / แก้ / ยกเลิก / นำเข้า</span></div>
      <div className="panel-b">
        {days.length===0 && <div style={{textAlign:'center',color:'var(--ink-faint)',padding:24,fontSize:13}}>ยังไม่มีเหตุการณ์ — เมื่อมีการเพิ่ม/แก้/ยกเลิกกฎหมาย จะบันทึกที่นี่พร้อมวันเวลา</div>}
        {days.map(([date,items])=>(
          <div key={date} className="tl-year">
            <div className="tl-head"><span className="tl-dot"/><b style={{fontSize:14}}>{fullDate(date)}</b><span className="sub" style={{marginLeft:10}}>{items.length} เหตุการณ์</span></div>
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
      </div>
    </div>
  )
}

function ReportDeadlinesPanel({reports=[],onGoReports}){
  const upcoming = useMemo(()=>reports
    .filter(r=>r.next_due_date)
    .map(r=>({...r,d:daysTo(r.next_due_date)}))
    .filter(r=>r.d<0||r.d<=(r.notify_days_before||30))
    .sort((a,b)=>a.d-b.d)
    .slice(0,8)
  ,[reports])
  return (
    <div className="panel" style={{marginTop:16}}>
      <div className="panel-h"><h3>รายงานราชการที่ใกล้ครบกำหนด</h3>
        <span className="sub" style={{marginLeft:'auto',cursor:'pointer',color:'var(--brand)'}} onClick={onGoReports}>ดูทั้งหมด →</span></div>
      <div className="panel-b">
        {upcoming.length===0 && <div style={{textAlign:'center',color:'var(--ink-faint)',padding:24,fontSize:13}}>ไม่มีรายงานที่ใกล้ครบกำหนดในช่วงนี้ ✓</div>}
        {upcoming.map(r=>(
          <div key={r.id} className="tl-row" onClick={onGoReports} style={{padding:'8px 6px'}}>
            <span className="tl-tag" style={{background:r.d<0?'var(--bad)':r.d<=7?'var(--warn)':'var(--review)'}}>
              {r.d<0?'เกิน '+Math.abs(r.d)+' วัน':r.d===0?'วันนี้':'อีก '+r.d+' วัน'}
            </span>
            {r.law_code && <span className="law-code" style={{minWidth:58}}>{r.law_code}</span>}
            <span style={{flex:1,fontSize:13}}>{r.title.slice(0,70)}{r.title.length>70?'…':''}</span>
            <span className="sub">{thDate(r.next_due_date)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Dashboard({laws,cats,catMap,onOpen,updates=[],staging=[],activity=[],reports=[],onGoReports}){
  const lawById = useMemo(()=>Object.fromEntries(laws.map(l=>[l.id,l])),[laws])
  const curBE = new Date().getFullYear()+543
  const tlFromBE = curBE-2   // ไทม์ไลน์: 3 ปีย้อนหลัง

  const active = useMemo(()=>laws.filter(l=>l.status!=='repealed'),[laws])
  const fLaws  = active   // ช่วงเวลา: ทั้งหมด

  const stats = useMemo(()=>{
    let req=0,met=0; fLaws.forEach(l=>l.reqs.forEach(r=>{req++;if(r.status==='met')met++}))
    return { total:fLaws.length, req, met, nc:req-met, pct:req?(met/req*100):100 }
  },[fLaws])

  const bad=fLaws.filter(l=>l.status==='bad')
  const newUpdates=updates.filter(u=>u.status==='new')
  const winLabel = 'ทั้งหมด'
  const cards=[
    {cls:'s-total', lab:'กฎหมายทั้งหมด',          val:stats.total, unit:'ฉบับ', delta:cats.length+' หมวด'},
    {cls:'s-warn',  lab:'ข้อกำหนดทั้งหมด',       val:stats.req,   unit:'ข้อ',  delta:'ประเมินครบทุกข้อ'},
    {cls:'s-ok',    lab:'ข้อกำหนดที่สอดคล้อง',  val:stats.met,   unit:'ข้อ',  delta:stats.pct.toFixed(1)+'% ของข้อกำหนด'},
    {cls:'s-bad',   lab:'ยังไม่สอดคล้อง',        val:stats.nc,    unit:'ข้อ',  delta:'ต้องติดตาม'},
  ]
  const recent = activity.slice(0,4)
  const relTime = s => { const sec=Math.floor((Date.now()-new Date(s))/1000); if(sec<60)return'เมื่อสักครู่'; const mi=Math.floor(sec/60); if(mi<60)return mi+' นาทีก่อน'; const h=Math.floor(mi/60); if(h<24)return h+' ชม.ก่อน'; const d=Math.floor(h/24); return d+' วันก่อน' }

  return <div className="view">
    {/* most up-to-date info — pinned at top */}
    <div className="panel" style={{marginBottom:14,borderTop:'3px solid var(--brand)'}}>
      <div className="panel-h"><h3>อัปเดตล่าสุด</h3><span className="sub" style={{marginLeft:'auto'}}>ความเคลื่อนไหวรายวัน</span></div>
      <div className="panel-b">
        <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:recent.length?12:0}}>
          {newUpdates.length>0 && <span className="pill p-bad">กฎหมายใหม่จาก ShawPat {newUpdates.length} รายการ</span>}
          {staging.length>0 && <span className="pill" style={{background:'var(--brand-tint)',color:'var(--brand)'}}>รออนุมัตินำเข้า {staging.length} ฉบับ</span>}
          {newUpdates.length===0 && staging.length===0 && recent.length===0 && <span style={{fontSize:13,color:'var(--ink-faint)'}}>ยังไม่มีความเคลื่อนไหว — เมื่อมีการเพิ่ม/แก้/ยกเลิกกฎหมาย จะแสดงที่นี่</span>}
        </div>
        {recent.map(a=>{ const m=ACT_META[a.action]||{t:a.action,c:'var(--ink-faint)'}; const law=lawById[a.law_id]
          return (
            <div key={a.id} className="tl-row" onClick={()=>law&&onOpen(law)} style={{padding:'7px 6px'}}>
              <span className="tl-tag" style={{background:m.c}}>{m.t}</span>
              {a.law_code && <span className="law-code" style={{minWidth:58}}>{a.law_code}</span>}
              <span style={{flex:1,fontSize:13}}>{a.detail||a.law_name}</span>
              <span className="sub">{relTime(a.created_at)}</span>
            </div>
          )})}
      </div>
    </div>

    <div className="grid stats">
      {cards.map((c,i)=>(<div className={'stat '+c.cls} key={i}>
        <div className="lab">{c.lab}</div>
        <div className="val num">{c.val} <small>{c.unit}</small></div>
        <div className="delta">{c.delta}</div>
      </div>))}
    </div>

    <div className="cols">
      <div className="panel"><div className="panel-h"><h3>อัตราความสอดคล้อง</h3><span className="sub" style={{marginLeft:'auto'}}>{winLabel}</span></div>
        <div className="panel-b"><div className="ring-wrap"><Ring pct={stats.pct} met={stats.met} nc={stats.nc}/>
          <div className="legend">
            <div className="row"><span className="dot" style={{background:'var(--ok)'}}/>ข้อกำหนดสอดคล้อง (C)<b className="num">{stats.met}</b></div>
            <div className="row"><span className="dot" style={{background:'var(--bad)'}}/>ยังไม่สอดคล้อง (NC)<b className="num">{stats.nc}</b></div>
          </div></div></div></div>
      <div className="panel"><div className="panel-h"><h3>ความสอดคล้องตามหมวดกฎหมาย</h3></div>
        <div className="panel-b"><CatBars laws={fLaws} cats={cats}/></div></div>
    </div>

    <ReportDeadlinesPanel reports={reports} onGoReports={onGoReports}/>

    <ActivityTimeline activity={activity} onOpenLaw={onOpen} lawById={lawById}/>
    <Timeline laws={laws} catMap={catMap} onOpen={onOpen} curBE={curBE} fromBE={tlFromBE}/>

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

/* ─────────────────────────── ADD LAW MODAL ───────────────────────── */
function nextCode(allLaws, catCode) {
  const nums = allLaws
    .filter(l => l.cat === catCode)
    .map(l => { const m = l.code.match(/(\d+)$/); return m ? parseInt(m[1], 10) : 0 })
  const max = nums.length ? Math.max(...nums) : 0
  return `${catCode}-${String(max + 1).padStart(3, '0')}`
}

function AddLawModal({ cats, allLaws, onSave, onClose }) {
  const [catCode, setCatCode] = useState(cats[0]?.code || '')
  const [level, setLevel] = useState('1')
  const [name, setName] = useState('')
  const [ministry, setMinistry] = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [saving, setSaving] = useState(false)

  const previewCode = catCode ? nextCode(allLaws, catCode) : '—'
  const valid = catCode && name.trim()

  async function save() {
    if (!valid) return
    setSaving(true)
    await onSave({ code: previewCode, cat: catCode, name: name.trim(), hierarchy_level: level, ministry, effective_date: effectiveDate, review_date: '' })
    setSaving(false)
    onClose()
  }

  return (
    <><div className="scrim" style={{zIndex:300}} onClick={onClose}/>
    <div className="modal" style={{zIndex:301,width:540}}>
      <div className="modal-head">
        <h3>เพิ่มกฎหมายใหม่</h3>
        <button className="close" onClick={onClose}>×</button>
      </div>
      <div className="modal-body">
        {/* code preview */}
        <div style={{background:'var(--brand-tint)',border:'1px solid var(--brand)',borderRadius:9,padding:'10px 16px',marginBottom:8,display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:12,color:'var(--brand)',fontWeight:600}}>รหัสกฎหมายที่จะได้รับ</span>
          <span className="num" style={{fontSize:22,fontWeight:700,color:'var(--brand)',letterSpacing:-1,marginLeft:'auto'}}>{previewCode}</span>
        </div>

        <label className="form-label">หมวดกฎหมาย <span style={{color:'var(--bad)'}}>*</span></label>
        <select className="form-input" value={catCode} onChange={e=>setCatCode(e.target.value)}>
          {cats.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
        </select>

        <label className="form-label">ลำดับชั้น <span style={{color:'var(--bad)'}}>*</span></label>
        <select className="form-input" value={level} onChange={e=>setLevel(e.target.value)}>
          {LAW_TYPES.map(t=><option key={t.level} value={t.level}>ชั้น {t.level} — {t.label}</option>)}
        </select>

        <label className="form-label">ชื่อกฎหมาย <span style={{color:'var(--bad)'}}>*</span></label>
        <textarea className="form-input" rows={3} placeholder="ชื่อกฎหมายฉบับเต็ม…" value={name} onChange={e=>setName(e.target.value)}/>

        <label className="form-label">กระทรวง / หน่วยงาน</label>
        <input className="form-input" type="text" placeholder="เช่น กระทรวงแรงงาน" value={ministry} onChange={e=>setMinistry(e.target.value)}/>

        <label className="form-label">วันที่บังคับใช้</label>
        <input className="form-input" type="date" value={effectiveDate} onChange={e=>setEffectiveDate(e.target.value)}/>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-primary" disabled={!valid||saving} onClick={save}>
          {saving ? 'กำลังบันทึก…' : `บันทึก ${previewCode}`}
        </button>
      </div>
    </div></>
  )
}

/* ─────────────────────────── REGISTER ─────────────────────────── */
function Register({laws,cats,catMap,search,onOpen,onCreate,allLaws,months,monthYear,setMonthYear,onToggleMonth}){
  const [cat,setCat]=useState('all')
  const [showAdd,setShowAdd]=useState(false)
  const catsList=[...new Set(laws.map(l=>l.cat))].sort()
  const q=search.toLowerCase()
  const rows=laws.filter(l=>(cat==='all'||l.cat===cat)&&(!q||l.name.toLowerCase().includes(q)||l.code.toLowerCase().includes(q)||(l.ministry||'').toLowerCase().includes(q)))
  const grouped=useMemo(()=>{ const byCat={}; rows.forEach(l=>{ const c=l.cat; if(!byCat[c])byCat[c]={}; const t=l.hierarchy_level||5; if(!byCat[c][t])byCat[c][t]=[]; byCat[c][t].push(l) }); return byCat },[rows])
  const activeCats=catsList.filter(c=>cat==='all'||c===cat)
  return <div className="view">
    {showAdd && <AddLawModal cats={cats} allLaws={allLaws} onSave={onCreate} onClose={()=>setShowAdd(false)}/>}
    <div style={{marginBottom:16}}>
      <MonthlyCheckPanel months={months} year={monthYear} setYear={setMonthYear} onToggle={onToggleMonth}/>
    </div>
    <div className="filterbar">
      <span className={'chip'+(cat==='all'?' active':'')} onClick={()=>setCat('all')}>ทุกหมวด ({laws.length})</span>
      {catsList.map(c=>(<span key={c} className={'chip'+(cat===c?' active':'')} onClick={()=>setCat(c)} style={cat===c?{borderColor:catMap[c]?.color,color:catMap[c]?.color}:{}}>{c} · {catMap[c]?.name} ({laws.filter(l=>l.cat===c).length})</span>))}
      <span className="right" style={{marginLeft:'auto'}}>พบ {rows.length} ฉบับ</span>
      <button className="btn btn-primary" style={{padding:'6px 14px',fontSize:12.5}} onClick={()=>setShowAdd(true)}>+ เพิ่มกฎหมาย</button>
    </div>
    {activeCats.map(c=>(
      <div key={c} style={{marginBottom:20}}>
        <div className="hier-cat-header" style={{borderLeftColor:catMap[c]?.color||'var(--brand)'}}>
          <span style={{color:catMap[c]?.color,fontWeight:700}}>{c}</span>
          <span style={{marginLeft:8,color:'var(--ink-soft)'}}>{catMap[c]?.name}</span>
          <span style={{marginLeft:'auto',fontSize:12,color:'var(--ink-faint)'}}>{rows.filter(l=>l.cat===c).length} ฉบับ</span>
        </div>
        {LAW_TYPES.filter(t=>grouped[c]?.[t.level]?.length).map(t=>(
          <div key={t.level} style={{marginBottom:8}}>
            <div className="hier-tier-label"><span className="tier-badge">ชั้น {t.level}</span>{t.label}</div>
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
      </div>
    ))}
    {rows.length===0 && <div className="panel"><div style={{textAlign:'center',color:'var(--ink-faint)',padding:40}}>ไม่พบกฎหมายที่ตรงกับเงื่อนไข</div></div>}
  </div>
}

/* ─────────────────────────── COMPLIANCE ─────────────────────────── */
const TH_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

function MonthlyCheckPanel({ months, year, setYear, onToggle }) {
  const toBE = y => y + 543
  const getMonth = m => months.find(r=>r.year===year && r.month===m) || {checked:false}
  const checkedCount = months.filter(m=>m.year===year && m.checked).length

  return (
    <div className="panel month-panel">
      <div className="panel-h">
        <h3>การตรวจสอบรายเดือน</h3>
        <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:'auto'}}>
          <button className="month-yr-btn" onClick={()=>setYear(y=>y-1)}>‹</button>
          <span style={{fontSize:13,fontWeight:600,minWidth:60,textAlign:'center'}}>ปี {toBE(year)}</span>
          <button className="month-yr-btn" onClick={()=>setYear(y=>y+1)}>›</button>
        </div>
        <span className="sub">{checkedCount}/12 เดือน</span>
      </div>
      <div className="month-grid">
        {TH_MONTHS.map((label, i) => {
          const m = i + 1
          const rec = getMonth(m)
          const isCurrentMonth = year===new Date().getFullYear() && m===new Date().getMonth()+1
          return (
            <button
              key={m}
              className={'month-cell'+(rec.checked?' month-checked':'')+(isCurrentMonth?' month-current':'')}
              onClick={()=>onToggle(year, m)}
              title={rec.checked && rec.checked_at ? 'ตรวจสอบแล้ว: '+new Date(rec.checked_at).toLocaleDateString('th-TH') : 'คลิกเพื่อทำเครื่องหมาย'}
            >
              <span className="month-name">{label}</span>
              <span className="month-tick">{rec.checked ? '✓' : ''}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Compliance({laws,cats,stats,onOpen}){
  const byCat={}; laws.forEach(l=>{(byCat[l.cat]=byCat[l.cat]||[]).push(l)})
  return <div className="view">
    <div className="grid" style={{gridTemplateColumns:'repeat(3,1fr)',marginBottom:16}}>
      <div className="panel" style={{padding:18}}><div style={{fontSize:13,color:'var(--ink-faint)'}}>ข้อกำหนดทั้งหมด</div><div className="num" style={{fontSize:28,fontWeight:700}}>{stats.req}</div></div>
      <div className="panel" style={{padding:18}}><div style={{fontSize:13,color:'var(--ink-faint)'}}>ผ่านการประเมิน (C)</div><div className="num" style={{fontSize:28,fontWeight:700,color:'var(--ok)'}}>{stats.met}</div></div>
      <div className="panel" style={{padding:18}}><div style={{fontSize:13,color:'var(--ink-faint)'}}>ยังไม่สอดคล้อง (NC)</div><div className="num" style={{fontSize:28,fontWeight:700,color:'var(--bad)'}}>{stats.nc}</div></div>
    </div>

    <div className="panel" style={{marginTop:14}}><div className="panel-h"><h3>สถานะรายหมวด / ลำดับชั้นกฎหมาย</h3><span className="sub" style={{marginLeft:'auto'}}>คลิกที่กฎหมายเพื่อดูข้อกำหนดและแก้ไข</span></div>
      <div className="panel-b">
        {cats.filter(c=>byCat[c.code]).map(c=>{
          let r=0,m=0; byCat[c.code].forEach(l=>l.reqs.forEach(x=>{r++;if(x.status==='met')m++}))
          const p=r?Math.round(m/r*100):100
          const byTier={}; byCat[c.code].forEach(l=>{ const t=l.hierarchy_level||5; (byTier[t]=byTier[t]||[]).push(l) })
          return <details key={c.code} style={{marginBottom:12}} open={c.code==='LA'}>
            <summary style={{cursor:'pointer',display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'var(--surface-2)',border:'1px solid var(--line)',borderRadius:8,listStyle:'none'}}>
              <span style={{width:8,height:8,borderRadius:2,background:c.color,flexShrink:0}}/>
              <b style={{}}>{c.code}</b><span style={{flex:1}}>{c.name}</span>
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
function Repealed({laws,catMap,search,onOpen,onRestore}){
  const q=search.toLowerCase()
  const rows=laws.filter(l=>!q||l.name.toLowerCase().includes(q)||l.code.toLowerCase().includes(q))
  const thDate = s => { if(!s) return '—'; const m=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']; const d=new Date(s); return d.getDate()+' '+m[d.getMonth()]+' '+(d.getFullYear()+543) }

  if (rows.length===0) return (
    <div className="view">
      <div className="panel" style={{padding:'60px 20px',textAlign:'center'}}>
        <div style={{width:52,height:52,borderRadius:14,background:'var(--surface-3)',color:'var(--ink-faint)',display:'grid',placeItems:'center',margin:'0 auto 14px',fontSize:22,fontWeight:700}}>—</div>
        <div style={{fontSize:16,fontWeight:700}}>ยังไม่มีกฎหมายที่ถูกยกเลิก</div>
        <div style={{fontSize:13,color:'var(--ink-faint)',marginTop:6}}>กฎหมายที่บันทึกการยกเลิกจะแสดงที่นี่</div>
      </div>
    </div>
  )

  return <div className="view">
    {/* summary banner */}
    <div style={{display:'flex',alignItems:'center',gap:16,padding:'14px 18px',background:'var(--bad-bg)',border:'1px solid var(--bad-bg)',borderRadius:12,marginBottom:20}}>
      <div style={{width:40,height:40,borderRadius:11,background:'var(--bad)',color:'#fff',display:'grid',placeItems:'center',flexShrink:0,fontSize:14,fontWeight:700}}>ยก</div>
      <div>
        <div style={{fontWeight:700,fontSize:15,color:'var(--bad)'}}>{rows.length} กฎหมายที่ถูกยกเลิก / แทนที่</div>
        <div style={{fontSize:12.5,color:'var(--bad)',marginTop:2}}>รายการเหล่านี้ไม่นับในสถิติความสอดคล้อง — สามารถกู้คืนได้จากหน้ารายละเอียด</div>
      </div>
    </div>

    {/* detail cards */}
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {rows.map(l=>{
        const cat=catMap[l.cat]
        return (
          <div key={l.id} style={{background:'var(--surface)',border:'1px solid var(--line)',borderRadius:12,overflow:'hidden',boxShadow:'var(--shadow-xs)'}}>
            {/* card header */}
            <div style={{padding:'14px 20px',background:'var(--bad-bg)',borderBottom:'1px solid var(--bad-bg)',display:'flex',alignItems:'flex-start',gap:14}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                  <span className="num" style={{fontSize:12,color:'var(--bad)',fontWeight:700,textDecoration:'line-through'}}>{l.code}</span>
                  <Tag c={l.cat} color={cat?.color}/>
                  <span className="pill p-repealed" style={{fontSize:10}}>ยกเลิกแล้ว</span>
                </div>
                <div style={{fontWeight:600,fontSize:14,color:'var(--ink-soft)',lineHeight:1.4,textDecoration:'line-through'}}>{l.name.slice(0,100)}{l.name.length>100?'…':''}</div>
                <div style={{fontSize:12,color:'var(--ink-faint)',marginTop:3}}>{l.ministry||'—'}</div>
              </div>
              <div style={{display:'flex',gap:8,flexShrink:0}}>
                <button className="btn btn-ghost" style={{padding:'5px 12px',fontSize:12}} onClick={()=>onOpen(l)}>ดูรายละเอียด</button>
                <button className="btn btn-primary" style={{padding:'5px 12px',fontSize:12}} onClick={()=>onRestore(l)}>กู้คืน</button>
              </div>
            </div>
            {/* repeal details */}
            <div style={{padding:'14px 20px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px 24px'}}>
              <div>
                <div style={{fontSize:11,color:'var(--ink-faint)',fontWeight:600,letterSpacing:.4,textTransform:'uppercase',marginBottom:3}}>วันที่มีผลยกเลิก</div>
                <div style={{fontSize:13.5,fontWeight:600,color:'var(--bad)'}}>{thDate(l.repeal_date)}</div>
              </div>
              <div>
                <div style={{fontSize:11,color:'var(--ink-faint)',fontWeight:600,letterSpacing:.4,textTransform:'uppercase',marginBottom:3}}>แทนที่ด้วย</div>
                <div className="num" style={{fontSize:13.5,fontWeight:600,color:l.replaced_by_code?'var(--brand)':'var(--ink-faint)'}}>{l.replaced_by_code||'ไม่มีกฎหมายแทน'}</div>
              </div>
              <div>
                <div style={{fontSize:11,color:'var(--ink-faint)',fontWeight:600,letterSpacing:.4,textTransform:'uppercase',marginBottom:3}}>อ้างอิง</div>
                <div style={{fontSize:12.5,color:'var(--ink-soft)'}}>{l.repealed_by_authority||'—'}</div>
              </div>
              {l.repeal_reason && (
                <div style={{gridColumn:'1/-1',paddingTop:10,borderTop:'1px solid var(--line-soft)'}}>
                  <div style={{fontSize:11,color:'var(--ink-faint)',fontWeight:600,letterSpacing:.4,textTransform:'uppercase',marginBottom:4}}>เหตุผลการยกเลิก</div>
                  <div style={{fontSize:13,color:'var(--ink-soft)',lineHeight:1.6}}>{l.repeal_reason}</div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  </div>
}

/* ─────────────────────────── COMMUNICATION ─────────────────────────── */
function CommScheduleModal({comm,onSave,onClose}){
  const [date,setDate]=useState(comm.scheduled_date||'')
  const [rec,setRec]=useState(comm.recurrence_type||'annually')
  const [notifyDays,setNotifyDays]=useState(comm.notify_days_before||7)
  const [assignedTo,setAssignedTo]=useState(comm.assigned_to||'')
  function save(){ onSave(comm.id,{scheduled_date:date||null,recurrence_type:rec,next_scheduled_date:date||null,notify_days_before:Number(notifyDays),assigned_to:assignedTo||null}); onClose() }
  return (<><div className="scrim" onClick={onClose}/>
    <div className="modal">
      <div className="modal-head"><h3>ตั้งค่าตารางการสื่อสาร</h3><button className="close" onClick={onClose}>×</button></div>
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
        <button className="btn btn-primary" onClick={save}>บันทึก</button>
      </div>
    </div></>)
}
function MarkSentModal({comm,onSave,onClose}){
  const [fileRef,setFileRef]=useState(comm.file_reference||'')
  function save(){ onSave(comm.id,fileRef); onClose() }
  return (<><div className="scrim" onClick={onClose}/>
    <div className="modal">
      <div className="modal-head"><h3>บันทึกการส่ง / สื่อสาร</h3><button className="close" onClick={onClose}>×</button></div>
      <div className="modal-body">
        <p style={{fontSize:13,color:'var(--ink-soft)',marginBottom:16}}>{comm.topic}</p>
        <label className="form-label">อ้างอิงไฟล์ / เอกสารที่ส่ง (ไม่บังคับ)</label>
        <input className="form-input" type="text" placeholder="เช่น ISD-86_2569Q1.pdf หรือ URL…" value={fileRef} onChange={e=>setFileRef(e.target.value)}/>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-primary" onClick={save}>ยืนยันการส่ง</button>
      </div>
    </div></>)
}
function Communication({comms,onMarkSent,onScheduleUpdate}){
  const [scope,setScope]=useState('internal')
  const [filter,setFilter]=useState('all')
  const [schedModal,setSchedModal]=useState(null)
  const [sentModal,setSentModal]=useState(null)
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
            {c.next_scheduled_date?<><div>{c.next_scheduled_date}</div>{countdownChip(c)}</>:<span style={{color:'var(--ink-faint)'}}>ยังไม่ตั้งค่า</span>}
          </td>
          <td style={{fontSize:12.5,color:'var(--ink-soft)'}}>{c.assigned_to||'—'}</td>
          <td><div style={{display:'flex',gap:4}}>
            <button className="btn btn-ghost" style={{padding:'3px 8px',fontSize:11}} onClick={()=>setSchedModal(c)} title="ตั้งค่าตาราง">ตาราง</button>
            <button className="btn btn-primary" style={{padding:'3px 8px',fontSize:11}} onClick={()=>setSentModal(c)} title="บันทึกการส่ง">บันทึก</button>
          </div></td>
        </tr>
      ))}
      {rows.length===0 && <tr><td colSpan="7" style={{textAlign:'center',color:'var(--ink-faint)',padding:32}}>ไม่มีรายการที่ตรงกับตัวกรอง</td></tr>}
      </tbody></table></div></div>
  </div>
}

/* ─────────────────────────── ANALYSIS (Skill: fetch + analyze) ─── */
const normName = s => String(s||'').toLowerCase().replace(/[\s฀-ฏ.,()"'’\-]/g,'')
function dupCheck(allLaws, name){
  const n=normName(name); if(n.length<8) return null
  return allLaws.find(l=>{ const m=normName(l.name); return m && (m.includes(n.slice(0,20))||n.includes(m.slice(0,20))) }) || null
}
function ReqEditor({reqs,setReqs,suggest}){
  const setReq=(i,k,v)=>setReqs(p=>p.map((r,j)=>j===i?{...r,[k]:v}:r))
  return <>
    {reqs.map((r,i)=>(
      <div key={i} style={{border:'1px solid var(--line)',borderRadius:8,padding:'8px 10px',marginBottom:6}}>
        <div style={{display:'flex',gap:8,alignItems:'flex-start'}}>
          <span className="num" style={{paddingTop:9,minWidth:20,color:'var(--ink-faint)'}}>{i+1}.</span>
          <textarea className="form-input" rows={1} style={{marginTop:0}} value={r.text||''} onChange={e=>setReq(i,'text',e.target.value)} placeholder="เนื้อหาข้อกำหนด (มาตรา/ข้อ…)"/>
          <select className="form-input" style={{marginTop:0,width:130}} value={r.status||'met'} onChange={e=>setReq(i,'status',e.target.value)}>
            <option value="met">สอดคล้อง</option><option value="unmet">ยังไม่สอดคล้อง</option>
          </select>
          {reqs.length>1 && <button className="btn btn-ghost" style={{padding:'7px 9px'}} onClick={()=>setReqs(p=>p.filter((_,j)=>j!==i))}>×</button>}
        </div>
        <div style={{display:'flex',gap:8,marginTop:6,marginLeft:28}}>
          <input className="form-input" style={{marginTop:0}} list="dl-resp" value={r.responsible||''} onChange={e=>setReq(i,'responsible',e.target.value)} placeholder="ผู้รับผิดชอบ"/>
          <input className="form-input" style={{marginTop:0}} value={r.frequency||''} onChange={e=>setReq(i,'frequency',e.target.value)} placeholder="ความถี่ (เช่น รายปี)"/>
        </div>
      </div>
    ))}
    <datalist id="dl-resp">{(suggest?.responsibles||[]).map(x=><option key={x} value={x}/>)}</datalist>
  </>
}

function AnalyzePanel({cats,allLaws,onCreateFull,suggest,goView,onAnalyzed}){
  const [src,setSrc]=useState('')
  const [busy,setBusy]=useState(false)
  const [err,setErr]=useState('')
  const [res,setRes]=useState(null)      // {law, reqs:[{...,_add:true}]}
  const [cat,setCat]=useState('')
  const [done,setDone]=useState(null)

  async function analyze(){
    if(!src.trim()) return
    setBusy(true); setErr(''); setRes(null); setDone(null)
    try{
      const r=await fetch('/api/law-analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({source:src})})
      const d=await r.json()
      if(!r.ok){ setErr(d.error||'วิเคราะห์ไม่สำเร็จ') }
      else{
        const law=d.law||{}
        setCat(law.cat||cats[0]?.code||'')
        setRes({law,reqs:(d.requirements||[]).map(q=>({
          text:(q.section_ref?q.section_ref+': ':'')+(q.req_text||''),
          responsible:q.responsible||'', frequency:q.frequency||'', status:'met', _add:true,
        }))})
        onAnalyzed&&onAnalyzed()
      }
    }catch(e){ setErr('เรียก API ไม่สำเร็จ (ต้อง deploy บน Vercel + ตั้ง ANTHROPIC_API_KEY): '+e.message) }
    setBusy(false)
  }

  async function addSelected(){
    const law=res.law||{}
    const chosen=res.reqs.filter(r=>r._add && r.text.trim())
    if(!chosen.length){ setErr('ยังไม่ได้เลือกข้อย่อย'); return }
    const code=nextCode(allLaws, cat)
    const dup=dupCheck(allLaws, law.name||'')
    if(dup && !confirm(`พบกฎหมายคล้ายกันอยู่แล้ว: ${dup.code} — ${dup.name.slice(0,50)}\nยืนยันเพิ่มซ้ำ?`)) return
    setBusy(true); setErr('')
    try{
      const nl=await onCreateFull(
        {code,cat,name:(law.name||'').trim(),hierarchy_level:'4',ministry:law.ministry||'',
         announce_date:law.announce_date||'',effective_date:law.effective_date||'',doc_list:law.documents||'',source_url:''},
        chosen)
      setDone(`เพิ่ม ${nl.code} เข้าหมวด ${cat} แล้ว (${chosen.length} ข้อย่อย)`)
      setRes(null); setSrc('')
    }catch(e){ setErr('บันทึกไม่สำเร็จ: '+e.message) }
    setBusy(false)
  }

  const setReqs = fn => setRes(p=>({...p,reqs:typeof fn==='function'?fn(p.reqs):fn}))

  return (
    <div className="panel" style={{marginBottom:16}}>
      <div className="panel-h"><h3>วิเคราะห์กฎหมาย</h3><span className="sub" style={{marginLeft:'auto'}}>Skill: fetch + analyze</span></div>
      <div className="panel-b">
        <p style={{fontSize:12.5,color:'var(--ink-faint)',marginBottom:10,lineHeight:1.6}}>วาง URL ราชกิจจาฯ / กฤษฎีกา / ShawPat หรือวางตัวบทกฎหมาย → ระบบสรุปเป็นข้อย่อย แล้ว “เลือกเพิ่มทีละข้อ” เข้าหมวดที่ต้องการได้เลย</p>
        <textarea className="form-input" rows={4} placeholder="วาง URL หรือตัวบทกฎหมายที่นี่…" value={src} onChange={e=>setSrc(e.target.value)} style={{marginTop:0}}/>
        <div style={{display:'flex',gap:8,alignItems:'center',marginTop:12}}>
          <button className="btn btn-primary" disabled={busy||!src.trim()} onClick={analyze}>{busy?'กำลังวิเคราะห์…':'วิเคราะห์'}</button>
          <button className="btn btn-ghost" onClick={()=>goView&&goView('staging')}>ดูหน้านำเข้า / รออนุมัติ →</button>
        </div>
        {err && <div className="login-err" style={{marginTop:12}}>{err}</div>}
        {done && <div className="login-msg" style={{marginTop:12}}>{done}</div>}

        {res && (
          <div style={{marginTop:16,borderTop:'1px solid var(--line)',paddingTop:14}}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>{res.law.name||'(ไม่พบชื่อ)'}</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}>
              {res.law.ministry && <span className="meta-chip">{res.law.ministry}</span>}
              {res.law.announce_date && <span className="meta-chip">ประกาศ: {res.law.announce_date}</span>}
              {res.law.effective_date && <span className="meta-chip">บังคับใช้: {res.law.effective_date}</span>}
              {res.law.documents && <span className="meta-chip">เอกสาร: {String(res.law.documents).slice(0,80)}</span>}
            </div>
            <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:10}}>
              <label className="form-label" style={{margin:0}}>เพิ่มเข้าหมวด:</label>
              <select className="form-input" style={{marginTop:0,width:280}} value={cat} onChange={e=>setCat(e.target.value)}>
                {cats.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
              </select>
              <span className="sub">รหัสที่จะได้: <b className="num" style={{color:'var(--brand)'}}>{cat?nextCode(allLaws,cat):'—'}</b></span>
              <span className="sub" style={{marginLeft:'auto'}}>
                <button className="btn btn-ghost" style={{padding:'3px 8px',fontSize:11}} onClick={()=>setReqs(p=>p.map(r=>({...r,_add:true})))}>เลือกทั้งหมด</button>
                <button className="btn btn-ghost" style={{padding:'3px 8px',fontSize:11,marginLeft:4}} onClick={()=>setReqs(p=>p.map(r=>({...r,_add:false})))}>ไม่เลือก</button>
              </span>
            </div>
            {res.reqs.map((r,i)=>(
              <div key={i} style={{display:'flex',gap:8,alignItems:'flex-start',padding:'8px 10px',border:'1px solid var(--line)',borderRadius:8,marginBottom:6,background:r._add?'var(--brand-tint)':'var(--surface)'}}>
                <input type="checkbox" checked={r._add} onChange={e=>setReqs(p=>p.map((x,j)=>j===i?{...x,_add:e.target.checked}:x))} style={{marginTop:4}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,lineHeight:1.5}}>{r.text}</div>
                  <div style={{display:'flex',gap:8,marginTop:6}}>
                    <input className="form-input" style={{marginTop:0}} list="dl-resp" value={r.responsible} onChange={e=>setReqs(p=>p.map((x,j)=>j===i?{...x,responsible:e.target.value}:x))} placeholder="ผู้รับผิดชอบ"/>
                    <input className="form-input" style={{marginTop:0}} value={r.frequency} onChange={e=>setReqs(p=>p.map((x,j)=>j===i?{...x,frequency:e.target.value}:x))} placeholder="ความถี่"/>
                    <select className="form-input" style={{marginTop:0,width:130}} value={r.status} onChange={e=>setReqs(p=>p.map((x,j)=>j===i?{...x,status:e.target.value}:x))}>
                      <option value="met">สอดคล้อง</option><option value="unmet">ยังไม่สอดคล้อง</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
            <datalist id="dl-resp">{(suggest?.responsibles||[]).map(x=><option key={x} value={x}/>)}</datalist>
            <button className="btn btn-primary" style={{marginTop:8}} disabled={busy} onClick={addSelected}>
              เพิ่มข้อที่เลือก ({res.reqs.filter(r=>r._add).length}) เข้าหมวด {cat}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ManualAddPanel({cats,allLaws,onCreateFull,suggest}){
  const [cat,setCat]=useState(cats[0]?.code||'')
  const [name,setName]=useState('')
  const [ministry,setMinistry]=useState('')
  const [level,setLevel]=useState('4')
  const [announce,setAnnounce]=useState('')
  const [effective,setEffective]=useState('')
  const [review,setReview]=useState('')
  const [docs,setDocs]=useState('')
  const [srcUrl,setSrcUrl]=useState('')
  const [reqs,setReqs]=useState([{text:'',status:'met'}])
  const [busy,setBusy]=useState(false)
  const [msg,setMsg]=useState(null)
  const code = cat ? nextCode(allLaws, cat) : '—'
  const valid = cat && name.trim()

  async function save(){
    if(!valid) return
    const dup=dupCheck(allLaws, name)
    if(dup && !confirm(`พบกฎหมายคล้ายกันอยู่แล้ว: ${dup.code} — ${dup.name.slice(0,50)}\nยืนยันเพิ่มซ้ำ?`)) return
    setBusy(true); setMsg(null)
    try{
      const nl=await onCreateFull(
        {code,cat,name:name.trim(),hierarchy_level:level,ministry,announce_date:announce,effective_date:effective,review_date:review,doc_list:docs,source_url:srcUrl},
        reqs.filter(r=>r.text.trim()))
      setMsg({ok:`เพิ่ม ${nl.code} เข้าหมวด ${cat} แล้ว (${reqs.filter(r=>r.text.trim()).length} ข้อ)`})
      setName('');setMinistry('');setAnnounce('');setEffective('');setReview('');setDocs('');setSrcUrl('');setReqs([{text:'',status:'met'}])
    }catch(e){ setMsg({err:'บันทึกไม่สำเร็จ: '+e.message}) }
    setBusy(false)
  }

  return (
    <div className="panel">
      <div className="panel-h"><h3>เพิ่มเข้าทะเบียนเอง</h3><span className="sub" style={{marginLeft:'auto'}}>เลือกหมวดแล้วกรอกได้เลย · รหัสที่จะได้: <b className="num" style={{color:'var(--brand)'}}>{code}</b></span></div>
      <div className="panel-b">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
          <div><label className="form-label">หมวด</label>
            <select className="form-input" value={cat} onChange={e=>setCat(e.target.value)}>
              {cats.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
            </select></div>
          <div><label className="form-label">ลำดับชั้น</label>
            <select className="form-input" value={level} onChange={e=>setLevel(e.target.value)}>
              {LAW_TYPES.map(t=><option key={t.level} value={t.level}>ชั้น {t.level} — {t.label}</option>)}
            </select></div>
          <div><label className="form-label">กระทรวง / หน่วยงาน</label>
            <input className="form-input" list="dl-min" value={ministry} onChange={e=>setMinistry(e.target.value)}/>
            <datalist id="dl-min">{(suggest?.ministries||[]).map(x=><option key={x} value={x}/>)}</datalist></div>
        </div>
        <label className="form-label">ชื่อกฎหมาย</label>
        <textarea className="form-input" rows={2} value={name} onChange={e=>setName(e.target.value)} placeholder="ชื่อกฎหมายฉบับเต็ม…"/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:10}}>
          <div><label className="form-label">วันที่ประกาศ</label><input className="form-input" value={announce} onChange={e=>setAnnounce(e.target.value)} placeholder="17 มี.ค. 2553"/></div>
          <div><label className="form-label">วันที่บังคับใช้</label><input className="form-input" value={effective} onChange={e=>setEffective(e.target.value)} placeholder="18 มี.ค. 2553"/></div>
          <div><label className="form-label">รอบทบทวนถัดไป</label><input className="form-input" type="date" value={review} onChange={e=>setReview(e.target.value)}/></div>
          <div><label className="form-label">เอกสาร/แบบฟอร์ม</label><input className="form-input" value={docs} onChange={e=>setDocs(e.target.value)} placeholder="แบบ จป., รายงาน"/></div>
        </div>
        <label className="form-label">ลิงก์ต้นฉบับ (URL ราชกิจจาฯ / PDF)</label>
        <input className="form-input" value={srcUrl} onChange={e=>setSrcUrl(e.target.value)} placeholder="https://ratchakitcha.soc.go.th/…"/>

        <div className="sec-t" style={{marginTop:14,display:'flex'}}>สาระสำคัญ (ข้อย่อย)
          <button className="btn btn-ghost" style={{marginLeft:'auto',padding:'3px 10px',fontSize:12}} onClick={()=>setReqs(p=>[...p,{text:'',status:'met'}])}>+ เพิ่มข้อ</button>
        </div>
        <ReqEditor reqs={reqs} setReqs={setReqs} suggest={suggest}/>

        {msg?.ok && <div className="login-msg" style={{marginTop:12}}>{msg.ok}</div>}
        {msg?.err && <div className="login-err" style={{marginTop:12}}>{msg.err}</div>}
        <div style={{marginTop:14}}>
          <button className="btn btn-primary" disabled={!valid||busy} onClick={save}>{busy?'กำลังบันทึก…':`บันทึกเข้าหมวด ${cat||''}`}</button>
        </div>
      </div>
    </div>
  )
}

function Analysis({laws,cats,catMap,allLaws,onAnalyzed,goView,onCreateFull,suggest}){
  return <div className="view">
    <div className="sec-t" style={{margin:'0 0 10px'}}>ส่วนที่ 1 · วิเคราะห์ด้วย AI แล้วเลือกเพิ่มทีละข้อ</div>
    <AnalyzePanel cats={cats} allLaws={allLaws} onCreateFull={onCreateFull} suggest={suggest} goView={goView} onAnalyzed={onAnalyzed}/>
    <div className="sec-t" style={{margin:'22px 0 10px'}}>ส่วนที่ 2 · เพิ่มเข้าทะเบียนเอง</div>
    <ManualAddPanel cats={cats} allLaws={allLaws} onCreateFull={onCreateFull} suggest={suggest}/>
  </div>
}

/* ─────────────────── STAGING (นำเข้า / รออนุมัติ) ─────────────────── */
function Staging({batches,catMap,onAdd,onDrop}){
  if(batches.length===0) return (
    <div className="view">
      <div className="panel" style={{padding:'60px 20px',textAlign:'center'}}>
        <div style={{fontSize:16,fontWeight:600}}>ไม่มีรายการรออนุมัติ</div>
        <div style={{fontSize:13,color:'var(--ink-faint)',marginTop:6}}>เมื่อใช้หน้า “วิเคราะห์” สรุปกฎหมาย รายการจะมาพักที่นี่ ให้คุณกดเพิ่มเข้าทะเบียนเอง</div>
      </div>
    </div>
  )
  return <div className="view">
    {batches.map(([code,rows])=>{ const f=rows[0]; return (
      <div className="panel" key={code} style={{marginBottom:14}}>
        <div className="panel-h">
          <span className="law-code">{code}</span>
          <span style={{fontWeight:600,fontSize:14}}>{f.law_name||code}</span>
          <span className="sub" style={{marginLeft:'auto'}}>{f.cat?catMap[f.cat]?.name||f.cat:''}{f.ministry?' · '+f.ministry:''} · {rows.length} ข้อกำหนด</span>
        </div>
        <div className="panel-b">
          {(f.announce_date||f.effective_date||f.doc_list) && (
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
              {f.announce_date && <span className="meta-chip">วันที่ประกาศ: {f.announce_date}</span>}
              {f.effective_date && <span className="meta-chip">วันที่บังคับใช้: {f.effective_date}</span>}
              {f.doc_list && <span className="meta-chip">เอกสาร: {f.doc_list.slice(0,120)}</span>}
            </div>
          )}
          {rows.map(r=>(
            <div key={r.id} style={{padding:'10px 0',borderBottom:'1px solid var(--line-soft)'}}>
              <div style={{fontSize:13,fontWeight:450,lineHeight:1.5}}>
                {r.section_ref && <b className="law-code" style={{marginRight:7}}>{r.section_ref}</b>}{r.req_text}
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:6}}>
                {r.responsible &&<span className="meta-chip">ใคร: {r.responsible}</span>}
                {r.applicability&&<span className="meta-chip">ที่ไหน: {r.applicability}</span>}
                {r.method      &&<span className="meta-chip">อย่างไร: {r.method}</span>}
                {r.documents   &&<span className="meta-chip">เอกสาร: {r.documents}</span>}
                {r.frequency   &&<span className="meta-chip">ความถี่: {r.frequency}</span>}
                {r.other_terms &&<span className="meta-chip">อื่น ๆ: {r.other_terms}</span>}
              </div>
            </div>
          ))}
          <div style={{display:'flex',gap:8,marginTop:14,alignItems:'center'}}>
            <button className="btn btn-primary" onClick={()=>onAdd(code,rows)}>เพิ่มเข้าทะเบียน</button>
            <button className="btn btn-ghost" onClick={()=>onDrop(rows)}>ไม่เพิ่ม</button>
            {f.source_url && <a className="btn btn-ghost" href={f.source_url} target="_blank" rel="noreferrer">ดูแหล่งที่มา</a>}
          </div>
        </div>
      </div>
    )})}
  </div>
}

/* ─────────────────── UPDATES (Skill: update-watch) ──────────────── */
function Updates({updates,onMark,onScanned}){
  const live=updates.filter(u=>u.status!=='dismissed')
  const [busy,setBusy]=useState(false)
  const [msg,setMsg]=useState(null)
  const UL={ new:'ใหม่', read:'อ่านแล้ว', imported:'เพิ่มแล้ว' }
  async function scan(){
    setBusy(true); setMsg(null)
    try{
      const r=await fetch('/api/law-update',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({})})
      const d=await r.json()
      if(!r.ok) setMsg({err:d.error||'ตรวจไม่สำเร็จ'})
      else{ setMsg({ok:`ตรวจพบ ${d.scanned} รายการบน ShawPat · ใหม่ ${d.new} รายการ`}); onScanned&&onScanned() }
    }catch(e){ setMsg({err:'เรียก API ไม่สำเร็จ (ต้อง deploy บน Vercel พร้อมตั้ง ANTHROPIC_API_KEY): '+e.message}) }
    setBusy(false)
  }
  return <div className="view">
    <div className="panel" style={{marginBottom:14}}>
      <div className="panel-h">
        <h3>เฝ้าระวังกฎหมายใหม่จาก ShawPat</h3>
        <button className="btn btn-primary" style={{marginLeft:'auto'}} disabled={busy} onClick={scan}>{busy?'กำลังตรวจ…':'ตรวจหากฎหมายใหม่'}</button>
      </div>
      <div className="panel-b" style={{paddingTop:0}}>
        <p style={{fontSize:12.5,color:'var(--ink-faint)',lineHeight:1.6}}>Skill: update-watch — ดึงหน้า shawpat.or.th/th/safety-law เทียบกับทะเบียน แล้วเพิ่มของใหม่เป็นการแจ้งเตือน</p>
        {msg?.ok && <div className="login-msg" style={{marginTop:10}}>{msg.ok}</div>}
        {msg?.err && <div className="login-err" style={{marginTop:10}}>{msg.err}</div>}
      </div>
    </div>
    {live.length===0 && <div className="panel" style={{padding:'50px 20px',textAlign:'center',color:'var(--ink-faint)'}}>ยังไม่มีกฎหมายใหม่ — กด “ตรวจหากฎหมายใหม่” เพื่อดึงรายการจาก ShawPat</div>}
    {live.map(u=>(
      <div className="panel" key={u.id} style={{marginBottom:10,opacity:u.status==='new'?1:.66}}>
        <div className="panel-b">
          <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:6,flexWrap:'wrap'}}>
            <span className={'pill '+(u.status==='new'?'p-bad':'')}>{UL[u.status]||u.status}</span>
            {u.category_guess && <span className="tag">คาดหมวด {u.category_guess}</span>}
            <span className="tag">ที่มา {u.source}</span>
          </div>
          <div style={{fontSize:14,fontWeight:600,lineHeight:1.45}}>{u.title}</div>
          {u.published_date && <div style={{fontSize:12,color:'var(--ink-faint)',marginTop:3}}>ประกาศ {u.published_date}</div>}
          {u.summary && <div style={{fontSize:12.5,color:'var(--ink-soft)',marginTop:6,lineHeight:1.6}}>{u.summary}</div>}
          <div style={{display:'flex',gap:8,marginTop:12,alignItems:'center',flexWrap:'wrap'}}>
            {u.status==='new' && <button className="btn btn-ghost" onClick={()=>onMark(u.id,'read')}>อ่านแล้ว</button>}
            <button className="btn btn-primary" onClick={()=>onMark(u.id,'imported')}>ทำเครื่องหมายว่าเพิ่มแล้ว</button>
            <button className="btn btn-ghost" onClick={()=>onMark(u.id,'dismissed')}>ไม่เกี่ยวข้อง</button>
            {u.ref_url && <a className="btn btn-ghost" href={u.ref_url} target="_blank" rel="noreferrer">เปิดหน้ากฎหมาย</a>}
          </div>
        </div>
      </div>
    ))}
  </div>
}

/* ─────────────────────────── NOTIFICATIONS ─────────────────────────── */
const NOTIF_META = {
  bad:       { label:'ไม่สอดคล้อง',    icon:'alert',    bg:'var(--bad-bg)',    fg:'var(--bad)'    },
  review:    { label:'ครบกำหนดทบทวน', icon:'clock',    bg:'var(--review-bg)', fg:'var(--review)' },
  comm:      { label:'กำหนดสื่อสาร',   icon:'chat',     bg:'var(--brand-tint)',fg:'var(--brand)'  },
  submitted: { label:'ส่งเรียบร้อย',   icon:'check',    bg:'var(--ok-bg)',     fg:'var(--ok)'     },
  law_update:{ label:'กฎหมายใหม่',     icon:'spark',    bg:'var(--brand-tint)',fg:'var(--brand)'  },
}
function NotificationsPage({ notifs, onOpenLaw, onGoToView }) {
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

/* ─────────────────────────── IMPROVEMENTS ─────────────────────────── */
function Improvements({ laws, catMap, onOpen }) {
  const ncLaws = laws.filter(l=>l.status==='bad')
  const totalNc = ncLaws.reduce((a,l)=>a+l.reqs.filter(r=>r.status==='unmet').length, 0)

  if (ncLaws.length===0) return (
    <div className="view">
      <div className="panel" style={{padding:'60px 20px',textAlign:'center'}}>
        <div style={{width:56,height:56,borderRadius:12,background:'var(--ok-bg)',color:'var(--ok)',display:'grid',placeItems:'center',margin:'0 auto 16px',fontSize:24}}>
          ✓
        </div>
        <div style={{fontSize:18,fontWeight:700}}>ทุกข้อกำหนดสอดคล้องครบถ้วน</div>
        <div style={{fontSize:13,color:'var(--ink-faint)',marginTop:6}}>ไม่มีรายการที่ต้องปรับปรุงในขณะนี้</div>
      </div>
    </div>
  )

  return (
    <div className="view">
      <div className="ai-box" style={{marginBottom:16,borderLeftColor:'var(--warn)'}}>
        <span className="ai-tag" style={{color:'var(--warn)'}}>แผนปรับปรุง / ปิด NC — อ้างอิง PD-05</span>
        <p style={{marginBottom:0}}>รายการข้อกำหนดที่ยังไม่สอดคล้อง <b>{totalNc} ข้อ</b> จาก <b>{ncLaws.length} กฎหมาย</b> — คลิกที่รายการเพื่อเปิดรายละเอียดและอัปเดตสถานะ</p>
      </div>
      {ncLaws.map(l=>{
        const ncReqs=l.reqs.filter(r=>r.status==='unmet')
        const cat=catMap[l.cat]
        return (
          <div key={l.id} className="panel" style={{marginBottom:12}}>
            <div className="panel-h" style={{cursor:'pointer'}} onClick={()=>onOpen(l)}>
              <span style={{width:10,height:10,borderRadius:3,background:cat?.color||'#888',flexShrink:0}}/>
              <span className="num" style={{fontSize:12,color:'var(--brand)',fontWeight:700}}>{l.code}</span>
              <span style={{flex:1,fontSize:14,fontWeight:500}}>{l.name.slice(0,80)}{l.name.length>80?'…':''}</span>
              <span className="pill p-bad">{ncReqs.length} ข้อ NC</span>
              <span style={{fontSize:12,color:'var(--brand)',fontWeight:500}}>ดูรายละเอียด →</span>
            </div>
            <div style={{padding:'2px 22px 14px'}}>
              {ncReqs.map(r=>(
                <div key={r.id} className="impr-row">
                  <div className="impr-dot"/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500,lineHeight:1.5}}>{r.text.slice(0,140)}{r.text.length>140?'…':''}</div>
                    <div style={{display:'flex',gap:7,marginTop:5,flexWrap:'wrap'}}>
                      {r.responsible&&<span className="meta-chip">{r.responsible}</span>}
                      {r.frequency&&<span className="meta-chip">{r.frequency}</span>}
                      {r.note&&<span className="meta-chip" style={{color:'var(--bad)',borderColor:'var(--bad-bg)',background:'var(--bad-bg)'}}>{r.note.slice(0,80)}</span>}
                    </div>
                  </div>
                  <span className="pill p-bad" style={{fontSize:10,padding:'2px 7px',alignSelf:'flex-start',marginTop:2}}>NC</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────── DOCUMENTS ─────────────────────────── */
const DOC_TYPES = [
  { key:'F-259',  label:'แบบ F-259 ทะเบียนกฎหมาย',    desc:'ทะเบียนกฎหมาย SHE ประจำปีพร้อมข้อกำหนดทั้งหมด', color:'var(--brand)' },
  { key:'PD-60',  label:'เอกสาร PD-60 ข้อ 7',          desc:'กรอบเวลาตามกฎหมาย — เอกสารส่งราชการ',            color:'#4f72c4' },
  { key:'PD-05',  label:'เอกสาร PD-05 แผนปรับปรุง',    desc:'บันทึกการแก้ไขและปิดข้อ NC',                     color:'#cf8a12' },
  { key:'report', label:'รายงานผู้บริหาร (Mgmt Review)',desc:'AI ร่างรายงานและส่งออก PDF',                      color:'#1f9d6b' },
]
function Documents({ laws, cats, catMap }) {
  const docsLaws = laws.filter(l=>l.reqs.some(r=>r.documents))
  return (
    <div className="view">
      <div className="grid" style={{gridTemplateColumns:'repeat(2,1fr)',gap:14,marginBottom:20}}>
        {DOC_TYPES.map(d=>(
          <div key={d.key} className="panel doc-card" style={{padding:22,borderTop:`3px solid ${d.color}`}}>
            <div>
              <div className="doc-title">{d.label}</div>
              <div style={{fontSize:12.5,color:'var(--ink-faint)',marginTop:5,lineHeight:1.55}}>{d.desc}</div>
            </div>
            <button className="btn btn-ghost" style={{marginTop:16,width:'100%',justifyContent:'center'}}
              onClick={()=>{ if(d.key==='report'||d.key==='F-259') window.print() }}>
              ส่งออก / พิมพ์
            </button>
          </div>
        ))}
      </div>
      <div className="panel">
        <div className="panel-h">
          <h3>เอกสารตามข้อกำหนดกฎหมาย</h3>
          <span className="sub" style={{marginLeft:'auto'}}>{docsLaws.length} กฎหมายมีรายการเอกสาร</span>
        </div>
        {docsLaws.length===0
          ? <div style={{padding:'40px 20px',textAlign:'center',color:'var(--ink-faint)',fontSize:14}}>ยังไม่มีข้อมูลเอกสารที่บันทึกไว้ในคอลัมน์ "เอกสาร" ของข้อกำหนด</div>
          : <div className="tablewrap"><table>
              <thead><tr><th>รหัส / กฎหมาย</th><th>หมวด</th><th>เอกสารที่กำหนด</th><th>สถานะ</th></tr></thead>
              <tbody>{docsLaws.map(l=>{
                const docSet=[...new Set(l.reqs.filter(r=>r.documents).map(r=>r.documents))].join(' · ')
                return (
                  <tr key={l.id}>
                    <td><div className="law-code">{l.code}</div><div className="law-title" style={{fontSize:12.5}}>{l.name.slice(0,70)}{l.name.length>70?'…':''}</div></td>
                    <td><Tag c={l.cat} color={catMap[l.cat]?.color}/></td>
                    <td style={{fontSize:12,color:'var(--ink-soft)',maxWidth:320,lineHeight:1.5}}>{docSet.slice(0,150)}</td>
                    <td><Pill s={l.status}/></td>
                  </tr>
                )
              })}</tbody>
            </table></div>
        }
      </div>
    </div>
  )
}
