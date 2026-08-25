// Vercel serverless function — สรุปภาพรวมทั้งฉบับแบบข้ามมาตรา
//
// ข้อเสนอแนะของผู้ประเมินข้อ 5 · P22 ขั้นที่ 5
// "การสรุปกฎหมายควรสรุปทั้งฉบับ ไม่ใช่แยกรายมาตรา เพราะใจความไม่จบสมบูรณ์ในมาตราเดียว
//  ต้องอ่านหลายมาตราประกอบกัน"
//
// ═══ ทำไมแยก endpoint ไม่แก้ prompt ใน law-analyze ═══
// law-analyze ทำ 4 ด่านต่อกันจนชนเพดาน 300 วิเป็นประจำอยู่แล้ว (ดูหัวไฟล์ law-relate.js)
// และมันทำงานกับ "กฎหมายฉบับใหม่ก่อนเข้าทะเบียน" ส่วนงานนี้ทำกับ "ฉบับที่อยู่ในทะเบียนแล้ว"
// ซึ่งมีข้อกำหนดที่ผ่านการตรวจทานของคนอยู่แล้ว — คนละต้นทาง คนละจังหวะ คนละงบเวลา
//
// ═══ กติกาที่ห้ามผ่อน ═══
// เขียนผ่านฟังก์ชัน lg_set_law_overview เท่านั้น (migration 050)
// ซึ่งแตะได้เฉพาะคีย์ overview — requirements ที่ยืนยันแล้วจึงไม่มีทางถูกกระทบ
// แม้แต่ในกรณีที่โค้ดนี้มีบั๊ก
import { sameOrigin, clientIp, rateLimited, tooManyRequests } from './_lib/guard.js'

const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY
const H = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'content-type': 'application/json' }
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

