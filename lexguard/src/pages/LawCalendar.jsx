// ปฏิทินกฎหมาย (P13 · Task 1) — รวมภาระผูกพันตามกฎหมายจาก 3 แหล่งในมุมมองรายเดือน
// (รายงานราชการ / การสื่อสาร / ทวนสอบ). logic การคำนวณอยู่ใน lib/calendar.js (ใช้ร่วมกับ Dashboard)
import { useMemo, useState } from 'react'
import { TH_MONTHS, daysTo, thDate, usePageFilters } from '../lib/ui.jsx'
import { CAL_TYPES, buildObligations, filterByCat, filterByKind,
         obligationsInMonth, overdueBefore, monthCounts } from '../lib/calendar.js'

// badge นับถอยหลังรายวัน (ใช้ daysTo เดิม)
function DayBadge({ date }) {
  const d = daysTo(date)
  if (d < 0)  return <span className="chip-date overdue">เกิน {Math.abs(d)} วัน</span>
  if (d === 0) return <span className="chip-date today">วันนี้!</span>
  if (d <= 7) return <span className="chip-date soon">อีก {d} วัน</span>
  return <span className="chip-date ok">อีก {d} วัน</span>
}

function TypeBadge({ kind }) {
  const t = CAL_TYPES[kind]
  return <span className="tag" style={{ borderColor: (t.color || '#888') + '33', color: t.color || '#888' }}>{t.label}</span>
}

function CalRow({ o, onOpen }) {
  return (
    <div className="tl-row cal-row" onClick={onOpen} role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px', cursor: 'pointer', flexWrap: 'wrap' }}>
      <DayBadge date={o.date} />
      {o.law_code && <span className="law-code" style={{ minWidth: 58 }}>{o.law_code}</span>}
      <span style={{ flex: 1, minWidth: 160, fontSize: 13 }}>
        {o.title}
        {o.sub && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 2 }}>{o.sub}</span>}
      </span>
      <TypeBadge kind={o.kind} />
      <span className="sub" style={{ whiteSpace: 'nowrap' }}>{thDate(o.date)}</span>
    </div>
  )
}

