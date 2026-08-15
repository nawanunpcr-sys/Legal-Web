// ── ด่านตรวจตัวเลข · จับการ "แต่งเติมตัวเลข" ที่ด่านอื่นจับไม่ได้ ────────────
//
// เคสจริง (พ.ร.ฎ. 805 มาตรา 4, ทดสอบ 2026-08-15):
//   ตัวบท: "สำหรับเงินได้เป็นจำนวนร้อยละห้าสิบ ... ถึงวันที่ ๓๑ ธันวาคม พ.ศ. ๒๕๗๑"
//   AI เขียน: "ร้อยละหนึ่งร้อยของเงินได้ ... ถึงวันที่ 31 ธันวาคม 2570"
//   → อัตรายกเว้นผิดเท่าตัว และวันสิ้นสุดสิทธิผิดไป 1 ปี
//
// ด่าน appears_in / source_excerpt ที่มีอยู่ตรวจแค่ "อ้างถึงจริงมั้ย" ไม่ได้ตรวจว่า
// "ตัวเลขตรงกับตัวบทมั้ย" ตัวเลขผิดจึงผ่านทุกด่านเข้าทะเบียนไปเลย
// ซึ่งทำให้ทะเบียนใช้ตรวจ ISO ไม่ได้ — ร้ายแรงกว่าการอ้างเลขมาตราค้างไว้มาก
//
// เป็น "ป้ายเตือน" ไม่ใช่ "ตัวลบ" — ตัวบทไทยเขียนตัวเลขได้หลายแบบเกินกว่าจะกล้าลบอัตโนมัติ
// ลบผิดแล้วข้อกำหนดหายทั้งข้อ อันตรายกว่าปล่อยให้ผู้ใช้เห็นป้ายแล้วตรวจเอง

const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙'
export function arabicDigits(s){
  return String(s || '').replace(/[๐-๙]/g, d => String(THAI_DIGITS.indexOf(d)))
}

// ── แปลง "ตัวเลขที่เขียนเป็นคำไทย" เป็นจำนวน ──────────────────────────────
// ตัวบทกฎหมายไทยเขียนตัวเลขเป็นคำเสมอ ("สองแสนบาท" "ร้อยละห้าสิบ" "เก้าสิบวัน")
// ถ้าไม่แปลงส่วนนี้ ด่านจะเตือนมั่วทุกข้อจนใช้งานไม่ได้
const DIGIT_WORD = { ศูนย์:0, หนึ่ง:1, เอ็ด:1, สอง:2, ยี่:2, สาม:3, สี่:4, ห้า:5, หก:6, เจ็ด:7, แปด:8, เก้า:9 }
const SCALE_WORD = { สิบ:10, ร้อย:100, พัน:1000, หมื่น:10000, แสน:100000, ล้าน:1000000 }
const NUM_WORD_SRC = '(?:ศูนย์|หนึ่ง|เอ็ด|สอง|ยี่|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สิบ|ร้อย|พัน|หมื่น|แสน|ล้าน)+'

// อ่านคำไทยชุดเดียว เช่น "สองแสน" = 200000 · "ห้าสิบ" = 50 · "ยี่สิบเอ็ด" = 21
function readThaiNumber(w){
  let total = 0, current = 0, i = 0, seen = false
  while(i < w.length){
    let matched = false
    // หลักใหญ่ (ล้าน) ปิดยอดสะสมทั้งก้อน ต่างจากหลักย่อยที่ปิดเฉพาะตัวหน้า
    for(const [word, scale] of Object.entries(SCALE_WORD)){
      if(w.startsWith(word, i)){
        if(scale === 1000000){ total = (total + (current || 1)) * scale; current = 0 }
        else { current = (current || 1) * scale; total += current; current = 0 }
        i += word.length; matched = true; seen = true; break
      }
    }
    if(matched) continue
    for(const [word, d] of Object.entries(DIGIT_WORD)){
      if(w.startsWith(word, i)){ current = d; i += word.length; matched = true; seen = true; break }
    }
    if(!matched) return null
  }
  const n = total + current
  return seen ? n : null
}