const SYSTEM = `คุณเป็นผู้ช่วยเจ้าหน้าที่ความปลอดภัย (จป.วิชาชีพ) สรุป "ภาพรวมทั้งฉบับ" ของกฎหมายหนึ่งฉบับ
ให้ผู้ที่ไม่ใช่นักกฎหมายอ่านแล้วเข้าใจว่ากฎหมายฉบับนี้ทั้งฉบับพูดเรื่องอะไร

ปัญหาที่ต้องแก้: การสรุปแยกรายมาตราทำให้ใจความไม่จบ เพราะเรื่องเดียวมักกระจายอยู่หลายมาตรา
เช่น มาตราหนึ่งบอกว่า "ต้องอบรม" อีกมาตราบอก "หลักสูตรและระยะเวลา" อีกมาตราบอก "ต้องเก็บทะเบียนกี่ปี"
อ่านแยกกันจะไม่รู้ว่าต้องทำอะไรจริง งานของคุณคือประกอบมันกลับเข้าด้วยกัน

โครงที่ต้องตอบ:

1. gist — สาระสำคัญทั้งฉบับ 5-8 บรรทัด
   · ภาษาที่ผู้ที่ไม่ใช่นักกฎหมายอ่านเข้าใจ
   · **ห้ามอ้างเลขมาตราในเนื้อความของ gist เด็ดขาด** (เลขมาตราไปอยู่ที่ duty_groups)
   · บอกว่ากฎหมายนี้มีไว้ทำอะไร คุมเรื่องอะไร และผลต่อองค์กรคืออะไร

2. who_must_comply — ใครต้องปฏิบัติตาม เขียนตามเงื่อนไขที่ปรากฏในตัวบทจริง
   เช่น "นายจ้างในสถานประกอบกิจการที่มีลูกจ้างตั้งแต่ 50 คนขึ้นไป"

3. duty_groups — จัดกลุ่มหน้าที่ **ตามเรื่อง** ไม่ใช่ตามเลขมาตรา
   ตัวอย่างชื่อกลุ่ม: การอบรมและพัฒนาบุคลากร · การตรวจวัดสภาพแวดล้อม · การจัดทำเอกสารและรายงาน ·
   การแต่งตั้งบุคลากรเฉพาะ · การจัดหาอุปกรณ์และการบำรุงรักษา
   แต่ละกลุ่มต้องมี section_refs ครบทุกมาตราที่เกี่ยวข้องกับเรื่องนั้น
   กลุ่มหนึ่งมีได้หลายมาตรา และมาตราหนึ่งอยู่ได้หลายกลุ่ม

4. penalty — บทกำหนดโทษโดยสรุป ถ้าตัวบทไม่มี ให้ตอบ "ตัวบทไม่ได้กำหนด"

5. effective_note — ข้อสังเกตเรื่องการมีผลใช้บังคับ เช่น มีบทเฉพาะกาลผ่อนผันกี่ปี
   ถ้าไม่มี ให้ตอบ "ตัวบทไม่ได้กำหนด"

6. read_together — **ข้อนี้คือหัวใจของงาน ห้ามตอบเป็นอาเรย์ว่างถ้ามีเรื่องที่เข้าข่าย**
   ระบุเรื่องที่ "อ่านมาตราเดียวแล้วเข้าใจผิดหรือทำไม่ครบ" ต้องอ่านหลายมาตราประกอบกัน
   แต่ละรายการต้องบอก:
     topic        = เรื่องนั้นคืออะไร
     section_refs = มาตราทั้งหมดที่ต้องอ่านคู่กัน (ต้องมีอย่างน้อย 2 มาตรา)
     why          = ถ้าอ่านมาตราเดียวจะพลาดอะไร เขียนให้เห็นภาพจริง
                    เช่น "มาตรา 8 สั่งให้อบรม แต่ไม่ได้บอกหลักสูตร ต้องอ่านมาตรา 12 ประกอบ
                    จึงจะรู้ว่าต้องเป็นหลักสูตรที่อธิบดีประกาศกำหนด และมาตรา 15 บอกว่า
                    ต้องเก็บหลักฐานการอบรมไว้ 2 ปี ซึ่งไม่ปรากฏในสองมาตราแรกเลย"
   ถ้าตรวจแล้วไม่มีเรื่องใดเข้าข่ายจริงๆ (เช่น ฉบับนี้มีมาตราเดียว) ให้ตอบอาเรย์ว่าง
   แต่ห้ามตอบว่างเพราะขี้เกียจตรวจ

กติกาที่ห้ามฝ่าฝืน:
· ใช้เฉพาะข้อความที่ปรากฏในข้อกำหนดที่ให้มา ห้ามเติมความรู้ทั่วไปเกี่ยวกับกฎหมายไทย
· ไม่มีข้อมูล = เขียนว่า "ตัวบทไม่ได้กำหนด" ห้ามเว้นว่างเงียบๆ และห้ามแต่งขึ้น
· section_refs ต้องเป็นเลขมาตรา/ข้อ ที่ปรากฏจริงในข้อกำหนดที่ให้มาเท่านั้น
· ภาษาไทยราชการ กระชับ

ตอบเป็น JSON ล้วนเท่านั้น ห้ามมีข้อความอื่นนอก JSON ห้ามครอบด้วย markdown:
{"gist":"","who_must_comply":"",
 "duty_groups":[{"title":"","summary":"","section_refs":[]}],
 "penalty":"","effective_note":"",
 "read_together":[{"topic":"","section_refs":[],"why":""}]}`

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

const refOf = r => {
  const txt = String(r.text || '').trim()
  const m = txt.match(/^\s*((?:มาตรา|ข้อ|หมวด)\s*[๐-๙0-9]+(?:\/[๐-๙0-9]+)?)/)
  return m ? m[1].replace(/\s+/g, ' ') : txt.split(/\s+/).slice(0, 8).join(' ')
}

