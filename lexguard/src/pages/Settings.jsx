// Settings page — org profile & display settings (admin only; gated in App).
// Moved verbatim from App.jsx (pure refactor).
import { useState, useEffect } from 'react'
import { toast } from '../lib/toast.js'
import { confirmDialog } from '../lib/confirm.js'
import { addCategory, updateCategory, deleteCategory,
         fetchCompanyProfile, saveCompanyProfile, EMPTY_PROFILE, profileReady } from '../lib/supabase.js'

// สีเริ่มต้นให้เลือกตอนเพิ่มหมวด — ชุดเดียวกับโทนของหมวดเดิม (CAT_COLORS ใน lib/ui.jsx)
const CAT_SWATCHES = ['#1C2431', '#3A6A97', '#B4553F', '#B58A3C', '#5F7A61', '#2A3547', '#6E6E73', '#00B3A4']

/* ── หมวดกฎหมาย — ดูรายการเดิม + เพิ่มหมวดใหม่ ──
   prompt ของ /api/law-analyze อ่านรายการหมวดจาก lg_categories ตอนรัน
   เพิ่มที่นี่แล้ว AI เลือกหมวดใหม่ได้ทันที ไม่ต้อง deploy ใหม่ */
/* แถวหมวด 1 แถว — โหมดดู / โหมดแก้ไข · ลบได้เฉพาะหมวดที่ไม่มีกฎหมายผูกอยู่ */
function CatRow({ c, lawCount, onChanged }) {
  const [edit, setEdit] = useState(false)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState(c.name || '')
  const [color, setColor] = useState(c.color || CAT_SWATCHES[0])

  const dirty = name.trim() !== (c.name || '') || color !== (c.color || '')

  async function save() {
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      await updateCategory(c.code, { name: name.trim(), color })
      toast(`แก้ไขหมวด ${c.code} แล้ว`, 'success')
      setEdit(false); onChanged && onChanged()
    } catch (e) { toast('แก้ไขไม่สำเร็จ: ' + e.message) }
    setBusy(false)
  }

  async function remove() {
    if (lawCount > 0 || busy) return
    if (!(await confirmDialog(`ลบหมวด ${c.code} — ${c.name}?`, { danger: true, okLabel: 'ลบหมวด' }))) return
    setBusy(true)
    try {
      await deleteCategory(c.code)
      toast(`ลบหมวด ${c.code} แล้ว`, 'success')
      onChanged && onChanged()
    } catch (e) { toast('ลบไม่สำเร็จ: ' + e.message) }
    setBusy(false)
  }

  if (!edit) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: c.color || 'var(--ink-faint)', flexShrink: 0 }} />
      <b className="num" style={{ minWidth: 34 }}>{c.code}</b>
      <span style={{ color: 'var(--ink-soft)', flex: 1, minWidth: 0 }}>{c.name}</span>
      <span className="num" style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{lawCount} ฉบับ</span>
      <button className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 12 }} onClick={() => setEdit(true)}>แก้ไข</button>
      <button className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 12, opacity: lawCount > 0 ? .4 : 1 }}
        disabled={lawCount > 0}
        title={lawCount > 0 ? `ลบไม่ได้ — มีกฎหมาย ${lawCount} ฉบับอยู่ในหมวดนี้ ย้ายออกให้หมดก่อน` : 'ลบหมวดนี้'}
        onClick={remove}>ลบ</button>
    </div>
  )

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <b className="num" style={{ minWidth: 34 }}>{c.code}</b>
        <input className="form-input" style={{ marginTop: 0 }} value={name} onChange={e => setName(e.target.value)} maxLength={60} />
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, marginLeft: 44 }}>
        {CAT_SWATCHES.map(sw => (
          <button key={sw} onClick={() => setColor(sw)} title={sw} aria-label={`เลือกสี ${sw}`}
            style={{
              width: 24, height: 24, borderRadius: 6, background: sw, cursor: 'pointer',
              border: color === sw ? '2px solid var(--brand)' : '1px solid var(--line)',
            }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, marginLeft: 44 }}>
        <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: 12.5 }}
          disabled={!name.trim() || !dirty || busy} onClick={save}>{busy ? 'กำลังบันทึก…' : 'บันทึก'}</button>
        <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 12.5 }} disabled={busy}
          onClick={() => { setName(c.name || ''); setColor(c.color || CAT_SWATCHES[0]); setEdit(false) }}>ยกเลิก</button>
        <span style={{ fontSize: 11.5, color: 'var(--ink-faint)', alignSelf: 'center' }}>รหัส {c.code} แก้ไม่ได้ — กฎหมายที่บันทึกไว้อ้างอิงรหัสนี้</span>
      </div>
    </div>
  )
}

