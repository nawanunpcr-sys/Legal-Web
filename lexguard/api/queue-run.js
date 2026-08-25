// Vercel serverless function — ดึงงานออกจากคิวมาประมวลผลภายในงบเวลาของคำขอเดียว
//
// ═══ ทำไมต้องมี endpoint นี้ (กติกาข้อ 6) ═══
// "งานที่ทำเป็นชุดหลายฉบับ ห้ามวนยิงจากฝั่งหน้าจอ" — หน้าจอจึงยิงมาที่นี่ครั้งเดียวต่อชุด
// แล้วฝั่ง server วนทำทีละรายการเอง เว้นจังหวะกัน rate limit ของ Anthropic
// และหยุดเองก่อนชนเพดาน 300 วิ พร้อมบอกว่าเหลือค้างกี่งาน ให้หน้าจอกดต่อได้
//
// ระบบยังไม่มี Vercel Cron — ถ้าภายหลังต้องการให้คิวเดินเองตามเวลา
// เพิ่ม "crons" ใน vercel.json ชี้มาที่ /api/queue-run โดยไม่ต้องแก้ไฟล์นี้เลย
// (แต่ต้องเพิ่มการตรวจ CRON_SECRET ก่อน เพราะ cron ไม่มี Origin ให้ตรวจ)
//
// ═══ ผลลัพธ์ยังเป็นข้อเสนอเสมอ ═══
// endpoint นี้ไม่ตัดสินอะไรเอง มันเพียงเรียก handler ของงานแต่ละประเภท
// ซึ่งทุกตัวเขียนลง "ที่พักของข้อเสนอ" ไม่ใช่ทะเบียนจริง
import { sameOrigin, clientIp, rateLimited, tooManyRequests } from './_lib/guard.js'
import { processQueue, queueCounts, resetProcessing } from './_lib/queue.js'
import { screenOneLaw, loadProfile } from './law-screen.js'

const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY

// ทะเบียนประเภทงาน — เพิ่มงานใหม่ในขั้นถัดๆ ไปโดยเติมคีย์ที่นี่
// prepare() ทำครั้งเดียวต่อคำขอ (เช่น โหลดโปรไฟล์) แล้วส่งต่อให้ทุกรายการในชุด
const JOBS = {
  law_screen: {
    label: 'คัดกรองความเกี่ยวข้อง',
    perItemMs: 60_000,
    async prepare() {
      const profile = await loadProfile()
      if (!profile) { const e = new Error('ยังไม่ได้ตั้งโปรไฟล์บริบทองค์กร — ตั้งค่าก่อนจึงจะประมวลผลคิวได้'); e.code = 'no_profile'; throw e }
      return { profile }
    },
    async run(item, ctx) {
      const lawId = Number(String(item.ref).replace(/^law:/, ''))
      if (!Number.isFinite(lawId)) throw new Error('รหัสอ้างอิงในคิวไม่ถูกต้อง: ' + item.ref)
      const out = await screenOneLaw(lawId, ctx.profile)
      return { note: `${out.relevance.verdict} (${out.relevance.confidence})` }
    },
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if (!sameOrigin(req)) return res.status(403).json({ error: 'คำขอไม่ได้มาจากโดเมนของแอป' })
  // ใช้โควตาชั้น queue — งานเบื้องหลังไม่ไปเบียดโควตาของปุ่มที่คนกดเอง (guard.js)
  const wait = rateLimited(clientIp(req), 'queue'); if (wait) return tooManyRequests(res, wait)
  if (!SUPA_URL || !SUPA_KEY) return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า Supabase' })
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY ใน Vercel' })

  const kind = String(req.body?.kind || '')
  const job = JOBS[kind]
  if (!job) return res.status(400).json({ error: `ไม่รู้จักประเภทงาน "${kind}"` })

  try {
    let before = await queueCounts(kind)
    // ไม่มีงานค้าง = ตอบทันที ไม่ต้องเสียเวลาเตรียมอะไร
    if (!before.pending && !before.processing) {
      return res.status(200).json({ kind, done: 0, failed: 0, remaining: 0, stopped: 'คิวว่าง', counts: before })
    }
    // ── กู้งานที่ค้างสถานะ processing ──────────────────────────────────────
    // Vercel ตัดฟังก์ชันที่ 300 วิแบบไม่ให้โอกาสเก็บกวาด งานที่กำลังทำอยู่ตอนนั้น
    // จึงค้างเป็น processing ตลอดไป · ผลคือปุ่มบนหน้าจอขึ้นตัวเลขค้าง แต่กดแล้ว
    // ระบบตอบว่า "คิวว่าง" เพราะไม่มีแถว pending เหลือ — ผู้ใช้กู้เองไม่ได้เลย
    // ตรงนี้เป็นจุดเดียวที่ปลอดภัยจะรีเซ็ต เพราะเรากำลังจะเริ่มรอบใหม่อยู่แล้ว
    // และไม่มีรอบอื่นทำงานพร้อมกัน (ปุ่มเดียว กดทีละครั้ง)
    let recovered = 0
    if (before.processing > 0 && before.pending === 0) {
      recovered = await resetProcessing(kind)
      before = await queueCounts(kind)
    }
    const ctx = job.prepare ? await job.prepare() : {}
    const out = await processQueue(kind, item => job.run(item, ctx), {
      budgetMs: 270_000, perItemMs: job.perItemMs || 60_000, gapMs: 1_200,
      agent: kind, max: Number(req.body?.max) || 50,
    })
    return res.status(200).json({ kind, label: job.label, recovered, ...out })
  } catch (e) {
    const status = e?.code === 'no_profile' ? 428 : 500
    return res.status(status).json({ error: String(e?.message || e), code: e?.code || undefined })
  }
}
