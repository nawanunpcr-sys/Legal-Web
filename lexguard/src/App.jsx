import { useEffect, useMemo, useState } from 'react'
import { supabase, hasSupabase, fetchAll,
         setRequirementStatus, recomputeLawStatus, bulkSetCompliance, setLawActive,
         repealLaw, restoreLaw, createLaw, createLawFull, deleteLaw,
         markCommSent, updateCommSchedule, addComm, deleteComm,
         fetchComplianceMonths, toggleMonthCheck, setMonthReviewStatus,
         logActivity, fetchActivity, fetchQuarterStats, suggestionLists, listDepartments,
         fetchReports, setReportEvent, markReportSubmitted, fetchTasks,
         fetchWorkflow, subscribeWorkflow, subscribeLaws, createAddWorkflow, createMonitorWorkflow,
         submitWorkflowAssessment, closeWorkflowPlan, fetchDiscoveredLaws, fetchSearchLog,
         fetchSettings, saveSettings, DEFAULT_SETTINGS } from './lib/supabase.js'
import { AuthContext, useAuth, can, ROLE_LABELS, NO_PERM, currentUserName,
         getSession as getAuthSession, signOut as authSignOut, onAuthChange } from './lib/auth.js'
import LawDrawer from './components/LawDrawer.jsx'
import Reports from './components/Reports.jsx'
import { I } from './components/icons.jsx'
import Login from './components/Login.jsx'
import NotifyPopup, { isOverdueItem } from './components/NotifyPopup.jsx'
import { DashboardSkeleton } from './components/Skeleton.jsx'
import Toaster from './components/Toaster.jsx'
import ConfirmHost from './components/ConfirmHost.jsx'
import Clawdmeter from './components/Clawdmeter.jsx'
import { toast } from './lib/toast.js'
import { confirmDialog } from './lib/confirm.js'
import { buildReport } from './components/PdfExport.jsx'
import { exportLawsToExcel } from './lib/integrations.js'
import { usePersist, prog, thDate, daysTo, TH_MONTHS, withCatColors, nextCode, currentRound,
         jorporReportDeadlines, effectiveInfo, trainingStatus, sumReqStats } from './lib/ui.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Tasks from './pages/Tasks.jsx'
import LawSummary from './pages/LawSummary.jsx'
import AddLawFlow from './components/AddLawFlow.jsx'
import RegistryCompliance from './pages/Registry.jsx'
import Communication from './pages/Communications.jsx'
import ExportPdfModal from './components/ExportPdfModal.jsx'
import Improvements from './pages/Improvements.jsx'
import NotificationsPage from './pages/Notifications.jsx'
import SettingsPage from './pages/Settings.jsx'

// P19 · เมนูหลักเหลือ 4 อัน — เปิดมาแล้วรู้ทันทีว่าต้องทำอะไร
//   history/repealed → แท็บในหน้าทะเบียน (Registry.jsx) · notifications → กระดิ่งบน header เท่านั้น
//   settings → ปุ่มเฟืองมุมล่างซ้าย sidebar · comm → เมนูย่อยใต้ "รายการที่ต้องทำ" (P21 จะดูดเข้าไปทีหลัง)
const NAV_GROUPS = [
  { label: null, items: [
    { id:'dashboard',     label:'Dashboard',            icon:'grid'    },
    { id:'registry',      label:'ทะเบียนกฎหมาย',        icon:'book'    },
    { id:'tasks',         label:'รายการที่ต้องทำ',        icon:'update'  },
    { id:'comm',          label:'สื่อสาร & ส่งรายงาน',    icon:'chat', sub:true },
    { id:'summary',       label:'สรุปกฎหมาย (AI)',       icon:'spark'   },
  ]},
]

const TITLES = {
  dashboard:     ['Dashboard',             'สรุปสถานะความสอดคล้องตามกฎหมาย SHE'],
  tasks:         ['รายการที่ต้องทำ',        'งานที่ต้องดำเนินการทั้งหมด — ทวนสอบกฎหมาย · รายงานราชการ · การสื่อสาร'],
  // P19 · registry ตอนนี้มี 3 แท็บ (ทะเบียน/ประวัติ/ยกเลิก) — history และ repealed ไม่ใช่ view เดี่ยวๆ แล้ว
  registry:      ['ทะเบียนกฎหมาย','ทะเบียนกฎหมาย พร้อมประวัติการทำรายการ และกฎหมายที่ยกเลิก'],
  register:      ['ทะเบียนกฎหมาย',         'กฎหมายที่เกี่ยวข้องและสถานะการปฏิบัติ'],
  compliance:    ['ติดตามความสอดคล้อง',    'สถานะรายข้อปฏิบัติแยกตามหมวดและลำดับชั้น'],
  improvements:  ['แผนปรับปรุง',           'รายการ NC และแนวทางแก้ไข (อ้างอิง PD-05)'],
  comm:          ['สื่อสาร & ส่งรายงาน',   'ตารางการสื่อสาร (ISD-86) และการส่งรายงานราชการในหน้าเดียว'],
  summary:       ['สรุปกฎหมาย (AI)',       'สรุปกฎหมายด้วย AI + คลังสรุป + ส่งต่อเข้าทะเบียน'],
  notifications: ['ศูนย์การแจ้งเตือน',     'การแจ้งเตือนและการติดตามสถานะทั้งหมด'],
  settings:      ['ตั้งค่า',                'ข้อมูลองค์กรและการแสดงผลของระบบ'],
}

