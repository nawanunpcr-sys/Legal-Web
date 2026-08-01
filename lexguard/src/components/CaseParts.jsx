// Reusable workflow-case UI extracted from the old ProcessTracker (P17).
// WFStepper · StatusBadge · MonitorModal · CaseDrawer + aging helpers.
// ห้ามแก้ตรรกะการบันทึก — ย้ายมาแบบ verbatim เพื่อให้ Tasks.jsx ใช้ซ้ำ.
import { useState, useMemo, useEffect } from 'react'
import { WF_STAGES, WF_STATUS, fetchActivityByLaw } from '../lib/supabase.js'
import AssessForm from './AssessForm.jsx'
import Attachments from './Attachments.jsx'
import { I } from './icons.jsx'
import { Tag, thDate } from '../lib/ui.jsx'
import { useAuth, NO_PERM } from '../lib/auth.js'

/* 3-step stepper */
export function WFStepper({ wf }) {
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

export function StatusBadge({ status }) {
  const cls = WF_STATUS[status]?.cls || 'p-warn'
  return <span className={'pill '+cls} style={{fontSize:11.5}}>{status}</span>
}

/* ── aging + overdue helpers ─────────────────────────────────────────────── */
export const startOfToday = () => new Date(new Date().toDateString())
export function daysSince(dateStr){
  if(!dateStr) return null
  const d = new Date(dateStr); if(isNaN(d)) return null
  return Math.floor((Date.now() - d.getTime()) / 86400000)
}
function stageEnteredAt(wf){
  if(wf.status === 'ไม่สอดคล้อง') return wf.assessed_at || wf.owner_at || wf.created_at
  if(wf.stage === 1)             return wf.created_at
  return wf.owner_at || wf.created_at
}
export const agingDays = wf => daysSince(stageEnteredAt(wf))
export const agingColor = d => d==null ? 'var(--ink-faint)' : d>=14 ? 'var(--bad)' : d>=7 ? 'var(--warn)' : 'var(--ink-soft)'

// ข้อความ "ค้างที่ใคร" ต่อสถานะ
export function ownerMeta(wf){
  if(wf.status === 'รอประเมิน')
    return { at: wf.assessor_name || 'รอผู้ประเมิน', from: wf.owner_name }
  if(wf.status === 'ไม่สอดคล้อง')
    return { at: `${wf.owner_name||'—'} (ปิดแผน)` }
  return null
}

/* Workflow B · Process 1 — เริ่มรายการติดตาม/ทวนสอบกฎหมายเดิม */
export function MonitorModal({ laws, catMap, openCaseByLaw = {}, onStart, onClose }) {
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
  const openRound = law ? openCaseByLaw[law.id] : null
  const valid = owner.trim() && law && issue.trim() && !openRound
  async function start(){ if(!valid||saving) return; setSaving(true)
    try{ await onStart({ law, ownerName:owner.trim(), followIssue:issue.trim() }); onClose() }
    finally{ setSaving(false) } }
  return (<>
    <div className="scrim" style={{zIndex:300}} onClick={onClose}/>
    <div className="modal" style={{zIndex:301,width:560}}>
      <div className="modal-head"><h3>ติดตาม / ทวนสอบกฎหมายเดิม · ผู้รับผิดชอบ</h3><button className="close" onClick={onClose}><I n="x"/></button></div>
      <div className="modal-body">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div>
            <label className="form-label">ผู้รับผิดชอบ / ผู้ติดตาม <span style={{color:'var(--bad)'}}>*</span></label>
            <input className="form-input" placeholder="พิมพ์ชื่อผู้รับผิดชอบ/ผู้ติดตาม…" value={owner} onChange={e=>setOwner(e.target.value)}/>
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
export function CaseDrawer({ wf, law, suggest, allCases = [], onOpenRound, onAssess, onClosePlan, onOpenLaw, onClose }) {
  const { can } = useAuth()
  const [closing, setClosing] = useState(false)
  const [timeline, setTimeline] = useState(null)
  const showAssess = wf.stage === 2 && wf.status === 'รอประเมิน'
  const showClosePlan = wf.status === 'ไม่สอดคล้อง' && !!wf.improvement_plan
  async function doClose(){ if(closing) return; setClosing(true); try{ await onClosePlan(wf, law) }finally{ setClosing(false) } }

  const prevRounds = useMemo(()=>allCases
    .filter(c=>c.law_id===wf.law_id && c.id!==wf.id)
    .sort((a,b)=>(b.round||1)-(a.round||1)),[allCases,wf.law_id,wf.id])

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
          {law && <button className="btn btn-ghost" style={{padding:'3px 10px',fontSize:12}} onClick={()=>{onOpenLaw(law);onClose()}}>เปิดตัวบท/ข้อปฏิบัติ</button>}
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
