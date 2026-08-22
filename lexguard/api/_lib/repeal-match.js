// จับคู่ "กฎหมายที่ตัวบทสั่งให้ยกเลิก" กับทะเบียนของเราเอง — ทำฝั่ง server
//
// ปัญหาที่แก้: ตัวบทเขียนแค่ "ให้ยกเลิกกฎกระทรวง…พ.ศ. 2545" แล้วจบ
// ผู้ใช้ต้องไปไล่เองว่านั่นคือรหัสไหนในทะเบียน · หน้าเว็บเคยจับคู่ให้แล้ว แต่ทำฝั่ง client
// ซึ่งแปลว่า
//   · ผลการจับคู่ไม่ติดไปกับคำตอบของ API — หน้าอื่นหรือ staging ที่กินผลเดียวกันไม่รู้เรื่องด้วย
//   · ถ้ารายการกฎหมายในหน้ายังโหลดไม่เสร็จหรือค้าง จะกลายเป็น "ไม่พบในทะเบียน" ทั้งที่มี
//
// สิ่งที่โมดูลนี้ทำ: อ่าน lg_laws แล้วบอกว่าแต่ละฉบับที่ถูกยกเลิก **อยู่ในทะเบียนหรือไม่**
// และถ้ามี อยู่ที่รหัสไหน สถานะปัจจุบันเป็นอะไร
//
// ⚠ หลักการที่ห้ามผ่อน — "ไม่พบในทะเบียน" ไม่ใช่ความล้มเหลว และห้ามทำให้บทยกเลิกหายไป
// บทยกเลิกเป็นข้อเท็จจริงที่เขียนอยู่ในตัวบท ไม่ได้ขึ้นกับว่าเราเคยบันทึกฉบับเก่าไว้หรือเปล่า
// ทั้งสองกรณีต้องแสดงข้อความ "ยกเลิก <ชื่อกฎหมาย>" เหมือนกัน ต่างกันแค่มีปุ่มให้กดต่อหรือไม่
// ตัดทิ้งเพราะจับคู่ไม่ได้ = ผู้ตรวจ ISO ไม่มีทางรู้ว่าฉบับนี้ไปยกเลิกอะไรไว้

const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY
const SUPA_HEADERS = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY }

