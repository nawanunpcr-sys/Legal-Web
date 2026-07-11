import { useEffect, useMemo, useState } from 'react'
import { supabase, hasSupabase, fetchAll,
         setRequirementStatus, recomputeLawStatus, bulkSetCompliance, setLawActive,
         repealLaw, restoreLaw, createLaw, createLawFull, uploadLawDoc,
         markCommSent, updateCommSchedule,
         dismissNotification,
         fetchComplianceMonths, toggleMonthCheck, setMonthReviewStatus,
         fetchStaging, fetchUpdates, addStagedLaw, dismissStaged, setUpdateStatus,
         logActivity, fetchActivity, fetchQuarterStats, suggestionLists,
         fetchReports, setReportEvent, markReportSubmitted,
         fetchProcessItems, createProcessItem, subscribeProcessItems,
         fetchTracker, fetchTrackerSubstatuses, subscribeTracker, createTrackerCase,
         fetchSettings, saveSettings, DEFAULT_SETTINGS,
         STATUS, LAW_TYPES, RECURRENCE_LABELS } from './lib/supabase.js'
import { AuthContext, useAuth, can, ROLE_LABELS, NO_PERM, currentUserName,
         getSession as getAuthSession, signOut as authSignOut, onAuthChange } from './lib/auth.js'
import LawDrawer from './components/LawDrawer.jsx'
import Reports from './components/Reports.jsx'
import ProcessTracker, { StageBar } from './components/ProcessTracker.jsx'
import LawTracker, { CaseStepper, groupCases, effStatus } from './components/LawTracker.jsx'
import { I } from './components/icons.jsx'
import Login from './components/Login.jsx'
import Landing from './components/Landing.jsx'
import Attachments from './components/Attachments.jsx'
import NotifyPopup, { isOverdueItem } from './components/NotifyPopup.jsx'
import { DashboardSkeleton } from './components/Skeleton.jsx'
import Toaster from './components/Toaster.jsx'
import ConfirmHost from './components/ConfirmHost.jsx'
import { toast } from './lib/toast.js'
import { confirmDialog } from './lib/confirm.js'
import { buildReport } from './components/PdfExport.jsx'
import { exportLawsToExcel } from './lib/integrations.js'
import { usePersist, prog, lawBEYear, thDate, daysTo, beYearFromDate, TH_MONTHS,
         Pill, Tag, ActiveBadge, CAT_COLORS, withCatColors,
         nextCode, normName, dupCheck } from './lib/ui.jsx'
import RegistryCompliance from './pages/Registry.jsx'
import Analysis from './pages/Analysis.jsx'
import Communication from './pages/Communications.jsx'
import Repealed from './pages/Repealed.jsx'
import ExportPdfModal from './components/ExportPdfModal.jsx'
import Improvements from './pages/Improvements.jsx'
import NotificationsPage from './pages/Notifications.jsx'
import SettingsPage from './pages/Settings.jsx'
import Updates from './pages/Updates.jsx'
import Staging from './pages/Staging.jsx'

const NAV_GROUPS = [
  { label: null, items: [
    { id:'dashboard',     label:'Dashboard',            icon:'grid'    },
    { id:'registry',      label:'ทะเบียน & ความสอดคล้อง', icon:'book'    },
    { id:'process',       label:'ติดตามกระบวนการ',       icon:'inbox'   },
    { id:'tracker',       label:'ติดตามสถานะกฎหมาย',     icon:'update'  },
  ]},
  { label: '① ค้นพบกฎหมายใหม่', items: [
    { id:'updates',       label:'อัปเดตกฎหมาย',          icon:'update'  },
    { id:'analysis',      label:'วิเคราะห์ & AI',          icon:'spark'   },
  ]},
  { label: '② ตรวจเนื้อหา', items: [
    { id:'staging',       label:'รออนุมัติเข้าทะเบียน',   icon:'inbox'   },
  ]},
  { label: '③ ส่งต่อ & สื่อสาร', items: [
    { id:'comm',          label:'การสื่อสาร (ISD-86)',   icon:'chat'    },
  ]},
  { label: '④ ตรวจสอบ & ติดตาม', items: [
    { id:'reports',       label:'การส่งรายงานราชการ',    icon:'inbox'   },
  ]},
  { label: 'อ้างอิง & ระบบ', items: [
    { id:'repealed',      label:'กฎหมายที่ถูกยกเลิก',   icon:'ban'     },
    { id:'notifications', label:'การแจ้งเตือน',           icon:'bell'    },
    { id:'settings',      label:'ตั้งค่า',                icon:'gear'    },
  ]},
]

