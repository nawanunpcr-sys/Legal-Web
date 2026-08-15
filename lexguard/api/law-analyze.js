// Vercel serverless function — Skills 1+2 (osh-law-fetch + osh-law-analyze) behind the Analysis page.
// Fetches a law (URL or pasted text), asks Claude to summarize it into registry-ready requirements,
// and stages them in lg_import_staging for the user to approve on the "นำเข้า/รออนุมัติ" page.
// No hardcoded fallbacks — secrets must come from the environment (never committed to git).
import { relateAndMerge } from './_lib/osh-law-relate.js'

const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

// คำอธิบายเพิ่มเติมรายหมวด — ชื่อหมวดใน lg_categories สั้นเกินกว่าที่ AI จะแยกได้ถูก
// หมวดที่เพิ่มใหม่ใน lg_categories ภายหลังจะใช้ชื่อจาก DB อย่างเดียว (ไม่ต้องแก้ไฟล์นี้)
const CAT_HINTS = {
  LA: 'บริหารจัดการความปลอดภัย/อาชีวอนามัย/จป./คปอ./ระบบการจัดการ',
  LB: 'ไฟฟ้าและพลังงาน (รวมน้ำมันเชื้อเพลิง/เครื่องกำเนิดไฟฟ้า)',
  LC: 'การป้องกันและระงับอัคคีภัย',
  LD: 'ความร้อน/แสงสว่าง/เสียง/สภาพแวดล้อมในการทำงาน',
  LE: 'ก่อสร้าง/ลิฟต์/เครื่องจักร/ปั้นจั่น/ที่อับอากาศ/ที่สูง/งานเสี่ยงอื่นๆ',
  LF: 'กฎหมายประกอบธุรกิจขององค์กร ที่ไม่ใช่ SHE — โทรคมนาคม/กสทช. · ข้อมูลส่วนบุคคล (PDPA) · ความมั่นคงปลอดภัยไซเบอร์ · คอมพิวเตอร์/ดิจิทัล · ทรัพย์สินทางปัญญา (ลิขสิทธิ์/ความลับทางการค้า) · ภาษี/การเงิน/บัญชี · สิ่งแวดล้อม/มลพิษ · ผังเมือง/อาคาร · และกฎหมายอื่นที่สร้างหน้าที่ต้องปฏิบัติแก่องค์กร',
  LG: 'คณะกรรมการสวัสดิการในสถานประกอบกิจการ (พ.ร.บ.คุ้มครองแรงงาน หมวดสวัสดิการ)',
}
// หมวดสำรอง ใช้เมื่ออ่าน lg_categories ไม่ได้ (ต้องมีอย่างน้อย 1 หมวดเสมอ ไม่งั้น AI ไม่มีตัวเลือก)
const FALLBACK_CATS = Object.keys(CAT_HINTS).map(code => ({ code, name: CAT_HINTS[code] }))

// อ่านหมวดจากฐานข้อมูล เพื่อให้หมวดที่เพิ่มใหม่ภายหลังถูกใช้งานทันทีโดยไม่ต้อง deploy ใหม่
async function fetchCats(){
  try{
    if(!SUPA_URL || !SUPA_KEY) return FALLBACK_CATS
    const r = await fetch(`${SUPA_URL}/rest/v1/lg_categories?select=code,name&order=sort_order.asc`,
      { headers:{ apikey:SUPA_KEY, Authorization:'Bearer '+SUPA_KEY } })
    if(!r.ok) return FALLBACK_CATS
    const rows = await r.json()
    return Array.isArray(rows) && rows.length ? rows : FALLBACK_CATS
  }catch{ return FALLBACK_CATS }
}

