// Vercel serverless function — Skills 1+2 (osh-law-fetch + osh-law-analyze) behind the Analysis page.
// Fetches a law (URL or pasted text), asks Claude to summarize it into registry-ready requirements,
// and stages them in lg_import_staging for the user to approve on the "นำเข้า/รออนุมัติ" page.
// No hardcoded fallbacks — secrets must come from the environment (never committed to git).
import { relateAndMerge, inlineSectionRefs } from './_lib/osh-law-relate.js'
import { flagUnverifiedNumbers } from './_lib/verify-numbers.js'
import { resolveEffectiveDate } from './_lib/effective-date.js'
import { sameOrigin, clientIp, rateLimited } from './_lib/guard.js'

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
2) ระบุ "วันที่ประกาศ" (วันที่ลงราชกิจจานุเบกษา) และ "กฎการบังคับใช้"
   ห้ามบวกวันเอง — ระบบจะคำนวณวันที่ให้จากกฎที่คุณระบุ เพราะการบวกวันข้ามเดือนข้ามปี
   และปีอธิกสุรทินเป็นงานที่โค้ดทำได้แม่นกว่า · หน้าที่คุณคืออ่านตัวบทแล้วบอกว่าใช้กฎข้อไหน
   ใส่ลงฟิลด์ effective_rule ตามนี้:
   - "ตั้งแต่วันถัดจากวันประกาศในราชกิจจานุเบกษาเป็นต้นไป" → {"type":"next_day"}
   - "ตั้งแต่วันประกาศในราชกิจจานุเบกษาเป็นต้นไป" → {"type":"same_day"}
   - "เมื่อพ้นกำหนด N วันนับแต่วันประกาศ" (หรือนับแต่วันถัดจากวันประกาศ) → {"type":"after_days","days":N}
     N ที่เขียนเป็นคำไทยให้แปลงเป็นเลข ("หนึ่งร้อยแปดสิบวัน" → 180 · "เก้าสิบวัน" → 90)
   - ระบุวันที่ตรงๆ เช่น "ตั้งแต่วันที่ 1 มกราคม 2570" → {"type":"fixed_date","date":"01/01/2570"}
   - ผูกกับเงื่อนไขที่ยังไม่เกิด เช่น "เมื่อมีประกาศกำหนดเขตพื้นที่" → {"type":"conditional"}
     กรณีนี้ให้อธิบายเงื่อนไขไว้ในฟิลด์ documents ด้วย
   - ตัวบทไม่มีข้อไหนบอกวันบังคับใช้เลย → {"type":"not_stated"}
     พบบ่อยในกฎกระทรวง · ห้ามเดาว่าเป็น next_day เด็ดขาด ถ้าไม่มีข้อความรองรับ
   ใส่ excerpt = ข้อความจากตัวบทที่บอกวันบังคับใช้ คัดคำต่อคำ (จำเป็นสำหรับ 4 แบบแรก)
   คัดมาไม่ได้ = ตัวบทไม่ได้เขียนไว้ ให้ใช้ not_stated ไม่ใช่เดากฎขึ้นมา
   ฟิลด์ effective_date ยังต้องกรอกไว้ด้วย (คำนวณคร่าวๆ ก็ได้) ระบบจะใช้ค่าที่คำนวณเองเป็นหลัก
   และเก็บค่าของคุณไว้เทียบ ถ้าไม่ตรงจะขึ้นเตือนให้ผู้ใช้ตรวจ
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
   ทุกข้อต้อง "อ่านจบในตัว" — ห้ามให้ผู้อ่านต้องไปเปิดมาตราอื่นต่อ
   ถ้าข้อนี้อ้างถึงมาตราอื่น "ในเอกสารฉบับเดียวกันนี้" ให้เขียนสาระของมาตรานั้นออกมาแทนเลขมาตรา เสมอ
   ตัวอย่าง: ตัวบทเขียน "นำไปใช้สิทธิตามมาตรา 4 ไม่ได้" และมาตรา 4 คือสิทธิลดหย่อนค่าเครื่องจักรประหยัดพลังงาน
   → เขียนว่า "ค่าอุปกรณ์ที่ใช้สิทธินี้แล้ว นำไปใช้สิทธิลดหย่อนค่าเครื่องจักรประหยัดพลังงานซ้ำไม่ได้"
   → ห้ามเขียนว่า "นำไปใช้สิทธิตามมาตรา 4 ไม่ได้"
   มาตราที่มีอนุมาตรา (๑) (๒) (๓) ให้แตกเป็นข้อละอนุมาตรา ห้ามรวบเป็นข้อเดียว
   ห้ามข้ามอนุมาตราใดเพราะคิดว่าไม่สำคัญ — ข้อที่หายไปคือข้อที่ผู้ตรวจ ISO จะถามหา
   ข้อที่มี "ตัวเลข" (อัตรา วงเงิน วันที่ จำนวนวัน ระดับ ความถี่ ระยะเวลา) ต้องมี source_excerpt
   คัดข้อความจากตัวบทจริงคำต่อคำ "เฉพาะช่วงประโยคที่มีตัวเลขนั้น" ไม่เกิน 200 ตัวอักษร
   ไม่ต้องคัดทั้งข้อ · ระบบจะตรวจว่าตัวเลขใน req_text มีอยู่จริงในข้อความที่คัดมา
   ข้อที่ไม่มีตัวเลขเลย ให้เว้น source_excerpt ว่างไว้
   (กฎหมายที่มีหลายสิบข้อจะทำให้คำตอบยาวจนสรุปไม่จบถ้าคัดข้อความมาทุกข้อ)
   ฟิลด์ applicability ต้องระบุให้ชัดว่าข้อนั้นใช้กับใคร โดยเฉพาะเมื่อผู้มีหน้าที่ไม่ใช่บริษัทผู้อ่าน
   (เช่น "บุคคลธรรมดาเท่านั้น" "เฉพาะผู้รับใบอนุญาต" "ผู้ให้บริการตรวจวัด ไม่ใช่บริษัท")
   เพื่อให้ผู้ตรวจรู้ทันทีว่าข้อไหนบริษัทต้องทำเอง ข้อไหนแค่ต้องรู้