export default function LawCalendar({ reports = [], comms = [], workflow = [], lawMap = {}, cats = [], onGoView }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())   // 0-based
  // Task 6.1 · จำ filter ต่อหน้า (lg_filters.calendar)
  const [f, setF, resetF, filterActive] = usePageFilters('calendar', { catFilter: 'all', kindFilter: 'all' })
  const { catFilter, kindFilter } = f
  const setCatFilter = v => setF('catFilter', v), setKindFilter = v => setF('kindFilter', v)

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()

  const allObligations = useMemo(() => buildObligations({ reports, comms, workflow, lawMap }), [reports, comms, workflow, lawMap])
  const obligations = useMemo(() => filterByKind(filterByCat(allObligations, catFilter), kindFilter), [allObligations, catFilter, kindFilter])

  const monthItems = useMemo(() => obligationsInMonth(obligations, year, month), [obligations, year, month])
  const carried = useMemo(() => isCurrentMonth ? overdueBefore(obligations, year, month) : [], [obligations, year, month, isCurrentMonth])

  // "ทำแล้ว" ต้องเคารพตัวกรองหมวดด้วย: reports/workflow กรองผ่าน law_id → cat, ส่วน comms (ไม่มีหมวด) นับเฉพาะเมื่อเลือก "ทุกหมวด"
  const counts = useMemo(() => {
    const matchCat = lawId => catFilter === 'all' || lawMap[lawId]?.cat === catFilter
    const doneSrc = {
      reports: reports.filter(r => matchCat(r.law_id)),
      comms: catFilter === 'all' ? comms : [],
      workflow: workflow.filter(wf => matchCat(wf.law_id)),
    }
    return monthCounts({ obligations, ...doneSrc }, year, month, isCurrentMonth)
  }, [obligations, reports, comms, workflow, lawMap, catFilter, year, month, isCurrentMonth])

  // หมวดที่มีอยู่จริง (จาก cats ที่โหลดมา แต่กรองเฉพาะที่มี obligation หรือแสดงทั้งหมด)
  const catList = useMemo(() => cats.map(c => c.code), [cats])

  const goItem = o => { const v = CAL_TYPES[o.kind]?.view; if (v && onGoView) onGoView(v) }

  const cards = [
    { lab: 'เกินกำหนด', val: counts.overdue, color: 'var(--bad)' },
    { lab: 'ต้องทำเดือนนี้', val: counts.due, color: 'var(--warn)' },
    { lab: 'ทำแล้ว', val: counts.done, color: 'var(--ok)' },
  ]

  return <div className="view">
    {/* header เดือน */}
    <div className="filterbar" style={{ alignItems: 'center' }}>
      <button className="month-yr-btn" onClick={() => { const m = month - 1; if (m < 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m) }} title="เดือนก่อนหน้า">‹</button>
      <span style={{ fontSize: 15, fontWeight: 700, minWidth: 150, textAlign: 'center' }}>{TH_MONTHS[month]} {year + 543}</span>
      <button className="month-yr-btn" onClick={() => { const m = month + 1; if (m > 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m) }} title="เดือนถัดไป">›</button>
      <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 12.5 }}
        onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()) }}>เดือนนี้</button>
    </div>

    {/* แถว 1 · หมวดกฎหมาย */}
    <div className="filterbar" style={{ marginTop: -4 }}>
      <span className={'chip' + (catFilter === 'all' ? ' active' : '')} onClick={() => setCatFilter('all')}>ทุกหมวด</span>
      {catList.map(c => (
        <span key={c} className={'chip' + (catFilter === c ? ' active' : '')} onClick={() => setCatFilter(c)}>{c}</span>
      ))}
    </div>

    {/* แถว 2 · ประเภท */}
    <div className="filterbar" style={{ marginTop: -6 }}>
      <span className={'chip' + (kindFilter === 'all' ? ' active' : '')} onClick={() => setKindFilter('all')}>ทั้งหมด</span>
      {Object.entries(CAL_TYPES).map(([k, t]) => (
        <span key={k} className={'chip' + (kindFilter === k ? ' active' : '')} onClick={() => setKindFilter(k)}>{t.label}</span>
      ))}
      {filterActive && <span className="chip" style={{ marginLeft: 'auto', cursor: 'pointer' }} onClick={resetF} title="ล้างตัวกรอง">✕ ล้างตัวกรอง</span>}
    </div>

    {/* การ์ดสรุป 3 ใบ */}
    <div className="rc-stats" style={{ marginTop: 8 }}>
      {cards.map((c, i) => (
        <div className="stat" key={i} style={{ borderTopColor: c.color }}>
          <div className="lab">{c.lab}</div>
          <div className="val num" style={{ color: c.color }}>{c.val}</div>
        </div>
      ))}
    </div>

    {/* ค้างจากเดือนก่อน (เฉพาะเดือนปัจจุบัน) */}
    {carried.length > 0 && (
      <div className="panel" style={{ marginTop: 14, borderTop: '3px solid var(--bad)' }}>
        <div className="panel-h"><h3><span style={{ color: 'var(--bad)' }}>⚠ ค้างจากเดือนก่อน</span></h3>
          <span className="sub" style={{ marginLeft: 'auto' }}>{carried.length} รายการ</span></div>
        <div className="panel-b">
          {carried.map(o => <CalRow key={o.id} o={o} onOpen={() => goItem(o)} />)}
        </div>
      </div>
    )}

    {/* รายการของเดือน */}
    <div className="panel" style={{ marginTop: 14 }}>
      <div className="panel-h"><h3>ภาระผูกพันเดือน {TH_MONTHS[month]} {year + 543}</h3>
        <span className="sub" style={{ marginLeft: 'auto' }}>{monthItems.length} รายการ</span></div>
      <div className="panel-b">
        {monthItems.length === 0 && carried.length === 0
          ? <div style={{ textAlign: 'center', color: 'var(--ink-faint)', padding: 40, fontSize: 13.5 }}>เดือนนี้ไม่มีภาระผูกพันตามกฎหมาย ✓</div>
          : monthItems.length === 0
            ? <div style={{ textAlign: 'center', color: 'var(--ink-faint)', padding: 24, fontSize: 13 }}>ไม่มีรายการครบกำหนดในเดือนนี้</div>
            : monthItems.map(o => <CalRow key={o.id} o={o} onOpen={() => goItem(o)} />)}
      </div>
    </div>
  </div>
}
