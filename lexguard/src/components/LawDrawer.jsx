import { useEffect, useState } from 'react'
import { STATUS, LAW_STATUS, REPEAL_CONFIDENCE, uploadEvidence, updateRequirementField, fetchReviewLog, addReviewLog, updateLawField } from '../lib/supabase.js'
import { useAuth, NO_PERM, currentUserName } from '../lib/auth.js'
import { toast } from '../lib/toast.js'
import { daysTo, reqStats, reqKind, reqEvalTitle } from '../lib/ui.jsx'
import { REQ_STATUS, WAITING_STATUS, reasonRequired } from '../lib/supabase.js'
import { RELEVANCE, relevanceOf, confirmRelevance } from '../lib/supabase.js'
import { fetchActionGuide, fetchLawEvidence, matchEvidence, EMPTY_GUIDE,
         createPlansFromMissingEvidence, fetchPlansByLaw } from '../lib/supabase.js'
import { fetchSuggestions, recordSuggestionDecision, humanAssessed, runPreassess } from '../lib/supabase.js'
import { fetchLawOverview, runLawOverview } from '../lib/supabase.js'
import { callAi, useAiAction } from '../lib/aiAction.js'
import ReqStatusPicker from './ReqStatusPicker.jsx'
import { I } from './icons.jsx'
import DeleteLawModal from './DeleteLawModal.jsx'
import RepealDetails from './RepealDetails.jsx'
import { buildLawReport } from './PdfExport.jsx'

const REVIEW_RESULTS = ['ไม่มีการเปลี่ยนแปลง', 'มีการแก้ไข', 'ถูกยกเลิก']

// Skill 3 · ชื่อกฎหมายเต็มยาวเกินกว่าจะใส่ใน badge — ตัดให้สั้น เก็บชื่อเต็มไว้ใน title
const shortLaw = n => { const s = String(n || '').trim(); return s.length > 30 ? s.slice(0, 30) + '…' : s }

function ReviewModal({ law, onSave, onClose }){
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [reviewer, setReviewer] = useState('')
  const [result, setResult] = useState(REVIEW_RESULTS[0])
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const valid = date && result
  async function save(){
    if(!valid) return
    setBusy(true)
    try { await onSave({ review_date:date, reviewer, result, note }) }
    finally { setBusy(false) }
  }
  return (
    <>
      <div className="scrim" style={{zIndex:400}} onClick={onClose}/>
      <div className="modal" style={{zIndex:401}}>
        <div className="modal-head">
          <h3>บันทึกการทบทวน — {law.code}</h3>
          <button className="close" onClick={onClose}><I n="x"/></button>
        </div>
        <div className="modal-body">
          <label className="form-label">วันที่ทบทวน <span style={{color:'var(--bad)'}}>*</span></label>
          <input className="form-input" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
          <label className="form-label">ผู้ทบทวน</label>
          <input className="form-input" type="text" placeholder="ชื่อผู้ทบทวน…" value={reviewer} onChange={e=>setReviewer(e.target.value)}/>
          <label className="form-label">ผลการทบทวน <span style={{color:'var(--bad)'}}>*</span></label>
          <select className="form-input" value={result} onChange={e=>setResult(e.target.value)}>
            {REVIEW_RESULTS.map(r=><option key={r} value={r}>{r}</option>)}
          </select>
          <label className="form-label">หมายเหตุ</label>
          <textarea className="form-input" rows={3} placeholder="รายละเอียดการทบทวน (ถ้ามี)…" value={note} onChange={e=>setNote(e.target.value)} style={{resize:'vertical'}}/>
          <p style={{fontSize:11.5,color:'var(--ink-faint)',marginTop:10}}>เมื่อบันทึกแล้ว ระบบจะเลื่อนรอบทบทวนถัดไปเป็น +1 ปีอัตโนมัติ</p>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" disabled={!valid||busy} onClick={save}>{busy?'กำลังบันทึก…':'บันทึกการทบทวน'}</button>
        </div>
      </div>
    </>
  )
}

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
          <button className="close" onClick={onClose}><I n="x"/></button>
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

/* ══ P22 ขั้นที่ 1 · แผงผลคัดกรองความเกี่ยวข้อง ═══════════════════════════════

   กติกาที่แผงนี้ต้องรักษาไว้:
   · ผลของ AI เป็น "ข้อเสนอ" เท่านั้น — จนกว่าจะมีคนกดยืนยัน หน้าจอต้องบอกชัดว่ายังไม่คัดกรอง
   · เห็นต่างจาก AI ต้องเขียนเหตุผล (บังคับทั้งที่นี่และที่ CHECK ในฐานข้อมูล)
   · ยืนยันว่า "ไม่เกี่ยวข้อง" แล้ว **ห้ามตั้งข้อปฏิบัติเป็น not_applicable ให้อัตโนมัติ**
     (กติกา 9.2) — แสดงลิงก์พาไปประเมินรายข้อด้วยมือแทน                                    */