// prompt ประกอบขึ้นตอนรัน เพราะรายการหมวดมาจาก DB (เพิ่มหมวดใหม่แล้วใช้ได้ทันที ไม่ต้อง deploy)
function buildSystem(cats){
  const list = cats.map(c => `${c.code}=${c.name}${CAT_HINTS[c.code] ? ' — ' + CAT_HINTS[c.code] : ''}`).join('\n   ')
  const codes = cats.map(c => c.code).join(', ')
  const fallbackCat = cats.some(c => c.code === 'LF') ? 'LF' : cats[0].code
  return `คุณคือผู้ช่วย จป.วิชาชีพ ทำหน้าที่อ่าน-วิเคราะห์-สรุป "กฎหมายไทยทุกฉบับที่องค์กรต้องปฏิบัติตาม" ให้เข้าทะเบียนกฎหมาย
ครอบคลุมทั้งกฎหมายความปลอดภัย/อาชีวอนามัย/สิ่งแวดล้อม (SHE) และกฎหมายด้านอื่นขององค์กร เช่น โทรคมนาคม ข้อมูลส่วนบุคคล ไซเบอร์ ทรัพย์สินทางปัญญา ภาษี แรงงาน อาคาร/ผังเมือง
ห้ามปฏิเสธเพราะ "ไม่ใช่กฎหมาย SHE" — ถ้าเป็นกฎหมายไทยที่สร้างหน้าที่ต้องปฏิบัติแก่องค์กร ให้สรุปตามรูปแบบที่กำหนดเสมอ
หน้าที่:
1) ระบุชื่อกฎหมายเต็ม ประเภท (พ.ร.บ./พ.ร.ก./พ.ร.ฎ./กฎกระทรวง/ประกาศ/ระเบียบ/คำสั่ง) และหน่วยงาน/กระทรวงที่ออก
   หัวกระดาษไม่ได้บอกกระทรวงเสมอไป — ให้ดูบท "ให้รัฐมนตรีว่าการกระทรวง… รักษาการตามกฎหมายนี้"
   ท้ายฉบับ แล้วใช้กระทรวงนั้น · ยังไม่พบให้ดูผู้ลงนามท้ายฉบับ · ไม่พบจริงๆ ให้ใส่ค่าว่าง ห้ามเดา
2) ระบุ "วันที่ประกาศ" (วันที่ลงราชกิจจานุเบกษา) และ "วันที่บังคับใช้"
   วันบังคับใช้ต้อง "คำนวณเป็นวันที่จริง" เสมอ ห้ามคัดข้อความเงื่อนไขมาใส่ ห้ามปล่อยว่างถ้าคำนวณได้
   รูปแบบที่พบบ่อยและวิธีคำนวณ (ใช้วันที่ประกาศเป็นตัวตั้ง):
   - "ตั้งแต่วันถัดจากวันประกาศในราชกิจจานุเบกษาเป็นต้นไป" → วันประกาศ + 1 วัน
   - "ตั้งแต่วันประกาศในราชกิจจานุเบกษาเป็นต้นไป" → วันเดียวกับวันประกาศ
   - "เมื่อพ้นกำหนด N วันนับแต่วันประกาศ" → วันประกาศ + N + 1 วัน (พ้นกำหนดแล้วจึงเริ่ม)
   - "เมื่อพ้นกำหนด N วันนับแต่วันถัดจากวันประกาศ" → วันประกาศ + N + 1 วัน
   - ระบุวันที่ตรงๆ เช่น "ตั้งแต่วันที่ 1 มกราคม 2570" → ใช้วันที่นั้น
   ตัวเลขที่เขียนเป็นคำไทยให้แปลงเป็นเลขก่อนคำนวณ (เช่น "หนึ่งร้อยแปดสิบวัน" = 180 วัน "เก้าสิบวัน" = 90 วัน)
   คำนวณข้ามเดือนข้ามปีให้ถูกต้องตามจำนวนวันจริงของเดือนนั้น (กุมภาพันธ์ 28/29 วัน)
   ใส่ค่าว่างเฉพาะเมื่อตัวบทไม่ได้บอกวันบังคับใช้ไว้เลย หรือผูกกับเงื่อนไขที่ยังไม่เกิด
   (เช่น "เมื่อมีประกาศกำหนดเขตพื้นที่") — กรณีนั้นให้อธิบายเงื่อนไขไว้ในฟิลด์ documents แทน
   รูปแบบวันที่ต้องเป็น "วว/ดด/ปปปป" ปี พ.ศ. เท่านั้น (เช่น 06/08/2564) — ห้ามใช้รูปแบบ ISO เช่น 2564-08-06 หรือปี ค.ศ. เด็ดขาด เพราะฐานข้อมูลเก็บเป็น วว/ดด/ปปปป พ.ศ.
3) รวบรวม "เอกสาร/แบบฟอร์ม/หลักฐาน" ทั้งหมดที่กฎหมายกำหนดให้จัดทำ/ยื่น/เก็บ (เช่น แบบ จป., รายงาน, ใบรับรอง) ลงในฟิลด์ documents ของกฎหมาย
3.1) ระบุเลขอ้างอิงราชกิจจานุเบกษาลงฟิลด์ gazette_ref — อยู่บนหัวกระดาษทุกหน้าของราชกิจจาฯ
   รูปแบบ "เล่ม <เล่ม> ตอนที่ <ตอน> <ประเภท> หน้า <หน้าแรก>-<หน้าสุดท้าย>"
   เช่น "เล่ม 143 ตอนที่ 17 ก หน้า 4-7" · แปลงเลขไทยเป็นเลขอารบิก
   เอกสารที่ไม่ใช่หน้าราชกิจจาฯ (เช่น ฉบับรวมของกฤษฎีกา) มักไม่มีข้อมูลนี้ → เว้นว่าง ห้ามเดา
3.2) ถ้าตัวบทมีบท "ให้ยกเลิก…" ให้ใส่ชื่อกฎหมายที่ถูกยกเลิกทุกฉบับลง repeals
   เอาเฉพาะที่ตัวบทเขียนว่ายกเลิกจริง ห้ามอนุมานเองว่าฉบับใหม่คงไปแทนฉบับเก่า
   ฉบับที่แค่ "แก้ไขเพิ่มเติม" ไม่ใช่การยกเลิก ห้ามใส่ · ไม่มีบทยกเลิกให้ส่ง array ว่าง
4) แตกเป็น "ข้อกำหนด" รายมาตรา/ข้อ ให้ครบทุกข้อที่สร้างหน้าที่ต้องปฏิบัติ — อย่ารวบ อย่าตกหล่น แต่ละข้อสรุปครบ: ใคร(ผู้รับผิดชอบ) ทำอะไร ที่ไหน อย่างไร เอกสาร/หลักฐาน ความถี่ และเงื่อนไข/กำหนดเวลา ระบุเลขมาตรา/ข้อเสมอ
   มาตราที่ต้องข้าม เพราะไม่สร้างหน้าที่ให้ใครต้องทำอะไร:
   - มาตราที่บอกชื่อเรียกกฎหมาย ("พระราชกฤษฎีกานี้เรียกว่า…")
   - มาตราที่บอกวันใช้บังคับ (เก็บไปใส่ effective_date แล้ว)
   - มาตราที่บอกว่ารัฐมนตรีคนไหนรักษาการ (เก็บไปใส่ ministry แล้ว)
   - บทนิยาม บทเฉพาะกาล บทยกเลิกกฎหมายเก่า การแต่งตั้งคณะกรรมการ เรื่องกองทุน
   - อำนาจหน้าที่ของหน่วยงานกำกับดูแลหรือพนักงานเจ้าหน้าที่
   ฟิลด์ applicability ต้องระบุให้ชัดว่าข้อนั้นใช้กับใคร โดยเฉพาะเมื่อผู้มีหน้าที่ไม่ใช่บริษัทผู้อ่าน
   (เช่น "บุคคลธรรมดาเท่านั้น" "เฉพาะผู้รับใบอนุญาต" "ผู้ให้บริการตรวจวัด ไม่ใช่บริษัท")
   เพื่อให้ผู้ตรวจรู้ทันทีว่าข้อไหนบริษัทต้องทำเอง ข้อไหนแค่ต้องรู้
เลือกหมวดจากรายการนี้เท่านั้น:
   ${list}
   ใช้ได้เฉพาะ ${codes} เท่านั้น — ห้ามคิดรหัสหมวดใหม่ ถ้าไม่เข้าหมวดใดเลยให้ใช้ ${fallbackCat}
5) ระบุกฎหมายที่ถูกอ้างถึงในตัวบท ซึ่งจำเป็นต้องรู้เนื้อหาด้วยจึงจะปฏิบัติตามได้ครบ ได้แก่ กฎหมายแม่ที่ฉบับนี้ออกตามความใน / มาตราของกฎหมายฉบับอื่นที่ถูกอ้าง / ประกาศหรือหลักเกณฑ์ที่ตัวบทบอกให้ไปดูต่อ
   ใส่เฉพาะที่ตัวบทอ้างถึงจริง ห้ามใส่กฎหมายที่แค่เกี่ยวข้องกว้างๆ ในหัวข้อเดียวกัน
   appears_in ต้องคัดข้อความจากตัวบทที่ได้รับมา "คำต่อคำ" ตรงจุดที่เอ่ยถึงฉบับนั้น อย่างน้อย 15 ตัวอักษร
   ห้ามเรียบเรียงใหม่ ห้ามใส่แค่เลขมาตรา ห้ามเขียนอธิบายเอง — ระบบจะเอาข้อความนี้ไปเทียบกับตัวบทจริง
   ถ้าคัดข้อความมายืนยันไม่ได้ แปลว่าตัวบทไม่ได้อ้างถึงฉบับนั้นจริง ห้ามใส่ลง related_laws
   ต้องใส่ needs_lookup ทุกฉบับ — ไม่ใส่ ระบบจะถือว่าไม่ต้องดึง
   ตั้ง needs_lookup ให้ถูก เพราะระบบจะตามไปดึงตัวบทจริงมาเฉพาะตัวที่เป็น true:
   - true  = ไม่รู้เนื้อหาฉบับนั้นแล้วปฏิบัติไม่ครบ เช่น ประกาศ/กฎกระทรวงที่ตัวบทบอกให้ไปดูหลักเกณฑ์ต่อ
             หรือมาตราของกฎหมายอื่นที่กำหนดคุณสมบัติ ตัวเลข หรือขั้นตอนที่ต้องทำตาม
   - false = อ้างชื่อไว้เฉยๆ โดยเนื้อความในข้อนั้นครบถ้วนอยู่แล้ว ไม่ต้องเปิดฉบับนั้นก็ทำตามได้ เช่น
             อ้างเป็นเงื่อนไข "ห้ามใช้สิทธิซ้ำกับกิจการที่ได้รับยกเว้นตามกฎหมาย ก / ข / ค"
             อ้างเป็นบทให้อำนาจตรากฎหมาย (รัฐธรรมนูญ มาตราที่ให้อำนาจออกกฎหมายลำดับรอง)
             อ้างเพื่อบอกว่ากฎหมายฉบับนั้นถูกยกเลิก หรืออ้างชื่อกฎหมายในบทนิยามเฉยๆ
   ตั้ง false ไว้ก่อนเมื่อไม่แน่ใจ — ดึงเกินทำให้ได้รายการ "หาตัวบทไม่พบ" ที่ผู้ใช้ไม่ได้ต้องการ

การเขียนข้อความ (สำคัญมาก — คนอ่านคือ จป. และพนักงานทั่วไป ไม่ใช่นักกฎหมาย):
- เขียนเป็นภาษาที่คนทั่วไปอ่านรอบเดียวเข้าใจ ห้ามคัดลอกสำนวนกฎหมายมาตรงๆ ให้เรียบเรียงใหม่ทั้งประโยค
- บอกให้ชัดว่า "ต้องทำอะไร" ขึ้นต้นประโยคด้วยสิ่งที่ต้องทำ อ่านจบในตัว ไม่ต้องเปิดกฎหมายฉบับอื่นประกอบ
- ห้ามใส่เลขมาตรา/เลขข้อ/เลขวรรคในตัวข้อความ req_text เก็บไว้ในฟิลด์ section_ref อย่างเดียว
  ห้ามเขียน "ตามวรรคสอง" "ตามมาตรา 9" "ตาม (1)" ในเนื้อความ ให้เขียนสาระของสิ่งนั้นออกมาแทน
- ใช้ "บริษัท" เป็นประธาน แทน "ผู้ประกอบกิจการ" "นายจ้าง" "ผู้รับใบอนุญาต" หรือ "ผู้ควบคุมข้อมูลส่วนบุคคล"
- เจอ "ตามที่อธิบดีกำหนด" "ตามที่รัฐมนตรีประกาศกำหนด" หรือ "ตามหลักเกณฑ์ที่กำหนดในกฎกระทรวง"
  → ถ้าประกาศ/กฎกระทรวงฉบับนั้นอยู่ในเอกสารที่ได้รับ ให้เอาตัวเลขและเกณฑ์จริงมาเขียนลงในข้อนั้นเลย
  → ถ้าไม่อยู่ในเอกสารที่ได้รับ ให้ใส่ชื่อประกาศ/กฎกระทรวงฉบับนั้นลงใน related_laws (needs_lookup: true)
     เพื่อให้ระบบตามไปดึงตัวบทมาให้
  ห้ามจบข้อด้วย "ตามที่กำหนด" เฉยๆ เพราะผู้อ่านจะยังไม่รู้ว่าต้องทำเท่าไหร่
- ห้ามใช้คำเหล่านี้ ใช้คำในวงเล็บแทน: ดำเนินการ (ทำ) · จัดให้มี (ต้องมี) · ทั้งนี้ (ตัดทิ้ง)
  ดังกล่าว (เขียนชื่อสิ่งนั้นซ้ำ) · ตามที่กำหนด (ระบุว่าคืออะไร) · โดยอนุโลม (ให้ใช้แบบเดียวกัน) · มิให้ (ห้าม)
  นิติบุคคล (บริษัท) · พึง (ควร) · แห่ง/ซึ่ง/อัน (ตัดทิ้งหรือเขียนใหม่) · โดยมิชักช้า (ทันที)
  อาทิ (เช่น) · หากแต่ (แต่) · เพื่อการนี้ (ตัดทิ้ง)
- ตัวเลขใช้เลขอารบิกพร้อมหน่วยเต็ม เช่น "ปีละ 1 ครั้ง" "ปรับสูงสุด 400,000 บาท" "ไม่เกิน 34 องศาเซลเซียส"
  ห้ามเขียนว่า "ตามระยะเวลาที่กฎหมายกำหนด" หรือ "ปรับไม่เกินสี่แสนบาท"
- ค่าปรับ/โทษ ให้เขียนเป็นเลขอารบิกพร้อมหน่วยเต็มไว้ในฟิลด์ other_terms ของข้อนั้น
  ห้ามเขียนว่า "มีโทษตามที่กฎหมายกำหนด"

ห้ามแต่งเติม (สำคัญที่สุด — ผิดพลาดตรงนี้ทำให้ทะเบียนกฎหมายใช้ตรวจ ISO ไม่ได้):
- ใช้ได้เฉพาะสิ่งที่เขียนอยู่ในเอกสารที่ได้รับเท่านั้น ห้ามเติมจากความจำหรือจากกฎหมายฉบับอื่น
- ไม่มีในเอกสาร = เว้นฟิลด์นั้นว่าง ห้ามเดา · การเว้นว่างปลอดภัยกว่าการเดาเสมอ
- กฎหมายหลายฉบับไม่มีบทกำหนดโทษ (เช่น กฎหมายที่ให้สิทธิยกเว้นภาษี) → เว้น other_terms ว่าง
  ห้ามสร้างค่าปรับขึ้นมาเอง ห้ามยืมอัตราโทษจากกฎหมายฉบับอื่นที่เรื่องคล้ายกัน
- ห้ามเติมความถี่ ผู้รับผิดชอบ หรือเอกสารที่ตัวบทไม่ได้กำหนด — เว้นว่างแล้วให้ผู้ใช้เติมเอง
- ตัวเลข วันที่ และเกณฑ์ทุกตัวต้องคัดจากตัวบทจริง ห้ามปัดเศษ ห้ามประมาณ
- ค่าปรับ/โทษ ให้เขียนเป็นเลขอารบิกพร้อมหน่วยเต็มไว้ในฟิลด์ other_terms ของข้อนั้น
  ห้ามเขียนว่า "มีโทษตามที่กฎหมายกำหนด"
ตอบกลับเป็น JSON เท่านั้น ไม่มีคำอธิบายอื่น ไม่มี markdown:
{"law":{"name":"","type":"","ministry":"","announce_date":"วว/ดด/ปปปป","effective_date":"วว/ดด/ปปปป","documents":"","cat":"LA","code_suggestion":"","gazette_ref":"เล่ม 143 ตอนที่ 17 ก หน้า 4-7 หรือค่าว่าง"},
 "repeals":[{"law_name":"ชื่อกฎหมายที่ตัวบทสั่งให้ยกเลิก","clause":"มาตราที่สั่งยกเลิก"}],
 "requirements":[{"section_ref":"มาตรา X","req_text":"","responsible":"","applicability":"","method":"","documents":"","frequency":"","other_terms":""}],
 "related_laws":[{"law_name":"","clause":"มาตรา 9 หรือ null ถ้าอ้างทั้งฉบับ","appears_in":"ข้อความจากตัวบทจริงคำต่อคำ ตรงจุดที่เอ่ยถึงฉบับนี้","why_needed":"ทำไมต้องรู้เนื้อหานี้ถึงจะปฏิบัติตามได้","needs_lookup":true}]}
ถ้าเอกสารที่ได้รับไม่ใช่ตัวบทกฎหมายไทยเลย (เช่น เป็นข่าว บทความ แบบฟอร์มเปล่า หรือเอกสารที่อ่านไม่ออก) ให้ตอบเป็น JSON นี้แทน ห้ามตอบเป็นข้อความธรรมดา:
{"status":"not_a_law","reason":"อธิบายสั้นๆ ว่าเอกสารนี้คืออะไร และทำไมจึงสรุปเป็นทะเบียนกฎหมายไม่ได้"}`
}