เลือกหมวดจากรายการนี้เท่านั้น:
   ${list}
   ใช้ได้เฉพาะ ${codes} เท่านั้น — ห้ามคิดรหัสหมวดใหม่ ถ้าไม่เข้าหมวดใดเลยให้ใช้ ${fallbackCat}
5) ระบุกฎหมายที่ถูกอ้างถึงในตัวบท ซึ่งจำเป็นต้องรู้เนื้อหาด้วยจึงจะปฏิบัติตามได้ครบ ได้แก่ กฎหมายแม่ที่ฉบับนี้ออกตามความใน / มาตราของกฎหมายฉบับอื่นที่ถูกอ้าง / ประกาศหรือหลักเกณฑ์ที่ตัวบทบอกให้ไปดูต่อ
   ใส่เฉพาะที่ตัวบทอ้างถึงจริง ห้ามใส่กฎหมายที่แค่เกี่ยวข้องกว้างๆ ในหัวข้อเดียวกัน
   appears_in ต้องคัดข้อความจากตัวบทที่ได้รับมา "คำต่อคำ" ตรงจุดที่เอ่ยถึงฉบับนั้น 15-120 ตัวอักษร
   ห้ามเรียบเรียงใหม่ ห้ามใส่แค่เลขมาตรา ห้ามเขียนอธิบายเอง — ระบบจะเอาข้อความนี้ไปเทียบกับตัวบทจริง
   ถ้าคัดข้อความมายืนยันไม่ได้ แปลว่าตัวบทไม่ได้อ้างถึงฉบับนั้นจริง ห้ามใส่ลง related_laws
   ต้องใส่ needs_lookup ทุกฉบับ — ไม่ใส่ ระบบจะถือว่าไม่ต้องตามต่อ
   ตั้งตาม ref_type ดังนี้ (เกณฑ์เปลี่ยนจากเดิม เพราะระบบไม่ได้ "ดึงกฎหมายทั้งฉบับ" อีกแล้ว
   แต่ "ตั้งคำถามแล้วหาคำตอบ" ซึ่งถูกกว่าและตรงจุดกว่ามาก):
   - ref_type = "pending"   → ใส่ true เสมอ · ระบบไม่ค้นอะไรเลยและไม่มีค่าใช้จ่าย
     แต่ต้องมีรายการนี้ เพื่อบันทึกว่า "รอประกาศอยู่" ซึ่งแปลว่ายังประเมินความสอดคล้องไม่ได้
     ทิ้งไปเท่ากับผู้ตรวจ ISO จะเห็นข้อนี้เป็น "ไม่สอดคล้อง" ทั้งที่ยังไม่มีอะไรให้ทำตาม
   - ref_type = "whole_law" → ใส่ true เมื่อตั้ง anchor_question ที่ชัดเจนได้
     คือข้อนั้นทิ้งคำถามค้างไว้ว่า "แล้วต้องเท่าไหร่ / กี่ครั้ง / แบบไหน"
     ตั้งคำถามชัดไม่ได้ (เช่น อ้างไว้กว้างๆ ว่าต้องทำตามกฎหมายนั้นด้วย โดยไม่มีประเด็นเจาะจง) → false
   - ref_type = "specific"  → ใส่ true เมื่อไม่รู้เนื้อหามาตรานั้นแล้วปฏิบัติไม่ครบ
   - false = อ้างชื่อไว้เฉยๆ โดยเนื้อความในข้อนั้นครบถ้วนอยู่แล้ว เช่น
             อ้างเป็นเงื่อนไข "ห้ามใช้สิทธิซ้ำกับกิจการที่ได้รับยกเว้นตามกฎหมาย ก / ข / ค"
             อ้างเป็นบทให้อำนาจตรากฎหมาย (รัฐธรรมนูญ มาตราที่ให้อำนาจออกกฎหมายลำดับรอง)
             อ้างเพื่อบอกว่ากฎหมายฉบับนั้นถูกยกเลิก หรืออ้างชื่อกฎหมายในบทนิยามเฉยๆ
   อย่ากลัวการตั้ง true กับ pending และ whole_law ที่มีคำถามชัด — สองกลุ่มนี้คือประโยชน์หลักของระบบ
   สิ่งที่ต้องกลัวคือการอ้างถึงที่ยืนยันกับตัวบทไม่ได้ ซึ่งด่าน appears_in คัดออกให้แล้ว
   for_section = เลขมาตรา/ข้อ "ของฉบับนี้" ที่เป็นจุดอ้างถึง ต้องตรงกับ section_ref ของข้อนั้นเป๊ะๆ
   ระบบใช้ค่านี้เอาคำตอบไปแสดงใต้ข้อที่ถามถึง ใส่ผิด = คำตอบไปโผล่ผิดข้อ