function RelevancePanel({ law, rel, onChanged }) {
  const { can } = useAuth()
  const ai = useAiAction()
  const [mode, setMode] = useState(null)          // null | 'disagree'
  const [pick, setPick] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const final = relevanceOf(rel)                  // เป็น 'unscreened' จนกว่าคนจะยืนยัน
  const hasAi = !!rel?.suggested_at
  const confirmed = !!rel?.confirmed_verdict
  const overrode = confirmed && rel.confirmed_verdict !== rel.verdict

  async function screen() {
    const r = await ai.run('screen', async () => {
      await callAi('/api/law-screen', { law_id: law.id })
      toast('คัดกรองแล้ว — เป็นข้อเสนอของ AI ยังไม่มีผลจนกว่าจะยืนยัน', 'success')
      onChanged && onChanged()
    }, { errorPrefix: 'คัดกรองไม่สำเร็จ' })
    return r
  }

  async function confirm(verdict, why = '') {
    if (saving) return
    setSaving(true)
    try {
      await confirmRelevance(law.id, verdict, why)
      toast('บันทึกผลคัดกรองแล้ว', 'success')
      setMode(null); setNote(''); setPick('')
      onChanged && onChanged()
    } catch (e) { toast('บันทึกไม่สำเร็จ: ' + e.message) }
    setSaving(false)
  }

  return (
    <div className="sec">
      <div className="sec-t">ความเกี่ยวข้องกับกิจการ</div>
      <div className="panel" style={{ padding: 18 }}>
        {/* สถานะปัจจุบัน — มีข้อความกำกับเสมอ ไม่ใช้สีสื่อความหมายอย่างเดียว */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span className={'pill ' + (RELEVANCE[final]?.cls || '')}>{RELEVANCE[final]?.label || final}</span>
          {confirmed && (
            <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
              ยืนยันโดย {rel.confirmed_by}{rel.confirmed_at ? ' · ' + new Date(rel.confirmed_at).toLocaleDateString('th-TH') : ''}
            </span>
          )}
          {!confirmed && hasAi && (
            <span style={{ fontSize: 12, color: 'var(--warn)' }}>ยังไม่มีใครยืนยัน — ข้อเสนอของ AI ยังไม่มีผลต่อทะเบียน</span>
          )}
        </div>

        {/* ข้อเสนอของ AI */}
        {hasAi && (
          <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 8, background: 'var(--surface-2)',
            border: '1px solid var(--line)' }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-faint)', marginBottom: 6 }}>
              ข้อเสนอของ AI{rel.confidence != null ? ` · ความมั่นใจ ${Math.round(rel.confidence * 100)}%` : ''}
            </div>
            <div style={{ fontSize: 13, marginBottom: 6 }}>
              <b>{RELEVANCE[rel.verdict]?.label || rel.verdict}</b>
            </div>
            <div style={{ fontSize: 12.5, lineHeight: 1.7, color: 'var(--ink-soft)' }}>{rel.reason || '—'}</div>
            {Array.isArray(rel.needs_info) && rel.needs_info.length > 0 && (
              <div style={{ marginTop: 9, fontSize: 12, lineHeight: 1.7 }}>
                <b style={{ color: 'var(--warn)' }}>ต้องเพิ่มข้อมูลในบริบทองค์กร:</b>
                <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
                  {rel.needs_info.map((s, i) => <li key={i}>{typeof s === 'string' ? s : JSON.stringify(s)}</li>)}
                </ul>
              </div>
            )}
            {Array.isArray(rel.matched_keys) && rel.matched_keys.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--ink-faint)' }}>
                ตัดสินจากข้อมูล: {rel.matched_keys.join(' · ')}
              </div>
            )}
            {overrode && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line-soft)', fontSize: 12.5, lineHeight: 1.7 }}>
                <b>เจ้าหน้าที่เห็นต่าง</b> — ตัดสินเป็น “{RELEVANCE[rel.confirmed_verdict]?.label}”
                <div style={{ color: 'var(--ink-soft)', marginTop: 3 }}>เหตุผล: {rel.confirm_note}</div>
              </div>
            )}
          </div>
        )}

        {/* ยังไม่เคยคัดกรอง */}
        {!hasAi && (
          <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.7, marginTop: 12 }}>
            ยังไม่เคยคัดกรองฉบับนี้ — กดปุ่มด้านล่างให้ AI เทียบเงื่อนไขการใช้บังคับในตัวบทกับบริบทองค์กรที่ตั้งไว้
            แล้วเสนอผลมาให้เจ้าหน้าที่ตัดสิน
          </p>
        )}

        {/* ปุ่มจัดการ */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" disabled={ai.busy || !can('edit')} title={can('edit') ? '' : NO_PERM}
            onClick={screen}>
            {ai.isBusy('screen') ? 'กำลังคัดกรอง…' : (hasAi ? 'ให้ AI คัดกรองใหม่' : 'ให้ AI คัดกรอง')}
          </button>
          {hasAi && !confirmed && can('edit') && mode !== 'disagree' && (
            <>
              <button className="btn btn-primary" disabled={saving} onClick={() => confirm(rel.verdict)}>
                ยืนยันตามข้อเสนอ ({RELEVANCE[rel.verdict]?.short})
              </button>
              <button className="btn btn-ghost" disabled={saving} onClick={() => { setMode('disagree'); setPick('') }}>
                ไม่เห็นด้วย
              </button>
            </>
          )}
          {confirmed && can('edit') && mode !== 'disagree' && (
            <button className="btn btn-ghost" disabled={saving} onClick={() => { setMode('disagree'); setPick('') }}>
              แก้ไขผลที่ยืนยันไว้
            </button>
          )}
        </div>

        {/* ฟอร์มเห็นต่าง — เลือกผลเอง + เหตุผลบังคับกรอกเมื่อต่างจากที่ AI เสนอ */}
        {mode === 'disagree' && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
            <label className="form-label">ผลที่เจ้าหน้าที่ตัดสิน</label>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 10 }}>
              {['relevant', 'not_relevant', 'uncertain'].map(v => (
                <span key={v} className={'chip' + (pick === v ? ' active' : '')} style={{ cursor: 'pointer' }}
                  onClick={() => setPick(v)}>{RELEVANCE[v].label}</span>
              ))}
            </div>
            <label className="form-label">
              เหตุผล{pick && pick !== rel?.verdict ? ' (บังคับกรอก — ต่างจากที่ AI เสนอ)' : ''}
            </label>
            <textarea className="form-input" rows={3} style={{ marginTop: 0, resize: 'vertical' }}
              placeholder="เช่น กสทช. แจ้งเป็นหนังสือว่าบริษัทไม่อยู่ในรายชื่อหน่วยงาน CII จึงไม่เข้าข่ายตามมาตรา…"
              value={note} onChange={e => setNote(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary"
                disabled={saving || !pick || (pick !== rel?.verdict && !note.trim())}
                onClick={() => confirm(pick, note)}>{saving ? 'กำลังบันทึก…' : 'บันทึกผล'}</button>
              <button className="btn btn-ghost" disabled={saving}
                onClick={() => { setMode(null); setNote(''); setPick('') }}>ยกเลิก</button>
            </div>
          </div>
        )}

        {/* ยืนยันว่าไม่เกี่ยวข้องแล้ว — บอกขั้นตอนถัดไป แต่ไม่ทำให้เอง */}
        {final === 'not_relevant' && (
          <div style={{ marginTop: 14, padding: '10px 13px', borderRadius: 7, background: 'var(--warn-bg)',
            color: 'var(--warn)', fontSize: 12.5, lineHeight: 1.7 }}>
            ฉบับนี้ถูกยืนยันว่าไม่เกี่ยวข้องกับกิจการ — ข้อปฏิบัติทั้ง {law.reqs.length} ข้อ<b>ยังคงสถานะเดิมไว้ทุกข้อ</b>
            ระบบไม่เปลี่ยนให้อัตโนมัติ ถ้าต้องการตั้งเป็น “ไม่เกี่ยวข้อง” ให้เลื่อนลงไปเปลี่ยนทีละข้อพร้อมระบุเหตุผล
            เพื่อให้ตอบผู้ตรวจได้ว่าใครเป็นคนตัดสินและด้วยเหตุใด
          </div>
        )}
      </div>
    </div>
  )
}

/* ══ P22 ขั้นที่ 2 · แผง "สิ่งที่ต้องทำ" ══════════════════════════════════════

   ข้อเสนอแนะข้อ 2 · ทะเบียนบอกว่ากฎหมาย "เขียนว่าอะไร" อยู่แล้ว แต่ไม่เคยบอกว่า
   "แล้วเราต้องทำอะไร" หน้านี้คือคำตอบนั้น แบ่ง 3 ส่วนตามที่ผู้ประเมินขอมา

   ทุกบรรทัดมี section_ref ชี้กลับข้อกำหนดต้นทาง — กดแล้วเลื่อนไปที่ข้อนั้นในหน้าเดียวกัน
   บรรทัดที่ AI ตอบมาโดยไม่มี section_ref ถูกทิ้งตั้งแต่ฝั่ง server แล้ว                */
const GUIDE_TABS = [
  ['actions',   'องค์กรต้องดำเนินการ'],
  ['documents', 'เอกสารที่ต้องจัดทำ'],
  ['evidence',  'หลักฐานที่ต้องเก็บไว้ให้ผู้ตรวจ'],
]

function SecRef({ refText }) {
  if (!refText) return null
  return (
    <span className="meta-chip" style={{ fontSize: 10.5, whiteSpace: 'nowrap' }}
      title="ที่มาของบรรทัดนี้ — อ้างอิงข้อกำหนดในทะเบียน">ที่มา: {refText}</span>
  )
}

