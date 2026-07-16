// P10 · Process Tracker รายกฎหมาย (lg_law_workflow) — Workflow A + B ใช้ UI ร่วมกัน.
// แต่ละ case = 1 แถว lg_law_workflow, มี tracker 3 ขั้น: ผู้ตรวจสอบ → ผู้ประเมิน → เสร็จสิ้น.
import { useState, useMemo } from 'react'
import { WF_STAGES, WF_STATUS } from '../lib/supabase.js'
import AssessForm from '../components/AssessForm.jsx'
import Attachments from '../components/Attachments.jsx'
import { I } from '../components/icons.jsx'
import { Tag, thDate } from '../lib/ui.jsx'
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

/* Workflow B · Process 1 — เริ่มรายการติดตาม/ทวนสอบกฎหมายเดิม */
function MonitorModal({ laws, catMap, suggest, onStart, onClose }) {
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
  const valid = owner.trim() && law && issue.trim()
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
function CaseDrawer({ wf, law, catMap, suggest, onAssess, onClosePlan, onOpenLaw, onClose }) {
  const { can } = useAuth()
  const [closing, setClosing] = useState(false)
  const showAssess = wf.stage === 2 && wf.status === 'รอประเมิน'
  const showClosePlan = wf.status === 'ไม่สอดคล้อง' && !!wf.improvement_plan
  async function doClose(){ if(closing) return; setClosing(true); try{ await onClosePlan(wf, law) }finally{ setClosing(false) } }
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
      </div>
    </div>
  </>)
}

export default function ProcessTracker({ rows = [], laws = [], catMap = {}, suggest = {}, onStartMonitor, onAssess, onClosePlan, onOpenLaw }) {
  const { can } = useAuth()
  const [showMonitor, setShowMonitor] = useState(false)
  const [openWf, setOpenWf] = useState(null)
  const [catFilter, setCatFilter] = useState('all')
  const [q, setQ] = useState('')

  const lawMap = useMemo(()=>Object.fromEntries(laws.map(l=>[l.id,l])),[laws])
  const cases = useMemo(()=>{
    const s=q.trim().toLowerCase()
    return rows.filter(wf=>{
      const law=lawMap[wf.law_id]; if(!law) return false
      if(catFilter!=='all' && law.cat!==catFilter) return false
      if(s && !(law.code.toLowerCase().includes(s)||(law.name||'').toLowerCase().includes(s))) return false
      return true
    })
  },[rows,lawMap,catFilter,q])
  const cats = useMemo(()=>[...new Set(rows.map(wf=>lawMap[wf.law_id]?.cat).filter(Boolean))].sort(),[rows,lawMap])

  const openLawObj = openWf ? lawMap[openWf.law_id] : null

  return (
    <div className="view">
      <div className="filterbar" style={{alignItems:'center'}}>
        <input className="form-input" style={{maxWidth:240,margin:0}} placeholder="ค้นหารหัส/ชื่อกฎหมาย…" value={q} onChange={e=>setQ(e.target.value)}/>
        <span className={'chip'+(catFilter==='all'?' active':'')} onClick={()=>setCatFilter('all')}>ทุกหมวด</span>
        {cats.map(c=><span key={c} className={'chip'+(catFilter===c?' active':'')} onClick={()=>setCatFilter(c)}>{c}</span>)}
        <button className="btn btn-primary" style={{marginLeft:'auto'}} disabled={!can('edit')} title={can('edit')?'':NO_PERM} onClick={()=>setShowMonitor(true)}>
          <I n="plus"/>ติดตาม/ทวนสอบกฎหมายเดิม
        </button>
      </div>

      {cases.length===0 && (
        <div className="panel"><div style={{textAlign:'center',color:'var(--ink-faint)',padding:44,fontSize:13}}>
          ยังไม่มีรายการติดตาม — เพิ่มกฎหมายใหม่จากหน้า “ทะเบียน” หรือกด “ติดตาม/ทวนสอบกฎหมายเดิม”
        </div></div>
      )}

      <div style={{display:'flex',flexDirection:'column',gap:12}}>
        {cases.map(wf=>{ const law=lawMap[wf.law_id]
          return (
            <div key={wf.id} className="panel" style={{padding:'12px 16px',cursor:'pointer'}} onClick={()=>setOpenWf(wf)}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:2}}>
                <Tag c={law.cat} color={catMap[law.cat]?.color}/>
                <span className="law-code">{law.code}</span>
                <span className="meta-chip" style={{fontSize:11}}>{wf.workflow_type==='add'?'เพิ่มใหม่':'ติดตาม'}</span>
                <span style={{flex:1,fontSize:13}}>{(law.name||'').slice(0,70)}</span>
                <StatusBadge status={wf.status}/>
              </div>
              <WFStepper wf={wf}/>
            </div>
          )
        })}
      </div>

      {showMonitor && <MonitorModal laws={laws} catMap={catMap} suggest={suggest} onStart={onStartMonitor} onClose={()=>setShowMonitor(false)}/>}
      {openWf && <CaseDrawer wf={openWf} law={openLawObj} catMap={catMap} suggest={suggest}
        onAssess={async(...a)=>{ await onAssess(...a); setOpenWf(null) }}
        onClosePlan={async(...a)=>{ await onClosePlan(...a); setOpenWf(null) }}
        onOpenLaw={onOpenLaw} onClose={()=>setOpenWf(null)}/>}
    </div>
  )
}