const TITLES = {
  dashboard:     ['Dashboard',             'สรุปสถานะความสอดคล้องตามกฎหมาย SHE'],
  registry:      ['ทะเบียน & ความสอดคล้อง','ทะเบียนกฎหมายพร้อมสถานะความสอดคล้องรายข้อกำหนด'],
  register:      ['ทะเบียนกฎหมาย',         'กฎหมายที่เกี่ยวข้องและสถานะการปฏิบัติ'],
  compliance:    ['ติดตามความสอดคล้อง',    'สถานะรายข้อกำหนดแยกตามหมวดและลำดับชั้น'],
  improvements:  ['แผนปรับปรุง',           'รายการ NC และแนวทางแก้ไข (อ้างอิง PD-05)'],
  repealed:      ['กฎหมายที่ถูกยกเลิก',    'รายการกฎหมายที่ยกเลิก / ถูกแทนที่'],
  comm:          ['ตารางการสื่อสาร',        'การสื่อสารภายในและภายนอกองค์กร (ISD-86)'],
  reports:       ['การส่งรายงานราชการ',     'ติดตามและแจ้งเตือนกำหนดส่งรายงานต่อหน่วยงานรัฐ'],
  process:       ['ติดตามกระบวนการ',        'ค้นพบ → ตรวจเนื้อหา → ส่งต่อ → ตรวจสอบ/ติดตาม'],
  tracker:       ['ติดตามสถานะกฎหมาย',      'ติดตาม 3 ขั้น: ค้นหา/วิเคราะห์ → หน่วยงานดำเนินการ → ทวนสอบ'],
  analysis:      ['วิเคราะห์ & สรุป AI',   'สรุปกฎหมายเข้าทะเบียนด้วย AI (Skill)'],
  staging:       ['นำเข้า / รออนุมัติ',    'รายการที่ AI สรุปไว้ รอกดเพิ่มเข้าทะเบียน'],
  updates:       ['อัปเดตกฎหมาย · ShawPat','เฝ้าระวังกฎหมายใหม่จาก ShawPat'],
  notifications: ['ศูนย์การแจ้งเตือน',     'การแจ้งเตือนและการติดตามสถานะทั้งหมด'],
  settings:      ['ตั้งค่า',                'ข้อมูลองค์กรและการแสดงผลของระบบ'],
}

