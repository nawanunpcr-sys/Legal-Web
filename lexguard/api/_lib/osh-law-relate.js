// Skill 3 · osh-law-relate — ดึงตัวบทของ "กฎหมายที่ถูกอ้างถึง" มารวมในผลสรุป
//
// ปัญหาที่แก้: กฎกระทรวงความร้อน แสงสว่าง เสียง 2559 ออกตามความใน พ.ร.บ.ความปลอดภัยฯ 2554
// แต่ไม่เขียนซ้ำว่าผู้มาตรวจวัดต้องขึ้นทะเบียนกับสำนักความปลอดภัยแรงงาน เพราะเรื่องนั้นอยู่ใน
// มาตรา 9 ของ พ.ร.บ.แม่ · จป. ที่อ่านเฉพาะกฎกระทรวงจึงตกข้อกำหนดโดยไม่รู้ตัว
//
// โฟลเดอร์ _lib มีขีดล่างนำหน้า → Vercel ไม่มองเป็น endpoint (เป็น helper อย่างเดียว)

const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

// ทดสอบจริงแล้ว: krisdika.go.th ค้นเจอแต่ไม่มีเนื้อหามาตราในดัชนี เพราะเก็บตัวบทเป็น PDF
// ผ่าน endpoint librarian/get — ห้ามใส่กลับเข้ามา (ต่างจาก ALLOWED_HOSTS ใน law-analyze.js
// ที่ผู้ใช้วางลิงก์ PDF เองได้ ตรงนี้คือดัชนีที่ web_search ใช้ค้น ซึ่งไม่มีตัวบท)
const TRUSTED_DOMAINS = [
  // ── SHE ──
  'ratchakitcha.soc.go.th',  // ต้นทางประกาศ path /DATA/PDF/ สกัดข้อความได้
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
]
const CACHE_DAYS = 180
const MAX_PER_WAVE = 12      // จำนวนที่ยิงขนานกันต่อชั้น — เท่ากับเพดานรวม เพราะมีชั้นเดียวแล้ว
                             // (maxDuration ของ api/law-analyze.js = 300 วินาที รองรับได้)
const MAX_TOTAL_LOOKUPS = 12 // เพดานรวมต่อการสรุป 1 ครั้ง
// ดึงเฉพาะกฎหมายที่ "ตัวบทที่ผู้ใช้วางให้สรุป" อ้างถึงโดยตรงเท่านั้น ไม่ตามต่อไปชั้นลึกกว่านั้น
// เดิมตามลึก 2 ชั้น (แม่ → ลูก → หลาน) ทำให้ลากกฎหมายที่ฉบับหลักไม่ได้อ้างถึงเข้ามาเต็มไปหมด
// ส่วนใหญ่ค้นตัวบทไม่เจอ กลายเป็นรายการ "หาตัวบทไม่พบ" ที่ผู้ใช้ไม่ได้ขอตั้งแต่แรก
const MAX_DEPTH = 1
const MAX_REQ_PER_LAW = 15   // กัน พ.ร.บ. ใหญ่ดึงมา 70 มาตราจนตารางใช้งานไม่ได้

const SUPA_HEADERS = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'content-type': 'application/json' }