function CategoryCard({ cats, laws, onAdded }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [color, setColor] = useState(CAT_SWATCHES[1])

  const codeUp = code.trim().toUpperCase()
  const dupe = cats.some(c => String(c.code).toUpperCase() === codeUp)
  const codeBad = codeUp && !/^[A-Z]{2,4}$/.test(codeUp)
  const canSave = codeUp && name.trim() && !dupe && !codeBad && !busy

  function reset() { setCode(''); setName(''); setColor(CAT_SWATCHES[1]); setOpen(false) }

  async function save() {
    if (!canSave) return
    setBusy(true)
    try {
      // ต่อท้ายเสมอ — ไม่แทรกกลางเพื่อไม่ให้ลำดับหมวดเดิมขยับ
      const maxOrder = cats.reduce((m, c) => Math.max(m, Number(c.sort_order) || 0), 0)
      await addCategory({ code: codeUp, name: name.trim(), color, sort_order: maxOrder + 1 })
      toast(`เพิ่มหมวด ${codeUp} แล้ว`, 'success')
      reset()
      onAdded && onAdded()
    } catch (e) { toast('เพิ่มหมวดไม่สำเร็จ: ' + e.message) }
    setBusy(false)
  }

  return (
    <div className="panel" style={{ maxWidth: 560, marginTop: 16 }}>
      <div className="panel-h"><h3>หมวดกฎหมาย ({cats.length})</h3></div>
      <div className="panel-b">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {cats.map(c => (
            <CatRow key={c.code} c={c} onChanged={onAdded}
              lawCount={laws.filter(l => l.cat === c.code).length} />
          ))}
        </div>

        {!open ? (
          <button className="btn btn-ghost" style={{ marginTop: 14 }} onClick={() => setOpen(true)}>+ เพิ่มหมวด</button>
        ) : (
          <div style={{ marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10 }}>
              <div>
                <label className="form-label">รหัส</label>
                <input className="form-input" style={{ marginTop: 0, textTransform: 'uppercase' }} value={code}
                  onChange={e => setCode(e.target.value)} placeholder="เช่น LH" maxLength={4} />
              </div>
              <div>
                <label className="form-label">ชื่อหมวด</label>
                <input className="form-input" style={{ marginTop: 0 }} value={name}
                  onChange={e => setName(e.target.value)} placeholder="เช่น สิ่งแวดล้อมและมลพิษ" maxLength={60} />
              </div>
            </div>

            <label className="form-label" style={{ marginTop: 10 }}>สีประจำหมวด</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CAT_SWATCHES.map(sw => (
                <button key={sw} onClick={() => setColor(sw)} title={sw} aria-label={`เลือกสี ${sw}`}
                  style={{
                    width: 26, height: 26, borderRadius: 7, background: sw, cursor: 'pointer',
                    border: color === sw ? '2px solid var(--brand)' : '1px solid var(--line)',
                    outline: color === sw ? '2px solid var(--brand-tint)' : 'none',
                  }} />
              ))}
            </div>

            {dupe && <p style={{ fontSize: 12, color: 'var(--warn)', marginTop: 10 }}>รหัส {codeUp} มีอยู่แล้ว</p>}
            {codeBad && <p style={{ fontSize: 12, color: 'var(--warn)', marginTop: 10 }}>รหัสต้องเป็นตัวอักษรอังกฤษ 2–4 ตัว เช่น LH</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="btn btn-primary" disabled={!canSave} onClick={save}>{busy ? 'กำลังเพิ่ม…' : 'เพิ่มหมวด'}</button>
              <button className="btn btn-ghost" disabled={busy} onClick={reset}>ยกเลิก</button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 12, lineHeight: 1.6 }}>
              หมวดใหม่จะใช้ได้ทันทีทั้งในทะเบียนและตอนให้ AI สรุปกฎหมาย — รหัสหมวดเปลี่ยนทีหลังไม่ได้ เพราะกฎหมายที่บันทึกไว้อ้างอิงรหัสนี้
            </p>
          </div>
        )}
      </div>
    </div>
  )
}


