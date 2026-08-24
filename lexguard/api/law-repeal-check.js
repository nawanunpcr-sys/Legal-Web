// Vercel serverless function — ตรวจ "สถานะการบังคับใช้" ของกฎหมายที่อยู่ในทะเบียน
//
// ตอบ 3 คำถาม: (1) ฉบับนี้ยังบังคับใช้อยู่ไหม (2) ถ้าถูกยกเลิก ยกเลิกด้วยฉบับไหน เพราะอะไร
// (3) มีฉบับใหม่ออกมาใช้แทนแล้วหรือยัง — โดยค้นจากอินเทอร์เน็ต ไม่จำกัดแค่ไฟล์ที่นำเข้าระบบไว้
//
// ═══ ทำไมต้องเป็น endpoint แยก ห้ามรวมกับ law-analyze ═══
// law-analyze ทำ 4 ด่านต่อกันจนชนเพดาน 300 วิเป็นประจำอยู่แล้ว (ดูหัวไฟล์ law-relate.js)
// เอาการค้นสถานะยัดเข้าไปอีก = ทั้งสองงานพังพร้อมกัน และผู้ใช้รอนานขึ้นทุกครั้งที่เพิ่มกฎหมาย
// ทั้งที่การตรวจสถานะเป็นงานที่ทำเป็นรอบ ไม่ใช่งานที่ต้องทำตอนเพิ่มกฎหมาย
//
// ═══ กติกาที่ห้ามผ่อน ═══
// ผลจาก endpoint นี้ **ไม่เขียนลง lg_laws** เด็ดขาด · ลงคิว lg_repeal_checks (status='pending')
// อย่างเดียว แล้วรอเจ้าหน้าที่ยืนยัน (ข้อ 2.7) · ทะเบียนกฎหมายใช้ตรวจ ISO
// ปล่อยให้ AI เขียนทับสถานะการบังคับใช้เองคือการทำให้เอกสารทั้งฉบับเชื่อถือไม่ได้
import { PRIMARY_DOMAINS, parseLoose } from './_lib/law-source.js'
import { matchRepeals } from './_lib/repeal-match.js'
import { sameOrigin, clientIp, rateLimited } from './_lib/guard.js'

const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY
const SUPA_HEADERS = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'content-type': 'application/json' }
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

// ── โดเมนที่ยอมให้ค้น ────────────────────────────────────────────────────────
// ข้อกำหนดระบุ 4 โดเมน: ratchakitcha · law.go.th · krisdika.go.th · labour.go.th
// ตรวจจริงเมื่อ 2026-08-24 ก่อนเขียนไฟล์นี้:
//   ratchakitcha.soc.go.th → หน้าแรกตอบ 403 (Cloudflare) แต่ /documents/<id>.pdf เปิดได้จริง
//                            (ยืนยันซ้ำกับที่ law-source.js บันทึกไว้) — ใช้ได้ ต้องอ้างเป็น .pdf
//   law.go.th              → 200 ใช้ได้
//   labour.go.th           → apex ไม่ resolve · www.labour.go.th ตอบ 200 — ใส่ทั้งคู่
//   krisdika.go.th         → ✕ ไม่เชื่อมต่อทั้ง apex และ www
//                            ตรงกับข้อห้ามที่ law-source.js บันทึกไว้ตั้งแต่ 2026-08-16
//                            (apex ไม่มี A record · www ใช้ SSL self-signed)
//                            **จงใจไม่ใส่** — ใส่แล้วได้แค่ผลค้นที่ช้าลงและลิงก์ที่ผู้ใช้เปิดไม่ได้
// เติม law.moi.go.th (ฉบับรวมของกฤษฎีกา) แทนที่ krisdika ตามที่ระบบใช้อยู่แล้ว
const REPEAL_DOMAINS = ['ratchakitcha.soc.go.th', 'law.go.th', 'labour.go.th', 'www.labour.go.th', 'moi.go.th']
const WEB_SEARCH_TOOL = {
  type: 'web_search_20250305', name: 'web_search', max_uses: 5,
  allowed_domains: REPEAL_DOMAINS,
}
// โดเมนที่ถือว่าเป็น "ประกาศทางการโดยตรง" — ใช้ตัดสินเพดานความมั่นใจ (ข้อ 2.5.4)
const OFFICIAL_HOSTS = ['ratchakitcha.soc.go.th', 'law.go.th']