// error จาก Claude API เป็นภาษาอังกฤษล้วน เด้งดิบๆ ให้ จป. เห็นแล้วไม่รู้ว่าต้องทำอะไรต่อ
// แปลงเคสที่เจอบ่อยเป็นภาษาไทยพร้อมบอกว่าใครต้องแก้ · เคสอื่นคงข้อความเดิมไว้ให้ debug ได้
function friendlyApiError(raw){
  const t = String(raw || '')
  if(/credit balance is too low|insufficient.*credit/i.test(t))
    return 'เครดิต AI หมด — กรุณาแจ้งผู้ดูแลระบบให้เติมเครดิตที่บัญชี Anthropic API'
  if(/rate_limit|rate limit/i.test(t))
    return 'เรียกใช้ AI ถี่เกินไป — กรุณารอสักครู่แล้วลองใหม่'
  if(/authentication_error|invalid x-api-key|permission_error/i.test(t))
    return 'คีย์ AI ไม่ถูกต้องหรือหมดสิทธิ์ — กรุณาแจ้งผู้ดูแลระบบตรวจสอบ ANTHROPIC_API_KEY ใน Vercel'
  if(/overloaded_error/i.test(t))
    return 'ระบบ AI ไม่ว่างชั่วคราว — กรุณาลองใหม่อีกครั้งในอีกสักครู่'
  return 'เรียก Claude API ไม่สำเร็จ: ' + t.slice(0, 500)
}

