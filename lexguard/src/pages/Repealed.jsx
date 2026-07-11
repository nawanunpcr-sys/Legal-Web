// Repealed page — laws that have been repealed / superseded (restorable).
// Moved verbatim from App.jsx (pure refactor).
import { Tag, thDate } from '../lib/ui.jsx'

export default function Repealed({laws,catMap,search,onOpen,onRestore}){
  const q=search.toLowerCase()
  const rows=laws.filter(l=>!q||l.name.toLowerCase().includes(q)||l.code.toLowerCase().includes(q))

  if (rows.length===0) return (
    <div className="view">
      <div className="panel" style={{padding:'60px 20px',textAlign:'center'}}>
        <div style={{width:52,height:52,borderRadius:14,background:'var(--surface-3)',color:'var(--ink-faint)',display:'grid',placeItems:'center',margin:'0 auto 14px',fontSize:22,fontWeight:700}}>—</div>
        <div style={{fontSize:16,fontWeight:700}}>ยังไม่มีกฎหมายที่ถูกยกเลิก</div>
        <div style={{fontSize:13,color:'var(--ink-faint)',marginTop:6}}>กฎหมายที่บันทึกการยกเลิกจะแสดงที่นี่</div>
      </div>
    </div>
  )

  return <div className="view">
    {/* summary banner */}
    <div style={{display:'flex',alignItems:'center',gap:16,padding:'14px 18px',background:'var(--bad-bg)',border:'1px solid var(--bad-bg)',borderRadius:12,marginBottom:20}}>
      <div style={{width:40,height:40,borderRadius:11,background:'var(--bad)',color:'#fff',display:'grid',placeItems:'center',flexShrink:0,fontSize:14,fontWeight:700}}>ยก</div>
      <div>
        <div style={{fontWeight:700,fontSize:15,color:'var(--bad)'}}>{rows.length} กฎหมายที่ถูกยกเลิก / แทนที่</div>
        <div style={{fontSize:12.5,color:'var(--bad)',marginTop:2}}>รายการเหล่านี้ไม่นับในสถิติความสอดคล้อง — สามารถกู้คืนได้จากหน้ารายละเอียด</div>
      </div>
    </div>

    {/* detail cards */}
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      {rows.map(l=>{
        const cat=catMap[l.cat]
        return (
          <div key={l.id} style={{background:'var(--surface)',border:'1px solid var(--line)',borderRadius:12,overflow:'hidden',boxShadow:'var(--shadow-xs)'}}>
            {/* card header */}
            <div style={{padding:'14px 20px',background:'var(--bad-bg)',borderBottom:'1px solid var(--bad-bg)',display:'flex',alignItems:'flex-start',gap:14}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                  <span className="num" style={{fontSize:12,color:'var(--bad)',fontWeight:700,textDecoration:'line-through'}}>{l.code}</span>
                  <Tag c={l.cat} color={cat?.color}/>
                  <span className="pill p-repealed" style={{fontSize:10}}>ยกเลิกแล้ว</span>
                </div>
                <div style={{fontWeight:600,fontSize:14,color:'var(--ink-soft)',lineHeight:1.4,textDecoration:'line-through'}}>{l.name.slice(0,100)}{l.name.length>100?'…':''}</div>
                <div style={{fontSize:12,color:'var(--ink-faint)',marginTop:3}}>{l.ministry||'—'}</div>
              </div>
              <div style={{display:'flex',gap:8,flexShrink:0}}>
                <button className="btn btn-ghost" style={{padding:'5px 12px',fontSize:12}} onClick={()=>onOpen(l)}>ดูรายละเอียด</button>
                <button className="btn btn-primary" style={{padding:'5px 12px',fontSize:12}} onClick={()=>onRestore(l)}>กู้คืน</button>
              </div>
            </div>
            {/* repeal details */}
            <div style={{padding:'14px 20px',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px 24px'}}>
              <div>
                <div style={{fontSize:11,color:'var(--ink-faint)',fontWeight:600,letterSpacing:.4,textTransform:'uppercase',marginBottom:3}}>วันที่มีผลยกเลิก</div>
                <div style={{fontSize:13.5,fontWeight:600,color:'var(--bad)'}}>{thDate(l.repeal_date)}</div>
              </div>
              <div>
                <div style={{fontSize:11,color:'var(--ink-faint)',fontWeight:600,letterSpacing:.4,textTransform:'uppercase',marginBottom:3}}>แทนที่ด้วย</div>
                <div className="num" style={{fontSize:13.5,fontWeight:600,color:l.replaced_by_code?'var(--brand)':'var(--ink-faint)'}}>{l.replaced_by_code||'ไม่มีกฎหมายแทน'}</div>
              </div>
              <div>
                <div style={{fontSize:11,color:'var(--ink-faint)',fontWeight:600,letterSpacing:.4,textTransform:'uppercase',marginBottom:3}}>อ้างอิง</div>
                <div style={{fontSize:12.5,color:'var(--ink-soft)'}}>{l.repealed_by_authority||'—'}</div>
              </div>
              {l.repeal_reason && (
                <div style={{gridColumn:'1/-1',paddingTop:10,borderTop:'1px solid var(--line-soft)'}}>
                  <div style={{fontSize:11,color:'var(--ink-faint)',fontWeight:600,letterSpacing:.4,textTransform:'uppercase',marginBottom:4}}>เหตุผลการยกเลิก</div>
                  <div style={{fontSize:13,color:'var(--ink-soft)',lineHeight:1.6}}>{l.repeal_reason}</div>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  </div>
}

