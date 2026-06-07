// ───────────────────────────────────────────────────────────────
// Integrations & export helpers
// ───────────────────────────────────────────────────────────────
import { hasSupabase, supabase } from './supabase.js'

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

// ── PDF / Ratchakitcha law reader ───────────────────────────────
// Reads a PDF/law URL (e.g. ratchakitcha.soc.go.th) and returns an
// AI summary. This is the integration point for your own Skill /
// backend: deploy a Supabase Edge Function named `read-law` that
// accepts { url } and returns { summary, suggested }. Until then it
// returns a clear placeholder so the UI stays usable.
export async function summarizeLawUrl(url) {
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error('กรุณาใส่ลิงก์ที่ถูกต้อง (ขึ้นต้นด้วย http:// หรือ https://)')
  }

  if (hasSupabase && supabase.functions) {
    try {
      const { data, error } = await supabase.functions.invoke('read-law', { body: { url } })
      if (!error && data?.summary) return data
    } catch (_) { /* fall through to placeholder */ }
  }

  await new Promise(r => setTimeout(r, 400))
  const isRatcha = /ratchakitcha\.soc\.go\.th/i.test(url)
  return {
    pending: true,
    source: isRatcha ? 'ราชกิจจานุเบกษา' : 'เอกสาร PDF',
    url,
    suggested: { name: '', ministry: '', hierarchy_level: '4', effective_date: '' },
    summary:
      'ยังไม่ได้เชื่อมต่อบริการอ่านเอกสาร — เมื่อสร้าง Skill / Edge Function ชื่อ "read-law" ' +
      'ที่รับ { url } และคืน { summary, suggested } แล้ว ระบบจะดึงเนื้อหาจาก ' + url +
      ' มาสรุปและให้ลงทะเบียนได้อัตโนมัติ',
    requirements: [],
  }
}

// ── ShawPat OSH-law updates feed ────────────────────────────────
// Pulls law updates from shawpat.or.th/th/other-service/osh-law via
// Supabase Edge Function `shawpat-updates`. Returns cached/sample rows
// until the scraper backend is connected.
export async function fetchShawpatUpdates() {
  if (hasSupabase && supabase.functions) {
    try {
      const { data, error } = await supabase.functions.invoke('shawpat-updates')
      if (!error && Array.isArray(data?.items)) return data.items
    } catch (_) { /* fall through */ }
  }
  // Sample feed (placeholder until scraper is connected)
  return [
    { id: 's1', title: 'ตัวอย่าง: ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่องหลักเกณฑ์ความปลอดภัย', date: '2026-05-20', source: 'ShawPat · OSH Law', url: 'https://www.shawpat.or.th/th/other-service/osh-law', pending: true },
    { id: 's2', title: 'ตัวอย่าง: กฎกระทรวงกำหนดมาตรฐานการตรวจสุขภาพลูกจ้าง', date: '2026-04-11', source: 'ShawPat · OSH Law', url: 'https://www.shawpat.or.th/th/other-service/osh-law', pending: true },
  ]
}
