// P12 · หน้า "สรุปกฎหมาย" — แทน Discovery + Analysis.
// โซนบน: วาง URL/ตัวบท → AI สรุป (ผ่าน /api/law-analyze, stage:false) → แก้ไข → เก็บลงคิว
//         lg_ai_discovered_laws (ai_payload) → กด "เพิ่มเข้าทะเบียน" prefill AddLawFlow (Workflow A).
// โซนล่าง: ประวัติการสรุปด้วย AI (lg_ai_discovered_laws ทุกสถานะ + lg_laws.ai_summary_at)
//         + รายการกฎหมายในทะเบียนที่ยังไม่มีสรุป ให้สั่งสรุปย้อนหลังได้.
import { useMemo, useState } from 'react'
import { saveDiscoveredLaw, deleteDiscoveredLaw, saveLawAiSummary, repealLaw } from '../lib/supabase.js'
import { I } from '../components/icons.jsx'
import { thDate, findLawDuplicate, beToISO } from '../lib/ui.jsx'
import { useAuth, NO_PERM } from '../lib/auth.js'
import { toast } from '../lib/toast.js'
import { confirmDialog } from '../lib/confirm.js'

// P16 · แยกเป็น 2 คำขอ เพราะทำต่อกันในคำขอเดียวชนเพดาน 300 วิของ Vercel จนต้องข้ามงานทิ้ง
//   คำขอ 1 /api/law-analyze (relate:false) → ตารางฉบับหลัก ผู้ใช้เห็นได้เร็ว
//   คำขอ 2 /api/law-relate  → ตามอ่านกฎหมายที่อ้างถึง แล้ว merge กลับเข้า state เดิม
// แต่ละฝั่งได้เวลา 300 วิของตัวเอง จึงไม่ต้องข้ามขั้นตอนไหนอีก
async function analyzeSource({ source = '', sourceUrl = '', pdfBase64 = '', pdfName = '' }) {
  const r = await fetch('/api/law-analyze', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ source, sourceUrl, pdfBase64, pdfName, stage: false, relate: false }),
  })
  const d = await r.json()
  if (!r.ok) throw new Error(d.error || 'สรุปไม่สำเร็จ')
  // Skill 3 · related_count/unresolved_count ต้องส่งต่อด้วย ไม่งั้นบรรทัดสรุปเหนือตารางไม่มีข้อมูล
  // related_laws = รายฉบับที่ตามไปดึง (ชื่อ/สถานะ/ลิงก์) — ต้องบอกได้ว่า "ฉบับไหน" ที่หาตัวบทไม่พบ
  // ไม่งั้น จป. เห็นแค่ตัวเลข แล้วยังไม่รู้ว่าต้องไปเปิดกฎหมายฉบับไหนเอง
  return { law: d.law || {}, requirements: d.requirements || [],
    related_count: d.related_count || 0, unresolved_count: d.unresolved_count || 0,
    rejected_count: d.rejected_count || 0,   // ฉบับที่ยืนยันการอ้างถึงไม่ได้ จึงไม่ตามไปดึง
    inlined_count: d.inlined_count || 0,         // ข้อที่เขียนใหม่ให้อ่านจบในตัวแล้ว
    manual_ref_count: d.manual_ref_count || 0,   // ข้อที่ยังอ้างเลขมาตรา ต้องเปิดตัวบทเอง
    unverified_number_count: d.unverified_number_count || 0,  // ข้อที่มีตัวเลขหาที่มาไม่เจอ
    // วันบังคับใช้: calc = โค้ดคำนวณจากกฎในตัวบท · ai = ถอยไปใช้ค่าที่ AI เขียน (ยังไม่ได้ตรวจ)
    effective_source: d.effective_source || 'none', effective_note: d.effective_note || '',
    effective_ai_mismatch: d.effective_ai_mismatch || null,
    // รายการกฎหมายที่ผ่านด่าน "อ้างถึงจริง" แล้ว รอให้คำขอที่ 2 ตามไปอ่าน
    pending_refs: d.pending_refs || [],
    related_laws: d.related_laws || [], repeals: d.repeals || [] }
}

// คำขอที่ 2 · ตามอ่านกฎหมายที่ตัวบทอ้างถึง แล้วคืนชุดข้อกำหนดที่รวมแล้ว
// แยก endpoint เพื่อให้ Skill 3 ได้เวลา 300 วิของตัวเอง ไม่ต้องแบ่งกับการอ่านตัวบทหลัก
async function relateSource({ refs, requirements, lawName }) {
  const r = await fetch('/api/law-relate', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ refs, requirements, lawName }),
  })
  const d = await r.json()
  if (!r.ok) throw new Error(d.error || 'ตามอ่านกฎหมายที่อ้างถึงไม่สำเร็จ')
  return { requirements: d.requirements || [], related_laws: d.related_laws || [],
    related_count: d.related_count || 0, unresolved_count: d.unresolved_count || 0,
    inlined_count: d.inlined_count || 0, manual_ref_count: d.manual_ref_count || 0,
    skipped_for_time: d.skipped_for_time || 0,
    skipped_for_quota: d.skipped_for_quota || 0,
    unverified_number_count: d.unverified_number_count || 0 }
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
  ['กระทรวงแรงงาน / กรมสวัสดิการและคุ้มครองแรงงาน', 'labour.go.th'],
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
  needs_manual_ref: !!q.needs_manual_ref,   // ยังอ้างเลขมาตราของกฎหมายที่ดึงตัวบทไม่ได้
  ref_inlined: !!q.ref_inlined,             // เขียนใหม่ให้อ่านจบในตัวแล้วในขั้นตอนขัดเกลา
  source_excerpt: q.source_excerpt || '',   // ข้อความจากตัวบทที่รองรับข้อนี้
  unverified_numbers: q.unverified_numbers || null,  // ตัวเลขที่หาที่มาในตัวบทไม่เจอ
  ref_answers: q.ref_answers || [],   // P17 · คำตอบจากกฎหมายที่ข้อนี้อ้างถึง
}))

// ชื่อกฎหมายเต็มยาวเกินกว่าจะใส่ใน badge — ตัดให้สั้น เก็บชื่อเต็มไว้ใน title
const shortLaw = n => { const s = String(n || '').trim(); return s.length > 30 ? s.slice(0, 30) + '…' : s }

// แถวแก้ไข → payload สำหรับ prefill AddLawFlow / เก็บ ai_payload
const buildInitialData = (law, reqRows, discoveredId = null) => ({
  law: {
    name: law.name || '', type: law.type || '', ministry: law.ministry || '',
    announce_date: law.announce_date || '', effective_date: law.effective_date || '',
    documents: law.documents || '', cat: law.cat || '', code_suggestion: law.code_suggestion || '',
    gazette_ref: law.gazette_ref || '',   // mig 037 · เล่ม/ตอน/หน้า ราชกิจจาฯ
  },
  requirements: reqRows,
  discoveredId,
})

// สาระสำคัญ (บรรทัด) จาก reqRows — ใช้เก็บลง summary jsonb
const reqRowsToLines = rows => rows
  .map(r => `${r.section_ref ? r.section_ref + ': ' : ''}${r.req_text || ''}`.trim())
  .filter(Boolean)

/* ── Skill 3 · รายชื่อกฎหมายที่ถูกอ้างถึง ทีละฉบับ ──
   เดิมหน้านี้บอกแค่ "อีก N ฉบับหาตัวบทไม่พบ" — จป. ยังไม่รู้ว่าต้องไปเปิดฉบับไหนเอง
   ซึ่งคือปัญหาเดิมที่ระบบตั้งใจแก้ · ฉบับที่ไม่ resolved ขึ้นก่อนเสมอ (สิ่งที่ต้องลงมือทำอยู่บนสุด) */
