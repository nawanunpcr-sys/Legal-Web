// P13 · ตัวช่วยรวม "ภาระผูกพันตามกฎหมาย" จาก 3 แหล่ง — ใช้ร่วมกันระหว่าง
// หน้า "ปฏิทินกฎหมาย" (LawCalendar) และการ์ดสรุปบน Dashboard (ห้าม copy-paste logic).
//  1. lg_reports          → next_due_date  · ประเภท "รายงานราชการ"
//  2. lg_communications   → next_scheduled_date · ประเภท "การสื่อสาร"
//  3. lg_law_workflow     → reverify_date (status 'ไม่สอดคล้อง') · ประเภท "ทวนสอบ"

// ป้ายชื่อ + view ปลายทางของแต่ละประเภท (view ตรงกับ goView ใน App.jsx)
export const CAL_TYPES = {
  report:   { label: 'รายงานราชการ', view: 'reports', color: '#3A6A97' },
  comm:     { label: 'การสื่อสาร',    view: 'comm',    color: '#5F7A61' },
  reverify: { label: 'ทวนสอบ',        view: 'tracker', color: '#B4553F' },
}

export const startOfToday = () => new Date(new Date().toDateString())
const asDate = s => { if (!s) return null; const d = new Date(s); return isNaN(d) ? null : d }
// จริงในเดือน (year, month 0-based) หรือไม่
export const sameMonth = (s, year, month) => { const d = asDate(s); return !!d && d.getFullYear() === year && d.getMonth() === month }

// สร้างรายการภาระผูกพัน "ที่ต้องทำ" (มีวันครบกำหนด) จาก 3 แหล่ง
// item = { id, kind, date, title, law_code, cat, sub }
export function buildObligations({ reports = [], comms = [], workflow = [], lawMap = {} }) {
  const out = []
  reports.forEach(r => {
    if (!r.next_due_date) return
    out.push({
      id: 'report-' + r.id, kind: 'report', date: r.next_due_date,
      title: r.title || '(ไม่มีชื่อ)',
      law_code: r.law_code || null,
      cat: (r.law_id && lawMap[r.law_id]?.cat) || null,
      sub: [r.authority, r.responsible].filter(Boolean).join(' · '),
    })
  })
  comms.forEach(c => {
    if (!c.next_scheduled_date) return
    out.push({
      id: 'comm-' + c.id, kind: 'comm', date: c.next_scheduled_date,
      title: c.topic || '(ไม่มีหัวข้อ)',
      law_code: null, cat: null,
      sub: c.assigned_to || '',
    })
  })
  workflow.forEach(wf => {
    if (wf.status !== 'ไม่สอดคล้อง' || !wf.reverify_date) return
    const law = lawMap[wf.law_id]
    out.push({
      id: 'wf-' + wf.id, kind: 'reverify', date: wf.reverify_date,
      title: law?.name || 'กฎหมาย ' + (law?.code || ''),
      law_code: law?.code || null,
      cat: law?.cat || null,
      sub: wf.assessor_name || '',
    })
  })
  return out
}

// กรองตามหมวด (cat code) — item ที่ไม่มี cat จะแสดงเฉพาะเมื่อเลือก 'all'
export const filterByCat = (items, cat) => cat === 'all' ? items : items.filter(o => o.cat === cat)
// กรองตามประเภท (kind) — 'all' = ทั้งหมด
export const filterByKind = (items, kind) => kind === 'all' ? items : items.filter(o => o.kind === kind)

// รายการของเดือน (year, month 0-based) เรียงตามวันที่ ↑
export const obligationsInMonth = (obligations, year, month) =>
  obligations.filter(o => sameMonth(o.date, year, month)).sort((a, b) => new Date(a.date) - new Date(b.date))

// ค้างจากเดือนก่อน: due < ต้นเดือนที่เลือก และยังไม่ผ่าน (ใช้เฉพาะเดือนปัจจุบัน)
export function overdueBefore(obligations, year, month) {
  const monthStart = new Date(year, month, 1)
  return obligations
    .filter(o => { const d = asDate(o.date); return d && d < monthStart })
    .sort((a, b) => new Date(a.date) - new Date(b.date))
}

// จำนวน "ทำแล้ว" ในเดือนที่เลือก (reports/comms/workflow ที่ปิดงานในเดือนนั้น)
export function doneInMonth({ reports = [], comms = [], workflow = [] }, year, month) {
  let n = 0
  reports.forEach(r => { if (sameMonth(r.last_submitted_at, year, month)) n++ })
  comms.forEach(c => { if (sameMonth(c.last_sent_at, year, month)) n++ })
  workflow.forEach(wf => { if (sameMonth(wf.plan_closed_at, year, month) || sameMonth(wf.completed_at, year, month)) n++ })
  return n
}

// สรุปการ์ด 3 ใบ สำหรับเดือนที่เลือก (nb: overdue/due นับจากรายการที่ "แสดง" ในเดือนนั้น
// เพื่อให้ตรงกับลิสต์ — includePrev=true เมื่อดูเดือนปัจจุบัน จะรวม "ค้างจากเดือนก่อน" ด้วย)
export function monthCounts({ obligations, reports, comms, workflow }, year, month, includePrev = false) {
  const today = startOfToday()
  const monthItems = obligationsInMonth(obligations, year, month)
  const prev = includePrev ? overdueBefore(obligations, year, month) : []
  const shown = [...prev, ...monthItems]
  const overdue = shown.filter(o => { const d = asDate(o.date); return d && d < today }).length
  const due = monthItems.filter(o => { const d = asDate(o.date); return d && d >= today }).length
  const done = doneInMonth({ reports, comms, workflow }, year, month)
  return { overdue, due, done, total: shown.length }
}