/* ══ P22 ขั้นที่ 1 · บริบทองค์กร ══════════════════════════════════════════════
   ระบบรู้ว่าตัวบทใช้กับ "ใคร" แต่ไม่เคยรู้ว่า "เรา" เป็นใคร จึงตอบไม่ได้ว่ากฎหมาย
   ฉบับหนึ่งเกี่ยวข้องกับบริษัทหรือไม่ · หน้านี้คือฝั่ง "เรา"

   โครงของแบบฟอร์มไม่ได้คิดเอง — มาจากเหตุผลที่ผู้ใช้เขียนไว้จริงในช่องหมายเหตุของ F-259
   (docs/f259-mapping.md ข้อ 4) ซึ่งแบ่งได้ 4 ประเภท และเรียงตามที่พบบ่อยที่สุด */

// ช่องกรอกรายการหลายบรรทัด — เก็บเป็น array ของ string ใน jsonb
function ListField({ label, hint, value = [], onChange, placeholder }) {
  const text = (value || []).map(v => typeof v === 'string' ? v : JSON.stringify(v)).join('\n')
  return (
    <div style={{ marginTop: 14 }}>
      <label className="form-label">{label}</label>
      {hint && <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', margin: '0 0 5px', lineHeight: 1.5 }}>{hint}</p>}
      <textarea className="form-input" rows={3} style={{ marginTop: 0, resize: 'vertical', lineHeight: 1.6 }}
        placeholder={placeholder} value={text}
        onChange={e => onChange(e.target.value.split('\n').map(s => s.trim()).filter(Boolean))} />
      <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 3 }}>บรรทัดละ 1 รายการ · ตอนนี้ {(value || []).length} รายการ</div>
    </div>
  )
}

const VALUE_CHAIN = ['ผู้ใช้งาน', 'ผู้ให้บริการ', 'ผู้ผลิต', 'ผู้นำเข้า', 'ผู้จำหน่าย']

