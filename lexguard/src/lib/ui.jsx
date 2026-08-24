// Shared UI helpers & primitives used across App layout and page components.
// Extracted verbatim from App.jsx during the page split — behavior unchanged.
import { useState, useEffect } from 'react'
import { STATUS, REQ_STATUS, WAITING_STATUS, reqKind, isWaitingReq, reqStatusLabel } from './supabase.js'

// localStorage-backed state (persists filters/mode across reloads).
export function usePersist(key, def){
  const [v,setV]=useState(()=>{ try{ const s=localStorage.getItem(key); return s==null?def:JSON.parse(s) }catch{ return def } })
  useEffect(()=>{ try{ localStorage.setItem(key,JSON.stringify(v)) }catch{} },[key,v])
  return [v,setV]
}

// P13 · Task 6.1 — จำ filter ต่อหน้าไว้ใน localStorage key เดียว 'lg_filters' (object แยก per page).
// คืน [state, set(key,val), reset, isActive] — set รับค่า/ฟังก์ชันอัปเดตได้แบบ useState.
export function usePageFilters(page, defaults) {
  const [state, setState] = useState(() => {
    try { const all = JSON.parse(localStorage.getItem('lg_filters') || '{}'); return { ...defaults, ...(all[page] || {}) } }
    catch { return { ...defaults } }
  })
  useEffect(() => {
    try { const all = JSON.parse(localStorage.getItem('lg_filters') || '{}'); all[page] = state; localStorage.setItem('lg_filters', JSON.stringify(all)) } catch { /* noop */ }
  }, [page, state])
  const set = (k, v) => setState(s => ({ ...s, [k]: typeof v === 'function' ? v(s[k]) : v }))
  const reset = () => setState({ ...defaults })
  const isActive = Object.keys(defaults).some(k => state[k] !== defaults[k])
  return [state, set, reset, isActive]
}

// ── P21 · สถานะผลการประเมิน 4 สถานะ ─────────────────────────────────────────
// ทะเบียนสถานะอยู่ที่ชั้นข้อมูล (supabase.js) เพราะต้องสะท้อน CHECK constraint
// ของ migration 044 · ที่นี่แค่ re-export ต่อ เพื่อให้หน้าจอที่ import จาก ui.jsx
// อยู่แล้วใช้ได้เหมือนเดิม และไม่เกิด import วนระหว่างสองไฟล์
export { REQ_STATUS, REQ_STATUS_ORDER, REQ_STATUS_VALUES, reqStatusLabel, reasonRequired,
         WAITING_STATUS, isWaitingReq, reqKind } from './supabase.js'

// รวมสถิติข้อปฏิบัติของกฎหมายหลายฉบับ
//   pct = C / (C + NC) × 100 — Ack / ไม่เกี่ยวข้อง / ยังไม่ประเมิน ไม่อยู่ในตัวหาร
//   pct = null เมื่อฐานเป็นศูนย์ (เช่นฉบับที่มีแต่ Ack กับ ไม่เกี่ยวข้อง) → หน้าจอแสดง "N/A"
export function sumReqStats(laws) {
  const n = { met: 0, unmet: 0, acknowledged: 0, not_applicable: 0, waiting: 0 }
  for (const l of (laws || [])) for (const r of (l.reqs || [])) n[reqKind(r)]++
  const assessed = n.met + n.unmet
  return {
    ...n,
    ack: n.acknowledged, na: n.not_applicable,          // ชื่อสั้นไว้ใช้ในหน้าจอ
    total: assessed + n.acknowledged + n.not_applicable + n.waiting,
    assessed,
    pct: assessed ? Math.round(n.met / assessed * 100) : null,
  }
}
export const reqStats = law => sumReqStats([law])
// ค่าใช้จัดเรียง: ไม่มีข้อ=100, ประเมินแล้ว=pct, มีข้อแต่ยังไม่ประเมินเลย=-1 (จมล่างสุด)
export const prog = l => { const s = reqStats(l); if (!s.total) return 100; return s.pct == null ? -1 : s.pct }
// ป้ายกำกับ tooltip: สถานะ + ผู้ประเมิน/วันที่ + เหตุผล (Ack/NA) หรือรายละเอียดผู้รับผิดชอบ (waiting)
export const reqEvalTitle = r => {
  if (isWaitingReq(r)) return r?.note || 'ยังไม่ประเมิน'
  const parts = [reqStatusLabel(reqKind(r))]
  // ข้อมูลที่นำเข้าจาก F-259 ครั้งแรกมีวันที่ประเมินแต่ไม่มีชื่อผู้ประเมิน (ยุคนั้นไม่ได้เก็บ)
  // เขียน "ประเมินโดย —" จะอ่านเหมือนระบบพัง · มีแค่วันที่ก็บอกแค่วันที่
  if (r?.evaluated_by) parts.push(`ประเมินโดย ${r.evaluated_by}${r?.evaluated_at ? ' · ' + formatThaiDate(r.evaluated_at) : ''}`)
  else if (r?.evaluated_at) parts.push(`ประเมินเมื่อ ${formatThaiDate(r.evaluated_at)}`)
  if (r?.status_reason) parts.push('เหตุผล: ' + r.status_reason)
  return parts.join(' · ')
}

