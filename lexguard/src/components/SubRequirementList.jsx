// P24 · Checklist ข้อย่อยของข้อกำหนด 1 ข้อ
//
// ปัญหาที่แก้: ประเมินได้ละเอียดสุดที่ระดับข้อกำหนด จึงบอกได้แค่สอดคล้อง/ไม่สอดคล้อง
// ตอบไม่ได้ว่าไม่สอดคล้องตรงจุดใด และต้องทำอะไรจึงจะปิดได้
//
// หลักการออกแบบ: ผู้ประเมินต้อง "อ่านแล้วตัดสินใจได้ทันทีโดยไม่ต้องเปิดตัวบท"
//   · 3 ปุ่มใหญ่ กดครั้งเดียวจบ
//   · สิ่งที่ต้องทำ + หลักฐานที่ต้องมี แสดงใต้ชื่อข้อย่อยเลย
//   · กด "ยังไม่ทำ" แล้วช่องหมายเหตุเปิดเอง เพราะต้องกรอกอยู่แล้ว (ฐานข้อมูลบังคับ)
//   · ปุ่ม "ทำแล้วทั้งหมด" สำหรับฉบับที่ปฏิบัติครบ แล้วค่อยแก้เฉพาะข้อที่ไม่ผ่าน
import { useState } from 'react'
import { RISK, RISK_ORDER, subKind, SUB_STATUS, setSubCheck, markAllSubMet,
         deleteSubRequirement, addSubRequirement, runSubBreakdown, uploadEvidence } from '../lib/supabase.js'
import { useAuth, NO_PERM } from '../lib/auth.js'
import { useAiAction } from '../lib/aiAction.js'
import { toast } from '../lib/toast.js'
import { confirmDialog } from '../lib/confirm.js'

// ป้ายความเสี่ยง — สี + ข้อความเสมอ (กติกาข้อ 8 · ห้ามใช้สีสื่อความหมายอย่างเดียว)
export function RiskBadge({ level, compact }) {
  const r = RISK[level] || RISK.medium
  return (
    <span title={r.desc} style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0,
      fontSize: compact ? 10 : 10.5, fontWeight: 600, padding: '1px 7px', borderRadius: 999,
      color: r.color, background: r.bg, border: `1px solid ${r.color}33`, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: r.color }} />
      เสี่ยง{r.short}
    </span>
  )
}

export function ProgressBar({ p }) {
  if (!p || !p.total) return null
  const done = p.met + p.unmet + p.na
  const pct = Math.round(done / p.total * 100)
  return (
    <div style={{ flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 3 }}>
        ประเมินแล้ว {done} จาก {p.total} ข้อ
        {p.unmet > 0 && <span style={{ color: 'var(--bad)' }}> · ยังไม่ทำ {p.unmet}</span>}
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden', display: 'flex' }}>
        <span style={{ width: `${p.met / p.total * 100}%`, background: 'var(--ok)' }} />
        <span style={{ width: `${p.unmet / p.total * 100}%`, background: 'var(--bad)' }} />
        <span style={{ width: `${p.na / p.total * 100}%`, background: 'var(--ink-faint)' }} />
      </div>
    </div>
  )
}

function CheckButtons({ sub, disabled, onPick }) {
  const k = subKind(sub)
  const B = [
    ['met', 'ทำแล้ว', 'var(--ok)'],
    ['unmet', 'ยังไม่ทำ', 'var(--bad)'],
    ['na', 'ไม่เกี่ยวข้อง', 'var(--ink-faint)'],
  ]
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {B.map(([key, label, color]) => {
        const on = k === key
        return (
          <button key={key} type="button" disabled={disabled}
            onClick={() => onPick(on ? 'clear' : key)}
            title={on ? 'กดอีกครั้งเพื่อยกเลิกการติ๊ก' : label}
            style={{
              padding: '6px 14px', fontSize: 12.5, fontWeight: 600, borderRadius: 8, cursor: disabled ? 'default' : 'pointer',
              border: `1px solid ${on ? color : 'var(--line)'}`,
              background: on ? color : 'transparent', color: on ? '#fff' : 'var(--ink-soft)',
              opacity: disabled ? .5 : 1,
            }}>{label}</button>
        )
      })}
    </div>
  )
}

