// P17 · anchored question — ตอบ "คำถามของข้อนั้น" แทนการสรุปกฎหมายทั้งฉบับ
//
// ปัญหาที่แก้ (เจอจริงกับกฎกระทรวงควบคุมสถานประกอบกิจการฯ 2560):
//   ข้อ 9 "ต้องมีห้องน้ำและห้องส้วม ตามแบบและจำนวนที่กำหนดในกฎหมายว่าด้วยการควบคุมอาคาร"
//   ผู้ใช้ต้องการคำตอบเดียว: "แล้วต้องมีกี่ที่"
//   ระบบเดิมส่งชื่อ "กฎหมายว่าด้วยการควบคุมอาคาร" ไปค้นตรงๆ ซึ่งเป็นกฎหมายทั้งชุดหลายร้อยหน้า
//   แล้วเลือกมา 15 ข้อแรก ได้ข้อกำหนดที่ไม่เกี่ยวกับคำถามเลย = ผู้ใช้รู้สึกว่าระบบมั่ว
//
// ของใหม่: แปลงการอ้างถึงเป็น "คำถาม" ก่อนค้น แล้วบังคับให้ผลลัพธ์ตอบคำถามนั้นโดยตรง
//   ตอบไม่ได้ = คืน not_answered พร้อมบอกว่าเปิดไปเจออะไรแทน
//   ห้ามคืนข้อกำหนดอื่นที่ไม่เกี่ยวกับคำถามมาแทน — นี่คือสาเหตุหลักที่ผลลัพธ์เดิมดูมั่ว
//
// จุดที่ยากที่สุด: คำตอบจริงของเคสนี้อยู่ใน "ตารางที่ 2 ท้ายกฎกระทรวง ฉบับที่ 39 (พ.ศ. 2537)"
// ไม่ได้อยู่ในเนื้อความของข้อ 8 ที่อ้างถึงตารางนั้น
// ระบบที่ดึงเฉพาะข้อความของมาตราจะได้คำตอบว่า "ให้เป็นไปตามตารางที่ 2" ซึ่งไม่ใช่คำตอบ
// → จึงต้องมีรอบที่ 3 ที่ตามเข้าไปถอดเนื้อหาตารางออกมา

import { hostAllowed, fetchPdfBase64, askClaude, WEB_SEARCH_TOOL } from './law-source.js'
import { normalizeQuestionKey, questionUsable } from './ref-classify.js'
import { flagUnverifiedNumbers } from './verify-numbers.js'

const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY
const SUPA_HEADERS = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'content-type': 'application/json' }

const CACHE_DAYS = 180

// ── กฎการเขียนภาษา · ใช้ร่วมทุกรอบ ─────────────────────────────────────────
// "ตามที่กฎหมายกำหนด" ใน answer_plain = ยังไม่ได้ตอบ · เป็นด่านตรวจจริง ไม่ใช่แค่คำแนะนำ
const WRITING_RULES = `กฎการเขียน answer_plain (ผู้อ่านคือ จป. และพนักงานทั่วไป ไม่ใช่นักกฎหมาย):
- ขึ้นต้นด้วย "กริยา" และอ่านจบได้ใน 2 บรรทัด
- ห้ามขึ้นต้นด้วย "ให้..." หรือ "ผู้ประกอบการต้องดำเนินการให้เป็นไปตาม..."
- ห้ามใช้คำว่า "ตามที่กฎหมายกำหนด" — เขียนแบบนี้แปลว่ายังไม่ได้ตอบคำถาม ระบบจะตีว่าตอบไม่ได้
- ตัวเลขทุกตัวต้องมีหน่วยและฐานเทียบ เช่น "1 ที่ ต่อพื้นที่อาคารทุก 200 ตารางเมตร"
  ห้ามเขียน "1 ที่ ต่อ 200" ที่ไม่รู้ว่าต่ออะไร
- ศัพท์กฎหมายที่เลี่ยงไม่ได้ ให้วงเล็บคำอธิบายสั้นต่อท้ายครั้งแรกที่ใช้
- ห้ามใช้คำเหล่านี้ ใช้คำในวงเล็บแทน: ดำเนินการ (ทำ) · จัดให้มี (ต้องมี) · ทั้งนี้ (ตัดทิ้ง)
  ดังกล่าว (เขียนชื่อสิ่งนั้นซ้ำ) · โดยอนุโลม (ใช้แบบเดียวกัน) · มิให้ (ห้าม) · นิติบุคคล (บริษัท)`

