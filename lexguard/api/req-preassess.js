// Vercel serverless function — เสนอสถานะการประเมินรายข้อ (C / NC / Ack / ไม่เกี่ยวข้อง)
//
// ข้อเสนอแนะของผู้ประเมินข้อ 3 · P22 ขั้นที่ 3
//
// ═══ กติกาที่ห้ามผ่อน ═══
// · เขียนลง lg_req_ai_suggestion เท่านั้น — **ห้ามแตะ lg_requirements.status เด็ดขาด**
//   ทางเดียวที่สถานะจะเปลี่ยนคือคนกด "ใช้ข้อเสนอนี้" บนหน้าจอ
// · ข้อที่มีคนประเมินไว้แล้ว (evaluated_by ไม่ว่าง) ระบบจะข้าม ไม่เสนอทับ
// · หลักฐานไม่พอตัดสิน ห้ามเดาว่า met — ให้เสนอ unmet พร้อมระบุว่าต้องการหลักฐานอะไร
//
// ═══ ทำไม "หลักฐานไม่พอ = NC" ไม่ใช่ "รอข้อมูล" ═══
// ในการตรวจ ISO 45001 การอ้างว่าปฏิบัติแล้วโดยไม่มีหลักฐานให้ดู มีค่าเท่ากับยังไม่ปฏิบัติ
// การเสนอเป็นสถานะกลางๆ จะทำให้ช่องว่างจริงถูกซ่อน แล้วไปโผล่ตอนผู้ตรวจมาถึงซึ่งสายเกินแก้
import { sameOrigin, clientIp, rateLimited, tooManyRequests } from './_lib/guard.js'
import { loadProfile } from './law-screen.js'

const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY
const H = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'content-type': 'application/json' }
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

// เกณฑ์ตัดสิน 4 สถานะ — ข้อความชุดเดียวกับที่แสดงบนหน้าจอ (src/lib/supabase.js ASSESS_CRITERIA)
// ต้องตรงกันทุกตัวอักษร ไม่งั้น AI กับคนจะใช้เกณฑ์คนละชุด ซึ่งทำให้ข้อเสนอไร้ประโยชน์
const SYSTEM = `คุณเป็นผู้ช่วยเจ้าหน้าที่ความปลอดภัย (จป.วิชาชีพ) ประเมินความสอดคล้องของข้อกำหนดทางกฎหมาย
รายข้อ เพื่อเสนอผลให้เจ้าหน้าที่ตัดสินใจ

ใช้เกณฑ์ 4 สถานะนี้อย่างเคร่งครัด และต้องระบุเสมอว่าเข้าเกณฑ์ข้อใด:

met (C · สอดคล้อง)
   มีหลักฐานครอบคลุมข้อกำหนดครบทุกองค์ประกอบ
   "ครบทุกองค์ประกอบ" หมายถึง ถ้าข้อกำหนดสั่งให้ทำ 3 อย่าง ต้องมีหลักฐานครบทั้ง 3

unmet (NC · ไม่สอดคล้อง)
   เข้าข่ายต้องปฏิบัติ แต่ยังไม่มีหลักฐาน หรือมีแต่ไม่ครบทุกองค์ประกอบ

acknowledged (Ack · เพื่อทราบ)
   เป็นบทนิยาม บทกำหนดอำนาจหน้าที่ของราชการ บทกำหนดโทษ บทเฉพาะกาล
   หรือข้อที่หน่วยงานภายนอกเป็นผู้ปฏิบัติ — ไม่สร้างหน้าที่ให้องค์กร
   แต่ต้องรับทราบและเฝ้าระวัง

not_applicable (- · ไม่เกี่ยวข้อง)
   องค์กรไม่มีกิจกรรม เครื่องจักร สารเคมี หรือเงื่อนไขที่เข้าข่ายตามโปรไฟล์บริบทองค์กร
   ต้องอ้างข้อเท็จจริงจากโปรไฟล์เสมอ ห้ามเดา

กติกาที่ห้ามฝ่าฝืน:
1. หลักฐานไม่พอตัดสิน ห้ามเสนอ met เด็ดขาด ให้เสนอ unmet แล้วระบุใน evidence_needed
   ว่าต้องการหลักฐานอะไรจึงจะเปลี่ยนเป็น met ได้ ระบุเป็นชื่อเอกสารที่ขอดูได้จริง
   เช่น "รายงานผลการตรวจวัดระดับเสียงประจำปี พร้อมลายมือชื่อผู้ตรวจวัด"
   ไม่ใช่ "หลักฐานการดำเนินการ" ซึ่งกว้างเกินกว่าจะเอาไปทำงานต่อ
2. ห้ามเสนอ not_applicable โดยอ้างว่า "น่าจะไม่เกี่ยวข้อง" — ต้องชี้ได้ว่าโปรไฟล์
   ระบุอะไรไว้ที่ทำให้ไม่เข้าข่าย ถ้าโปรไฟล์ไม่มีข้อมูลเรื่องนั้น ให้เสนอ unmet แทน
   แล้วระบุใน evidence_needed ว่าต้องยืนยันข้อเท็จจริงอะไร
3. reason ต้องเขียน 1-3 ประโยค บอกว่าเข้าเกณฑ์ข้อใดและเพราะอะไร
   อ้างข้อความจากข้อกำหนดหรือจากโปรไฟล์ประกอบเสมอ
4. criterion ให้ตอบเป็นรหัสสถานะที่ใช้ตัดสิน (ตรงกับ suggested_status)

ตอบเป็น JSON ล้วนเท่านั้น ห้ามมีข้อความอื่นนอก JSON ห้ามครอบด้วย markdown:
{"results":[{"requirement_id":0,"suggested_status":"met|unmet|acknowledged|not_applicable",
             "confidence":0.0,"criterion":"","reason":"","evidence_needed":[]}]}`

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

