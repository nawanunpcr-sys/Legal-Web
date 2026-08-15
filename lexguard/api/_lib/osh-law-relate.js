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
const MAX_PER_WAVE = 12      // จำนวนที่ยิงขนานกันต่อชั้น
                             // (maxDuration ของ api/law-analyze.js = 300 วินาที รองรับได้)
const MAX_TOTAL_LOOKUPS = 12 // เพดานรวม ทุกชั้นรวมกัน ต่อการสรุป 1 ครั้ง — เพดานค่าใช้จ่ายไม่เปลี่ยน
                             // ชั้น 1 ได้สิทธิ์ก่อน · ชั้น 2 ใช้เฉพาะโควตาที่เหลือ
// ชั้น 1 = กฎหมายที่ตัวบทซึ่งผู้ใช้วางให้สรุปอ้างถึงโดยตรง — ดึงทุกตัวที่ needs_lookup
// ชั้น 2 = ตามต่อ "เฉพาะการมอบอำนาจ" เท่านั้น คือฉบับชั้น 1 อ่านแล้วยังบอกว่า
//         "เงื่อนไขจริงอยู่ในกฎกระทรวง/ประกาศฉบับนั้น" ทำให้ข้อยังอ่านไม่จบในตัว
//         (เช่น ประมวลรัษฎากร ม.3 โสฬส → กฎกระทรวง ฉบับที่ 385)
// เคยตามลึก 2 ชั้นแบบเหมารวมแล้วพัง — ลากกฎหมายที่ฉบับหลักไม่ได้อ้างถึงเข้ามาเต็มไปหมด
// ต่างกันตรงนี้: ตามเพราะ "จำเป็นต้องรู้จึงจะเขียนข้อให้จบได้" ไม่ใช่เพราะถูกอ้างถึง
const MAX_DEPTH = 2
const MAX_DEPTH2_LOOKUPS = 4   // กันชั้น 2 กินโควตาจนเบียดของชั้น 1 ที่สำคัญกว่า
const MAX_REQ_PER_LAW = 15   // กัน พ.ร.บ. ใหญ่ดึงมา 70 มาตราจนตารางใช้งานไม่ได้

const SUPA_HEADERS = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'content-type': 'application/json' }