function ActionGuidePanel({ law, onPlansCreated }) {
  const { can } = useAuth()
  const ai = useAiAction()
  const [row, setRow] = useState(undefined)   // undefined = กำลังโหลด · null = ยังไม่เคยสร้าง
  const [files, setFiles] = useState([])
  const [plans, setPlans] = useState([])
  const [tab, setTab] = useState('actions')
  const [making, setMaking] = useState(false)

  async function load() {
    const [g, f, pl] = await Promise.all([
      fetchActionGuide(law.id), fetchLawEvidence(law.id), fetchPlansByLaw(law.id),
    ])
    setRow(g); setFiles(f); setPlans(pl)
  }
  useEffect(() => { let live = true
    Promise.all([fetchActionGuide(law.id), fetchLawEvidence(law.id), fetchPlansByLaw(law.id)])
      .then(([g, f, pl]) => { if (live) { setRow(g); setFiles(f); setPlans(pl) } })
      .catch(() => { if (live) setRow(null) })
    return () => { live = false }
  }, [law.id])

  const guide = row?.guide || EMPTY_GUIDE
  const stale = row && row.req_count != null && row.req_count !== law.reqs.length
  const evidenceRows = matchEvidence(guide.evidence || [], files)
  const missing = evidenceRows.filter(e => !e.has)
  const planTexts = new Set(plans.map(p => String(p.plan_text || '')))

  function build() {
    return ai.run('guide', async () => {
      await callAi('/api/law-action-guide', { law_id: law.id, by: currentUserName() })
      await load()
      toast('สร้างรายการสิ่งที่ต้องทำแล้ว', 'success')
    }, { errorPrefix: 'สร้างไม่สำเร็จ' })
  }

  async function makePlans() {
    if (making || !missing.length) return
    setMaking(true)
    try {
      const todo = missing.filter(m => !planTexts.has(`จัดทำ/รวบรวมหลักฐาน: ${m.name}` + (m.section_ref ? ` (อ้างอิง ${m.section_ref})` : '')))
      if (!todo.length) { toast('รายการที่ยังไม่มีหลักฐานมีแผนปรับปรุงครบแล้ว'); setMaking(false); return }
      const r = await createPlansFromMissingEvidence(law, todo)
      setPlans(await fetchPlansByLaw(law.id))
      toast(`สร้างแผนปรับปรุง ${r.created} รายการ`, 'success')
      onPlansCreated && onPlansCreated()
    } catch (e) { toast('สร้างแผนไม่สำเร็จ: ' + e.message) }
    setMaking(false)
  }

  if (row === undefined) return (
    <div className="sec"><div className="sec-t">สิ่งที่ต้องทำ</div>
      <div className="panel" style={{ padding: 18, fontSize: 13, color: 'var(--ink-faint)' }}>กำลังโหลด…</div></div>
  )

  return (
    <div className="sec">
      <div className="sec-t">สิ่งที่ต้องทำ</div>
      <div className="panel" style={{ padding: 18 }}>
        {/* ยังไม่เคยสร้าง — หน้าว่างที่บอกวิธีสร้าง ไม่ใช่หน้าเปล่า */}
        {!row && (
          <>
            <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.75, marginTop: 0 }}>
              ยังไม่เคยสรุปว่ากฎหมายฉบับนี้ทำให้องค์กร<b>ต้องทำอะไร</b> ต้อง<b>จัดทำเอกสารใด</b>
              และต้อง<b>เก็บหลักฐานใด</b>ไว้ให้ผู้ตรวจ — กดปุ่มด้านล่างเพื่อให้ AI แปลงข้อกำหนดทั้ง {law.reqs.length} ข้อ
              เป็นรายการที่หยิบไปปฏิบัติได้ ทุกบรรทัดจะอ้างกลับไปยังข้อกำหนดต้นทางเสมอ
            </p>
            {!law.reqs.length && (
              <div style={{ padding: '9px 12px', borderRadius: 7, background: 'var(--warn-bg)', color: 'var(--warn)',
                fontSize: 12.5, lineHeight: 1.65, marginBottom: 12 }}>
                ฉบับนี้ยังไม่มีข้อกำหนดในทะเบียน — ต้องให้ AI สรุปกฎหมายก่อน จึงจะสร้างรายการนี้ได้
              </div>
            )}
          </>
        )}

        {row && (
          <>
            {stale && (
              <div style={{ padding: '9px 12px', borderRadius: 7, background: 'var(--warn-bg)', color: 'var(--warn)',
                fontSize: 12.5, lineHeight: 1.65, marginBottom: 12 }}>
                ข้อกำหนดเปลี่ยนไปหลังสร้างรายการนี้ (ตอนสร้างมี {row.req_count} ข้อ ตอนนี้มี {law.reqs.length} ข้อ)
                — ควรกดสร้างใหม่เพื่อให้ตรงกับทะเบียนปัจจุบัน
              </div>
            )}

            <div className="seg" style={{ marginBottom: 14 }}>
              {GUIDE_TABS.map(([k, label]) => (
                <button key={k} className={'seg-btn' + (tab === k ? ' active' : '')} onClick={() => setTab(k)}>
                  {label} ({(guide[k] || []).length})
                </button>
              ))}
            </div>

            {/* (ก) องค์กรต้องดำเนินการอะไร */}
            {tab === 'actions' && (
              (guide.actions || []).length === 0
                ? <p style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>ตัวบทฉบับนี้ไม่ได้สร้างหน้าที่ที่ต้องลงมือทำให้องค์กร (เช่น เป็นบทนิยามหรือบทกำหนดอำนาจของราชการ)</p>
                : (guide.actions || []).map((a, i) => (
                  <div key={i} className="impr-row">
                    <div className="impr-dot" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.6 }}>{i + 1}. {a.what}</div>
                      <div style={{ display: 'flex', gap: 7, marginTop: 5, flexWrap: 'wrap' }}>
                        {a.who && <span className="meta-chip">ผู้รับผิดชอบ: {a.who}</span>}
                        {a.frequency && <span className="meta-chip">ความถี่: {a.frequency}</span>}
                        {a.deadline && <span className="meta-chip">กำหนด: {a.deadline}</span>}
                        <SecRef refText={a.section_ref} />
                      </div>
                    </div>
                  </div>
                ))
            )}

            {/* (ข) เอกสาร/แบบฟอร์มที่ต้องจัดทำ */}
            {tab === 'documents' && (
              (guide.documents || []).length === 0
                ? <p style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>ตัวบทไม่ได้กำหนดให้จัดทำเอกสารใดเป็นการเฉพาะ</p>
                : (guide.documents || []).map((d, i) => (
                  <div key={i} className="impr-row">
                    <div className="impr-dot" />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.6 }}>{d.name}</div>
                      {d.purpose && <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 3, lineHeight: 1.6 }}>{d.purpose}</div>}
                      <div style={{ display: 'flex', gap: 7, marginTop: 5, flexWrap: 'wrap' }}>
                        {d.who_keeps && <span className="meta-chip">ผู้เก็บรักษา: {d.who_keeps}</span>}
                        <SecRef refText={d.section_ref} />
                      </div>
                    </div>
                  </div>
                ))
            )}

            {/* (ค) หลักฐาน — เทียบกับไฟล์จริงที่แนบไว้ในระบบ */}
            {tab === 'evidence' && (<>
              {evidenceRows.length === 0
                ? <p style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>ตัวบทไม่ได้ระบุหลักฐานที่ต้องเก็บไว้เป็นการเฉพาะ</p>
                : <>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 10, lineHeight: 1.65 }}>
                    แนบแล้ว {evidenceRows.length - missing.length} จาก {evidenceRows.length} รายการ
                    — การจับคู่ใช้ชื่อไฟล์เป็นเกณฑ์ จึงเป็นเพียงข้อสันนิษฐาน กรุณาเปิดไฟล์ตรวจสอบเองก่อนใช้ตอบผู้ตรวจ
                  </div>
                  {evidenceRows.map((e, i) => (
                    <div key={i} className="impr-row">
                      <div className="impr-dot" style={{ background: e.has ? 'var(--ok)' : 'var(--bad)' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.6 }}>{e.name}</div>
                        {e.why_auditor_asks && <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 3, lineHeight: 1.6 }}>
                          ผู้ตรวจขอดูเพื่อ: {e.why_auditor_asks}</div>}
                        <div style={{ display: 'flex', gap: 7, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                          <span className={'pill ' + (e.has ? 'p-ok' : 'p-bad')} style={{ fontSize: 10.5 }}>
                            {e.has ? 'แนบแล้ว' : 'ยังไม่มีหลักฐาน'}
                          </span>
                          {e.file && <a href={e.file.url} target="_blank" rel="noreferrer"
                            style={{ fontSize: 11.5, color: 'var(--brand)' }}>{e.file.name} ↗</a>}
                          <SecRef refText={e.section_ref} />
                        </div>
                      </div>
                    </div>
                  ))}
                  {missing.length > 0 && can('edit') && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                      <button className="btn btn-primary" disabled={making} onClick={makePlans}>
                        {making ? 'กำลังสร้าง…' : `สร้างแผนปรับปรุงจากรายการที่ยังไม่มีหลักฐาน (${missing.length})`}
                      </button>
                      <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 8, lineHeight: 1.6 }}>
                        สร้างเป็นแผนใหม่ในหน้า “แผนปรับปรุง” — ไม่เปลี่ยนสถานะข้อปฏิบัติใดทั้งสิ้น
                      </p>
                    </div>
                  )}
                </>}
            </>)}

            {/* สิ่งที่ตัวบทไม่ได้กำหนด — องค์กรต้องกำหนดเอง */}
            {(guide.not_specified || []).length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-faint)', marginBottom: 7 }}>
                  ตัวบทไม่ได้กำหนด — องค์กรต้องกำหนดเอง
                </div>
                {(guide.not_specified || []).map((n, i) => (
                  <div key={i} style={{ fontSize: 12.5, lineHeight: 1.7, marginBottom: 5 }}>
                    · {n.item}{n.what_missing ? ` — ${n.what_missing}` : ''}
                    {n.section_ref ? <span style={{ color: 'var(--ink-faint)' }}> ({n.section_ref})</span> : null}
                  </div>
                ))}
              </div>
            )}

            <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 14, lineHeight: 1.6 }}>
              สรุปจากข้อกำหนด {row.req_count} ข้อ · {row.generated_by || 'ระบบ'} ·
              {row.generated_at ? ' ' + new Date(row.generated_at).toLocaleString('th-TH') : ''}
              {' '}— เป็นผลจาก AI ยังไม่ผ่านการทวนสอบ กรุณาตรวจก่อนใช้อ้างอิงกับผู้ตรวจ
            </p>
          </>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" disabled={ai.busy || !can('edit') || !law.reqs.length}
            title={can('edit') ? '' : NO_PERM} onClick={build}>
            {ai.isBusy('guide') ? 'กำลังสรุป…' : (row ? 'สร้างใหม่' : 'สร้างรายการสิ่งที่ต้องทำ')}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ══ P22 ขั้นที่ 3 · การ์ดข้อเสนอสถานะจาก AI ═════════════════════════════════

   วางเหนือปุ่มเลือกสถานะ · **ค่าเริ่มต้นต้องไม่ถูกเลือกไว้ล่วงหน้า** เพราะการเลือกไว้ให้
   คือการเปลี่ยนคำถามจาก "คุณประเมินว่าอย่างไร" เป็น "คุณจะแย้ง AI ไหม"
   ซึ่งเป็นคนละคำถามและได้คำตอบที่แย่กว่า

   ข้อที่มีคนประเมินไว้แล้ว (evaluated_by ไม่ว่าง) แสดงแบบอ่านอย่างเดียว ไม่มีปุ่มให้กดทับ */
