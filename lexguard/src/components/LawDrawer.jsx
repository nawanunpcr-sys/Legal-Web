import { useState } from 'react'
import { STATUS } from '../lib/supabase.js'

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
          <button className="close" onClick={onClose}>×</button>
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
  const inactive = law.active === false
  const [showRepealModal, setShowRepealModal] = useState(false)
  const p = prog(law)
  const isRepealed = law.status === 'repealed'
  const cat = catMap?.[law.cat]
  const summary = law.reqs.slice(0,3).map(r=>r.text).join(' ').slice(0,280)

  function handleRepealConfirm(data){
    setShowRepealModal(false)
    onRepeal(law, data)
  }

  return (
    <>
      <div className="scrim" onClick={onClose}/>
      <div className="lawmodal">
        <div className="dr-head">
          <button className="close" onClick={onClose}>×</button>
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
                {law.issue_date && <><dt>วันที่ประกาศ/บังคับใช้</dt><dd>{law.issue_date}</dd></>}
                {!isRepealed && <><dt>กำหนดทบทวนถัดไป</dt><dd className="num">{thDate(law.review_date)}</dd></>}
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
              {law.reqs.map(r=>(
                <div className={'req '+r.status} key={r.id}>
                  <button className="ck" onClick={()=>onToggle(law,r)} title="สลับสถานะ">
                    {r.status==='met' ? 'C' : '·'}
                  </button>
                  <div style={{flex:1}}>
                    <div className="rt">{r.text}</div>
                    <div className="rmeta">
                      {r.responsible && <span className="b">{r.responsible}</span>}
                      {r.frequency && <span className="b">{r.frequency}</span>}
                      {r.documents && <span className="b">{r.documents.slice(0,50)}</span>}
                    </div>
                    {r.status==='unmet' && r.note && <div className="note">{r.note}</div>}
                  </div>
                </div>
              ))}
              {law.reqs.length===0 && <p style={{fontSize:13,color:'var(--ink-faint)'}}>ยังไม่มีข้อกำหนดบันทึกไว้</p>}
            </div>
          )}
        </div>

        <div className="dr-foot">
          <button className="btn btn-ghost" style={{flex:1}} onClick={onClose}>ปิด</button>
          {!isRepealed && (
            <>
              {onToggleActive && <button className="btn btn-ghost" style={{flex:1}} onClick={()=>onToggleActive(law)}>{inactive?'ทำให้ใช้อยู่':'ทำเป็นไม่ใช้แล้ว'}</button>}
              {onDuplicate && <button className="btn btn-ghost" style={{flex:1}} onClick={()=>onDuplicate(law)}>ทำซ้ำ</button>}
              <button className="btn btn-danger" style={{flex:1}} onClick={()=>setShowRepealModal(true)}>ยกเลิก</button>
              <button className="btn btn-primary" style={{flex:1}} onClick={()=>window.print()}>PDF</button>
            </>
          )}
          {isRepealed && (
            <button className="btn btn-primary" style={{flex:2}} onClick={()=>onRestore(law)}>กู้คืนกฎหมาย</button>
          )}
        </div>
      </div>

      {showRepealModal && <RepealModal law={law} onConfirm={handleRepealConfirm} onClose={()=>setShowRepealModal(false)}/>}
    </>
  )
}
