import { createClient } from '@supabase/supabase-js'
import { currentUserName } from './auth.js'

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
  once:         'ครั้งเดียว',
  monthly:      'รายเดือน',
  quarterly:    'รายไตรมาส',
  semiannually: 'ปีละ 2 ครั้ง',
  annually:     'รายปี',
  asneeded:     'ตามความจำเป็น',
}

// Advance a date by one recurrence interval (returns Date or null)
export function advanceByRecurrence(baseDate, recurrence) {
  const d = new Date(baseDate)
  switch (recurrence) {
    case 'monthly':      d.setMonth(d.getMonth() + 1); return d
    case 'quarterly':    d.setMonth(d.getMonth() + 3); return d
    case 'semiannually': d.setMonth(d.getMonth() + 6); return d
    case 'annually':     d.setFullYear(d.getFullYear() + 1); return d
    default:             return null  // once / asneeded
  }
}

// ---- Settings ----
export const DEFAULT_SETTINGS = { company_name:'ComplyRegister', subtitle:'ทะเบียนกฎหมาย SHE', org_name:'จัสเทล เน็ทเวิร์ค', user_name:'จป. วิชาชีพ', brand_mark:'CR' }
export async function fetchSettings() {
  if (!hasSupabase) return { ...DEFAULT_SETTINGS }
  const { data } = await supabase.from('lg_settings').select('*').eq('id', 1).maybeSingle()
  return { ...DEFAULT_SETTINGS, ...(data || {}) }
}
export async function saveSettings(patch) {
  const { error } = await supabase.from('lg_settings').upsert({ id: 1, ...patch, updated_at: new Date().toISOString() })
  if (error) throw error
}

// ---- Auth ----
export async function getSession() {
  if (!hasSupabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session
}
export function onAuthChange(cb) {
  if (!hasSupabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_e, session) => cb(session))
  return () => data.subscription.unsubscribe()
}
export async function signIn(email, password) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session
}
export async function signUp(email, password) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return data.session
}
export async function signOut() {
  if (hasSupabase) await supabase.auth.signOut()
}
export async function signInWithOAuth(provider) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  })
  if (error) throw error
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
  // stamp who/when evaluated compliance for this requirement
  const { error } = await supabase.from('lg_requirements')
    .update({ status, evaluated_at: new Date().toISOString(), evaluated_by: currentUserName() })
    .eq('id', reqId)
  if (error) throw error
}

// Update evidence / other fields on a single requirement
export async function updateRequirementField(reqId, patch) {
  const { error } = await supabase.from('lg_requirements').update(patch).eq('id', reqId)
  if (error) throw error
}

// Bulk: set all requirements of given laws to met/unmet, then sync law status
export async function bulkSetCompliance(lawIds, met = true) {
  if (!lawIds.length) return
  const status = met ? 'met' : 'unmet'
  const { error } = await supabase.from('lg_requirements')
    .update({ status, evaluated_at: new Date().toISOString(), evaluated_by: currentUserName() })
    .in('law_id', lawIds)
  if (error) throw error
  await supabase.from('lg_laws').update({ status: met ? 'ok' : 'bad', updated_at: new Date().toISOString() }).in('id', lawIds)
}

export async function recomputeLawStatus(lawId, reqs) {
  const anyUnmet = reqs.some(r => r.status === 'unmet')
  const status = anyUnmet ? 'bad' : 'ok'
  await supabase.from('lg_laws').update({ status, updated_at: new Date().toISOString() }).eq('id', lawId)
  return status
}

export async function setLawActive(lawId, active) {
  const { error } = await supabase.from('lg_laws').update({ active, updated_at: new Date().toISOString() }).eq('id', lawId)
  if (error) throw error
}

export async function updateLawField(lawId, patch) {
  const { error } = await supabase.from('lg_laws').update(patch).eq('id', lawId)
  if (error) throw error
}

