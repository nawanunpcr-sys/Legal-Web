// ── คำนวณ "วันบังคับใช้" ด้วยโค้ด แทนที่จะให้ AI บวกวันเอง ──────────────────
//
// เดิม prompt สั่งให้ AI คำนวณเอง (มีสูตรครบ 4 แบบ) แล้วโค้ดแค่ส่งค่าต่อ
//   law-analyze.js: effective_date: law.effective_date || ''
// ไม่มีการตรวจเลยว่าบวกวันถูกหรือผิด
//
// LLM พลาดเรื่องบวกวันข้ามเดือนข้ามปีบ่อยที่สุดในบรรดางานทั้งหมด โดยเฉพาะ
// "พ้นกำหนดหนึ่งร้อยแปดสิบวัน" ที่ต้องข้ามหลายเดือน และปีอธิกสุรทิน (ก.พ. 29 วัน)
// วันบังคับใช้ผิดแปลว่าทะเบียนเตือนผิดวัน ซึ่งเป็นหน้าที่หลักของระบบทั้งระบบ
//
// วิธีใหม่: AI ทำสิ่งที่มันเก่ง (อ่านตัวบทแล้วบอกว่าใช้กฎข้อไหน กี่วัน)
//          โค้ดทำสิ่งที่โค้ดไม่มีทางพลาด (บวกวันตามปฏิทินจริง)
// ผลพลอยได้: ตรวจสอบย้อนหลังได้ว่าวันนี้มาจากกฎข้อไหน ไม่ใช่ตัวเลขลอยๆ

// "วว/ดด/ปปปป" พ.ศ. → Date (UTC เที่ยงคืน) · คืน null ถ้ารูปแบบไม่ถูกหรือวันที่ไม่มีจริง
export function beToDate(be){
  const m = String(be || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{3,4})$/)
  if(!m) return null
  const d = +m[1], mo = +m[2]
  let y = +m[3]
  if(y > 2400) y -= 543          // พ.ศ. → ค.ศ. · ต่ำกว่านั้นถือว่าเป็น ค.ศ. อยู่แล้ว
  const dt = new Date(Date.UTC(y, mo - 1, d))
  // กันวันที่ไม่มีจริง เช่น 31/02 — Date จะเลื่อนไปเดือนถัดไปเงียบๆ
  if(dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null
  return dt
}

// Date → "วว/ดด/ปปปป" พ.ศ. (รูปแบบที่ฐานข้อมูลเก็บ)
export function dateToBe(dt){
  if(!(dt instanceof Date) || isNaN(dt)) return ''
  const p = n => String(n).padStart(2, '0')
  return `${p(dt.getUTCDate())}/${p(dt.getUTCMonth() + 1)}/${dt.getUTCFullYear() + 543}`
}

function addDays(dt, n){
  const out = new Date(dt.getTime())
  out.setUTCDate(out.getUTCDate() + n)    // ข้ามเดือน/ปี/ปีอธิกสุรทิน ถูกต้องเสมอ
  return out
}

/**
 * คำนวณวันบังคับใช้จากวันประกาศ + กฎที่ AI อ่านได้จากตัวบท
 *
 * announceBe — "วว/ดด/ปปปป" พ.ศ. (วันลงราชกิจจานุเบกษา)
 * rule — { type, days?, date? } จาก AI:
 *   next_day    ตั้งแต่วันถัดจากวันประกาศ              → +1
 *   same_day    ตั้งแต่วันประกาศ                       → +0
 *   after_days  เมื่อพ้นกำหนด N วันนับแต่วันประกาศ      → +N+1 (พ้นกำหนดแล้วจึงเริ่ม)
 *   fixed_date  ระบุวันที่ตรงๆ ในตัวบท                 → ใช้วันนั้น
 *   conditional ผูกกับเงื่อนไขที่ยังไม่เกิด             → เว้นว่าง
 *   not_stated  ตัวบทไม่ได้เขียนวันบังคับใช้ไว้เลย      → ใช้วันประกาศ แต่ทำเครื่องหมายว่าเป็นค่าตั้งต้น
 *
 * คืน { date, source, note } · date เป็น '' เมื่อคำนวณไม่ได้ (ไม่เดา)
 */