const SYSTEM = `คุณคือผู้ช่วยด้านกฎหมายขององค์กร (compliance) ทำหน้าที่ค้นหาและสรุปตัวบทกฎหมายที่ถูกอ้างถึง
ครอบคลุมทุกด้าน: ความปลอดภัย แรงงาน โทรคมนาคม ข้อมูลส่วนบุคคล ไซเบอร์ ทรัพย์สินทางปัญญา ภาษี สิ่งแวดล้อม
บริบท: ผู้ใช้กำลังอ่านกฎหมายฉบับหนึ่งซึ่งอ้างถึงอีกฉบับ ทำให้อ่านฉบับที่ถืออยู่แล้วไม่รู้ว่าต้องทำอะไรครบ

หลักการที่ห้ามละเมิด:
1. ใช้ข้อมูลจากผลค้นหาเท่านั้น ห้ามเติมจากความจำ ค้นไม่เจอให้ตอบ not_found ตรงๆ
   การเดาเนื้อหากฎหมายอันตรายกว่าการบอกว่าไม่เจอ
   ห้ามเอาเนื้อหา ตัวเลข หรือโครงสร้างตารางจากกฎหมาย "ฉบับอื่น" มาใช้แทนฉบับที่กำลังค้น
   แม้จะเป็นเรื่องเดียวกัน เป็นฉบับก่อนแก้ไข หรือเป็นฉบับที่ถูกยกเลิกไปแล้วก็ตาม
   เจอแค่บางส่วน ให้ใส่เฉพาะส่วนที่เจอจริง ตั้ง confidence เป็น low แล้วเขียนใน note ว่าส่วนไหนยังไม่ได้ยืนยัน

2. เอาเฉพาะข้อที่ "บริษัทผู้อ่าน" ต้องทำเอง — บริษัทผู้อ่านคือผู้ที่ต้องปฏิบัติตามกฎหมายฉบับหลักที่อ้างถึงกฎหมายนี้
   ถ้าหน้าที่ในข้อนั้นตกอยู่กับคนอื่น ให้ตัดทิ้งทั้งข้อ แม้จะเกี่ยวข้องกันก็ตาม เช่น
   - หน้าที่ของผู้ให้บริการ ผู้รับจ้าง หรือผู้ขอใบอนุญาต ที่บริษัทผู้อ่านเป็นแค่ผู้ว่าจ้าง
     (เช่น "นิติบุคคลที่ประสงค์จะให้บริการตรวจวัดต้องขอใบอนุญาต" — นี่เป็นหน้าที่ของผู้รับจ้าง ไม่ใช่ของบริษัทผู้อ่าน)
   - อำนาจหน้าที่ของหน่วยงานกำกับดูแลหรือพนักงานเจ้าหน้าที่ (อธิบดี พนักงานตรวจ เลขาธิการ กสทช. คณะกรรมการ)
   - บทนิยาม การแต่งตั้งคณะกรรมการ เรื่องกองทุน บทเฉพาะกาล
   - บทที่บอกเพียงว่า "รายละเอียดให้เป็นไปตามที่กฎกระทรวงกำหนด" โดยไม่ได้สั่งให้บริษัททำอะไร
   ห้ามแปลงประธานให้ดูเหมือนเป็นหน้าที่ของบริษัทผู้อ่าน ถ้าตัวบทระบุผู้มีหน้าที่เป็นคนอื่น
   ทดสอบทุกข้อก่อนใส่: ถ้าบริษัทผู้อ่านลงมือทำตามข้อนี้เองไม่ได้ หรือทำแล้วไม่มีหลักฐานให้ตรวจได้ ให้ตัดทิ้ง
   ห้ามเขียนหน้าที่ปลอมแบบ "บริษัทต้องทราบว่า..." หรือ "บริษัทต้องรับรู้ว่า..." เพื่อให้ข้อนั้นผ่าน

3. ถ้าตัวบทเขียนว่า "ตามที่อธิบดีกำหนด" "ตามที่รัฐมนตรีประกาศกำหนด" หรือ "ตามหลักเกณฑ์ที่กำหนดในกฎกระทรวง"
   ให้ค้นหาประกาศหรือกฎกระทรวงฉบับนั้นต่อ แล้วเอา "ตัวเลขและเกณฑ์จริง" มาเขียนลงในข้อนั้นเลย
   ห้ามปล่อยให้ผู้อ่านเห็นแค่ "ตามที่อธิบดีกำหนด" เพราะจะยังไม่รู้ว่าต้องทำเท่าไหร่
   ค้นตัวเลขจริงไม่เจอ ให้เขียนตรงๆ ว่ายังไม่พบตัวเลข พร้อมระบุชื่อประกาศที่ต้องไปเปิด และตั้ง confidence เป็น low

4. เกิน ${MAX_REQ_PER_LAW} ข้อ เลือกเฉพาะที่เกี่ยวกับเรื่องที่ฉบับหลักอ้างถึงมากที่สุด

5. ถ้ากฎหมายฉบับนี้อ้างถึงกฎหมายฉบับอื่นต่อไปอีก ซึ่งต้องรู้เนื้อหาด้วยจึงจะปฏิบัติได้ครบ
   ให้ใส่ไว้ในฟิลด์ related_laws เพื่อให้ระบบตามไปดึงต่อ (เช่น มาตรา 9 บอกให้ไปดูคุณสมบัติผู้ขึ้นทะเบียน
   ในกฎกระทรวงการขึ้นทะเบียนฯ ก็ให้ใส่กฎกระทรวงฉบับนั้นไว้)
   ใส่เฉพาะที่ตัวบทอ้างถึงจริง ห้ามใส่กฎหมายที่แค่เกี่ยวข้องกว้างๆ ในหัวข้อเดียวกัน

การเขียนข้อความ (สำคัญมาก — คนอ่านคือ จป. และพนักงานทั่วไป ไม่ใช่นักกฎหมาย):
- เขียนเป็นภาษาที่คนทั่วไปอ่านรอบเดียวเข้าใจ ห้ามคัดลอกสำนวนกฎหมายมาตรงๆ ให้เรียบเรียงใหม่ทั้งประโยค
- บอกให้ชัดว่า "ต้องทำอะไร" ขึ้นต้นประโยคด้วยสิ่งที่ต้องทำ อ่านจบในตัว ไม่ต้องเปิดกฎหมายฉบับอื่นประกอบ
- ห้ามใส่เลขมาตราในตัวข้อความ เก็บไว้ในฟิลด์ section_ref อย่างเดียว
- ใช้ "บริษัท" เป็นประธาน แทน "ผู้ประกอบกิจการ" "นายจ้าง" "ผู้รับใบอนุญาต" หรือ "ผู้ควบคุมข้อมูลส่วนบุคคล"
  (ใช้ได้เฉพาะเมื่อบริษัทผู้อ่านเป็นผู้มีหน้าที่จริงตามข้อ 2 เท่านั้น)
- ห้ามใช้คำเหล่านี้ ใช้คำในวงเล็บแทน: ดำเนินการ (ทำ) · จัดให้มี (ต้องมี) · ทั้งนี้ (ตัดทิ้ง)
  ดังกล่าว (เขียนชื่อสิ่งนั้นซ้ำ) · ตามที่กำหนด (ระบุว่าคืออะไร) · โดยอนุโลม (ให้ใช้แบบเดียวกัน) · มิให้ (ห้าม)
  นิติบุคคล (บริษัท) · พึง (ควร) · แห่ง/ซึ่ง/อัน (ตัดทิ้งหรือเขียนใหม่) · โดยมิชักช้า (ทันที)
  อาทิ (เช่น) · หากแต่ (แต่) · เพื่อการนี้ (ตัดทิ้ง)
- ตัวเลขใช้เลขอารบิกพร้อมหน่วยเต็ม เช่น "ปีละ 1 ครั้ง" "ปรับสูงสุด 400,000 บาท" "ไม่เกิน 34 องศาเซลเซียส"
  ห้ามเขียนว่า "ตามระยะเวลาที่กฎหมายกำหนด" หรือ "ปรับไม่เกินสี่แสนบาท"

ตอบเป็น JSON เท่านั้น ห้ามมี markdown fence:
{"status":"resolved"|"not_found","law_full_name":"","source_url":"","resolved_text":"สรุปสาระของส่วนที่ถูกอ้างถึง ไม่เกิน 500 ตัวอักษร","confidence":"high"|"medium"|"low","note":"ข้อสังเกต เช่น พบเฉพาะฉบับก่อนแก้ไข","requirements":[{"section_ref":"มาตรา 9","req_text":"ข้อความที่ต้องทำ อ่านจบในตัว","action_required":"","frequency":"","evidence":"","penalty":"ระบุตัวเลขจริง หรือค่าว่าง","source_excerpt":"ข้อความจากตัวบทจริง ไม่เกิน 300 ตัวอักษร"}],"related_laws":[{"law_name":"","clause":"มาตรา X หรือ null ถ้าอ้างทั้งฉบับ","why_needed":"ทำไมต้องรู้เนื้อหานี้ถึงจะปฏิบัติตามได้","needs_lookup":true}]}`