const LAW_STATUSES = ['in_force', 'amended', 'partially_repealed', 'repealed', 'uncertain']
const CONFIDENCES = ['high', 'medium', 'low']

const SYSTEM = `คุณคือผู้ช่วยตรวจสอบ "สถานะการบังคับใช้" ของกฎหมายไทย สำหรับทะเบียนกฎหมายที่ใช้ตรวจ ISO

งานของคุณคือตอบ 3 ข้อเกี่ยวกับกฎหมายฉบับที่ผู้ใช้ระบุ:
1. ฉบับนี้ยังบังคับใช้อยู่หรือไม่
2. ถ้าถูกยกเลิก/แก้ไข ถูกยกเลิกด้วยฉบับใด ข้อใด มีผลเมื่อใด เพราะเหตุใด
3. มีฉบับใหม่ออกมาใช้แทนแล้วหรือยัง สาระสำคัญเปลี่ยนอย่างไร

═══ กติกาความถูกต้อง — สำคัญกว่าการหาคำตอบให้ได้ ═══
1. ห้ามสรุปว่ากฎหมายถูกยกเลิกโดยไม่มี URL อ้างอิงที่คุณเปิดเจอจริงจากผลค้น
   ไม่พบหลักฐาน = ตอบ law_status "uncertain" พร้อมเหตุผลใน notes · ห้ามเดาเด็ดขาด
   "ไม่เจอข้อมูลการยกเลิก" ไม่ใช่หลักฐานว่ายังบังคับใช้อยู่ และไม่ใช่หลักฐานว่าถูกยกเลิก
2. ทุกข้อมูลใน repealed_by และ replacement_law ต้องมาจากหน้าที่ปรากฏใน sources_consulted เท่านั้น
   ห้ามเติมจากความจำของคุณเอง แม้จะมั่นใจแค่ไหน · จำได้แต่ไม่มีในผลค้น = ไม่มี
3. หลายแหล่งขัดแย้งกัน → confidence "low" และเขียนความขัดแย้งลง notes · ห้ามเลือกข้างเอง
4. พบเพียงข่าว บทความสรุป หรือหน้ารวมลิงก์ ไม่ใช่ประกาศราชกิจจานุเบกษาโดยตรง
   → confidence ไม่เกิน "medium"
5. ระบุ search_date เป็นวันที่ที่ระบบแจ้งให้เสมอ

═══ ข้อควรระวังเฉพาะกฎหมายไทย ═══
· "แก้ไขเพิ่มเติม" ไม่ใช่ "ยกเลิก" — ฉบับที่ถูกแก้ไขยังบังคับใช้อยู่ ให้ใช้ law_status "amended"
· "ให้ยกเลิกความในข้อ N และให้ใช้ความต่อไปนี้แทน" = แก้ไขเฉพาะข้อนั้น → "partially_repealed"
  ไม่ใช่ "repealed" ซึ่งแปลว่ายกเลิกทั้งฉบับ
· ปี พ.ศ. ในชื่อเรื่องคือตัวระบุฉบับที่ชัดที่สุด — ชื่อเหมือนกันแต่คนละปี = คนละฉบับ
  ห้ามเอาข้อมูลการยกเลิกของฉบับปีหนึ่ง มาตอบให้ฉบับอีกปีหนึ่ง
· ที่อยู่ราชกิจจานุเบกษาที่เปิดได้มีรูปแบบเดียว: https://ratchakitcha.soc.go.th/documents/<เลข>.pdf
  รูปแบบเก่า /DATA/PDF/... ใช้ไม่ได้แล้ว (เว็บกันด้วย Cloudflare) เจอแล้วห้ามใช้เป็น source_url

ตอบเป็น JSON เท่านั้น ห้ามมีคำนำ ห้ามมี markdown code fence:
{"law_status":"in_force|amended|partially_repealed|repealed|uncertain",
 "repealed_by":{"law_title":"ชื่อเต็มกฎหมายฉบับที่ยกเลิก","repeal_clause":"ข้อ 1","effective_date":"YYYY-MM-DD","gazette_reference":"เล่ม/ตอน/หน้า/วันที่","source_url":"https://..."},
 "repeal_scope":"ยกเลิกทั้งฉบับ | ยกเลิกเฉพาะข้อ N | ...",
 "repeal_reason":"สรุปเหตุผลและสาระสำคัญของการยกเลิก",
 "replacement_law":{"exists":true,"law_title":"...","effective_date":"YYYY-MM-DD","source_url":"https://...","key_changes":"..."},
 "confidence":"high|medium|low",
 "search_date":"YYYY-MM-DD",
 "sources_consulted":["https://...","https://..."],
 "notes":""}
· law_status เป็น in_force หรือ uncertain → repealed_by เป็น null และ replacement_law.exists เป็น false
· effective_date ใช้รูปแบบ YYYY-MM-DD ปี ค.ศ. (ต่างจากส่วนอื่นของระบบโดยตั้งใจ — ฟิลด์นี้ลงคอลัมน์ date)
  แปลงจาก พ.ศ. ให้เรียบร้อย · ไม่รู้วันที่แน่ชัดให้เป็น null ห้ามเดาวันหรือเดือน`

