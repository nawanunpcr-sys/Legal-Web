// รายการที่ต้องทำ (P17) — รวม LawCalendar + ProcessTracker เป็นหน้าเดียว อ่านจาก view lg_tasks.
// แท็บ (ต้องทำ/กำลังดำเนินการ/เสร็จแล้ว) → จัดกลุ่มตามช่วงเวลา → การ์ดงาน + ปุ่ม action ตรง.
// ตรรกะการบันทึกทั้งหมด reuse ของเดิม (CaseParts / handlers ใน App) — ไม่เขียน update ใหม่.
import { useState, useMemo, useEffect } from 'react'
import { syncReverifyOverdueNotifications } from '../lib/supabase.js'
import { I } from '../components/icons.jsx'
import { Tag, thDate, daysTo, usePageFilters, GLOSSARY } from '../lib/ui.jsx'
import { useAuth, NO_PERM } from '../lib/auth.js'
import AssessForm from '../components/AssessForm.jsx'
import { WFStepper, StatusBadge, MonitorModal, CaseDrawer, agingDays, agingColor } from '../components/CaseParts.jsx'

// ประเภทงาน + สี (เทียบเท่า CAL_TYPES เดิม)
const KIND_META = {
  workflow: { label: 'ทวนสอบกฎหมาย', color: '#B4553F' },
  report:   { label: 'รายงานราชการ', color: '#3A6A97' },
  comm:     { label: 'การสื่อสาร',   color: '#5F7A61' },
}
const KIND_FILTERS = [['all','ทั้งหมด'],['workflow','เพิ่ม-ทวนสอบกฎหมาย'],['report','รายงานราชการ'],['comm','การสื่อสาร']]

// กลุ่มช่วงเวลา (บนลงล่าง) — ซ่อนกลุ่มว่าง
const GROUPS = [
  ['overdue', '⚠ เกินกำหนด'],
  ['week',    'สัปดาห์นี้'],
  ['month',   'เดือนนี้'],
  ['next',    'ถัดไป'],
  ['none',    'ไม่มีกำหนด'],
]
function groupKey(due) {
  if (!due) return 'none'
  const d = daysTo(due)
  if (d < 0) return 'overdue'
  if (d <= 7) return 'week'
  const dt = new Date(due), now = new Date()
  if (dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth()) return 'month'
  return 'next'
}

function CountBadge({ due }) {
  if (!due) return <span className="chip-date ok">ไม่มีกำหนด</span>
  const d = daysTo(due)
  if (d < 0)  return <span className="chip-date overdue">เกิน {Math.abs(d)} วัน</span>
  if (d === 0) return <span className="chip-date today">วันนี้!</span>
  if (d <= 7) return <span className="chip-date soon">อีก {d} วัน</span>
  return <span className="chip-date ok">อีก {d} วัน</span>
}
function TypeBadge({ kind }) {
  const t = KIND_META[kind] || {}
  return <span className="tag" style={{ borderColor: (t.color || '#888') + '33', color: t.color || '#888' }}>{t.label}</span>
}

// modal ประเมิน (เปิด AssessForm ตรงๆ จากปุ่มการ์ด)
function AssessModal({ wf, law, suggest, onAssess, onClose }) {
  const { can } = useAuth()
  return (<>
    <div className="scrim" style={{ zIndex: 320 }} onClick={onClose} />
    <div className="modal" style={{ zIndex: 321, width: 600 }}>
      <div className="modal-head"><h3 title={GLOSSARY.pct}>{law?.code || '—'} · ประเมินความสอดคล้อง</h3><button className="close" onClick={onClose}><I n="x" /></button></div>
      <div className="modal-body">
        <div style={{ fontSize: 13, marginBottom: 8 }}>{law?.name}</div>
        {can('edit')
          ? <AssessForm law={law} suggest={suggest} onSubmit={p => onAssess(wf, law, p)} />
          : <div style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>{NO_PERM} — เฉพาะผู้แก้ไข</div>}
      </div>
    </div>
  </>)
}

