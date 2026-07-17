// Builds the official F-259 register (REGISTER OF LEGAL AND REQUIREMENT) into
// #print-report, then App calls window.print(). Layout mirrors the real
// source-data/F-259 workbook: form no. top-right, per-category pages, C/NC
// evaluation and an end-of-report signature block.
import { thDate } from '../lib/ui.jsx'

const ESC = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// F-259 form metadata (from the source workbook header)
const FORM = { no: 'F-259', rev: 'Rev.1', effective: '10/01/66' }

const MODE_LABEL = { all: 'ทั้งหมด', cats: 'เฉพาะหมวดที่เลือก', nc: 'เฉพาะรายการที่ยังไม่สอดคล้อง (NC)' }

// คอลัมน์ตรงตามฟอร์ม F-259 จริง (ชีท LA-…): รหัส/กระทรวง/ชื่อ/สาระสำคัญ/วันที่/
// ผู้รับผิดชอบ/C-NC/ความถี่/การรายงานผล/เอกสาร/หมายเหตุ
const COLS = [
  ['ลำดับ', '3%'],
  ['รหัสกฎหมาย', '6%'],
  ['กระทรวง', '9%'],
  ['ชื่อกฎหมาย', '15%'],
  ['สรุปสาระสำคัญ', '22%'],
  ['วันที่ประกาศ/บังคับใช้', '7%'],
  ['ผู้รับผิดชอบ', '7%'],
  ['สถานะ<br/>C / NC', '4%'],
  ['ความถี่การตรวจสอบ', '7%'],
  ['การรายงานผล', '6%'],
  ['เอกสารที่เกี่ยวข้อง', '8%'],
  ['หมายเหตุ', '6%'],
]

// ── P10 Task 11 · สรุปประจำเดือน (A4 แนวตั้ง, ฟอนต์ไทยเดิม) — reuse #print-report ──
const TH_MONTHS_FULL = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const ACT_LABEL = { create:'เพิ่มใหม่', register:'เพิ่มเข้าทะเบียน', import:'นำเข้า (AI)', monitor:'เปิดทวนสอบ', assess:'ประเมิน', plan:'สร้างแผน', plan_close:'ปิดแผน', repeal:'ยกเลิก', restore:'กู้คืน', requirement:'แก้สถานะ', verify:'ตรวจทาน', verify_edit:'แก้ผลสรุป AI', duplicate_override:'ยืนยันเพิ่มซ้ำ', finalize:'ยืนยันสมบูรณ์', screen:'คัดกรอง', assign:'มอบหมาย' }
const catOrderKey = c => (c === 'CC' ? 1 : 0) + '_' + c

