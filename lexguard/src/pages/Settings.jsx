// Settings page — org profile & display settings (admin only; gated in App).
// Moved verbatim from App.jsx (pure refactor).
import { useState } from 'react'
import { toast } from '../lib/toast.js'
import { confirmDialog } from '../lib/confirm.js'
import { addCategory, updateCategory, deleteCategory } from '../lib/supabase.js'

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

// P20g · การ์ด "อบรมพัฒนาความรู้ จป. (ชั่วโมงสะสม)" ถูกตัดออกจากหน้าตั้งค่าไว้ก่อน
export default function SettingsPage({ settings, onSave, cats = [], laws = [], onCatsChanged }) {
  const [f, setF] = useState(settings)
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const F = [
    ['company_name', 'ชื่อระบบ / บริษัท (หัวเมนู)'],
    ['brand_mark', 'อักษรย่อโลโก้ (เช่น CR)'],
    ['org_name', 'ชื่อองค์กร (มุมล่าง)'],
    ['user_name', 'ชื่อผู้ใช้ (มุมล่าง)'],
  ]
  async function save() { setBusy(true); try { await onSave(f) } catch (e) { toast('บันทึกไม่สำเร็จ: ' + e.message) } setBusy(false) }
  return (
    <div className="view">
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
    </div>
  )
}
