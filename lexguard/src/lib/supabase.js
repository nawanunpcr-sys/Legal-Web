import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const hasSupabase = Boolean(url && key)
export const supabase = hasSupabase ? createClient(url, key) : null

// Thai hierarchy tier labels — used for grouping within a category
export const LAW_TYPES = [
  { level: 1, label: 'พระราชบัญญัติ / พระราชกำหนด' },
  { level: 2, label: 'พระราชกฤษฎีกา' },
  { level: 3, label: 'กฎกระทรวง' },
  { level: 4, label: 'ประกาศกระทรวง / ระเบียบ' },
  { level: 5, label: 'คำสั่ง / ประกาศอื่นๆ' },
]

export const STATUS = {
  ok:      { label: 'สอดคล้อง',        cls: 'p-ok'      },
  bad:     { label: 'ยังไม่สอดคล้อง',  cls: 'p-bad'     },
  repealed:{ label: 'ถูกยกเลิกแล้ว',   cls: 'p-repealed' },
}

export const RECURRENCE_LABELS = {
  once:      'ครั้งเดียว',
  monthly:   'รายเดือน',
  quarterly: 'รายไตรมาส',
  annually:  'รายปี',
  asneeded:  'ตามความจำเป็น',
}

// ---- Data access ----
export async function fetchAll() {
  const [
    { data: cats },
    { data: laws },
    { data: reqs },
    { data: comms },
    { data: notifs },
  ] = await Promise.all([
    supabase.from('lg_categories').select('*').order('sort_order'),
    supabase.from('lg_laws').select('*').order('code'),
    supabase.from('lg_requirements').select('*').order('seq'),
    supabase.from('lg_communications').select('*').order('id'),
    supabase.from('lg_notification_log').select('*').is('dismissed_at', null).order('created_at', { ascending: false }).limit(50),
  ])
  const reqByLaw = {}
  ;(reqs || []).forEach(r => { (reqByLaw[r.law_id] = reqByLaw[r.law_id] || []).push(r) })
  const fullLaws = (laws || []).map(l => ({ ...l, reqs: reqByLaw[l.id] || [] }))
  return { cats: cats || [], laws: fullLaws, comms: comms || [], notifs: notifs || [] }
}

// ---- Law mutations ----
export async function setRequirementStatus(reqId, status) {
  const { error } = await supabase.from('lg_requirements').update({ status }).eq('id', reqId)
  if (error) throw error
}

export async function recomputeLawStatus(lawId, reqs) {
  const anyUnmet = reqs.some(r => r.status === 'unmet')
  const status = anyUnmet ? 'bad' : 'ok'
  await supabase.from('lg_laws').update({ status, updated_at: new Date().toISOString() }).eq('id', lawId)
  return status
}

export async function updateLawField(lawId, patch) {
  const { error } = await supabase.from('lg_laws').update(patch).eq('id', lawId)
  if (error) throw error
}

export async function repealLaw(lawId, { repeal_date, repeal_reason, replaced_by_code, repealed_by_authority }) {
  const { error } = await supabase.from('lg_laws').update({
    status: 'repealed',
    repeal_date,
    repeal_reason,
    replaced_by_code: replaced_by_code || null,
    repealed_by_authority: repealed_by_authority || null,
    updated_at: new Date().toISOString(),
  }).eq('id', lawId)
  if (error) throw error
  // log it
  await supabase.from('lg_notification_log').insert({
    type: 'law_repealed',
    ref_id: lawId,
    ref_type: 'law',
    message: `กฎหมายถูกยกเลิก — ${repeal_reason || ''}`,
    due_date: repeal_date,
  })
}

export async function restoreLaw(lawId) {
  const { error } = await supabase.from('lg_laws').update({
    status: 'ok',
    repeal_date: null,
    repeal_reason: null,
    replaced_by_code: null,
    repealed_by_authority: null,
    updated_at: new Date().toISOString(),
  }).eq('id', lawId)
  if (error) throw error
}

// ---- Communication mutations ----
export async function markCommSent(commId, fileReference) {
  const { data: comm, error: fetchErr } = await supabase
    .from('lg_communications').select('recurrence_type,next_scheduled_date,scheduled_date').eq('id', commId).single()
  if (fetchErr) throw fetchErr

  const base = new Date(comm.next_scheduled_date || comm.scheduled_date || new Date())
  let next = null
  if (comm.recurrence_type === 'monthly') {
    next = new Date(base); next.setMonth(next.getMonth() + 1)
  } else if (comm.recurrence_type === 'quarterly') {
    next = new Date(base); next.setMonth(next.getMonth() + 3)
  } else if (comm.recurrence_type === 'annually') {
    next = new Date(base); next.setFullYear(next.getFullYear() + 1)
  }

  const patch = {
    last_sent_at: new Date().toISOString(),
    file_reference: fileReference || null,
    next_scheduled_date: next ? next.toISOString().slice(0, 10) : null,
  }
  const { error } = await supabase.from('lg_communications').update(patch).eq('id', commId)
  if (error) throw error

  await supabase.from('lg_notification_log').insert({
    type: 'comm_submitted',
    ref_id: commId,
    ref_type: 'comm',
    message: `บันทึกการสื่อสารเรียบร้อย${fileReference ? ` — ไฟล์: ${fileReference}` : ''}`,
    due_date: next ? next.toISOString().slice(0, 10) : null,
  })
}

export async function updateCommSchedule(commId, patch) {
  const { error } = await supabase.from('lg_communications').update(patch).eq('id', commId)
  if (error) throw error
}

// ---- Notifications ----
export async function dismissNotification(id) {
  await supabase.from('lg_notification_log').update({ dismissed_at: new Date().toISOString() }).eq('id', id)
}
