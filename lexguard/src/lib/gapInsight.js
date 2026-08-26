// ── P22 · วิเคราะห์ช่องว่าง (Gap Analysis) แบบไม่ใช้ AI ─────────────────────
//
// ข้อเสนอแนะของผู้ประเมินข้อ 4 ขอ "Gap Analysis **พร้อมข้อเสนอแนะ**"
// ของเดิมทำได้แค่ *นับ* ช่องว่าง — บอกไม่ได้ว่าทำไมถึงเกิด และควรเริ่มจากอะไร
//
// ═══ ทำไมไม่ใช้ AI ═══
// ผู้ใช้สั่งให้ทำโดยไม่พึ่ง API · และเมื่อดูข้อมูลจริงแล้วพบว่า **ไม่จำเป็นต้องใช้**
// เพราะรูปแบบที่ต้องหาปรากฏชัดในตัวข้อความอยู่แล้ว:
//   · NC 8 จาก 13 รายการ พูดเรื่องเดียวกันคือ "ผู้ชำนาญการด้านความปลอดภัย"
//     กระจายอยู่ 4 ฉบับ — แก้เรื่องเดียวปิดได้ทั้ง 8
//   · NC 5 รายการใน LA-032 เป็นลูกโซ่ ข้อ 6 → 7 → 8 → 9 ต่อกัน
//     ทำการประเมินอันตรายครั้งเดียวปิดได้ทั้งสาย
// การจับกลุ่มแบบนี้ใช้คำสำคัญกับการอ้างอิงข้อในตัวบทก็พอ ไม่ต้องให้โมเดลอ่าน
//
// ═══ ขอบเขตที่ซื่อสัตย์ ═══
// นี่คือการ **จัดกลุ่มตามรูปแบบข้อความ** ไม่ใช่การวิเคราะห์ทางกฎหมาย
// หน้าจอต้องเขียนกำกับไว้เสมอ ห้ามให้ผู้ใช้เข้าใจว่าเป็นความเห็นทางกฎหมาย

// ── หัวข้อที่พบบ่อยในกฎหมาย SHE ไทย ──────────────────────────────────────
// เรียงจากเฉพาะเจาะจงไปกว้าง — ข้อความหนึ่งจับได้หลายหัวข้อ เอาอันแรกที่ตรง
const THEMES = [
  { key: 'specialist', label: 'การขึ้นทะเบียนและใบอนุญาตบุคลากรเฉพาะ',
    re: /ผู้ชำนาญการ|ขึ้นทะเบียน|ใบอนุญาต|ใบแทนใบอนุญาต|คำขอรับใบอนุญาต/,
    advice: 'ส่งบุคลากรเข้าอบรมหลักสูตรที่กรมสวัสดิการฯ รับรอง แล้วยื่นขอขึ้นทะเบียน — เมื่อมีผู้ได้รับใบอนุญาตแล้ว ข้อกำหนดในกลุ่มนี้จะปิดได้พร้อมกัน' },
  { key: 'hazard', label: 'การประเมินอันตรายและความเสี่ยง',
    re: /ประเมินอันตราย|ชี้บ่งอันตราย|ระดับอันตราย|ความเสี่ยง|ผลกระทบของสภาพแวดล้อม/,
    advice: 'จัดทำการประเมินอันตรายให้ครบสายตั้งแต่ชี้บ่ง → วิเคราะห์ระดับ → จัดทำแผน → ส่งรายงาน ในรอบเดียวกัน' },
  { key: 'training', label: 'การฝึกอบรมและหลักสูตร',
    re: /ฝึกอบรม|หลักสูตร|วิทยากร|อบรม/,
    advice: 'รวมเข้าแผนฝึกอบรมประจำปี กำหนดผู้เข้าอบรมและงบประมาณล่วงหน้า' },
  { key: 'measure', label: 'การตรวจวัดและตรวจสอบ',
    re: /ตรวจวัด|ตรวจสอบ|ทดสอบ|สอบเทียบ|ตรวจสุขภาพ/,
    advice: 'กำหนดรอบการตรวจวัดประจำปีและผู้รับผิดชอบ พร้อมเก็บรายงานผลไว้เป็นหลักฐาน' },
  { key: 'form', label: 'แบบฟอร์มตามที่ราชการกำหนด',
    re: /ตามแบบ|แบบท้ายประกาศ|แบบคำขอ|แบบแจ้ง|แบบรายงาน/,
    advice: 'ดาวน์โหลดแบบฟอร์มจากท้ายประกาศมาใช้แทนแบบที่องค์กรทำเอง แล้วผูกไว้กับขั้นตอนที่เกี่ยวข้อง' },
  { key: 'report', label: 'การรายงานและแจ้งต่อราชการ',
    re: /รายงาน|แจ้ง|ส่งเอกสาร|ยื่นต่อ|อธิบดี/,
    advice: 'ทำปฏิทินกำหนดส่งรายงานราชการ แล้วผูกกับการแจ้งเตือนล่วงหน้าในระบบ' },
  { key: 'appoint', label: 'การแต่งตั้งบุคลากรและคณะกรรมการ',
    re: /แต่งตั้ง|คณะกรรมการ|จป\.|เจ้าหน้าที่ความปลอดภัย/,
    advice: 'ออกคำสั่งแต่งตั้งเป็นลายลักษณ์อักษร พร้อมประกาศให้ลูกจ้างทราบและเก็บสำเนาไว้' },
  { key: 'plan', label: 'การจัดทำแผนและมาตรการ',
    re: /จัดทำแผน|แผนการดำเนินงาน|มาตรการ|แผนป้องกัน/,
    advice: 'จัดทำแผนเป็นเอกสารที่มีผู้อนุมัติ ระบุผู้รับผิดชอบและกำหนดเวลาให้ชัด' },
  { key: 'equip', label: 'อุปกรณ์และการจัดหา',
    re: /จัดให้มี|อุปกรณ์|เครื่องมือ|อุปกรณ์คุ้มครองความปลอดภัย/,
    advice: 'ตรวจสอบว่ามีอุปกรณ์ครบตามที่กำหนดหรือไม่ ถ้าขาดให้ตั้งงบจัดหาในรอบถัดไป' },
]
const OTHER = { key: 'other', label: 'อื่นๆ', advice: 'ตรวจสอบตัวบทแล้วกำหนดแนวทางแก้ไขเป็นรายข้อ' }