// ── ฟังก์ชัน 1 · ทำ key ให้ชนกันได้จริง ──────────────────────────────────────
// "พ.ร.บ. ความปลอดภัยฯ พ.ศ.๒๕๕๔" กับ "พระราชบัญญัติความปลอดภัย พ.ศ. 2554"
// ต้องได้ key เดียวกัน ไม่งั้น cache ไม่มีวันชน และ lg_law_refs จะบวมด้วยแถวซ้ำที่สะกดต่างกัน
const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙'
function arabic(s){ return String(s||'').replace(/[๐-๙]/g, d => String(THAI_DIGITS.indexOf(d))) }

export function normalizeRefKey(lawName, clause){
  let name = arabic(lawName)
    .replace(/พระราชบัญญัติ/g, 'พ.ร.บ.')
    .replace(/พระราชกำหนด/g, 'พ.ร.ก.')
    .replace(/พระราชกฤษฎีกา/g, 'พ.ร.ฎ.')
    .replace(/ฯลฯ/g, '')
    .replace(/ฯ/g, '')
    // รวบรูปแบบตัวย่อ: "พ. ร. บ. ความปลอดภัย" และ "พ.ร.บ.ความปลอดภัย" → เหมือนกัน
    .replace(/พ\s*\.\s*ร\s*\.\s*บ\s*\.\s*/g, 'พ.ร.บ.')
    .replace(/พ\s*\.\s*ร\s*\.\s*ก\s*\.\s*/g, 'พ.ร.ก.')
    .replace(/พ\s*\.\s*ร\s*\.\s*ฎ\s*\.\s*/g, 'พ.ร.ฎ.')
    // รวบรูปแบบ พ.ศ. — "พ.ศ. 2554" / "พ.ศ.2554" / "พ. ศ. 2554" → "พ.ศ.2554"
    .replace(/พ\s*\.\s*ศ\s*\.\s*/g, 'พ.ศ.')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

  const cl = arabic(clause).replace(/\s+/g, '').trim() || 'ทั้งฉบับ'
  return `${name}|${cl}`
}

