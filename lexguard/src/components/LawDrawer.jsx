import { useEffect, useState } from 'react'
import { STATUS, uploadEvidence, updateRequirementField, fetchReviewLog, addReviewLog, updateLawField } from '../lib/supabase.js'
import { useAuth, NO_PERM } from '../lib/auth.js'
import { toast } from '../lib/toast.js'
import { daysTo } from '../lib/ui.jsx'
import { I } from './icons.jsx'

const REVIEW_RESULTS = ['ไม่มีการเปลี่ยนแปลง', 'มีการแก้ไข', 'ถูกยกเลิก']

function ReviewModal({ law, onSave, onClose }){
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [reviewer, setReviewer] = useState('')
  const [result, setResult] = useState(REVIEW_RESULTS[0])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const valid = date && result
  async function save(){
    if(!valid) return
    setBusy(true)
    try { await onSave({ review_date:date, reviewer, result, note }) }
    finally { setBusy(false) }
  }
  return (
    <>
      <div className="scrim" style={{zIndex:400}} onClick={onClose}/>
      <div className="modal" style={{zIndex:401}}>
        <div className="modal-head">
          <h3>บันทึกการทบทวน — {law.code}</h3>
          <button className="close" onClick={onClose}><I n="x"/></button>
        </div>
        <div className="modal-body">
          <label className="form-label">วันที่ทบทวน <span style={{color:'var(--bad)'}}>*</span></label>
          <input className="form-input" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
          <label className="form-label">ผู้ทบทวน</label>
          <input className="form-input" type="text" placeholder="ชื่อผู้ทบทวน…" value={reviewer} onChange={e=>setReviewer(e.target.value)}/>
          <label className="form-label">ผลการทบทวน <span style={{color:'var(--bad)'}}>*</span></label>
          <select className="form-input" value={result} onChange={e=>setResult(e.target.value)}>
            {REVIEW_RESULTS.map(r=><option key={r} value={r}>{r}</option>)}
          </select>
          <label className="form-label">หมายเหตุ</label>
          <textarea className="form-input" rows={3} placeholder="รายละเอียดการทบทวน (ถ้ามี)…" value={note} onChange={e=>setNote(e.target.value)} style={{resize:'vertical'}}/>
          <p style={{fontSize:11.5,color:'var(--ink-faint)',marginTop:10}}>เมื่อบันทึกแล้ว ระบบจะเลื่อนรอบทบทวนถัดไปเป็น +1 ปีอัตโนมัติ</p>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" disabled={!valid||busy} onClick={save}>{busy?'กำลังบันทึก…':'บันทึกการทบทวน'}</button>
        </div>
      </div>
    </>
  )
}