// Extract a Buddhist-era (พ.ศ.) year from the messy free-text issue_date
export const lawBEYear = s => {
  if (!s) return null
  const four = String(s).match(/25\d\d/); if (four) return +four[0]
  const nums = String(s).match(/\d{1,4}/g); if (!nums) return null
  for (let i = nums.length - 1; i >= 0; i--) { const n = +nums[i]; if (n >= 40 && n <= 80) return 2500 + n }
  return null
}

export const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

// ── รอบประเมิน (ไตรมาส) ตามหัวเอกสาร F-259 ──
export const QUARTER_LABEL = ['ม.ค.-มี.ค.', 'เม.ย.-มิ.ย.', 'ก.ค.-ก.ย.', 'ต.ค.-ธ.ค.']
// ไตรมาส 1-4 ของวันที่ (คืน null ถ้าแปลงวันที่ไม่ได้)
export const quarterOfDate = d => { const x = new Date(d); return isNaN(x) ? null : Math.floor(x.getMonth() / 3) + 1 }
// ป้ายรอบประเมินเต็ม เช่น "รอบที่ 1 (ม.ค.-มี.ค.) ปี 2569"
export const roundLabel = (q, beYear) => `รอบที่ ${q} (${QUARTER_LABEL[q - 1]}) ปี ${beYear}`
// รอบประเมินปัจจุบันจากวันนี้ { q, by } (by = ปี พ.ศ.)
export const currentRound = () => { const n = new Date(); return { q: Math.floor(n.getMonth() / 3) + 1, by: n.getFullYear() + 543 } }
// ── หน้าที่ตามกฎหมายของ จป. ──
// เส้นตายรายงาน จป.ว 2 ครั้ง/ปี: ยื่นภายใน 30 วันนับแต่ 30 มิ.ย. / 31 ธ.ค. → เส้นตาย 30 ก.ค. / 30 ม.ค.
function nextOccur(month, day, now) { // month 0-based
  let d = new Date(now.getFullYear(), month, day)
  if (d < now) d = new Date(now.getFullYear() + 1, month, day)
  return d
}
export function jorporReportDeadlines(now = new Date()) {
  const jul = nextOccur(6, 30, now), jan = nextOccur(0, 30, now)
  return [
    { key: 'jorpor-jul', label: 'ส่งรายงาน จป.ว (ครึ่งปีแรก) — ภายใน 30 ก.ค.', due: jul, days: Math.ceil((jul - now) / 86400000) },
    { key: 'jorpor-jan', label: 'ส่งรายงาน จป.ว (ครึ่งปีหลัง) — ภายใน 30 ม.ค.', due: jan, days: Math.ceil((jan - now) / 86400000) },
  ]
}
// แปลงวันที่รูปแบบไทย "วว/ดด/ปปปป" (ปี พ.ศ.) เป็น Date — คืน null ถ้าไม่เข้ารูปแบบ
// (ปี > 2400 ถือเป็น พ.ศ. แปลงเป็น ค.ศ.; อย่างอื่น fallback ให้ Date เดิม)
function parseBEDate(s) {
  if (!s) return null
  const m = String(s).match(/^(\d{1,2})\/(\d{1,2})\/(\d{3,4})$/)
  if (m) {
    let [, d, mo, y] = m
    y = +y; if (y > 2400) y -= 543
    const dt = new Date(y, +mo - 1, +d)
    return isNaN(dt) ? null : dt
  }
  const dt = new Date(s)
  return isNaN(dt) ? null : dt
}
// ── P20 · แปลงวันที่ระหว่าง <input type="date"> (ISO ค.ศ.) ↔ รูปแบบที่เก็บในฐาน (วว/ดด/ปปปป พ.ศ.) ──
// เก็บในฐานเป็น "วว/ดด/ปปปป" พ.ศ. เหมือน 150 แถวเดิม เพื่อไม่ให้ chart รายเดือน / เรียงวันที่ / PDF เพี้ยน
// beToISO: "วว/ดด/ปปปป"(พ.ศ. หรือ ค.ศ.) → "ปปปป-ดด-วว"(ค.ศ.) สำหรับใส่ค่าใน date picker — คืน '' ถ้าแปลงไม่ได้
export function beToISO(be) {
  const m = String(be || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{3,4})$/)
  if (!m) return ''
  let [, d, mo, y] = m; y = +y; if (y > 2400) y -= 543   // >2400 = พ.ศ. → ค.ศ.
  const dt = new Date(y, +mo - 1, +d)
  if (isNaN(dt) || dt.getMonth() !== +mo - 1 || dt.getDate() !== +d) return ''   // กันวันที่ไม่มีจริง
  const pad = n => String(n).padStart(2, '0')
  return `${y}-${pad(+mo)}-${pad(+d)}`
}
// isoToBE: "ปปปป-ดด-วว"(ค.ศ. จาก picker) → "วว/ดด/ปปปป"(พ.ศ.) สำหรับบันทึกลงฐาน
export function isoToBE(iso) {
  const m = String(iso || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return iso || ''
  const [, y, mo, d] = m
  return `${d}/${mo}/${+y + 543}`
}
// วันที่มีค่าอยู่แต่แปลงเป็น date picker ไม่ได้ (freeform เดิม) → true = ให้ fallback เป็นช่องข้อความ
export const isFreeformDate = v => !!(v && String(v).trim() && !beToISO(v))

// กฎหมายที่ "ประกาศแล้วแต่ยังไม่ถึงวันบังคับใช้" — คืน { days } ถ้า effective_date เป็นวันในอนาคต (ข้าม freeform)
export function effectiveInfo(law, now = new Date()) {
  const d = parseBEDate(law?.effective_date)
  if (!d) return null
  const days = Math.ceil((d - now) / 86400000)
  return days > 0 ? { days } : null
}
// สถานะอบรมพัฒนาความรู้ จป. 12 ชม./ปี (t = {hours, target, year})
export function trainingStatus(t, now = new Date()) {
  const target = Number(t?.target ?? 12)
  const hours = Number(t?.hours ?? 0)
  const daysLeft = Math.ceil((new Date(now.getFullYear(), 11, 31) - now) / 86400000)
  const done = hours >= target
  return { hours, target, daysLeft, done, remain: Math.max(0, target - hours), alert: !done && daysLeft <= 90 }
}

// นับกฎหมายมาใหม่/ยกเลิก รายเดือน (12 เดือน) ของปี พ.ศ. beYear — ตรงรูปแบบชีท Masterlist
export function monthlyCounts(laws, beYear) {
  const gYear = beYear - 543
  const added = Array(12).fill(0), repealed = Array(12).fill(0)
  for (const l of (laws || [])) {
    if (l.created_at) { const x = new Date(l.created_at); if (!isNaN(x) && x.getFullYear() === gYear) added[x.getMonth()]++ }
    if (l.status === 'repealed' && l.repeal_date) { const x = new Date(l.repeal_date); if (!isNaN(x) && x.getFullYear() === gYear) repealed[x.getMonth()]++ }
  }
  return { added, repealed }
}

// ── ภาพรวมรายเดือน: นับ "มาใหม่" ตามวันที่ประกาศใช้ (issue_date free-text) ──
const _THMON = {
  มกราคม:1,กุมภาพันธ์:2,มีนาคม:3,เมษายน:4,พฤษภาคม:5,มิถุนายน:6,
  กรกฎาคม:7,สิงหาคม:8,กันยายน:9,ตุลาคม:10,พฤศจิกายน:11,ธันวาคม:12,
  มค:1,กพ:2,มีค:3,เมย:4,พค:5,มิย:6,กค:7,สค:8,กย:9,ตค:10,พย:11,ธค:12,
}
const _thMon = tok => { const t = String(tok||'').replace(/[.\s]/g,''); for (const k in _THMON) if (t.indexOf(k) >= 0) return _THMON[k]; return 0 }
const _beToGy = y => { y = +y; if (y < 100) y += 2500; return y > 2400 ? y - 543 : y }
// แยกเดือน(0-11)/ปี ค.ศ. จากช่อง "วันที่ประกาศใช้" — คืน {m, gy} หรือ null
export function announceMonth(law) {
  let s = String(law?.issue_date || '').replace(/[๐-๙]/g, d => '๐๑๒๓๔๕๖๗๘๙'.indexOf(d))
  const cut = s.search(/มีผล|บังคับ/); if (cut > 0) s = s.slice(0, cut)   // เอาเฉพาะช่วงวันประกาศ ตัดวันบังคับใช้ทิ้ง
  s = s.replace(/พ\.?\s?ศ\.?/g, ' ')
  let m = s.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})/)   // วว/ดด/ปปปป
  if (m) return { m: Math.min(11, Math.max(0, +m[2] - 1)), gy: _beToGy(m[3]) }
  m = s.match(/(\d{1,2})\s*([ก-๙][ก-๙.]*?)\s*(\d{2,4})/)          // วัน ชื่อเดือน ปี
  if (m) { const mo = _thMon(m[2]); if (mo) return { m: mo - 1, gy: _beToGy(m[3]) } }
  return null
}
// นับมาใหม่ (ตามวันประกาศใช้) / ยกเลิก (ตาม repeal_date) รายเดือน (12) ของปี ค.ศ. gYear
export function monthlyByAnnounce(laws, gYear) {
  const added = Array(12).fill(0), repealed = Array(12).fill(0)
  for (const l of (laws || [])) {
    const a = announceMonth(l); if (a && a.gy === gYear) added[a.m]++
    if (l.repeal_date) { const x = new Date(l.repeal_date); if (!isNaN(x) && x.getFullYear() === gYear) repealed[x.getMonth()]++ }
  }
  return { added, repealed }
}
// ปี ค.ศ. ที่มีข้อมูล (จากวันประกาศใช้ + วันยกเลิก) เรียงใหม่→เก่า รวมปีปัจจุบันเสมอ
export function announceYears(laws) {
  const s = new Set()
  for (const l of (laws || [])) {
    const a = announceMonth(l); if (a) s.add(a.gy)
    if (l.repeal_date) { const x = new Date(l.repeal_date); if (!isNaN(x)) s.add(x.getFullYear()) }
  }
  s.add(new Date().getFullYear())
  return [...s].sort((a, b) => b - a)
}

