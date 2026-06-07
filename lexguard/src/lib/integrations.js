// ───────────────────────────────────────────────────────────────
// Integrations & export helpers
// ───────────────────────────────────────────────────────────────

const TH_MONTHS_FULL = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')

// ── Excel export ────────────────────────────────────────────────
// Builds an Excel-compatible HTML workbook (.xls) — opens natively in
// Microsoft Excel / Numbers / Google Sheets with correct Thai encoding,
// no external dependency required.
export function exportLawsToExcel(laws, catMap = {}) {
  const prog = l => !l.reqs.length ? 100 : Math.round(l.reqs.filter(r => r.status === 'met').length / l.reqs.length * 100)
  const statusLabel = { ok: 'สอดคล้อง', bad: 'ยังไม่สอดคล้อง', repealed: 'ถูกยกเลิก' }

  const header = ['รหัส', 'หมวด', 'ชื่อหมวด', 'ชั้น', 'ชื่อกฎหมาย', 'กระทรวง / หน่วยงาน',
                  'สถานะ', 'ข้อกำหนด (ผ่าน/ทั้งหมด)', 'ความสอดคล้อง (%)', 'กำหนดทบทวน']
  const rows = laws.map(l => ([
    l.code, l.cat, catMap[l.cat]?.name || '', l.hierarchy_level || '',
    l.name, l.ministry || '—', statusLabel[l.status] || l.status,
    `${l.reqs.filter(r => r.status === 'met').length}/${l.reqs.length}`,
    prog(l) + '%', l.review_date || '—',
  ]))

  const thead = '<tr>' + header.map(h => `<th>${esc(h)}</th>`).join('') + '</tr>'
  const tbody = rows.map(r => '<tr>' + r.map(c => `<td>${esc(c)}</td>`).join('') + '</tr>').join('')

  const today = new Date()
  const html =
`<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<style>
  table{border-collapse:collapse;font-family:'Tahoma','Sarabun',sans-serif;font-size:11pt}
  th{background:#0071e3;color:#fff;border:1px solid #b8b8c0;padding:6px 10px;text-align:left;font-weight:700}
  td{border:1px solid #d0d0d6;padding:5px 10px;vertical-align:top}
  caption{font-size:14pt;font-weight:700;text-align:left;padding:8px 0}
</style></head>
<body>
<table>
  <caption>ทะเบียนกฎหมาย SHE — ส่งออกเมื่อ ${today.getDate()} ${TH_MONTHS_FULL[today.getMonth()]} ${today.getFullYear() + 543}</caption>
  <thead>${thead}</thead>
  <tbody>${tbody}</tbody>
</table>
</body></html>`

  const blob = new Blob(['﻿', html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `LexRegistry_${today.toISOString().slice(0, 10)}.xls`
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
