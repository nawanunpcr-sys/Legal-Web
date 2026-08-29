// P20 · นำเข้ากฎหมายเป็นชุดจาก CSV (อ่านฝั่ง client ล้วน ไม่อัปโหลดขึ้น server)
// ทุกแถวที่นำเข้า = "รอผู้เกี่ยวข้องประเมิน" (P18: unmet + evaluated_at NULL + responsible='QA & SHE')
import { useState, useMemo } from 'react'
import { I } from './icons.jsx'
import { nextCode, findLawDuplicate, isoToBE } from '../lib/ui.jsx'
import { createLawsBatch } from '../lib/supabase.js'
import { toast } from '../lib/toast.js'

const COLS = ['หมวด', 'ชื่อกฎหมาย', 'กระทรวง', 'วันที่ประกาศ', 'วันที่บังคับใช้', 'เอกสาร', 'สาระสำคัญ']
const SAMPLE =
  COLS.join(',') + '\n' +
  'LA,พรบ.ความปลอดภัย อาชีวอนามัยฯ พ.ศ. 2554,กระทรวงแรงงาน,17/01/2554,16/07/2554,ISD-14,จัดให้มี จป.วิชาชีพ|จัดทำแผนฉุกเฉิน|อบรมความปลอดภัยพนักงานใหม่\n' +
  'LB,กฎกระทรวงกำหนดมาตรฐานไฟฟ้า,กระทรวงพลังงาน,01/05/2569,01/07/2569,,ตรวจสอบระบบไฟฟ้าประจำปี\n'

// ── CSV parser เล็กๆ: รองรับ field ในเครื่องหมายคำพูด (มี , หรือขึ้นบรรทัดในค่าได้) ──
function parseCSV(text) {
  const rows = []; let row = [], field = '', inQ = false
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inQ) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++ } else inQ = false }
      else field += c
    } else if (c === '"') inQ = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else field += c
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows.filter(r => r.some(x => (x || '').trim()))
}