5.1) จำแนกการอ้างถึงลงฟิลด์ ref_type — 3 ชนิดนี้ระบบจัดการคนละแบบสิ้นเชิง
   - "specific"  = อ้างมาตรา/ข้อเจาะจง เช่น "ตามความในมาตรา 31" → ระบบดึงมาตรานั้น
   - "whole_law" = อ้างชื่อกฎหมายโดยไม่ระบุข้อ เช่น "ตามกฎหมายว่าด้วยการควบคุมอาคาร"
   - "pending"   = อ้างสิ่งที่ยังไม่มีตัวบท เช่น "ตามที่รัฐมนตรีประกาศกำหนด"
                   ใส่ issuing_authority (ใครเป็นผู้ออก) และ interim_rule
                   (ตัวบทบอกให้ทำอย่างไรระหว่างรอ — คัดจากตัวบทจริง ไม่มีให้เว้นว่าง ห้ามแต่ง)

5.2) ref_type เป็น "whole_law" ต้องใส่ anchor_question ทุกครั้ง — สำคัญมาก
   กฎหมายที่ถูกอ้างแบบนี้เป็นกฎหมายทั้งชุดหลายร้อยหน้า ส่งชื่อไปค้นตรงๆ จะได้ของที่ไม่เกี่ยวกลับมา
   ผู้อ่านข้อนี้มีคำถามอยู่คำถามเดียว — เขียนคำถามนั้นออกมา
   คำถามที่ใช้ได้ต้องครบ 3 อย่าง:
     (1) เรื่องที่ข้อนั้นพูดถึง (ห้องส้วม / ทางหนีไฟ / การตรวจสุขภาพ)
     (2) บริบทของผู้ถาม (อาคารสำนักงาน สถานประกอบกิจการ ลูกจ้างกี่คน)
     (3) สิ่งที่ต้องการเป็นคำตอบ (จำนวนขั้นต่ำ / ความถี่ / คุณสมบัติ / เอกสาร)
   ตัวอย่างที่ถูก (จากข้อที่เขียนว่า "ต้องมีห้องน้ำและห้องส้วมตามแบบและจำนวนที่กำหนดในกฎหมายควบคุมอาคาร"):
     "อาคารสำนักงานหรือสถานประกอบกิจการ ต้องมีที่ถ่ายอุจจาระ ที่ถ่ายปัสสาวะ และอ่างล้างมือ
      อย่างละกี่ที่ ต่อพื้นที่อาคารหรือจำนวนคนเท่าไร กฎกระทรวงฉบับใด ข้อใด"
   ตัวอย่างที่ผิด (กว้างเกินจนค้นแล้วได้กฎหมายทั้งฉบับ ระบบจะปฏิเสธคำถามแบบนี้):
     "กฎหมายว่าด้วยการควบคุมอาคารกำหนดอะไรบ้าง"

