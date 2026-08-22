// ดัชนีราชกิจจานุเบกษาของเราเอง — หา "ฉบับไหนมีอยู่ และไฟล์อยู่ที่ไหน" โดยไม่ต้องยิง AI
//
// ทำไมต้องมี — Skill 3 หาตัวบทของกฎหมายที่ถูกอ้างถึงด้วย web_search อย่างเดียว ซึ่งพัง 2 ทาง:
//   1. ดัชนีของ search engine ยังคืนที่อยู่ราชกิจจาฯ แบบเก่า /DATA/PDF/... ที่ตายแล้ว
//      (ยิงจริง 2026-08-22 → 403 Cloudflare challenge) เสียคำขอฟรีเพื่อได้ค่าว่าง
//   2. การ recheck จุด pending เสีย 1 คำขอ AI ต่อ 1 จุด จึงตกโควตาเป็นประจำ
//      แล้วคืนว่า "ยังไม่ยืนยัน" ทั้งที่ประกาศออกมาแล้ว
//
// ดัชนีนี้ตอบได้แค่ "มีฉบับนี้ไหม ชื่อเต็มว่าอะไร ลงเล่ม/ตอน/หน้าไหน ไฟล์อยู่ที่ URL ใด"
// **ไม่มีเนื้อหาข้างใน** — การอ่านตัวบทเพื่อตอบคำถามยังเป็นงานของ AI เหมือนเดิม
// สิ่งที่ตัดออกไปคือ "รอบเดาว่าไฟล์อยู่ที่ไหน" ไม่ใช่ "รอบตรวจว่าตัวบทเขียนว่าอะไร"
//
// ⚠ ห้ามใช้ผลจากดัชนีนี้เป็นคำตอบโดยตรง — ชื่อเรื่องไม่ใช่หลักฐาน
// ด่าน source_excerpt ยังบังคับครบ · เจอชื่อแล้วต้องไปเปิดไฟล์อ่านจริงเสมอ

import { hostAllowed } from './law-source.js'

const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY
const SUPA_HEADERS = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'content-type': 'application/json' }

const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙'

