// รอบประเมิน selector — ไตรมาส (1-4) + ปี พ.ศ. ตรงกับหัวเอกสาร F-259.
import { QUARTER_LABEL } from '../lib/ui.jsx'

export default function RoundSelect({ round, onChange, years, compact }) {
  const nowBE = new Date().getFullYear() + 543
  const yearList = (years && years.length ? years : [nowBE - 2, nowBE - 1, nowBE, nowBE + 1])
  const uniqYears = [...new Set([...yearList, round.by])].sort((a, b) => b - a)
  return (
    <div className="round-select" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {!compact && <span style={{ fontSize: 12.5, color: 'var(--ink-faint)', fontWeight: 600 }}>รอบประเมิน</span>}
      <select className="form-input" style={{ marginTop: 0, width: 150, padding: '5px 8px', fontSize: 13 }}
        value={round.q} onChange={e => onChange({ ...round, q: Number(e.target.value) })}>
        {QUARTER_LABEL.map((lab, i) => <option key={i} value={i + 1}>ไตรมาส {i + 1} · {lab}</option>)}
      </select>
      <select className="form-input" style={{ marginTop: 0, width: 96, padding: '5px 8px', fontSize: 13 }}
        value={round.by} onChange={e => onChange({ ...round, by: Number(e.target.value) })}>
        {uniqYears.map(y => <option key={y} value={y}>ปี {y}</option>)}
      </select>
    </div>
  )
}