function SuggestionCard({ req, sugg, onUse, disabled }) {
  if (!sugg) return null
  const st = REQ_STATUS[sugg.suggested_status]
  if (!st) return null
  const locked = humanAssessed(req)
  const decided = sugg.accepted !== null && sugg.accepted !== undefined

  return (
    <div style={{ marginTop: 9, padding: '11px 13px', borderRadius: 8,
      background: 'var(--surface-2)', border: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)' }}>AI เสนอ</span>
        <span className={'pill ' + st.cls} style={{ fontSize: 10.5 }}>{st.code} — {st.label}</span>
        {sugg.confidence != null && (
          <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>ความมั่นใจ {Math.round(sugg.confidence * 100)}%</span>
        )}
        {decided && (
          <span style={{ fontSize: 11, color: sugg.accepted ? 'var(--ok)' : 'var(--ink-faint)' }}>
            {sugg.accepted ? '· ผู้ประเมินใช้ข้อเสนอนี้' : '· ผู้ประเมินตัดสินเอง'}
            {sugg.decided_by ? ` (${sugg.decided_by})` : ''}
          </span>
        )}
      </div>

      <div style={{ fontSize: 12.5, lineHeight: 1.7, color: 'var(--ink-soft)', marginTop: 6 }}>{sugg.reason || '—'}</div>

      {Array.isArray(sugg.evidence_needed) && sugg.evidence_needed.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.7 }}>
          <b style={{ color: 'var(--warn)' }}>หลักฐานที่ยังต้องการ:</b>
          <ul style={{ margin: '3px 0 0', paddingLeft: 18 }}>
            {sugg.evidence_needed.map((s, i) => <li key={i}>{typeof s === 'string' ? s : JSON.stringify(s)}</li>)}
          </ul>
        </div>
      )}

      {locked ? (
        <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 8, lineHeight: 1.6 }}>
          ข้อนี้มีผู้ประเมินบันทึกไว้แล้ว ({req.evaluated_by}) — ข้อเสนอแสดงเพื่อประกอบการพิจารณาเท่านั้น
          ระบบจะไม่เสนอให้เขียนทับผลที่คนประเมินไว้
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-ghost" style={{ padding: '4px 11px', fontSize: 12 }}
            disabled={disabled} onClick={() => onUse(sugg)}>
            ใช้ข้อเสนอนี้
          </button>
          <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>
            หรือเลือกสถานะเองด้านล่าง — ระบบบันทึกทุกครั้งว่ารับหรือไม่รับข้อเสนอ เพื่อวัดความแม่นย้อนหลัง
          </span>
        </div>
      )}
    </div>
  )
}

/* ══ P22 ขั้นที่ 5 · สรุปภาพรวมทั้งฉบับ ═══════════════════════════════════════

   ข้อเสนอแนะข้อ 5 · ทะเบียนเก็บสาระสำคัญ "รายมาตรา" ซึ่งอ่านแยกกันแล้วใจความไม่จบ
   ส่วนนี้ประกอบมันกลับเข้าด้วยกัน และที่สำคัญที่สุดคือ read_together
   ซึ่งบอกตรงๆ ว่าเรื่องไหนอ่านมาตราเดียวแล้วจะพลาด

   วางเป็นส่วนแรกของหน้า พับเก็บได้ แล้วจึงตามด้วยรายละเอียดรายข้อเดิมที่ไม่ถูกแตะเลย */
function OverviewPanel({ law }) {
  const { can } = useAuth()
  const ai = useAiAction()
  const [row, setRow] = useState(undefined)   // undefined = กำลังโหลด · null = ยังไม่มี
  const [open, setOpen] = useState(true)

  useEffect(() => { let live = true
    fetchLawOverview(law.id).then(d => { if (live) setRow(d) }).catch(() => { if (live) setRow(null) })
    return () => { live = false }
  }, [law.id])

  const ov = row?.overview || null
  const stale = ov?.req_count != null && ov.req_count !== law.reqs.length

  function build() {
    return ai.run('ov', async () => {
      await runLawOverview(law.id)
      setRow(await fetchLawOverview(law.id))
      toast('สรุปภาพรวมแล้ว — ข้อปฏิบัติรายข้อไม่ถูกแตะ', 'success')
    }, { errorPrefix: 'สรุปภาพรวมไม่สำเร็จ' })
  }

  if (row === undefined) return null

  return (
    <div className="sec">
      <div className="sec-t" style={{ cursor: ov ? 'pointer' : 'default' }} onClick={() => ov && setOpen(o => !o)}>
        ภาพรวมทั้งฉบับ
        {ov && <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--brand)', fontWeight: 500 }}>
          {open ? 'ย่อ ▲' : 'ขยาย ▼'}
        </span>}
      </div>
      <div className="panel" style={{ padding: 18 }}>
        {!ov && (
          <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.75, marginTop: 0 }}>
            ยังไม่มีสรุปภาพรวมของฉบับนี้ — ทะเบียนเก็บสาระสำคัญไว้รายมาตรา ซึ่งอ่านแยกกันแล้วใจความมักไม่จบ
            กดปุ่มด้านล่างเพื่อให้ AI ประกอบทั้งฉบับเข้าด้วยกัน พร้อมระบุว่าเรื่องใดต้องอ่านหลายมาตราประกอบกัน
            {!law.reqs.length && <><br /><b style={{ color: 'var(--warn)' }}>ฉบับนี้ยังไม่มีข้อกำหนดในทะเบียน — สรุปภาพรวมไม่ได้</b></>}
          </p>
        )}

        {ov && open && (<>
          {stale && (
            <div style={{ padding: '9px 12px', borderRadius: 7, background: 'var(--warn-bg)', color: 'var(--warn)',
              fontSize: 12.5, lineHeight: 1.65, marginBottom: 12 }}>
              ข้อกำหนดเปลี่ยนไปหลังสร้างสรุปนี้ (ตอนสร้างมี {ov.req_count} ข้อ ตอนนี้มี {law.reqs.length} ข้อ) — ควรสร้างใหม่
            </div>
          )}

          <div style={{ fontSize: 13.5, lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>{ov.gist}</div>

          {ov.who_must_comply && (
            <div style={{ marginTop: 12, fontSize: 12.5, lineHeight: 1.7 }}>
              <b>ใครต้องปฏิบัติตาม:</b> {ov.who_must_comply}
            </div>
          )}

          {/* หน้าที่จัดกลุ่มตามเรื่อง ไม่ใช่ตามเลขมาตรา */}
          {(ov.duty_groups || []).length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-faint)', marginBottom: 7 }}>
                หน้าที่ตามกฎหมาย จัดกลุ่มตามเรื่อง ({ov.duty_groups.length} กลุ่ม)
              </div>
              {ov.duty_groups.map((g, i) => (
                <div key={i} className="impr-row">
                  <div className="impr-dot" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.55 }}>{g.title}</div>
                    {g.summary && <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 3, lineHeight: 1.7 }}>{g.summary}</div>}
                    {(g.section_refs || []).length > 0 && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                        {g.section_refs.map((s, k) => <span key={k} className="meta-chip" style={{ fontSize: 10.5 }}>{s}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── หัวใจของข้อเสนอแนะข้อ 5 ── */}
          {(ov.read_together || []).length > 0 && (
            <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 8,
              background: 'var(--accent-tint, var(--surface-2))', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, marginBottom: 8 }}>
                เรื่องที่ต้องอ่านหลายมาตราประกอบกัน ({ov.read_together.length} เรื่อง)
              </div>
              {ov.read_together.map((x, i) => (
                <div key={i} style={{ marginBottom: 11 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{x.topic}</div>
                  <div style={{ display: 'flex', gap: 6, margin: '4px 0', flexWrap: 'wrap' }}>
                    {(x.section_refs || []).map((s, k) => <span key={k} className="meta-chip" style={{ fontSize: 10.5 }}>{s}</span>)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.7 }}>{x.why}</div>
                </div>
              ))}
            </div>
          )}

          <dl className="kv" style={{ marginTop: 14 }}>
            <dt>บทกำหนดโทษ</dt><dd style={{ fontSize: 12.5, lineHeight: 1.7 }}>{ov.penalty || 'ตัวบทไม่ได้กำหนด'}</dd>
            <dt>การมีผลใช้บังคับ</dt><dd style={{ fontSize: 12.5, lineHeight: 1.7 }}>{ov.effective_note || 'ตัวบทไม่ได้กำหนด'}</dd>
          </dl>

          <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 12, lineHeight: 1.6 }}>
            สรุปจากข้อกำหนด {ov.req_count} ข้อ
            {ov.generated_at ? ' · ' + new Date(ov.generated_at).toLocaleString('th-TH') : ''}
            {' '}— เป็นผลจาก AI ยังไม่ผ่านการทวนสอบ ใช้เพื่อทำความเข้าใจ ไม่ใช้แทนตัวบท
          </p>
        </>)}

        <div style={{ display: 'flex', gap: 8, marginTop: ov ? 12 : 0, flexWrap: 'wrap' }}>
          <button className="btn btn-ghost" disabled={ai.busy || !can('edit') || !law.reqs.length}
            title={can('edit') ? 'เติมเฉพาะส่วนภาพรวม — ข้อปฏิบัติรายข้อไม่ถูกแตะ' : NO_PERM} onClick={build}>
            {ai.isBusy('ov') ? 'กำลังสรุป…' : (ov ? 'สร้างสรุปภาพรวมใหม่' : 'สร้างสรุปภาพรวม')}
          </button>
        </div>
      </div>
    </div>
  )
}

