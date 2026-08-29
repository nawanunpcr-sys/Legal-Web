// ── P25 · สายวิเคราะห์ครบวงจร 6 ขั้น ────────────────────────────────────────
//
// ปัญหาที่แก้: ขั้นที่ 0 อยู่หน้าสรุปกฎหมาย ส่วนขั้น 1-5 อยู่ในลิ้นชักรายฉบับ
// ผู้ใช้ต้องจำเองว่ากดอะไรก่อนหลัง และไม่มีทางรู้ว่าฉบับไหนทำถึงขั้นไหนแล้ว
//
// ═══ ทำไมลำดับรัน ≠ ลำดับที่แสดง ═══
// เลขขั้น 1-6 เป็นลำดับที่ผู้ใช้คุ้นจากหน้าจอเดิม แต่ลำดับ "ต้องรัน" ต่างออกไป
// เพราะขั้นหลังกินผลของขั้นก่อน:
//   แตกข้อย่อย (4) ต้องมีสรุปภาพรวม (5) กับคู่มือปฏิบัติ (2) ก่อน ไม่งั้นได้ข้อย่อยจากตัวบทเปล่า
//   เสนอสถานะรายข้อ (3) อ่านข้อย่อยที่แตกไว้ · สรุปช่องว่าง (6) อ่านผลติ๊กข้อย่อย
// จึงแยกเป็นสองค่า: CHAIN แสดงผล · CHAIN_ORDER ลำดับเข้าคิว ห้ามสลับ

export const CHAIN = [
  { kind: 'law_screen',       step: 1, label: 'คัดกรองความเกี่ยวข้อง', per: 'law' },
  { kind: 'law_action_guide', step: 2, label: 'สิ่งที่ต้องทำ/เอกสาร',   per: 'law' },
  { kind: 'req_preassess',    step: 3, label: 'เสนอสถานะรายข้อ',      per: 'law' },
  { kind: 'req_breakdown',    step: 4, label: 'แตกข้อย่อย',            per: 'req' },
  { kind: 'law_overview',     step: 5, label: 'สรุปภาพรวมทั้งฉบับ',    per: 'law' },
  { kind: 'law_gap',          step: 6, label: 'สรุปช่องว่าง',          per: 'law' },
]

// ลำดับเข้าคิว — ห้ามสลับ ขั้นหลังทำงานบนผลของขั้นก่อน
export const CHAIN_ORDER = ['law_screen', 'law_action_guide', 'law_overview',
                            'req_breakdown', 'req_preassess', 'law_gap']

export const CHAIN_BY_KIND = Object.fromEntries(CHAIN.map(c => [c.kind, c]))

// ── ฉบับหนึ่งทำถึงขั้นไหนแล้ว ───────────────────────────────────────────────
// done = มีผลของขั้นนั้นในฐานแล้ว · queued = อยู่ในคิว (pending/processing) · todo = ยังไม่ทำ
// ตรวจจาก "ผลที่มีอยู่จริง" ไม่ใช่จากบันทึกว่าเคยกดปุ่ม เพราะกดแล้วล้มเหลวก็ยังนับว่ากดแล้ว
export function chainState(law, marks = {}, queued = {}) {
  const id = law.id
  const has = {
    law_screen:       !!law.relevance,
    law_action_guide: !!marks.guide?.[id],
    law_overview:     !!law.ai_summary?.overview,
    req_breakdown:    (marks.subs?.[id] || 0) > 0,
    req_preassess:    (marks.preassess?.[id] || 0) > 0,
    law_gap:          !!marks.gap?.[id],
  }
  return CHAIN.map(c => ({
    ...c,
    status: has[c.kind] ? 'done' : (queued[c.kind]?.has(chainRef(c, law)) ? 'queued' : 'todo'),
  }))
}

// รหัสอ้างอิงในคิว — ต้องตรงกับ refId() ใน api/queue-run.js
export function chainRef(c, law) { return c.per === 'req' ? null : 'law:' + law.id }

export function chainDoneCount(state) { return state.filter(s => s.status === 'done').length }

// ── รายการงานที่ต้องเข้าคิวของฉบับหนึ่ง เรียงตาม CHAIN_ORDER ───────────────
// ขั้นที่ per='req' แตกเป็นงานรายข้อกำหนด เพราะฉบับหนึ่งมีหลายข้อ
// ถ้ารวมทั้งฉบับไว้ในงานเดียว งานเดียวจะกินเวลาเกินงบต่อรายการจนคิวรอบนั้นพัง
export function chainJobs(law, { skipDone = true, state = null } = {}) {
  const done = new Set((state || []).filter(s => s.status === 'done').map(s => s.kind))
  const jobs = []
  for (const kind of CHAIN_ORDER) {
    const c = CHAIN_BY_KIND[kind]
    if (skipDone && done.has(kind)) continue
    if (c.per === 'req') {
      for (const r of law.reqs || []) {
        jobs.push({ kind, ref: 'req:' + r.id, label: `${law.code} ข้อ ${(r.seq ?? 0) + 1}` })
      }
    } else {
      jobs.push({ kind, ref: 'law:' + law.id, label: `${law.code} ${law.name || ''}`.trim().slice(0, 300) })
    }
  }
  return jobs
}
