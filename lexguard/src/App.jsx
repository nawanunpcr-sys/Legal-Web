import { useEffect, useMemo, useState } from 'react'
import { supabase, hasSupabase, fetchAll,
         setRequirementStatus, recomputeLawStatus, bulkSetCompliance, setLawActive,
         repealLaw, restoreLaw, createLaw, createLawFull,
         markCommSent, updateCommSchedule,
         dismissNotification,
         fetchComplianceMonths, toggleMonthCheck, setMonthReviewStatus,
         fetchStaging, fetchUpdates, addStagedLaw, dismissStaged, setUpdateStatus,
         verifyStagingBatch, saveStagingEdits,
         logActivity, fetchActivity, fetchQuarterStats, suggestionLists,
         fetchReports, setReportEvent, markReportSubmitted,
         fetchTracker, fetchTrackerSubstatuses, subscribeTracker, createTrackerCase,
         fetchDepartments, fetchAssessmentFlow, fetchImprovementPlans,
         screenBatch, assignBatch, assessRequirement, setFlowAssessStatus,
         createImprovementPlan, updateImprovementPlan, closeImprovementPlan, finalizeAssessment,
         planEffectiveStatus,
         fetchSettings, saveSettings, DEFAULT_SETTINGS } from './lib/supabase.js'
import { AuthContext, useAuth, can, ROLE_LABELS, NO_PERM, currentUserName,
         getSession as getAuthSession, signOut as authSignOut, onAuthChange } from './lib/auth.js'
import LawDrawer from './components/LawDrawer.jsx'
import Reports from './components/Reports.jsx'
import UnifiedTracker from './components/UnifiedTracker.jsx'
import { I } from './components/icons.jsx'
import Login from './components/Login.jsx'
import Landing from './components/Landing.jsx'
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
         jorporReportDeadlines, effectiveInfo, trainingStatus } from './lib/ui.jsx'
import RoundSelect from './components/RoundSelect.jsx'
import Dashboard from './pages/Dashboard.jsx'
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
import Assessment from './pages/Assessment.jsx'
import Plans from './pages/Plans.jsx'