const REL_STATUS = {
  resolved:  { label: n => `ดึงแล้ว ${n} ข้อ`, color: 'var(--ink-soft)' },
  not_found: { label: () => 'หาตัวบทไม่พบ', color: 'var(--warn)' },
  manual:    { label: () => 'เกินจำนวนที่ดึงได้ในรอบเดียว — ต้องตรวจเอง', color: 'var(--warn)' },
  // AI อ้างถึงฉบับนี้ แต่ยืนยันกับตัวบทไม่ได้ จึงไม่ดึง · ไม่ใช่งานค้างของ จป.
  // แต่ต้องเห็น เผื่อเป็นการอ้างถึงจริงที่ระบบตรวจไม่เจอ (เช่น แนบ PDF ที่เราอ่านข้อความไม่ได้)
  rejected:  { label: () => 'ไม่ได้ดึง — ยืนยันการอ้างถึงไม่ได้', color: 'var(--ink-faint)' },
  // อ่านตัวบทได้และสรุปสาระมาแล้ว แม้ไม่มีข้อที่บริษัทต้องทำ — สาระถูกเอาไปเขียน
  // แทนคำว่า "ตามมาตรา X" ในข้อของฉบับหลักแล้ว ไม่ใช่งานค้างของ จป.
  explained: { label: () => 'อ่านแล้ว — สรุปสาระใส่ในข้อที่อ้างถึงแล้ว', color: 'var(--ink-soft)' },
  // สรุปเป็นข้อความไม่ได้ (ตัวบทใหญ่เกิน/อ่านไม่ออก/แหล่งยังไม่ยืนยัน) แต่รู้ว่าตัวบทอยู่ที่ไหน
  // ให้ลิงก์ไว้ดีกว่าไม่ให้อะไรเลย · ยังนับเป็นงานค้างเพราะ จป. ต้องเปิดอ่านเอง
  link_only: { label: () => 'สรุปไม่ได้ — เปิดลิงก์อ่านเอง', color: 'var(--warn)' },
  answered:  { label: () => 'อ่านตัวบทที่อ้างถึงแล้ว', color: 'var(--ok)' },
  // ตัวบทชี้ไปหาประกาศที่หน่วยงานเป็นผู้ออก — ระบบไม่ได้ค้นว่าออกแล้วหรือยัง จึงห้ามเขียนว่า "ไม่มี"
  // และต้องนับเป็นงานค้าง เพราะ จป. ต้องไปเปิดตรวจเอง (เดิมนับเป็น "เสร็จแล้ว" ซึ่งทำให้ข้ามไป)
  pending_issuance: { label: () => 'ต้องตรวจสอบเพิ่มเติมว่ามีประกาศออกแล้วหรือยัง', color: 'var(--warn)' },
  // เปิดตัวบทแล้วแต่ไม่พบเกณฑ์ — ต่างจาก not_found ตรงที่เรารู้ว่าเปิดไปเจออะไร
  not_answered: { label: () => 'เปิดตัวบทแล้วแต่ยังไม่พบเกณฑ์', color: 'var(--warn)' },
}

/* ── P17 · คำตอบของกฎหมายที่ข้อนี้อ้างถึง — เขียนต่อ "ในเนื้อข้อ" เลย ──
   รุ่นก่อนเป็นกล่องสีแยกพร้อมไอคอนและหัวข้อ "กฎหมายที่อ้างถึงระบุว่า"
   ผู้ใช้บอกว่ามันกลายเป็นของอีกชิ้นที่ต้องอ่านต่อ ทั้งที่มันคือ "สิ่งที่ข้อนี้สั่งให้ทำ" อยู่แล้ว
   ตอนนี้จึงเหลือ: เนื้อความต่อจากข้อ → ตารางเกณฑ์ → ปุ่มกางดูตัวบท → บรรทัดที่มา + ลิงก์
   ไม่มีไอคอน ไม่มีกรอบสี · สีใช้เฉพาะที่ "ป้ายบอกสถานะ" ซึ่งต้องกวาดตาเจอ */
// เลขข้อที่ยอมให้แสดงต่อท้ายชื่อกฎหมาย — กันโมเดลเขียนคำอธิบายลงช่อง section_ref
const CLAUSE_RE = /^(ข้อ|มาตรา|ตาราง|บัญชี|ภาคผนวก)\s*[\d๐-๙]/

/* ปุ่มกางดูข้อความจากตัวบท — หลักฐานของข้อนั้น พับไว้ไม่ให้บังเนื้อความ
   แต่ต้องกางได้ในที่เดียวกับที่อ่าน ไม่ใช่ต้องไปเปิดไฟล์ทั้งฉบับเพื่อดูประโยคเดียว */
function ExcerptToggle({ text }) {
  const [open, setOpen] = useState(false)
  if (!String(text || '').trim()) return null
  return (
    <div style={{ marginTop: 3 }}>
      <button type="button" onClick={() => setOpen(o => !o)}
        style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer',
          font: 'inherit', fontSize: 11.5, color: open ? 'var(--brand)' : 'var(--ink-faint)' }}>
        {open ? '▾' : '▸'} ข้อความจากตัวบท
      </button>
      {open && (
        <div style={{ marginTop: 3, padding: '4px 0 4px 9px', borderLeft: '2px solid var(--line)',
          fontSize: 11.5, lineHeight: 1.6, color: 'var(--ink-soft)' }}>{text}</div>
      )}
    </div>
  )
}