// ── normalize · ตัวเดียวกันทั้งฝั่งโหลดและฝั่งค้น ────────────────────────────
// ก๊อปไปเขียนซ้ำสองที่แล้วมันจะค่อย ๆ ต่างกัน แล้ววันหนึ่งเข็มค้นจะไม่มีวันตรงกับที่เก็บไว้
// โดยไม่มีอะไรฟ้อง — เป็นบั๊กชนิดที่หาไม่เจอเพราะ "ไม่มี error แค่ไม่เจอผล"
//
// ภาษาไทยไม่เว้นวรรคระหว่างคำ การเว้นวรรคจึงเป็นเรื่องของคนพิมพ์ล้วน ๆ ตัดทิ้งได้ทั้งหมด
// เลขไทยกับอารบิกใช้ปนกันในเอกสารชุดเดียวกัน ("พ.ศ. ๒๕๖๔" กับ "พ.ศ. 2564") ต้องรวบเป็นแบบเดียว
export function normalizeGazetteTitle(s){
  return String(s || '')
    .replace(/[๐-๙]/g, d => String(THAI_DIGITS.indexOf(d)))
    .replace(/[​­﻿]/g, '')          // zero-width / soft hyphen / BOM
    .replace(/[\s ]+/g, '')                   // ช่องว่างทุกชนิด
    .replace(/[."'“”‘’()[\]{}·ๆฯ,;:!?—–\-]/g, '')  // เครื่องหมายวรรคตอนที่ไม่เปลี่ยนความหมาย
    .toLowerCase()
}

// ── สกัด "เข็มค้น" จากชื่อกฎหมายแม่ ─────────────────────────────────────────
// ประกาศลูกแทบทุกฉบับเอ่ยถึงเรื่องของกฎหมายแม่ไว้ "ท้ายชื่อเรื่อง" ของตัวเอง:
//   แม่  กฎกระทรวงควบคุมสถานประกอบกิจการที่เป็นอันตรายต่อสุขภาพ พ.ศ. 2560
//   ลูก  ประกาศกระทรวงสาธารณสุข เรื่อง หลักเกณฑ์การป้องกันและกำจัดแมลงและสัตว์ที่เป็นพาหะนำโรค
//        **ในสถานประกอบกิจการที่เป็นอันตรายต่อสุขภาพ** พ.ศ. 2564
// สังเกตว่าคำขึ้นต้นของแม่ ("ควบคุม") ไม่ได้ติดไปกับลูก แต่ "ส่วนท้าย" ติดไปเสมอ
// จึงคืนเข็มเป็น "ส่วนท้ายของแกน" หลายความยาว ให้ผู้เรียกลองจากยาวไปสั้น
// ยาวก่อน = แม่นก่อน · สั้นลงเมื่อยาวแล้วไม่เจอ = ยอมกว้างขึ้นทีละขั้นแทนที่จะยอมแพ้
const TYPE_PREFIX = /^(?:ร่าง)?(?:พระราชบัญญัติ|พระราชกำหนด|พระราชกฤษฎีกา|กฎกระทรวง|กฎ|ประกาศกระทรวง\S*|ประกาศกรม\S*|ประกาศคณะกรรมการ\S*|ประกาศสำนักงาน\S*|ประกาศ|ระเบียบ|ข้อบังคับ|ข้อบัญญัติ|คำสั่ง)/
const YEAR_SUFFIX = /(?:พ\.?ศ\.?\s*[๐-๙\d]{4}.*)$/
const SUBJECT_LEAD = /^(?:เรื่อง|ว่าด้วย)/

// เข็มที่สั้นกว่านี้ "ใช้ลำพังไม่ได้" ต้องมีเข็มเรื่องมาช่วยบีบเสมอ
// วัดกับดัชนีจริง 18,282 รายการ: เข็ม "การสาธารณสุข" (12 ตัวอักษร) คืน 189 ฉบับ
// ซึ่งเป็นประกาศหลักประกันสุขภาพแห่งชาติเกือบทั้งหมด ไม่เกี่ยวกับ พ.ร.บ.การสาธารณสุข เลย
// ผลกว้างแบบนี้แย่กว่าไม่เจอ เพราะมันไปกินที่ของ web_search ที่อาจหาเจอจริง
export const NEEDLE_MIN_ALONE = 18

export function gazetteNeedles(lawName){
  let core = String(lawName || '').trim()
  if(!core) return []
  core = core.replace(YEAR_SUFFIX, '').trim()
  core = core.replace(TYPE_PREFIX, '').trim()
  core = core.replace(SUBJECT_LEAD, '').trim()
  const n = normalizeGazetteTitle(core)
  if(n.length < 8) return []              // สั้นเกินกว่าจะระบุเรื่องได้ชัด ค้นไปก็ได้ขยะ

  // แกนเต็มมาก่อนเสมอ ไม่ว่าจะสั้นแค่ไหน — มันคือเข็มที่แม่นที่สุดที่มี
  // ("ควบคุมอาคาร" ยาว 11 ตัวอักษร ถ้าตัดทิ้งเพราะสั้น พ.ร.บ.ควบคุมอาคาร จะค้นไม่ได้เลย)
  const out = [n]
  // แล้วค่อยผ่อนเป็นส่วนท้ายที่สั้นลง — ประกาศลูกมักตัดคำขึ้นต้นของแม่ทิ้งแต่เก็บส่วนท้ายไว้
  for(const len of [34, 26, 20]){
    if(len < NEEDLE_MIN_ALONE || len >= n.length) continue
    const needle = n.slice(n.length - len)
    if(!out.includes(needle)) out.push(needle)
  }
  return out
}

// ── ค้นดัชนี ─────────────────────────────────────────────────────────────────
// คืน [] เสมอเมื่อมีปัญหา — ดัชนีนี้เป็นตัวช่วย ไม่ใช่ทางหลัก
// ค้นไม่ได้ต้องถอยไปใช้ web_search ตามเดิม ไม่ใช่ทำให้ทั้งเส้นล้ม
async function rows(qs){
  if(!SUPA_URL || !SUPA_KEY) return []
  try{
    const r = await fetch(`${SUPA_URL}/rest/v1/lg_gazette_index?${qs}`, { headers: SUPA_HEADERS })
    return r.ok ? (await r.json()) : []
  }catch{ return [] }
}

const esc = s => encodeURIComponent(String(s).replace(/[*,()]/g, ' '))

/**
 * ค้นชื่อเรื่องในดัชนี
 * @param {string[]} needles  ข้อความที่ normalize แล้ว · ต้องเจอครบทุกตัว (AND)
 * @param {object}   opt      { limit, sinceYear, extra } extra = เข็มเพิ่มที่ต้องเจอด้วย
 */
export async function searchGazette(needles, opt = {}){
  const list = (Array.isArray(needles) ? needles : [needles]).filter(Boolean)
  if(!list.length) return []
  const limit = opt.limit || 8
  const filters = list.map(n => `title_norm=ilike.*${esc(n)}*`).join('&')
  const since = opt.sinceYear ? `&publish_date=gte.${opt.sinceYear}-01-01` : ''
  // แถว discovered ไม่มี publish_date จึงเรียงด้วย loaded_at แทน ไม่งั้น null ไปกองท้ายสุด
  const only = opt.onlyDiscovered ? '&source=eq.discovered' : ''
  const order = opt.onlyDiscovered ? 'loaded_at.desc' : 'publish_date.desc'
  return await rows(
    `${filters}${since}${only}&select=title,doc_url,doc_type,book_no,part,page_no,publish_date,source` +
    `&order=${order}&limit=${limit}`)
}

/**
 * หา "ประกาศลูกที่ออกตามกฎหมายแม่ฉบับนี้"
 * ลองเข็มจากยาวไปสั้น หยุดที่ชั้นแรกที่เจอ — ชั้นยาวแม่นกว่า ชั้นสั้นเป็นตาข่ายรอง
 * topicNeedle (ถ้ามี) ต้องเจอด้วยเสมอ ใช้บีบให้ตรงเรื่องที่ข้อนั้นถามถึง
 */
export async function findChildAnnouncements(parentLawName, topicNeedle = '', opt = {}){
  const needles = gazetteNeedles(parentLawName)
  const topic = topicNeedle ? normalizeGazetteTitle(topicNeedle) : ''

  // มีเรื่องที่ถามอยู่แล้ว → บีบด้วยเรื่องเท่านั้น · ไม่เจอก็คือไม่เจอ
  //
  // ห้ามถอยไปค้นแบบไม่บีบเด็ดขาด เพราะผลที่ได้จะเป็น "กฎหมายลูกฉบับอื่นของแม่เดียวกัน"
  // ที่ไม่เกี่ยวกับคำถามเลย · วัดจริง: พ.ร.บ.ความปลอดภัยฯ + เรื่อง "ตรวจสุขภาพ" ไม่เจอ
  // แล้วถอยไปค้นกว้างได้ประกาศกองทุนความปลอดภัยฯ 17 ฉบับกลับมา ซึ่งไม่ตอบอะไรเลย
  // การยัดผลแบบนี้เข้า prompt แย่กว่าไม่ให้อะไรเลย เพราะไปเบียดที่ของ web_search
  // ซึ่งอาจหาเจอจริง และเป็นความผิดพลาดแบบเดียวกับที่ P17 ตั้งใจแก้ตั้งแต่ต้น
  if(topic){
    for(const n of needles){
      const hits = await searchGazette([n, topic], opt)
      if(hits.length) return { hits, needle: n, narrowed: true }
    }

    // ── ตาข่ายรองเฉพาะแถว discovered ─────────────────────────────────────
    // ชื่อกฎหมายไทยแทบไม่เคยบอก "เรื่อง" ไว้ในชื่อ — เรื่องอยู่ในเนื้อความ
    //   "กฎกระทรวง ฉบับที่ 55 (พ.ศ. 2543) ออกตามความในพระราชบัญญัติควบคุมอาคาร"
    //   มีชื่อกฎหมายแม่ครบ แต่ไม่มีคำว่า "บันไดหนีไฟ" ทั้งที่เป็นฉบับที่ตอบคำถามนั้น
    // บังคับให้เจอเรื่องในชื่อเรื่องด้วยจึงตัดฉบับที่ถูกต้องทิ้งเป็นประจำ
    //
    // ทำไมผ่อนได้เฉพาะกลุ่มนี้ — กฎ "ห้ามถอยไปค้นกว้าง" ตั้งไว้เพราะค้นกว้างใน
    // ดัชนีก้อนใหญ่ (18,000 แถวจาก สลค.) คืนกฎหมายลูกฉบับอื่นของแม่เดียวกันมาเป็นพรวน
    // แต่แถว discovered คือชุดเล็กที่ "ระบบเคยเปิดอ่านสำเร็จเพราะมันเกี่ยวข้องจริง"
    // ค้นกว้างในชุดนี้จึงไม่ได้เปิดประตูให้ขยะ — ต่างกันที่ชนิดของข้อมูล ไม่ใช่ที่ความเข้มของกฎ
    // ── ใช้ได้เฉพาะเข็มชั้นแรก (แกนเต็ม) เท่านั้น ─────────────────────────
    //
    // วัดจริงกับคลื่น 12 จุดของกฎกระทรวงควบคุมสถานประกอบกิจการฯ 2560:
    // ยอมให้ลองเข็มชั้นรอง ๆ ด้วย แล้ว "เจอ 12/12" ซึ่งดูดีมาก แต่เปิดดูจริงพบว่า
    // 8 จุดได้ประกาศเรื่องเสียงกับเรื่องแมลงกลับมาเหมือนกันหมด ทั้งที่ถามเรื่องระยะห่าง
    // บ่อดักไขมัน น้ำบริโภค — เพราะเข็มชั้นรอง "เป็นอันตรายต่อสุขภาพ" (20 ตัวอักษร)
    // ไปตรงกับประกาศลูก *ทุกฉบับ* ของกฎหมายแม่เดียวกัน โดยไม่เกี่ยวกับเรื่องที่ถามเลย
    //
    // นี่คือความผิดพลาดแบบเดียวกับที่ P17 ตั้งใจแก้ตั้งแต่ต้น (คืนข้อที่ไม่เกี่ยวมาแทนคำตอบ)
    // แค่ย้ายมาเกิดเร็วขึ้นหนึ่งชั้น · "เจอ" ที่ผิดฉบับแย่กว่า "ไม่เจอ" เพราะมันไปเบียดที่
    // ของ web_search และมาพร้อมป้ายว่าระบบเคยเปิดอ่านไฟล์นี้สำเร็จ ซึ่งอ่านแล้วดูน่าเชื่อ
    //
    // แกนเต็มไม่มีปัญหานี้ เพราะมันคือชื่อกฎหมายแม่แบบเต็ม ๆ:
    //   "ควบคุมสถานประกอบกิจการที่เป็นอันตรายต่อสุขภาพ" ไม่ไปตรงกับชื่อประกาศเรื่องเสียง
    //   แต่ "ควบคุมอาคาร" ตรงกับ "กฎกระทรวง ฉบับที่ 39 … ออกตามความในพระราชบัญญัติควบคุมอาคาร"
    // ซึ่งเป็นเคสที่ตาข่ายรองนี้มีไว้เพื่อช่วยจริง ๆ
    const first = needles[0]
    if(first){
      const hits = await searchGazette([first], { ...opt, limit: Math.min(opt.limit || 4, 4), onlyDiscovered: true })
      if(hits.length) return { hits, needle: first, narrowed: false, fromDiscovered: true }
    }
    return { hits: [], needle: '', narrowed: false }
  }

  // ไม่มีเรื่องมาบีบ → รับเฉพาะเข็มที่ยาวพอจะใช้ลำพังได้
  for(const n of needles){
    if(n.length < NEEDLE_MIN_ALONE) continue
    const hits = await searchGazette([n], opt)
    if(hits.length) return { hits, needle: n, narrowed: false }
  }
  return { hits: [], needle: '', narrowed: false }
}

// ── เก็บฉบับที่ "เปิดอ่านสำเร็จแล้ว" กลับเข้าดัชนี ──────────────────────────
//
// dump ของ สลค. เริ่มที่ มิ.ย. 2566 และแก้ที่ต้นทางไม่ได้ (ตรวจแล้ว ไม่มีชุดที่ย้อนกว่านี้)
// แต่ทุกครั้งที่ Skill 3 ตอบคำถามสำเร็จ มันเพิ่ง "เปิดไฟล์นั้นอ่านจริง" มาแล้ว
// แปลว่าเรามีของสองอย่างที่ดัชนีต้องการพอดี: ชื่อกฎหมาย กับ URL ที่พิสูจน์แล้วว่าเปิดได้
// เดิมทิ้งทั้งคู่ เก็บแค่คำตอบลง lg_ref_answers
//
// เก็บกลับเข้าดัชนี = ดัชนีโตไปตามเอกสารที่ทะเบียน "อ้างถึงจริง" ซึ่งเป็นชุดเล็กและวนซ้ำ
// และครอบคลุมฉบับก่อน มิ.ย. 2566 ได้เอง โดยไม่ต้องพึ่ง dump หรือ Token
//
// เกณฑ์รับ (เข้มไว้ก่อน — ดัชนีที่มีขยะแย่กว่าดัชนีที่เล็ก):
//   · URL ต้องผ่าน hostAllowed() ชุดเดียวกับด่านตรวจของ Skill 3 (กันโดเมนตาย/นอกรายการ)
//   · ชื่อกฎหมายต้องยาวพอจะ normalize แล้วใช้เป็นเข็มค้นได้
//   · แทรกอย่างเดียว ห้ามทับของเดิม — แถวจาก gdcatalog มี เล่ม/ตอน/หน้า ครบ
//     ปล่อยให้แถวนี้ทับ = ลบเลขอ้างอิงที่ผู้ตรวจ ISO ใช้ทิ้งไปเปล่า ๆ
const MIN_TITLE = 12

// ── "ที่อยู่นี้ชี้ไปที่ตัวเอกสารจริงหรือชี้ไปที่หน้าสารบัญ" ──────────────────
// เจอจริงตอน backfill ครั้งแรก: 5 จาก 23 รายการเป็นหน้ารายการ ไม่ใช่ไฟล์
//   https://laws.anamai.moph.go.th/th/doh-annuance?page=4   ← หน้าสารบัญ หน้าที่ 4
//   https://laws.anamai.moph.go.th/th/doh-annuance          ← หน้าสารบัญ
//   https://www.ratchakitcha.soc.go.th                      ← โดเมนเปล่า
//   https://www.rd.go.th/5937.html และ https://www.rd.go.th/5951.html  ← สองลิงก์ในสตริงเดียว
// ปล่อยเข้าดัชนีแล้วรอบหลังระบบจะส่งโมเดลไปเปิดหน้าสารบัญ พร้อมป้ายว่า
// "ลิงก์นี้ยืนยันแล้วว่าเปิดได้" ซึ่งแย่กว่าไม่มีลิงก์ เพราะมันดูน่าเชื่อ
//
// เกณฑ์: ต้องเป็น URL เดียว · ไม่ใช่โดเมนเปล่า · ไม่ใช่หน้าแบ่งหน้า
// และ path ต้องมีร่องรอยว่าชี้ไปที่ "ชิ้นหนึ่ง" — มีนามสกุลไฟล์ หรือมีเลขระบุรายการ
export function looksLikeDocumentUrl(raw){
  const s = String(raw || '').trim()
  if(!s || /\s/.test(s)) return false          // มีช่องว่าง = หลาย URL ปนกัน หรือมีคำอธิบายติดมา
  let u
  try{ u = new URL(s) }catch{ return false }
  const path = u.pathname || '/'
  if(path === '/' || path.length < 2) return false            // โดเมนเปล่า
  if(/[?&]page=/i.test(u.search)) return false                // หน้าแบ่งหน้าของสารบัญ
  // หน้าข่าว/บทความ ไม่ใช่ตัวบท · มีเลขรายการเหมือนกันจึงรอดด่านล่างไปได้
  // (เจอจริง: laws.anamai.moph.go.th/th/news-anamai/215741 ถูกตั้งชื่อว่าเป็นตัวกฎกระทรวง)
  if(/\/(?:news|article|blog|press|activity)[a-z-]*\//i.test(path)) return false
  const hasExt = /\.[a-z0-9]{2,5}$/i.test(path)               // .pdf .html .PDF
  const hasId  = /\/\d{3,}(?:\/|$)/.test(path)                // /206218  /documents/17144523.pdf
  const hasDownload = /download/i.test(path) && /\bdid=|\bid=/i.test(u.search)  // endpoint ของกรมอนามัย
  return hasExt || hasId || hasDownload
}

export async function rememberGazetteDoc({ title, url, source = 'discovered', opened = false } = {}){
  try{
    if(!SUPA_URL || !SUPA_KEY) return false
    // ⚠ บันทึกได้เฉพาะฉบับที่ "เปิดไฟล์อ่านจริงในรอบนี้" เท่านั้น
    //
    // เส้นทางที่ข้ามการอ่านไฟล์ (firstRoundComplete) ตอบจาก snippet ของผลค้นล้วน ๆ
    // ชื่อกฎหมายกับ URL จึงเป็นคนละแหล่งกัน และไม่มีอะไรยืนยันว่าคู่กันถูก
    // ตรวจของจริงในดัชนีแล้วพบว่าคู่ที่ผิดมาจากเส้นทางนี้:
    //   ไฟล์ mr35-33-upd69.pdf (กฎกระทรวง ฉบับที่ 33) ถูกเก็บด้วยชื่อ "ฉบับที่ 39"
    // ดัชนีที่มีคู่ผิดอันตรายกว่าดัชนีที่เล็ก เพราะระบบเอาไปเสนอโมเดลพร้อมป้ายว่า
    // "เคยเปิดอ่านไฟล์นี้สำเร็จ" ซึ่งน่าเชื่อจนไม่มีใครตรวจซ้ำ
    if(!opened) return false
    const u = String(url || '').trim()
    const t = String(title || '').trim()
    if(!u || !hostAllowed(u) || !looksLikeDocumentUrl(u)) return false
    const norm = normalizeGazetteTitle(t)
    if(norm.length < MIN_TITLE) return false

    const r = await fetch(`${SUPA_URL}/rest/v1/lg_gazette_index?on_conflict=doc_url`, {
      method: 'POST',
      headers: { ...SUPA_HEADERS, Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify([{ doc_url: u, title: t, title_norm: norm, source }]),
    })
    return r.ok
  }catch{ return false }   // เก็บดัชนีไม่ได้ไม่ใช่เหตุให้คำตอบที่ได้มาแล้วเสียไป
}

// ── หา "ลิงก์ราชกิจจานุเบกษาต้นฉบับ" ของกฎหมายที่ตอบไป ─────────────────────
//
// ผู้ใช้อยากได้ลิงก์ราชกิจจาฯ ติดไปกับคำตอบเสมอ เพราะเป็นสิ่งที่ผู้ตรวจ ISO ยอมรับ
// แต่คำตอบจำนวนมากอ่านมาจากเว็บหน่วยงานหรือฉบับรวมขององค์กรวิชาชีพ ซึ่งลิงก์คนละที่
//
// ⚠ ห้ามสลับลิงก์ที่ใช้เป็นหลักฐาน — ลิงก์ราชกิจจาฯ เป็น "ของแถม" ไม่ใช่ของแทน
// เพราะฉบับรวมมักรวมฉบับแก้ไขไว้แล้ว ส่วนต้นฉบับราชกิจจาฯ เป็นตัวก่อนแก้
// เคสจริงของระบบนี้: ตารางที่ 2 ของกฎกระทรวง ฉบับที่ 39 ถูกยกเลิกโดยฉบับที่ 63
// อ่านตัวเลขจากฉบับรวมของ ASA แล้วอ้างลิงก์ราชกิจจาฯ ฉบับ 39 = อ้างเอกสารที่ไม่มีตัวเลขนั้น
// `source_url` (หลักฐาน) จึงต้องอยู่ที่เดิมเสมอ · ตัวนี้เติมแค่ฟิลด์ใหม่ `gazette_url`
//
// ด่านตรวจ 3 ชั้น ก่อนยอมพิมพ์ลิงก์ราชกิจจาฯ ออกไป:
//  (1) รับเฉพาะแถวจากสารบัญทางการ (gdcatalog/soc_api) — คู่ (ชื่อ, URL) ยืนยันแล้ว
//      แถว discovered ห้ามใช้อ้างอิงเด็ดขาด เพราะชื่อเป็นสิ่งที่โมเดลตั้งให้ตอนตอบครั้งก่อน
//      พิสูจน์แล้วว่าพลาดจริง: แถวชื่อ "ประกาศ กสธ. ค่ามาตรฐานมลพิษทางเสียงฯ พ.ศ. 2561"
//      ชี้ไปที่ 142D051S0000000015700.pdf ซึ่งเปิดดูแล้วเป็น "ข้อบัญญัติ อบต.หาดส้มแป้น พ.ศ. 2565"
//  (2) ปีต้องตรงกัน ถ้าทั้งสองฝั่งระบุปี
//  (3) เลข "ฉบับที่ N" ต้องตรงกันเป๊ะ — เทียบด้วย substring ล้วนจะทำให้
//      "ฉบับที่ 39" ไปตรงกับ "ฉบับที่ 399" (เจอจริง: กฎกระทรวง ฉบับที่ 399 ว่าด้วยการยกเว้นรัษฎากร)
const ISSUE_RE = /ฉบับที่\s*([๐-๙\d]+)/
function issueNo(s){
  const m = String(s || '').match(ISSUE_RE)
  if(!m) return 0
  return Number(m[1].replace(/[๐-๙]/g, d => String(THAI_DIGITS.indexOf(d)))) || 0
}

export async function resolveGazetteLink(lawName){
  const name = String(lawName || '').trim()
  const norm = normalizeGazetteTitle(name)
  if(norm.length < 14) return null            // สั้นเกินกว่าจะชี้ฉบับได้ชัด
  const { yearsConflict } = await import('./repeal-match.js')

  // ค้นด้วยแกนของชื่อฉบับนั้นเอง (ไม่ใช่ชื่อกฎหมายแม่)
  for(const n of gazetteNeedles(name).concat([norm.slice(0, 40)])){
    if(!n || n.length < 14) continue
    const hits = await rows(
      `title_norm=ilike.*${esc(n)}*&source=in.(gdcatalog,soc_api)` +
      `&doc_url=like.*ratchakitcha.soc.go.th/documents*` +
      `&select=title,doc_url,book_no,part,page_no,publish_date&order=publish_date.desc&limit=6`)
    for(const h of hits){
      if(yearsConflict(name, h.title)) continue
      const a = issueNo(name), b = issueNo(h.title)
      if(a && b && a !== b) continue
      return {
        gazette_url: h.doc_url,
        gazette_ref: [h.book_no ? `เล่ม ${h.book_no}` : '', h.part ? `ตอนที่ ${h.part}` : '',
          h.page_no ? `หน้า ${h.page_no}` : ''].filter(Boolean).join(' '),
        gazette_title: h.title,
        gazette_date: h.publish_date || '',
      }
    }
  }
  return null
}

// สรุปผลค้นเป็นข้อความสั้นสำหรับใส่ใน prompt
// ใส่ทั้ง เล่ม/ตอน/หน้า/วันที่ เพราะเป็นสิ่งที่ผู้ตรวจ ISO ใช้อ้างอิง และเป็นตัวช่วยให้โมเดล
// แยกออกว่าฉบับไหนใหม่กว่า (ฉบับหลังมักแทนที่ฉบับก่อน)
//
// ⚠ ต้องบอกที่มาของแต่ละแถวด้วย เพราะสองแหล่งเชื่อได้ไม่เท่ากัน
// แถวจาก gdcatalog มาจากสารบัญทางการของ สลค. — ชื่อเรื่องกับไฟล์จับคู่กันถูกแน่นอน
// ส่วนแถว discovered ชื่อเรื่องเป็นสิ่งที่ "โมเดลตั้งให้" ตอนตอบคำถามครั้งก่อน ซึ่งพลาดได้
// เจอจริงตอน backfill: ไฟล์ mr35-33-upd69.pdf (กฎกระทรวง ฉบับที่ 33) ถูกตั้งชื่อว่า "ฉบับที่ 39"
// ถ้าไม่ติดป้ายแล้วบอกโมเดลว่า "ยืนยันแล้ว" มันจะเปิดไฟล์ผิดฉบับด้วยความมั่นใจ
const SOURCE_LABEL = {
  gdcatalog: 'สารบัญทางการของ สลค.',
  soc_api: 'สารบัญทางการของ สลค.',
  discovered: 'ระบบเคยเปิดอ่านไฟล์นี้สำเร็จ — ชื่อเรื่องมาจากการสรุปครั้งก่อน ต้องตรวจว่าตรงฉบับที่ต้องการจริง',
}

export function formatGazetteHits(hits){
  // ตัดชื่อซ้ำออกก่อน — ฉบับเดียวกันมักถูกเก็บไว้หลาย URL (ต้นฉบับราชกิจจาฯ + ฉบับรวมของ ASA)
  // ยัดเข้า prompt ทั้งคู่แล้วโมเดลจะเสียคำขอไปเปิดไฟล์เดียวกันซ้ำ
  const seen = new Set()
  const uniq = (hits || []).filter(h => {
    const k = normalizeGazetteTitle(h.title).slice(0, 60)
    if(seen.has(k)) return false
    seen.add(k); return true
  })
  return uniq.map((h, i) => {
    const d = h.publish_date ? String(h.publish_date).split('T')[0] : ''
    const where = [h.book_no ? `เล่ม ${h.book_no}` : '', h.part ? `ตอนที่ ${h.part}` : '',
      h.page_no ? `หน้า ${h.page_no}` : '', d].filter(Boolean).join(' ')
    return [
      `${i + 1}. ${h.title}`,
      where ? `   ราชกิจจาฯ ${where}` : '',
      `   ไฟล์: ${h.doc_url}`,
      `   ที่มาของรายการนี้: ${SOURCE_LABEL[h.source] || h.source || '-'}`,
    ].filter(Boolean).join('\n')
  }).join('\n')
}