การเขียนข้อความ (สำคัญมาก — คนอ่านคือ จป. และพนักงานทั่วไป ไม่ใช่นักกฎหมาย):
- เขียนเป็นภาษาที่คนทั่วไปอ่านรอบเดียวเข้าใจ ห้ามคัดลอกสำนวนกฎหมายมาตรงๆ ให้เรียบเรียงใหม่ทั้งประโยค
- บอกให้ชัดว่า "ต้องทำอะไร" ขึ้นต้นประโยคด้วยสิ่งที่ต้องทำ อ่านจบในตัว ไม่ต้องเปิดกฎหมายฉบับอื่นประกอบ
- ห้ามใส่เลขมาตรา/เลขข้อ/เลขวรรคในตัวข้อความ req_text เก็บไว้ในฟิลด์ section_ref อย่างเดียว
  ห้ามเขียน "ตามวรรคสอง" "ตามมาตรา 9" "ตาม (1)" ในเนื้อความ ให้เขียนสาระของสิ่งนั้นออกมาแทน
  ข้อยกเว้นเดียว: มาตราที่อ้างถึงอยู่ใน "กฎหมายฉบับอื่น" และเนื้อหาไม่ได้อยู่ในเอกสารที่ได้รับ
  กรณีนั้นให้คงเลขมาตราพร้อมชื่อกฎหมายไว้ (เช่น "ใบกำกับภาษีตามมาตรา 86/4 แห่งประมวลรัษฎากร")
  แล้ว "ต้องใส่กฎหมายฉบับนั้นลง related_laws (needs_lookup: true)" ด้วยเสมอ
  ระบบจะดึงตัวบทมาแล้วเรียบเรียงข้อนี้ใหม่ให้เองในขั้นตอนถัดไป — ห้ามเดาเนื้อหาเองเด็ดขาด
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
  ตัวบทเขียนตัวเลขเป็นคำไทย ให้แปลงเป็นเลขอารบิกอย่างระมัดระวัง
  "ร้อยละห้าสิบ" = 50% (ไม่ใช่ 100%) · "สองแสน" = 200,000 · "๒๕๗๑" = 2571 (ไม่ใช่ 2570)
  อ่านผิดหนึ่งตัวทำให้ทะเบียนใช้ตรวจ ISO ไม่ได้ — อ่านซ้ำก่อนเขียนทุกครั้ง
- ค่าปรับ/โทษ ให้เขียนเป็นเลขอารบิกพร้อมหน่วยเต็มไว้ในฟิลด์ other_terms ของข้อนั้น
  ห้ามเขียนว่า "มีโทษตามที่กฎหมายกำหนด"