const NAV_GROUPS = [
  { label: null, items: [
    { id:'dashboard',     label:'Dashboard',            icon:'grid'    },
    { id:'registry',      label:'ทะเบียน & ความสอดคล้อง', icon:'book'    },
    { id:'tracker',       label:'Process Tracker',        icon:'update'  },
  ]},
  { label: 'ประเมิน & สื่อสาร', items: [
    { id:'plans',         label:'แผนปรับปรุง',            icon:'spark'   },
    { id:'comm',          label:'สื่อสาร & ส่งรายงาน',    icon:'chat'    },
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
  comm:          ['สื่อสาร & ส่งรายงาน',   'ตารางการสื่อสาร (ISD-86) และการส่งรายงานราชการในหน้าเดียว'],
  tracker:       ['Process Tracker',        'ค้นหา → คัดกรอง → ประเมิน → อนุมัติ → ติดตาม ครบในหน้าเดียว'],
  analysis:      ['วิเคราะห์ & สรุป AI',   'สรุปกฎหมายเข้าทะเบียนด้วย AI (Skill)'],
  plans:         ['แผนปรับปรุง',            'ติดตามแผนปรับปรุงข้อ NC จนปิด (พลิกเป็น C)'],
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
    if(v==='process') return 'tracker'   // P9: merged 'ติดตามกระบวนการ' into Process Tracker
    if(v==='staging'||v==='assessment') return 'tracker'  // P10: merged into Process Tracker hub
    if(v==='reports') return 'comm'       // P10: merged into สื่อสาร & ส่งรายงาน hub
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
  const [staging,setStaging] = useState([])
  const [updates,setUpdates] = useState([])
  const [activity,setActivity] = useState([])
  const [quarterStats,setQuarterStats] = useState([])
  const [settings,setSettings] = useState(DEFAULT_SETTINGS)
  const [trackerRows,setTrackerRows] = useState([])
  const [trackerSubs,setTrackerSubs] = useState({})
  const [reports,setReports] = useState([])
  const [departments,setDepartments] = useState([])   // หน่วยงาน (ผู้ประเมิน) — migration 018
  const [flow,setFlow]       = useState([])            // lg_assessment_flow (คัดกรอง/มอบหมาย/ประเมิน)
  const [plans,setPlans]     = useState([])            // lg_improvement_plans
  const [showNotify,setShowNotify] = useState(false)
  const [trackerTab,setTrackerTab] = usePersist('cr_tracker_tab','track')   // track | screen | assess (Process Tracker hub)
  const [commTab,setCommTab]       = usePersist('cr_comm_tab','comm')       // comm | reports (สื่อสาร & ส่งรายงาน hub)
  const [presetDept,setPresetDept] = useState(null)   // ตั้งกรองหน่วยงานเมื่อคลิกจากการ์ด dashboard
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

  async function reloadSkills(){
    try{ const [s,u,a] = await Promise.all([fetchStaging(), fetchUpdates(), fetchActivity()]); setStaging(s); setUpdates(u); setActivity(a) }
    catch(e){ console.warn('skills reload error',e) }
  }
  async function loadTracker(){ try{ const [r,s]=await Promise.all([fetchTracker(),fetchTrackerSubstatuses()]); setTrackerRows(r); setTrackerSubs(s) }catch(e){ console.warn('tracker reload',e) } }
  async function loadReports(){ try{ setReports(await fetchReports()) }catch(e){ console.warn('reports reload',e) } }
  async function loadWorkflow(){ try{ const [f,p]=await Promise.all([fetchAssessmentFlow(),fetchImprovementPlans()]); setFlow(f); setPlans(p) }catch(e){ console.warn('workflow reload',e) } }
  async function loadCurMonth(){ try{ setCurMonthRows(await fetchComplianceMonths(new Date().getFullYear())) }catch(e){ console.warn('cur month reload',e) } }
  // P10: staging/assessment merged into Process Tracker, reports merged into สื่อสาร&รายงาน.
  // goView() remaps legacy view ids to the new hub view + sub-tab so every old
  // navigation call (deep links, notifications, dashboard cards) still lands right.
  function goView(v){
    if(v==='staging'){ setTrackerTab('screen'); setView('tracker'); return }
    if(v==='assessment'){ setTrackerTab('assess'); setView('tracker'); return }
    if(v==='reports'){ setCommTab('reports'); setView('comm'); return }
    setView(v)
  }

  useEffect(()=>{ if(!authed) return; (async()=>{
    if(!hasSupabase){ setErr('ยังไม่ได้ตั้งค่า Supabase (.env) — กำลังแสดงหน้าเปล่า'); setLoading(false); return }
    try{
      const [d, mData, s, u, a, qs, rp, st, dep, fl, pl] = await Promise.all([fetchAll(), fetchComplianceMonths(new Date().getFullYear()), fetchStaging(), fetchUpdates(), fetchActivity(), fetchQuarterStats(), fetchReports(), fetchSettings(), fetchDepartments(), fetchAssessmentFlow(), fetchImprovementPlans()])
      setCats(withCatColors(d.cats)); setLaws(d.laws); setComms(d.comms); setNotifs(d.notifs)
      setMonths(mData); setCurMonthRows(mData); setStaging(s); setUpdates(u); setActivity(a); setQuarterStats(qs); setReports(rp); setSettings(st)
      setDepartments(dep); setFlow(fl); setPlans(pl)
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
  // P8: batch ที่ยังไม่ผ่านการตรวจทาน AI (verify_status ≠ passed) — คอลัมน์แรกของบอร์ด
  const reviewPending = useMemo(()=>stagingBatches.filter(([k,rows])=>(rows[0]?.verify_status||'pending')!=='passed'),[stagingBatches])
  // ── สายงานประเมิน: แผนที่หน่วยงาน + งานประเมินที่มอบหมายแล้ว + สรุปงานค้าง ──
  const deptMap     = useMemo(()=>Object.fromEntries(departments.map(d=>[d.id,d.name])),[departments])
  const lawMap      = useMemo(()=>Object.fromEntries(laws.map(l=>[l.id,l])),[laws])
  const assignedFlow= useMemo(()=>flow.filter(f=>f.assigned_dept_id && !f.finalized_at),[flow])
  const openPlans   = useMemo(()=>plans.filter(p=>planEffectiveStatus(p)!=='done'),[plans])
  const overduePlans= useMemo(()=>plans.filter(p=>planEffectiveStatus(p)==='overdue'),[plans])
  const pendingAssess = useMemo(()=>assignedFlow.filter(f=>f.assess_status!=='done'),[assignedFlow])
  // งานค้างตามหน่วยงาน (item 5): { deptId, name, waiting, ncOpen, planOverdue }
  const deptWorkload = useMemo(()=>{
    const m={}
    const ensure=id=>{ if(!m[id]) m[id]={ deptId:id, name:deptMap[id]||('หน่วยงาน #'+id), waiting:0, ncOpen:0, planOverdue:0 }; return m[id] }
    pendingAssess.forEach(f=>{ ensure(f.assigned_dept_id).waiting++ })
    // NC ค้าง = ข้อกำหนด unmet ในกฎหมายที่หน่วยงานถูกมอบหมาย (นับต่อหน่วยงานที่รับผิดชอบข้อนั้น หรือหน่วยงานที่ถูก assign)
    assignedFlow.forEach(f=>{ const law=lawMap[f.law_id]; if(!law) return
      const nc=law.reqs.filter(r=>r.status==='unmet').length
      if(nc) ensure(f.assigned_dept_id).ncOpen += nc })
    overduePlans.forEach(p=>{ if(p.owner_dept_id) ensure(p.owner_dept_id).planOverdue++ })
    return Object.values(m).sort((a,b)=>(b.waiting+b.ncOpen+b.planOverdue)-(a.waiting+a.ncOpen+a.planOverdue))
  },[pendingAssess,assignedFlow,overduePlans,lawMap,deptMap])
  const suggest     = useMemo(()=>suggestionLists(laws),[laws])
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
      // อนุมัติเข้าทะเบียนแล้ว → เริ่มติดตามที่ขั้น 3 (ประเมินความสอดคล้อง) ข้ามถ้ามี case อยู่แล้ว
      if(law?.id && !trackerRows.some(r=>r.law_id===law.id)){
        try{ await createTrackerCase({ law_id: law.id, startStage: 3, startSubstatus: 'pending_assign' }); await loadTracker() }
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

  // ── P8 · ตรวจทานผลสรุป AI (ผู้ตรวจสอบ) ก่อนเข้าสายงานคัดกรอง ─────────────────
  async function handleVerify(ids, opts){
    try{ await verifyStagingBatch(ids, opts); await reloadSkills(); fetchActivity().then(setActivity)
      toast(opts.passed?'ผ่านการตรวจทาน → ไปคอลัมน์รอคัดกรอง':'ตีกลับให้ผู้ค้นหาแล้ว','success') }
    catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message) }
  }
  async function handleSaveStagingEdits(ids, lawFields, reqRows){
    try{ await saveStagingEdits(ids, lawFields, reqRows); await reloadSkills(); fetchActivity().then(setActivity)
      toast('บันทึกการแก้ไขผลสรุป AI แล้ว','success') }
    catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message); throw e }
  }

  // ── สายงานประเมิน (migration 018) ──────────────────────────────────────────
  // ขั้น 1 · คัดกรอง batch (เกี่ยวข้อง / ไม่เกี่ยวข้อง)
  async function handleScreen(batch, relevant, note){
    try{ await screenBatch(batch,{relevant,note}); await loadWorkflow(); fetchActivity().then(setActivity)
      toast(relevant?'คัดกรองแล้ว: เกี่ยวข้อง → รอมอบหมาย':'บันทึกแล้ว: ไม่เกี่ยวข้อง (เก็บไว้ดูย้อนหลัง)','success') }
    catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message) }
  }
  // ขั้น 2 · มอบหมายให้หน่วยงาน (แตกงานย่อยต่อหน่วยงาน) → ขึ้นทะเบียนจริง
  async function handleAssign(batch, rows, depts, dueDate, by){
    try{
      const law = await assignBatch(batch, rows, depts, {dueDate, by})
      const d=await fetchAll(); setLaws(d.laws); await reloadSkills(); await loadWorkflow(); fetchQuarterStats().then(setQuarterStats)
      if(law?.id && !trackerRows.some(r=>r.law_id===law.id)){
        try{ await createTrackerCase({ law_id: law.id, startStage: 3, startSubstatus: 'pending_assign' }); await loadTracker() }catch{}
      }
      toast(`ส่งประเมินให้ ${depts.length} หน่วยงานแล้ว`,'success')
    }catch(e){ toast('ส่งประเมินไม่สำเร็จ: '+e.message) }
  }
  // ขั้น 3 · ประเมินรายข้อกำหนด C / NC
  async function handleAssess(req, law, status, assessorName){
    try{
      await assessRequirement(req, law, status, assessorName)
      const d=await fetchAll(); setLaws(d.laws); fetchActivity().then(setActivity)
    }catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message) }
  }
  async function handleFlowStatus(flowId, status, assessorName){
    try{ await setFlowAssessStatus(flowId, status, assessorName); await loadWorkflow() }
    catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message) }
  }
  // ขั้น 4 · แผนปรับปรุง
  async function handleCreatePlan(payload){
    try{ await createImprovementPlan(payload); await loadWorkflow(); fetchActivity().then(setActivity) }
    catch(e){ toast('สร้างแผนไม่สำเร็จ: '+e.message); throw e }
  }
  async function handleUpdatePlan(id, patch){
    try{ await updateImprovementPlan(id, patch); await loadWorkflow() }
    catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message) }
  }
  async function handleClosePlan(plan, evidence){
    try{
      await closeImprovementPlan(plan,{evidence})
      const d=await fetchAll(); setLaws(d.laws); await loadWorkflow(); fetchActivity().then(setActivity)
      toast('ปิดแผนแล้ว — ข้อกำหนดพลิกเป็นสอดคล้อง (C)','success')
    }catch(e){ toast('ปิดแผนไม่สำเร็จ: '+e.message) }
  }
  // ขั้นสุดท้าย · ยืนยันเข้าทะเบียนสมบูรณ์
  async function handleFinalize(lawId, lawCode){
    try{ await finalizeAssessment(lawId, lawCode); await loadWorkflow(); fetchActivity().then(setActivity)
      toast('ยืนยันเข้าทะเบียนสมบูรณ์แล้ว','success') }
    catch(e){ toast('ไม่สำเร็จ: '+e.message) }
  }

  const inForceLaws = useMemo(()=>activeLaws.filter(l=>l.active!==false),[activeLaws])
  const stats = useMemo(()=>{
    let req=0,met=0; inForceLaws.forEach(l=>l.reqs.forEach(r=>{req++;if(r.status==='met')met++}))
    return { total:inForceLaws.length, req, met, nc:req-met, pct:req?Math.round(met/req*100):100 }
  },[inForceLaws])

  // ปี พ.ศ. ที่ให้เลือกในตัวเลือกรอบประเมิน (จาก quarterStats + วันที่สร้างกฎหมาย + ปีปัจจุบัน)
  const roundYears = useMemo(()=>{
    const ys=new Set(quarterStats.map(q=>q.year+543))
    laws.forEach(l=>{ if(l.created_at){ const y=new Date(l.created_at).getFullYear(); if(!isNaN(y)) ys.add(y+543) } })
    ys.add(new Date().getFullYear()+543)
    return [...ys].sort((a,b)=>b-a)
  },[quarterStats,laws])

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
    newUpdates.slice(0,15).forEach(u=>out.push({type:'law_update',goView:'updates',text:'กฎหมายใหม่: '+u.title.slice(0,55),sub:'จาก ShawPat'+(u.published_date?' · '+u.published_date:'')}))
    // จป.ว: เตือนล่วงหน้า 14 วันก่อนเส้นตายรายงาน 2 ครั้ง/ปี (กฎกระทรวง 2565 ข้อ 47)
    jorporReportDeadlines().forEach(d=>{ if(d.days>=0 && d.days<=14) out.push({type:'report_jorpor',goView:'reports',days:d.days,text:d.label,sub:'ครบกำหนดใน '+d.days+' วัน — '+thDate(d.due.toISOString())}) })
    // กฎหมายประกาศแล้วแต่ยังไม่บังคับใช้: เตือนล่วงหน้า 30 วัน
    activeLaws.forEach(l=>{ const e=effectiveInfo(l); if(e && e.days<=30) out.push({type:'effective_soon',law:l,days:e.days,text:l.code+' จะบังคับใช้ใน '+e.days+' วัน',sub:l.name.slice(0,60)}) })
    // อบรม จป. 12 ชม./ปี: เตือนเมื่อเหลือ <90 วันแล้วยังไม่ครบ
    { const ts=trainingStatus(training); if(ts.alert) out.push({type:'training',goView:'settings',text:'อบรมพัฒนาความรู้ จป. ยังไม่ครบ '+ts.target+' ชม.',sub:'ทำได้ '+ts.hours+' ชม. · เหลืออีก '+ts.remain+' ชม. · เหลือเวลา '+ts.daysLeft+' วัน'}) }
    // สายงานประเมิน (item 6) — assign_new / assess_overdue / plan_due
    assignedFlow.forEach(f=>{
      const dept=deptMap[f.assigned_dept_id]||'หน่วยงาน'
      if(f.assess_status!=='done'){
        if(f.assess_due_date){ const d=daysTo(f.assess_due_date)
          if(d<0) out.push({type:'bad',goView:'assessment',text:'งานประเมินเกินกำหนด: '+(f.law_code||''),sub:dept+' · เกิน '+Math.abs(d)+' วัน — '+thDate(f.assess_due_date)})
          else if(d<=7) out.push({type:'assess_due',goView:'assessment',days:d,text:'ใกล้ครบกำหนดประเมิน: '+(f.law_code||''),sub:dept+' · อีก '+d+' วัน — '+thDate(f.assess_due_date)}) }
        else out.push({type:'assign_new',goView:'assessment',text:'งานมอบหมายใหม่: '+(f.law_code||''),sub:'ส่งให้ '+dept+' ประเมิน'})
      }
    })
    openPlans.forEach(p=>{ if(!p.due_date) return; const d=daysTo(p.due_date); const dept=p.owner_dept_id?(deptMap[p.owner_dept_id]||''):''
      if(d<0) out.push({type:'bad',goView:'plans',text:'แผนปรับปรุงเลยกำหนด',sub:(dept?dept+' · ':'')+(p.plan_text||'').slice(0,50)+' — เกิน '+Math.abs(d)+' วัน'})
      else if(d<=7) out.push({type:'plan_due',goView:'plans',days:d,text:'แผนปรับปรุงใกล้ครบกำหนด',sub:(dept?dept+' · ':'')+(p.plan_text||'').slice(0,50)+' — อีก '+d+' วัน'}) })
    // P8: รอตรวจทาน AI (agent/AI สร้างรายการใหม่ → ผู้ตรวจสอบต้องตรวจก่อน)
    reviewPending.forEach(([key,rows])=>{ const f=rows[0]
      out.push({type:'verify_pending',goView:'staging',text:'รอตรวจทาน AI: '+((f.law_name||f.law_code||'')).slice(0,50),
        sub:(f.verify_status==='failed'?'ถูกตีกลับ — ให้แก้แล้วส่งใหม่':'ผลสรุป AI รอผู้ตรวจสอบตรวจทาน')}) })
    return out.sort((a,b)=>(a.type==='bad'?-1:0)-(b.type==='bad'?-1:0))
  },[activeLaws,comms,notifs,newUpdates,reports,training,assignedFlow,openPlans,deptMap,reviewPending])

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

  // toggle เดือนของ "ปีปัจจุบัน" จากการ์ดบน Dashboard (อัปเดต curMonthRows)
  async function handleToggleMonthCur(month){
    const y=new Date().getFullYear()
    const rec=curMonthRows.find(m=>m.year===y && m.month===month)
    const next = rec ? !rec.checked : true
    try{ await toggleMonthCheck(y, month, next); await loadCurMonth() }
    catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message) }
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
      // P9: new-law discovery now flows through the AI/updates → staging pipeline,
      // which auto-creates a Process Tracker case (stage 1) once a law is identified.
      setView('updates')
      toast('บันทึกแล้ว: เดือนนี้มีกฎหมายใหม่ — ไปเฝ้าระวัง/ค้นหากฎหมายใหม่','success')
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
    <div className={'app'+(navOpen?'':' nav-collapsed')+(role==='viewer'?' role-viewer':'')}>
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
                n.id==='tracker'       ? ((stagingBatches.length+pendingAssess.length)||null) :
                n.id==='comm'          ? (reportAlerts||null)     :
                n.id==='plans'         ? (openPlans.length||null)     :
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
          {view==='dashboard'     && <Dashboard     laws={laws} cats={cats} catMap={catMap} onOpen={setOpenLaw} updates={updates} staging={stagingBatches} activity={activity} quarterStats={quarterStats} reports={reports} onGoReports={()=>goView('reports')} onGoView={goView} trackerRows={trackerRows} trackerSubs={trackerSubs} onGoTracker={()=>setView('tracker')}
            deptWorkload={deptWorkload} onGoDept={(v,dept)=>{ setPresetDept(dept||null); goView(v) }}
            reviewPending={reviewPending.length}
            monthsData={months}/>}
          {view==='registry'      && <RegistryCompliance
            regLaws={activeLaws} cats={cats} catMap={catMap} stats={stats}
            search={searchDebounced} onOpen={setOpenLaw} onCreate={handleCreateLaw} onBulk={handleBulkCompliance} allLaws={laws}
            round={round} onExportF259={()=>setShowPdf(true)}
            monthsData={months} monthYear={monthYear} setMonthYear={setMonthYear} onToggleMonth={handleToggleMonth}
            onMarkNoNewLaws={handleMonthNoNewLaws} onMarkHasNewLaws={handleMonthHasNewLaws}/>}
          {view==='improvements'  && <Improvements  laws={inForceLaws} catMap={catMap} onOpen={setOpenLaw}/>}
          {view==='repealed'      && <Repealed      laws={repealedLaws} catMap={catMap} search={searchDebounced} onOpen={setOpenLaw} onRestore={handleRestore}/>}
          {view==='comm'          && (<div className="view">
            <div className="seg" style={{marginBottom:14}}>
              <button className={'seg-btn'+(commTab==='comm'?' active':'')} onClick={()=>setCommTab('comm')}>ตารางการสื่อสาร</button>
              <button className={'seg-btn'+(commTab==='reports'?' active':'')} onClick={()=>setCommTab('reports')}>ส่งรายงานราชการ</button>
            </div>
            {commTab==='comm'    && <Communication comms={comms} onMarkSent={handleMarkSent} onScheduleUpdate={handleCommScheduleUpdate}/>}
            {commTab==='reports' && <Reports reports={reports} onSetEvent={handleReportSetEvent} onSubmit={handleReportSubmit}/>}
          </div>)}
          {view==='tracker'       && (<div className="view">
            <div className="seg" style={{marginBottom:14}}>
              <button className={'seg-btn'+(trackerTab==='track'?' active':'')} onClick={()=>setTrackerTab('track')}>ติดตาม (5 ขั้น)</button>
              <button className={'seg-btn'+(trackerTab==='screen'?' active':'')} onClick={()=>setTrackerTab('screen')}>คัดกรอง & อนุมัติ</button>
              <button className={'seg-btn'+(trackerTab==='assess'?' active':'')} onClick={()=>setTrackerTab('assess')}>ประเมินความสอดคล้อง</button>
            </div>
            {trackerTab==='track'  && <UnifiedTracker rows={trackerRows} subs={trackerSubs} laws={activeLaws} suggest={suggest} catMap={catMap} onReload={loadTracker}/>}
            {trackerTab==='screen' && <Staging batches={stagingBatches} flow={flow} laws={laws} plans={plans} departments={departments} cats={cats} catMap={catMap} deptMap={deptMap}
              onScreen={handleScreen} onAssign={handleAssign} onFinalize={handleFinalize} onDrop={handleDropStaged} onGoAssess={()=>setTrackerTab('assess')}
              onVerify={handleVerify} onSaveEdits={handleSaveStagingEdits}/>}
            {trackerTab==='assess' && <Assessment flow={assignedFlow} laws={laws} departments={departments} catMap={catMap} deptMap={deptMap} plans={plans}
              presetDept={presetDept} onAssess={handleAssess} onFlowStatus={handleFlowStatus} onCreatePlan={handleCreatePlan} onOpen={setOpenLaw}/>}
          </div>)}
          {view==='analysis'      && <Analysis      laws={inForceLaws} cats={cats} catMap={catMap} allLaws={laws} onAnalyzed={reloadSkills} goView={goView} onCreateFull={handleCreateFull} suggest={suggest}/>}
          {view==='plans'         && <Plans         plans={plans} departments={departments} deptMap={deptMap} laws={laws} lawMap={lawMap}
            presetDept={presetDept} onUpdatePlan={handleUpdatePlan} onClosePlan={handleClosePlan} onCreatePlan={handleCreatePlan} onOpen={setOpenLaw}/>}
          {view==='updates'       && <Updates       updates={updates} onMark={handleMarkUpdate} onScanned={reloadSkills}/>}
          {view==='notifications' && <NotificationsPage notifs={bellNotifications} onOpenLaw={setOpenLaw} onGoToView={goView}/>}
          {view==='settings'      && (can(role,'delete')
            ? <SettingsPage settings={settings} onSave={async patch=>{ await saveSettings(patch); setSettings(s=>({...s,...patch})); toast('บันทึกการตั้งค่าแล้ว','success') }} training={training} setTraining={setTraining}/>
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