// ---- Quarterly added/repealed stats (drives the dashboard chart) ----
// Keeps lg_law_quarter_stats in sync with real create/repeal/restore actions,
// bucketed by the date the action happened in the system (not the law's own date).
function quarterOf(date) {
  const d = new Date(date || Date.now())
  return { year: d.getFullYear(), quarter: Math.floor(d.getMonth() / 3) + 1 }
}
export async function bumpQuarterStat(cat, field, delta, atDate) {
  if (!hasSupabase || !cat || !delta) return
  const { year, quarter } = quarterOf(atDate)
  try {
    const { data } = await supabase.from('lg_law_quarter_stats').select('id,added,repealed')
      .eq('year', year).eq('quarter', quarter).eq('cat', cat).maybeSingle()
    if (data) {
      const next = Math.max(0, (data[field] || 0) + delta)
      await supabase.from('lg_law_quarter_stats').update({ [field]: next }).eq('id', data.id)
    } else if (delta > 0) {
      await supabase.from('lg_law_quarter_stats').insert({ year, quarter, cat, [field]: delta })
    }
  } catch (e) { console.warn('bumpQuarterStat failed', e) }
}

export async function repealLaw(lawId, { repeal_date, repeal_reason, replaced_by_code, repealed_by_authority }) {
  const { data: law, error } = await supabase.from('lg_laws').update({
    status: 'repealed',
    repeal_date,
    repeal_reason,
    replaced_by_code: replaced_by_code || null,
    repealed_by_authority: repealed_by_authority || null,
    updated_at: new Date().toISOString(),
  }).eq('id', lawId).select('cat').single()
  if (error) throw error
  // log it
  await supabase.from('lg_notification_log').insert({
    type: 'law_repealed',
    ref_id: lawId,
    ref_type: 'law',
    message: `กฎหมายถูกยกเลิก — ${repeal_reason || ''}`,
    due_date: repeal_date,
  })
  await bumpQuarterStat(law?.cat, 'repealed', 1)
}

export async function createLaw({ code, cat, name, hierarchy_level, ministry, announce_date, effective_date, doc_list, responsible, review_date }) {
  const { data, error } = await supabase.from('lg_laws').insert({
    code,
    cat,
    name,
    hierarchy_level: hierarchy_level ? Number(hierarchy_level) : null,
    ministry: ministry || null,
    issue_date: announce_date || null,
    effective_date: effective_date || null,
    doc_list: doc_list || null,
    responsible: responsible || null,
    review_date: review_date || null,
    status: 'ok',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).select().single()
  if (error) throw error
  await bumpQuarterStat(cat, 'added', 1)
  return { ...data, reqs: [] }
}

// Create a law together with its requirement sub-items (manual entry)
export async function createLawFull({ code, cat, name, hierarchy_level, ministry, announce_date, effective_date, doc_list, responsible, review_date, source_url }, reqs = []) {
  const clean = (reqs || []).filter(r => (r.text || '').trim())
  const anyUnmet = clean.some(r => r.status === 'unmet')
  const { data, error } = await supabase.from('lg_laws').insert({
    code, cat, name,
    hierarchy_level: hierarchy_level ? Number(hierarchy_level) : null,
    ministry: ministry || null,
    issue_date: announce_date || null,
    effective_date: effective_date || null,
    doc_list: doc_list || null,
    responsible: responsible || null,
    review_date: review_date || null,
    source_url: source_url || null,
    status: clean.length ? (anyUnmet ? 'bad' : 'ok') : 'ok',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).select().single()
  if (error) throw error
  await bumpQuarterStat(cat, 'added', 1)
  if (clean.length) {
    const rows = clean.map((r, i) => ({
      law_id: data.id, seq: i, text: r.text.trim(), status: r.status || 'met',
      responsible: r.responsible || null, frequency: r.frequency || null, documents: r.documents || null,
    }))
    const { error: e2 } = await supabase.from('lg_requirements').insert(rows)
    if (e2) throw e2
    return { ...data, reqs: rows }
  }
  return { ...data, reqs: [] }
}

// Upload an original law document (PDF) to Storage → returns public URL
export async function uploadLawDoc(file) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')
  const safe = file.name.replace(/[^\w.\-]+/g, '_')
  const path = `${Date.now()}_${safe}`
  const { error } = await supabase.storage.from('law-docs').upload(path, file, { upsert: false, contentType: file.type || undefined })
  if (error) throw error
  return supabase.storage.from('law-docs').getPublicUrl(path).data.publicUrl
}

// Upload a compliance-evidence file → law-docs bucket, evidence/ folder (reuses uploadLawDoc pattern)
export async function uploadEvidence(file) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')
  const safe = file.name.replace(/[^\w.\-]+/g, '_')
  const path = `evidence/${Date.now()}_${safe}`
  const { error } = await supabase.storage.from('law-docs').upload(path, file, { upsert: false, contentType: file.type || undefined })
  if (error) throw error
  return supabase.storage.from('law-docs').getPublicUrl(path).data.publicUrl
}

