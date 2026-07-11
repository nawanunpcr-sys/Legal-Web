// Updates page — ShawPat law-update watcher (Skill: update-watch).
// Moved verbatim from App.jsx (pure refactor).
import { useState } from 'react'
import { useAuth, NO_PERM } from '../lib/auth.js'

export default function Updates({updates,onMark,onScanned}){
  const { can }=useAuth()
  const live=updates.filter(u=>u.status!=='dismissed')
  const [busy,setBusy]=useState(false)
  const [msg,setMsg]=useState(null)
  const UL={ new:'ใหม่', read:'อ่านแล้ว', imported:'เพิ่มแล้ว' }
  async function scan(){
    setBusy(true); setMsg(null)
    try{
      const r=await fetch('/api/law-update',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({})})
      const d=await r.json()
      if(!r.ok) setMsg({err:d.error||'ตรวจไม่สำเร็จ'})
      else{ setMsg({ok:`ตรวจพบ ${d.scanned} รายการบน ShawPat · ใหม่ ${d.new} รายการ`}); onScanned&&onScanned() }
    }catch(e){ setMsg({err:'เรียก API ไม่สำเร็จ (ต้อง deploy บน Vercel พร้อมตั้ง ANTHROPIC_API_KEY): '+e.message}) }
    setBusy(false)
  }
  const [abusy,setAbusy]=useState('')
  async function runAgent(which){
    setAbusy(which); setMsg(null)
    try{
      const r=await fetch('/api/agent-'+which,{method:'POST',headers:{'content-type':'application/json'},body:'{}'})
      const d=await r.json()
      if(!r.ok) setMsg({err:d.error||'รันไม่สำเร็จ'})
      else if(which==='gazette') setMsg({ok:`Agent เฝ้าราชกิจจาฯ: สแกน ${d.scanned} · เข้าคิวใหม่ ${d.created}`})
      else { setMsg({ok:`Agent วิเคราะห์คิว: ทำ ${d.scanned} รายการ · สรุปได้ ${d.created} ข้อ · ผิดพลาด ${d.errors}`}); onScanned&&onScanned() }
    }catch(e){ setMsg({err:'เรียก API ไม่สำเร็จ (ต้อง deploy บน Vercel + ANTHROPIC_API_KEY): '+e.message}) }
    setAbusy('')
  }
  return <div className="view">
    <div className="panel" style={{marginBottom:14,borderTop:'3px solid var(--brand)'}}>
      <div className="panel-h"><h3>เอเจนต์อัตโนมัติ (Auto Agents)</h3><span className="sub" style={{marginLeft:'auto'}}>ทำงานเองทุกวัน · รันเองได้ที่นี่</span></div>
      <div className="panel-b">
        <p style={{fontSize:12.5,color:'var(--ink-faint)',lineHeight:1.6,marginBottom:10}}>
          ① เฝ้าราชกิจจาฯ/ShawPat/DLPW → คัดกฎหมาย SHE ใหม่เข้า “คิว” · ② อ่านคิว → สรุปเป็นข้อกำหนด ส่งไปหน้า “นำเข้า/รออนุมัติ”
        </p>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button className="btn btn-ghost" disabled={!!abusy||!can('edit')} title={can('edit')?'':NO_PERM} onClick={()=>runAgent('gazette')}>{abusy==='gazette'?'กำลังรัน…':'① รันเฝ้าราชกิจจาฯ'}</button>
          <button className="btn btn-ghost" disabled={!!abusy||!can('edit')} title={can('edit')?'':NO_PERM} onClick={()=>runAgent('analyze')}>{abusy==='analyze'?'กำลังรัน…':'② รันวิเคราะห์คิว'}</button>
        </div>
        {msg?.ok && <div className="login-msg" style={{marginTop:10}}>{msg.ok}</div>}
        {msg?.err && <div className="login-err" style={{marginTop:10}}>{msg.err}</div>}
      </div>
    </div>
    <div className="panel" style={{marginBottom:14}}>
      <div className="panel-h">
        <h3>เฝ้าระวังกฎหมายใหม่จาก ShawPat</h3>
        <button className="btn btn-primary" style={{marginLeft:'auto'}} disabled={busy||!can('edit')} title={can('edit')?'':NO_PERM} onClick={scan}>{busy?'กำลังตรวจ…':'ตรวจหากฎหมายใหม่'}</button>
      </div>
      <div className="panel-b" style={{paddingTop:0}}>
        <p style={{fontSize:12.5,color:'var(--ink-faint)',lineHeight:1.6}}>Skill: update-watch — ดึงหน้า shawpat.or.th/th/safety-law เทียบกับทะเบียน แล้วเพิ่มของใหม่เป็นการแจ้งเตือน</p>
      </div>
    </div>
    {live.length===0 && <div className="panel" style={{padding:'50px 20px',textAlign:'center',color:'var(--ink-faint)'}}>ยังไม่มีกฎหมายใหม่ — กด “ตรวจหากฎหมายใหม่” เพื่อดึงรายการจาก ShawPat</div>}
    {live.map(u=>(
      <div className="panel" key={u.id} style={{marginBottom:10,opacity:u.status==='new'?1:.66}}>
        <div className="panel-b">
          <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:6,flexWrap:'wrap'}}>
            <span className={'pill '+(u.status==='new'?'p-bad':'')}>{UL[u.status]||u.status}</span>
            {u.category_guess && <span className="tag">คาดหมวด {u.category_guess}</span>}
            <span className="tag">ที่มา {u.source}</span>
          </div>
          <div style={{fontSize:14,fontWeight:600,lineHeight:1.45}}>{u.title}</div>
          {u.published_date && <div style={{fontSize:12,color:'var(--ink-faint)',marginTop:3}}>ประกาศ {u.published_date}</div>}
          {u.summary && <div style={{fontSize:12.5,color:'var(--ink-soft)',marginTop:6,lineHeight:1.6}}>{u.summary}</div>}
          <div style={{display:'flex',gap:8,marginTop:12,alignItems:'center',flexWrap:'wrap'}}>
            {u.status==='new' && <button className="btn btn-ghost" disabled={!can('edit')} title={can('edit')?'':NO_PERM} onClick={()=>onMark(u.id,'read')}>อ่านแล้ว</button>}
            <button className="btn btn-primary" disabled={!can('edit')} title={can('edit')?'':NO_PERM} onClick={()=>onMark(u.id,'imported')}>ทำเครื่องหมายว่าเพิ่มแล้ว</button>
            <button className="btn btn-ghost" disabled={!can('edit')} title={can('edit')?'':NO_PERM} onClick={()=>onMark(u.id,'dismissed')}>ไม่เกี่ยวข้อง</button>
            {u.ref_url && <a className="btn btn-ghost" href={u.ref_url} target="_blank" rel="noreferrer">เปิดหน้ากฎหมาย</a>}
          </div>
        </div>
      </div>
    ))}
  </div>
}
