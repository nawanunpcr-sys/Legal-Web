// ── การป้องกันขั้นต่ำของ endpoint ที่เรียก AI — ใช้ร่วมกันทุก endpoint ──
//
// ⚠ กติกาประจำระบบ: endpoint ใหม่ทุกตัวที่เรียก AI ต้องมีบรรทัดของตัวเองใน vercel.json
//   พร้อม maxDuration ไม่งั้นจะถูกตัดที่ค่าเริ่มต้น (10 วิ) ทั้งที่งานใช้เวลาเป็นนาที
//   vercel.json เป็น JSON เข้มงวด ใส่คอมเมนต์ไม่ได้ กติกาข้อนี้จึงบันทึกไว้ที่นี่แทน
//   — ไฟล์นี้ถูก import โดยทุก endpoint ที่เรียก AI อยู่แล้ว จึงเป็นที่ที่คนอ่านเจอแน่นอน
//
// TODO: การป้องกันจริงต้องใช้ Supabase Auth JWT เมื่อเลิกโหมด demo
//       (rate-limit ในหน่วยความจำใช้ไม่ได้ข้าม serverless instance — เป็นเพียงเบรกชั่วคราว)

// ── (ก) ตรวจ Origin/Referer ว่ามาจากโดเมนของแอปเอง (อ่านจาก env ALLOWED_ORIGIN) ──
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

// ── (ข) จำกัดความถี่ — แยกโควตา 2 ชั้น ────────────────────────────────────────
// เดิมงานที่ผู้ใช้กดเองกับงานเบื้องหลังใช้โควตาก้อนเดียวกัน ผลคือพอสั่งงานเป็นชุด
// (คัดกรองทั้งทะเบียน) โควตาหมดภายในไม่กี่วินาที แล้วผู้ใช้ที่กดปุ่มปกติอยู่ก็โดนปฏิเสธไปด้วย
//   user  = ปุ่มที่คนกดเอง — โควตาเดิม 10 ครั้ง/นาที/IP (ไม่เปลี่ยน เพื่อไม่ให้พฤติกรรมเดิมเพี้ยน)
//   queue = งานคิวเบื้องหลัง — โควตาของตัวเอง ไม่ไปเบียดโควตาของคน
export const RATE_LIMITS = {
  user:  { max: 10, windowMs: 60_000 },
  queue: { max: 60, windowMs: 60_000 },
}
const buckets = new Map()   // key = "<kind>|<ip>" → [timestamp, …]

export function clientIp(req){
  return String(req.headers['x-forwarded-for']||'').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
}

// คืน 0 = ผ่าน · คืนจำนวน "วินาทีที่ต้องรอ" (>0) = ถูกจำกัด
// ค่าที่คืนเป็นตัวเลขเสมอ จึงยังใช้กับโค้ดเดิมแบบ `if (rateLimited(ip))` ได้เหมือนเดิมทุกประการ
export function rateLimited(ip, kind = 'user'){
  const cfg = RATE_LIMITS[kind] || RATE_LIMITS.user
  const key = kind + '|' + ip
  const now = Date.now()
  const hits = (buckets.get(key) || []).filter(t => now - t < cfg.windowMs)
  if(hits.length >= cfg.max){
    buckets.set(key, hits)
    // hits[0] คือครั้งที่เก่าที่สุดที่ยังนับอยู่ — พอมันหลุดหน้าต่าง ช่องว่างจะเปิด 1 ช่อง
    return Math.max(1, Math.ceil((cfg.windowMs - (now - hits[0])) / 1000))
  }
  hits.push(now); buckets.set(key, hits)
  if(buckets.size > 500) sweep(now)   // กัน Map โตไม่จำกัดใน instance ที่อยู่ยาว
  return 0
}

function sweep(now){
  for(const [k, list] of buckets){
    const alive = list.filter(t => now - t < 60_000)
    if(alive.length) buckets.set(k, alive); else buckets.delete(k)
  }
}

// ตอบ 429 พร้อมบอกจำนวนวินาทีที่ต้องรอ — ให้หน้าจอขึ้นว่า "ขอเวลาอีก N วินาที"
// ได้จริง แทนที่จะขึ้น error เฉยๆ แล้วผู้ใช้กดซ้ำรัวจนโดนจำกัดหนักกว่าเดิม
export function tooManyRequests(res, waitSec){
  const wait = Number(waitSec) || 1
  res.setHeader('Retry-After', String(wait))
  return res.status(429).json({
    error: `เรียกใช้งานถี่เกินไป — ขอเวลาอีก ${wait} วินาทีแล้วลองใหม่`,
    retry_after: wait,
  })
}
