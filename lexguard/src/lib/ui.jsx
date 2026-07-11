// Shared UI helpers & primitives used across App layout and page components.
// Extracted verbatim from App.jsx during the page split — behavior unchanged.
import { STATUS } from './supabase.js'

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
export const thDate = s => { if (!s) return '—'; const d = new Date(s); return d.getDate() + ' ' + TH_MONTHS[d.getMonth()] + ' ' + (d.getFullYear() + 543) }
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
