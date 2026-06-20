// ───────────────────────────────────────────────────────────────
// Integrations & export helpers
// ───────────────────────────────────────────────────────────────

const TH_MONTHS_FULL = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const xesc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
const sheetName = s => String(s || 'Sheet').replace(/[:\\/?*\[\]]/g, '-').slice(0, 31)

// ── Excel export (multi-sheet, one worksheet per category) ──────
// Output is SpreadsheetML 2003 (.xls) — opens natively in Excel with
// real separate sheets, correct Thai encoding, no dependency.
export function exportLawsToExcel(laws, catMap = {}) {
  const statusLabel = { ok: 'สอดคล้อง', bad: 'ยังไม่สอดคล้อง', repealed: 'ถูกยกเลิก' }
  const HEAD = ['รหัส', 'ชื่อกฎหมายและข้อกำหนด', 'กระทรวง / หน่วยงาน', 'สถานะ', 'วันที่ประกาศ/บังคับใช้', 'กำหนดทบทวน']
  const WIDTHS = [70, 360, 170, 110, 150, 110]

  // group laws by category, preserve catMap order then any extras
  const byCat = {}
  laws.forEach(l => { (byCat[l.cat] = byCat[l.cat] || []).push(l) })
  const catOrder = [...new Set([...Object.keys(catMap), ...Object.keys(byCat)])].filter(c => byCat[c]?.length)

  const cell = (v, style) => `<Cell${style ? ` ss:StyleID="${style}"` : ''}><Data ss:Type="String">${xesc(v)}</Data></Cell>`
  const headRow = '<Row ss:Height="22">' + HEAD.map(h => cell(h, 'hdr')).join('') + '</Row>'

  const worksheets = catOrder.map(code => {
    const name = sheetName(`${code} ${catMap[code]?.name || ''}`.trim())
    const cols = WIDTHS.map(w => `<Column ss:Width="${w}"/>`).join('')
    const rows = byCat[code].map(l => '<Row>' + [
      cell(l.code),
      cell(l.name),
      cell(l.ministry || '—'),
      cell(statusLabel[l.status] || l.status, l.status === 'bad' ? 'bad' : l.status === 'repealed' ? 'rep' : 'ok'),
      cell(l.issue_date || l.effective_date || '—'),
      cell(l.review_date || '—'),
    ].join('') + '</Row>').join('')
    return `<Worksheet ss:Name="${name}"><Table>${cols}${headRow}${rows}</Table></Worksheet>`
  }).join('')

  const xml =
`<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default"><Font ss:FontName="Tahoma" ss:Size="10"/><Alignment ss:Vertical="Top" ss:WrapText="1"/></Style>
  <Style ss:ID="hdr"><Font ss:FontName="Tahoma" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0071E3" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="ok"><Font ss:Color="#1F9D57" ss:Bold="1"/></Style>
  <Style ss:ID="bad"><Font ss:Color="#D6342A" ss:Bold="1"/></Style>
  <Style ss:ID="rep"><Font ss:Color="#888888"/></Style>
 </Styles>
 ${worksheets}
</Workbook>`

  const today = new Date()
  const blob = new Blob(['﻿', xml], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `LexRegistry_${today.toISOString().slice(0, 10)}.xls`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
