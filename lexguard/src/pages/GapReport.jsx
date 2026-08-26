// P22 ขั้นที่ 4 · รายงาน Gap Analysis และความพร้อมตรวจประเมิน (ISO 45001 ข้อ 6.1.3)
//
// ═══ ทำไมเป็นเมนูใหม่ ไม่ใช่แท็บใน Reports.jsx ตามที่แผนเขียนไว้ ═══
// src/components/Reports.jsx เป็นตารางกำหนดส่งรายงานราชการใต้เมนู "สื่อสาร & ส่งรายงาน"
// ไม่ใช่หน้ารายงานวิเคราะห์ · ระบบไม่เคยมีหน้ารายงานมาก่อน จึงต้องมีที่อยู่ของตัวเอง
//
// ═══ กติกา ═══
// หน้านี้อ่านอย่างเดียว ไม่มีคำสั่งเขียนลงฐานข้อมูล
// ตัวเลขทุกตัวมาจาก src/lib/gap.js ซึ่งใช้สูตรเดียวกับ Dashboard (ฐาน C + NC)
import { useEffect, useMemo, useState } from 'react'
import { buildGapAnalysis, GAP_GROUPS, deptCounts, filterRows, groupByLaw, topActions,
         SUB_GAP_GROUP, buildSubGaps } from '../lib/gap.js'
import { analyzeGaps } from '../lib/gapInsight.js'
import { fetchImprovementPlans, fetchLawFileCounts, fetchF259Responsible, fetchUnmetSubs } from '../lib/supabase.js'
import { exportGapToExcel } from '../lib/integrations.js'
import { buildGapReport } from '../components/PdfExport.jsx'
import { I } from '../components/icons.jsx'
import { GLOSSARY } from '../lib/ui.jsx'

function Stat({ lab, val, sub, accent, tip }) {
  return (
    <div className="stat" style={{ borderTopColor: accent }} title={tip || ''}>
      <div className="lab">{lab}</div>
      <div className="val num" style={{ color: accent }}>{val}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 3, lineHeight: 1.5 }}>{sub}</div>}
    </div>
  )
}