const ANSWER_SCHEMA = `ตอบเป็น JSON เท่านั้น ห้ามมี markdown fence:
{"status":"answered"|"not_answered",
 "answer_plain":"คำตอบของคำถาม ไม่เกิน 300 ตัวอักษร",
 "answer_detail":{"ต้องทำอะไร":"","เกณฑ์":[{"กรณี":"เช่น สำนักงาน ผู้ชาย","จำนวน":"เช่น 1 ที่","ต่อหน่วย":"เช่น พื้นที่อาคารทุก 200 ตารางเมตร"}],"ข้อควรระวัง":"","หลักฐานที่ต้องเก็บ":""},
 "law_name":"ชื่อเต็มของกฎหมายที่ให้คำตอบ","section_ref":"ข้อ/มาตราที่ให้คำตอบ","source_url":"",
 "source_excerpt":"ข้อความจากตัวบทจริงที่รองรับคำตอบ คัดคำต่อคำ ไม่เกิน 400 ตัวอักษร",
 "points_to_table":true ถ้าตัวบทที่เจอชี้ต่อไปยังตาราง/บัญชี/ภาคผนวกท้ายกฎหมาย มิฉะนั้น false,
 "table_hint":"ชื่อตารางและกฎหมายที่ตารางนั้นอยู่ เช่น ตารางที่ 2 ท้ายกฎกระทรวง ฉบับที่ 39 (พ.ศ. 2537)",
 "found_instead":"ถ้า not_answered — เปิดตัวบทไปเจออะไรแทน บอกให้ชัดว่าเจอฉบับไหน ข้อไหน",
 "confidence":"high"|"medium"|"low"}`

const SYSTEM = `คุณคือผู้ช่วยด้านกฎหมายขององค์กร (compliance)
ผู้ใช้กำลังอ่านกฎหมายฉบับหนึ่ง ซึ่งข้อหนึ่งของมันบอกให้ไปทำตาม "กฎหมายอีกฉบับ" โดยไม่ระบุว่าข้อไหน
ผู้ใช้จึงมีคำถามเดียวที่ต้องการคำตอบ และคุณต้องตอบ "คำถามนั้น" เท่านั้น

สิ่งที่ห้ามทำเด็ดขาด — นี่คือสาเหตุที่ระบบรุ่นก่อนใช้งานไม่ได้:
1. ห้ามสรุปกฎหมายที่ค้นเจอทั้งฉบับ · ห้ามคืนข้อกำหนดอื่นที่ไม่ตรงคำถามมาแทนคำตอบ
   ตัวบทที่เจอไม่ตอบคำถาม ให้ตอบ not_answered แล้วบอกใน found_instead ว่าเปิดไปเจออะไร
   การบอกว่าตอบไม่ได้ มีประโยชน์กับผู้ใช้มากกว่าการเอาเรื่องอื่นมาตอบ
2. ห้ามเติมจากความจำ ใช้ได้เฉพาะสิ่งที่อยู่ในผลค้นหาหรือไฟล์ที่แนบมาเท่านั้น
   ห้ามเอาตัวเลขหรือตารางจากกฎหมาย "ฉบับอื่น" มาใช้แทนฉบับที่ค้นอยู่ แม้เป็นเรื่องเดียวกัน
   เป็นฉบับก่อนแก้ไข หรือเป็นฉบับที่ถูกยกเลิกไปแล้วก็ตาม
3. source_excerpt ต้องคัดจากตัวบทจริงคำต่อคำ · คัดมาไม่ได้ = ตอบ not_answered
   ห้ามเรียบเรียงใหม่ในช่องนี้ (ช่องนี้คือหลักฐาน ไม่ใช่คำอธิบาย)

เรื่องตาราง/บัญชีท้ายกฎหมาย — สำคัญมาก:
กฎหมายไทยมักเขียนเกณฑ์ตัวเลขไว้ใน "ตารางท้ายกฎกระทรวง" ไม่ใช่ในเนื้อความของข้อ
ถ้าข้อที่เจอเขียนว่า "ตามตารางที่ ..." "ท้ายกฎกระทรวงนี้" "บัญชีท้ายประกาศ" "ตามภาคผนวก" "แนบท้าย"
แปลว่า "ยังไม่ได้คำตอบ" ให้ตั้ง points_to_table เป็น true และระบุ table_hint
ห้ามตอบว่า "ให้เป็นไปตามตารางที่ 2" แล้วถือว่าตอบแล้ว เพราะผู้ใช้ยังไม่รู้ตัวเลข

${WRITING_RULES}

${ANSWER_SCHEMA}`

