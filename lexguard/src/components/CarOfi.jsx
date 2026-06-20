import { useEffect, useMemo, useState } from 'react'
import { nextCoNumber, saveCar, deleteCar } from '../lib/supabase.js'
import { toast } from '../lib/toast.js'

const TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const thDate = s => { if (!s) return '—'; const d = new Date(s); if (isNaN(d)) return s; return d.getDate() + ' ' + TH[d.getMonth()] + ' ' + (d.getFullYear() + 543) }
const daysTo = s => Math.ceil((new Date(s) - new Date()) / 86400000)
const isOverdue = c => c.status !== 'closed' && c.due_date && daysTo(c.due_date) < 0
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function CarOfi({ cars, onReload, suggest }) {
  const [modal, setModal] = useState(null)   // null | car-object (edit) | {} (new)
  const [filter, setFilter] = useState(() => { try { return localStorage.getItem('cr_car_filter') || 'all' } catch { return 'all' } })
  useEffect(() => { try { localStorage.setItem('cr_car_filter', filter) } catch {} }, [filter])

  const stats = useMemo(() => ({
    total: cars.length,
    open: cars.filter(c => c.status !== 'closed').length,
    closed: cars.filter(c => c.status === 'closed').length,
    overdue: cars.filter(isOverdue).length,
  }), [cars])

  const rows = cars.filter(c =>
    filter === 'all' ? true :
    filter === 'open' ? c.status !== 'closed' :
    filter === 'closed' ? c.status === 'closed' :
    filter === 'overdue' ? isOverdue(c) : true)

  async function remove(c) {
    if (!confirm(`ลบ ${c.co_no || 'รายการนี้'}?`)) return
    try { await deleteCar(c.id); onReload() } catch (e) { toast('ลบไม่สำเร็จ: ' + e.message) }
  }

  return (
    <div className="view">
      <div className="grid stats" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="stat s-total"><div className="lab">ทั้งหมด</div><div className="val num">{stats.total} <small>ใบ</small></div><div className="delta">CAR / OFI</div></div>
        <div className="stat s-warn"><div className="lab">ยังเปิดอยู่</div><div className="val num">{stats.open} <small>ใบ</small></div><div className="delta">ระหว่างดำเนินการ</div></div>
        <div className="stat s-ok"><div className="lab">ปิดแล้ว</div><div className="val num">{stats.closed} <small>ใบ</small></div><div className="delta">เสร็จสิ้น</div></div>
        <div className="stat s-bad"><div className="lab">เกินกำหนดแก้ไข</div><div className="val num">{stats.overdue} <small>ใบ</small></div><div className="delta">ต้องเร่งติดตาม</div></div>
      </div>

      <div className="filterbar" style={{ marginTop: 16 }}>
        {[['all', 'ทั้งหมด'], ['open', 'ยังเปิดอยู่'], ['closed', 'ปิดแล้ว'], ['overdue', 'เกินกำหนด']].map(([k, l]) =>
          <span key={k} className={'chip' + (filter === k ? ' active' : '')} onClick={() => setFilter(k)}>{l}</span>)}
        <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setModal({ ...nextCoNumber(cars), year: new Date().getFullYear(), status: 'open', followups: [], approvals: [] })}>+ เพิ่ม CAR/OFI</button>
      </div>

      {rows.length === 0 && <div className="panel" style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--ink-faint)' }}>ยังไม่มีรายการ — กด “เพิ่ม CAR/OFI” เพื่อสร้างใบใหม่</div>}

      {rows.map(c => (
        <div className="panel" key={c.id} style={{ marginBottom: 12, borderLeft: '3px solid ' + (c.status === 'closed' ? 'var(--ok)' : isOverdue(c) ? 'var(--bad)' : 'var(--review)') }}>
          <div className="panel-b">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="law-code" style={{ fontSize: 13 }}>{c.co_no || '—'}</span>
              {c.ofi_no && <span className="tag">{c.ofi_no}</span>}
              <span className={'pill ' + (c.status === 'closed' ? 'p-ok' : isOverdue(c) ? 'p-bad' : '')}>{c.status === 'closed' ? 'Closed' : isOverdue(c) ? 'เกินกำหนด' : 'Open'}</span>
              {c.year && <span className="tag">ปี {c.year}</span>}
              {c.owner && <span style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>Owner: {c.owner}</span>}
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => carExcel(c)}>Excel</button>
                <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => carPDF(c)}>PDF</button>
                <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => setModal({ ...c, followups: c.followups || [], approvals: c.approvals || [] })}>แก้ไข</button>
                <button className="btn btn-ghost" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => remove(c)}>ลบ</button>
              </span>
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 500, marginTop: 10, lineHeight: 1.5 }}>{(c.finding || '').slice(0, 160) || '—'}</div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap', fontSize: 12, color: 'var(--ink-faint)' }}>
              <span>ผู้ตรวจ: {c.auditor || '—'}</span>
              <span>หน่วยงาน: {c.division || '—'}{c.department ? ' / ' + c.department : ''}</span>
              <span>กำหนดเสร็จ: <b style={{ color: isOverdue(c) ? 'var(--bad)' : 'var(--ink-soft)' }}>{thDate(c.due_date)}</b></span>
              <span>ติดตามผล: {(c.followups || []).length} ครั้ง</span>
            </div>
          </div>
        </div>
      ))}

      {modal && <CarModal car={modal} cars={cars} suggest={suggest} onClose={() => setModal(null)} onSaved={() => { setModal(null); onReload() }} />}
    </div>
  )
}