function strip(html){
  return html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ')
             .replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim()
}

// ── ด่านตรวจ "ตัวบทอ้างถึงฉบับนั้นจริงหรือเปล่า" ก่อนปล่อยให้ Skill 3 ไปดึง ─────────
// เดิมเชื่อรายการ related_laws ที่โมเดลส่งมาตรงๆ · โมเดลใส่กฎหมายที่แค่ "เกี่ยวข้องในหัวข้อเดียวกัน"
// ปนมาได้ แล้วระบบก็ไล่ดึงจนเสียเงินฟรีและได้รายการ "หาตัวบทไม่พบ" ที่ผู้ใช้ไม่ได้ต้องการ
// ภาษาไทยไม่เว้นวรรคระหว่างคำ ตัดช่องว่างทิ้งทั้งหมดก่อนเทียบจึงแม่นกว่าเทียบทั้งสตริง
function normText(s){
  return String(s || '')
    .replace(/[\u200b\u00ad\ufeff]/g,'')   // zero-width space / soft hyphen / BOM ที่ PDF-HTML ชอบแทรก
    .replace(/[\s\u00a0]+/g,'')             // ช่องว่างทุกชนิดรวม non-breaking space
}
const MIN_QUOTE = 12          // ข้อความยืนยันสั้นกว่านี้ไม่พอชี้ว่าอ้างถึงจริง
const MIN_NAME_MATCH = 15     // ชื่อกฎหมายสั้นกว่านี้ไปโผล่ในตัวบทโดยบังเอิญได้