const SYSTEM = `คุณคือผู้ช่วยด้านกฎหมายขององค์กร (compliance) ทำหน้าที่ค้นหาและสรุปตัวบทกฎหมายที่ถูกอ้างถึง
ครอบคลุมทุกด้าน: ความปลอดภัย แรงงาน โทรคมนาคม ข้อมูลส่วนบุคคล ไซเบอร์ ทรัพย์สินทางปัญญา ภาษี สิ่งแวดล้อม
บริบท: ผู้ใช้กำลังอ่านกฎหมายฉบับหนึ่งซึ่งอ้างถึงอีกฉบับ ทำให้อ่านฉบับที่ถืออยู่แล้วไม่รู้ว่าต้องทำอะไรครบ

งานของคุณมี 2 ส่วน และ "ส่วนที่ 1 สำคัญกว่า":
ส่วนที่ 1 (ต้องมีเสมอ) — อธิบายว่า "มาตราที่ถูกอ้างถึงนั้นเขียนว่าอะไร" ด้วยภาษาที่คนทั่วไปเข้าใจ
   ลงในฟิลด์ explain พร้อม explain_excerpt ที่คัดข้อความจากตัวบทจริงมายืนยัน
   ทำเสมอ ไม่ว่ามาตรานั้นจะสร้างหน้าที่ให้บริษัทหรือไม่ก็ตาม
   เพราะระบบจะเอา explain ไปเขียนแทนคำว่า "ตามมาตรา X" ในข้อของกฎหมายฉบับหลัก
   ให้ผู้อ่านอ่านจบในตัวโดยไม่ต้องเปิดกฎหมายฉบับนั้นเอง
   ตัวอย่าง: ถูกอ้างว่า "ใบกำกับภาษีที่จัดทำตามมาตรา 3 โสฬส"
   → explain: "การจัดทำ ส่ง และเก็บใบกำกับภาษีด้วยวิธีการทางอิเล็กทรอนิกส์ ต้องทำตามหลักเกณฑ์ที่กฎกระทรวงกำหนด"
   ถ้ามาตรานั้นเป็นแค่ "บทให้อำนาจ" ที่ชี้ต่อไปยังกฎกระทรวง/ประกาศฉบับอื่น
   ให้เขียน explain ตามที่มันเขียนจริง แล้ว "ต้องใส่ฉบับที่ถูกชี้ต่อลง related_laws (needs_lookup: true)"
   เพื่อให้ระบบตามไปดึงเงื่อนไขจริงมาต่อ ห้ามหยุดแค่ "ตามที่กำหนด"
ส่วนที่ 2 (มีก็ได้ ไม่มีก็ได้) — ถ้ามาตรานั้นสั่งให้บริษัทต้องทำอะไรจริง ให้แตกเป็น requirements
   ไม่มีหน้าที่ของบริษัท = ส่ง requirements เป็น array ว่าง แต่ explain ต้องมีเสมอ
   การไม่มี requirements ไม่ใช่ความล้มเหลว อย่าฝืนสร้างข้อขึ้นมาเพื่อให้มีอะไรตอบ

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
   ข้อยกเว้นสำคัญ — ห้ามตัดทิ้งในฐานะ "บทให้อำนาจ" ถ้าบทนั้นกำหนดเงื่อนไขหรือมาตรฐานของ
   "เอกสาร/หลักฐาน/วิธีการ ที่บริษัทต้องจัดทำหรือต้องใช้" เพราะบริษัทต้องทำตามเงื่อนไขนั้นจริง
   เช่น บทที่กำหนดว่าใบกำกับภาษีอิเล็กทรอนิกส์ต้องจัดทำด้วยวิธีใดจึงจะใช้เป็นหลักฐานได้
   → เขียนเป็นข้อปฏิบัติว่าบริษัทต้องใช้เอกสารที่เข้าเงื่อนไขนั้น พร้อมระบุเงื่อนไขจริงจากตัวบท
   ทดสอบ: ถ้าบริษัททำไม่ตรงตามบทนั้นแล้วเสียสิทธิหรือใช้หลักฐานไม่ได้ = ต้องเก็บไว้
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
{"status":"resolved"|"not_found","law_full_name":"","source_url":"","explain":"สาระของมาตราที่ถูกอ้างถึง เขียนให้คนทั่วไปอ่านจบในตัว ไม่เกิน 400 ตัวอักษร ห้ามใส่เลขมาตรา","explain_excerpt":"ข้อความจากตัวบทจริงที่รองรับ explain ไม่เกิน 300 ตัวอักษร","is_delegation":true ถ้ามาตรานี้ไม่ได้กำหนดเงื่อนไขเอง แต่ชี้ไปให้ดูกฎกระทรวง/ประกาศฉบับอื่น มิฉะนั้น false,"resolved_text":"สรุปสาระของส่วนที่ถูกอ้างถึง ไม่เกิน 500 ตัวอักษร","confidence":"high"|"medium"|"low","note":"ข้อสังเกต เช่น พบเฉพาะฉบับก่อนแก้ไข","requirements":[{"section_ref":"มาตรา 9","req_text":"ข้อความที่ต้องทำ อ่านจบในตัว","action_required":"","frequency":"","evidence":"","penalty":"ระบุตัวเลขจริง หรือค่าว่าง","source_excerpt":"ข้อความจากตัวบทจริง ไม่เกิน 300 ตัวอักษร"}],"related_laws":[{"law_name":"","clause":"มาตรา X หรือ null ถ้าอ้างทั้งฉบับ","why_needed":"ทำไมต้องรู้เนื้อหานี้ถึงจะปฏิบัติตามได้","needs_lookup":true}]}`

