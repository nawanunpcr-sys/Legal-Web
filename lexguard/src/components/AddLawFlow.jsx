// Workflow A · Process 1 — เพิ่มกฎหมายใหม่เข้าทะเบียน (ผู้ตรวจสอบ / Owner).
// 2-step wizard:
//   1) เลือกผู้ตรวจ + เลือกกฎหมายจากรายการที่ AI ค้นหา (หรือกรอกเอง) + หมวด + เลขรัน
//      → Submit สร้างกฎหมายเข้าทะเบียน (status รอประเมิน) + เปิด tracker case
//   2) แนบไฟล์กฎหมาย/เอกสารที่เกี่ยวข้อง → เสร็จสิ้น
import { useState, useEffect, useMemo } from 'react'
import { LAW_TYPES, fetchDiscoveredLaws, deleteDiscoveredLaw, logActivity } from '../lib/supabase.js'
import Attachments from './Attachments.jsx'
import { I } from './icons.jsx'
import { nextCode, thDate, findLawDuplicate, beToISO, isoToBE, isFreeformDate } from '../lib/ui.jsx'
import { toast } from '../lib/toast.js'
import { confirmDialog } from '../lib/confirm.js'

// P20b · ประเภทกฎหมาย (law_type) — ตัวเลือกในฟอร์ม
const LAW_TYPE_OPTIONS = ['พ.ร.บ.', 'พ.ร.ก.', 'พ.ร.ฎ.', 'กฎกระทรวง', 'ประกาศ', 'ระเบียบ', 'คำสั่ง', 'อื่นๆ']
// map ค่า type ที่ AI ส่งมา (เช่น "พระราชบัญญัติ", "ประกาศกระทรวง…") → ตัวเลือกในฟอร์ม
function mapLawType(t) {
  const s = String(t || '')
  if (/พระราชบัญญัติ|พ\.?ร\.?บ/.test(s)) return 'พ.ร.บ.'
  if (/พระราชกำหนด|พ\.?ร\.?ก/.test(s)) return 'พ.ร.ก.'
  if (/พระราชกฤษฎีกา|พ\.?ร\.?ฎ/.test(s)) return 'พ.ร.ฎ.'
  if (/กฎกระทรวง/.test(s)) return 'กฎกระทรวง'
  if (/ประกาศ/.test(s)) return 'ประกาศ'
  if (/ระเบียบ/.test(s)) return 'ระเบียบ'
  if (/คำสั่ง/.test(s)) return 'คำสั่ง'
  return s ? 'อื่นๆ' : ''
}

// Skill 3 · ชื่อกฎหมายเต็มยาวเกินกว่าจะใส่ใน badge — ตัดให้สั้น เก็บชื่อเต็มไว้ใน title
// (สไตล์เดียวกับ ReqRow ใน LawSummary.jsx เพื่อให้ผู้ใช้เห็นต่อเนื่องจากหน้าสรุปถึงหน้ายืนยัน)
const shortLaw = n => { const s = String(n || '').trim(); return s.length > 30 ? s.slice(0, 30) + '…' : s }

// summary jsonb → [{text}] (รองรับ array ของ string หรือ object)
function summaryToReqs(summary) {
  if (!summary) return []
  const arr = Array.isArray(summary) ? summary : (Array.isArray(summary.items) ? summary.items : [])
  return arr.map(it => typeof it === 'string' ? it : (it.text || it.detail || it.section || JSON.stringify(it)))
    .filter(Boolean)
}

