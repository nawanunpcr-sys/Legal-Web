// Skill 3 · osh-law-relate — ดึงตัวบทของ "กฎหมายที่ถูกอ้างถึง" มารวมในผลสรุป
//
// ปัญหาที่แก้: กฎกระทรวงความร้อน แสงสว่าง เสียง 2559 ออกตามความใน พ.ร.บ.ความปลอดภัยฯ 2554
// แต่ไม่เขียนซ้ำว่าผู้มาตรวจวัดต้องขึ้นทะเบียนกับสำนักความปลอดภัยแรงงาน เพราะเรื่องนั้นอยู่ใน
// มาตรา 9 ของ พ.ร.บ.แม่ · จป. ที่อ่านเฉพาะกฎกระทรวงจึงตกข้อกำหนดโดยไม่รู้ตัว
//
// โฟลเดอร์ _lib มีขีดล่างนำหน้า → Vercel ไม่มองเป็น endpoint (เป็น helper อย่างเดียว)

// ด่านตรวจโดเมน ตัวดึงไฟล์ PDF และตัวเรียก Claude ย้ายไป _lib/law-source.js แล้ว (P17)
// เพราะโฟลว์คำถาม (anchor-answer) ต้องใช้ชุดเดียวกัน — ก๊อปไว้สองที่แล้วมันจะค่อยๆ ต่างกัน
import { TRUSTED_DOMAINS, hostAllowed, deadSource, fetchPdfBase64, parseLoose, askClaude, WEB_SEARCH_TOOL, SOURCE_URL_RULES } from './law-source.js'
import { classifyRefs } from './ref-classify.js'
import { answerAnchoredQuestion, pendingAnswer, recheckPending } from './anchor-answer.js'

const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

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
// เพดานจำนวน "คำถาม" ต่อการสรุป 1 ครั้ง — ตั้งเท่าโควตารวม เพื่อให้ "ตามต่อได้ครบทุกจุด"
// เดิมตั้งไว้ 6 เพราะกลัวเวลาไม่พอ แต่กฎกระทรวงฉบับเดียวมีจุดที่ต้องถามได้ถึง 8 จุด
// เหลือ 2 จุดไม่ได้คำตอบ = ผู้ใช้ยังต้องไปเปิดเอง ซึ่งคือปัญหาที่ระบบตั้งใจแก้ตั้งแต่แรก
// ที่ทำให้ตั้งสูงได้โดยไม่ชนเพดานเวลา:
//   - คำถามทุกข้อยิงขนานกัน เวลารวม ≈ สายที่ยาวที่สุด ไม่ใช่ผลรวม
//   - pending ไม่เสียคำขอเลย (ในเอกสารทดสอบคือ 7 จาก 16 จุด)
//   - ข้ามรอบอ่านไฟล์เมื่อผลค้นผ่านด่านครบแล้ว (ดู firstRoundComplete ใน anchor-answer.js)
const MAX_ANCHOR_LOOKUPS = MAX_TOTAL_LOOKUPS

// เพดานการ recheck จุด pending ("ประกาศออกแล้วหรือยัง") ต่อการสรุป 1 ครั้ง
// ตั้งต่ำกว่า anchor เพราะ whole_law คือคำถามที่ผู้ใช้ถามหาโดยตรง ต้องได้โควตาก่อน
// แต่ต้องมากพอให้ครอบคลุมกฎกระทรวงที่มอบอำนาจไว้หลายข้อ (ฉบับที่ใช้ทดสอบมี 7 จุด)
// ราคาที่แลกมา: เจอ 4 จุดที่ระบบเดิมบอกว่า "ยังไม่มีตัวบท" ทั้งที่ออกประกาศมาแล้ว
// และ cache ผูกกับคำถาม การสรุปกฎหมายฉบับอื่นที่ชี้ไปประกาศเดียวกันจึงไม่เสียคำขอซ้ำ
const MAX_PENDING_RECHECK = 6
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

${SOURCE_URL_RULES}

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