// ── ตัวช่วย ──────────────────────────────────────────────────────────────────
function hostAllowed(u){
  try{
    const host = new URL(u).hostname.toLowerCase()
    return TRUSTED_DOMAINS.some(d => host === d || host.endsWith('.' + d))
  }catch{ return false }
}

// ── ดึงไฟล์ตัวบทจริงมาอ่าน แทนการเชื่อ snippet จาก web_search ────────────────
// ทดสอบจริง 2026-08-14: ราชกิจจาฯ ยอมให้ดึงเฉพาะไฟล์ .pdf ตรงๆ เท่านั้น
//   https://ratchakitcha.soc.go.th/documents/104277.pdf → 200 (ด้วย UA เดิมของเรา)
//   https://ratchakitcha.soc.go.th/documents/104277     → 403  (หน้า HTML)
//   https://ratchakitcha.soc.go.th/                     → 403  (หน้าแรกก็โดน)
//   https://www.ratchakitcha.soc.go.th/DATA/PDF/…       → 403  (path เว็บเวอร์ชันเก่า เลิกใช้แล้ว)
// web_search อ่านได้แค่หัวข้อกับ snippet แตะเนื้อใน PDF ไม่ได้ → ไม่มี source_excerpt
// → โดนด่านตรวจ (ข) ตัดทิ้งทั้งก้อน → ขึ้น "หาตัวบทไม่พบ" ทั้งที่ไฟล์ตัวบทเปิดได้
const PDF_MAX_BYTES = 8_000_000   // กันไฟล์ใหญ่เกินจนคำขอไป Anthropic ล้ม
const PDF_FETCH_TIMEOUT = 45_000

async function fetchPdfBase64(url){
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

// อ่านตัวบทจากไฟล์ PDF จริง · ใช้ SYSTEM ตัวเดียวกัน สคีมา JSON เดิมทุกฟิลด์
async function readLawFromPdf(ref, url, b64){
  try{
    const ask = [
      `กฎหมายที่ต้องอ่าน: ${ref.lawName}`,
      ref.clause ? `ส่วนที่ถูกอ้างถึง: ${ref.clause}` : 'ถูกอ้างถึงทั้งฉบับ',
      ref.parent_law ? `ถูกอ้างถึงจาก: ${ref.parent_law}` : '',
      ref.why_needed ? `เหตุผลที่ต้องรู้เนื้อหานี้: ${ref.why_needed}` : '',
      '',
      `ไฟล์แนบคือตัวบทจริงจาก ${url}`,
      'อ่านจากไฟล์นี้เท่านั้น ห้ามเติมจากความจำ · source_excerpt ต้องคัดมาจากข้อความในไฟล์จริง',
      'ถ้าไฟล์นี้ไม่ใช่กฎหมายฉบับที่ระบุข้างต้น ให้ตอบ status เป็น not_found',
      'สรุปเฉพาะข้อที่บริษัทต้องปฏิบัติ ตามรูปแบบ JSON ที่กำหนด',
    ].filter(Boolean).join('\n')

    const ar = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01', 'anthropic-beta': 'pdfs-2024-09-25' },
      body: JSON.stringify({
        model: MODEL, max_tokens: 8000, system: SYSTEM,
        messages: [{ role: 'user', content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } },
          { type: 'text', text: ask },
        ] }],
      })
    })
    if(!ar.ok) return null
    const data = await ar.json()
    const txt = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim()
    return parseLoose(txt)
  }catch{ return null }
}