// ── แตกข้อความจาก PDF ฝั่ง server เพื่อให้ด่านตรวจการอ้างถึงมีตัวบทไว้เทียบ ──
// ราชกิจจาฯ ฝังฟอนต์แบบ subset ที่ตาราง ToUnicode ไม่ครบ บางฉบับจึงแตกออกมาเป็นขยะ
// ทดสอบจริง 2026-08-15 (4 ฉบับจาก ratchakitcha.soc.go.th): ใช้ได้ 2 · เพี้ยน 2
// เอาข้อความเพี้ยนไปเทียบ = ตัดการอ้างถึงที่ถูกต้องทิ้ง ซึ่งแย่กว่าไม่ตรวจเลย
// จึงต้องวัดคุณภาพก่อนใช้ทุกครั้ง · ไม่ผ่าน = ถอยไปโหมดตรวจอ่อน (ดูแค่ว่ามีข้อความยืนยันมั้ย)
const PDF_MARKERS = ['ราชกิจจานุเบกษา','พระราช','อาศัยอำนาจ','มาตรา','ประกาศ','รัฐมนตรี','ให้ไว้ ณ วันที่']
const PDF_MIN_THAI = 0.6      // ตัวบทไทยจริงต้องมีอักขระไทยหนาแน่น ต่ำกว่านี้แปลว่าถอดรหัสไม่ออก
const PDF_MIN_MARKERS = 2     // ตัวบทกฎหมายไทยต้องมีคำพวกนี้ ไม่เจอ = เชื่อผลที่แตกได้ไม่ได้

function pdfTextUsable(t){
  if(!t || t.length < 300) return false
  const thai = (t.match(/[฀-๿]/g) || []).length
  if(thai / t.length < PDF_MIN_THAI) return false
  return PDF_MARKERS.filter(m => t.includes(m)).length >= PDF_MIN_MARKERS
}

// คืนข้อความที่ใช้เทียบได้จริงเท่านั้น · แตกไม่ได้/คุณภาพไม่ผ่าน คืนค่าว่าง (ไม่ throw)
async function pdfToText(bytes){
  if(!bytes || !bytes.length) return ''
  let parser
  try{
    // โหลดตอนใช้จริงเท่านั้น — pdf-parse ลาก pdfjs มาด้วยราว 57MB ถ้า import ที่หัวไฟล์
    // แล้วโหลดไม่ขึ้นบน serverless จะทำให้ทั้ง endpoint ตาย ไม่ใช่แค่ฟีเจอร์ตรวจ PDF เสีย
    // ทางข้อความ/ลิงก์เว็บไม่ต้องใช้ตัวนี้เลย จึงไม่ควรจ่ายค่า cold start ไปด้วย
    const { PDFParse } = await import('pdf-parse')
    parser = new PDFParse({ data: bytes, verbosity: 0 })
    const t = String((await parser.getText())?.text || '')
    return pdfTextUsable(t) ? t : ''
  }catch{ return '' }
  finally{ try{ await parser?.destroy?.() }catch{} }
}

