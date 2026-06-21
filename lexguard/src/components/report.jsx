// Builds the official F-259 register (REGISTER OF LEGAL AND REQUIREMENT)
// into #print-report, then App calls window.print().
const ESC = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function buildReport({ laws, catName = {}, settings = {} }) {
  const el = document.getElementById('print-report')
  if (!el) return
  const company = settings.company_name || settings.org_name || 'บริษัท จัสเทล เน็ทเวิร์ค จำกัด'
  const year = new Date().getFullYear() + 543

  const byCat = {}
  laws.forEach(l => { (byCat[l.cat] = byCat[l.cat] || []).push(l) })
  const cats = [...new Set([...Object.keys(catName), ...Object.keys(byCat)])].filter(c => byCat[c]?.length)

  const COLS = ['ลำดับ', 'เอกสารสนับสนุน', 'กระทรวง', 'ชื่อกฎหมายและข้อกำหนด',
    'สรุปสาระสำคัญและหัวข้อควบคุมเอกสาร', 'วันที่ประกาศใช้', 'หน่วยงานรับผิดชอบ',
    'C', 'NC', 'การรายงานผล', 'ความถี่ของการตรวจสอบ', 'เอกสารที่เกี่ยวข้อง']

  const sections = cats.map(c => {
    const headRow = `<tr class="ch">${COLS.map(h => `<th>${ESC(h)}</th>`).join('')}</tr>`
    let n = 0
    const body = byCat[c].map(l => {
      n++
      const reqs = l.reqs.length ? l.reqs : [{}]
      const span = reqs.length
      return reqs.map((r, i) => {
        const lawCells = i === 0 ? `
          <td rowspan="${span}" class="ctr">${n}</td>
          <td rowspan="${span}">${ESC(l.code)}</td>
          <td rowspan="${span}">${ESC(l.ministry || '')}</td>
          <td rowspan="${span}" class="law">${ESC(l.name || '')}</td>` : ''
        const dateCell = i === 0 ? `<td rowspan="${span}">${ESC(l.issue_date || l.effective_date || '')}</td>` : ''
        const met = r.status === 'met', nc = r.status === 'unmet'
        return `<tr>${lawCells}
          <td class="sara">${ESC(r.text || '')}</td>
          ${dateCell}
          <td>${ESC(r.responsible || '')}</td>
          <td class="ctr ok">${met ? '✓' : ''}</td>
          <td class="ctr bad">${nc ? '✓' : ''}</td>
          <td>${ESC(r.report_to || '')}</td>
          <td>${ESC(r.frequency || '')}</td>
          <td>${ESC(r.documents || '')}</td>
        </tr>`
      }).join('')
    }).join('')

    return `
      <table class="reg">
        <tr><td class="catband" colspan="12">หมวด ${ESC(c)} : ${ESC(catName[c] || '')}</td></tr>
        ${headRow}
        ${body}
      </table>`
  }).join('')

  el.innerHTML = `
  <style>
    @page { size: A4 landscape; margin: 10mm }
    #print-report .doc { font-family: 'Anuphan','Sarabun',sans-serif; color:#000; font-size:9.5px }
    #print-report table { width:100%; border-collapse:collapse }
    #print-report .head td { border:1px solid #000; padding:4px 8px; vertical-align:top }
    #print-report .head .title { text-align:center }
    #print-report .head .title .th1 { font-size:13px; font-weight:700 }
    #print-report .head .title .th2 { font-size:11px; font-weight:700 }
    #print-report .head .title .en { font-size:11px; font-weight:700; letter-spacing:.3px }
    #print-report .reg { margin-top:8px; page-break-inside:auto }
    #print-report .reg th, #print-report .reg td { border:1px solid #000; padding:3px 5px; vertical-align:top }
    #print-report .reg .ch th { background:#d9d9d9; text-align:center; font-weight:700; font-size:9px }
    #print-report .reg .catband { background:#bfbfbf; font-weight:700; font-size:11px; padding:5px 8px }
    #print-report .reg .ctr { text-align:center }
    #print-report .reg .ok { color:#0a7a32; font-weight:700 }
    #print-report .reg .bad { color:#c4271d; font-weight:700 }
    #print-report .reg .law { font-weight:600; min-width:120px }
    #print-report .reg .sara { white-space:pre-wrap; min-width:230px }
    #print-report .reg tr { page-break-inside: avoid }
  </style>
  <div class="doc">
    <table class="head">
      <tr>
        <td style="width:18%">&nbsp;</td>
        <td class="title">
          <div class="th1">ทะเบียนกฎหมาย</div>
          <div class="th2">และแบบประเมินความสอดคล้องและข้อกำหนดอื่นๆ</div>
          <div class="en">REGISTER OF LEGAL AND REQUIREMENT</div>
        </td>
        <td style="width:22%">
          <div><b>Effective Date :</b> ${year}</div>
          <div style="margin-top:6px"><b>Revision&nbsp;&nbsp;&nbsp;:</b> 01</div>
          <div style="margin-top:6px"><b>No of Pages&nbsp;:</b></div>
        </td>
      </tr>
      <tr><td colspan="3" style="font-size:10px">${ESC(company)}</td></tr>
    </table>
    ${sections}
  </div>`
}
