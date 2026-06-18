import { useMemo, useState } from 'react'
import { RECURRENCE_LABELS } from '../lib/supabase.js'

const TH_MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const thDate = s => { if(!s) return '—'; const d=new Date(s); return d.getDate()+' '+TH_MONTHS[d.getMonth()]+' '+(d.getFullYear()+543) }
const daysTo = s => Math.ceil((new Date(s)-new Date())/86400000)
const today  = () => new Date().toISOString().slice(0,10)

function countdownChip(due){
  if(!due) return null
  const d=daysTo(due)
  if(d<0)   return <span className="chip-date overdue">เกินกำหนด {Math.abs(d)} วัน</span>
  if(d===0) return <span className="chip-date today">วันนี้!</span>
  if(d<=7)  return <span className="chip-date soon">ใน {d} วัน</span>
  return <span className="chip-date ok">ใน {d} วัน</span>
}

/* ─── Set the event/trigger date for event-based reports ─── */
function EventDateModal({ report, onSave, onClose }){
  const [date,setDate]=useState(report.event_date||today())
  const off=report.offset_days||0
  const preview=useMemo(()=>{ if(!date) return null; const d=new Date(date); d.setDate(d.getDate()+off); return d.toISOString().slice(0,10) },[date,off])
  return (<><div className="scrim" onClick={onClose}/>
    <div className="modal">
      <div className="modal-head"><h3>กรอกวันเกิดเหตุ → คำนวณกำหนดส่ง</h3><button className="close" onClick={onClose}>×</button></div>
      <div className="modal-body">
        <p style={{fontSize:13,color:'var(--ink-soft)',marginBottom:8}}>{report.title}</p>
        <p style={{fontSize:12.5,color:'var(--ink-faint)',marginBottom:14}}>{report.timeline_text}</p>
        <label className="form-label">วันที่เกิดเหตุ / ตรวจวัด / แต่งตั้ง</label>
        <input className="form-input" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
        {preview && <div style={{marginTop:14,background:'var(--brand-tint)',border:'1px solid var(--brand)',borderRadius:9,padding:'10px 16px',display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:12,color:'var(--brand)',fontWeight:600}}>ต้องส่งภายใน ({off} วัน)</span>
          <span className="num" style={{marginLeft:'auto',fontWeight:700,color:'var(--brand)'}}>{thDate(preview)}</span>
        </div>}
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-primary" disabled={!date} onClick={()=>{ onSave(report.id,date,off); onClose() }}>บันทึก</button>
      </div>
    </div></>)
}

/* ─── Mark a report submitted ─── */
function SubmitModal({ report, onSave, onClose }){
  const [fileRef,setFileRef]=useState(report.file_reference||'')
  return (<><div className="scrim" onClick={onClose}/>
    <div className="modal">
      <div className="modal-head"><h3>บันทึกการส่งรายงาน</h3><button className="close" onClick={onClose}>×</button></div>
      <div className="modal-body">
        <p style={{fontSize:13,color:'var(--ink-soft)',marginBottom:8}}>{report.title}</p>
        <p style={{fontSize:12.5,color:'var(--ink-faint)',marginBottom:14}}>ยื่นที่: {report.authority||'—'}</p>
        <label className="form-label">อ้างอิงไฟล์ / เลขที่หนังสือ (ไม่บังคับ)</label>
        <input className="form-input" type="text" placeholder="เช่น จป.ว_2569_รอบ1.pdf หรือเลขรับ…" value={fileRef} onChange={e=>setFileRef(e.target.value)}/>
        {report.trigger_type==='fixed' && report.recurrence!=='once'
          ? <p style={{fontSize:12,color:'var(--ink-faint)',marginTop:12}}>เมื่อยืนยัน ระบบจะเลื่อนกำหนดส่งไปยังรอบถัดไป ({RECURRENCE_LABELS[report.recurrence]}) โดยอัตโนมัติ</p>
          : <p style={{fontSize:12,color:'var(--ink-faint)',marginTop:12}}>เมื่อยืนยัน รายการนี้จะรอกรอกวันเกิดเหตุครั้งถัดไป</p>}
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-primary" onClick={()=>{ onSave(report.id,fileRef); onClose() }}>ยืนยันการส่ง</button>
      </div>
    </div></>)
}