export const themeOf = text => THEMES.find(t => t.re.test(String(text || ''))) || OTHER

// ── ลูกโซ่ในตัวบท ────────────────────────────────────────────────────────
// ข้อกำหนดที่เขียนว่า "ตามข้อ ๖" คือข้อที่ทำไม่ได้ถ้าข้อ ๖ ยังไม่เสร็จ
// ถ้า NC ทั้งสายอยู่ในฉบับเดียวกัน แปลว่าทำต้นทางครั้งเดียวปิดได้ทั้งสาย
const thaiNum = s => String(s).replace(/[๐-๙]/g, d => '๐๑๒๓๔๕๖๗๘๙'.indexOf(d))
const clauseOf = t => {
  const m = String(t || '').match(/^\s*(?:ข้อ|มาตรา)\s*([๐-๙0-9]+)/)
  return m ? thaiNum(m[1]) : null
}
const refsOf = t => [...String(t || '').matchAll(/ตาม(?:ข้อ|มาตรา)\s*([๐-๙0-9]+)/g)].map(m => thaiNum(m[1]))

// rows = รายการช่องว่างจาก buildGapAnalysis (ต้องมี law, section, detail, responsible)
export function analyzeGaps(rows = []) {
  if (!rows.length) return { themes: [], chains: [], summary: null }

  // ── จัดกลุ่มตามหัวข้อ ──
  const byTheme = new Map()
  for (const x of rows) {
    const t = themeOf(`${x.detail || ''} ${x.law?.name || ''}`)
    if (!byTheme.has(t.key)) byTheme.set(t.key, { ...t, items: [] })
    byTheme.get(t.key).items.push(x)
  }
  const themes = [...byTheme.values()]
    .map(t => ({
      ...t,
      laws: [...new Set(t.items.map(i => i.law?.code))].filter(Boolean),
      depts: [...new Set(t.items.map(i => String(i.responsible || '').trim()).filter(d => d && d !== '—'))],
      pct: Math.round(t.items.length / rows.length * 100),
    }))
    .sort((a, b) => b.items.length - a.items.length)

  // ── หาลูกโซ่ในฉบับเดียวกัน ──
  const chains = []
  const byLaw = new Map()
  for (const x of rows) {
    const k = x.law?.code || '—'
    if (!byLaw.has(k)) byLaw.set(k, { law: x.law, items: [] })
    byLaw.get(k).items.push(x)
  }
  for (const { law, items } of byLaw.values()) {
    if (items.length < 2) continue
    const clauses = new Map()
    items.forEach(x => { const c = clauseOf(x.detail) || clauseOf(x.section); if (c) clauses.set(c, x) })
    const links = []
    for (const x of items) {
      const from = clauseOf(x.detail) || clauseOf(x.section)
      for (const r of refsOf(x.detail)) if (clauses.has(r) && r !== from) links.push({ from: r, to: from })
    }
    if (links.length) {
      const roots = [...new Set(links.map(l => l.from))]
        .filter(r => !links.some(l => l.to === r))
      chains.push({ law, items, links, roots, count: items.length })
    }
  }
  chains.sort((a, b) => b.count - a.count)

  // ── สรุปเชิงบริหาร ──
  const top = themes.slice(0, 3)
  const covered = top.reduce((n, t) => n + t.items.length, 0)
  return {
    themes, chains,
    summary: {
      total: rows.length,
      themeCount: themes.length,
      lawCount: byLaw.size,
      topCovered: covered,
      topPct: Math.round(covered / rows.length * 100),
      unassigned: rows.filter(x => !String(x.responsible || '').trim() || x.responsible === '—').length,
    },
  }
}
