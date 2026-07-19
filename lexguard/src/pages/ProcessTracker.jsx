// Process Tracker รายกฎหมาย (lg_law_workflow) — tracker เดียวของระบบ (source of truth).
// แต่ละ case = 1 แถว lg_law_workflow, มี tracker 3 ขั้น: ผู้ตรวจสอบ → ผู้ประเมิน → เสร็จสิ้น.
// P10 วางฐาน 2-workflow (เพิ่มใหม่ / ติดตาม-ทวนสอบ); P11 เพิ่ม metric chips + aging +
// overdue + รอบที่ N + timeline. tracker เก่า (lg_process_tracker/items) เลิกใช้แล้ว.
import { useState, useMemo, useEffect } from 'react'
import { WF_STAGES, WF_STATUS, fetchActivityByLaw, syncReverifyOverdueNotifications } from '../lib/supabase.js'
import AssessForm from '../components/AssessForm.jsx'
import Attachments from '../components/Attachments.jsx'
import { I } from '../components/icons.jsx'
import { Tag, thDate, TH_MONTHS, usePageFilters } from '../lib/ui.jsx'
import { useAuth, NO_PERM } from '../lib/auth.js'

/* 3-step stepper */
function WFStepper({ wf }) {
  // ขั้นที่ทำเสร็จ: owner เสร็จเสมอ (มี owner_at); assess เสร็จเมื่อ assessed_at; done เมื่อ status=เสร็จสิ้น
  const doneOwner = !!wf.owner_at
  const doneAssess = !!wf.assessed_at
  const doneAll = wf.status === 'เสร็จสิ้น'
  const state = [doneOwner, doneAssess, doneAll]
  const current = wf.stage   // 1..3
  return (
    <div className="wf-stepper" style={{display:'flex',alignItems:'center',gap:0,margin:'6px 0'}}>
      {WF_STAGES.map((s,i)=>{
        const done = state[i]
        const active = current===s.n && !done
        const col = done ? 'var(--ok)' : active ? 'var(--brand)' : 'var(--line)'
        return (
          <div key={s.n} style={{display:'flex',alignItems:'center',flex:i<2?1:'0 0 auto'}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,minWidth:70}}>
              <span style={{width:26,height:26,borderRadius:'50%',display:'grid',placeItems:'center',fontSize:12,fontWeight:700,
                background:done?'var(--ok)':active?'var(--brand)':'var(--grayfill)',color:(done||active)?'#fff':'var(--ink-faint)'}}>
                {done?'✓':s.n}</span>
              <span style={{fontSize:11,color:active?'var(--brand)':'var(--ink-soft)',fontWeight:active?600:400,whiteSpace:'nowrap'}}>{s.title}</span>
            </div>
            {i<2 && <div style={{flex:1,height:2,background:state[i]?'var(--ok)':'var(--line)',margin:'0 2px',alignSelf:'flex-start',marginTop:12}}/>}
          </div>
        )
      })}
    </div>
  )
}

function StatusBadge({ status }) {
  const cls = WF_STATUS[status]?.cls || 'p-warn'
  return <span className={'pill '+cls} style={{fontSize:11.5}}>{status}</span>
}