// ── รอบที่ 3 · ถอดเนื้อหาตารางท้ายกฎหมาย ─────────────────────────────────────
const TABLE_SYSTEM = `คุณกำลังอ่านไฟล์กฎหมายเพื่อถอด "ตาราง/บัญชี/ภาคผนวกท้ายกฎหมาย" ออกมาเป็นข้อความ

งานของคุณ: หาตารางที่ระบุ แล้วถอดเฉพาะแถวที่เกี่ยวกับประเภทอาคาร/กิจการที่ผู้ใช้ถาม
พร้อมหัวตาราง (ชื่อคอลัมน์) เพื่อให้ตัวเลขแต่ละตัวรู้ว่าเป็นตัวเลขของอะไร

หลักการที่ห้ามละเมิด:
- ถอดตัวเลขจากไฟล์เท่านั้น ห้ามเติมจากความจำ ห้ามคำนวณต่อ ห้ามปัดเศษ
- ตารางในไฟล์ไม่มี หรือหาไม่เจอ ให้ตอบ not_answered ตรงๆ
- แถวที่ไม่เกี่ยวกับคำถาม ไม่ต้องเอามา (ตารางเดียวมักครอบคลุมอาคารหลายสิบประเภท)
- ตัวเลขทุกตัวใน answer_plain ต้องมีหน่วยและฐานเทียบครบ
- ตารางมักเขียนจำนวนขั้นต่ำไว้ ให้ระบุใน "ข้อควรระวัง" ว่าเป็นขั้นต่ำ ถ้าตัวบทเขียนไว้เช่นนั้น

${WRITING_RULES}

${ANSWER_SCHEMA}
(ตอบตามสคีมาเดิม · ตั้ง points_to_table เป็น false เมื่อถอดตารางได้แล้ว
 ใส่เนื้อหาตารางลง answer_detail.เกณฑ์ เป็นรายแถว)`

// คำที่บอกว่า "ยังไม่ได้คำตอบ ตัวเลขจริงอยู่ในตาราง"
const TABLE_PTR_RE = /ตามตารางที่|ตารางที่\s*[๐-๙\d]|ท้ายกฎกระทรวงนี้|ท้ายประกาศนี้|บัญชีท้าย|ตามภาคผนวก|ภาคผนวกท้าย|แนบท้าย|ตารางท้าย/

// ด่านภาษา — "ตามที่กฎหมายกำหนด" แปลว่ายังไม่ได้ตอบ (กฎข้อ 4 ของสเปก)
const NON_ANSWER_RE = /ตามที่กฎหมายกำหนด|ตามที่กฎหมายว่าด้วย|เป็นไปตามที่กำหนดไว้ในกฎหมาย/