// นับกฎหมายที่ "มาใหม่/ยกเลิก" ในรอบ (q, beYear) จาก created_at / repeal_date ของ laws
export function roundCounts(laws, q, beYear) {
  const gYear = beYear - 543
  let added = 0, repealed = 0
  for (const l of (laws || [])) {
    if (l.created_at) { const x = new Date(l.created_at); if (!isNaN(x) && x.getFullYear() === gYear && Math.floor(x.getMonth() / 3) + 1 === q) added++ }
    if (l.status === 'repealed' && l.repeal_date) { const x = new Date(l.repeal_date); if (!isNaN(x) && x.getFullYear() === gYear && Math.floor(x.getMonth() / 3) + 1 === q) repealed++ }
  }
  return { added, repealed }
}
// util วันที่ไทยเดียวของทั้งแอป: "วัน เดือนย่อ ปีพ.ศ." (คืน '—' ถ้าว่าง, คืนค่าดิบถ้าแปลงไม่ได้)
export const formatThaiDate = s => {
  if (!s) return '—'
  const d = new Date(s)
  if (isNaN(d)) return String(s)
  return d.getDate() + ' ' + TH_MONTHS[d.getMonth()] + ' ' + (d.getFullYear() + 543)
}
export const thDate = formatThaiDate   // ชื่อย่อเดิม (alias)
export const daysTo = s => Math.ceil((new Date(s) - new Date()) / 86400000)
export const beYearFromDate = d => { if (!d) return null; const x = new Date(d); return isNaN(x) ? null : x.getFullYear() + 543 }