// P20 · ช่องวันที่ = date picker (เก็บลงฐานเป็น วว/ดด/ปปปป พ.ศ.)
//   ถ้าค่าเดิมแปลงเป็น date ไม่ได้ (freeform) → fallback เป็นช่องข้อความ + ไอคอนเตือน (ไม่ crash)
function DateField({ label, value, onChange }) {
  const freeform = isFreeformDate(value)
  return (
    <div>
      <label className="form-label">
        {label}
        {freeform && <span title="รูปแบบวันที่เดิมไม่มาตรฐาน — พิมพ์แก้เป็นวันที่ปกติเพื่อใช้ตัวเลือกปฏิทิน" style={{ color: 'var(--warn)', marginLeft: 5, cursor: 'help' }}>⚠</span>}
      </label>
      {freeform
        ? <input className="form-input" type="text" value={value} onChange={e => onChange(e.target.value)} title="รูปแบบเดิมไม่ใช่ วว/ดด/ปปปป — จะเก็บตามที่พิมพ์" />
        : <input className="form-input" type="date" value={beToISO(value)} onChange={e => onChange(isoToBE(e.target.value))} />}
    </div>
  )
}

export default function AddLawFlow({ cats, allLaws, suggest = {}, initialData = null, onCreate, onClose, onDone }) {
  const [step, setStep] = useState(1)
  const [owner, setOwner] = useState('')
  const [discovered, setDiscovered] = useState([])
  const [loadingDisc, setLoadingDisc] = useState(true)
  // 'prefill' = มาจากหน้าสรุปกฎหมาย (P12) · 'manual' = กรอกเอง · uuid = เลือกจากคิว
  const [selId, setSelId] = useState(initialData ? 'prefill' : null)
  const il = initialData?.law || {}
  const [cat, setCat] = useState(il.cat || cats[0]?.code || 'LA')
  const [level, setLevel] = useState('4')
  const [name, setName] = useState(il.name || '')
  const [ministry, setMinistry] = useState(il.ministry || '')
  const [announce, setAnnounce] = useState(il.announce_date || '')
  const [effective, setEffective] = useState(il.effective_date || '')
  const [docList, setDocList] = useState(il.documents || '')
  // P18 · แต่ละข้อปฏิบัติเก็บโครงสร้าง + ผลประเมิน inline (choice: null|'met'|'unmet'|'waiting')
  // Skill 3 · ที่มา (from_*) ต้องพกต่อจากหน้าสรุปกฎหมายจนถึงตอนบันทึกลง lg_requirements
  //   ไม่งั้นผู้ตรวจ ISO เปิด F-259 แล้วเจอข้อที่ไม่มีในตัวบทของกฎหมายฉบับนั้น โดยหาที่มาไม่ได้
  const [reqRows, setReqRows] = useState(() => (initialData?.requirements || []).map(q => ({
    text: `${q.section_ref ? q.section_ref + ': ' : ''}${q.req_text || ''}`.trim(),
    choice: null, responsible: q.responsible || '', waitDate: '',
    frequency: q.frequency || '', documents: q.documents || '',
    from_related_law: q.from_related_law || null,
    from_law_url: q.from_law_url || '',
    from_law_confidence: q.from_law_confidence || '',
    from_law_note: q.from_law_note || '',
  })).filter(r => r.text))
  const [saving, setSaving] = useState(false)
  const [newLaw, setNewLaw] = useState(null)
  const [dup, setDup] = useState(null)               // Task 9: { type:'exact'|'amendment'|'fuzzy', law, sim, blocked? }
  const [dupConfirmed, setDupConfirmed] = useState(false)
  // P15·T1 · โหมด prefill (มาจาก AI สรุปกฎหมาย) → บังคับตรวจทานกับต้นฉบับก่อนบันทึก
  const isPrefill = !!initialData
  const srcUrl = initialData?.law?.source_url || initialData?.source_url || ''
  const [verified, setVerified] = useState(false)
  // P20b · แหล่งที่มา (ลิงก์ตัวบท) + ประเภทกฎหมาย — แสดงตลอด · P20f · ลิงก์ไม่บังคับ (ถ้ามี)
  const [sourceUrl, setSourceUrl] = useState(srcUrl)
  const [lawType, setLawType] = useState(mapLawType(il.type))
  const srcValid = /^https?:\/\//i.test(sourceUrl.trim())
  // P20 · ย่อฟอร์ม: ข้อมูลเพิ่มเติม (ลำดับชั้น/กระทรวง/วันที่/เอกสาร) พับไว้ — กางอัตโนมัติถ้า prefill มีข้อมูล
  const [advOpen, setAdvOpen] = useState(() => !!(il.ministry || il.announce_date || il.effective_date || il.documents))

  // ชื่อเปลี่ยน → ล้างสถานะการเตือนซ้ำ เพื่อเช็คใหม่
  function changeName(v) { setName(v); setDup(null); setDupConfirmed(false) }

  // ── P18 · จัดการรายการข้อปฏิบัติ + ผลประเมิน inline ──────────────────────────
  const emptyRow = () => ({ text: '', choice: null, responsible: '', waitDate: '', frequency: '', documents: '',
    from_related_law: null, from_law_url: '', from_law_confidence: '', from_law_note: '' })
  const textToRows = texts => texts.map(t => ({ ...emptyRow(), text: t }))
  const setRow = (i, patch) => setReqRows(rs => rs.map((r, j) => j === i ? { ...r, ...patch } : r))
  const addRow = () => setReqRows(rs => [...rs, emptyRow()])
  const delRow = i => setReqRows(rs => rs.filter((_, j) => j !== i))
  const setAllChoice = choice => setReqRows(rs => rs.map(r => r.text.trim() ? { ...r, choice } : r))
  const activeRows = reqRows.filter(r => r.text.trim())
  const chosenCount = activeRows.filter(r => r.choice).length
  const allChosen = activeRows.every(r => r.choice)
  const waitingOk = activeRows.filter(r => r.choice === 'waiting').every(r => r.responsible.trim())
  // P20c · datalist ผู้รับผิดชอบ = แผนกจาก lg_departments (มาก่อน) + ชื่อที่ทีมเคยพิมพ์ไว้ (ไม่ให้หาย) — dedupe คงลำดับ
  const respOptions = [...new Set([...(suggest.departments || []), ...(suggest.responsibles || [])].filter(Boolean))]

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
    setReqRows(textToRows(summaryToReqs(d.summary)))
  }
  function pickManual() {
    setSelId('manual'); setDup(null); setDupConfirmed(false)
    setName(''); setMinistry(''); setAnnounce(''); setEffective(''); setDocList(''); setReqRows([emptyRow()])
  }
  async function removeDiscovered(d) {
    if (!(await confirmDialog(`ลบ "${(d.law_name||'').slice(0,40)}" ออกจากรายการ?`, { danger: true }))) return
    try { await deleteDiscoveredLaw(d.id); setDiscovered(prev => prev.filter(x => x.id !== d.id)); if (selId === d.id) setSelId(null) }
    catch (e) { toast('ลบไม่สำเร็จ: ' + e.message) }
  }

  // P15·T1 · prefill ต้องติ๊กยืนยันตรวจทานก่อน · P18 · ทุกข้อต้องเลือกผลประเมิน + ข้อที่ "รอ" ต้องมีผู้รับผิดชอบ
  const valid = owner.trim() && selId && cat && name.trim() && (!isPrefill || verified) && allChosen && waitingOk

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
      // P18 · ส่งผลประเมินรายข้อที่ผู้ใช้เลือก (choice) ให้ createLawFull แปลงเป็น met/unmet + evaluated_at
      const reqs = activeRows.map(r => ({
        text: r.text.trim(), choice: r.choice,
        responsible: r.responsible.trim(), waitDate: r.waitDate || '',
        frequency: r.frequency || '', documents: r.documents || '',
        // Skill 3 · ที่มาของข้อ — ส่งต่อให้ createLawFull เขียนลง lg_requirements (mig 036)
        from_related_law: r.from_related_law || null,
        from_law_url: r.from_law_url || '',
        from_law_confidence: r.from_law_confidence || '',
      }))
      const { law } = await onCreate({
        lawFields: { code: previewCode, cat, name: name.trim(), hierarchy_level: level, law_type: lawType || null, ministry,
          announce_date: announce, effective_date: effective, doc_list: docList,
          responsible: owner.trim() || null,   // P20b · ผู้รับผิดชอบระดับกฎหมาย (เดิมไม่เคยเขียน)
          source_url: srcValid ? sourceUrl.trim() : null },
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
                  <div style={{marginTop:2}}>ข้อมูลชุดนี้มาจาก AI สรุปกฎหมาย — โปรดตรวจทานชื่อ เลขประกาศ วันที่ และข้อปฏิบัติ กับราชกิจจานุเบกษาต้นฉบับก่อนบันทึกเข้าทะเบียน</div>
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
            {/* P20c · datalist ผู้รับผิดชอบ (แผนก + ชื่อเดิม) — render ครั้งเดียว ใช้ร่วมทั้งช่อง owner และช่อง waiting */}
            <datalist id="lg-resp-suggest">{respOptions.map(x=><option key={x} value={x}/>)}</datalist>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div>
                <label className="form-label">ผู้รับผิดชอบ / ผู้ติดตาม <span style={{color:'var(--bad)'}}>*</span></label>
                <input className="form-input" list="lg-resp-suggest" placeholder="พิมพ์ชื่อผู้รับผิดชอบ/แผนก…" value={owner} onChange={e=>setOwner(e.target.value)}/>
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
              {/* แสดงตลอด: หมวด · ชื่อกฎหมาย */}
              <label className="form-label">หมวด <span style={{color:'var(--bad)'}}>*</span></label>
              <select className="form-input" value={cat} onChange={e=>setCat(e.target.value)}>
                {cats.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
              </select>
              <label className="form-label">ชื่อกฎหมาย <span style={{color:'var(--bad)'}}>*</span></label>
              <textarea className="form-input" rows={2} value={name} onChange={e=>changeName(e.target.value)}/>

              {/* P20b · ประเภทกฎหมาย — แสดงตลอด */}
              <label className="form-label">ประเภทกฎหมาย</label>
              <select className="form-input" value={lawType} onChange={e=>setLawType(e.target.value)}>
                <option value="">— เลือกประเภท —</option>
                {LAW_TYPE_OPTIONS.map(t=><option key={t} value={t}>{t}</option>)}
              </select>

              {/* P20f · ลิงก์แหล่งที่มา (ตัวบทจริง) — ไม่บังคับ (ถ้ามี) */}
              <label className="form-label">ลิงก์แหล่งที่มา (ราชกิจจานุเบกษา / ตัวบท) <span style={{color:'var(--ink-faint)',fontWeight:400}}>(ถ้ามี)</span></label>
              <input className="form-input" type="url" placeholder="https://ratchakitcha.soc.go.th/…"
                value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)}/>
              {sourceUrl.trim() && !srcValid && (
                <div style={{fontSize:11.5,color:'var(--warn)',marginTop:3}}>ลิงก์ควรขึ้นต้นด้วย http:// หรือ https:// (ถ้ารูปแบบไม่ถูก จะไม่ถูกบันทึก)</div>
              )}

              {/* P20 · ข้อมูลเพิ่มเติม (ไม่บังคับ) — พับไว้ */}
              <button type="button" onClick={()=>setAdvOpen(o=>!o)}
                style={{display:'flex',alignItems:'center',gap:6,width:'100%',background:'none',border:'none',cursor:'pointer',padding:'10px 0 4px',color:'var(--ink-soft)',fontSize:12.5,fontWeight:600}}>
                <span style={{display:'inline-flex',transition:'transform .18s ease',transform:advOpen?'rotate(90deg)':'none'}}><I n="chevron"/></span>
                ข้อมูลเพิ่มเติม (ไม่บังคับ)
                <span style={{marginLeft:'auto',color:'var(--ink-faint)',fontWeight:400}}>ลำดับชั้น · กระทรวง · วันที่ · เอกสาร</span>
              </button>
              {advOpen && (<div style={{borderLeft:'2px solid var(--line)',paddingLeft:12,marginBottom:4}}>
                <label className="form-label" style={{marginTop:4}}>ลำดับชั้น</label>
                <select className="form-input" value={level} onChange={e=>setLevel(e.target.value)}>
                  {LAW_TYPES.map(t=><option key={t.level} value={t.level}>ชั้น {t.level} — {t.label}</option>)}
                </select>
                <label className="form-label">กระทรวง / หน่วยงาน</label>
                <input className="form-input" type="text" value={ministry} onChange={e=>setMinistry(e.target.value)}/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  <DateField label="วันที่ประกาศ" value={announce} onChange={setAnnounce}/>
                  <DateField label="วันที่บังคับใช้" value={effective} onChange={setEffective}/>
                </div>
                <label className="form-label">เอกสารที่เกี่ยวข้อง</label>
                <input className="form-input" type="text" value={docList} onChange={e=>setDocList(e.target.value)}/>
              </div>)}

              {/* P18 · ข้อปฏิบัติ + ประเมินรายข้อในบรรทัดเดียว */}
              <div style={{display:'flex',alignItems:'center',gap:10,marginTop:12,flexWrap:'wrap'}}>
                <label className="form-label" style={{margin:0}}>สาระสำคัญ / ข้อปฏิบัติ · ประเมินรายข้อ <span style={{color:'var(--bad)'}}>*</span></label>
                {activeRows.length>0 && <span style={{fontSize:11.5,color:allChosen?'var(--ok)':'var(--ink-faint)',marginLeft:'auto'}}>เลือกแล้ว {chosenCount} จาก {activeRows.length} ข้อ</span>}
              </div>
              {activeRows.length>1 && (
                <div style={{display:'flex',gap:8,margin:'2px 0 8px',fontSize:11.5}}>
                  <span style={{color:'var(--ink-faint)'}}>ตั้งทั้งหมด:</span>
                  <button type="button" className="req-bulk" onClick={()=>setAllChoice('met')}>สอดคล้องทั้งหมด</button>
                  <button type="button" className="req-bulk" onClick={()=>setAllChoice('waiting')}>รอผู้เกี่ยวข้องทั้งหมด</button>
                </div>
              )}
              {reqRows.map((r,i)=>(
                <div key={i} className="req-row" style={{border:'1px solid var(--line)',borderRadius:9,padding:'9px 10px',marginBottom:8}}>
                  <div style={{display:'flex',gap:8,alignItems:'flex-start'}}>
                    <span style={{fontSize:12,color:'var(--ink-faint)',paddingTop:8,minWidth:18}} className="num">{i+1}.</span>
                    <textarea className="form-input" rows={2} style={{margin:0,flex:1}} placeholder="เช่น จัดให้มี จป.วิชาชีพ…" value={r.text} onChange={e=>setRow(i,{text:e.target.value})}/>
                    <button type="button" className="btn btn-ghost" style={{padding:'4px 8px',fontSize:11}} title="ลบข้อนี้" onClick={()=>delRow(i)}>✕</button>
                  </div>
                  {/* Skill 3 · ข้อที่ดึงมาจากกฎหมายที่ถูกอ้างถึง — เปิดตัวบทตรวจเองได้ + เตือนข้อที่ยังไม่ยืนยัน */}
                  {r.from_related_law && (
                    <div style={{marginLeft:26,marginTop:6,display:'flex',gap:6,alignItems:'center',flexWrap:'wrap'}}>
                      {r.from_law_url ? (
                        <a href={r.from_law_url} target="_blank" rel="noreferrer" title={`เปิดตัวบท: ${r.from_related_law}`} style={{
                          display:'inline-block',fontSize:11,lineHeight:1.5,padding:'1px 7px',borderRadius:999,
                          background:'var(--line)',color:'var(--ink-soft)',textDecoration:'none',whiteSpace:'nowrap',
                        }}>จาก {shortLaw(r.from_related_law)} ↗</a>
                      ) : (
                        <span title={r.from_related_law} style={{
                          display:'inline-block',fontSize:11,lineHeight:1.5,padding:'1px 7px',borderRadius:999,
                          background:'var(--line)',color:'var(--ink-faint)',whiteSpace:'nowrap',
                        }}>จาก {shortLaw(r.from_related_law)}</span>
                      )}
                      {r.from_law_confidence && r.from_law_confidence !== 'high' && (
                        <span title={r.from_law_note || 'ยังยืนยันตัวบทได้ไม่ครบ ควรเปิดกฎหมายต้นทางตรวจเอง'} style={{
                          display:'inline-block',fontSize:11,lineHeight:1.5,padding:'1px 7px',borderRadius:999,
                          background:'var(--warn-bg)',color:'var(--warn)',whiteSpace:'nowrap',cursor:'help',
                        }}>⚠ ควรตรวจตัวบทเอง</span>
                      )}
                    </div>
                  )}
                  {r.text.trim() && (
                    <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:8,paddingLeft:26}}>
                      <button type="button" className={'req-choice met'+(r.choice==='met'?' on':'')} title="ประเมินแล้ว: สอดคล้อง" onClick={()=>setRow(i,{choice:'met'})}>สอดคล้อง</button>
                      <button type="button" className={'req-choice unmet'+(r.choice==='unmet'?' on':'')} title="ประเมินแล้ว: ไม่สอดคล้อง (NC)" onClick={()=>setRow(i,{choice:'unmet'})}>ไม่สอดคล้อง</button>
                      <button type="button" className={'req-choice wait'+(r.choice==='waiting'?' on':'')} title="รอผู้เกี่ยวข้องประเมิน (ยังไม่ตัดสินความสอดคล้อง)" onClick={()=>setRow(i,{choice:'waiting'})}>
                        <span className="req-choice-full">รอผู้เกี่ยวข้องประเมิน</span><span className="req-choice-short">รอผู้เกี่ยวข้อง</span>
                      </button>
                    </div>
                  )}
                  {r.text.trim() && r.choice==='waiting' && (
                    <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:8,marginTop:8,paddingLeft:26}}>
                      <div>
                        <label className="form-label" style={{marginTop:0}}>ผู้รับผิดชอบ <span style={{color:'var(--bad)'}}>*</span></label>
                        <input className="form-input" list="lg-resp-suggest" placeholder="พิมพ์ชื่อผู้รับผิดชอบ/แผนก…" value={r.responsible} onChange={e=>setRow(i,{responsible:e.target.value})}/>
                      </div>
                      <div>
                        <label className="form-label" style={{marginTop:0}}>วันที่ต้องการคำตอบ</label>
                        <input className="form-input" type="date" value={r.waitDate} onChange={e=>setRow(i,{waitDate:e.target.value})}/>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button type="button" className="btn btn-ghost" style={{padding:'5px 12px',fontSize:12.5}} onClick={addRow}><I n="plus"/>เพิ่มข้อปฏิบัติ</button>
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
            <div className="modal-foot" style={{marginTop:14,alignItems:'center'}}>
              {selId && !allChosen && <span style={{fontSize:11.5,color:'var(--ink-faint)',marginRight:'auto'}}>เลือกผลประเมินให้ครบทุกข้อก่อนบันทึก ({chosenCount}/{activeRows.length})</span>}
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
              <div style={{fontWeight:600,fontSize:14}}>✓ เพิ่ม {newLaw?.code} เข้าทะเบียนพร้อมผลประเมินแล้ว</div>
              <div style={{fontSize:12,color:'var(--ink-faint)'}}>บันทึกผลประเมินรายข้อเรียบร้อย · แนบไฟล์กฎหมาย/เอกสารได้ที่นี่</div>
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