// ---- Attachments (lg_attachments) — CAR / report / comm ----
export async function uploadAttachment(file, refType, refId) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')
  const safe = file.name.replace(/[^\w.\-]+/g, '_')
  const path = `${refType}/${refId}/${Date.now()}_${safe}`
  const { error: upErr } = await supabase.storage.from('law-docs').upload(path, file, { upsert: false, contentType: file.type || undefined })
  if (upErr) throw upErr
  const file_url = supabase.storage.from('law-docs').getPublicUrl(path).data.publicUrl
  const { data, error } = await supabase.from('lg_attachments').insert({
    ref_type: refType, ref_id: refId, file_url, file_name: file.name, uploaded_by: currentUserName(),
  }).select().single()
  if (error) throw error
  return data
}
export async function fetchAttachments(refType, refId) {
  if (!hasSupabase || !refId) return []
  const { data, error } = await supabase.from('lg_attachments')
    .select('*').eq('ref_type', refType).eq('ref_id', refId).order('uploaded_at', { ascending: false })
  if (error) throw error
  return data || []
}
export async function deleteAttachment(id) {
  const { error } = await supabase.from('lg_attachments').delete().eq('id', id)
  if (error) throw error
}
// Count attachments for many refs of one type → { [refId]: count }
export async function fetchAttachmentCounts(refType, refIds = []) {
  if (!hasSupabase || !refIds.length) return {}
  const { data, error } = await supabase.from('lg_attachments').select('ref_id').eq('ref_type', refType).in('ref_id', refIds)
  if (error) return {}
  const m = {}
  ;(data || []).forEach(r => { m[r.ref_id] = (m[r.ref_id] || 0) + 1 })
  return m
}

// ---- Law review history (lg_review_log) ----
export async function fetchReviewLog(lawId) {
  if (!hasSupabase) return []
  const { data, error } = await supabase.from('lg_review_log')
    .select('*').eq('law_id', lawId).order('review_date', { ascending: false }).order('id', { ascending: false })
  if (error) throw error
  return data || []
}
export async function addReviewLog(lawId, { review_date, reviewer, result, note }) {
  const { data, error } = await supabase.from('lg_review_log').insert({
    law_id: lawId, review_date, reviewer: reviewer || null, result: result || null, note: note || null,
  }).select().single()
  if (error) throw error
  return data
}

// Suggestion lists for dropdowns (dedup, sorted)
export function suggestionLists(laws = []) {
  const uniq = arr => [...new Set(arr.filter(x => x && String(x).trim()).map(x => String(x).trim()))].sort()
  const responsibles = []
  laws.forEach(l => (l.reqs || []).forEach(r => r.responsible && responsibles.push(r.responsible)))
  return {
    ministries: uniq(laws.map(l => l.ministry)),
    responsibles: uniq(responsibles),
  }
}

