// Vercel serverless function — คัดกรองว่ากฎหมาย 1 ฉบับ "เกี่ยวข้องกับบริบทของบริษัทหรือไม่"
//
// ข้อเสนอแนะของผู้ประเมินข้อ 1 · P22 ขั้นที่ 1
//
// ═══ กติกาที่ห้ามผ่อน ═══
// ผลจาก endpoint นี้เป็น "ข้อเสนอ" เท่านั้น เขียนลง lg_law_relevance ฝั่ง AI (verdict/reason/…)
// **ห้ามแตะ confirmed_verdict** และ **ห้ามแตะ lg_requirements หรือ lg_laws แม้แต่คอลัมน์เดียว**
// การตัดกฎหมายออกจากทะเบียนหรือตั้งข้อปฏิบัติเป็น "ไม่เกี่ยวข้อง" ต้องมาจากคนกดยืนยันเท่านั้น
//
// ═══ ไม่มีโปรไฟล์ = ไม่ตอบ ═══
// ถ้ายังไม่ตั้งโปรไฟล์บริบทองค์กร endpoint นี้ตอบ 428 ทันที ไม่เรียก AI เลย
// เพราะการเดาว่าบริษัททำอะไรแล้วตอบว่า "เกี่ยวข้อง/ไม่เกี่ยวข้อง" คือการแต่งข้อมูล (กติกาข้อ 4)
import { sameOrigin, clientIp, rateLimited, tooManyRequests } from './_lib/guard.js'

const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY
const H = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'content-type': 'application/json' }
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

const SYSTEM = `คุณเป็นผู้ช่วยเจ้าหน้าที่ความปลอดภัย (จป.วิชาชีพ) ทำหน้าที่คัดกรองว่ากฎหมายฉบับหนึ่ง
"เกี่ยวข้องกับสถานประกอบกิจการของบริษัทนี้หรือไม่"

กติกาที่ห้ามฝ่าฝืน:
1. ตัดสินจากสองอย่างเท่านั้น — (ก) เงื่อนไขการใช้บังคับที่ปรากฏในตัวบทที่ให้มา
   (ข) ข้อมูลที่ปรากฏในโปรไฟล์บริบทองค์กรที่ให้มา
   ห้ามใช้ความรู้ทั่วไปเกี่ยวกับบริษัทนี้ ห้ามเดาว่าบริษัทน่าจะมีหรือน่าจะทำอะไร
2. เหตุผล (reason) ต้องเป็นการเทียบสองฝั่งให้เห็นชัดเสมอ เขียนในรูป
   "<เงื่อนไขจากตัวบท> — <ข้อเท็จจริงจากโปรไฟล์> จึง<เข้าข่าย/ไม่เข้าข่าย>"
   ตัวอย่าง: "ใช้กับสถานประกอบกิจการที่มีลูกจ้างตั้งแต่ 50 คนขึ้นไป — บริษัทมีลูกจ้าง 180 คน จึงเข้าข่าย"
   ห้ามเขียนเหตุผลลอยๆ เช่น "น่าจะเกี่ยวข้องเพราะเป็นกฎหมายความปลอดภัย"
3. ถ้าข้อมูลในโปรไฟล์ไม่พอตัดสิน ให้ตอบ verdict="uncertain" และระบุใน needs_info ว่า
   ต้องเพิ่มข้อมูลอะไรลงโปรไฟล์จึงจะตัดสินได้ ห้ามเดาเป็น relevant หรือ not_relevant เด็ดขาด
   การตอบ uncertain ไม่ใช่ความล้มเหลว — การเดาผิดต่างหากที่ทำให้ทะเบียนเชื่อถือไม่ได้
4. กฎหมายที่กำหนดหน้าที่ให้ "นายจ้าง" หรือ "สถานประกอบกิจการ" ทั่วไปโดยไม่มีเงื่อนไขจำกัด
   ถือว่าเกี่ยวข้อง (relevant) เสมอ
5. บทนิยาม บทกำหนดอำนาจของราชการ หรือบทเฉพาะกาล ที่อยู่ในฉบับที่เกี่ยวข้อง
   ยังถือว่าฉบับนั้นเกี่ยวข้อง — ความเกี่ยวข้องตัดสินที่ระดับฉบับ ไม่ใช่ระดับมาตรา
6. requirement_flags ให้ประเมินรายข้อว่าข้อนั้นใช้กับบริษัทหรือไม่ (applies true/false)
   ใส่ requirement_id ตามที่ให้มาเท่านั้น ห้ามสร้างเลขขึ้นเอง ห้ามข้ามข้อใด

ตอบเป็น JSON ล้วนเท่านั้น ห้ามมีข้อความอื่นนอก JSON ห้ามครอบด้วย markdown:
{"verdict":"relevant|not_relevant|uncertain",
 "confidence":0.0,
 "reason":"",
 "matched_keys":[],
 "needs_info":[],
 "requirement_flags":[{"requirement_id":0,"applies":true,"why":""}]}

matched_keys = ชื่อฟิลด์ในโปรไฟล์ที่ใช้ตัดสินจริง เช่น ["employee_count","activities"]
confidence = 0.0-1.0 · ต่ำกว่า 0.6 ควรตอบ uncertain`