/* ───── modal ───── */
function Row({ label, children }) { return <div><label className="form-label">{label}</label>{children}</div> }

function CarModal({ car, onClose, onSaved, suggest }) {
  const sg = suggest || {}
  const people = [...new Set([...(sg.responsibles || [])])]
  const [f, setF] = useState(car)
  const [fus, setFus] = useState(car.followups?.length ? car.followups : [])
  const [aps, setAps] = useState(car.approvals?.length ? car.approvals : [])
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const setFu = (i, k, v) => setFus(p => p.map((r, j) => j === i ? { ...r, [k]: v } : r))
  const setAp = (i, k, v) => setAps(p => p.map((r, j) => j === i ? { ...r, [k]: v } : r))

  async function save() {
    setSaving(true)
    try { await saveCar(f, fus, aps); onSaved() }
    catch (e) { toast('บันทึกไม่สำเร็จ: ' + e.message); setSaving(false) }
  }

  return (
    <><div className="scrim" style={{ zIndex: 300 }} onClick={onClose} />
      <div className="modal" style={{ zIndex: 301, width: 720 }}>
        <div className="modal-head"><h3>{car.id ? 'แก้ไข' : 'เพิ่ม'} CAR / OFI</h3><button className="close" onClick={onClose}>×</button></div>
        <div className="modal-body">
          <datalist id="dl-people">{people.map(x => <option key={x} value={x} />)}</datalist>
          <datalist id="dl-team">{(sg.teams || []).map(x => <option key={x} value={x} />)}</datalist>
          <datalist id="dl-div">{(sg.divisions || []).map(x => <option key={x} value={x} />)}</datalist>
          <datalist id="dl-dept">{(sg.departments || []).map(x => <option key={x} value={x} />)}</datalist>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Row label="CO No."><input className="form-input" value={f.co_no || ''} onChange={e => set('co_no', e.target.value)} /></Row>
            <Row label="OFI No."><input className="form-input" value={f.ofi_no || ''} onChange={e => set('ofi_no', e.target.value)} /></Row>
            <Row label="Running No."><input className="form-input" value={f.running_no || ''} onChange={e => set('running_no', e.target.value)} /></Row>
            <Row label="ปี (ค.ศ.)"><input className="form-input" type="number" value={f.year || ''} onChange={e => set('year', e.target.value)} /></Row>
            <Row label="สถานะ"><select className="form-input" value={f.status} onChange={e => set('status', e.target.value)}><option value="open">Open</option><option value="closed">Closed</option></select></Row>
            <Row label="Record Type"><input className="form-input" value={f.record_type || ''} onChange={e => set('record_type', e.target.value)} placeholder="เช่น Open CAR / Closed OFI" /></Row>
            <Row label="Owner"><input className="form-input" list="dl-people" value={f.owner || ''} onChange={e => set('owner', e.target.value)} /></Row>
          </div>

          <div className="sec-t" style={{ marginTop: 16 }}>ข้อมูลการตรวจประเมิน</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <Row label="วันที่ออก CAR"><input className="form-input" type="date" value={f.issue_date || ''} onChange={e => set('issue_date', e.target.value)} /></Row>
            <Row label="ผู้ตรวจประเมิน"><input className="form-input" list="dl-people" value={f.auditor || ''} onChange={e => set('auditor', e.target.value)} /></Row>
            <Row label="หัวหน้างาน"><input className="form-input" list="dl-people" value={f.supervisor || ''} onChange={e => set('supervisor', e.target.value)} /></Row>
            <Row label="ทีม"><input className="form-input" list="dl-team" value={f.team || ''} onChange={e => set('team', e.target.value)} /></Row>
            <Row label="หน่วยงาน"><input className="form-input" list="dl-div" value={f.division || ''} onChange={e => set('division', e.target.value)} /></Row>
            <Row label="แผนก"><input className="form-input" list="dl-dept" value={f.department || ''} onChange={e => set('department', e.target.value)} /></Row>
          </div>

          <Row label="ประเด็น"><textarea className="form-input" rows={2} value={f.finding || ''} onChange={e => set('finding', e.target.value)} /></Row>
          <Row label="แนวทางการแก้ไข"><textarea className="form-input" rows={2} value={f.corrective_action || ''} onChange={e => set('corrective_action', e.target.value)} /></Row>
          <Row label="กำหนดเสร็จ"><input className="form-input" type="date" value={f.due_date || ''} onChange={e => set('due_date', e.target.value)} /></Row>

          <div className="sec-t" style={{ marginTop: 16, display: 'flex' }}>การติดตามผล
            <button className="btn btn-ghost" style={{ marginLeft: 'auto', padding: '3px 10px', fontSize: 12 }} onClick={() => setFus(p => [...p, {}])}>+ เพิ่มครั้ง</button>
          </div>
          {fus.map((r, i) => (
            <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><b style={{ fontSize: 12.5 }}>ครั้งที่ {i + 1}</b><button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => setFus(p => p.filter((_, j) => j !== i))}>ลบ</button></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                <Row label="วันที่ตรวจ"><input className="form-input" type="date" value={r.check_date || ''} onChange={e => setFu(i, 'check_date', e.target.value)} /></Row>
                <Row label="ผู้ติดตาม"><input className="form-input" list="dl-people" value={r.follower || ''} onChange={e => setFu(i, 'follower', e.target.value)} /></Row>
                <Row label="ผู้ประเมิน"><input className="form-input" list="dl-people" value={r.assessor || ''} onChange={e => setFu(i, 'assessor', e.target.value)} /></Row>
                <Row label="ผู้ทวนสอบ"><input className="form-input" list="dl-people" value={r.verifier || ''} onChange={e => setFu(i, 'verifier', e.target.value)} /></Row>
              </div>
              <Row label="ผลการตรวจ"><textarea className="form-input" rows={2} value={r.result || ''} onChange={e => setFu(i, 'result', e.target.value)} /></Row>
              <Row label="สรุป"><input className="form-input" value={r.conclusion || ''} onChange={e => setFu(i, 'conclusion', e.target.value)} placeholder="เช่น ปิดประเด็น" /></Row>
            </div>
          ))}

          <div className="sec-t" style={{ marginTop: 12, display: 'flex' }}>Approval History
            <button className="btn btn-ghost" style={{ marginLeft: 'auto', padding: '3px 10px', fontSize: 12 }} onClick={() => setAps(p => [...p, { status: 'approved' }])}>+ เพิ่มขั้น</button>
          </div>
          {aps.map((r, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1.4fr 1fr auto', gap: 8, marginBottom: 6, alignItems: 'end' }}>
              <Row label="ขั้นตอน"><input className="form-input" value={r.step || ''} onChange={e => setAp(i, 'step', e.target.value)} /></Row>
              <Row label="วันที่"><input className="form-input" type="date" value={r.approve_date || ''} onChange={e => setAp(i, 'approve_date', e.target.value)} /></Row>
              <Row label="ผู้อนุมัติ"><input className="form-input" value={r.approver || ''} onChange={e => setAp(i, 'approver', e.target.value)} /></Row>
              <Row label="สถานะ"><select className="form-input" value={r.status || 'approved'} onChange={e => setAp(i, 'status', e.target.value)}><option value="approved">Approved</option><option value="pending">Pending</option></select></Row>
              <button className="btn btn-ghost" style={{ padding: '7px 9px', fontSize: 11 }} onClick={() => setAps(p => p.filter((_, j) => j !== i))}>×</button>
            </div>
          ))}
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" disabled={saving} onClick={save}>{saving ? 'กำลังบันทึก…' : 'บันทึก'}</button>
        </div>
      </div></>
  )
}