// cache_control · SYSTEM ~2,100 token ถูกส่งซ้ำทุกครั้งที่ตามไปดึงกฎหมายอ้างอิง
// cache ไว้แล้วอ่านซ้ำได้ในราคา ~10% · เนื้อหาที่ส่งเหมือนเดิมทุกตัวอักษร ไม่กระทบผลลัพธ์
// หมายเหตุ: ชั้นเดียวยิงขนานกัน 12 ตัว ตัวที่ยิงพร้อมกันยังอ่าน cache ของกันและกันไม่ได้
// (cache อ่านได้ต่อเมื่อ response แรกเริ่มไหลแล้ว) — ได้ผลเต็มกับการเรียกรอบถัดๆ ไป
const SYS_CACHED = [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }]


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
        model: MODEL, max_tokens: 8000, system: SYS_CACHED,
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
        // explained ก็ต้องอ่านจาก cache — ระบบเคยอ่านตัวบทฉบับนั้นและได้คำอธิบายไว้แล้ว
        // ไม่งั้นบทให้อำนาจที่ถูกอ้างบ่อยๆ จะถูกไปดึงใหม่ทุกครั้ง จ่ายค่า AI ซ้ำโดยไม่ได้อะไรเพิ่ม
        if(hit && (hit.resolve_status === 'resolved' || hit.resolve_status === 'explained')){
          const age = (Date.now() - new Date(hit.resolved_at).getTime()) / 86400000
          if(age <= CACHE_DAYS){
            const cachedReqs = Array.isArray(hit.requirements) ? hit.requirements : []
            return { ...base, status: hit.resolve_status, from_cache: true,
              read_ok: !!(String(hit.explain || '').trim() || String(hit.resolved_text || '').trim()),
              explain: hit.explain || '',
              law_full_name: hit.ref_law_name, source_url: hit.source_url,
              resolved_text: hit.resolved_text, confidence: hit.confidence, note: hit.note,
              requirements: cachedReqs,
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
        model: MODEL, max_tokens: 8000, system: SYS_CACHED,
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
  // คำอธิบายสาระต้องมีข้อความจากตัวบทรองรับ ใช้เกณฑ์เดียวกับ requirements — ไม่มี = ถือว่าไม่มีคำอธิบาย
  // นี่คือผลลัพธ์หลักของ Skill 3 · ต้องรอดทุกด่าน แม้มาตรานั้นไม่สร้างหน้าที่ให้บริษัท
  let explain = (String(out.explain || '').trim() && String(out.explain_excerpt || '').trim())
    ? String(out.explain).trim() : ''

  // (ก) source_url ต้องอยู่ในโดเมนที่เชื่อถือได้ ไม่ผ่าน = ทิ้ง requirements ทั้งก้อน
  if(status === 'resolved' && !hostAllowed(out.source_url)){
    status = 'not_found'; reqs = []; explain = ''
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
    // (ง) ไม่เหลือข้อเลย = อ่านตัวบทได้แต่ไม่มีหน้าที่ของบริษัท — คนละเรื่องกับ "ค้นไม่เจอ"
    //     เดิมยัดเป็น not_found ทั้งคู่ ทำให้ จป. ถูกสั่งให้ไปเปิดกฎหมายที่ระบบอ่านให้แล้ว
    // ไม่มีข้อกำหนดแต่มีคำอธิบายที่ยืนยันได้ = ได้ของที่ต้องการแล้ว (เอาไปเขียนแทนการอ้างอิง)
    // ไม่ใช่ "หาไม่เจอ" — เดิมยัดเป็น not_found ทำให้เนื้อหาที่ดึงมาได้ถูกทิ้งทั้งที่คือเป้าหมายหลัก
    if(!reqs.length){
      status = explain ? 'explained' : 'not_found'
      note = (note ? note + ' · ' : '') + (explain
        ? 'อ่านตัวบทแล้ว — ได้คำอธิบายสาระ แต่ไม่มีข้อที่บริษัทต้องทำเอง'
        : 'ไม่เหลือข้อที่ใช้ได้')
    }
  }
  // อ่านตัวบทได้จริงหรือเปล่า — แยกจาก status เพราะ explained ก็อ่านได้ แค่ไม่มีข้อกำหนดออกมา
  const readOk = (status === 'resolved' || status === 'explained') && !!(explain || String(out.resolved_text || '').trim())
  // บอกผู้ตรวจว่าข้อชุดนี้อ่านจากไฟล์ตัวบทจริง ไม่ใช่จาก snippet ของผลค้นหา
  if(fromFile && (status === 'resolved' || status === 'explained')) note = (note ? note + ' · ' : '') + 'อ่านจากไฟล์ตัวบทจริง'

  // กฎหมายที่ฉบับนี้อ้างถึงต่อ — ใช้สร้าง frontier ของชั้นถัดไป (เก็บไว้เมื่อ resolved เท่านั้น)
  // เก็บลูกของ explained ด้วย — บทให้อำนาจชี้ว่าเงื่อนไขจริงอยู่ในกฎกระทรวงฉบับไหน
  // ทิ้งไปคือทิ้งข้อมูลที่มีค่าที่สุดของบทประเภทนี้ แล้วตามต่อไม่ได้อีกเลย
  const childRefs = (status === 'resolved' || status === 'explained') && Array.isArray(out.related_laws)
    ? out.related_laws.filter(c => c && String(c.law_name || '').trim()) : []

  const result = { ...base, status, read_ok: readOk, explain, is_delegation: out.is_delegation === true, from_cache: false,
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
          resolved_text: result.resolved_text, explain: result.explain || '',
          requirements: reqs, source_url: result.source_url,
          related_laws: childRefs,
          confidence: result.confidence, note, resolve_status: status, resolved_at: new Date().toISOString()
        }])
      })
    }
  }catch(e){ /* cache เขียนไม่ได้ไม่ใช่เหตุให้ล้ม — ผลที่ค้นได้ยังใช้ได้ */ }

  return result
}

