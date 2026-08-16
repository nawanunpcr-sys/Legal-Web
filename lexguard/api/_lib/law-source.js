// แหล่งตัวบทกฎหมาย · ส่วนที่ใช้ร่วมกันระหว่าง Skill 3 (osh-law-relate) กับโฟลว์คำถาม (anchor-answer)
//
// แยกออกมาเพราะทั้งสองฝั่งต้องใช้ด่านตรวจโดเมนและตัวดึงไฟล์ PDF ชุดเดียวกัน
// ถ้าปล่อยให้ import ข้ามกันจะเกิดวงกลม (osh-law-relate → anchor-answer → osh-law-relate)
// ซึ่ง ESM รันได้ก็จริงแต่ลำดับการ evaluate ขึ้นกับว่าใครถูกโหลดก่อน — เปราะเกินกว่าจะปล่อยไว้
//
// ที่สำคัญกว่านั้น: ด่านตรวจโดเมนต้องมีชุดเดียวในระบบ ก๊อปไปไว้สองที่แล้วมันจะค่อยๆ ต่างกัน
// แล้ววันหนึ่งฝั่งใดฝั่งหนึ่งจะรับโดเมนที่อีกฝั่งปฏิเสธ โดยไม่มีใครรู้ตัว

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

// ทดสอบจริงแล้ว: krisdika.go.th ค้นเจอแต่ไม่มีเนื้อหามาตราในดัชนี เพราะเก็บตัวบทเป็น PDF
// ผ่าน endpoint librarian/get — ห้ามใส่กลับเข้ามา (ต่างจาก ALLOWED_HOSTS ใน law-analyze.js
// ที่ผู้ใช้วางลิงก์ PDF เองได้ ตรงนี้คือดัชนีที่ web_search ใช้ค้น ซึ่งไม่มีตัวบท)
export const TRUSTED_DOMAINS = [
  // ── SHE ──
  'ratchakitcha.soc.go.th',  // ต้นทางประกาศ path /documents/<id>.pdf สกัดข้อความได้
  'tosh.or.th',              // องค์การมหาชนตาม ม.52 มีตัวบท พ.ร.บ. เต็ม
  'labour.go.th',            // กรมสวัสดิการฯ และสำนักงานพื้นที่
  'dlpw.go.th',              // กรมสวัสดิการและคุ้มครองแรงงาน
  // ── กฎหมายด้านอื่นขององค์กร (หมวด LF) — ไม่มีกลุ่มนี้ Skill 3 จะคืน not_found เสมอ
  //    เพราะ source_url ที่ค้นเจอจะไม่ผ่านด่านตรวจโดเมนในข้อ (ก) ──
  'nbtc.go.th',              // กสทช. — โทรคมนาคม
  'mdes.go.th',              // กระทรวงดิจิทัลฯ — พ.ร.บ.คอมพิวเตอร์ และประกาศใต้กฎหมาย
  'pdpc.or.th',              // PDPA
  'ncsa.or.th',              // ความมั่นคงปลอดภัยไซเบอร์
  'ipthailand.go.th',        // ทรัพย์สินทางปัญญา
  'rd.go.th',                // สรรพากร
  'sso.go.th',               // ประกันสังคม
  'pcd.go.th',               // ควบคุมมลพิษ
  'onep.go.th',              // สผ. — สิ่งแวดล้อม
  'dbd.go.th',               // พัฒนาธุรกิจการค้า
  // ── P17 · กฎหมายอาคาร/ผังเมือง ──
  //    ตัวบทไทยอ้าง "ตามกฎหมายว่าด้วยการควบคุมอาคาร" บ่อยมาก (ห้องน้ำ ทางหนีไฟ แสงสว่าง ระบายอากาศ)
  //    ไม่มีโดเมนกลุ่มนี้ คำตอบจะตกด่านโดเมนทุกครั้งแล้วกลายเป็น "หาไม่เจอ" ทั้งที่ตัวบทเปิดได้
  'dpt.go.th',               // กรมโยธาธิการและผังเมือง — เจ้าของ พ.ร.บ.ควบคุมอาคาร + กฎกระทรวงใต้กฎหมาย
  'bangkok.go.th',           // กทม. — ข้อบัญญัติควบคุมอาคารในเขต กทม.
]

export function hostAllowed(u){
  try{
    const host = new URL(u).hostname.toLowerCase()
    return TRUSTED_DOMAINS.some(d => host === d || host.endsWith('.' + d))
  }catch{ return false }
}