function RepealModal({ law, onConfirm, onClose }){
  const [date, setDate]   = useState(law.repeal_date || '')
  const [reason, setReason] = useState(law.repeal_reason || '')
  const [replaced, setReplaced] = useState(law.replaced_by_code || '')
  const [authority, setAuthority] = useState(law.repealed_by_authority || '')
  const valid = date && reason
  function confirm(){ if(!valid) return; onConfirm({ repeal_date:date, repeal_reason:reason, replaced_by_code:replaced, repealed_by_authority:authority }) }
  return (
    <>
      <div className="scrim" style={{zIndex:400}} onClick={onClose}/>
      <div className="modal" style={{zIndex:401}}>
        <div className="modal-head">
          <h3 style={{color:'var(--bad)'}}>บันทึกการยกเลิกกฎหมาย</h3>
          <button className="close" onClick={onClose}><I n="x"/></button>
        </div>
        <div className="modal-body">
          <div className="ai-box" style={{borderColor:'var(--bad)',background:'var(--bad-bg)',marginBottom:16}}>
            <span className="ai-tag" style={{color:'var(--bad)'}}>คำเตือน</span>
            <p style={{marginBottom:0,fontSize:13}}>เมื่อบันทึกแล้ว <b>{law.code}</b> จะถูกนำออกจากการคำนวณความสอดคล้องทันที และย้ายไปหน้า "กฎหมายที่ถูกยกเลิก" สามารถกู้คืนได้ในภายหลัง</p>
          </div>
          <label className="form-label">วันที่มีผลยกเลิก <span style={{color:'var(--bad)'}}>*</span></label>
          <input className="form-input" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
          <label className="form-label">เหตุผลการยกเลิก <span style={{color:'var(--bad)'}}>*</span></label>
          <textarea className="form-input" rows={3} placeholder="เช่น ถูกยกเลิกโดยพระราชบัญญัติ ฉบับใหม่ พ.ศ. …" value={reason} onChange={e=>setReason(e.target.value)} style={{resize:'vertical'}}/>
          <label className="form-label">รหัสกฎหมายที่แทนที่ (ถ้ามี)</label>
          <input className="form-input" type="text" placeholder="เช่น LA-001-NEW" value={replaced} onChange={e=>setReplaced(e.target.value)}/>
          <label className="form-label">หน่วยงาน/ราชกิจจาฯ ที่สั่งยกเลิก</label>
          <input className="form-input" type="text" placeholder="เช่น ราชกิจจานุเบกษา เล่ม … ตอน …" value={authority} onChange={e=>setAuthority(e.target.value)}/>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-danger" disabled={!valid} onClick={confirm}>ยืนยันการยกเลิก</button>
        </div>
      </div>
    </>
  )
}

