// P12 · หน้า "สรุปกฎหมาย" — แทน Discovery + Analysis.
// โซนบน: วาง URL/ตัวบท → AI สรุป (ผ่าน /api/law-analyze, stage:false) → แก้ไข → เก็บลงคิว
//         lg_ai_discovered_laws (ai_payload) → กด "เพิ่มเข้าทะเบียน" prefill AddLawFlow (Workflow A).
// โซนล่าง: คลังสรุปกฎหมายจากทะเบียน + AI สรุปย้อนหลังรายฉบับ (lg_laws.ai_summary, ไม่ทับของยืนยันแล้ว).
import { useMemo, useState } from 'react'
import { saveDiscoveredLaw, deleteDiscoveredLaw, saveLawAiSummary } from '../lib/supabase.js'
import { STATUS } from '../lib/supabase.js'
import { I } from '../components/icons.jsx'
import { Tag, thDate } from '../lib/ui.jsx'
import { useAuth, NO_PERM } from '../lib/auth.js'
import { toast } from '../lib/toast.js'
import { confirmDialog } from '../lib/confirm.js'

// เรียก endpoint เดิม (คีย์อยู่ฝั่ง Vercel env) — stage:false = ไม่เขียน lg_import_staging
// รองรับทั้งข้อความ/URL (source) และไฟล์ PDF (pdfBase64)
async function analyzeSource({ source = '', sourceUrl = '', pdfBase64 = '', pdfName = '' }) {
  const r = await fetch('/api/law-analyze', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ source, sourceUrl, pdfBase64, pdfName, stage: false }),
  })
  const d = await r.json()
  if (!r.ok) throw new Error(d.error || 'สรุปไม่สำเร็จ')
  // Skill 3 · related_count/unresolved_count ต้องส่งต่อด้วย ไม่งั้นบรรทัดสรุปเหนือตารางไม่มีข้อมูล
  return { law: d.law || {}, requirements: d.requirements || [],
    related_count: d.related_count || 0, unresolved_count: d.unresolved_count || 0 }
}

// อ่านไฟล์เป็น base64 (ตัดส่วน "data:...;base64," นำหน้าออก)
function readFileBase64(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result).split(',')[1] || '')
    fr.onerror = reject
    fr.readAsDataURL(file)
  })
}

// เว็บราชการที่ "วางลิงก์" ได้ (ต้องตรงกับ ALLOWED_HOSTS ใน api/law-analyze.js)
const ALLOWED_SITES = [
  ['ราชกิจจานุเบกษา', 'ratchakitcha.soc.go.th'],
  ['สำนักงานคณะกรรมการกฤษฎีกา', 'krisdika.go.th'],
  ['กรมสวัสดิการและคุ้มครองแรงงาน', 'dlpw.go.th'],
  ['กระทรวงแรงงาน', 'labour.go.th'],
  ['สมาคมส่งเสริมความปลอดภัยฯ (ShawPat)', 'shawpat.or.th'],
  ['กรมควบคุมโรค', 'ddc.moph.go.th'],
  ['กระทรวงสาธารณสุข', 'moph.go.th'],
  ['กรมโรงงานอุตสาหกรรม', 'diw.go.th'],
  ['กสทช.', 'nbtc.go.th'],
  ['กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม', 'mdes.go.th'],
  ['สำนักงานคุ้มครองข้อมูลส่วนบุคคล (PDPA)', 'pdpc.or.th'],
  ['สำนักงานความมั่นคงปลอดภัยไซเบอร์', 'ncsa.or.th'],
  ['กรมทรัพย์สินทางปัญญา', 'ipthailand.go.th'],
  ['กรมสรรพากร', 'rd.go.th'],
  ['สำนักงานประกันสังคม', 'sso.go.th'],
  ['กรมควบคุมมลพิษ', 'pcd.go.th'],
  ['สำนักงานนโยบายและแผนทรัพยากรธรรมชาติฯ', 'onep.go.th'],
  ['กรมพัฒนาธุรกิจการค้า', 'dbd.go.th'],
]

