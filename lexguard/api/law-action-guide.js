// Vercel serverless function — สังเคราะห์ "สิ่งที่ต้องดำเนินการ / เอกสาร / หลักฐาน" ของกฎหมาย 1 ฉบับ
//
// ข้อเสนอแนะของผู้ประเมินข้อ 2 · P22 ขั้นที่ 2
//
// ═══ งานนี้ไม่ใช่การ "สรุปกฎหมาย" ซ้ำ ═══
// ทะเบียนมีสาระสำคัญรายข้ออยู่แล้ว สิ่งที่ขาดคือการแปลงจากภาษากฎหมาย
// ("นายจ้างต้องจัดให้มี…") เป็นรายการงานที่คนทำงานหยิบไปทำได้ทันที
// และแยกให้ชัดว่าอะไรคือ "งานที่ต้องทำ" อะไรคือ "เอกสารที่ต้องมี" อะไรคือ "หลักฐานที่ผู้ตรวจจะขอดู"
//
// ═══ กติกาที่ห้ามผ่อน ═══
// · ทุกบรรทัดต้องมี section_ref ชี้กลับข้อกำหนดต้นทาง — บรรทัดที่ไม่รู้ที่มา = แต่งขึ้น
// · ตัวบทไม่ได้กำหนดความถี่หรือผู้รับผิดชอบ → ใส่ not_specified ห้ามเดา (กติกาข้อ 4)
// · เขียนลง lg_law_action_guide เท่านั้น ไม่แตะ lg_laws และ lg_requirements แม้แต่คอลัมน์เดียว
import { sameOrigin, clientIp, rateLimited, tooManyRequests } from './_lib/guard.js'

const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY
const H = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'content-type': 'application/json' }
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

const SYSTEM = `คุณเป็นผู้ช่วยเจ้าหน้าที่ความปลอดภัย (จป.วิชาชีพ) ทำหน้าที่แปลงข้อกำหนดทางกฎหมาย
ให้เป็น "รายการสิ่งที่องค์กรต้องทำจริง" ที่คนทำงานหยิบไปปฏิบัติได้ทันที

แยกผลออกเป็น 4 กลุ่มที่ไม่ปนกัน — นี่คือหัวใจของงานนี้:

1. actions = งานที่ต้องลงมือทำ (กริยา) เช่น "ตรวจวัดระดับเสียงในพื้นที่ปฏิบัติงาน"
   "จัดอบรมดับเพลิงขั้นต้นให้ลูกจ้างไม่น้อยกว่าร้อยละ 40"
2. documents = เอกสาร/แบบฟอร์ม/นโยบายที่ต้อง "จัดทำขึ้น" เช่น "แผนป้องกันและระงับอัคคีภัย"
   "ทะเบียนรายชื่อผู้ผ่านการอบรม"
3. evidence = สิ่งที่ผู้ตรวจประเมินจะ "ขอดู" เพื่อพิสูจน์ว่าทำจริง เช่น "รายงานผลการตรวจวัด
   พร้อมลายมือชื่อผู้ตรวจวัด" "ใบรับรองการอบรมรายบุคคล" "ภาพถ่ายการติดตั้งพร้อมวันที่"
   ข้อนี้ต้องคิดในมุมผู้ตรวจเสมอ: ถ้าองค์กรอ้างว่าทำแล้ว จะพิสูจน์ด้วยอะไร
4. not_specified = สิ่งที่ตัวบท "ไม่ได้กำหนด" ไว้ แต่องค์กรต้องกำหนดเอง
   เช่น ความถี่ที่ตัวบทเขียนแค่ "ตามความเหมาะสม" หรือไม่ระบุผู้รับผิดชอบ

กติกาที่ห้ามฝ่าฝืน:
· ทุกบรรทัดต้องมี section_ref = เลขมาตรา/ข้อ ตามที่ปรากฏในข้อกำหนดต้นทางที่ให้มา
  ถ้าข้อกำหนดต้นทางไม่มีเลขมาตรา ให้ใช้ข้อความ 8 คำแรกของข้อนั้นแทน
  ห้ามเขียนบรรทัดที่ชี้กลับต้นทางไม่ได้เด็ดขาด
· ห้ามเติมความถี่ ผู้รับผิดชอบ หรือกำหนดเวลา ที่ไม่ปรากฏในตัวบท
  ไม่มีข้อมูล ให้เว้นฟิลด์นั้นเป็นสตริงว่าง แล้วเพิ่มรายการเข้า not_specified
  ห้ามใส่คำว่า "ตามความเหมาะสม" หรือ "ปีละ 1 ครั้ง" เองเป็นอันขาด
· รวมข้อที่ซ้ำกันเข้าด้วยกัน (เช่น 3 มาตราสั่งให้อบรมเหมือนกัน = 1 action อ้าง 3 section_ref
  โดยคั่นด้วย " · ")
· เรียง actions ตามลำดับการปฏิบัติจริง (สำรวจ → ประเมิน → จัดทำแผน → อบรม → ตรวจติดตาม → รายงาน)
  ไม่ใช่เรียงตามเลขมาตรา
· ข้อที่เป็นบทนิยาม บทกำหนดอำนาจของราชการ หรือบทลงโทษ ไม่สร้างงานให้องค์กร — ข้ามไป
  ห้ามแปลงเป็น action เพื่อให้รายการดูยาวขึ้น
· ภาษาไทยราชการ กระชับ ผู้ที่ไม่ใช่นักกฎหมายอ่านเข้าใจ

ตอบเป็น JSON ล้วนเท่านั้น ห้ามมีข้อความอื่นนอก JSON ห้ามครอบด้วย markdown:
{"actions":[{"what":"","who":"","frequency":"","deadline":"","section_ref":""}],
 "documents":[{"name":"","purpose":"","section_ref":"","who_keeps":""}],
 "evidence":[{"name":"","why_auditor_asks":"","section_ref":""}],
 "not_specified":[{"item":"","what_missing":"","section_ref":""}]}`

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

