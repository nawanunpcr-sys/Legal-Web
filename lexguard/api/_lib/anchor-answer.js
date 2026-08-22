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

import { hostAllowed, isSecondarySource, deadSource, sourceTier, fetchPdfBase64, pdfPagesAround, askClaude, WEB_SEARCH_TOOL, SOURCE_URL_RULES } from './law-source.js'
import { normalizeQuestionKey, normalizeTopicKey, questionUsable, topicMatchText } from './ref-classify.js'
import { flagUnverifiedNumbers } from './verify-numbers.js'
import { findChildAnnouncements, formatGazetteHits, rememberGazetteDoc, resolveGazetteLink, searchGazette, gazetteNeedles } from './gazette-index.js'
import { findLawIdentity, leadNote } from './open-web-lead.js'

const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY
const SUPA_HEADERS = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'content-type': 'application/json' }

const CACHE_DAYS = 180

// ── กฎการเขียนภาษา · ใช้ร่วมทุกรอบ ─────────────────────────────────────────
// "ตามที่กฎหมายกำหนด" ใน answer_plain = ยังไม่ได้ตอบ · เป็นด่านตรวจจริง ไม่ใช่แค่คำแนะนำ
const WRITING_RULES = `กฎการเขียน answer_plain (ผู้อ่านคือ จป. และพนักงานทั่วไป ไม่ใช่นักกฎหมาย):
- ขึ้นต้นด้วย "กริยา" และอ่านจบได้ใน 2 บรรทัด
- ห้ามขึ้นต้นด้วย "ให้..." หรือ "ผู้ประกอบการต้องดำเนินการให้เป็นไปตาม..."
- **เขียนเป็นเกณฑ์ที่ต้องทำตามโดยตรง ห้ามเล่าว่ากำลังตอบอะไรอยู่**
  ห้ามขึ้นต้นว่า "ออกมาแล้ว" · "มีประกาศแล้ว" · "คำตอบคือ" · "ตามที่ถาม"
  ห้ามอ้างถึงคำถาม ชื่อเรื่องที่ค้น หรือกระบวนการค้นในข้อความที่ผู้ใช้เห็น
  ผิด: "ออกมาแล้ว ชื่อ 'ประกาศ ก' กำหนดให้เสียงรบกวนไม่เกิน 10 เดซิเบลเอ"
  ถูก: "ควบคุมเสียงรบกวนที่วัดนอกบริเวณสถานประกอบกิจการ ไม่ให้เกิน 10 เดซิเบลเอ"
  ชื่อกฎหมายไม่ต้องเขียนซ้ำในข้อความ — ระบบแสดงไว้ใต้ข้ออยู่แล้วพร้อมลิงก์
- ห้ามใช้คำว่า "ตามที่กฎหมายกำหนด" — เขียนแบบนี้แปลว่ายังไม่ได้ตอบคำถาม ระบบจะตีว่าตอบไม่ได้
- ตัวเลขทุกตัวต้องมีหน่วยและฐานเทียบ เช่น "1 ที่ ต่อพื้นที่อาคารทุก 200 ตารางเมตร"
  ห้ามเขียน "1 ที่ ต่อ 200" ที่ไม่รู้ว่าต่ออะไร
- ศัพท์กฎหมายที่เลี่ยงไม่ได้ ให้วงเล็บคำอธิบายสั้นต่อท้ายครั้งแรกที่ใช้
- ห้ามใช้คำเหล่านี้ ใช้คำในวงเล็บแทน: ดำเนินการ (ทำ) · จัดให้มี (ต้องมี) · ทั้งนี้ (ตัดทิ้ง)
  ดังกล่าว (เขียนชื่อสิ่งนั้นซ้ำ) · โดยอนุโลม (ใช้แบบเดียวกัน) · มิให้ (ห้าม) · นิติบุคคล (บริษัท)`