// คืน { kept, rejected } — kept เท่านั้นที่จะถูกส่งไป Skill 3
// sourceText ว่าง (กรณีแนบ PDF — ตัวบทอยู่ที่ Claude ไม่ได้อยู่ที่เรา) จะตรวจได้แค่ว่ามีข้อความยืนยันมั้ย
function verifyRelatedRefs(refs, sourceText){
  const hay = normText(sourceText)
  const canMatch = hay.length > 200      // สั้นกว่านี้แปลว่าไม่ใช่ตัวบท (เช่นเป็น URL เปล่า)
  const kept = [], rejected = []
  for(const r of (Array.isArray(refs) ? refs : [])){
    const name = String(r?.law_name || '').trim()
    if(!name) continue
    const quote = normText(r.appears_in)
    if(quote.length < MIN_QUOTE){
      rejected.push({ ...r, reject_reason: 'ไม่ได้คัดข้อความจากตัวบทมายืนยันว่าอ้างถึงจริง' })
      continue
    }
    if(canMatch){
      // ผ่านได้ 2 ทาง: ข้อความที่คัดมาอยู่ในตัวบทจริง หรือชื่อกฎหมายโผล่ในตัวบทตรงๆ
      // (ทางหลังกันกรณีโมเดลคัดข้อความมาเพี้ยนเล็กน้อย แต่การอ้างถึงมีจริง)
      const nameKey = normText(name.replace(/พ\.?ศ\.?\s*\d{4}\s*$/,''))
      const ok = hay.includes(quote) || (nameKey.length >= MIN_NAME_MATCH && hay.includes(nameKey))
      if(!ok){
        rejected.push({ ...r, reject_reason: 'ยืนยันกับตัวบทไม่ได้ — ไม่พบทั้งข้อความที่อ้างว่าคัดมาและชื่อกฎหมายนี้ในตัวบท' })
        continue
      }
    }
    kept.push(r)
  }
  return { kept, rejected }
}

// ── โดเมนที่อนุญาตให้ fetch ได้ (กัน SSRF) — เฉพาะเว็บราชการ/แหล่งกฎหมาย รวม subdomain ──
// กลุ่มบน = SHE เดิม · กลุ่มล่าง = หน่วยงานเจ้าของกฎหมายด้านอื่นขององค์กร (หมวด LF)
const ALLOWED_HOSTS = [
  'ratchakitcha.soc.go.th','dlpw.go.th','labour.go.th','shawpat.or.th','ddc.moph.go.th','moph.go.th','diw.go.th',
  'krisdika.go.th',      // สำนักงานคณะกรรมการกฤษฎีกา — ตัวบทรวมฉบับแก้ไขล่าสุด
  'nbtc.go.th',          // กสทช. — ประกาศด้านโทรคมนาคม
  'mdes.go.th',          // กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม
  'pdpc.or.th',          // สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล (PDPA)
  'ncsa.or.th',          // สำนักงานคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์
  'ipthailand.go.th',    // กรมทรัพย์สินทางปัญญา — ลิขสิทธิ์/ความลับทางการค้า
  'rd.go.th',            // กรมสรรพากร
  'sso.go.th',           // สำนักงานประกันสังคม
  'pcd.go.th',           // กรมควบคุมมลพิษ
  'onep.go.th',          // สผ. — สิ่งแวดล้อม
  'dbd.go.th',           // กรมพัฒนาธุรกิจการค้า
]
function isAllowedUrl(u){
  try{
    const url = new URL(u)
    if(url.protocol!=='http:' && url.protocol!=='https:') return false
    const host = url.hostname.toLowerCase()
    return ALLOWED_HOSTS.some(d => host===d || host.endsWith('.'+d))
  }catch{ return false }
}