export function computeEffectiveDate(announceBe, rule){
  const type = String(rule?.type || '').trim()
  if(!type) return { date: '', source: 'none', note: 'AI ไม่ได้ระบุกฎวันบังคับใช้' }

  // กฎที่บอกว่า "ตัวบทเขียนไว้" ต้องคัดข้อความมายืนยัน เหมือนทุกด่านในระบบนี้
  // ไม่งั้น AI เดาว่า next_day แล้วโค้ดคำนวณให้ พร้อมติดป้าย "ระบบคำนวณจากตัวบท"
  // กลายเป็นความมั่นใจปลอม ซึ่งแย่กว่าไม่มีฟีเจอร์ (เจอจริงกับกฎกระทรวงที่ไม่มีข้อบอกวันบังคับใช้)
  const QUOTED = ['next_day', 'same_day', 'after_days', 'fixed_date']
  if(QUOTED.includes(type) && !String(rule?.excerpt || '').trim()){
    const base0 = beToDate(announceBe)
    return base0
      ? { date: dateToBe(base0), source: 'default',
          note: 'AI อ้างว่าตัวบทระบุวันบังคับใช้ แต่ไม่ได้คัดข้อความมายืนยัน — ใช้วันประกาศไปก่อน ต้องเปิดตัวบทตรวจ' }
      : { date: '', source: 'none', note: 'AI ไม่ได้คัดข้อความมายืนยันกฎวันบังคับใช้ และไม่มีวันประกาศให้ใช้แทน' }
  }

  // ตัวบทไม่ได้เขียนวันบังคับใช้ไว้เลย — พบบ่อยในกฎกระทรวง
  // ใช้วันประกาศเป็นค่าตั้งต้น แต่ต้องบอกให้ชัดว่าเป็นค่าตั้งต้น ไม่ใช่ค่าที่อ่านมาจากตัวบท
  if(type === 'not_stated'){
    const base0 = beToDate(announceBe)
    return base0
      ? { date: dateToBe(base0), source: 'default',
          note: 'ตัวบทไม่ได้ระบุวันบังคับใช้ — ใช้วันประกาศเป็นค่าตั้งต้น ควรตรวจสอบกับผู้รู้กฎหมาย' }
      : { date: '', source: 'none', note: 'ตัวบทไม่ได้ระบุวันบังคับใช้ และไม่มีวันประกาศให้ใช้แทน' }
  }

  if(type === 'conditional'){
    return { date: '', source: 'rule', note: 'วันบังคับใช้ผูกกับเงื่อนไขที่ยังไม่เกิด — เว้นว่างตามตัวบท' }
  }
  if(type === 'fixed_date'){
    const d = beToDate(rule.date)
    return d
      ? { date: dateToBe(d), source: 'rule', note: 'ตัวบทระบุวันที่ไว้ตรงๆ' }
      : { date: '', source: 'none', note: 'ตัวบทระบุวันที่ตรงๆ แต่รูปแบบที่ AI ส่งมาอ่านไม่ได้: ' + (rule.date || '(ว่าง)') }
  }

  const base = beToDate(announceBe)
  if(!base) return { date: '', source: 'none', note: 'ไม่มีวันประกาศที่ใช้เป็นตัวตั้งได้' }

  if(type === 'same_day') return { date: dateToBe(base), source: 'calc', note: 'บังคับใช้วันเดียวกับวันประกาศ' }
  if(type === 'next_day') return { date: dateToBe(addDays(base, 1)), source: 'calc', note: 'วันประกาศ + 1 วัน' }
  if(type === 'after_days'){
    const n = Number(rule.days)
    if(!Number.isInteger(n) || n < 0 || n > 3650){
      return { date: '', source: 'none', note: 'จำนวนวันที่ AI ส่งมาใช้ไม่ได้: ' + rule.days }
    }
    // "พ้นกำหนด N วัน" = ครบ N วันแล้วจึงเริ่มวันถัดไป จึงเป็น +N+1
    return { date: dateToBe(addDays(base, n + 1)), source: 'calc', note: `วันประกาศ + ${n} + 1 วัน (พ้นกำหนดแล้วจึงเริ่ม)` }
  }
  return { date: '', source: 'none', note: 'ไม่รู้จักกฎวันบังคับใช้: ' + type }
}

/**
 * รวมผลคำนวณเข้ากับค่าที่ AI เขียนมาเอง
 * ใช้ค่าที่โค้ดคำนวณเป็นหลักเสมอ · ถ้า AI เขียนไม่ตรงให้เก็บไว้เตือน
 * คำนวณไม่ได้จึงค่อยถอยไปใช้ค่าที่ AI เขียน (ดีกว่าเว้นว่าง แต่ต้องบอกว่าไม่ได้ตรวจ)
 */
export function resolveEffectiveDate(announceBe, aiDate, rule){
  const c = computeEffectiveDate(announceBe, rule)
  const ai = String(aiDate || '').trim()

  if(c.date){
    const mismatch = ai && ai !== c.date
    return {
      effective_date: c.date,
      effective_source: c.source,
      effective_note: c.note,
      // AI บวกวันผิด — เก็บไว้ให้ผู้ใช้เห็นว่าระบบแก้ให้แล้ว ไม่ใช่แก้เงียบๆ
      effective_ai_mismatch: mismatch ? ai : null,
    }
  }
  return {
    effective_date: ai,
    effective_source: ai ? 'ai' : 'none',
    effective_note: c.note + (ai ? ' · ใช้ค่าที่ AI เขียนแทน ยังไม่ได้ตรวจ' : ''),
    effective_ai_mismatch: null,
  }
}