function RefAnswer({ a }) {
  const rows = Array.isArray(a.answer_detail?.['เกณฑ์']) ? a.answer_detail['เกณฑ์'] : []
  const warn = a.answer_detail?.['ข้อควรระวัง']

  // ข้อความที่เขียนต่อในเนื้อข้อ — "เฉพาะสิ่งที่ตัวบทบอก" เท่านั้น
  //
  // 2026-08-22 · ตัดคำบรรยายกระบวนการออกทั้งหมดตามที่ผู้ใช้สั่ง
  // เดิมข้อที่ตอบไม่ได้จะพ่นเป็นพืด: เหตุผลที่เปิดไม่ได้ · เบาะแสจากเว็บนอก ("เขาว่ากันว่า…")
  // · "เปิดไปเจอ:…" · คำแนะนำให้ตั้งเป็นรอประเมิน — ยาวกว่าเนื้อกฎหมายเอง และไม่มีอันไหน
  // ที่ผู้อ่านทะเบียนเอาไปใช้ได้ เพราะทุกบรรทัดลงท้ายว่า "ยังไม่ยืนยัน"
  // ตอนนี้เหลือ: สาระที่ตัวบทบอก · ชื่อฉบับ · ลิงก์ "เปิดตัวบท ↗" ให้ไปอ่านเอง
  // เหตุผลเก็บไว้ใน title ของบรรทัดที่มา (hover ดูได้) ไม่ได้ทิ้ง แค่ไม่เกะกะ
  //
  // answered: เนื้อความถูกรวมเข้า req_text ตั้งแต่ฝั่ง server แล้ว (mergeAnswerText)
  // not_answered: ไม่มีสาระจากตัวบทให้แสดง จึงว่างเปล่า เหลือแค่ชื่อฉบับ + ลิงก์
  const body = a.status === 'pending_issuance'
    ? [a.answer_plain,
       a.interim_rule ? `ถ้าตรวจแล้วยังไม่มีประกาศ ตัวบทบอกให้ ${a.interim_rule}` : ''].filter(Boolean).join(' · ')
    : ''

  // เหตุผลที่ระบบตอบไม่ได้ · เบาะแสจากรอบกู้ · ที่มารอง — ไม่แสดงเป็นข้อความแล้ว
  // แต่ยังพกไว้ใน tooltip ของบรรทัดที่มา เพราะตอนตรวจงานจริงยังต้องรู้ว่าทำไมถึงเปิดไม่ได้
  const why = [
    a.note || '',
    a.found_instead ? `เปิดไปเจอ: ${a.found_instead}` : '',
    a.from_secondary_source ? 'อ่านจากฉบับรวมขององค์กรวิชาชีพ — ตรวจกับต้นฉบับราชกิจจาฯ ก่อนใช้อ้างอิง' : '',
  ].filter(Boolean).join(' · ')

  // หมายเหตุใต้บรรทัดที่มา — เหลือเฉพาะ "ข้อควรระวัง" ที่คัดมาจากตัวบทเอง
  // ตัดออก: หลักฐานที่ต้องเก็บ (ซ้ำกับช่องเอกสารของข้อ) · ป้ายตรวจตัวเลข (ขึ้นเป็นชิปด้านบนแล้ว)
  // · ประเด็นที่ค้นไม่เจอ (เป็นภาษาภายในระบบ ผู้อ่านทะเบียนไม่ได้ใช้)
  const srcNotes = [warn || ''].filter(Boolean)

  return (
    <div style={{ marginLeft: 30, marginTop: 5, fontSize: 13.5, lineHeight: 1.7 }}>
      {/* ขนาดตัวอักษรและระยะเยื้องเท่ากับเนื้อข้อ — สิ่งที่กฎหมายที่อ้างถึงกำหนด
          คือ "สิ่งที่ข้อนี้สั่งให้ทำ" จริง ๆ ไม่ใช่หมายเหตุประกอบ จึงต้องอ่านต่อเนื่องกัน */}
      {(body || (a.from_table && rows.length > 0)) && (
        <div style={{ color: 'var(--ink)' }}>
          {body}
          {a.from_table && rows.length > 0 && (
            <span style={{ color: 'var(--ink-faint)' }}>เกณฑ์ข้างล่างมาจากตารางท้ายกฎหมาย</span>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <div style={{ marginTop: 4, overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
            <tbody>{rows.map((c, i) => (
              <tr key={i}>
                <td style={{ padding: '1px 12px 1px 0', color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{c['กรณี'] || '—'}</td>
                <td style={{ padding: '1px 12px 1px 0', fontWeight: 600, whiteSpace: 'nowrap' }}>{c['จำนวน'] || ''}</td>
                <td style={{ padding: '1px 0', color: 'var(--ink-soft)' }}>{c['ต่อหน่วย'] || ''}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}

      <ExcerptToggle text={a.source_excerpt} />

      {/* บรรทัดที่มา — ชื่อกฎหมายที่อ้างถึง + ลิงก์ตัวบท เท่านั้น ไม่มีป้ายนำหน้า
          section_ref แสดงเฉพาะเมื่อเป็นเลขข้อจริง ๆ · โมเดลบางครั้งเขียนคำอธิบายลงช่องนี้
          ("ไม่ระบุข้อ (ตัวบทระบุค่าไม่เกิน 10 เดซิเบลเอ)") ซึ่งซ้ำกับเนื้อความข้างบนและรกตา */}
      <div style={{ marginTop: 3, display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', fontSize: 12 }}>
        <span title={why || undefined} style={{ color: 'var(--ink-soft)', cursor: why ? 'help' : undefined }}>
          {a.law_name || '—'}{CLAUSE_RE.test(a.section_ref || '') ? ` · ${a.section_ref}` : ''}
        </span>
        {a.source_url && (
          <a href={a.source_url} target="_blank" rel="noreferrer" style={{ color: 'var(--brand)' }}>เปิดตัวบท ↗</a>
        )}
        {/* ลิงก์ราชกิจจาฯ ต้นฉบับ — เป็นของเพิ่ม ไม่ใช่ของแทน "เปิดตัวบท"
            คำตอบอ่านมาจากที่ไหนก็ต้องอ้างที่นั่น ส่วนอันนี้ไว้ให้ผู้ตรวจ ISO ที่ขอดูต้นฉบับ
            ขึ้นเฉพาะเมื่อพิสูจน์ได้ว่าเป็นฉบับเดียวกัน (ปีตรง + เลขฉบับตรง + มาจากสารบัญทางการ) */}
        {a.gazette_url && a.gazette_url !== a.source_url && (
          <a href={a.gazette_url} target="_blank" rel="noreferrer"
             title={a.gazette_ref ? `ราชกิจจานุเบกษา ${a.gazette_ref}` : 'ต้นฉบับราชกิจจานุเบกษา'}
             style={{ color: 'var(--ink-soft)' }}>
            ราชกิจจาฯ{a.gazette_ref ? ` ${a.gazette_ref}` : ''} ↗
          </a>
        )}
      </div>
      {srcNotes.map((n, k) => (
        <div key={k} style={{ fontSize: 11.5, lineHeight: 1.55, color: 'var(--ink-faint)' }}>{n}</div>
      ))}
    </div>
  )
}

function RelatedLawsPanel({ items = [] }) {
  if (!items.length) return null
  // เรียงตามสิ่งที่ต้องลงมือทำ: not_found/manual (ต้องตรวจเอง) → resolved → rejected (ไม่ได้ดึง ไม่ใช่งานค้าง)
  // pending_issuance ถูกย้ายออกจากกลุ่ม "เสร็จแล้ว" เมื่อ 2026-08-17 — เดิมนับว่าเสร็จเพราะเชื่อว่า
  // "ไม่มีตัวบทให้เปิด" แต่ระบบไม่เคยค้นเลย และพบว่าหลายฉบับออกประกาศมาแล้ว
  // นับเป็นงานค้างจึงถูกกว่า: อย่างมากคือ จป. เปิดดูแล้วพบว่ายังไม่ออก เสียเวลาไม่กี่นาที
  // ตรงข้ามกับการข้ามไป ซึ่งทำให้ตกข้อที่มีหน้าที่ต้องทำจริงโดยไม่มีใครรู้
  const DONE = new Set(['resolved', 'explained', 'answered'])
  const rank = x => x.status === 'rejected' ? 2 : DONE.has(x.status) ? 1 : 0
  const sorted = [...items].sort((a, b) => rank(a) - rank(b))
  // rejected ไม่นับเป็นงานค้าง — ระบบตัดสินแล้วว่าตัวบทไม่ได้อ้างถึง ไม่ใช่ของที่ จป. ต้องไปเปิดเอง
  const pending = sorted.filter(x => !DONE.has(x.status) && x.status !== 'rejected').length

  return (
    <details open={pending > 0} style={{ margin: '0 0 10px', fontSize: 12 }}>
      <summary style={{ cursor: 'pointer', color: 'var(--brand)' }}>
        กฎหมายที่อ้างถึง — ที่ยังไม่ได้ผูกกับข้อใด ({items.length} ฉบับ)
        {pending > 0 && <span style={{ color: 'var(--warn)' }}> · ต้องตรวจเอง {pending} ฉบับ</span>}
      </summary>
      <div style={{ marginTop: 6, borderTop: '1px solid var(--line)' }}>
        {sorted.map((x, i) => {
          const st = REL_STATUS[x.status] || REL_STATUS.not_found
          return (
            <div key={i} style={{ padding: '7px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
                {/* เหตุผล/เบาะแสของฉบับนี้ย้ายเข้า tooltip 2026-08-22 — แผงนี้เคยพ่นคำบรรยาย
                    ชุดเดียวกับใต้ข้อ ("ยังเปิดตัวบทจริงไม่ได้ แต่ค้นจากเว็บทั่วไป…") ยาวจนอ่านไม่ไหว
                    เหลือแค่ ชื่อฉบับ · สถานะ · เปิดตัวบท ↗ ให้เหมือนกันทั้งหน้า */}
                <span title={x.note || undefined}
                  style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: DONE.has(x.status) ? 400 : 600,
                    cursor: x.note ? 'help' : undefined }}>
                  {x.law_name || '—'}{x.clause && x.clause !== 'ทั้งฉบับ' ? ` · ${x.clause}` : ''}
                </span>
                <span style={{ fontSize: 11.5, color: st.color, whiteSpace: 'nowrap' }}>{st.label(x.req_count || 0)}</span>
                {x.depth > 1 && x.via && (
                  <span title={`ตัวบทฉบับนี้ถูกตามต่อ เพราะ "${x.via}" บอกว่าเงื่อนไขจริงอยู่ที่นี่`}
                    style={{ fontSize: 11, color: 'var(--ink-faint)', cursor: 'help' }}>↳ ตามต่อจาก {shortLaw(x.via)}</span>
                )}
                {x.source_url && (
                  <a href={x.source_url} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: 'var(--brand)', marginLeft: 'auto' }}>เปิดตัวบท ↗</a>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {pending > 0 && (
        <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--ink-faint)', lineHeight: 1.6 }}>
          ฉบับที่ยังไม่ได้ดึง ต้องเปิดตัวบทตรวจเอง แล้วเพิ่มข้อปฏิบัติที่ขาดด้วยปุ่ม “เพิ่มข้อ” ด้านล่าง
        </div>
      )}
    </details>
  )
}

/* ── กฎหมายฉบับนี้ยกเลิกฉบับเดิม — จับคู่กับทะเบียนให้เลย ──
   ตัวบทเขียนแค่ "ให้ยกเลิก <ชื่อกฎหมาย>" ผู้ใช้ต้องไปไล่หาเองว่าคือรหัสไหนในทะเบียน
   หน้านี้มีรายการกฎหมายทั้งทะเบียนอยู่แล้ว จับคู่ด้วยตัวเทียบชื่อชุดเดียวกับที่ใช้กันเพิ่มซ้ำ */
function RepealsPanel({ repeals = [], laws = [], newLaw = {}, onReloadLaws }) {
  const { can } = useAuth()
  const [busyId, setBusyId] = useState(null)
  // ผลจับคู่มาจาก API เป็นหลัก (api/_lib/repeal-match.js เทียบกับ lg_laws ให้แล้ว)
  // ตัวเทียบฝั่งนี้เหลือไว้เป็นทางสำรองสำหรับผลรุ่นเก่าที่ยังไม่มี registry_checked
  // กติกาสองฝั่งต้องตรงกันเป๊ะ ไม่งั้นผู้ใช้จะเห็นผลต่างกันในหน้าเดียวกัน
  const rows = useMemo(() => repeals.map(r => {
    if (r.registry_checked) {
      const inReg = r.in_registry && r.registry_id
      return { ...r, match: inReg
        ? { type: r.match_type || 'exact', sim: r.match_sim || 1,
            law: laws.find(l => l.id === r.registry_id)
              || { id: r.registry_id, code: r.registry_code, name: r.registry_name,
                   status: r.already_repealed ? 'repealed' : 'active' } }
        : null }
    }
    const hit = findLawDuplicate(laws, r.law_name)
    return { ...r, match: hit && (hit.type === 'exact' || hit.sim >= 0.75) ? hit : null }
  }), [repeals, laws])
  if (!rows.length) return null
  const matched = rows.filter(r => r.match).length

  // ตั้งฉบับเดิมเป็น "ยกเลิก" จากหน้านี้เลย — ใช้ repealLaw ตัวเดิมของระบบ
  //   (มันจัดการ log แจ้งเตือน + สถิติรายไตรมาสให้ครบอยู่แล้ว)
  // วันที่ยกเลิก = วันบังคับใช้ของฉบับใหม่ · ไม่มีก็ใช้วันนี้
  async function markRepealed(old) {
    const label = `${old.code} — ${(old.name || '').slice(0, 45)}`
    if (!(await confirmDialog(
      `ตั้ง "${label}" เป็นยกเลิก?\n\nเหตุผล: ถูกยกเลิกโดย ${(newLaw.name || 'กฎหมายฉบับใหม่').slice(0, 60)}`,
      { danger: true }))) return
    setBusyId(old.id)
    try {
      await repealLaw(old.id, {
        repeal_date: beToISO(newLaw.effective_date) || new Date().toISOString().slice(0, 10),
        repeal_reason: `ถูกยกเลิกโดย ${newLaw.name || '(กฎหมายฉบับใหม่)'}`,
        replaced_by_code: null,   // ฉบับใหม่ยังไม่เข้าทะเบียน ยังไม่มีรหัส
        repealed_by_authority: newLaw.name || null,
      })
      toast(`ตั้ง ${old.code} เป็นยกเลิกแล้ว`, 'success')
      onReloadLaws && onReloadLaws()
    } catch (e) { toast('ตั้งเป็นยกเลิกไม่สำเร็จ: ' + e.message) }
    setBusyId(null)
  }

  return (
    <div style={{ marginTop: 12, padding: '10px 13px', borderRadius: 9, background: 'var(--warn-bg)', border: '1px solid var(--warn)' }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--warn)' }}>
        ⚠ กฎหมายฉบับนี้ยกเลิกกฎหมายเดิม {rows.length} ฉบับ
        {matched < rows.length && (
          <span style={{ fontWeight: 400, color: 'var(--ink-soft)' }}>
            {' '}· พบในทะเบียน {matched} ฉบับ
          </span>
        )}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', margin: '3px 0 7px', lineHeight: 1.6 }}>
        {matched > 0
          ? 'เพิ่มฉบับใหม่เข้าทะเบียนแล้ว อย่าลืมไปตั้งฉบับเดิมเป็น “ยกเลิก” ด้วย ไม่งั้นทะเบียนจะมี 2 ฉบับซ้อนกัน'
          : 'ตัวบทระบุบทยกเลิกไว้ แต่ยังไม่พบฉบับที่ถูกยกเลิกในทะเบียน — บันทึกไว้เป็นข้อมูลว่าฉบับนี้ไปยกเลิกอะไร'}
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ padding: '5px 0', borderTop: i ? '1px solid var(--line)' : 'none' }}>
          {/* บรรทัดนี้ต้องขึ้นเหมือนกันทั้งกรณีพบและไม่พบในทะเบียน —
              บทยกเลิกเป็นสิ่งที่ตัวบทเขียนไว้ ไม่ได้ขึ้นกับว่าเราเคยบันทึกฉบับเก่าหรือเปล่า */}
          <div style={{ fontSize: 12.5 }}>
            <b style={{ color: 'var(--warn)' }}>ยกเลิก</b> {r.law_name}{r.clause ? ` · ${r.clause}` : ''}
          </div>
          <div style={{ fontSize: 11.5, marginTop: 2, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {r.match ? (<>
              <span style={{ color: 'var(--ok)' }}>
                พบในทะเบียน: <b>{r.match.law.code}</b> — {(r.match.law.name || '').slice(0, 50)}
                {r.match.type !== 'exact' && ` (ชื่อคล้าย ${Math.round(r.match.sim * 100)}% — ตรวจก่อน)`}
              </span>
              {r.match.law.status === 'repealed'
                ? <span style={{ color: 'var(--ok)', fontWeight: 600 }}>· ตั้งเป็นยกเลิกแล้ว ✓</span>
                : <button className="btn btn-ghost" style={{ padding: '2px 9px', fontSize: 11, marginLeft: 'auto' }}
                    disabled={busyId === r.match.law.id || !can('edit')}
                    title={can('edit') ? 'ตั้งกฎหมายฉบับเดิมเป็นยกเลิก โดยไม่ต้องไปเปิดหน้าทะเบียน' : NO_PERM}
                    onClick={() => markRepealed(r.match.law)}>
                    {busyId === r.match.law.id ? 'กำลังบันทึก…' : 'ตั้งเป็นยกเลิกเลย'}
                  </button>}
            </>) : (
              <span style={{ color: 'var(--ink-faint)' }}>
                {r.registry_checked === false
                  ? 'ตรวจทะเบียนไม่สำเร็จรอบนี้ — ยังไม่ทราบว่าฉบับนี้อยู่ในทะเบียนหรือไม่'
                  : r.near_miss_year
                    /* ชื่อคล้ายมากแต่เป็นคนละปี = คนละฉบับ · บอกให้เห็นแต่ห้ามมีปุ่มกด
                       ไม่งั้นจะไปตั้ง "ฉบับปัจจุบัน" เป็นยกเลิกแทนฉบับเก่า */
                    ? `ไม่พบฉบับนี้ในทะเบียน — ที่ชื่อใกล้เคียงคือ ${r.near_miss_year.slice(0, 60)} ซึ่งเป็นคนละปี จึงเป็นคนละฉบับ`
                    : r.match_sim > 0
                      ? `ไม่พบในทะเบียน — ที่ใกล้เคียงที่สุดตรงกัน ${Math.round(r.match_sim * 100)}% ซึ่งยังไม่พอชี้ว่าเป็นฉบับเดียวกัน`
                      : 'ไม่พบในทะเบียน — อาจยังไม่เคยบันทึก หรือชื่อต่างจากที่เก็บไว้'}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── แถวข้อปฏิบัติแบบแก้ไขได้ ── */
function ReqRow({ r, i, onChange, onRemove, suggest }) {
  const set = (k, v) => onChange(i, { ...r, [k]: v })
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span className="num" style={{ paddingTop: 9, minWidth: 22, color: 'var(--ink-faint)' }}>{i + 1}.</span>
        <input className="form-input" style={{ marginTop: 0, maxWidth: 130 }} value={r.section_ref} onChange={e => set('section_ref', e.target.value)} placeholder="มาตรา/ข้อ" />
        {/* ยืดตามความยาวของข้อความ — ข้อที่รวมเนื้อความจากกฎหมายที่อ้างถึงแล้วยาวขึ้นมาก
            rows คงที่ทำให้ต้องเลื่อนอ่านในกล่องเล็ก ๆ ซึ่งตรวจงานไม่ได้จริง
            เพดาน 12 แถวกันข้อเดียวกินทั้งหน้าจอ เกินจากนั้นค่อยเลื่อนในกล่อง */}
        <textarea className="form-input" rows={Math.min(12, Math.max(1, Math.ceil((r.req_text || '').length / 60)))}
          style={{ marginTop: 0 }} value={r.req_text} onChange={e => set('req_text', e.target.value)} placeholder="เนื้อหาข้อปฏิบัติ…" />
        <button className="btn btn-ghost" style={{ padding: '7px 9px' }} onClick={() => onRemove(i)}><I n="x" /></button>
      </div>
      {/* ตัวเลขที่ไม่พบในตัวบท — อันตรายสุดในบรรดาป้ายทั้งหมด เพราะอัตรา/วงเงิน/วันที่ผิด
          ทำให้ทะเบียนใช้ตรวจ ISO ไม่ได้ · เคยเจอจริง: ร้อยละ 50 กลายเป็น 100, 2571 เป็น 2570 */}
      {r.unverified_numbers?.length > 0 && (
        <div style={{ marginLeft: 30, marginTop: 4 }}>
          <span title={`ตัวเลข ${r.unverified_numbers.join(', ')} ไม่พบในข้อความที่คัดมาจากตัวบท — เปิดตัวบทตรวจก่อนอนุมัติ${r.source_excerpt ? '\n\nข้อความจากตัวบท: ' + r.source_excerpt : ''}`}
            style={{ display: 'inline-block', fontSize: 11, lineHeight: 1.5, padding: '1px 7px', borderRadius: 999,
              background: 'var(--warn)', color: '#fff', cursor: 'help', fontWeight: 600 }}>
            ⚠ ตรวจตัวเลข {r.unverified_numbers.join(', ')} — ไม่พบในตัวบท
          </span>
        </div>
      )}
      {/* ป้าย "⚠ ยังอ้างเลขมาตรา — ต้องเปิดตัวบทเติมเอง" ถูกถอดออก 2026-08-22 ตามที่ผู้ใช้สั่ง
          มันไม่ได้บอกอะไรที่ทำต่อได้ — ข้อที่อ้างเลขมาตราก็เห็นอยู่แล้วจากตัวข้อความเอง
          และฉบับที่ต้องไปเปิด อยู่ในบรรทัดที่มาใต้ข้อพร้อมลิงก์ "เปิดตัวบท ↗" แล้ว
          ธง needs_manual_ref ยังคงอยู่ฝั่ง API (ใช้นับ manual_ref_count) แค่ไม่ขึ้นเป็นป้าย */}
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
      {/* P17 · คำตอบของกฎหมายที่ข้อนี้อ้างถึง — อยู่ใต้ข้อโดยตรง ไม่ใช่แถวใหม่ท้ายตาราง */}
      {(r.ref_answers || []).map((a, k) => <RefAnswer key={k} a={a} />)}
      {/* หลักฐานของข้อนี้เอง — พับไว้เหมือนกัน กางดูได้โดยไม่ต้องเปิดไฟล์ทั้งฉบับ */}
      {r.source_excerpt && (
        <div style={{ marginLeft: 30 }}><ExcerptToggle text={r.source_excerpt} /></div>
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
// laws = ทะเบียนทั้งหมด รวมฉบับที่ยกเลิกแล้ว — RepealsPanel ต้องเห็นฉบับที่ยกเลิกไปแล้วด้วย
// ไม่งั้นกดปุ่ม "ตั้งเป็นยกเลิกเลย" เสร็จแล้วแถวจะกลายเป็น "ไม่พบในทะเบียน" แทนที่จะขึ้น ✓
function AiSummaryZone({ cats, laws = [], suggest, onQueued, onAddToRegistry, onReloadLaws }) {
  const { can } = useAuth()
  const [src, setSrc] = useState('')
  const [srcUrl, setSrcUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [law, setLaw] = useState(null)          // {name,type,ministry,...,cat}
  const [reqs, setReqs] = useState([])          // reqRows
  // Skill 3 · count = จำนวน "ข้อ" ที่ดึงมาได้ · unresolved = จำนวน "ฉบับ" ที่หาตัวบทไม่พบ · laws = รายฉบับ
  const [related, setRelated] = useState({ count: 0, unresolved: 0, laws: [] })
  const [repeals, setRepeals] = useState([])   // กฎหมายที่ตัวบทสั่งให้ยกเลิก
  const [effInfo, setEffInfo] = useState(null) // ที่มาของวันบังคับใช้ + กรณี AI บวกวันไม่ตรง
  // id ของแถวประวัติที่บันทึกทันทีหลังสรุปเสร็จ · กด "เก็บลงคิว" จะอัปเดตแถวเดิม ไม่สร้างซ้ำ
  const [histId, setHistId] = useState(null)
  const [histMeta, setHistMeta] = useState(null)   // ผล Skill 3 ของรอบนี้ ใช้ซ้ำตอนเก็บลงคิว
  // P16 · โฟลว์ 2 คำขอ — phase บอกว่ากำลังทำด่านไหน เพื่อขึ้นข้อความให้ตรง
  const [phase, setPhase] = useState(null)        // 'main' | 'relate' | null
  const [pendingCount, setPendingCount] = useState(0)   // จำนวนกฎหมายที่รอตามอ่าน
  // ตั้งไว้เมื่อคำขอที่ 2 ล้ม เพื่อให้กดลองเฉพาะด่านนั้นซ้ำได้ (cache ทำให้รอบสองเร็วมาก)
  const [relateRetry, setRelateRetry] = useState(null)

  // ── ฉบับที่ยังไม่ได้ไปโผล่ใต้ข้อใดข้อหนึ่ง ────────────────────────────────
  // 3 สถานะนี้มาจากโฟลว์คำถาม (P17) ซึ่งถูกผูกไว้กับข้อผ่าน for_section แล้ว
  // จึงตัดออกจากแผงรวม "เฉพาะเมื่อผูกติดข้อได้จริง" — เช็คจากชื่อกฎหมายใน ref_answers ของข้อ
  // ผูกไม่ติด (for_section ไม่ตรงข้อไหนเลย) ต้องยังอยู่ในแผง ไม่งั้นข้อมูลหายเงียบ
  const leftoverRefs = useMemo(() => {
    const INLINE = new Set(['answered', 'pending_issuance', 'not_answered'])
    const attached = new Set(
      reqs.flatMap(r => (r.ref_answers || []).map(a => String(a.law_name || '').trim()))
    )
    return (related.laws || []).filter(
      x => !INLINE.has(x.status) || !attached.has(String(x.law_name || '').trim())
    )
  }, [related.laws, reqs])

  // ── แสดงผลครั้งเดียวเมื่อตามอ่านครบ ──────────────────────────────────────
  // เดิมด่านแรกจบแล้ว setLaw/setReqs ทันที ตารางขึ้นก่อน แล้วข้อจากกฎหมายที่อ้างถึง
  // ค่อยเติมเข้ามาทีหลัง ผู้ใช้บอกว่าอ่านสรุปที่ยังไม่ครบแล้วสับสน เพราะไม่รู้ว่าที่เห็น
  // คือของจริงหรือของชั่วคราว · ตอนนี้จึงถือผลของด่านแรกไว้ในตัวแปร แล้วค่อยลงจอ
  // พร้อมกันทีเดียวเมื่อด่านสองเสร็จ
  //
  // ยังคงยิง 2 คำขอเหมือนเดิม — การรวมเป็นคำขอเดียวจะชนเพดาน maxDuration 300 วิ
  // ของ Vercel ซึ่งเป็นเหตุผลที่แยกไว้ตั้งแต่แรก (P16) · ที่เปลี่ยนคือจังหวะแสดงผล
  // ไม่ใช่สถาปัตยกรรม
  function commit(l, rows, rp, eff) {
    setLaw({ ...l, cat: l.cat || cats[0]?.code || 'LA' })
    setReqs(rows)
    setRepeals(rp || [])
    setEffInfo(eff)
  }

  async function analyze() {
    if (!src.trim() || busy) return
    setBusy(true); setLaw(null); setReqs([]); setRelated({ count: 0, unresolved: 0, laws: [] }); setRepeals([]); setHistId(null); setHistMeta(null); setEffInfo(null); setRelateRetry(null); setPendingCount(0)
    setPhase('main')
    try {
      const { law: l, requirements, rejected_count, repeals: rp, pending_refs,
        effective_source, effective_note, effective_ai_mismatch } = await analyzeSource({ source: src, sourceUrl: srcUrl.trim() })
      const rows = toReqRows(requirements)
      const eff = { source: effective_source, note: effective_note, mismatch: effective_ai_mismatch }
      await runRelate({ refs: pending_refs, requirements, lawName: l.name || '' }, l, rows,
        /^https?:\/\//i.test(src.trim()) ? 'link' : 'text', rejected_count, rp, eff)
    } catch (e) { toast('สรุปไม่สำเร็จ: ' + e.message); setPhase(null) }
    setBusy(false)
  }

  async function analyzePdf(file) {
    if (!file || busy) return
    if (file.size > 4 * 1024 * 1024) { toast('ไฟล์ PDF ใหญ่เกิน 4MB — กรุณาแยกไฟล์ หรือ copy ตัวบทมาวางแทน'); return }
    setBusy(true); setLaw(null); setReqs([]); setRelated({ count: 0, unresolved: 0, laws: [] }); setRepeals([]); setHistId(null); setHistMeta(null); setEffInfo(null); setRelateRetry(null); setPendingCount(0)
    try {
      const pdfBase64 = await readFileBase64(file)
      setPhase('main')
      const { law: l, requirements, rejected_count, repeals: rp, pending_refs,
        effective_source, effective_note, effective_ai_mismatch } = await analyzeSource({ pdfBase64, pdfName: file.name, sourceUrl: srcUrl.trim() })
      const rows = toReqRows(requirements)
      const eff = { source: effective_source, note: effective_note, mismatch: effective_ai_mismatch }
      await runRelate({ refs: pending_refs, requirements, lawName: l.name || '' }, l, rows, 'pdf', rejected_count, rp, eff)
    } catch (e) { toast('สรุป PDF ไม่สำเร็จ: ' + e.message); setPhase(null) }
    setBusy(false)
  }

  // ด่านที่ 2 · ตามอ่านกฎหมายที่อ้างถึง แล้วลงจอพร้อมกับผลของด่านแรกทีเดียว
  //
  // ล้มเหลวต้องไม่ทำให้ไม่ได้อะไรเลย — ลงผลของด่านแรกแทน (rp/eff ที่ถือมาจากด่านแรก)
  // แล้วขึ้นปุ่ม "ลองเติมกฎหมายที่อ้างถึงอีกครั้ง" · หลักประกันเดิมของ P16 ยังอยู่ครบ
  // เปลี่ยนแค่ว่าผลของด่านแรกลงจอ "ตอนล้มเหลว" แทนที่จะลงตั้งแต่ต้น
  async function runRelate(ctx, l, mainRows, input, rejected_count, rp, eff) {
    setPhase('relate')
    setPendingCount(ctx.refs.length)
    try {
      const rel = await relateSource(ctx)
      const rows = toReqRows(rel.requirements)      // req_no ชุดใหม่จาก response
      commit(l, rows, rp, eff)
      setRelated({ count: rel.related_count, unresolved: rel.unresolved_count, laws: rel.related_laws })
      setRelateRetry(null)
      await logRun(l, rows, { related_count: rel.related_count,
        unresolved_count: rel.unresolved_count, rejected_count }, input)
      const left = rel.skipped_for_time + rel.skipped_for_quota
      if (left > 0) toast(rel.skipped_for_time >= rel.skipped_for_quota
        ? `ตามอ่านได้บางส่วน — ยังเหลือ ${left} ฉบับ (เวลาในรอบนี้ไม่พอ) กดปุ่มลองอีกครั้งจะเร็วขึ้น`
        : `ตามอ่านได้บางส่วน — ยังเหลือ ${left} ฉบับ (เต็มโควตาการค้นต่อรอบ) กดปุ่มลองอีกครั้งเพื่อดึงส่วนที่เหลือ`)
      else toast('สรุปครบแล้ว — ตรวจ/แก้ไขได้', 'success')
    } catch (e) {
      commit(l, mainRows, rp, eff)
      setRelateRetry({ ...ctx, _l: l, _rows: mainRows, _input: input, _rejected: rejected_count, _rp: rp, _eff: eff })
      toast('เติมกฎหมายที่อ้างถึงไม่สำเร็จ: ' + e.message + ' — ข้อของฉบับหลักยังอยู่ครบ')
      await logRun(l, mainRows, { related_count: 0, unresolved_count: 0, rejected_count }, input)
    }
    setPhase(null)
  }

  // บันทึกทุกครั้งที่สรุปเสร็จ ไม่ต้องรอผู้ใช้กดเก็บ — ไม่งั้นรายการที่กด "เพิ่มเข้าทะเบียน"
  // ตรงๆ หรือปิดหน้าไป จะไม่เหลือร่องรอยในประวัติเลย · สถานะ draft ไม่เข้าคิวรอเข้าทะเบียน
  // บันทึกไม่สำเร็จต้องไม่ทำให้ผลสรุปที่อยู่บนจอหาย — แค่เตือนแล้วปล่อยผ่าน
  async function logRun(l, reqRows, r, input) {
    try {
      const realUrl = srcUrl.trim() || (/^https?:\/\//i.test(src.trim()) ? src.trim() : null)
      const meta = { input, related_count: r.related_count || 0,
        unresolved_count: r.unresolved_count || 0, rejected_count: r.rejected_count || 0 }
      setHistMeta(meta)
      const id = await saveDiscoveredLaw({
        law_name: l.name || '(ไม่ทราบชื่อ)', source: 'ai', source_url: realUrl,
        ministry: l.ministry || null, announced_date: l.announce_date || null,
        effective_date: l.effective_date || null,
        related_docs: l.documents ? [l.documents] : [],
        summary: reqRowsToLines(reqRows),
        ai_payload: { ...buildInitialData({ ...l }, reqRows), meta },
        status: 'draft', searched_at: new Date().toISOString(),
      })
      setHistId(id)
      onQueued && onQueued()
    } catch (e) { toast('บันทึกประวัติไม่สำเร็จ: ' + e.message) }
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
        id: histId,   // อัปเดตแถวประวัติที่สร้างไว้ตอนสรุปเสร็จ ไม่สร้างซ้ำ
        law_name: law.name, source: 'ai', source_url: realUrl,
        ministry: law.ministry || null, announced_date: law.announce_date || null,
        effective_date: law.effective_date || null,
        related_docs: law.documents ? [law.documents] : [],
        summary: reqRowsToLines(reqs),
        ai_payload: { ...buildInitialData({ ...law }, reqs), meta: histMeta || undefined },
        status: 'imported', searched_at: new Date().toISOString(),
      })
      toast('เก็บลงคิว "รอเข้าทะเบียน" แล้ว', 'success')
      setLaw(null); setReqs([]); setSrc(''); setSrcUrl(''); setRelated({ count: 0, unresolved: 0, laws: [] }); setRepeals([]); setHistId(null); setHistMeta(null); setEffInfo(null); setRelateRetry(null); setPendingCount(0)
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

      {/* ยิง 2 คำขอเหมือนเดิม แต่ผลลงจอครั้งเดียวตอนจบ — ระหว่างรอจึงต้องบอกให้ชัด
          ว่าอยู่ขั้นไหนและเหลืออีกกี่ฉบับ ไม่งั้นหน้าจอว่างเปล่าจะดูเหมือนค้าง */}
      {busy && (
        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--warn-soft, rgba(255,176,32,.12))', fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
          {phase === 'relate' ? (
            <>
              <b>ขั้นที่ 2 จาก 2</b> · กำลังตามอ่านกฎหมายที่ตัวบทอ้างถึง{pendingCount ? ` ${pendingCount} ฉบับ` : ''}…<br />
              อ่านตัวบทฉบับหลักเสร็จแล้ว รอเติมข้อจากกฎหมายที่อ้างถึงให้ครบ แล้วจะขึ้นสรุปทีเดียว
            </>
          ) : (
            <>
              <b>ขั้นที่ 1 จาก 2</b> · กำลังอ่านตัวบทและแตกข้อปฏิบัติ… — กฎหมายสั้นราว 30 วินาที ส่วนกฎหมายยาว (5–10 หน้า) อาจใช้เวลา <b>1–2 นาที</b><br />
              กรุณาอย่าปิดหน้าต่างหรือกดซ้ำระหว่างรอ
            </>
          )}
        </div>
      )}

      {/* ด่านสองล้มไม่ทำให้ผลด่านแรกหาย — ให้ยิงซ้ำเฉพาะด่านสองได้ (cache ทำให้เร็วขึ้นมาก) */}
      {!busy && relateRetry && (
        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--warn-bg)', fontSize: 12.5, color: 'var(--warn)', lineHeight: 1.6, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>ยังเติมข้อจากกฎหมายที่อ้างถึงไม่สำเร็จ ({relateRetry.refs.length} ฉบับ) — ข้อของฉบับหลักครบแล้ว</span>
          <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 11.5, marginLeft: 'auto' }}
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              // ผลของด่านแรกลงจอไปแล้วตอนล้มเหลว — ยิงซ้ำจึงส่งของเดิมกลับเข้าไป
              // เพื่อให้ commit() ครั้งใหม่ไม่ล้าง repeals/effInfo ที่ผู้ใช้เห็นอยู่
              await runRelate(relateRetry, relateRetry._l || law || {}, relateRetry._rows || reqs,
                relateRetry._input || 'retry', relateRetry._rejected || 0,
                relateRetry._rp ?? repeals, relateRetry._eff ?? effInfo)
              setBusy(false)
            }}>
            ลองเติมกฎหมายที่อ้างถึงอีกครั้ง
          </button>
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
            <div>
              <label className="form-label">วันบังคับใช้</label>
              <input className="form-input" style={{ marginTop: 0 }} value={law.effective_date || ''} onChange={e => setLawField('effective_date', e.target.value)} />
              {/* บอกที่มาเสมอ — วันบังคับใช้คือตัวตั้งของการเตือนทั้งระบบ ผิดวันเดียวเตือนผิดหมด */}
              {effInfo?.note && (
                <div style={{ fontSize: 11, marginTop: 3, lineHeight: 1.5,
                  color: (effInfo.mismatch || effInfo.source === 'default' || effInfo.source === 'ai')
                    ? 'var(--warn)' : 'var(--ink-faint)' }}>
                  {effInfo.source === 'calc' && '✓ ระบบคำนวณจากตัวบท: '}
                  {effInfo.source === 'rule' && '✓ อ่านจากตัวบท: '}
                  {effInfo.source === 'default' && '⚠ ค่าตั้งต้น ไม่ได้มาจากตัวบท: '}
                  {effInfo.source === 'ai' && '⚠ ยังไม่ได้ตรวจ: '}
                  {effInfo.note}
                  {effInfo.mismatch && <><br/>⚠ AI คำนวณมาเป็น {effInfo.mismatch} ซึ่งไม่ตรงกับที่ระบบคำนวณ — ระบบใช้ค่าของตัวเองแล้ว</>}
                </div>
              )}
            </div>
          </div>
          <label className="form-label" style={{ marginTop: 8 }}>เอกสาร/แบบฟอร์มที่เกี่ยวข้อง</label>
          <input className="form-input" style={{ marginTop: 0 }} value={law.documents || ''} onChange={e => setLawField('documents', e.target.value)} />
          {/* mig 037 · เล่ม/ตอน/หน้า ราชกิจจาฯ — ตัวชี้ต้นฉบับที่แม่นที่สุด ใช้ยืนยันตอนตรวจ ISO */}
          <label className="form-label" style={{ marginTop: 8 }}>อ้างอิงราชกิจจานุเบกษา <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>(เล่ม/ตอน/หน้า)</span></label>
          <input className="form-input" style={{ marginTop: 0 }} placeholder="เช่น เล่ม 143 ตอนที่ 17 ก หน้า 4-7"
            value={law.gazette_ref || ''} onChange={e => setLawField('gazette_ref', e.target.value)} />

          {/* ตัวบทสั่งยกเลิกฉบับเดิม → จับคู่กับทะเบียนให้เห็นว่าคือรหัสไหน */}
          <RepealsPanel repeals={repeals} laws={laws} newLaw={law} onReloadLaws={onReloadLaws} />

          <div className="sec-t" style={{ marginTop: 14, display: 'flex' }}>ข้อปฏิบัติ ({reqs.length})
            <button className="btn btn-ghost" style={{ marginLeft: 'auto', padding: '3px 10px', fontSize: 12 }} onClick={() => setReqs(p => [...p, { section_ref: '', req_text: '', responsible: '', frequency: '', documents: '' }])}><I n="plus" />เพิ่มข้อ</button>
          </div>
          {/* Skill 3 · บอกว่ามีข้อที่ดึงมาจากกฎหมายที่ตัวบทอ้างถึงกี่ข้อ */}
          {related.count > 0 && (
            <div style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '2px 0 6px', lineHeight: 1.6 }}>
              รวมข้อกำหนดจากกฎหมายที่อ้างถึง {related.count} ข้อ
              {related.unresolved > 0 && (
                <span style={{ color: 'var(--warn)' }}> · อีก {related.unresolved} ฉบับหาตัวบทไม่พบ ควรตรวจสอบเพิ่มเติม</span>
              )}
            </div>
          )}
          {reqs.map((r, i) => <ReqRow key={i} r={r} i={i} onChange={setReq} onRemove={rmReq} suggest={suggest} />)}
          {/* รายฉบับ — เหลือเฉพาะที่ยังไม่ได้ไปโผล่ใต้ข้อใดข้อหนึ่ง
              ฉบับที่ผูกกับข้อได้แล้วอยู่ท้ายข้อนั้นแล้ว เอามาซ้ำที่นี่คือให้อ่านสองรอบเปล่าๆ
              แต่ที่ผูกไม่ได้ห้ามหาย — ไม่งั้น จป. ไม่รู้ว่ายังต้องไปเปิดฉบับไหนเอง */}
          <RelatedLawsPanel items={leftoverRefs} />

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
  // เอาเฉพาะ imported = ผู้ใช้กด "เก็บลงคิว" เองแล้ว
  // draft (บันทึกอัตโนมัติตอนสรุปเสร็จ) อยู่ในประวัติอย่างเดียว ไม่มางอกในคิว
  const items = discovered.filter(d => d.status === 'imported')
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

/* ── โซนล่าง · ประวัติการสรุปด้วย AI ────────────────────────────────────────
   เดิมโซนนี้ชื่อ "คลังสรุปกฎหมาย" แต่ดึง lg_laws มาแสดง = เอาข้อปฏิบัติในทะเบียน
   มาเขียนซ้ำหน้า Registry · สิ่งที่ขาดคือ "ทำอะไรไปแล้วบ้าง" ซึ่งเป็นคนละเรื่อง
   ข้อมูลมีอยู่แล้วใน lg_ai_discovered_laws (ลบเป็น soft delete ไม่มีอะไรหาย)
   แค่ไม่เคยถูกเอามาแสดง — พอเข้าทะเบียนแล้วแถวหายจากคิวไปเลย */
const HIST_STATUS = {
  draft:      { label: 'สรุปแล้ว ยังไม่ได้ทำต่อ', cls: 'p-warn' },
  imported:   { label: 'รอเข้าทะเบียน',           cls: 'p-warn' },
  registered: { label: 'เข้าทะเบียนแล้ว',          cls: 'p-ok'   },
  deleted:    { label: 'ลบทิ้งแล้ว',               cls: ''       },
  backfill:   { label: 'สรุปย้อนหลังให้ทะเบียน',    cls: 'p-ok'   },
}

// แหล่งตัวบทที่ใช้สรุป — เก็บไว้ใน ai_payload.meta ตอนสรุป (jsonb เดิม ไม่ต้องแก้ตาราง)
const INPUT_LABEL = { pdf: 'ไฟล์ PDF', link: 'ลิงก์', text: 'วางข้อความ' }

function fmtWhen(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d)) return '—'
  return d.toLocaleString('th-TH', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function HistoryRow({ item, onAddToRegistry, onOpenLaw }) {
  const { can } = useAuth()
  const st = HIST_STATUS[item.status] || HIST_STATUS.draft
  const m = item.meta || {}
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11.5, color: 'var(--ink-faint)', whiteSpace: 'nowrap', minWidth: 96 }}>{fmtWhen(item.at)}</span>
        <span style={{ flex: 1, fontSize: 13, minWidth: 200 }}>{(item.law_name || '—').slice(0, 90)}</span>
        <span className={'pill ' + st.cls} style={{ fontSize: 11 }}>{st.label}</span>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 3, fontSize: 11.5, color: 'var(--ink-faint)' }}>
        <span>{item.req_count} ข้อปฏิบัติ</span>
        {m.input && <span>· จาก{INPUT_LABEL[m.input] || m.input}</span>}
        {/* ผล Skill 3 — บอกว่าตามไปดึงกฎหมายที่อ้างถึงได้แค่ไหน และตัดของที่ยืนยันไม่ได้ไปกี่ฉบับ */}
        {m.related_count > 0 && <span>· รวมข้อจากกฎหมายที่อ้างถึง {m.related_count} ข้อ</span>}
        {m.unresolved_count > 0 && <span style={{ color: 'var(--warn)' }}>· หาตัวบทไม่พบ {m.unresolved_count} ฉบับ</span>}
        {m.rejected_count > 0 && <span>· ตัดการอ้างถึงที่ยืนยันไม่ได้ {m.rejected_count} ฉบับ</span>}
        {item.source_url && <a href={item.source_url} target="_blank" rel="noreferrer" style={{ color: 'var(--brand)' }}>เปิดตัวบท ↗</a>}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {item.registered_law && onOpenLaw && (
            <button className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 11 }}
              onClick={() => onOpenLaw(item.registered_law)}>เปิดในทะเบียน</button>
          )}
          {item.prefill && item.status !== 'registered' && (
            <button className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 11 }} disabled={!can('edit')}
              onClick={() => onAddToRegistry(item.prefill())}>เปิดผลสรุป</button>
          )}
        </span>
      </div>
    </div>
  )
}

// รวม 2 แหล่งเป็นไทม์ไลน์เดียว: การสรุปจากหน้านี้ (lg_ai_discovered_laws)
// + การสรุปย้อนหลังให้กฎหมายในทะเบียน (lg_laws.ai_summary_at)
// แยกออกมาเป็นฟังก์ชันบริสุทธิ์เพื่อให้ทดสอบการรวม/เรียงได้โดยไม่ต้อง render
export function buildHistoryItems(discovered = [], laws = []) {
  const fromDiscovered = discovered.map(d => ({
    key: 'd' + d.id, at: d.created_at || d.searched_at, law_name: d.law_name,
    status: d.status || 'draft', source_url: d.source_url,
    req_count: Array.isArray(d.summary) ? d.summary.length : 0,
    // ต้องส่ง object กฎหมายจริงให้ลิ้นชัก ไม่ใช่แค่ id · หาไม่เจอ (เช่นถูกลบจากทะเบียน) = ไม่มีปุ่มเปิด
    registered_law: d.registered_law_id ? laws.find(l => l.id === d.registered_law_id) || null : null,
    meta: d.ai_payload?.meta,
    prefill: () => d.ai_payload?.law
      ? { ...d.ai_payload, discoveredId: d.id }
      : buildInitialData({ name: d.law_name, ministry: d.ministry }, [], d.id),
  }))
  const fromBackfill = laws.filter(l => l.ai_summary_at).map(l => ({
    key: 'l' + l.id, at: l.ai_summary_at, law_name: l.name, status: 'backfill',
    source_url: l.source_url, registered_law: l,
    req_count: l.ai_summary?.requirements?.length || 0, meta: l.ai_summary?.meta,
    prefill: () => buildInitialData(l.ai_summary?.law || { name: l.name, cat: l.cat },
      toReqRows(l.ai_summary?.requirements || [])),
  }))
  // ใหม่สุดอยู่บน · รายการที่ไม่มีเวลา (ข้อมูลเก่าก่อนมีคอลัมน์) ตกไปท้ายสุด ไม่หายไปไหน
  return [...fromDiscovered, ...fromBackfill]
    .sort((a, b) => (a.at ? new Date(a.at).getTime() : -Infinity) < (b.at ? new Date(b.at).getTime() : -Infinity) ? 1 : -1)
}

function HistoryZone({ discovered = [], laws = [], onAddToRegistry, onOpenLaw }) {
  const [q, setQ] = useState('')
  const [st, setSt] = useState('all')

  const items = useMemo(() => buildHistoryItems(discovered, laws), [discovered, laws])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return items.filter(x => {
      if (st !== 'all' && x.status !== st) return false
      return !s || (x.law_name || '').toLowerCase().includes(s)
    })
  }, [items, q, st])

  const counts = useMemo(() => {
    const c = {}
    for (const x of items) c[x.status] = (c[x.status] || 0) + 1
    return c
  }, [items])

  return (
    <div style={{ marginTop: 22 }}>
      <div className="sec-t" style={{ margin: '0 0 4px' }}>ประวัติการสรุปด้วย AI ({items.length})</div>
      <div style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '0 0 10px' }}>
        ทุกครั้งที่สั่งสรุป จะถูกบันทึกไว้ที่นี่ รวมรายการที่ลบทิ้งไปแล้ว
      </div>
      <div className="filterbar" style={{ alignItems: 'center' }}>
        <input className="form-input" style={{ maxWidth: 260, margin: 0 }} placeholder="ค้นหาชื่อกฎหมาย…"
          value={q} onChange={e => setQ(e.target.value)} />
        <span className={'chip' + (st === 'all' ? ' active' : '')} onClick={() => setSt('all')}>ทั้งหมด</span>
        {Object.keys(HIST_STATUS).filter(k => counts[k]).map(k => (
          <span key={k} className={'chip' + (st === k ? ' active' : '')} onClick={() => setSt(k)}>
            {HIST_STATUS[k].label} {counts[k]}
          </span>
        ))}
      </div>
      <div className="panel" style={{ padding: '4px 16px 10px', marginTop: 4 }}>
        {filtered.length === 0
          ? <div style={{ textAlign: 'center', color: 'var(--ink-faint)', padding: 26, fontSize: 13 }}>
              {items.length ? 'ไม่พบรายการที่ตรงกับเงื่อนไข' : 'ยังไม่เคยสั่งสรุปด้วย AI'}
            </div>
          : filtered.map(x => <HistoryRow key={x.key} item={x} onAddToRegistry={onAddToRegistry} onOpenLaw={onOpenLaw} />)}
      </div>
    </div>
  )
}

/* ── กฎหมายในทะเบียนที่ยังไม่มีสรุป AI — ปุ่มสั่งสรุปย้อนหลัง ──
   แยกออกจากประวัติ เพราะนี่คือ "งานที่ทำได้" ไม่ใช่ "สิ่งที่ทำไปแล้ว" */
function BackfillZone({ laws = [], onReloadLaws }) {
  const { can } = useAuth()
  const [busyId, setBusyId] = useState(null)
  const pending = useMemo(
    () => laws.filter(l => !(l.reqs || []).length && !l.ai_summary), [laws])
  if (!pending.length) return null

  async function backfill(law) {
    // ไม่มีลิงก์ตัวบท = AI ไม่มีอะไรให้อ่าน ต้องสรุปจากความจำ ซึ่งขัดกฎ "ห้ามแต่งเติม"
    if (!law.source_url) {
      toast('กฎหมายฉบับนี้ยังไม่มีลิงก์ตัวบท — เปิดในทะเบียนแล้วใส่ลิงก์ก่อน หรือใช้ช่องด้านบนแนบไฟล์ PDF')
      return
    }
    setBusyId(law.id)
    try {
      const r = await analyzeSource({ source: law.source_url, sourceUrl: law.source_url })
      await saveLawAiSummary(law.id, {
        law: r.law, requirements: r.requirements,
        meta: { input: 'link', related_count: r.related_count, unresolved_count: r.unresolved_count,
          rejected_count: r.rejected_count },
      })
      toast('AI สรุปย้อนหลังแล้ว — ยังไม่ทวนสอบ', 'success')
      onReloadLaws && onReloadLaws()
    } catch (e) { toast('สรุปย้อนหลังไม่สำเร็จ: ' + e.message) }
    setBusyId(null)
  }

  return (
    <details style={{ marginTop: 18, fontSize: 12.5 }}>
      <summary style={{ cursor: 'pointer', color: 'var(--brand)' }}>
        กฎหมายในทะเบียนที่ยังไม่มีสรุป ({pending.length})
      </summary>
      <div className="panel" style={{ padding: '4px 16px 10px', marginTop: 6 }}>
        {pending.map(l => (
          <div key={l.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
            <span className="law-code">{l.code}</span>
            <span style={{ flex: 1, fontSize: 12.5 }}>{(l.name || '').slice(0, 70)}</span>
            {!l.source_url && <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>ยังไม่มีลิงก์ตัวบท</span>}
            <button className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 11 }}
              disabled={busyId === l.id || !can('edit')} onClick={() => backfill(l)}>
              {busyId === l.id ? 'กำลังสรุป…' : 'ให้ AI สรุป'}
            </button>
          </div>
        ))}
      </div>
    </details>
  )
}

export default function LawSummary({ laws = [], allLaws = [], cats = [], discovered = [], suggest = {},
  onReloadDiscovered, onReloadLaws, onOpenLaw, onAddToRegistry }) {
  return (
    <div className="view">
      <AiSummaryZone cats={cats} laws={allLaws.length ? allLaws : laws} suggest={suggest} onQueued={onReloadDiscovered} onAddToRegistry={onAddToRegistry} onReloadLaws={onReloadLaws} />
      <QueueBar discovered={discovered} onReload={onReloadDiscovered} onAddToRegistry={onAddToRegistry} />
      {/* ประวัติอ่านจาก allLaws เพื่อให้เห็นการสรุปของกฎหมายที่ถูกยกเลิกไปแล้วด้วย
          ส่วนปุ่มสั่งสรุปย้อนหลังใช้ laws (เฉพาะที่ยังใช้บังคับ) — ไม่ต้องไปสรุปฉบับที่ยกเลิกแล้ว */}
      <HistoryZone discovered={discovered} laws={allLaws.length ? allLaws : laws} onAddToRegistry={onAddToRegistry} onOpenLaw={onOpenLaw} />
      <BackfillZone laws={laws} onReloadLaws={onReloadLaws} />
    </div>
  )
}