export default function LawDrawer({ law, catMap, onClose, onToggle, onRepeal, onRestore, onDuplicate, onToggleActive, prog, thDate }){
  const { can } = useAuth()
  const inactive = law.active === false
  const [showRepealModal, setShowRepealModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviews, setReviews] = useState([])
  const [evOverrides, setEvOverrides] = useState({})   // { reqId: {evidence_url, evidence_label} } — fresh uploads
  const [reqOverrides, setReqOverrides] = useState({}) // { reqId: {text, responsible, frequency, documents} } — inline edits
  const [editingId, setEditingId] = useState(null)     // req id ที่กำลังแก้ไข
  const [editForm, setEditForm] = useState({ text:'', responsible:'', frequency:'', documents:'' })
  const [savingReq, setSavingReq] = useState(false)
  const [reviewDate, setReviewDate] = useState(law.review_date)
  const [reportDue, setReportDue] = useState(law.report_due_date || '')
  const [uploadingReq, setUploadingReq] = useState(null)
  const p = prog(law)
  const isRepealed = law.status === 'repealed'
  const cat = catMap?.[law.cat]
  const summary = law.reqs.slice(0,3).map(r=>r.text).join(' ').slice(0,280)

  useEffect(()=>{
    setEvOverrides({}); setReqOverrides({}); setEditingId(null)
    setReviewDate(law.review_date); setReportDue(law.report_due_date || '')
    let alive = true
    fetchReviewLog(law.id).then(r=>{ if(alive) setReviews(r) }).catch(()=>{})
    return ()=>{ alive = false }
  }, [law.id])   // eslint-disable-line react-hooks/exhaustive-deps

  function handleRepealConfirm(data){
    setShowRepealModal(false)
    onRepeal(law, data)
  }

  async function attachEvidence(req, file){
    if(!file) return
    setUploadingReq(req.id)
    try{
      const url = await uploadEvidence(file)
      const label = file.name
      await updateRequirementField(req.id, { evidence_url:url, evidence_label:label })
      setEvOverrides(prev=>({ ...prev, [req.id]:{ evidence_url:url, evidence_label:label } }))
    }catch(e){ toast('แนบหลักฐานไม่สำเร็จ: '+e.message) }
    setUploadingReq(null)
  }

  function startEdit(r){
    const ov = reqOverrides[r.id] || {}
    setEditForm({
      text:        ov.text        ?? r.text        ?? '',
      responsible: ov.responsible ?? r.responsible ?? '',
      frequency:   ov.frequency   ?? r.frequency   ?? '',
      documents:   ov.documents   ?? r.documents   ?? '',
    })
    setEditingId(r.id)
  }
  async function saveEdit(r){
    if(savingReq) return
    const patch = {
      text:        editForm.text.trim(),
      responsible: editForm.responsible.trim() || null,
      frequency:   editForm.frequency.trim()   || null,
      documents:   editForm.documents.trim()   || null,
    }
    if(!patch.text){ toast('ข้อความข้อกำหนดห้ามว่าง'); return }
    setSavingReq(true)
    try{
      await updateRequirementField(r.id, patch)
      setReqOverrides(prev=>({ ...prev, [r.id]: patch }))
      const idx = law.reqs.findIndex(x=>x.id===r.id)   // keep local copy in sync (prog/summary)
      if(idx>=0) law.reqs[idx] = { ...law.reqs[idx], ...patch }
      setEditingId(null)
      toast('บันทึกข้อกำหนดแล้ว','success')
    }catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message) }
    finally{ setSavingReq(false) }
  }

  async function saveReportDue(v){
    setReportDue(v)
    try{ await updateLawField(law.id, { report_due_date: v || null }); law.report_due_date = v || null
      toast(v?'บันทึกวันครบกำหนดส่งรายงานแล้ว':'ล้างวันครบกำหนดแล้ว','success') }
    catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message) }
  }

  async function handleSaveReview(data){
    try{
      const row = await addReviewLog(law.id, data)
      setReviews(prev=>[row, ...prev])
      // advance next review date +1 year from the review date
      const base = data.review_date ? new Date(data.review_date) : new Date()
      base.setFullYear(base.getFullYear()+1)
      const next = base.toISOString().slice(0,10)
      await updateLawField(law.id, { review_date: next })
      setReviewDate(next)
      setShowReviewModal(false)
      toast('บันทึกการทบทวนแล้ว','success')
    }catch(e){ toast('บันทึกการทบทวนไม่สำเร็จ: '+e.message) }
  }

  return (
    <>
      <div className="scrim" onClick={onClose}/>
      <div className="lawmodal">
        <div className="dr-head">
          <button className="close" onClick={onClose}><I n="x"/></button>
          <div className="code">{law.code} · หมวด {law.cat} — {cat?.name||law.cat}</div>
          <h2 style={isRepealed?{textDecoration:'line-through',color:'var(--ink-faint)'}:{}}>{law.name}</h2>
          {isRepealed && (
            <div style={{marginTop:6,padding:'6px 12px',background:'var(--bad-bg)',borderRadius:6,fontSize:12,color:'var(--bad)'}}>
              ยกเลิกแล้ว — {law.repeal_date||'ไม่ระบุวันที่'}
              {law.replaced_by_code && <span style={{marginLeft:6}}>· แทนที่ด้วย <b>{law.replaced_by_code}</b></span>}
            </div>
          )}
          {!isRepealed && (
            <span className="pill" style={inactive?{background:'var(--surface-3)',color:'var(--ink-faint)'}:{background:'var(--ok-bg)',color:'var(--ok)'}}>
              {inactive?'ไม่ใช้แล้ว':'ใช้อยู่'}
            </span>
          )}
          <div className="meta">
            <span>{law.ministry||'—'}</span>
            {law.issue_date && <span>{law.issue_date}</span>}
            <span>{law.reqs.length} ข้อกำหนด</span>
            {law.law_type && <span>{law.law_type}</span>}
          </div>
          {law.source_url && (
            <a className="btn btn-ghost" href={law.source_url} target="_blank" rel="noreferrer"
              style={{marginTop:10,padding:'5px 12px',fontSize:12.5}} title={law.source_url}>📄 เปิดตัวบท (PDF)</a>
          )}
        </div>
        <div className="dr-body">
          {isRepealed && (
            <div className="sec">
              <div className="sec-t">รายละเอียดการยกเลิก</div>
              <div className="panel" style={{padding:18}}>
                <dl className="kv">
                  <dt>วันที่ยกเลิก</dt><dd style={{color:'var(--bad)'}}>{law.repeal_date||'—'}</dd>
                  <dt>เหตุผล</dt><dd>{law.repeal_reason||'—'}</dd>
                  {law.replaced_by_code && <><dt>แทนที่ด้วย</dt><dd className="num">{law.replaced_by_code}</dd></>}
                  {law.repealed_by_authority && <><dt>อ้างอิง</dt><dd style={{fontSize:12}}>{law.repealed_by_authority}</dd></>}
                </dl>
              </div>
            </div>
          )}

          <div className="sec">
            <div className="sec-t">ข้อมูลทะเบียน</div>
            <div className="panel" style={{padding:18}}>
              <dl className="kv">
                <dt>รหัสกฎหมาย</dt><dd className="num">{law.code}</dd>
                <dt>หมวด</dt><dd>{law.cat} — {cat?.name||law.cat}</dd>
                {law.law_type && <><dt>ประเภทกฎหมาย</dt><dd>{law.law_type}</dd></>}
                {law.hierarchy_level && <><dt>ลำดับชั้น</dt><dd>ชั้น {law.hierarchy_level}</dd></>}
                <dt>กระทรวง/หน่วยงาน</dt><dd>{law.ministry||'—'}</dd>
                {law.responsible && <><dt>หน่วยงานที่รับผิดชอบ</dt><dd>{law.responsible}</dd></>}
                {law.issue_date && <><dt>วันที่ประกาศ</dt><dd>{law.issue_date}</dd></>}
                {law.effective_date && <><dt>วันที่บังคับใช้</dt><dd>{law.effective_date}</dd></>}
                {law.doc_list && <><dt>เอกสารที่เกี่ยวข้อง</dt><dd>{law.doc_list}</dd></>}
                {!isRepealed && <><dt>กำหนดทบทวนถัดไป</dt><dd className="num">{thDate(reviewDate)}</dd></>}
                {!isRepealed && <><dt>ครบกำหนดส่งรายงานราชการ</dt><dd style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  <input className="form-input" type="date" style={{maxWidth:170,padding:'4px 8px'}} value={reportDue||''} disabled={!can('edit')} title={can('edit')?'':NO_PERM} onChange={e=>saveReportDue(e.target.value)}/>
                  {reportDue && (()=>{ const d=daysTo(reportDue); const col=d<15?'var(--bad)':d<=30?'var(--review)':'var(--ink-faint)'
                    return <span style={{fontSize:11.5,color:col,fontWeight:600}}>{d<0?'เกิน '+Math.abs(d)+' วัน':'อีก '+d+' วัน'}</span> })()}
                </dd></>}
                {law.source_url && <><dt>ต้นฉบับ</dt><dd><a href={law.source_url} target="_blank" rel="noreferrer" style={{color:'var(--brand)'}}>เปิดเอกสาร ↗</a></dd></>}
                <dt>สถานะ</dt><dd><span className={'pill '+(STATUS[law.status]?.cls||'p-ok')}>{STATUS[law.status]?.label||law.status}</span></dd>
              </dl>
            </div>
          </div>

          {!isRepealed && (
            <div className="sec">
              <div className="sec-t">
                ข้อกำหนด & การประเมิน
                <span style={{marginLeft:'auto',color:p===100?'var(--ok)':'var(--bad)'}}>{p}%</span>
              </div>
              <p style={{fontSize:11.5,color:'var(--ink-faint)',marginBottom:10}}>คลิกกล่องสถานะเพื่อสลับ สอดคล้อง ↔ ยังไม่สอดคล้อง (บันทึกอัตโนมัติ)</p>
              {law.reqs.map(r=>{
                const ov = evOverrides[r.id] || {}
                const evidenceUrl   = ov.evidence_url   || r.evidence_url
                const evidenceLabel = ov.evidence_label || r.evidence_label
                const ro = reqOverrides[r.id] || {}
                const rtext = ro.text        ?? r.text
                const rresp = ro.responsible ?? r.responsible
                const rfreq = ro.frequency   ?? r.frequency
                const rdocs = ro.documents   ?? r.documents
                const isEditing = editingId === r.id
                return (
                <div className={'req '+r.status} key={r.id}>
                  <button className="ck" onClick={()=>onToggle(law,r)} disabled={!can('edit')||isEditing} title={can('edit')?'สลับสถานะ':NO_PERM}>
                    {r.status==='met' ? 'C' : '·'}
                  </button>
                  <div style={{flex:1}}>
                    {isEditing ? (
                      <div style={{display:'flex',flexDirection:'column',gap:8}}>
                        <textarea className="form-input" rows={5} value={editForm.text}
                          onChange={e=>setEditForm(f=>({...f,text:e.target.value}))}
                          placeholder="ข้อความข้อกำหนด…" style={{resize:'vertical',whiteSpace:'pre-wrap'}} autoFocus/>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                          <input className="form-input" value={editForm.responsible} onChange={e=>setEditForm(f=>({...f,responsible:e.target.value}))} placeholder="ผู้รับผิดชอบ"/>
                          <input className="form-input" value={editForm.frequency} onChange={e=>setEditForm(f=>({...f,frequency:e.target.value}))} placeholder="ความถี่"/>
                        </div>
                        <input className="form-input" value={editForm.documents} onChange={e=>setEditForm(f=>({...f,documents:e.target.value}))} placeholder="เอกสาร/หลักฐานที่ต้องมี"/>
                        <div style={{display:'flex',gap:8}}>
                          <button className="btn btn-primary" style={{padding:'5px 14px',fontSize:12.5}} disabled={savingReq} onClick={()=>saveEdit(r)}>{savingReq?'กำลังบันทึก…':'บันทึก'}</button>
                          <button className="btn btn-ghost" style={{padding:'5px 14px',fontSize:12.5}} disabled={savingReq} onClick={()=>setEditingId(null)}>ยกเลิก</button>
                        </div>
                      </div>
                    ) : (<>
                    <div className="rt" style={{whiteSpace:'pre-wrap'}}>{rtext}</div>
                    <div className="rmeta">
                      {rresp && <span className="b">{rresp}</span>}
                      {rfreq && <span className="b">{rfreq}</span>}
                      {rdocs && <span className="b">{rdocs.slice(0,50)}</span>}
                    </div>
                    <div className="rmeta" style={{marginTop:5}}>
                      {r.evaluated_by
                        ? <span className="b" style={{background:'var(--ok-bg)',color:'var(--ok)',borderColor:'transparent'}}>ประเมินโดย {r.evaluated_by}{r.evaluated_at?' · '+thDate(r.evaluated_at):''}</span>
                        : <span className="b">ยังไม่ได้ประเมิน</span>}
                      {evidenceUrl && <a className="b" href={evidenceUrl} target="_blank" rel="noreferrer" style={{color:'var(--brand)',borderColor:'var(--brand)'}} title={evidenceLabel||'หลักฐาน'}>หลักฐาน ↗</a>}
                      <label className="b" style={{cursor:can('edit')?'pointer':'not-allowed',opacity:can('edit')?1:.55}} title={can('edit')?'แนบไฟล์หลักฐาน':NO_PERM}>
                        {uploadingReq===r.id ? 'กำลังอัปโหลด…' : (evidenceUrl ? 'เปลี่ยนหลักฐาน' : 'แนบหลักฐาน')}
                        <input type="file" accept="application/pdf,image/*" style={{display:'none'}} disabled={!can('edit')||uploadingReq===r.id}
                          onChange={e=>{ const f=e.target.files?.[0]; attachEvidence(r,f); e.target.value='' }}/>
                      </label>
                      <button className="b" style={{cursor:can('edit')?'pointer':'not-allowed',opacity:can('edit')?1:.55,background:'none'}}
                        disabled={!can('edit')} title={can('edit')?'แก้ไขข้อกำหนด':NO_PERM} onClick={()=>startEdit(r)}>แก้ไข</button>
                    </div>
                    {r.status==='unmet' && r.note && <div className="note">{r.note}</div>}
                    </>)}
                  </div>
                </div>
              )})}
              {law.reqs.length===0 && <p style={{fontSize:13,color:'var(--ink-faint)'}}>ยังไม่มีข้อกำหนดบันทึกไว้</p>}
            </div>
          )}

          <div className="sec">
            <div className="sec-t">ประวัติการทบทวน
              <button className="btn btn-primary" style={{marginLeft:'auto',padding:'4px 11px',fontSize:11}}
                disabled={!can('edit')} title={can('edit')?'':NO_PERM} onClick={()=>setShowReviewModal(true)}>บันทึกการทบทวน</button>
            </div>
            {reviews.length===0 && <p style={{fontSize:12.5,color:'var(--ink-faint)'}}>ยังไม่มีประวัติการทบทวน — กด “บันทึกการทบทวน” เพื่อเพิ่มรายการแรก</p>}
            {reviews.map(rv=>{
              const rc = rv.result==='ถูกยกเลิก' ? {bg:'var(--bad-bg)',fg:'var(--bad)'}
                       : rv.result==='มีการแก้ไข' ? {bg:'var(--review-bg)',fg:'var(--review)'}
                       : {bg:'var(--ok-bg)',fg:'var(--ok)'}
              return (
                <div key={rv.id} className="panel" style={{padding:'10px 14px',marginBottom:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                    <span className="num" style={{fontSize:12.5,fontWeight:700}}>{thDate(rv.review_date)}</span>
                    <span className="pill" style={{fontSize:10,background:rc.bg,color:rc.fg}}>{rv.result||'—'}</span>
                    {rv.reviewer && <span style={{fontSize:12,color:'var(--ink-faint)'}}>โดย {rv.reviewer}</span>}
                  </div>
                  {rv.note && <div style={{fontSize:12.5,color:'var(--ink-soft)',marginTop:6,lineHeight:1.5}}>{rv.note}</div>}
                </div>
              )
            })}
          </div>
        </div>

        <div className="dr-foot">
          <button className="btn btn-ghost" style={{flex:1}} onClick={onClose}>ปิด</button>
          {!isRepealed && (
            <>
              {onToggleActive && <button className="btn btn-ghost" style={{flex:1}} disabled={!can('edit')} title={can('edit')?'':NO_PERM} onClick={()=>onToggleActive(law)}>{inactive?'ทำให้ใช้อยู่':'ทำเป็นไม่ใช้แล้ว'}</button>}
              {onDuplicate && <button className="btn btn-ghost" style={{flex:1}} disabled={!can('edit')} title={can('edit')?'':NO_PERM} onClick={()=>onDuplicate(law)}>ทำซ้ำ</button>}
              {/* ยกเลิก (ลบออกจากทะเบียน) = admin เท่านั้น */}
              <button className="btn btn-danger" style={{flex:1}} disabled={!can('delete')} title={can('delete')?'':NO_PERM} onClick={()=>setShowRepealModal(true)}>ยกเลิก</button>
              <button className="btn btn-primary" style={{flex:1}} onClick={()=>window.print()}>PDF</button>
            </>
          )}
          {isRepealed && (
            <button className="btn btn-primary" style={{flex:2}} disabled={!can('delete')} title={can('delete')?'':NO_PERM} onClick={()=>onRestore(law)}>กู้คืนกฎหมาย</button>
          )}
        </div>
      </div>

      {showRepealModal && <RepealModal law={law} onConfirm={handleRepealConfirm} onClose={()=>setShowRepealModal(false)}/>}
      {showReviewModal && <ReviewModal law={law} onSave={handleSaveReview} onClose={()=>setShowReviewModal(false)}/>}
    </>
  )
}
