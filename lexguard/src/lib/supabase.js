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
  // รหัสกฎหมายซ้ำข้ามหมวดได้ (เช่น LF-001 มีทั้งหมวด LF และ LG) จึงต้อง lookup ด้วย (cat, code) เสมอ
  let { data: law } = await supabase.from('lg_laws').select('id')
    .eq('code', first.law_code).eq('cat', first.cat || 'LA').maybeSingle()
  if (!law) {
    const { data: ins, error } = await supabase.from('lg_laws').insert({
      code: first.law_code, cat: first.cat || 'LA', ministry: first.ministry || '',
      name: first.law_name || first.law_code,
      issue_date: first.announce_date || first.issue_date || null,
      effective_date: first.effective_date || null,
      doc_list: first.doc_list || null,
      source_url: first.source_url || null,   // P8: ลิงก์ตัวบทจริงติดไปกับกฎหมายตอนเข้าทะเบียน
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

// ---- P8: ตรวจทานผลสรุปของ AI (ผู้ตรวจสอบ) ----
// เก็บผลตรวจทานที่ระดับ batch → update ทุกแถวตาม id (กัน key เปลี่ยนเมื่อแก้ cat/law_code)
// TODO(auth): verify_by เก็บเป็น text — map เป็น auth.users id เมื่อทำบัญชีผู้ใช้รายคน
export async function verifyStagingBatch(ids, { passed, correct, accurate, complete, note, by, law_code = '' }) {
  if (!ids?.length) return
  const patch = {
    verify_status: passed ? 'passed' : 'failed',
    verify_correct: !!correct, verify_accurate: !!accurate, verify_complete: !!complete,
    verify_by: by || currentUserName(), verify_note: note || null, verified_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('lg_import_staging').update(patch).in('id', ids)
  if (error) throw error
  await logActivity({ action: 'verify', law_code, law_name: '',
    detail: passed ? 'ผ่านการตรวจทาน AI (ดึงถูกฉบับ/สรุปถูกต้อง/ครบถ้วน)' : ('ตีกลับผลสรุป AI — ' + (note || '')) })
}

// P8: บันทึกการแก้ไขผลสรุปของ AI ทับ staging + log ว่าแก้อะไร
// lawFields = { law_name, cat, ministry, announce_date, effective_date, doc_list, source_url }
// reqRows   = [{ id, section_ref, req_text, responsible, applicability, method, documents, frequency, other_terms }]
export async function saveStagingEdits(ids, lawFields = {}, reqRows = []) {
  const meta = {}
  ;['law_name', 'cat', 'ministry', 'announce_date', 'effective_date', 'doc_list', 'source_url'].forEach(k => {
    if (lawFields[k] !== undefined) meta[k] = lawFields[k] || null
  })
  if (Object.keys(meta).length && ids?.length) {
    const { error } = await supabase.from('lg_import_staging').update(meta).in('id', ids)
    if (error) throw error
  }
  for (const r of reqRows) {
    if (!r.id) continue
    const { error } = await supabase.from('lg_import_staging').update({
      section_ref: r.section_ref || null, req_text: r.req_text || '', responsible: r.responsible || null,
      applicability: r.applicability || null, method: r.method || null, documents: r.documents || null,
      frequency: r.frequency || null, other_terms: r.other_terms || null,
    }).eq('id', r.id)
    if (error) throw error
  }
  await logActivity({ action: 'verify_edit', law_code: lawFields.law_code || '', law_name: lawFields.law_name || '',
    detail: 'แก้ไขผลสรุป AI ก่อนตรวจทาน' })
}

// ---- DEPRECATED (P9) — free-form kanban, merged into lg_process_tracker ----
// Exports kept so nothing breaks; lg_process_items receives no new writes.
export const PROCESS_STAGES = [
  { key: 'discovery', label: 'ค้นพบกฎหมายใหม่', role: 'Monitor',   color: '#0071e3' },
  { key: 'review',    label: 'ตรวจเนื้อหา',      role: 'Reviewer',  color: '#0058b0' },
  { key: 'forward',   label: 'ส่งต่อหน่วยงาน',    role: 'Forwarder', color: '#ff9500' },
  { key: 'verify',    label: 'ตรวจสอบ/ติดตาม',   role: 'Verifier',  color: '#7a5d96' },
  { key: 'done',      label: 'เสร็จสิ้น',          role: '',          color: '#248a3d' },
]
// DEPRECATED — merged into lg_process_tracker
export async function fetchProcessItems() {
  if (!hasSupabase) return []
  const { data } = await supabase.from('lg_process_items').select('*').order('updated_at', { ascending: false })
  return data || []
}
// DEPRECATED — merged into lg_process_tracker
export async function createProcessItem(item) {
  const { data, error } = await supabase.from('lg_process_items').insert({
    title: item.title, ref_type: item.ref_type || 'manual', ref_id: item.ref_id || null,
    stage: item.stage || 'discovery', assignee: item.assignee || null, note: item.note || null,
  }).select().single()
  if (error) throw error
  return data
}
// DEPRECATED — merged into lg_process_tracker
export async function updateProcessItem(id, patch) {
  const { error } = await supabase.from('lg_process_items').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
// DEPRECATED — merged into lg_process_tracker
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

// ---- Process Tracker (5-stage law lifecycle · single source of truth) ----
// P9: merged from the old 3-stage tracker + the free-form kanban into ONE
// lifecycle backed entirely by lg_process_tracker (one row per stage per law).
export const TRACKER_STAGES = [
  { n: 1, key: 'ai_search',      title: 'AI ค้นหา/วิเคราะห์',   role: 'ผู้ค้นหา/วิเคราะห์',    color: '#0071e3' },
  { n: 2, key: 'verify_content', title: 'ทวนสอบเนื้อหา AI',     role: 'ผู้ทวนสอบเนื้อหา',     color: '#7a5d96' },
  { n: 3, key: 'assess',         title: 'ประเมินความสอดคล้อง',  role: 'หน่วยงานที่เกี่ยวข้อง', color: '#ff9500' },
  { n: 4, key: 'approve',        title: 'อนุมัติเข้าทะเบียน',    role: 'Admin',                color: '#16a34a' },
  { n: 5, key: 'monitor',        title: 'ติดตาม/ทวนสอบตามรอบ',  role: 'ผู้ทวนสอบ',            color: '#0058b0' },
]
export const TRACKER_STATUS = {
  waiting:     { label: 'รอดำเนินการ', color: '#a5a8b2' },
  in_progress: { label: 'กำลังทำ',     color: '#d97706' },
  done:        { label: 'เสร็จ',        color: '#16a34a' },
  overdue:     { label: 'เกินกำหนด',   color: '#dc2626' },
}
// entry / completion substatus for each stage (must match lg_process_substatus)
const DEFAULT_SUB = { 1: 'pending_search', 2: 'pending_verify', 3: 'pending_assign', 4: 'pending_approve', 5: 'scheduled' }
const DONE_SUB    = { 1: 'analyzed',       2: 'verified',       3: 'assessed',       4: 'approved',        5: 'reviewed' }
// result values (lg_review_log.result) that send a case back to re-assessment
export const REVIEW_REASSESS_RESULT = 'มีการแก้ไข'

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
// create a tracking case = 5 stage rows for one law.
// startStage lets callers begin partway through (e.g. staging-approved laws start
// at stage 3 "ประเมินความสอดคล้อง" because AI search + content-verify are already
// done); earlier stages are marked done. Defaults keep the stage-1 behaviour.
export async function createTrackerCase({ law_id, requirement_id = null, startStage = 1, startSubstatus = null }) {
  const now = new Date().toISOString()
  const rows = TRACKER_STAGES.map(s => {
    if (s.n < startStage)   return { law_id, requirement_id, stage: s.n, substatus: DONE_SUB[s.n],                    status: 'done',        started_at: now, completed_at: now }
    if (s.n === startStage) return { law_id, requirement_id, stage: s.n, substatus: startSubstatus || DEFAULT_SUB[s.n], status: 'in_progress', started_at: now, completed_at: null }
    return { law_id, requirement_id, stage: s.n, substatus: DEFAULT_SUB[s.n], status: 'waiting', started_at: null, completed_at: null }
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

// Advance a case (keyed by law_id) so that `toStage` becomes the active stage:
//  · every earlier stage is closed (status=done, completed_at set)
//  · `toStage` is (re)opened (status=in_progress, started_at set, completed_at cleared)
//  · every later stage is reset to waiting (so re-entering an earlier stage rolls
//    the tail back — used by re-assessment)
// Re-entering stage 3 (was already done) bumps assessment_round.
export async function advanceStage(lawId, toStage) {
  const now = new Date().toISOString()
  const { data: rows, error } = await supabase.from('lg_process_tracker').select('*').eq('law_id', lawId)
  if (error) throw error
  for (const r of rows || []) {
    if (r.stage < toStage) {
      if (r.status !== 'done') await updateTrackerStage(r.id, { status: 'done', substatus: DONE_SUB[r.stage] || r.substatus, completed_at: r.completed_at || now })
    } else if (r.stage === toStage) {
      const reenter = r.status === 'done'
      const patch = { status: 'in_progress', substatus: DEFAULT_SUB[toStage], started_at: r.started_at || now, completed_at: null }
      if (toStage === 3 && reenter) patch.assessment_round = (r.assessment_round || 1) + 1
      await updateTrackerStage(r.id, patch)
    } else if (r.status !== 'waiting' || r.completed_at) {
      await updateTrackerStage(r.id, { status: 'waiting', substatus: DEFAULT_SUB[r.stage], started_at: null, completed_at: null })
    }
  }
}

// Record a periodic review on stage 5. Writes an lg_review_log entry, bumps
// review_round + last/next_review_date, and — when the law changed
// (result === 'มีการแก้ไข') — sends the case back to stage 3 (assessment_round +1).
// next_review_date fallback: last review + 12 months (no review-frequency field on lg_laws).
export async function logReview(lawId, { date, result, note, reviewer } = {}) {
  const reviewDate = date || new Date().toISOString().slice(0, 10)
  const now = new Date().toISOString()
  const { error: e1 } = await supabase.from('lg_review_log').insert({
    law_id: lawId, review_date: reviewDate, reviewer: reviewer || currentUserName(), result: result || null, note: note || null,
  })
  if (e1) throw e1

  const reassess = result === REVIEW_REASSESS_RESULT
  const nd = new Date(reviewDate); nd.setMonth(nd.getMonth() + 12)
  const nextDate = nd.toISOString().slice(0, 10)

  // re-assessment rolls the tail back first, so the stage-5 counters below survive it
  if (reassess) await advanceStage(lawId, 3)

  const { data: s5 } = await supabase.from('lg_process_tracker').select('*').eq('law_id', lawId).eq('stage', 5).maybeSingle()
  if (s5) await updateTrackerStage(s5.id, {
    review_round: (s5.review_round || 0) + 1,
    last_review_date: reviewDate,
    next_review_date: reassess ? null : nextDate,
    substatus: reassess ? 'scheduled' : 'reviewed',
    status:    reassess ? 'waiting'   : 'done',
    completed_at: reassess ? null : now,
  })
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

// ============================================================================
// สายงานประเมินกฎหมาย (migration 018) — คัดกรอง → มอบหมาย → ประเมิน C/NC → แผนปรับปรุง
// ยังใช้ล็อกอินโหมด demo → เก็บ "ผู้ทำรายการ" เป็น text (screen_by/assigned_by/owner_name/…)
// TODO(auth): เมื่อทำระบบบัญชีผู้ใช้รายคน ให้ map ฟิลด์ *_by / owner_name เป็น
//             uuid references auth.users แทน free text ทุกจุดในบล็อกนี้
// ============================================================================

export const ASSESS_FLOW_STATUS = {
  pending:     { label: 'รอประเมิน',  cls: 'p-bad'  },
  in_progress: { label: 'กำลังประเมิน', cls: 'p-warn' },
  done:        { label: 'ประเมินเสร็จ', cls: 'p-ok'   },
}
export const PLAN_STATUS = {
  open:        { label: 'เปิด',        cls: 'p-bad'  },
  in_progress: { label: 'กำลังปรับปรุง', cls: 'p-warn' },
  done:        { label: 'ปิดแล้ว',      cls: 'p-ok'   },
  overdue:     { label: 'เลยกำหนด',     cls: 'p-bad'  },
}
// สถานะแผนปรับปรุงที่ "แสดงผล" (คำนวณ overdue จาก due_date เมื่อยังไม่ปิด)
export function planEffectiveStatus(p) {
  if (p.status === 'done') return 'done'
  if (p.due_date && new Date(p.due_date) < new Date(new Date().toDateString())) return 'overdue'
  return p.status || 'open'
}

export async function fetchDepartments() {
  if (!hasSupabase) return []
  const { data } = await supabase.from('lg_departments').select('*').order('name')
  return data || []
}

// สายงานประเมินทั้งหมด — ใช้สร้างบอร์ด 4 คอลัมน์ + หน้าประเมิน + การ์ด dashboard
export async function fetchAssessmentFlow() {
  if (!hasSupabase) return []
  const { data } = await supabase.from('lg_assessment_flow').select('*').order('id')
  return data || []
}

export async function fetchImprovementPlans() {
  if (!hasSupabase) return []
  const { data } = await supabase.from('lg_improvement_plans').select('*').order('created_at', { ascending: false })
  return data || []
}

// ── ขั้น 1 · คัดกรอง batch นำเข้า (เกี่ยวข้อง / ไม่เกี่ยวข้อง) ──────────────────
// batch = { cat, law_code, law_name }; ไม่เกี่ยวข้องต้องมี note (เหตุผล) → เก็บไว้ดูย้อนหลัง ไม่ลบ
export async function screenBatch({ cat, law_code, law_name }, { relevant, note }) {
  const by = currentUserName()
  const patch = {
    cat, law_code, law_name: law_name || law_code,
    screen_status: relevant ? 'relevant' : 'not_relevant',
    screen_by: by, screen_note: note || null, screened_at: new Date().toISOString(),
  }
  // แถว placeholder ระดับ batch (ยังไม่มอบหมาย → assigned_dept_id เป็น null)
  const { data: existing } = await supabase.from('lg_assessment_flow')
    .select('id').eq('cat', cat).eq('law_code', law_code).is('assigned_dept_id', null).maybeSingle()
  if (existing) await supabase.from('lg_assessment_flow').update(patch).eq('id', existing.id)
  else await supabase.from('lg_assessment_flow').insert({ ...patch, created_by: by })
  await logActivity({ action: 'screen', law_code, law_name: law_name || law_code,
    detail: relevant ? 'คัดกรอง: เกี่ยวข้องกับองค์กร' : ('คัดกรอง: ไม่เกี่ยวข้อง — ' + (note || '')) })
}

// ── ขั้น 2 · มอบหมายให้หน่วยงาน (ผู้ประเมิน) — แตกเป็นงานย่อยต่อหน่วยงาน ─────────
// depts = [{ id, name }]; ขึ้นทะเบียนจริง (สร้าง law + requirements) เพื่อให้มีข้อกำหนดให้ประเมิน
export async function assignBatch(batch, rows, depts, { dueDate, by: byArg } = {}) {
  const by = byArg || currentUserName()   // TODO(auth): map เป็น auth.users id เมื่อทำบัญชีผู้ใช้รายคน
  const law = await addStagedLaw(rows)   // สร้าง lg_laws + lg_requirements, set staging 'added', log 'import'
  // ผลคัดกรองเดิม (placeholder dept null) เอาไว้ copy เข้าแถวรายหน่วยงาน
  const { data: ph } = await supabase.from('lg_assessment_flow')
    .select('*').eq('cat', batch.cat).eq('law_code', batch.law_code).is('assigned_dept_id', null).maybeSingle()
  const now = new Date().toISOString()
  const flowRows = depts.map(dep => ({
    cat: batch.cat, law_code: batch.law_code, law_name: batch.law_name || law?.name || batch.law_code,
    law_id: law.id,
    screen_status: 'relevant', screen_by: ph?.screen_by || by, screen_note: ph?.screen_note || null, screened_at: ph?.screened_at || now,
    assigned_dept_id: dep.id, assigned_by: by, assigned_at: now, assess_due_date: dueDate || null,
    assess_status: 'pending', created_by: by,
  }))
  const { error } = await supabase.from('lg_assessment_flow').insert(flowRows)
  if (error) throw error
  if (ph) await supabase.from('lg_assessment_flow').delete().eq('id', ph.id)   // เก็บแถวรายหน่วยงานแทน placeholder
  for (const dep of depts) {
    await supabase.from('lg_notification_log').insert({
      type: 'assign_new', ref_id: law.id, ref_type: 'assessment',
      message: `มอบหมายประเมิน ${batch.law_code} ให้ ${dep.name}`, due_date: dueDate || null,
    })
  }
  await logActivity({ action: 'assign', law_id: law.id, law_code: batch.law_code, law_name: batch.law_name || '',
    detail: `ส่งประเมิน ${depts.length} หน่วยงาน: ${depts.map(d => d.name).join(', ')}` })
  return law
}

// ── ขั้น 3 · ประเมินรายข้อกำหนด (C = met / NC = unmet) — บังคับชื่อผู้ประเมิน ──────
export async function assessRequirement(req, law, status, assessorName) {
  const { error } = await supabase.from('lg_requirements')
    .update({ status, evaluated_at: new Date().toISOString(), evaluated_by: assessorName }).eq('id', req.id)
  if (error) throw error
  const { data: allReq } = await supabase.from('lg_requirements').select('status').eq('law_id', law.id)
  await recomputeLawStatus(law.id, allReq || [])
  await logActivity({ action: 'assess', law_id: law.id, law_code: law.code, law_name: law.name,
    detail: `${assessorName} ประเมิน ${status === 'met' ? 'สอดคล้อง (C)' : 'ไม่สอดคล้อง (NC)'}: ${(req.text || '').slice(0, 80)}` })
}
// ทำงานประเมินของหน่วยงานหนึ่งให้เป็น "กำลังประเมิน" / "เสร็จ"
export async function setFlowAssessStatus(flowId, status, assessorName) {
  const patch = { assess_status: status, assessed_by: assessorName || null }
  if (status === 'done') patch.assessed_at = new Date().toISOString()
  const { error } = await supabase.from('lg_assessment_flow').update(patch).eq('id', flowId)
  if (error) throw error
}

// ── ขั้น 4 · แผนปรับปรุง ────────────────────────────────────────────────────
export async function createImprovementPlan({ requirement_id, law_id, plan_text, owner_dept_id, owner_name, due_date }) {
  const by = currentUserName()
  const { data, error } = await supabase.from('lg_improvement_plans').insert({
    requirement_id: requirement_id || null, law_id: law_id || null, plan_text,
    owner_dept_id: owner_dept_id || null, owner_name: owner_name || null,
    due_date: due_date || null, status: 'open', created_by: by,
  }).select().single()
  if (error) throw error
  await supabase.from('lg_notification_log').insert({
    type: 'plan_due', ref_id: data.id, ref_type: 'plan',
    message: `แผนปรับปรุงใหม่: ${(plan_text || '').slice(0, 60)}`, due_date: due_date || null,
  })
  await logActivity({ action: 'plan', law_id: law_id || null, detail: 'สร้างแผนปรับปรุง: ' + (plan_text || '').slice(0, 80) })
  return data
}
export async function updateImprovementPlan(id, patch) {
  const { error } = await supabase.from('lg_improvement_plans').update(patch).eq('id', id)
  if (error) throw error
}
// ปิดแผน → บังคับมีหลักฐาน/สรุปผล แล้วพลิก requirement NC→C อัตโนมัติ + log
export async function closeImprovementPlan(plan, { evidence }) {
  const by = currentUserName()
  const { error } = await supabase.from('lg_improvement_plans').update({
    status: 'done', evidence: evidence || null, closed_at: new Date().toISOString(), closed_by: by,
  }).eq('id', plan.id)
  if (error) throw error
  if (plan.requirement_id) {
    await supabase.from('lg_requirements')
      .update({ status: 'met', evaluated_at: new Date().toISOString(), evaluated_by: by }).eq('id', plan.requirement_id)
    if (plan.law_id) {
      const { data: allReq } = await supabase.from('lg_requirements').select('status').eq('law_id', plan.law_id)
      await recomputeLawStatus(plan.law_id, allReq || [])
    }
  }
  await supabase.from('lg_notification_log').insert({
    type: 'plan_closed', ref_id: plan.id, ref_type: 'plan',
    message: 'ปิดแผนปรับปรุงแล้ว — พลิกข้อกำหนดเป็นสอดคล้อง (C)', due_date: null,
  })
  await logActivity({ action: 'plan_close', law_id: plan.law_id || null,
    detail: 'ปิดแผนปรับปรุง + พลิก NC→C: ' + (plan.plan_text || '').slice(0, 60) })
}

// ── ขั้นสุดท้าย · ยืนยันเข้าทะเบียนสมบูรณ์ (item 7) ──────────────────────────────
export async function finalizeAssessment(lawId, lawCode) {
  const by = currentUserName()
  const { error } = await supabase.from('lg_assessment_flow')
    .update({ finalized_at: new Date().toISOString(), finalized_by: by }).eq('law_id', lawId)
  if (error) throw error
  await logActivity({ action: 'finalize', law_id: lawId, law_code: lawCode || '',
    detail: 'ยืนยันเข้าทะเบียนสมบูรณ์ — ผ่านการประเมินครบทุกหน่วยงาน' })
}