export function buildMonthlyReport({ month, year, settings = {}, activity = [], workflowRows = [], searchLog = [], laws = [], catName = {}, issuer = '' }) {
  const el = document.getElementById('print-report'); if (!el) return
  const company = settings.company_name || settings.org_name || 'บริษัท จัสเทล เน็ทเวิร์ค จำกัด'
  const printedOn = thDate(new Date().toISOString())
  const monthLabel = `${TH_MONTHS_FULL[month - 1]} ${year + 543}`
  const inMonth = d => { if (!d) return false; const x = new Date(d); return x.getFullYear() === year && x.getMonth() === month - 1 }
  const lawById = Object.fromEntries(laws.map(l => [l.id, l]))
  const hhmm = s => { const d = new Date(s); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') }

  const actM = activity.filter(a => inMonth(a.created_at))
  const added = actM.filter(a => a.action === 'register' || a.action === 'create' || a.action === 'import').length
  const assessed = workflowRows.filter(w => inMonth(w.assessed_at))
  const compliant = assessed.filter(w => w.assess_result === 'สอดคล้อง').length
  const nc = assessed.filter(w => w.assess_result === 'ไม่สอดคล้อง').length
  const plansOpened = workflowRows.filter(w => inMonth(w.assessed_at) && w.assess_result === 'ไม่สอดคล้อง' && w.improvement_plan).length
  const plansClosed = workflowRows.filter(w => inMonth(w.plan_closed_at)).length
  const searchM = searchLog.filter(s => inMonth(s.searched_at))
  const searchNoNew = searchM.filter(s => s.no_new_laws).length

  const stat = (n, lab) => `<td class="st"><div class="stn">${n}</div><div class="stl">${ESC(lab)}</div></td>`
  const summary = `<table class="msum"><tr>
      ${stat(added, 'กฎหมายใหม่ที่เพิ่ม')}
      ${stat(compliant, 'ประเมิน: สอดคล้อง')}
      ${stat(nc, 'ประเมิน: ไม่สอดคล้อง')}
      ${stat(plansOpened, 'แผนปรับปรุงที่เปิด')}
      ${stat(plansClosed, 'แผนที่ปิด')}
      ${stat(searchM.length, 'ค้นหากฎหมาย (ครั้ง)')}
    </tr></table>`

  // ตาราง activity log แยกตามหมวด LA–LG
  const byCat = {}
  actM.forEach(a => { const law = lawById[a.law_id]; const c = law?.cat || 'ไม่ระบุหมวด'; (byCat[c] = byCat[c] || []).push(a) })
  const cats = Object.keys(byCat).sort((a, b) => catOrderKey(a).localeCompare(catOrderKey(b)))
  const actTable = cats.length ? cats.map(c => {
    const rows = byCat[c].sort((x, y) => new Date(x.created_at) - new Date(y.created_at)).map(a => `<tr>
        <td class="nw">${thDate(a.created_at)} ${hhmm(a.created_at)}</td>
        <td class="num">${ESC(a.law_code || '—')}</td>
        <td>${ESC(ACT_LABEL[a.action] || a.action)}</td>
        <td>${ESC((a.detail || a.law_name || '').slice(0, 90))}</td>
        <td>${ESC(a.actor || '—')}</td>
      </tr>`).join('')
    return `<tr><td class="catband" colspan="5">หมวด ${ESC(c)}${catName[c] ? ' : ' + ESC(catName[c]) : ''} — ${byCat[c].length} รายการ</td></tr>${rows}`
  }).join('') : `<tr><td colspan="5" class="empty">ไม่มีรายการในเดือนนี้</td></tr>`

  // ตารางประวัติการค้นหาของเดือน (Task 12 · รวมใน PDF)
  const searchTable = searchM.length ? searchM.sort((x, y) => new Date(y.searched_at) - new Date(x.searched_at)).map(s => `<tr>
      <td class="nw">${thDate(s.searched_at)} ${hhmm(s.searched_at)}</td>
      <td>${ESC(s.searched_by || '—')}</td>
      <td>${ESC((s.sources || []).join(', ') || '—')}</td>
      <td class="ctr">${s.no_new_laws ? 'ไม่มีกฎหมายใหม่' : ESC(String(s.results_count || 0)) + ' รายการ'}</td>
    </tr>`).join('') : `<tr><td colspan="4" class="empty">เดือนนี้ยังไม่มีการค้นหากฎหมาย</td></tr>`

  el.innerHTML = `
  <style>
    #print-report .doc { font-family:'Angsana New','AngsanaUPC','TH Sarabun New','Sarabun',serif; color:#000; font-size:14px; line-height:1.3 }
    #print-report table { width:100%; border-collapse:collapse }
    #print-report .mhead { margin-bottom:8px }
    #print-report .mhead .t1 { font-size:19px; font-weight:700; text-align:center }
    #print-report .mhead .t2 { font-size:15px; text-align:center; margin-top:2px }
    #print-report .mhead .meta { font-size:12.5px; margin-top:6px; display:flex; justify-content:space-between }
    #print-report .msum { margin:10px 0 14px; table-layout:fixed }
    #print-report .msum .st { border:1px solid #000; text-align:center; padding:8px 4px }
    #print-report .msum .stn { font-size:22px; font-weight:700 }
    #print-report .msum .stl { font-size:11px; color:#222 }
    #print-report .sect { font-size:14px; font-weight:700; margin:14px 0 4px }
    #print-report .reg th, #print-report .reg td { border:1px solid #000; padding:3px 6px; vertical-align:top; font-size:12.5px }
    #print-report .reg .ch th { background:#d9d9d9; font-weight:700; text-align:center }
    #print-report .reg .catband { background:#bfbfbf; font-weight:700 }
    #print-report .reg .num { font-variant-numeric:tabular-nums }
    #print-report .reg .nw { white-space:nowrap }
    #print-report .reg .ctr { text-align:center }
    #print-report .reg .empty { text-align:center; color:#555; padding:14px }
    #print-report .reg tr { page-break-inside:avoid }
    #print-report .sign { margin-top:26px; page-break-inside:avoid }
    #print-report .sign td { border:none; text-align:center; padding:26px 10px 4px; font-size:13.5px; width:50% }
    #print-report .sign .role { margin-top:6px; font-weight:700 }
    @page { size:A4 portrait; margin:14mm }
  </style>
  <div class="doc">
    <div class="mhead">
      <div class="t1">รายงานสรุปการติดตามกฎหมายประจำเดือน</div>
      <div class="t2">${ESC(company)}</div>
      <div class="meta"><span>ประจำเดือน : <b>${monthLabel}</b></span><span>วันที่ออกรายงาน : ${printedOn}</span><span>ผู้ออกรายงาน : ${ESC(issuer || settings.user_name || 'จป.วิชาชีพ')}</span></div>
    </div>

    <div class="sect">สรุปภาพรวม</div>
    ${summary}

    <div class="sect">บันทึกกิจกรรม (แยกตามหมวดกฎหมาย)</div>
    <table class="reg"><tr class="ch"><th style="width:17%">วันที่/เวลา</th><th style="width:11%">รหัสกฎหมาย</th><th style="width:13%">การดำเนินการ</th><th>รายละเอียด</th><th style="width:15%">ผู้ดำเนินการ</th></tr>${actTable}</table>

    <div class="sect">ประวัติการค้นหากฎหมาย (หลักฐานการติดตาม)${searchNoNew ? ` — ${searchNoNew} ครั้งไม่พบกฎหมายใหม่` : ''}</div>
    <table class="reg"><tr class="ch"><th style="width:17%">วันที่/เวลา</th><th style="width:20%">ผู้ค้นหา</th><th>แหล่งข้อมูล</th><th style="width:18%">ผลลัพธ์</th></tr>${searchTable}</table>

    <table class="sign">
      <tr>
        <td>ลงชื่อ ...............................................<div class="role">จป.วิชาชีพ</div><div class="dt">วันที่ ......... / ......... / .........</div></td>
        <td>ลงชื่อ ...............................................<div class="role">ผู้จัดการ</div><div class="dt">วันที่ ......... / ......... / .........</div></td>
      </tr>
    </table>
  </div>`
}

export function buildReport({ laws, catName = {}, settings = {}, mode = 'all' }) {
  const el = document.getElementById('print-report')
  if (!el) return
  const company = settings.company_name || settings.org_name || 'บริษัท จัสเทล เน็ทเวิร์ค จำกัด'
  const printedOn = thDate(new Date().toISOString())

  const byCat = {}
  laws.forEach(l => { (byCat[l.cat] = byCat[l.cat] || []).push(l) })
  const cats = [...new Set([...Object.keys(catName), ...Object.keys(byCat)])].filter(c => byCat[c]?.length)

  const colgroup = `<colgroup>${COLS.map(([, w]) => `<col style="width:${w}">`).join('')}</colgroup>`
  const headRow = `<tr class="ch">${COLS.map(([h]) => `<th>${h}</th>`).join('')}</tr>`

  const sections = cats.map((c, ci) => {
    let n = 0
    const body = byCat[c].map(l => {
      n++
      const reqs = l.reqs.length ? l.reqs : [{}]
      const span = reqs.length
      return reqs.map((r, i) => {
        // เซลล์ระดับกฎหมาย (merge ด้วย rowspan): ลำดับ/รหัส/กระทรวง/ชื่อ อยู่ก่อน "สาระสำคัญ",
        // ส่วน "วันที่" merge อยู่กลางตาราง (คั่นระหว่างสาระสำคัญกับผู้รับผิดชอบ) ตรงตามชีทจริง
        const preCells = i === 0 ? `
          <td rowspan="${span}" class="ctr num">${n}</td>
          <td rowspan="${span}" class="num">${ESC(l.code)}</td>
          <td rowspan="${span}">${ESC(l.ministry || '')}</td>
          <td rowspan="${span}" class="law">${ESC(l.name || '')}</td>` : ''
        const dateCell = i === 0 ? `<td rowspan="${span}" class="ctr">${ESC(l.issue_date || l.effective_date || '—')}</td>` : ''
        const met = r.status === 'met', nc = r.status === 'unmet'
        const evidence = [r.documents, r.evidence_label].filter(Boolean).join(' · ')
        // ใส่ลิงก์ตัวบทจริง (source_url) ไว้ในคอลัมน์เอกสารที่เกี่ยวข้อง — แถวแรกของกฎหมาย
        const srcLine = i === 0 && l.source_url ? `<div class="src">ตัวบท: <a href="${ESC(l.source_url)}">${ESC(l.source_url)}</a></div>` : ''
        return `<tr>${preCells}
          <td class="req">${ESC(r.text || '—')}</td>
          ${dateCell}
          <td>${ESC(r.responsible || '—')}</td>
          <td class="ctr ${met ? 'ok' : nc ? 'bad' : ''}">${met ? 'C' : nc ? 'NC' : '—'}</td>
          <td>${ESC(r.frequency || '—')}</td>
          <td>${ESC(r.report || '—')}</td>
          <td>${ESC(evidence || '—')}${srcLine}</td>
          <td>${ESC(r.note || '—')}</td>
        </tr>`
      }).join('')
    }).join('')

    return `
      <table class="reg" style="${ci > 0 ? 'page-break-before:always' : ''}">
        ${colgroup}
        <tr><td class="catband" colspan="${COLS.length}">หมวด ${ESC(c)} : ${ESC(catName[c] || '')} — ${byCat[c].length} ฉบับ</td></tr>
        ${headRow}
        ${body}
      </table>`
  }).join('')

  const signature = `
    <table class="sign">
      <tr>
        <td>ลงชื่อ ...............................................<div class="role">ผู้จัดทำ (จป.วิชาชีพ)</div><div class="dt">วันที่ ......... / ......... / .........</div></td>
        <td>ลงชื่อ ...............................................<div class="role">ผู้ทบทวน</div><div class="dt">วันที่ ......... / ......... / .........</div></td>
        <td>ลงชื่อ ...............................................<div class="role">ผู้อนุมัติ</div><div class="dt">วันที่ ......... / ......... / .........</div></td>
      </tr>
    </table>`

  el.innerHTML = `
  <style>
    #print-report .doc { font-family: 'Angsana New','AngsanaUPC','TH Sarabun New','Sarabun',serif; color:#000; font-size:13px; line-height:1.25 }
    #print-report table { width:100%; border-collapse:collapse; table-layout:fixed }
    #print-report .head td { border:1px solid #000; padding:3px 8px; vertical-align:top }
    #print-report .head .title { text-align:center }
    #print-report .head .title .th1 { font-size:17px; font-weight:700 }
    #print-report .head .title .en  { font-size:14px; font-weight:700; letter-spacing:.3px }
    #print-report .head .form { text-align:left; font-size:11px }
    #print-report .head .form .fno { font-size:14px; font-weight:700 }
    #print-report .head .conf { text-align:right; font-size:11px; font-weight:700 }
    #print-report .reg { margin-top:8px; page-break-inside:auto }
    #print-report .reg th, #print-report .reg td { border:1px solid #000; padding:2px 5px; vertical-align:top; word-wrap:break-word; overflow-wrap:anywhere }
    #print-report .reg .ch th { background:#d9d9d9; text-align:center; font-weight:700; font-size:11.5px }
    #print-report .reg .catband { background:#bfbfbf; font-weight:700; font-size:14px; padding:4px 8px }
    #print-report .reg .ctr { text-align:center }
    #print-report .reg .num { font-variant-numeric: tabular-nums }
    #print-report .reg .ok  { color:#0a7a32; font-weight:700 }
    #print-report .reg .bad { color:#c4271d; font-weight:700 }
    #print-report .reg .law { font-weight:600 }
    #print-report .reg .req { white-space:pre-wrap }
    #print-report .reg .src { font-size:9.5px; color:#0a58ca; word-break:break-all; margin-top:2px }
    #print-report .reg tr { page-break-inside: avoid }
    #print-report .sign { margin-top:22px; page-break-inside:avoid }
    #print-report .sign td { border:none; text-align:center; padding:26px 10px 4px; font-size:13px; width:33.33% }
    #print-report .sign .role { margin-top:6px; font-weight:700 }
    #print-report .sign .dt { margin-top:4px; color:#333 }
  </style>
  <div class="doc">
    <table class="head">
      <tr>
        <td class="conf" style="width:22%">ใช้ภายใน</td>
        <td class="title">
          <div class="th1">ทะเบียนกฎหมายและแบบประเมินความสอดคล้องและข้อกำหนดอื่นๆ</div>
          <div class="en">REGISTER OF LEGAL AND REQUIREMENT</div>
        </td>
        <td class="form" style="width:22%">
          <div class="fno">${FORM.no} &nbsp; ${FORM.rev}</div>
          <div>วันที่มีผลบังคับใช้ : ${FORM.effective}</div>
          <div>วันที่พิมพ์ : ${printedOn}</div>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="font-size:12px"><b>${ESC(company)}</b></td>
        <td class="form" style="font-size:11px">รอบการติดตาม : ครั้งที่ ...........${mode !== 'all' ? `<div>ขอบเขต : ${MODE_LABEL[mode] || ''}</div>` : ''}</td>
      </tr>
    </table>
    ${sections || '<div style="padding:24px;text-align:center">ไม่มีรายการตามเงื่อนไขที่เลือก</div>'}
    ${signature}
  </div>`
}
