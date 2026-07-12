// บอร์ดสายงานประเมิน (item 2): คัดกรอง → มอบหมาย → ประเมิน → เข้าทะเบียน
// คอลัมน์:
//   [รอคัดกรอง]  batch นำเข้าที่ยังไม่คัดกรอง (เกี่ยวข้อง/ไม่เกี่ยวข้อง)
//   [รอมอบหมาย]  batch ที่คัดว่าเกี่ยวข้อง — กด "ส่งประเมิน" เลือกหน่วยงาน (หลายได้)
//   [รอประเมิน]  กฎหมายที่มอบหมายแล้ว (แตกงานย่อยต่อหน่วยงาน) + due date + ป้ายเลยกำหนด
//   [เสร็จ/เข้าทะเบียน] ประเมินครบทุกหน่วยงาน — กด "ยืนยันเข้าทะเบียน"
// การไม่เกี่ยวข้องต้องกรอกเหตุผล แล้วย้ายไป archive (ดูย้อนหลังได้ ไม่ลบ)
import { useState, useMemo } from 'react'
import { useAuth, NO_PERM, currentUserName } from '../lib/auth.js'
import { I } from '../components/icons.jsx'
import { thDate, daysTo } from '../lib/ui.jsx'
import ReviewModal from '../components/ReviewModal.jsx'

const isOverdue = f => f.assess_due_date && f.assess_status !== 'done' && daysTo(f.assess_due_date) < 0
// ปุ่ม 📄 เปิดตัวบท (แสดงเมื่อมี source_url)
const PdfBtn = ({ url }) => url ? <a href={url} target="_blank" rel="noreferrer" title="เปิดตัวบท (PDF)" onClick={e => e.stopPropagation()} style={{ fontSize: 13, textDecoration: 'none', marginLeft: 4 }}>📄</a> : null