function CompanyProfileCard() {
  const [p, setP] = useState(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const set = (k, v) => setP(prev => ({ ...prev, [k]: v }))

  useEffect(() => {
    let alive = true
    fetchCompanyProfile()
      .then(d => { if (alive) { setP(d || { ...EMPTY_PROFILE }); setLoading(false) } })
      .catch(() => { if (alive) { setP({ ...EMPTY_PROFILE }); setLoading(false) } })
    return () => { alive = false }
  }, [])

  async function save() {
    if (busy || !p) return
    setBusy(true)
    try {
      const num = v => (v === '' || v === null || v === undefined) ? null : Number(v)
      await saveCompanyProfile({
        business_type: p.business_type || null, workplace_type: p.workplace_type || null,
        employee_count: num(p.employee_count), contractor_count: num(p.contractor_count),
        site_count: num(p.site_count), value_chain_role: p.value_chain_role || null,
        sites: p.sites || [], activities: p.activities || [], machines: p.machines || [],
        chemicals: p.chemicals || [], licenses: p.licenses || [],
        regulator_status: p.regulator_status || [], iso_scope: p.iso_scope || [],
      })
      toast('บันทึกบริบทองค์กรแล้ว', 'success')
    } catch (e) { toast('บันทึกไม่สำเร็จ: ' + e.message) }
    setBusy(false)
  }

  if (loading) return <div className="panel" style={{ maxWidth: 700, padding: 20, fontSize: 13, color: 'var(--ink-faint)' }}>กำลังโหลดบริบทองค์กร…</div>

  const ready = profileReady(p)
  const N = (k, label, hint) => (
    <div>
      <label className="form-label">{label}</label>
      {hint && <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', margin: '0 0 5px', lineHeight: 1.5 }}>{hint}</p>}
      <input className="form-input" type="number" min="0" style={{ marginTop: 0 }}
        value={p[k] ?? ''} onChange={e => set(k, e.target.value)} />
    </div>
  )

  return (
    <div className="panel" style={{ maxWidth: 700 }}>
      <div className="panel-h"><h3>บริบทองค์กร</h3></div>
      <div className="panel-b">
        <div style={{
          padding: '10px 13px', borderRadius: 7, marginBottom: 16, lineHeight: 1.65, fontSize: 12.5,
          background: ready ? 'var(--ok-bg)' : 'var(--warn-bg)', color: ready ? 'var(--ok)' : 'var(--warn)',
        }}>
          {ready
            ? '✓ ข้อมูลเพียงพอสำหรับให้ AI คัดกรองความเกี่ยวข้องของกฎหมายแล้ว'
            : 'ยังกรอกไม่พอสำหรับการคัดกรอง — ต้องมีอย่างน้อย ประเภทกิจการ · ลักษณะสถานประกอบกิจการ · จำนวนลูกจ้าง และรายการกิจกรรม/เครื่องจักร/ใบอนุญาตอย่างน้อย 1 กลุ่ม'}
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.7, marginTop: 0 }}>
          ข้อมูลนี้ใช้เทียบกับเงื่อนไขการใช้บังคับที่เขียนไว้ในตัวบท เพื่อตอบว่ากฎหมายฉบับนั้นเกี่ยวข้องกับบริษัทหรือไม่
          — กรอกเฉพาะที่เป็นความจริง ช่องที่ไม่รู้ให้เว้นว่างไว้ ระบบจะตอบว่า “ต้องข้อมูลเพิ่ม” แทนการเดา
        </p>

        <div style={{ marginTop: 16 }}>
          <label className="form-label">ประเภทกิจการ</label>
          <input className="form-input" style={{ marginTop: 0 }} maxLength={200}
            placeholder="เช่น ผู้ให้บริการโครงข่ายโทรคมนาคมและศูนย์ข้อมูล"
            value={p.business_type || ''} onChange={e => set('business_type', e.target.value)} />
        </div>
        <div style={{ marginTop: 14 }}>
          <label className="form-label">ลักษณะสถานประกอบกิจการ</label>
          <input className="form-input" style={{ marginTop: 0 }} maxLength={200}
            placeholder="เช่น อาคารสำนักงานเช่า ชั้น G และ P10 + ศูนย์ข้อมูล (Data Center)"
            value={p.workplace_type || ''} onChange={e => set('workplace_type', e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12, marginTop: 14 }}>
          {N('employee_count', 'จำนวนลูกจ้าง (คน)', 'เกณฑ์ที่กฎหมายไทยใช้บ่อยที่สุด (10/20/50/100 คน)')}
          {N('contractor_count', 'ผู้รับเหมาประจำ (คน)')}
          {N('site_count', 'จำนวนพื้นที่/สาขา')}
        </div>

        <div style={{ marginTop: 14 }}>
          <label className="form-label">บทบาทในห่วงโซ่ธุรกิจ</label>
          <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', margin: '0 0 6px', lineHeight: 1.5 }}>
            ใช้ตัดกฎหมายที่บังคับเฉพาะผู้ผลิตหรือผู้นำเข้าออก เช่น “เป็นผู้ใช้งานสายใยนำแสง ไม่ใช่ผู้ผลิต”
          </p>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {VALUE_CHAIN.map(v => (
              <span key={v} className={'chip' + (p.value_chain_role === v ? ' active' : '')}
                style={{ cursor: 'pointer' }} onClick={() => set('value_chain_role', p.value_chain_role === v ? '' : v)}>{v}</span>
            ))}
          </div>
        </div>

        <ListField label="สถานะตามรายชื่อของหน่วยงานกำกับ"
          hint="เหตุผลที่อ้างมากที่สุดในทะเบียนเดิม — เช่น “กสทช. แจ้งว่าไม่อยู่ในรายชื่อหน่วยงาน CII”"
          placeholder={'ไม่อยู่ในรายชื่อหน่วยงาน CII ตามที่ กสทช. แจ้ง\nถือใบอนุญาตประกอบกิจการโทรคมนาคมแบบที่สาม'}
          value={p.regulator_status} onChange={v => set('regulator_status', v)} />

        <ListField label="กิจกรรมที่ทำจริง"
          hint="เฉพาะที่ทำจริงในปัจจุบัน ไม่ใช่ที่เคยทำหรืออาจจะทำ"
          placeholder={'ทำงานบนที่สูง\nทำงานในที่อับอากาศ\nทำงานกับไฟฟ้าแรงสูง\nงานก่อสร้าง/ปรับปรุงพื้นที่'}
          value={p.activities} onChange={v => set('activities', v)} />

        <ListField label="เครื่องจักรและอุปกรณ์"
          placeholder={'เครื่องกำเนิดไฟฟ้าสำรอง (ดีเซล 3,000 ลิตร)\nลิฟต์โดยสาร\nระบบปรับอากาศขนาดใหญ่'}
          value={p.machines} onChange={v => set('machines', v)} />

        <ListField label="สารเคมีที่ใช้"
          hint="ระบุปริมาณด้วยถ้าทราบ — กฎหมายหลายฉบับใช้ปริมาณเป็นเกณฑ์"
          placeholder={'น้ำมันดีเซล 3,000 ลิตร (สำรองเครื่องกำเนิดไฟฟ้า)\nกรดซัลฟิวริกในแบตเตอรี่สำรอง'}
          value={p.chemicals} onChange={v => set('chemicals', v)} />

        <ListField label="ใบอนุญาตที่ถือครอง"
          placeholder={'ใบอนุญาตประกอบกิจการโทรคมนาคมแบบที่สาม เลขที่ … (กสทช.)'}
          value={p.licenses} onChange={v => set('licenses', v)} />

        <ListField label="ขอบข่ายมาตรฐานที่รับรอง"
          hint="ตามชีท “ข้อมูลจำเพาะของเอกสาร” ของ F-259 — ใช้อ้างอิงบนหัวกระดาษของรายงานที่พิมพ์"
          placeholder={'ISO 45001 ข้อ 6.1.3\nISO 27001 ข้อ A.18.1\nISO 20000 ข้อ 4.2, 9.1'}
          value={p.iso_scope} onChange={v => set('iso_scope', v)} />

        <div style={{ marginTop: 18 }}>
          <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'กำลังบันทึก…' : 'บันทึกบริบทองค์กร'}</button>
        </div>
        {p.updated_by && (
          <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 12 }}>
            แก้ไขล่าสุดโดย {p.updated_by}{p.updated_at ? ' · ' + new Date(p.updated_at).toLocaleString('th-TH') : ''}
          </p>
        )}
      </div>
    </div>
  )
}

