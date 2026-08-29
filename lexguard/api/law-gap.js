// Vercel serverless function — ขั้นที่ 6 · สรุปช่องว่างระดับฉบับให้อ่านเป็นภาษาคน
//
// P25 · ระบบบอกได้แล้วว่าข้อย่อยใดยังไม่ทำ แต่ไม่มีที่ใดตอบว่า "ทั้งฉบับนี้ขาดอะไรเป็นหลัก
// และต้องลงมือทำอะไรก่อน" — ผู้บริหารเปิดตารางติ๊ก 40 แถวแล้วอ่านไม่ออกว่าควรเริ่มตรงไหน
//
// ═══ ลูกผสม · กติกานับ AI เรียบเรียง ═══
// ครึ่งแรก collectGaps() คัดข้อ unmet และนับตัวเลขให้เสร็จ ไม่เรียก AI เลย
// ครึ่งหลังส่งตัวเลขสำเร็จรูปเข้า prompt โดยสั่งห้ามนับซ้ำ — โมเดลนับของผิดเป็นปกติ
// และตัวเลขชุดนี้จะถูกอ้างต่อในการตรวจ ISO 45001
//
// ═══ กติกา ═══
// เขียนลง lg_law_gap เท่านั้น ซึ่งเป็น "ที่พักของข้อเสนอ"
// ไม่แตะ lg_requirements.status และ lg_law_relevance.confirmed_verdict
import { sameOrigin, clientIp, rateLimited, tooManyRequests } from './_lib/guard.js'
import { collectGaps } from './_lib/gap-collect.js'

const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY
const H = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'content-type': 'application/json' }
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

const SYSTEM = `คุณเป็นผู้ช่วยเจ้าหน้าที่ความปลอดภัย (จป.วิชาชีพ) เขียนสรุปช่องว่างการปฏิบัติตามกฎหมาย
หนึ่งฉบับ ให้ผู้บริหารและผู้ปฏิบัติงานอ่านแล้วรู้ทันทีว่าต้องลงมือทำอะไรก่อน

ข้อมูลที่ให้มาผ่านการคัดกรองด้วยกติกาแล้ว ตัวเลขทั้งหมดถูกต้องแน่นอน
หน้าที่ของคุณคือเรียบเรียง ไม่ใช่คำนวณซ้ำ

กติกาที่ห้ามฝ่าฝืน
1. ห้ามนับจำนวนเอง ห้ามแก้ตัวเลขที่ให้มา ถ้าจะอ้างตัวเลขให้ใช้ค่าที่ให้มาตรงตัว
2. เขียนถึงเฉพาะข้อที่ยังไม่ได้ดำเนินการ ห้ามตั้งข้อสังเกตกับข้อที่ผ่านแล้ว
   และห้ามพูดถึงข้อที่ระบุว่าไม่เกี่ยวข้อง
3. ห้ามเสนอสถานะความสอดคล้องขั้นสุดท้าย เพราะเป็นดุลพินิจของผู้ประเมิน
4. ห้ามเพิ่มข้อกำหนดหรือหลักฐานที่ไม่ปรากฏในข้อมูลที่ให้มา
   ถ้าข้อมูลไม่พอเขียนกลุ่มใด ให้ระบุไว้ใน caution แทนการเดา
5. หลายข้อย่อยที่มีสาเหตุร่วมกัน ให้รวมเป็นช่องว่างเดียวแล้วอธิบายสาเหตุร่วมนั้น
   เช่น 4 ข้อที่ขาดเพราะยังไม่มีการแต่งตั้งผู้รับผิดชอบ = ช่องว่างเดียว
6. ภาษาไทยราชการ กระชับ ผู้ที่ไม่ใช่นักกฎหมายอ่านเข้าใจ ห้ามใส่เลขมาตราใน headline

การจัดลำดับความเร่งด่วน ใช้เกณฑ์ตามลำดับนี้
   critical มาก่อน high ก่อน medium ก่อน low
   ถ้าระดับเท่ากัน ให้ข้อที่มีกำหนดเวลาตามกฎหมายมาก่อน
   ถ้ายังเท่ากัน ให้ข้อที่ปิดได้เร็วกว่ามาก่อน เพื่อให้เห็นความคืบหน้า

ตอบเป็น JSON ล้วนเท่านั้น ห้ามมีข้อความอื่นนอก JSON ห้ามครอบด้วย markdown
{"headline":"",
 "gaps":[{"title":"","why_it_matters":"","to_close":[""],"evidence":[""],
          "sub_req_ids":[0],"priority":1}],
 "caution":""}

headline       = สรุปภาพรวม 2-3 บรรทัด ว่าฉบับนี้องค์กรขาดอะไรเป็นหลัก
title          = ชื่อช่องว่าง 1 บรรทัด
why_it_matters = ผลที่เกิดหากไม่แก้ไข เขียนให้เห็นภาพจริง ไม่ใช่คำกว้างๆ ว่าผิดกฎหมาย
to_close       = ขั้นตอนที่ลงมือทำได้จริง เรียงตามลำดับการทำ
evidence       = ชื่อเอกสารที่ต้องเตรียมไว้ให้ผู้ตรวจ ต้องเป็นสิ่งที่ขอดูได้จริง
sub_req_ids    = รหัสข้อย่อยที่รวมอยู่ในช่องว่างนี้ ใช้เลขที่ให้มาเท่านั้น ห้ามสร้างเลขเอง
priority       = 1 = เร่งด่วนที่สุด
caution        = ระบุเฉพาะกรณีข้อมูลไม่พอสรุป หรือมีประเด็นที่ควรปรึกษาผู้เชี่ยวชาญ
                 ไม่มีให้ตอบสตริงว่าง`