/* ───── PDF ───── */
function carPDF(c) {
  const fus = (c.followups || []).map((r, i) => `
    <h4>การติดตามผลครั้งที่ ${i + 1}</h4>
    <table>
      <tr><td class="k">วันที่ตรวจ</td><td>${esc(thDate(r.check_date))}</td></tr>
      <tr><td class="k">ผู้ติดตาม</td><td>${esc(r.follower || '—')}</td></tr>
      <tr><td class="k">ผู้ประเมิน</td><td>${esc(r.assessor || '—')}</td></tr>
      <tr><td class="k">ผู้ทวนสอบ</td><td>${esc(r.verifier || '—')}</td></tr>
      <tr><td class="k">ผลการตรวจ</td><td>${esc(r.result || '—')}</td></tr>
      <tr><td class="k">สรุป</td><td>${esc(r.conclusion || '—')}</td></tr>
    </table>`).join('')
  const aps = (c.approvals || []).length ? `
    <h4>Approval History</h4>
    <table><tr><th>ขั้นตอน</th><th>วันที่</th><th>ผู้อนุมัติ</th><th>สถานะ</th></tr>
    ${c.approvals.map(a => `<tr><td>${esc(a.step || '—')}</td><td>${esc(thDate(a.approve_date))}</td><td>${esc(a.approver || '—')}</td><td>${a.status === 'approved' ? '✅ Approved' : 'Pending'}</td></tr>`).join('')}
    </table>` : ''
  const html = `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><title>${esc(c.co_no || 'CAR')}</title>
  <style>
    body{font-family:-apple-system,'Sarabun','Tahoma',sans-serif;color:#1d1d1f;padding:28px;font-size:13px;line-height:1.5}
    h1{font-size:20px;margin:0 0 2px}.sub{color:#6e6e73;font-size:12px;margin-bottom:16px}
    h4{font-size:13px;margin:18px 0 6px;border-bottom:2px solid #0071e3;padding-bottom:3px;color:#0058b0}
    table{width:100%;border-collapse:collapse;margin-bottom:6px}
    td,th{border:1px solid #d0d0d6;padding:6px 9px;text-align:left;vertical-align:top}
    th{background:#0071e3;color:#fff;font-size:11.5px}
    td.k{background:#f5f5f7;font-weight:600;width:150px;color:#424245}
    .sign{display:flex;gap:30px;margin-top:40px}.sign div{flex:1;text-align:center;border-top:1px solid #1d1d1f;padding-top:6px;font-size:12px;color:#424245}
    .pill{display:inline-block;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600}
    @media print{body{padding:0}}
  </style></head><body>
    <h1>ใบ CAR / OFI — ${esc(c.co_no || '')}</h1>
    <div class="sub">${esc(c.ofi_no || '')} · ปี ${esc(c.year || '')} · สถานะ ${c.status === 'closed' ? 'Closed' : 'Open'} · Running ${esc(c.running_no || '')}</div>
    <h4>ข้อมูลการตรวจประเมิน</h4>
    <table>
      <tr><td class="k">วันที่ออก CAR</td><td>${esc(thDate(c.issue_date))}</td><td class="k">Owner</td><td>${esc(c.owner || '—')}</td></tr>
      <tr><td class="k">ผู้ตรวจประเมิน</td><td>${esc(c.auditor || '—')}</td><td class="k">หัวหน้างาน</td><td>${esc(c.supervisor || '—')}</td></tr>
      <tr><td class="k">ทีม</td><td>${esc(c.team || '—')}</td><td class="k">หน่วยงาน</td><td>${esc(c.division || '—')}</td></tr>
      <tr><td class="k">แผนก</td><td>${esc(c.department || '—')}</td><td class="k">กำหนดเสร็จ</td><td>${esc(thDate(c.due_date))}</td></tr>
    </table>
    <h4>ประเด็น</h4><table><tr><td>${esc(c.finding || '—')}</td></tr></table>
    <h4>แนวทางการแก้ไข</h4><table><tr><td>${esc(c.corrective_action || '—')}</td></tr></table>
    ${fus}${aps}
    <div class="sign"><div>ผู้ติดตาม</div><div>ผู้ประเมิน</div><div>ผู้ทวนสอบ</div></div>
  </body></html>`
  const w = window.open('', '_blank')
  if (!w) { toast('กรุณาอนุญาต pop-up เพื่อออก PDF'); return }
  w.document.write(html); w.document.close()
  setTimeout(() => w.print(), 350)
}

