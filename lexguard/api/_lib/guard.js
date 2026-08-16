// ── การป้องกันขั้นต่ำของ endpoint ที่เรียก AI — ใช้ร่วมกันทั้ง law-analyze และ law-relate ──
// แยกออกมาเพื่อไม่ให้ต้องคัดลอกโค้ดไปสองที่ (แก้ที่เดียวได้ผลทั้งคู่)
// rateMap เป็นตัวเดียวกันทั้งสอง endpoint โดยตั้งใจ — การสรุป 1 ครั้งยิง 2 คำขอ
// จึงควรนับรวมกัน ไม่ใช่ให้แต่ละ endpoint มีโควตาของตัวเอง

// ── การป้องกันขั้นต่ำ 2 ชั้น ──
// TODO: การป้องกันจริงต้องใช้ Supabase Auth JWT เมื่อเลิกโหมด demo
//       (rate-limit ในหน่วยความจำใช้ไม่ได้ข้าม serverless instance — เป็นเพียงเบรกชั่วคราว)
// (ก) ตรวจ Origin/Referer ว่ามาจากโดเมนของแอปเอง (อ่านจาก env ALLOWED_ORIGIN)
export function sameOrigin(req){
  const origin = req.headers.origin || req.headers.referer || ''
  if(!origin) return false
  // (1) ตรงกับโดเมนที่ตั้งใน env ALLOWED_ORIGIN (รองรับหลายค่า คั่นด้วย comma)
  const allowed = (process.env.ALLOWED_ORIGIN||'').split(',').map(s=>s.trim()).filter(Boolean)
  if(allowed.some(a => origin.startsWith(a))) return true
  // (2) same-origin จริง: โฮสต์ของ origin ตรงกับโฮสต์ที่เสิร์ฟคำขอ
  //     → ใช้ได้ทุกโดเมน *.vercel.app ของแอปเองโดยไม่ต้องตั้ง env (กันเรียกข้ามโดเมนอยู่)
  try{ return new URL(origin).host === req.headers.host }catch{ return false }
}
// (ข) จำกัดความถี่แบบง่ายในหน่วยความจำ: ไม่เกิน 10 ครั้ง/นาที/IP
const RATE_LIMIT = 10, RATE_WINDOW = 60_000
const rateMap = new Map()
export function clientIp(req){ return String(req.headers['x-forwarded-for']||'').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown' }
export function rateLimited(ip){
  const now = Date.now()
  const hits = (rateMap.get(ip)||[]).filter(t => now-t < RATE_WINDOW)
  hits.push(now); rateMap.set(ip, hits)
  return hits.length > RATE_LIMIT
}