// ── เรียก Claude พร้อม web_search แล้วเก็บ "หน้าที่ค้นเจอจริง" ไว้ตรวจสอบ ─────
// ต้องเขียนเองแทนที่จะใช้ askClaude() เพราะ askClaude ทิ้ง block ของ web_search ไปหมด
// แต่ด่านกันข้อมูลคลาดเคลื่อน (ข้อ 2.5.2) ต้องเทียบ URL ที่โมเดลอ้าง กับ URL ที่ค้นเจอจริง
export async function askWithSearch(userText, signalTimeoutMs) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), signalTimeoutMs)
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: ctrl.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL, max_tokens: 4000, system: SYSTEM,
        tools: [WEB_SEARCH_TOOL],
        messages: [{ role: 'user', content: userText }],
      }),
    })
    if (!r.ok) return { error: `Anthropic API ตอบ ${r.status}` }
    const data = await r.json()
    const blocks = Array.isArray(data.content) ? data.content : []

    // ⚠ คัดตาม type ของ block เท่านั้น ห้ามอิงลำดับ index (ข้อ 2.2)
    // ลำดับ block เปลี่ยนได้ทุกครั้งที่โมเดลตัดสินใจค้นเพิ่ม — อิง index แล้วจะอ่านผิดช่องเงียบๆ
    const text = blocks.filter(b => b.type === 'text').map(b => b.text).join('').trim()

    // URL ที่ "ค้นเจอจริง" — ดึงจาก block ผลค้นเท่านั้น ไม่เอาจากข้อความที่โมเดลเขียน
    const found = new Set()
    for (const b of blocks) {
      if (b.type !== 'web_search_tool_result') continue
      for (const item of (Array.isArray(b.content) ? b.content : [])) {
        if (item?.url) found.add(String(item.url))
      }
    }
    return { json: parseLoose(text), text, foundUrls: [...found], searches: blocks.filter(b => b.type === 'server_tool_use').length }
  } catch (e) {
    return { error: e?.name === 'AbortError' ? 'ใช้เวลาเกินกำหนดต่อฉบับ' : String(e?.message || e) }
  } finally { clearTimeout(timer) }
}