/* ───── Excel (fixed-width locked table, prints without shifting) ───── */
function carExcel(c) {
  // base cell styles — fixed borders, wrap text, force text format so cells don't reflow
  const B = "border:0.5pt solid #8a8a8a;padding:4px 8px;vertical-align:top;mso-number-format:'\\@';white-space:normal"
  const K = B + ";background:#f0f3f7;font-weight:700;color:#333"
  const HEAD = B + ";background:#0071e3;color:#fff;font-weight:700"
  const TITLE = B + ";background:#fff;font-size:16pt;font-weight:700;border:none"
  const td = (v, s = B, span = 1) => `<td colspan="${span}" style="${s}">${esc(v ?? '—')}</td>`
  const kv = (k1, v1, k2, v2) => `<tr>${td(k1, K)}${td(v1, B)}${td(k2, K)}${td(v2, B)}</tr>`
  const sec = t => `<tr>${td(t, HEAD, 4)}</tr>`
  const full = (v, s = B) => `<tr>${td(v, s, 4)}</tr>`

  let body = ''
  body += `<tr>${td('ใบ CAR / OFI — ' + (c.co_no || ''), TITLE, 4)}</tr>`
  body += full(`${c.ofi_no || ''}  ·  ปี ${c.year || ''}  ·  สถานะ ${c.status === 'closed' ? 'Closed' : 'Open'}  ·  Running ${c.running_no || ''}`, B + ';border:none;color:#666')
  body += sec('ข้อมูลการตรวจประเมิน')
  body += kv('วันที่ออก CAR', thDate(c.issue_date), 'Owner', c.owner)
  body += kv('ผู้ตรวจประเมิน', c.auditor, 'หัวหน้างาน', c.supervisor)
  body += kv('ทีม', c.team, 'หน่วยงาน', c.division)
  body += kv('แผนก', c.department, 'กำหนดเสร็จ', thDate(c.due_date))
  body += sec('ประเด็น'); body += full(c.finding)
  body += sec('แนวทางการแก้ไข'); body += full(c.corrective_action)

  ;(c.followups || []).forEach((r, i) => {
    body += sec('การติดตามผลครั้งที่ ' + (i + 1))
    body += kv('วันที่ตรวจ', thDate(r.check_date), 'ผู้ติดตาม', r.follower)
    body += kv('ผู้ประเมิน', r.assessor, 'ผู้ทวนสอบ', r.verifier)
    body += `<tr>${td('ผลการตรวจ', K)}${td(r.result, B, 3)}</tr>`
    body += `<tr>${td('สรุป', K)}${td(r.conclusion, B, 3)}</tr>`
  })

  if ((c.approvals || []).length) {
    body += sec('Approval History')
    body += `<tr>${td('ขั้นตอน', HEAD)}${td('วันที่', HEAD)}${td('ผู้อนุมัติ', HEAD)}${td('สถานะ', HEAD)}</tr>`
    c.approvals.forEach(a => {
      body += `<tr>${td(a.step, B)}${td(thDate(a.approve_date), B)}${td(a.approver, B)}${td(a.status === 'approved' ? 'Approved' : 'Pending', B)}</tr>`
    })
  }
  body += `<tr><td colspan="4" style="border:none;height:30px"></td></tr>`
  body += `<tr>${td('ผู้ติดตาม', B + ';text-align:center')}${td('ผู้ประเมิน', B + ';text-align:center', 2)}${td('ผู้ทวนสอบ', B + ';text-align:center')}</tr>`

  const html =
`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<!--[if gte mso 9]><xml>
 <x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
  <x:Name>CAR ${esc(c.co_no || '')}</x:Name>
  <x:WorksheetOptions>
   <x:Print><x:ValidPrinterInfo/><x:FitWidth>1</x:FitWidth><x:FitHeight>0</x:FitHeight></x:Print>
   <x:FitToPage/><x:DoNotDisplayGridlines/>
  </x:WorksheetOptions>
 </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>
</xml><![endif]-->
<style>
 table{border-collapse:collapse;table-layout:fixed;width:720px;font-family:'Tahoma','Sarabun',sans-serif;font-size:10.5pt}
 col{mso-width-source:userset}
 td{word-wrap:break-word;overflow:hidden}
</style></head>
<body>
<table>
 <colgroup>
  <col style="width:150px;mso-width-alt:5400">
  <col style="width:210px;mso-width-alt:7600">
  <col style="width:150px;mso-width-alt:5400">
  <col style="width:210px;mso-width-alt:7600">
 </colgroup>
 ${body}
</table>
</body></html>`

  const blob = new Blob(['﻿', html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `${c.co_no || 'CAR'}.xls`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