export default function Tasks({ taskRows = [], workflowRows = [], laws = [], catMap = {}, suggest = {}, focusSignal = 0,
    onStartMonitor, onAssess, onClosePlan, onOpenLaw, onReportSubmit, onCommSent }) {
  const { can } = useAuth()
  const [tab, setTab] = useState('todo')          // todo | doing | done
  const [q, setQ] = useState('')
  const [showMonitor, setShowMonitor] = useState(false)
  const [openWf, setOpenWf] = useState(null)       // CaseDrawer
  const [assessWf, setAssessWf] = useState(null)   // AssessModal
  const [busyId, setBusyId] = useState(null)       // ปุ่ม report/comm กำลังบันทึก
  const [f, setF, resetF, filterActive] = usePageFilters('tasks', { catFilter: 'all', kindFilter: 'all', ownerFilter: 'all' })
  const { catFilter, kindFilter, ownerFilter } = f

  // คลิก badge/เมนู → โฟกัสแท็บ "ต้องทำ"
  useEffect(() => { if (focusSignal > 0) setTab('todo') }, [focusSignal])

  // แจ้งเตือน reverify เลยกำหนด — ครั้งแรกต่อ session (กันซ้ำใน DB อีกชั้น)
  useEffect(() => {
    if (!workflowRows.length) return
    try { if (sessionStorage.getItem('lg_reverify_synced') === '1') return } catch { /* noop */ }
    try { sessionStorage.setItem('lg_reverify_synced', '1') } catch { /* noop */ }
    syncReverifyOverdueNotifications(workflowRows)
  }, [workflowRows.length])   // eslint-disable-line react-hooks/exhaustive-deps

  const lawMap = useMemo(() => Object.fromEntries(laws.map(l => [l.id, l])), [laws])
  const wfById = useMemo(() => Object.fromEntries(workflowRows.map(w => [w.id, w])), [workflowRows])
  const openCaseByLaw = useMemo(() => {
    const m = {}; workflowRows.forEach(w => { if (w.status !== 'เสร็จสิ้น') m[w.law_id] = w.round || 1 }); return m
  }, [workflowRows])

  const cats = useMemo(() => [...new Set(taskRows.map(t => t.cat).filter(Boolean))].sort(), [taskRows])
  const owners = useMemo(() => [...new Set(taskRows.map(t => t.owner_name).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'th')), [taskRows])

  // baseTasks = ผ่าน cat + kind + owner + ค้นหา (ยังไม่กรองแท็บ) → ใช้ทั้งตัวเลขแท็บและลิสต์
  const baseTasks = useMemo(() => {
    const s = q.trim().toLowerCase()
    return taskRows.filter(t => {
      if (catFilter !== 'all' && t.cat !== catFilter) return false
      if (kindFilter !== 'all' && t.kind !== kindFilter) return false
      if (ownerFilter !== 'all' && t.owner_name !== ownerFilter) return false
      if (s && !((t.law_code || '').toLowerCase().includes(s) || (t.law_name || '').toLowerCase().includes(s) || (t.title || '').toLowerCase().includes(s))) return false
      return true
    })
  }, [taskRows, catFilter, kindFilter, ownerFilter, q])

  const counts = useMemo(() => {
    const todo = baseTasks.filter(t => t.state === 'overdue' || t.state === 'todo')
    return {
      todo: todo.length,
      overdue: todo.filter(t => t.state === 'overdue').length,
      doing: baseTasks.filter(t => t.state === 'doing').length,
    }
  }, [baseTasks])

  // งานของแท็บที่เลือก
  const tabTasks = useMemo(() => {
    if (tab === 'doing') return baseTasks.filter(t => t.state === 'doing')
    if (tab === 'done') {
      const cutoff = Date.now() - 90 * 86400000
      return baseTasks.filter(t => t.state === 'done' && t.done_at && new Date(t.done_at).getTime() >= cutoff)
        .sort((a, b) => new Date(b.done_at) - new Date(a.done_at))
    }
    return baseTasks.filter(t => t.state === 'overdue' || t.state === 'todo')
  }, [baseTasks, tab])

  // จัดกลุ่มตามช่วงเวลา (เฉพาะแท็บ todo/doing); แท็บ done = ลิสต์เดียวเรียงตาม done_at
  const grouped = useMemo(() => {
    if (tab === 'done') return [['done', tabTasks]]
    const by = {}
    tabTasks.forEach(t => { (by[groupKey(t.due_date)] = by[groupKey(t.due_date)] || []).push(t) })
    Object.values(by).forEach(arr => arr.sort((a, b) => new Date(a.due_date || 8.64e15) - new Date(b.due_date || 8.64e15)))
    return GROUPS.filter(([k]) => by[k]?.length).map(([k, label]) => [label, by[k]])
  }, [tabTasks, tab])

  const openLawObj = openWf ? lawMap[openWf.law_id] : null

  // ปุ่ม action หลักของการ์ด (report/comm ยิงตรง; workflow เปิด modal/drawer)
  async function fireReportComm(task) {
    if (busyId) return
    setBusyId(task.task_id)
    try { task.kind === 'report' ? await onReportSubmit(task.ref_id) : await onCommSent(task.ref_id) }
    finally { setBusyId(null) }
  }

  function ActionButton({ task, wf }) {
    if (task.kind === 'workflow' && wf) {
      if (wf.status === 'ไม่สอดคล้อง')
        return <button className="btn btn-primary" style={{ padding: '5px 14px', fontSize: 12.5 }} disabled={!can('edit')} title={can('edit') ? '' : NO_PERM}
          onClick={e => { e.stopPropagation(); onClosePlan(wf, lawMap[wf.law_id]) }}>ปิดแผน</button>
      if (wf.stage === 2 || wf.status === 'รอประเมิน')
        return <button className="btn btn-primary" style={{ padding: '5px 14px', fontSize: 12.5 }} disabled={!can('edit')} title={can('edit') ? '' : NO_PERM}
          onClick={e => { e.stopPropagation(); setAssessWf(wf) }}>ประเมิน</button>
      return null
    }
    if (task.kind === 'report')
      return <button className="btn btn-primary" style={{ padding: '5px 14px', fontSize: 12.5 }} disabled={busyId === task.task_id || !can('edit')} title={can('edit') ? '' : NO_PERM}
        onClick={e => { e.stopPropagation(); fireReportComm(task) }}>{busyId === task.task_id ? 'กำลังบันทึก…' : 'บันทึกส่งรายงาน'}</button>
    if (task.kind === 'comm')
      return <button className="btn btn-primary" style={{ padding: '5px 14px', fontSize: 12.5 }} disabled={busyId === task.task_id || !can('edit')} title={can('edit') ? '' : NO_PERM}
        onClick={e => { e.stopPropagation(); fireReportComm(task) }}>{busyId === task.task_id ? 'กำลังบันทึก…' : 'บันทึกการสื่อสาร'}</button>
    return null
  }

  return (
    <div className="view">
      {/* แท็บ */}
      <div className="filterbar" style={{ alignItems: 'center', gap: 8 }}>
        <button className={'tasktab' + (tab === 'todo' ? ' active' : '')} onClick={() => setTab('todo')}>
          {counts.overdue > 0 && <span className="tasktab-dot" />}ต้องทำ ({counts.todo})
          {counts.overdue > 0 && <span className="pill p-bad" style={{ fontSize: 10.5, marginLeft: 6 }}>เกิน {counts.overdue}</span>}
        </button>
        <button className={'tasktab' + (tab === 'doing' ? ' active' : '')} onClick={() => setTab('doing')}>กำลังดำเนินการ ({counts.doing})</button>
        <button className={'tasktab' + (tab === 'done' ? ' active' : '')} onClick={() => setTab('done')}>เสร็จแล้ว</button>
      </div>

      {/* แถวกรอง */}
      <div className="filterbar" style={{ alignItems: 'center' }}>
        <input className="form-input" style={{ maxWidth: 230, margin: 0 }} placeholder="ค้นหารหัส/ชื่อกฎหมาย/หัวข้อ…" value={q} onChange={e => setQ(e.target.value)} />
        <span className={'chip' + (catFilter === 'all' ? ' active' : '')} onClick={() => setF('catFilter', 'all')}>ทุกหมวด</span>
        {cats.map(c => <span key={c} className={'chip' + (catFilter === c ? ' active' : '')} onClick={() => setF('catFilter', c)}>{c}</span>)}
        <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)', margin: '0 4px' }} />
        {KIND_FILTERS.map(([k, lbl]) => <span key={k} className={'chip' + (kindFilter === k ? ' active' : '')} onClick={() => setF('kindFilter', k)}>{lbl}</span>)}
        {owners.length > 0 && (
          <select className="form-input" style={{ maxWidth: 190, margin: 0 }} value={ownerFilter} onChange={e => setF('ownerFilter', e.target.value)}>
            <option value="all">ผู้รับผิดชอบทั้งหมด</option>
            {owners.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )}
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} disabled={!can('edit')} title={can('edit') ? '' : NO_PERM} onClick={() => setShowMonitor(true)}>
          <I n="plus" />ติดตาม/ทวนสอบกฎหมายเดิม
        </button>
        {filterActive && <span className="chip" style={{ cursor: 'pointer' }} onClick={resetF} title="ล้างตัวกรอง">✕ ล้างตัวกรอง</span>}
      </div>

      {tabTasks.length === 0 && (
        <div className="panel"><div style={{ textAlign: 'center', color: 'var(--ink-faint)', padding: 44, fontSize: 13 }}>
          {tab === 'done' ? 'ยังไม่มีงานที่เสร็จใน 90 วันล่าสุด' : 'ไม่มีรายการในแท็บนี้ ✓'}
        </div></div>
      )}

      {grouped.map(([label, items]) => (
        <div key={label} style={{ marginTop: 10 }}>
          {tab !== 'done' && <div className="task-group-h">{label} <span className="sub">({items.length})</span></div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map(task => {
              const wf = task.kind === 'workflow' ? wfById[task.ref_id] : null
              const law = wf ? lawMap[wf.law_id] : null
              const overdue = task.state === 'overdue'
              const aging = wf ? agingDays(wf) : null
              return (
                <div key={task.task_id} className="panel" style={{ padding: '12px 16px', cursor: wf ? 'pointer' : 'default', border: overdue ? '1.5px solid var(--bad)' : undefined }}
                  onClick={() => { if (wf) setOpenWf(wf) }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <CountBadge due={task.due_date} />
                    {task.cat && <Tag c={task.cat} color={catMap[task.cat]?.color} />}
                    {task.law_code && <span className="law-code">{task.law_code}</span>}
                    <TypeBadge kind={task.kind} />
                    <span style={{ flex: 1, minWidth: 160, fontSize: 13 }}>{(task.title || '').slice(0, 80)}</span>
                    {task.status_label && <StatusBadge status={task.status_label} />}
                  </div>
                  {wf && <WFStepper wf={wf} />}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--ink-soft)', marginTop: 6 }}>
                    {task.owner_name && <span><b>ผู้รับผิดชอบ:</b> {task.owner_name}</span>}
                    {wf && task.state !== 'done' && aging != null && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: agingColor(aging) }}><I n="clock" />ค้างขั้นนี้ {aging} วัน</span>
                    )}
                    {wf?.reverify_date && <span><b>ทวนสอบถัดไป:</b> {thDate(wf.reverify_date)}</span>}
                    {!wf && task.subtitle && task.subtitle !== task.owner_name && <span>{task.subtitle}</span>}
                    {task.state === 'done' && task.done_at && <span><b>เสร็จเมื่อ:</b> {thDate(task.done_at)}</span>}
                    <span style={{ marginLeft: 'auto' }}><ActionButton task={task} wf={wf} /></span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {showMonitor && <MonitorModal laws={laws} catMap={catMap} openCaseByLaw={openCaseByLaw} onStart={onStartMonitor} onClose={() => setShowMonitor(false)} />}
      {assessWf && <AssessModal wf={assessWf} law={lawMap[assessWf.law_id]} suggest={suggest}
        onAssess={async (...a) => { try { await onAssess(...a); setAssessWf(null) } catch { /* คง modal ไว้ถ้า save พัง */ } }}
        onClose={() => setAssessWf(null)} />}
      {openWf && <CaseDrawer wf={openWf} law={openLawObj} suggest={suggest} allCases={workflowRows} onOpenRound={setOpenWf}
        onAssess={async (...a) => { try { await onAssess(...a); setOpenWf(null) } catch { /* noop */ } }}
        onClosePlan={async (...a) => { await onClosePlan(...a); setOpenWf(null) }}
        onOpenLaw={onOpenLaw} onClose={() => setOpenWf(null)} />}
    </div>
  )
}