// ── ตัวเทียบชื่อ · ต้องให้ผลเดียวกับ findLawDuplicate() ใน src/lib/ui.jsx ─────
// หน้าเว็บยังมีตัวเทียบของตัวเองไว้ใช้ตอน API ไม่ได้ส่งผลมา (เช่นผลจาก cache รุ่นเก่า)
// สองฝั่งจึงต้องใช้กติกาเดียวกันเป๊ะ ไม่งั้นผู้ใช้จะเห็นผลจับคู่ต่างกันในหน้าเดียวกัน
const normText = s => String(s || '').trim().toLowerCase()
  .replace(/["'’().,\-–—/]/g, '').replace(/\s+/g, ' ').trim()
const stripEra = s => String(s || '')
  .replace(/พ\.?\s?ศ\.?\s?[\d๐-๙]{3,4}/g, '')
  .replace(/\(?\s*ฉบับที่\s?[\d๐-๙]+\s*\)?/g, '')
const baseName = s => normText(stripEra(s))

function bigrams(s){ const r = new Set(); for(let i = 0; i < s.length - 1; i++) r.add(s.slice(i, i + 2)); return r }
function diceSim(a, b){
  a = String(a || ''); b = String(b || '')
  if(!a || !b) return 0
  if(a === b) return 1
  const A = bigrams(a), B = bigrams(b)
  if(!A.size || !B.size) return 0
  let inter = 0
  A.forEach(x => { if(B.has(x)) inter++ })
  return (2 * inter) / (A.size + B.size)
}

// เกณฑ์เดียวกับที่หน้าเว็บใช้ตัดสินว่า "พบในทะเบียน" จริง (exact หรือ sim ≥ 0.75)
// ต่ำกว่านั้นถือว่าเป็นแค่ชื่อคล้าย ยังไม่พอจะชี้ว่าเป็นฉบับเดียวกัน
const SURE_SIM = 0.75
const MIN_NAME = 6

// ── ปีต่างกัน = คนละฉบับ ห้ามจับคู่แบบมั่นใจเด็ดขาด ─────────────────────────
//
// baseName() ตัด "พ.ศ. NNNN" ทิ้งก่อนเทียบ ซึ่งจำเป็นสำหรับกรณีชื่อสะกดต่างกันเล็กน้อย
// แต่มันทำให้ฉบับเก่ากับฉบับใหม่ของกฎหมายเรื่องเดียวกัน "เหมือนกันเป๊ะ" หลังตัดปี
//
// เจอจริงตอนทดสอบกับทะเบียน 160 ฉบับ:
//   ตัวบทสั่งยกเลิก "กฎกระทรวงกำหนดหลักเกณฑ์…ควบคุมสถานประกอบกิจการฯ พ.ศ. 2545"
//   จับคู่ไปโดน   "LA-005 กฎกระทรวง ควบคุมสถานประกอบกิจการฯ **พ.ศ. 2560**" ที่ยัง active
//   sim = 0.75 พอดี → ผ่านเกณฑ์ → หน้าเว็บจะขึ้นปุ่ม "ตั้งเป็นยกเลิกเลย"
//   กดแล้วจะไปยกเลิก **ฉบับปัจจุบัน** แทนฉบับเก่า ซึ่งทำให้ทะเบียนผิดทันที
//
// ปีของกฎหมายไทยคือตัวระบุฉบับที่ชัดที่สุดที่มีในชื่อ · ทั้งสองฝั่งมีปีและปีไม่ตรง
// = คนละฉบับแน่นอน ไม่ว่าชื่อจะเหมือนกันแค่ไหน · ยังแสดงให้เห็นว่าใกล้เคียงได้
// แต่ต้องไม่ติดธง in_registry และต้องไม่มีปุ่มให้กด
const YEAR_RE = /พ\.?\s?ศ\.?\s?([\d๐-๙]{4})/
const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙'
function yearOf(s){
  const m = String(s || '').match(YEAR_RE)
  if(!m) return 0
  const n = m[1].replace(/[๐-๙]/g, d => String(THAI_DIGITS.indexOf(d)))
  return Number(n) || 0
}
export function yearsConflict(a, b){
  const ya = yearOf(a), yb = yearOf(b)
  return !!(ya && yb && ya !== yb)
}

export function matchOne(laws, name){
  const nt = normText(name)
  if(nt.length < MIN_NAME) return null
  const exact = laws.find(l => normText(l.name) === nt)
  if(exact) return { type: 'exact', law: exact, sim: 1 }
  const bn = baseName(name)
  let best = null, bestSim = 0
  for(const l of laws){
    const s = diceSim(bn, baseName(l.name))
    if(s > bestSim){ bestSim = s; best = l }
  }
  if(best && bestSim > 0.6){
    // ชื่อฐานเดียวกันแต่ปีต่างกัน = ฉบับแก้ไข ไม่ใช่คนละฉบับ — ต้องบอกให้ผู้ใช้รู้ว่าเป็นชนิดนี้
    const sameBase = baseName(name) === baseName(best.name) && normText(name) !== normText(best.name)
    return { type: sameBase ? 'amendment' : 'fuzzy', law: best, sim: bestSim }
  }
  return null
}

async function fetchLaws(){
  if(!SUPA_URL || !SUPA_KEY) return []
  try{
    const r = await fetch(
      `${SUPA_URL}/rest/v1/lg_laws?select=id,code,name,status,active,repeal_date&limit=5000`,
      { headers: SUPA_HEADERS })
    return r.ok ? (await r.json()) : []
  }catch{ return [] }
}

/**
 * เติมผลจับคู่ทะเบียนให้รายการบทยกเลิก
 * คืน array ขนาดเท่าเดิมเสมอ — ทุกฉบับที่ตัวบทสั่งยกเลิกต้องอยู่ในผลลัพธ์ ไม่ว่าจับคู่ได้หรือไม่
 */
export async function matchRepeals(repeals){
  const list = (Array.isArray(repeals) ? repeals : [])
    .filter(x => x && String(x.law_name || '').trim())
    .map(x => ({ law_name: String(x.law_name).trim(), clause: String(x.clause || '').trim() }))
  if(!list.length) return []

  const laws = await fetchLaws()
  // อ่านทะเบียนไม่ได้ = ยังต้องคืนบทยกเลิกครบ แค่บอกไม่ได้ว่าอยู่ในทะเบียนไหม
  // ต่างจาก "ตรวจแล้วไม่พบ" อย่างสิ้นเชิง จึงใช้ registry_checked แยกสองกรณีนี้ออกจากกัน
  if(!laws.length) return list.map(r => ({ ...r, registry_checked: false, in_registry: false }))

  return list.map(r => {
    const hit = matchOne(laws, r.law_name)
    // ปีไม่ตรง = คนละฉบับ ตัดสิทธิ์การเป็น "พบในทะเบียน" ก่อนเกณฑ์ sim เสมอ
    const clash = hit ? yearsConflict(r.law_name, hit.law.name) : false
    const sure = hit && !clash && (hit.type === 'exact' || hit.sim >= SURE_SIM)
    return {
      ...r,
      registry_checked: true,
      in_registry: !!sure,
      match_type: hit ? hit.type : '',
      match_sim: hit ? Math.round(hit.sim * 100) / 100 : 0,
      registry_id: sure ? hit.law.id : null,
      registry_code: sure ? hit.law.code : '',
      registry_name: sure ? hit.law.name : '',
      // ชื่อคล้ายมากแต่ปีคนละปี — บอกให้ผู้ใช้รู้ว่าเจออะไรใกล้เคียง จะได้ไม่ต้องไปหาเอง
      // แต่ห้ามให้ปุ่มกด เพราะกดแล้วจะไปยกเลิกฉบับผิด
      near_miss_year: clash ? `${hit.law.code} — ${hit.law.name}` : '',
      // ฉบับเดิมถูกตั้งเป็นยกเลิกไปแล้วหรือยัง — ตัวชี้ว่ายังมีงานค้างให้ผู้ใช้ทำหรือเปล่า
      already_repealed: sure ? (hit.law.status === 'repealed' || hit.law.active === false) : false,
    }
  })
}