const ANSWER_SCHEMA = `ตอบเป็น JSON เท่านั้น ห้ามมี markdown fence:
{"status":"answered"|"not_answered",
 "answer_plain":"เกณฑ์ที่ตัวบทกำหนด เขียนตรง ๆ ไม่เกิน 300 ตัวอักษร",
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

${SOURCE_URL_RULES}

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
const fresh = row => row && (Date.now() - new Date(row.resolved_at).getTime()) / 86400000 <= CACHE_DAYS

async function query(qs){
  const r = await fetch(`${SUPA_URL}/rest/v1/lg_ref_answers?${qs}`, { headers: SUPA_HEADERS })
  return r.ok ? (await r.json()) : []
}

async function readCache(key, topic){
  try{
    if(!SUPA_URL || !SUPA_KEY) return null
    // 1) คำถามตัวอักษรตรงกัน — ใช้ได้ทุกสถานะ รวม not_answered
    const exact = (await query(`question_key=eq.${encodeURIComponent(key)}&select=*&limit=1`))?.[0]
    if(fresh(exact)) return exact

    // 2) คีย์รอง (กฎหมาย + เรื่อง) — คำถามคนละสำนวนแต่ถามเรื่องเดียวกันกับกฎหมายฉบับเดียวกัน
    //
    // รับเฉพาะคำตอบที่ "ตอบได้และมีข้อความจากตัวบทรองรับ" เท่านั้น
    // not_answered ขึ้นกับสำนวนที่ใช้ค้น เปลี่ยนคำถามแล้วอาจเจอ จึงห้ามข้ามสำนวนมาใช้
    // ไม่งั้นสำนวนที่ค้นไม่เจอครั้งเดียวจะตรึงทุกสำนวนถัดไปไว้ 180 วัน
    if(!topic) return null
    const rows = await query(
      `topic_key=eq.${encodeURIComponent(topic)}&status=eq.answered&select=*` +
      `&order=resolved_at.desc&limit=1`)
    const near = rows?.[0]
    if(fresh(near) && String(near.source_excerpt || '').trim()) return near
    return null
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

// ── ผลลัพธ์ของการอ้างถึงที่ชี้ไป "ประกาศซึ่งหน่วยงานจะออกทีหลัง" ────────────
// ไม่เรียก API เลย — ประหยัดทั้งเวลาและเงิน
//
// ⚠ ข้อความที่คืนกลับ "ห้ามยืนยันว่าไม่มีตัวบท" เด็ดขาด — เพราะเราไม่เคยค้น
//
// รุ่นก่อนเขียนว่า "ยังไม่มีตัวบทให้ปฏิบัติตาม" ซึ่งเป็นการยืนยันเชิงลบจากการไม่ได้ตรวจ
// ทดสอบจริง 2026-08-17 กับกฎกระทรวงควบคุมสถานประกอบกิจการฯ 2560 (7 จุดที่ติดป้ายนี้)
// เปิดดัชนีประกาศของกรมอนามัยแล้วพบว่า **อย่างน้อย 3 จุดออกประกาศมาแล้ว** และแต่ละฉบับ
// อ้างอำนาจจากข้อของกฎกระทรวงฉบับนั้นตรง ๆ:
//   ข้อ 3 วรรคหนึ่ง → ประกาศฯ ค่ามาตรฐานมลพิษทางเสียงฯ พ.ศ. 2561
//   ข้อ 11 วรรคสาม → ประกาศฯ กำหนดสถานประกอบกิจการที่ต้องจัดให้มีบ่อดักไขมัน พ.ศ. 2565
//   ข้อ 12        → ประกาศฯ หลักเกณฑ์การป้องกันและกำจัดแมลงและสัตว์ที่เป็นพาหะนำโรคฯ พ.ศ. 2564
// กฎกระทรวงออกปี 2560 แต่ประกาศทยอยออกตามมาอีกหลายปี — ยิ่งฉบับเก่ายิ่งมีโอกาสออกแล้ว
// การเขียนว่า "ยังไม่มี" จึงทำให้ จป. ข้ามข้อที่มีหน้าที่ต้องทำจริง ซึ่งอันตรายกว่าไม่บอกอะไร
export function pendingAnswer(ref){
  const who = String(ref?.issuing_authority || '').trim() || 'หน่วยงานผู้มีอำนาจ'
  const interim = String(ref?.interim_rule || '').trim()
  return {
    status: 'pending_issuance',
    ref_type: 'pending',
    anchor_question: '',
    answer_plain: `ข้อนี้ให้ไปทำตามประกาศที่${who}เป็นผู้ออก · ระบบยังไม่ได้ตรวจว่าประกาศฉบับนั้นออกมาแล้วหรือยัง ต้องเปิดเว็บของหน่วยงานตรวจก่อน`,
    answer_detail: {},
    law_name: String(ref?.law_name || '').trim(),
    section_ref: '',
    from_table: false,
    source_excerpt: String(ref?.appears_in || '').trim(),
    source_url: '',
    issuing_authority: who,
    interim_rule: interim,
    // ไม่ใช่ high — เรายังไม่รู้อะไรเลยเกี่ยวกับฉบับนี้ นอกจากว่าตัวบทชี้ไปหามัน
    confidence: 'low',
    note: interim
      ? 'ยังไม่ได้ตรวจว่ามีประกาศออกแล้วหรือยัง — ตัวบทฉบับหลักบอกวิธีปฏิบัติไว้ให้ใช้ระหว่างที่ยังไม่มีประกาศ'
      : 'ยังไม่ได้ตรวจว่ามีประกาศออกแล้วหรือยัง — ห้ามสรุปว่าไม่มี · ตรวจแล้วพบว่ายังไม่ออกจริงจึงจะประเมินความสอดคล้องไม่ได้',
  }
}

// ── recheck · "ประกาศฉบับนั้นออกมาแล้วหรือยัง" ต้องรู้จากการตรวจ ไม่ใช่จากการเดา ──
//
// ตั้งคำถามจากข้อที่อ้างถึง แล้วส่งเข้าโฟลว์เดียวกับ whole_law ทุกประการ
// (ด่านโดเมน · source_excerpt · ห้าม "ตามที่กฎหมายกำหนด" · ตรวจตัวเลข บังคับครบเหมือนเดิม)
// ตอบได้ = ประกาศออกแล้วจริง และได้เนื้อหามาด้วย · ตอบไม่ได้ = ยังไม่ยืนยัน ไม่ใช่ "ไม่มี"
export function pendingQuestion(ref, parentName){
  const clause = String(ref?.for_section || '').trim()
  const who = String(ref?.issuing_authority || '').trim()
  const topic = String(ref?.why_needed || ref?.law_name || '').trim().slice(0, 90)
  const mother = String(parentName || '').trim()
  if(!mother && !clause) return ''
  return [
    `มีประกาศที่ออกตามความใน${clause || 'ข้อที่อ้างถึง'}`,
    mother ? `แห่ง${mother}` : '',
    'ออกมาแล้วหรือยัง',
    who ? `ผู้มีอำนาจออกคือ${who}` : '',
    topic ? `เรื่องที่ต้องการคือ ${topic}` : '',
    'ถ้ามีแล้ว ให้ใส่ชื่อฉบับกับปี พ.ศ. ลง law_name แล้วเขียน answer_plain เป็นเกณฑ์ที่ต้องทำตามโดยตรง',
    'ห้ามขึ้นต้น answer_plain ว่า "ออกมาแล้ว" หรือเล่าว่ามีประกาศหรือไม่ — เขียนแต่สิ่งที่ต้องทำ',
  ].filter(Boolean).join(' ')
}

export async function recheckPending(ref, parentName, deadlineAt = Infinity){
  const base = pendingAnswer(ref)
  const q = pendingQuestion(ref, parentName)
  if(!questionUsable(q)) return base

  // gazette_parent = ชื่อกฎหมายแม่ · ดัชนีราชกิจจาฯ ใช้ค่านี้หา "ประกาศลูกที่ออกตามฉบับนี้"
  // ต้องเป็นชื่อแม่ ไม่ใช่ ref.law_name ซึ่งเป็นชื่อที่โมเดลเดาให้ประกาศที่ยังไม่รู้ว่ามีจริงไหม
  const hit = await answerAnchoredQuestion(
    { ...ref, ref_type: 'whole_law', anchor_question: q, gazette_parent: parentName }, deadlineAt)

  // เจอแล้ว — ฉบับนั้นออกมาแล้วจริง เลิกเรียกว่า "รอประกาศ" ได้เลย
  if(hit && hit.status === 'answered'){
    return {
      ...hit,
      ref_type: 'pending',
      issuing_authority: base.issuing_authority,
      interim_rule: '',      // ออกประกาศแล้ว วิธีปฏิบัติระหว่างรอไม่เกี่ยวอีกต่อไป
      note: [hit.note, 'ตรวจแล้วพบว่าประกาศฉบับนี้ออกมาแล้ว — ไม่ใช่ข้อที่ยังไม่มีตัวบท'].filter(Boolean).join(' · '),
    }
  }

  // ค้นแล้วยังไม่เจอ — ยังไม่ใช่ข้อยืนยันว่าไม่มี · ดัชนีของหน่วยงานไม่ครบก็เจอบ่อย
  return {
    ...base,
    rechecked: true,
    note: [
      'ค้นแล้วยังไม่พบฉบับที่ออกตามข้อนี้ — ยังไม่ใช่ข้อยืนยันว่าไม่มี ควรเปิดดัชนีประกาศของหน่วยงานตรวจซ้ำ',
      hit?.found_instead ? `เปิดไปเจอ: ${hit.found_instead}` : '',
      base.interim_rule ? 'ตัวบทฉบับหลักบอกวิธีปฏิบัติไว้ให้ใช้ระหว่างที่ยังไม่มีประกาศ' : '',
    ].filter(Boolean).join(' · '),
  }
}

// ── ตัวหลัก ──────────────────────────────────────────────────────────────────
// คืนผลเสมอ ไม่ throw · ทุกความล้มเหลวกลายเป็น not_answered พร้อมเหตุผล
export async function answerAnchoredQuestion(ref, deadlineAt = Infinity){
  const question = String(ref?.anchor_question || '').trim()
  const lawHint = String(ref?.law_name || '').trim()
  const key = normalizeQuestionKey(question)
  const topic = normalizeTopicKey(lawHint, question)
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
      question_key: key, topic_key: topic || null, anchor_question: question, ref_type: 'whole_law',
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
      ? 'ข้อนี้กว้างเกินกว่าจะค้นตรงจุด — เปิดตัวบทที่อ้างถึงตรวจเอง'
      : 'ระบุประเด็นที่ต้องค้นจากข้อนี้ไม่ได้ — เปิดตัวบทที่อ้างถึงตรวจเอง')
  }

  // 1) cache — คำถามเดียวกันเคยตอบแล้วไม่ต้องค้นใหม่
  //    ผูกกับ "คำถาม" ไม่ใช่ "ชื่อกฎหมาย" เพราะกฎหมายฉบับเดียวตอบได้หลายคำถาม
  const hit = await readCache(key, topic)
  if(hit) return {
    ...base, status: hit.status, answer_plain: hit.answer_plain || '',
    answer_detail: hit.answer_detail || {}, law_name: hit.law_name || lawHint,
    section_ref: hit.section_ref || '', from_table: !!hit.from_table,
    source_excerpt: hit.source_excerpt || '', source_url: hit.source_url || '',
    confidence: hit.confidence || '', note: hit.note || '', from_cache: true,
  }

  const timeLeft = () => deadlineAt - Date.now()
  if(timeLeft() < 40_000) return fail('เวลาในรอบนี้ไม่พอค้น — ลองสรุปซ้ำอีกครั้ง')

  // 2) รอบ 0 · เปิดดัชนีราชกิจจานุเบกษาของเราเองก่อนยิง web_search
  //
  // ดัชนีนี้บอกได้ว่า "ฉบับไหนมีอยู่จริง ชื่อเต็มว่าอะไร และไฟล์อยู่ที่ URL ใด"
  // ซึ่งเป็นสองเรื่องที่ web_search ทำได้แย่ที่สุด:
  //   - ดัชนีของ search engine ยังคืนที่อยู่ /DATA/PDF/... ที่ตายแล้วอยู่เรื่อย ๆ
  //   - snippet ไม่มีเลข เล่ม/ตอน/หน้า ซึ่งเป็นสิ่งที่ผู้ตรวจ ISO ใช้อ้างอิง
  // ค่าใช้จ่าย 0 คำขอ AI · เป็นการค้นในฐานข้อมูลของเราเอง ใช้เวลาระดับมิลลิวินาที
  //
  // ⚠ ผลจากดัชนีเป็นแค่ "รายชื่อผู้ต้องสงสัย" ไม่ใช่คำตอบ — มีแต่ชื่อเรื่อง ไม่มีเนื้อหา
  // โมเดลยังต้องเปิดไฟล์อ่านจริงและคัด source_excerpt มาให้ครบเหมือนเดิมทุกด่าน
  // ที่ตัดออกไปคือ "รอบเดาว่าไฟล์อยู่ที่ไหน" ไม่ใช่ "รอบตรวจว่าตัวบทเขียนว่าอะไร"
  let gazetteBlock = ''
  try{
    const parent = String(ref?.gazette_parent || '').trim() || lawHint
    const { hits, narrowed, fromDiscovered } = await findChildAnnouncements(parent, topicMatchText(question), { limit: 6 })
    if(hits.length) gazetteBlock = [
      // ผลสองชนิดนี้เชื่อได้ไม่เท่ากัน จึงต้องพูดกับโมเดลคนละแบบ
      // narrowed = ชื่อเรื่องมีทั้งชื่อกฎหมายแม่และเรื่องที่ถาม → ตรงคำถามค่อนข้างแน่
      // fromDiscovered = แค่ "ออกตามกฎหมายแม่เดียวกัน" เท่านั้น เรื่องไม่ได้อยู่ในชื่อ
      //   ชื่อกฎหมายไทยแทบไม่บอกเรื่องไว้ในชื่อ กลุ่มนี้จึงมีทั้งฉบับที่ใช่และไม่ใช่ปนกัน
      //   บอกว่า "ยืนยันแล้ว ให้ใช้ก่อน" กับกลุ่มนี้ = ชวนให้โมเดลยึดไฟล์ผิดฉบับด้วยความมั่นใจ
      fromDiscovered
        ? 'ฉบับที่ออกตามกฎหมายแม่เดียวกัน ซึ่งระบบเคยเปิดอ่านสำเร็จมาก่อน — อาจไม่ใช่ฉบับที่ตอบคำถามนี้:'
        : narrowed
          ? 'ฉบับที่พบในดัชนีราชกิจจานุเบกษา ตรงทั้งชื่อกฎหมายแม่และเรื่องที่ถาม (ลิงก์ยืนยันแล้วว่าเปิดได้ ให้ใช้ก่อนลิงก์จากการค้นเว็บ):'
          : 'ฉบับที่พบในดัชนีราชกิจจานุเบกษา (ลิงก์ยืนยันแล้วว่าเปิดได้ ให้ใช้ก่อนลิงก์จากการค้นเว็บ):',
      formatGazetteHits(hits),
      'รายการนี้เป็นเพียงชื่อเรื่อง ไม่ใช่เนื้อหา — ต้องเปิดไฟล์อ่านจริงก่อนตอบเสมอ',
      'ถ้าไม่มีฉบับใดในรายการตอบคำถามได้ ให้ค้นเว็บต่อตามปกติ ห้ามเอาฉบับที่ไม่เกี่ยวมาตอบ',
    ].join('\n')
  }catch{ /* ดัชนีล่มไม่ใช่เหตุให้ทั้งเส้นล้ม — ถอยไปใช้ web_search ตามเดิม */ }

  // 3) รอบ 1 · ค้นด้วยคำถาม ไม่ใช่ด้วยชื่อกฎหมาย
  const ctx = [
    `คำถามที่ต้องตอบ: ${question}`,
    lawHint ? `ตัวบทฉบับหลักบอกให้ไปดู: ${lawHint}` : '',
    ref?.for_section ? `คำถามนี้มาจาก: ${ref.for_section} ของกฎหมายฉบับที่ผู้ใช้กำลังอ่าน` : '',
    ref?.why_needed ? `ทำไมต้องรู้: ${ref.why_needed}` : '',
    ref?.appears_in ? `ข้อความในตัวบทฉบับหลักที่อ้างถึง: "${ref.appears_in}"` : '',
    gazetteBlock,
  ].filter(Boolean).join('\n')

  let out = await askClaude({
    system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
    content: ctx + '\n\nค้นตัวบทจริงจากเว็บที่กำหนด แล้วตอบเฉพาะคำถามข้างต้น',
    tools: [WEB_SEARCH_TOOL],
  })
  if(!out) return fail('ค้นไม่สำเร็จ — เรียก AI ไม่ได้หรือผลลัพธ์อ่านไม่ออก')

  // 4) รอบ 2 · ได้ลิงก์ไฟล์ตัวบทมา → อ่านไฟล์จริงเพื่อยืนยันและเก็บ source_excerpt
  //    web_search เห็นแค่ snippet จึงมักไม่มี excerpt ทำให้ตกด่านหลักฐานจนเหลือศูนย์
  let pdfB64 = ''
  let url = String(out.source_url || '').trim()

  // ข้ามรอบนี้เมื่อผลค้นผ่านด่านครบแล้ว — ประหยัด 1 คำขอต่อคำถาม โดยไม่ลดความแม่น
  // เกณฑ์ต้องครบทุกข้อ ไม่งั้นถอยไปอ่านไฟล์จริงตามเดิม:
  //   ตอบได้ · โดเมนเชื่อถือได้ · มีข้อความจากตัวบทรองรับ · ไม่ได้ชี้ต่อไปตาราง
  // ข้อสุดท้ายสำคัญที่สุด — ชี้ไปตารางแปลว่ายังไม่ได้คำตอบ ต้องอ่านไฟล์ต่ออยู่ดี
  const firstRoundComplete =
    out.status === 'answered' &&
    hostAllowed(url) &&
    String(out.source_excerpt || '').trim().length >= 20 &&
    String(out.answer_plain || '').trim() &&
    !pointsToTable(out)

  // ชี้ไปตาราง = รู้อยู่แล้วว่ารอบนี้ตอบไม่ได้ ตัวเลขจริงอยู่ในตาราง ไม่ได้อยู่ในเนื้อความของข้อ
  // อ่านไฟล์รอบนี้จึงได้ผลลัพธ์เดิมกลับมา ("ให้เป็นไปตามตารางที่ 2") แล้วต้องไปรอบ 3 อยู่ดี
  // ข้ามมาเข้ารอบถอดตารางตรง ๆ — ตัด 1 คำขอออกจาก "เส้นทางที่ยาวที่สุด" ซึ่งเป็นตัวกำหนดเวลารวม
  // ไฟล์ยังถูกดึงในรอบ 3 เหมือนเดิม หลักฐานที่ใช้ตอบจึงยังมาจากตัวบทจริงเท่าเดิม
  const tableAhead = pointsToTable(out)

  let skippedRead = false
  if(firstRoundComplete){
    skippedRead = true
  } else if(!tableAhead && hostAllowed(url) && timeLeft() > 50_000){
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

  // 5) รอบ 3 · ตัวบทชี้ต่อไปยังตารางท้ายกฎหมาย = ยังไม่ได้คำตอบ ต้องตามเข้าไปถอดตาราง
  //    ตารางมักอยู่ในไฟล์เดียวกัน ("ท้ายกฎกระทรวงนี้") จึงใช้ไฟล์ที่ดึงมาแล้วได้เลย ไม่ต้องค้นซ้ำ
  let fromTable = false
  if(pointsToTable(out) && timeLeft() > 45_000){
    if(!pdfB64 && hostAllowed(url)) pdfB64 = await fetchPdfBase64(url) || ''
    if(pdfB64){
      const hint = String(out.table_hint || '').trim()

      // ส่งเฉพาะหน้าที่มีตาราง แทนไฟล์ทั้งฉบับ — วัดกับกฎกระทรวง ฉบับที่ 39:
      // ไฟล์เต็ม ~27,500 token → ตัดหน้า ~3,500 token (ลด 82%) โดยเนื้อหาที่ใช้ตอบครบเท่าเดิม
      // (แถวสำนักงาน · แถวโรงงาน · หัวตาราง · เชิงอรรถว่าตารางถูกฉบับ 63 แทนที่)
      // ตัดไม่ได้เมื่อไร (หาหน้าไม่เจอ/ข้อความถอดรหัสไม่ออก) ถอยไปส่งไฟล์ทั้งฉบับตามเดิม
      const pagesText = await pdfPagesAround(pdfB64, hint)
      const task = `${ctx}\n\nตารางที่ต้องถอด: ${hint || 'ตาราง/บัญชีท้ายกฎหมายที่ตัวบทข้อนี้อ้างถึง'}\nถอดเฉพาะแถวที่ตอบคำถามข้างต้น พร้อมหัวตาราง`

      const tbl = await askClaude({
        system: [{ type: 'text', text: TABLE_SYSTEM, cache_control: { type: 'ephemeral' } }],
        content: pagesText
          ? `${task}\n\nข้อความข้างล่างคือหน้าที่มีตารางนั้น คัดมาจากตัวบทจริงที่ ${url}\nอ่านจากข้อความนี้เท่านั้น ห้ามเติมจากความจำ\n\n${pagesText}`
          : `${task}\nไฟล์แนบคือตัวบทฉบับเต็มจาก ${url} ซึ่งมีตารางอยู่ท้ายไฟล์`,
        pdfBase64: pagesText ? '' : pdfB64,
      })
      if(tbl && tbl.status === 'answered' && String(tbl.source_excerpt || '').trim()){
        out = { ...tbl, source_url: url, law_name: tbl.law_name || out.law_name,
          section_ref: tbl.section_ref || out.section_ref }
        fromTable = true
      }
    }
  }

  // 5.5) รอบกู้ · ค้นเว็บกว้างเพื่อ "ระบุตัวฉบับ" แล้วกลับไปเปิดตัวบทจริง
  //
  // ถึงตรงนี้แปลว่าเส้นทางปกติไม่ได้ผล — ไม่เจอ · เจอแต่โดเมนไม่ผ่าน · หรือไม่มีข้อความรองรับ
  // เดิมจบแค่นี้ ผู้ใช้ได้ "ไม่พบ" ซึ่งตันสนิท ทั้งที่บล็อกกฎหมายหรือสรุปของที่ปรึกษา
  // มักบอกไว้ตรง ๆ ว่าเกณฑ์นั้นอยู่ในประกาศฉบับไหน ข้อไหน
  //
  // ⚠ เว็บนอกรายการมีสิทธิ์เดียว: บอกว่า "ให้ไปเปิดฉบับไหน"
  // เนื้อหาจากมัน **ห้ามกลายเป็น answer_plain หรือ source_excerpt** เด็ดขาด
  // ได้ชื่อฉบับมาแล้วต้องกลับไปเปิดตัวบทจริงจากแหล่งที่เชื่อถือได้เอง แล้วผ่านด่านเดิมครบทุกด่าน
  // เปิดไม่ได้ = ยังตอบ not_answered เหมือนเดิม แต่แนบเบาะแสไปด้วย
  // ซึ่งเปลี่ยน "ไม่พบ" เป็น "คำตอบอยู่ในฉบับนี้ ข้อนี้ ไปเปิดต่อ" — จป. ทำต่อเองได้ใน 2 นาที
  let webLead = null
  // URL ของฉบับที่เบาะแสชี้ไป ซึ่งผ่านด่านโดเมนแล้ว — ยกออกมานอก try เพราะเส้นทาง
  // not_answered ต้องใช้ต่อ: ตอนนี้หน้าจอไม่พ่นคำอธิบายแล้ว เหลือแค่ "ชื่อฉบับ + เปิดตัวบท ↗"
  // ถ้าไม่ส่ง URL นี้กลับไป ผู้ใช้จะเห็นแค่ชื่อฉบับลอย ๆ กดอะไรต่อไม่ได้เลย
  let leadUrl = ''
  const primaryUnusable = out.status !== 'answered'
    || !hostAllowed(String(out.source_url || '').trim())
    || String(out.source_excerpt || '').trim().length < 20
  if(primaryUnusable && timeLeft() > 60_000){
    try{
      const lead = await findLawIdentity(question, lawHint, ctx)
      if(lead){
        webLead = lead
        // แปลงเบาะแสเป็น URL ที่เชื่อถือได้ · ลองดัชนีก่อน เพราะการันตีว่าลิงก์เปิดได้
        let openUrl = ''
        const gz = await resolveGazetteLink(lead.law_name)
        if(gz) openUrl = gz.gazette_url
        if(!openUrl){
          const hits = await searchGazette(gazetteNeedles(lead.law_name).slice(0, 1), { limit: 4 })
          openUrl = (hits || []).map(h => h.doc_url).find(u => hostAllowed(u)) || ''
        }
        // ยังไม่ได้ URL → ค้นในโดเมนที่เชื่อถือได้อีกรอบ แต่คราวนี้ค้นด้วย "ชื่อฉบับที่รู้แล้ว"
        // ไม่ใช่คำถามลอย ๆ แบบรอบแรก · นี่คือจุดที่เบาะแสให้ผลจริงที่สุด
        // เพราะเว็บหน่วยงานเก็บไฟล์ไว้ใต้ชื่อเรื่อง ไม่ได้เก็บไว้ใต้คำถามของผู้ใช้
        if(!openUrl && timeLeft() > 55_000){
          const byName = await askClaude({
            system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
            content: `${ctx}\n\nรู้แล้วว่าเกณฑ์นี้อยู่ใน: ${lead.law_name}`
              + `${lead.section_ref ? ` ${lead.section_ref}` : ''}\n`
              + 'ค้นหาไฟล์ตัวบทของฉบับนี้จากเว็บที่กำหนด แล้วตอบคำถามข้างต้นจากตัวบทจริง\n'
              + 'ค้นด้วยชื่อฉบับนี้ ไม่ใช่ด้วยคำถาม — เว็บหน่วยงานเก็บไฟล์ไว้ใต้ชื่อเรื่อง',
            tools: [WEB_SEARCH_TOOL],
          })
          const u2 = String(byName?.source_url || '').trim()
          if(u2 && hostAllowed(u2)){
            openUrl = u2
            // ผลรอบนี้ผ่านด่านโดเมนแล้วและมีข้อความจากตัวบท ใช้ต่อได้เลยโดยไม่ต้องอ่านไฟล์ซ้ำ
            if(String(byName.source_excerpt || '').trim().length >= 20) out = { ...byName, source_url: u2 }
          }
        }
        if(openUrl && hostAllowed(openUrl) && timeLeft() > 45_000){
          const b64 = await fetchPdfBase64(openUrl)
          if(b64){
            const rescued = await askClaude({
              system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
              content: `${ctx}\n\nไฟล์แนบคือตัวบทจริงของ ${lead.law_name} จาก ${openUrl}\n`
                + `${lead.section_ref ? `เบาะแสจากการค้นเว็บระบุว่าเกณฑ์อยู่ที่ ${lead.section_ref} — ตรวจจากไฟล์ว่าจริงหรือไม่\n` : ''}`
                + 'อ่านจากไฟล์นี้เท่านั้น ห้ามเติมจากความจำและห้ามใช้สิ่งที่อ่านมาจากเว็บอื่น\n'
                + 'ถ้าไฟล์นี้ไม่ได้ตอบคำถาม ให้ตอบ not_answered แล้วบอกใน found_instead ว่าไฟล์นี้ว่าด้วยเรื่องอะไร',
              pdfBase64: b64,
            })
            // รับผลใหม่เฉพาะเมื่อมันคัดข้อความจากตัวบทมาได้จริง — ด่านเดิมยังตรวจต่ออีกชั้น
            if(rescued && String(rescued.source_excerpt || '').trim()) out = { ...rescued, source_url: openUrl }
          }
        }
        // เก็บไว้ให้เส้นทาง not_answered ใช้เป็นลิงก์ "เปิดตัวบท ↗"
        // ผ่าน hostAllowed แล้วเท่านั้น — ห้ามส่งลิงก์นอกโดเมนที่เชื่อถือได้ออกไปในชื่อ "ตัวบท"
        if(openUrl && hostAllowed(openUrl)) leadUrl = openUrl
      }
    }catch{ /* รอบกู้ล้มเหลวไม่ใช่เหตุให้ทั้งเส้นล้ม — ตกไปตอบ not_answered ตามเดิม */ }
  }

  // 6) ด่านตรวจ — ตัดสินจากหลักฐาน ไม่ใช่จากป้ายที่โมเดลติดมา
  url = String(out.source_url || '').trim()
  const excerpt = String(out.source_excerpt || '').trim()
  const plain = String(out.answer_plain || '').trim()
  const foundInstead = String(out.found_instead || '').trim()

  // (ก) แหล่งต้องอยู่ในโดเมนที่เชื่อถือได้ และต้องเป็นที่อยู่ที่ยังเปิดได้จริง
  //     แยกข้อความ 2 กรณีให้ชัด — "โดเมนไม่น่าเชื่อถือ" กับ "ที่อยู่นี้ตายแล้ว" ต้องแก้คนละแบบ
  //     กรณีหลังตัวบทเปิดได้อยู่ แค่ต้องไปที่อยู่ใหม่ ผู้ใช้จึงตามต่อเองได้ทันที
  const deadWhy = deadSource(url)
  // เบาะแสจากรอบกู้ต่อท้ายเหตุผลเสมอ — เก็บไว้ใน note ซึ่งหน้าจอย้ายไปไว้ใน tooltip แล้ว
  // (2026-08-22 · ผู้ใช้ขอให้บนหน้าจอเหลือแค่ "ชื่อฉบับ + เปิดตัวบท ↗" ไม่ใช่คำบรรยายยาว ๆ)
  const lead = leadNote(webLead)
  // ชื่อฉบับที่เบาะแสระบุได้ ดีกว่าชื่อลอย ๆ ที่ข้ออ้างถึง ("กฎหมายว่าด้วยคุณภาพน้ำ")
  // นี่คือสิทธิ์เดียวที่เว็บนอกรายการมี — ชี้ตัวฉบับ · ห้ามแตะ answer_plain / source_excerpt
  const leadName = String(webLead?.law_name || '').trim()
  if(!hostAllowed(url)) return cacheFail({ ...fail([deadWhy
    ? 'ที่อยู่ตัวบทที่ค้นเจอเปิดไม่ได้แล้ว — ' + deadWhy
    : url
      ? 'แหล่งที่ค้นเจอไม่อยู่ในโดเมนที่เชื่อถือได้ — เปิดตรวจเองก่อนใช้'
      : 'ค้นไม่เจอตัวบทที่ระบุเกณฑ์ของข้อนี้', lead].filter(Boolean).join(' · ')),
    // url ตรงนี้ไม่ผ่านด่านโดเมน จึงส่งออกไปเป็นลิงก์ "เปิดตัวบท" ไม่ได้ — ใช้ของรอบกู้แทน
    // เก็บ url เดิมไว้ใน note ข้างบนแล้วผ่านคำอธิบายเหตุผล
    source_url: leadUrl, law_name: leadName || lawHint, found_instead: foundInstead })

  // (ข) ไม่มีข้อความจากตัวบทรองรับ = แต่งจากความจำ
  if(!excerpt || !plain) return cacheFail({
    ...fail(['เปิดตัวบทแล้วแต่ไม่มีข้อความจากตัวบทรองรับ', lead].filter(Boolean).join(' · ')),
    source_url: url || leadUrl, law_name: out.law_name || leadName || lawHint,
    section_ref: out.section_ref || '', found_instead: foundInstead })

  // (ค) เขียนว่า "ตามที่กฎหมายกำหนด" = ยังไม่ได้ตอบคำถาม (สเปกข้อ 4)
  if(NON_ANSWER_RE.test(plain)) return cacheFail({
    ...fail(['เปิดตัวบทแล้วแต่ยังไม่พบเกณฑ์ที่เป็นรูปธรรม', lead].filter(Boolean).join(' · ')),
    source_url: url || leadUrl, law_name: out.law_name || leadName || lawHint,
    section_ref: out.section_ref || '', found_instead: foundInstead || plain })

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
    // ที่มาของคำตอบต้องติดไปด้วยเสมอ — จป. เอาไปอ้างกับผู้ตรวจ ISO ต้องรู้ว่าอ้างจากอะไรได้
    note: [
      fromTable ? 'มาจากตารางท้ายกฎหมาย' : '',
      skippedRead ? 'ใช้ผลจากการค้นโดยตรง (ผ่านด่านตรวจครบ)' : '',
      // บอกชั้นของแหล่งเสมอ — จป. ต้องรู้ว่าคำตอบนี้เอาไปยันกับผู้ตรวจได้แค่ไหน
      // 'official' คือ .go.th/.or.th ที่ผ่านกฎแต่เราไม่ได้ตรวจคุณภาพรายเว็บ
      // เว็บหน่วยงานบางแห่งเก็บฉบับก่อนแก้ไขไว้โดยไม่บอก และเทศบาล/อบต. มักคัดของกลางมาวาง
      isSecondarySource(url)
        ? 'อ่านจากฉบับรวมขององค์กรวิชาชีพ ไม่ใช่ต้นฉบับราชกิจจาฯ — ฉบับรวมมักมีเชิงอรรถบอกว่าข้อไหนถูกแก้แล้ว แต่ควรตรวจกับต้นฉบับก่อนใช้อ้างอิง'
        : sourceTier(url) === 'official'
          ? 'อ่านจากเว็บหน่วยงานราชการ/องค์กรวิชาชีพไทยที่ไม่ได้อยู่ในรายชื่อแหล่งหลัก — ตัวบทที่ได้ผ่านด่านหลักฐานครบ แต่บางเว็บเก็บฉบับก่อนแก้ไขไว้โดยไม่บอก ควรเทียบกับราชกิจจาฯ ก่อนใช้อ้างอิง'
          : '',
    ].filter(Boolean).join(' · '),
    from_secondary_source: isSecondarySource(url),
    source_tier: sourceTier(url),
  }

  await writeCache({
    question_key: key, topic_key: topic || null, anchor_question: question, ref_type: 'whole_law',
    answer_plain: result.answer_plain, answer_detail: result.answer_detail,
    law_name: result.law_name, section_ref: result.section_ref, from_table: fromTable,
    source_excerpt: excerpt, source_url: url, status: 'answered',
    confidence: result.confidence, note: result.note,
  })

  // หา "ลิงก์ราชกิจจานุเบกษาต้นฉบับ" ของฉบับที่ให้คำตอบ แล้วแนบไปเป็นฟิลด์เพิ่ม
  //
  // คำตอบจำนวนมากอ่านมาจากเว็บหน่วยงานหรือฉบับรวมขององค์กรวิชาชีพ ซึ่งลิงก์คนละที่กับราชกิจจาฯ
  // ผู้ตรวจ ISO ขอดูต้นฉบับ จึงควรมีลิงก์ราชกิจจาฯ ติดไปด้วยเมื่อพิสูจน์ได้ว่าเป็นฉบับเดียวกัน
  //
  // ⚠ ไม่แตะ source_url เด็ดขาด — ลิงก์ราชกิจจาฯ เป็นของแถม ไม่ใช่ของแทน
  // ฉบับรวมมักรวมฉบับแก้ไขไว้แล้ว ส่วนต้นฉบับราชกิจจาฯ เป็นตัวก่อนแก้
  // (ตารางที่ 2 ของกฎกระทรวง ฉบับที่ 39 ถูกยกเลิกโดยฉบับที่ 63 — อ่านตัวเลขจากฉบับรวม
  //  แล้วอ้างลิงก์ราชกิจจาฯ ฉบับ 39 = อ้างเอกสารที่ไม่มีตัวเลขนั้นอยู่จริง)
  // resolveGazetteLink() คืน null เมื่อพิสูจน์ไม่ได้ ซึ่งปลอดภัยกว่าเดา
  try{
    const gz = await resolveGazetteLink(result.law_name)
    if(gz){ result.gazette_url = gz.gazette_url; result.gazette_ref = gz.gazette_ref }
  }catch{ /* หาลิงก์ต้นฉบับไม่ได้ไม่ใช่เหตุให้คำตอบเสียไป */ }

  // เก็บฉบับนี้เข้าดัชนีราชกิจจาฯ ด้วย — มาถึงตรงนี้แปลว่าผ่านด่านตรวจครบทุกด่านแล้ว
  // (โดเมนเชื่อถือได้ · มีข้อความจากตัวบทรองรับ · ไม่ใช่ "ตามที่กฎหมายกำหนด" · ตัวเลขตรวจแล้ว)
  // จึงเป็นคู่ (ชื่อกฎหมาย, URL) ที่ยืนยันแล้วว่าเปิดได้จริง ซึ่งคือสิ่งที่ดัชนีต้องการพอดี
  // นี่คือทางเดียวที่ดัชนีจะครอบคลุมฉบับก่อน มิ.ย. 2566 ได้โดยไม่ต้องพึ่ง dump หรือ Token
  // ไม่ await ผลลัพธ์แบบมีเงื่อนไข — ล้มเหลวก็แค่ไม่ได้เก็บ คำตอบที่จ่ายเงินมาแล้วยังส่งกลับครบ
  // opened = เปิดไฟล์อ่านจริงในรอบนี้ · ไม่ใช่ตอบจาก snippet ของผลค้น
  // skippedRead เป็นจริงเมื่อรอบแรกผ่านด่านครบจนข้ามการอ่านไฟล์ไป ซึ่งประหยัดคำขอก็จริง
  // แต่แปลว่าชื่อกฎหมายกับ URL มาจากคนละแหล่ง ยืนยันไม่ได้ว่าคู่กันถูก จึงห้ามเก็บเข้าดัชนี
  await rememberGazetteDoc({ title: result.law_name, url, opened: !skippedRead && !!pdfB64 })

  return result
}
