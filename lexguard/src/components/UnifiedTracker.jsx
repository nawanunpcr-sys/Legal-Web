import { useEffect, useMemo, useState } from 'react'
import {
  TRACKER_STAGES, TRACKER_STATUS, REVIEW_REASSESS_RESULT,
  createTrackerCase, updateTrackerStage, deleteTrackerCase,
  advanceStage, logReview, fetchReviewLog,
} from '../lib/supabase.js'
import { useAuth, NO_PERM } from '../lib/auth.js'
import { toast } from '../lib/toast.js'
import { confirmDialog } from '../lib/confirm.js'
import { I } from './icons.jsx'
import { thDate } from '../lib/ui.jsx'

const VIEW_KEY = 'cr_tracker_view'
const today = () => new Date(new Date().toISOString().slice(0, 10))
const REVIEW_RESULTS = ['ไม่มีการเปลี่ยนแปลง', REVIEW_REASSESS_RESULT, 'ถูกยกเลิก']

// stage 5 goes overdue whenever the next review date has passed (even once done);
// other stages go overdue on a missed due_at while still open.
const isOverdue = st =>
  st.stage === 5
    ? !!(st.next_review_date && new Date(st.next_review_date) < today())
    : st.status !== 'done' && st.due_at && new Date(st.due_at) < new Date()
export const effStatus = st => (isOverdue(st) ? 'overdue' : st.status)

// group flat stage rows into cases keyed by law_id
export function groupCases(rows) {
  const g = {}
  rows.forEach(r => { const k = r.law_id ?? ('x' + r.id); (g[k] = g[k] || { law_id: r.law_id, stages: {} }); g[k].stages[r.stage] = r })
  return Object.values(g)
}

// the stage a case is currently sitting on (for board placement)
export function activeStage(c) {
  const ip = TRACKER_STAGES.find(s => c.stages[s.n]?.status === 'in_progress')
  if (ip) return ip.n
  const waiting = TRACKER_STAGES.find(s => (c.stages[s.n]?.status ?? 'waiting') === 'waiting')
  return waiting ? waiting.n : 5
}

// per-stage meta line shown on cards + stepper (assessment/review rounds)
function stageMeta(st) {
  if (!st) return null
  if (st.stage === 3) return `ประเมินครั้งที่ ${st.assessment_round || 1}`
  if (st.stage === 5) {
    const overdue = isOverdue(st)
    return (
      <>ทวนสอบครั้งที่ {st.review_round || 0}
        {st.last_review_date && <> · ล่าสุด {thDate(st.last_review_date)}</>}
        {st.next_review_date && <> · ถัดไป <span style={overdue ? { color: 'var(--bad)', fontWeight: 600 } : null}>{thDate(st.next_review_date)}</span></>}
      </>
    )
  }
  return null
}

