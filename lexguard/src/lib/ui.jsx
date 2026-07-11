// Shared UI helpers & primitives used across App layout and page components.
// Extracted verbatim from App.jsx during the page split — behavior unchanged.
import { useState, useEffect } from 'react'
import { STATUS } from './supabase.js'

// localStorage-backed state (persists filters/mode across reloads).
export function usePersist(key, def){
  const [v,setV]=useState(()=>{ try{ const s=localStorage.getItem(key); return s==null?def:JSON.parse(s) }catch{ return def } })
  useEffect(()=>{ try{ localStorage.setItem(key,JSON.stringify(v)) }catch{} },[key,v])
  return [v,setV]
}

// Progress % of a law from its requirements (no reqs = 100%).
export const prog = l => !l.reqs.length ? 100 : Math.round(l.reqs.filter(r => r.status === 'met').length / l.reqs.length * 100)

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
// กฎหมายที่ "ประกาศแล้วแต่ยังไม่ถึงวันบังคับใช้" — คืน { days } ถ้า effective_date เป็นวันในอนาคต (ข้าม freeform)
export function effectiveInfo(law, now = new Date()) {
  if (!law?.effective_date) return null
  const d = new Date(law.effective_date)
  if (isNaN(d)) return null
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