export default function GapReport({ laws = [], catMap = {}, settings = {}, round, onOpen }) {
  const [plans, setPlans] = useState([])
  const [lawFiles, setLawFiles] = useState({})
  const [respMap, setRespMap] = useState({})   // ผู้รับผิดชอบที่กู้จาก F-259
  const [unmetSubs, setUnmetSubs] = useState([])   // ข้อย่อยที่ยังไม่ได้ดำเนินการ (P24)
  const [openKey, setOpenKey] = useState(GAP_GROUPS[0].key)
  // P22 · ตัวกรองสำหรับหน้าจอ — ไม่กระทบตัวเลขสรุปด้านบนและไฟล์ export
  const [dept, setDept] = useState('all')
  const [q, setQ] = useState('')
  const [openLawKey, setOpenLawKey] = useState(null)   // "<groupKey>|<lawId>" ที่กางอยู่

  useEffect(() => { let live = true
    fetchImprovementPlans().then(d => { if (live) setPlans(d) }).catch(() => {})
    fetchLawFileCounts().then(m => { if (live) setLawFiles(m) }).catch(() => {})
    fetchF259Responsible().then(m => { if (live) setRespMap(m) }).catch(() => {})
    fetchUnmetSubs().then(d => { if (live) setUnmetSubs(d) }).catch(() => {})
    return () => { live = false }
  }, [])

  const { groups, summary } = useMemo(() => buildGapAnalysis(laws, plans, lawFiles, respMap), [laws, plans, lawFiles, respMap])
  const tops  = useMemo(() => topActions(groups, summary), [groups, summary])
  // รายการหลังกรอง แยกตามกลุ่ม — ใช้ทั้งบนหน้าจอและตอน export "เฉพาะที่เห็น"
  // P24 · ช่องว่างระดับข้อย่อย — เพิ่มเป็นกลุ่มเมื่อมีข้อมูลเท่านั้น
  // ไม่โผล่เป็นกลุ่มว่างให้รก เหมือนที่ทำกับ 3 กลุ่มที่ซ่อนไว้
  const subRows = useMemo(() => buildSubGaps(unmetSubs, laws), [unmetSubs, laws])
  const allGroups = useMemo(() => subRows.length ? [...GAP_GROUPS, SUB_GAP_GROUP] : GAP_GROUPS, [subRows.length])
  const groupsPlus = useMemo(() => ({ ...groups, [SUB_GAP_GROUP.key]: subRows }), [groups, subRows])
  // ⚠ ต้องประกาศหลัง groupsPlus — const อยู่ใน TDZ ถ้าเรียกก่อนจะพังตอน render
  const depts = useMemo(() => deptCounts(groupsPlus), [groupsPlus])
  const shown = useMemo(() => Object.fromEntries(
    allGroups.map(g => [g.key, filterRows(groupsPlus[g.key] || [], { dept, q })])), [allGroups, groupsPlus, dept, q])
  const shownTotal = allGroups.reduce((n, g) => n + shown[g.key].length, 0)
  const filtering = dept !== 'all' || !!q.trim()
  // วิเคราะห์จากรายการที่กำลังแสดงอยู่ — กรองหน่วยงานแล้วผลวิเคราะห์เปลี่ยนตาม
  const insight = useMemo(() => analyzeGaps(allGroups.flatMap(g => shown[g.key])), [allGroups, shown])

  // กำลังกรองอยู่ → ส่งออกเฉพาะที่เห็น เพื่อให้ส่งให้แต่ละฝ่ายแยกกันได้
  // ไม่กรอง → ส่งออกทั้งหมดเหมือนเดิม · ตัวเลขสรุปหัวรายงานเป็นของทั้งทะเบียนเสมอ
  const exportSet = () => filtering ? shown : groups
  function exportPdf() {
    buildGapReport({ groups: exportSet(), summary, catMap, settings, round, insight })
    setTimeout(() => window.print(), 80)
  }

  return (
    <div className="view">
      {/* ── หัวรายงาน ── */}
      <div className="rc-stats" style={{ marginBottom: 14 }}>
        <Stat lab="อัตราความสอดคล้อง" accent="#5F7A61" tip={GLOSSARY.pct}
          val={summary.pct == null ? '—' : summary.pct + '%'}
          sub={`${summary.met} จาก ${summary.assessed} ข้อที่เข้าฐานคำนวณ (C + NC)`} />
        <Stat lab="ยังไม่สอดคล้อง (NC)" accent="#B4553F" tip={GLOSSARY.unmet}
          val={summary.unmet} sub={`จาก ${summary.assessed} ข้อที่ประเมินแล้ว`} />
        <Stat lab="ช่องว่างที่ต้องจัดการ" accent="#B58A3C" val={summary.totalGaps}
          sub={`จากกฎหมาย ${summary.laws} ฉบับ · ${summary.req} ข้อปฏิบัติ`} />
        {/* การ์ด "ความครบถ้วนของหลักฐาน" และ "ความแม่นของข้อเสนอ AI" ถูกตัดออก 26/08/2569
            ทั้งคู่ยังไม่มีข้อมูลรองรับ (ไฟล์แนบ 0 ไฟล์ · ยังไม่มีใครตัดสินข้อเสนอ AI)
            แสดง 0% กับ — แล้วชวนเข้าใจผิดว่าองค์กรทำได้แย่ ทั้งที่ยังไม่ได้เริ่มเก็บข้อมูล */}
      </div>

      <div style={{ padding: '10px 13px', borderRadius: 7, background: 'var(--surface-2)',
        border: '1px solid var(--line)', fontSize: 12.5, lineHeight: 1.7, marginBottom: 14 }}>
        รายงานนี้แสดงเฉพาะ <b>กฎหมายที่ประเมินแล้วและผลเป็นไม่สอดคล้อง (NC)</b> ซึ่งเป็นช่องว่างที่องค์กร
        ต้องลงมือแก้จริง · กลุ่มอื่น (หลักฐานที่ยังไม่ได้แนบ · ข้อที่ยังไม่มีผู้ประเมิน ·
        กฎหมายที่ยังไม่คัดกรอง) ถูกซ่อนไว้ เพราะสะท้อน<b>ข้อมูลที่ยังไม่ได้เก็บ</b>
        ไม่ใช่การละเลยของทีมงาน — จะกลับมาแสดงเมื่อเริ่มบันทึกข้อมูลเหล่านั้นแล้ว
      </div>

      {/* ── ผลวิเคราะห์ช่องว่าง ───────────────────────────────────────────
          ข้อเสนอแนะข้อ 4 ขอ "Gap Analysis พร้อมข้อเสนอแนะ" — ของเดิมทำได้แค่นับ
          ส่วนนี้จัดกลุ่มช่องว่างตามหัวข้อ และหาลูกโซ่ในตัวบท เพื่อตอบว่า
          "แก้เรื่องเดียวปิดได้กี่รายการ" และ "ต้องเริ่มที่ข้อไหน"
          ทำด้วยการจับคำสำคัญกับการอ้างอิงข้อในตัวบท ไม่ได้เรียก AI */}
      {insight.summary && insight.themes.length > 0 && (
        <div className="panel" style={{ marginBottom: 14, borderLeft: '3px solid var(--brand)' }}>
          <div className="panel-h">
            <h3>ผลวิเคราะห์ช่องว่าง</h3>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-faint)' }}>
              {insight.summary.total} รายการ · {insight.summary.themeCount} หัวข้อ · {insight.summary.lawCount} ฉบับ
            </span>
          </div>
          <div className="panel-b" style={{ paddingTop: 6 }}>
            <div style={{ fontSize: 13.5, lineHeight: 1.75, marginBottom: 12 }}>
              ช่องว่างทั้งหมดกระจุกอยู่ใน <b>{insight.summary.themeCount} เรื่อง</b> —
              จัดการ {Math.min(3, insight.themes.length)} เรื่องแรกได้ จะปิดช่องว่างไป{' '}
              <b>{insight.summary.topCovered} จาก {insight.summary.total} รายการ ({insight.summary.topPct}%)</b>
            </div>

            {insight.themes.map((th, i) => (
              <div key={th.key} className="impr-row">
                <div className="impr-dot" style={{ background: 'var(--brand)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {i + 1}. {th.label}
                    <span style={{ fontWeight: 400, color: 'var(--ink-faint)' }}>
                      {' '}— {th.items.length} รายการ ({th.pct}%)
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 4, lineHeight: 1.7 }}>
                    {th.advice}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {th.laws.map(c => <span key={c} className="meta-chip" style={{ fontSize: 10.5 }}>{c}</span>)}
                    {th.depts.map(d => <span key={d} className="meta-chip" style={{ fontSize: 10.5 }}>{d}</span>)}
                  </div>
                </div>
              </div>
            ))}

            {/* ลูกโซ่ในตัวบท — ทำต้นทางก่อนแล้วปลายทางปิดตาม */}
            {insight.chains.length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-faint)', marginBottom: 7 }}>
                  ข้อกำหนดที่ต่อกันเป็นลูกโซ่ — ต้องทำต้นทางก่อน
                </div>
                {insight.chains.map(c => (
                  <div key={c.law?.code} style={{ fontSize: 12.5, lineHeight: 1.8, marginBottom: 6 }}>
                    <b>{c.law?.code}</b> · {c.count} รายการต่อกัน — <b style={{ color: 'var(--bad)' }}>
                      เริ่มที่ข้อ {c.roots.join(' และ ')}</b>
                    <div style={{ color: 'var(--ink-faint)', fontSize: 11.5 }}>
                      {c.links.map(l => `ข้อ ${l.from} → ข้อ ${l.to}`).join('  ·  ')}
                      {' '}— ข้อปลายทางทำไม่ได้ถ้าข้อต้นทางยังไม่เสร็จ
                    </div>
                  </div>
                ))}
              </div>
            )}

            {insight.summary.unassigned > 0 && (
              <div style={{ marginTop: 12, padding: '9px 12px', borderRadius: 7, background: 'var(--warn-bg)',
                color: 'var(--warn)', fontSize: 12.5, lineHeight: 1.65 }}>
                <b>{insight.summary.unassigned} จาก {insight.summary.total} รายการยังไม่มีผู้รับผิดชอบ</b> —
                ต้องระบุหน่วยงานก่อน ไม่งั้นเปิดแผนปรับปรุงแล้วไม่มีใครรับงานไปทำ
              </div>
            )}

            <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 12, lineHeight: 1.6 }}>
              จัดกลุ่มด้วยการจับคำสำคัญในตัวบทและการอ้างอิงข้อ (เช่น “ตามข้อ ๖”) —
              <b> ไม่ใช่ความเห็นทางกฎหมายและไม่ได้ใช้ AI</b> ใช้เพื่อจัดลำดับงาน
              ก่อนตัดสินใจจริงให้เปิดตัวบทประกอบเสมอ
            </p>
          </div>
        </div>
      )}

      {/* ── เริ่มจากตรงนี้ · สามอย่างที่ปิดช่องว่างได้มากที่สุด ────────────────
          คำนวณจากจำนวนรายการล้วนๆ ไม่ได้ให้น้ำหนักว่าอะไรเสี่ยงกว่ากัน
          ผู้บริหารเปิดหน้านี้แล้วต้องสั่งงานได้ทันทีโดยไม่ต้องไล่อ่าน 5 กลุ่ม */}
      {tops.length > 1 && (
        <div className="panel" style={{ marginBottom: 14, borderLeft: '3px solid var(--brand)' }}>
          <div className="panel-h"><h3>เริ่มจากตรงนี้</h3>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-faint)' }}>
              {tops.reduce((n, x) => n + x.pct, 0)}% ของช่องว่างทั้งหมด
            </span>
          </div>
          <div className="panel-b" style={{ paddingTop: 6 }}>
            {tops.map((x, i) => (
              <div key={x.key} className="impr-row" style={{ cursor: 'pointer' }}
                onClick={() => { setOpenKey(x.key); setDept('all'); setQ('') }}>
                <div className="impr-dot" style={{ background: 'var(--brand)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{i + 1}. {x.todo}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 3, lineHeight: 1.6 }}>
                    {x.title} — <b>{x.n.toLocaleString('en-US')} รายการ</b> ใน {x.laws} ฉบับ
                    <span style={{ color: 'var(--ink-faint)' }}> · คิดเป็น {x.pct}% ของช่องว่างทั้งหมด</span>
                  </div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--brand)', alignSelf: 'center' }}>ดูรายการ →</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ตัวกรอง ─────────────────────────────────────────────────────────
          509 แถวเรียงรวดโดยไม่มีตัวกรอง = เปิดมาแล้วทำอะไรต่อไม่ถูก
          คนที่ต้องลงมือแก้คือเจ้าของหน่วยงาน ต้องหาแถวของตัวเองให้เจอก่อน */}
      <div className="filterbar" style={{ marginBottom: 12 }}>
        <span className={'chip' + (dept === 'all' ? ' active' : '')} onClick={() => setDept('all')}>
          ทุกหน่วยงาน ({summary.totalGaps.toLocaleString('en-US')})
        </span>
        {depts.slice(0, 12).map(([d, n]) => (
          <span key={d} className={'chip' + (dept === d ? ' active' : '')} onClick={() => setDept(d)}
            title={d} style={{ maxWidth: 230, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d.length > 26 ? d.slice(0, 26) + '…' : d} ({n})
          </span>
        ))}
        <input className="form-input" style={{ marginTop: 0, maxWidth: 230, marginLeft: 'auto', padding: '4px 10px', fontSize: 12.5 }}
          placeholder="ค้นหา รหัส / ชื่อกฎหมาย / มาตรา…" value={q} onChange={e => setQ(e.target.value)} />
        {filtering && (
          <span className="chip" style={{ cursor: 'pointer' }} onClick={() => { setDept('all'); setQ('') }}>
            ✕ ล้างตัวกรอง
          </span>
        )}
      </div>

      {filtering && (
        <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '0 0 12px', lineHeight: 1.7 }}>
          กำลังแสดง <b>{shownTotal.toLocaleString('en-US')}</b> จาก {summary.totalGaps.toLocaleString('en-US')} รายการ
          {dept !== 'all' ? ` · หน่วยงาน ${dept}` : ''}{q.trim() ? ` · คำค้น "${q.trim()}"` : ''}
          {' '}— ปุ่มส่งออกด้านล่างจะส่งออกเฉพาะที่เห็นนี้ (ตัวเลขสรุปด้านบนยังเป็นของทั้งทะเบียน)
        </p>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost" onClick={exportPdf}><I n="list" />พิมพ์ / บันทึก PDF{filtering ? ' (เฉพาะที่เห็น)' : ''}</button>
        <button className="btn btn-ghost" onClick={() => exportGapToExcel({ groups: exportSet(), summary, catMap, settings })}>
          <I n="download" />ดาวน์โหลด Excel{filtering ? ' (เฉพาะที่เห็น)' : ''}
        </button>
      </div>

      {/* ── 5 กลุ่มช่องว่าง · ยุบเป็นรายกฎหมาย ────────────────────────────
          509 แถวเรียงรวดอ่านไม่ไหว · ยุบเป็น ~120 ฉบับพับไว้ กดกางดูรายข้อ
          เรียงตามจำนวนรายการมากไปน้อย เพื่อให้เห็นว่าปัญหากระจุกที่ฉบับไหน */}
      {allGroups.map(g => {
        const rows = shown[g.key]
        const all = groupsPlus[g.key] || []
        const on = openKey === g.key
        const byLaw = on ? groupByLaw(rows) : []
        return (
          <div key={g.key} className="panel" style={{ marginBottom: 12 }}>
            <div className="panel-h" style={{ cursor: 'pointer' }} onClick={() => setOpenKey(on ? null : g.key)}>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{g.title}</span>
              <span className={'pill ' + (rows.length ? 'p-bad' : 'p-ok')}>
                {rows.length ? `${rows.length.toLocaleString('en-US')} รายการ` : 'ไม่มีช่องว่าง'}
                {filtering && all.length !== rows.length ? ` / ${all.length.toLocaleString('en-US')}` : ''}
              </span>
              <span style={{ fontSize: 12, color: 'var(--brand)' }}>{on ? 'ย่อ ▲' : 'ขยาย ▼'}</span>
            </div>
            {on && (
              <div className="panel-b" style={{ paddingTop: 4 }}>
                <p style={{ fontSize: 12, color: 'var(--ink-faint)', lineHeight: 1.7, margin: '0 0 10px' }}>
                  <b>เหตุที่เป็นช่องว่าง:</b> {g.why}<br /><b>สิ่งที่ต้องทำต่อ:</b> {g.todo}
                </p>
                {rows.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: filtering ? 'var(--ink-faint)' : 'var(--ok)' }}>
                    {filtering ? 'ไม่มีรายการที่ตรงกับตัวกรอง' : 'ไม่พบรายการในกลุ่มนี้'}
                  </p>
                ) : (
                  <>
                    <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 8 }}>
                      กระจายอยู่ใน {byLaw.length} ฉบับ — กดที่ชื่อกฎหมายเพื่อดูรายข้อ
                    </div>
                    {byLaw.map(({ law, items }) => {
                      const key = g.key + '|' + (law?.id ?? law?.code)
                      const openRow = openLawKey === key
                      const late = items.filter(x => x.due).length
                      return (
                        <div key={key} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px', cursor: 'pointer' }}
                            onClick={() => setOpenLawKey(openRow ? null : key)}>
                            <span className="law-code" style={{ minWidth: 62 }}>{law?.code}</span>
                            <span style={{ flex: 1, fontSize: 12.5, lineHeight: 1.45, minWidth: 0 }}>
                              {String(law?.name || '').slice(0, 86)}{String(law?.name || '').length > 86 ? '…' : ''}
                            </span>
                            {late > 0 && <span className="pill p-bad" style={{ fontSize: 10 }}>เลยกำหนด {late}</span>}
                            <span className="meta-chip" style={{ fontSize: 10.5 }}>{items.length} รายการ</span>
                            <span style={{ fontSize: 11, color: 'var(--brand)', minWidth: 34, textAlign: 'right' }}>
                              {openRow ? '▲' : '▼'}
                            </span>
                          </div>
                          {openRow && (
                            <div style={{ padding: '2px 0 12px 12px' }}>
                              <button className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 11, marginBottom: 8 }}
                                onClick={() => onOpen && onOpen(law)}>เปิดหน้ารายละเอียดกฎหมาย →</button>
                              {items.map((x, i) => (
                                <div key={i} className="impr-row">
                                  <div className="impr-dot" style={{ background: x.due ? 'var(--bad)' : 'var(--warn)' }} />
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.55 }}>{x.todo}</div>
                                    {x.detail && (
                                      <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 3, lineHeight: 1.55 }}>
                                        ↳ {String(x.detail).slice(0, 130)}{String(x.detail).length > 130 ? '…' : ''}
                                      </div>
                                    )}
                                    <div style={{ display: 'flex', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                                      <span className="meta-chip" style={{ fontSize: 10.5 }}>{x.section}</span>
                                      <span className="meta-chip" style={{ fontSize: 10.5 }}>{x.responsible}</span>
                                      {x.due && <span className="meta-chip" style={{ fontSize: 10.5, color: 'var(--bad)', background: 'var(--bad-bg)', borderColor: 'var(--bad-bg)' }}>
                                        เลยกำหนด {x.due}</span>}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