function profileText(p) {
  const L = []
  const put = (k, v) => { if (v !== null && v !== undefined && String(v).trim() !== '' && !(Array.isArray(v) && !v.length)) L.push(`${k}: ${typeof v === 'object' ? JSON.stringify(v, null, 0) : v}`) }
  put('ประเภทกิจการ', p.business_type)
  put('ลักษณะสถานประกอบกิจการ', p.workplace_type)
  put('จำนวนลูกจ้าง (คน)', p.employee_count)
  put('ผู้รับเหมาประจำ (คน)', p.contractor_count)
  put('จำนวนพื้นที่/สาขา', p.site_count)
  put('บทบาทในห่วงโซ่ธุรกิจ', p.value_chain_role)
  put('พื้นที่/สาขา', p.sites)
  put('กิจกรรมที่ทำจริง', p.activities)
  put('เครื่องจักรและอุปกรณ์', p.machines)
  put('สารเคมีที่ใช้', p.chemicals)
  put('ใบอนุญาตที่ถือครอง', p.licenses)
  put('สถานะตามรายชื่อของหน่วยงานกำกับ', p.regulator_status)
  put('ขอบข่ายมาตรฐานที่รับรอง', p.iso_scope)
  if (p.extra && Object.keys(p.extra).length) put('ข้อมูลเพิ่มเติม', p.extra)
  return L.join('\n')
}

// โปรไฟล์ที่ "ว่างเกินกว่าจะตัดสินอะไรได้" — กันไม่ให้เปิดหน้าตั้งค่าแล้วกดบันทึกเปล่าๆ
// เพื่อปลดล็อกปุ่มคัดกรอง แล้วได้ผลที่ดูน่าเชื่อถือทั้งที่ไม่มีข้อมูลรองรับ
function profileTooThin(p) {
  const filled = [p.business_type, p.workplace_type, p.employee_count, p.value_chain_role]
    .filter(v => v !== null && v !== undefined && String(v).trim() !== '').length
  const lists = ['activities', 'machines', 'chemicals', 'licenses', 'regulator_status']
    .reduce((n, k) => n + ((Array.isArray(p[k]) && p[k].length) ? 1 : 0), 0)
  return filled < 2 || (filled + lists) < 3
}

async function rest(path) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, { headers: H })
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return r.json()
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

