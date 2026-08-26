// P22 ขั้นที่ 4 · รายงาน Gap Analysis และความพร้อมตรวจประเมิน (ISO 45001 ข้อ 6.1.3)
//
// ═══ ทำไมเป็นเมนูใหม่ ไม่ใช่แท็บใน Reports.jsx ตามที่แผนเขียนไว้ ═══
// src/components/Reports.jsx เป็นตารางกำหนดส่งรายงานราชการใต้เมนู "สื่อสาร & ส่งรายงาน"
// ไม่ใช่หน้ารายงานวิเคราะห์ · ระบบไม่เคยมีหน้ารายงานมาก่อน จึงต้องมีที่อยู่ของตัวเอง
//
// ═══ กติกา ═══
// หน้านี้อ่านอย่างเดียว ไม่มีคำสั่งเขียนลงฐานข้อมูล
// ตัวเลขทุกตัวมาจาก src/lib/gap.js ซึ่งใช้สูตรเดียวกับ Dashboard (ฐาน C + NC)
import { useEffect, useMemo, useState } from 'react'
import { buildGapAnalysis, GAP_GROUPS } from '../lib/gap.js'
import { fetchImprovementPlans, suggestionAccuracy, fetchLawFileCounts } from '../lib/supabase.js'
import { exportGapToExcel } from '../lib/integrations.js'
import { buildGapReport } from '../components/PdfExport.jsx'
import { I } from '../components/icons.jsx'
import { GLOSSARY } from '../lib/ui.jsx'

function Stat({ lab, val, sub, accent, tip }) {
  return (
    <div className="stat" style={{ borderTopColor: accent }} title={tip || ''}>
      <div className="lab">{lab}</div>
      <div className="val num" style={{ color: accent }}>{val}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 3, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  )
}