// section_ref ของข้อหนึ่ง — ใช้เลขมาตราถ้ามี ไม่มีก็ใช้ 8 คำแรก (ต้องตรงกับที่บอกโมเดลไว้)
function refOf(r) {
  const txt = String(r.text || '').trim()
  const m = txt.match(/^\s*((?:มาตรา|ข้อ|หมวด)\s*[๐-๙0-9]+(?:\/[๐-๙0-9]+)?)/)
  if (m) return m[1].replace(/\s+/g, ' ')
  return txt.split(/\s+/).slice(0, 8).join(' ')
}

export async function buildActionGuide(lawId, by = 'ระบบ') {
  const laws = await rest(`lg_laws?select=id,code,name,ministry,law_type,doc_list&id=eq.${lawId}`)
  if (!laws.length) throw new Error('ไม่พบกฎหมายรหัสนี้ในทะเบียน')
  const law = laws[0]
  const reqs = await rest(`lg_requirements?select=id,seq,text,responsible,frequency,documents,note&law_id=eq.${lawId}&order=seq.asc&limit=300`)
  if (!reqs.length) {
    const e = new Error('ฉบับนี้ยังไม่มีข้อกำหนดในทะเบียน — สร้างคู่มือปฏิบัติไม่ได้ กรุณาให้ AI สรุปกฎหมายก่อน')
    e.code = 'no_requirements'
    throw e
  }

  // ส่ง "ของที่ทะเบียนมีอยู่แล้ว" ไปด้วย เพื่อให้โมเดลใช้ของจริงแทนการคิดใหม่
  // (responsible / frequency / documents ที่มนุษย์เคยกรอกไว้ ถือว่าน่าเชื่อถือกว่าที่ AI เดา)
  const body = reqs.map(r => [
    `[section_ref=${refOf(r)}] ${String(r.text || '').slice(0, 1200)}`,
    r.responsible ? `   ผู้รับผิดชอบที่ทะเบียนบันทึกไว้: ${r.responsible}` : '',
    r.frequency ? `   ความถี่ที่ทะเบียนบันทึกไว้: ${r.frequency}` : '',
    r.documents ? `   เอกสารที่ทะเบียนบันทึกไว้: ${String(r.documents).slice(0, 300)}` : '',
    r.note ? `   หมายเหตุ: ${String(r.note).slice(0, 300)}` : '',
  ].filter(Boolean).join('\n')).join('\n\n')

  const ar = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL, max_tokens: 8000,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content:
        `กฎหมาย: ${law.name}${law.ministry ? `\nหน่วยงาน: ${law.ministry}` : ''}${law.doc_list ? `\nเอกสารที่ทะเบียนระบุไว้ระดับฉบับ: ${law.doc_list}` : ''}\n\nข้อกำหนดในทะเบียน (${reqs.length} ข้อ):\n\n${body}` }],
    }),
  })
  if (!ar.ok) throw new Error(friendlyApiError(await ar.text()))
  const j = await ar.json()
  let txt = (j.content || []).map(c => c.text || '').join('').trim()
  txt = txt.replace(/^```json\s*/i, '').replace(/```$/, '').trim()
  let parsed
  try { parsed = JSON.parse(txt) } catch { throw new Error('AI ตอบกลับในรูปแบบที่แปลงเป็น JSON ไม่ได้') }

  const S = (v, n = 400) => String(v ?? '').trim().slice(0, n)
  const arr = v => Array.isArray(v) ? v : []
  // ทิ้งบรรทัดที่ไม่มี section_ref — บรรทัดที่ชี้กลับต้นทางไม่ได้คือบรรทัดที่แต่งขึ้น
  const guide = {
    actions: arr(parsed.actions).filter(a => S(a.what) && S(a.section_ref)).map(a => ({
      what: S(a.what, 600), who: S(a.who, 120), frequency: S(a.frequency, 120),
      deadline: S(a.deadline, 120), section_ref: S(a.section_ref, 200),
    })),
    documents: arr(parsed.documents).filter(d => S(d.name) && S(d.section_ref)).map(d => ({
      name: S(d.name, 300), purpose: S(d.purpose, 400),
      section_ref: S(d.section_ref, 200), who_keeps: S(d.who_keeps, 120),
    })),
    evidence: arr(parsed.evidence).filter(e => S(e.name) && S(e.section_ref)).map(e => ({
      name: S(e.name, 300), why_auditor_asks: S(e.why_auditor_asks, 400), section_ref: S(e.section_ref, 200),
    })),
    not_specified: arr(parsed.not_specified).filter(n => S(n.item)).map(n => ({
      item: S(n.item, 300), what_missing: S(n.what_missing, 300), section_ref: S(n.section_ref, 200),
    })),
  }
  const dropped = arr(parsed.actions).length + arr(parsed.documents).length + arr(parsed.evidence).length
    - guide.actions.length - guide.documents.length - guide.evidence.length

  const row = {
    law_id: Number(lawId), guide, model: MODEL, generated_by: by,
    generated_at: new Date().toISOString(), req_count: reqs.length,
  }
  const ur = await fetch(`${SUPA_URL}/rest/v1/lg_law_action_guide?on_conflict=law_id`, {
    method: 'POST',
    headers: { ...H, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify([row]),
  })
  if (!ur.ok) throw new Error('บันทึกคู่มือปฏิบัติไม่สำเร็จ: ' + (await ur.text()).slice(0, 300))
  return { law: { id: law.id, code: law.code, name: law.name }, guide, req_count: reqs.length, dropped }
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
    const out = await buildActionGuide(lawId, String(req.body?.by || 'ระบบ').slice(0, 80))
    return res.status(200).json(out)
  } catch (e) {
    const status = e?.code === 'no_requirements' ? 422 : 500
    return res.status(status).json({ error: String(e?.message || e), code: e?.code })
  }
}