export default function Reports({ reports, onSetEvent, onSubmit }){
  const [filter,setFilter]=useState('all')
  const [eventModal,setEventModal]=useState(null)
  const [submitModal,setSubmitModal]=useState(null)

  const counts=useMemo(()=>{
    let overdue=0,upcoming=0,pending=0
    reports.forEach(r=>{
      if(r.next_due_date){ const d=daysTo(r.next_due_date); if(d<0)overdue++; else if(d<=(r.notify_days_before||30))upcoming++ }
      else if(r.trigger_type==='event') pending++
    })
    return {overdue,upcoming,pending}
  },[reports])

  const rows=reports.filter(r=>{
    if(filter==='all') return true
    const d=r.next_due_date?daysTo(r.next_due_date):null
    if(filter==='overdue')  return d!==null&&d<0
    if(filter==='upcoming') return d!==null&&d>=0&&d<=(r.notify_days_before||30)
    if(filter==='pending')  return !r.next_due_date&&r.trigger_type==='event'
    return true
  })

  return <div className="view">
    {eventModal  && <EventDateModal report={eventModal}  onSave={onSetEvent} onClose={()=>setEventModal(null)}/>}
    {submitModal && <SubmitModal    report={submitModal} onSave={onSubmit}   onClose={()=>setSubmitModal(null)}/>}

    <div className="grid" style={{gridTemplateColumns:'repeat(4,1fr)',marginBottom:16}}>
      <div className="panel" style={{padding:16}}><div style={{fontSize:13,color:'var(--ink-faint)'}}>รายงานทั้งหมด</div><div className="num" style={{fontSize:26,fontWeight:700}}>{reports.length}</div></div>
      <div className="panel" style={{padding:16}}><div style={{fontSize:13,color:'var(--ink-faint)'}}>เกินกำหนด</div><div className="num" style={{fontSize:26,fontWeight:700,color:'var(--bad)'}}>{counts.overdue}</div></div>
      <div className="panel" style={{padding:16}}><div style={{fontSize:13,color:'var(--ink-faint)'}}>ใกล้ครบกำหนด</div><div className="num" style={{fontSize:26,fontWeight:700,color:'var(--warn)'}}>{counts.upcoming}</div></div>
      <div className="panel" style={{padding:16}}><div style={{fontSize:13,color:'var(--ink-faint)'}}>รอกรอกวันเกิดเหตุ</div><div className="num" style={{fontSize:26,fontWeight:700,color:'var(--ink-soft)'}}>{counts.pending}</div></div>
    </div>

    <div className="filterbar">
      <span className={'chip'+(filter==='all'?' active':'')} onClick={()=>setFilter('all')}>ทั้งหมด ({reports.length})</span>
      <span className={'chip'+(filter==='overdue'?' active':'')} onClick={()=>setFilter('overdue')}>เกินกำหนด ({counts.overdue})</span>
      <span className={'chip'+(filter==='upcoming'?' active':'')} onClick={()=>setFilter('upcoming')}>ใกล้ครบกำหนด ({counts.upcoming})</span>
      <span className={'chip'+(filter==='pending'?' active':'')} onClick={()=>setFilter('pending')}>รอกรอกวันเกิดเหตุ ({counts.pending})</span>
    </div>

    <div className="panel"><div className="tablewrap"><table>
      <thead><tr>
        <th style={{width:'30%'}}>รายงาน / เอกสาร</th>
        <th>หน่วยงานที่รับ</th><th>ความถี่</th><th>กำหนดส่งถัดไป</th>
        <th>ผู้รับผิดชอบ</th><th style={{width:150}}>การดำเนินการ</th>
      </tr></thead>
      <tbody>{rows.map(r=>(
        <tr key={r.id}>
          <td style={{fontWeight:500,maxWidth:300,lineHeight:1.4}}>
            {r.title}
            <div style={{fontSize:11.5,color:'var(--ink-faint)',marginTop:3}}>
              {r.law_code && <span className="law-code" style={{marginRight:6}}>{r.law_code}</span>}
              {r.timeline_text}
            </div>
          </td>
          <td style={{fontSize:12.5,color:'var(--ink-soft)'}}>{r.authority||'—'}</td>
          <td style={{fontSize:12.5,color:'var(--ink-soft)'}}>{RECURRENCE_LABELS[r.recurrence]||'—'}</td>
          <td style={{fontSize:12,whiteSpace:'nowrap'}}>
            {r.next_due_date
              ? <><div>{thDate(r.next_due_date)}</div>{countdownChip(r.next_due_date)}</>
              : <span style={{color:'var(--ink-faint)'}}>{r.trigger_type==='event'?'รอกรอกวันเกิดเหตุ':'ยังไม่ตั้งค่า'}</span>}
          </td>
          <td style={{fontSize:12.5,color:'var(--ink-soft)'}}>{r.responsible||'—'}</td>
          <td><div style={{display:'flex',gap:4}}>
            {r.trigger_type==='event' &&
              <button className="btn btn-ghost" style={{padding:'3px 8px',fontSize:11}} onClick={()=>setEventModal(r)} title="กรอกวันเกิดเหตุ">วันเกิดเหตุ</button>}
            <button className="btn btn-primary" style={{padding:'3px 8px',fontSize:11}} onClick={()=>setSubmitModal(r)} title="บันทึกการส่ง">ส่งแล้ว</button>
          </div></td>
        </tr>
      ))}
      {rows.length===0 && <tr><td colSpan="6" style={{textAlign:'center',color:'var(--ink-faint)',padding:32}}>ไม่มีรายการที่ตรงกับตัวกรอง</td></tr>}
      </tbody></table></div></div>
  </div>
}
