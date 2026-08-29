// Builds the official F-259 register (REGISTER OF LEGAL AND REQUIREMENT) into
// #print-report, then App calls window.print(). Layout mirrors the real
// source-data/F-259 workbook: form no. top-right, per-category pages, C/NC
// evaluation and an end-of-report signature block.
import { thDate, reqStats, reqKind } from '../lib/ui.jsx'
import { REQ_STATUS, REQ_STATUS_ORDER, WAITING_STATUS, LAW_STATUS } from '../lib/supabase.js'

// P21 · ป้ายสถานะ 4 สถานะ + ยังไม่ประเมิน — ใช้ร่วมกันทั้งรายงานทะเบียนและรายงานรายฉบับ
// รหัสย่อมาจากทะเบียนกลาง ไม่เขียนซ้ำในไฟล์นี้ · คลาส CSS ใช้ชื่อสถานะตรงๆ
const BADGE_CLS = { met:'ok', unmet:'bad', acknowledged:'ack', not_applicable:'na', waiting:'wait' }
const statusBadge = r => {
  const k = reqKind(r)
  const st = REQ_STATUS[k] || WAITING_STATUS
  return `<span class="badge ${BADGE_CLS[k] || 'wait'}" title="${ESC(st.label)}">${ESC(st.code)}</span>`
}

// คำอธิบายสัญลักษณ์ท้ายรายงาน — ข้อกำหนด F-259 · ต้องพิมพ์ติดไปกับเอกสารเสมอ
// ไม่ใช่ตัวเลือก เพราะผู้ตรวจ ISO อ่านไฟล์ที่พิมพ์ออกมา ไม่ได้เปิดหน้าจอระบบ
const legendBlock = () => `
  <table class="legend">
    <tr><td class="lgh" colspan="3">คำอธิบายสัญลักษณ์สถานะการประเมิน</td></tr>
    ${REQ_STATUS_ORDER.map(k => `<tr>
      <td class="ctr"><span class="badge ${BADGE_CLS[k]}">${ESC(REQ_STATUS[k].code)}</span></td>
      <td class="lgn">${ESC(REQ_STATUS[k].label)}</td>
      <td>${ESC(REQ_STATUS[k].desc)}${REQ_STATUS[k].inKpi ? '' : ' (ไม่นับในอัตราความสอดคล้อง)'}</td>
    </tr>`).join('')}
    <tr>
      <td class="ctr"><span class="badge wait">${ESC(WAITING_STATUS.code)}</span></td>
      <td class="lgn">${ESC(WAITING_STATUS.label)}</td>
      <td>ยังไม่มีผู้ประเมินตัดสินสถานะของข้อนี้ (ไม่นับในอัตราความสอดคล้อง)</td>
    </tr>
    <tr><td colspan="3" class="lgf">อัตราความสอดคล้อง = C &divide; (C + NC) &times; 100 &nbsp;·&nbsp; Ack และ ไม่เกี่ยวข้อง ไม่นับเป็นตัวหาร &nbsp;·&nbsp; ฉบับที่มีเฉพาะ Ack และ ไม่เกี่ยวข้อง แสดงผลเป็น N/A</td></tr>
  </table>`


const ESC = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// P21 ส่วนที่ 2 · บรรทัดสถานะการบังคับใช้ใต้ชื่อกฎหมาย
// เลือกวิธีนี้แทนการเพิ่มคอลัมน์ เพราะตาราง F-259 มี 13 คอลัมน์แล้วและต้องพอดี A4 แนวนอน
// ฉบับที่ยังบังคับใช้ปกติไม่พิมพ์อะไรเลย — บรรทัดนี้จึงโผล่เฉพาะตอนที่มีเรื่องต้องบอก
const enforceLine = l => {
  const k = l.law_status || 'in_force'
  if (k === 'in_force') return ''
  const bits = [LAW_STATUS[k]?.label || k]
  if (l.repeal_date) bits.push('มีผล ' + thDate(l.repeal_date))
  if (l.repealed_by_title) bits.push('โดย ' + l.repealed_by_title)
  const repl = l.replacement_law_title || l.replaced_by_code
  if (repl) bits.push('ใช้แทนด้วย ' + repl)
  if (!l.repeal_verified_by) bits.push('(ยังไม่ผ่านการยืนยัน)')
  return `<div class="enforce">${ESC(bits.join(' · '))}</div>`
}

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
  ['สถานะ<br/>C / NC / Ack / -', '4%'],
  ['เหตุผลประกอบสถานะ', '7%'],
  ['ความถี่การตรวจสอบ', '6%'],
  ['การรายงานผล', '5%'],
  ['เอกสารที่เกี่ยวข้อง', '7%'],
  ['หมายเหตุ', '5%'],
]