// ── ฟังก์ชัน 4 · เรียบเรียงข้อที่ยังอ้างเลขมาตราให้อ่านจบในตัว ──────────────
// ปัญหาที่แก้: ข้อของฉบับหลักไม่เคยถูกเขียนใหม่เลย · Skill 3 ดึงตัวบทที่อ้างถึงมาได้
// แล้วเอาไปต่อเป็น "แถวใหม่" ข้อเดิมจึงยังค้างคำว่า "ใบกำกับภาษีตามมาตรา 86/4" อยู่
// จป. อ่านแล้วยังต้องไปเปิดประมวลรัษฎากรเองอยู่ดี ซึ่งคือปัญหาที่ระบบตั้งใจแก้ตั้งแต่แรก
//
// รอบนี้ "ไม่ใช่การเดา" เพราะเนื้อหาของมาตราที่อ้างถึงถูกดึงมาแล้วและส่งไปให้ในคำขอ
// ต่างจากตอนสรุปรอบแรกที่โมเดลไม่มีตัวบทฉบับนั้นในมือ จึงถูกกฎ "ห้ามแต่งเติม" ห้ามไว้

// จับเฉพาะการอ้างอิงที่ทำให้ข้อ "อ่านไม่จบในตัว" — ไม่จับเลขในวงเล็บลอยๆ ที่มักเป็นลำดับข้อย่อย
const REF_PATTERN = /(?:ตาม|แห่ง|ใน)?\s*มาตรา\s*[๐-๙\d]|(?:ตาม|ใน)\s*ข้อ\s*[๐-๙\d]|ตามวรรค(?:หนึ่ง|สอง|สาม|สี่|ห้า)/

// การมอบอำนาจแบบไม่มีเลขมาตรา — "ตามที่อธิบดีกำหนด" "ตามหลักเกณฑ์ที่กฎกระทรวงกำหนด"
// อ่านแล้วยังไม่รู้ว่าต้องทำเท่าไหร่ เหมือนกับการอ้างเลขมาตราทุกประการ แต่ regex เดิมจับไม่ได้เลย
// ข้อพวกนี้จึง "ดูสะอาดแต่ใช้งานไม่ได้" — ไม่ติดป้ายเตือน ไม่ถูกส่งไปเรียบเรียงต่อ
const DELEGATION_PATTERN = /ตาม(?:ที่|หลักเกณฑ์|วิธีการ|เงื่อนไข|แบบ)[^。]{0,40}?(?:อธิบดี|รัฐมนตรี|กฎกระทรวง|ประกาศ|คณะกรรมการ|ที่กำหนด)[^。]{0,20}?กำหนด|ตามที่กำหนดใน(?:กฎกระทรวง|ประกาศ)/

// ฉบับนี้อ่านแล้วยัง "ชี้ต่อ" อยู่หรือเปล่า — ถ้าใช่ ข้อที่อ้างถึงมันจะยังอ่านไม่จบในตัว
// จึงคุ้มที่จะตามไปดึงฉบับที่ถูกชี้ต่อ · ใช้ทั้งธงจากโมเดลและตรวจข้อความเอง (อย่างใดอย่างหนึ่ง)
export function pointsElsewhere(res){
  if(!res || (res.status !== 'resolved' && res.status !== 'explained')) return false
  if(res.is_delegation === true) return true
  return DELEGATION_PATTERN.test(String(res.explain || res.resolved_text || ''))
}