export const Pill = ({ s }) => <span className={'pill ' + (STATUS[s]?.cls || 'p-ok')}>{STATUS[s]?.label || s}</span>
// P21 · ป้ายสถานะข้อปฏิบัติรายข้อ — อ่านคลาสและชื่อไทยจากทะเบียนกลาง
// แสดงทั้งรหัสย่อและชื่อไทยเสมอ ไม่ให้ผู้ใช้ต้องแยกสถานะด้วยสีอย่างเดียว
export const ReqStatusPill = ({ req }) => {
  const k = reqKind(req)
  const st = REQ_STATUS[k] || WAITING_STATUS
  return <span className={'pill ' + st.cls} title={reqEvalTitle(req)}>{st.code} — {st.label}</span>
}
export const Tag = ({ c, color }) => <span className="tag" style={{ borderColor: (color || '#888') + '33', color: color || '#888' }}>{c}</span>
// Small "in-force" marker — green "ใช้อยู่" when the law is active, grey "ไม่ใช้แล้ว" when retired.
export const ActiveBadge = ({ active, size }) => active === false
  ? <span className={'active-badge is-off' + (size === 'sm' ? ' active-badge--sm' : '')} title="กฎหมายนี้ไม่ใช้แล้ว"><i />ไม่ใช้แล้ว</span>
  : <span className={'active-badge is-on' + (size === 'sm' ? ' active-badge--sm' : '')} title="กฎหมายนี้ยังใช้อยู่"><i />ใช้อยู่</span>

