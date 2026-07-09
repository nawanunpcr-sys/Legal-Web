import { useEffect, useMemo, useState } from 'react'
import { fetchAll } from '../lib/supabase.js'

// ───────────────────────────────────────────────────────────────────────────
// LexGuard — public Landing page (shown before login).
// Apple "Soft Modern" aesthetic: translucent sticky nav, soft-gray gradient
// ground, glass cards, blue accent. All numbers are LIVE — computed from the
// same Supabase data the dashboard uses (fetchAll), so the landing always
// mirrors the real registry. Nothing here is hard-coded demo data.
// ───────────────────────────────────────────────────────────────────────────

const ACCENT = '#0071E3'
const INK = '#1D1D1F'
const SOFT = '#6E6E73'
// Display-only category color override (LA–LG) — matches the app palette.
const CAT_COLORS = { LA: '#1C2431', LB: '#3A6A97', LC: '#B4553F', LD: '#B58A3C', LE: '#5F7A61', LF: '#2A3547', LG: '#6E6E73' }
const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

export default function Landing({ onEnter }) {
  const [data, setData] = useState(null)
  const [logoOk, setLogoOk] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try { const d = await fetchAll(); if (alive) setData(d) }
      catch { if (alive) setData({ cats: [], laws: [], comms: [] }) }
    })()
    return () => { alive = false }
  }, [])

  const m = useMemo(() => {
    const cats = data?.cats || []
    const laws = data?.laws || []
    const comms = data?.comms || []
    const inForce = laws.filter(l => l.status !== 'repealed' && l.active !== false)
    let req = 0, met = 0
    inForce.forEach(l => (l.reqs || []).forEach(r => { req++; if (r.status === 'met') met++ }))
    const nc = req - met
    const pct = req ? (met / req * 100) : 100
    // per-category NC (in-force laws whose status is bad)
    const catRows = cats.map(c => {
      const ncCount = inForce.filter(l => l.cat === c.code && l.status === 'bad').length
      return { code: c.code, name: c.name, color: CAT_COLORS[c.code] || c.color || '#1C2431', ncCount }
    })
    const ncItems = inForce.filter(l => l.status === 'bad')
    return {
      cats, comms,
      total: inForce.length,
      catCount: cats.length,
      req, met, nc, pct,
      catRows,
      ncItems,
      loaded: !!data,
    }
  }, [data])

  // Laws entering (created_at) / leaving (repeal_date) the registry, per month, this year.
  // Live — populates automatically as laws are added/repealed in the app.
  const monthly = useMemo(() => {
    const laws = data?.laws || []
    const yr = new Date().getFullYear()
    const added = Array(12).fill(0), repealed = Array(12).fill(0)
    laws.forEach(l => {
      if (l.created_at) { const d = new Date(l.created_at); if (!isNaN(d) && d.getFullYear() === yr) added[d.getMonth()]++ }
      if (l.repeal_date) { const d = new Date(l.repeal_date); if (!isNaN(d) && d.getFullYear() === yr) repealed[d.getMonth()]++ }
    })
    const max = Math.max(1, ...added, ...repealed)
    return {
      yr, added, repealed, max,
      totalAdded: added.reduce((a, b) => a + b, 0),
      totalRepealed: repealed.reduce((a, b) => a + b, 0),
    }
  }, [data])

  const nav = ['ภาพรวม', 'ทะเบียนกฎหมาย', 'ความสอดคล้อง', 'การสื่อสาร', 'วิเคราะห์ & AI']

  const stats = [
    { val: fmt(m.total), lab: 'กฎหมายในทะเบียน (ฉบับ)', color: INK },
    { val: String(m.catCount), lab: 'หมวด (LA–LG)', color: INK },
    { val: fmt(m.req), lab: 'ข้อกำหนดรายข้อ', color: INK },
    { val: m.pct.toFixed(1) + '%', lab: `ความสอดคล้อง (${m.met}/${m.req})`, color: ACCENT },
  ]
  const kpis = [
    { lab: 'กฎหมายทั้งหมด', val: fmt(m.total), unit: 'ฉบับ', delta: m.catCount + ' หมวด', accent: '#1C2431' },
    { lab: 'ยังไม่สอดคล้อง', val: String(m.nc), unit: 'ข้อ', delta: 'จาก ' + m.req + ' ข้อกำหนด', accent: '#B4553F' },
    { lab: 'การสื่อสาร ISD-86', val: String(m.comms.length), unit: 'รายการ', delta: 'ภายใน / ภายนอกองค์กร', accent: '#B58A3C' },
    { lab: 'สอดคล้อง', val: m.pct.toFixed(1) + '%', unit: '', delta: m.met + ' / ' + m.req + ' ข้อ', accent: '#5F7A61' },
  ]

  // ring geometry (r=72 → circumference ≈ 452.4)
  const CIRC = 452.4
  const dashOffset = CIRC * (1 - m.pct / 100)

  return (
    <div className="lg-landing">
      {/* ── NAV ── */}
      <header className="lgl-nav">
        <div className="lgl-brand">
          {logoOk
            ? <img src="/jastel-logo.png" alt="JasTel Network" onError={() => setLogoOk(false)} />
            : <span className="lgl-brand-mark">SHE</span>}
          <span className="lgl-brand-name">LexGuard</span>
        </div>
        <nav className="lgl-links">
          {nav.map((n, i) => (
            <a key={n} href="#" onClick={e => e.preventDefault()} className={i === 0 ? 'is-active' : ''}>{n}</a>
          ))}
        </nav>
        <div className="lgl-actions">
          <a href="#" onClick={e => { e.preventDefault(); onEnter() }} className="lgl-link-signin">เข้าสู่ระบบ</a>
          <a href="#" onClick={e => { e.preventDefault(); onEnter() }} className="lgl-btn-primary">เริ่มใช้งาน</a>
        </div>
      </header>

      {/* ── STATS — glass row ── */}
      <section className="lgl-section lgl-section--top">
        <div className="lgl-stats">
          {stats.map((s, i) => (
            <div className="lgl-stat" key={i}>
              <div className="lgl-stat-val" style={{ color: s.color }}>{s.val}</div>
              <div className="lgl-stat-lab">{s.lab}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── DASHBOARD PREVIEW — ring + KPI ── */}
      <section className="lgl-section lgl-preview">
        <div className="lgl-ring-card">
          <div className="lgl-eyebrow-sm">อัตราความสอดคล้อง</div>
          <div className="lgl-ring-wrap">
            <div className="lgl-ring">
              <svg width="156" height="156" viewBox="0 0 156 156" style={{ transform: 'rotate(-90deg)', display: 'block' }}>
                <circle cx="78" cy="78" r="72" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="6" />
                <circle cx="78" cy="78" r="72" fill="none" stroke="#34D0A0" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={CIRC} strokeDashoffset={dashOffset} style={{ transition: 'stroke-dashoffset .9s cubic-bezier(.4,0,.2,1)' }} />
              </svg>
              <div className="lgl-ring-center">
                <div className="lgl-ring-pct">{m.pct.toFixed(1)}<span>%</span></div>
                <div className="lgl-ring-sub">สอดคล้อง</div>
              </div>
            </div>
          </div>
          <div className="lgl-ring-legend">
            <span><i style={{ background: '#5F7A61' }} />สอดคล้อง <b>{m.met}</b></span>
            <span><i style={{ background: '#B4553F' }} />ยังไม่สอดคล้อง <b>{m.nc}</b></span>
          </div>
        </div>

        <div className="lgl-kpis">
          {kpis.map((k, i) => (
            <div className="lgl-kpi" key={i} style={{ borderTopColor: k.accent }}>
              <div className="lgl-kpi-lab">{k.lab}</div>
              <div className="lgl-kpi-val">{k.val} {k.unit && <span>{k.unit}</span>}</div>
              <div className="lgl-kpi-delta" style={{ color: k.accent }}>{k.delta}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── MONTHLY ADDED / REPEALED CHART ── */}
      <section className="lgl-section">
        <div className="lgl-card">
          <div className="lgl-card-head">
            <span className="lgl-card-title">กฎหมายที่เพิ่ม / ยกเลิก รายเดือน · ปี {monthly.yr + 543}</span>
            <span className="lgl-chart-legend">
              <span><i style={{ background: '#0071E3' }} />เพิ่ม <b>{monthly.totalAdded}</b></span>
              <span><i style={{ background: '#B58A3C' }} />ยกเลิก <b>{monthly.totalRepealed}</b></span>
            </span>
          </div>
          <div className="mchart lgl-mchart">
            {TH_MONTHS.map((lab, i) => (
              <div className="mchart-col" key={i}>
                <div className="mchart-bars">
                  <div className="mchart-bar mchart-bar-add" style={{ height: (monthly.added[i] / monthly.max * 100) + '%' }} title={`${lab}: เพิ่ม ${monthly.added[i]} ฉบับ`} />
                  <div className="mchart-bar mchart-bar-rep" style={{ height: (monthly.repealed[i] / monthly.max * 100) + '%' }} title={`${lab}: ยกเลิก ${monthly.repealed[i]} ฉบับ`} />
                </div>
                <div className="mchart-lab">{lab}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORIES + NC LIST ── */}
      <section className="lgl-section lgl-cols">
        <div className="lgl-card">
          <div className="lgl-card-head">
            <span className="lgl-card-title">หมวดกฎหมายทั้ง {m.catCount} หมวด (LA–LG)</span>
            <span className="lgl-card-sub">รวม {fmt(m.total)} ฉบับ · {fmt(m.req)} ข้อกำหนด</span>
          </div>
          <div className="lgl-cats">
            {m.catRows.map(c => (
              <div className="lgl-cat" key={c.code}>
                <span className="lgl-cat-code" style={{ background: c.color }}>{c.code}</span>
                <span className="lgl-cat-name">{c.name}</span>
                {c.ncCount > 0
                  ? <span className="lgl-cat-st is-nc">{c.ncCount} รายการ NC</span>
                  : <span className="lgl-cat-st is-ok">สอดคล้อง</span>}
              </div>
            ))}
            {m.catRows.length === 0 && <div className="lgl-empty">กำลังโหลดข้อมูลหมวดกฎหมาย…</div>}
          </div>
        </div>

        <div className="lgl-card lgl-nc">
          <div className="lgl-card-head">
            <span className="lgl-card-title">ยังไม่สอดคล้อง — ต้องติดตาม</span>
            <span className="lgl-nc-count">{m.ncItems.length} รายการ</span>
          </div>
          <div className="lgl-nc-list">
            {m.ncItems.slice(0, 6).map(n => (
              <div className="lgl-nc-item" key={n.id}>
                <span className="lgl-nc-code">{n.code}</span>
                <span className="lgl-nc-name">{(n.name || '').slice(0, 42)}</span>
                <span className="lgl-nc-dot">● NC</span>
              </div>
            ))}
            {m.loaded && m.ncItems.length === 0 && (
              <div className="lgl-nc-ok">ทุกข้อกำหนดสอดคล้องครบถ้วน ✓</div>
            )}
          </div>
          <div className="lgl-nc-foot">
            <span>แจ้งเตือนอัตโนมัติเมื่อใกล้ครบกำหนดทบทวน (≤ 60 วัน)</span>
            <a href="#" onClick={e => { e.preventDefault(); onEnter() }}>ดูทั้งหมด →</a>
          </div>
        </div>
      </section>

      <footer className="lgl-foot">
        <span>LexGuard · ทะเบียนกฎหมาย SHE</span>
        <span>© {new Date().getFullYear() + 543} Jastel Network Co., Ltd.</span>
      </footer>
    </div>
  )
}

function fmt(n) { return Number(n || 0).toLocaleString('en-US') }
