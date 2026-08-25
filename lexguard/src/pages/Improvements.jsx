// Improvements page — NC (non-conformity) follow-up list (ref PD-05).
// Moved verbatim from App.jsx (pure refactor).
//
// P21 · "NC" ที่นี่ต้องหมายถึงข้อที่ประเมินแล้วและผลเป็นไม่สอดคล้องเท่านั้น
// เพื่อทราบ / ไม่เกี่ยวข้อง / ยังไม่ประเมิน เคยหลุดเข้ามาเพราะกรองด้วย status==='unmet' ตรงๆ
// ซึ่งจะกลายเป็นการสั่งให้คนไปทำแผนปรับปรุงกับข้อที่ไม่มีอะไรต้องแก้
import { useEffect, useState } from 'react'
import { reqKind } from '../lib/ui.jsx'
import { fetchImprovementPlans, closeImprovementPlan } from '../lib/supabase.js'
import { useAuth, NO_PERM } from '../lib/auth.js'
import { toast } from '../lib/toast.js'

/* P22 ขั้นที่ 2 · แผนปรับปรุงที่บันทึกไว้จริงใน lg_improvement_plans
   ก่อนหน้านี้หน้านี้คำนวณรายการ NC สดจากข้อปฏิบัติอย่างเดียว ตารางแผนจึงไม่มีใครอ่านเลย
   แม้แต่แถวเดียว · ปุ่ม "สร้างแผนจากรายการที่ยังไม่มีหลักฐาน" ในขั้นนี้เขียนลงตารางนั้น
   ถ้าไม่มีที่แสดง กดแล้วจะเหมือนไม่มีอะไรเกิดขึ้น */
function SavedPlans({ laws, onChanged }) {
  const { can } = useAuth()
  const [plans, setPlans] = useState([])
  const [busyId, setBusyId] = useState(null)
  const lawById = Object.fromEntries(laws.map(l => [l.id, l]))

  async function load() { try { setPlans(await fetchImprovementPlans()) } catch { setPlans([]) } }
  useEffect(() => { let live = true
    fetchImprovementPlans().then(d => { if (live) setPlans(d) }).catch(() => {})
    return () => { live = false }
  }, [])

  const open = plans.filter(p => p.status !== 'done')
  if (!open.length) return null

  const today = new Date().toISOString().slice(0, 10)
  async function close(p) {
    const ev = window.prompt('สรุปผล/หลักฐานการปิดแผน (บังคับกรอก):', '')
    if (ev === null) return
    if (!ev.trim()) { toast('ต้องระบุหลักฐานหรือสรุปผลก่อนปิดแผน'); return }
    setBusyId(p.id)
    try {
      await closeImprovementPlan(p, { evidence: ev.trim() })
      toast(p.requirement_id ? 'ปิดแผนแล้ว — ข้อปฏิบัติที่ผูกไว้ถูกพลิกเป็นสอดคล้อง' : 'ปิดแผนแล้ว', 'success')
      await load(); onChanged && onChanged()
    } catch (e) { toast('ปิดแผนไม่สำเร็จ: ' + e.message) }
    setBusyId(null)
  }

  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-h"><h3>แผนปรับปรุงที่บันทึกไว้ ({open.length})</h3></div>
      <div className="panel-b" style={{ paddingTop: 4 }}>
        {open.map(p => {
          const l = lawById[p.law_id]
          const overdue = p.due_date && p.due_date < today
          return (
            <div key={p.id} className="impr-row">
              <div className="impr-dot" style={{ background: overdue ? 'var(--bad)' : 'var(--warn)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.55 }}>{p.plan_text}</div>
                <div style={{ display: 'flex', gap: 7, marginTop: 5, flexWrap: 'wrap' }}>
                  {l && <span className="meta-chip">{l.code}</span>}
                  {p.owner_name && <span className="meta-chip">{p.owner_name}</span>}
                  <span className="meta-chip" style={overdue ? { color: 'var(--bad)', background: 'var(--bad-bg)', borderColor: 'var(--bad-bg)' } : {}}>
                    {p.due_date ? (overdue ? 'เลยกำหนด ' : 'กำหนด ') + p.due_date : 'ยังไม่กำหนดวันแล้วเสร็จ'}
                  </span>
                  <span className="meta-chip">{p.created_by || '—'}</span>
                </div>
              </div>
              {can('edit') && (
                <button className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 11, alignSelf: 'flex-start' }}
                  disabled={busyId === p.id} onClick={() => close(p)} title={can('edit') ? 'ปิดแผนพร้อมระบุหลักฐาน' : NO_PERM}>
                  {busyId === p.id ? 'กำลังปิด…' : 'ปิดแผน'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Improvements({ laws, catMap, onOpen, onChanged }) {
  const isNc = r => reqKind(r) === 'unmet'
  const ncLaws = laws.filter(l=>(l.reqs||[]).some(isNc))
  const totalNc = ncLaws.reduce((a,l)=>a+l.reqs.filter(isNc).length, 0)

  if (ncLaws.length===0) return (
    <div className="view">
      <SavedPlans laws={laws} onChanged={onChanged}/>
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
      <SavedPlans laws={laws} onChanged={onChanged}/>
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
