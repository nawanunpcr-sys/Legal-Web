// P10 · Task 4 — AI ค้นหา/สรุปกฎหมายใหม่ประจำเดือน (ราชกิจจานุเบกษา + Shawpat).
// ใช้ได้ทั้ง Vercel (default handler) และ dev proxy ใน vite.config (named `discover`).
// ไม่เขียนลง DB — ฝั่ง client เป็นผู้บันทึกลง lg_ai_discovered_laws (RLS anon).
// ความลับทั้งหมดมาจาก environment เท่านั้น (ห้าม commit key).

const SOURCES = [
  { url: 'https://ratchakitcha.soc.go.th', source: 'ratchakitcha' },
  { url: 'https://www.shawpat.or.th/th/safety-law', source: 'shawpat' },
]

const SEARCH_SYSTEM = `คุณคือเอเจนต์เฝ้าระวังกฎหมายความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน (SHE) ของไทย
จากข้อความหน้าเว็บราชการ/แหล่งกฎหมายที่ให้มา ให้ดึงเฉพาะ "กฎหมาย/ประกาศ/กฎกระทรวง/พระราชบัญญัติ" ที่เกี่ยวข้องกับ SHE ที่ออกใหม่ล่าสุด
ตอบกลับเป็น JSON เท่านั้น ไม่มี markdown:
{"items":[{"law_name":"ชื่อกฎหมายเต็ม","source_url":"ลิงก์ตัวบท/หน้าประกาศของรายการนี้ (ถ้าพบ)","announced_date":"YYYY-MM-DD หรือว่าง","effective_date":"YYYY-MM-DD หรือว่าง","ministry":"กระทรวง/หน่วยงานที่ออก","category_guess":"LA|LB|LC|LD|LE|LF|LG|CC","summary":"สรุปสั้น 1 บรรทัด"}]}
เก็บเฉพาะรายการที่เป็นชื่อกฎหมายจริงและเกี่ยวข้องกับ SHE ข้ามเมนู/ข่าว/อบรม/บทความ`

const SUMMARIZE_SYSTEM = `คุณคือผู้ช่วย จป.วิชาชีพ อ่าน-สรุปกฎหมาย SHE ของไทยเพื่อเข้าทะเบียนกฎหมาย
สรุปให้ครบ: สาระสำคัญทุกข้อ (รายมาตรา/ข้อ ที่สร้างหน้าที่ต้องปฏิบัติ — อย่าตกหล่น), เอกสารที่เกี่ยวข้อง, วันที่ประกาศ, วันที่บังคับใช้, กระทรวงที่ออก
ตอบกลับเป็น JSON เท่านั้น ไม่มี markdown:
{"ministry":"","announced_date":"YYYY-MM-DD หรือว่าง","effective_date":"YYYY-MM-DD หรือว่าง","related_docs":["เอกสาร/แบบฟอร์ม/รายงานที่ต้องจัดทำ"],"summary":["สาระสำคัญข้อที่ 1 (ระบุเลขมาตรา/ข้อ)","สาระสำคัญข้อที่ 2", "..."]}`

const strip = h => h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

const ALLOWED_HOSTS = ['ratchakitcha.soc.go.th', 'dlpw.go.th', 'labour.go.th', 'shawpat.or.th', 'ddc.moph.go.th', 'moph.go.th', 'diw.go.th']
function isAllowedUrl(u) {
  try { const url = new URL(u); if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
    const host = url.hostname.toLowerCase(); return ALLOWED_HOSTS.some(d => host === d || host.endsWith('.' + d))
  } catch { return false }
}

async function callClaude(key, model, system, userText, maxTokens = 4000) {
  const ar = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: userText }] }),
  })
  if (!ar.ok) throw new Error('Claude ' + (await ar.text()).slice(0, 200))
  let txt = ((await ar.json()).content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim()
  return txt.replace(/^```json\s*/i, '').replace(/```$/, '').trim()
}