export default function SubRequirementList({ req, subs = [], progress, onChanged }) {
  const { can } = useAuth()
  const ai = useAiAction()
  const [busyId, setBusyId] = useState(null)
  const [noteFor, setNoteFor] = useState(null)     // id ที่กำลังเปิดช่องหมายเหตุ
  const [noteText, setNoteText] = useState('')
  const [uploading, setUploading] = useState(null)
  // เพิ่มข้อย่อยเอง — ต้องมี เพราะถ้าเครดิต AI หมด ฟีเจอร์นี้จะใช้ไม่ได้เลย
  // และบางข้อกำหนดผู้ประเมินรู้ดีกว่า AI ว่าควรแตกอย่างไร
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ title:'', action_required:'', evidence_required:'', risk_level:'medium' })
  const [savingNew, setSavingNew] = useState(false)

  async function pick(sub, kind) {
    if (kind === 'unmet') {           // ต้องมีหมายเหตุก่อน — เปิดช่องให้กรอกทันที
      setNoteFor(sub.id); setNoteText(sub.check_note || ''); return
    }
    setBusyId(sub.id)
    try { await setSubCheck(sub, kind); onChanged && onChanged() }
    catch (e) { toast('บันทึกไม่สำเร็จ: ' + e.message) }
    setBusyId(null)
  }

  async function saveUnmet(sub) {
    if (!noteText.trim()) { toast('ระบุหมายเหตุว่าติดตรงไหน ก่อนบันทึกว่ายังไม่ทำ'); return }
    setBusyId(sub.id)
    try { await setSubCheck(sub, 'unmet', { note: noteText }); setNoteFor(null); setNoteText(''); onChanged && onChanged() }
    catch (e) { toast('บันทึกไม่สำเร็จ: ' + e.message) }
    setBusyId(null)
  }

  async function attach(sub, file) {
    if (!file) return
    setUploading(sub.id)
    try {
      const url = await uploadEvidence(file)
      await setSubCheck(sub, subKind(sub) === 'pending' ? 'met' : subKind(sub),
        { note: sub.check_note || '', evidence: { url, label: file.name } })
      onChanged && onChanged()
      toast('แนบหลักฐานแล้ว', 'success')
    } catch (e) { toast('แนบหลักฐานไม่สำเร็จ: ' + e.message) }
    setUploading(null)
  }

  async function allMet() {
    const n = subs.filter(s => s.is_met === null && !s.is_na).length
    if (!n) { toast('ทุกข้อประเมินแล้ว'); return }
    if (!(await confirmDialog(`ทำเครื่องหมาย "ทำแล้ว" ให้ข้อย่อยที่ยังไม่ได้ประเมิน ${n} ข้อ?`,
      { okLabel: 'ทำแล้วทั้งหมด' }))) return
    try { const r = await markAllSubMet(subs); toast(`บันทึก ${r.updated} ข้อ`, 'success'); onChanged && onChanged() }
    catch (e) { toast('บันทึกไม่สำเร็จ: ' + e.message) }
  }

  async function saveNew() {
    if (!form.title.trim() || savingNew) return
    setSavingNew(true)
    try {
      await addSubRequirement(req, form)
      setForm({ title:'', action_required:'', evidence_required:'', risk_level:'medium' })
      setAdding(false); onChanged && onChanged()
      toast('เพิ่มข้อย่อยแล้ว', 'success')
    } catch (e) { toast('เพิ่มไม่สำเร็จ: ' + e.message) }
    setSavingNew(false)
  }

  const AddForm = () => (
    <div style={{ marginTop: 9, padding: '12px 14px', borderRadius: 8, border: '1px dashed var(--brand)' }}>
      <label className="form-label">ชื่อข้อย่อย <span style={{ color: 'var(--bad)' }}>*</span></label>
      <input className="form-input" style={{ marginTop: 0 }} autoFocus maxLength={200}
        placeholder="เช่น เก็บรายงานผลการตรวจวัดไว้ไม่น้อยกว่า 5 ปี"
        value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
      <label className="form-label" style={{ marginTop: 9 }}>สิ่งที่ต้องทำ</label>
      <textarea className="form-input" rows={2} style={{ marginTop: 0, resize: 'vertical' }}
        placeholder="ประโยคคำสั่งที่ลงมือทำได้จริง ไม่ต้องใส่เลขมาตรา"
        value={form.action_required} onChange={e => setForm(f => ({ ...f, action_required: e.target.value }))} />
      <label className="form-label" style={{ marginTop: 9 }}>หลักฐานที่ต้องมี</label>
      <input className="form-input" style={{ marginTop: 0 }} maxLength={300}
        placeholder="ชื่อเอกสารที่ผู้ตรวจขอดูได้จริง"
        value={form.evidence_required} onChange={e => setForm(f => ({ ...f, evidence_required: e.target.value }))} />
      <label className="form-label" style={{ marginTop: 9 }}>ความเสี่ยงหากไม่ปฏิบัติ</label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {RISK_ORDER.map(k => (
          <button key={k} type="button" title={RISK[k].desc}
            onClick={() => setForm(f => ({ ...f, risk_level: k }))}
            style={{
              padding: '5px 12px', fontSize: 12, borderRadius: 8, cursor: 'pointer', fontWeight: 600,
              border: `1px solid ${form.risk_level === k ? RISK[k].color : 'var(--line)'}`,
              background: form.risk_level === k ? RISK[k].bg : 'transparent',
              color: form.risk_level === k ? RISK[k].color : 'var(--ink-soft)',
            }}>{RISK[k].label}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="btn btn-primary" style={{ padding: '5px 13px', fontSize: 12.5 }}
          disabled={!form.title.trim() || savingNew} onClick={saveNew}>
          {savingNew ? 'กำลังบันทึก…' : 'เพิ่มข้อย่อย'}
        </button>
        <button className="btn btn-ghost" style={{ padding: '5px 13px', fontSize: 12.5 }}
          disabled={savingNew} onClick={() => setAdding(false)}>ยกเลิก</button>
      </div>
    </div>
  )

  function breakdown(regenerate) {
    return ai.run('bd', async () => {
      const r = await runSubBreakdown(req.id, { regenerate })
      onChanged && onChanged()
      toast(r.reused ? 'ฉบับนี้มีข้อย่อยอยู่แล้ว' : `แตกเป็นข้อย่อย ${r.items?.length || 0} ข้อ — ตรวจทานก่อนใช้ประเมิน`, 'success')
    }, { errorPrefix: 'แตกข้อย่อยไม่สำเร็จ' })
  }

  // ── ยังไม่เคยแตกข้อย่อย ──
  if (!subs.length) return (
    <div style={{ marginTop: 9, padding: '11px 13px', borderRadius: 8, background: 'var(--surface-2)', border: '1px dashed var(--line)' }}>
      <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.7, margin: 0 }}>
        ข้อกำหนดนี้ยังไม่ถูกแตกเป็นข้อย่อย — การประเมินจึงทำได้แค่ทั้งข้อ
        บอกไม่ได้ว่าไม่สอดคล้องตรงจุดใด
      </p>
      <div style={{ display: 'flex', gap: 8, marginTop: 9, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost" style={{ padding: '4px 11px', fontSize: 12 }}
          disabled={ai.busy || !can('edit')} title={can('edit') ? '' : NO_PERM} onClick={() => breakdown(false)}>
          {ai.isBusy('bd') ? 'กำลังแตกข้อย่อย…' : 'แตกเป็นข้อย่อยด้วย AI'}
        </button>
        <button className="btn btn-ghost" style={{ padding: '4px 11px', fontSize: 12 }}
          disabled={!can('edit')} title={can('edit') ? '' : NO_PERM} onClick={() => setAdding(true)}>
          + เพิ่มข้อย่อยเอง
        </button>
      </div>
      {adding && <AddForm />}
    </div>
  )

  const pending = subs.filter(s => s.is_met === null && !s.is_na).length

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        <ProgressBar p={progress} />
        {pending > 0 && can('edit') && (
          <button className="btn btn-ghost" style={{ padding: '4px 11px', fontSize: 12 }} onClick={allMet}>
            ทำแล้วทั้งหมด ({pending})
          </button>
        )}
        <button className="btn btn-ghost" style={{ padding: '4px 11px', fontSize: 12 }}
          disabled={ai.busy || !can('edit')} title="สร้างข้อย่อยใหม่ — ข้อที่ติ๊กไปแล้วจะไม่ถูกลบ"
          onClick={() => breakdown(true)}>
          {ai.isBusy('bd') ? 'กำลังแตก…' : 'แตกใหม่'}
        </button>
        {can('edit') && !adding && (
          <button className="btn btn-ghost" style={{ padding: '4px 11px', fontSize: 12 }}
            onClick={() => setAdding(true)}>+ เพิ่มเอง</button>
        )}
      </div>
      {adding && <AddForm />}

      {subs.map((s, i) => {
        const k = subKind(s)
        const st = SUB_STATUS[k]
        const editing = noteFor === s.id
        return (
          <div key={s.id} style={{
            padding: '11px 13px', borderRadius: 8, marginBottom: 8,
            border: '1px solid var(--line)',
            background: k === 'unmet' ? 'var(--bad-bg)' : k === 'met' ? 'var(--ok-bg)' : 'var(--surface)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-faint)', minWidth: 18 }}>{i + 1}.</span>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.5 }}>{s.title}</div>
                {s.action_required && (
                  <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 4, lineHeight: 1.65 }}>
                    <b style={{ color: 'var(--ink-faint)' }}>ต้องทำ:</b> {s.action_required}
                  </div>
                )}
                {s.evidence_required && (
                  <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2, lineHeight: 1.65 }}>
                    <b style={{ color: 'var(--ink-faint)' }}>หลักฐาน:</b> {s.evidence_required}
                  </div>
                )}
                {s.note && (
                  <div style={{ fontSize: 11.5, color: 'var(--warn)', marginTop: 3, lineHeight: 1.6 }}>หมายเหตุตัวบท: {s.note}</div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
                <RiskBadge level={s.risk_level} />
                <span className={'pill ' + st.cls} style={{ fontSize: 10 }}>{st.label}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 9, flexWrap: 'wrap' }}>
              {can('edit')
                ? <CheckButtons sub={s} disabled={busyId === s.id} onPick={kind => pick(s, kind)} />
                : <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{NO_PERM}</span>}
              {s.evidence_url
                ? <a href={s.evidence_url} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: 'var(--brand)' }}>
                    📎 {s.evidence_label || 'หลักฐาน'} ↗</a>
                : can('edit') && (
                  <label style={{ fontSize: 11.5, color: 'var(--brand)', cursor: 'pointer' }}>
                    {uploading === s.id ? 'กำลังอัปโหลด…' : '＋ แนบหลักฐาน'}
                    <input type="file" accept="application/pdf,image/*" style={{ display: 'none' }}
                      disabled={uploading === s.id} onChange={e => { attach(s, e.target.files?.[0]); e.target.value = '' }} />
                  </label>
                )}
              {s.generated_by === 'manual' && can('delete') && (
                <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: 11, marginLeft: 'auto' }}
                  onClick={async () => {
                    if (!(await confirmDialog(`ลบข้อย่อย "${s.title}"?`, { danger: true }))) return
                    try { await deleteSubRequirement(s.id); onChanged && onChanged() }
                    catch (e) { toast('ลบไม่สำเร็จ: ' + e.message) }
                  }}>ลบ</button>
              )}
            </div>

            {/* กด "ยังไม่ทำ" → ช่องหมายเหตุเปิดเอง เพราะฐานข้อมูลบังคับให้ต้องมี */}
            {editing && (
              <div style={{ marginTop: 9, paddingTop: 9, borderTop: '1px solid var(--line-soft)' }}>
                <label className="form-label">ติดตรงไหน / ต้องทำอะไรจึงจะปิดได้ <span style={{ color: 'var(--bad)' }}>*</span></label>
                <textarea className="form-input" rows={2} style={{ marginTop: 0, resize: 'vertical' }} autoFocus
                  placeholder="เช่น ตรวจวัดแล้วแต่เก็บผลไว้เพียง 2 ปี ยังไม่ครบ 5 ปีตามที่กำหนด"
                  value={noteText} onChange={e => setNoteText(e.target.value)} />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: 12 }}
                    disabled={busyId === s.id || !noteText.trim()} onClick={() => saveUnmet(s)}>
                    {busyId === s.id ? 'กำลังบันทึก…' : 'บันทึกว่ายังไม่ทำ'}
                  </button>
                  <button className="btn btn-ghost" style={{ padding: '4px 12px', fontSize: 12 }}
                    onClick={() => { setNoteFor(null); setNoteText('') }}>ยกเลิก</button>
                </div>
              </div>
            )}

            {!editing && s.check_note && (
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 7, lineHeight: 1.6 }}>
                <b style={{ color: 'var(--ink-faint)' }}>หมายเหตุ:</b> {s.check_note}
                {s.checked_by && <span style={{ color: 'var(--ink-faint)' }}> · {s.checked_by}</span>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