function profileText(p) {
  if (!p) return '(ยังไม่ได้ตั้งโปรไฟล์บริบทองค์กร — ห้ามใช้เป็นเหตุผลของ not_applicable)'
  const L = []
  const put = (k, v) => { if (v !== null && v !== undefined && String(v).trim() !== '' && !(Array.isArray(v) && !v.length)) L.push(`${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`) }
  put('ประเภทกิจการ', p.business_type); put('ลักษณะสถานประกอบกิจการ', p.workplace_type)
  put('จำนวนลูกจ้าง (คน)', p.employee_count); put('ผู้รับเหมาประจำ (คน)', p.contractor_count)
  put('จำนวนพื้นที่/สาขา', p.site_count); put('บทบาทในห่วงโซ่ธุรกิจ', p.value_chain_role)
  put('กิจกรรมที่ทำจริง', p.activities); put('เครื่องจักรและอุปกรณ์', p.machines)
  put('สารเคมีที่ใช้', p.chemicals); put('ใบอนุญาตที่ถือครอง', p.licenses)
  put('สถานะตามรายชื่อของหน่วยงานกำกับ', p.regulator_status)
  return L.join('\n') || '(โปรไฟล์ว่าง)'
}

export async function preassessLaw(lawId, { force = false } = {}) {
  const laws = await rest(`lg_laws?select=id,code,name,ministry&id=eq.${lawId}`)
  if (!laws.length) throw new Error('ไม่พบกฎหมายรหัสนี้ในทะเบียน')
  const law = laws[0]
  // migration 052 · view นี้รวมค่าจาก F-259 ที่กู้กลับมาแล้ว
  const all = await rest(`lg_req_effective?select=requirement_id,seq,text,responsible,frequency,documents,report_to,status,evaluated_by,evidence_url,evidence_label&law_id=eq.${lawId}&order=seq.asc&limit=200`)
  if (!all.length) { const e = new Error('ฉบับนี้ยังไม่มีข้อกำหนดในทะเบียน'); e.code = 'no_requirements'; throw e }

  // ข้อที่มีคนประเมินไว้แล้ว = ไม่เสนอทับ (เกณฑ์ผ่านขั้นที่ 3 ข้อ 2)
  // ตัวชี้คือ evaluated_by ไม่ใช่ evaluated_at เพราะ migration 044 เติม evaluated_at
  // ให้ทั้ง 575 แถวไปแล้ว ถ้าใช้ evaluated_at จะข้ามทุกข้อในระบบและฟีเจอร์นี้ไม่ทำงานเลย
  const targets = force ? all : all.filter(r => !String(r.evaluated_by || '').trim())
  targets.forEach(r => { r.id = r.requirement_id })   // view ใช้ชื่อคอลัมน์ requirement_id
  if (!targets.length) {
    return { law: { id: law.id, code: law.code }, skipped: all.length, results: [],
      note: 'ทุกข้อของฉบับนี้มีผู้ประเมินบันทึกไว้แล้ว — ไม่เสนอทับ' }
  }

  // หลักฐานที่ระบบมีจริง — ระดับฉบับ (lg_attachments) + รายข้อ (evidence_url)
  const att = await rest(`lg_attachments?select=file_name,file_url,ref_type&ref_id=eq.${lawId}&ref_type=in.(law,assess)`)
  const lawFiles = att.map(a => a.file_name || a.file_url).filter(Boolean)

  const profile = await loadProfile()

  const body = targets.map(r => [
    `[requirement_id=${r.id}] ${String(r.text || '').slice(0, 1500)}`,
    r.responsible ? `   ผู้รับผิดชอบ: ${r.responsible}` : '',
    r.frequency ? `   ความถี่: ${r.frequency}` : '',
    r.documents ? `   เอกสารที่ระบุไว้: ${String(r.documents).slice(0, 300)}` : '',
    r.evidence_url ? `   หลักฐานที่แนบไว้กับข้อนี้: ${r.evidence_label || r.evidence_url}` : '   หลักฐานที่แนบไว้กับข้อนี้: (ไม่มี)',
    r.report_to ? `   การรายงานผล: ${String(r.report_to).slice(0, 200)}` : '',
  ].filter(Boolean).join('\n')).join('\n\n')

  const ar = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL, max_tokens: 8000,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content:
        `โปรไฟล์บริบทองค์กร:\n${profileText(profile)}\n\n`
        + `หลักฐานระดับกฎหมายที่แนบไว้ในระบบ: ${lawFiles.length ? lawFiles.join(' · ') : '(ไม่มีไฟล์แนบเลย)'}\n\n`
        + `────────────────\nกฎหมาย: ${law.name}\n\nข้อกำหนดที่ต้องประเมิน (${targets.length} ข้อ):\n\n${body}` }],
    }),
  })
  if (!ar.ok) throw new Error(friendlyApiError(await ar.text()))
  const j = await ar.json()
  let txt = (j.content || []).map(c => c.text || '').join('').trim()
  txt = txt.replace(/^```json\s*/i, '').replace(/```$/, '').trim()
  let parsed
  try { parsed = JSON.parse(txt) } catch { throw new Error('AI ตอบกลับในรูปแบบที่แปลงเป็น JSON ไม่ได้') }

  const OK = ['met', 'unmet', 'acknowledged', 'not_applicable']
  const validIds = new Map(targets.map(r => [r.id, r]))
  const evidenceSeen = lawFiles.slice(0, 30)
  const rows = (Array.isArray(parsed.results) ? parsed.results : [])
    .filter(x => validIds.has(Number(x.requirement_id)) && OK.includes(x.suggested_status))
    .map(x => {
      const r = validIds.get(Number(x.requirement_id))
      return {
        requirement_id: Number(x.requirement_id), law_id: Number(lawId),
        suggested_status: x.suggested_status,
        confidence: Math.max(0, Math.min(1, Number(x.confidence) || 0)),
        reason: String(x.reason || '').slice(0, 2000),
        criterion: String(x.criterion || x.suggested_status).slice(0, 60),
        evidence_needed: Array.isArray(x.evidence_needed) ? x.evidence_needed.slice(0, 10).map(s => String(s).slice(0, 300)) : [],
        evidence_seen: r.evidence_url ? [r.evidence_label || r.evidence_url, ...evidenceSeen] : evidenceSeen,
        model: MODEL,
      }
    })
  if (!rows.length) throw new Error('AI ไม่ได้เสนอผลที่ใช้ได้แม้แต่ข้อเดียว — กรุณาลองใหม่')

  const ins = await fetch(`${SUPA_URL}/rest/v1/lg_req_ai_suggestion`, {
    method: 'POST', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify(rows) })
  if (!ins.ok) throw new Error('บันทึกข้อเสนอไม่สำเร็จ: ' + (await ins.text()).slice(0, 300))

  return { law: { id: law.id, code: law.code, name: law.name },
    results: await ins.json(), assessed: rows.length, skipped: all.length - targets.length }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!sameOrigin(req)) return res.status(403).json({ error: 'คำขอไม่ได้มาจากโดเมนของแอป' })
  const wait = rateLimited(clientIp(req)); if (wait) return tooManyRequests(res, wait)
  if (!SUPA_URL || !SUPA_KEY) return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า Supabase' })
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY ใน Vercel' })

  try {
    const lawId = Number(req.body?.law_id)
    if (!Number.isFinite(lawId)) return res.status(400).json({ error: 'ต้องระบุ law_id' })
    const out = await preassessLaw(lawId, { force: !!req.body?.force })
    return res.status(200).json(out)
  } catch (e) {
    const status = e?.code === 'no_requirements' ? 422 : 500
    return res.status(status).json({ error: String(e?.message || e), code: e?.code })
  }
}
