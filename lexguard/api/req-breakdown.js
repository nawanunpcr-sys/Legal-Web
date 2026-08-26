// Vercel serverless function — แตกข้อกำหนด 1 ข้อ ออกเป็นข้อย่อยที่ประเมินได้ทีละข้อ
//
// P24 · ปัญหาที่แก้: ระบบประเมินละเอียดสุดที่ระดับ "ข้อกำหนด" จึงตอบได้แค่สอดคล้อง/ไม่สอดคล้อง
// ตัวบทสั่งให้ตรวจวัดเสียงปีละครั้งและเก็บผล 5 ปี — องค์กรตรวจแล้วแต่เก็บไว้ 2 ปี
// ช่องว่างอยู่ที่ระยะเวลาเก็บ ไม่ใช่การตรวจวัด แต่ระบบเดิมได้แค่ NC ทั้งข้อ
//
// ═══ ใช้ของที่มีอยู่แล้ว ห้ามวิเคราะห์ซ้ำ ═══
// ดึงสรุปที่ Skill 2 ทำไว้ (lg_laws.ai_summary) และคู่มือปฏิบัติจากขั้นที่ 2
// (lg_law_action_guide.guide — actions/documents/evidence) มาเป็น input
// ไม่เรียก AI ให้สรุปกฎหมายหรือหาความเกี่ยวข้องซ้ำ เพราะนอกจากเปลืองแล้ว
// ยังทำให้ได้คำตอบคนละชุดกับที่ผู้ใช้เห็นในหน้าจออื่น
//
// ═══ กติกา ═══
// เขียนลง lg_sub_requirements เท่านั้น · ไม่แตะ lg_requirements แม้แต่คอลัมน์เดียว
// มีข้อย่อยอยู่แล้วจะไม่สร้างซ้ำ เว้นแต่ส่ง regenerate มา
import { sameOrigin, clientIp, rateLimited, tooManyRequests } from './_lib/guard.js'

const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY
const H = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'content-type': 'application/json' }
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

const SYSTEM = `คุณคือผู้เชี่ยวชาญด้านกฎหมายความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน (SHE)
หน้าที่ของคุณคือแตกข้อกำหนดในกฎหมายออกเป็นรายการย่อยที่ผู้ปฏิบัติงานตรวจสอบได้ทีละข้อ

หลักการแตกข้อย่อย
1. แตกตาม "การกระทำที่ต้องทำ" ไม่ใช่ตามเลขมาตรา
   ข้อกำหนดหนึ่งอาจให้ข้อย่อยหลายข้อ และหลายเรื่องอาจรวมเป็นข้อย่อยเดียวได้
2. แต่ละข้อย่อยต้องตอบได้ด้วยคำว่า "ทำแล้ว" หรือ "ยังไม่ทำ" อย่างชัดเจน
   หากข้อใดตอบแบบนี้ไม่ได้ แสดงว่ายังแตกไม่ละเอียดพอ
3. แยกเงื่อนไขเหล่านี้ออกเป็นข้อย่อยของตัวเองเสมอ เพราะเป็นจุดที่มักไม่สอดคล้อง
   · ความถี่ในการดำเนินการ (ปีละครั้ง / ทุก 6 เดือน)
   · ระยะเวลาการจัดเก็บเอกสาร
   · การรายงานต่อหน่วยงานราชการและกำหนดเวลา
   · คุณสมบัติของผู้ดำเนินการ (ต้องเป็นผู้ได้รับใบอนุญาต / ขึ้นทะเบียน)
4. จำนวนข้อย่อยต่อข้อกำหนด 1 ข้อ ควรอยู่ระหว่าง 2-8 ข้อ
   ถ้าเกิน ให้รวมข้อที่เกี่ยวเนื่องกัน เพื่อไม่ให้เป็นภาระต่อผู้ประเมิน
5. ห้ามสร้างข้อกำหนดที่ไม่ปรากฏในตัวบท ถ้าตัวบทคลุมเครือให้ระบุไว้ใน note
6. action_required เขียนเป็นประโยคคำสั่งที่ลงมือทำได้จริง ภาษาเข้าใจง่าย ไม่ใส่เลขมาตรา
7. evidence_required ระบุชื่อเอกสาร แบบฟอร์ม หรือบันทึกที่ใช้ยืนยันตอนตรวจประเมิน
   ต้องเป็นสิ่งที่ขอดูได้จริง ไม่ใช่คำกว้างๆ อย่าง "หลักฐานการดำเนินการ"
8. risk_level เลือกจาก 4 ระดับ ตามผลที่เกิดหากไม่ปฏิบัติ
   critical = ผิดกฎหมายทันทีและมีบทลงโทษ หรือกระทบชีวิตและความปลอดภัยโดยตรง
   high     = ผิดเงื่อนไขหลักของกฎหมาย ผู้ตรวจจะออกข้อบกพร่องแน่นอน
   medium   = เป็นข้อกำหนดรอง หรือเป็นเรื่องเอกสารที่ตามแก้ได้
   low      = เป็นแนวปฏิบัติที่ควรทำ ไม่ถึงกับผิดกฎหมาย

ตอบเป็น JSON ล้วนเท่านั้น ห้ามมีข้อความอื่นนอก JSON ห้ามครอบด้วย markdown:
{"items":[{"title":"","action_required":"","evidence_required":"","risk_level":"critical|high|medium|low","note":""}]}`

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

