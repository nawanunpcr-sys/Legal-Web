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
  // Official F-259 columns, one row per requirement, one sheet per category
  const HEAD = ['ลำดับ', 'เอกสารสนับสนุน', 'กระทรวง', 'ชื่อกฎหมายและข้อปฏิบัติ',
    'สรุปสาระสำคัญและหัวข้อควบคุมเอกสาร', 'วันที่ประกาศใช้', 'หน่วยงานรับผิดชอบ',
    'C', 'NC', 'การรายงานผล', 'ความถี่ของการตรวจสอบ', 'เอกสารที่เกี่ยวข้อง']
  const WIDTHS = [42, 90, 110, 200, 320, 90, 110, 32, 32, 110, 120, 140]

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
        cell(r.status === 'met' ? '✓' : '', 'ok'),
        cell(r.status === 'unmet' ? '✓' : '', 'bad'),
        cell(r.report_to || ''),
        cell(r.frequency || ''),
        cell(r.documents || ''),
      ].join('') + '</Row>').join('')
    }).join('')
    const band = `<Row ss:Height="20"><Cell ss:StyleID="band" ss:MergeAcross="11"><Data ss:Type="String">หมวด ${xesc(code)} : ${xesc(catMap[code]?.name || '')}</Data></Cell></Row>`
    return `<Worksheet ss:Name="${name}"><Table>${cols}${band}${headRow}${rows}</Table></Worksheet>`
  }).join('')

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
  <Style ss:ID="band"><Font ss:FontName="Tahoma" ss:Size="11" ss:Bold="1"/><Interior ss:Color="#BFBFBF" ss:Pattern="Solid"/></Style>
 </Styles>
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
