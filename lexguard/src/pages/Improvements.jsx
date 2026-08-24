// Improvements page — NC (non-conformity) follow-up list (ref PD-05).
// Moved verbatim from App.jsx (pure refactor).
//
// P21 · "NC" ที่นี่ต้องหมายถึงข้อที่ประเมินแล้วและผลเป็นไม่สอดคล้องเท่านั้น
// เพื่อทราบ / ไม่เกี่ยวข้อง / ยังไม่ประเมิน เคยหลุดเข้ามาเพราะกรองด้วย status==='unmet' ตรงๆ
// ซึ่งจะกลายเป็นการสั่งให้คนไปทำแผนปรับปรุงกับข้อที่ไม่มีอะไรต้องแก้
import { reqKind } from '../lib/ui.jsx'

export default function Improvements({ laws, catMap, onOpen }) {
  const isNc = r => reqKind(r) === 'unmet'
  const ncLaws = laws.filter(l=>(l.reqs||[]).some(isNc))
  const totalNc = ncLaws.reduce((a,l)=>a+l.reqs.filter(isNc).length, 0)

  if (ncLaws.length===0) return (
    <div className="view">
      <div className="panel" style={{padding:'60px 20px',textAlign:'center'}}>
        <div style={{width:56,height:56,borderRadius:12,background:'var(--ok-bg)',color:'var(--ok)',display:'grid',placeItems:'center',margin:'0 auto 16px',fontSize:24}}>
          ✓
        </div>
        <div style={{fontSize:18,fontWeight:700}}>ทุกข้อปฏิบัติสอดคล้องครบถ้วน</div>
        <div style={{fontSize:13,color:'var(--ink-faint)',marginTop:6}}>ไม่มีรายการที่ต้องปรับปรุงในขณะนี้</div>
      </div>
    </div>
  )

  return (
    <div className="view">
      <div className="ai-box" style={{marginBottom:16,borderLeftColor:'var(--warn)'}}>
        <span className="ai-tag" style={{color:'var(--warn)'}}>แผนปรับปรุง / ปิด NC — อ้างอิง PD-05</span>
        <p style={{marginBottom:0}}>รายการข้อปฏิบัติที่ยังไม่สอดคล้อง <b>{totalNc} ข้อ</b> จาก <b>{ncLaws.length} กฎหมาย</b> — คลิกที่รายการเพื่อเปิดรายละเอียดและอัปเดตสถานะ</p>
      </div>
      {ncLaws.map(l=>{
        const ncReqs=l.reqs.filter(isNc)
        const cat=catMap[l.cat]
        return (
          <div key={l.id} className="panel" style={{marginBottom:12}}>
            <div className="panel-h" style={{cursor:'pointer'}} onClick={()=>onOpen(l)}>
              <span style={{width:10,height:10,borderRadius:3,background:cat?.color||'#888',flexShrink:0}}/>
              <span className="num" style={{fontSize:12,color:'var(--brand)',fontWeight:700}}>{l.code}</span>
              <span style={{flex:1,fontSize:14,fontWeight:500}}>{l.name.slice(0,80)}{l.name.length>80?'…':''}</span>
              <span className="pill p-bad">{ncReqs.length} ข้อ NC</span>
              <span style={{fontSize:12,color:'var(--brand)',fontWeight:500}}>ดูรายละเอียด →</span>
            </div>
            <div style={{padding:'2px 22px 14px'}}>
              {ncReqs.map(r=>(
                <div key={r.id} className="impr-row">
                  <div className="impr-dot"/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500,lineHeight:1.5}}>{r.text.slice(0,140)}{r.text.length>140?'…':''}</div>
                    <div style={{display:'flex',gap:7,marginTop:5,flexWrap:'wrap'}}>
                      {r.responsible&&<span className="meta-chip">{r.responsible}</span>}
                      {r.frequency&&<span className="meta-chip">{r.frequency}</span>}
                      {r.note&&<span className="meta-chip" style={{color:'var(--bad)',borderColor:'var(--bad-bg)',background:'var(--bad-bg)'}}>{r.note.slice(0,80)}</span>}
                    </div>
                  </div>
                  <span className="pill p-bad" style={{fontSize:10,padding:'2px 7px',alignSelf:'flex-start',marginTop:2}}>NC</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