// req ดิบจาก AI → แถวแก้ไขได้
const toReqRows = (reqs = []) => reqs.map(q => ({
  section_ref: q.section_ref || '', req_text: q.req_text || '',
  responsible: q.responsible || '', frequency: q.frequency || '',
  applicability: q.applicability || '', method: q.method || '',
  documents: q.documents || '', other_terms: q.other_terms || '',
  from_related_law: q.from_related_law || null,   // Skill 3 · ชื่อกฎหมายต้นทาง (null = ข้อของฉบับหลัก)
  from_law_url: q.from_law_url || '',             // ลิงก์ไฟล์ตัวบทของกฎหมายต้นทาง
  from_law_confidence: q.from_law_confidence || '',
  from_law_note: q.from_law_note || '',
}))

// ชื่อกฎหมายเต็มยาวเกินกว่าจะใส่ใน badge — ตัดให้สั้น เก็บชื่อเต็มไว้ใน title
const shortLaw = n => { const s = String(n || '').trim(); return s.length > 30 ? s.slice(0, 30) + '…' : s }

// แถวแก้ไข → payload สำหรับ prefill AddLawFlow / เก็บ ai_payload
const buildInitialData = (law, reqRows, discoveredId = null) => ({
  law: {
    name: law.name || '', type: law.type || '', ministry: law.ministry || '',
    announce_date: law.announce_date || '', effective_date: law.effective_date || '',
    documents: law.documents || '', cat: law.cat || '', code_suggestion: law.code_suggestion || '',
  },
  requirements: reqRows,
  discoveredId,
})

// สาระสำคัญ (บรรทัด) จาก reqRows — ใช้เก็บลง summary jsonb
const reqRowsToLines = rows => rows
  .map(r => `${r.section_ref ? r.section_ref + ': ' : ''}${r.req_text || ''}`.trim())
  .filter(Boolean)

