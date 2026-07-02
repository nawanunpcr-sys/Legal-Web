import { useMemo, useState } from 'react'
import { PROCESS_STAGES, createProcessItem, updateProcessItem, deleteProcessItem } from '../lib/supabase.js'
import { toast } from '../lib/toast.js'
import { confirmDialog } from '../lib/confirm.js'

const STAGE = Object.fromEntries(PROCESS_STAGES.map(s => [s.key, s]))
const nextKey = k => { const i = PROCESS_STAGES.findIndex(s => s.key === k); return PROCESS_STAGES[Math.min(i + 1, PROCESS_STAGES.length - 1)].key }

// horizontal stage bar (used on the dashboard too)
export function StageBar({ items, onGo }) {
  const counts = useMemo(() => {
    const c = Object.fromEntries(PROCESS_STAGES.map(s => [s.key, 0]))
    items.forEach(i => { if (c[i.stage] != null) c[i.stage]++ })
    return c
  }, [items])
  const total = items.length || 1
  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <div className="panel-h"><h3>ติดตามกระบวนการ (Process Tracker)</h3>
        {onGo && <span className="sub" style={{ marginLeft: 'auto', color: 'var(--brand)', cursor: 'pointer' }} onClick={onGo}>ดูทั้งหมด →</span>}</div>
      <div className="panel-b">
        <div className="stagebar">
          {PROCESS_STAGES.map(s => (
            <div key={s.key} className="stageseg" style={{ flex: Math.max(counts[s.key], 0.35) }} title={`${s.label} · ${counts[s.key]}`} onClick={onGo}>
              <div className="fill" style={{ background: s.color }} />
              <div className="lab">{s.label}{s.role ? ` · ${s.role}` : ''}</div>
              <div className="cnt" style={{ color: s.color }}>{counts[s.key]}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 10 }}>รวม {items.length} รายการในกระบวนการ · แต่ละสเตจมีผู้รับผิดชอบตามบทบาท</div>
      </div>
    </div>
  )
}

export default function ProcessTracker({ items, onReload, updates = [], onGoView }) {
  const [modal, setModal] = useState(null)
  const byStage = useMemo(() => {
    const g = Object.fromEntries(PROCESS_STAGES.map(s => [s.key, []]))
    items.forEach(i => { (g[i.stage] || (g[i.stage] = [])).push(i) })
    return g
  }, [items])

  async function advance(it) {
    try { await updateProcessItem(it.id, { stage: nextKey(it.stage) }); onReload() } catch (e) { toast('อัปเดตไม่สำเร็จ: ' + e.message) }
  }
  async function setStage(it, stage) { try { await updateProcessItem(it.id, { stage }); onReload() } catch (e) { toast(e.message) } }
  async function remove(it) { if (!(await confirmDialog('ลบรายการนี้จากกระบวนการ?', { danger: true }))) return; try { await deleteProcessItem(it.id); onReload() } catch (e) { toast(e.message) } }

  async function pullFromUpdates() {
    const fresh = updates.filter(u => u.status === 'new')
    if (!fresh.length) { toast('ไม่มีกฎหมายใหม่ให้ดึง', 'info'); return }
    try {
      for (const u of fresh) await createProcessItem({ title: u.title, ref_type: 'update', ref_id: null, stage: 'discovery', note: u.source || '' })
      toast(`ดึงเข้ากระบวนการ ${fresh.length} รายการ`, 'success'); onReload()
    } catch (e) { toast('ดึงไม่สำเร็จ: ' + e.message) }
  }

  return (
    <div className="view">
      <div className="filterbar">
        <span className="right" style={{ marginRight: 'auto', color: 'var(--ink-faint)' }}>ลากงานผ่าน 4 สเตจ: ค้นพบ → ตรวจเนื้อหา → ส่งต่อ → ตรวจสอบ/ติดตาม</span>
        <button className="btn btn-ghost" onClick={pullFromUpdates}>ดึงจากกฎหมายใหม่</button>
        <button className="btn btn-primary" onClick={() => setModal({ stage: 'discovery' })}>+ เพิ่มรายการ</button>
      </div>

      <div className="kanban">
        {PROCESS_STAGES.map(s => (
          <div className="kcol" key={s.key}>
            <div className="kcol-h" style={{ borderTopColor: s.color }}>
              <b>{s.label}</b>{s.role && <span className="krole">{s.role}</span>}
              <span className="kcount">{byStage[s.key]?.length || 0}</span>
            </div>
            <div className="kcol-b">
              {(byStage[s.key] || []).map(it => (
                <div className="kcard" key={it.id} style={it.auto ? { borderStyle: 'dashed', background: 'var(--surface-2)' } : null}>
                  <div className="kt">{it.title}</div>
                  {it.assignee && <div className="ka">ผู้รับผิดชอบ: {it.assignee}</div>}
                  {it.note && <div className="kn">{it.note}</div>}
                  {it.auto ? (
                    <div className="kacts">
                      <span className="tag" style={{ fontSize: 9.5 }}>จากระบบ</span>
                      {it.goView && onGoView && <button className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => onGoView(it.goView)}>ไปที่หน้า →</button>}
                    </div>
                  ) : (
                    <div className="kacts">
                      {it.stage !== 'done' && <button className="btn btn-primary" style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => advance(it)}>ถัดไป →</button>}
                      <button className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => setModal(it)}>แก้ไข</button>
                      <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => remove(it)}>ลบ</button>
                    </div>
                  )}
                </div>
              ))}
              {(byStage[s.key] || []).length === 0 && <div className="kempty">—</div>}
            </div>
          </div>
        ))}
      </div>

      {modal && <ItemModal item={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); onReload() }} />}
    </div>
  )
}

function ItemModal({ item, onClose, onSaved }) {
  const [f, setF] = useState(item)
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  async function save() {
    if (!f.title?.trim()) return
    setBusy(true)
    try {
      if (f.id) await updateProcessItem(f.id, { title: f.title.trim(), stage: f.stage, assignee: f.assignee || null, note: f.note || null })
      else await createProcessItem(f)
      onSaved()
    } catch (e) { toast('บันทึกไม่สำเร็จ: ' + e.message); setBusy(false) }
  }
  return (
    <><div className="scrim" style={{ zIndex: 300 }} onClick={onClose} />
      <div className="modal" style={{ zIndex: 301 }}>
        <div className="modal-head"><h3>{f.id ? 'แก้ไขรายการ' : 'เพิ่มรายการเข้ากระบวนการ'}</h3><button className="close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <label className="form-label">ชื่อเรื่อง / กฎหมาย</label>
          <input className="form-input" value={f.title || ''} onChange={e => set('title', e.target.value)} />
          <label className="form-label">สเตจ</label>
          <select className="form-input" value={f.stage} onChange={e => set('stage', e.target.value)}>
            {PROCESS_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}{s.role ? ` (${s.role})` : ''}</option>)}
          </select>
          <label className="form-label">ผู้รับผิดชอบ</label>
          <input className="form-input" value={f.assignee || ''} onChange={e => set('assignee', e.target.value)} />
          <label className="form-label">หมายเหตุ</label>
          <textarea className="form-input" rows={2} value={f.note || ''} onChange={e => set('note', e.target.value)} />
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'กำลังบันทึก…' : 'บันทึก'}</button>
        </div>
      </div></>
  )
}