export async function restoreLaw(lawId) {
  const { data: before } = await supabase.from('lg_laws').select('cat,repeal_date').eq('id', lawId).maybeSingle()
  const { error } = await supabase.from('lg_laws').update({
    status: 'ok',
    repeal_date: null,
    repeal_reason: null,
    replaced_by_code: null,
    repealed_by_authority: null,
    updated_at: new Date().toISOString(),
  }).eq('id', lawId)
  if (error) throw error
  if (before) await bumpQuarterStat(before.cat, 'repealed', -1, before.repeal_date)
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

// ---- Activity log (real dated timeline) ----
export async function logActivity({ action, law_id = null, law_code = '', law_name = '', detail = '' }) {
  if (!hasSupabase) return
  try {
    await supabase.from('lg_activity_log').insert({ action, law_id, law_code, law_name, detail })
  } catch (e) { console.warn('logActivity failed', e) }
}
export async function fetchActivity(limit = 5000) {
  if (!hasSupabase) return []
  const { data } = await supabase.from('lg_activity_log').select('*').order('created_at', { ascending: false }).limit(limit)
  return data || []
}

// ---- Quarterly added/repealed law stats (sourced from the original F-259 Excel masterlist) ----
export async function fetchQuarterStats() {
  if (!hasSupabase) return []
  const { data } = await supabase.from('lg_law_quarter_stats').select('*').order('year').order('quarter')
  return data || []
}

// ---- AI Skills: staging (import/approve) + update watcher ----
export async function fetchStaging() {
  if (!hasSupabase) return []
  const { data } = await supabase.from('lg_import_staging').select('*').eq('status', 'proposed').order('id')
  return data || []
}
export async function fetchUpdates() {
  if (!hasSupabase) return []
  const { data } = await supabase.from('lg_law_updates').select('*').neq('status', 'dismissed').order('detected_at', { ascending: false })
  return data || []
}
// Promote a staged batch (one law_code group) into the live registry
export async function addStagedLaw(rows) {
  const first = rows[0]
  let { data: law } = await supabase.from('lg_laws').select('id').eq('code', first.law_code).maybeSingle()
  if (!law) {
    const { data: ins, error } = await supabase.from('lg_laws').insert({
      code: first.law_code, cat: first.cat || 'LA', ministry: first.ministry || '',
      name: first.law_name || first.law_code,
      issue_date: first.announce_date || first.issue_date || null,
      effective_date: first.effective_date || null,
      doc_list: first.doc_list || null,
      status: 'bad', review_date: null,
    }).select('id').single()
    if (error) throw error
    law = ins
    await bumpQuarterStat(first.cat || 'LA', 'added', 1)
  }
  const reqRows = rows.map((r, i) => ({
    law_id: law.id, seq: r.req_seq ?? i,
    text: (r.section_ref ? r.section_ref + ': ' : '') + (r.req_text || ''),
    status: 'unmet', responsible: r.responsible || '', frequency: r.frequency || '',
    documents: r.documents || '', note: [r.applicability, r.method, r.other_terms].filter(Boolean).join(' · '),
  }))
  const { error: e2 } = await supabase.from('lg_requirements').insert(reqRows)
  if (e2) throw e2
  const { data: allReq } = await supabase.from('lg_requirements').select('status').eq('law_id', law.id)
  await recomputeLawStatus(law.id, allReq || [])
  await supabase.from('lg_import_staging').update({ status: 'added' }).in('id', rows.map(r => r.id))
  await logActivity({ action: 'import', law_id: law.id, law_code: first.law_code, law_name: first.law_name || first.law_code, detail: `นำเข้าจาก AI · ${rows.length} ข้อกำหนด` })
  return law   // { id } — used to kick off a tracker case after approval
}
export async function dismissStaged(ids) {
  await supabase.from('lg_import_staging').update({ status: 'dismissed' }).in('id', ids)
}
export async function setUpdateStatus(id, status) {
  await supabase.from('lg_law_updates').update({ status }).eq('id', id)
}

// ---- Process Tracker (workflow stages) ----
export const PROCESS_STAGES = [
  { key: 'discovery', label: 'ค้นพบกฎหมายใหม่', role: 'Monitor',   color: '#0071e3' },
  { key: 'review',    label: 'ตรวจเนื้อหา',      role: 'Reviewer',  color: '#0058b0' },
  { key: 'forward',   label: 'ส่งต่อหน่วยงาน',    role: 'Forwarder', color: '#ff9500' },
  { key: 'verify',    label: 'ตรวจสอบ/ติดตาม',   role: 'Verifier',  color: '#7a5d96' },
  { key: 'done',      label: 'เสร็จสิ้น',          role: '',          color: '#248a3d' },
]
export async function fetchProcessItems() {
  if (!hasSupabase) return []
  const { data } = await supabase.from('lg_process_items').select('*').order('updated_at', { ascending: false })
  return data || []
}
export async function createProcessItem(item) {
  const { data, error } = await supabase.from('lg_process_items').insert({
    title: item.title, ref_type: item.ref_type || 'manual', ref_id: item.ref_id || null,
    stage: item.stage || 'discovery', assignee: item.assignee || null, note: item.note || null,
  }).select().single()
  if (error) throw error
  return data
}
export async function updateProcessItem(id, patch) {
  const { error } = await supabase.from('lg_process_items').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
export async function deleteProcessItem(id) {
  const { error } = await supabase.from('lg_process_items').delete().eq('id', id)
  if (error) throw error
}
// Realtime: subscribe to live changes on lg_process_items so the tracker moves
// across open tabs/devices without a manual refresh. Returns an unsubscribe fn.
export function subscribeProcessItems(onChange) {
  if (!hasSupabase) return () => {}
  const ch = supabase
    .channel('rt-process-items')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lg_process_items' }, onChange)
    .subscribe()
  return () => { try { supabase.removeChannel(ch) } catch { /* noop */ } }
}

// ---- Process Tracker (3-stage per-law workflow) ----
export const TRACKER_STAGES = [
  { n: 1, title: 'ค้นหา/ตรวจสอบ/วิเคราะห์/ขึ้นทะเบียน', role: 'ผู้ค้นหา/วิเคราะห์' },
  { n: 2, title: 'หน่วยงานที่เกี่ยวข้องดำเนินการ',       role: 'หน่วยงานที่เกี่ยวข้อง' },
  { n: 3, title: 'ผู้ทวนสอบ',                             role: 'ผู้ทวนสอบ' },
]
export const TRACKER_STATUS = {
  waiting:     { label: 'รอดำเนินการ', color: '#a5a8b2' },
  in_progress: { label: 'กำลังทำ',     color: '#d97706' },
  done:        { label: 'เสร็จ',        color: '#16a34a' },
  overdue:     { label: 'เกินกำหนด',   color: '#dc2626' },
}
const DEFAULT_SUB = { 1: 'pending_search', 2: 'pending_assign', 3: 'pending_verify' }
const DONE_SUB    = { 1: 'registered',    2: 'done',           3: 'closed' }

export async function fetchTrackerSubstatuses() {
  if (!hasSupabase) return {}
  const { data } = await supabase.from('lg_process_substatus').select('*').order('stage').order('sort')
  const g = {}
  ;(data || []).forEach(r => { (g[r.stage] = g[r.stage] || []).push(r) })
  return g
}
export async function fetchTracker() {
  if (!hasSupabase) return []
  const { data } = await supabase.from('lg_process_tracker').select('*').order('law_id').order('stage')
  return data || []
}
// create a tracking case = 3 stage rows for one law.
// startStage lets callers begin partway through (e.g. staging-approved laws start at
// stage 2 "หน่วยงานดำเนินการ" because search/analyze/register is already done); earlier
// stages are marked done. Defaults keep the original stage-1 behaviour.
export async function createTrackerCase({ law_id, requirement_id = null, startStage = 1, startSubstatus = null }) {
  const now = new Date().toISOString()
  const rows = TRACKER_STAGES.map(s => {
    if (s.n < startStage)  return { law_id, requirement_id, stage: s.n, substatus: DONE_SUB[s.n],                 status: 'done',        started_at: now }
    if (s.n === startStage) return { law_id, requirement_id, stage: s.n, substatus: startSubstatus || DEFAULT_SUB[s.n], status: 'in_progress', started_at: now }
    return { law_id, requirement_id, stage: s.n, substatus: DEFAULT_SUB[s.n], status: 'waiting', started_at: null }
  })
  const { error } = await supabase.from('lg_process_tracker').insert(rows)
  if (error) throw error
}
export async function updateTrackerStage(id, patch) {
  const { error } = await supabase.from('lg_process_tracker').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
export async function deleteTrackerCase(lawId) {
  const { error } = await supabase.from('lg_process_tracker').delete().eq('law_id', lawId)
  if (error) throw error
}
// Phase 2 · Realtime: subscribe to live changes on lg_process_tracker.
// onChange(payload) fires on any insert/update/delete. Returns an unsubscribe fn.
export function subscribeTracker(onChange) {
  if (!hasSupabase) return () => {}
  const ch = supabase
    .channel('rt-process-tracker')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lg_process_tracker' }, onChange)
    .subscribe()
  return () => { try { supabase.removeChannel(ch) } catch { /* noop */ } }
}

// ---- Monthly compliance check-off ----
export async function fetchComplianceMonths(year) {
  if (!hasSupabase) return []
  const { data, error } = await supabase
    .from('lg_compliance_months')
    .select('*')
    .eq('year', year)
    .order('month')
  if (error) throw error
  return data || []
}

// ---- Government report submissions ----
export async function fetchReports() {
  if (!hasSupabase) return []
  const { data, error } = await supabase.from('lg_reports').select('*').order('next_due_date', { nullsFirst: false })
  if (error) throw error
  return data || []
}

export async function saveReport(r) {
  const payload = {
    title: r.title, law_id: r.law_id || null, law_code: r.law_code || null,
    authority: r.authority || null, responsible: r.responsible || null,
    format: r.format || null, retention: r.retention || null, category: r.category || null,
    timeline_text: r.timeline_text || null, trigger_type: r.trigger_type || 'fixed',
    recurrence: r.recurrence || 'annually', offset_days: r.offset_days ?? null,
    event_date: r.event_date || null, next_due_date: r.next_due_date || null,
    notify_days_before: r.notify_days_before ?? 30, note: r.note || null,
    updated_at: new Date().toISOString(),
  }
  if (r.id) {
    const { error } = await supabase.from('lg_reports').update(payload).eq('id', r.id)
    if (error) throw error
    return r.id
  }
  const { data, error } = await supabase.from('lg_reports').insert(payload).select('id').single()
  if (error) throw error
  return data.id
}

export async function deleteReport(id) {
  const { error } = await supabase.from('lg_reports').delete().eq('id', id)
  if (error) throw error
}

// Set the trigger (event) date for event-based reports → compute next_due_date
export async function setReportEvent(id, eventDate, offsetDays) {
  const due = new Date(eventDate)
  due.setDate(due.getDate() + (offsetDays || 0))
  const next_due_date = due.toISOString().slice(0, 10)
  const { error } = await supabase.from('lg_reports')
    .update({ event_date: eventDate, next_due_date, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
  return next_due_date
}

// Mark a report as submitted → advance to next occurrence (calendar) or clear (event/once)
export async function markReportSubmitted(id, fileRef, sentDate) {
  const { data: r, error: fe } = await supabase.from('lg_reports')
    .select('recurrence,trigger_type,next_due_date').eq('id', id).single()
  if (fe) throw fe

  let next = null
  if (r.trigger_type === 'fixed') {
    const base = r.next_due_date ? new Date(r.next_due_date) : new Date()
    const adv = advanceByRecurrence(base, r.recurrence)
    next = adv ? adv.toISOString().slice(0, 10) : null
  }
  // event-based: clear due date until the next trigger date is entered

  // Actual submission timestamp — use the date the user picked, fall back to now.
  const submittedAt = sentDate ? new Date(sentDate + 'T00:00:00').toISOString() : new Date().toISOString()
  const patch = {
    last_submitted_at: submittedAt,
    file_reference: fileRef || null,
    next_due_date: next,
    event_date: r.trigger_type === 'event' ? null : undefined,
    updated_at: new Date().toISOString(),
  }
  if (patch.event_date === undefined) delete patch.event_date
  const { error } = await supabase.from('lg_reports').update(patch).eq('id', id)
  if (error) throw error

  await supabase.from('lg_notification_log').insert({
    type: 'report_submitted', ref_id: id, ref_type: 'report',
    message: `บันทึกการส่งรายงานเรียบร้อย${fileRef ? ` — ${fileRef}` : ''}`,
    due_date: next,
  })
  return next
}

export async function toggleMonthCheck(year, month, checked) {
  const checkedAt = checked ? new Date().toISOString() : null
  const { error } = await supabase
    .from('lg_compliance_months')
    .upsert({ year, month, checked, checked_at: checkedAt }, { onConflict: 'year,month' })
  if (error) throw error
}

// Record the outcome of the monthly new-law scan: 'no_new_laws' or 'has_new_laws'.
// Always marks the month as checked — the status carries the detail.
export async function setMonthReviewStatus(year, month, status, checkedBy) {
  const checkedAt = new Date().toISOString()
  const { error } = await supabase
    .from('lg_compliance_months')
    .upsert({ year, month, checked: true, checked_at: checkedAt, status, checked_by: checkedBy }, { onConflict: 'year,month' })
  if (error) throw error
}