export default function App(){
  const [session,setSession] = useState(undefined) // undefined=checking, null=logged out
  const [showLogin,setShowLogin] = useState(false)  // false=show public Landing, true=show Login form
  const [navOpen,setNavOpen] = useState(()=>{ try{ return localStorage.getItem('cr_nav')!=='0' }catch{ return true } })
  const [view,setView]     = useState(()=>{ try{ const v=localStorage.getItem('cr_view')||'dashboard';
    // backward-compat: the old split 'register'/'compliance' views are now one 'registry' view
    if(v==='register'||v==='compliance'){ try{ localStorage.setItem('cr_registry_mode', JSON.stringify(v==='compliance'?'compliance':'register')) }catch{} return 'registry' }
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
  const [months,setMonths]   = useState([])
  const [staging,setStaging] = useState([])
  const [updates,setUpdates] = useState([])
  const [activity,setActivity] = useState([])
  const [quarterStats,setQuarterStats] = useState([])
  const [settings,setSettings] = useState(DEFAULT_SETTINGS)
  const [processItems,setProcessItems] = useState([])
  const [trackerRows,setTrackerRows] = useState([])
  const [trackerSubs,setTrackerSubs] = useState({})
  const [reports,setReports] = useState([])
  const [showNotify,setShowNotify] = useState(false)
  const [curMonthRows,setCurMonthRows] = useState([])   // compliance_months rows for the *real* current year — drives the live Dashboard StageBar regardless of whatever year is browsed in the Register monthly panel

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

  async function reloadSkills(){
    try{ const [s,u,a] = await Promise.all([fetchStaging(), fetchUpdates(), fetchActivity()]); setStaging(s); setUpdates(u); setActivity(a) }
    catch(e){ console.warn('skills reload error',e) }
  }
  async function loadProcess(){ try{ setProcessItems(await fetchProcessItems()) }catch(e){ console.warn('process reload',e) } }
  async function loadTracker(){ try{ const [r,s]=await Promise.all([fetchTracker(),fetchTrackerSubstatuses()]); setTrackerRows(r); setTrackerSubs(s) }catch(e){ console.warn('tracker reload',e) } }
  async function loadReports(){ try{ setReports(await fetchReports()) }catch(e){ console.warn('reports reload',e) } }
  async function loadCurMonth(){ try{ setCurMonthRows(await fetchComplianceMonths(new Date().getFullYear())) }catch(e){ console.warn('cur month reload',e) } }

  useEffect(()=>{ if(!authed) return; (async()=>{
    if(!hasSupabase){ setErr('ยังไม่ได้ตั้งค่า Supabase (.env) — กำลังแสดงหน้าเปล่า'); setLoading(false); return }
    try{
      const [d, mData, s, u, a, qs, rp, st, pi] = await Promise.all([fetchAll(), fetchComplianceMonths(new Date().getFullYear()), fetchStaging(), fetchUpdates(), fetchActivity(), fetchQuarterStats(), fetchReports(), fetchSettings(), fetchProcessItems()])
      setCats(withCatColors(d.cats)); setLaws(d.laws); setComms(d.comms); setNotifs(d.notifs)
      setMonths(mData); setCurMonthRows(mData); setStaging(s); setUpdates(u); setActivity(a); setQuarterStats(qs); setReports(rp); setSettings(st); setProcessItems(pi)
      loadTracker()
    }
    catch(e){ setErr('เชื่อมต่อฐานข้อมูลไม่สำเร็จ: '+e.message) }
    setLoading(false)
  })() },[authed])

  // Phase 2 · Realtime: keep tracker rows live across tabs/users
  useEffect(()=>{ if(!authed || !hasSupabase) return
    let t=null
    const unsub = subscribeTracker(()=>{ clearTimeout(t); t=setTimeout(loadTracker, 250) })
    return ()=>{ clearTimeout(t); unsub() }
  },[authed])

  // Live process tracker: realtime subscription + a 60s visible-tab poll as a
  // fallback in case the `lg_process_items` table hasn't been added to the
  // Supabase realtime publication (see migration notes).
  useEffect(()=>{ if(!authed || !hasSupabase) return
    let t=null
    const unsub = subscribeProcessItems(()=>{ clearTimeout(t); t=setTimeout(loadProcess, 250) })
    const iv = setInterval(()=>{ if(document.visibilityState==='visible') loadProcess() }, 60000)
    return ()=>{ clearTimeout(t); clearInterval(iv); unsub() }
  },[authed])

  useEffect(()=>{ (async()=>{
    if(!hasSupabase) return
    try{ const mData = await fetchComplianceMonths(monthYear); setMonths(mData) }
    catch(e){ console.warn('month fetch error',e) }
  })() },[monthYear])

  const catMap      = useMemo(()=>Object.fromEntries(cats.map(c=>[c.code,c])),[cats])
  const activeLaws  = useMemo(()=>laws.filter(l=>l.status!=='repealed'),[laws])
  const repealedLaws= useMemo(()=>laws.filter(l=>l.status==='repealed'),[laws])
  // จัดกลุ่มด้วย (cat, law_code) เพราะรหัสซ้ำข้ามหมวดได้ — ถ้าจัดกลุ่มด้วย law_code เดี่ยวๆ กฎหมายคนละหมวดที่เลขชนกันจะถูกรวมเป็นฉบับเดียว
  const stagingBatches = useMemo(()=>{ const g={}; staging.forEach(r=>{ const k=(r.cat||'')+'|'+r.law_code; (g[k]=g[k]||[]).push(r)}); return Object.entries(g) },[staging])
  const newUpdates  = useMemo(()=>updates.filter(u=>u.status==='new'),[updates])
  const suggest     = useMemo(()=>suggestionLists(laws),[laws])
  const allProcess  = useMemo(()=>{
    const out = processItems.map(p=>({...p,auto:false}))
    updates.filter(u=>u.status==='new').forEach(u=>out.push({id:'u'+u.id,auto:true,stage:'discovery',title:u.title,note:'กฎหมายใหม่จาก '+(u.source||'ShawPat'),goView:'updates'}))
    stagingBatches.forEach(([key,rows])=>out.push({id:'s'+key,auto:true,stage:'review',title:rows[0]?.law_name||rows[0]?.law_code||key,note:rows.length+' ข้อกำหนด รออนุมัติ',goView:'staging'}))
    activeLaws.filter(l=>l.status==='bad').forEach(l=>out.push({id:'law'+l.id,auto:true,stage:'verify',title:l.code+' — '+(l.name||'').slice(0,50),note:'ยังไม่สอดคล้อง · '+l.reqs.filter(r=>r.status!=='met').length+' ข้อ',goView:'registry'}))
    return out
  },[processItems,updates,stagingBatches,activeLaws])
  const searchResults = useMemo(()=>{
    const q=search.trim().toLowerCase(); if(q.length<2) return []
    const out=[]
    activeLaws.forEach(l=>{ const min=(l.ministry||''); const byMin=min.toLowerCase().includes(q); if(l.code.toLowerCase().includes(q)||(l.name||'').toLowerCase().includes(q)||byMin) out.push({kind:'law',law:l,label:l.code,sub:(l.name||'').slice(0,50),ministry:min,byMin,color:catMap[l.cat]?.color,catName:catMap[l.cat]?.name}) })
    reports.forEach(r=>{ if((r.title||'').toLowerCase().includes(q)) out.push({kind:'report',label:(r.title||'').slice(0,40),sub:'รายงานราชการ'}) })
    return out.slice(0,12)
  },[search,activeLaws,reports,catMap])

  async function handleAddStaged(code, rows){
    try{
      const law = await addStagedLaw(rows)
      const d=await fetchAll(); setLaws(d.laws); await reloadSkills(); fetchQuarterStats().then(setQuarterStats)
      // อนุมัติเข้าทะเบียนแล้ว → เริ่มติดตามที่ขั้น 2 (หน่วยงานดำเนินการ) ข้ามถ้ามี case อยู่แล้ว
      if(law?.id && !trackerRows.some(r=>r.law_id===law.id)){
        try{ await createTrackerCase({ law_id: law.id, startStage: 2, startSubstatus: 'pending_assign' }); await loadTracker() }
        catch(e2){ console.warn('createTrackerCase after staging failed', e2) }
      }
    }
    catch(e){ toast('เพิ่มเข้าทะเบียนไม่สำเร็จ: '+e.message) }
  }
  async function handleDropStaged(rows){
    try{ await dismissStaged(rows.map(r=>r.id)); await reloadSkills() }
    catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message) }
  }
  async function handleMarkUpdate(id, status){
    try{ await setUpdateStatus(id,status); await reloadSkills() }
    catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message) }
  }

  const inForceLaws = useMemo(()=>activeLaws.filter(l=>l.active!==false),[activeLaws])
  const stats = useMemo(()=>{
    let req=0,met=0; inForceLaws.forEach(l=>l.reqs.forEach(r=>{req++;if(r.status==='met')met++}))
    return { total:inForceLaws.length, req, met, nc:req-met, pct:req?Math.round(met/req*100):100 }
  },[inForceLaws])

  const reportAlerts = useMemo(()=>
    reports.filter(r=>{ if(!r.next_due_date) return false; const d=daysTo(r.next_due_date); return d<0||d<=(r.notify_days_before||30) }).length
  ,[reports])

  const bellNotifications = useMemo(()=>{
    const out=[]
    activeLaws.forEach(l=>{ if(l.status==='bad') out.push({type:'bad',law:l,text:l.code+' ยังไม่สอดคล้อง',sub:l.name.slice(0,60)}) })
    comms.forEach(c=>{ if(c.next_scheduled_date){ const d=daysTo(c.next_scheduled_date); const nb=c.notify_days_before||7; if(d>=0&&d<=nb) out.push({type:'comm',comm:c,days:d,text:'การสื่อสาร: '+c.topic.slice(0,50),sub:'ครบกำหนดใน '+d+' วัน — '+thDate(c.next_scheduled_date)}) }})
    reports.forEach(r=>{ if(r.next_due_date){ const d=daysTo(r.next_due_date); if(d<0) out.push({type:'bad',goView:'reports',text:'รายงานเกินกำหนดส่ง: '+r.title.slice(0,50),sub:'เกิน '+Math.abs(d)+' วัน — '+thDate(r.next_due_date)}) }})
    newUpdates.slice(0,15).forEach(u=>out.push({type:'law_update',goView:'updates',text:'กฎหมายใหม่: '+u.title.slice(0,55),sub:'จาก ShawPat'+(u.published_date?' · '+u.published_date:'')}))
    return out.sort((a,b)=>(a.type==='bad'?-1:0)-(b.type==='bad'?-1:0))
  },[activeLaws,comms,notifs,newUpdates,reports])

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
      const monthLabel = TH_MONTHS[month-1]+' '+(year+543)
      const item = await createProcessItem({ title:`ตรวจสอบกฎหมายใหม่ประจำเดือน ${monthLabel}`, ref_type:'monthly_review', stage:'discovery', note:'สร้างอัตโนมัติจากการตรวจสอบรายเดือน' })
      setProcessItems(prev=>[item, ...prev])
      await syncCurrentMonthEverywhere(year)
      setView('process')
      toast('เริ่มกระบวนการตรวจสอบกฎหมายใหม่แล้ว','success')
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
  if(!authed) return showLogin
    ? <Login onAuthed={s=>setSession(s)}/>
    : <Landing onEnter={()=>setShowLogin(true)}/>
  if(loading) return (
    <div style={{minHeight:'100vh',background:'var(--paper)',padding:'32px 36px'}}>
      <DashboardSkeleton/>
    </div>
  )

  const title = TITLES[view] || ['—','']

  return (
    <AuthContext.Provider value={authValue}>
    <div className={'app'+(navOpen?'':' nav-collapsed')}>
      <aside className={'sidebar'+(navOpen?'':' collapsed')}>
        <div className="brand" role="button" tabIndex={0} title="กลับหน้าหลัก"
          onClick={()=>setView('dashboard')}
          onKeyDown={e=>{ if(e.key==='Enter'||e.key===' ') setView('dashboard') }}>
          <div className="brand-mark">{settings.brand_mark||'CR'}</div>
          <h1>{settings.company_name||'ComplyRegister'}</h1>
          <span>{settings.subtitle||'ทะเบียนกฎหมาย SHE'}</span>
        </div>

        {NAV_GROUPS.map((group,gi)=>(
          <div key={gi} className="nav-group">
            {group.label && <div className="nav-label">{group.label}</div>}
            {group.items.filter(n=>n.id!=='settings'||can(role,'delete')).map(n=>{
              const badge =
                n.id==='registry'      ? activeLaws.length        :
                n.id==='improvements'  ? (stats.nc||null)         :
                n.id==='repealed'      ? (repealedLaws.length||null) :
                n.id==='reports'       ? (reportAlerts||null)     :
                n.id==='staging'       ? (stagingBatches.length||null) :
                n.id==='updates'       ? (newUpdates.length||null)   :
                n.id==='notifications' ? (bellNotifications.length||null) : null
              return (
                <button key={n.id} className={'nav-item'+(view===n.id?' active':'')}
                  onClick={()=>setView(n.id)} title={n.label}>
                  <span className="nav-ic"><I n={n.icon}/></span>
                  <span className="label">{n.label}</span>
                </button>
              )
            })}
          </div>
        ))}

        <div className="side-foot">
          <div className="av">{(session?.name||'ผู้').trim().charAt(0)}</div>
          <div><div className="nm">{session?.name||'ผู้ใช้งาน'}</div><div className="rl">{ROLE_LABELS[role]||role}</div></div>
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
                    else if(r.kind==='report') setView('reports')
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
                <button className="menu-item" onClick={async()=>{ setAvatarOpen(false); await authSignOut(); setSession(null) }}><I n="logout"/>ออกจากระบบ</button>
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
          {view==='dashboard'     && <Dashboard     laws={laws} cats={cats} catMap={catMap} onOpen={setOpenLaw} updates={updates} staging={stagingBatches} activity={activity} quarterStats={quarterStats} reports={reports} onGoReports={()=>setView('reports')} onGoView={setView} processItems={allProcess} rawProcessItems={processItems} onGoProcess={()=>setView('process')} trackerRows={trackerRows} trackerSubs={trackerSubs} onGoTracker={()=>setView('tracker')}
            monthRow={curMonthRows.find(m=>m.year===new Date().getFullYear()&&m.month===new Date().getMonth()+1)}
            onMarkNoNewLaws={handleMonthNoNewLaws} onMarkHasNewLaws={handleMonthHasNewLaws}/>}
          {view==='registry'      && <RegistryCompliance
            regLaws={activeLaws} compLaws={inForceLaws} cats={cats} catMap={catMap} stats={stats}
            search={searchDebounced} onOpen={setOpenLaw} onCreate={handleCreateLaw} onBulk={handleBulkCompliance} onToggle={toggleReq} allLaws={laws}
            months={months} monthYear={monthYear} setMonthYear={setMonthYear} onToggleMonth={handleToggleMonth}
            onMarkNoNewLaws={handleMonthNoNewLaws} onMarkHasNewLaws={handleMonthHasNewLaws}/>}
          {view==='improvements'  && <Improvements  laws={inForceLaws} catMap={catMap} onOpen={setOpenLaw}/>}
          {view==='repealed'      && <Repealed      laws={repealedLaws} catMap={catMap} search={searchDebounced} onOpen={setOpenLaw} onRestore={handleRestore}/>}
          {view==='comm'          && <Communication comms={comms} onMarkSent={handleMarkSent} onScheduleUpdate={handleCommScheduleUpdate}/>}
          {view==='reports'       && <Reports       reports={reports} onSetEvent={handleReportSetEvent} onSubmit={handleReportSubmit}/>}
          {view==='process'       && <ProcessTracker items={allProcess} onReload={loadProcess} updates={updates} onGoView={setView}/>}
          {view==='tracker'       && <LawTracker    rows={trackerRows} subs={trackerSubs} laws={activeLaws} suggest={suggest} onReload={loadTracker}/>}
          {view==='analysis'      && <Analysis      laws={inForceLaws} cats={cats} catMap={catMap} allLaws={laws} onAnalyzed={reloadSkills} goView={setView} onCreateFull={handleCreateFull} suggest={suggest}/>}
          {view==='staging'       && <Staging       batches={stagingBatches} catMap={catMap} onAdd={handleAddStaged} onDrop={handleDropStaged}/>}
          {view==='updates'       && <Updates       updates={updates} onMark={handleMarkUpdate} onScanned={reloadSkills}/>}
          {view==='notifications' && <NotificationsPage notifs={bellNotifications} onOpenLaw={setOpenLaw} onGoToView={setView}/>}
          {view==='settings'      && (can(role,'delete')
            ? <SettingsPage settings={settings} onSave={async patch=>{ await saveSettings(patch); setSettings(s=>({...s,...patch})); toast('บันทึกการตั้งค่าแล้ว','success') }}/>
            : <div className="view"><div className="panel" style={{padding:'50px 20px',textAlign:'center',color:'var(--ink-faint)'}}>เฉพาะผู้ดูแลระบบ (admin) เท่านั้นที่เข้าถึงหน้าตั้งค่าได้ — {NO_PERM}</div></div>)}
          </div>
        </div>
      </div>

      {openLaw && (
        <LawDrawer law={openLaw} catMap={catMap} onClose={()=>setOpenLaw(null)}
          onToggle={toggleReq} onRepeal={handleRepeal} onRestore={handleRestore} onDuplicate={handleDuplicate} onToggleActive={handleToggleActive}
          prog={prog} thDate={thDate}/>
      )}
      {showPdf && <ExportPdfModal cats={cats} onClose={()=>setShowPdf(false)} onExport={handleExportPdf}/>}
      {showNotify && (
        <NotifyPopup notifs={bellNotifications} onClose={()=>setShowNotify(false)}
          onOpenLaw={setOpenLaw} onGoToView={setView}/>
      )}
      <div id="print-report"/>
      <Toaster/>
      <ConfirmHost/>
    </div>
    </AuthContext.Provider>
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
  const fullDate = s => { if(!s) return ''; const m=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']; const d=new Date(s); return d.getDate()+' '+m[d.getMonth()]+' '+(d.getFullYear()+543) }
  const hhmm = s => { const d=new Date(s); return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0') }
  return (
    <div className="panel" style={{marginTop:16}}>
      <div className="panel-h"><h3>บันทึกกิจกรรมล่าสุด</h3>
        <span className="sub" style={{marginLeft:'auto'}}>บันทึกอัตโนมัติทุกครั้งที่เพิ่ม / แก้ / ยกเลิก / นำเข้า</span></div>
      <div className="panel-b">
        {days.length===0 && <div style={{textAlign:'center',color:'var(--ink-faint)',padding:24,fontSize:13}}>ยังไม่มีเหตุการณ์ — เมื่อมีการเพิ่ม/แก้/ยกเลิกกฎหมาย จะบันทึกที่นี่พร้อมวันเวลา</div>}
        {shownDays.map(([date,items])=>(
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

const QUARTER_LABEL = ['ม.ค.-มี.ค.','เม.ย.-มิ.ย.','ก.ค.-ก.ย.','ต.ค.-ธ.ค.']

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

function Dashboard({laws,cats,catMap,onOpen,updates=[],staging=[],activity=[],quarterStats=[],reports=[],onGoReports,onGoView,processItems=[],rawProcessItems=[],onGoProcess,trackerRows=[],trackerSubs={},onGoTracker,monthRow,onMarkNoNewLaws,onMarkHasNewLaws}){
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
    <div className="dash-strip">
      {strip.map((s,i)=>(<div className="dash-strip-cell" key={i}>
        <div className={'dash-strip-val'+(s.accent?' is-accent':'')}>{s.val}</div>
        <div className="dash-strip-lab">{s.lab}</div>
      </div>))}
    </div>

    <StageBar items={processItems} onGo={onGoProcess} monthRow={monthRow} hasActiveWork={rawProcessItems.some(p=>p.stage!=='done')}
      monthLabel={TH_MONTHS[new Date().getMonth()]}
      onMarkNoNewLaws={onMarkNoNewLaws} onMarkHasNewLaws={onMarkHasNewLaws}/>

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

    <ReportDeadlinesPanel reports={reports} onGoReports={onGoReports} danger/>

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