export function hasSectionRef(text){
  const t = String(text || '')
  return REF_PATTERN.test(t) || DELEGATION_PATTERN.test(t)
}

const INLINE_SYSTEM = `คุณกำลังขัดเกลาข้อปฏิบัติในทะเบียนกฎหมายให้ "อ่านจบในตัว"
ผู้อ่านคือ จป. และพนักงานทั่วไป ไม่ใช่นักกฎหมาย ไม่มีตัวบทกฎหมายอยู่ในมือ

งานของคุณ: ข้อไหนที่ยังอ้างถึง "มาตรา/ข้อ/วรรค" อยู่ ให้แทนที่การอ้างอิงนั้นด้วยสาระจริง
โดยใช้ได้เฉพาะเนื้อหาที่ให้มาในคำขอนี้เท่านั้น (ตัวบทของมาตราที่ถูกอ้าง ระบบดึงมาให้แล้ว)

หลักการที่ห้ามละเมิด:
1. ห้ามเติมจากความจำเด็ดขาด · ถ้าเนื้อหาของมาตราที่ถูกอ้างไม่ได้อยู่ในคำขอนี้
   ให้ปล่อยข้อนั้นไว้เหมือนเดิม ห้ามเดาว่ามาตรานั้นเขียนว่าอะไร
2. ห้ามเปลี่ยนสาระ ห้ามเพิ่มหรือลดหน้าที่ ห้ามแก้ตัวเลข วันที่ หรือเกณฑ์ใดๆ
   เปลี่ยนได้แค่ "การอ้างอิงเลขมาตรา" → "สาระของมาตรานั้น" เท่านั้น
3. ห้ามรวบข้อ ห้ามตัดข้อ ห้ามสลับลำดับ — ตอบกลับเฉพาะข้อที่แก้จริง อ้างด้วยเลข index เดิม
4. เขียนด้วยภาษาที่คนทั่วไปอ่านรอบเดียวเข้าใจ ใช้ "บริษัท" เป็นประธาน
   ห้ามใช้: ดำเนินการ · จัดให้มี · ทั้งนี้ · ดังกล่าว · ตามที่กำหนด · โดยอนุโลม · มิให้ · นิติบุคคล

ตอบเป็น JSON เท่านั้น ห้ามมี markdown fence:
{"rewritten":[{"index":0,"req_text":"ข้อความใหม่ที่ไม่มีเลขมาตราแล้ว"}],
 "unresolved":[{"index":2,"reason":"ไม่มีเนื้อหาของมาตรานี้ในคำขอ"}]}
ไม่มีข้อไหนต้องแก้เลย ให้ตอบ {"rewritten":[],"unresolved":[]}`