// อ่านตัวบทจากไฟล์ PDF จริง · ใช้ SYSTEM ตัวเดียวกัน สคีมา JSON เดิมทุกฟิลด์
async function readLawFromPdf(ref, url, b64){
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
  return askClaude({ system: SYS_CACHED, content: ask, pdfBase64: b64 })
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
        if(hit && ['resolved','explained','link_only'].includes(hit.resolve_status)){
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
  let skippedSecondRound = false
  const pdfUrl = String(out.source_url || '')          // URL ที่เราดึงไฟล์มาได้จริง — ใช้อันนี้เสมอ
  //   ห้ามใช้ค่าที่โมเดลคายกลับมาในรอบที่ 2

  // รอบแรกผ่านด่านครบแล้วก็ไม่ต้องอ่านไฟล์ซ้ำ — เดิมอ่านซ้ำเสมอเมื่อ source_url เป็น .pdf
  // ซึ่งกินเวลาอีก 1 call (ดาวน์โหลด + ให้โมเดลอ่าน PDF ทั้งฉบับ) โดยไม่ได้อะไรเพิ่ม
  // เกณฑ์ต้องครบทั้ง 3 ข้อ ไม่งั้นถอยไปอ่านไฟล์จริงตามเดิมทุกกรณี (รวม explained / not_found)
  const firstRoundComplete =
    out.status === 'resolved' &&
    hostAllowed(pdfUrl) &&
    !!String(out.explain || '').trim() && !!String(out.explain_excerpt || '').trim() &&
    (Array.isArray(out.requirements) ? out.requirements : []).some(
      r => r && String(r.source_excerpt || '').trim() && String(r.req_text || '').trim())

  if(firstRoundComplete){
    skippedSecondRound = true
  } else {
    const pdfB64 = await fetchPdfBase64(pdfUrl)
    if(pdfB64){
      const better = await readLawFromPdf(
        { lawName, clause, parent_law: ref?.parent_law, why_needed: ref?.why_needed },
        pdfUrl, pdfB64)
      if(better && better.status === 'resolved' && Array.isArray(better.requirements) && better.requirements.length){
        out = { ...better, source_url: pdfUrl }
        fromFile = true
      }
    }
  }

  // 3) ตรวจก่อนเชื่อ — ด่านนี้สำคัญที่สุด
  //
  // หลักการ: ตัดสินจาก "หลักฐานที่มี" ไม่ใช่จาก "ป้ายที่โมเดลติดมาเอง"
  // เดิมถ้าโมเดลตอบ status:'not_found' มา บล็อกตรวจทั้งหมดจะถูกข้าม สถานะค้างที่ not_found
  // ทั้งที่มันคายคำอธิบายพร้อมข้อความยืนยันมาให้แล้ว → จ่ายเงินดึงมาแต่ไม่ได้ใช้
  // (เจอจริง: พ.ร.บ.วัตถุอันตราย 2535 — not_found แต่มี explain เก็บไว้ในฐาน)
  let note = out.note || ''
  const rawUrl = String(out.source_url || '').trim()
  const trustedUrl = hostAllowed(rawUrl)

  // requirements เชื่อได้เฉพาะตอนโมเดลบอกว่า resolved — ตอบ not_found แล้วแนบข้อมาด้วยถือว่าขัดแย้งกันเอง
  let reqs = (out.status === 'resolved' && Array.isArray(out.requirements)) ? out.requirements : []

  // (ก) แหล่งต้องอยู่ในโดเมนที่เชื่อถือได้ ไม่ผ่าน = ห้ามเอา "เนื้อหา" มาใช้
  //     แต่ "ลิงก์" ยังให้ไว้ได้ เพราะผู้ใช้เปิดอ่านเองแล้วตัดสินใจเองต่างจากการที่ระบบเอามาสรุปให้
  let explain = (trustedUrl && String(out.explain || '').trim() && String(out.explain_excerpt || '').trim())
    ? String(out.explain).trim() : ''
  if(!trustedUrl && rawUrl){
    reqs = []
    const deadWhy = deadSource(rawUrl)
    note = (note ? note + ' · ' : '') + (deadWhy
      ? 'ที่อยู่ตัวบทที่ค้นเจอเปิดไม่ได้แล้ว — ' + deadWhy
      : 'แหล่งที่ค้นเจอไม่อยู่ในโดเมนที่เชื่อถือได้ — ให้ลิงก์ไว้เปิดตรวจเอง')
  }

  // (ข) ข้อที่ไม่มี source_excerpt = โมเดลแต่งจากความจำ ไม่มีตัวบทรองรับ → ตัดทิ้งทั้งข้อ
  if(reqs.length){
    const before = reqs.length
    reqs = reqs.filter(r => r && String(r.source_excerpt || '').trim() && String(r.req_text || '').trim())
    if(reqs.length < before) note = (note ? note + ' · ' : '') + `ตัด ${before - reqs.length} ข้อที่ไม่มีข้อความจากตัวบทรองรับ`
    // (ค) จำกัดจำนวนข้อต่อกฎหมาย 1 ฉบับ
    if(reqs.length > MAX_REQ_PER_LAW){
      note = (note ? note + ' · ' : '') + `แสดง ${MAX_REQ_PER_LAW} ข้อแรกจาก ${reqs.length} ข้อ`
      reqs = reqs.slice(0, MAX_REQ_PER_LAW)
    }
  }

  // (ง) สรุปสถานะจากหลักฐานที่เหลือ — ทำนอกเงื่อนไข resolved เสมอ
  //     ลำดับ: มีข้อกำหนด > มีคำอธิบายที่ยืนยันได้ > มีแค่ลิงก์ > ไม่มีอะไรเลย
  let status
  if(reqs.length && trustedUrl){
    status = 'resolved'
  } else if(explain){
    status = 'explained'
    note = (note ? note + ' · ' : '') + 'อ่านตัวบทแล้ว — ได้คำอธิบายสาระ แต่ไม่มีข้อที่บริษัทต้องทำเอง'
  } else if(rawUrl){
    // สรุปเป็นข้อความไม่ได้ (ตัวบทใหญ่เกิน อ่านไม่ออก หรือแหล่งไม่น่าเชื่อถือ)
    // แต่ยังรู้ว่าตัวบทอยู่ที่ไหน — ให้ลิงก์ไว้ดีกว่าไม่ให้อะไรเลย
    status = 'link_only'
    reqs = []
    note = (note ? note + ' · ' : '') + (trustedUrl
      ? 'สรุปเนื้อหาไม่สำเร็จ แต่หาลิงก์ตัวบทได้ — เปิดอ่านเองได้'
      : 'สรุปเนื้อหาไม่ได้และแหล่งยังไม่ยืนยัน — ตรวจลิงก์ก่อนใช้')
  } else {
    status = 'not_found'
    reqs = []
    note = (note ? note + ' · ' : '') + 'หาตัวบทไม่พบ และไม่มีลิงก์ให้เปิดเอง'
  }

  // อ่านตัวบทได้จริงหรือเปล่า — แยกจาก status เพราะ explained ก็อ่านได้ แค่ไม่มีข้อกำหนดออกมา
  const readOk = (status === 'resolved' || status === 'explained') && !!(explain || String(out.resolved_text || '').trim())
  // บอกผู้ตรวจว่าข้อชุดนี้อ่านจากไฟล์ตัวบทจริง ไม่ใช่จาก snippet ของผลค้นหา
  if(fromFile && (status === 'resolved' || status === 'explained')) note = (note ? note + ' · ' : '') + 'อ่านจากไฟล์ตัวบทจริง'
  if(skippedSecondRound) note = (note ? note + ' · ' : '') + 'ใช้ผลจากการค้นโดยตรง (ผ่านด่านตรวจครบ)'

  // กฎหมายที่ฉบับนี้อ้างถึงต่อ — ใช้สร้าง frontier ของชั้นถัดไป (เก็บไว้เมื่อ resolved เท่านั้น)
  // เก็บลูกของ explained ด้วย — บทให้อำนาจชี้ว่าเงื่อนไขจริงอยู่ในกฎกระทรวงฉบับไหน
  // ทิ้งไปคือทิ้งข้อมูลที่มีค่าที่สุดของบทประเภทนี้ แล้วตามต่อไม่ได้อีกเลย
  const childRefs = (status === 'resolved' || status === 'explained') && Array.isArray(out.related_laws)
    ? out.related_laws.filter(c => c && String(c.law_name || '').trim()) : []

  const result = { ...base, status, read_ok: readOk, explain, is_delegation: out.is_delegation === true, from_cache: false,
    law_full_name: out.law_full_name || lawName, source_url: rawUrl,
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

// ชี้ไป "กฎหมายอีกฉบับ" โดยไม่มีเลขมาตรา — "ตามกฎหมายว่าด้วยการควบคุมอาคาร"
// รูปแบบนี้พบมากที่สุดในกฎหมายไทย แต่ 2 pattern บนจับไม่ได้เลยสักตัว
// ข้อพวกนี้จึงไม่เคยถูกส่งเข้าขั้นเรียบเรียง และค้างข้อความว่า "ตามกฎหมายว่าด้วย…" ตลอดไป
// ทั้งที่ P17 ดึงคำตอบมาได้แล้ว — คือจ่ายเงินหาคำตอบมาแล้วไม่ได้เอาไปใช้ในที่ที่ผู้ใช้อ่าน
const OTHER_LAW_PATTERN = /ตาม(?:ที่กำหนดใน|แบบและ\S{0,10}ที่กำหนดใน|)?กฎหมาย(?:ว่าด้วย|ที่เกี่ยวข้อง|อื่น)|ที่กำหนดในกฎหมายว่าด้วย|เป็นไปตามกฎหมาย/

export function hasSectionRef(text){
  const t = String(text || '')
  return REF_PATTERN.test(t) || DELEGATION_PATTERN.test(t) || OTHER_LAW_PATTERN.test(t)
}

const INLINE_SYSTEM = `คุณกำลังขัดเกลาข้อปฏิบัติในทะเบียนกฎหมายให้ "อ่านจบในตัว"
ผู้อ่านคือ จป. และพนักงานทั่วไป ไม่ใช่นักกฎหมาย ไม่มีตัวบทกฎหมายอยู่ในมือ

งานของคุณ: ข้อไหนที่ยัง "อ่านไม่จบในตัว" ให้เขียนสาระจริงลงไปแทนการอ้างอิงลอยๆ
โดยใช้ได้เฉพาะเนื้อหาที่ให้มาในคำขอนี้เท่านั้น (ระบบดึงตัวบทและคำตอบมาให้แล้ว)

การอ้างอิงลอยๆ ที่ต้องแทนที่มี 2 แบบ:
  ก. อ้างเลขมาตรา/ข้อ/วรรค — "ใบกำกับภาษีตามมาตรา 86/4"
  ข. อ้างชื่อกฎหมายทั้งฉบับ — "ตามแบบและจำนวนที่กำหนดในกฎหมายว่าด้วยการควบคุมอาคาร"
     แบบนี้พบมากที่สุด และเป็นแบบที่ผู้อ่านหงุดหงิดที่สุด เพราะอ่านจบแล้วยังไม่รู้ว่าต้องทำเท่าไหร่

ถ้าข้อนั้นมี "คำตอบที่ระบบหามาให้" (ฟิลด์ คำตอบของกฎหมายที่ข้ออ้างถึง)
ให้เขียน "ตัวเลขและเกณฑ์จริง" จากคำตอบนั้นลงไปในเนื้อข้อเลย ตรงจุดที่เดิมเขียนว่า "ตามกฎหมายว่าด้วย…"
นี่คือหัวใจของงานนี้ — ผู้อ่านต้องได้ตัวเลขโดยไม่ต้องเปิดอ่านอะไรเพิ่ม
  ก่อน: "ต้องมีห้องน้ำและห้องส้วมตามแบบและจำนวนที่กำหนดในกฎหมายว่าด้วยการควบคุมอาคาร"
  หลัง: "ต้องมีห้องส้วมและอ่างล้างมือตามจำนวนขั้นต่ำ — คนงานชายไม่เกิน 15 คน ต้องมีห้องถ่ายอุจจาระ
         1 ที่ ที่ถ่ายปัสสาวะ 1 ที่ ห้องน้ำ 1 ที่ และอ่างล้างมือ 1 ที่ (คนงานหญิงไม่เกิน 15 คน
         ห้องถ่ายอุจจาระ 2 ที่) ถ้าเกิน 80 คน เพิ่มอย่างละ 1 ที่ ต่อลูกจ้างทุก 50 คน"
เกณฑ์มีหลายกรณีจนเขียนหมดแล้วยาวเกินไป ให้เขียนกรณีที่ตรงกับผู้อ่านมากที่สุด 1-2 กรณี
แล้วปิดท้ายว่ากรณีอื่นดูได้ที่ไหน — ห้ามตัดตัวเลขทิ้งทั้งหมดแล้วเขียนว่า "ตามที่กำหนด"

ถ้าข้อนั้นเป็น "รอประกาศ" (สถานะ pending_issuance) ห้ามแต่งเกณฑ์ขึ้นมาเอง
ให้เขียนตามจริงว่ายังไม่มีตัวบท เช่น "ต้องควบคุมมลพิษให้อยู่ในค่ามาตรฐาน ซึ่งรัฐมนตรียังไม่ได้ออกประกาศกำหนด" 

หลักการที่ห้ามละเมิด:
1. ห้ามเติมจากความจำเด็ดขาด · ถ้าเนื้อหาของมาตราที่ถูกอ้างไม่ได้อยู่ในคำขอนี้
   ให้ปล่อยข้อนั้นไว้เหมือนเดิม ห้ามเดาว่ามาตรานั้นเขียนว่าอะไร
2. ห้ามเปลี่ยนสาระ ห้ามเพิ่มหรือลดหน้าที่ ห้ามแก้ตัวเลข วันที่ หรือเกณฑ์ใดๆ
   เปลี่ยนได้แค่ "การอ้างอิงเลขมาตรา" → "สาระของมาตรานั้น" เท่านั้น
3. ห้ามรวบข้อ ห้ามตัดข้อ ห้ามสลับลำดับ — ตอบกลับเฉพาะข้อที่แก้จริง อ้างด้วยเลข index เดิม
4. ตัวเลขทุกตัวต้องมีหน่วยและฐานเทียบครบ ("1 ที่ ต่อลูกจ้าง 15 คน" ไม่ใช่ "1 ที่ ต่อ 15")
5. ห้ามจบข้อด้วย "ตามที่กฎหมายกำหนด" หรือ "ตามกฎหมายว่าด้วย…" เฉยๆ ถ้ามีคำตอบให้แล้ว
6. เขียนด้วยภาษาที่คนทั่วไปอ่านรอบเดียวเข้าใจ ใช้ "บริษัท" เป็นประธาน
   ห้ามใช้: ดำเนินการ · จัดให้มี · ทั้งนี้ · ดังกล่าว · ตามที่กำหนด · โดยอนุโลม · มิให้ · นิติบุคคล

ตอบเป็น JSON เท่านั้น ห้ามมี markdown fence:
{"rewritten":[{"index":0,"req_text":"ข้อความใหม่ที่ไม่มีเลขมาตราแล้ว"}],
 "unresolved":[{"index":2,"reason":"ไม่มีเนื้อหาของมาตรานี้ในคำขอ"}]}
ไม่มีข้อไหนต้องแก้เลย ให้ตอบ {"rewritten":[],"unresolved":[]}`

// resolved = ผลจาก fetchRelatedLaw ทุกฉบับ · ใช้ทุกตัวที่อ่านตัวบทได้ (resolved + explained)
// คืน { reqs, changed, unresolved } · ล้มเหลวคืนของเดิมทั้งชุด ไม่ทำให้การสรุปพัง
export async function inlineSectionRefs(mainReqs, resolved = []){
  const reqs = Array.isArray(mainReqs) ? mainReqs : []
  // ข้อที่มีคำตอบผูกอยู่แล้ว ต้องเข้าขั้นเรียบเรียงเสมอ แม้ข้อความจะไม่เข้า pattern ใดเลย
  // (จ่ายเงินหาคำตอบมาแล้ว ไม่เอาไปเขียนลงในข้อ = ผู้ใช้ไม่ได้อะไรจากที่จ่ายไป)
  const hasAns = r => (r?.ref_answers || []).some(a => a.status === 'answered' || a.status === 'pending_issuance')
  const targets = reqs.map((r, i) => ({ i, r })).filter(x => hasSectionRef(x.r?.req_text) || hasAns(x.r))
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
    ข้อที่ต้องขัดเกลา: targets.map(x => ({ index: x.i, section_ref: x.r.section_ref || '', req_text: x.r.req_text || '',
      คำตอบของกฎหมายที่ข้ออ้างถึง: (x.r.ref_answers || []).map(a => ({
        สถานะ: a.status, คำตอบ: a.answer_plain || '', เกณฑ์: a.answer_detail || {},
        กฎหมายที่ให้คำตอบ: [a.law_name, a.section_ref].filter(Boolean).join(' '),
        ข้อความจากตัวบท: a.source_excerpt || '',
        รอใครออกประกาศ: a.issuing_authority || '' })) })),
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

// ── P17 · ผูก "คำตอบ" เข้ากับข้อที่ถามถึง ────────────────────────────────────
// เดิมข้อที่ดึงมาจากกฎหมายอ้างอิงถูก append เป็น "แถวใหม่" ท้ายตาราง
// ผู้ใช้จึงไม่รู้ว่าแถวไหนมาจากข้อไหน — ซึ่งเป็นเหตุผลหลักที่ผลลัพธ์เดิมดูมั่ว
// ตอนนี้คำตอบไปอยู่ "ใต้ข้อที่อ้างถึง" โดยตรง
//
// จับคู่ 2 ทาง: for_section ที่โมเดลระบุมา แล้วค่อยถอยไปหาจากชื่อกฎหมายในเนื้อข้อ
// จับคู่ไม่ได้ก็ไม่ทิ้ง — ส่งกลับไปแสดงในแผงรวมแทน ดีกว่าหายไปเงียบๆ
function normRef(s){ return arabic(String(s || '')).replace(/\s+/g, '').toLowerCase() }

export function attachAnswers(reqs, answers){
  const rows = Array.isArray(reqs) ? reqs.map(r => ({ ...r })) : []
  const loose = []
  const bySection = new Map()
  rows.forEach((r, i) => {
    const k = normRef(r.section_ref)
    if(k && !bySection.has(k)) bySection.set(k, i)
  })

  for(const ans of (Array.isArray(answers) ? answers : [])){
    let idx = -1
    const want = normRef(ans.for_section)
    if(want && bySection.has(want)) idx = bySection.get(want)
    if(idx < 0){
      // ถอยไปหาจาก "ชื่อกฎหมายที่ถูกอ้าง" ที่ยังปรากฏอยู่ในเนื้อข้อ
      // ชื่อสั้นกว่า 8 ตัวอักษรไปโผล่โดยบังเอิญได้ จึงไม่ใช้เป็นหลักฐาน
      const name = normRef(ans.law_name)
      if(name.length >= 8) idx = rows.findIndex(r => normRef(r.req_text).includes(name))
    }
    if(idx < 0){ loose.push(ans); continue }
    rows[idx].ref_answers = [...(rows[idx].ref_answers || []), ans]
    // ข้อที่ได้คำตอบแล้ว ไม่ต้องขึ้นป้าย "ยังอ้างเลขมาตรา ต้องเปิดตัวบทเติมเอง" อีก
    // และข้อที่รอประกาศก็ไม่ใช่ "ต้องเปิดตัวบทเติมเอง" เพราะไม่มีตัวบทให้เปิด
    if(ans.status === 'answered' || ans.status === 'pending_issuance') rows[idx].needs_manual_ref = false
  }
  return { reqs: rows, loose }
}

// ── ฟังก์ชัน 3 · รวมทุกอย่างเป็นชุดเดียว ไม่แยก section ─────────────────────
// ข้อของฉบับหลักมาก่อนเสมอ ตามด้วยข้อจากกฎหมายที่ถูกอ้าง · req_no ไล่ใหม่ต่อเนื่องทั้งชุด
function fingerprint(t){ return String(t || '').replace(/\s+/g, '').slice(0, 60) }

// deadlineAt = เวลา (ms) ที่ต้องคืนผลให้ได้ · Vercel ตัดฟังก์ชันที่ 300 วิ
// หมดเวลาแล้วต้องคืนของที่ได้มาแล้ว ไม่ใช่ทำต่อจนโดนตัดทั้งคำขอ (504 = เสียทั้งหมด เสียเงินฟรีด้วย)
export async function relateAndMerge(relatedLaws, mainReqs, parentName, deadlineAt = Infinity){
  const timeLeft = () => deadlineAt - Date.now()
  const main = Array.isArray(mainReqs) ? mainReqs : []

  // P17 · จำแนกก่อนตัดสินใจ — การอ้างถึง 3 ชนิดต้องการคนละอย่างสิ้นเชิง
  //   pending    ตัวบทยังไม่ออก      → ไม่เรียก API เลย
  //   whole_law  อ้างกฎหมายทั้งชุด   → แปลงเป็นคำถามก่อนค้น (ห้ามดึงทั้งฉบับ)
  //   specific   อ้างมาตราเจาะจง     → ดึงมาตรานั้น (โฟลว์เดิม)
  const all = classifyRefs(relatedLaws)
  // pending ไม่ต้องผ่านด่าน needs_lookup — มันไม่ใช่การ "ไปดึงอะไร" และไม่เสียเงินสักบาท
  // ถ้ากรองทิ้งตาม needs_lookup ที่โมเดลตั้งมา จะเสียสถานะ "รอประกาศ" ไปฟรี ๆ
  // ทั้งที่นั่นคือข้อมูลที่เปลี่ยนวิธีประเมินของ จป. (ประเมินไม่ได้ ≠ ไม่สอดคล้อง)
  const pendingRefs = all.filter(r => r && r.ref_type === 'pending')
  const wanted = all.filter(r => r && r.needs_lookup === true)
  const anchorRefs = wanted.filter(r => r.ref_type === 'whole_law')
  const specificRefs = wanted.filter(r => r.ref_type === 'specific')

  let budget = MAX_TOTAL_LOOKUPS
  const answers = []

  // 2) whole_law + pending recheck — คำถามอิสระต่อกัน ยิงขนานกันทั้งหมดในคลื่นเดียว
  //
  // เดิมแยกเป็นสอง `await Promise.all` เรียงกัน เวลารวมจึงเป็น T(anchor) + T(pending)
  // ทั้งที่ไม่มีอะไรผูกกันเลย · รวมเป็นคลื่นเดียวแล้วเวลารวมเหลือ max(...) แทนผลบวก
  // ไม่แตะด่านตรวจใดเลย — เปลี่ยนแค่จังหวะยิง
  //
  // โควตายังแบ่งลำดับเดิม: whole_law ได้ก่อน เพราะเป็นคำถามที่ผู้ใช้ถามหาโดยตรง
  // ("แล้วต้องมีกี่ที่") ส่วน pending recheck ใช้ที่เหลือ
  //
  // ทำไม pending ต้อง recheck: เดิมข้ามทั้งหมดเพราะเชื่อว่าตัวบทยังไม่ออก แล้วเขียนไปเลยว่า
  // "ยังไม่มีตัวบท" · ทดสอบจริง 2026-08-17 กับกฎกระทรวงควบคุมสถานประกอบกิจการฯ 2560
  // (pending 7 จุด) พบว่า 4 จุดออกประกาศมาแล้ว — เสียง 2561 · ผู้สูงอายุ 2564 + โควิด 2566 ·
  // บ่อดักไขมัน 2565 · แมลงและสัตว์พาหะ 2564 · สมมติฐานเดิมจึงผิด และผิดในทางที่ทำให้ จป.
  // ข้ามข้อที่มีหน้าที่ต้องทำจริง
  const enoughTime = timeLeft() > 45_000

  const anchorTake = enoughTime ? anchorRefs.slice(0, Math.min(MAX_ANCHOR_LOOKUPS, budget)) : []
  const anchorSkipped = anchorRefs.length - anchorTake.length
  budget -= anchorTake.length

  const pendingTake = (enoughTime && budget > 0)
    ? pendingRefs.slice(0, Math.min(MAX_PENDING_RECHECK, budget))
    : []
  const pendingChecked = pendingTake.length
  budget -= pendingTake.length

  const withRef = (a, r) => ({ ...a, for_section: r.for_section || '', appears_in: r.appears_in || '' })

  if(anchorTake.length || pendingTake.length){
    const wave = [
      ...anchorTake.map(r =>
        answerAnchoredQuestion(r, deadlineAt)
          .then(a => withRef(a, r))
          .catch(e => withRef({ status: 'not_answered', ref_type: 'whole_law',
            anchor_question: r.anchor_question || '', law_name: r.law_name || '',
            answer_plain: '', answer_detail: {}, source_url: '', source_excerpt: '',
            note: String(e && e.message || e).slice(0, 200) }, r))),
      ...pendingTake.map(r =>
        recheckPending(r, parentName, deadlineAt)
          .then(a => withRef(a, r))
          .catch(() => withRef(pendingAnswer(r), r))),
    ]
    answers.push(...await Promise.all(wave))
  }

  // จุด pending ที่งบหรือเวลาไม่พอให้ตรวจ — คืนข้อความที่ไม่ยืนยันอะไรทั้งนั้น
  // ซึ่งยังปลอดภัยกว่าการเดาว่าไม่มี
  answers.push(...pendingRefs.slice(pendingTake.length).map(r => withRef(pendingAnswer(r), r)))

  // 3) specific — โฟลว์เดิมทั้งหมด ดึงมาตราที่ถูกอ้างเจาะจง
  const touched = new Set()
  const results = []
  const deferred = []
  let frontier = specificRefs

  // กันฉบับหลักถูกดึงกลับมาเป็นกฎหมายอ้างอิงของตัวเอง — พ.ร.บ.แม่มักอ้างกลับมาที่กฎกระทรวงลูก
  // เทียบที่ "ชื่อ" อย่างเดียว (ตัดส่วน clause ทิ้ง) เพื่อกันทุกกรณีไม่ว่าจะอ้างทั้งฉบับหรือรายข้อ
  const selfName = normalizeRefKey(parentName || '', '').split('|')[0]

  let skippedForTime = anchorSkipped
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

  // 4) ตัดข้อซ้ำ — ของฉบับหลักชนะเสมอ
  const seen = new Set(main.map(r => fingerprint(r?.req_text)))
  const relatedReqs = []
  for(const res of results){
    if(res.status !== 'resolved') continue
    const srcName = res.law_full_name || res.law_name
    for(const r of (res.requirements || [])){
      const fp = fingerprint(r.req_text)
      if(!fp || seen.has(fp)) continue
      seen.add(fp)
      // ติดที่มาไปกับข้อ — ชื่อกฎหมาย ลิงก์ไฟล์ตัวบท และระดับความมั่นใจ
      // เพื่อให้ จป. เปิดตัวบทตรวจเองได้ และรู้ว่าข้อไหนยังไม่ยืนยัน 100%
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
  // 5.2) ผูกคำตอบเข้ากับข้อ "ก่อน" เรียบเรียง — ขั้นเรียบเรียงต้องเห็นคำตอบ
  //      ถึงจะเอาตัวเลขจริงไปเขียนแทนคำว่า "ตามกฎหมายว่าด้วย…" ในเนื้อข้อได้
  //      (เดิมเรียบเรียงก่อนแล้วค่อยผูก ขั้นเรียบเรียงจึงไม่มีคำตอบในมือ ได้แค่ปล่อยข้อไว้เหมือนเดิม)
  const attached = attachAnswers(requirements, answers)

  const inlined = timeLeft() > 45_000
    ? await inlineSectionRefs(attached.reqs, results)
    : { reqs: attached.reqs, changed: 0, unresolved: [] }

  // ข้อที่ได้คำตอบแล้ว ไม่ต้องขึ้นป้าย "ต้องเปิดตัวบทเติมเอง" แม้ยังเข้า pattern อยู่
  // และข้อที่รอประกาศก็ไม่มีตัวบทให้เปิด
  const answered = r => (r?.ref_answers || []).some(a => a.status === 'answered' || a.status === 'pending_issuance')
  requirements = inlined.reqs.map((r, i) => ({ ...r, req_no: i + 1,
    needs_manual_ref: answered(r) ? false : !!r.needs_manual_ref }))

  // 6) deferred เข้า related_laws ด้วย เพื่อให้เห็นว่ายังมีที่ยังไม่ได้ดึง
  const related_laws = [
    ...results.map(r => ({ law_name: r.law_name, clause: r.clause, status: r.status,
      ref_type: 'specific', depth: r.depth || 1, via: r.via || '',
      source_url: r.source_url || '', resolved_text: r.resolved_text || '',
      confidence: r.confidence || '', note: r.note || '', from_cache: !!r.from_cache,
      read_ok: !!r.read_ok, explain: r.explain || '',
      req_count: r.status === 'resolved' ? (r.requirements || []).length : 0 })),
    // P17 · คำตอบก็ต้องอยู่ในแผงรวมด้วย ไม่งั้นการอ้างถึงที่จับคู่กับข้อไม่ได้จะหายไปเงียบๆ
    ...answers.map(a => ({ law_name: a.law_name || '', clause: a.section_ref || 'ทั้งฉบับ',
      status: a.status, ref_type: a.ref_type || 'whole_law', depth: 1, via: '',
      source_url: a.source_url || '', resolved_text: a.answer_plain || '',
      confidence: a.confidence || '', note: a.note || '', from_cache: !!a.from_cache,
      read_ok: a.status === 'answered', explain: a.answer_plain || '',
      anchor_question: a.anchor_question || '', for_section: a.for_section || '',
      issuing_authority: a.issuing_authority || '', interim_rule: a.interim_rule || '',
      found_instead: a.found_instead || '', from_table: !!a.from_table,
      unlinked: attached.loose.includes(a), req_count: 0 })),
    ...deferred.map(r => ({ law_name: r.law_name || '', clause: r.clause || 'ทั้งฉบับ',
      status: 'manual', ref_type: r.ref_type || 'specific', depth: 0, via: r.via || '',
      source_url: '', resolved_text: '', confidence: '', note: 'เกินจำนวนที่ดึงได้ในรอบเดียว',
      from_cache: false, req_count: 0 })),
    ...frontier.map(r => ({ law_name: r.law_name || '', clause: r.clause || 'ทั้งฉบับ',
      status: 'manual', ref_type: r.ref_type || 'specific', depth: 0, via: r.via || '',
      source_url: '', resolved_text: '', confidence: '',
      note: 'ยังไม่ได้ดึง — เวลาในรอบนี้ไม่พอ ลองสรุปซ้ำอีกครั้งจะดึงต่อจาก cache ได้เร็วขึ้น',
      from_cache: false, req_count: 0 }))
  ]

  return {
    requirements,
    related_laws,
    ref_answers: answers,                                                // P17 · คำตอบทั้งชุด
    related_count: relatedReqs.length,                                   // จำนวน "ข้อ" ไม่ใช่จำนวนฉบับ
    answered_count: answers.filter(a => a.status === 'answered').length,
    pending_issuance_count: answers.filter(a => a.status === 'pending_issuance').length,
    // นับเฉพาะที่ จป. ต้องไปเปิดเอง · explained ระบบสรุปสาระมาให้แล้ว
    // pending_issuance ไม่นับ — ไม่มีตัวบทให้เปิด รอหน่วยงานออกประกาศ ไม่ใช่งานค้างของ จป.
    unresolved_count:
      results.filter(r => r.status !== 'resolved' && r.status !== 'explained').length +
      answers.filter(a => a.status === 'not_answered').length,
    inlined_count: inlined.changed,                    // ข้อที่เขียนใหม่ให้อ่านจบในตัวแล้ว
    skipped_for_time: skippedForTime,                  // ฉบับที่ยังไม่ได้ดึงเพราะเวลาไม่พอ
    // ข้อที่ยังอ้างเลขมาตรา ต้องเปิดตัวบทเอง — นับใหม่หลังผูกคำตอบ เพราะข้อที่ได้คำตอบแล้วหลุดป้ายไป
    manual_ref_count: requirements.filter(r => r.needs_manual_ref).length,
  }
}