export async function breakdownRequirement(reqId, { regenerate = false, by = 'ระบบ' } = {}) {
  const rows = await rest(`lg_req_effective?select=requirement_id,law_id,text,responsible,frequency,documents,report_to&requirement_id=eq.${reqId}`)
  if (!rows.length) throw new Error('ไม่พบข้อกำหนดรหัสนี้')
  const req = rows[0]

  const existing = await rest(`lg_sub_requirements?select=*&requirement_id=eq.${reqId}&order=seq.asc`)
  if (existing.length && !regenerate) return { requirement_id: reqId, items: existing, reused: true }

  const laws = await rest(`lg_laws?select=id,code,name,ministry,ai_summary&id=eq.${req.law_id}`)
  const law = laws[0] || {}
  // ผลจาก Skill 2 ที่มีอยู่แล้ว — ใช้เป็นบริบท ไม่ให้ AI ไปสรุปกฎหมายซ้ำ
  const overview = law.ai_summary?.overview
  // คู่มือปฏิบัติจากขั้นที่ 2 — บอกอยู่แล้วว่าต้องทำอะไรและเก็บหลักฐานอะไร
  const guides = await rest(`lg_law_action_guide?select=guide&law_id=eq.${req.law_id}`)
  const guide = guides[0]?.guide

  const ctx = [
    `กฎหมาย: ${law.name || ''}`,
    law.ministry ? `หน่วยงาน: ${law.ministry}` : '',
    overview?.gist ? `\nสาระสำคัญทั้งฉบับ (ระบบสรุปไว้แล้ว):\n${String(overview.gist).slice(0, 1200)}` : '',
    overview?.who_must_comply ? `ใครต้องปฏิบัติ: ${overview.who_must_comply}` : '',
    guide ? `\nคู่มือปฏิบัติที่ระบบสรุปไว้แล้วสำหรับฉบับนี้:\n`
      + `สิ่งที่ต้องทำ: ${(guide.actions || []).map(a => a.what).filter(Boolean).slice(0, 12).join(' · ')}\n`
      + `หลักฐานที่ต้องเก็บ: ${(guide.evidence || []).map(e => e.name).filter(Boolean).slice(0, 12).join(' · ')}` : '',
    `\n────────────────`,
    `ข้อกำหนดที่ต้องแตกเป็นข้อย่อย:`,
    String(req.text || '').slice(0, 2500),
    req.responsible ? `ผู้รับผิดชอบที่ทะเบียนบันทึกไว้: ${req.responsible}` : '',
    req.frequency ? `ความถี่ที่ทะเบียนบันทึกไว้: ${req.frequency}` : '',
    req.documents ? `เอกสารที่ทะเบียนบันทึกไว้: ${String(req.documents).slice(0, 400)}` : '',
    req.report_to ? `การรายงานผล: ${String(req.report_to).slice(0, 300)}` : '',
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

  const RISK = ['critical', 'high', 'medium', 'low']
  const S = (v, n = 600) => String(v ?? '').trim().slice(0, n)
  const items = (Array.isArray(parsed.items) ? parsed.items : [])
    .filter(x => S(x.title))
    .slice(0, 12)
    .map((x, i) => ({
      requirement_id: Number(reqId), law_id: req.law_id, seq: i,
      title: S(x.title, 200),
      action_required: S(x.action_required, 800),
      evidence_required: S(x.evidence_required, 500),
      risk_level: RISK.includes(x.risk_level) ? x.risk_level : 'medium',
      note: S(x.note, 500) || null,
      generated_by: 'ai', model: MODEL,
    }))
  if (!items.length) throw new Error('AI ไม่ได้เสนอข้อย่อยที่ใช้ได้แม้แต่ข้อเดียว')

  // regenerate = ลบเฉพาะข้อย่อยที่ AI สร้างและ "ยังไม่มีใครติ๊ก" เท่านั้น
  // ข้อที่ผู้ประเมินติ๊กไปแล้วห้ามลบ ไม่งั้นผลประเมินหายโดยไม่มีใครรู้
  if (existing.length) {
    const safe = existing.filter(s => s.is_met === null && !s.is_na && s.generated_by === 'ai').map(s => s.id)
    if (safe.length) await rest(`lg_sub_requirements?id=in.(${safe.join(',')})`, { method: 'DELETE' })
    const kept = existing.length - safe.length
    if (kept) items.forEach((it, i) => { it.seq = existing.length + i })
  }

  const ins = await rest('lg_sub_requirements?select=*', {
    method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(items) })
  return { requirement_id: reqId, items: ins, reused: false, by }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!sameOrigin(req)) return res.status(403).json({ error: 'คำขอไม่ได้มาจากโดเมนของแอป' })
  const wait = rateLimited(clientIp(req)); if (wait) return tooManyRequests(res, wait)
  if (!SUPA_URL || !SUPA_KEY) return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า Supabase' })
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY ใน Vercel' })

  try {
    const id = Number(req.body?.requirement_id)
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'ต้องระบุ requirement_id' })
    return res.status(200).json(await breakdownRequirement(id, {
      regenerate: !!req.body?.regenerate, by: String(req.body?.by || 'ระบบ').slice(0, 80) }))
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) })
  }
}