// resolved = ผลจาก fetchRelatedLaw ทุกฉบับ · ใช้ทุกตัวที่อ่านตัวบทได้ (resolved + explained)
// คืน { reqs, changed, unresolved } · ล้มเหลวคืนของเดิมทั้งชุด ไม่ทำให้การสรุปพัง
export async function inlineSectionRefs(mainReqs, resolved = []){
  const reqs = Array.isArray(mainReqs) ? mainReqs : []
  const targets = reqs.map((r, i) => ({ i, r })).filter(x => hasSectionRef(x.r?.req_text))
  if(!targets.length || !process.env.ANTHROPIC_API_KEY) return { reqs, changed: 0, unresolved: [] }

  // วัตถุดิบ 2 ทาง: ตัวบทของกฎหมายอ้างอิงที่ดึงมาได้ + ข้ออื่นในฉบับเดียวกัน
  // (การอ้างข้ามมาตราภายในฉบับเดียวกัน เนื้อหาอยู่ในชุดนี้อยู่แล้ว ไม่ต้องดึงอะไรเพิ่ม)
  // ใช้ทุกฉบับที่ "อ่านตัวบทได้" รวม explained — บทให้อำนาจไม่มีข้อกำหนดออกมา
  // แต่ explain ของมันคือสาระที่ข้อของฉบับหลักอ้างถึง ซึ่งคือสิ่งที่ต้องเอามาแทนเลขมาตรา
  const refMaterial = resolved.filter(x => x && (x.read_ok || x.status === 'resolved')).map(x => ({
    law: x.law_full_name || x.law_name, clause: x.clause,
    สาระของมาตรานี้: x.explain || x.resolved_text || '',
    sections: (x.requirements || []).map(q => ({ section_ref: q.section_ref, text: q.req_text,
      excerpt: q.source_excerpt })),
  }))
  const sameDoc = reqs.map((r, i) => ({ index: i, section_ref: r.section_ref || '', req_text: r.req_text || '' }))

  const ask = JSON.stringify({
    ข้อที่ต้องขัดเกลา: targets.map(x => ({ index: x.i, section_ref: x.r.section_ref || '', req_text: x.r.req_text || '' })),
    ข้อทั้งหมดในฉบับนี้: sameDoc,
    ตัวบทของกฎหมายที่ถูกอ้างถึง: refMaterial,
  })

  try{
    const ar = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 16000,
        system: [{ type: 'text', text: INLINE_SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: ask }] }),
    })
    if(!ar.ok) return { reqs, changed: 0, unresolved: [] }
    const out = parseLoose((((await ar.json()).content) || []).filter(b => b.type === 'text').map(b => b.text).join(''))
    if(!out || !Array.isArray(out.rewritten)) return { reqs, changed: 0, unresolved: [] }

    // merge ทีละ index — กันโมเดลคืนมาไม่ครบ/สลับลำดับ แล้วข้อหาย
    const next = reqs.slice()
    let changed = 0
    for(const w of out.rewritten){
      const i = Number(w?.index)
      const txt = String(w?.req_text || '').trim()
      if(!Number.isInteger(i) || i < 0 || i >= next.length || !txt) continue
      if(txt === next[i].req_text) continue
      next[i] = { ...next[i], req_text: txt, ref_inlined: true }
      changed++
    }
    // ข้อที่ยังอ้างเลขมาตราอยู่หลังขัดเกลา = ยังอ่านไม่จบในตัว ต้องบอก จป. ให้ไปเปิดเอง
    const unresolved = []
    for(const { i } of targets){
      if(hasSectionRef(next[i]?.req_text)){
        next[i] = { ...next[i], needs_manual_ref: true }
        unresolved.push(i)
      }
    }
    return { reqs: next, changed, unresolved }
  }catch{ return { reqs, changed: 0, unresolved: [] } }
}

// ── ฟังก์ชัน 3 · รวมทุกอย่างเป็นชุดเดียว ไม่แยก section ─────────────────────
// ข้อของฉบับหลักมาก่อนเสมอ ตามด้วยข้อจากกฎหมายที่ถูกอ้าง · req_no ไล่ใหม่ต่อเนื่องทั้งชุด
function fingerprint(t){ return String(t || '').replace(/\s+/g, '').slice(0, 60) }

