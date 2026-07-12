import { useEffect, useMemo, useState } from 'react'
import { PROCESS_STAGES, createProcessItem, updateProcessItem, deleteProcessItem } from '../lib/supabase.js'
import { toast } from '../lib/toast.js'
import { confirmDialog } from '../lib/confirm.js'
import { useAuth, NO_PERM } from '../lib/auth.js'
import { I } from './icons.jsx'
import EmptyState from './EmptyState.jsx'

const STAGE = Object.fromEntries(PROCESS_STAGES.map(s => [s.key, s]))
const nextKey = k => { const i = PROCESS_STAGES.findIndex(s => s.key === k); return PROCESS_STAGES[Math.min(i + 1, PROCESS_STAGES.length - 1)].key }

// shipment-style tracker (used on the dashboard) — leads with the *current
// month's* new-law-scan status, and only falls back to the 5-stage tracker
// once that scan has turned up new laws still being worked through.
// ติดตามสถานะงานแบบ "ระบบขนส่ง/พัสดุ" — เส้นความคืบหน้าเชื่อมแต่ละขั้น
// จุดที่ผ่านแล้ว = เติมสี ✓ · จุดปัจจุบัน = ไฮไลต์ · แสดงจำนวนงานที่ค้างในแต่ละขั้น
export function StageBar({ items, onGo }) {
  const counts = useMemo(() => {
    const c = Object.fromEntries(PROCESS_STAGES.map(s => [s.key, 0]))
    items.forEach(i => { if (c[i.stage] != null) c[i.stage]++ })
    return c
  }, [items])
  const pending = PROCESS_STAGES.filter(s => s.key !== 'done').reduce((a, s) => a + counts[s.key], 0)
  // ขั้นปัจจุบัน = ขั้นที่ยังไม่เสร็จ ที่ก้าวหน้าที่สุดและมีงานอยู่
  const activeIdx = PROCESS_STAGES.reduce((acc, s, i) => (s.key !== 'done' && counts[s.key] > 0 ? i : acc), 0)

  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <div className="panel-h"><h3>ติดตามสถานะงาน</h3>
        <span className="sub" style={{ marginLeft: 'auto' }}>{pending ? `กำลังดำเนินการ ${pending} รายการ` : 'ไม่มีงานค้าง'}</span>
        {onGo && <span className="sub" style={{ marginLeft: 12, color: 'var(--brand)', cursor: 'pointer' }} onClick={onGo}>เปิดกระดาน →</span>}
      </div>
      <div className="panel-b">
        <div className="ship-track">
          {PROCESS_STAGES.map((s, i) => {
            const reached = i <= activeIdx
            const current = i === activeIdx && pending > 0
            const isDone = s.key === 'done'
            return (
              <div key={s.key} className={'ship-step' + (reached ? ' reached' : '') + (current ? ' current' : '')} onClick={onGo} title={s.label}>
                {i > 0 && <span className={'ship-line' + (reached ? ' fill' : '')} />}
                {current && <span className="ship-here">กำลังทำ</span>}
                <span className="ship-node">{isDone ? '✓' : counts[s.key]}</span>
                <span className="ship-lab">{s.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function ProcessTracker({ items, onReload, updates = [], onGoView }) {
  const { can } = useAuth()
  const [modal, setModal] = useState(null)
  // optimistic stage overrides: { [itemId]: stageKey } applied on top of `items`
  // so a card jumps columns instantly; cleared when fresh `items` arrive.
  const [override, setOverride] = useState({})
  useEffect(() => { setOverride({}) }, [items])

  const byStage = useMemo(() => {
    const g = Object.fromEntries(PROCESS_STAGES.map(s => [s.key, []]))
    items.forEach(i => { const stage = override[i.id] || i.stage; (g[stage] || (g[stage] = [])).push({ ...i, stage }) })
    return g
  }, [items, override])

  async function moveTo(it, stage) {
    setOverride(o => ({ ...o, [it.id]: stage }))   // optimistic
    try { await updateProcessItem(it.id, { stage }); onReload() }
    catch (e) { setOverride(o => { const n = { ...o }; delete n[it.id]; return n }); toast('อัปเดตไม่สำเร็จ: ' + e.message, 'error') }
  }
  const advance = it => moveTo(it, nextKey(it.stage))
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
        <button className="btn btn-ghost" disabled={!can('edit')} title={can('edit')?'':NO_PERM} onClick={pullFromUpdates}>ดึงจากกฎหมายใหม่</button>
        <button className="btn btn-primary" disabled={!can('edit')} title={can('edit')?'':NO_PERM} onClick={() => setModal({ stage: 'discovery' })}><I n="plus"/>เพิ่มรายการ</button>
      </div>

      {items.length === 0 ? (
        <div className="panel"><EmptyState icon="inbox" title="ยังไม่มีงานในกระบวนการ"
          hint="เพิ่มรายการใหม่ หรือดึงกฎหมายใหม่ที่พบเข้าสู่กระบวนการเพื่อเริ่มติดตาม"
          action="เพิ่มรายการแรก" onAction={() => setModal({ stage: 'discovery' })} /></div>
      ) : (
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
                      {it.stage !== 'done' && <button className="btn btn-primary" style={{ padding: '3px 9px', fontSize: 11 }} disabled={!can('edit')} title={can('edit')?'':NO_PERM} onClick={() => advance(it)}>ถัดไป →</button>}
                      <button className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 11 }} disabled={!can('edit')} title={can('edit')?'':NO_PERM} onClick={() => setModal(it)}>แก้ไข</button>
                      <button className="btn btn-ghost" style={{ padding: '3px 8px', fontSize: 11 }} disabled={!can('delete')} title={can('delete')?'':NO_PERM} onClick={() => remove(it)}>ลบ</button>
                    </div>
                  )}
                </div>
              ))}
              {(byStage[s.key] || []).length === 0 && <div className="kempty">ไม่มีงานในขั้นนี้</div>}
            </div>
          </div>
        ))}
      </div>
      )}

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
        <div className="modal-head"><h3>{f.id ? 'แก้ไขรายการ' : 'เพิ่มรายการเข้ากระบวนการ'}</h3><button className="close" onClick={onClose}><I n="x"/></button></div>
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
