// P8 · หน้าจอตรวจทานผลสรุปของ AI (ผู้ตรวจสอบ) — แบ่งสองฝั่ง
//   ซ้าย: ผลสรุปของ AI ทุกฟิลด์ (แก้ไขได้ → บันทึกทับ + log)
//   ขวา: เปิด PDF ต้นฉบับ (source_url) + URL เต็ม (แก้ลิงก์ได้)
//   ล่าง: checklist บังคับ 3 ข้อ + ชื่อผู้ตรวจ (บังคับ) + หมายเหตุ
//   ปุ่ม "ผ่านการตรวจทาน" (ครบ 3 ติ๊ก + มีชื่อ) · "ตีกลับ" (บังคับเหตุผล)
import { useState, useMemo } from 'react'
import { I } from './icons.jsx'
import { usePersist, thDate } from '../lib/ui.jsx'

export default function ReviewModal({ batch, cats = [], onClose, onSaveEdits, onVerify }) {
  const rows = batch.rows
  const ids = useMemo(() => rows.map(r => r.id), [rows])
  const f0 = rows[0] || {}
  const [law, setLaw] = useState({
    law_name: f0.law_name || '', cat: f0.cat || 'LA', ministry: f0.ministry || '',
    announce_date: f0.announce_date || '', effective_date: f0.effective_date || '',
    doc_list: f0.doc_list || '', source_url: f0.source_url || '',
  })
  const [reqs, setReqs] = useState(rows.map(r => ({
    id: r.id, section_ref: r.section_ref || '', req_text: r.req_text || '', responsible: r.responsible || '',
    applicability: r.applicability || '', method: r.method || '', documents: r.documents || '',
    frequency: r.frequency || '', other_terms: r.other_terms || '',
  })))
  const [dirty, setDirty] = useState(false)
  const [chk, setChk] = useState({ correct: false, accurate: false, complete: false })
  const [by, setBy] = usePersist('lex_verifier', '')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const setL = (k, v) => { setLaw(p => ({ ...p, [k]: v })); setDirty(true) }
  const setR = (i, k, v) => { setReqs(p => p.map((r, j) => j === i ? { ...r, [k]: v } : r)); setDirty(true) }

  const allChecked = chk.correct && chk.accurate && chk.complete
  const canPass = allChecked && by.trim() && !busy
  const canReject = note.trim() && by.trim() && !busy

  async function saveEdits() {
    setBusy(true)
    try { await onSaveEdits(ids, { ...law, law_code: f0.law_code }, reqs); setDirty(false) } catch { /* toast handled upstream */ }
    setBusy(false)
  }
  async function pass() {
    setBusy(true)
    try {
      if (dirty) await onSaveEdits(ids, { ...law, law_code: f0.law_code }, reqs)
      await onVerify(ids, { passed: true, correct: chk.correct, accurate: chk.accurate, complete: chk.complete, by: by.trim(), note: note.trim() || null, law_code: f0.law_code })
      onClose()
    } catch { setBusy(false) }
  }
  async function reject() {
    setBusy(true)
    try {
      if (dirty) await onSaveEdits(ids, { ...law, law_code: f0.law_code }, reqs)
      await onVerify(ids, { passed: false, correct: chk.correct, accurate: chk.accurate, complete: chk.complete, by: by.trim(), note: note.trim(), law_code: f0.law_code })
      onClose()
    } catch { setBusy(false) }
  }

  return (<>
    <div className="scrim" style={{ zIndex: 340 }} onClick={onClose} />
    <div className="modal" style={{ zIndex: 341, width: 'min(1040px, 96vw)', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
      <div className="modal-head">
        <h3>ตรวจทานผลสรุปของ AI — <span className="law-code">{f0.law_code}</span></h3>
        <button className="close" onClick={onClose}><I n="x" /></button>
      </div>

      <div className="modal-body" style={{ overflow: 'auto', flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 16 }}>
          {/* ── ซ้าย: ผลสรุปของ AI (แก้ไขได้) ── */}
          <div>
            <div className="sec-t" style={{ marginBottom: 8 }}>ผลสรุปของ AI (แก้ไขได้ทุกช่อง)</div>
            <label className="form-label">ชื่อกฎหมาย</label>
            <textarea className="form-input" rows={2} value={law.law_name} onChange={e => setL('law_name', e.target.value)} />
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">หมวด</label>
                <select className="form-input" value={law.cat} onChange={e => setL('cat', e.target.value)}>
                  {cats.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 2 }}>
                <label className="form-label">กระทรวง / หน่วยงาน</label>
                <input className="form-input" value={law.ministry} onChange={e => setL('ministry', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">วันที่ประกาศ</label>
                <input className="form-input" value={law.announce_date} onChange={e => setL('announce_date', e.target.value)} placeholder="เช่น 17 มี.ค. 2553" />
              </div>
              <div style={{ flex: 1 }}>
                <label className="form-label">วันที่บังคับใช้</label>
                <input className="form-input" value={law.effective_date} onChange={e => setL('effective_date', e.target.value)} />
              </div>
            </div>
            <label className="form-label">เอกสาร/แบบฟอร์มที่เกี่ยวข้อง</label>
            <input className="form-input" value={law.doc_list} onChange={e => setL('doc_list', e.target.value)} />

            <div className="sec-t" style={{ margin: '14px 0 8px' }}>ข้อกำหนดรายข้อ ({reqs.length})</div>
            {reqs.map((r, i) => (
              <div key={r.id} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                  <span className="num" style={{ color: 'var(--ink-faint)' }}>{i + 1}.</span>
                  <input className="form-input" style={{ marginTop: 0, width: 130 }} value={r.section_ref} onChange={e => setR(i, 'section_ref', e.target.value)} placeholder="มาตรา/ข้อ" />
                </div>
                <textarea className="form-input" rows={2} style={{ marginTop: 0 }} value={r.req_text} onChange={e => setR(i, 'req_text', e.target.value)} placeholder="เนื้อหาข้อกำหนด" />
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  <input className="form-input" style={{ marginTop: 0 }} value={r.responsible} onChange={e => setR(i, 'responsible', e.target.value)} placeholder="ผู้รับผิดชอบ" />
                  <input className="form-input" style={{ marginTop: 0 }} value={r.frequency} onChange={e => setR(i, 'frequency', e.target.value)} placeholder="ความถี่" />
                </div>
              </div>
            ))}
          </div>

          {/* ── ขวา: ต้นฉบับ (source_url) ── */}
          <div>
            <div className="sec-t" style={{ marginBottom: 8 }}>ต้นฉบับ (ตัวบทจริง)</div>
            <div className="panel" style={{ padding: 14, position: 'sticky', top: 0 }}>
              {law.source_url ? (<>
                <a className="btn btn-primary" href={law.source_url} target="_blank" rel="noreferrer" style={{ width: '100%', justifyContent: 'center' }}>📄 เปิด PDF ต้นฉบับ</a>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 8, wordBreak: 'break-all' }}>{law.source_url}</div>
              </>) : (
                <div style={{ fontSize: 12.5, color: 'var(--bad)' }}>ยังไม่มีลิงก์ตัวบท — กรุณาวางลิงก์ราชกิจจาฯ/PDF เพื่อให้ตรวจเทียบต้นฉบับได้</div>
              )}
              <label className="form-label" style={{ marginTop: 12 }}>ลิงก์ตัวบทจริง (source_url)</label>
              <input className="form-input" value={law.source_url} onChange={e => setL('source_url', e.target.value)} placeholder="https://ratchakitcha.soc.go.th/…" />
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 10, lineHeight: 1.6 }}>
              เทียบผลสรุปฝั่งซ้ายกับตัวบทจริง แล้วยืนยัน 3 ข้อด้านล่าง<br />
              {f0.verify_status === 'failed' && <span style={{ color: 'var(--bad)' }}>สถานะปัจจุบัน: ถูกตีกลับ — {f0.verify_note || ''}</span>}
              {f0.verified_at && f0.verify_status !== 'failed' && <span>ตรวจล่าสุด: {thDate(f0.verified_at)}{f0.verify_by ? ' · ' + f0.verify_by : ''}</span>}
            </div>
          </div>
        </div>

        {/* ── ล่าง: checklist + ผู้ตรวจ + หมายเหตุ ── */}
        <div style={{ borderTop: '1px solid var(--line)', marginTop: 14, paddingTop: 12 }}>
          <div className="sec-t" style={{ marginBottom: 8 }}>ยืนยันการตรวจทาน (ต้องครบทั้ง 3 ข้อจึงจะผ่านได้)</div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
            <label style={ckStyle}><input type="checkbox" checked={chk.correct} onChange={e => setChk(p => ({ ...p, correct: e.target.checked }))} /> ดึงมาถูกฉบับ</label>
            <label style={ckStyle}><input type="checkbox" checked={chk.accurate} onChange={e => setChk(p => ({ ...p, accurate: e.target.checked }))} /> สรุปถูกต้องตรงตัวบท</label>
            <label style={ckStyle}><input type="checkbox" checked={chk.complete} onChange={e => setChk(p => ({ ...p, complete: e.target.checked }))} /> ครบถ้วน ละเอียดพอ</label>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 220 }}>
              <label className="form-label">ชื่อผู้ตรวจ <span style={{ color: 'var(--bad)' }}>*</span></label>
              <input className="form-input" value={by} onChange={e => setBy(e.target.value)} placeholder="ระบุชื่อผู้ตรวจทาน" />
            </div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <label className="form-label">หมายเหตุ / สิ่งที่แก้ / เหตุผลกรณีตีกลับ</label>
              <input className="form-input" value={note} onChange={e => setNote(e.target.value)} placeholder="เช่น แก้วันบังคับใช้ / ข้อ 5 สรุปตกหล่น ให้หาตัวบทใหม่" />
            </div>
          </div>
          {/* TODO(auth): ชื่อผู้ตรวจเก็บเป็น text — map เป็น Supabase Auth รายคนภายหลัง */}
        </div>
      </div>

      <div className="modal-foot" style={{ justifyContent: 'space-between' }}>
        <button className="btn btn-ghost" disabled={!dirty || busy} onClick={saveEdits}>{busy ? '…' : 'บันทึกการแก้ไข'}</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-danger" disabled={!canReject} title={!by.trim() ? 'กรอกชื่อผู้ตรวจก่อน' : (!note.trim() ? 'ตีกลับต้องกรอกเหตุผล' : '')} onClick={reject}>ตีกลับ</button>
          <button className="btn btn-primary" disabled={!canPass} title={!allChecked ? 'ต้องติ๊กครบ 3 ข้อ' : (!by.trim() ? 'กรอกชื่อผู้ตรวจก่อน' : '')} onClick={pass}>ผ่านการตรวจทาน ✓</button>
        </div>
      </div>
    </div>
  </>)
}

const ckStyle = { display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 500, cursor: 'pointer' }