// deadlineAt = เวลา (ms) ที่ต้องคืนผลให้ได้ · Vercel ตัดฟังก์ชันที่ 300 วิ
// หมดเวลาแล้วต้องคืนของที่ได้มาแล้ว ไม่ใช่ทำต่อจนโดนตัดทั้งคำขอ (504 = เสียทั้งหมด เสียเงินฟรีด้วย)
export async function relateAndMerge(relatedLaws, mainReqs, parentName, deadlineAt = Infinity){
  const timeLeft = () => deadlineAt - Date.now()
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
  // ต้องเป็น true ชัดๆ เท่านั้นถึงดึง — เดิมใช้ !== false ทำให้ฉบับที่โมเดล "ลืมใส่ฟิลด์"
  // ถูกดึงทุกครั้ง ทั้งที่ prompt สั่งให้ตั้ง false ไว้ก่อนเมื่อไม่แน่ใจ (ไม่ระบุ = ไม่ดึง)
  let frontier = all.filter(r => r && r.needs_lookup === true)

  // กันฉบับหลักถูกดึงกลับมาเป็นกฎหมายอ้างอิงของตัวเอง — พ.ร.บ.แม่มักอ้างกลับมาที่กฎกระทรวงลูก
  // เทียบที่ "ชื่อ" อย่างเดียว (ตัดส่วน clause ทิ้ง) เพื่อกันทุกกรณีไม่ว่าจะอ้างทั้งฉบับหรือรายข้อ
  const selfName = normalizeRefKey(parentName || '', '').split('|')[0]

  let skippedForTime = 0
  for(let depth = 1; depth <= MAX_DEPTH && frontier.length && budget > 0; depth++){
    // ชั้น 1 ต้องมีเวลาอย่างน้อย 70 วิ · ชั้น 2 (ตามต่อการมอบอำนาจ) ต้องการ 90 วิ เพราะยอมข้ามได้
    const need = depth === 1 ? 70_000 : 90_000
    if(timeLeft() < need){ skippedForTime += frontier.length; break }
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

    // frontier ชั้นถัดไป — เอาเฉพาะลูกของฉบับที่ "อ่านแล้วยังชี้ต่อ" ไม่ใช่ลูกของทุกฉบับ
    // ฉบับที่ให้เนื้อหาครบแล้วไม่ต้องตามต่อ แม้มันจะอ้างถึงกฎหมายอื่นก็ตาม
    frontier = depth < MAX_DEPTH
      ? wave.filter(pointsElsewhere)
          .flatMap(res => (res.related_laws || [])
            .filter(c => c && c.needs_lookup === true && String(c.law_name || '').trim())
            .map(c => ({ ...c, via: res.law_full_name || res.law_name, from_delegation: true })))
          .slice(0, MAX_DEPTH2_LOOKUPS)
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
  let requirements = [
    ...main.map(r => ({ ...r, from_related_law: null })),
    ...relatedReqs
  ]
  // 5.1) ตอนนี้ตัวบทที่ถูกอ้างถึงอยู่ในมือแล้ว — ย้อนกลับไปเติมสาระลงในข้อที่ยังอ้างเลขมาตรา
  //      ต้องทำหลังรวม เพราะข้อของกฎหมายอ้างอิงก็อ้างข้ามมาตรากันเองได้
  // เรียบเรียงใหม่ใช้เวลาอีก 1 call — ข้ามได้ถ้าเวลาเหลือน้อย ข้อจะยังอ้างเลขมาตราแต่ไม่หาย
  const inlined = timeLeft() > 45_000
    ? await inlineSectionRefs(requirements, results)
    : { reqs: requirements, changed: 0, unresolved: [] }
  requirements = inlined.reqs.map((r, i) => ({ ...r, req_no: i + 1 }))

  // 6) deferred เข้า related_laws ด้วย เพื่อให้เห็นว่ายังมีที่ยังไม่ได้ดึง
  const related_laws = [
    ...results.map(r => ({ law_name: r.law_name, clause: r.clause, status: r.status,
      depth: r.depth || 1, via: r.via || '',
      source_url: r.source_url || '', resolved_text: r.resolved_text || '',
      confidence: r.confidence || '', note: r.note || '', from_cache: !!r.from_cache,
      read_ok: !!r.read_ok, explain: r.explain || '',
      req_count: r.status === 'resolved' ? (r.requirements || []).length : 0 })),
    ...deferred.map(r => ({ law_name: r.law_name || '', clause: r.clause || 'ทั้งฉบับ',
      status: 'manual', depth: 0, via: r.via || '',
      source_url: '', resolved_text: '', confidence: '', note: 'เกินจำนวนที่ดึงได้ในรอบเดียว',
      from_cache: false, req_count: 0 })),
    ...frontier.map(r => ({ law_name: r.law_name || '', clause: r.clause || 'ทั้งฉบับ',
      status: 'manual', depth: 0, via: r.via || '',
      source_url: '', resolved_text: '', confidence: '',
      note: 'ยังไม่ได้ดึง — เวลาในรอบนี้ไม่พอ ลองสรุปซ้ำอีกครั้งจะดึงต่อจาก cache ได้เร็วขึ้น',
      from_cache: false, req_count: 0 }))
  ]

  return {
    requirements,
    related_laws,
    related_count: relatedReqs.length,                                   // จำนวน "ข้อ" ไม่ใช่จำนวนฉบับ
    // นับเฉพาะฉบับที่ จป. ต้องไปเปิดเอง — explained ระบบอ่านและสรุปสาระมาให้แล้ว
    unresolved_count: results.filter(r => r.status !== 'resolved' && r.status !== 'explained').length,
    inlined_count: inlined.changed,                    // ข้อที่เขียนใหม่ให้อ่านจบในตัวแล้ว
    skipped_for_time: skippedForTime,                  // ฉบับที่ยังไม่ได้ดึงเพราะเวลาไม่พอ
    manual_ref_count: inlined.unresolved.length        // ข้อที่ยังอ้างเลขมาตรา ต้องเปิดตัวบทเอง
  }
}
