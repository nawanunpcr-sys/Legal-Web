// ───────────────────────────────────────────────────────────────
// Integrations & export helpers
// ───────────────────────────────────────────────────────────────

import { REQ_STATUS, REQ_STATUS_ORDER, WAITING_STATUS, LAW_STATUS, reqKind } from './supabase.js'
import { GAP_GROUPS as GAP_GROUPS_DEF } from './gap.js'

const TH_MONTHS_FULL = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const xesc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
const sheetName = s => String(s || 'Sheet').replace(/[:\\/?*\[\]]/g, '-').slice(0, 31)

// ── Excel export (multi-sheet, one worksheet per category) ──────
// Output is SpreadsheetML 2003 (.xls) — opens natively in Excel with
// real separate sheets, correct Thai encoding, no dependency.
export function exportLawsToExcel(laws, catMap = {}) {
  // Official F-259 columns, one row per requirement, one sheet per category
  // P21 · เดิมมีช่องติ๊ก C กับ NC สองช่อง · เพิ่ม Ack กับ - ต่อท้ายให้ครบ 4 สถานะ
  // และเพิ่มคอลัมน์ "เหตุผลประกอบสถานะ" เพราะ Ack/ไม่เกี่ยวข้อง บังคับต้องมีเหตุผลเสมอ
  // ถ้าไฟล์ส่งออกไม่มีช่องนี้ ผู้ตรวจ ISO จะเห็นแค่เครื่องหมายถูกโดยไม่รู้ว่าทำไม
  const HEAD = ['ลำดับ', 'เอกสารสนับสนุน', 'กระทรวง', 'ชื่อกฎหมายและข้อปฏิบัติ',
    'สรุปสาระสำคัญและหัวข้อควบคุมเอกสาร', 'วันที่ประกาศใช้', 'หน่วยงานรับผิดชอบ',
    // ส่วนที่ 1 · ช่องติ๊ก 4 สถานะการประเมิน + เหตุผล
    'C', 'NC', 'Ack', '-', 'เหตุผลประกอบสถานะ', 'การรายงานผล', 'ความถี่ของการตรวจสอบ', 'เอกสารที่เกี่ยวข้อง',
    // ส่วนที่ 2 · สถานะการบังคับใช้ต่อท้าย — ผู้ตรวจต้องเห็นในไฟล์ ไม่ใช่เฉพาะบนหน้าจอ
    'สถานะการบังคับใช้', 'ฉบับที่ยกเลิก', 'ฉบับใหม่ที่ใช้แทน']
  const WIDTHS = [42, 90, 110, 200, 320, 90, 110, 32, 32, 34, 32, 200, 110, 120, 140, 110, 220, 220]
  const LAST_COL = HEAD.length - 1

  const byCat = {}
  laws.forEach(l => { (byCat[l.cat] = byCat[l.cat] || []).push(l) })
  const catOrder = [...new Set([...Object.keys(catMap), ...Object.keys(byCat)])].filter(c => byCat[c]?.length)

  const cell = (v, style) => `<Cell${style ? ` ss:StyleID="${style}"` : ''}><Data ss:Type="String">${xesc(v)}</Data></Cell>`
  const headRow = '<Row ss:Height="26">' + HEAD.map(h => cell(h, 'hdr')).join('') + '</Row>'

  const worksheets = catOrder.map(code => {
    const name = sheetName(`${code} ${catMap[code]?.name || ''}`.trim())
    const cols = WIDTHS.map(w => `<Column ss:Width="${w}"/>`).join('')
    let n = 0
    const rows = byCat[code].map(l => {
      n++
      const reqs = l.reqs.length ? l.reqs : [{}]
      return reqs.map((r, i) => '<Row>' + [
        cell(i === 0 ? String(n) : '', 'ctr'),
        cell(i === 0 ? l.code : ''),
        cell(i === 0 ? (l.ministry || '') : ''),
        cell(i === 0 ? (l.name || '') : ''),
        cell(r.text || ''),
        cell(i === 0 ? (l.issue_date || l.effective_date || '') : ''),
        cell(r.responsible || ''),
        // ติ๊กตามสถานะที่ผ่าน reqKind แล้ว — ข้อที่ยังไม่ประเมินจะไม่ถูกติ๊กช่องไหนเลย
        // (เจตนา: ช่องว่างทั้งแถว = ยังไม่มีใครตัดสิน ต่างจากติ๊ก NC ซึ่งแปลว่าตรวจแล้วไม่ผ่าน)
        cell(reqKind(r) === 'met' ? '✓' : '', 'ok'),
        cell(reqKind(r) === 'unmet' ? '✓' : '', 'bad'),
        cell(reqKind(r) === 'acknowledged' ? '✓' : '', 'ack'),
        cell(reqKind(r) === 'not_applicable' ? '✓' : '', 'na'),
        cell(r.status_reason || ''),
        cell(r.report_to || ''),
        cell(r.frequency || ''),
        cell(r.documents || ''),
        // แถวแรกของกฎหมายเท่านั้น — สามคอลัมน์นี้เป็นข้อมูลระดับฉบับ ไม่ใช่ระดับข้อปฏิบัติ
        cell(i === 0 ? (LAW_STATUS[l.law_status || 'in_force']?.label || '') : ''),
        cell(i === 0 ? (l.repealed_by_title || '') : ''),
        cell(i === 0 ? (l.replacement_law_title || l.replaced_by_code || '') : ''),
      ].join('') + '</Row>').join('')
    }).join('')
    const band = `<Row ss:Height="20"><Cell ss:StyleID="band" ss:MergeAcross="${LAST_COL}"><Data ss:Type="String">หมวด ${xesc(code)} : ${xesc(catMap[code]?.name || '')}</Data></Cell></Row>`
    return `<Worksheet ss:Name="${name}"><Table>${cols}${band}${headRow}${rows}</Table></Worksheet>`
  }).join('')

  // คำอธิบายสัญลักษณ์ (Legend) — วางเป็นชีทแรก ผู้ตรวจเปิดไฟล์แล้วเจอก่อนตาราง
  // ต้องมีเสมอแม้ทะเบียนจะยังไม่มีข้อที่เป็น Ack/ไม่เกี่ยวข้องเลย เพราะหัวตารางมีช่องพวกนี้อยู่
  const legendRows = [
    ...REQ_STATUS_ORDER.map(k => [REQ_STATUS[k].code, REQ_STATUS[k].label, REQ_STATUS[k].desc,
      REQ_STATUS[k].inKpi ? 'นับ' : 'ไม่นับ',
      REQ_STATUS[k].reasonRequired ? 'บังคับ' : 'ไม่บังคับ']),
    [WAITING_STATUS.code, WAITING_STATUS.label, 'ยังไม่มีผู้ประเมินตัดสินสถานะของข้อนี้ (ไม่ถูกติ๊กช่องใดเลย)', 'ไม่นับ', '—'],
  ]
  const legendSheet =
    `<Worksheet ss:Name="คำอธิบายสัญลักษณ์"><Table>` +
    [46, 130, 460, 120, 130].map(w => `<Column ss:Width="${w}"/>`).join('') +
    `<Row ss:Height="22"><Cell ss:StyleID="band" ss:MergeAcross="4"><Data ss:Type="String">คำอธิบายสัญลักษณ์สถานะการประเมิน (F-259)</Data></Cell></Row>` +
    '<Row ss:Height="26">' + ['สัญลักษณ์', 'สถานะ', 'ความหมาย', 'นับในอัตราความสอดคล้อง', 'เหตุผลประกอบ']
      .map(h => cell(h, 'hdr')).join('') + '</Row>' +
    legendRows.map(r => '<Row>' + r.map((v, i) => cell(v, i === 0 ? 'ctr' : '')).join('') + '</Row>').join('') +
    `<Row/><Row><Cell ss:MergeAcross="4"><Data ss:Type="String">${xesc('อัตราความสอดคล้อง = C ÷ (C + NC) × 100 — Ack และ ไม่เกี่ยวข้อง ไม่นับเป็นตัวหาร · ฉบับที่มีเฉพาะ Ack และ ไม่เกี่ยวข้อง แสดงผลเป็น N/A')}</Data></Cell></Row>` +
    `</Table></Worksheet>`

  const xml =
`<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default"><Font ss:FontName="Tahoma" ss:Size="10"/><Alignment ss:Vertical="Top" ss:WrapText="1"/></Style>
  <Style ss:ID="hdr"><Font ss:FontName="Tahoma" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0071E3" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="ok"><Font ss:Color="#1F9D57" ss:Bold="1"/><Alignment ss:Horizontal="Center" ss:Vertical="Top"/></Style>
  <Style ss:ID="bad"><Font ss:Color="#D6342A" ss:Bold="1"/><Alignment ss:Horizontal="Center" ss:Vertical="Top"/></Style>
  <Style ss:ID="ctr"><Alignment ss:Horizontal="Center" ss:Vertical="Top"/></Style>
  <Style ss:ID="ack"><Font ss:Color="#0071E3" ss:Bold="1"/><Alignment ss:Horizontal="Center" ss:Vertical="Top"/></Style>
  <Style ss:ID="na"><Font ss:Color="#6B7280" ss:Bold="1"/><Alignment ss:Horizontal="Center" ss:Vertical="Top"/></Style>
  <Style ss:ID="band"><Font ss:FontName="Tahoma" ss:Size="11" ss:Bold="1"/><Interior ss:Color="#BFBFBF" ss:Pattern="Solid"/></Style>
 </Styles>
 ${legendSheet}
 ${worksheets}
</Workbook>`

  const today = new Date()
  const blob = new Blob(['﻿', xml], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `ComplianceRegister_${today.toISOString().slice(0, 10)}.xls`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ── P22 ขั้นที่ 4 · Excel ของรายงาน Gap Analysis ─────────────────────────────
// ใช้กลไก SpreadsheetML 2003 เดิมทุกประการ ไม่เพิ่ม dependency ใดๆ
// 1 worksheet ต่อ 1 กลุ่มช่องว่าง + ชีทสรุปนำหน้า
// ตัวเลขในชีทสรุปมาจาก summary ก้อนเดียวกับที่หน้าจอและ PDF ใช้ (src/lib/gap.js)
// จึงไม่มีทางที่สามแหล่งจะให้คำตอบต่างกัน
export function exportGapToExcel({ groups = {}, summary = {}, settings = {}, groupDefs }) {
  const defs = groupDefs || GAP_GROUPS_DEF
  const cell = (v, style) => `<Cell${style ? ` ss:StyleID="${style}"` : ''}><Data ss:Type="String">${xesc(v)}</Data></Cell>`
  const HEAD = ['ลำดับ', 'รหัสกฎหมาย', 'ชื่อกฎหมาย', 'มาตรา / ข้อ', 'หน่วยงานผู้รับผิดชอบ', 'สิ่งที่ต้องทำต่อ', 'กำหนดเวลา', 'รายละเอียดข้อกำหนด']
  const WIDTHS = [40, 70, 260, 90, 100, 240, 90, 320]
  const company = settings.company_name || settings.org_name || ''

  const sumRows = [
    ['อัตราความสอดคล้อง', summary.pct == null ? '—' : summary.pct + '%', `${summary.met} จาก ${summary.assessed} ข้อ (ฐาน C + NC)`],
    ['ความครบถ้วนของหลักฐาน', summary.evidencePct == null ? '—' : summary.evidencePct + '%', `${summary.evidenceHave} จาก ${summary.evidenceNeed} ข้อที่ประเมินว่าสอดคล้อง`],
    ['ช่องว่างที่พบทั้งหมด', String(summary.totalGaps ?? 0), `จาก ${summary.laws ?? 0} ฉบับ · ${summary.req ?? 0} ข้อปฏิบัติ`],
    ['', '', ''],
    ...defs.map(g => [g.title, String((groups[g.key] || []).length), g.why]),
  ]
  const summarySheet = `<Worksheet ss:Name="${xesc(sheetName('สรุปช่องว่าง'))}"><Table>` +
    [220, 90, 420].map(w => `<Column ss:Width="${w}"/>`).join('') +
    `<Row ss:Height="22"><Cell ss:StyleID="band" ss:MergeAcross="2"><Data ss:Type="String">${xesc('รายงานวิเคราะห์ช่องว่างความสอดคล้องตามกฎหมาย — ISO 45001 ข้อ 6.1.3' + (company ? ' · ' + company : ''))}</Data></Cell></Row>` +
    '<Row ss:Height="24">' + ['หัวข้อ', 'ค่า', 'คำอธิบาย'].map(h => cell(h, 'hdr')).join('') + '</Row>' +
    sumRows.map(r => '<Row>' + r.map(v => cell(v)).join('') + '</Row>').join('') +
    `<Row/><Row><Cell ss:MergeAcross="2"><Data ss:Type="String">${xesc('อัตราความสอดคล้อง = C ÷ (C + NC) × 100 · Ack และ ไม่เกี่ยวข้อง ไม่นับเป็นตัวหาร — ตรงกับที่แสดงบนหน้า Dashboard')}</Data></Cell></Row>` +
    `</Table></Worksheet>`

  const sheets = defs.map(g => {
    const rows = groups[g.key] || []
    const body = rows.length
      ? rows.map((x, i) => '<Row>' + [
        cell(String(i + 1), 'ctr'), cell(x.law?.code || ''), cell(x.law?.name || ''),
        cell(x.section || ''), cell(x.responsible || ''), cell(x.todo || ''),
        cell(x.due ? 'เลยกำหนด ' + x.due : 'ยังไม่กำหนด', x.due ? 'bad' : ''),
        cell(String(x.detail || '').slice(0, 500)),
      ].join('') + '</Row>').join('')
      : `<Row><Cell ss:MergeAcross="7"><Data ss:Type="String">${xesc('ไม่พบช่องว่างในกลุ่มนี้')}</Data></Cell></Row>`
    return `<Worksheet ss:Name="${xesc(sheetName(g.title))}"><Table>` +
      WIDTHS.map(w => `<Column ss:Width="${w}"/>`).join('') +
      `<Row ss:Height="22"><Cell ss:StyleID="band" ss:MergeAcross="7"><Data ss:Type="String">${xesc(g.title + ' — ' + g.why)}</Data></Cell></Row>` +
      '<Row ss:Height="24">' + HEAD.map(h => cell(h, 'hdr')).join('') + '</Row>' +
      body + `</Table></Worksheet>`
  }).join('')

  const xml =
`<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default"><Font ss:FontName="Tahoma" ss:Size="10"/><Alignment ss:Vertical="Top" ss:WrapText="1"/></Style>
  <Style ss:ID="hdr"><Font ss:FontName="Tahoma" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0071E3" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="bad"><Font ss:Color="#D6342A" ss:Bold="1"/><Alignment ss:Vertical="Top"/></Style>
  <Style ss:ID="ctr"><Alignment ss:Horizontal="Center" ss:Vertical="Top"/></Style>
  <Style ss:ID="band"><Font ss:FontName="Tahoma" ss:Size="11" ss:Bold="1"/><Interior ss:Color="#BFBFBF" ss:Pattern="Solid"/></Style>
 </Styles>
 ${summarySheet}
 ${sheets}
</Workbook>`

  const blob = new Blob(['﻿', xml], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `GapAnalysis_${new Date().toISOString().slice(0, 10)}.xls`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