// ── การป้องกันขั้นต่ำ 2 ชั้น ──
// TODO: การป้องกันจริงต้องใช้ Supabase Auth JWT เมื่อเลิกโหมด demo
//       (rate-limit ในหน่วยความจำใช้ไม่ได้ข้าม serverless instance — เป็นเพียงเบรกชั่วคราว)
// (ก) ตรวจ Origin/Referer ว่ามาจากโดเมนของแอปเอง (อ่านจาก env ALLOWED_ORIGIN)
function sameOrigin(req){
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
function clientIp(req){ return String(req.headers['x-forwarded-for']||'').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown' }
function rateLimited(ip){
  const now = Date.now()
  const hits = (rateMap.get(ip)||[]).filter(t => now-t < RATE_WINDOW)
  hits.push(now); rateMap.set(ip, hits)
  return hits.length > RATE_LIMIT
}

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'POST only'})
  if(!sameOrigin(req)) return res.status(403).json({error:'คำขอไม่ได้มาจากโดเมนของแอป'})
  if(rateLimited(clientIp(req))) return res.status(429).json({error:'เรียกใช้งานถี่เกินไป กรุณารอสักครู่แล้วลองใหม่'})
  if(!SUPA_URL||!SUPA_KEY) return res.status(500).json({error:'ยังไม่ได้ตั้งค่า Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)'})
  if(!process.env.ANTHROPIC_API_KEY) return res.status(500).json({error:'ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY ใน Vercel'})
  try{
    // stage=false (P12): ข้ามการเขียน lg_import_staging แล้ว return JSON ให้ client ไปเก็บเอง
    // (default true = พฤติกรรมเดิม เพื่อความ backward-compatible)
    // pdfBase64 (P12): แนบไฟล์ PDF ให้ Claude อ่านเป็นเอกสารโดยตรง (base64, ไม่มีส่วน data: นำหน้า)
    const { source='', kind='auto', sourceUrl='', stage=true, pdfBase64='', pdfName='' } = req.body||{}
    const hasPdf = !!(pdfBase64 && pdfBase64.length)
    if(!hasPdf && !source.trim()) return res.status(400).json({error:'กรุณาใส่ URL, วางตัวบทกฎหมาย หรือแนบไฟล์ PDF'})
    // กัน request body เกินลิมิตของ Vercel (~4.5MB) — base64 ~6M ≈ ไฟล์ ~4.5MB
    if(hasPdf && pdfBase64.length > 6_000_000) return res.status(413).json({error:'ไฟล์ PDF ใหญ่เกินไป — กรุณาแยกไฟล์ หรือ copy ตัวบทมาวางแทน'})
    let text = source, srcUrl = '', pdfUrl = '', pdfBytes = null
    const isUrl = !hasPdf && /^https?:\/\//i.test(source.trim())
    if(isUrl && kind!=='text'){
      srcUrl = source.trim()
      if(!isAllowedUrl(srcUrl)) return res.status(400).json({error:'รองรับเฉพาะเว็บราชการ/แหล่งกฎหมายที่กำหนดไว้เท่านั้น'})
      const r = await fetch(srcUrl,{headers:{'user-agent':'Mozilla/5.0 LexRegistry'}})
      const ct = r.headers.get('content-type')||''
      if(ct.includes('pdf') || /\.pdf($|\?|#)/i.test(srcUrl)){
        pdfUrl = srcUrl   // ลิงก์เป็น PDF → ให้ Claude ดึงและอ่านเอง (url document source)
        // เก็บไฟล์ที่โหลดมาแล้วไว้แตกข้อความให้ด่านตรวจ — ไม่ต้องโหลดซ้ำรอบสอง
        try{
          const buf = await r.arrayBuffer()
          if(buf.byteLength && buf.byteLength <= 8_000_000) pdfBytes = new Uint8Array(buf)
        }catch{ /* อ่าน body ไม่ได้ = ตรวจแบบอ่อนแทน ไม่ใช่เหตุให้ล้ม */ }
      } else {
        text = strip(await r.text()).slice(0,60000)
        if(text.length<200) return res.status(422).json({error:'ดึงเนื้อหาจากหน้าได้น้อยเกินไป ลองวางตัวบทเป็นข้อความ หรือแนบไฟล์ PDF'})
      }
    }
    // PDF แนบไฟล์ → base64 document · ลิงก์ PDF → url document (Claude ดึงเอง) · ข้อความ/HTML → text
    const userContent = hasPdf
      ? [ { type:'document', source:{ type:'base64', media_type:'application/pdf', data:pdfBase64 } },
          { type:'text', text:`ไฟล์ PDF ตัวบทกฎหมาย${pdfName?` (${pdfName})`:''}${sourceUrl?` · ลิงก์: ${sourceUrl}`:''} — โปรดอ่านและสรุปตามรูปแบบที่กำหนด` } ]
      : pdfUrl
        ? [ { type:'document', source:{ type:'url', url:pdfUrl } },
            { type:'text', text:`ไฟล์ PDF ตัวบทกฎหมายจากลิงก์ ${pdfUrl} — โปรดอ่านและสรุปตามรูปแบบที่กำหนด` } ]
        : `ตัวบทกฎหมาย${srcUrl?` (จาก ${srcUrl})`:''}:\n\n${text}`
    // ส่งไฟล์ PDF (base64 หรือ url document) ต้องเปิด beta header ให้ Claude อ่าน PDF ได้
    const sendingPdf = hasPdf || !!pdfUrl
    const apiHeaders = {'content-type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'}
    if(sendingPdf) apiHeaders['anthropic-beta'] = 'pdfs-2024-09-25'
    const ar = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:apiHeaders,
      // cache_control · system prompt ~4,600 token เหมือนกันทุกครั้ง — cache ไว้ให้อ่านซ้ำ
      // ราคาส่วนที่ cache เหลือ ~10% และ prefill เร็วขึ้น · เนื้อหาที่ส่งเหมือนเดิมทุกตัวอักษร
      // (ขั้นต่ำที่ cache ได้ของ Sonnet คือ 1,024 token — system เราเกินอยู่แล้ว)
      body:JSON.stringify({model:MODEL,max_tokens:16000,
        system:[{type:'text',text:buildSystem(await fetchCats()),cache_control:{type:'ephemeral'}}],
        messages:[{role:'user',content:userContent}]})
    })
    if(!ar.ok) return res.status(502).json({error: friendlyApiError(await ar.text())})
    const data = await ar.json()
    let txt = (data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('').trim()
    txt = txt.replace(/^```json\s*/i,'').replace(/```$/,'').trim()
    let parsed
    try{ parsed = JSON.parse(txt) }
    catch{
      // แยกสาเหตุ: ตอบไม่จบเพราะ token หมด (กฎหมายยาวเกิน) vs. รูปแบบผิดจริงๆ
      if(data.stop_reason === 'max_tokens') return res.status(500).json({
        error:'กฎหมายยาวเกินไป AI สรุปไม่จบใน 1 ครั้ง — กรุณาแบ่งเป็นส่วนๆ (เช่น ครั้งละ 3-4 หน้า) แล้วสรุปทีละส่วน',
        stop_reason:'max_tokens'})
      return res.status(500).json({error:'แปลงผลลัพธ์เป็น JSON ไม่ได้',raw:txt.slice(0,400)})
    }
    // เอกสารไม่ใช่ตัวบทกฎหมาย — บอกเหตุผลจริงจาก AI แทนข้อความ "แปลง JSON ไม่ได้" ที่ชวนเข้าใจผิด
    if(parsed.status === 'not_a_law') return res.status(422).json({
      error: 'เอกสารนี้ไม่ใช่ตัวบทกฎหมาย — ' + (parsed.reason || 'สรุปเป็นทะเบียนกฎหมายไม่ได้'),
      status: 'not_a_law'})
    const law = parsed.law||{}
    // Skill 3 · ดึงข้อกำหนดจากกฎหมายที่ตัวบทอ้างถึง มารวมเป็นชุดเดียวกับของฉบับหลัก
    // (กฎกระทรวงมักไม่เขียนซ้ำสิ่งที่อยู่ใน พ.ร.บ.แม่ — อ่านฉบับเดียวจึงตกข้อกำหนด)
    let merged = { requirements: parsed.requirements||[], related_laws:[], related_count:0, unresolved_count:0 }
    // ตรวจก่อนดึง — ปล่อยเฉพาะฉบับที่ยืนยันได้ว่าตัวบทอ้างถึงจริง (กันดึงมั่วจนเสียเงินฟรี)
    // ฉบับที่ตกด่านไม่ได้หายไปเงียบๆ — ส่งกลับไปแสดงในตาราง "กฎหมายที่อ้างถึง" พร้อมเหตุผล
    // ทาง PDF ไม่มีตัวบทเป็นข้อความอยู่แล้ว ต้องแตกเอง · แตกไม่ได้ = ตรวจแบบอ่อน
    // ห่อ Uint8Array อีกชั้นเพื่อให้ได้ byteOffset 0 เสมอ — Buffer เล็กๆ ใช้ pool ร่วมกัน
    // ซึ่ง pdfjs อ่านผิดตำแหน่งได้ (ไฟล์ PDF จริงมักใหญ่พอจนไม่โดน แต่กันไว้ไม่มีต้นทุน)
    const verifyText = hasPdf ? await pdfToText(new Uint8Array(Buffer.from(pdfBase64,'base64')))
      : pdfBytes ? await pdfToText(pdfBytes)
      : text
    const { kept: verifiedRefs, rejected: rejectedRefs } = verifyRelatedRefs(parsed.related_laws, verifyText)
    if(verifiedRefs.length){
      try{
        merged = await relateAndMerge(verifiedRefs, parsed.requirements||[], law.name||'')
      }catch(e){
        console.error('osh-law-relate failed:', e)
        // ล้มเหลวต้องไม่ทำให้การสรุปทั้งหมดพัง — ใช้ผลของฉบับหลักต่อไปตามเดิม
        merged = { requirements: parsed.requirements||[], related_laws:[], related_count:0, unresolved_count:0 }
      }
    }
    const reqs = merged.requirements
    const batch = 'api-'+Date.now()
    const rows = reqs.map((r,i)=>({
      batch, law_code: law.code_suggestion||('NEW-'+Date.now()%10000), law_name: law.name||'',
      cat: law.cat||'LA', ministry: law.ministry||'',
      issue_date: law.announce_date||law.issue_date||'',
      announce_date: law.announce_date||'', effective_date: law.effective_date||'', doc_list: law.documents||'',
      req_seq: i, section_ref: r.section_ref||'', req_text: r.req_text||'', responsible: r.responsible||'',
      applicability: r.applicability||'', method: r.method||'', documents: r.documents||'',
      // กรณีวางตัวบทเป็นข้อความ (ไม่มี URL ที่ fetch) ให้ใช้ "ลิงก์ตัวบทจริง" ที่ผู้ใช้กรอกมา
      frequency: r.frequency||'', other_terms: r.other_terms||'', source_url: srcUrl || (sourceUrl||'').trim(), status:'proposed',
      from_related_law: r.from_related_law||null,
      gazette_ref: law.gazette_ref||null   // mig 037 · เลขอ้างอิงราชกิจจาฯ ติดไปกับกฎหมายตอนอนุมัติ
    }))
    if(stage && rows.length){
      const sr = await fetch(`${SUPA_URL}/rest/v1/lg_import_staging`,{method:'POST',
        headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY,'content-type':'application/json',Prefer:'return=minimal'},
        body:JSON.stringify(rows)})
      if(!sr.ok) return res.status(502).json({error:'บันทึกลง staging ไม่สำเร็จ: '+(await sr.text()).slice(0,200)})
    }
    // repeals · ส่งชื่อกฎหมายที่ถูกยกเลิกกลับไปให้หน้าเว็บจับคู่กับทะเบียนเอง
    // (หน้าสรุปมีรายการกฎหมายทั้งทะเบียนอยู่แล้ว จับคู่ฝั่ง client ได้ ไม่ต้องยิง DB ซ้ำ)
    const repeals = Array.isArray(parsed.repeals)
      ? parsed.repeals.filter(x => x && String(x.law_name||'').trim())
          .map(x => ({ law_name: String(x.law_name).trim(), clause: String(x.clause||'').trim() }))
      : []
    // ฉบับที่ถูกด่านตัดก่อนดึง ต่อท้ายรายการเดียวกัน เพื่อให้ จป. เห็นว่า AI อ้างถึงอะไรบ้างแล้วทำไมไม่ดึง
    const rejectedRows = rejectedRefs.map(r => ({
      law_name: String(r.law_name||'').trim(), clause: String(r.clause||'').trim() || 'ทั้งฉบับ',
      status:'rejected', depth:0, via:'', source_url:'', resolved_text:'', confidence:'',
      note: r.reject_reason || 'ยืนยันการอ้างถึงไม่ได้', from_cache:false, req_count:0 }))
    return res.status(200).json({law,count:reqs.length,batch,requirements:reqs,repeals,
      related_laws:[...merged.related_laws, ...rejectedRows],
      related_count:merged.related_count, unresolved_count:merged.unresolved_count,
      rejected_count:rejectedRows.length})
  }catch(e){ return res.status(500).json({error:String(e&&e.message||e)}) }
}