const host = u => { try { return new URL(u).host.replace(/^www\./, '') } catch { return '' } }
const onAllowedDomain = u => { const h = host(u); return !!h && REPEAL_DOMAINS.some(d => h === d.replace(/^www\./, '') || h.endsWith('.' + d.replace(/^www\./, ''))) }
const isOfficial = u => { const h = host(u); return OFFICIAL_HOSTS.some(d => h === d || h.endsWith('.' + d)) }
const clean = v => { const s = String(v ?? '').trim(); return s || null }
// ยอมรับเฉพาะ YYYY-MM-DD ที่เป็นวันจริง — ค่าอื่นทิ้งเป็น null (คอลัมน์ปลายทางเป็น date)
//
// ⚠ ต้องกันปี พ.ศ. ที่หลุดมาในรูปแบบ ISO ด้วย เช่น "2565-03-01"
// รูปแบบถูกต้องทุกประการและ Date() รับเป็นวันที่ที่ถูกต้องด้วย (ค.ศ. 2565)
// ปล่อยผ่านแล้วทะเบียนจะมีวันที่มีผลยกเลิกเป็นปี 2565 ค.ศ. โดยไม่มีอะไรฟ้อง
// ระบบส่วนอื่นเก็บวันที่เป็น พ.ศ. รูปแบบ วว/ดด/ปปปป โมเดลจึงมีโอกาสสับสนสูงมาก
// กฎหมายไทยที่ทะเบียนนี้ดูแล อยู่ในช่วง ค.ศ. 1900–2100 ทั้งหมด — นอกช่วงนี้คือแปลงปีผิด
const MIN_YEAR = 1900, MAX_YEAR = 2100
const isoDate = v => {
  const s = String(v ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const y = Number(s.slice(0, 4))
  if (y < MIN_YEAR || y > MAX_YEAR) return null
  const d = new Date(s + 'T00:00:00Z')
  return !isNaN(d) && d.toISOString().slice(0, 10) === s ? s : null
}

/**
 * ด่านกันข้อมูลคลาดเคลื่อน — ทำงานหลังโมเดลตอบ ก่อนอะไรก็ตามถูกบันทึก
 * ทุกกฎในข้อ 2.5 ถูกบังคับที่นี่ ไม่ใช่ฝากไว้กับ prompt อย่างเดียว
 * (prompt คือคำขอร้อง · โค้ดคือกฎ — ผลที่ไม่ผ่านต้องถูกลดชั้นเป็น uncertain เสมอ)
 */
export function sanitize(raw, law, searchDate, foundUrls) {
  const notes = []
  let status = LAW_STATUSES.includes(raw?.law_status) ? raw.law_status : 'uncertain'
  let confidence = CONFIDENCES.includes(raw?.confidence) ? raw.confidence : 'low'

  // แหล่งที่อ้างได้ = ต้องอยู่ในโดเมนที่อนุญาต และต้องเป็นหน้าที่ปรากฏในผลค้นจริง
  const cited = Array.isArray(raw?.sources_consulted) ? raw.sources_consulted.map(String) : []
  const foundSet = new Set(foundUrls)
  const sources = cited.filter(u => onAllowedDomain(u) && foundSet.has(u))
  const droppedCited = cited.length - sources.length
  if (droppedCited > 0) notes.push(`ตัดแหล่งอ้างอิงที่ไม่ปรากฏในผลค้นจริงหรืออยู่นอกโดเมนที่กำหนด ${droppedCited} รายการ`)

  const okUrl = u => !!u && onAllowedDomain(u) && foundSet.has(u)

  let repealedBy = null
  if (raw?.repealed_by && typeof raw.repealed_by === 'object') {
    const url = clean(raw.repealed_by.source_url)
    if (okUrl(url)) {
      repealedBy = {
        law_title:         clean(raw.repealed_by.law_title),
        repeal_clause:     clean(raw.repealed_by.repeal_clause),
        effective_date:    isoDate(raw.repealed_by.effective_date),
        gazette_reference: clean(raw.repealed_by.gazette_reference),
        source_url:        url,
      }
    } else if (url) {
      notes.push('ที่อยู่อ้างอิงของฉบับที่ยกเลิกไม่ผ่านการตรวจ (ไม่อยู่ในผลค้นจริง หรืออยู่นอกโดเมนที่กำหนด)')
    }
  }

  let replacement = null
  if (raw?.replacement_law?.exists === true) {
    const url = clean(raw.replacement_law.source_url)
    if (okUrl(url)) {
      replacement = {
        exists: true,
        law_title:      clean(raw.replacement_law.law_title),
        effective_date: isoDate(raw.replacement_law.effective_date),
        source_url:     url,
        key_changes:    clean(raw.replacement_law.key_changes),
      }
    } else {
      notes.push('ระบุว่ามีฉบับใหม่ใช้แทน แต่ที่อยู่อ้างอิงไม่ผ่านการตรวจ — ตัดข้อมูลฉบับแทนออก')
    }
  }

  // (2.5.1) บอกว่ายกเลิก แต่ไม่มีหลักฐานที่เปิดได้ → ลดเป็น uncertain เสมอ ไม่มีข้อยกเว้น
  if ((status === 'repealed' || status === 'partially_repealed') && !repealedBy?.source_url) {
    notes.push('ระบบลดสถานะเป็น "ไม่แน่ชัด" เพราะไม่มีที่อยู่อ้างอิงที่เปิดได้รองรับการยกเลิก')
    status = 'uncertain'
    repealedBy = null
    confidence = 'low'
  }
  // in_force / uncertain ต้องไม่พกข้อมูลการยกเลิกติดมา
  if (status === 'in_force' || status === 'uncertain') repealedBy = null

  // (2.5.4) ไม่มีแหล่งทางการโดยตรงเลย → เพดานความมั่นใจอยู่ที่ medium
  const hasOfficial = sources.some(isOfficial) || (repealedBy?.source_url && isOfficial(repealedBy.source_url))
  if (!hasOfficial && confidence === 'high') {
    confidence = 'medium'
    notes.push('ไม่พบประกาศราชกิจจานุเบกษาโดยตรง — จำกัดความมั่นใจไว้ที่ระดับปานกลาง')
  }
  // ไม่มีแหล่งที่ผ่านด่านเลย = ยืนยันอะไรไม่ได้
  if (!sources.length && !repealedBy?.source_url) {
    if (status !== 'in_force') status = 'uncertain'
    confidence = 'low'
    notes.push('ไม่มีแหล่งอ้างอิงที่ผ่านการตรวจ')
  }

  return {
    law_id: law.id,
    law_status: status,
    repealed_by: repealedBy,
    repeal_scope: status === 'in_force' || status === 'uncertain' ? null : clean(raw?.repeal_scope),
    repeal_reason: status === 'in_force' || status === 'uncertain' ? null : clean(raw?.repeal_reason),
    replacement: replacement,
    confidence,
    search_date: searchDate,
    sources,
    notes: [clean(raw?.notes), ...notes].filter(Boolean).join(' · ') || null,
    model: MODEL,
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

// เพดานฟังก์ชัน 300 วิ (ตั้งใน vercel.json) · กันไว้ 30 วิให้เขียนคิวและส่งผลกลับ
const FN_BUDGET_MS = 270_000
// เกณฑ์ตรวจรับ: ต่อฉบับต้องไม่เกิน 60 วินาที
const PER_LAW_MS = 60_000
// หน่วงระหว่างคำขอ กัน rate limit ฝั่ง Anthropic เมื่อตรวจหลายฉบับพร้อมกัน
const GAP_MS = 1_200
const MAX_LAWS = 20

export default async function handler(req, res) {
  const startedAt = Date.now()
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!sameOrigin(req)) return res.status(403).json({ error: 'คำขอไม่ได้มาจากโดเมนของแอป' })
  if (rateLimited(clientIp(req))) return res.status(429).json({ error: 'เรียกใช้งานถี่เกินไป กรุณารอสักครู่แล้วลองใหม่' })
  if (!SUPA_URL || !SUPA_KEY) return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)' })
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY ใน Vercel' })

  try {
    const ids = [...new Set((req.body?.lawIds || []).map(Number).filter(Number.isFinite))].slice(0, MAX_LAWS)
    if (!ids.length) return res.status(400).json({ error: 'ต้องระบุ lawIds อย่างน้อย 1 รายการ' })

    // อ่านรายละเอียดกฎหมายจากทะเบียนเอง — ไม่เชื่อชื่อ/ปีที่ส่งมาจากฝั่งหน้าจอ
    // ถ้าเชื่อ ผู้เรียกจะป้อนชื่ออะไรก็ได้แล้วให้ผลไปผูกกับ law_id ที่ไม่เกี่ยวกัน
    const lr = await fetch(
      `${SUPA_URL}/rest/v1/lg_laws?select=id,code,name,issue_date,effective_date,ministry,gazette_ref,source_url,law_status&id=in.(${ids.join(',')})`,
      { headers: SUPA_HEADERS })
    if (!lr.ok) return res.status(502).json({ error: 'อ่านทะเบียนกฎหมายไม่สำเร็จ' })
    const laws = await lr.json()
    if (!Array.isArray(laws) || !laws.length) return res.status(404).json({ error: 'ไม่พบกฎหมายตาม lawIds ที่ระบุ' })

    const searchDate = new Date().toISOString().slice(0, 10)
    const results = [], failures = []

    for (let i = 0; i < laws.length; i++) {
      const law = laws[i]
      // เวลาไม่พอสำหรับอีกฉบับ = หยุดแล้วบอกตรงๆ ว่าเหลือกี่ฉบับ
      // ดีกว่าเริ่มแล้วโดนตัดกลางคัน ซึ่งจะเสียทั้งเวลาและโควตาโดยไม่ได้ผลอะไรกลับมา
      const left = FN_BUDGET_MS - (Date.now() - startedAt)
      if (left < PER_LAW_MS) {
        failures.push(...laws.slice(i).map(l => ({ law_id: l.id, code: l.code, error: 'เวลาไม่พอในคำขอนี้ — กรุณาตรวจฉบับที่เหลืออีกครั้ง' })))
        break
      }
      if (i > 0) await sleep(GAP_MS)

      const q = [
        `ตรวจสอบสถานะการบังคับใช้ของกฎหมายฉบับนี้:`,
        `ชื่อเต็ม: ${law.name}`,
        law.ministry ? `หน่วยงาน/กระทรวง: ${law.ministry}` : '',
        law.issue_date ? `วันที่ประกาศตามทะเบียน: ${law.issue_date}` : '',
        law.gazette_ref ? `อ้างอิงราชกิจจานุเบกษา: ${law.gazette_ref}` : '',
        law.source_url ? `ตัวบทที่ทะเบียนเก็บไว้: ${law.source_url}` : '',
        ``,
        `วันที่ค้น (ใส่ลงฟิลด์ search_date): ${searchDate}`,
      ].filter(Boolean).join('\n')

      const out = await askWithSearch(q, Math.min(PER_LAW_MS, left))
      if (out.error || !out.json) {
        failures.push({ law_id: law.id, code: law.code, error: out.error || 'อ่านคำตอบเป็น JSON ไม่ได้' })
        continue
      }
      const rec = sanitize(out.json, law, searchDate, out.foundUrls)

      // จับคู่ชื่อฉบับที่ยกเลิก/ฉบับแทน กับทะเบียนของเราเอง (ตัวเดียวกับที่ AddLawFlow ใช้)
      let registryMatch = null
      try {
        const names = [rec.repealed_by?.law_title, rec.replacement?.law_title].filter(Boolean)
        if (names.length) registryMatch = await matchRepeals(names.map(n => ({ law_name: n })))
      } catch { /* จับคู่ไม่ได้ไม่ใช่เหตุให้ทิ้งผลตรวจทั้งใบ */ }

      results.push({ ...rec, code: law.code, name: law.name, registry_match: registryMatch,
                     searches: out.searches, raw: out.json })
    }

    // ── ลงคิวรอตรวจสอบ · ไม่แตะ lg_laws (ข้อ 2.7) ──
    let queued = 0
    if (results.length) {
      const rows = results.map(r => ({
        law_id: r.law_id, law_status: r.law_status, repealed_by: r.repealed_by,
        repeal_scope: r.repeal_scope, repeal_reason: r.repeal_reason, replacement: r.replacement,
        confidence: r.confidence, search_date: r.search_date, sources: r.sources, notes: r.notes,
        registry_match: r.registry_match, raw: r.raw, model: r.model,
        elapsed_ms: Date.now() - startedAt, status: 'pending',
      }))
      const ir = await fetch(`${SUPA_URL}/rest/v1/lg_repeal_checks`, {
        method: 'POST', headers: { ...SUPA_HEADERS, Prefer: 'return=representation' }, body: JSON.stringify(rows) })
      if (ir.ok) { const saved = await ir.json(); queued = Array.isArray(saved) ? saved.length : 0
        saved.forEach((s, i) => { if (results[i]) results[i].check_id = s.id })
      } else {
        return res.status(500).json({ error: 'บันทึกคิวผลตรวจไม่สำเร็จ: ' + (await ir.text()).slice(0, 300) })
      }
    }

    return res.status(200).json({
      checked: results.length, queued, results, failures,
      searched_domains: REPEAL_DOMAINS,
      // บอกตรงๆ ว่าโดเมนที่ข้อกำหนดระบุไว้ตัวหนึ่งใช้ไม่ได้ (ห้ามเงียบไว้ — ข้อ 2.2)
      domain_notes: 'krisdika.go.th ไม่ถูกใช้ค้น: apex ไม่มี A record และ www ใช้ SSL self-signed (ตรวจซ้ำ 2026-08-24) · ใช้ law.moi.go.th ซึ่งเสิร์ฟฉบับรวมของกฤษฎีกาแทน',
      note: 'ผลทั้งหมดอยู่ในคิวรอเจ้าหน้าที่ยืนยัน ยังไม่ถูกบันทึกลงทะเบียนกฎหมาย',
      elapsed_ms: Date.now() - startedAt,
    })
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) })
  }
}