/* ── แถวข้อปฏิบัติแบบแก้ไขได้ ── */
function ReqRow({ r, i, onChange, onRemove, suggest }) {
  const set = (k, v) => onChange(i, { ...r, [k]: v })
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span className="num" style={{ paddingTop: 9, minWidth: 22, color: 'var(--ink-faint)' }}>{i + 1}.</span>
        <input className="form-input" style={{ marginTop: 0, maxWidth: 130 }} value={r.section_ref} onChange={e => set('section_ref', e.target.value)} placeholder="มาตรา/ข้อ" />
        <textarea className="form-input" rows={1} style={{ marginTop: 0 }} value={r.req_text} onChange={e => set('req_text', e.target.value)} placeholder="เนื้อหาข้อปฏิบัติ…" />
        <button className="btn btn-ghost" style={{ padding: '7px 9px' }} onClick={() => onRemove(i)}><I n="x" /></button>
      </div>
      {/* Skill 3 · ข้อที่ดึงมาจากกฎหมายที่ถูกอ้างถึง — เปิดตัวบทตรวจเองได้ + เตือนข้อที่ยังไม่ยืนยัน */}
      {r.from_related_law && (
        <div style={{ marginLeft: 30, marginTop: 4, display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {r.from_law_url ? (
            <a href={r.from_law_url} target="_blank" rel="noreferrer" title={`เปิดตัวบท: ${r.from_related_law}`} style={{
              display: 'inline-block', fontSize: 11, lineHeight: 1.5, padding: '1px 7px', borderRadius: 999,
              background: 'var(--line)', color: 'var(--ink-soft)', textDecoration: 'none', whiteSpace: 'nowrap',
            }}>จาก {shortLaw(r.from_related_law)} ↗</a>
          ) : (
            <span title={r.from_related_law} style={{
              display: 'inline-block', fontSize: 11, lineHeight: 1.5, padding: '1px 7px', borderRadius: 999,
              background: 'var(--line)', color: 'var(--ink-faint)', whiteSpace: 'nowrap',
            }}>จาก {shortLaw(r.from_related_law)}</span>
          )}
          {r.from_law_confidence && r.from_law_confidence !== 'high' && (
            <span title={r.from_law_note || 'ยังยืนยันตัวบทได้ไม่ครบ ควรเปิดกฎหมายต้นทางตรวจเอง'} style={{
              display: 'inline-block', fontSize: 11, lineHeight: 1.5, padding: '1px 7px', borderRadius: 999,
              background: 'var(--warn-bg)', color: 'var(--warn)', whiteSpace: 'nowrap', cursor: 'help',
            }}>⚠ ควรตรวจตัวบทเอง</span>
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 6, marginLeft: 30 }}>
        <input className="form-input" style={{ marginTop: 0 }} value={r.responsible} onChange={e => set('responsible', e.target.value)} placeholder="ผู้รับผิดชอบ" />
        <input className="form-input" style={{ marginTop: 0 }} value={r.frequency} onChange={e => set('frequency', e.target.value)} placeholder="ความถี่" />
        <input className="form-input" style={{ marginTop: 0 }} value={r.documents} onChange={e => set('documents', e.target.value)} placeholder="เอกสาร/หลักฐาน" />
      </div>
    </div>
  )
}

/* ── โซนบน: สรุปด้วย AI ── */
function AiSummaryZone({ cats, suggest, onQueued, onAddToRegistry }) {
  const { can } = useAuth()
  const [src, setSrc] = useState('')
  const [srcUrl, setSrcUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [law, setLaw] = useState(null)          // {name,type,ministry,...,cat}
  const [reqs, setReqs] = useState([])          // reqRows
  const [related, setRelated] = useState({ count: 0, unresolved: 0 })   // Skill 3

  async function analyze() {
    if (!src.trim() || busy) return
    setBusy(true); setLaw(null); setReqs([]); setRelated({ count: 0, unresolved: 0 })
    try {
      const { law: l, requirements, related_count, unresolved_count } = await analyzeSource({ source: src, sourceUrl: srcUrl.trim() })
      setLaw({ ...l, cat: l.cat || cats[0]?.code || 'LA' })
      setReqs(toReqRows(requirements))
      setRelated({ count: related_count, unresolved: unresolved_count })
      toast('สรุปด้วย AI แล้ว — ตรวจ/แก้ไขได้', 'success')
    } catch (e) { toast('สรุปไม่สำเร็จ: ' + e.message) }
    setBusy(false)
  }

  async function analyzePdf(file) {
    if (!file || busy) return
    if (file.size > 4 * 1024 * 1024) { toast('ไฟล์ PDF ใหญ่เกิน 4MB — กรุณาแยกไฟล์ หรือ copy ตัวบทมาวางแทน'); return }
    setBusy(true); setLaw(null); setReqs([]); setRelated({ count: 0, unresolved: 0 })
    try {
      const pdfBase64 = await readFileBase64(file)
      const { law: l, requirements, related_count, unresolved_count } = await analyzeSource({ pdfBase64, pdfName: file.name, sourceUrl: srcUrl.trim() })
      setLaw({ ...l, cat: l.cat || cats[0]?.code || 'LA' })
      setReqs(toReqRows(requirements))
      setRelated({ count: related_count, unresolved: unresolved_count })
      toast('สรุปจากไฟล์ PDF แล้ว — ตรวจ/แก้ไขได้', 'success')
    } catch (e) { toast('สรุป PDF ไม่สำเร็จ: ' + e.message) }
    setBusy(false)
  }

  const setReq = (i, v) => setReqs(p => p.map((x, j) => j === i ? v : x))
  const rmReq = i => setReqs(p => p.filter((_, j) => j !== i))
  const setLawField = (k, v) => setLaw(p => ({ ...p, [k]: v }))

  async function queue() {
    if (!law || saving) return
    setSaving(true)
    try {
      const realUrl = srcUrl.trim() || (/^https?:\/\//i.test(src.trim()) ? src.trim() : null)
      await saveDiscoveredLaw({
        law_name: law.name, source: 'ai', source_url: realUrl,
        ministry: law.ministry || null, announced_date: law.announce_date || null,
        effective_date: law.effective_date || null,
        related_docs: law.documents ? [law.documents] : [],
        summary: reqRowsToLines(reqs),
        ai_payload: buildInitialData({ ...law }, reqs),
        status: 'imported', searched_at: new Date().toISOString(),
      })
      toast('เก็บลงคิว "รอเข้าทะเบียน" แล้ว', 'success')
      setLaw(null); setReqs([]); setSrc(''); setSrcUrl(''); setRelated({ count: 0, unresolved: 0 })
      onQueued && onQueued()
    } catch (e) { toast('บันทึกลงคิวไม่สำเร็จ: ' + e.message) }
    setSaving(false)
  }

  return (
    <div className="panel" style={{ padding: '16px 18px' }}>
      <h3 style={{ margin: 0, fontSize: 15 }}>สรุปกฎหมายด้วย AI</h3>
      <p style={{ margin: '2px 0 6px', fontSize: 12.5, color: 'var(--ink-faint)', lineHeight: 1.6 }}>
        ทำได้ 3 แบบ แล้วกด “สรุป (AI)”:<br />
        <b>1) วางตัวบทเป็นข้อความ</b> — ได้เสมอ ไม่จำกัดเว็บ (แนะนำถ้าลิงก์เข้าไม่ได้)<br />
        <b>2) วางลิงก์</b> — ต้องเป็นเว็บราชการที่รองรับ (ดูด้านล่าง) รองรับทั้งหน้าเว็บและไฟล์ PDF<br />
        <b>3) แนบไฟล์ PDF</b> — อัปโหลดไฟล์จากเครื่อง (≤ 4MB)</p>
      <details style={{ margin: '0 0 12px', fontSize: 12 }}>
        <summary style={{ cursor: 'pointer', color: 'var(--brand)' }}>เว็บที่ “วางลิงก์” ได้ ({ALLOWED_SITES.length} แหล่ง)</summary>
        <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: 'var(--ink-soft)', lineHeight: 1.7 }}>
          {ALLOWED_SITES.map(([name, host]) => (
            <li key={host}>{name} — <code style={{ fontSize: 11.5 }}>{host}</code></li>
          ))}
        </ul>
        <div style={{ marginTop: 4, color: 'var(--ink-faint)' }}>เว็บอื่นที่ไม่อยู่ในลิสต์ ให้ copy ตัวบทมาวางเป็นข้อความ หรือแนบไฟล์ PDF แทน</div>
      </details>
      <textarea className="form-input" rows={4} style={{ marginTop: 0 }} placeholder="วาง URL หรือตัวบทกฎหมายที่นี่…" value={src} onChange={e => setSrc(e.target.value)} />
      <label className="form-label" style={{ marginTop: 10 }}>ลิงก์ตัวบทจริง (แนะนำ — กรณีวางเป็นข้อความ)</label>
      <input className="form-input" style={{ marginTop: 0 }} value={srcUrl} onChange={e => setSrcUrl(e.target.value)}
        placeholder="เช่น https://ratchakitcha.soc.go.th/documents/xxxx" />
      <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" disabled={busy || !src.trim() || !can('edit')} title={can('edit') ? '' : NO_PERM} onClick={analyze}>
          {busy ? <><span className="spin" style={{ width: 14, height: 14, display: 'inline-block', marginRight: 6 }} />กำลังสรุป…</> : <><I n="spark" />สรุป (AI)</>}
        </button>
        <label className="btn btn-ghost" style={{ cursor: busy || !can('edit') ? 'not-allowed' : 'pointer', opacity: busy || !can('edit') ? .55 : 1 }} title={can('edit') ? 'แนบไฟล์ PDF ให้ AI อ่านและสรุป' : NO_PERM}>
          <I n="folder" />แนบไฟล์ PDF
          <input type="file" accept="application/pdf" style={{ display: 'none' }} disabled={busy || !can('edit')}
            onChange={e => { const f = e.target.files?.[0]; analyzePdf(f); e.target.value = '' }} />
        </label>
        <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>รองรับ PDF ≤ 4MB (เหมาะกับลิงก์ราชกิจจาฯ ที่เป็นไฟล์ PDF)</span>
      </div>

      {/* กฎหมายยาว (~6 หน้า) ใช้เวลาราว 2-3 นาที — บอกผู้ใช้ไม่ให้ปิดหน้าต่างระหว่างรอ */}
      {busy && (
        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--warn-soft, rgba(255,176,32,.12))', fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
          กำลังให้ AI อ่านและแตกข้อปฏิบัติ — กฎหมายสั้นราว 30 วินาที ส่วนกฎหมายยาว (5–10 หน้า) อาจใช้เวลา <b>2–3 นาที</b><br />
          กรุณาอย่าปิดหน้าต่างหรือกดซ้ำระหว่างรอ
        </div>
      )}

      {law && (
        <div style={{ marginTop: 16, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10 }}>
            <div><label className="form-label">ชื่อกฎหมาย</label><textarea className="form-input" rows={2} style={{ marginTop: 0 }} value={law.name} onChange={e => setLawField('name', e.target.value)} /></div>
            <div><label className="form-label">ประเภท</label><input className="form-input" style={{ marginTop: 0 }} value={law.type || ''} onChange={e => setLawField('type', e.target.value)} /></div>
            <div><label className="form-label">หมวด</label>
              <select className="form-input" style={{ marginTop: 0 }} value={law.cat} onChange={e => setLawField('cat', e.target.value)}>
                {cats.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
              </select></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 10, marginTop: 8 }}>
            <div><label className="form-label">กระทรวง</label><input className="form-input" style={{ marginTop: 0 }} value={law.ministry || ''} onChange={e => setLawField('ministry', e.target.value)} /></div>
            <div><label className="form-label">วันที่ประกาศ</label><input className="form-input" style={{ marginTop: 0 }} value={law.announce_date || ''} onChange={e => setLawField('announce_date', e.target.value)} /></div>
            <div><label className="form-label">วันบังคับใช้</label><input className="form-input" style={{ marginTop: 0 }} value={law.effective_date || ''} onChange={e => setLawField('effective_date', e.target.value)} /></div>
          </div>
          <label className="form-label" style={{ marginTop: 8 }}>เอกสาร/แบบฟอร์มที่เกี่ยวข้อง</label>
          <input className="form-input" style={{ marginTop: 0 }} value={law.documents || ''} onChange={e => setLawField('documents', e.target.value)} />

          <div className="sec-t" style={{ marginTop: 14, display: 'flex' }}>ข้อปฏิบัติ ({reqs.length})
            <button className="btn btn-ghost" style={{ marginLeft: 'auto', padding: '3px 10px', fontSize: 12 }} onClick={() => setReqs(p => [...p, { section_ref: '', req_text: '', responsible: '', frequency: '', documents: '' }])}><I n="plus" />เพิ่มข้อ</button>
          </div>
          {/* Skill 3 · บอกว่ามีข้อที่ดึงมาจากกฎหมายที่ตัวบทอ้างถึงกี่ข้อ */}
          {related.count > 0 && (
            <div style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '2px 0 8px', lineHeight: 1.6 }}>
              รวมข้อกำหนดจากกฎหมายที่อ้างถึง {related.count} ข้อ
              {related.unresolved > 0 && (
                <span style={{ color: 'var(--warn)' }}> · อีก {related.unresolved} ฉบับหาตัวบทไม่พบ ควรตรวจสอบเพิ่มเติม</span>
              )}
            </div>
          )}
          {reqs.map((r, i) => <ReqRow key={i} r={r} i={i} onChange={setReq} onRemove={rmReq} suggest={suggest} />)}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" disabled={saving || !law.name?.trim() || !can('edit')} onClick={() => onAddToRegistry(buildInitialData(law, reqs))}>
              <I n="check" />เพิ่มเข้าทะเบียน
            </button>
            <button className="btn btn-ghost" disabled={saving || !law.name?.trim() || !can('edit')} onClick={queue}>
              {saving ? 'กำลังบันทึก…' : 'เก็บลงคิวไว้ก่อน'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── แถบคิว "รอเข้าทะเบียน" ── */
function QueueBar({ discovered, onReload, onAddToRegistry }) {
  const { can } = useAuth()
  const [open, setOpen] = useState(true)
  const items = discovered.filter(d => d.status !== 'deleted' && d.status !== 'registered')
  if (!items.length) return null

  function initFromRow(d) {
    if (d.ai_payload && d.ai_payload.law) return { ...d.ai_payload, discoveredId: d.id }
    const reqs = (Array.isArray(d.summary) ? d.summary : []).map(t => ({ req_text: t }))
    return buildInitialData({
      name: d.law_name, ministry: d.ministry, announce_date: d.announced_date,
      effective_date: d.effective_date, documents: (d.related_docs || []).join(', '),
    }, toReqRows(reqs), d.id)
  }
  async function remove(d) {
    if (!(await confirmDialog(`ลบ "${(d.law_name || '').slice(0, 40)}" ออกจากคิว?`, { danger: true }))) return
    try { await deleteDiscoveredLaw(d.id); onReload && onReload(); toast('ลบแล้ว', 'success') }
    catch (e) { toast('ลบไม่สำเร็จ: ' + e.message) }
  }

  return (
    <div className="panel" style={{ marginTop: 14, padding: '10px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
        <span className="pill p-warn" style={{ fontSize: 12 }}>รอเข้าทะเบียน {items.length}</span>
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>สรุปแล้ว รอเข้าทะเบียน {items.length} รายการ</span>
        <span style={{ marginLeft: 'auto', color: 'var(--ink-faint)' }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div style={{ marginTop: 8 }}>
          {items.map(d => {
            const summ = Array.isArray(d.summary) ? d.summary : []
            return (
              <div key={d.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 0', borderTop: '1px solid var(--line-soft)' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{d.law_name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 2 }}>
                    {d.ministry || '—'}{d.announced_date ? ' · ประกาศ ' + thDate(d.announced_date) : ''} · {summ.length} ข้อปฏิบัติ</div>
                  {summ[0] && <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 3 }}>{summ[0].slice(0, 90)}{summ[0].length > 90 ? '…' : ''}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 11.5 }} disabled={!can('edit')} onClick={() => onAddToRegistry(initFromRow(d))}>เพิ่มเข้าทะเบียน</button>
                  <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11.5 }} disabled={!can('edit')} onClick={() => remove(d)}>ลบ</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── การ์ดในคลังสรุป ── */
function LibraryCard({ law, catMap, onOpenLaw, onBackfill, backfilling, onAddToRegistry }) {
  const { can } = useAuth()
  const reqs = law.reqs || []
  const ai = law.ai_summary && law.ai_summary.requirements ? law.ai_summary.requirements : null
  const hasReqs = reqs.length > 0
  const points = hasReqs ? reqs.slice(0, 3).map(r => r.text)
    : (ai ? ai.slice(0, 3).map(r => `${r.section_ref ? r.section_ref + ': ' : ''}${r.req_text || ''}`) : [])

  return (
    <div className="panel" style={{ padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <Tag c={law.cat} color={catMap[law.cat]?.color} />
        <span className="law-code">{law.code}</span>
        <span style={{ flex: 1, fontSize: 13 }}>{(law.name || '').slice(0, 80)}</span>
        <span className={'pill ' + (STATUS[law.status]?.cls || 'p-ok')} style={{ fontSize: 11 }}>{STATUS[law.status]?.label || law.status}</span>
      </div>
      {!hasReqs && !ai && <span className="pill p-warn" style={{ fontSize: 11 }}>ยังไม่มีสรุป</span>}
      {!hasReqs && ai && <span className="pill" style={{ fontSize: 11, background: 'var(--warn)', color: '#fff' }}>สรุปโดย AI · ยังไม่ทวนสอบ</span>}
      {points.length > 0 && (
        <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.55 }}>
          {points.map((p, i) => <li key={i}>{(p || '').slice(0, 110)}{(p || '').length > 110 ? '…' : ''}</li>)}
        </ul>
      )}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8, flexWrap: 'wrap', fontSize: 12, color: 'var(--ink-faint)' }}>
        {law.effective_date && <span>บังคับใช้: {law.effective_date}</span>}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {!hasReqs && !ai && (
            <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11.5 }} disabled={backfilling || !can('edit')} onClick={() => onBackfill(law)}>
              {backfilling ? 'กำลังสรุป…' : <><I n="spark" />ให้ AI สรุปย้อนหลัง</>}
            </button>
          )}
          {!hasReqs && ai && (
            <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 11.5 }} disabled={!can('edit')}
              onClick={() => onAddToRegistry(buildInitialData(law.ai_summary.law || { name: law.name, cat: law.cat }, toReqRows(ai)))}>เพิ่มเข้าทะเบียน/ทวนสอบ</button>
          )}
          <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11.5 }} onClick={() => onOpenLaw(law)}>อ่านสรุปเต็ม</button>
        </span>
      </div>
    </div>
  )
}

