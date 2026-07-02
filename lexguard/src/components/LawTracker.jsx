import { useMemo, useState } from 'react'
import { TRACKER_STAGES, TRACKER_STATUS, createTrackerCase, updateTrackerStage, deleteTrackerCase } from '../lib/supabase.js'
import { toast } from '../lib/toast.js'
import { confirmDialog } from '../lib/confirm.js'

const thDate = s => { if (!s) return '—'; const m = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']; const d = new Date(s); if (isNaN(d)) return s; return d.getDate() + ' ' + m[d.getMonth()] + ' ' + (d.getFullYear() + 543) }
const isOverdue = st => st.status !== 'done' && st.due_at && new Date(st.due_at) < new Date()
export const effStatus = st => isOverdue(st) ? 'overdue' : st.status

// group flat rows into cases keyed by law_id
export function groupCases(rows) {
  const g = {}
  rows.forEach(r => { const k = r.law_id ?? ('x' + r.id); (g[k] = g[k] || { law_id: r.law_id, stages: {} }); g[k].stages[r.stage] = r })
  return Object.values(g)
}

// ── reusable 3-stage stepper for one case (used on page + dashboard) ──
export function CaseStepper({ c, subLabel, onClickStage }) {
  return (
    <div className="ltrack">
      {TRACKER_STAGES.map((s, i) => {
        const st = c.stages[s.n]
        const es = st ? effStatus(st) : 'waiting'
        const col = TRACKER_STATUS[es].color
        const prevDone = i > 0 && c.stages[TRACKER_STAGES[i - 1].n] && effStatus(c.stages[TRACKER_STAGES[i - 1].n]) === 'done'
        return (
          <div key={s.n} className={'lt-step s-' + es} onClick={() => st && onClickStage && onClickStage(st)}>
            {i > 0 && <div className="lt-line" style={prevDone ? { background: '#248a3d' } : null} />}
            <div className="lt-node" style={{ borderColor: col, background: es === 'waiting' ? 'var(--surface)' : col, color: es === 'waiting' ? col : '#fff' }}>{s.n}</div>
            <div className="lt-info">
              <div className="lt-title">{s.title}</div>
              <div className="lt-sub">{st ? (subLabel(st.stage, st.substatus) || TRACKER_STATUS[es].label) : '—'}</div>
              <div className="lt-meta">
                {st?.assignee_name ? <span>{st.assignee_name}{st.assignee_role ? ` · ${st.assignee_role}` : ''}</span> : <span style={{ color: 'var(--ink-faint)' }}>ยังไม่มีผู้รับผิดชอบ</span>}
                <span className={'lt-badge b-' + es}>{TRACKER_STATUS[es].label}</span>
                {st?.due_at && <span className="lt-due">ครบ {thDate(st.due_at)}</span>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function LawTracker({ rows, subs, laws, cars = [], suggest, onReload }) {
  const [stageModal, setStageModal] = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const lawById = useMemo(() => Object.fromEntries(laws.map(l => [l.id, l])), [laws])
  const cases = useMemo(() => groupCases(rows), [rows])
  const subLabel = (stage, code) => (subs[stage] || []).find(x => x.code === code)?.label || code
  const tracked = useMemo(() => new Set(rows.map(r => r.law_id)), [rows])

  async function delCase(c) {
    if (!(await confirmDialog('ลบรายการติดตามนี้?', { danger: true }))) return
    try { await deleteTrackerCase(c.law_id); onReload() } catch (e) { toast(e.message) }
  }

  return (
    <div className="view">
      <div className="filterbar">
        <span className="right" style={{ marginRight: 'auto', color: 'var(--ink-faint)' }}>ติดตามกฎหมายผ่าน 3 ขั้น: ค้นหา/วิเคราะห์ → หน่วยงานดำเนินการ → ทวนสอบ</span>
        <button className="btn btn-primary" onClick={() => setAddOpen(true)}>+ เพิ่มรายการติดตาม</button>
      </div>

      {cases.length === 0 && <div className="panel" style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--ink-faint)' }}>ยังไม่มีรายการติดตาม — กด “เพิ่มรายการติดตาม” เพื่อเริ่มติดตามกฎหมาย</div>}

      {cases.map(c => {
        const law = lawById[c.law_id]
        return (
          <div className="panel" key={c.law_id} style={{ marginBottom: 12 }}>
            <div className="panel-h">
              <span className="law-code">{law?.code || '—'}</span>
              <span style={{ fontWeight: 600, fontSize: 14 }}>{(law?.name || 'รายการติดตาม').slice(0, 90)}</span>
              <button className="btn btn-ghost" style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 12 }} onClick={() => delCase(c)}>ลบ</button>
            </div>
            <div className="panel-b">
              <CaseStepper c={c} subLabel={subLabel} onClickStage={st => setStageModal(st)} />
            </div>
          </div>
        )
      })}

      {stageModal && <StageModal st={stageModal} subs={subs} cars={cars} suggest={suggest} onClose={() => setStageModal(null)} onSaved={() => { setStageModal(null); onReload() }} />}
      {addOpen && <AddCaseModal laws={laws} tracked={tracked} onClose={() => setAddOpen(false)} onSaved={() => { setAddOpen(false); onReload() }} />}
    </div>
  )
}

function StageModal({ st, subs, cars, suggest, onClose, onSaved }) {
  const [f, setF] = useState(st)
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const stageTitle = TRACKER_STAGES.find(s => s.n === st.stage)?.title
  const dOnly = s => s ? String(s).slice(0, 10) : ''
  async function save() {
    setBusy(true)
    try {
      await updateTrackerStage(f.id, {
        substatus: f.substatus, assignee_name: f.assignee_name || null, assignee_role: f.assignee_role || null,
        status: f.status, note: f.note || null, started_at: f.started_at || null, due_at: f.due_at || null,
        car_ofi_id: f.car_ofi_id || null,
      })
      onSaved()
    } catch (e) { toast('บันทึกไม่สำเร็จ: ' + e.message); setBusy(false) }
  }
  return (
    <><div className="scrim" style={{ zIndex: 300 }} onClick={onClose} />
      <div className="modal" style={{ zIndex: 301, width: 560 }}>
        <div className="modal-head"><h3>ขั้นที่ {st.stage} · {stageTitle}</h3><button className="close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <datalist id="dl-tr-people">{(suggest?.responsibles || []).map(x => <option key={x} value={x} />)}</datalist>
          <label className="form-label">สถานะย่อย</label>
          <select className="form-input" value={f.substatus || ''} onChange={e => set('substatus', e.target.value)}>
            <option value="">— เลือก —</option>
            {(subs[st.stage] || []).map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
          </select>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label className="form-label">ผู้รับผิดชอบ</label><input className="form-input" list="dl-tr-people" value={f.assignee_name || ''} onChange={e => set('assignee_name', e.target.value)} /></div>
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
          <label className="form-label">ผูกกับ CAR / OFI (ถ้ามี)</label>
          <select className="form-input" value={f.car_ofi_id || ''} onChange={e => set('car_ofi_id', e.target.value ? Number(e.target.value) : null)}>
            <option value="">— ไม่ผูก —</option>
            {cars.map(c => <option key={c.id} value={c.id}>{c.co_no || ('CAR ' + c.id)} — {(c.finding || '').slice(0, 40)}</option>)}
          </select>
          <label className="form-label">บันทึก</label>
          <textarea className="form-input" rows={2} value={f.note || ''} onChange={e => set('note', e.target.value)} />
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'กำลังบันทึก…' : 'บันทึก'}</button>
        </div>
      </div></>
  )
}

function AddCaseModal({ laws, tracked, onClose, onSaved }) {
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
        <div className="modal-head"><h3>เพิ่มรายการติดตาม</h3><button className="close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <label className="form-label">เลือกกฎหมายที่จะติดตาม</label>
          <select className="form-input" value={lawId} onChange={e => setLawId(e.target.value)}>
            {options.length === 0 && <option value="">— ทุกฉบับถูกติดตามแล้ว —</option>}
            {options.map(l => <option key={l.id} value={l.id}>{l.code} — {(l.name || '').slice(0, 60)}</option>)}
          </select>
          <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 10 }}>ระบบจะสร้างขั้นตอนติดตาม 3 ขั้น (ค้นหา/วิเคราะห์ → หน่วยงานดำเนินการ → ทวนสอบ) เริ่มที่ขั้น 1</p>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" disabled={busy || !lawId} onClick={save}>{busy ? 'กำลังเพิ่ม…' : 'เพิ่มและเริ่มติดตาม'}</button>
        </div>
      </div></>
  )
}
