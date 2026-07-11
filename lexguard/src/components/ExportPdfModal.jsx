// Export-to-PDF options modal (F-259 register). Rendered by App's export flow.
// Moved verbatim from App.jsx (pure refactor).
import { useState } from 'react'
import { I } from './icons.jsx'

export default function ExportPdfModal({ cats, onClose, onExport }){
  const [mode,setMode]=useState('all')   // all | cats | nc
  const [sel,setSel]=useState(()=>new Set(cats.map(c=>c.code)))
  const toggle=code=>setSel(p=>{ const n=new Set(p); n.has(code)?n.delete(code):n.add(code); return n })
  const OPTS=[['all','ทั้งหมด'],['cats','เฉพาะหมวดที่เลือก'],['nc','เฉพาะรายการที่ยังไม่สอดคล้อง (NC)']]
  return (
    <><div className="scrim" style={{zIndex:400}} onClick={onClose}/>
    <div className="modal" style={{zIndex:401,width:460}}>
      <div className="modal-head"><h3>ส่งออก PDF — ทะเบียนกฎหมาย (F-259)</h3><button className="close" onClick={onClose}><I n="x"/></button></div>
      <div className="modal-body">
        <label className="form-label">ขอบเขตรายงาน</label>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {OPTS.map(([k,l])=>(
            <label key={k} style={{display:'flex',gap:8,alignItems:'center',cursor:'pointer',fontSize:13.5}}>
              <input type="radio" name="pdfmode" checked={mode===k} onChange={()=>setMode(k)}/>{l}
            </label>
          ))}
        </div>
        {mode==='cats' && (
          <div style={{marginTop:14}}>
            <label className="form-label">เลือกหมวด ({sel.size})</label>
            <div className="filterbar" style={{marginTop:4}}>
              {cats.map(c=>(
                <span key={c.code} className={'chip'+(sel.has(c.code)?' active':'')} style={{cursor:'pointer'}} onClick={()=>toggle(c.code)}>
                  {c.code} · {c.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-primary" disabled={mode==='cats'&&sel.size===0} onClick={()=>onExport(mode,sel)}><I n="download"/>ส่งออก PDF</button>
      </div>
    </div></>
  )
}