// Display-only category color override (LA–LG, CC) — matches the Landing palette.
// Never written back to the DB; falls back to the seeded color for anything unmapped.
export const CAT_COLORS = { LA: '#1C2431', LB: '#3A6A97', LC: '#B4553F', LD: '#B58A3C', LE: '#5F7A61', LF: '#2A3547', LG: '#6E6E73', CC: '#00B3A4' }
export const withCatColors = cats => (cats || []).map(c => ({ ...c, color: CAT_COLORS[c.code] || c.color }))

// Next available code for a category, e.g. LA-039 → LA-040 (per-category numbering).
export function nextCode(allLaws, catCode) {
  const nums = allLaws
    .filter(l => l.cat === catCode)
    .map(l => { const m = l.code.match(/(\d+)$/); return m ? parseInt(m[1], 10) : 0 })
  const max = nums.length ? Math.max(...nums) : 0
  return `${catCode}-${String(max + 1).padStart(3, '0')}`
}

// Fuzzy duplicate-name detection for the add-law flows.
export const normName = s => String(s || '').toLowerCase().replace(/[\s฀-ฏ.,()"'’\-]/g, '')
export function dupCheck(allLaws, name) {
  const n = normName(name); if (n.length < 8) return null
  return allLaws.find(l => { const m = normName(l.name); return m && (m.includes(n.slice(0, 20)) || n.includes(m.slice(0, 20))) }) || null
}

// ── P10 Task 9 · ตรวจกฎหมายซ้ำก่อนเข้าทะเบียน (เก็บอักษรไทยไว้ ต่างจาก normName) ──
export const normText = s => String(s || '').trim().toLowerCase().replace(/["'’().,\-–—/]/g, '').replace(/\s+/g, ' ').trim()
export const stripEra = s => String(s || '').replace(/พ\.?\s?ศ\.?\s?[\d๐-๙]{3,4}/g, '').replace(/\(?\s*ฉบับที่\s?[\d๐-๙]+\s*\)?/g, '')
export const baseName = s => normText(stripEra(s))
function bigrams(s) { const r = new Set(); for (let i = 0; i < s.length - 1; i++) r.add(s.slice(i, i + 2)); return r }
export function diceSim(a, b) {
  a = String(a || ''); b = String(b || ''); if (!a || !b) return 0; if (a === b) return 1
  const A = bigrams(a), B = bigrams(b); if (!A.size || !B.size) return 0
  let inter = 0; A.forEach(x => { if (B.has(x)) inter++ })
  return (2 * inter) / (A.size + B.size)
}
// คืน { type:'exact'|'amendment'|'fuzzy', law, sim } หรือ null
export function findLawDuplicate(allLaws = [], name, sourceUrl = '') {
  const nt = normText(name); if (nt.length < 6) return null
  const su = (sourceUrl || '').trim()
  const exact = allLaws.find(l => normText(l.name) === nt || (su && l.source_url && l.source_url.trim() === su))
  if (exact) return { type: 'exact', law: exact, sim: 1 }
  const bn = baseName(name)
  let best = null, bestSim = 0
  allLaws.forEach(l => { const s = diceSim(bn, baseName(l.name)); if (s > bestSim) { bestSim = s; best = l } })
  if (best && bestSim > 0.6) {
    const sameBase = baseName(name) === baseName(best.name) && normText(name) !== normText(best.name)
    return { type: sameBase ? 'amendment' : 'fuzzy', law: best, sim: bestSim }
  }
  return null
}