/* ── A2/A3 · aging + overdue helpers ─────────────────────────────────────── */
const startOfToday = () => new Date(new Date().toDateString())
// จำนวนวันเต็มนับจาก dateStr ถึงวันนี้ (null ถ้าไม่มีวันที่)
function daysSince(dateStr){
  if(!dateStr) return null
  const d = new Date(dateStr); if(isNaN(d)) return null
  return Math.floor((Date.now() - d.getTime()) / 86400000)
}
// เวลาที่ case "เข้าขั้นปัจจุบัน" — ใช้คำนวณ aging
function stageEnteredAt(wf){
  if(wf.status === 'ไม่สอดคล้อง') return wf.assessed_at || wf.owner_at || wf.created_at   // รอปิดแผน
  if(wf.stage === 1)             return wf.created_at                                     // รอผู้ตรวจสอบ
  return wf.owner_at || wf.created_at                                                     // stage 2: รอประเมิน
}
const agingDays = wf => daysSince(stageEnteredAt(wf))
// case ปิดไปแล้วแต่ถึงรอบทวนสอบใหม่ และไม่มี case รอบใหม่ของกฎหมายเดียวกันที่ยังเปิดอยู่
function isOverdue(wf, openLawIds){
  if(wf.status !== 'เสร็จสิ้น' || !wf.reverify_date) return false
  if(new Date(wf.reverify_date) >= startOfToday()) return false
  if(openLawIds && openLawIds.has(wf.law_id)) return false
  return true
}
const agingColor = d => d==null ? 'var(--ink-faint)' : d>=14 ? 'var(--bad)' : d>=7 ? 'var(--warn)' : 'var(--ink-soft)'

/* A1 · การ์ดสรุป (metric card) */
function MetricCard({ label, count, color, active, onClick }) {
  return (
    <div className="panel" onClick={onClick} style={{
      flex:1, minWidth:130, padding:'12px 16px', cursor:'pointer',
      border:active?`1.5px solid ${color}`:'1px solid var(--line)',
      background:active?'var(--brand-tint)':undefined }}>
      <div style={{fontSize:24,fontWeight:700,color,lineHeight:1.1}}>{count}</div>
      <div style={{fontSize:12,color:'var(--ink-soft)',marginTop:2}}>{label}</div>
    </div>
  )
}

