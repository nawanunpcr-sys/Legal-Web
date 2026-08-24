// P21 ส่วนที่ 2 · หน้าจอยืนยันผลตรวจสถานะการบังคับใช้ (ข้อ 2.7)
//
// ═══ หน้าที่เดียวของไฟล์นี้: เป็นด่านที่ผลจาก AI ต้องผ่านมนุษย์ก่อนเข้าทะเบียน ═══
// ทะเบียนกฎหมายนี้ใช้ตรวจ ISO · ถ้าผู้ตรวจถามว่า "รู้ได้อย่างไรว่าฉบับนี้ถูกยกเลิก"
// แล้วคำตอบคือ "AI บอก" คือใช้ไม่ได้ทันที · ทุกช่องจึงแก้ได้ ทุกลิงก์กดเปิดตรวจเองได้
// และต้องติ๊กยืนยันก่อนปุ่มบันทึกจะทำงาน
import { useState } from 'react'
import { LAW_STATUS, LAW_STATUS_ORDER, REPEAL_CONFIDENCE } from '../lib/supabase.js'
import { useAuth, NO_PERM, currentUserName } from '../lib/auth.js'
import { I } from './icons.jsx'

const F = { marginBottom: 10 }

export default function RepealReviewModal({ check, law, onApply, onDismiss, onClose }) {
  const { can } = useAuth()
  const rb = check.repealed_by || {}
  const rp = check.replacement || {}

  const [status, setStatus]   = useState(check.law_status)
  const [byTitle, setByTitle] = useState(rb.law_title || '')
  const [clause, setClause]   = useState(rb.repeal_clause || '')
  const [effDate, setEffDate] = useState(rb.effective_date || '')
  const [gazette, setGazette] = useState(rb.gazette_reference || '')
  const [srcUrl, setSrcUrl]   = useState(rb.source_url || '')
  const [scope, setScope]     = useState(check.repeal_scope || '')
  const [reason, setReason]   = useState(check.repeal_reason || '')
  const [replTitle, setReplTitle] = useState(rp.law_title || '')
  const [replUrl, setReplUrl]     = useState(rp.source_url || '')
  const [replChanges, setReplChanges] = useState(rp.key_changes || '')
  const [verifier, setVerifier] = useState(currentUserName() || '')
  const [confirmed, setConfirmed] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const needsSource = status === 'repealed' || status === 'partially_repealed'
  const missingSource = needsSource && !srcUrl.trim()
  const canSave = can('edit') && confirmed && verifier.trim() && !missingSource && !busy
  // เตือนเน้นชัดเมื่อผลยังไม่น่าเชื่อถือพอ (ข้อ 2.7.5)
  const risky = check.confidence === 'low' || check.law_status === 'uncertain'

  async function save() {
    if (!canSave) return
    setBusy(true)
    try {
      await onApply(check, {
        law_status: status,
        repealed_by: needsSource ? {
          law_title: byTitle.trim() || null, repeal_clause: clause.trim() || null,
          effective_date: effDate || null, gazette_reference: gazette.trim() || null,
          source_url: srcUrl.trim(),
        } : null,
        repeal_scope: scope.trim() || null,
        repeal_reason: reason.trim() || null,
        replacement: replTitle.trim() ? { exists: true, law_title: replTitle.trim(),
          source_url: replUrl.trim() || null, key_changes: replChanges.trim() || null } : null,
        repeal_source_url: srcUrl.trim(),
        review_note: note.trim() || null,
      }, { confirmed: true, verifiedBy: verifier.trim() })
      onClose()
    } finally { setBusy(false) }
  }

  const Src = ({ url }) => url
    ? <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--brand)', wordBreak: 'break-all' }}>{url} ↗</a>
    : <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>ไม่มี</span>

  return (<><div className="scrim" onClick={onClose} />
    <div className="modal" style={{ width: 720, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
      <div className="modal-head">
        <h3>ตรวจสอบผลการค้นสถานะการบังคับใช้</h3>
        <button className="close" onClick={onClose}><I n="x" /></button>
      </div>

      <div className="modal-body" style={{ overflowY: 'auto' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{law?.code} · {law?.name}</div>
        <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 12 }}>
          ค้นเมื่อ {check.search_date} · ความมั่นใจของระบบ: {REPEAL_CONFIDENCE[check.confidence] || check.confidence}
        </div>

        {risky && (
          <div style={{ padding: '10px 13px', marginBottom: 12, borderRadius: 8,
            background: 'var(--bad-bg)', border: '1px solid var(--bad)', color: 'var(--bad)', fontSize: 12.5, lineHeight: 1.6 }}>
            <b>ผลนี้ยังยืนยันไม่ได้ด้วยตัวเอง</b> — {check.law_status === 'uncertain'
              ? 'ระบบไม่พบหลักฐานที่หนักแน่นพอจะสรุปสถานะ'
              : 'ระบบให้ความมั่นใจอยู่ในระดับต่ำ'} กรุณาเปิดแหล่งอ้างอิงด้านล่างตรวจด้วยตนเองก่อนยืนยันทุกครั้ง
          </div>
        )}

        {/* ข้อสังเกตจากระบบ — รวมเหตุผลที่ผลถูกลดชั้น เช่น ลิงก์ไม่ผ่านด่าน */}
        {check.notes && (
          <div style={{ padding: '9px 12px', marginBottom: 12, borderRadius: 8, background: 'var(--surface-3)',
            fontSize: 12.5, lineHeight: 1.6, color: 'var(--ink-soft)' }}>
            <b>ข้อสังเกตจากระบบ:</b> {check.notes}
          </div>
        )}

        <div style={F}>
          <label className="form-label">สถานะการบังคับใช้ <span style={{ color: 'var(--bad)' }}>*</span></label>
          <select className="form-input" value={status} onChange={e => setStatus(e.target.value)}>
            {LAW_STATUS_ORDER.map(k => <option key={k} value={k}>{LAW_STATUS[k].label}</option>)}
          </select>
        </div>

        {needsSource && <>
          <div className="sec-t" style={{ marginTop: 6 }}>ฉบับที่ยกเลิก</div>
          <div style={F}>
            <label className="form-label">ชื่อกฎหมายฉบับที่ยกเลิก</label>
            <input className="form-input" value={byTitle} onChange={e => setByTitle(e.target.value)} />
          </div>
          <div style={{ ...F, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">ข้อที่ระบุการยกเลิก</label>
              <input className="form-input" value={clause} onChange={e => setClause(e.target.value)} placeholder="เช่น ข้อ 1" />
            </div>
            <div>
              <label className="form-label">วันที่มีผล</label>
              <input className="form-input" type="date" value={effDate} onChange={e => setEffDate(e.target.value)} />
            </div>
          </div>
          <div style={F}>
            <label className="form-label">อ้างอิงราชกิจจานุเบกษา</label>
            <input className="form-input" value={gazette} onChange={e => setGazette(e.target.value)} placeholder="เล่ม / ตอน / หน้า / วันที่" />
          </div>
          <div style={F}>
            <label className="form-label">
              ที่อยู่อ้างอิง (URL) <span style={{ color: 'var(--bad)' }}>*</span>
            </label>
            <input className="form-input" value={srcUrl} onChange={e => setSrcUrl(e.target.value)} placeholder="https://ratchakitcha.soc.go.th/documents/…" />
            <div style={{ marginTop: 4 }}><Src url={srcUrl} /></div>
            {missingSource &&
              <p style={{ fontSize: 12, color: 'var(--bad)', margin: '4px 0 0' }}>
                สถานะนี้ต้องมีที่อยู่อ้างอิงที่เปิดได้จริง จึงจะบันทึกลงทะเบียนได้
              </p>}
          </div>
          <div style={F}>
            <label className="form-label">ขอบเขตการยกเลิก</label>
            <input className="form-input" value={scope} onChange={e => setScope(e.target.value)} placeholder="เช่น ยกเลิกทั้งฉบับ / ยกเลิกเฉพาะข้อ 5" />
          </div>
          <div style={F}>
            <label className="form-label">เหตุผลและสาระสำคัญของการยกเลิก</label>
            <textarea className="form-input" rows={3} value={reason} onChange={e => setReason(e.target.value)} />
          </div>

          <div className="sec-t">ฉบับใหม่ที่ใช้แทน</div>
          <div style={F}>
            <label className="form-label">ชื่อกฎหมายฉบับใหม่ (เว้นว่างหากยังไม่มี)</label>
            <input className="form-input" value={replTitle} onChange={e => setReplTitle(e.target.value)} />
          </div>
          {replTitle.trim() && <>
            <div style={F}>
              <label className="form-label">ที่อยู่อ้างอิงของฉบับใหม่</label>
              <input className="form-input" value={replUrl} onChange={e => setReplUrl(e.target.value)} />
              <div style={{ marginTop: 4 }}><Src url={replUrl} /></div>
            </div>
            <div style={F}>
              <label className="form-label">สาระสำคัญที่เปลี่ยนจากฉบับเดิม</label>
              <textarea className="form-input" rows={2} value={replChanges} onChange={e => setReplChanges(e.target.value)} />
            </div>
          </>}
        </>}

        <div className="sec-t">แหล่งอ้างอิงที่ระบบเปิดจริง</div>
        {(check.sources || []).length
          ? <ul style={{ margin: '0 0 10px', paddingLeft: 18 }}>
              {check.sources.map((u, i) => <li key={i} style={{ marginBottom: 3 }}><Src url={u} /></li>)}
            </ul>
          : <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginBottom: 10 }}>
              ไม่มีแหล่งอ้างอิงที่ผ่านการตรวจ — ห้ามยืนยันการยกเลิกจากผลนี้เพียงอย่างเดียว
            </p>}

        {/* ผลจับคู่กับทะเบียนของเราเอง — บอกว่าฉบับที่อ้างถึงอยู่ในทะเบียนแล้วหรือยัง */}
        {Array.isArray(check.registry_match) && check.registry_match.length > 0 && <>
          <div className="sec-t">การจับคู่กับทะเบียน</div>
          <ul style={{ margin: '0 0 10px', paddingLeft: 18, fontSize: 12.5, lineHeight: 1.7 }}>
            {check.registry_match.map((m, i) => (
              <li key={i}>
                {m.law_name} — {m.in_registry
                  ? <b style={{ color: 'var(--ok)' }}>พบในทะเบียน: {m.registry_code}</b>
                  : <span style={{ color: 'var(--ink-faint)' }}>ไม่พบในทะเบียน{m.near_miss_year ? ` (ใกล้เคียง: ${m.near_miss_year} — คนละปี)` : ''}</span>}
              </li>
            ))}
          </ul>
        </>}

        <div className="sec-t">การยืนยันโดยเจ้าหน้าที่</div>
        <div style={F}>
          <label className="form-label">ผู้ยืนยัน <span style={{ color: 'var(--bad)' }}>*</span></label>
          <input className="form-input" value={verifier} onChange={e => setVerifier(e.target.value)} placeholder="ชื่อผู้ยืนยัน…" />
        </div>
        <div style={F}>
          <label className="form-label">บันทึกของผู้ตรวจ</label>
          <textarea className="form-input" rows={2} value={note} onChange={e => setNote(e.target.value)}
            placeholder="สิ่งที่ตรวจเพิ่มเติม หรือเหตุผลที่แก้ค่าที่ระบบเสนอ…" />
        </div>
        <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 12.5, lineHeight: 1.6, cursor: 'pointer' }}>
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ marginTop: 2 }} />
          <span>ข้าพเจ้าได้เปิดแหล่งอ้างอิงข้างต้นตรวจสอบด้วยตนเองแล้ว และยืนยันว่าข้อมูลในหน้านี้ถูกต้อง
            พร้อมบันทึกลงทะเบียนกฎหมาย</span>
        </label>
      </div>

      <div className="modal-foot">
        <button className="btn btn-ghost" disabled={busy} onClick={() => onDismiss(check)}>ปัดทิ้ง (ไม่ตรง)</button>
        <button className="btn btn-ghost" disabled={busy} onClick={onClose}>ปิด</button>
        <button className="btn btn-primary" disabled={!canSave} title={can('edit') ? '' : NO_PERM} onClick={save}>
          {busy ? 'กำลังบันทึก…' : 'ยืนยันและบันทึกลงทะเบียน'}
        </button>
      </div>
    </div></>)
}