export default function Staging({ batches, flow = [], laws = [], plans = [], departments = [], cats = [], catMap, deptMap = {}, onScreen, onAssign, onFinalize, onDrop, onGoAssess, onVerify, onSaveEdits }) {
  const { can } = useAuth()
  const [assignFor, setAssignFor] = useState(null)   // {batch, rows}
  const [rejectFor, setRejectFor] = useState(null)   // {batch, rows}
  const [reviewFor, setReviewFor] = useState(null)   // {key, rows, cat, law_code} — P8 ตรวจทาน AI
  const [showArchive, setShowArchive] = useState(false)
  const lawMap = useMemo(() => Object.fromEntries(laws.map(l => [l.id, l])), [laws])
  // requirement_id ที่มีแผนปรับปรุงเปิดอยู่ (ใช้ปลดล็อกปุ่มยืนยันเข้าทะเบียน — item 7)
  const openPlanReq = useMemo(() => { const s = new Set(); plans.forEach(p => { if (p.status !== 'done' && p.requirement_id) s.add(p.requirement_id) }); return s }, [plans])

  // placeholder ระดับ batch (ยังไม่มอบหมาย)
  const phByKey = useMemo(() => {
    const m = {}
    flow.forEach(f => { if (!f.assigned_dept_id) m[(f.cat || '') + '|' + f.law_code] = f })
    return m
  }, [flow])

  // แยก batch นำเข้า: รอตรวจทาน AI (verify≠passed) / รอคัดกรอง / รอมอบหมาย / archive
  const { toReview, toScreen, toAssign, archived } = useMemo(() => {
    const toReview = [], toScreen = [], toAssign = [], archived = []
    batches.forEach(([key, rows]) => {
      const ph = phByKey[key]
      const v = rows[0]?.verify_status || 'pending'
      if (v !== 'passed') { toReview.push({ key, rows, ph, failed: v === 'failed' }); return }  // ต้องผ่านตรวจทานก่อน
      if (ph?.screen_status === 'not_relevant') archived.push({ key, rows, ph })
      else if (ph?.screen_status === 'relevant') toAssign.push({ key, rows, ph })
      else toScreen.push({ key, rows, ph })
    })
    return { toReview, toScreen, toAssign, archived }
  }, [batches, phByKey])

  // งานที่มอบหมายแล้ว จัดกลุ่มตาม law_id → รอประเมิน / เสร็จ
  const { assessing, doneGroups } = useMemo(() => {
    const g = {}
    flow.forEach(f => { if (f.assigned_dept_id && !f.finalized_at) (g[f.law_id] = g[f.law_id] || []).push(f) })
    const assessing = [], doneGroups = []
    Object.entries(g).forEach(([lawId, rows]) => {
      const allDone = rows.every(r => r.assess_status === 'done')
      ;(allDone ? doneGroups : assessing).push({ lawId: Number(lawId), rows })
    })
    return { assessing, doneGroups }
  }, [flow])

  const empty = batches.length === 0 && flow.length === 0

  return (
    <div className="view">
      {empty && (
        <div className="panel" style={{ padding: '48px 20px', textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>ยังไม่มีกฎหมายในสายงานประเมิน</div>
          <div style={{ fontSize: 13, color: 'var(--ink-faint)', marginTop: 6 }}>เมื่อ AI สรุปกฎหมายใหม่ (หน้า “วิเคราะห์”) หรือดึงจาก ShawPat รายการจะมาปรากฏที่คอลัมน์ “รอคัดกรอง”</div>
        </div>
      )}

      <div className="kanban kanban-5">
        {/* คอลัมน์ 1 — รอตรวจทาน AI (ผู้ตรวจสอบ) */}
        <div className="kcol">
          <div className="kcol-h" style={{ borderTopColor: '#8e44ad' }}>
            <b>รอตรวจทาน AI</b><span className="krole">ผู้ตรวจสอบ</span><span className="kcount">{toReview.length}</span>
          </div>
          <div className="kcol-b">
            {toReview.map(({ key, rows, failed }) => {
              const f = rows[0]
              return (
                <div className="kcard" key={key} style={{ cursor: 'pointer', ...(failed ? { borderColor: 'var(--bad)', background: 'var(--bad-bg)' } : null) }} onClick={() => setReviewFor({ key, rows, cat: f.cat, law_code: f.law_code })}>
                  <div className="kt"><b className="law-code">{f.law_code}</b> {(f.law_name || '').slice(0, 60)}<PdfBtn url={f.source_url} /></div>
                  <div className="kn">{f.cat ? catMap[f.cat]?.name || f.cat : ''} · {rows.length} ข้อกำหนด</div>
                  {failed
                    ? <span className="pill p-bad" style={{ fontSize: 10.5, padding: '2px 8px', marginTop: 4 }}>ถูกตีกลับ — แก้แล้วส่งใหม่</span>
                    : <span className="pill p-warn" style={{ fontSize: 10.5, padding: '2px 8px', marginTop: 4 }}>คลิกเพื่อตรวจทาน</span>}
                </div>
              )
            })}
            {toReview.length === 0 && <div className="kempty">ไม่มีงานในขั้นนี้</div>}
          </div>
        </div>

        {/* คอลัมน์ 2 — รอคัดกรอง */}
        <div className="kcol">
          <div className="kcol-h" style={{ borderTopColor: '#0071e3' }}>
            <b>รอคัดกรอง</b><span className="krole">ผู้ค้นหา</span><span className="kcount">{toScreen.length}</span>
          </div>
          <div className="kcol-b">
            {toScreen.map(({ key, rows }) => {
              const f = rows[0]
              return (
                <div className="kcard" key={key}>
                  <div className="kt"><b className="law-code">{f.law_code}</b> {(f.law_name || '').slice(0, 70)}<PdfBtn url={f.source_url} /></div>
                  <div className="kn">{f.cat ? catMap[f.cat]?.name || f.cat : ''}{f.ministry ? ' · ' + f.ministry : ''} · {rows.length} ข้อกำหนด</div>
                  <div className="kacts">
                    <button className="btn btn-primary" style={sm} disabled={!can('edit')} title={can('edit') ? '' : NO_PERM}
                      onClick={() => onScreen({ cat: f.cat, law_code: f.law_code, law_name: f.law_name }, true)}>เกี่ยวข้อง</button>
                    <button className="btn btn-ghost" style={sm} disabled={!can('edit')} title={can('edit') ? '' : NO_PERM}
                      onClick={() => setRejectFor({ batch: { cat: f.cat, law_code: f.law_code, law_name: f.law_name }, rows })}>ไม่เกี่ยวข้อง</button>
                  </div>
                </div>
              )
            })}
            {toScreen.length === 0 && <div className="kempty">ไม่มีงานในขั้นนี้</div>}
          </div>
        </div>

        {/* คอลัมน์ 3 — รอมอบหมาย */}
        <div className="kcol">
          <div className="kcol-h" style={{ borderTopColor: '#ff9500' }}>
            <b>รอมอบหมาย</b><span className="krole">ส่งผู้ประเมิน</span><span className="kcount">{toAssign.length}</span>
          </div>
          <div className="kcol-b">
            {toAssign.map(({ key, rows, ph }) => {
              const f = rows[0]
              return (
                <div className="kcard" key={key}>
                  <div className="kt"><b className="law-code">{f.law_code}</b> {(f.law_name || '').slice(0, 70)}<PdfBtn url={f.source_url} /></div>
                  <div className="kn">{rows.length} ข้อกำหนด{ph?.screen_by ? ' · คัดกรองโดย ' + ph.screen_by : ''}</div>
                  <div className="kacts">
                    <button className="btn btn-primary" style={sm} disabled={!can('edit')} title={can('edit') ? '' : NO_PERM}
                      onClick={() => setAssignFor({ batch: { cat: f.cat, law_code: f.law_code, law_name: f.law_name }, rows })}>ส่งประเมิน →</button>
                  </div>
                </div>
              )
            })}
            {toAssign.length === 0 && <div className="kempty">ไม่มีงานในขั้นนี้</div>}
          </div>
        </div>

        {/* คอลัมน์ 4 — รอประเมิน */}
        <div className="kcol">
          <div className="kcol-h" style={{ borderTopColor: '#7a5d96' }}>
            <b>รอประเมิน</b><span className="krole">หน่วยงาน</span><span className="kcount">{assessing.length}</span>
          </div>
          <div className="kcol-b">
            {assessing.map(({ lawId, rows }) => {
              const law = lawMap[lawId]; const f = rows[0]
              return (
                <div className="kcard" key={lawId}>
                  <div className="kt"><b className="law-code">{f.law_code}</b> {(law?.name || f.law_name || '').slice(0, 70)}</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', margin: '6px 0' }}>
                    {rows.map(r => (
                      <span key={r.id} className={'pill ' + (isOverdue(r) ? 'p-bad' : r.assess_status === 'done' ? 'p-ok' : 'p-warn')} style={{ fontSize: 10.5, padding: '2px 8px' }}>
                        {deptMap[r.assigned_dept_id] || 'หน่วยงาน'}{r.assess_due_date ? ' · ' + thDate(r.assess_due_date) : ''}{isOverdue(r) ? ' · เลยกำหนด' : ''}
                      </span>
                    ))}
                  </div>
                  <div className="kacts">
                    <button className="btn btn-ghost" style={sm} onClick={() => onGoAssess && onGoAssess()}>ไปหน้าประเมิน →</button>
                  </div>
                </div>
              )
            })}
            {assessing.length === 0 && <div className="kempty">ไม่มีงานในขั้นนี้</div>}
          </div>
        </div>

        {/* คอลัมน์ 5 — เข้าทะเบียน (อนุมัติโดย ADMIN เท่านั้น) */}
        <div className="kcol">
          <div className="kcol-h" style={{ borderTopColor: '#248a3d' }}>
            <b>เข้าทะเบียน</b><span className="krole">ADMIN</span><span className="kcount">{doneGroups.length}</span>
          </div>
          <div className="kcol-b">
            {doneGroups.map(({ lawId, rows }) => {
              const law = lawMap[lawId]; const f = rows[0]
              const ncReqs = law ? law.reqs.filter(r => r.status === 'unmet') : []
              // item 7: อนุญาตยืนยันเฉพาะเมื่อทุกข้อเป็น C หรือ NC ที่เหลือมีแผนปรับปรุง open ครบ
              const ncNoPlan = ncReqs.filter(r => !openPlanReq.has(r.id)).length
              const blocked = ncNoPlan > 0
              return (
                <div className="kcard" key={lawId}>
                  <div className="kt"><b className="law-code">{f.law_code}</b> {(law?.name || f.law_name || '').slice(0, 70)}</div>
                  <div className="kt" style={{ fontWeight: 400, fontSize: 12 }}><PdfBtn url={law?.source_url} /></div>
                  <div className="kn">ประเมินครบ {rows.length} หน่วยงาน{ncReqs.length ? ' · NC ' + ncReqs.length + ' ข้อ' + (blocked ? ' (' + ncNoPlan + ' ข้อยังไม่มีแผน)' : ' · มีแผนครบ') : ' · สอดคล้องครบ'}</div>
                  <div className="kacts">
                    {/* P8: อนุมัติเข้าทะเบียนได้เฉพาะ ADMIN */}
                    <button className="btn btn-primary" style={sm} disabled={!can('approve') || blocked}
                      title={!can('approve') ? 'เฉพาะ ADMIN เท่านั้นที่อนุมัติเข้าทะเบียนได้' : (blocked ? 'ยังมี NC ที่ไม่มีแผนปรับปรุง — ต้องสร้างแผนก่อน' : '')}
                      onClick={() => onFinalize(lawId, f.law_code)}>อนุมัติเข้าทะเบียน ✓</button>
                  </div>
                </div>
              )
            })}
            {doneGroups.length === 0 && <div className="kempty">ไม่มีงานในขั้นนี้</div>}
          </div>
        </div>
      </div>

      {/* Archive — กฎหมายที่คัดว่าไม่เกี่ยวข้อง (ดูย้อนหลัง ไม่ลบ) */}
      {archived.length > 0 && (
        <div className="panel" style={{ marginTop: 16 }}>
          <div className="panel-h" style={{ cursor: 'pointer' }} onClick={() => setShowArchive(s => !s)}>
            <I n="ban" /><span style={{ fontWeight: 600 }}>ตัดทิ้ง — ไม่เกี่ยวข้องกับองค์กร ({archived.length})</span>
            <span className="sub" style={{ marginLeft: 'auto' }}>{showArchive ? 'ซ่อน ▲' : 'ดูย้อนหลัง ▼'}</span>
          </div>
          {showArchive && (
            <div className="panel-b">
              {archived.map(({ key, rows, ph }) => {
                const f = rows[0]
                return (
                  <div key={key} style={{ padding: '9px 0', borderBottom: '1px solid var(--line-soft)' }}>
                    <div style={{ fontSize: 13 }}><b className="law-code" style={{ marginRight: 6 }}>{f.law_code}</b>{(f.law_name || '').slice(0, 90)}</div>
                    <div style={{ display: 'flex', gap: 7, marginTop: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="meta-chip" style={{ color: 'var(--bad)', background: 'var(--bad-bg)', borderColor: 'var(--bad-bg)' }}>เหตุผล: {ph?.screen_note || '—'}</span>
                      {ph?.screen_by && <span className="meta-chip">โดย {ph.screen_by}</span>}
                      {ph?.screened_at && <span className="meta-chip">{thDate(ph.screened_at)}</span>}
                      <button className="btn btn-ghost" style={{ ...sm, marginLeft: 'auto' }} disabled={!can('edit')}
                        onClick={() => onScreen({ cat: f.cat, law_code: f.law_code, law_name: f.law_name }, true)}>กู้กลับ (เกี่ยวข้อง)</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {reviewFor && <ReviewModal batch={reviewFor} cats={cats} onClose={() => setReviewFor(null)}
        onSaveEdits={onSaveEdits} onVerify={onVerify} />}
      {rejectFor && <RejectModal ctx={rejectFor} onClose={() => setRejectFor(null)}
        onConfirm={note => { onScreen(rejectFor.batch, false, note); setRejectFor(null) }} />}
      {assignFor && <AssignModal ctx={assignFor} departments={departments} onClose={() => setAssignFor(null)}
        onConfirm={(depts, dueDate, by) => { onAssign(assignFor.batch, assignFor.rows, depts, dueDate, by); setAssignFor(null) }} />}
    </div>
  )
}

const sm = { padding: '3px 10px', fontSize: 11 }

// modal: กรอกเหตุผลกรณีไม่เกี่ยวข้อง (บังคับ)
function RejectModal({ ctx, onClose, onConfirm }) {
  const [note, setNote] = useState('')
  return (<>
    <div className="scrim" style={{ zIndex: 300 }} onClick={onClose} />
    <div className="modal" style={{ zIndex: 301, width: 460 }}>
      <div className="modal-head"><h3>ตัดออก — ไม่เกี่ยวข้อง</h3><button className="close" onClick={onClose}><I n="x" /></button></div>
      <div className="modal-body">
        <div style={{ fontSize: 13, marginBottom: 8 }}><b className="law-code">{ctx.batch.law_code}</b> {ctx.batch.law_name}</div>
        <label className="form-label">เหตุผลที่ไม่เกี่ยวข้องกับองค์กร <span style={{ color: 'var(--bad)' }}>*</span></label>
        <textarea className="form-input" rows={3} value={note} onChange={e => setNote(e.target.value)}
          placeholder="เช่น เป็นกฎหมายเฉพาะกิจการเหมืองแร่ ไม่เกี่ยวกับธุรกิจของบริษัท" autoFocus />
        <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 6 }}>รายการจะย้ายไปที่ Archive ดูย้อนหลังได้ (ไม่ลบทิ้ง)</div>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-primary" disabled={!note.trim()} onClick={() => onConfirm(note.trim())}>ยืนยันตัดออก</button>
      </div>
    </div>
  </>)
}

// modal: ส่งประเมิน — เลือกหลายหน่วยงาน + วันครบกำหนด + ผู้มอบหมาย
function AssignModal({ ctx, departments, onClose, onConfirm }) {
  const [sel, setSel] = useState(() => new Set())
  const [due, setDue] = useState('')
  const [by, setBy] = useState(currentUserName())
  const active = departments.filter(d => d.active !== false)
  const toggle = id => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const chosen = active.filter(d => sel.has(d.id)).map(d => ({ id: d.id, name: d.name }))
  return (<>
    <div className="scrim" style={{ zIndex: 300 }} onClick={onClose} />
    <div className="modal" style={{ zIndex: 301, width: 520 }}>
      <div className="modal-head"><h3>ส่งประเมิน — เลือกหน่วยงาน (ผู้ประเมิน)</h3><button className="close" onClick={onClose}><I n="x" /></button></div>
      <div className="modal-body">
        <div style={{ fontSize: 13, marginBottom: 10 }}><b className="law-code">{ctx.batch.law_code}</b> {ctx.batch.law_name}</div>
        <label className="form-label">หน่วยงานที่เกี่ยวข้อง (เลือกได้หลายหน่วยงาน — แตกเป็นงานย่อยต่อหน่วยงาน) <span style={{ color: 'var(--bad)' }}>*</span></label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '4px 0 12px' }}>
          {active.map(d => (
            <button key={d.id} type="button" onClick={() => toggle(d.id)}
              className={'chip' + (sel.has(d.id) ? ' chip--on' : '')}
              style={{ padding: '5px 12px', fontSize: 12.5, cursor: 'pointer', border: '1px solid var(--line)', borderRadius: 999, background: sel.has(d.id) ? 'var(--brand)' : 'var(--surface)', color: sel.has(d.id) ? '#fff' : 'var(--ink)' }}>
              {sel.has(d.id) ? '✓ ' : ''}{d.name}
            </button>
          ))}
        </div>
        <div className="cols" style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">วันครบกำหนดประเมิน</label>
            <input className="form-input" type="date" value={due} onChange={e => setDue(e.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label">ผู้มอบหมาย</label>
            <input className="form-input" value={by} onChange={e => setBy(e.target.value)} />
          </div>
        </div>
        {/* TODO(auth): ปัจจุบันผู้มอบหมายเก็บเป็น text — เปลี่ยนเป็น Supabase Auth รายคนภายหลัง */}
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-primary" disabled={chosen.length === 0 || !by.trim()} onClick={() => onConfirm(chosen, due || null, by.trim())}>
          ส่งประเมิน {chosen.length ? `(${chosen.length} หน่วยงาน)` : ''}
        </button>
      </div>
    </div>
  </>)
}