export default function ImportLawsModal({ cats = [], allLaws = [], onClose, onImported }) {
  const [parsed, setParsed] = useState(null)   // [{cat,name,ministry,announce,effective,docs,reqTexts,status,note}]
  const [sel, setSel] = useState(new Set())
  const [fileName, setFileName] = useState('')
  const [busy, setBusy] = useState(false)
  const catCodes = useMemo(() => new Set(cats.map(c => c.code)), [cats])

  function downloadSample() {
    const blob = new Blob(['﻿' + SAMPLE], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = 'ตัวอย่าง-นำเข้ากฎหมาย.csv'; a.click(); URL.revokeObjectURL(a.href)
  }

  function onFile(e) {
    const file = e.target.files?.[0]; if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const rows = parseCSV(String(reader.result || ''))
        if (rows.length < 2) { toast('ไฟล์ว่างหรือมีแต่หัวตาราง'); return }
        // จับ index คอลัมน์จากหัวตาราง (fallback = ตามลำดับ COLS)
        const head = rows[0].map(h => (h || '').trim())
        const idx = COLS.map((c, i) => { const j = head.indexOf(c); return j >= 0 ? j : i })
        const items = rows.slice(1).map(r => {
          const g = k => (r[idx[k]] || '').trim()
          const cat = g(0), name = g(1)
          const reqTexts = g(6).split('|').map(t => t.trim()).filter(Boolean)
          const it = { cat, name, ministry: g(2), announce: isoToBE(g(3)), effective: isoToBE(g(4)), docs: g(5), reqTexts }
          // ตรวจสถานะ: ✕ ข้อมูลไม่ครบ → ⚠ ซ้ำ → ✓ พร้อม
          if (!cat || !catCodes.has(cat) || !name) {
            it.status = 'bad'; it.note = !name ? 'ไม่มีชื่อกฎหมาย' : (!cat ? 'ไม่มีหมวด' : `หมวด "${cat}" ไม่มีในระบบ`)
          } else {
            const dup = findLawDuplicate(allLaws, name)
            if (dup) { it.status = 'dup'; it.note = `อาจซ้ำกับ ${dup.law.code} (${dup.type})` }
            else { it.status = 'ok'; it.note = '' }
          }
          return it
        })
        setParsed(items)
        // ติ๊กเฉพาะแถว ✓ อัตโนมัติ (⚠/✕ ไม่ติ๊ก)
        setSel(new Set(items.map((it, i) => it.status === 'ok' ? i : null).filter(i => i !== null)))
      } catch (err) { toast('อ่านไฟล์ไม่สำเร็จ: ' + err.message) }
    }
    reader.readAsText(file, 'utf-8')
  }

  const toggle = i => setSel(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n })
  const selectable = (parsed || []).map((it, i) => it.status !== 'bad' ? i : null).filter(i => i !== null)
  const selCount = sel.size

  async function doImport() {
    if (!parsed || !selCount || busy) return
    setBusy(true)
    try {
      // gen รหัสไม่ให้ชนกันเองในชุด (นับต่อจาก nextCode ต่อหมวด)
      const counters = {}
      const genCode = cat => {
        if (counters[cat] == null) counters[cat] = parseInt((nextCode(allLaws, cat).match(/(\d+)$/) || [0, 0])[1], 10)
        else counters[cat]++
        return `${cat}-${String(counters[cat]).padStart(3, '0')}`
      }
      const inputs = [...sel].sort((a, b) => a - b).map(i => {
        const it = parsed[i]
        return { code: genCode(it.cat), cat: it.cat, name: it.name, ministry: it.ministry,
          announce_date: it.announce, effective_date: it.effective, doc_list: it.docs, reqTexts: it.reqTexts }
      })
      const laws = await createLawsBatch(inputs, { responsible: 'QA & SHE' })
      const skipped = parsed.length - laws.length
      toast(`นำเข้า ${laws.length} ฉบับ${skipped ? ` · ข้าม ${skipped} ฉบับ` : ''}`, 'success')
      onImported && onImported(laws)
      onClose()
    } catch (e) { toast('นำเข้าไม่สำเร็จ (ยกเลิกทั้งชุด): ' + e.message) }
    finally { setBusy(false) }
  }

  const badge = st => st === 'ok'
    ? <span className="pill p-ok" style={{ fontSize: 11 }}>✓ พร้อมนำเข้า</span>
    : st === 'dup'
      ? <span className="pill p-warn" style={{ fontSize: 11 }}>⚠ ซ้ำ</span>
      : <span className="pill p-bad" style={{ fontSize: 11 }}>✕ ข้อมูลไม่ครบ</span>

  return (<>
    <div className="scrim" style={{ zIndex: 300 }} onClick={onClose} />
    <div className="modal" style={{ zIndex: 301, width: 860, maxWidth: '94vw', maxHeight: '90vh', overflow: 'auto' }}>
      <div className="modal-head">
        <h3>นำเข้ากฎหมายจาก CSV</h3>
        <button className="close" onClick={onClose}><I n="x" /></button>
      </div>
      <div className="modal-body">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
          <label className="btn btn-ghost" style={{ padding: '7px 14px', cursor: 'pointer' }}>
            <I n="download" />เลือกไฟล์ CSV
            <input type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={onFile} />
          </label>
          <button className="btn btn-ghost" style={{ padding: '7px 14px' }} onClick={downloadSample}>ดาวน์โหลดไฟล์ตัวอย่าง</button>
          {fileName && <span style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>{fileName}</span>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 12, lineHeight: 1.6 }}>
          คอลัมน์: {COLS.join(' · ')} — สาระสำคัญหลายข้อคั่นด้วย <b>|</b> · วันที่รูปแบบ วว/ดด/ปปปป (พ.ศ.) หรือ ปปปป-ดด-วว<br />
          กฎหมายที่นำเข้าทุกข้อปฏิบัติจะอยู่สถานะ <b>รอผู้เกี่ยวข้องประเมิน</b> (ผู้รับผิดชอบเริ่มต้น: QA & SHE — แก้ได้ภายหลัง)
        </div>

        {!parsed && <div className="panel" style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>เลือกไฟล์ CSV เพื่อดูตัวอย่างก่อนนำเข้า</div>}

        {parsed && (<>
          <div style={{ display: 'flex', gap: 14, fontSize: 12.5, marginBottom: 8 }}>
            <span>ทั้งหมด <b>{parsed.length}</b></span>
            <span style={{ color: 'var(--ok)' }}>✓ พร้อม {parsed.filter(it => it.status === 'ok').length}</span>
            <span style={{ color: 'var(--warn)' }}>⚠ ซ้ำ {parsed.filter(it => it.status === 'dup').length}</span>
            <span style={{ color: 'var(--bad)' }}>✕ ไม่ครบ {parsed.filter(it => it.status === 'bad').length}</span>
            <span style={{ marginLeft: 'auto' }}>เลือกนำเข้า <b>{selCount}</b> ฉบับ</span>
          </div>
          <div className="tablewrap" style={{ maxHeight: '46vh', overflow: 'auto' }}>
            <table>
              <thead><tr>
                <th style={{ width: 34 }}><input type="checkbox"
                  checked={selCount > 0 && selCount === selectable.length}
                  ref={el => { if (el) el.indeterminate = selCount > 0 && selCount < selectable.length }}
                  onChange={e => setSel(e.target.checked ? new Set(selectable) : new Set())} /></th>
                <th>สถานะ</th><th>หมวด</th><th>ชื่อกฎหมาย</th><th style={{ textAlign: 'center' }}>ข้อปฏิบัติ</th><th>หมายเหตุ</th>
              </tr></thead>
              <tbody>
                {parsed.map((it, i) => (
                  <tr key={i} style={{ opacity: it.status === 'bad' ? .55 : 1 }}>
                    <td><input type="checkbox" disabled={it.status === 'bad'} checked={sel.has(i)} onChange={() => toggle(i)} /></td>
                    <td>{badge(it.status)}</td>
                    <td className="num">{it.cat || '—'}</td>
                    <td style={{ fontSize: 12.5 }}>{(it.name || '—').slice(0, 60)}</td>
                    <td style={{ textAlign: 'center' }} className="num">{it.reqTexts.length}</td>
                    <td style={{ fontSize: 12, color: it.status === 'bad' ? 'var(--bad)' : 'var(--ink-faint)' }}>{it.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>)}
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-primary" disabled={!selCount || busy} onClick={doImport}>
          {busy ? 'กำลังนำเข้า…' : `นำเข้า ${selCount} ฉบับ`}
        </button>
      </div>
    </div>
  </>)
}
