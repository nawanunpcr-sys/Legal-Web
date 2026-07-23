// Communications page (ISD-86) — internal/external communication schedule.
// Includes its CommScheduleModal & MarkSentModal helpers.
// Moved verbatim from App.jsx (pure refactor).
import { useState, useMemo } from 'react'
import { RECURRENCE_LABELS } from '../lib/supabase.js'
import { useAuth, NO_PERM } from '../lib/auth.js'
import { I } from '../components/icons.jsx'
import Attachments from '../components/Attachments.jsx'
import { daysTo, thDate, TH_MONTHS } from '../lib/ui.jsx'

function CommScheduleModal({comm,onSave,onClose}){
  const [date,setDate]=useState(comm.scheduled_date||'')
  const [rec,setRec]=useState(comm.recurrence_type||'annually')
  const [notifyDays,setNotifyDays]=useState(comm.notify_days_before||7)
  const [assignedTo,setAssignedTo]=useState(comm.assigned_to||'')
  function save(){ onSave(comm.id,{scheduled_date:date||null,recurrence_type:rec,next_scheduled_date:date||null,notify_days_before:Number(notifyDays),assigned_to:assignedTo||null}); onClose() }
  return (<><div className="scrim" onClick={onClose}/>
    <div className="modal">
      <div className="modal-head"><h3>ตั้งค่าตารางการสื่อสาร</h3><button className="close" onClick={onClose}><I n="x"/></button></div>
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
      <div className="modal-head"><h3>บันทึกการส่ง / สื่อสาร</h3><button className="close" onClick={onClose}><I n="x"/></button></div>
      <div className="modal-body">
        <p style={{fontSize:13,color:'var(--ink-soft)',marginBottom:16}}>{comm.topic}</p>
        <label className="form-label">อ้างอิงไฟล์ / เอกสารที่ส่ง (ไม่บังคับ)</label>
        <input className="form-input" type="text" placeholder="เช่น ISD-86_2569Q1.pdf หรือ URL…" value={fileRef} onChange={e=>setFileRef(e.target.value)}/>
        <div className="sec-t" style={{marginTop:16}}>ไฟล์แนบ</div>
        <Attachments refType="comm" refId={comm.id}/>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-primary" onClick={save}>ยืนยันการส่ง</button>
      </div>
    </div></>)
}
function AddCommModal({scope,onSave,onClose}){
  const [topic,setTopic]=useState('')
  const [sender,setSender]=useState('')
  const [receiver,setReceiver]=useState('')
  const [rec,setRec]=useState('annually')
  const [date,setDate]=useState('')
  const [notifyDays,setNotifyDays]=useState(7)
  const [assignedTo,setAssignedTo]=useState('')
  function save(){
    if(!topic.trim()) return
    onSave({scope,topic:topic.trim(),sender:sender||null,receiver:receiver||null,recurrence_type:rec,scheduled_date:date||null,notify_days_before:Number(notifyDays),assigned_to:assignedTo||null})
    onClose()
  }
  const col2={display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}
  return (<><div className="scrim" onClick={onClose}/>
    <div className="modal" style={{width:560}}>
      <div className="modal-head"><h3>เพิ่มหัวข้อการสื่อสาร ({scope==='internal'?'ภายในองค์กร':'ภายนอกองค์กร'})</h3><button className="close" onClick={onClose}><I n="x"/></button></div>
      <div className="modal-body">
        <div><label className="form-label">หัวข้อ / ประเภทข้อมูล *</label>
        <input className="form-input" type="text" placeholder="ระบุหัวข้อการสื่อสาร…" value={topic} onChange={e=>setTopic(e.target.value)} autoFocus/></div>
        <div style={col2}>
          <div><label className="form-label">ผู้สื่อสาร</label>
          <input className="form-input" type="text" placeholder="ผู้ส่งสาร…" value={sender} onChange={e=>setSender(e.target.value)}/></div>
          <div><label className="form-label">ผู้รับสาร</label>
          <input className="form-input" type="text" placeholder="ผู้รับสาร…" value={receiver} onChange={e=>setReceiver(e.target.value)}/></div>
        </div>
        <div style={col2}>
          <div><label className="form-label">ความถี่</label>
          <select className="form-input" value={rec} onChange={e=>setRec(e.target.value)}>
            {Object.entries(RECURRENCE_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select></div>
          <div><label className="form-label">วันที่กำหนด (ครั้งแรก)</label>
          <input className="form-input" type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
        </div>
        <div style={col2}>
          <div><label className="form-label">แจ้งเตือนล่วงหน้า (วัน)</label>
          <input className="form-input" type="number" min="1" max="90" value={notifyDays} onChange={e=>setNotifyDays(e.target.value)}/></div>
          <div><label className="form-label">ผู้รับผิดชอบ</label>
          <input className="form-input" type="text" placeholder="ชื่อผู้รับผิดชอบ…" value={assignedTo} onChange={e=>setAssignedTo(e.target.value)}/></div>
        </div>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-primary" disabled={!topic.trim()} onClick={save}>เพิ่มหัวข้อ</button>
      </div>
    </div></>)
}
export default function Communication({comms,onMarkSent,onScheduleUpdate,onAdd,onDelete}){
  const { can }=useAuth()
  const [scope,setScope]=useState('internal')
  const [filter,setFilter]=useState('all')
  const [month,setMonth]=useState('all')   // Task 5 · 'all' | 'YYYY-M' (กรองตามวันกำหนดถัดไป)
  const [schedModal,setSchedModal]=useState(null)
  const [sentModal,setSentModal]=useState(null)
  const [addModal,setAddModal]=useState(false)
  const monthOptions=useMemo(()=>{
    const set=new Set()
    comms.forEach(c=>{ if(!c.next_scheduled_date) return; const d=new Date(c.next_scheduled_date); if(!isNaN(d)) set.add(d.getFullYear()+'-'+d.getMonth()) })
    return [...set].sort().reverse()
  },[comms])
  const inMonth=c=>{ if(month==='all') return true; if(!c.next_scheduled_date) return false; const d=new Date(c.next_scheduled_date); return !isNaN(d)&&month===(d.getFullYear()+'-'+d.getMonth()) }
  const rows=comms.filter(c=>{
    if(c.scope!==scope) return false
    if(!inMonth(c)) return false          // Task 5 · เดือน AND กับ chip สถานะเดิม
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
    {addModal   && <AddCommModal     scope={scope}     onSave={onAdd}            onClose={()=>setAddModal(false)}/>}
    <div className="filterbar">
      <span className={'chip'+(scope==='internal'?' active':'')} onClick={()=>setScope('internal')}>ภายในองค์กร ({comms.filter(c=>c.scope==='internal').length})</span>
      <span className={'chip'+(scope==='external'?' active':'')} onClick={()=>setScope('external')}>ภายนอกองค์กร ({comms.filter(c=>c.scope==='external').length})</span>
      <span style={{margin:'0 8px',color:'var(--line)'}}></span>
      <span className={'chip'+(filter==='all'?' active':'')} onClick={()=>setFilter('all')}>ทั้งหมด</span>
      <span className={'chip'+(filter==='upcoming'?' active':'')} onClick={()=>setFilter('upcoming')}>ครบกำหนดเร็วๆ นี้</span>
      <span className={'chip'+(filter==='overdue'?' active':'')} onClick={()=>setFilter('overdue')}>เกินกำหนด</span>
      <button className="btn btn-primary" style={{padding:'4px 12px',fontSize:12,marginLeft:'auto'}} disabled={!can('edit')} onClick={()=>setAddModal(true)} title={can('edit')?'เพิ่มหัวข้อ':NO_PERM}><I n="plus"/> เพิ่มหัวข้อ</button>
      <select className="form-input" style={{maxWidth:150,margin:0}} value={month} onChange={e=>setMonth(e.target.value)} title="กรองตามเดือนกำหนดถัดไป">
        <option value="all">ทุกเดือน</option>
        {monthOptions.map(p=>{ const [y,m]=p.split('-'); return <option key={p} value={p}>{TH_MONTHS[+m]} {(+y)+543}</option> })}
      </select>
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
            {c.next_scheduled_date?<><div>{thDate(c.next_scheduled_date)}</div>{countdownChip(c)}</>:<span style={{color:'var(--ink-faint)'}}>ยังไม่ตั้งค่า</span>}
          </td>
          <td style={{fontSize:12.5,color:'var(--ink-soft)'}}>{c.assigned_to||'—'}</td>
          <td><div style={{display:'flex',gap:4}}>
            <button className="btn btn-ghost" style={{padding:'3px 8px',fontSize:11}} disabled={!can('edit')} onClick={()=>setSchedModal(c)} title={can('edit')?'ตั้งค่าตาราง':NO_PERM}>ตาราง</button>
            <button className="btn btn-primary" style={{padding:'3px 8px',fontSize:11}} disabled={!can('edit')} onClick={()=>setSentModal(c)} title={can('edit')?'บันทึกการส่ง':NO_PERM}>บันทึก</button>
            <button className="btn btn-ghost" style={{padding:'3px 8px',fontSize:11,color:'var(--bad)'}} disabled={!can('delete')} onClick={()=>{ if(window.confirm('ลบหัวข้อ "'+c.topic+'" ?')) onDelete(c.id) }} title={can('delete')?'ลบหัวข้อ':NO_PERM}>ลบ</button>
          </div></td>
        </tr>
      ))}
      {rows.length===0 && <tr><td colSpan="7" style={{textAlign:'center',color:'var(--ink-faint)',padding:32}}>ไม่มีรายการที่ตรงกับตัวกรอง</td></tr>}
      </tbody></table></div></div>
  </div>
}