// ── ดึงไฟล์ตัวบทจริงมาอ่าน แทนการเชื่อ snippet จาก web_search ────────────────
// ทดสอบจริง 2026-08-14: ราชกิจจาฯ ยอมให้ดึงเฉพาะไฟล์ .pdf ตรงๆ เท่านั้น
//   https://ratchakitcha.soc.go.th/documents/104277.pdf → 200 (ด้วย UA เดิมของเรา)
//   https://ratchakitcha.soc.go.th/documents/104277     → 403  (หน้า HTML)
//   https://www.ratchakitcha.soc.go.th/DATA/PDF/…       → 403  (path เว็บเวอร์ชันเก่า เลิกใช้แล้ว)
// web_search อ่านได้แค่หัวข้อกับ snippet แตะเนื้อใน PDF ไม่ได้ → ไม่มี source_excerpt
// → โดนด่านตรวจหลักฐานตัดทิ้งทั้งก้อน → ขึ้น "หาตัวบทไม่พบ" ทั้งที่ไฟล์ตัวบทเปิดได้
const PDF_MAX_BYTES = 8_000_000   // กันไฟล์ใหญ่เกินจนคำขอไป Anthropic ล้ม
const PDF_FETCH_TIMEOUT = 45_000

export async function fetchPdfBase64(url){
  if(!hostAllowed(url)) return null                      // กัน SSRF — ต้องอยู่ในโดเมนที่เชื่อถือได้
  if(!/\.pdf($|\?|#)/i.test(url)) return null            // เอาเฉพาะไฟล์ .pdf ตรงๆ (หน้า HTML โดนบล็อกอยู่ดี)
  try{
    const r = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 LexRegistry' },
      signal: AbortSignal.timeout(PDF_FETCH_TIMEOUT),
    })
    if(!r.ok) return null
    if(!(r.headers.get('content-type') || '').toLowerCase().includes('pdf')) return null
    const buf = await r.arrayBuffer()
    if(!buf.byteLength || buf.byteLength > PDF_MAX_BYTES) return null
    return Buffer.from(buf).toString('base64')
  }catch{ return null }   // ดึงไม่ได้ไม่ใช่เหตุให้ล้ม — ถอยไปใช้ผลจาก web_search ตามเดิม
}

// โมเดลบางครั้งห่อด้วย fence หรือมีข้อความนำ — ลอกทีละชั้นจนกว่าจะ parse ได้
export function parseLoose(txt){
  let s = String(txt || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  try{ return JSON.parse(s) }catch{}
  const m = s.match(/\{[\s\S]*\}/)
  if(m){ try{ return JSON.parse(m[0]) }catch{} }
  return null
}

// ── เรียก Claude แล้วคืน JSON ที่ parse ได้ · ห้าม throw ออกข้างนอก ───────────
// ทุกทางล้มเหลว (API ไม่ตอบ / JSON เพี้ยน / เน็ตหลุด) คืน null เหมือนกันหมด
// เพราะฝั่งเรียกจัดการเหมือนกันทั้งหมดอยู่แล้ว: ถอยไปใช้ผลที่ได้มาแล้ว
//
// ห้ามลดโมเดลของ call ที่แตะตัวบทกฎหมาย — คงเป็น MODEL (Sonnet) ทุกจุด
export async function askClaude({ system, content, tools = null, maxTokens = 8000, pdfBase64 = '' }){
  if(!process.env.ANTHROPIC_API_KEY) return null
  const headers = {
    'content-type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  }
  if(pdfBase64) headers['anthropic-beta'] = 'pdfs-2024-09-25'

  const userContent = pdfBase64
    ? [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 } },
       { type: 'text', text: content }]
    : content

  const body = { model: MODEL, max_tokens: maxTokens, system, messages: [{ role: 'user', content: userContent }] }
  if(tools) body.tools = tools

  try{
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers, body: JSON.stringify(body) })
    if(!r.ok) return null
    const data = await r.json()
    // เอาเฉพาะ block ที่เป็นข้อความ — ข้าม block ของ web_search (server_tool_use / web_search_tool_result)
    const txt = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim()
    return parseLoose(txt)
  }catch{ return null }
}

export const WEB_SEARCH_TOOL = {
  type: 'web_search_20250305', name: 'web_search', max_uses: 5, allowed_domains: TRUSTED_DOMAINS,
}