export function pointsToTable(out){
  if(!out) return false
  if(out.points_to_table === true) return true
  return TABLE_PTR_RE.test(String(out.source_excerpt || '') + ' ' + String(out.answer_plain || ''))
}

// ── cache ────────────────────────────────────────────────────────────────────
async function readCache(key){
  try{
    if(!SUPA_URL || !SUPA_KEY) return null
    const r = await fetch(`${SUPA_URL}/rest/v1/lg_ref_answers?question_key=eq.${encodeURIComponent(key)}&select=*&limit=1`,
      { headers: SUPA_HEADERS })
    if(!r.ok) return null
    const hit = (await r.json())?.[0]
    if(!hit) return null
    if((Date.now() - new Date(hit.resolved_at).getTime()) / 86400000 > CACHE_DAYS) return null
    return hit
  }catch{ return null }
}

async function writeCache(row){
  try{
    if(!SUPA_URL || !SUPA_KEY) return
    await fetch(`${SUPA_URL}/rest/v1/lg_ref_answers?on_conflict=question_key`, {
      method: 'POST',
      headers: { ...SUPA_HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([{ ...row, resolved_at: new Date().toISOString() }]),
    })
  }catch{ /* cache เขียนไม่ได้ไม่ใช่เหตุให้ล้ม — คำตอบที่ได้ยังใช้ได้ */ }
}

// ── ผลลัพธ์ของการอ้างถึงที่ "ตัวบทยังไม่ออก" ────────────────────────────────
// ไม่เรียก API เลย — ประหยัดทั้งเวลาและเงิน และที่สำคัญกว่าคือ "ถูกต้องกว่า"
// ค้นหาสิ่งที่ยังไม่มีตัวบท ผลลัพธ์ที่ดีที่สุดที่เป็นไปได้คือหาไม่เจอ
// แต่ระบบเดิมบันทึกว่า not_found ซึ่งอ่านแล้วเข้าใจว่า "ค้นพลาด" ทั้งที่เป็นคนละเรื่องกัน
export function pendingAnswer(ref){
  const who = String(ref?.issuing_authority || '').trim()
  const interim = String(ref?.interim_rule || '').trim()
  return {
    status: 'pending_issuance',
    ref_type: 'pending',
    anchor_question: '',
    answer_plain: who
      ? `รอ${who}ออกประกาศกำหนดหลักเกณฑ์ ยังไม่มีตัวบทให้ปฏิบัติตาม`
      : 'รอหน่วยงานผู้มีอำนาจออกประกาศกำหนดหลักเกณฑ์ ยังไม่มีตัวบทให้ปฏิบัติตาม',
    answer_detail: {},
    law_name: String(ref?.law_name || '').trim(),
    section_ref: '',
    from_table: false,
    source_excerpt: String(ref?.appears_in || '').trim(),
    source_url: '',
    issuing_authority: who,
    interim_rule: interim,
    confidence: 'high',
    note: interim
      ? 'ตัวบทยังไม่ออก — ตัวบทฉบับหลักบอกวิธีปฏิบัติระหว่างรอไว้แล้ว'
      : 'ตัวบทยังไม่ออก — ไม่ใช่การค้นพลาด และยังประเมินความสอดคล้องไม่ได้',
  }
}

// ── ตัวหลัก ──────────────────────────────────────────────────────────────────
// คืนผลเสมอ ไม่ throw · ทุกความล้มเหลวกลายเป็น not_answered พร้อมเหตุผล
export async function answerAnchoredQuestion(ref, deadlineAt = Infinity){
  const question = String(ref?.anchor_question || '').trim()
  const lawHint = String(ref?.law_name || '').trim()
  const key = normalizeQuestionKey(question)
  const base = {
    ref_type: 'whole_law', anchor_question: question, law_name: lawHint,
    answer_detail: {}, from_table: false, source_excerpt: '', source_url: '', section_ref: '',
  }
  const fail = note => ({ ...base, status: 'not_answered', answer_plain: '', confidence: '', note })

  // ความล้มเหลว "หลังจากค้นไปแล้ว" ต้องเก็บ cache ด้วย ไม่งั้นรันซ้ำก็ยิง web_search ใหม่ทุกครั้ง
  // เสียเงินซ้ำเพื่อได้คำตอบเดิมว่าตอบไม่ได้ · ต่างจากความล้มเหลวก่อนค้น (คำถามใช้ไม่ได้ / เวลาไม่พอ)
  // ซึ่งไม่ได้จ่ายอะไรไปและอาจเปลี่ยนผลได้ในรอบหน้า จึงไม่ควรตรึงไว้ใน cache
  const cacheFail = async res => {
    await writeCache({
      question_key: key, anchor_question: question, ref_type: 'whole_law',
      answer_plain: '', answer_detail: {},
      law_name: res.law_name || lawHint, section_ref: res.section_ref || '',
      from_table: false, source_excerpt: res.source_excerpt || '', source_url: res.source_url || '',
      status: 'not_answered', confidence: '',
      // found_instead คือของที่มีค่าที่สุดของผลลัพธ์แบบนี้ — บอก จป. ว่าเปิดไปเจออะไร
      // เก็บรวมใน note เพราะตารางไม่มีคอลัมน์แยก และมันคือ "ข้อสังเกต" ตามความหมายของช่องนี้
      note: [res.note, res.found_instead && `เปิดไปเจอ: ${res.found_instead}`].filter(Boolean).join(' · '),
    })
    return res
  }

  // คำถามกว้างเกินไป ค้นแล้วได้กฎหมายทั้งฉบับกลับมา ซึ่งคือปัญหาที่ P17 ตั้งใจแก้
  // ยิงไปก็เสียเงินเปล่าและได้ผลที่ต้องทิ้ง — บอกตรงๆ ดีกว่า
  if(!questionUsable(question)){
    return fail(question
      ? 'คำถามกว้างเกินกว่าจะค้นได้ตรงจุด — ต้องระบุเรื่อง บริบท และสิ่งที่ต้องการเป็นคำตอบให้ครบ'
      : 'ระบบตั้งคำถามจากข้อนี้ไม่ได้ — เปิดตัวบทที่อ้างถึงตรวจเอง')
  }

  // 1) cache — คำถามเดียวกันเคยตอบแล้วไม่ต้องค้นใหม่
  //    ผูกกับ "คำถาม" ไม่ใช่ "ชื่อกฎหมาย" เพราะกฎหมายฉบับเดียวตอบได้หลายคำถาม
  const hit = await readCache(key)
  if(hit) return {
    ...base, status: hit.status, answer_plain: hit.answer_plain || '',
    answer_detail: hit.answer_detail || {}, law_name: hit.law_name || lawHint,
    section_ref: hit.section_ref || '', from_table: !!hit.from_table,
    source_excerpt: hit.source_excerpt || '', source_url: hit.source_url || '',
    confidence: hit.confidence || '', note: hit.note || '', from_cache: true,
  }

  const timeLeft = () => deadlineAt - Date.now()
  if(timeLeft() < 40_000) return fail('เวลาในรอบนี้ไม่พอค้นคำตอบ — ลองสรุปซ้ำอีกครั้ง')

  // 2) รอบ 1 · ค้นด้วยคำถาม ไม่ใช่ด้วยชื่อกฎหมาย
  const ctx = [
    `คำถามที่ต้องตอบ: ${question}`,
    lawHint ? `ตัวบทฉบับหลักบอกให้ไปดู: ${lawHint}` : '',
    ref?.for_section ? `คำถามนี้มาจาก: ${ref.for_section} ของกฎหมายฉบับที่ผู้ใช้กำลังอ่าน` : '',
    ref?.why_needed ? `ทำไมต้องรู้: ${ref.why_needed}` : '',
    ref?.appears_in ? `ข้อความในตัวบทฉบับหลักที่อ้างถึง: "${ref.appears_in}"` : '',
  ].filter(Boolean).join('\n')

  let out = await askClaude({
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    content: ctx + '\n\nค้นตัวบทจริงจากเว็บที่กำหนด แล้วตอบเฉพาะคำถามข้างต้น',
    tools: [WEB_SEARCH_TOOL],
  })
  if(!out) return fail('ค้นคำตอบไม่สำเร็จ — เรียก AI ไม่ได้หรือผลลัพธ์อ่านไม่ออก')

  // 3) รอบ 2 · ได้ลิงก์ไฟล์ตัวบทมา → อ่านไฟล์จริงเพื่อยืนยันและเก็บ source_excerpt
  //    web_search เห็นแค่ snippet จึงมักไม่มี excerpt ทำให้ตกด่านหลักฐานจนเหลือศูนย์
  let pdfB64 = ''
  let url = String(out.source_url || '').trim()
  if(hostAllowed(url) && timeLeft() > 50_000){
    pdfB64 = await fetchPdfBase64(url) || ''
    if(pdfB64){
      const better = await askClaude({
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        content: `${ctx}\n\nไฟล์แนบคือตัวบทจริงจาก ${url}\nอ่านจากไฟล์นี้เท่านั้น ห้ามเติมจากความจำ\nถ้าไฟล์นี้ไม่ได้ตอบคำถามข้างต้น ให้ตอบ not_answered แล้วบอกใน found_instead ว่าไฟล์นี้ว่าด้วยเรื่องอะไร`,
        pdfBase64: pdfB64,
      })
      if(better && String(better.source_excerpt || '').trim()) out = { ...better, source_url: url }
    }
  }

  // 4) รอบ 3 · ตัวบทชี้ต่อไปยังตารางท้ายกฎหมาย = ยังไม่ได้คำตอบ ต้องตามเข้าไปถอดตาราง
  //    ตารางมักอยู่ในไฟล์เดียวกัน ("ท้ายกฎกระทรวงนี้") จึงใช้ไฟล์ที่ดึงมาแล้วได้เลย ไม่ต้องค้นซ้ำ
  let fromTable = false
  if(pointsToTable(out) && timeLeft() > 45_000){
    if(!pdfB64 && hostAllowed(url)) pdfB64 = await fetchPdfBase64(url) || ''
    if(pdfB64){
      const hint = String(out.table_hint || '').trim()
      const tbl = await askClaude({
        system: [{ type: 'text', text: TABLE_SYSTEM, cache_control: { type: 'ephemeral' } }],
        content: `${ctx}\n\nตารางที่ต้องถอด: ${hint || 'ตาราง/บัญชีท้ายกฎหมายที่ตัวบทข้อนี้อ้างถึง'}\nไฟล์แนบคือตัวบทฉบับเต็มจาก ${url} ซึ่งมีตารางอยู่ท้ายไฟล์\nถอดเฉพาะแถวที่ตอบคำถามข้างต้น พร้อมหัวตาราง`,
        pdfBase64: pdfB64,
      })
      if(tbl && tbl.status === 'answered' && String(tbl.source_excerpt || '').trim()){
        out = { ...tbl, source_url: url, law_name: tbl.law_name || out.law_name,
          section_ref: tbl.section_ref || out.section_ref }
        fromTable = true
      }
    }
  }

  // 5) ด่านตรวจ — ตัดสินจากหลักฐาน ไม่ใช่จากป้ายที่โมเดลติดมา
  url = String(out.source_url || '').trim()
  const excerpt = String(out.source_excerpt || '').trim()
  const plain = String(out.answer_plain || '').trim()
  const foundInstead = String(out.found_instead || '').trim()

  // (ก) แหล่งต้องอยู่ในโดเมนที่เชื่อถือได้
  if(!hostAllowed(url)) return cacheFail({ ...fail(url
    ? 'แหล่งที่ค้นเจอไม่อยู่ในโดเมนที่เชื่อถือได้ — เปิดตรวจเองก่อนใช้'
    : 'ค้นไม่เจอตัวบทที่ตอบคำถามนี้'), source_url: url, found_instead: foundInstead })

  // (ข) ไม่มีข้อความจากตัวบทรองรับ = แต่งจากความจำ
  if(!excerpt || !plain) return cacheFail({ ...fail('เปิดตัวบทแล้วแต่ไม่มีข้อความจากตัวบทรองรับคำตอบ'),
    source_url: url, law_name: out.law_name || lawHint, section_ref: out.section_ref || '',
    found_instead: foundInstead })

  // (ค) เขียนว่า "ตามที่กฎหมายกำหนด" = ยังไม่ได้ตอบคำถาม (สเปกข้อ 4)
  if(NON_ANSWER_RE.test(plain)) return cacheFail({ ...fail('เปิดตัวบทแล้วแต่ยังไม่ได้คำตอบที่เป็นรูปธรรม'),
    source_url: url, law_name: out.law_name || lawHint, section_ref: out.section_ref || '',
    found_instead: foundInstead || plain })

  // (ง) ยังชี้ไปตารางอยู่หลังรอบ 3 = ตัวเลขจริงยังไม่ได้ออกมา
  //     "ให้เป็นไปตามตารางที่ 2" ไม่ใช่คำตอบ — แต่บอกที่อยู่ของคำตอบได้ ซึ่งมีประโยชน์กว่าไม่บอกอะไร
  if(pointsToTable(out) && !fromTable) return cacheFail({
    ...fail('ตัวเลขจริงอยู่ในตารางท้ายกฎหมาย ซึ่งถอดออกมาไม่สำเร็จ — เปิดตารางอ่านเอง'),
    source_url: url, law_name: out.law_name || lawHint, section_ref: out.section_ref || '',
    source_excerpt: excerpt,
    found_instead: `ตัวบทชี้ไปที่ ${String(out.table_hint || 'ตารางท้ายกฎหมาย').trim()}`,
  })

  // (จ) ตัวเลขในคำตอบต้องมีที่มาในข้อความที่คัดมาจากตัวบท — ด่านเดิมของระบบ ห้ามผ่อน
  //     เตือนอย่างเดียว ไม่ลบ เพราะตารางบางแถวเขียนตัวเลขคนละรูปแบบกับที่คัดมาได้
  const nCheck = flagUnverifiedNumbers([{ req_text: plain, source_excerpt: excerpt }], excerpt)
  const unverified = nCheck.reqs[0]?.unverified_numbers || null

  const result = {
    ...base,
    status: 'answered',
    answer_plain: plain,
    answer_detail: (out.answer_detail && typeof out.answer_detail === 'object') ? out.answer_detail : {},
    law_name: String(out.law_name || lawHint).trim(),
    section_ref: String(out.section_ref || '').trim(),
    from_table: fromTable,
    source_excerpt: excerpt,
    source_url: url,
    confidence: String(out.confidence || '').trim(),
    unverified_numbers: unverified,
    note: fromTable ? 'คำตอบมาจากตารางท้ายกฎหมาย' : '',
  }

  await writeCache({
    question_key: key, anchor_question: question, ref_type: 'whole_law',
    answer_plain: result.answer_plain, answer_detail: result.answer_detail,
    law_name: result.law_name, section_ref: result.section_ref, from_table: fromTable,
    source_excerpt: excerpt, source_url: url, status: 'answered',
    confidence: result.confidence, note: result.note,
  })
  return result
}