ตอบกลับเป็น JSON เท่านั้น ไม่มีคำอธิบายอื่น ไม่มี markdown:
{"law":{"name":"","type":"","ministry":"","announce_date":"วว/ดด/ปปปป","effective_date":"วว/ดด/ปปปป","effective_rule":{"type":"next_day|same_day|after_days|fixed_date|conditional|not_stated","days":0,"date":"","excerpt":"ข้อความจากตัวบทที่บอกวันบังคับใช้"},"documents":"","cat":"LA","code_suggestion":"","gazette_ref":"เล่ม 143 ตอนที่ 17 ก หน้า 4-7 หรือค่าว่าง"},
 "repeals":[{"law_name":"ชื่อกฎหมายที่ตัวบทสั่งให้ยกเลิก","clause":"มาตราที่สั่งยกเลิก"}],
 "requirements":[{"section_ref":"มาตรา X","req_text":"","source_excerpt":"เฉพาะข้อที่มีตัวเลข: ข้อความจากตัวบทช่วงที่มีตัวเลขนั้น ไม่เกิน 200 ตัวอักษร · ข้อที่ไม่มีตัวเลขให้เว้นว่าง","responsible":"","applicability":"","method":"","documents":"","frequency":"","other_terms":""}],
 "related_laws":[{"law_name":"","clause":"มาตรา 9 หรือ null ถ้าอ้างทั้งฉบับ","for_section":"เลขมาตรา/ข้อ ของฉบับนี้ที่เป็นจุดอ้างถึง","appears_in":"ข้อความจากตัวบทจริงคำต่อคำ ตรงจุดที่เอ่ยถึงฉบับนี้","why_needed":"ทำไมต้องรู้เนื้อหานี้ถึงจะปฏิบัติตามได้","needs_lookup":true,"ref_type":"specific|whole_law|pending","anchor_question":"คำถามที่ต้องการคำตอบ — เฉพาะ whole_law","issuing_authority":"ผู้มีอำนาจออกประกาศ — เฉพาะ pending","interim_rule":"ตัวบทบอกให้ทำอย่างไรระหว่างรอ คัดจากตัวบทจริง — เฉพาะ pending"}]}
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