// ── ปัญหาใหญ่ของภาษาไทย: ชื่อตัวเลขซ่อนอยู่ในคำธรรมดา และไม่มีช่องว่างคั่นคำ ──
// "ห้าม" มี "ห้า"(5) · "ความสามารถ" มี "สาม"(3) · "อุตสาหกรรม" มี "หก"(6)
// สามคำนี้พบทุกหน้าในกฎหมายไทย ถ้านับเป็นตัวเลขจะเตือนมั่วจนไม่มีใครเชื่อป้าย
// (ทดสอบกับ พ.ร.ฎ. 805 จริง: 6 ข้อ เตือนมั่ว 2 ข้อจากคำพวกนี้ล้วนๆ)
//
// ทางแก้: นับคำไทยเป็นตัวเลขเฉพาะเมื่อมี "ตัวบอกปริมาณ" ประกบอยู่จริง
// ซึ่งตรงกับวิธีที่ตัวบทกฎหมายเขียนจำนวนเสมอ — "สองแสนบาท" "เก้าสิบวัน" "ร้อยละห้าสิบ"
const QTY_PREFIX = 'ร้อยละ|จำนวน|ไม่เกิน|ไม่น้อยกว่า|อย่างน้อย|อย่างมาก|ภายใน|พ้นกำหนด|เกินกว่า|เกิน|ครบ|ทุก|เป็นเวลา|ระดับ'
const QTY_SUFFIX = 'บาท|วัน|เดือน|ปี|ครั้ง|คน|ราย|ระบบ|ดาว|ฉบับ|แห่ง|เมตร|ตารางเมตร|ลูกบาศก์|องศา|ชั่วโมง|นาที|เท่า|เปอร์เซ็นต์|ล้าน|แสน|หมื่น|พัน|ร้อย|สิบ'
// คำตัวเลขที่มีตัวบอกปริมาณนำหน้า หรือมีหน่วยตามหลัง เท่านั้นจึงนับ
// (?!ละ) กัน "ร้อย" ใน "ร้อยละ" ถูกนับเป็น 100 — เจอตอนทดสอบ พ.ร.ฎ. 805:
// "จำนวนร้อยละห้าสิบ" มี "จำนวน" นำหน้า ทำให้ "ร้อย" ผ่านเป็น 100
// แล้วค่าที่ AI แต่งเป็น "ร้อยละ 100" เลยผ่านด่านไปได้พอดี
const QTY_RE = new RegExp(
  `(?:(?<=${QTY_PREFIX})(${NUM_WORD_SRC})(?!ละ))|((${NUM_WORD_SRC})(?!ละ))(?=${QTY_SUFFIX})`, 'g')

// ── ดึง "จำนวนทั้งหมด" ที่ปรากฏในข้อความ ทั้งแบบตัวเลขและแบบคำ ──────────────
export function numbersIn(text){
  const raw = String(text || '')
  const t = arabicDigits(raw)
  const out = new Set()
  // ตัวเลขอารบิก/เลขไทย — ชัดเจนอยู่แล้ว ไม่ต้องมีตัวบอกปริมาณ
  // ตัด comma คั่นหลักพันออกก่อน ("200,000" ต้องได้ 200000)
  for(const m of t.replace(/(\d),(?=\d{3}\b)/g, '$1').matchAll(/\d+(?:\.\d+)?/g)){
    const n = Number(m[0])
    if(Number.isFinite(n)) out.add(n)
  }
  // ตัวเลขที่เขียนเป็นคำไทย — เฉพาะที่มีตัวบอกปริมาณประกบ
  for(const m of raw.matchAll(QTY_RE)){
    const word = m[1] || m[2]
    if(!word) continue
    const n = readThaiNumber(word)
    if(n !== null && n > 0) out.add(n)
  }
  return out
}

// ปี พ.ศ./ค.ศ. เขียนสลับกันได้ · วันที่คำนวณเองก็ไม่ตรงกับตัวบทตรงๆ
// จึงยอมรับทั้งสองฝั่งของการแปลง เพื่อไม่ให้เตือนมั่วเรื่องปี
function expand(nums){
  const s = new Set(nums)
  for(const n of nums){
    if(n >= 2400 && n <= 2700) s.add(n - 543)     // พ.ศ. → ค.ศ.
    if(n >= 1900 && n <= 2200) s.add(n + 543)     // ค.ศ. → พ.ศ.
  }
  return s
}

// ตัวเลขที่ไม่ต้องมีในตัวบท เพราะเป็นของที่ระบบหรือผู้เขียนใส่เอง
const IGNORE = new Set([0, 1, 2])   // ลำดับข้อย่อย/จำนวนนับเล็กๆ ที่ชนง่ายและไม่ใช่เกณฑ์

/**
 * ตรวจว่าตัวเลขทุกตัวใน req_text มีที่มาจากตัวบทจริง
 * reqs      — ข้อกำหนด (ต้องมี req_text · ใช้ source_excerpt เป็นหลักฐาน)
 * fullText  — ตัวบทเต็มถ้ามี (ทางข้อความ/ลิงก์เว็บ/PDF ที่แตกข้อความได้) ใช้เป็นหลักฐานสำรอง
 * คืนชุดใหม่ที่ติดธง unverified_numbers ให้ข้อที่มีตัวเลขหาที่มาไม่เจอ
 */
export function flagUnverifiedNumbers(reqs = [], fullText = ''){
  const docNums = expand(numbersIn(fullText))
  const hasDoc = docNums.size > 0
  let flagged = 0
  const out = (Array.isArray(reqs) ? reqs : []).map(r => {
    if(!r || !String(r.req_text || '').trim()) return r
    // หลักฐานของข้อนี้ = excerpt ของตัวเอง + ตัวบทเต็ม (ถ้ามี) + ฟิลด์อื่นที่คัดมาจากตัวบท
    const evidence = expand(numbersIn(
      [r.source_excerpt, r.other_terms, r.frequency, r.method, r.documents].filter(Boolean).join(' ')))
    const missing = []
    for(const n of numbersIn(r.req_text)){
      if(IGNORE.has(n)) continue
      if(evidence.has(n)) continue
      if(hasDoc && docNums.has(n)) continue
      missing.push(n)
    }
    if(!missing.length) return r
    flagged++
    return { ...r, unverified_numbers: missing }
  })
  return { reqs: out, flagged }
}