async function rest(path, init = {}) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } })
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 300)}`)
  const t = await r.text()
  return t ? JSON.parse(t) : []
}

function friendlyApiError(raw) {
  const t = String(raw || '')
  if (/credit balance is too low|insufficient.*credit/i.test(t))
    return 'เครดิต AI หมด — กรุณาแจ้งผู้ดูแลระบบให้เติมเครดิตที่บัญชี Anthropic API'
  if (/rate_limit|rate limit/i.test(t)) return 'เรียกใช้ AI ถี่เกินไป — กรุณารอสักครู่แล้วลองใหม่'
  if (/authentication_error|invalid x-api-key|permission_error/i.test(t))
    return 'คีย์ AI ไม่ถูกต้องหรือหมดสิทธิ์ — กรุณาแจ้งผู้ดูแลระบบตรวจสอบ ANTHROPIC_API_KEY ใน Vercel'
  if (/overloaded_error/i.test(t)) return 'ระบบ AI ไม่ว่างชั่วคราว — กรุณาลองใหม่อีกครั้งในอีกสักครู่'
  return 'เรียก Claude API ไม่สำเร็จ: ' + t.slice(0, 400)
}

// upsert ตาม law_id ซึ่ง unique — 1 ฉบับมีสรุปล่าสุดชุดเดียว
async function saveGap(row) {
  const out = await rest('lg_law_gap?on_conflict=law_id&select=*', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(row),
  })
  return out[0] || row
}

export async function summarizeGap(lawId, { by = 'ระบบ' } = {}) {
  const { law, unmet, evidence, stats } = await collectGaps(lawId)

  // ── ยังติ๊กไม่ครบ = หยุด ไม่เรียก AI ──────────────────────────────────────
  // สรุปช่องว่างจากข้อมูลที่ประเมินไม่ครบ จะถูกอ่านว่า "ครบแล้วและขาดแค่นี้"
  // ซึ่งอันตรายกว่าไม่มีสรุปเลย เพราะทำให้หยุดหาต่อ
  if (stats.pending > 0) {
    const e = new Error(`ยังประเมินข้อย่อยไม่ครบ เหลืออีก ${stats.pending} ข้อจากทั้งหมด ${stats.total} ข้อ`)
    e.code = 'incomplete'; e.stats = stats
    throw e
  }
  if (stats.total === 0) {
    const e = new Error('ฉบับนี้ยังไม่มีข้อย่อย — ต้องแตกข้อย่อย (ขั้นที่ 4) ก่อน')
    e.code = 'no_sub_requirements'; e.stats = stats
    throw e
  }

  // ── ไม่มีข้อที่ยังไม่ทำ = บันทึกผลโดยไม่เรียก AI ─────────────────────────
  if (stats.unmet === 0) {
    return await saveGap({
      law_id: law.id, headline: 'ไม่พบช่องว่าง — ข้อย่อยทุกข้อของฉบับนี้ดำเนินการแล้วหรือระบุว่าไม่เกี่ยวข้อง',
      gaps: [], caution: '', stats, model: null, generated_by: by,
      generated_at: new Date().toISOString(),
    })
  }

  const ctx = [
    `กฎหมาย: ${law.name || ''}${law.code ? ` (${law.code})` : ''}`,
    law.ministry ? `หน่วยงาน: ${law.ministry}` : '',
    '',
    'ตัวเลขที่กติกาคำนวณไว้แล้ว (ห้ามนับใหม่ ห้ามแก้):',
    `  ข้อย่อยทั้งหมด ${stats.total} ข้อ จาก ${stats.requirements} ข้อกำหนด`,
    `  ดำเนินการแล้ว ${stats.met} ข้อ · ยังไม่ได้ดำเนินการ ${stats.unmet} ข้อ · ไม่เกี่ยวข้อง ${stats.na} ข้อ`,
    `  ข้อที่ยังไม่ทำแยกตามความเสี่ยง — วิกฤต ${stats.by_risk.critical} · สูง ${stats.by_risk.high}`
      + ` · ปานกลาง ${stats.by_risk.medium} · ต่ำ ${stats.by_risk.low}`,
    '',
    evidence.length ? `หลักฐานที่ระบบสรุปไว้แล้วสำหรับฉบับนี้ (ใช้ชื่อจากรายการนี้ก่อน):\n  ${evidence.join(' · ')}\n` : '',
    '────────────────',
    'ข้อย่อยที่ผู้ประเมินระบุว่ายังไม่ได้ดำเนินการ (เรียงตามความเสี่ยงแล้ว):',
    ...unmet.map(u => [
      `[รหัสข้อย่อย ${u.id}] ${u.title}  (ความเสี่ยง: ${u.risk_level})`,
      u.action_required ? `   สิ่งที่ต้องทำ: ${u.action_required}` : '',
      u.evidence_required ? `   หลักฐานที่ต้องมี: ${u.evidence_required}` : '',
      u.assessor_note ? `   หมายเหตุจากผู้ประเมิน: ${u.assessor_note}` : '',
      u.note ? `   หมายเหตุตัวบท: ${u.note}` : '',
      u.from_requirement ? `   มาจากข้อกำหนด: ${u.from_requirement}` : '',
    ].filter(Boolean).join('\n')),
  ].filter(Boolean).join('\n')

  const ar = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL, max_tokens: 4000,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: ctx }],
    }),
  })
  if (!ar.ok) throw new Error(friendlyApiError(await ar.text()))
  const j = await ar.json()
  let txt = (j.content || []).map(c => c.text || '').join('').trim()
  txt = txt.replace(/^```json\s*/i, '').replace(/```$/, '').trim()
  let parsed
  try { parsed = JSON.parse(txt) } catch { throw new Error('AI ตอบกลับในรูปแบบที่แปลงเป็น JSON ไม่ได้') }

  // ── ตรวจว่า AI ไม่ได้สร้างรหัสข้อย่อยขึ้นเอง ────────────────────────────
  // รหัสที่ไม่ได้ส่งไป = ของกฎหมายฉบับอื่นหรือของที่ไม่มีจริง · ปุ่มบนหน้าจอจะพาไปผิดที่
  const allowed = new Set(unmet.map(u => u.id))
  const S = (v, n = 800) => String(v ?? '').trim().slice(0, n)
  const arr = v => (Array.isArray(v) ? v : []).map(x => S(x, 300)).filter(Boolean).slice(0, 10)

  const gaps = (Array.isArray(parsed.gaps) ? parsed.gaps : [])
    .map(g => {
      const ids = (Array.isArray(g.sub_req_ids) ? g.sub_req_ids : [])
        .map(Number).filter(n => allowed.has(n))
      return {
        title: S(g.title, 200), why_it_matters: S(g.why_it_matters, 800),
        to_close: arr(g.to_close), evidence: arr(g.evidence),
        sub_req_ids: ids, priority: Number(g.priority) || 99,
      }
    })
    // ตัดทิ้งเงียบๆ ตามสเปก: ไม่มีชื่อ หรือรหัสข้อย่อยไม่เหลือสักตัวหลังกรอง
    .filter(g => g.title && g.sub_req_ids.length)
    .sort((a, b) => a.priority - b.priority)
    .map((g, i) => ({ ...g, priority: i + 1 }))

  if (!gaps.length) throw new Error('AI ไม่ได้เสนอช่องว่างที่อ้างถึงข้อย่อยจริงแม้แต่ข้อเดียว')

  return await saveGap({
    law_id: law.id, headline: S(parsed.headline, 1000),
    gaps, caution: S(parsed.caution, 1000), stats,
    model: MODEL, generated_by: by, generated_at: new Date().toISOString(),
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!sameOrigin(req)) return res.status(403).json({ error: 'คำขอไม่ได้มาจากโดเมนของแอป' })
  const wait = rateLimited(clientIp(req)); if (wait) return tooManyRequests(res, wait)
  if (!SUPA_URL || !SUPA_KEY) return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า Supabase' })
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY ใน Vercel' })

  try {
    const id = Number(req.body?.law_id)
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ต้องระบุ law_id' })
    return res.status(200).json(await summarizeGap(id, { by: String(req.body?.by || 'ระบบ').slice(0, 80) }))
  } catch (e) {
    const status = e?.code === 'incomplete' || e?.code === 'no_sub_requirements' ? 428 : 500
    return res.status(status).json({ error: String(e?.message || e), code: e?.code, stats: e?.stats })
  }
}