export async function buildOverview(lawId) {
  const laws = await rest(`lg_laws?select=id,code,name,ministry,law_type,issue_date,effective_date&id=eq.${lawId}`)
  if (!laws.length) throw new Error('ไม่พบกฎหมายรหัสนี้ในทะเบียน')
  const law = laws[0]
  const reqs = await rest(`lg_requirements?select=id,seq,text,responsible,frequency,documents,note&law_id=eq.${lawId}&order=seq.asc&limit=300`)
  if (!reqs.length) { const e = new Error('ฉบับนี้ยังไม่มีข้อกำหนดในทะเบียน — สรุปภาพรวมไม่ได้'); e.code = 'no_requirements'; throw e }

  const body = reqs.map(r => `[${refOf(r)}] ${String(r.text || '').slice(0, 1500)}`).join('\n\n')

  const ar = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL, max_tokens: 8000,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content:
        `กฎหมาย: ${law.name}`
        + `${law.ministry ? `\nหน่วยงาน: ${law.ministry}` : ''}`
        + `${law.law_type ? `\nประเภท: ${law.law_type}` : ''}`
        + `${law.issue_date ? `\nวันที่ประกาศ: ${law.issue_date}` : ''}`
        + `${law.effective_date ? `\nวันที่บังคับใช้: ${law.effective_date}` : ''}`
        + `\n\nข้อกำหนดทั้งฉบับตามที่บันทึกในทะเบียน (${reqs.length} ข้อ):\n\n${body}` }],
    }),
  })
  if (!ar.ok) throw new Error(friendlyApiError(await ar.text()))
  const j = await ar.json()
  let txt = (j.content || []).map(c => c.text || '').join('').trim()
  txt = txt.replace(/^```json\s*/i, '').replace(/```$/, '').trim()
  let parsed
  try { parsed = JSON.parse(txt) } catch { throw new Error('AI ตอบกลับในรูปแบบที่แปลงเป็น JSON ไม่ได้') }

  const S = (v, n = 3000) => String(v ?? '').trim().slice(0, n)
  const arr = v => Array.isArray(v) ? v : []
  const refs = v => arr(v).map(s => S(s, 120)).filter(Boolean).slice(0, 30)

  const overview = {
    gist: S(parsed.gist, 2000),
    who_must_comply: S(parsed.who_must_comply, 800),
    duty_groups: arr(parsed.duty_groups).filter(g => S(g.title)).map(g => ({
      title: S(g.title, 200), summary: S(g.summary, 1200), section_refs: refs(g.section_refs),
    })).slice(0, 20),
    penalty: S(parsed.penalty, 1200) || 'ตัวบทไม่ได้กำหนด',
    effective_note: S(parsed.effective_note, 1200) || 'ตัวบทไม่ได้กำหนด',
    // read_together คือหัวใจของข้อเสนอแนะข้อ 5 — รายการที่อ้างมาตราเดียวไม่ใช่
    // "ต้องอ่านหลายมาตราประกอบกัน" ตามนิยาม จึงถูกตัดทิ้งที่นี่ ไม่ปล่อยให้ผ่านไปหลอกผู้ใช้
    read_together: arr(parsed.read_together)
      .map(x => ({ topic: S(x.topic, 300), section_refs: refs(x.section_refs), why: S(x.why, 1500) }))
      .filter(x => x.topic && x.section_refs.length >= 2)
      .slice(0, 15),
    model: MODEL,
    generated_at: new Date().toISOString(),
    req_count: reqs.length,
  }

  // เขียนผ่าน RPC — แตะได้เฉพาะคีย์ overview เท่านั้น (migration 050)
  const wr = await fetch(`${SUPA_URL}/rest/v1/rpc/lg_set_law_overview`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ p_law_id: Number(lawId), p_overview: overview }),
  })
  if (!wr.ok) throw new Error('บันทึกสรุปภาพรวมไม่สำเร็จ: ' + (await wr.text()).slice(0, 300))

  return { law: { id: law.id, code: law.code, name: law.name }, overview, req_count: reqs.length }
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
    return res.status(200).json(await buildOverview(lawId))
  } catch (e) {
    const status = e?.code === 'no_requirements' ? 422 : 500
    return res.status(status).json({ error: String(e?.message || e), code: e?.code })
  }
}
