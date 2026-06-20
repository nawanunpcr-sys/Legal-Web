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

export async function createLaw({ code, cat, name, hierarchy_level, ministry, effective_date, review_date }) {
  const { data, error } = await supabase.from('lg_laws').insert({
    code,
    cat,
    name,
    hierarchy_level: Number(hierarchy_level),
    ministry: ministry || null,
    issue_date: effective_date || null,
    review_date: review_date || null,
    status: 'ok',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).select().single()
  if (error) throw error
  return { ...data, reqs: [] }
}

// Create a law together with its requirement sub-items (manual entry)
export async function createLawFull({ code, cat, name, hierarchy_level, ministry, announce_date, effective_date, doc_list, review_date, source_url }, reqs = []) {
  const clean = (reqs || []).filter(r => (r.text || '').trim())
  const anyUnmet = clean.some(r => r.status === 'unmet')
  const { data, error } = await supabase.from('lg_laws').insert({
    code, cat, name,
    hierarchy_level: hierarchy_level ? Number(hierarchy_level) : null,
    ministry: ministry || null,
    issue_date: announce_date || null,
    effective_date: effective_date || null,
    doc_list: doc_list || null,
    review_date: review_date || null,
    source_url: source_url || null,
    status: clean.length ? (anyUnmet ? 'bad' : 'ok') : 'ok',
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).select().single()
  if (error) throw error
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

// Suggestion lists for dropdowns (dedup, sorted)
export function suggestionLists(laws = [], cars = []) {
  const uniq = arr => [...new Set(arr.filter(x => x && String(x).trim()).map(x => String(x).trim()))].sort()
  const responsibles = []
  laws.forEach(l => (l.reqs || []).forEach(r => r.responsible && responsibles.push(r.responsible)))
  cars.forEach(c => { responsibles.push(c.auditor, c.supervisor, c.owner); (c.followups || []).forEach(f => responsibles.push(f.follower, f.assessor, f.verifier)) })
  return {
    ministries: uniq(laws.map(l => l.ministry)),
    responsibles: uniq(responsibles),
    teams: uniq(cars.map(c => c.team)),
    divisions: uniq(cars.map(c => c.division)),
    departments: uniq(cars.map(c => c.department)),
  }
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

// ---- Activity log (real dated timeline) ----
export async function logActivity({ action, law_id = null, law_code = '', law_name = '', detail = '' }) {
  if (!hasSupabase) return
  try {
    await supabase.from('lg_activity_log').insert({ action, law_id, law_code, law_name, detail })
  } catch (e) { console.warn('logActivity failed', e) }
}
export async function fetchActivity(limit = 60) {
  if (!hasSupabase) return []
  const { data } = await supabase.from('lg_activity_log').select('*').order('created_at', { ascending: false }).limit(limit)
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
}
export async function dismissStaged(ids) {
  await supabase.from('lg_import_staging').update({ status: 'dismissed' }).in('id', ids)
}
export async function setUpdateStatus(id, status) {
  await supabase.from('lg_law_updates').update({ status }).eq('id', id)
}

// ---- CAR / OFI ----
export async function fetchCars() {
  if (!hasSupabase) return []
  const [{ data: cars }, { data: fus }, { data: aps }] = await Promise.all([
    supabase.from('lg_car').select('*').order('id', { ascending: false }),
    supabase.from('lg_car_followups').select('*').order('seq'),
    supabase.from('lg_car_approvals').select('*').order('seq'),
  ])
  const fuBy = {}, apBy = {}
  ;(fus || []).forEach(f => { (fuBy[f.car_id] = fuBy[f.car_id] || []).push(f) })
  ;(aps || []).forEach(a => { (apBy[a.car_id] = apBy[a.car_id] || []).push(a) })
  return (cars || []).map(c => ({ ...c, followups: fuBy[c.id] || [], approvals: apBy[c.id] || [] }))
}
export function nextCoNumber(cars) {
  const max = (cars || []).reduce((m, c) => {
    const n = parseInt(String(c.running_no || c.co_no || '').replace(/\D/g, ''), 10)
    return isNaN(n) ? m : Math.max(m, n)
  }, 0)
  const n = max + 1
  const run = String(n).padStart(6, '0')
  return { running_no: run, co_no: 'CO' + run, ofi_no: 'OFI-' + run }
}
export async function saveCar(car, followups = [], approvals = []) {
  const payload = {
    co_no: car.co_no || null, ofi_no: car.ofi_no || null, running_no: car.running_no || null,
    year: car.year ? Number(car.year) : null, status: car.status || 'open',
    record_type: car.record_type || null, owner: car.owner || null,
    issue_date: car.issue_date || null, auditor: car.auditor || null, supervisor: car.supervisor || null,
    team: car.team || null, division: car.division || null, department: car.department || null,
    finding: car.finding || null, corrective_action: car.corrective_action || null,
    due_date: car.due_date || null, updated_at: new Date().toISOString(),
  }
  let carId = car.id
  if (carId) {
    const { error } = await supabase.from('lg_car').update(payload).eq('id', carId); if (error) throw error
  } else {
    const { data, error } = await supabase.from('lg_car').insert(payload).select('id').single(); if (error) throw error
    carId = data.id
  }
  await supabase.from('lg_car_followups').delete().eq('car_id', carId)
  await supabase.from('lg_car_approvals').delete().eq('car_id', carId)
  const fu = followups.filter(f => f.check_date || f.result || f.follower || f.assessor || f.verifier)
    .map((f, i) => ({ car_id: carId, seq: i, check_date: f.check_date || null, follower: f.follower || null,
      assessor: f.assessor || null, verifier: f.verifier || null, result: f.result || null, conclusion: f.conclusion || null }))
  const ap = approvals.filter(a => a.step || a.approver || a.approve_date)
    .map((a, i) => ({ car_id: carId, seq: i, step: a.step || null, approve_date: a.approve_date || null,
      approver: a.approver || null, status: a.status || 'approved' }))
  if (fu.length) await supabase.from('lg_car_followups').insert(fu)
  if (ap.length) await supabase.from('lg_car_approvals').insert(ap)
  return carId
}
export async function deleteCar(id) {
  const { error } = await supabase.from('lg_car').delete().eq('id', id); if (error) throw error
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
export async function markReportSubmitted(id, fileRef) {
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

  const patch = {
    last_submitted_at: new Date().toISOString(),
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