export default function App(){
  const [session,setSession] = useState(undefined) // undefined=checking, null=logged out
  const [navOpen,setNavOpen] = useState(()=>{ try{ return localStorage.getItem('cr_nav')!=='0' }catch{ return true } })
  const [view,setView]     = useState(()=>{ try{ const v=localStorage.getItem('cr_view')||'dashboard';
    // backward-compat: the old split 'register'/'compliance' views are now one 'registry' view
    if(v==='register'||v==='compliance'){ try{ localStorage.setItem('cr_registry_mode', JSON.stringify(v==='compliance'?'compliance':'register')) }catch{} return 'registry' }
    // P17: ปฏิทินกฎหมาย + Process Tracker ยุบเป็นหน้าเดียว 'tasks' (รายการที่ต้องทำ)
    if(v==='process'||v==='staging'||v==='assessment'||v==='plans'||v==='tracker'||v==='calendar') return 'tasks'
    if(v==='discovery'||v==='analysis') return 'summary'   // P12: รวมเป็นหน้า "สรุปกฎหมาย"
    if(v==='reports') return 'comm'       // P10: merged into สื่อสาร & ส่งรายงาน hub
    // P19: เมนูหลักเหลือ 4 อัน — history/repealed ยุบเป็นแท็บใน registry, notifications เหลือกระดิ่งบน header
    // P20d: 'updates' = หน้าเฝ้าระวังกฎหมายเดิม (flow ตายแล้ว) → ชี้ไปทะเบียน กัน bookmark เดิมพัง
    if(v==='history'||v==='repealed'||v==='updates') return 'registry'
    if(v==='notifications') return 'dashboard'
    return v }catch{ return 'dashboard' } })
  const [dark,setDark]     = useState(()=>{ try{ const v=localStorage.getItem('cr_dark'); return v==null?false:v==='1' }catch{ return false } })
  const [cats,setCats]     = useState([])
  const [laws,setLaws]     = useState([])
  const [comms,setComms]   = useState([])
  const [notifs,setNotifs] = useState([])
  const [loading,setLoading] = useState(true)
  const [err,setErr]       = useState('')
  const [search,setSearch] = useState('')
  const [searchDebounced,setSearchDebounced] = useState('')  // 250ms-debounced — feeds the heavy Register/Repealed table filters
  const [searchFocus,setSearchFocus] = useState(false)
  const [openLaw,setOpenLaw] = useState(null)
  const [showPdf,setShowPdf] = useState(false)
  const [exportOpen,setExportOpen] = useState(false)   // topbar/page export dropdown (UI only)
  const [avatarOpen,setAvatarOpen] = useState(false)   // avatar menu (UI only)
  const [monthYear,setMonthYear] = useState(new Date().getFullYear())
  const [round,setRound]     = usePersist('cr_round', currentRound())   // รอบประเมิน F-259 { q, by(พ.ศ.) }
  const [training,setTraining] = usePersist('lex_training', { hours:0, target:12, year:new Date().getFullYear()+543 })  // อบรม จป. 12 ชม./ปี
  const [months,setMonths]   = useState([])
  const [activity,setActivity] = useState([])
  const [,setQuarterStats] = useState([])   // lg_law_quarter_stats: ยังอัปเดตไว้ (ใช้ maintainance) แต่ไม่แสดงผลแล้ว (P17)
  const [settings,setSettings] = useState(DEFAULT_SETTINGS)
  const [reports,setReports] = useState([])
  const [workflowRows,setWorkflowRows] = useState([])   // lg_law_workflow — Process Tracker รายกฎหมาย (P10)
  const [taskRows,setTaskRows] = useState([])           // view lg_tasks — หน้า "รายการที่ต้องทำ" (P16/P17)
  const [discovered,setDiscovered] = useState([])        // lg_ai_discovered_laws (หน้าค้นหากฎหมาย AI)
  const [searchLog,setSearchLog] = useState([])          // lg_search_log (หลักฐานการติดตามกฎหมาย)
  const [departments,setDepartments] = useState([])      // lg_departments — ช่วยเติมช่อง "ผู้รับผิดชอบ" (P20c)
  const [showAddLaw,setShowAddLaw] = useState(false)     // Workflow A · Process 1 wizard
  const [addLawInit,setAddLawInit] = useState(null)      // P12: prefill AddLawFlow จากหน้าสรุปกฎหมาย
  const [trackerFocus,setTrackerFocus] = useState(0)     // signal: คลิก badge/เมนู tracker → โฟกัสงานค้าง
  const [regFocus,setRegFocus]   = useState(null)        // P14·T1 signal: หลังเพิ่มกฎหมาย → สลับหมวด + highlight แถว { lawId, cat, ts }
  const [flowPopup,setFlowPopup]   = useState(null)      // { title, msg } — popup กึ่งกลางจอ (ยืนยันเพิ่ม/ประเมินเสร็จ)
  const [showNotify,setShowNotify] = useState(false)
  const [commTab,setCommTab]       = usePersist('cr_comm_tab','comm')       // comm | reports (สื่อสาร & ส่งรายงาน hub)
  const [curMonthRows,setCurMonthRows] = useState([])   // compliance_months rows for the *real* current year — drives the live Dashboard monthly stage bar regardless of whatever year is browsed in the Register monthly panel

  // auth gate — reads through auth.js (demo: localStorage lg_session · supabase: real session)
  useEffect(()=>{
    let alive=true
    ;(async()=>{ try{ const s=await getAuthSession(); if(alive) setSession(s||null) }catch{ if(alive) setSession(null) } })()
    // Always listen for Microsoft (Supabase) sign-in/out; no-op when Supabase isn't configured
    const unsub = onAuthChange(s=>{ if(alive) setSession(s||null) })
    return ()=>{ alive=false; unsub() }
  },[])

  const authed = !!session
  const role = (session && session.role) || 'viewer'
  const authValue = useMemo(()=>({ session, role, can:(action)=>can(role,action) }),[session,role])

  useEffect(()=>{ try{ localStorage.setItem('cr_view',view) }catch{} },[view])
  // debounce the search term feeding table filters (250ms) so typing stays snappy
  useEffect(()=>{ const t=setTimeout(()=>setSearchDebounced(search),250); return ()=>clearTimeout(t) },[search])
  useEffect(()=>{ try{ localStorage.setItem('cr_nav',navOpen?'1':'0') }catch{} },[navOpen])
  useEffect(()=>{ document.documentElement.setAttribute('data-theme',dark?'dark':'light'); try{ localStorage.setItem('cr_dark',dark?'1':'0') }catch{} },[dark])
  // auto-collapse sidebar to icon rail on tablet/narrow screens
  useEffect(()=>{ const h=()=>{ if(window.innerWidth<1024) setNavOpen(false) }; h(); window.addEventListener('resize',h); return ()=>window.removeEventListener('resize',h) },[])

  async function loadReports(){ try{ setReports(await fetchReports()) }catch(e){ console.warn('reports reload',e) } }
  async function loadWorkflow(){ try{ setWorkflowRows(await fetchWorkflow()) }catch(e){ console.warn('workflow reload',e) } }
  async function loadTasks(){ try{ setTaskRows(await fetchTasks()) }catch(e){ console.warn('tasks reload',e) } }
  async function loadDiscovered(){ try{ setDiscovered(await fetchDiscoveredLaws()) }catch(e){ console.warn('discovered reload',e) } }
  async function loadLaws(){ try{ const d=await fetchAll(); setLaws(d.laws) }catch(e){ console.warn('laws reload',e) } }
  function openAddLaw(init=null){ setAddLawInit(init); setShowAddLaw(true) }   // P12
  async function loadCurMonth(){ try{ setCurMonthRows(await fetchComplianceMonths(new Date().getFullYear())) }catch(e){ console.warn('cur month reload',e) } }
  // P10: staging/assessment/tracker/plans/reports views were removed. goView()
  // remaps the one surviving legacy id (reports → comm hub) so old deep links /
  // notifications still land right.
  function goView(v){
    if(v==='reports'){ setCommTab('reports'); setView('comm'); return }
    if(v==='discovery'||v==='analysis'){ setView('summary'); return }   // P12
    if(v==='history'||v==='repealed'){ setView('registry'); return }    // P19: ยุบเป็นแท็บใน registry
    setView(v)
  }

  useEffect(()=>{ if(!authed) return; (async()=>{
    if(!hasSupabase){ setErr('ยังไม่ได้ตั้งค่า Supabase (.env) — กำลังแสดงหน้าเปล่า'); setLoading(false); return }
    try{
      const [d, mData, a, rp, st, wf, disc, slog, tk, dept] = await Promise.all([fetchAll(), fetchComplianceMonths(new Date().getFullYear()), fetchActivity(), fetchReports(), fetchSettings(), fetchWorkflow(), fetchDiscoveredLaws(), fetchSearchLog(), fetchTasks(), listDepartments()])
      setCats(withCatColors(d.cats)); setLaws(d.laws); setComms(d.comms); setNotifs(d.notifs)
      setMonths(mData); setCurMonthRows(mData); setActivity(a); setReports(rp); setSettings(st); setWorkflowRows(wf); setDiscovered(disc); setSearchLog(slog); setTaskRows(tk); setDepartments(dept)
    }
    catch(e){ setErr('เชื่อมต่อฐานข้อมูลไม่สำเร็จ: '+e.message) }
    setLoading(false)
  })() },[authed])

  // Realtime: keep Process Tracker cases live across tabs/users
  useEffect(()=>{ if(!authed || !hasSupabase) return
    let t=null
    const unsub = subscribeWorkflow(()=>{ clearTimeout(t); t=setTimeout(loadWorkflow, 250) })
    return ()=>{ clearTimeout(t); unsub() }
  },[authed])

  // Realtime: registry stats (จำนวนกฎหมาย/สอดคล้อง/NC) live on add/repeal/assess — no page refresh
  useEffect(()=>{ if(!authed || !hasSupabase) return
    let t=null
    const unsub = subscribeLaws(()=>{ clearTimeout(t); t=setTimeout(async()=>{
      try{ const d=await fetchAll(); setLaws(d.laws); fetchQuarterStats().then(setQuarterStats) }catch(e){ console.warn('laws realtime reload',e) }
    }, 300) })
    return ()=>{ clearTimeout(t); unsub() }
  },[authed])

  useEffect(()=>{ (async()=>{
    if(!hasSupabase) return
    try{ const mData = await fetchComplianceMonths(monthYear); setMonths(mData) }
    catch(e){ console.warn('month fetch error',e) }
  })() },[monthYear])

  const catMap      = useMemo(()=>Object.fromEntries(cats.map(c=>[c.code,c])),[cats])
  const activeLaws  = useMemo(()=>laws.filter(l=>l.status!=='repealed'),[laws])
  const repealedLaws= useMemo(()=>laws.filter(l=>l.status==='repealed'),[laws])
  const lawMap      = useMemo(()=>Object.fromEntries(laws.map(l=>[l.id,l])),[laws])
  // P20c · แนบรายชื่อแผนก (lg_departments) เข้าไปกับ suggest เพื่อช่วยเติมช่องผู้รับผิดชอบ
  const suggest     = useMemo(()=>({ ...suggestionLists(laws), departments: departments.map(dp=>dp.name) }),[laws,departments])
  const searchResults = useMemo(()=>{
    const q=search.trim().toLowerCase(); if(q.length<2) return []
    const out=[]
    activeLaws.forEach(l=>{ const min=(l.ministry||''); const byMin=min.toLowerCase().includes(q); if(l.code.toLowerCase().includes(q)||(l.name||'').toLowerCase().includes(q)||byMin) out.push({kind:'law',law:l,label:l.code,sub:(l.name||'').slice(0,50),ministry:min,byMin,color:catMap[l.cat]?.color,catName:catMap[l.cat]?.name}) })
    reports.forEach(r=>{ if((r.title||'').toLowerCase().includes(q)) out.push({kind:'report',label:(r.title||'').slice(0,40),sub:'รายงานราชการ'}) })
    return out.slice(0,12)
  },[search,activeLaws,reports,catMap])

  // P17 · badge เมนู "รายการที่ต้องทำ" = งานที่ state ต้องทำ (overdue/todo) จาก view lg_tasks
  const openWorkCount = useMemo(()=>taskRows.filter(t=>t.state==='overdue'||t.state==='todo').length,[taskRows])
  const trackerUrgent = useMemo(()=>taskRows.some(t=>t.state==='overdue'),[taskRows])

  const inForceLaws = useMemo(()=>activeLaws.filter(l=>l.active!==false),[activeLaws])
  const stats = useMemo(()=>{
    // P18 · % นับเฉพาะข้อที่ประเมินแล้ว (met+unmet) — waiting ไม่รวมทั้งเศษและส่วน
    const s = sumReqStats(inForceLaws)
    return { total:inForceLaws.length, req:s.total, met:s.met, nc:s.unmet, waiting:s.waiting,
             assessed:s.assessed, pct: s.pct==null ? 100 : s.pct }
  },[inForceLaws])

  const reportAlerts = useMemo(()=>
    reports.filter(r=>{ if(!r.next_due_date) return false; const d=daysTo(r.next_due_date); return d<0||d<=(r.notify_days_before||30) }).length
  ,[reports])

  const bellNotifications = useMemo(()=>{
    const out=[]
    activeLaws.forEach(l=>{ if(l.status==='bad') out.push({type:'bad',law:l,text:l.code+' ยังไม่สอดคล้อง',sub:l.name.slice(0,60)}) })
    comms.forEach(c=>{ if(c.next_scheduled_date){ const d=daysTo(c.next_scheduled_date); const nb=c.notify_days_before||7
      if(d<0) out.push({type:'bad',comm:c,goView:'comm',text:'การสื่อสารเกินกำหนด: '+c.topic.slice(0,50),sub:'เกิน '+Math.abs(d)+' วัน — '+thDate(c.next_scheduled_date)})
      else if(d<=nb) out.push({type:'comm',comm:c,days:d,text:'การสื่อสาร: '+c.topic.slice(0,50),sub:'ครบกำหนดใน '+d+' วัน — '+thDate(c.next_scheduled_date)}) }})
    reports.forEach(r=>{ if(r.next_due_date){ const d=daysTo(r.next_due_date); const nb=r.notify_days_before||30
      if(d<0) out.push({type:'bad',goView:'reports',text:'รายงานเกินกำหนดส่ง: '+r.title.slice(0,50),sub:'เกิน '+Math.abs(d)+' วัน — '+thDate(r.next_due_date)})
      else if(d<=nb) out.push({type:'report_due',goView:'reports',days:d,text:'ใกล้กำหนดส่งรายงาน: '+r.title.slice(0,50),sub:'อีก '+d+' วัน — '+thDate(r.next_due_date)}) }})
    // จป.ว: เตือนล่วงหน้า 14 วันก่อนเส้นตายรายงาน 2 ครั้ง/ปี (กฎกระทรวง 2565 ข้อ 47)
    jorporReportDeadlines().forEach(d=>{ if(d.days>=0 && d.days<=14) out.push({type:'report_jorpor',goView:'reports',days:d.days,text:d.label,sub:'ครบกำหนดใน '+d.days+' วัน — '+thDate(d.due.toISOString())}) })
    // กฎหมายประกาศแล้วแต่ยังไม่บังคับใช้: เตือนล่วงหน้า 30 วัน
    activeLaws.forEach(l=>{ const e=effectiveInfo(l); if(e && e.days<=30) out.push({type:'effective_soon',law:l,days:e.days,text:l.code+' จะบังคับใช้ใน '+e.days+' วัน',sub:l.name.slice(0,60)}) })
    // ส่งรายงานราชการรายกฎหมาย: เตือนล่วงหน้า ≤30 วัน (เหลือง 30–15, แดง <15, เกินกำหนด=แดง)
    activeLaws.forEach(l=>{ if(!l.report_due_date) return; const d=daysTo(l.report_due_date)
      if(d<0) out.push({type:'bad',law:l,text:l.code+' เกินกำหนดส่งรายงานราชการ',sub:'เกิน '+Math.abs(d)+' วัน — '+thDate(l.report_due_date)})
      else if(d<=30) out.push({type:'report_law',law:l,days:d,text:l.code+' ใกล้ครบกำหนดส่งรายงานราชการ',sub:'อีก '+d+' วัน — '+thDate(l.report_due_date)}) })
    // อบรม จป. 12 ชม./ปี: เตือนเมื่อเหลือ <90 วันแล้วยังไม่ครบ
    { const ts=trainingStatus(training); if(ts.alert) out.push({type:'training',goView:'settings',text:'อบรมพัฒนาความรู้ จป. ยังไม่ครบ '+ts.target+' ชม.',sub:'ทำได้ '+ts.hours+' ชม. · เหลืออีก '+ts.remain+' ชม. · เหลือเวลา '+ts.daysLeft+' วัน'}) }
    // Task 12: เดือนนี้ยังไม่มีการค้นหากฎหมายใหม่ (เตือนตั้งแต่วันที่ 25 — หลักฐาน ISO 45001)
    { const now=new Date()
      if(now.getDate()>=25){
        const y=now.getFullYear(), m=now.getMonth()
        const hasSearchThisMonth = searchLog.some(s=>{ const d=new Date(s.searched_at); return d.getFullYear()===y && d.getMonth()===m })
        if(!hasSearchThisMonth) out.push({type:'search_missing',goView:'discovery',text:'เดือนนี้ยังไม่มีการค้นหากฎหมายใหม่',sub:'บันทึกหลักฐานการติดตามกฎหมาย (ISO 45001 ข้อ 6.1.3)'})
      } }
    return out.sort((a,b)=>(a.type==='bad'?-1:0)-(b.type==='bad'?-1:0))
  },[activeLaws,comms,notifs,reports,training,searchLog])

  useEffect(()=>{
    if(!authed || loading || bellNotifications.length===0) return
    const hasOverdue = bellNotifications.some(isOverdueItem)
    const today = new Date().toISOString().slice(0,10)
    let lastSeen=null
    try{ lastSeen = localStorage.getItem('lex_notify_last_seen') }catch{}
    if(hasOverdue || lastSeen!==today){
      setShowNotify(true)
      try{ localStorage.setItem('lex_notify_last_seen', today) }catch{}
    }
  },[authed, loading, bellNotifications])

  async function toggleReq(law, req){
    const next = req.status==='met' ? 'unmet' : 'met'
    const stamp = { status:next, evaluated_by:currentUserName(), evaluated_at:new Date().toISOString() }
    // snapshot for rollback if the write fails (optimistic UI)
    const prevLaws = laws
    const prevOpen = openLaw
    setLaws(prev=>prev.map(l=>{
      if(l.id!==law.id) return l
      const reqs=l.reqs.map(r=>r.id===req.id?{...r,...stamp}:r)
      const status=reqs.some(r=>r.status==='unmet')?'bad':'ok'
      return {...l,reqs,status}
    }))
    setOpenLaw(prev=>prev&&prev.id===law.id?{...prev,reqs:prev.reqs.map(r=>r.id===req.id?{...r,...stamp}:r),status:prev.reqs.map(r=>r.id===req.id?{...r,...stamp}:r).some(r=>r.status==='unmet')?'bad':'ok'}:prev)
    try{
      await setRequirementStatus(req.id,next); await recomputeLawStatus(law.id,law.reqs.map(r=>r.id===req.id?{...r,status:next}:r))
      await logActivity({ action:'requirement', law_id:law.id, law_code:law.code, law_name:law.name, detail:(next==='met'?'ปรับเป็นสอดคล้อง: ':'ปรับเป็นยังไม่สอดคล้อง: ')+(req.text||'').slice(0,80) })
      fetchActivity().then(setActivity)
    }
    catch(e){ setLaws(prevLaws); setOpenLaw(prevOpen); toast('บันทึกไม่สำเร็จ: '+e.message,'error') }
  }

  async function handleRepeal(law, data){
    try{
      await repealLaw(law.id,data); setLaws(prev=>prev.map(l=>l.id===law.id?{...l,status:'repealed',...data}:l)); setOpenLaw(null)
      await logActivity({ action:'repeal', law_id:law.id, law_code:law.code, law_name:law.name, detail:data?.repeal_reason||'ยกเลิก/แทนที่' })
      fetchActivity().then(setActivity); fetchQuarterStats().then(setQuarterStats)
    }
    catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message) }
  }

  async function handleRestore(law){
    try{
      await restoreLaw(law.id); setLaws(prev=>prev.map(l=>l.id===law.id?{...l,status:'ok',repeal_date:null,repeal_reason:null,replaced_by_code:null,repealed_by_authority:null}:l)); setOpenLaw(null)
      await logActivity({ action:'restore', law_id:law.id, law_code:law.code, law_name:law.name, detail:'กู้คืนกฎหมาย' })
      fetchActivity().then(setActivity); fetchQuarterStats().then(setQuarterStats)
    }
    catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message) }
  }

  // P14 · Task 3 — ลบกฎหมายถาวร (admin) · optimistic + rollback
  async function handleDeleteLaw(law){
    const prevLaws=laws, prevWf=workflowRows
    setLaws(prev=>prev.filter(l=>l.id!==law.id))
    setWorkflowRows(prev=>prev.filter(w=>w.law_id!==law.id))
    setOpenLaw(null)
    try{
      await deleteLaw(law.id, { code:law.code, name:law.name })
      fetchActivity().then(setActivity); fetchQuarterStats().then(setQuarterStats)
      toast(`ลบ ${law.code} แล้ว`,'success')
    }catch(e){
      setLaws(prevLaws); setWorkflowRows(prevWf)
      toast('ลบไม่สำเร็จ: '+e.message,'error')
    }
  }

  async function handleBulkCompliance(ids, met){
    if(!ids.length) return
    try{
      await bulkSetCompliance(ids, met)
      const d=await fetchAll(); setLaws(d.laws)
      toast(`อัปเดต ${ids.length} ฉบับเป็น${met?'สอดคล้อง':'ยังไม่สอดคล้อง'}แล้ว`,'success')
    }catch(e){ toast('อัปเดตไม่สำเร็จ: '+e.message) }
  }

  async function handleCreateLaw(fields){
    try{
      const newLaw=await createLaw(fields); setLaws(prev=>[...prev,newLaw])
      await logActivity({ action:'create', law_id:newLaw.id, law_code:newLaw.code, law_name:newLaw.name, detail:'เพิ่มกฎหมายใหม่เข้าทะเบียน' })
      fetchActivity().then(setActivity); fetchQuarterStats().then(setQuarterStats)
    }
    catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message) }
  }

  async function handleToggleActive(law){
    const next = law.active===false
    try{
      await setLawActive(law.id, next)
      setLaws(prev=>prev.map(l=>l.id===law.id?{...l,active:next}:l))
      setOpenLaw(prev=>prev&&prev.id===law.id?{...prev,active:next}:prev)
      await logActivity({ action:'requirement', law_id:law.id, law_code:law.code, law_name:law.name, detail: next?'เปลี่ยนเป็น “ใช้อยู่”':'เปลี่ยนเป็น “ไม่ใช้แล้ว”' })
      fetchActivity().then(setActivity)
    }catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message) }
  }

  async function handleDuplicate(law){
    const code = nextCode(laws, law.cat)
    if(!(await confirmDialog(`ทำซ้ำ ${law.code} → ${code} ?`))) return
    try{
      const nl = await handleCreateFull(
        { code, cat:law.cat, name:'(สำเนา) '+law.name, hierarchy_level:law.hierarchy_level||'4',
          ministry:law.ministry||'', announce_date:law.issue_date||'', effective_date:law.effective_date||'',
          doc_list:law.doc_list||'', source_url:law.source_url||'' },
        (law.reqs||[]).map(r=>({text:r.text,status:r.status,responsible:r.responsible,frequency:r.frequency,documents:r.documents})))
      setOpenLaw(nl)
    }catch(e){ toast('ทำซ้ำไม่สำเร็จ: '+e.message) }
  }

  async function handleCreateFull(fields, reqs){
    const newLaw=await createLawFull(fields, reqs)
    setLaws(prev=>[...prev,newLaw])
    await logActivity({ action:'create', law_id:newLaw.id, law_code:newLaw.code, law_name:newLaw.name, detail:'เพิ่มกฎหมายเข้าทะเบียน ('+(reqs?.length||0)+' ข้อ)' })
    fetchActivity().then(setActivity); fetchQuarterStats().then(setQuarterStats)
    return newLaw
  }

  // ── P10 · Process Tracker workflows ─────────────────────────────────────────
  // Workflow A · Process 1 — เพิ่มกฎหมายเข้าทะเบียน (จาก AddLawFlow)
  async function handleCreateAddWorkflow(payload){
    const { law, workflow } = await createAddWorkflow(payload)
    setLaws(prev=>[...prev,law]); if(workflow) setWorkflowRows(prev=>[workflow,...prev])   // P18: ปกติ workflow=null (ไม่เปิด case ตอนเพิ่ม)
    fetchActivity().then(setActivity); fetchQuarterStats().then(setQuarterStats); loadDiscovered()
    return { law, workflow }
  }
  // Workflow B · Process 1 — เปิดรายการติดตาม/ทวนสอบกฎหมายเดิม
  async function handleStartMonitor({ law, ownerName, followIssue }){
    try{ const wf = await createMonitorWorkflow({ law, ownerName, followIssue }); setWorkflowRows(prev=>[wf,...prev])
      fetchActivity().then(setActivity)
      toast('เปิดรายการทวนสอบแล้ว — รอประเมิน','success')
    }catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message) }
  }
  // Process 2 · ผู้ประเมิน (ใช้ร่วมทั้ง A และ B)
  async function handleWorkflowAssess(wf, law, payload){
    try{
      await submitWorkflowAssessment(wf, law, payload)
      const d=await fetchAll(); setLaws(d.laws); await loadWorkflow(); fetchActivity().then(setActivity)
      setFlowPopup({ title:'ประเมินเสร็จสิ้น', msg: payload.result==='สอดคล้อง'
        ? `${law?.code||''} ประเมินแล้ว: สอดคล้อง — ปิดรายการ`
        : `${law?.code||''} ประเมินแล้ว: ไม่สอดคล้อง — มีแผนปรับปรุงรอปิด` })
    }catch(e){ toast('บันทึกผลประเมินไม่สำเร็จ: '+e.message); throw e }   // P15·T2 · โยนต่อเพื่อไม่ให้ popup/drawer ปิด (ข้อมูลที่พิมพ์ไม่หาย)
  }
  // Process 3 · ปิดแผนปรับปรุง
  async function handleClosePlan(wf, law){
    try{
      await closeWorkflowPlan(wf, law, {})
      const d=await fetchAll(); setLaws(d.laws); await loadWorkflow(); fetchActivity().then(setActivity)
      setFlowPopup({ title:'ปิดแผนแล้ว', msg:`${law?.code||''} ปิดแผนปรับปรุง — พลิกเป็นสอดคล้อง` })
    }catch(e){ toast('ปิดแผนไม่สำเร็จ: '+e.message) }
  }

  async function handleMarkSent(commId, fileRef){
    try{
      await markCommSent(commId,fileRef)
      const {data}=await supabase.from('lg_communications').select('*').eq('id',commId).single()
      if(data) setComms(prev=>prev.map(c=>c.id===commId?data:c))
    } catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message) }
  }

  async function handleCommScheduleUpdate(commId, patch){
    try{ await updateCommSchedule(commId,patch); setComms(prev=>prev.map(c=>c.id===commId?{...c,...patch}:c)) }
    catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message) }
  }

  async function handleCommAdd(comm){
    try{ const row=await addComm(comm); if(row) setComms(prev=>[...prev,row]); toast('เพิ่มหัวข้อเรียบร้อย') }
    catch(e){ toast('เพิ่มหัวข้อไม่สำเร็จ: '+e.message) }
  }
  async function handleCommDelete(commId){
    try{ await deleteComm(commId); setComms(prev=>prev.filter(c=>c.id!==commId)); toast('ลบหัวข้อเรียบร้อย') }
    catch(e){ toast('ลบไม่สำเร็จ: '+e.message) }
  }

  async function handleReportSetEvent(id, eventDate, offsetDays){
    try{ await setReportEvent(id, eventDate, offsetDays); await loadReports() }
    catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message) }
  }
  async function handleReportSubmit(id, fileRef, sentDate){
    try{ await markReportSubmitted(id, fileRef, sentDate); await loadReports() }
    catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message) }
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
    if(hasSupabase){ try{ await toggleMonthCheck(year,month,nowChecked) }catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message) } }
  }

  // The two "current month" review actions — always act on the real current
  // year/month (not whatever year is being browsed in the Register panel).
  async function syncCurrentMonthEverywhere(year){
    await loadCurMonth()
    if(monthYear===year){ try{ setMonths(await fetchComplianceMonths(year)) }catch(e){ console.warn('months reload',e) } }
  }
  async function handleMonthNoNewLaws(){
    const now=new Date(), year=now.getFullYear(), month=now.getMonth()+1
    try{
      await setMonthReviewStatus(year, month, 'no_new_laws', currentUserName())
      await syncCurrentMonthEverywhere(year)
      toast('บันทึกแล้ว: เดือนนี้ไม่มีกฎหมายใหม่','success')
    }catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message) }
  }
  async function handleMonthHasNewLaws(){
    const now=new Date(), year=now.getFullYear(), month=now.getMonth()+1
    try{
      await setMonthReviewStatus(year, month, 'has_new_laws', currentUserName())
      await syncCurrentMonthEverywhere(year)
      toast('บันทึกแล้ว: เดือนนี้มีกฎหมายใหม่','success')
    }catch(e){ toast('ดำเนินการไม่สำเร็จ: '+e.message) }
  }

  function handleExportPdf(mode, sel){
    let list = inForceLaws
    if(mode==='cats') list = inForceLaws.filter(l=>sel.has(l.cat))
    else if(mode==='nc') list = inForceLaws
      .filter(l=>l.reqs.some(r=>r.status==='unmet'))
      .map(l=>({...l, reqs:l.reqs.filter(r=>r.status==='unmet')}))
    setShowPdf(false)
    buildReport({ laws:list, catName:Object.fromEntries(cats.map(c=>[c.code,c.name])), settings, mode })
    setTimeout(()=>window.print(),80)
  }

  if(session===undefined) return <div className="loading"><div className="spin"/>กำลังตรวจสอบสิทธิ์…</div>
  if(!authed) return <Login onAuthed={s=>setSession(s)}/>
  if(loading) return (
    <div style={{minHeight:'100vh',background:'var(--paper)',padding:'32px 36px'}}>
      <DashboardSkeleton/>
    </div>
  )

  const title = TITLES[view] || ['—','']

  return (
    <AuthContext.Provider value={authValue}>
    <div className={'app'+(navOpen?'':' nav-collapsed')+(role==='viewer'?' role-viewer':'')}>
      <aside className={'sidebar'+(navOpen?'':' collapsed')}>
        <div className="brand" role="button" tabIndex={0} title="กลับหน้าหลัก"
          onClick={()=>setView('dashboard')}
          onKeyDown={e=>{ if(e.key==='Enter'||e.key===' ') setView('dashboard') }}>
          <div className="brand-mark">{settings.brand_mark||'CR'}</div>
          <h1>{settings.company_name||'Comply Register'}</h1>
          <span>{settings.subtitle||'ทะเบียนกฎหมาย SHE'}</span>
        </div>

        {NAV_GROUPS.map((group,gi)=>(
          <div key={gi} className="nav-group">
            {group.label && <div className="nav-label">{group.label}</div>}
            {group.items.map(n=>{
              // P17: badge งานต้องทำบนเมนู "รายการที่ต้องทำ" — สีแดงถ้ามีเลยกำหนด
              const badge = n.id==='tasks' ? (openWorkCount||null) : null
              const urgent = n.id==='tasks' && trackerUrgent
              return (
                <button key={n.id} className={'nav-item'+(view===n.id?' active':'')+(n.sub?' sub':'')}
                  onClick={()=>{ setView(n.id); if(n.id==='tasks') setTrackerFocus(f=>f+1) }} title={n.label}>
                  <span className="nav-ic"><I n={n.icon}/></span>
                  <span className="label">{n.label}</span>
                  {badge ? <span className={'badge'+(urgent?'':' accent')} title={urgent?'มีรายการเลยกำหนดทวนสอบ':'งานค้างในกระบวนการ'}>{badge}</span> : null}
                </button>
              )
            })}
          </div>
        ))}

        {/* P19 · ตั้งค่า ย้ายจากเมนูหลักมาเป็นปุ่มเฟืองมุมล่างซ้าย (เฉพาะ admin เหมือนเดิม) */}
        <div className="side-foot">
          <div className="av">{(session?.name||'ผู้').trim().charAt(0)}</div>
          <div style={{flex:1,minWidth:0}}><div className="nm">{session?.name||'ผู้ใช้งาน'}</div><div className="rl">{ROLE_LABELS[role]||role}</div></div>
          {can(role,'delete') && (
            <button className={'side-gear'+(view==='settings'?' active':'')} onClick={()=>setView('settings')} title="ตั้งค่า">
              <I n="gear"/>
            </button>
          )}
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="navtoggle no-print" onClick={()=>setNavOpen(o=>!o)} title={navOpen?'ปิดเมนู':'เปิดเมนู'} aria-label="toggle menu">
            <span/><span/><span/>
          </button>
          <div className="search" style={{position:'relative'}}>
            <I n="search"/>
            <input placeholder="ค้นหากฎหมาย / กระทรวง / รายงาน…" value={search}
              onChange={e=>setSearch(e.target.value)}
              onFocus={()=>setSearchFocus(true)} onBlur={()=>setTimeout(()=>setSearchFocus(false),180)}/>
            {searchFocus && searchResults.length>0 && (
              <div className="search-results">
                {searchResults.map((r,i)=>(
                  <div key={i} className={'sr-item'+(r.color?' sr-item--cat':'')} style={r.color?{'--sr-c':r.color}:undefined} onMouseDown={()=>{
                    if(r.kind==='law') setOpenLaw(r.law)
                    else if(r.kind==='report') goView('reports')
                    setSearch('')
                  }}>
                    <span className="sr-tag" title={r.catName||''}>{r.kind==='law'?(r.law.cat||'กฎหมาย'):'รายงาน'}</span>
                    <span className="sr-label">{r.label}</span>
                    <span className="sr-sub">{r.sub}</span>
                    {r.ministry && <span className={'sr-min'+(r.byMin?' hit':'')}>{r.ministry.slice(0,26)}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="bell no-print" onClick={()=>setView('notifications')}>
            <I n="bell"/>การแจ้งเตือน{bellNotifications.length>0&&<span className="dot">{bellNotifications.length}</span>}
          </button>
          <div className="tb-menu no-print">
            <button className="topbar-av" onClick={()=>setAvatarOpen(o=>!o)} title="เมนูผู้ใช้">{(session?.name||'ผู้').trim().charAt(0)}</button>
            {avatarOpen && (<>
              <div className="menu-scrim" onClick={()=>setAvatarOpen(false)}/>
              <div className="menu">
                <div className="menu-user"><div className="mu-name">{session?.name||'ผู้ใช้งาน'}</div><div className="mu-role">{ROLE_LABELS[role]||role}</div></div>
                <button className="menu-item" onClick={()=>{ setDark(d=>!d); setAvatarOpen(false) }}><I n={dark?'sun':'moon'}/>{dark?'โหมดสว่าง':'โหมดมืด'}</button>
                <button className="menu-item" onClick={async()=>{ setAvatarOpen(false); await authSignOut(); setSession(await getAuthSession()) }}><I n="logout"/>ออกจากระบบ</button>
              </div>
            </>)}
          </div>
        </header>

        <div className="content">
          {err && <div className="banner">{err}</div>}
          <div className="page-head no-print">
            <div><h2>{title[0]}</h2><p>{title[1]}</p></div>
            <div className="page-actions">
              {(view==='registry'||view==='dashboard') && (
                <div className="tb-menu">
                  <button className="btn btn-ghost" onClick={()=>setExportOpen(o=>!o)}><I n="download"/>ส่งออก ▾</button>
                  {exportOpen && (<>
                    <div className="menu-scrim" onClick={()=>setExportOpen(false)}/>
                    <div className="menu">
                      <button className="menu-item" onClick={()=>{ exportLawsToExcel(activeLaws,catMap); setExportOpen(false) }}><I n="download"/>ส่งออก Excel</button>
                      <button className="menu-item" onClick={()=>{ setShowPdf(true); setExportOpen(false) }}><I n="download"/>ส่งออก PDF (F-259)</button>
                    </div>
                  </>)}
                </div>
              )}
            </div>
          </div>
          <div className="view-swap" key={view}>
          {view==='dashboard'     && <Dashboard     laws={laws} cats={cats} catMap={catMap} onOpen={setOpenLaw} taskRows={taskRows} onGoView={goView}
            monthsData={months}/>}
          {view==='tasks'         && <Tasks taskRows={taskRows} workflowRows={workflowRows} laws={activeLaws} catMap={catMap} suggest={suggest} focusSignal={trackerFocus}
            onStartMonitor={async(...a)=>{ await handleStartMonitor(...a); loadTasks() }}
            onAssess={async(...a)=>{ await handleWorkflowAssess(...a); loadTasks() }}
            onClosePlan={async(...a)=>{ await handleClosePlan(...a); loadTasks() }}
            onReportSubmit={async(id)=>{ await handleReportSubmit(id); loadTasks() }}
            onCommSent={async(id)=>{ await handleMarkSent(id); loadTasks() }}
            onOpenLaw={setOpenLaw}/>}
          {view==='registry'      && <RegistryCompliance
            regLaws={activeLaws} cats={cats} catMap={catMap} stats={stats}
            search={searchDebounced} onOpen={setOpenLaw} onCreate={handleCreateLaw} onBulk={handleBulkCompliance} allLaws={laws}
            workflow={workflowRows} suggest={suggest} onAssess={handleWorkflowAssess} focus={regFocus} onDelete={handleDeleteLaw}
            round={round} onExportF259={()=>setShowPdf(true)} onAddLaw={()=>openAddLaw()}
            onImported={async()=>{ await loadLaws(); fetchQuarterStats().then(setQuarterStats); fetchActivity().then(setActivity) }}
            monthsData={months} monthYear={monthYear} setMonthYear={setMonthYear} onToggleMonth={handleToggleMonth}
            onMarkNoNewLaws={handleMonthNoNewLaws} onMarkHasNewLaws={handleMonthHasNewLaws}
            activity={activity} settings={settings} searchLog={searchLog} repealedLaws={repealedLaws} onRestore={handleRestore}/>}
          {view==='summary'       && <LawSummary laws={activeLaws} cats={cats} catMap={catMap} discovered={discovered} suggest={suggest}
            onReloadDiscovered={loadDiscovered} onReloadLaws={loadLaws} onOpenLaw={setOpenLaw} onAddToRegistry={init=>openAddLaw(init)}/>}
          {view==='improvements'  && <Improvements  laws={inForceLaws} catMap={catMap} onOpen={setOpenLaw}/>}
          {view==='comm'          && (<div className="view">
            <div className="seg" style={{marginBottom:14}}>
              <button className={'seg-btn'+(commTab==='comm'?' active':'')} onClick={()=>setCommTab('comm')}>ตารางการสื่อสาร</button>
              <button className={'seg-btn'+(commTab==='reports'?' active':'')} onClick={()=>setCommTab('reports')}>ส่งรายงานราชการ</button>
            </div>
            {commTab==='comm'    && <Communication comms={comms} onMarkSent={handleMarkSent} onScheduleUpdate={handleCommScheduleUpdate} onAdd={handleCommAdd} onDelete={handleCommDelete}/>}
            {commTab==='reports' && <Reports reports={reports} onSetEvent={handleReportSetEvent} onSubmit={handleReportSubmit}/>}
          </div>)}
          {view==='notifications' && <NotificationsPage notifs={bellNotifications} onOpenLaw={setOpenLaw} onGoToView={goView}/>}
          {view==='settings'      && (can(role,'delete')
            ? <SettingsPage settings={settings} onSave={async patch=>{ await saveSettings(patch); setSettings(s=>({...s,...patch})); toast('บันทึกการตั้งค่าแล้ว','success') }} training={training} setTraining={setTraining}/>
            : <div className="view"><div className="panel" style={{padding:'50px 20px',textAlign:'center',color:'var(--ink-faint)'}}>เฉพาะผู้ดูแลระบบ (admin) เท่านั้นที่เข้าถึงหน้าตั้งค่าได้ — {NO_PERM}</div></div>)}
          </div>
        </div>
      </div>

      {openLaw && (
        <LawDrawer law={openLaw} catMap={catMap} onClose={()=>setOpenLaw(null)}
          onToggle={toggleReq} onRepeal={handleRepeal} onRestore={handleRestore} onDuplicate={handleDuplicate} onToggleActive={handleToggleActive} onDelete={handleDeleteLaw}
          thDate={thDate}/>
      )}
      {showAddLaw && <AddLawFlow cats={cats} allLaws={laws} suggest={suggest} initialData={addLawInit}
        onCreate={handleCreateAddWorkflow} onClose={()=>{ setShowAddLaw(false); setAddLawInit(null) }}
        onDone={(law)=>{ loadDiscovered()
          if(law){ setView('registry'); setRegFocus({ lawId:law.id, cat:law.cat, ts:Date.now() }) }
          setFlowPopup({ title:'เพิ่มเข้าทะเบียนแล้ว', msg:'กฎหมายถูกเพิ่มเข้าทะเบียนพร้อมผลประเมินรายข้อแล้ว — แสดงในทะเบียนหมวด '+(law?.cat||'') }) }}/>}
      {flowPopup && (
        <div className="flow-popup-overlay" style={{position:'fixed',inset:0,display:'grid',placeItems:'center',zIndex:400,background:'rgba(20,24,33,.45)'}} onClick={()=>setFlowPopup(null)}>
          <div className="panel" style={{maxWidth:380,padding:'22px 24px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:34,marginBottom:8}}>✅</div>
            <h3 style={{margin:'0 0 6px',fontSize:17}}>{flowPopup.title}</h3>
            <p style={{fontSize:13,color:'var(--ink-soft)',margin:'0 0 16px'}}>{flowPopup.msg}</p>
            <button className="btn btn-primary" onClick={()=>setFlowPopup(null)}>ตกลง</button>
          </div>
        </div>
      )}
      {showPdf && <ExportPdfModal cats={cats} onClose={()=>setShowPdf(false)} onExport={handleExportPdf}/>}
      {showNotify && (
        <NotifyPopup notifs={bellNotifications} onClose={()=>setShowNotify(false)}
          onOpenLaw={setOpenLaw} onGoToView={goView}/>
      )}
      <div id="print-report"/>
      <Toaster/>
      <ConfirmHost/>
      <Clawdmeter/>
    </div>
    </AuthContext.Provider>
  )
}