/* ── โซนล่าง: คลังสรุปกฎหมาย ── */
function LibraryZone({ laws, cats, catMap, onOpenLaw, onReloadLaws, onAddToRegistry }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [backfillId, setBackfillId] = useState(null)

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return laws.filter(l => {
      if (cat !== 'all' && l.cat !== cat) return false
      if (!s) return true
      return l.code.toLowerCase().includes(s) || (l.name || '').toLowerCase().includes(s)
        || (l.reqs || []).some(r => (r.text || '').toLowerCase().includes(s))
    })
  }, [laws, q, cat])
  const usedCats = useMemo(() => [...new Set(laws.map(l => l.cat).filter(Boolean))].sort(), [laws])

  async function backfill(law) {
    setBackfillId(law.id)
    try {
      const source = law.source_url || law.name
      const { law: l, requirements } = await analyzeSource({ source, sourceUrl: law.source_url || '' })
      await saveLawAiSummary(law.id, { law: l, requirements })
      toast('AI สรุปย้อนหลังแล้ว — ยังไม่ทวนสอบ', 'success')
      onReloadLaws && onReloadLaws()
    } catch (e) { toast('สรุปย้อนหลังไม่สำเร็จ: ' + e.message) }
    setBackfillId(null)
  }

  return (
    <div style={{ marginTop: 22 }}>
      <div className="sec-t" style={{ margin: '0 0 10px' }}>คลังสรุปกฎหมาย ({laws.length})</div>
      <div className="filterbar" style={{ alignItems: 'center' }}>
        <input className="form-input" style={{ maxWidth: 260, margin: 0 }} placeholder="ค้นหารหัส/ชื่อ/เนื้อหาข้อปฏิบัติ…" value={q} onChange={e => setQ(e.target.value)} />
        <span className={'chip' + (cat === 'all' ? ' active' : '')} onClick={() => setCat('all')}>ทุกหมวด</span>
        {usedCats.map(c => <span key={c} className={'chip' + (cat === c ? ' active' : '')} onClick={() => setCat(c)}>{c}</span>)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
        {filtered.length === 0 && <div className="panel"><div style={{ textAlign: 'center', color: 'var(--ink-faint)', padding: 30, fontSize: 13 }}>ไม่พบกฎหมายที่ตรงกับเงื่อนไข</div></div>}
        {filtered.map(l => (
          <LibraryCard key={l.id} law={l} catMap={catMap} onOpenLaw={onOpenLaw}
            onBackfill={backfill} backfilling={backfillId === l.id} onAddToRegistry={onAddToRegistry} />
        ))}
      </div>
    </div>
  )
}

export default function LawSummary({ laws = [], cats = [], catMap = {}, discovered = [], suggest = {},
  onReloadDiscovered, onReloadLaws, onOpenLaw, onAddToRegistry }) {
  return (
    <div className="view">
      <AiSummaryZone cats={cats} suggest={suggest} onQueued={onReloadDiscovered} onAddToRegistry={onAddToRegistry} />
      <QueueBar discovered={discovered} onReload={onReloadDiscovered} onAddToRegistry={onAddToRegistry} />
      <LibraryZone laws={laws} cats={cats} catMap={catMap} onOpenLaw={onOpenLaw} onReloadLaws={onReloadLaws} onAddToRegistry={onAddToRegistry} />
    </div>
  )
}
