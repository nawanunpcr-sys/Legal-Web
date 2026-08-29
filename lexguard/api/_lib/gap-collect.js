// ── ครึ่งแรกของขั้นที่ 6 · คัดข้อย่อยที่ยังไม่ทำและนับตัวเลข — ไม่เรียก AI ─────
//
// ═══ ทำไมกติกาต้องนับ ไม่ใช่ AI ═══
// ตัวเลขในสรุปช่องว่างจะถูกเอาไปอ้างต่อในการตรวจ ISO 45001 · โมเดลภาษานับของผิดเป็นปกติ
// ถ้าปล่อยให้ AI นับเอง วันหนึ่งมันจะเขียนว่า "ขาด 5 ข้อ" ทั้งที่ขาด 7 แล้วไม่มีใครจับได้
// ที่นี่จึงนับให้เสร็จก่อน แล้วส่งตัวเลขสำเร็จรูปเข้า prompt โดยสั่งห้ามคำนวณซ้ำ
//
// ไฟล์นี้คือของเดิมใน src/lib/gapInsight.js ที่ถูกถอดออกตอนย้าย Gap Analysis ไป Skill
// ย้ายมาอยู่ฝั่ง server เพราะตอนนี้ผลต้องเก็บลงฐาน ไม่ใช่คำนวณสดบนหน้าจอ

const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY
const H = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'content-type': 'application/json' }

async function rest(path) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, { headers: H })
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 300)}`)
  const t = await r.text()
  return t ? JSON.parse(t) : []
}

export const RISK_ORDER = ['critical', 'high', 'medium', 'low']

// collectGaps(lawId)
//   คืน { law, stats, unmet, evidence, requirements }
//   stats.pending > 0 หมายถึงยังติ๊กข้อย่อยไม่ครบ — ผู้เรียกต้องหยุด ไม่ใช่สรุปทั้งที่ยังไม่ครบ
export async function collectGaps(lawId) {
  const id = Number(lawId)
  if (!Number.isFinite(id)) throw new Error('รหัสกฎหมายไม่ถูกต้อง')

  const laws = await rest(`lg_laws?select=id,code,name,ministry&id=eq.${id}`)
  if (!laws.length) throw new Error('ไม่พบกฎหมายรหัสนี้')
  const law = laws[0]

  const subs = await rest(
    `lg_sub_requirements?select=id,requirement_id,seq,title,action_required,evidence_required,`
    + `risk_level,note,is_met,is_na,check_note,context_level&law_id=eq.${id}&order=requirement_id.asc,seq.asc`)

  // ── นับด้วยกติกา · แกน is_met กับ is_na เป็นคนละแกน (ตาม constraint ใน migration 054) ──
  const byRisk = { critical: 0, high: 0, medium: 0, low: 0 }
  let met = 0, unmetN = 0, na = 0, pending = 0
  for (const s of subs) {
    if (s.is_na) { na++; continue }
    if (s.is_met === true) { met++; continue }
    if (s.is_met === false) { unmetN++; if (byRisk[s.risk_level] !== undefined) byRisk[s.risk_level]++; continue }
    pending++
  }

  // ข้อความข้อกำหนดแม่ ใช้ให้ AI เห็นว่าข้อย่อยแต่ละข้อมาจากเรื่องอะไร
  const reqIds = [...new Set(subs.map(s => s.requirement_id))]
  let reqText = {}
  if (reqIds.length) {
    const rs = await rest(`lg_requirements?select=id,text&id=in.(${reqIds.join(',')})`)
    reqText = Object.fromEntries(rs.map(r => [r.id, String(r.text || '').slice(0, 300)]))
  }

  // เรียงข้อที่ยังไม่ทำตามความเสี่ยงไว้ให้ก่อน — AI จะได้เห็นลำดับที่กติกาตั้งใจ
  const unmet = subs
    .filter(s => s.is_met === false && !s.is_na)
    .sort((a, b) => RISK_ORDER.indexOf(a.risk_level) - RISK_ORDER.indexOf(b.risk_level))
    .map(s => ({
      id: s.id, title: s.title, action_required: s.action_required,
      evidence_required: s.evidence_required, risk_level: s.risk_level,
      note: s.note || '', assessor_note: s.check_note || '',
      from_requirement: reqText[s.requirement_id] || '',
    }))

  // หลักฐานที่ขั้นที่ 2 สรุปไว้แล้ว — ใช้เป็นคลังชื่อเอกสาร ไม่ให้ AI คิดชื่อเอกสารขึ้นเอง
  const guides = await rest(`lg_law_action_guide?select=guide&law_id=eq.${id}`)
  const evidence = (guides[0]?.guide?.evidence || []).map(e => e?.name).filter(Boolean).slice(0, 20)

  // บริบทที่แย่ที่สุดในบรรดาข้อย่อยของฉบับนี้ — ใช้เตือนว่าสรุปตั้งอยู่บนข้อย่อยคุณภาพใด
  const levels = new Set(subs.map(s => s.context_level || 'unknown'))
  const context_level = ['bare', 'partial', 'unknown', 'full'].find(l => levels.has(l)) || 'unknown'

  return {
    law,
    unmet,
    evidence,
    stats: {
      total: subs.length, met, unmet: unmetN, na, pending,
      by_risk: byRisk, requirements: reqIds.length, context_level,
    },
  }
}