// ── P10 Task 11 · สรุปประจำเดือน (A4 แนวตั้ง, ฟอนต์ไทยเดิม) — reuse #print-report ──
const TH_MONTHS_FULL = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const ACT_LABEL = { create:'เพิ่มใหม่', register:'เพิ่มเข้าทะเบียน', import:'นำเข้า (AI)', monitor:'เปิดทวนสอบ', assess:'ประเมิน', plan:'สร้างแผน', plan_close:'ปิดแผน', repeal:'ยกเลิก', restore:'กู้คืน', requirement:'แก้สถานะ', verify:'ตรวจทาน', verify_edit:'แก้ผลสรุป AI', duplicate_override:'ยืนยันเพิ่มซ้ำ', finalize:'ยืนยันสมบูรณ์', screen:'คัดกรอง', assign:'มอบหมาย' }
const catOrderKey = c => c

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
  // P21 · สองผลนี้เคยไม่มีที่อยู่ในรายงานประจำเดือน ทำให้ยอด "ประเมินแล้ว" ไม่ครบตามจริง
  const ackCount = assessed.filter(w => w.assess_result === 'เพื่อทราบ').length
  const naCount  = assessed.filter(w => w.assess_result === 'ไม่เกี่ยวข้อง').length
  const plansOpened = workflowRows.filter(w => inMonth(w.assessed_at) && w.assess_result === 'ไม่สอดคล้อง' && w.improvement_plan).length
  const plansClosed = workflowRows.filter(w => inMonth(w.plan_closed_at)).length
  const searchM = searchLog.filter(s => inMonth(s.searched_at))
  const searchNoNew = searchM.filter(s => s.no_new_laws).length

  const stat = (n, lab) => `<td class="st"><div class="stn">${n}</div><div class="stl">${ESC(lab)}</div></td>`
  const summary = `<table class="msum"><tr>
      ${stat(added, 'กฎหมายใหม่ที่เพิ่ม')}
      ${stat(compliant, 'ประเมิน: สอดคล้อง')}
      ${stat(nc, 'ประเมิน: ไม่สอดคล้อง')}
      ${stat(ackCount, 'ประเมิน: เพื่อทราบ')}
      ${stat(naCount, 'ประเมิน: ไม่เกี่ยวข้อง')}
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

export function buildReport({ laws, catName = {}, catColor = {}, settings = {}, mode = 'all' }) {
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
    const accent = catColor[c] || '#8a8a8a'
    const body = byCat[c].map(l => {
      n++
      const shade = n % 2 === 0 ? ' style="background:#f7f8fa"' : ''
      const reqs = l.reqs.length ? l.reqs : [{}]
      const span = reqs.length
      return reqs.map((r, i) => {
        // เซลล์ระดับกฎหมาย (merge ด้วย rowspan): ลำดับ/รหัส/กระทรวง/ชื่อ อยู่ก่อน "สาระสำคัญ",
        // ส่วน "วันที่" merge อยู่กลางตาราง (คั่นระหว่างสาระสำคัญกับผู้รับผิดชอบ) ตรงตามชีทจริง
        const preCells = i === 0 ? `
          <td rowspan="${span}" class="ctr num">${n}</td>
          <td rowspan="${span}" class="num">${ESC(l.code)}</td>
          <td rowspan="${span}">${ESC(l.ministry || '')}</td>
          <td rowspan="${span}" class="law">${ESC(l.name || '')}${enforceLine(l)}</td>` : ''
        const dateCell = i === 0 ? `<td rowspan="${span}" class="ctr">${ESC(l.issue_date || l.effective_date || '—')}</td>` : ''
        const evidence = [r.documents, r.evidence_label].filter(Boolean).join(' · ')
        // ใส่ลิงก์ตัวบทจริง (source_url) ไว้ในคอลัมน์เอกสารที่เกี่ยวข้อง — แถวแรกของกฎหมาย
        const srcLine = i === 0 && l.source_url ? `<div class="src">ตัวบท: <a href="${ESC(l.source_url)}">${ESC(l.source_url)}</a></div>` : ''
        return `<tr${shade}>${preCells}
          <td class="req">${ESC(r.text || '—')}</td>
          ${dateCell}
          <td>${ESC(r.responsible || '—')}</td>
          <td class="ctr">${statusBadge(r)}</td>
          <td>${ESC(r.status_reason || '—')}</td>
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
        <tr><td class="catband" colspan="${COLS.length}" style="border-left:5px solid ${accent};background:linear-gradient(0deg, ${accent}14, ${accent}14)">
          <span class="catdot" style="background:${accent}"></span>หมวด ${ESC(c)} : ${ESC(catName[c] || '')} — ${byCat[c].length} ฉบับ</td></tr>
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
    #print-report .doc { font-family: 'Angsana New','AngsanaUPC','TH Sarabun New','Sarabun',serif; color:#17181c; font-size:13px; line-height:1.3 }
    #print-report table { width:100%; border-collapse:collapse; table-layout:fixed }
    #print-report .topbar { height:5px; background:linear-gradient(90deg,#1c2431,#3a6a97); margin-bottom:10px; border-radius:2px }
    #print-report .head { border:1px solid #cfd3da; border-radius:4px; overflow:hidden }
    #print-report .head td { border:1px solid #cfd3da; padding:6px 10px; vertical-align:top }
    #print-report .head .title { text-align:center; background:#fbfbfc }
    #print-report .head .title .th1 { font-size:18px; font-weight:700; color:#1c2431 }
    #print-report .head .title .en  { font-size:12.5px; font-weight:700; letter-spacing:1.2px; color:#5f6772; margin-top:2px }
    #print-report .head .form { text-align:left; font-size:11px; background:#f7f8fa; color:#3a3f47 }
    #print-report .head .form .fno { font-size:14px; font-weight:700; color:#1c2431 }
    #print-report .head .conf { text-align:right; font-size:10.5px; font-weight:700; color:#8a5a1c; background:#fdf4e3 }
    #print-report .reg { margin-top:10px; page-break-inside:auto; border-radius:4px; overflow:hidden }
    #print-report .reg th, #print-report .reg td { border:1px solid #d7dae0; padding:3px 6px; vertical-align:top; word-wrap:break-word; overflow-wrap:anywhere }
    #print-report .reg .ch th { background:#eef1f5; color:#1c2431; text-align:center; font-weight:700; font-size:11.5px; padding:5px }
    #print-report .reg .catband { font-weight:700; font-size:14px; padding:6px 10px; color:#1c2431 }
    #print-report .reg .catdot { display:inline-block; width:9px; height:9px; border-radius:50%; margin-right:7px; vertical-align:middle }
    #print-report .reg .ctr { text-align:center }
    #print-report .reg .num { font-variant-numeric: tabular-nums }
    #print-report .badge { display:inline-block; min-width:22px; padding:1.5px 6px; border-radius:9px; font-weight:700; font-size:11px }
    #print-report .badge.ok  { color:#0a7a32; background:#e3f5e8 }
    #print-report .badge.bad { color:#c4271d; background:#fbe6e4 }
    #print-report .badge.wait{ color:#777; background:#eee }
    #print-report .badge.ack { color:#0055b3; background:#e4eefb }
    #print-report .badge.na  { color:#5a6068; background:#eef0f2 }
    #print-report .legend { width:100%; border-collapse:collapse; margin-top:12px; font-size:11.5px; page-break-inside:avoid }
    #print-report .legend td { border:1px solid #cfd3da; padding:3px 7px; vertical-align:top }
    #print-report .legend .lgh { background:#f2f4f7; font-weight:700; text-align:center }
    #print-report .legend .lgn { font-weight:700; white-space:nowrap }
    #print-report .legend .lgf { background:#fbfbfc; color:#3a3f47 }
    #print-report .enforce { margin-top:3px; font-size:10.5px; color:#8a5a12; background:#fdf6e6; border-left:2px solid #c9a227; padding:2px 5px; line-height:1.35 }
    #print-report .reg .law { font-weight:700; color:#1c2431 }
    #print-report .reg .req { white-space:pre-wrap }
    #print-report .reg .src { font-size:9.5px; color:#0a58ca; word-break:break-all; margin-top:2px }
    #print-report .reg tr { page-break-inside: avoid }
    #print-report .sign { margin-top:26px; page-break-inside:avoid }
    #print-report .sign td { border:none; text-align:center; padding:28px 10px 4px; font-size:13px; width:33.33% }
    #print-report .sign .role { margin-top:6px; font-weight:700; color:#1c2431 }
    #print-report .sign .dt { margin-top:4px; color:#666 }
  </style>
  <div class="doc">
    <div class="topbar"></div>
    <table class="head">
      <tr>
        <td class="conf" style="width:22%">ใช้ภายใน</td>
        <td class="title">
          <div class="th1">ทะเบียนกฎหมายและแบบประเมินความสอดคล้องและข้อปฏิบัติอื่นๆ</div>
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
    ${legendBlock()}
    ${signature}
  </div>`
}

// ── Single-law "PDF" button on LawDrawer · A4 portrait law compliance profile ──
export function buildLawReport({ law, catName = '', catColor = '', settings = {} }) {
  const el = document.getElementById('print-report')
  if (!el) return
  const company = settings.company_name || settings.org_name || 'บริษัท จัสเทล เน็ทเวิร์ค จำกัด'
  const printedOn = thDate(new Date().toISOString())
  const accent = catColor || '#1c2431'
  const stats = reqStats(law)
  const reqs = law.reqs || []

  const kv = (k, v) => v ? `<div class="kv"><div class="k">${ESC(k)}</div><div class="v">${v}</div></div>` : ''
  const info = [
    kv('รหัสกฎหมาย', ESC(law.code)),
    kv('หมวด', `${ESC(law.cat)} — ${ESC(catName || law.cat)}`),
    law.law_type && kv('ประเภทกฎหมาย', ESC(law.law_type)),
    law.hierarchy_level && kv('ลำดับชั้น', `ชั้น ${ESC(law.hierarchy_level)}`),
    kv('กระทรวง/หน่วยงาน', ESC(law.ministry || '—')),
    law.responsible && kv('หน่วยงานที่รับผิดชอบ', ESC(law.responsible)),
    law.issue_date && kv('วันที่ประกาศ', ESC(law.issue_date)),
    law.effective_date && kv('วันที่บังคับใช้', ESC(law.effective_date)),
    law.review_date && kv('กำหนดทบทวนถัดไป', ESC(thDate(law.review_date))),
    law.report_due_date && kv('ครบกำหนดส่งรายงานราชการ', ESC(thDate(law.report_due_date))),
    law.doc_list && kv('เอกสารที่เกี่ยวข้อง', ESC(law.doc_list)),
  ].filter(Boolean).join('')

  const stat = (n, lab, cls = '') => `<td class="st ${cls}"><div class="stn">${ESC(String(n))}</div><div class="stl">${ESC(lab)}</div></td>`
  const summary = `<table class="msum"><tr>
      ${stat(reqs.length, 'ข้อปฏิบัติทั้งหมด')}
      ${stat(stats.met, 'สอดคล้อง (C)', 'ok')}
      ${stat(stats.unmet, 'ไม่สอดคล้อง (NC)', 'bad')}
      ${stat(stats.ack, 'เพื่อทราบ (Ack)')}
      ${stat(stats.na, 'ไม่เกี่ยวข้อง (-)')}
      ${stat(stats.waiting, 'ยังไม่ประเมิน', 'wait')}
      ${stat(stats.pct == null ? (stats.ack + stats.na > 0 ? 'N/A' : '—') : stats.pct + '%', '% ความสอดคล้อง')}
    </tr></table>`

  const reqRows = reqs.length ? reqs.map((r, i) => {
    const kind = reqKind(r)
    const badge = statusBadge(r)
    const evidence = [r.documents, r.evidence_label].filter(Boolean).join(' · ') || '—'
    const evalLine = r.evaluated_by ? `${ESC(r.evaluated_by)}${r.evaluated_at ? ' · ' + thDate(r.evaluated_at) : ''}` : 'ยังไม่ได้ประเมิน'
    return `<tr>
      <td class="ctr num">${i + 1}</td>
      <td class="req">${ESC(r.text || '—')}</td>
      <td>${ESC(r.responsible || '—')}</td>
      <td>${ESC(r.frequency || '—')}</td>
      <td class="ctr">${badge}</td>
      <td>${ESC(evidence)}</td>
      <td>${evalLine}</td>
      <td>${ESC(r.note || '—')}</td>
    </tr>`
  }).join('') : `<tr><td colspan="8" class="empty">ยังไม่มีข้อปฏิบัติบันทึกไว้</td></tr>`

  const signature = `
    <table class="sign">
      <tr>
        <td>ลงชื่อ ...............................................<div class="role">ผู้จัดทำ (จป.วิชาชีพ)</div><div class="dt">วันที่ ......... / ......... / .........</div></td>
        <td>ลงชื่อ ...............................................<div class="role">ผู้ทบทวน</div><div class="dt">วันที่ ......... / ......... / .........</div></td>
      </tr>
    </table>`

  el.innerHTML = `
  <style>
    #print-report .doc { font-family:'Angsana New','AngsanaUPC','TH Sarabun New','Sarabun',serif; color:#17181c; font-size:13.5px; line-height:1.3 }
    #print-report table { width:100%; border-collapse:collapse }
    #print-report .topbar { height:5px; margin-bottom:12px; border-radius:2px }
    #print-report .lhead { margin-bottom:10px }
    #print-report .lhead .t1 { font-size:19px; font-weight:700; text-align:center; color:#1c2431 }
    #print-report .lhead .t2 { font-size:12px; text-align:center; letter-spacing:1.2px; color:#8a8f98; margin-top:2px }
    #print-report .lhead .meta { font-size:12px; margin-top:8px; display:flex; justify-content:space-between; color:#3a3f47 }
    #print-report .lawname { border:1px solid #d7dae0; border-left-width:5px; border-radius:4px; padding:8px 12px; margin-bottom:14px; background:#fbfbfc }
    #print-report .lawname .code { font-size:11.5px; color:#5f6772; font-weight:700 }
    #print-report .lawname .name { font-size:15px; font-weight:700; margin-top:3px; color:#17181c }
    #print-report .sect { font-size:14px; font-weight:700; margin:14px 0 6px; color:#1c2431 }
    #print-report .infogrid { display:grid; grid-template-columns:1fr 1fr; border:1px solid #d7dae0; border-radius:4px; overflow:hidden }
    #print-report .infogrid .kv { display:flex; border-bottom:1px solid #e5e7eb; border-right:1px solid #e5e7eb }
    #print-report .infogrid .kv:nth-child(2n) { border-right:none }
    #print-report .infogrid .k { width:42%; padding:5px 10px; background:#f7f8fa; color:#5f6772; font-size:11px }
    #print-report .infogrid .v { flex:1; padding:5px 10px; font-size:12.5px; color:#17181c; font-weight:600 }
    #print-report .msum { margin:0 0 4px; table-layout:fixed }
    #print-report .msum .st { border:1px solid #d7dae0; text-align:center; padding:8px 4px; border-radius:4px }
    #print-report .msum .st.ok  { background:#e3f5e8 }
    #print-report .msum .st.bad { background:#fbe6e4 }
    #print-report .msum .st.wait{ background:#f0f0f0 }
    #print-report .msum .stn { font-size:20px; font-weight:700; color:#1c2431 }
    #print-report .msum .stl { font-size:10.5px; color:#5f6772; margin-top:2px }
    #print-report .reg { margin-top:4px }
    #print-report .reg th, #print-report .reg td { border:1px solid #d7dae0; padding:4px 6px; vertical-align:top; font-size:12px; word-wrap:break-word; overflow-wrap:anywhere }
    #print-report .reg .ch th { background:#eef1f5; color:#1c2431; text-align:center; font-weight:700; font-size:11px; padding:5px }
    #print-report .reg .ctr { text-align:center }
    #print-report .reg .num { font-variant-numeric:tabular-nums }
    #print-report .reg .req { white-space:pre-wrap }
    #print-report .reg .empty { text-align:center; color:#8a8f98; padding:16px }
    #print-report .reg tr { page-break-inside:avoid }
    #print-report .badge { display:inline-block; min-width:22px; padding:1.5px 6px; border-radius:9px; font-weight:700; font-size:11px }
    #print-report .badge.ok  { color:#0a7a32; background:#e3f5e8 }
    #print-report .badge.bad { color:#c4271d; background:#fbe6e4 }
    #print-report .badge.wait{ color:#777; background:#eee }
    #print-report .badge.ack { color:#0055b3; background:#e4eefb }
    #print-report .badge.na  { color:#5a6068; background:#eef0f2 }
    #print-report .legend { width:100%; border-collapse:collapse; margin-top:12px; font-size:11.5px; page-break-inside:avoid }
    #print-report .legend td { border:1px solid #cfd3da; padding:3px 7px; vertical-align:top }
    #print-report .legend .lgh { background:#f2f4f7; font-weight:700; text-align:center }
    #print-report .legend .lgn { font-weight:700; white-space:nowrap }
    #print-report .legend .lgf { background:#fbfbfc; color:#3a3f47 }
    #print-report .srcline { margin-top:10px; font-size:10.5px; color:#0a58ca; word-break:break-all }
    #print-report .sign { margin-top:26px; page-break-inside:avoid }
    #print-report .sign td { border:none; text-align:center; padding:28px 10px 4px; font-size:13px; width:50% }
    #print-report .sign .role { margin-top:6px; font-weight:700; color:#1c2431 }
    #print-report .sign .dt { margin-top:4px; color:#666 }
    @page { size:A4 portrait; margin:14mm }
  </style>
  <div class="doc">
    <div class="topbar" style="background:linear-gradient(90deg,${accent},${accent}99)"></div>
    <div class="lhead">
      <div class="t1">เอกสารสรุปกฎหมายและข้อปฏิบัติ</div>
      <div class="t2">LAW COMPLIANCE PROFILE</div>
      <div class="meta"><span>${ESC(company)}</span><span>วันที่พิมพ์ : ${printedOn}</span></div>
    </div>
    <div class="lawname" style="border-left-color:${accent}">
      <div class="code">${ESC(law.code)} · หมวด ${ESC(law.cat)} — ${ESC(catName || law.cat)}</div>
      <div class="name">${ESC(law.name || '')}</div>
    </div>

    <div class="sect">ข้อมูลทะเบียน</div>
    <div class="infogrid">${info}</div>

    <div class="sect">สรุปความสอดคล้อง</div>
    ${summary}

    <div class="sect">ข้อปฏิบัติ &amp; การประเมิน</div>
    <table class="reg">
      <colgroup><col style="width:4%"><col style="width:27%"><col style="width:11%"><col style="width:9%"><col style="width:7%"><col style="width:14%"><col style="width:16%"><col style="width:12%"></colgroup>
      <tr class="ch"><th>#</th><th>ข้อปฏิบัติ</th><th>ผู้รับผิดชอบ</th><th>ความถี่</th><th>สถานะ</th><th>หลักฐาน/เอกสาร</th><th>ผู้ประเมิน</th><th>หมายเหตุ</th></tr>
      ${reqRows}
    </table>
    ${law.source_url ? `<div class="srcline">ตัวบทกฎหมาย: <a href="${ESC(law.source_url)}">${ESC(law.source_url)}</a></div>` : ''}
    ${legendBlock()}

    ${signature}
  </div>`
}

// ── P24 · เอกสารแผนปรับปรุงรายกฎหมาย (A4 แนวตั้ง) — reuse #print-report ──
//
// ผู้ใช้ต้องการ "แผนปรับปรุงของแต่ละอัน" เป็นเอกสาร ไม่ใช่แค่รายการบนหน้าจอ
// เพราะแผนปรับปรุงต้องเสนอผู้บริหารลงนาม และแนบเป็นหลักฐานตอนตรวจประเมิน
// อ้างอิงระเบียบ PD-05 ตามที่หน้าแผนปรับปรุงเดิมระบุไว้
export function buildPlanReport({ law, rows = [], settings = {}, catName = '' }) {
  const el = document.getElementById('print-report'); if (!el) return
  const company = settings.company_name || settings.org_name || 'บริษัท จัสเทล เน็ทเวิร์ค จำกัด'
  const printedOn = thDate(new Date().toISOString())
  const today = new Date().toISOString().slice(0, 10)

  const body = rows.length ? rows.map(({ req, plan }, i) => {
    const overdue = plan?.due_date && plan.due_date < today
    return `<tr>
      <td class="ctr nw">${i + 1}</td>
      <td>${ESC(String(req.text || '').slice(0, 260))}
        ${req.status_reason ? `<div style="font-size:10.5px">เหตุผล: ${ESC(req.status_reason)}</div>` : ''}</td>
      <td>${plan ? ESC(plan.plan_text) : '<i>ยังไม่ได้เปิดแผนปรับปรุง</i>'}</td>
      <td class="nw">${ESC(plan?.owner_name || req.responsible || '—')}</td>
      <td class="nw">${plan?.due_date
        ? (overdue ? '<b>เลยกำหนด</b> ' : '') + ESC(plan.due_date)
        : '—'}</td>
      <td class="ctr nw">${plan ? (plan.status === 'done' ? 'ปิดแล้ว' : 'ดำเนินการ') : 'ยังไม่เปิด'}</td>
    </tr>`
  }).join('') : `<tr><td colspan="6" class="empty">ไม่มีข้อปฏิบัติที่ไม่สอดคล้องในฉบับนี้</td></tr>`

  const open = rows.filter(r => r.plan && r.plan.status !== 'done').length
  const none = rows.filter(r => !r.plan).length

  el.innerHTML = `
  <style>
    #print-report .doc { font-family:'Angsana New','AngsanaUPC','TH Sarabun New','Sarabun',serif; color:#000; font-size:14px; line-height:1.35 }
    #print-report table { width:100%; border-collapse:collapse }
    #print-report .form { font-size:11px; text-align:right }
    #print-report .t1 { font-size:19px; font-weight:700; text-align:center }
    #print-report .t2 { font-size:14px; text-align:center; margin-top:2px }
    #print-report .meta { font-size:12px; margin-top:7px; display:flex; justify-content:space-between }
    #print-report .pt th,#print-report .pt td { border:1px solid #000; padding:3px 5px; font-size:11.5px; vertical-align:top }
    #print-report .pt th { background:#eee; font-weight:700 }
    #print-report .ctr { text-align:center } #print-report .nw { white-space:nowrap }
    #print-report .empty { text-align:center; padding:8px; font-style:italic }
    #print-report .sum { font-size:11.5px; margin:8px 0 4px }
  </style>
  <div class="doc">
    <table style="margin-bottom:6px">
      <tr><td style="font-size:11px">ใช้ภายใน</td>
          <td class="form">F-259 Rev.1 &nbsp;·&nbsp; แผนปรับปรุงอ้างอิง PD-05</td></tr>
    </table>
    <div class="t1">แผนปรับปรุงความสอดคล้องตามกฎหมาย</div>
    <div class="t2">CORRECTIVE ACTION PLAN</div>
    <div class="meta">
      <span><b>${ESC(company)}</b></span>
      <span>วันที่พิมพ์ : ${ESC(printedOn)}</span>
    </div>

    <table class="pt" style="margin-top:12px">
      <tr><th style="width:78px">รหัสกฎหมาย</th><td>${ESC(law.code || '')}</td>
          <th style="width:60px">หมวด</th><td class="nw">${ESC(catName)}</td></tr>
      <tr><th>ชื่อกฎหมาย</th><td colspan="3">${ESC(law.name || '')}</td></tr>
      <tr><th>หน่วยงาน</th><td colspan="3">${ESC(law.ministry || '—')}</td></tr>
    </table>

    <div class="sum">ข้อปฏิบัติที่ไม่สอดคล้อง ${rows.length} ข้อ &nbsp;·&nbsp;
      มีแผนและอยู่ระหว่างดำเนินการ ${open} ข้อ &nbsp;·&nbsp; ยังไม่ได้เปิดแผน ${none} ข้อ</div>

    <table class="pt">
      <thead><tr>
        <th style="width:22px">#</th><th style="width:230px">ข้อปฏิบัติที่ไม่สอดคล้อง</th>
        <th>แผนปรับปรุง / สิ่งที่จะดำเนินการ</th>
        <th style="width:82px">ผู้รับผิดชอบ</th><th style="width:78px">กำหนดเสร็จ</th>
        <th style="width:56px">สถานะ</th>
      </tr></thead>
      <tbody>${body}</tbody>
    </table>

    <table style="margin-top:26px;font-size:12px">
      <tr>
        <td style="width:33%;text-align:center">ผู้จัดทำแผน<br/><br/>............................................<br/>(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)<br/>วันที่ ......../......../........</td>
        <td style="width:33%;text-align:center">ผู้ทบทวน<br/><br/>............................................<br/>(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)<br/>วันที่ ......../......../........</td>
        <td style="width:33%;text-align:center">ผู้อนุมัติ (MR)<br/><br/>............................................<br/>(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)<br/>วันที่ ......../......../........</td>
      </tr>
    </table>
  </div>`
}

// ── P24 · เอกสารผลประเมินรายข้อย่อย + ช่องว่าง (A4 แนวตั้ง) ────────────────
// สเปกขอ "export ผลประเมินรายข้อย่อยพร้อมสรุปช่องว่าง สำหรับแนบการตรวจประเมิน"
// นี่คือเอกสารที่ผู้ตรวจ ISO ขอดูโดยตรง — ต้องเห็นว่าติ๊กอะไร ใครติ๊ก ติดตรงไหน
const RISK_TH = { critical: 'สูงมาก', high: 'สูง', medium: 'ปานกลาง', low: 'ต่ำ' }
export function buildSubReqReport({ law, groups = [], settings = {}, catName = '' }) {
  const el = document.getElementById('print-report'); if (!el) return
  const company = settings.company_name || settings.org_name || 'บริษัท จัสเทล เน็ทเวิร์ค จำกัด'
  const mark = s => s.is_na ? 'ไม่เกี่ยวข้อง' : s.is_met === true ? 'ทำแล้ว' : s.is_met === false ? 'ยังไม่ทำ' : 'ยังไม่ประเมิน'

  const all = groups.flatMap(g => g.subs)
  const n = { met: 0, unmet: 0, na: 0, pending: 0 }
  all.forEach(s => { n[s.is_na ? 'na' : s.is_met === true ? 'met' : s.is_met === false ? 'unmet' : 'pending']++ })
  const unmet = all.filter(s => s.is_met === false)

  const sections = groups.map((g, gi) => `
    <div class="rsect">
      <div class="rh">${gi + 1}. ${ESC(String(g.req.text || '').slice(0, 180))}</div>
      <table class="st">
        <thead><tr><th style="width:20px">#</th><th style="width:150px">ข้อย่อย</th>
          <th>สิ่งที่ต้องทำ</th><th style="width:130px">หลักฐานที่ต้องมี</th>
          <th style="width:52px">ความเสี่ยง</th><th style="width:60px">ผล</th>
          <th style="width:120px">หมายเหตุ / ผู้ประเมิน</th></tr></thead>
        <tbody>${g.subs.length ? g.subs.map((s, i) => `<tr>
          <td class="ctr">${i + 1}</td><td>${ESC(s.title)}</td>
          <td>${ESC(s.action_required || '')}</td>
          <td>${ESC(s.evidence_required || '')}${s.evidence_label ? `<div style="font-size:10px">แนบ: ${ESC(s.evidence_label)}</div>` : ''}</td>
          <td class="ctr nw">${ESC(RISK_TH[s.risk_level] || s.risk_level)}</td>
          <td class="ctr nw"><b>${ESC(mark(s))}</b></td>
          <td>${ESC(s.check_note || '')}${s.checked_by ? `<div style="font-size:10px">${ESC(s.checked_by)}</div>` : ''}</td>
        </tr>`).join('') : '<tr><td colspan="7" class="empty">ยังไม่ได้แตกข้อย่อย</td></tr>'}</tbody>
      </table>
    </div>`).join('')

  el.innerHTML = `
  <style>
    #print-report .doc { font-family:'Angsana New','AngsanaUPC','TH Sarabun New','Sarabun',serif; color:#000; font-size:14px; line-height:1.35 }
    #print-report table { width:100%; border-collapse:collapse }
    #print-report .form { font-size:11px; text-align:right }
    #print-report .t1 { font-size:19px; font-weight:700; text-align:center }
    #print-report .t2 { font-size:14px; text-align:center; margin-top:2px }
    #print-report .meta { font-size:12px; margin-top:7px; display:flex; justify-content:space-between }
    #print-report .rsect { margin-top:12px; page-break-inside:avoid }
    #print-report .rh { font-size:13px; font-weight:700; border-bottom:1.5px solid #000; padding-bottom:2px; margin-bottom:3px }
    #print-report .st th,#print-report .st td,#print-report .pt th,#print-report .pt td { border:1px solid #000; padding:3px 5px; font-size:11px; vertical-align:top }
    #print-report .st th,#print-report .pt th { background:#eee; font-weight:700 }
    #print-report .ctr { text-align:center } #print-report .nw { white-space:nowrap }
    #print-report .empty { text-align:center; padding:6px; font-style:italic }
    #print-report .sum { font-size:11.5px; margin:8px 0 4px }
    #print-report .gapbox { margin-top:14px; border:1px solid #000; padding:8px 10px; page-break-inside:avoid }
  </style>
  <div class="doc">
    <table style="margin-bottom:6px">
      <tr><td style="font-size:11px">ใช้ภายใน</td>
          <td class="form">F-259 Rev.1 &nbsp;·&nbsp; ISO 45001 ข้อ 6.1.3</td></tr>
    </table>
    <div class="t1">ผลการประเมินความสอดคล้องรายข้อย่อย</div>
    <div class="t2">REQUIREMENT CHECKLIST &amp; GAP</div>
    <div class="meta"><span><b>${ESC(company)}</b></span><span>วันที่พิมพ์ : ${ESC(thDate(new Date().toISOString()))}</span></div>

    <table class="pt" style="margin-top:12px">
      <tr><th style="width:78px">รหัสกฎหมาย</th><td>${ESC(law.code || '')}</td>
          <th style="width:56px">หมวด</th><td class="nw">${ESC(catName)}</td></tr>
      <tr><th>ชื่อกฎหมาย</th><td colspan="3">${ESC(law.name || '')}</td></tr>
    </table>

    <div class="sum">ข้อย่อยทั้งหมด ${all.length} ข้อ &nbsp;·&nbsp; ทำแล้ว ${n.met} &nbsp;·&nbsp;
      <b>ยังไม่ทำ ${n.unmet}</b> &nbsp;·&nbsp; ไม่เกี่ยวข้อง ${n.na} &nbsp;·&nbsp; ยังไม่ประเมิน ${n.pending}</div>

    ${sections}

    <div class="gapbox">
      <div style="font-weight:700;font-size:12.5px;margin-bottom:4px">สรุปช่องว่างที่ต้องปิด</div>
      ${unmet.length ? `<ol style="margin:0;padding-left:18px;font-size:11.5px;line-height:1.7">
        ${unmet.map(s => `<li><b>${ESC(s.title)}</b> (ความเสี่ยง${ESC(RISK_TH[s.risk_level] || '')})
          ${s.check_note ? `<br/>ติดตรง: ${ESC(s.check_note)}` : ''}
          ${s.action_required ? `<br/>ต้องทำ: ${ESC(s.action_required)}` : ''}
          ${s.evidence_required ? `<br/>หลักฐานที่ต้องเตรียม: ${ESC(s.evidence_required)}` : ''}</li>`).join('')}
      </ol>` : '<div style="font-size:11.5px">ไม่พบช่องว่าง — ข้อย่อยทุกข้อดำเนินการแล้วหรือไม่เข้าข่าย</div>'}
    </div>

    <table style="margin-top:24px;font-size:12px">
      <tr>
        <td style="width:50%;text-align:center">ผู้ประเมิน<br/><br/>............................................<br/>วันที่ ......../......../........</td>
        <td style="width:50%;text-align:center">ผู้ทบทวน<br/><br/>............................................<br/>วันที่ ......../......../........</td>
      </tr>
    </table>
  </div>`
}

// ── P24 · เอกสาร "สิ่งที่ต้องทำ / เอกสาร / หลักฐาน" รายกฎหมาย ──────────────
// ใช้เตรียมตัวก่อนตรวจประเมิน — ผู้ตรวจถามว่าต้องมีเอกสารอะไร ตอบจากแผ่นนี้ได้เลย
export function buildActionGuideReport({ law, guide = {}, settings = {}, catName = '', files = [] }) {
  const el = document.getElementById('print-report'); if (!el) return
  const company = settings.company_name || settings.org_name || 'บริษัท จัสเทล เน็ทเวิร์ค จำกัด'
  const have = n => files.some(f => String(f.name || '').toLowerCase().includes(String(n || '').toLowerCase().slice(0, 12)))
  const T = (title, head, rows) => `
    <div class="rsect"><div class="rh">${ESC(title)}</div>
      <table class="st"><thead><tr>${head.map(h => `<th${h[1] ? ` style="width:${h[1]}px"` : ''}>${ESC(h[0])}</th>`).join('')}</tr></thead>
      <tbody>${rows.length ? rows.join('') : `<tr><td colspan="${head.length}" class="empty">ตัวบทไม่ได้กำหนดในหมวดนี้</td></tr>`}</tbody></table></div>`

  el.innerHTML = `
  <style>
    #print-report .doc { font-family:'Angsana New','AngsanaUPC','TH Sarabun New','Sarabun',serif; color:#000; font-size:14px; line-height:1.35 }
    #print-report table { width:100%; border-collapse:collapse }
    #print-report .form { font-size:11px; text-align:right }
    #print-report .t1 { font-size:19px; font-weight:700; text-align:center }
    #print-report .t2 { font-size:14px; text-align:center; margin-top:2px }
    #print-report .meta { font-size:12px; margin-top:7px; display:flex; justify-content:space-between }
    #print-report .rsect { margin-top:13px; page-break-inside:avoid }
    #print-report .rh { font-size:13.5px; font-weight:700; border-bottom:1.5px solid #000; padding-bottom:2px; margin-bottom:3px }
    #print-report .st th,#print-report .st td,#print-report .pt th,#print-report .pt td { border:1px solid #000; padding:3px 5px; font-size:11.5px; vertical-align:top }
    #print-report .st th,#print-report .pt th { background:#eee; font-weight:700 }
    #print-report .ctr { text-align:center } #print-report .nw { white-space:nowrap }
    #print-report .empty { text-align:center; padding:6px; font-style:italic }
  </style>
  <div class="doc">
    <table style="margin-bottom:6px">
      <tr><td style="font-size:11px">ใช้ภายใน</td><td class="form">F-259 Rev.1 &nbsp;·&nbsp; ISO 45001 ข้อ 6.1.3</td></tr>
    </table>
    <div class="t1">สิ่งที่ต้องดำเนินการ เอกสาร และหลักฐาน</div>
    <div class="t2">COMPLIANCE ACTION &amp; EVIDENCE CHECKLIST</div>
    <div class="meta"><span><b>${ESC(company)}</b></span><span>วันที่พิมพ์ : ${ESC(thDate(new Date().toISOString()))}</span></div>
    <table class="pt" style="margin-top:12px">
      <tr><th style="width:78px">รหัสกฎหมาย</th><td>${ESC(law.code || '')}</td><th style="width:56px">หมวด</th><td class="nw">${ESC(catName)}</td></tr>
      <tr><th>ชื่อกฎหมาย</th><td colspan="3">${ESC(law.name || '')}</td></tr>
    </table>

    ${T('ก · องค์กรต้องดำเนินการอะไร', [['#', 22], ['สิ่งที่ต้องทำ'], ['ผู้รับผิดชอบ', 92], ['ความถี่', 82], ['ที่มา', 78]],
      (guide.actions || []).map((a, i) => `<tr><td class="ctr">${i + 1}</td><td>${ESC(a.what)}</td>
        <td>${ESC(a.who || '—')}</td><td>${ESC(a.frequency || '—')}</td><td class="nw">${ESC(a.section_ref || '')}</td></tr>`))}

    ${T('ข · เอกสาร/แบบฟอร์มที่ต้องจัดทำ', [['#', 22], ['ชื่อเอกสาร', 200], ['วัตถุประสงค์'], ['ผู้เก็บรักษา', 92], ['ที่มา', 78]],
      (guide.documents || []).map((d, i) => `<tr><td class="ctr">${i + 1}</td><td>${ESC(d.name)}</td>
        <td>${ESC(d.purpose || '')}</td><td>${ESC(d.who_keeps || '—')}</td><td class="nw">${ESC(d.section_ref || '')}</td></tr>`))}

    ${T('ค · หลักฐานที่ต้องเก็บไว้ให้ผู้ตรวจ', [['#', 22], ['ชื่อหลักฐาน', 200], ['ผู้ตรวจขอดูเพื่อ'], ['มีในระบบ', 60], ['ที่มา', 78]],
      (guide.evidence || []).map((e, i) => `<tr><td class="ctr">${i + 1}</td><td>${ESC(e.name)}</td>
        <td>${ESC(e.why_auditor_asks || '')}</td>
        <td class="ctr nw">${have(e.name) ? 'แนบแล้ว' : '<b>ยังไม่มี</b>'}</td>
        <td class="nw">${ESC(e.section_ref || '')}</td></tr>`))}

    ${(guide.not_specified || []).length ? `<div class="rsect"><div class="rh">ตัวบทไม่ได้กำหนด — องค์กรต้องกำหนดเอง</div>
      <ul style="margin:4px 0 0;padding-left:18px;font-size:11.5px;line-height:1.7">
      ${guide.not_specified.map(n => `<li>${ESC(n.item)}${n.what_missing ? ` — ${ESC(n.what_missing)}` : ''}
        ${n.section_ref ? ` (${ESC(n.section_ref)})` : ''}</li>`).join('')}</ul></div>` : ''}
  </div>`
}

// ── P24 · เอกสารกฎหมายที่ถูกยกเลิก ─────────────────────────────────────────
// ผู้ตรวจ ISO ถามเสมอว่าองค์กรติดตามการยกเลิก/แก้ไขกฎหมายอย่างไร
// เดิมดูได้เฉพาะบนหน้าจอ พิมพ์แนบไม่ได้
export function buildRepealedReport({ laws = [], settings = {}, catName = {} }) {
  const el = document.getElementById('print-report'); if (!el) return
  const company = settings.company_name || settings.org_name || 'บริษัท จัสเทล เน็ทเวิร์ค จำกัด'
  const P = v => (v !== null && v !== undefined && String(v).trim() !== '') ? ESC(v) : '<i>รอตรวจสอบ</i>'
  const rows = laws.map((l, i) => `<tr>
    <td class="ctr nw">${i + 1}</td>
    <td class="nw">${ESC(l.code || '')}</td>
    <td>${ESC(String(l.name || '').slice(0, 150))}</td>
    <td>${P(l.repealed_by_title)}${l.repeal_source_url ? `<div style="font-size:10px;word-break:break-all">${ESC(l.repeal_source_url)}</div>` : ''}</td>
    <td>${P(l.repeal_scope)}<div style="font-size:10.5px">${P(l.repeal_reason)}</div></td>
    <td class="nw">${P(l.repeal_date)}</td>
    <td>${(l.replacement_law_title || l.replaced_by_code) ? ESC(l.replacement_law_title || l.replaced_by_code) : '<i>ไม่มีฉบับใหม่ใช้แทน</i>'}</td>
    <td class="ctr nw">${(l.reqs || []).length}</td>
    <td class="ctr nw">${l.repeal_verified_by ? ESC(l.repeal_verified_by) : '<b>รอยืนยัน</b>'}</td>
  </tr>`).join('')

  el.innerHTML = `
  <style>
    #print-report .doc { font-family:'Angsana New','AngsanaUPC','TH Sarabun New','Sarabun',serif; color:#000; font-size:14px; line-height:1.35 }
    #print-report table { width:100%; border-collapse:collapse }
    #print-report .form { font-size:11px; text-align:right }
    #print-report .t1 { font-size:19px; font-weight:700; text-align:center }
    #print-report .t2 { font-size:14px; text-align:center; margin-top:2px }
    #print-report .meta { font-size:12px; margin-top:7px; display:flex; justify-content:space-between }
    #print-report .st th,#print-report .st td { border:1px solid #000; padding:3px 5px; font-size:10.5px; vertical-align:top }
    #print-report .st th { background:#eee; font-weight:700 }
    #print-report .ctr { text-align:center } #print-report .nw { white-space:nowrap }
  </style>
  <div class="doc">
    <table style="margin-bottom:6px">
      <tr><td style="font-size:11px">ใช้ภายใน</td><td class="form">F-259 Rev.1 &nbsp;·&nbsp; ISO 45001 ข้อ 6.1.3</td></tr>
    </table>
    <div class="t1">ทะเบียนกฎหมายที่ถูกยกเลิกหรือแก้ไข</div>
    <div class="t2">REGISTER OF REPEALED / AMENDED LEGISLATION</div>
    <div class="meta"><span><b>${ESC(company)}</b></span>
      <span>${laws.length} ฉบับ &nbsp;·&nbsp; วันที่พิมพ์ : ${ESC(thDate(new Date().toISOString()))}</span></div>
    <table class="st" style="margin-top:12px">
      <thead><tr><th style="width:20px">#</th><th style="width:60px">รหัส</th><th style="width:150px">ชื่อกฎหมาย</th>
        <th style="width:140px">ถูกยกเลิกโดย</th><th style="width:130px">ขอบเขต / สาระ</th>
        <th style="width:64px">วันที่มีผล</th><th style="width:120px">ฉบับที่ใช้แทน</th>
        <th style="width:40px">ข้อกำหนด</th><th style="width:60px">ยืนยันโดย</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="9" class="ctr">ไม่มีกฎหมายที่ถูกยกเลิก</td></tr>'}</tbody>
    </table>
    <div style="font-size:11px;margin-top:8px">
      ช่องที่ระบุว่า "รอตรวจสอบ" คือข้อมูลที่ยังไม่ได้ยืนยันจากแหล่งอ้างอิง ·
      ข้อกำหนดของฉบับที่ยกเลิกยังคงผลประเมินเดิมไว้ ระบบไม่เปลี่ยนสถานะให้อัตโนมัติ
    </div>
  </div>`
}
