import { useEffect, useState } from 'react'
import { uploadAttachment, fetchAttachments, deleteAttachment } from '../lib/supabase.js'
import { toast } from '../lib/toast.js'
import { confirmDialog } from '../lib/confirm.js'
import { I } from './icons.jsx'
import { thDate } from '../lib/ui.jsx'

// Reusable real-file attachment list. Self-manages fetch/upload/delete against lg_attachments.
// refId falsy → prompt to save the parent record first.
export default function Attachments({ refType, refId, onCountChange }) {
  const [files, setFiles] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    if (refId) fetchAttachments(refType, refId).then(d => { if (alive) { setFiles(d); onCountChange?.(d.length) } }).catch(() => {})
    else setFiles([])
    return () => { alive = false }
  }, [refType, refId])   // eslint-disable-line react-hooks/exhaustive-deps

  async function onPick(e) {
    const list = [...(e.target.files || [])]
    e.target.value = ''
    if (!list.length) return
    setBusy(true)
    try {
      const created = []
      for (const f of list) created.push(await uploadAttachment(f, refType, refId))
      setFiles(prev => { const next = [...created, ...prev]; onCountChange?.(next.length); return next })
      toast(`แนบไฟล์แล้ว ${created.length} ไฟล์`, 'success')
    } catch (err) { toast('แนบไฟล์ไม่สำเร็จ: ' + err.message) }
    setBusy(false)
  }

  async function remove(a) {
    if (!(await confirmDialog(`ลบไฟล์ ${a.file_name || 'นี้'}?`, { danger: true }))) return
    try {
      await deleteAttachment(a.id)
      setFiles(prev => { const next = prev.filter(x => x.id !== a.id); onCountChange?.(next.length); return next })
      toast('ลบไฟล์แล้ว', 'success')
    } catch (err) { toast('ลบไม่สำเร็จ: ' + err.message) }
  }

  if (!refId) return <p style={{ fontSize: 12, color: 'var(--ink-faint)' }}>บันทึกรายการก่อน จึงจะแนบไฟล์ได้</p>

  return (
    <div>
      {files.length === 0 && <p style={{ fontSize: 12, color: 'var(--ink-faint)' }}>ยังไม่มีไฟล์แนบ</p>}
      {files.map(a => (
        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--line-soft)' }}>
          <span style={{ fontSize: 14 }}>📎</span>
          <span style={{ flex: 1, fontSize: 12.5, wordBreak: 'break-all' }}>{a.file_name || 'ไฟล์แนบ'}</span>
          <span style={{ fontSize: 11, color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>{thDate(a.uploaded_at)}{a.uploaded_by ? ' · ' + a.uploaded_by : ''}</span>
          <a className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 11 }} href={a.file_url} target="_blank" rel="noreferrer">เปิด</a>
          <button className="btn btn-ghost" style={{ padding: '3px 9px', fontSize: 11 }} onClick={() => remove(a)}>ลบ</button>
        </div>
      ))}
      <label className="btn btn-ghost" style={{ marginTop: 10, cursor: busy ? 'default' : 'pointer' }}>
        {busy ? 'กำลังอัปโหลด…' : <><I n="plus" />แนบไฟล์</>}
        <input type="file" multiple style={{ display: 'none' }} disabled={busy} onChange={onPick} />
      </label>
    </div>
  )
}
