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
export const DEFAULT_SETTINGS = { company_name:'Comply Register', subtitle:'ทะเบียนกฎหมาย SHE และกฎหมายอื่นๆ ที่เกี่ยวข้อง', org_name:'จัสเทล เน็ทเวิร์ค', user_name:'จป. วิชาชีพ', brand_mark:'CR' }
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

// P18 · law status คงตรรกะเดิม 2 ทาง: มี unmet อย่างน้อย 1 → 'bad', ไม่งั้น → 'ok'
// (หมายเหตุ: "รอผู้เกี่ยวข้องประเมิน" ถูกเก็บเป็น status 'unmet' อยู่แล้ว จึงนับเป็น 'bad' ระดับกฎหมาย)
export function computeLawStatus(reqs) {
  return (reqs || []).some(r => r.status === 'unmet') ? 'bad' : 'ok'
}
export async function recomputeLawStatus(lawId, reqs) {
  const status = computeLawStatus(reqs)
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

// P14 · Task 3 — ลบกฎหมายถาวร (hard delete) สำหรับกรณีเพิ่มผิด/ซ้ำเท่านั้น.
// ลบ child ตามลำดับก่อน parent; FK ที่เป็น CASCADE (requirements/workflow/plans/review_log/
// assessment_flow/process_tracker) ถูกลบอัตโนมัติตอนลบ lg_laws — แต่ต้องเคลียร์เอง:
//   · lg_attachments + ไฟล์ใน storage (ไม่มี FK) · lg_notification_log (ไม่มี FK)
//   · lg_reports.law_id (NO ACTION → set null) · lg_ai_discovered_laws.registered_law_id (NO ACTION → set null)
//   · lg_activity_log ของกฎหมายนี้ (เก็บ audit log ระดับ global ที่ law_id=null ไว้)
export async function deleteLaw(lawId, { code, name } = {}) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')
  // 0. อ่าน meta ของกฎหมายไว้ก่อน (ใช้หักสถิติรายไตรมาสคืนหลังลบ — กัน Dashboard เพี้ยน)
  const { data: lawMeta } = await supabase.from('lg_laws').select('cat,created_at,status,repeal_date').eq('id', lawId).maybeSingle()
  // 1. รวบรวม id ลูก (ref_id ของ notification/attachment เป็น bigint: law + requirements + plans)
  const [{ data: reqs }, { data: plans }] = await Promise.all([
    supabase.from('lg_requirements').select('id').eq('law_id', lawId),
    supabase.from('lg_improvement_plans').select('id').eq('law_id', lawId),
  ])
  const refIds = [lawId, ...(reqs || []).map(r => r.id), ...(plans || []).map(p => p.id)]

  // 2. attachments — ลบไฟล์ใน storage (best-effort) แล้วลบแถว DB (strict)
  const { data: atts, error: attFetchErr } = await supabase.from('lg_attachments').select('id,file_url').in('ref_id', refIds)
  if (attFetchErr) throw attFetchErr
  if (atts && atts.length) {
    const paths = atts.map(a => { const m = (a.file_url || '').split('/law-docs/'); return m[1] ? decodeURIComponent(m[1]) : null }).filter(Boolean)
    if (paths.length) { try { await supabase.storage.from('law-docs').remove(paths) } catch (e) { console.warn('deleteLaw: storage remove failed (orphan ok)', e) } }
    const { error } = await supabase.from('lg_attachments').delete().in('ref_id', refIds); if (error) throw error
  }

  // 3. notifications ที่อ้างถึงกฎหมาย/แผน (ref_id bigint)
  { const { error } = await supabase.from('lg_notification_log').delete().in('ref_id', refIds); if (error) throw error }

  // 4. เคลียร์ FK แบบ NO ACTION ก่อน ไม่งั้นลบ lg_laws ไม่ได้
  { const { error } = await supabase.from('lg_reports').update({ law_id: null }).eq('law_id', lawId); if (error) throw error }
  { const { error } = await supabase.from('lg_ai_discovered_laws').update({ registered_law_id: null }).eq('registered_law_id', lawId); if (error) throw error }

  // 5. ลบ activity log ของกฎหมายนี้
  { const { error } = await supabase.from('lg_activity_log').delete().eq('law_id', lawId); if (error) throw error }

  // 6. audit trail ระดับ global (law_id = null → รอดจากการลบ activity ด้านบน)
  await logActivity({ action: 'delete', law_id: null, law_code: code || '', law_name: name || '', detail: `ลบกฎหมายถาวร ${code || ''} ${name || ''}`.trim() })

  // 7. ลบแถวหลัก → CASCADE เก็บกวาด requirements/workflow/plans/review_log/assessment_flow/process_tracker
  { const { error } = await supabase.from('lg_laws').delete().eq('id', lawId); if (error) throw error }

  // 8. หักสถิติรายไตรมาสคืน (ตอนสร้างบวก 'added', ตอน repeal บวก 'repealed') → บัคเก็ตตามวันที่เกิดจริง
  if (lawMeta?.cat) {
    await bumpQuarterStat(lawMeta.cat, 'added', -1, lawMeta.created_at)
    if (lawMeta.status === 'repealed' && lawMeta.repeal_date) await bumpQuarterStat(lawMeta.cat, 'repealed', -1, lawMeta.repeal_date)
  }
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
export async function createLawFull({ code, cat, name, hierarchy_level, law_type, ministry, announce_date, effective_date, doc_list, responsible, review_date, source_url }, reqs = []) {
  const clean = (reqs || []).filter(r => (r.text || '').trim())
  const now = new Date().toISOString()
  const by = currentUserName()
  // P18 · แปลง "ทางเลือกที่ผู้ใช้กดจริง" → แถว lg_requirements (สถานะมีแค่ met/unmet)
  //   สอดคล้อง             → met  + evaluated_at/by (ประเมินแล้ว)
  //   ไม่สอดคล้อง          → unmet + evaluated_at/by (ประเมินแล้ว = NC จริง)
  //   รอผู้เกี่ยวข้องประเมิน → unmet + evaluated_at/by = NULL + note 'รอผู้เกี่ยวข้องประเมิน: <ชื่อ>'
  // ไม่มี fallback เป็น 'met' อีกต่อไป — ถ้าไม่ได้เลือกจริง ให้ถือเป็น "รอผู้เกี่ยวข้องประเมิน" (ปลอดภัย ไม่นับ met)
  const rowsFor = lawId => clean.map((r, i) => {
    const choice = (r.choice === 'met' || r.choice === 'unmet') ? r.choice : 'waiting'
    const evaluated = choice === 'met' || choice === 'unmet'
    let note = (r.note || '').trim() || null
    if (choice === 'waiting') {
      const parts = ['รอผู้เกี่ยวข้องประเมิน: ' + ((r.responsible || '').trim() || '-')]
      if (r.waitDate) parts.push('ต้องการคำตอบภายใน ' + r.waitDate)
      note = [note, parts.join(' · ')].filter(Boolean).join(' · ')
    }
    return {
      law_id: lawId, seq: i, text: r.text.trim(),
      status: choice === 'met' ? 'met' : 'unmet',
      responsible: (r.responsible || '').trim() || null,
      frequency: r.frequency || null, documents: r.documents || null,
      evaluated_at: evaluated ? now : null,
      evaluated_by: evaluated ? by : null,
      note,
    }
  })
  const reqStatusList = clean.map(r => ({ status: (r.choice === 'met') ? 'met' : 'unmet' }))
  const { data, error } = await supabase.from('lg_laws').insert({
    code, cat, name,
    hierarchy_level: hierarchy_level ? Number(hierarchy_level) : null,
    law_type: law_type || null,   // P20b · ประเภทกฎหมาย (เดิมไม่เคยถูกเขียนลงฐาน)
    ministry: ministry || null,
    issue_date: announce_date || null,
    effective_date: effective_date || null,
    doc_list: doc_list || null,
    responsible: responsible || null,
    review_date: review_date || null,
    source_url: source_url || null,
    status: computeLawStatus(reqStatusList),   // มี unmet/รอ (เก็บเป็น unmet) ≥1 → 'bad'
    created_at: now, updated_at: now,
  }).select().single()
  if (error) throw error
  await bumpQuarterStat(cat, 'added', 1)
  if (clean.length) {
    const rows = rowsFor(data.id)
    const { error: e2 } = await supabase.from('lg_requirements').insert(rows)
    if (e2) throw e2
    return { ...data, reqs: rows }
  }
  return { ...data, reqs: [] }
}

// P20 · นำเข้ากฎหมายเป็นชุดจาก CSV — ทุกข้อปฏิบัติเป็น "รอผู้เกี่ยวข้องประเมิน" (P18: unmet + evaluated_at NULL)
// อะตอมมิกเชิงปฏิบัติ: insert laws ครั้งเดียว → insert requirements ครั้งเดียว
// ถ้า requirements ล้ม → ลบ laws ที่เพิ่งใส่คืน (ไม่ทิ้งข้อมูลค้างครึ่งๆ)
// inputs: [{ code, cat, name, ministry, announce_date, effective_date, doc_list, reqTexts:[...] }]
export async function createLawsBatch(inputs = [], { responsible = 'QA & SHE' } = {}) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')
  if (!inputs.length) return []
  const now = new Date().toISOString()
  const lawRows = inputs.map(r => ({
    code: r.code, cat: r.cat, name: r.name, ministry: r.ministry || null,
    issue_date: r.announce_date || null, effective_date: r.effective_date || null,
    doc_list: r.doc_list || null,
    // ทุกข้ออยู่สถานะรอประเมิน (เก็บเป็น unmet) → ถ้ามีข้อปฏิบัติ law = 'bad' ตามตรรกะ P18, ไม่มีข้อ = 'ok'
    status: (r.reqTexts || []).filter(t => (t || '').trim()).length ? 'bad' : 'ok',
    created_at: now, updated_at: now,
  }))
  const { data: laws, error } = await supabase.from('lg_laws').insert(lawRows).select()
  if (error) throw error
  // จับคู่ law ที่ใส่แล้วกลับเข้ากับ input ตาม (cat, code) เพื่อสร้าง requirements
  const byKey = {}; laws.forEach(l => { byKey[l.cat + '|' + l.code] = l })
  const reqRows = []
  inputs.forEach(r => {
    const law = byKey[r.cat + '|' + r.code]; if (!law) return
    ;(r.reqTexts || []).map(t => (t || '').trim()).filter(Boolean).forEach((text, seq) => {
      reqRows.push({
        law_id: law.id, seq, text,
        status: 'unmet', responsible,        // P18 · รอผู้เกี่ยวข้องประเมิน
        evaluated_at: null, evaluated_by: null,
        note: 'รอผู้เกี่ยวข้องประเมิน: ' + responsible,
      })
    })
  })
  if (reqRows.length) {
    const { error: e2 } = await supabase.from('lg_requirements').insert(reqRows)
    if (e2) {   // rollback: ลบ laws ที่เพิ่งใส่
      await supabase.from('lg_laws').delete().in('id', laws.map(l => l.id))
      throw e2
    }
  }
  // สถิติ + activity log ต่อฉบับ (ไม่กระทบ atomicity ของข้อมูลหลัก)
  for (const l of laws) {
    await bumpQuarterStat(l.cat, 'added', 1)
    await logActivity({ action: 'import', law_id: l.id, law_code: l.code, law_name: l.name,
      detail: `นำเข้าจาก CSV (รอผู้เกี่ยวข้องประเมิน · ผู้รับผิดชอบ: ${responsible})` })
  }
  return laws
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

// P20c · รายชื่อแผนก (lg_departments) — ใช้ช่วยเติมช่อง "ผู้รับผิดชอบ" ในฟอร์มเพิ่มกฎหมาย
export async function listDepartments() {
  if (!hasSupabase) return []
  const { data } = await supabase.from('lg_departments').select('id,name').eq('active', true).order('name')
  return data || []
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

export async function addComm(comm) {
  const { data, error } = await supabase.from('lg_communications').insert({
    scope: comm.scope || 'internal',
    topic: comm.topic,
    sender: comm.sender || null,
    receiver: comm.receiver || null,
    recurrence_type: comm.recurrence_type || 'annually',
    scheduled_date: comm.scheduled_date || null,
    next_scheduled_date: comm.scheduled_date || null,
    notify_days_before: comm.notify_days_before || 7,
    assigned_to: comm.assigned_to || null,
  }).select().single()
  if (error) throw error
  return data
}

export async function deleteComm(commId) {
  const { error } = await supabase.from('lg_communications').delete().eq('id', commId)
  if (error) throw error
}

// ---- Notifications ----
export async function dismissNotification(id) {
  await supabase.from('lg_notification_log').update({ dismissed_at: new Date().toISOString() }).eq('id', id)
}

// ---- Activity log (real dated timeline) ----
export async function logActivity({ action, law_id = null, law_code = '', law_name = '', detail = '', actor = null }) {
  if (!hasSupabase) return
  try {
    await supabase.from('lg_activity_log').insert({ action, law_id, law_code, law_name, detail, actor: actor || currentUserName() })
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

// ---- AI Skills: staging (import/approve) ----
// P20d · fetchStaging = รายการที่ค้างรออนุมัติใน lg_import_staging (ใช้กับ badge หน้าทะเบียน)
// (fetchUpdates/setUpdateStatus ของ flow "เฝ้าระวังกฎหมาย" (lg_law_updates) ถูกลบแล้ว — flow นั้นไม่เคยทำงาน)
export async function fetchStaging() {
  if (!hasSupabase) return []
  const { data } = await supabase.from('lg_import_staging').select('*').eq('status', 'proposed').order('id')
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
  await logActivity({ action: 'import', law_id: law.id, law_code: first.law_code, law_name: first.law_name || first.law_code, detail: `นำเข้าจาก AI · ${rows.length} ข้อปฏิบัติ` })
  return law   // { id } — used to kick off a tracker case after approval
}
export async function dismissStaged(ids) {
  await supabase.from('lg_import_staging').update({ status: 'dismissed' }).in('id', ids)
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
// depts = [{ id, name }]; ขึ้นทะเบียนจริง (สร้าง law + requirements) เพื่อให้มีข้อปฏิบัติให้ประเมิน
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

// ── ขั้น 3 · ประเมินรายข้อปฏิบัติ (C = met / NC = unmet) — บังคับชื่อผู้ประเมิน ──────
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
    message: 'ปิดแผนปรับปรุงแล้ว — พลิกข้อปฏิบัติเป็นสอดคล้อง (C)', due_date: null,
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

// ============================================================================
// P10 · Process Tracker รายกฎหมาย (lg_law_workflow) — 2 workflow, 3 process
//   1 ผู้ตรวจสอบ (Owner) → 2 ผู้ประเมิน → 3 เสร็จสิ้น
//   status: รอประเมิน · สอดคล้อง · ไม่สอดคล้อง · เสร็จสิ้น
// Workflow A = เพิ่มกฎหมายใหม่เข้าทะเบียน (จากหน้าค้นหา AI)
// Workflow B = ติดตาม/ทวนสอบกฎหมายเดิม (reuse Process 2 form)
// ============================================================================

export const WF_STAGES = [
  { n: 1, key: 'owner',  title: 'ผู้ตรวจสอบ', role: 'Owner' },
  { n: 2, key: 'assess', title: 'ผู้ประเมิน', role: 'ผู้ประเมิน' },
  { n: 3, key: 'done',   title: 'เสร็จสิ้น',   role: '' },
]
export const WF_STATUS = {
  'รอประเมิน':   { cls: 'p-warn' },
  'สอดคล้อง':    { cls: 'p-ok'   },
  'ไม่สอดคล้อง': { cls: 'p-bad'  },
  'เสร็จสิ้น':   { cls: 'p-ok'   },
}

// ---- AI-discovered laws (source for Workflow A · Process 1) ----
export async function fetchDiscoveredLaws() {
  if (!hasSupabase) return []
  const { data } = await supabase.from('lg_ai_discovered_laws')
    .select('*').neq('status', 'deleted').order('created_at', { ascending: false })
  return data || []
}
export async function saveDiscoveredLaw(row) {
  const payload = {
    law_name: row.law_name, source: row.source || 'manual', summary: row.summary || null,
    source_url: row.source_url || null,
    announced_date: row.announced_date || null, effective_date: row.effective_date || null,
    ministry: row.ministry || null, related_docs: row.related_docs || null,
    status: row.status || 'imported', searched_at: row.searched_at || new Date().toISOString(),
    ai_payload: row.ai_payload !== undefined ? row.ai_payload : undefined,  // P12: {law, requirements} เต็มไว้ prefill
  }
  if (payload.ai_payload === undefined) delete payload.ai_payload
  if (row.id) {
    const { error } = await supabase.from('lg_ai_discovered_laws').update(payload).eq('id', row.id)
    if (error) throw error
    return row.id
  }
  const { data, error } = await supabase.from('lg_ai_discovered_laws').insert(payload).select('id').single()
  if (error) throw error
  return data.id
}
// P12 · Phase B — เก็บผลสรุป AI ย้อนหลังไว้ที่ lg_laws.ai_summary (ไม่ทับ requirements ที่ยืนยันแล้ว)
export async function saveLawAiSummary(lawId, aiSummary) {
  const { error } = await supabase.from('lg_laws')
    .update({ ai_summary: aiSummary, ai_summary_at: new Date().toISOString() }).eq('id', lawId)
  if (error) throw error
}

export async function deleteDiscoveredLaw(id) {
  // soft delete so the FK from lg_law_workflow.discovered_law_id never dangles
  const { error } = await supabase.from('lg_ai_discovered_laws').update({ status: 'deleted' }).eq('id', id)
  if (error) throw error
}

// ---- Tracker cases ----
export async function fetchWorkflow() {
  if (!hasSupabase) return []
  const { data } = await supabase.from('lg_law_workflow').select('*').order('created_at', { ascending: false })
  return data || []
}
// P16 · รวมงานที่ต้องทำจาก 3 แหล่ง (view lg_tasks) — อ่านสำหรับหน้า "รายการที่ต้องทำ"
export async function fetchTasks() {
  if (!hasSupabase) return []
  const { data } = await supabase.from('lg_tasks').select('*').order('due_date', { ascending: true, nullsFirst: false })
  return data || []
}
export function subscribeWorkflow(onChange) {
  if (!hasSupabase) return () => {}
  const ch = supabase.channel('rt-law-workflow')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lg_law_workflow' }, onChange)
    .subscribe()
  return () => { try { supabase.removeChannel(ch) } catch { /* noop */ } }
}

// Realtime: registry stats stay live when laws/requirements change (add/repeal/assess)
// across tabs/users — no page refresh needed (Task 6). Returns an unsubscribe fn.
export function subscribeLaws(onChange) {
  if (!hasSupabase) return () => {}
  const ch = supabase.channel('rt-laws')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lg_laws' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lg_requirements' }, onChange)
    .subscribe()
  return () => { try { supabase.removeChannel(ch) } catch { /* noop */ } }
}

// ── Workflow A · Process 1 — เพิ่มกฎหมายใหม่เข้าทะเบียน (ผู้ตรวจสอบ) ────────────
// สร้าง lg_laws (+requirements) แล้วเปิด tracker case ที่ stage 2 (รอประเมิน).
// discovered = แถวจาก lg_ai_discovered_laws (ถ้าเลือกมา) → mark 'registered'.
// P18 · เพิ่มกฎหมาย + ประเมินรายข้อ inline ในหน้าเดียว — ไม่เปิด case ใน lg_law_workflow อีกต่อไป
// (การประเมิน inline = บันทึกผลจบในตัว. NC ที่ต้องมีแผนแก้ไข ให้เปิด "ติดตาม/ทวนสอบกฎหมายเดิม"
//  จากหน้ารายการที่ต้องทำเมื่อจะจัดการแผนจริง)
export async function createAddWorkflow({ lawFields, reqs = [], ownerName, discovered = null, verifiedFromAI = false }) {
  const law = await createLawFull(lawFields, reqs)
  if (discovered?.id) {
    await supabase.from('lg_ai_discovered_laws')
      .update({ status: 'registered', registered_law_id: law.id }).eq('id', discovered.id)
  }
  await logActivity({ action: 'register', law_id: law.id, law_code: law.code, law_name: law.name,
    detail: `เพิ่มเข้าทะเบียน + ประเมินรายข้อ (ผู้รับผิดชอบ: ${ownerName || currentUserName()})` + (verifiedFromAI ? ' (จาก AI สรุป — ผู้ใช้ตรวจทานแล้ว)' : '') })
  return { law, workflow: null }
}

// รอบถัดไป + รอบที่ยังเปิดของกฎหมายหนึ่ง (P11 · Phase B)
export async function lawRoundInfo(lawId) {
  if (!hasSupabase || !lawId) return { nextRound: 1, openRound: null }
  const { data } = await supabase.from('lg_law_workflow').select('round,status').eq('law_id', lawId)
  const rows = data || []
  const maxRound = rows.reduce((m, r) => Math.max(m, r.round || 1), 0)
  const open = rows.find(r => r.status !== 'เสร็จสิ้น')
  return { nextRound: maxRound + 1, openRound: open ? (open.round || 1) : null }
}

// ── Workflow B · Process 1 — ติดตาม/ทวนสอบกฎหมายเดิม (ผู้ตรวจสอบ) ───────────────
export async function createMonitorWorkflow({ law, ownerName, followIssue }) {
  const now = new Date().toISOString()
  const { nextRound, openRound } = await lawRoundInfo(law.id)
  if (openRound) throw new Error(`กฎหมายนี้มีรายการติดตามที่ยังไม่ปิด (รอบที่ ${openRound})`)
  const { data: wf, error } = await supabase.from('lg_law_workflow').insert({
    law_id: law.id, workflow_type: 'monitor', stage: 2, status: 'รอประเมิน', round: nextRound,
    owner_name: ownerName || currentUserName(), owner_at: now, follow_issue: followIssue || null,
  }).select().single()
  if (error) throw error
  await logActivity({ action: 'monitor', law_id: law.id, law_code: law.code, law_name: law.name,
    detail: `เปิดรายการทวนสอบ (รอบที่ ${nextRound}) — ${(followIssue || '').slice(0, 80)}` })
  return wf
}

// timeline ประวัติกิจกรรมของกฎหมายหนึ่ง (P11 · Phase B) — filter law_id + limit เท่านั้น
export async function fetchActivityByLaw(lawId, limit = 20) {
  if (!hasSupabase || !lawId) return []
  const { data } = await supabase.from('lg_activity_log')
    .select('*').eq('law_id', lawId).order('created_at', { ascending: false }).limit(limit)
  return data || []
}

// ── Process 2 · ผู้ประเมิน (ใช้ร่วมทั้ง Workflow A และ B) ──────────────────────
// result = 'สอดคล้อง' | 'ไม่สอดคล้อง'. ถ้าไม่สอดคล้อง ต้องมี plan/measure/reverifyDate.
// อัปเดตความสอดคล้องของกฎหมายให้ตรงกับผล (พลิกทั้งฉบับ) เพื่อให้ทะเบียน sync.
export async function submitWorkflowAssessment(wf, law, { assessorName, result, plan, measure, reverifyDate }) {
  const compliant = result === 'สอดคล้อง'
  const now = new Date().toISOString()
  const { error } = await supabase.from('lg_law_workflow').update({
    assessor_name: assessorName || currentUserName(), assessed_at: now, assess_result: result,
    improvement_plan: compliant ? null : (plan || null),
    measure: compliant ? null : (measure || null),
    reverify_date: compliant ? null : (reverifyDate || null),
    stage: 3, status: compliant ? 'เสร็จสิ้น' : 'ไม่สอดคล้อง',
    completed_at: compliant ? now : null, updated_at: now,
  }).eq('id', wf.id)
  if (error) throw error
  if (law?.id) await bulkSetCompliance([law.id], compliant)
  await logActivity({ action: 'assess', law_id: law?.id || null, law_code: law?.code || '', law_name: law?.name || '',
    detail: `${assessorName || currentUserName()} ประเมิน: ${result}${compliant ? '' : ' — ' + (plan || '').slice(0, 60)}` })
}

// ── Process 3 · ปิดแผนปรับปรุง (Workflow B; ใช้กับ A ได้เมื่อมีแผนค้าง) ──────────
export async function closeWorkflowPlan(wf, law, { closedBy } = {}) {
  const by = closedBy || currentUserName()
  const now = new Date().toISOString()
  const { error } = await supabase.from('lg_law_workflow').update({
    status: 'เสร็จสิ้น', plan_closed_at: now, plan_closed_by: by, completed_at: now, updated_at: now,
  }).eq('id', wf.id)
  if (error) throw error
  if (law?.id) await bulkSetCompliance([law.id], true)   // ปิดแผน → พลิกเป็นสอดคล้อง
  await logActivity({ action: 'plan_close', law_id: law?.id || null, law_code: law?.code || '', law_name: law?.name || '',
    detail: 'ปิดแผนปรับปรุง — พลิกเป็นสอดคล้อง' })
}

export async function deleteWorkflowCase(id) {
  const { error } = await supabase.from('lg_law_workflow').delete().eq('id', id)
  if (error) throw error
}

// P13 · Task 4 — บันทึกแจ้งเตือน "เลยกำหนดทวนสอบ" สำหรับ case ที่ยังไม่สอดคล้องและ reverify_date < วันนี้.
// กันซ้ำ: ข้ามรายการที่มี notification (type=reverify_overdue, ref_id เดียวกัน, ยังไม่ dismiss) อยู่แล้ว.
export async function syncReverifyOverdueNotifications(rows = []) {
  if (!hasSupabase) return 0
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const overdue = rows.filter(wf => wf.status === 'ไม่สอดคล้อง' && wf.reverify_date && new Date(wf.reverify_date) < today)
  if (!overdue.length) return 0
  const ids = overdue.map(w => w.law_id)
  const { data: existing } = await supabase.from('lg_notification_log')
    .select('ref_id').eq('type', 'reverify_overdue').is('dismissed_at', null).in('ref_id', ids)
  const have = new Set((existing || []).map(r => r.ref_id))
  const toInsert = overdue.filter(w => !have.has(w.law_id)).map(w => ({
    type: 'reverify_overdue', ref_id: w.law_id, ref_type: 'law',
    message: `เลยกำหนดทวนสอบกฎหมาย — ครบกำหนด ${w.reverify_date}`, due_date: w.reverify_date,
  }))
  if (toInsert.length) { try { await supabase.from('lg_notification_log').insert(toInsert) } catch (e) { console.warn('reverify notif insert', e) } }
  return toInsert.length
}

// ---- P10 · Task 12 · Search Log (ISO 45001 6.1.3 evidence) ----
export async function logSearch({ searchedBy, sources, resultsCount = 0, resultSummary = null, noNewLaws = false } = {}) {
  if (!hasSupabase) return
  try {
    await supabase.from('lg_search_log').insert({
      searched_by: searchedBy || currentUserName(), sources: sources || null,
      results_count: resultsCount || 0, result_summary: resultSummary, no_new_laws: !!noNewLaws,
    })
  } catch (e) { console.warn('logSearch failed', e) }
}
export async function fetchSearchLog(limit = 300) {
  if (!hasSupabase) return []
  const { data } = await supabase.from('lg_search_log').select('*').order('searched_at', { ascending: false }).limit(limit)
  return data || []
}