/* Workflow B · Process 1 — เริ่มรายการติดตาม/ทวนสอบกฎหมายเดิม */
function MonitorModal({ laws, catMap, suggest, openCaseByLaw = {}, onStart, onClose }) {
  const { can } = useAuth()
  const [owner, setOwner] = useState('')
  const [q, setQ] = useState('')
  const [law, setLaw] = useState(null)
  const [issue, setIssue] = useState('')
  const [saving, setSaving] = useState(false)
  const results = useMemo(()=>{
    const s=q.trim().toLowerCase(); if(!s) return []
    return laws.filter(l=>l.code.toLowerCase().includes(s)||(l.name||'').toLowerCase().includes(s)).slice(0,12)
  },[q,laws])
  const nowLabel = new Date().toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'})
  const openRound = law ? openCaseByLaw[law.id] : null   // B2 · กันสร้างซ้ำ
  const valid = owner.trim() && law && issue.trim() && !openRound
  async function start(){ if(!valid||saving) return; setSaving(true)
    try{ await onStart({ law, ownerName:owner.trim(), followIssue:issue.trim() }); onClose() }
    finally{ setSaving(false) } }
  return (<>
    <div className="scrim" style={{zIndex:300}} onClick={onClose}/>
    <div className="modal" style={{zIndex:301,width:560}}>
      <div className="modal-head"><h3>ติดตาม / ทวนสอบกฎหมายเดิม · ผู้ตรวจสอบ</h3><button className="close" onClick={onClose}><I n="x"/></button></div>
      <div className="modal-body">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div>
            <label className="form-label">ผู้ตรวจ <span style={{color:'var(--bad)'}}>*</span></label>
            <input className="form-input" list="mon-owner" placeholder="เลือกหรือพิมพ์ชื่อ…" value={owner} onChange={e=>setOwner(e.target.value)}/>
            <datalist id="mon-owner">{(suggest.responsibles||[]).map((r,i)=><option key={i} value={r}/>)}</datalist>
          </div>
          <div><label className="form-label">วันที่</label><input className="form-input" value={nowLabel} readOnly disabled/></div>
        </div>
        <label className="form-label" style={{marginTop:10}}>เลือกกฎหมายจากทะเบียน <span style={{color:'var(--bad)'}}>*</span></label>
        {law
          ? <div style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',border:'1px solid var(--brand)',borderRadius:8,background:'var(--brand-tint)'}}>
              <Tag c={law.cat} color={catMap[law.cat]?.color}/><span className="law-code">{law.code}</span>
              <span style={{flex:1,fontSize:13}}>{(law.name||'').slice(0,60)}</span>
              <button className="btn btn-ghost" style={{padding:'3px 9px',fontSize:11}} onClick={()=>setLaw(null)}>เปลี่ยน</button>
            </div>
          : <>
            <input className="form-input" placeholder="ค้นหารหัส/ชื่อกฎหมาย…" value={q} onChange={e=>setQ(e.target.value)}/>
            {results.map(l=>(
              <div key={l.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 12px',borderBottom:'1px solid var(--line-soft)',cursor:'pointer'}} onClick={()=>{setLaw(l);setQ('')}}>
                <Tag c={l.cat} color={catMap[l.cat]?.color}/><span className="law-code">{l.code}</span>
                <span style={{flex:1,fontSize:12.5}}>{(l.name||'').slice(0,60)}</span>
              </div>
            ))}
          </>}
        {openRound && (
          <div style={{marginTop:10,padding:'9px 12px',border:'1px solid var(--bad)',borderRadius:8,
            background:'var(--bad-tint,rgba(220,38,38,.08))',color:'var(--bad)',fontSize:12.5}}>
            กฎหมายนี้มีรายการติดตามที่ยังไม่ปิด (รอบที่ {openRound}) — ปิดรายการเดิมก่อนจึงเปิดรอบใหม่ได้
          </div>
        )}
        <label className="form-label" style={{marginTop:12}}>ประเด็นที่ต้องติดตาม <span style={{color:'var(--bad)'}}>*</span></label>
        <textarea className="form-input" rows={3} placeholder="เช่น กฎหมายมีการแก้ไข / ต้องทวนสอบความสอดคล้องรอบใหม่…" value={issue} onChange={e=>setIssue(e.target.value)}/>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-primary" disabled={!valid||saving||!can('edit')} title={can('edit')?'':NO_PERM} onClick={start}>{saving?'กำลังบันทึก…':'บันทึก (รอประเมิน)'}</button>
      </div>
    </div>
  </>)
}

/* Case detail drawer — Process 2 (assess) / Process 3 (close plan) */
function CaseDrawer({ wf, law, catMap, suggest, allCases = [], onOpenRound, onAssess, onClosePlan, onOpenLaw, onClose }) {
  const { can } = useAuth()
  const [closing, setClosing] = useState(false)
  const [timeline, setTimeline] = useState(null)   // null = กำลังโหลด
  const showAssess = wf.stage === 2 && wf.status === 'รอประเมิน'
  const showClosePlan = wf.status === 'ไม่สอดคล้อง' && !!wf.improvement_plan
  async function doClose(){ if(closing) return; setClosing(true); try{ await onClosePlan(wf, law) }finally{ setClosing(false) } }

  // B3 · รอบก่อนหน้าของกฎหมายเดียวกัน (ใหม่→เก่า, ไม่รวม case ปัจจุบัน)
  const prevRounds = useMemo(()=>allCases
    .filter(c=>c.law_id===wf.law_id && c.id!==wf.id)
    .sort((a,b)=>(b.round||1)-(a.round||1)),[allCases,wf.law_id,wf.id])

  // B3 · timeline กิจกรรม (lg_activity_log filter law_id + limit 20)
  useEffect(()=>{ let live=true
    if(!wf.law_id){ setTimeline([]); return }
    setTimeline(null)
    fetchActivityByLaw(wf.law_id, 20).then(r=>{ if(live) setTimeline(r) }).catch(()=>{ if(live) setTimeline([]) })
    return ()=>{ live=false }
  },[wf.law_id])
  return (<>
    <div className="scrim" style={{zIndex:320}} onClick={onClose}/>
    <div className="drawer" style={{zIndex:321}}>
      <div className="modal-head">
        <h3>{law?.code||'—'} · {wf.workflow_type==='add'?'เพิ่มกฎหมายใหม่':'ติดตาม/ทวนสอบ'}</h3>
        <button className="close" onClick={onClose}><I n="x"/></button>
      </div>
      <div className="modal-body" style={{overflow:'auto'}}>
        <div style={{fontSize:13,marginBottom:6}}>{law?.name}</div>
        <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
          <StatusBadge status={wf.status}/>
          {law && <button className="btn btn-ghost" style={{padding:'3px 10px',fontSize:12}} onClick={()=>{onOpenLaw(law);onClose()}}>เปิดตัวบท/ข้อกำหนด</button>}
        </div>
        <WFStepper wf={wf}/>

        <div className="panel" style={{marginTop:12,padding:'10px 14px'}}>
          <div style={{fontSize:12.5}}><b>ผู้ตรวจสอบ:</b> {wf.owner_name||'—'} · {wf.owner_at?thDate(wf.owner_at):'—'}</div>
          {wf.follow_issue && <div style={{fontSize:12.5,marginTop:4}}><b>ประเด็นที่ต้องติดตาม:</b> {wf.follow_issue}</div>}
          {wf.assessed_at && <div style={{fontSize:12.5,marginTop:4}}><b>ผู้ประเมิน:</b> {wf.assessor_name||'—'} · {thDate(wf.assessed_at)} · ผล: {wf.assess_result}</div>}
          {wf.improvement_plan && <div style={{fontSize:12.5,marginTop:4}}><b>แผนปรับปรุง:</b> {wf.improvement_plan}</div>}
          {wf.measure && <div style={{fontSize:12.5,marginTop:4}}><b>มาตรการ:</b> {wf.measure}</div>}
          {wf.reverify_date && <div style={{fontSize:12.5,marginTop:4}}><b>วันกำหนดทวนสอบ:</b> {thDate(wf.reverify_date)}</div>}
          {wf.plan_closed_at && <div style={{fontSize:12.5,marginTop:4,color:'var(--ok)'}}><b>ปิดแผนแล้ว:</b> {thDate(wf.plan_closed_at)} · {wf.plan_closed_by}</div>}
        </div>

        {law?.id && <div style={{marginTop:12}}><div className="form-label">เอกสารแนบ</div><Attachments refType="law" refId={law.id}/></div>}

        {showAssess && (
          <div style={{marginTop:16,borderTop:'1px solid var(--line)',paddingTop:14}}>
            <h4 style={{margin:'0 0 8px',fontSize:14}}>Process 2 · ผู้ประเมิน</h4>
            {can('edit')
              ? <AssessForm law={law} suggest={suggest} onSubmit={(payload)=>onAssess(wf, law, payload)}/>
              : <div style={{fontSize:12.5,color:'var(--ink-faint)'}}>{NO_PERM} — เฉพาะผู้แก้ไข</div>}
          </div>
        )}
        {showClosePlan && (
          <div style={{marginTop:16,borderTop:'1px solid var(--line)',paddingTop:14}}>
            <h4 style={{margin:'0 0 8px',fontSize:14}}>Process 3 · ปิดแผนปรับปรุง</h4>
            <p style={{fontSize:12.5,color:'var(--ink-soft)'}}>เมื่อดำเนินการตามแผนเสร็จ กดปิดแผนเพื่อบันทึกวันที่ปิดและพลิกกฎหมายเป็นสอดคล้อง</p>
            <button className="btn btn-primary" disabled={closing||!can('edit')} title={can('edit')?'':NO_PERM} onClick={doClose}>{closing?'กำลังปิด…':'ปิดแผน (บันทึกวันที่ปิด)'}</button>
          </div>
        )}

        {/* B3 · ประวัติ */}
        <div style={{marginTop:16,borderTop:'1px solid var(--line)',paddingTop:14}}>
          <h4 style={{margin:'0 0 8px',fontSize:14}}>ประวัติ</h4>

          {prevRounds.length>0 && (
            <div style={{marginBottom:12}}>
              <div className="form-label" style={{marginBottom:6}}>รอบก่อนหน้า</div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {prevRounds.map(c=>(
                  <div key={c.id} onClick={()=>onOpenRound&&onOpenRound(c)} style={{display:'flex',alignItems:'center',gap:8,
                    padding:'7px 10px',border:'1px solid var(--line)',borderRadius:8,cursor:'pointer',fontSize:12.5}}>
                    <span className="meta-chip" style={{fontSize:11}}>รอบที่ {c.round||1}</span>
                    <StatusBadge status={c.status}/>
                    {c.assess_result && <span style={{color:'var(--ink-soft)'}}>ผล: {c.assess_result}</span>}
                    <span style={{marginLeft:'auto',color:'var(--ink-faint)'}}>
                      {c.completed_at?thDate(c.completed_at):(c.assessed_at?thDate(c.assessed_at):'—')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-label" style={{marginBottom:6}}>บันทึกกิจกรรม</div>
          {timeline===null
            ? <div style={{fontSize:12.5,color:'var(--ink-faint)'}}>กำลังโหลด…</div>
            : timeline.length===0
              ? <div style={{fontSize:12.5,color:'var(--ink-faint)'}}>ยังไม่มีบันทึกกิจกรรม</div>
              : <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  {timeline.map(a=>(
                    <div key={a.id} style={{display:'flex',gap:8,fontSize:12.5}}>
                      <span style={{color:'var(--ink-faint)',whiteSpace:'nowrap'}}>{thDate(a.created_at)}</span>
                      <span style={{flex:1}}>
                        {a.actor && <b>{a.actor}</b>} <span style={{color:'var(--ink-soft)'}}>{a.detail||a.action}</span>
                      </span>
                    </div>
                  ))}
                </div>}
        </div>
      </div>
    </div>
  </>)
}

const STATUS_FILTERS = [['all','ทั้งหมด'],['open','งานค้าง'],['รอประเมิน','รอประเมิน'],['ไม่สอดคล้อง','ไม่สอดคล้อง'],['overdue','เกินกำหนดทวนสอบ'],['เสร็จสิ้น','เสร็จสิ้น']]

// A4 · ข้อความ "ค้างที่ใคร" ต่อสถานะ
function ownerMeta(wf){
  if(wf.status === 'รอประเมิน')
    return { at: wf.assessor_name || 'รอผู้ประเมิน', from: wf.owner_name }
  if(wf.status === 'ไม่สอดคล้อง')
    return { at: `${wf.owner_name||'—'} (ปิดแผน)` }
  return null   // เสร็จสิ้น จัดการแยก
}

export default function ProcessTracker({ rows = [], laws = [], catMap = {}, suggest = {}, focusSignal = 0, onStartMonitor, onAssess, onClosePlan, onOpenLaw }) {
  const { can } = useAuth()
  const [showMonitor, setShowMonitor] = useState(false)
  const [openWf, setOpenWf] = useState(null)
  const [q, setQ] = useState('')
  // Task 6.1 · จำ filter ต่อหน้า (lg_filters.tracker)
  const [f, setF, resetF, filterActive] = usePageFilters('tracker', { catFilter: 'all', statusFilter: 'all', ownerFilter: 'all', timeBase: 'created_at', period: 'all' })
  const { catFilter, statusFilter, ownerFilter, timeBase, period } = f
  const setCatFilter = v => setF('catFilter', v), setStatusFilter = v => setF('statusFilter', v), setOwnerFilter = v => setF('ownerFilter', v)
  const setTimeBase = v => setF('timeBase', v), setPeriod = v => setF('period', v)

  // Task 10: คลิก badge/เมนู Process Tracker → โฟกัส "งานค้าง"
  useEffect(()=>{ if(focusSignal>0) setStatusFilter('open') }, [focusSignal])

  // Task 4: แจ้งเตือน reverify เลยกำหนด — ทำครั้งแรกต่อ session เท่านั้น (กันซ้ำใน DB อีกชั้น)
  useEffect(()=>{
    if(!rows.length) return
    try{ if(sessionStorage.getItem('lg_reverify_synced')==='1') return }catch{}
    try{ sessionStorage.setItem('lg_reverify_synced','1') }catch{}
    syncReverifyOverdueNotifications(rows)
  },[rows.length])   // eslint-disable-line react-hooks/exhaustive-deps

  const lawMap = useMemo(()=>Object.fromEntries(laws.map(l=>[l.id,l])),[laws])
  // law_id ที่ยังมี case เปิดอยู่ (ใช้ตัดสิน overdue) — ดูจาก rows ทั้งหมด
  const openLawIds = useMemo(()=>new Set(rows.filter(wf=>wf.status!=='เสร็จสิ้น').map(wf=>wf.law_id)),[rows])

  // baseRows = ผ่าน cat + ค้นหา + ผู้รับผิดชอบ (ยังไม่กรอง status) → ใช้ทั้ง metric และ list
  // Task 4 · ตัวเลือกเดือน/ปี (พ.ศ.) จากข้อมูลจริงตามฐานเวลาที่เลือก
  const periodOptions = useMemo(()=>{
    const set=new Set()
    rows.forEach(wf=>{ const v=wf[timeBase]; if(!v) return; const d=new Date(v); if(!isNaN(d)) set.add(d.getFullYear()+'-'+d.getMonth()) })
    return [...set].sort().reverse()
  },[rows,timeBase])

  const baseRows = useMemo(()=>{
    const s=q.trim().toLowerCase()
    return rows.filter(wf=>{
      const law=lawMap[wf.law_id]; if(!law) return false
      if(catFilter!=='all' && law.cat!==catFilter) return false
      if(ownerFilter!=='all' && wf.owner_name!==ownerFilter && wf.assessor_name!==ownerFilter) return false
      if(period!=='all'){ const v=wf[timeBase]; if(!v) return false; const d=new Date(v); if(isNaN(d)) return false; if(period!==(d.getFullYear()+'-'+d.getMonth())) return false }
      if(s && !(law.code.toLowerCase().includes(s)||(law.name||'').toLowerCase().includes(s))) return false
      return true
    })
  },[rows,lawMap,catFilter,ownerFilter,q,timeBase,period])

  // A1 · ตัวเลข metric — นับจาก baseRows (ไม่สน statusFilter เพื่อให้คงที่ตอนกด)
  const metrics = useMemo(()=>({
    open:    baseRows.filter(wf=>wf.status!=='เสร็จสิ้น').length,
    waiting: baseRows.filter(wf=>wf.status==='รอประเมิน').length,
    nc:      baseRows.filter(wf=>wf.status==='ไม่สอดคล้อง').length,
    overdue: baseRows.filter(wf=>isOverdue(wf,openLawIds)).length,
  }),[baseRows,openLawIds])

  const cases = useMemo(()=>{
    const filtered = baseRows.filter(wf=>{
      if(statusFilter==='all') return true
      if(statusFilter==='open') return wf.status!=='เสร็จสิ้น'
      if(statusFilter==='overdue') return isOverdue(wf,openLawIds)
      return wf.status===statusFilter
    })
    // A2 · เรียง: overdue → งานค้าง (aging มาก→น้อย) → เสร็จสิ้น (updated_at ล่าสุดก่อน)
    const grp = wf => isOverdue(wf,openLawIds) ? 0 : wf.status!=='เสร็จสิ้น' ? 1 : 2
    return [...filtered].sort((a,b)=>{
      const ga=grp(a), gb=grp(b); if(ga!==gb) return ga-gb
      if(ga===0) return new Date(a.reverify_date)-new Date(b.reverify_date)   // เกินนานสุดก่อน
      if(ga===1) return (agingDays(b)||0)-(agingDays(a)||0)                    // ค้างนานสุดก่อน
      return new Date(b.updated_at||b.completed_at||0)-new Date(a.updated_at||a.completed_at||0)
    })
  },[baseRows,statusFilter,openLawIds])

  // B2 · law_id → รอบที่ยังเปิดอยู่ (ใช้กันสร้างซ้ำใน MonitorModal)
  const openCaseByLaw = useMemo(()=>{
    const m={}; rows.forEach(wf=>{ if(wf.status!=='เสร็จสิ้น') m[wf.law_id]=wf.round||1 }); return m
  },[rows])
  const cats = useMemo(()=>[...new Set(rows.map(wf=>lawMap[wf.law_id]?.cat).filter(Boolean))].sort(),[rows,lawMap])
  const owners = useMemo(()=>{
    const set=new Set()
    rows.forEach(wf=>{ if(wf.owner_name) set.add(wf.owner_name); if(wf.assessor_name) set.add(wf.assessor_name) })
    return [...set].sort((a,b)=>a.localeCompare(b,'th'))
  },[rows])

  const openLawObj = openWf ? lawMap[openWf.law_id] : null

  const toggleStatus = k => setStatusFilter(cur=>cur===k?'all':k)

  return (
    <div className="view">
      <div style={{display:'flex',gap:12,marginBottom:14,flexWrap:'wrap'}}>
        <MetricCard label="งานค้าง"          count={metrics.open}    color="var(--brand)" active={statusFilter==='open'}       onClick={()=>toggleStatus('open')}/>
        <MetricCard label="รอประเมิน"        count={metrics.waiting} color="var(--warn)"  active={statusFilter==='รอประเมิน'}  onClick={()=>toggleStatus('รอประเมิน')}/>
        <MetricCard label="ไม่สอดคล้อง"      count={metrics.nc}      color="var(--bad)"   active={statusFilter==='ไม่สอดคล้อง'} onClick={()=>toggleStatus('ไม่สอดคล้อง')}/>
        <MetricCard label="เกินกำหนดทวนสอบ"  count={metrics.overdue} color="var(--bad)"   active={statusFilter==='overdue'}    onClick={()=>toggleStatus('overdue')}/>
      </div>
      <div className="filterbar" style={{alignItems:'center'}}>
        <input className="form-input" style={{maxWidth:240,margin:0}} placeholder="ค้นหารหัส/ชื่อกฎหมาย…" value={q} onChange={e=>setQ(e.target.value)}/>
        <span className={'chip'+(catFilter==='all'?' active':'')} onClick={()=>setCatFilter('all')}>ทุกหมวด</span>
        {cats.map(c=><span key={c} className={'chip'+(catFilter===c?' active':'')} onClick={()=>setCatFilter(c)}>{c}</span>)}
        {owners.length>0 && (
          <select className="form-input" style={{maxWidth:190,margin:0}} value={ownerFilter} onChange={e=>setOwnerFilter(e.target.value)}>
            <option value="all">ผู้รับผิดชอบทั้งหมด</option>
            {owners.map(o=><option key={o} value={o}>{o}</option>)}
          </select>
        )}
        {/* Task 4 · กรองช่วงเวลา (ฐานเวลา + เดือน/ปี พ.ศ.) */}
        <select className="form-input" style={{maxWidth:150,margin:0}} value={timeBase} onChange={e=>{ setTimeBase(e.target.value); setPeriod('all') }} title="ฐานเวลาที่ใช้กรอง">
          <option value="created_at">ตามวันที่สร้าง</option>
          <option value="reverify_date">ตามวันทวนสอบ</option>
        </select>
        <select className="form-input" style={{maxWidth:150,margin:0}} value={period} onChange={e=>setPeriod(e.target.value)} title="เลือกเดือน/ปี">
          <option value="all">ทุกช่วงเวลา</option>
          {periodOptions.map(p=>{ const [y,m]=p.split('-'); return <option key={p} value={p}>{TH_MONTHS[+m]} {(+y)+543}</option> })}
        </select>
        <button className="btn btn-primary" style={{marginLeft:'auto'}} disabled={!can('edit')} title={can('edit')?'':NO_PERM} onClick={()=>setShowMonitor(true)}>
          <I n="plus"/>ติดตาม/ทวนสอบกฎหมายเดิม
        </button>
      </div>
      <div className="filterbar" style={{marginTop:-6}}>
        {STATUS_FILTERS.map(([k,lbl])=>(
          <span key={k} className={'chip'+(statusFilter===k?' active':'')} onClick={()=>setStatusFilter(k)}>{lbl}</span>
        ))}
        {filterActive && <span className="chip" style={{marginLeft:'auto',cursor:'pointer'}} onClick={resetF} title="ล้างตัวกรอง">✕ ล้างตัวกรอง</span>}
      </div>

      {cases.length===0 && (
        <div className="panel"><div style={{textAlign:'center',color:'var(--ink-faint)',padding:44,fontSize:13}}>
          ยังไม่มีรายการติดตาม — เพิ่มกฎหมายใหม่จากหน้า “ทะเบียน” หรือกด “ติดตาม/ทวนสอบกฎหมายเดิม”
        </div></div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {cases.map(wf=>{ const law=lawMap[wf.law_id]
          const overdue=isOverdue(wf,openLawIds)
          const done=wf.status==='เสร็จสิ้น'
          const aging=agingDays(wf)
          const meta=ownerMeta(wf)
          const overdueDays=overdue?daysSince(wf.reverify_date):null
          return (
            <div key={wf.id} className="panel" style={{padding:'12px 16px',cursor:'pointer',
              border:overdue?'1.5px solid var(--bad)':undefined}} onClick={()=>setOpenWf(wf)}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:2}}>
                <Tag c={law.cat} color={catMap[law.cat]?.color}/>
                <span className="law-code">{law.code}</span>
                <span className="meta-chip" style={{fontSize:11}}>{wf.workflow_type==='add'?'เพิ่มใหม่':(wf.round>1?`ติดตาม · รอบที่ ${wf.round}`:'ติดตาม')}</span>
                <span style={{flex:1,fontSize:13}}>{(law.name||'').slice(0,70)}</span>
                {overdue && <span className="pill p-bad" style={{fontSize:11}}>เกินกำหนด {overdueDays} วัน ({thDate(wf.reverify_date)})</span>}
                <StatusBadge status={wf.status}/>
              </div>
              <WFStepper wf={wf}/>
              <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap',fontSize:12,color:'var(--ink-soft)',marginTop:4}}>
                {!done && aging!=null && (
                  <span style={{display:'inline-flex',alignItems:'center',gap:4,color:agingColor(aging)}}>
                    <I n="clock"/>ค้างขั้นนี้ {aging} วัน
                  </span>
                )}
                {meta && <span><b>ค้างที่:</b> {meta.at}{meta.from?` · ส่งต่อโดย ${meta.from}`:''}</span>}
                {done && wf.assessor_name && <span><b>ประเมินโดย:</b> {wf.assessor_name}{wf.assessed_at?` · ${thDate(wf.assessed_at)}`:''}</span>}
                {done && wf.reverify_date && <span><b>ทวนสอบถัดไป:</b> {thDate(wf.reverify_date)}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {showMonitor && <MonitorModal laws={laws} catMap={catMap} suggest={suggest} openCaseByLaw={openCaseByLaw} onStart={onStartMonitor} onClose={()=>setShowMonitor(false)}/>}
      {openWf && <CaseDrawer wf={openWf} law={openLawObj} catMap={catMap} suggest={suggest}
        allCases={rows} onOpenRound={setOpenWf}
        onAssess={async(...a)=>{ await onAssess(...a); setOpenWf(null) }}
        onClosePlan={async(...a)=>{ await onClosePlan(...a); setOpenWf(null) }}
        onOpenLaw={onOpenLaw} onClose={()=>setOpenWf(null)}/>}
    </div>
  )
}