async function doSearch(key, model) {
  let text = ''
  for (const s of SOURCES) {
    try { const r = await fetch(s.url, { headers: { 'user-agent': 'Mozilla/5.0 LexGuardAgent' } })
      if (r.ok) text += `\n\n[${s.source} · ${s.url}]\n` + strip(await r.text()) } catch { /* best effort */ }
  }
  text = text.slice(0, 16000)
  if (text.length < 200) return { status: 422, body: { error: 'ดึงเนื้อหาจากแหล่งข้อมูลไม่ได้ (ราชกิจจาฯ / Shawpat) — ลองใหม่ภายหลัง' } }
  const raw = await callClaude(key, model, SEARCH_SYSTEM, 'เนื้อหาหน้าเว็บ:\n\n' + text, 3000)
  let parsed; try { parsed = JSON.parse(raw) } catch { return { status: 500, body: { error: 'แปลงผลลัพธ์เป็น JSON ไม่ได้', raw: raw.slice(0, 300) } } }
  const items = (parsed.items || []).map(it => ({
    law_name: it.law_name || '', source_url: it.source_url || '', announced_date: it.announced_date || '',
    effective_date: it.effective_date || '', ministry: it.ministry || '', category_guess: it.category_guess || '',
    summary: it.summary || '', source: /shawpat/i.test(it.source_url || '') ? 'shawpat' : 'ratchakitcha',
  })).filter(it => it.law_name)
  return { status: 200, body: { items } }
}

async function doSummarize(key, model, payload = {}) {
  const { law_name = '', source_url = '', text = '' } = payload
  let body = text
  if (!body && source_url && isAllowedUrl(source_url)) {
    try { const r = await fetch(source_url, { headers: { 'user-agent': 'Mozilla/5.0 LexGuardAgent' } })
      const ct = r.headers.get('content-type') || ''
      if (!ct.includes('pdf')) body = strip(await r.text()).slice(0, 16000) } catch { /* fall through */ }
  }
  const userText = `ชื่อกฎหมาย: ${law_name}\n${source_url ? 'ลิงก์: ' + source_url + '\n' : ''}${body ? '\nตัวบท/เนื้อหา:\n' + body : '\n(ไม่มีตัวบทเต็ม — สรุปจากชื่อและความรู้ทั่วไปเท่าที่ทำได้ พร้อมระบุว่าควรตรวจสอบตัวบทจริง)'}`
  const raw = await callClaude(key, model, SUMMARIZE_SYSTEM, userText, 6000)
  let parsed; try { parsed = JSON.parse(raw) } catch { return { status: 500, body: { error: 'แปลงผลลัพธ์เป็น JSON ไม่ได้', raw: raw.slice(0, 300) } } }
  return { status: 200, body: {
    ministry: parsed.ministry || '', announced_date: parsed.announced_date || '', effective_date: parsed.effective_date || '',
    related_docs: Array.isArray(parsed.related_docs) ? parsed.related_docs : [],
    summary: Array.isArray(parsed.summary) ? parsed.summary : [],
  } }
}

// Core — used by both the Vercel handler and the vite dev proxy.
export async function discover({ mode, payload } = {}, env = {}) {
  const key = env.ANTHROPIC_API_KEY
  const model = env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'
  if (!key) return { status: 500, body: { error: 'ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY (ตั้งใน .env สำหรับ local หรือ Vercel สำหรับ production)' } }
  try {
    if (mode === 'search') return await doSearch(key, model)
    if (mode === 'summarize') return await doSummarize(key, model, payload)
    return { status: 400, body: { error: 'mode ไม่ถูกต้อง (search | summarize)' } }
  } catch (e) { return { status: 502, body: { error: String((e && e.message) || e) } } }
}

// Vercel serverless entrypoint
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  const allowed = process.env.ALLOWED_ORIGIN
  if (allowed) {
    const origin = req.headers.origin || req.headers.referer || ''
    if (!origin.startsWith(allowed)) return res.status(403).json({ error: 'คำขอไม่ได้มาจากโดเมนของแอป' })
  }
  const { status, body } = await discover(req.body || {}, process.env)
  return res.status(status).json(body)
}
