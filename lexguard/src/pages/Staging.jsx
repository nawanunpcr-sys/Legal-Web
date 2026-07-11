// Staging page — AI-summarised laws awaiting approval into the registry.
// Moved verbatim from App.jsx (pure refactor).
import { useAuth, NO_PERM } from '../lib/auth.js'

export default function Staging({batches,catMap,onAdd,onDrop}){
  const { can }=useAuth()
  if(batches.length===0) return (
    <div className="view">
      <div className="panel" style={{padding:'60px 20px',textAlign:'center'}}>
        <div style={{fontSize:16,fontWeight:600}}>ไม่มีรายการรออนุมัติ</div>
        <div style={{fontSize:13,color:'var(--ink-faint)',marginTop:6}}>เมื่อใช้หน้า “วิเคราะห์” สรุปกฎหมาย รายการจะมาพักที่นี่ ให้คุณกดเพิ่มเข้าทะเบียนเอง</div>
      </div>
    </div>
  )
  return <div className="view">
    {batches.map(([key,rows])=>{ const f=rows[0]; return (
      <div className="panel" key={key} style={{marginBottom:14}}>
        <div className="panel-h">
          <span className="law-code">{f.law_code}</span>
          <span style={{fontWeight:600,fontSize:14}}>{f.law_name||f.law_code}</span>
          <span className="sub" style={{marginLeft:'auto'}}>{f.cat?catMap[f.cat]?.name||f.cat:''}{f.ministry?' · '+f.ministry:''} · {rows.length} ข้อกำหนด</span>
        </div>
        <div className="panel-b">
          {(f.announce_date||f.effective_date||f.doc_list) && (
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
              {f.announce_date && <span className="meta-chip">วันที่ประกาศ: {f.announce_date}</span>}
              {f.effective_date && <span className="meta-chip">วันที่บังคับใช้: {f.effective_date}</span>}
              {f.doc_list && <span className="meta-chip">เอกสาร: {f.doc_list.slice(0,120)}</span>}
            </div>
          )}
          {rows.map(r=>(
            <div key={r.id} style={{padding:'10px 0',borderBottom:'1px solid var(--line-soft)'}}>
              <div style={{fontSize:13,fontWeight:450,lineHeight:1.5}}>
                {r.section_ref && <b className="law-code" style={{marginRight:7}}>{r.section_ref}</b>}{r.req_text}
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:6}}>
                {r.responsible &&<span className="meta-chip">ใคร: {r.responsible}</span>}
                {r.applicability&&<span className="meta-chip">ที่ไหน: {r.applicability}</span>}
                {r.method      &&<span className="meta-chip">อย่างไร: {r.method}</span>}
                {r.documents   &&<span className="meta-chip">เอกสาร: {r.documents}</span>}
                {r.frequency   &&<span className="meta-chip">ความถี่: {r.frequency}</span>}
                {r.other_terms &&<span className="meta-chip">อื่น ๆ: {r.other_terms}</span>}
              </div>
            </div>
          ))}
          <div style={{display:'flex',gap:8,marginTop:14,alignItems:'center'}}>
            <button className="btn btn-primary" disabled={!can('edit')} title={can('edit')?'':NO_PERM} onClick={()=>onAdd(key,rows)}>เพิ่มเข้าทะเบียน</button>
            <button className="btn btn-ghost" disabled={!can('edit')} title={can('edit')?'':NO_PERM} onClick={()=>onDrop(rows)}>ไม่เพิ่ม</button>
            {f.source_url && <a className="btn btn-ghost" href={f.source_url} target="_blank" rel="noreferrer">ดูแหล่งที่มา</a>}
          </div>
        </div>
      </div>
    )})}
  </div>
}