// ── compact 5-stage progress bar for the dashboard, driven by lg_process_tracker
//    counts (how many cases currently sit on each stage) ──
export function TrackerStageBar({ rows = [], onGo }) {
  const { counts, pending, activeIdx } = useMemo(() => {
    const cases = groupCases(rows)
    const c = Object.fromEntries(TRACKER_STAGES.map(s => [s.n, 0]))
    cases.forEach(x => { c[activeStage(x)]++ })
    const pend = TRACKER_STAGES.filter(s => s.n < 5).reduce((a, s) => a + c[s.n], 0)
    const idx = TRACKER_STAGES.reduce((acc, s, i) => (s.n < 5 && c[s.n] > 0 ? i : acc), 0)
    return { counts: c, pending: pend, activeIdx: idx }
  }, [rows])

  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-h"><h3>Process Tracker</h3>
        <span className="sub" style={{ marginLeft: 'auto' }}>{pending ? `กำลังดำเนินการ ${pending} รายการ` : 'ไม่มีงานค้าง'}</span>
        {onGo && <span className="sub" style={{ marginLeft: 12, color: 'var(--brand)', cursor: 'pointer' }} onClick={onGo}>เปิดหน้าติดตาม →</span>}
      </div>
      <div className="panel-b">
        <div className="ship-track">
          {TRACKER_STAGES.map((s, i) => {
            const reached = i <= activeIdx
            const current = i === activeIdx && pending > 0
            const isLast = s.n === 5
            return (
              <div key={s.n} className={'ship-step' + (reached ? ' reached' : '') + (current ? ' current' : '')} onClick={onGo} title={s.title}>
                {i > 0 && <span className={'ship-line' + (reached ? ' fill' : '')} />}
                {current && <span className="ship-here">กำลังทำ</span>}
                <span className="ship-node">{isLast ? '✓' : counts[s.n]}</span>
                <span className="ship-lab">{s.title}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── reusable 5-node stepper for one case (list view + dashboard) ──
export function CaseStepper({ c, subLabel, onClickStage }) {
  return (
    <div className="ltrack" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
      {TRACKER_STAGES.map((s, i) => {
        const st = c.stages[s.n]
        const es = st ? effStatus(st) : 'waiting'
        const col = TRACKER_STATUS[es].color
        const prevDone = i > 0 && c.stages[TRACKER_STAGES[i - 1].n] && effStatus(c.stages[TRACKER_STAGES[i - 1].n]) === 'done'
        const meta = stageMeta(st)
        return (
          <div key={s.n} className={'lt-step s-' + es} onClick={() => st && onClickStage && onClickStage(st)}>
            {i > 0 && <div className="lt-line" style={prevDone ? { background: '#248a3d' } : null} />}
            <div className="lt-node" style={{ borderColor: col, background: es === 'waiting' ? 'var(--surface)' : col, color: es === 'waiting' ? col : '#fff' }}>{s.n}</div>
            <div className="lt-info">
              <div className="lt-title">{s.title}</div>
              <div className="lt-sub">{st ? (subLabel(st.stage, st.substatus) || TRACKER_STATUS[es].label) : '—'}</div>
              <div className="lt-meta">
                {st?.assignee_name ? <span>{st.assignee_name}{st.assignee_role ? ` · ${st.assignee_role}` : ''}</span> : <span style={{ color: 'var(--ink-faint)' }}>ยังไม่มีผู้รับผิดชอบ</span>}
                {meta && <span style={{ color: 'var(--ink-soft)' }}>{meta}</span>}
                <span className={'lt-badge b-' + es}>{TRACKER_STATUS[es].label}</span>
                {st?.due_at && st.stage !== 5 && <span className="lt-due">ครบ {thDate(st.due_at)}</span>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function UnifiedTracker({ rows, subs, laws, suggest, catMap = {}, onReload }) {
  const { can } = useAuth()
  const [view, setView] = useState(() => localStorage.getItem(VIEW_KEY) || 'board')
  const [stageModal, setStageModal] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [drawer, setDrawer] = useState(null)   // case for the detail drawer
  useEffect(() => { localStorage.setItem(VIEW_KEY, view) }, [view])

  const lawById = useMemo(() => Object.fromEntries(laws.map(l => [l.id, l])), [laws])
  const cases = useMemo(() => groupCases(rows), [rows])
  const subLabel = (stage, code) => (subs[stage] || []).find(x => x.code === code)?.label || code
  const tracked = useMemo(() => new Set(rows.map(r => r.law_id)), [rows])

  // board: one card per case, in its active-stage column
  const byStage = useMemo(() => {
    const g = Object.fromEntries(TRACKER_STAGES.map(s => [s.n, []]))
    cases.forEach(c => { const n = activeStage(c); g[n].push({ c, st: c.stages[n] }) })
    return g
  }, [cases])

  async function advance(c, to) {
    try { await advanceStage(c.law_id, to); onReload() }
    catch (e) { toast('อัปเดตไม่สำเร็จ: ' + e.message, 'error') }
  }
  async function delCase(c) {
    if (!(await confirmDialog('ลบรายการติดตามนี้?', { danger: true }))) return
    try { await deleteTrackerCase(c.law_id); onReload() } catch (e) { toast(e.message) }
  }

  const catChip = law => law?.cat ? <span className="tag" style={{ fontSize: 10 }}>{catMap[law.cat]?.name || law.cat}</span> : null

  return (
    <div className="view">
      <div className="panel" style={{ padding: '14px 18px', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ marginRight: 'auto' }}>
            <h2 style={{ margin: 0, fontSize: 17 }}>Process Tracker</h2>
            <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 3 }}>วงจรชีวิตกฎหมาย: AI ค้นหา → ทวนสอบ → ประเมิน → เข้าทะเบียน → ติดตามตามรอบ</div>
          </div>
          <div className="seg" style={{ margin: 0 }}>
            <button className={'seg-btn' + (view === 'board' ? ' active' : '')} onClick={() => setView('board')}>บอร์ด</button>
            <button className={'seg-btn' + (view === 'list' ? ' active' : '')} onClick={() => setView('list')}>รายการ</button>
          </div>
          <button className="btn btn-primary" disabled={!can('edit')} title={can('edit') ? '' : NO_PERM} onClick={() => setAddOpen(true)}><I n="plus" />เพิ่มรายการติดตาม</button>
        </div>
      </div>

      {cases.length === 0 && <div className="panel" style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--ink-faint)' }}>ยังไม่มีรายการติดตาม — กด “เพิ่มรายการติดตาม” เพื่อเริ่มติดตามกฎหมาย</div>}

      {cases.length > 0 && view === 'board' && (
        <div className="kanban">
          {TRACKER_STAGES.map(s => (
            <div className="kcol" key={s.n}>
              <div className="kcol-h" style={{ borderTopColor: s.color }}>
                <b>{s.n}. {s.title}</b>{s.role && <span className="krole">{s.role}</span>}
                <span className="kcount">{byStage[s.n]?.length || 0}</span>
              </div>
              <div className="kcol-b">
                {(byStage[s.n] || []).map(({ c, st }) => {
                  const law = lawById[c.law_id]
                  const es = st ? effStatus(st) : 'waiting'
                  const meta = stageMeta(st)
                  return (
                    <div className="kcard" key={c.law_id} onClick={() => setDrawer(c)} style={{ cursor: 'pointer' }}>
                      <div className="kt"><span className="law-code">{law?.code || '—'}</span>{(law?.name || 'รายการติดตาม').slice(0, 70)}</div>
                      <div className="ka" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginTop: 5 }}>
                        {catChip(law)}
                        <span className={'lt-badge b-' + es} style={{ fontSize: 9.5 }}>{subLabel(s.n, st?.substatus) || TRACKER_STATUS[es].label}</span>
                      </div>
                      {st?.assignee_name && <div className="ka">{st.assignee_name}{st.assignee_role ? ` · ${st.assignee_role}` : ''}</div>}
                      {meta && <div className="kn" style={{ fontVariantNumeric: 'tabular-nums' }}>{meta}</div>}
                      <div className="kacts" onClick={e => e.stopPropagation()}>
                        {s.n < 5 && <button className="btn btn-primary" style={{ padding: '3px 9px', fontSize: 11 }} disabled={!can('edit')} title={can('edit') ? '' : NO_PERM} onClick={() => advance(c, s.n + 1)}>ถัดไป →</button>}
                        {s.n === 5 && <button className="btn btn-primary" style={{ padding: '3px 9px', fontSize: 11 }} disabled={!can('edit')} title={can('edit') ? '' : NO_PERM} onClick={() => setStageModal(st)}>บันทึกการทวนสอบ</button>}
                        <button className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 11 }} disabled={!can('edit')} title={can('edit') ? '' : NO_PERM} onClick={() => st && setStageModal(st)}>แก้ไข</button>
                      </div>
                    </div>
                  )
                })}
                {(byStage[s.n] || []).length === 0 && <div className="kempty">—</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {cases.length > 0 && view === 'list' && cases.map(c => {
        const law = lawById[c.law_id]
        return (
          <div className="panel" key={c.law_id} style={{ marginBottom: 12 }}>
            <div className="panel-h">
              <span className="law-code">{law?.code || '—'}</span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{(law?.name || 'รายการติดตาม').slice(0, 90)}</span>
              {catChip(law)}
              <button className="btn btn-ghost" style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 12 }} onClick={() => setDrawer(c)}>ประวัติ</button>
              <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} disabled={!can('edit')} title={can('edit') ? '' : NO_PERM} onClick={() => delCase(c)}>ลบ</button>
            </div>
            <div className="panel-b">
              <CaseStepper c={c} subLabel={subLabel} onClickStage={st => setStageModal(st)} />
            </div>
          </div>
        )
      })}

      {stageModal && <StageModal st={stageModal} subs={subs} suggest={suggest} onClose={() => setStageModal(null)} onSaved={() => { setStageModal(null); onReload() }} />}
      {addOpen && <AddCaseModal laws={laws} tracked={tracked} onClose={() => setAddOpen(false)} onSaved={() => { setAddOpen(false); onReload() }} />}
      {drawer && <CaseDrawer c={drawer} law={lawById[drawer.law_id]} subLabel={subLabel} onClose={() => setDrawer(null)} />}
    </div>
  )
}

function StageModal({ st, subs, suggest, onClose, onSaved }) {
  const { can } = useAuth()
  const [f, setF] = useState(st)
  const [busy, setBusy] = useState(false)
  const [rev, setRev] = useState({ date: new Date().toISOString().slice(0, 10), result: REVIEW_RESULTS[0], note: '' })
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const setR = (k, v) => setRev(p => ({ ...p, [k]: v }))
  const stage = TRACKER_STAGES.find(s => s.n === st.stage)
  const dOnly = s => (s ? String(s).slice(0, 10) : '')

  async function save() {
    setBusy(true)
    try {
      await updateTrackerStage(f.id, {
        substatus: f.substatus, assignee_name: f.assignee_name || null, assignee_role: f.assignee_role || null,
        status: f.status, note: f.note || null, started_at: f.started_at || null, due_at: f.due_at || null,
      })
      onSaved()
    } catch (e) { toast('บันทึกไม่สำเร็จ: ' + e.message); setBusy(false) }
  }
  async function saveReview() {
    setBusy(true)
    try { await logReview(st.law_id, rev); onSaved() }
    catch (e) { toast('บันทึกการทวนสอบไม่สำเร็จ: ' + e.message); setBusy(false) }
  }

  return (
    <><div className="scrim" style={{ zIndex: 300 }} onClick={onClose} />
      <div className="modal" style={{ zIndex: 301, width: 560 }}>
        <div className="modal-head"><h3>ขั้นที่ {st.stage} · {stage?.title}</h3><button className="close" onClick={onClose}><I n="x" /></button></div>
        <div className="modal-body">
          <datalist id="dl-tr-people">{(suggest?.responsibles || []).map(x => <option key={x} value={x} />)}</datalist>
          <label className="form-label">สถานะย่อย</label>
          <select className="form-input" value={f.substatus || ''} onChange={e => set('substatus', e.target.value)}>
            <option value="">— เลือก —</option>
            {(subs[st.stage] || []).map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
          </select>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label className="form-label">ผู้รับผิดชอบ / หน่วยงาน</label><input className="form-input" list="dl-tr-people" value={f.assignee_name || ''} onChange={e => set('assignee_name', e.target.value)} /></div>
            <div><label className="form-label">ตำแหน่ง/บทบาท</label><input className="form-input" value={f.assignee_role || ''} onChange={e => set('assignee_role', e.target.value)} /></div>
          </div>
          <label className="form-label">สถานะรวม</label>
          <select className="form-input" value={f.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(TRACKER_STATUS).filter(([k]) => k !== 'overdue').map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label className="form-label">วันเริ่ม</label><input className="form-input" type="date" value={dOnly(f.started_at)} onChange={e => set('started_at', e.target.value)} /></div>
            <div><label className="form-label">วันครบกำหนด</label><input className="form-input" type="date" value={dOnly(f.due_at)} onChange={e => set('due_at', e.target.value)} /></div>
          </div>
          <label className="form-label">บันทึก</label>
          <textarea className="form-input" rows={2} value={f.note || ''} onChange={e => set('note', e.target.value)} />

          {st.stage === 5 && (
            <div className="panel" style={{ marginTop: 14, padding: '12px 14px', background: 'var(--surface-2)' }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>บันทึกการทวนสอบตามรอบ</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label className="form-label">วันที่ทวนสอบ</label><input className="form-input" type="date" value={rev.date} onChange={e => setR('date', e.target.value)} /></div>
                <div><label className="form-label">ผลการทวนสอบ</label>
                  <select className="form-input" value={rev.result} onChange={e => setR('result', e.target.value)}>
                    {REVIEW_RESULTS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <label className="form-label">หมายเหตุการทวนสอบ</label>
              <textarea className="form-input" rows={2} value={rev.note} onChange={e => setR('note', e.target.value)} />
              <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', margin: '6px 0 0' }}>
                {rev.result === REVIEW_REASSESS_RESULT ? 'จะส่งกลับไปประเมินใหม่ (ขั้น 3) และเพิ่มครั้งที่ประเมิน' : 'จะตั้งรอบทวนสอบถัดไป +12 เดือน'}
              </p>
              <div style={{ textAlign: 'right', marginTop: 10 }}>
                <button className="btn btn-primary" disabled={busy || !can('edit')} title={can('edit') ? '' : NO_PERM} onClick={saveReview}>{busy ? 'กำลังบันทึก…' : 'บันทึกการทวนสอบ'}</button>
              </div>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" disabled={busy || !can('edit')} title={can('edit') ? '' : NO_PERM} onClick={save}>{busy ? 'กำลังบันทึก…' : 'บันทึก'}</button>
        </div>
      </div></>
  )
}

function AddCaseModal({ laws, tracked, onClose, onSaved }) {
  const { can } = useAuth()
  const options = laws.filter(l => l.status !== 'repealed' && !tracked.has(l.id))
  const [lawId, setLawId] = useState(options[0]?.id || '')
  const [busy, setBusy] = useState(false)
  async function save() {
    if (!lawId) return
    setBusy(true)
    try { await createTrackerCase({ law_id: Number(lawId) }); onSaved() } catch (e) { toast('เพิ่มไม่สำเร็จ: ' + e.message); setBusy(false) }
  }
  return (
    <><div className="scrim" style={{ zIndex: 300 }} onClick={onClose} />
      <div className="modal" style={{ zIndex: 301, width: 520 }}>
        <div className="modal-head"><h3>เพิ่มรายการติดตาม</h3><button className="close" onClick={onClose}><I n="x" /></button></div>
        <div className="modal-body">
          <label className="form-label">เลือกกฎหมายที่จะติดตาม</label>
          <select className="form-input" value={lawId} onChange={e => setLawId(e.target.value)}>
            {options.length === 0 && <option value="">— ทุกฉบับถูกติดตามแล้ว —</option>}
            {options.map(l => <option key={l.id} value={l.id}>{l.code} — {(l.name || '').slice(0, 60)}</option>)}
          </select>
          <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 10 }}>ระบบจะสร้างวงจร 5 ขั้น (AI ค้นหา → ทวนสอบ → ประเมิน → เข้าทะเบียน → ติดตามตามรอบ) เริ่มที่ขั้น 1</p>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" disabled={busy || !lawId || !can('edit')} title={can('edit') ? '' : NO_PERM} onClick={save}>{busy ? 'กำลังเพิ่ม…' : 'เพิ่มและเริ่มติดตาม'}</button>
        </div>
      </div></>
  )
}

// ── detail drawer: stage history (started/completed) + review log timeline ──
function CaseDrawer({ c, law, subLabel, onClose }) {
  const [reviews, setReviews] = useState(null)
  useEffect(() => {
    let live = true
    if (c.law_id) fetchReviewLog(c.law_id).then(r => { if (live) setReviews(r) }).catch(() => live && setReviews([]))
    else setReviews([])
    return () => { live = false }
  }, [c.law_id])

  // build a merged, date-sorted timeline
  const events = useMemo(() => {
    const ev = []
    TRACKER_STAGES.forEach(s => {
      const st = c.stages[s.n]; if (!st) return
      if (st.started_at) ev.push({ at: st.started_at, tag: `ขั้น ${s.n}`, text: `เริ่ม ${s.title}` + (s.n === 3 ? ` · ประเมินครั้งที่ ${st.assessment_round || 1}` : '') })
      if (st.completed_at) ev.push({ at: st.completed_at, tag: `ขั้น ${s.n}`, text: `เสร็จ ${s.title}` })
    })
    ;(reviews || []).forEach(r => ev.push({ at: r.review_date, tag: 'ทวนสอบ', text: `${r.result || 'ทวนสอบ'}${r.note ? ' · ' + r.note : ''}${r.reviewer ? ' — ' + r.reviewer : ''}` }))
    return ev.sort((a, b) => new Date(a.at) - new Date(b.at))
  }, [c, reviews])

  const rounds = (reviews || []).length
  return (
    <><div className="scrim" onClick={onClose} />
      <div className="drawer">
        <div className="modal-head" style={{ padding: '16px 20px' }}>
          <div>
            <h3 style={{ margin: 0 }}><span className="law-code">{law?.code || '—'}</span>{(law?.name || 'รายการติดตาม').slice(0, 60)}</h3>
            <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4 }}>ประวัติวงจรชีวิต · ทวนสอบ {rounds} ครั้ง</div>
          </div>
          <button className="close" onClick={onClose}><I n="x" /></button>
        </div>
        <div style={{ padding: '16px 20px', overflow: 'auto' }}>
          <CaseStepper c={c} subLabel={subLabel} />
          <h4 style={{ margin: '18px 0 10px', fontSize: 13 }}>ไทม์ไลน์</h4>
          {reviews === null && <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>กำลังโหลด…</div>}
          {reviews !== null && events.length === 0 && <div style={{ color: 'var(--ink-faint)', fontSize: 13 }}>ยังไม่มีความเคลื่อนไหว</div>}
          <div className="tl-items">
            {events.map((e, i) => (
              <div className="tl-row" key={i}>
                <span className="tl-tag">{e.tag}</span>
                <span style={{ flex: 1 }}>{e.text}</span>
                <span style={{ color: 'var(--ink-faint)', fontSize: 12, whiteSpace: 'nowrap' }}>{thDate(e.at)}</span>
              </div>
            ))}
          </div>
        </div>
      </div></>
  )
}
