// Workflow A · Process 1 — เพิ่มกฎหมายใหม่เข้าทะเบียน (ผู้ตรวจสอบ / Owner).
// 2-step wizard:
//   1) เลือกผู้ตรวจ + เลือกกฎหมายจากรายการที่ AI ค้นหา (หรือกรอกเอง) + หมวด + เลขรัน
//      → Submit สร้างกฎหมายเข้าทะเบียน (status รอประเมิน) + เปิด tracker case
//   2) แนบไฟล์กฎหมาย/เอกสารที่เกี่ยวข้อง → เสร็จสิ้น
import { useState, useEffect, useMemo } from 'react'
import { LAW_TYPES, fetchDiscoveredLaws, deleteDiscoveredLaw, logActivity } from '../lib/supabase.js'
import Attachments from './Attachments.jsx'
import { I } from './icons.jsx'
import { nextCode, thDate, findLawDuplicate } from '../lib/ui.jsx'
import { toast } from '../lib/toast.js'
import { confirmDialog } from '../lib/confirm.js'

// summary jsonb → [{text}] (รองรับ array ของ string หรือ object)
function summaryToReqs(summary) {
  if (!summary) return []
  const arr = Array.isArray(summary) ? summary : (Array.isArray(summary.items) ? summary.items : [])
  return arr.map(it => typeof it === 'string' ? it : (it.text || it.detail || it.section || JSON.stringify(it)))
    .filter(Boolean)
}