// โมเดลบางครั้งห่อด้วย fence หรือมีข้อความนำ — ลอกทีละชั้นจนกว่าจะ parse ได้
function parseLoose(txt){
  let s = String(txt || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  try{ return JSON.parse(s) }catch{}
  const m = s.match(/\{[\s\S]*\}/)
  if(m){ try{ return JSON.parse(m[0]) }catch{} }
  return null
}

// ── ฟังก์ชัน 2 · ค้นตัวบทของฉบับที่ถูกอ้าง (อ่าน cache ก่อนเสมอ) ─────────────
// ห้าม throw ออกข้างนอกเด็ดขาด — ทุก error คืน status:'not_found' พร้อม note
export async function fetchRelatedLaw(ref){
  const lawName = (ref?.law_name || '').trim()
  const clause = (ref?.clause || '').trim()
  const refKey = normalizeRefKey(lawName, clause)
  const base = { ref_key: refKey, law_name: lawName, clause: clause || 'ทั้งฉบับ', requirements: [] }

  if(!lawName) return { ...base, status: 'not_found', note: 'ไม่มีชื่อกฎหมาย' }

  // 1) cache — เจอ + resolved + ยังไม่หมดอายุ → คืนเลย ไม่ยิง API
  try{
    if(SUPA_URL && SUPA_KEY){
      const r = await fetch(`${SUPA_URL}/rest/v1/lg_law_refs?ref_key=eq.${encodeURIComponent(refKey)}&select=*&limit=1`,
        { headers: SUPA_HEADERS })
      if(r.ok){
        const rows = await r.json()
        const hit = Array.isArray(rows) ? rows[0] : null
        if(hit && hit.resolve_status === 'resolved'){
          const age = (Date.now() - new Date(hit.resolved_at).getTime()) / 86400000
          if(age <= CACHE_DAYS){
            return { ...base, status: 'resolved', from_cache: true,
              law_full_name: hit.ref_law_name, source_url: hit.source_url,
              resolved_text: hit.resolved_text, confidence: hit.confidence, note: hit.note,
              requirements: Array.isArray(hit.requirements) ? hit.requirements : [],
              related_laws: Array.isArray(hit.related_laws) ? hit.related_laws : [] }
          }
        }
      }
    }
  }catch(e){ /* cache อ่านไม่ได้ไม่ใช่เหตุให้ล้ม — ไปค้นสดต่อ */ }

  if(!process.env.ANTHROPIC_API_KEY) return { ...base, status: 'not_found', note: 'ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY' }

  // 2) ค้นสดด้วย web_search จำกัดเฉพาะโดเมนที่เชื่อถือได้
  let out = null
  try{
    const ask = [
      `กฎหมายที่ต้องค้น: ${lawName}`,
      clause ? `ส่วนที่ถูกอ้างถึง: ${clause}` : 'ถูกอ้างถึงทั้งฉบับ',
      ref?.parent_law ? `ถูกอ้างถึงจาก: ${ref.parent_law}` : '',
      ref?.why_needed ? `เหตุผลที่ต้องรู้เนื้อหานี้: ${ref.why_needed}` : '',
      '',
      'ค้นตัวบทจริงจากเว็บที่กำหนด แล้วสรุปเฉพาะข้อที่บริษัทต้องปฏิบัติ ตามรูปแบบ JSON ที่กำหนด'
    ].filter(Boolean).join('\n')

    const ar = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL, max_tokens: 8000, system: SYSTEM,
        messages: [{ role: 'user', content: ask }],
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5, allowed_domains: TRUSTED_DOMAINS }]
      })
    })
    if(!ar.ok) return { ...base, status: 'not_found', note: 'เรียก Claude API ไม่สำเร็จ: ' + (await ar.text()).slice(0, 200) }
    const data = await ar.json()
    // เอาเฉพาะ block ที่เป็นข้อความ — ข้าม block ของ web_search (server_tool_use / web_search_tool_result)
    const txt = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim()
    out = parseLoose(txt)
    if(!out) return { ...base, status: 'not_found', note: 'แปลงผลลัพธ์เป็น JSON ไม่ได้' }
  }catch(e){
    return { ...base, status: 'not_found', note: 'ค้นตัวบทไม่สำเร็จ: ' + String(e && e.message || e).slice(0, 200) }
  }

  // 2.5) ได้ลิงก์ไฟล์ตัวบท (.pdf) มา → ดึงไฟล์จริงมาให้โมเดลอ่าน แล้วใช้ผลนั้นแทน
  //   web_search เห็นแค่ snippet จึงมักไม่มี source_excerpt ทำให้ถูกด่าน (ข) ตัดทิ้งจนเหลือศูนย์
  //   อ่านจากไฟล์จริงจะได้ excerpt ที่คัดจากตัวบทจริง ๆ · ดึงไม่ได้ก็ใช้ผล web_search ตามเดิม
  let fromFile = false
  const pdfUrl = String(out.source_url || '')          // URL ที่เราดึงไฟล์มาได้จริง — ใช้อันนี้เสมอ
  const pdfB64 = await fetchPdfBase64(pdfUrl)          //   ห้ามใช้ค่าที่โมเดลคายกลับมาในรอบที่ 2
  if(pdfB64){
    const better = await readLawFromPdf(
      { lawName, clause, parent_law: ref?.parent_law, why_needed: ref?.why_needed },
      pdfUrl, pdfB64)
    if(better && better.status === 'resolved' && Array.isArray(better.requirements) && better.requirements.length){
      out = { ...better, source_url: pdfUrl }
      fromFile = true
    }
  }

  // 3) ตรวจก่อนเชื่อ — ด่านนี้สำคัญที่สุด
  let status = out.status === 'resolved' ? 'resolved' : 'not_found'
  let note = out.note || ''
  let reqs = Array.isArray(out.requirements) ? out.requirements : []

  // (ก) source_url ต้องอยู่ในโดเมนที่เชื่อถือได้ ไม่ผ่าน = ทิ้ง requirements ทั้งก้อน
  if(status === 'resolved' && !hostAllowed(out.source_url)){
    status = 'not_found'; reqs = []
    note = (note ? note + ' · ' : '') + 'แหล่งอ้างอิงไม่อยู่ในโดเมนที่เชื่อถือได้'
  }
  // (ข) ข้อที่ไม่มี source_excerpt = โมเดลแต่งจากความจำ ไม่มีตัวบทรองรับ → ตัดทิ้งทั้งข้อ
  if(status === 'resolved'){
    const before = reqs.length
    reqs = reqs.filter(r => r && String(r.source_excerpt || '').trim() && String(r.req_text || '').trim())
    if(reqs.length < before) note = (note ? note + ' · ' : '') + `ตัด ${before - reqs.length} ข้อที่ไม่มีข้อความจากตัวบทรองรับ`
    // (ค) จำกัดจำนวนข้อต่อกฎหมาย 1 ฉบับ
    if(reqs.length > MAX_REQ_PER_LAW){
      note = (note ? note + ' · ' : '') + `แสดง ${MAX_REQ_PER_LAW} ข้อแรกจาก ${reqs.length} ข้อ`
      reqs = reqs.slice(0, MAX_REQ_PER_LAW)
    }
    // (ง) ไม่เหลือข้อเลย → ถือว่าหาไม่เจอ
    if(!reqs.length){ status = 'not_found'; note = (note ? note + ' · ' : '') + 'ไม่เหลือข้อที่ใช้ได้' }
  }
  // บอกผู้ตรวจว่าข้อชุดนี้อ่านจากไฟล์ตัวบทจริง ไม่ใช่จาก snippet ของผลค้นหา
  if(fromFile && status === 'resolved') note = (note ? note + ' · ' : '') + 'อ่านจากไฟล์ตัวบทจริง'

  // กฎหมายที่ฉบับนี้อ้างถึงต่อ — ใช้สร้าง frontier ของชั้นถัดไป (เก็บไว้เมื่อ resolved เท่านั้น)
  const childRefs = status === 'resolved' && Array.isArray(out.related_laws)
    ? out.related_laws.filter(c => c && String(c.law_name || '').trim()) : []

  const result = { ...base, status, from_cache: false,
    law_full_name: out.law_full_name || lawName, source_url: out.source_url || '',
    resolved_text: out.resolved_text || '', confidence: out.confidence || '', note,
    requirements: reqs, related_laws: childRefs }

  // 4) เก็บลง cache — เก็บกรณีหาไม่เจอด้วย เพื่อไม่ให้ยิงซ้ำทุกครั้งที่สรุปกฎหมายฉบับเดิม
  try{
    if(SUPA_URL && SUPA_KEY){
      await fetch(`${SUPA_URL}/rest/v1/lg_law_refs?on_conflict=ref_key`, {
        method: 'POST',
        headers: { ...SUPA_HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([{
          ref_key: refKey, ref_law_name: result.law_full_name, ref_clause: base.clause,
          resolved_text: result.resolved_text, requirements: reqs, source_url: result.source_url,
          related_laws: childRefs,
          confidence: result.confidence, note, resolve_status: status, resolved_at: new Date().toISOString()
        }])
      })
    }
  }catch(e){ /* cache เขียนไม่ได้ไม่ใช่เหตุให้ล้ม — ผลที่ค้นได้ยังใช้ได้ */ }

  return result
}