// P20g · การ์ด "อบรมพัฒนาความรู้ จป. (ชั่วโมงสะสม)" ถูกตัดออกจากหน้าตั้งค่าไว้ก่อน
export default function SettingsPage({ settings, onSave, cats = [], laws = [], onCatsChanged }) {
  const [f, setF] = useState(settings)
  const [busy, setBusy] = useState(false)
  // P22 ขั้นที่ 1 · แยกเป็นแท็บ เพราะบริบทองค์กรเป็นข้อมูลคนละชนิดกับการแสดงผล
  // และเป็นหน้าที่ผู้ใช้ต้องกลับมาแก้เมื่อองค์กรเปลี่ยน (จำนวนคน กิจกรรม ใบอนุญาต)
  const [tab, setTab] = useState('org')
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const F = [
    ['company_name', 'ชื่อระบบ / บริษัท (หัวเมนู)'],
    ['brand_mark', 'อักษรย่อโลโก้ (เช่น CR)'],
    ['org_name', 'ชื่อองค์กร (มุมล่าง)'],
    ['user_name', 'ชื่อผู้ใช้ (มุมล่าง)'],
  ]
  async function save() { setBusy(true); try { await onSave(f) } catch (e) { toast('บันทึกไม่สำเร็จ: ' + e.message) } setBusy(false) }
  const TABS = [['org', 'ข้อมูลองค์กร & การแสดงผล'], ['context', 'บริบทองค์กร (ใช้คัดกรองกฎหมาย)']]
  return (
    <div className="view">
      <div className="seg" style={{ marginBottom: 16 }}>
        {TABS.map(([k, label]) => (
          <button key={k} className={'seg-btn' + (tab === k ? ' active' : '')} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === 'context' && <CompanyProfileCard />}

      {tab === 'org' && <>
      <div className="panel" style={{ maxWidth: 560 }}>
        <div className="panel-h"><h3>ข้อมูลองค์กร & การแสดงผล</h3></div>
        <div className="panel-b">
          {F.map(([k, label]) => (
            <div key={k}><label className="form-label">{label}</label>
              <input className="form-input" value={f[k] || ''} onChange={e => set(k, e.target.value)} maxLength={k === 'brand_mark' ? 4 : 80} /></div>
          ))}
          <div style={{ marginTop: 16 }}>
            <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'กำลังบันทึก…' : 'บันทึกการตั้งค่า'}</button>
          </div>
          <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 14, lineHeight: 1.6 }}>การเปลี่ยนแปลงจะแสดงผลที่หัวเมนูและมุมล่างของแถบด้านข้างทันที</p>
        </div>
      </div>

      <CategoryCard cats={cats} laws={laws} onAdded={onCatsChanged} />
      </>}
    </div>
  )
}