// ── คัดกรอง 1 ฉบับ — ใช้ทั้งจากปุ่มที่ผู้ใช้กด และจากคิว (api/queue-run.js) ──
export async function screenOneLaw(lawId, profile) {
  const laws = await rest(`lg_laws?select=id,code,name,ministry,law_type,issue_date,effective_date,source_url&id=eq.${lawId}`)
  if (!laws.length) throw new Error('ไม่พบกฎหมายรหัสนี้ในทะเบียน')
  const law = laws[0]
  // migration 053 · view นี้ให้ทั้ง note (applicability ที่ยุบรวมไว้ตอนนำเข้า)
  // และค่าที่กู้จาก F-259 — อ่านตารางดิบจะพลาดค่าที่กู้มาแล้ว
  const reqs = (await rest(`lg_req_effective?select=requirement_id,seq,text,responsible,note&law_id=eq.${lawId}&order=seq.asc&limit=200`))
    .map(r => ({ ...r, id: r.requirement_id }))

  const lawText = [
    `ชื่อกฎหมาย: ${law.name}`,
    law.ministry ? `หน่วยงาน/กระทรวง: ${law.ministry}` : '',
    law.law_type ? `ประเภท: ${law.law_type}` : '',
    law.issue_date ? `วันที่ประกาศ: ${law.issue_date}` : '',
    law.effective_date ? `วันที่บังคับใช้: ${law.effective_date}` : '',
    '',
    reqs.length ? 'ข้อกำหนดในทะเบียน (สรุปสาระสำคัญรายข้อ):' : 'ฉบับนี้ยังไม่มีข้อกำหนดในทะเบียน — ตัดสินจากชื่อและประเภทเท่าที่มี',
    ...reqs.map(r => `[requirement_id=${r.id}] ${(r.text || '').slice(0, 900)}${r.note ? `\n   (ใช้กับ/วิธีปฏิบัติ: ${String(r.note).slice(0, 300)})` : ''}`),
  ].filter(Boolean).join('\n')

  const ar = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL, max_tokens: 4000,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content:
        `โปรไฟล์บริบทองค์กร:\n${profileText(profile)}\n\n────────────────\nกฎหมายที่ต้องคัดกรอง:\n${lawText}` }],
    }),
  })
  if (!ar.ok) throw new Error(friendlyApiError(await ar.text()))
  const j = await ar.json()
  let txt = (j.content || []).map(c => c.text || '').join('').trim()
  txt = txt.replace(/^```json\s*/i, '').replace(/```$/, '').trim()
  let parsed
  try { parsed = JSON.parse(txt) } catch { throw new Error('AI ตอบกลับในรูปแบบที่แปลงเป็น JSON ไม่ได้') }

  const VERDICTS = ['relevant', 'not_relevant', 'uncertain']
  const verdict = VERDICTS.includes(parsed.verdict) ? parsed.verdict : 'uncertain'
  const conf = Math.max(0, Math.min(1, Number(parsed.confidence) || 0))
  const validIds = new Set(reqs.map(r => r.id))
  const flags = (Array.isArray(parsed.requirement_flags) ? parsed.requirement_flags : [])
    .filter(f => validIds.has(Number(f.requirement_id)))   // ทิ้งเลขที่ AI สร้างเอง
    .map(f => ({ requirement_id: Number(f.requirement_id), applies: !!f.applies, why: String(f.why || '').slice(0, 400) }))

  const row = {
    law_id: Number(lawId),
    verdict, confidence: conf,
    reason: String(parsed.reason || '').slice(0, 2000),
    matched_keys: Array.isArray(parsed.matched_keys) ? parsed.matched_keys.slice(0, 20) : [],
    needs_info: Array.isArray(parsed.needs_info) ? parsed.needs_info.slice(0, 20) : [],
    requirement_flags: flags,
    model: MODEL,
    suggested_at: new Date().toISOString(),
    profile_at: profile.updated_at || null,
  }

  // upsert ฝั่ง AI เท่านั้น — merge-duplicates ไม่แตะคอลัมน์ที่ไม่ได้ส่งไป
  // (confirmed_verdict / confirmed_by / confirmed_at / confirm_note จึงคงค่าเดิมไว้ครบ)
  const ur = await fetch(`${SUPA_URL}/rest/v1/lg_law_relevance?on_conflict=law_id`, {
    method: 'POST',
    headers: { ...H, Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify([row]),
  })
  if (!ur.ok) throw new Error('บันทึกผลคัดกรองไม่สำเร็จ: ' + (await ur.text()).slice(0, 300))
  const saved = (await ur.json())[0] || row
  return { law: { id: law.id, code: law.code, name: law.name }, relevance: saved }
}

export async function loadProfile() {
  const rows = await rest('lg_company_profile?select=*&id=eq.1')
  return rows[0] || null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!sameOrigin(req)) return res.status(403).json({ error: 'คำขอไม่ได้มาจากโดเมนของแอป' })
  const wait = rateLimited(clientIp(req)); if (wait) return tooManyRequests(res, wait)
  if (!SUPA_URL || !SUPA_KEY) return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)' })
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY ใน Vercel' })

  try {
    const lawId = Number(req.body?.law_id)
    if (!Number.isFinite(lawId)) return res.status(400).json({ error: 'ต้องระบุ law_id' })

    const profile = await loadProfile()
    if (!profile) return res.status(428).json({
      error: 'ยังไม่ได้ตั้งโปรไฟล์บริบทองค์กร — เปิดหน้าตั้งค่า › บริบทองค์กร แล้วกรอกข้อมูลก่อน จึงจะคัดกรองได้',
      code: 'no_profile' })
    if (profileTooThin(profile)) return res.status(428).json({
      error: 'ข้อมูลในโปรไฟล์บริบทองค์กรยังน้อยเกินกว่าจะใช้ตัดสินได้ — กรุณากรอกอย่างน้อย ประเภทกิจการ · ลักษณะสถานประกอบกิจการ · จำนวนลูกจ้าง และกิจกรรมที่ทำจริง',
      code: 'thin_profile' })

    const out = await screenOneLaw(lawId, profile)
    return res.status(200).json(out)
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) })
  }
}