const EMPTY_NEW_REQ = { text:'', responsible:'', frequency:'', documents:'', choice:'waiting', statusReason:'', waitDate:'' }

export default function LawDrawer({ law, catMap, settings, onClose, onToggle, onAddReq, onRepeal, onRestore, onDuplicate, onToggleActive, onDelete, thDate, relevance, onRelevanceChanged, onPlansCreated }){
  const { can } = useAuth()
  const inactive = law.active === false
  const [showRepealModal, setShowRepealModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviews, setReviews] = useState([])
  const [evOverrides, setEvOverrides] = useState({})   // { reqId: {evidence_url, evidence_label} } — fresh uploads
  const [reqOverrides, setReqOverrides] = useState({}) // { reqId: {text, responsible, frequency, documents} } — inline edits
  const [editingId, setEditingId] = useState(null)     // req id ที่กำลังแก้ไข
  const [editForm, setEditForm] = useState({ text:'', responsible:'', frequency:'', documents:'' })
  const [savingReq, setSavingReq] = useState(false)
  // P21 · ตัวแก้สถานะรายข้อ — เดิมเป็นปุ่มสลับ 2 ทาง ซึ่งใช้กับ 4 สถานะไม่ได้
  // และ Ack/ไม่เกี่ยวข้อง ต้องมีที่ให้กรอกเหตุผลก่อนบันทึก จึงต้องเป็นแผงเลือกที่กางออกมา
  const [statusEditId, setStatusEditId] = useState(null)
  const [statusDraft, setStatusDraft]   = useState({ choice:'', reason:'' })
  const [savingStatus, setSavingStatus] = useState(false)
  // P22 ขั้นที่ 3 · ข้อเสนอสถานะจาก AI ต่อข้อ { [requirement_id]: suggestion }
  const [suggs, setSuggs] = useState({})
  const preassess = useAiAction()
  const [addingReq, setAddingReq] = useState(false)   // เปิดฟอร์ม "เพิ่มข้อปฏิบัติ"
  const [newReq, setNewReq] = useState(EMPTY_NEW_REQ)
  const [savingNew, setSavingNew] = useState(false)
  const [reviewDate, setReviewDate] = useState(law.review_date)
  const [reportDue, setReportDue] = useState(law.report_due_date || '')
  const [uploadingReq, setUploadingReq] = useState(null)
  const isRepealed = law.status === 'repealed' || law.law_status === 'repealed'
  // P21 ส่วนที่ 2 · กล่องข้อมูลการยกเลิก แสดงเมื่อสถานะการบังคับใช้ไม่ใช่ "ยังบังคับใช้"
  const lawSt = law.law_status || 'in_force'
  const showRepealBox = lawSt !== 'in_force'
  const repealVerified = !!law.repeal_verified_by
  const cat = catMap?.[law.cat]
  const summary = law.reqs.slice(0,3).map(r=>r.text).join(' ').slice(0,280)

  useEffect(()=>{
    setEvOverrides({}); setReqOverrides({}); setEditingId(null); setStatusEditId(null)
    setAddingReq(false); setNewReq(EMPTY_NEW_REQ)
    setReviewDate(law.review_date); setReportDue(law.report_due_date || '')
    let alive = true
    fetchReviewLog(law.id).then(r=>{ if(alive) setReviews(r) }).catch(()=>{})
    fetchSuggestions(law.id).then(s=>{ if(alive) setSuggs(s) }).catch(()=>{})
    return ()=>{ alive = false }
  }, [law.id])   // eslint-disable-line react-hooks/exhaustive-deps

  function handleRepealConfirm(data){
    setShowRepealModal(false)
    onRepeal(law, data)
  }

  async function attachEvidence(req, file){
    if(!file) return
    setUploadingReq(req.id)
    try{
      const url = await uploadEvidence(file)
      const label = file.name
      await updateRequirementField(req.id, { evidence_url:url, evidence_label:label })
      setEvOverrides(prev=>({ ...prev, [req.id]:{ evidence_url:url, evidence_label:label } }))
    }catch(e){ toast('แนบหลักฐานไม่สำเร็จ: '+e.message) }
    setUploadingReq(null)
  }

  function startEdit(r){
    const ov = reqOverrides[r.id] || {}
    setEditForm({
      text:        ov.text        ?? r.text        ?? '',
      responsible: ov.responsible ?? r.responsible ?? '',
      frequency:   ov.frequency   ?? r.frequency   ?? '',
      documents:   ov.documents   ?? r.documents   ?? '',
    })
    setEditingId(r.id)
  }
  async function saveEdit(r){
    if(savingReq) return
    const patch = {
      text:        editForm.text.trim(),
      responsible: editForm.responsible.trim() || null,
      frequency:   editForm.frequency.trim()   || null,
      documents:   editForm.documents.trim()   || null,
    }
    if(!patch.text){ toast('ข้อความข้อปฏิบัติห้ามว่าง'); return }
    setSavingReq(true)
    try{
      await updateRequirementField(r.id, patch)
      setReqOverrides(prev=>({ ...prev, [r.id]: patch }))
      const idx = law.reqs.findIndex(x=>x.id===r.id)   // keep local copy in sync (prog/summary)
      if(idx>=0) law.reqs[idx] = { ...law.reqs[idx], ...patch }
      setEditingId(null)
      toast('บันทึกข้อปฏิบัติแล้ว','success')
    }catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message) }
    finally{ setSavingReq(false) }
  }

  function startStatusEdit(r){
    setEditingId(null)
    setStatusEditId(r.id)
    const k = reqKind(r)
    setStatusDraft({ choice: REQ_STATUS[k] ? k : '', reason: r.status_reason || '' })
  }
  async function saveStatus(r){
    if(savingStatus) return
    const { choice, reason } = statusDraft
    if(!REQ_STATUS[choice]){ toast('เลือกสถานะก่อนบันทึก'); return }
    if(reasonRequired(choice) && !reason.trim()){ toast(`สถานะ "${REQ_STATUS[choice].label}" ต้องระบุเหตุผลประกอบ`); return }
    setSavingStatus(true)
    try{
      await onToggle(law, r, choice, reason.trim())
      // P22 ขั้นที่ 3 · บันทึกว่าผู้ประเมินรับข้อเสนอของ AI หรือไม่ (ใช้วัดความแม่นย้อนหลัง)
      // ทำหลังบันทึกสถานะจริงเสมอ และล้มแล้วไม่ทำให้การประเมินล้มตาม
      const sg = suggs[r.id]
      if(sg && (sg.accepted===null || sg.accepted===undefined)){
        await recordSuggestionDecision(sg.id, choice)
        setSuggs(m=>({ ...m, [r.id]: { ...sg, accepted: choice===sg.suggested_status, decided_status: choice } }))
      }
      setStatusEditId(null)
      toast('บันทึกผลการประเมินแล้ว','success')
    }catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message) }
    finally{ setSavingStatus(false) }
  }

  async function saveNewReq(){
    if(savingNew) return
    if(!newReq.text.trim()){ toast('ข้อความข้อปฏิบัติห้ามว่าง'); return }
    if(newReq.choice==='waiting' && !newReq.responsible.trim()){ toast('ระบุผู้รับผิดชอบที่ต้องประเมินข้อนี้'); return }
    if(reasonRequired(newReq.choice) && !newReq.statusReason.trim()){
      toast(`สถานะ "${REQ_STATUS[newReq.choice].label}" ต้องระบุเหตุผลประกอบ`); return }
    setSavingNew(true)
    try{
      await onAddReq(law, newReq)
      setNewReq(EMPTY_NEW_REQ); setAddingReq(false)
      toast('เพิ่มข้อปฏิบัติแล้ว','success')
    }catch(e){ toast('เพิ่มข้อปฏิบัติไม่สำเร็จ: '+e.message) }
    finally{ setSavingNew(false) }
  }

  async function saveReportDue(v){
    setReportDue(v)
    try{ await updateLawField(law.id, { report_due_date: v || null }); law.report_due_date = v || null
      toast(v?'บันทึกวันครบกำหนดส่งรายงานแล้ว':'ล้างวันครบกำหนดแล้ว','success') }
    catch(e){ toast('บันทึกไม่สำเร็จ: '+e.message) }
  }

  async function handleSaveReview(data){
    try{
      const row = await addReviewLog(law.id, data)
      setReviews(prev=>[row, ...prev])
      // advance next review date +1 year from the review date
      const base = data.review_date ? new Date(data.review_date) : new Date()
      base.setFullYear(base.getFullYear()+1)
      const next = base.toISOString().slice(0,10)
      await updateLawField(law.id, { review_date: next })
      setReviewDate(next)
      setShowReviewModal(false)
      toast('บันทึกการทบทวนแล้ว','success')
    }catch(e){ toast('บันทึกการทบทวนไม่สำเร็จ: '+e.message) }
  }

  return (
    <>
      <div className="scrim" onClick={onClose}/>
      <div className="lawmodal">
        <div className="dr-head">
          <button className="close" onClick={onClose}><I n="x"/></button>
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
            <span>{law.reqs.length} ข้อปฏิบัติ</span>
            {law.law_type && <span>{law.law_type}</span>}
          </div>
          {law.source_url && (
            <a className="btn btn-ghost" href={law.source_url} target="_blank" rel="noreferrer"
              style={{marginTop:10,padding:'5px 12px',fontSize:12.5}} title={law.source_url}>📄 เปิดตัวบท (PDF)</a>
          )}
        </div>
        <div className="dr-body">
          <OverviewPanel law={law} />

          {/* P21 ส่วนที่ 2 · กล่องข้อมูลการยกเลิก
              แสดงทุกสถานะที่ไม่ใช่ "ยังบังคับใช้" ไม่ใช่เฉพาะที่ยกเลิกทั้งฉบับ
              เพราะ "ยกเลิกบางส่วน" และ "แก้ไขเพิ่มเติม" คือกรณีที่ผู้ใช้ต้องรู้รายละเอียดมากที่สุด
              (ส่วนที่เหลือยังต้องปฏิบัติอยู่ ต่างจากยกเลิกทั้งฉบับที่จบไปเลย) */}
          {/* P22 ขั้นที่ 6 · ใช้คอมโพเนนต์เดียวกับหน้า "กฎหมายที่ยกเลิก"
              เดิมสองหน้าเขียนรายการฟิลด์แยกกัน ผลคือหน้าหนึ่งแสดงครบ อีกหน้าตกหล่น
              โดยไม่มีใครสังเกต · รวมเป็นที่เดียวแล้วแก้ครั้งเดียวได้ผลทั้งคู่ */}
          {showRepealBox && (
            <div className="sec">
              <div className="sec-t">สถานะการบังคับใช้</div>
              <div className="panel" style={{padding:18}}>
                <RepealDetails law={law}/>
                {Array.isArray(law.repeal_sources) && law.repeal_sources.length>0 && (
                  <div style={{marginTop:12,paddingTop:10,borderTop:'1px solid var(--line-soft)'}}>
                    <div style={{fontSize:11.5,fontWeight:700,color:'var(--ink-faint)',marginBottom:5}}>แหล่งอ้างอิงที่ตรวจ</div>
                    <ul style={{margin:0,paddingLeft:18}}>
                      {law.repeal_sources.map((u,i)=>(
                        <li key={i} style={{marginBottom:3}}>
                          <a href={u} target="_blank" rel="noreferrer" style={{color:'var(--brand)',fontSize:12,wordBreak:'break-all'}}>{u} ↗</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
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
                {law.responsible && <><dt>หน่วยงานที่รับผิดชอบ</dt><dd>{law.responsible}</dd></>}
                {law.issue_date && <><dt>วันที่ประกาศ</dt><dd>{law.issue_date}</dd></>}
                {law.effective_date && <><dt>วันที่บังคับใช้</dt><dd>{law.effective_date}</dd></>}
                {law.doc_list && <><dt>เอกสารที่เกี่ยวข้อง</dt><dd>{law.doc_list}</dd></>}
                {!isRepealed && <><dt>กำหนดทบทวนถัดไป</dt><dd className="num">{thDate(reviewDate)}</dd></>}
                {!isRepealed && <><dt>ครบกำหนดส่งรายงานราชการ</dt><dd style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  <input className="form-input" type="date" style={{maxWidth:170,padding:'4px 8px'}} value={reportDue||''} disabled={!can('edit')} title={can('edit')?'':NO_PERM} onChange={e=>saveReportDue(e.target.value)}/>
                  {reportDue && (()=>{ const d=daysTo(reportDue); const col=d<15?'var(--bad)':d<=30?'var(--review)':'var(--ink-faint)'
                    return <span style={{fontSize:11.5,color:col,fontWeight:600}}>{d<0?'เกิน '+Math.abs(d)+' วัน':'อีก '+d+' วัน'}</span> })()}
                </dd></>}
                {law.source_url && <><dt>ต้นฉบับ</dt><dd><a href={law.source_url} target="_blank" rel="noreferrer" style={{color:'var(--brand)'}}>เปิดเอกสาร ↗</a></dd></>}
                <dt>สถานะ</dt><dd><span className={'pill '+(STATUS[law.status]?.cls||'p-ok')}>{STATUS[law.status]?.label||law.status}</span></dd>
              </dl>
            </div>
          </div>

          {!isRepealed && (
            <div className="sec">
              <div className="sec-t">
                ข้อปฏิบัติ & การประเมิน
                {(()=>{ const s=reqStats(law); return <span style={{marginLeft:'auto',display:'flex',gap:8,alignItems:'center'}}>
                  {s.waiting>0 && <span style={{fontSize:11.5,color:'var(--ink-faint)'}}>รอผู้เกี่ยวข้องประเมิน {s.waiting} ข้อ</span>}
                  <span style={{color:s.pct==null?'var(--ink-faint)':s.pct===100?'var(--ok)':'var(--bad)'}}>{s.pct==null?'ยังไม่ประเมิน':s.pct+'%'}</span>
                </span> })()}
                {/* P22 ขั้นที่ 3 · ให้ AI เสนอสถานะทุกข้อที่ยังไม่มีใครประเมิน
                    ข้อที่มีคนประเมินไว้แล้วถูกข้ามที่ฝั่ง server ไม่ใช่แค่ซ่อนบนหน้าจอ */}
                {law.reqs.length>0 && <button className="btn btn-ghost" style={{marginLeft:8,padding:'4px 11px',fontSize:11}}
                  disabled={preassess.busy||!can('edit')}
                  title={can('edit')?'ให้ AI เสนอสถานะรายข้อตามเกณฑ์ตัดสินร่วม — เป็นข้อเสนอ ต้องกดรับเองทีละข้อ':NO_PERM}
                  onClick={()=>preassess.run('pre', async()=>{
                    const r = await runPreassess(law.id)
                    setSuggs(await fetchSuggestions(law.id))
                    toast(r.assessed
                      ? `AI เสนอสถานะแล้ว ${r.assessed} ข้อ${r.skipped?` · ข้ามที่มีผู้ประเมินแล้ว ${r.skipped} ข้อ`:''} — ยังไม่มีผลจนกว่าจะกดรับ`
                      : (r.note||'ไม่มีข้อที่ต้องเสนอ'), 'success')
                  }, { errorPrefix:'เสนอสถานะไม่สำเร็จ' })}>
                  {preassess.isBusy('pre')?'กำลังวิเคราะห์…':'ให้ AI เสนอสถานะ'}
                </button>}
                {onAddReq && <button className="btn btn-primary" style={{marginLeft:8,padding:'4px 11px',fontSize:11}}
                  disabled={!can('edit')||addingReq} title={can('edit')?'เพิ่มข้อปฏิบัติใหม่ให้กฎหมายฉบับนี้':NO_PERM}
                  onClick={()=>{ setEditingId(null); setNewReq(EMPTY_NEW_REQ); setAddingReq(true) }}>+ เพิ่มข้อปฏิบัติ</button>}
              </div>
              <p style={{fontSize:11.5,color:'var(--ink-faint)',marginBottom:10}}>คลิกกล่องสถานะเพื่อสลับ สอดคล้อง ↔ ยังไม่สอดคล้อง (บันทึกอัตโนมัติ) · ข้อสีเทา = รอผู้เกี่ยวข้องประเมิน</p>
              {law.reqs.map(r=>{
                const ov = evOverrides[r.id] || {}
                const evidenceUrl   = ov.evidence_url   || r.evidence_url
                const evidenceLabel = ov.evidence_label || r.evidence_label
                const ro = reqOverrides[r.id] || {}
                const rtext = ro.text        ?? r.text
                const rresp = ro.responsible ?? r.responsible
                const rfreq = ro.frequency   ?? r.frequency
                const rdocs = ro.documents   ?? r.documents
                const isEditing = editingId === r.id
                return (
                <div className={'req '+reqKind(r)} key={r.id}>
                  <button className="ck" onClick={()=>startStatusEdit(r)} disabled={!can('edit')||isEditing}
                    title={can('edit')?(reqEvalTitle(r)+' · คลิกเพื่อเปลี่ยนสถานะ'):NO_PERM}>
                    {(REQ_STATUS[reqKind(r)] || WAITING_STATUS).code}
                  </button>
                  <div style={{flex:1}}>
                    {isEditing ? (
                      <div style={{display:'flex',flexDirection:'column',gap:8}}>
                        <textarea className="form-input" rows={5} value={editForm.text}
                          onChange={e=>setEditForm(f=>({...f,text:e.target.value}))}
                          placeholder="ข้อความข้อปฏิบัติ…" style={{resize:'vertical',whiteSpace:'pre-wrap'}} autoFocus/>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                          <input className="form-input" value={editForm.responsible} onChange={e=>setEditForm(f=>({...f,responsible:e.target.value}))} placeholder="ผู้รับผิดชอบ"/>
                          <input className="form-input" value={editForm.frequency} onChange={e=>setEditForm(f=>({...f,frequency:e.target.value}))} placeholder="ความถี่"/>
                        </div>
                        <input className="form-input" value={editForm.documents} onChange={e=>setEditForm(f=>({...f,documents:e.target.value}))} placeholder="เอกสาร/หลักฐานที่ต้องมี"/>
                        <div style={{display:'flex',gap:8}}>
                          <button className="btn btn-primary" style={{padding:'5px 14px',fontSize:12.5}} disabled={savingReq} onClick={()=>saveEdit(r)}>{savingReq?'กำลังบันทึก…':'บันทึก'}</button>
                          <button className="btn btn-ghost" style={{padding:'5px 14px',fontSize:12.5}} disabled={savingReq} onClick={()=>setEditingId(null)}>ยกเลิก</button>
                        </div>
                      </div>
                    ) : (<>
                    <div className="rt" style={{whiteSpace:'pre-wrap'}}>{rtext}</div>
                    {/* Skill 3 · ข้อนี้ไม่ได้อยู่ในตัวบทของกฎหมายฉบับนี้ แต่ดึงมาจากกฎหมายที่ถูกอ้างถึง
                        ผู้ตรวจ ISO 45001 ต้องตามที่มาได้ทันทีจากหน้านี้ */}
                    {r.from_related_law && (
                      <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',margin:'5px 0 0'}}>
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
                          <span title="ยังยืนยันตัวบทได้ไม่ครบ ควรเปิดกฎหมายต้นทางตรวจเอง" style={{
                            display:'inline-block',fontSize:11,lineHeight:1.5,padding:'1px 7px',borderRadius:999,
                            background:'var(--warn-bg)',color:'var(--warn)',whiteSpace:'nowrap',cursor:'help',
                          }}>⚠ ควรตรวจตัวบทเอง</span>
                        )}
                      </div>
                    )}
                    <div className="rmeta">
                      {rresp && <span className="b">{rresp}</span>}
                      {rfreq && <span className="b">{rfreq}</span>}
                      {rdocs && <span className="b">{rdocs.slice(0,50)}</span>}
                    </div>
                    <div className="rmeta" style={{marginTop:5}}>
                      {r.evaluated_by
                        ? <span className="b" style={{background:'var(--ok-bg)',color:'var(--ok)',borderColor:'transparent'}}>ประเมินโดย {r.evaluated_by}{r.evaluated_at?' · '+thDate(r.evaluated_at):''}</span>
                        : <span className="b">ยังไม่ได้ประเมิน</span>}
                      {evidenceUrl && <a className="b" href={evidenceUrl} target="_blank" rel="noreferrer" style={{color:'var(--brand)',borderColor:'var(--brand)'}} title={evidenceLabel||'หลักฐาน'}>หลักฐาน ↗</a>}
                      <label className="b" style={{cursor:can('edit')?'pointer':'not-allowed',opacity:can('edit')?1:.55}} title={can('edit')?'แนบไฟล์หลักฐาน':NO_PERM}>
                        {uploadingReq===r.id ? 'กำลังอัปโหลด…' : (evidenceUrl ? 'เปลี่ยนหลักฐาน' : 'แนบหลักฐาน')}
                        <input type="file" accept="application/pdf,image/*" style={{display:'none'}} disabled={!can('edit')||uploadingReq===r.id}
                          onChange={e=>{ const f=e.target.files?.[0]; attachEvidence(r,f); e.target.value='' }}/>
                      </label>
                      <button className="b" style={{cursor:can('edit')?'pointer':'not-allowed',opacity:can('edit')?1:.55,background:'none'}}
                        disabled={!can('edit')} title={can('edit')?'แก้ไขข้อปฏิบัติ':NO_PERM} onClick={()=>startEdit(r)}>แก้ไข</button>
                    </div>
                    {reqKind(r)==='unmet' && r.note && <div className="note">{r.note}</div>}
                    {r.status_reason && <div className="reason">เหตุผล: {r.status_reason}</div>}

                    {/* P22 ขั้นที่ 3 · ข้อเสนอของ AI — แสดงตลอด ไม่ต้องกดเข้าโหมดแก้ก่อน
                        เพื่อให้ผู้ประเมินเห็นภาพรวมทั้งฉบับได้ก่อนลงมือทีละข้อ */}
                    {suggs[r.id] && statusEditId!==r.id && (
                      <SuggestionCard req={r} sugg={suggs[r.id]} disabled={savingStatus}
                        onUse={()=>{ setStatusDraft({choice:suggs[r.id].suggested_status, reason:''}); setStatusEditId(r.id) }}/>
                    )}

                    {statusEditId===r.id && (
                      <div style={{marginTop:9,paddingTop:9,borderTop:'1px solid var(--line)',display:'flex',flexDirection:'column',gap:8}}>
                        <div style={{fontSize:11.5,fontWeight:700,color:'var(--ink-soft)'}}>ผลการประเมินข้อนี้</div>
                        {suggs[r.id] && (
                          <SuggestionCard req={r} sugg={suggs[r.id]} disabled={savingStatus}
                            onUse={s=>setStatusDraft(d=>({...d, choice:s.suggested_status}))}/>
                        )}
                        <ReqStatusPicker
                          value={statusDraft.choice} reason={statusDraft.reason} disabled={savingStatus}
                          onChange={c=>setStatusDraft(d=>({...d,choice:c}))}
                          onReasonChange={v=>setStatusDraft(d=>({...d,reason:v}))}/>
                        <div style={{display:'flex',gap:8}}>
                          <button className="btn btn-primary" style={{padding:'5px 14px',fontSize:12.5}} disabled={savingStatus} onClick={()=>saveStatus(r)}>{savingStatus?'กำลังบันทึก…':'บันทึกผลประเมิน'}</button>
                          <button className="btn btn-ghost" style={{padding:'5px 14px',fontSize:12.5}} disabled={savingStatus} onClick={()=>setStatusEditId(null)}>ยกเลิก</button>
                        </div>
                      </div>
                    )}
                    </>)}
                  </div>
                </div>
              )})}
              {law.reqs.length===0 && !addingReq && <p style={{fontSize:13,color:'var(--ink-faint)'}}>ยังไม่มีข้อปฏิบัติบันทึกไว้ — กด “+ เพิ่มข้อปฏิบัติ” เพื่อเพิ่มข้อแรก</p>}

              {addingReq && (
                <div className="req" style={{borderStyle:'dashed'}}>
                  <div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>
                    <div style={{fontSize:12,fontWeight:700,color:'var(--ink-soft)'}}>ข้อปฏิบัติใหม่ (ข้อที่ {law.reqs.length+1})</div>
                    <textarea className="form-input" rows={5} value={newReq.text}
                      onChange={e=>setNewReq(f=>({...f,text:e.target.value}))}
                      placeholder="ข้อความข้อปฏิบัติ…" style={{resize:'vertical',whiteSpace:'pre-wrap'}} autoFocus/>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      <input className="form-input" value={newReq.responsible} onChange={e=>setNewReq(f=>({...f,responsible:e.target.value}))} placeholder="ผู้รับผิดชอบ"/>
                      <input className="form-input" value={newReq.frequency} onChange={e=>setNewReq(f=>({...f,frequency:e.target.value}))} placeholder="ความถี่"/>
                    </div>
                    <input className="form-input" value={newReq.documents} onChange={e=>setNewReq(f=>({...f,documents:e.target.value}))} placeholder="เอกสาร/หลักฐานที่ต้องมี"/>
                    <ReqStatusPicker allowWaiting
                      value={newReq.choice} reason={newReq.statusReason}
                      onChange={c=>setNewReq(f=>({...f,choice:c}))}
                      onReasonChange={v=>setNewReq(f=>({...f,statusReason:v}))}/>
                    {newReq.choice==='waiting' && (
                      <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',fontSize:11.5,color:'var(--ink-faint)'}}>
                        <span>ต้องการคำตอบภายใน</span>
                        <input className="form-input" type="date" style={{maxWidth:170,padding:'4px 8px'}} value={newReq.waitDate} onChange={e=>setNewReq(f=>({...f,waitDate:e.target.value}))}/>
                        <span>· ต้องระบุผู้รับผิดชอบด้วย</span>
                      </div>
                    )}
                    <div style={{display:'flex',gap:8}}>
                      <button className="btn btn-primary" style={{padding:'5px 14px',fontSize:12.5}} disabled={savingNew} onClick={saveNewReq}>{savingNew?'กำลังเพิ่ม…':'เพิ่มข้อปฏิบัติ'}</button>
                      <button className="btn btn-ghost" style={{padding:'5px 14px',fontSize:12.5}} disabled={savingNew} onClick={()=>{ setAddingReq(false); setNewReq(EMPTY_NEW_REQ) }}>ยกเลิก</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="sec">
            <div className="sec-t">ประวัติการทบทวน
              <button className="btn btn-primary" style={{marginLeft:'auto',padding:'4px 11px',fontSize:11}}
                disabled={!can('edit')} title={can('edit')?'':NO_PERM} onClick={()=>setShowReviewModal(true)}>บันทึกการทบทวน</button>
            </div>
            {reviews.length===0 && <p style={{fontSize:12.5,color:'var(--ink-faint)'}}>ยังไม่มีประวัติการทบทวน — กด “บันทึกการทบทวน” เพื่อเพิ่มรายการแรก</p>}
            {reviews.map(rv=>{
              const rc = rv.result==='ถูกยกเลิก' ? {bg:'var(--bad-bg)',fg:'var(--bad)'}
                       : rv.result==='มีการแก้ไข' ? {bg:'var(--review-bg)',fg:'var(--review)'}
                       : {bg:'var(--ok-bg)',fg:'var(--ok)'}
              return (
                <div key={rv.id} className="panel" style={{padding:'10px 14px',marginBottom:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                    <span className="num" style={{fontSize:12.5,fontWeight:700}}>{thDate(rv.review_date)}</span>
                    <span className="pill" style={{fontSize:10,background:rc.bg,color:rc.fg}}>{rv.result||'—'}</span>
                    {rv.reviewer && <span style={{fontSize:12,color:'var(--ink-faint)'}}>โดย {rv.reviewer}</span>}
                  </div>
                  {rv.note && <div style={{fontSize:12.5,color:'var(--ink-soft)',marginTop:6,lineHeight:1.5}}>{rv.note}</div>}
                </div>
              )
            })}
          </div>
        </div>

        <div className="dr-foot">
          <button className="btn btn-ghost" style={{flex:1}} onClick={onClose}>ปิด</button>
          {!isRepealed && (
            <>
              {onToggleActive && <button className="btn btn-ghost" style={{flex:1}} disabled={!can('edit')} title={can('edit')?'':NO_PERM} onClick={()=>onToggleActive(law)}>{inactive?'ทำให้ใช้อยู่':'ทำเป็นไม่ใช้แล้ว'}</button>}
              {onDuplicate && <button className="btn btn-ghost" style={{flex:1}} disabled={!can('edit')} title={can('edit')?'':NO_PERM} onClick={()=>onDuplicate(law)}>ทำซ้ำ</button>}
              {/* ยกเลิกใช้ (repeal — เก็บประวัติ) = admin เท่านั้น */}
              <button className="btn btn-danger" style={{flex:1}} disabled={!can('delete')} title={can('delete')?'':NO_PERM} onClick={()=>setShowRepealModal(true)}>ยกเลิกใช้</button>
              {/* ลบถาวร (hard delete) = admin เท่านั้น */}
              {onDelete && <button className="btn btn-danger" style={{flex:'0 0 auto',padding:'0 12px'}} disabled={!can('delete')} title={can('delete')?'ลบกฎหมายถาวร (กู้คืนไม่ได้)':NO_PERM} onClick={()=>setShowDeleteModal(true)}><I n="ban"/>ลบ</button>}
              <button className="btn btn-primary" style={{flex:1}} onClick={()=>{
                buildLawReport({ law, catName: cat?.name || law.cat, catColor: cat?.color, settings })
                setTimeout(()=>window.print(), 80)
              }}>PDF</button>
            </>
          )}
          {isRepealed && (
            <button className="btn btn-primary" style={{flex:2}} disabled={!can('delete')} title={can('delete')?'':NO_PERM} onClick={()=>onRestore(law)}>กู้คืนกฎหมาย</button>
          )}
        </div>
      </div>

      {showRepealModal && <RepealModal law={law} onConfirm={handleRepealConfirm} onClose={()=>setShowRepealModal(false)}/>}
      {showReviewModal && <ReviewModal law={law} onSave={handleSaveReview} onClose={()=>setShowReviewModal(false)}/>}
      {showDeleteModal && <DeleteLawModal law={law} onConfirm={()=>{ setShowDeleteModal(false); onDelete(law) }} onClose={()=>setShowDeleteModal(false)}/>}
    </>
  )
}