// อ่าน SSE ของ Anthropic แล้วประกอบเป็นข้อความเดียว
// คืน { text, stopReason, error } · ไม่ throw เพื่อให้ผู้เรียกตัดสินใจเองว่าจะตอบอะไร
async function readAnthropicStream(res){
  let text = '', stopReason = '', error = ''
  const reader = res.body?.getReader?.()
  if(!reader) return { text, stopReason, error: 'อ่านสตรีมจาก Claude ไม่ได้' }
  const dec = new TextDecoder()
  let buf = ''
  try{
    for(;;){
      const { done, value } = await reader.read()
      if(done) break
      buf += dec.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''          // บรรทัดสุดท้ายอาจมาไม่ครบ เก็บไว้ต่อรอบหน้า
      for(const line of lines){
        if(!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if(!payload || payload === '[DONE]') continue
        let ev
        try{ ev = JSON.parse(payload) }catch{ continue }
        if(ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') text += ev.delta.text
        else if(ev.type === 'message_delta' && ev.delta?.stop_reason) stopReason = ev.delta.stop_reason
        else if(ev.type === 'error') error = JSON.stringify(ev.error || ev)
      }
    }
  }catch(e){ error = error || String(e && e.message || e) }
  return { text, stopReason, error }
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

// vercel.json ตั้ง maxDuration = 300 วิ ซึ่งเป็น "เพดานสูงสุดของแพลนนี้"
// ทดลองตั้ง 800 แล้ว deploy ไม่ผ่าน: "must be between 1 and 300 seconds ... upgrade your plan"
// กันไว้ 45 วิให้ขั้นตอนหลังบ้านทำงานและส่งผลกลับ · เกินกว่านี้ = 504 เสียทั้งผลและเงินที่จ่ายไปแล้ว
// ตัวเลขนี้ต้องขยับตาม maxDuration ใน vercel.json เสมอ
const FN_BUDGET_MS = 255_000

export default async function handler(req,res){
  const startedAt = Date.now()
  if(req.method!=='POST') return res.status(405).json({error:'POST only'})
  if(!sameOrigin(req)) return res.status(403).json({error:'คำขอไม่ได้มาจากโดเมนของแอป'})
  if(rateLimited(clientIp(req))) return res.status(429).json({error:'เรียกใช้งานถี่เกินไป กรุณารอสักครู่แล้วลองใหม่'})
  if(!SUPA_URL||!SUPA_KEY) return res.status(500).json({error:'ยังไม่ได้ตั้งค่า Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)'})
  if(!process.env.ANTHROPIC_API_KEY) return res.status(500).json({error:'ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY ใน Vercel'})
  try{
    // stage=false (P12): ข้ามการเขียน lg_import_staging แล้ว return JSON ให้ client ไปเก็บเอง
    // (default true = พฤติกรรมเดิม เพื่อความ backward-compatible)
    // pdfBase64 (P12): แนบไฟล์ PDF ให้ Claude อ่านเป็นเอกสารโดยตรง (base64, ไม่มีส่วน data: นำหน้า)
    // relate=false → คืนผลฉบับหลักอย่างเดียว ให้ผู้ใช้เห็นตารางเร็ว แล้วค่อยยิง /api/law-relate ต่อ
    // default true เพื่อไม่ให้ของเดิมที่เรียก endpoint นี้อยู่พัง
    const { source='', kind='auto', sourceUrl='', stage=true, pdfBase64='', pdfName='', relate=true } = req.body||{}
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
      // stream:true — คำตอบ 20,000 token ใช้เวลานาน การรอ response ก้อนเดียวเสี่ยงถูกตัดกลางทาง
      // สตรีมแล้วประกอบเองทำให้ connection มีข้อมูลไหลตลอด ไม่โดน idle timeout ของ proxy
      body:JSON.stringify({model:MODEL,max_tokens:20000,stream:true,
        system:[{type:'text',text:buildSystem(await fetchCats()),cache_control:{type:'ephemeral'}}],
        messages:[{role:'user',content:userContent}]})
    })
    if(!ar.ok) return res.status(502).json({error: friendlyApiError(await ar.text())})
    const streamed = await readAnthropicStream(ar)
    if(streamed.error) return res.status(502).json({error: friendlyApiError(streamed.error)})
    const stopReason = streamed.stopReason
    let txt = streamed.text.trim()
    txt = txt.replace(/^```json\s*/i,'').replace(/```$/,'').trim()
    let parsed
    try{ parsed = JSON.parse(txt) }
    catch{
      // แยกสาเหตุ: ตอบไม่จบเพราะ token หมด (กฎหมายยาวเกิน) vs. รูปแบบผิดจริงๆ
      if(stopReason === 'max_tokens') return res.status(500).json({
        error:'กฎหมายฉบับนี้มีข้อกำหนดมากเกินกว่าจะสรุปจบใน 1 ครั้ง — '
          +'วิธีแก้: แนบไฟล์ทีละส่วน (เช่น หมวด 1 ก่อน แล้วค่อยหมวด 2) หรือ copy ตัวบทมาวางทีละหมวด '
          +'แล้วรวมข้อปฏิบัติเข้าทะเบียนทีหลัง',
        stop_reason:'max_tokens'})
      return res.status(500).json({error:'แปลงผลลัพธ์เป็น JSON ไม่ได้',raw:txt.slice(0,400)})
    }
    // เอกสารไม่ใช่ตัวบทกฎหมาย — บอกเหตุผลจริงจาก AI แทนข้อความ "แปลง JSON ไม่ได้" ที่ชวนเข้าใจผิด
    if(parsed.status === 'not_a_law') return res.status(422).json({
      error: 'เอกสารนี้ไม่ใช่ตัวบทกฎหมาย — ' + (parsed.reason || 'สรุปเป็นทะเบียนกฎหมายไม่ได้'),
      status: 'not_a_law'})
    const law = parsed.law||{}
    // วันบังคับใช้ — โค้ดคำนวณเอง ไม่เชื่อค่าที่ AI บวกมา (บวกวันข้ามเดือน/ปีอธิกสุรทินพลาดบ่อย)
    const eff = resolveEffectiveDate(law.announce_date, law.effective_date, parsed.law?.effective_rule)
    law.effective_date = eff.effective_date
    // Skill 3 · ดึงข้อกำหนดจากกฎหมายที่ตัวบทอ้างถึง มารวมเป็นชุดเดียวกับของฉบับหลัก
    // (กฎกระทรวงมักไม่เขียนซ้ำสิ่งที่อยู่ใน พ.ร.บ.แม่ — อ่านฉบับเดียวจึงตกข้อกำหนด)
    let merged = { requirements: parsed.requirements||[], related_laws:[], related_count:0, unresolved_count:0,
      inlined_count:0, manual_ref_count:0, ref_answers:[], answered_count:0, pending_issuance_count:0 }
    // ตรวจก่อนดึง — ปล่อยเฉพาะฉบับที่ยืนยันได้ว่าตัวบทอ้างถึงจริง (กันดึงมั่วจนเสียเงินฟรี)
    // ฉบับที่ตกด่านไม่ได้หายไปเงียบๆ — ส่งกลับไปแสดงในตาราง "กฎหมายที่อ้างถึง" พร้อมเหตุผล
    // ทาง PDF ไม่มีตัวบทเป็นข้อความอยู่แล้ว ต้องแตกเอง · แตกไม่ได้ = ตรวจแบบอ่อน
    // ห่อ Uint8Array อีกชั้นเพื่อให้ได้ byteOffset 0 เสมอ — Buffer เล็กๆ ใช้ pool ร่วมกัน
    // ซึ่ง pdfjs อ่านผิดตำแหน่งได้ (ไฟล์ PDF จริงมักใหญ่พอจนไม่โดน แต่กันไว้ไม่มีต้นทุน)
    const verifyText = hasPdf ? await pdfToText(new Uint8Array(Buffer.from(pdfBase64,'base64')))
      : pdfBytes ? await pdfToText(pdfBytes)
      : text
    const { kept: verifiedRefs, rejected: rejectedRefs } = verifyRelatedRefs(parsed.related_laws, verifyText)
    if(relate !== false && verifiedRefs.length){
      try{
        merged = await relateAndMerge(verifiedRefs, parsed.requirements||[], law.name||'',
          startedAt + FN_BUDGET_MS)
      }catch(e){
        console.error('osh-law-relate failed:', e)
        // ล้มเหลวต้องไม่ทำให้การสรุปทั้งหมดพัง — ใช้ผลของฉบับหลักต่อไปตามเดิม
        merged = { requirements: parsed.requirements||[], related_laws:[], related_count:0, unresolved_count:0,
          ref_answers:[], answered_count:0, pending_issuance_count:0 }
      }
    }
    if(relate !== false && !verifiedRefs.length){
      const inlined = Date.now() - startedAt < FN_BUDGET_MS - 45_000
        ? await inlineSectionRefs(merged.requirements, [])
        : { reqs: merged.requirements, changed: 0, unresolved: [] }
      merged = { ...merged, requirements: inlined.reqs,
        inlined_count: inlined.changed, manual_ref_count: inlined.unresolved.length }
    }
    // ด่านตรวจตัวเลข — จับการแต่งเติมตัวเลขที่ด่าน appears_in/source_excerpt จับไม่ได้
    // ใช้ตัวบทเต็ม (ถ้ามี) เป็นหลักฐานสำรอง เพราะบางข้อ excerpt สั้นกว่าที่ควร
    const numCheck = flagUnverifiedNumbers(merged.requirements, verifyText)
    merged = { ...merged, requirements: numCheck.reqs }
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
      gazette_ref: law.gazette_ref||null,  // mig 037 · เลขอ้างอิงราชกิจจาฯ ติดไปกับกฎหมายตอนอนุมัติ
      ref_answers: r.ref_answers||[]       // mig 040 · คำตอบของกฎหมายที่ข้อนี้อ้างถึง
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
      effective_source:eff.effective_source, effective_note:eff.effective_note,
      effective_ai_mismatch:eff.effective_ai_mismatch,
      related_laws:[...merged.related_laws, ...rejectedRows],
      related_count:merged.related_count, unresolved_count:merged.unresolved_count,
      ref_answers:merged.ref_answers||[],
      answered_count:merged.answered_count||0,
      pending_issuance_count:merged.pending_issuance_count||0,
      rejected_count:rejectedRows.length,
      inlined_count:merged.inlined_count||0, manual_ref_count:merged.manual_ref_count||0,
      unverified_number_count:numCheck.flagged,
      skipped_for_time:merged.skipped_for_time||0,
      // relate=false → ส่งรายการที่ผ่านด่าน verifyRelatedRefs แล้วกลับไป
      // ให้ client ยิงต่อที่ /api/law-relate · endpoint นั้นเชื่อว่ากรองมาแล้ว
      pending_refs: relate === false ? verifiedRefs : [],
      elapsed_ms:Date.now()-startedAt})
  }catch(e){ return res.status(500).json({error:String(e&&e.message||e)}) }
}