export default function AddLawFlow({ cats, allLaws, suggest = {}, initialData = null, onCreate, onClose, onDone }) {
  const [step, setStep] = useState(1)
  const [owner, setOwner] = useState('')
  const [discovered, setDiscovered] = useState([])
  const [loadingDisc, setLoadingDisc] = useState(true)
  // 'prefill' = มาจากหน้าสรุปกฎหมาย (P12) · 'manual' = กรอกเอง · uuid = เลือกจากคิว
  const [selId, setSelId] = useState(initialData ? 'prefill' : null)
  // P12: เก็บ requirements แบบมีโครงสร้าง (responsible/frequency) ไว้ส่งเข้าทะเบียนโดยไม่ตกหล่น
  const prefillReqs = useMemo(() => (initialData?.requirements || []).map(q => ({
    responsible: q.responsible || '', frequency: q.frequency || '', documents: q.documents || '',
  })), [initialData])
  const il = initialData?.law || {}
  const [cat, setCat] = useState(il.cat || cats[0]?.code || 'LA')
  const [level, setLevel] = useState('4')
  const [name, setName] = useState(il.name || '')
  const [ministry, setMinistry] = useState(il.ministry || '')
  const [announce, setAnnounce] = useState(il.announce_date || '')
  const [effective, setEffective] = useState(il.effective_date || '')
  const [docList, setDocList] = useState(il.documents || '')
  const [reqText, setReqText] = useState(       // สาระสำคัญ 1 ข้อ/บรรทัด
    (initialData?.requirements || []).map(q => `${q.section_ref ? q.section_ref + ': ' : ''}${q.req_text || ''}`.trim()).filter(Boolean).join('\n'))
  const [saving, setSaving] = useState(false)
  const [newLaw, setNewLaw] = useState(null)
  const [dup, setDup] = useState(null)               // Task 9: { type:'exact'|'amendment'|'fuzzy', law, sim, blocked? }
  const [dupConfirmed, setDupConfirmed] = useState(false)
  // P15·T1 · โหมด prefill (มาจาก AI สรุปกฎหมาย) → บังคับตรวจทานกับต้นฉบับก่อนบันทึก
  const isPrefill = !!initialData
  const srcUrl = initialData?.law?.source_url || initialData?.source_url || ''
  const [verified, setVerified] = useState(false)

  // ชื่อเปลี่ยน → ล้างสถานะการเตือนซ้ำ เพื่อเช็คใหม่
  function changeName(v) { setName(v); setDup(null); setDupConfirmed(false) }

  useEffect(() => { let alive = true
    fetchDiscoveredLaws().then(d => { if (alive) { setDiscovered(d.filter(x => x.status !== 'registered')); setLoadingDisc(false) } })
      .catch(() => setLoadingDisc(false))
    return () => { alive = false }
  }, [])

  const lastSearched = useMemo(() => {
    const ds = discovered.map(d => d.searched_at || d.created_at).filter(Boolean).sort()
    return ds.length ? ds[ds.length - 1] : null
  }, [discovered])

  const previewCode = cat ? nextCode(allLaws, cat) : '—'
  const nowLabel = new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })

  function pick(d) {
    setSelId(d.id); setDup(null); setDupConfirmed(false)
    setName(d.law_name || ''); setMinistry(d.ministry || '')
    setAnnounce(d.announced_date || ''); setEffective(d.effective_date || '')
    setDocList((d.related_docs || []).join(', '))
    setReqText(summaryToReqs(d.summary).join('\n'))
  }
  function pickManual() {
    setSelId('manual'); setDup(null); setDupConfirmed(false)
    setName(''); setMinistry(''); setAnnounce(''); setEffective(''); setDocList(''); setReqText('')
  }
  async function removeDiscovered(d) {
    if (!(await confirmDialog(`ลบ "${(d.law_name||'').slice(0,40)}" ออกจากรายการ?`, { danger: true }))) return
    try { await deleteDiscoveredLaw(d.id); setDiscovered(prev => prev.filter(x => x.id !== d.id)); if (selId === d.id) setSelId(null) }
    catch (e) { toast('ลบไม่สำเร็จ: ' + e.message) }
  }

  const valid = owner.trim() && selId && cat && name.trim() && (!isPrefill || verified)   // P15·T1 · prefill ต้องติ๊กยืนยันตรวจทานก่อน

  async function submit(force = false) {
    if (!valid || saving) return
    const disc = initialData
      ? (initialData.discoveredId ? { id: initialData.discoveredId } : null)   // P12 · mark คิวเป็น registered
      : (selId === 'manual' ? null : discovered.find(d => d.id === selId))
    // Task 9 · กันซ้ำ 2 ชั้น (exact = บล็อก, fuzzy/amendment = เตือนให้ยืนยัน)
    if (!force && !dupConfirmed) {
      const found = findLawDuplicate(allLaws, name.trim(), disc?.source_url || '')
      if (found) {
        if (found.type === 'exact') { setDup({ ...found, blocked: true }); return }
        setDup(found); return
      }
    }
    setSaving(true)
    try {
      // P12: คงข้อมูล responsible/frequency จาก prefill ตามลำดับบรรทัด (ถ้าผู้ใช้ไม่ได้เพิ่ม/ลบบรรทัด)
      const reqs = reqText.split('\n').map(s => s.trim()).filter(Boolean).map((t, i) => ({
        text: t, status: 'met',
        responsible: prefillReqs[i]?.responsible || '', frequency: prefillReqs[i]?.frequency || '', documents: prefillReqs[i]?.documents || '',
      }))
      const { law } = await onCreate({
        lawFields: { code: previewCode, cat, name: name.trim(), hierarchy_level: level, ministry,
          announce_date: announce, effective_date: effective, doc_list: docList },
        reqs, ownerName: owner.trim(), discovered: disc, verifiedFromAI: isPrefill,
      })
      // บันทึกการยืนยันเพิ่มทั้งที่ระบบเตือน
      if (dup && dup.type !== 'exact') {
        logActivity({ action: 'duplicate_override', law_id: law.id, law_code: law.code, law_name: law.name,
          detail: `ยืนยันเพิ่มทั้งที่ระบบเตือนว่าอาจซ้ำกับ ${dup.law.code} (คล้าย ${Math.round(dup.sim * 100)}%)` })
      }
      setNewLaw(law); setStep(2)
    } catch (e) { toast('เพิ่มเข้าทะเบียนไม่สำเร็จ: ' + e.message) }
    finally { setSaving(false) }
  }

  return (
    <>
      <div className="scrim" style={{zIndex:300}} onClick={onClose}/>
      <div className="modal" style={{zIndex:301,width:620,maxHeight:'88vh',overflow:'auto'}}>
        <div className="modal-head">
          <h3>{step===1 ? 'เพิ่มกฎหมายเข้าทะเบียน · ผู้รับผิดชอบ' : 'แนบไฟล์กฎหมาย'}</h3>
          <button className="close" onClick={onClose}><I n="x"/></button>
        </div>

        {step===1 && (
          <div className="modal-body">
            {/* P15·T1 · แบนเนอร์เตือนตรวจกับต้นฉบับ — เฉพาะโหมด prefill (มาจาก AI สรุปกฎหมาย) */}
            {isPrefill && (
              <div style={{background:'var(--review-bg)',color:'var(--review)',borderRadius:9,padding:'11px 14px',marginBottom:12,fontSize:12.5,lineHeight:1.5,display:'flex',gap:8,alignItems:'flex-start'}}>
                <span style={{fontSize:16,lineHeight:1}}>⚠️</span>
                <div style={{flex:1}}>
                  <b>ตรวจกับต้นฉบับก่อนบันทึก</b>
                  <div style={{marginTop:2}}>ข้อมูลชุดนี้มาจาก AI สรุปกฎหมาย — โปรดตรวจทานชื่อ เลขประกาศ วันที่ และข้อกำหนด กับราชกิจจานุเบกษาต้นฉบับก่อนบันทึกเข้าทะเบียน</div>
                  <div style={{marginTop:8}}>
                    {srcUrl
                      ? <button type="button" className="btn btn-ghost" style={{padding:'4px 10px',fontSize:12}} onClick={()=>window.open(srcUrl,'_blank','noopener')}>เปิดต้นฉบับ (PDF) ↗</button>
                      : <span style={{opacity:.75,fontStyle:'italic'}}>ไม่มีลิงก์ต้นฉบับแนบมา — ค้นราชกิจจาฯ ด้วยชื่อกฎหมายก่อนบันทึก</span>}
                  </div>
                  <label style={{display:'flex',gap:8,alignItems:'center',marginTop:10,cursor:'pointer',fontWeight:500}}>
                    <input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)}/>
                    ฉันได้ตรวจทานข้อมูลกับต้นฉบับแล้ว
                  </label>
                </div>
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div>
                <label className="form-label">ผู้รับผิดชอบ / ผู้ติดตาม <span style={{color:'var(--bad)'}}>*</span></label>
                <input className="form-input" placeholder="พิมพ์ชื่อผู้รับผิดชอบ/ผู้ติดตาม…" value={owner} onChange={e=>setOwner(e.target.value)}/>
              </div>
              <div>
                <label className="form-label">วันที่บันทึก</label>
                <input className="form-input" type="text" value={nowLabel} readOnly disabled title="บันทึกเวลาจริงอัตโนมัติ"/>
              </div>
            </div>

            {!initialData && (<>
            <label className="form-label" style={{marginTop:12}}>กฎหมายที่ค้นหา/สรุปมาแล้ว</label>
            {loadingDisc && <div style={{fontSize:12.5,color:'var(--ink-faint)',padding:'8px 0'}}>กำลังโหลด…</div>}
            {!loadingDisc && discovered.length===0 && (
              <div className="panel" style={{padding:'16px',textAlign:'center',color:'var(--ink-faint)',fontSize:13}}>
                ไม่มีกฎหมายที่ออกมาล่าสุด
                <div style={{fontSize:11.5,marginTop:4}}>ค้นหาล่าสุดเมื่อ {lastSearched ? thDate(lastSearched) : '—'}</div>
              </div>
            )}
            {!loadingDisc && discovered.map(d=>(
              <div key={d.id} className={'disc-row'+(selId===d.id?' sel':'')}
                style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',border:'1px solid '+(selId===d.id?'var(--brand)':'var(--line)'),borderRadius:8,marginBottom:6,cursor:'pointer',background:selId===d.id?'var(--brand-tint)':'transparent'}}
                onClick={()=>pick(d)}>
                <input type="radio" checked={selId===d.id} onChange={()=>pick(d)}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600}}>{(d.law_name||'').slice(0,80)}</div>
                  <div style={{fontSize:11.5,color:'var(--ink-faint)'}}>{d.ministry||'—'}{d.source?' · '+d.source:''}{d.announced_date?' · ประกาศ '+d.announced_date:''}</div>
                </div>
                <button className="btn btn-ghost" style={{padding:'3px 9px',fontSize:11}} onClick={e=>{e.stopPropagation();removeDiscovered(d)}}>ลบ</button>
              </div>
            ))}
            <button type="button" className={'btn btn-ghost'+(selId==='manual'?' active':'')} style={{marginTop:2}} onClick={pickManual}>
              <I n="plus"/>กรอกกฎหมายเอง (ไม่ได้มาจากการค้นหา)
            </button>
            </>)}

            {selId && (<div style={{marginTop:14,borderTop:'1px solid var(--line-soft)',paddingTop:12}}>
              <div style={{background:'var(--brand-tint)',border:'1px solid var(--brand)',borderRadius:9,padding:'10px 16px',marginBottom:10,display:'flex',alignItems:'center',gap:12}}>
                <span style={{fontSize:12,color:'var(--brand)',fontWeight:600}}>เลขทะเบียนที่จะได้รับ</span>
                <span className="num" style={{fontSize:22,fontWeight:700,color:'var(--brand)',letterSpacing:-1,marginLeft:'auto'}}>{previewCode}</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div>
                  <label className="form-label">หมวด <span style={{color:'var(--bad)'}}>*</span></label>
                  <select className="form-input" value={cat} onChange={e=>setCat(e.target.value)}>
                    {cats.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">ลำดับชั้น</label>
                  <select className="form-input" value={level} onChange={e=>setLevel(e.target.value)}>
                    {LAW_TYPES.map(t=><option key={t.level} value={t.level}>ชั้น {t.level} — {t.label}</option>)}
                  </select>
                </div>
              </div>
              <label className="form-label">ชื่อกฎหมาย <span style={{color:'var(--bad)'}}>*</span></label>
              <textarea className="form-input" rows={2} value={name} onChange={e=>changeName(e.target.value)}/>
              <label className="form-label">กระทรวง / หน่วยงาน</label>
              <input className="form-input" type="text" value={ministry} onChange={e=>setMinistry(e.target.value)}/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><label className="form-label">วันที่ประกาศ</label><input className="form-input" type="text" value={announce} onChange={e=>setAnnounce(e.target.value)}/></div>
                <div><label className="form-label">วันที่บังคับใช้</label><input className="form-input" type="text" value={effective} onChange={e=>setEffective(e.target.value)}/></div>
              </div>
              <label className="form-label">เอกสารที่เกี่ยวข้อง</label>
              <input className="form-input" type="text" value={docList} onChange={e=>setDocList(e.target.value)}/>
              <label className="form-label">สาระสำคัญ / ข้อกำหนด (1 ข้อ ต่อบรรทัด)</label>
              <textarea className="form-input" rows={4} placeholder="เช่น จัดให้มี จป.วิชาชีพ…" value={reqText} onChange={e=>setReqText(e.target.value)}/>
            </div>)}

            {dup && dup.blocked && (
              <div style={{marginTop:12,padding:'11px 14px',borderRadius:9,background:'color-mix(in srgb,var(--bad) 9%,transparent)',border:'1px solid var(--bad)',fontSize:12.5}}>
                <b style={{color:'var(--bad)'}}>⛔ กฎหมายนี้อยู่ในทะเบียนแล้ว ({dup.law.code})</b>
                <div style={{color:'var(--ink-soft)',marginTop:3}}>“{(dup.law.name||'').slice(0,70)}” — แก้ชื่อให้ต่างออกไป หรือยกเลิก</div>
              </div>
            )}
            {dup && !dup.blocked && (
              <div style={{marginTop:12,padding:'11px 14px',borderRadius:9,background:'color-mix(in srgb,var(--review) 12%,transparent)',border:'1px solid var(--review)',fontSize:12.5}}>
                <b style={{color:'var(--review)'}}>⚠️ {dup.type==='amendment'
                  ? `อาจเป็นฉบับแก้ไขเพิ่มเติมของ ${dup.law.code}`
                  : `อาจซ้ำกับ ${dup.law.code} (คล้าย ${Math.round(dup.sim*100)}%)`}</b>
                <div style={{color:'var(--ink-soft)',margin:'3px 0 8px'}}>“{(dup.law.name||'').slice(0,70)}” — ยืนยันเพิ่มต่อหรือไม่?</div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn btn-ghost" style={{padding:'5px 12px',fontSize:12}} onClick={()=>{ setDup(null); setDupConfirmed(false) }}>ยกเลิก</button>
                  <button className="btn btn-primary" style={{padding:'5px 12px',fontSize:12}} onClick={()=>{ setDupConfirmed(true); submit(true) }}>ยืนยันเพิ่มต่อ</button>
                </div>
              </div>
            )}
            <div className="modal-foot" style={{marginTop:14}}>
              <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
              <button className="btn btn-primary" disabled={!valid||saving||!!dup} onClick={()=>submit(false)}>
                {saving ? 'กำลังบันทึก…' : <><I n="check"/>เพิ่มเข้าทะเบียน ({previewCode})</>}
              </button>
            </div>
          </div>
        )}

        {step===2 && (
          <div className="modal-body">
            <div className="panel" style={{padding:'12px 16px',marginBottom:12,borderLeft:'3px solid var(--ok)'}}>
              <div style={{fontWeight:600,fontSize:14}}>✓ เพิ่ม {newLaw?.code} เข้าทะเบียนแล้ว</div>
              <div style={{fontSize:12,color:'var(--ink-faint)'}}>สถานะ: รอประเมิน · แนบไฟล์กฎหมาย/เอกสารได้ที่นี่</div>
            </div>
            <label className="form-label">ไฟล์แนบ (กฎหมาย + เอกสารที่เกี่ยวข้อง)</label>
            {newLaw?.id && <Attachments refType="law" refId={newLaw.id}/>}
            <div className="modal-foot" style={{marginTop:14}}>
              <button className="btn btn-primary" onClick={()=>{ onClose(); onDone && onDone(newLaw) }}>เสร็จสิ้น</button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