export default function GapReport({ laws = [], catMap = {}, settings = {}, round, onOpen }) {
  const [plans, setPlans] = useState([])
  const [lawFiles, setLawFiles] = useState({})
  const [acc, setAcc] = useState(null)
  const [openKey, setOpenKey] = useState(GAP_GROUPS[0].key)

  useEffect(() => { let live = true
    fetchImprovementPlans().then(d => { if (live) setPlans(d) }).catch(() => {})
    fetchLawFileCounts().then(m => { if (live) setLawFiles(m) }).catch(() => {})
    suggestionAccuracy().then(a => { if (live) setAcc(a) }).catch(() => {})
    return () => { live = false }
  }, [])

  const { groups, summary } = useMemo(() => buildGapAnalysis(laws, plans, lawFiles), [laws, plans, lawFiles])

  function exportPdf() {
    buildGapReport({ groups, summary, catMap, settings, round })
    setTimeout(() => window.print(), 80)
  }

  return (
    <div className="view">
      {/* ── หัวรายงาน ── */}
      <div className="rc-stats" style={{ marginBottom: 14 }}>
        <Stat lab="อัตราความสอดคล้อง" accent="#5F7A61" tip={GLOSSARY.pct}
          val={summary.pct == null ? '—' : summary.pct + '%'}
          sub={`${summary.met} จาก ${summary.assessed} ข้อที่เข้าฐานคำนวณ (C + NC)`} />
        <Stat lab="ความครบถ้วนของหลักฐาน" accent="#B58A3C" tip={GLOSSARY.evidence}
          val={summary.evidencePct == null ? '—' : summary.evidencePct + '%'}
          sub={`${summary.evidenceHave} จาก ${summary.evidenceNeed} ข้อที่ประเมินว่าสอดคล้อง`} />
        <Stat lab="ช่องว่างทั้งหมด" accent="#B4553F" val={summary.totalGaps}
          sub={`จาก ${summary.laws} ฉบับ · ${summary.req} ข้อปฏิบัติ`} />
        <Stat lab="ความแม่นของข้อเสนอ AI" accent="#3A6A97"
          val={acc?.pct == null ? '—' : acc.pct + '%'}
          sub={acc?.decided ? `ผู้ประเมินรับข้อเสนอ ${acc.accepted} จาก ${acc.decided} ครั้ง` : 'ยังไม่มีการตัดสินข้อเสนอ'} />
      </div>

      <div className="ai-box" style={{ marginBottom: 14, borderLeftColor: 'var(--brand)' }}>
        <span className="ai-tag">ความพร้อมสำหรับการตรวจประเมิน — ISO 45001 ข้อ 6.1.3</span>
        <p style={{ marginBottom: 0, lineHeight: 1.75 }}>
          รายงานนี้แสดง<b>ช่องว่างที่ผู้ตรวจจะพบ</b> เรียงตามความเสี่ยงจากมากไปน้อย
          — ตัวเลขทุกตัวคำนวณจากข้อมูลชุดเดียวกับหน้า Dashboard และอัตราความสอดคล้องใช้ฐาน C + NC
          ตามที่ระบบกำหนดไว้ · หน้านี้ไม่เปลี่ยนแปลงข้อมูลใดในระบบ
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost" onClick={exportPdf}><I n="list" />พิมพ์ / บันทึก PDF</button>
        <button className="btn btn-ghost" onClick={() => exportGapToExcel({ groups, summary, catMap, settings })}>
          <I n="download" />ดาวน์โหลด Excel
        </button>
      </div>

      {/* ── 5 กลุ่มช่องว่าง ── */}
      {GAP_GROUPS.map(g => {
        const rows = groups[g.key] || []
        const on = openKey === g.key
        return (
          <div key={g.key} className="panel" style={{ marginBottom: 12 }}>
            <div className="panel-h" style={{ cursor: 'pointer' }} onClick={() => setOpenKey(on ? null : g.key)}>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{g.title}</span>
              <span className={'pill ' + (rows.length ? 'p-bad' : 'p-ok')}>
                {rows.length ? `${rows.length} รายการ` : 'ไม่มีช่องว่าง'}
              </span>
              <span style={{ fontSize: 12, color: 'var(--brand)' }}>{on ? 'ย่อ ▲' : 'ขยาย ▼'}</span>
            </div>
            {on && (
              <div className="panel-b" style={{ paddingTop: 4 }}>
                <p style={{ fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.7, margin: '0 0 10px' }}>
                  <b>เหตุที่เป็นช่องว่าง:</b> {g.why}<br /><b>สิ่งที่ต้องทำต่อ:</b> {g.todo}
                </p>
                {rows.length === 0
                  ? <p style={{ fontSize: 12.5, color: 'var(--ok)' }}>ไม่พบรายการในกลุ่มนี้</p>
                  : (
                    <div className="tablewrap">
                      <table className="reg-table">
                        <thead><tr>
                          <th style={{ width: 90 }}>กฎหมาย</th>
                          <th style={{ width: 110 }}>มาตรา / ข้อ</th>
                          <th style={{ width: 110 }}>หน่วยงาน</th>
                          <th>สิ่งที่ต้องทำต่อ</th>
                          <th style={{ width: 100 }}>กำหนดเวลา</th>
                        </tr></thead>
                        <tbody>
                          {rows.map((x, i) => (
                            <tr key={i} style={{ cursor: onOpen ? 'pointer' : 'default' }}
                              onClick={() => onOpen && onOpen(x.law)}>
                              <td data-lb="กฎหมาย"><span className="law-code">{x.law.code}</span></td>
                              <td data-lb="มาตรา / ข้อ" style={{ fontSize: 12 }}>{x.section}</td>
                              <td data-lb="หน่วยงาน" style={{ fontSize: 12 }}>{x.responsible}</td>
                              <td data-lb="สิ่งที่ต้องทำต่อ" style={{ fontSize: 12.5, lineHeight: 1.55 }}>
                                {x.todo}
                                {x.detail && <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 3 }}>
                                  ↳ {String(x.detail).slice(0, 110)}{String(x.detail).length > 110 ? '…' : ''}
                                </div>}
                              </td>
                              <td data-lb="กำหนดเวลา" style={{ fontSize: 12 }}>
                                {x.due
                                  ? <span style={{ color: 'var(--bad)', fontWeight: 600 }}>เลยกำหนด {x.due}</span>
                                  : <span style={{ color: 'var(--ink-faint)' }}>ยังไม่กำหนด</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