// ── ฟังก์ชัน 3 · รวมทุกอย่างเป็นชุดเดียว ไม่แยก section ─────────────────────
// ข้อของฉบับหลักมาก่อนเสมอ ตามด้วยข้อจากกฎหมายที่ถูกอ้าง · req_no ไล่ใหม่ต่อเนื่องทั้งชุด
function fingerprint(t){ return String(t || '').replace(/\s+/g, '').slice(0, 60) }

export async function relateAndMerge(relatedLaws, mainReqs, parentName){
  const main = Array.isArray(mainReqs) ? mainReqs : []
  const all = Array.isArray(relatedLaws) ? relatedLaws : []

  // 1-2) ดึงชั้นเดียว: เฉพาะกฎหมายที่ตัวบทซึ่งผู้ใช้วางให้สรุป "อ้างถึงโดยตรง" (MAX_DEPTH = 1)
  //   กฎหมายที่ฉบับลูกอ้างต่อไปอีก จะไม่ถูกตามไปดึง — ถ้าผู้ใช้ต้องการ ให้เอาฉบับนั้นมาวางสรุปแยก
  //   ยังกันซ้ำด้วย Set ของ ref_key (กันฉบับเดียวถูกอ้างจากหลายจุดในตัวบทเดียวกัน)
  //   และเพดานรวม MAX_TOTAL_LOOKUPS
  const touched = new Set()
  const results = []
  const deferred = []
  let budget = MAX_TOTAL_LOOKUPS
  let frontier = all.filter(r => r && r.needs_lookup !== false)

  // กันฉบับหลักถูกดึงกลับมาเป็นกฎหมายอ้างอิงของตัวเอง — พ.ร.บ.แม่มักอ้างกลับมาที่กฎกระทรวงลูก
  // เทียบที่ "ชื่อ" อย่างเดียว (ตัดส่วน clause ทิ้ง) เพื่อกันทุกกรณีไม่ว่าจะอ้างทั้งฉบับหรือรายข้อ
  const selfName = normalizeRefKey(parentName || '', '').split('|')[0]

  for(let depth = 1; depth <= MAX_DEPTH && frontier.length && budget > 0; depth++){
    // ตัดตัวที่เคยแตะแล้วออกก่อนนับโควตา
    const fresh = []
    for(const r of frontier){
      const name = String(r.law_name || '').trim()
      if(!name) continue
      const k = normalizeRefKey(name, r.clause || '')
      if(touched.has(k)) continue
      if(selfName && k.split('|')[0] === selfName) continue   // อ้างกลับมาที่ฉบับหลักเอง
      touched.add(k)
      fresh.push(r)
    }
    if(!fresh.length) break

    const take = fresh.slice(0, Math.min(MAX_PER_WAVE, budget))
    deferred.push(...fresh.slice(take.length))
    budget -= take.length

    // ค้นขนานภายในชั้น — แต่ละตัวครอบ catch เอง ตัวหนึ่งล้มต้องไม่ลากตัวอื่นล้ม
    const wave = await Promise.all(take.map(r =>
      fetchRelatedLaw({ ...r, parent_law: r.via || parentName })
        .then(res => ({ ...res, depth, via: r.via || parentName }))
        .catch(e => ({ ref_key: normalizeRefKey(r.law_name || '', r.clause || ''),
          law_name: r.law_name || '', clause: r.clause || 'ทั้งฉบับ', depth, via: r.via || parentName,
          status: 'not_found', requirements: [], related_laws: [],
          note: String(e && e.message || e).slice(0, 200) }))
    ))
    results.push(...wave)

    // สร้าง frontier ของชั้นถัดไปจากกฎหมายที่ฉบับลูกอ้างถึงต่อ
    // MAX_DEPTH = 1 → เงื่อนไขนี้เป็นเท็จเสมอ frontier ว่าง ลูปจบหลังชั้นแรก (ตั้งใจ)
    // คงโครงไว้เพื่อให้ปรับกลับเป็นหลายชั้นได้ด้วยการแก้ค่าเดียว
    frontier = depth < MAX_DEPTH
      ? wave.filter(res => res.status === 'resolved')
          .flatMap(res => (res.related_laws || [])
            .filter(c => c && c.needs_lookup !== false && String(c.law_name || '').trim())
            .map(c => ({ ...c, via: res.law_full_name || res.law_name })))
      : []
  }

  // 3) ตัดข้อซ้ำ — ของฉบับหลักชนะเสมอ
  const seen = new Set(main.map(r => fingerprint(r?.req_text)))
  const relatedReqs = []
  for(const res of results){
    if(res.status !== 'resolved') continue
    const srcName = res.law_full_name || res.law_name
    for(const r of (res.requirements || [])){
      const fp = fingerprint(r.req_text)
      if(!fp || seen.has(fp)) continue
      seen.add(fp)
      // 4) ติดที่มาไปกับข้อ — ชื่อกฎหมาย ลิงก์ไฟล์ตัวบท และระดับความมั่นใจ
      //    เพื่อให้ จป. เปิดตัวบทตรวจเองได้ และรู้ว่าข้อไหนยังไม่ยืนยัน 100%
      relatedReqs.push({ ...r,
        from_related_law: srcName,
        from_law_url: res.source_url || '',
        from_law_confidence: res.confidence || '',
        from_law_note: res.note || '' })
    }
  }

  // 5) ฉบับหลักก่อน แล้วค่อยของกฎหมายอื่น · ไล่ req_no ใหม่ทั้งชุด เริ่มที่ 1
  const requirements = [
    ...main.map(r => ({ ...r, from_related_law: null })),
    ...relatedReqs
  ].map((r, i) => ({ ...r, req_no: i + 1 }))

  // 6) deferred เข้า related_laws ด้วย เพื่อให้เห็นว่ายังมีที่ยังไม่ได้ดึง
  const related_laws = [
    ...results.map(r => ({ law_name: r.law_name, clause: r.clause, status: r.status,
      depth: r.depth || 1, via: r.via || '',
      source_url: r.source_url || '', resolved_text: r.resolved_text || '',
      confidence: r.confidence || '', note: r.note || '', from_cache: !!r.from_cache,
      req_count: r.status === 'resolved' ? (r.requirements || []).length : 0 })),
    ...deferred.map(r => ({ law_name: r.law_name || '', clause: r.clause || 'ทั้งฉบับ',
      status: 'manual', depth: 0, via: r.via || '',
      source_url: '', resolved_text: '', confidence: '', note: 'เกินจำนวนที่ดึงได้ในรอบเดียว',
      from_cache: false, req_count: 0 }))
  ]

  return {
    requirements,
    related_laws,
    related_count: relatedReqs.length,                                   // จำนวน "ข้อ" ไม่ใช่จำนวนฉบับ
    unresolved_count: results.filter(r => r.status !== 'resolved').length // จำนวน "ฉบับ" ที่หาตัวบทไม่พบ
  }
}
