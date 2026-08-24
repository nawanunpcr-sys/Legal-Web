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

// ── P21 · สถานะผลการประเมินข้อปฏิบัติ 4 สถานะ ────────────────────────────────
//
// ทะเบียนนี้เป็นแหล่งความจริงจุดเดียวของสถานะ — ทุกหน้าจอ ทุกไฟล์ export
// ต้องอ่านรหัสย่อ ชื่อไทย และสีจากที่นี่ ห้ามเขียนซ้ำในไฟล์ปลายทาง
// เขียนซ้ำเมื่อไร ตัวเลขบนหน้าจอกับในไฟล์ส่งออกจะเริ่มไม่ตรงกันโดยไม่มีใครรู้
//
// inKpi = นับเข้าฐานคำนวณอัตราความสอดคล้องหรือไม่
//   ฐาน = C + NC เท่านั้น · Ack และ ไม่เกี่ยวข้อง ถูกตัดออกจากตัวหาร
//   เพราะทั้งสองไม่ใช่ "ผลการปฏิบัติ" — ข้อเพื่อทราบไม่มีอะไรให้ปฏิบัติ
//   และข้อที่ไม่เข้าข่ายกิจการก็ไม่ควรถูกนับว่าองค์กรทำไม่ได้
export const REQ_STATUS = {
  met:            { code: 'C',   label: 'สอดคล้อง',      inKpi: true,  reasonRequired: false,
                    desc: 'ปฏิบัติครบถ้วนตามข้อกำหนด',
                    color: 'var(--ok)',   bg: 'var(--ok-bg)',   cls: 'p-ok'   },
  unmet:          { code: 'NC',  label: 'ไม่สอดคล้อง',    inKpi: true,  reasonRequired: true,
                    desc: 'ยังปฏิบัติไม่ครบถ้วน ต้องแก้ไข',
                    color: 'var(--bad)',  bg: 'var(--bad-bg)',  cls: 'p-bad'  },
  acknowledged:   { code: 'Ack', label: 'เพื่อทราบ',      inKpi: false, reasonRequired: true,
                    desc: 'ไม่ต้องดำเนินการ แต่ต้องรับทราบและเฝ้าระวัง เช่น บทนิยาม บทกำหนดโทษ ข้อกำหนดที่หน่วยงานภายนอกเป็นผู้ปฏิบัติ',
                    color: 'var(--accent)', bg: 'var(--accent-tint)', cls: 'p-ack' },
  not_applicable: { code: '-',   label: 'ไม่เกี่ยวข้อง',   inKpi: false, reasonRequired: true,
                    desc: 'ไม่เข้าข่ายลักษณะกิจการหรือกิจกรรมขององค์กร',
                    color: 'var(--ink-faint)', bg: 'var(--surface-3)', cls: 'p-na' },
}
// ลำดับที่ใช้แสดงทุกที่ (ตัวกรอง ปุ่มเลือก Legend สรุปท้ายรายงาน)
export const REQ_STATUS_ORDER = ['met', 'unmet', 'acknowledged', 'not_applicable']
// ป้ายเต็มสำหรับปุ่มเลือกในฟอร์ม เช่น "C — สอดคล้อง"
export const reqStatusLabel = k => REQ_STATUS[k] ? `${REQ_STATUS[k].code} — ${REQ_STATUS[k].label}` : ''
// สถานะที่บังคับกรอกเหตุผล (ต้องตรงกับ CHECK constraint ใน migration 044 เสมอ)
export const reasonRequired = k => !!REQ_STATUS[k]?.reasonRequired
// สถานะเทียมสำหรับข้อที่ยังไม่ประเมิน — ไม่ใช่ค่าใน DB จึงแยกไว้ต่างหาก
export const WAITING_STATUS = { code: '?', label: 'ยังไม่ประเมิน', color: 'var(--ink-faint)', bg: 'var(--grayfill)', cls: 'p-wait' }

// ── ยังไม่ประเมิน ────────────────────────────────────────────────────────────
// ตัวชี้ขาดคือ evaluated_at เป็น NULL หรือไม่ ตามข้อกำหนด P21 ข้อ 1.3
// (P18 เคยต้องใช้ note marker ช่วยแยก เพราะตอนนั้นข้อมูลเดิม 573/575 แถวมี
//  evaluated_at เป็น NULL ทั้งที่เป็นผลประเมินจริง · migration 044 backfill ให้แล้ว
//  ตัวชี้จึงกลับมาตรงไปตรงมาได้ และไม่ต้องพึ่งข้อความใน note อีก)
export const isWaitingReq = r => !r?.evaluated_at
// คืน 1 ใน 5 ค่า: met | unmet | acknowledged | not_applicable | waiting
// ค่าสถานะที่ระบบไม่รู้จัก (ข้อมูลเก่าหรือเขียนเข้ามาเอง) ถือเป็น unmet ไว้ก่อน
// เพื่อให้มันโผล่ให้คนเห็นในรายการ NC แทนที่จะหายเงียบจากทุกหน้าจอ
export const reqKind = r => isWaitingReq(r) ? 'waiting' : (REQ_STATUS[r?.status] ? r.status : 'unmet')

// ค่าที่ฐานข้อมูลรับได้จริง — ต้องตรงกับ CHECK lg_requirements_status_check เป๊ะ
export const REQ_STATUS_VALUES = REQ_STATUS_ORDER

// ด่านฝั่ง client · คู่กับ CHECK constraint ฝั่ง server (migration 044)
// สองด่านนี้ต้องพูดตรงกันเสมอ — ด่านนี้มีไว้ให้ผู้ใช้เห็นข้อความไทยที่อ่านรู้เรื่อง
// แทนที่จะเห็น error ดิบของ Postgres · ไม่ใช่มีไว้แทนกัน
// หมายเหตุ · ทำไม 'unmet' บังคับเหตุผลที่ชั้นนี้ แต่ไม่มี CHECK ในฐานข้อมูล
// (ต่างจาก acknowledged/not_applicable ที่มี CHECK คุมอีกชั้น)
// ทะเบียนมีข้อ NC เดิมอยู่ 13 ข้อที่ไม่มีเหตุผลบันทึกไว้ (นำเข้าจาก F-259 ครั้งแรก)
// ใส่ CHECK แบบไม่มีเงื่อนไข = ทุกการแก้ไข 13 แถวนั้นจะถูกปฏิเสธไปตลอด รวมถึงการแก้
// เรื่องที่ไม่เกี่ยวกับสถานะเลย · และการไปเติมเหตุผลย้อนหลังให้ผ่านด่าน คือการแต่งข้อมูล
// ที่เราไม่รู้จริง · ด่านนี้จึงคุมทุก "การเขียนใหม่" ซึ่งเป็นสิ่งที่ข้อกำหนดต้องการ
// โดยไม่ไปล็อกข้อมูลเก่าที่แก้อะไรไม่ได้แล้ว
export function assertReqStatus(status, statusReason) {
  if (!REQ_STATUS[status]) throw new Error('สถานะการประเมินไม่ถูกต้อง: ' + status)
  if (reasonRequired(status) && !String(statusReason || '').trim())
    throw new Error(`ต้องระบุเหตุผลประกอบสถานะ "${reqStatusLabel(status)}"`)
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
export const DEFAULT_SETTINGS = { company_name:'Compliance Register', subtitle:'ทะเบียนกฎหมาย SHE และกฎหมายอื่นๆ ที่เกี่ยวข้อง', org_name:'จัสเทล เน็ทเวิร์ค', user_name:'จป. วิชาชีพ', brand_mark:'CR' }
export async function fetchSettings() {
  if (!hasSupabase) return { ...DEFAULT_SETTINGS }
  const { data } = await supabase.from('lg_settings').select('*').eq('id', 1).maybeSingle()
  return { ...DEFAULT_SETTINGS, ...(data || {}) }
}
export async function saveSettings(patch) {
  const { error } = await supabase.from('lg_settings').upsert({ id: 1, ...patch, updated_at: new Date().toISOString() })
  if (error) throw error
}

// ---- Categories ----
// เพิ่มหมวดกฎหมายใหม่ · prompt ของ /api/law-analyze ดึงรายการหมวดจากตารางนี้ตอนรัน
// เพิ่มแล้ว AI เลือกหมวดใหม่ได้ทันทีโดยไม่ต้อง deploy
export async function addCategory({ code, name, color, sort_order }) {
  const { error } = await supabase.from('lg_categories').insert({ code, name, color, sort_order })
  if (error) throw error
}

// แก้ได้เฉพาะชื่อกับสี — รหัสห้ามแก้ เพราะ lg_laws.cat อ้างอิงรหัสนี้เป็นข้อความตรงๆ
export async function updateCategory(code, { name, color }) {
  const { error } = await supabase.from('lg_categories').update({ name, color }).eq('code', code)
  if (error) throw error
}

// ผู้เรียกต้องตรวจก่อนว่าไม่มีกฎหมายผูกอยู่ — ไม่มี FK ในฐานข้อมูล ลบแล้วกฎหมายจะกำพร้าเงียบๆ
export async function deleteCategory(code) {
  const { error } = await supabase.from('lg_categories').delete().eq('code', code)
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
// P21 · รับครบ 4 สถานะ · เหตุผลบังคับเมื่อเป็น Ack / ไม่เกี่ยวข้อง
export async function setRequirementStatus(reqId, status, statusReason = '') {
  assertReqStatus(status, statusReason)
  // stamp who/when evaluated compliance for this requirement
  const { error } = await supabase.from('lg_requirements')
    .update({ status, status_reason: String(statusReason || '').trim() || null,
              evaluated_at: new Date().toISOString(), evaluated_by: currentUserName() })
    .eq('id', reqId)
  if (error) throw error
}

// Update evidence / other fields on a single requirement
// P21 · ถ้า patch แตะสถานะ ต้องผ่านด่านเดียวกับทางเขียนอื่น — ทางนี้เป็นทางลัดที่หน้าจอ
// เรียกได้ตรงๆ ปล่อยผ่านเมื่อไรก็เลี่ยงการบังคับเหตุผลได้ทันที
export async function updateRequirementField(reqId, patch) {
  if (patch && 'status' in patch) {
    let reason = patch.status_reason
    if (!('status_reason' in patch) && reasonRequired(patch.status)) {
      // ไม่ได้ส่งเหตุผลมาในรอบนี้ — ต้องไปดูของเดิมในฐาน ไม่ใช่ถือว่าไม่มี
      const { data } = await supabase.from('lg_requirements').select('status_reason').eq('id', reqId).maybeSingle()
      reason = data?.status_reason
    }
    assertReqStatus(patch.status, reason)
  }
  const { error } = await supabase.from('lg_requirements').update(patch).eq('id', reqId)
  if (error) throw error
}

// เพิ่มข้อปฏิบัติใหม่ให้กฎหมายที่ขึ้นทะเบียนแล้ว — ต่อท้าย seq เดิม
// choice ใช้กติกาเดียวกับ createLawFull (P21): 4 สถานะ = ประเมินแล้ว, waiting = ยังไม่ตัดสิน
export async function addRequirement(lawId, { text, responsible = '', frequency = '', documents = '', choice = 'waiting', statusReason = '', waitDate = '' } = {}) {
  const t = (text || '').trim()
  if (!t) throw new Error('ข้อความข้อปฏิบัติห้ามว่าง')
  const evaluated = !!REQ_STATUS[choice]
  if (evaluated) assertReqStatus(choice, statusReason)
  const { data: last } = await supabase.from('lg_requirements')
    .select('seq').eq('law_id', lawId).order('seq', { ascending: false }).limit(1)
  const now = new Date().toISOString()
  let note = null
  if (!evaluated) {
    const parts = ['รอผู้เกี่ยวข้องประเมิน: ' + (responsible.trim() || '-')]
    if (waitDate) parts.push('ต้องการคำตอบภายใน ' + waitDate)
    note = parts.join(' · ')
  }
  const { data, error } = await supabase.from('lg_requirements').insert({
    law_id: lawId,
    seq: (last?.[0]?.seq ?? -1) + 1,
    text: t,
    // ยังไม่ประเมิน เก็บเป็น unmet + evaluated_at NULL เหมือนเดิม (reqKind อ่านเป็น waiting)
    status: evaluated ? choice : 'unmet',
    status_reason: evaluated ? (statusReason.trim() || null) : null,
    responsible: responsible.trim() || null,
    frequency: frequency.trim() || null,
    documents: documents.trim() || null,
    evaluated_at: evaluated ? now : null,
    evaluated_by: evaluated ? currentUserName() : null,
    note,
  }).select().single()
  if (error) throw error
  return data
}

// ── P21 · ป้ายไทยที่ฟอร์มประเมินระดับกฎหมายใช้ ↔ รหัสสถานะของข้อปฏิบัติ ──────
// สองฝั่งเก็บคนละรูปแบบมาตั้งแต่ต้น (lg_law_workflow.assess_result เป็นข้อความไทย
// ส่วน lg_requirements.status เป็นรหัสอังกฤษ) · แผนที่นี้คือจุดแปลงจุดเดียวของระบบ
export const ASSESS_RESULT_BY_STATUS = {
  met: 'สอดคล้อง', unmet: 'ไม่สอดคล้อง', acknowledged: 'เพื่อทราบ', not_applicable: 'ไม่เกี่ยวข้อง',
}
export const STATUS_BY_ASSESS_RESULT = Object.fromEntries(
  Object.entries(ASSESS_RESULT_BY_STATUS).map(([k, v]) => [v, k]))

// ตั้งสถานะข้อปฏิบัติทั้งฉบับเป็นค่าเดียวกัน แล้วคำนวณสถานะระดับกฎหมายใหม่
// ใช้โดยฟอร์มประเมินระดับกฎหมาย (Workflow A/B) ซึ่งตัดสินทั้งฉบับในครั้งเดียว
export async function bulkSetReqStatus(lawIds, status, statusReason = '') {
  if (!lawIds?.length) return
  assertReqStatus(status, statusReason)
  const { error } = await supabase.from('lg_requirements')
    .update({ status, status_reason: String(statusReason || '').trim() || null,
              evaluated_at: new Date().toISOString(), evaluated_by: currentUserName() })
    .in('law_id', lawIds)
  if (error) throw error
  for (const id of lawIds) {
    const { data: rs } = await supabase.from('lg_requirements').select('status,evaluated_at').eq('law_id', id)
    await recomputeLawStatus(id, rs || [])
  }
}

// Bulk: set all requirements of given laws to met/unmet, then sync law status
// P21 · แตะเฉพาะข้อที่เป็น C/NC หรือยังไม่ประเมินเท่านั้น
// ข้อที่ถูกตัดสินเป็น "เพื่อทราบ" หรือ "ไม่เกี่ยวข้อง" มาพร้อมเหตุผลที่คนกรอกไว้
// การกดปุ่มเหมารวมทีเดียวแล้วล้างทิ้งทั้งสถานะและเหตุผล คือการทำลายบันทึกที่ผู้ตรวจต้องเห็น
export async function bulkSetCompliance(lawIds, met = true, statusReason = '') {
  if (!lawIds.length) return
  const status = met ? 'met' : 'unmet'
  // ทางนี้เคยเขียนสถานะตรงเข้าฐานโดยไม่ผ่านด่านใดเลย — กลายเป็นทางลัดที่เลี่ยงกติกา
  // "NC ต้องมีเหตุผล" ได้ทั้งที่ทางอื่นบังคับหมด · ให้ผ่านด่านเดียวกับทุกทาง
  assertReqStatus(status, statusReason)
  const { error } = await supabase.from('lg_requirements')
    .update({ status, status_reason: String(statusReason || '').trim() || null,
              evaluated_at: new Date().toISOString(), evaluated_by: currentUserName() })
    .in('law_id', lawIds)
    .in('status', ['met', 'unmet'])
  if (error) throw error
  // สถานะระดับกฎหมายต้องคำนวณใหม่จากของจริง ไม่ใช่เดาจากปุ่มที่กด
  // เพราะฉบับที่มีแต่ Ack/NA จะไม่ถูกแตะเลย การตั้งเป็น 'bad' ตรงๆ จึงผิด
  for (const id of lawIds) {
    const { data: rs } = await supabase.from('lg_requirements').select('status,evaluated_at').eq('law_id', id)
    await recomputeLawStatus(id, rs || [])
  }
}

// P21 · law status ยังมี 2 ทางเหมือนเดิม แต่ตัวนับเปลี่ยนเป็น "NC ที่ประเมินแล้วจริง"
//   'bad' = มีข้อที่ประเมินแล้วและผลเป็นไม่สอดคล้อง อย่างน้อย 1 ข้อ
// เพื่อทราบ / ไม่เกี่ยวข้อง / ยังไม่ประเมิน ต้องไม่ทำให้ทั้งฉบับกลายเป็น 'bad'
// (ก่อนหน้านี้ "รอผู้เกี่ยวข้องประเมิน" ถูกเก็บเป็น unmet จึงทำให้ฉบับที่ยังไม่มีใครประเมิน
//  ขึ้นเป็น "ยังไม่สอดคล้อง" ทั้งที่ยังไม่มีใครตัดสินอะไรเลย)
// ต้องส่ง reqs ที่มีทั้ง status และ evaluated_at มาด้วยเสมอ ไม่งั้น reqKind จะอ่านเป็น waiting หมด
export function computeLawStatus(reqs) {
  return (reqs || []).some(r => reqKind(r) === 'unmet') ? 'bad' : 'ok'
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

// ยกเลิกด้วยมือ — ใช้จากหน้ารายละเอียด และจากบทยกเลิกที่ AI อ่านเจอตอนเพิ่มกฎหมายใหม่
// P21 ส่วนที่ 2 · ต้องตั้ง law_status ให้ตรงกันด้วย ไม่งั้นฉบับที่ยกเลิกทางนี้จะไม่ขึ้นป้าย
// และไม่ถูกนับในตัวกรองสถานะการบังคับใช้ ทั้งที่ทะเบียนถือว่ายกเลิกแล้ว
// ไม่ตั้ง repeal_detected_by โดยตั้งใจ — นี่คือการกระทำของคน ไม่ใช่ผลจาก AI
// (CHECK ที่บังคับต้องมี source_url ผูกกับ repeal_detected_by จึงไม่บังคับกับทางนี้)
export async function repealLaw(lawId, { repeal_date, repeal_reason, replaced_by_code, repealed_by_authority, repealed_by_title, law_status = 'repealed' }) {
  if (!LAW_STATUS[law_status]) throw new Error('สถานะการบังคับใช้ไม่ถูกต้อง: ' + law_status)
  const { data: law, error } = await supabase.from('lg_laws').update({
    status: 'repealed',
    law_status,
    repeal_date,
    repeal_reason,
    replaced_by_code: replaced_by_code || null,
    repealed_by_authority: repealed_by_authority || null,
    repealed_by_title: repealed_by_title || null,
    repeal_verified_by: currentUserName() || null,   // คนกดเอง = ยืนยันแล้วในตัว
    repeal_verified_at: new Date().toISOString(),
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
export async function createLawFull({ code, cat, name, hierarchy_level, law_type, ministry, announce_date, effective_date, doc_list, responsible, review_date, source_url, gazette_ref }, reqs = []) {
  const clean = (reqs || []).filter(r => (r.text || '').trim())
  const now = new Date().toISOString()
  const by = currentUserName()
  // P21 · แปลง "ทางเลือกที่ผู้ใช้กดจริง" → แถว lg_requirements (4 สถานะ)
  //   สอดคล้อง / ไม่สอดคล้อง / เพื่อทราบ / ไม่เกี่ยวข้อง → เขียนค่าตรง + evaluated_at/by
  //   ยังไม่ได้เลือก → unmet + evaluated_at/by = NULL + note 'รอผู้เกี่ยวข้องประเมิน: <ชื่อ>'
  // ไม่มี fallback เป็น 'met' — ไม่ได้เลือกจริง ให้ถือเป็น "รอผู้เกี่ยวข้องประเมิน" (ปลอดภัย ไม่นับ met)
  // ตรวจเหตุผลของทุกข้อก่อนแตะฐาน — ล้มกลางทางแล้วกฎหมายจะถูกสร้างไว้โดยไม่มีข้อปฏิบัติ
  clean.forEach(r => { if (REQ_STATUS[r.choice]) assertReqStatus(r.choice, r.statusReason) })
  const rowsFor = lawId => clean.map((r, i) => {
    const choice = REQ_STATUS[r.choice] ? r.choice : 'waiting'
    const evaluated = choice !== 'waiting'
    let note = (r.note || '').trim() || null
    if (choice === 'waiting') {
      const parts = ['รอผู้เกี่ยวข้องประเมิน: ' + ((r.responsible || '').trim() || '-')]
      if (r.waitDate) parts.push('ต้องการคำตอบภายใน ' + r.waitDate)
      note = [note, parts.join(' · ')].filter(Boolean).join(' · ')
    }
    return {
      law_id: lawId, seq: i, text: r.text.trim(),
      status: evaluated ? choice : 'unmet',
      status_reason: evaluated ? ((r.statusReason || '').trim() || null) : null,
      responsible: (r.responsible || '').trim() || null,
      frequency: r.frequency || null, documents: r.documents || null,
      evaluated_at: evaluated ? now : null,
      evaluated_by: evaluated ? by : null,
      note,
      // Skill 3 (mig 034/036) · ที่มาของข้อที่ดึงมาจากกฎหมายที่ถูกอ้างถึง — null = ข้อของฉบับหลักเอง
      // ต้องเขียนลงฐานด้วย ไม่งั้นผู้ตรวจ ISO เปิด F-259 แล้วหาที่มาของข้อนั้นไม่ได้
      from_related_law: r.from_related_law || null,
      from_law_url: r.from_law_url || null,
      from_law_confidence: r.from_law_confidence || null,
      // P17 (mig 040) · คำตอบของกฎหมายที่ข้อนี้อ้างถึง — เก็บติดไปกับข้อ
      // เพื่อให้เปิดทะเบียนย้อนหลังยังเห็นว่าข้อนี้อ้างถึงอะไร และได้คำตอบว่าอย่างไร
      // โดยไม่ต้องยิง AI ซ้ำ · ที่สำคัญคือรู้ว่า "ยังรอประกาศอยู่" ซึ่งเปลี่ยนวิธีประเมิน
      ref_answers: Array.isArray(r.ref_answers) ? r.ref_answers : [],
    }
  })
  // ป้อน computeLawStatus ด้วยรูปแบบเดียวกับที่จะถูกเขียนลงฐานจริง (ต้องมี evaluated_at ด้วย)
  const reqStatusList = clean.map(r => (REQ_STATUS[r.choice]
    ? { status: r.choice, evaluated_at: now }
    : { status: 'unmet', evaluated_at: null }))
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
    gazette_ref: gazette_ref || null,   // mig 037 · เล่ม/ตอน/หน้า ราชกิจจาฯ
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

// ---- Attachments (lg_attachments) — law / assess / report / comm (car = ของเดิม) ----
// ref_type ต้องตรงกับ constraint lg_attachments_ref_type_check ในฐาน
// ถ้าเพิ่มหน้าใหม่ที่แนบไฟล์ ต้องเพิ่มค่าใน constraint ด้วย ไม่งั้น insert จะถูกปฏิเสธ
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
  if (error) {
    // ไฟล์ขึ้น storage ไปแล้วแต่แถว DB ไม่ผ่าน — ลบไฟล์ทิ้งกันขยะค้าง (best-effort ไม่บังผิดพลาดเดิม)
    try { await supabase.storage.from('law-docs').remove([path]) } catch { /* orphan ยอมรับได้ */ }
    throw error
  }
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
  // กู้คืน — ต้องล้างข้อมูลการยกเลิกให้หมดทั้งชุดเก่าและชุดใหม่ (P21)
  // เหลือค้างไว้แม้ช่องเดียว หน้ารายละเอียดจะยังโชว์กล่อง "สถานะการบังคับใช้" ของฉบับที่กู้คืนแล้ว
  const { error } = await supabase.from('lg_laws').update({
    status: 'ok',
    law_status: 'in_force',
    repeal_date: null,
    repeal_reason: null,
    replaced_by_code: null,
    repealed_by_authority: null,
    repealed_by_title: null,
    repealed_by_law_id: null,
    repeal_scope: null,
    replacement_law_title: null,
    replacement_law_id: null,
    repeal_source_url: null,
    repeal_sources: [],
    repeal_confidence: null,
    repeal_detected_by: null,
    repeal_checked_at: null,
    repeal_verified_by: null,
    repeal_verified_at: null,
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

// แก้ไขหัวข้อการสื่อสารที่บันทึกไว้แล้ว
// เดิมแก้ได้แค่ "ตารางเวลา" (วันที่/ความถี่/แจ้งเตือน/ผู้รับผิดชอบ) ผ่าน updateCommSchedule
// ส่วนเนื้อหาหลัก — หัวข้อ ผู้สื่อสาร ผู้รับสาร ขอบเขต — ตั้งได้ครั้งเดียวตอนสร้าง
// พิมพ์ผิดทีต้องลบทิ้งแล้วสร้างใหม่ ซึ่งทำให้ไฟล์แนบและประวัติการส่งของแถวนั้นหายไปด้วย
// ฟังก์ชันนี้จึงรับทุกช่อง และคัดเฉพาะคีย์ที่อนุญาตก่อนเขียน (กันฟิลด์ระบบถูกทับจากฝั่งหน้าจอ)
const COMM_EDITABLE = ['scope', 'topic', 'sender', 'receiver', 'recurrence_type',
                       'scheduled_date', 'next_scheduled_date', 'notify_days_before', 'assigned_to']
export async function updateComm(commId, patch) {
  const topic = String(patch?.topic ?? '').trim()
  if ('topic' in (patch || {}) && !topic) throw new Error('หัวข้อการสื่อสารห้ามว่าง')
  const clean = {}
  for (const k of COMM_EDITABLE) if (k in (patch || {})) clean[k] = patch[k]
  if ('topic' in clean) clean.topic = topic
  if (!Object.keys(clean).length) return
  const { error } = await supabase.from('lg_communications').update(clean).eq('id', commId)
  if (error) throw error
}

export async function deleteComm(commId) {
  const { error } = await supabase.from('lg_communications').delete().eq('id', commId)
  if (error) throw error
}

// ══ P21 · สถานะการบังคับใช้ของกฎหมาย (ส่วนที่ 2) ═══════════════════════════
//
// แยกจาก STATUS (ok/bad/repealed) ซึ่งเป็นผลความสอดคล้องและถูกคำนวณทับตลอด
// ตัวนี้คือข้อเท็จจริงทางกฎหมาย ไม่มีใครคำนวณทับ เปลี่ยนได้เฉพาะเมื่อคนยืนยัน
export const LAW_STATUS = {
  in_force:           { label: 'ยังบังคับใช้',      cls: 'p-ok',       inKpi: true  },
  amended:            { label: 'แก้ไขเพิ่มเติมแล้ว', cls: 'p-warn',     inKpi: true  },
  partially_repealed: { label: 'ยกเลิกบางส่วน',     cls: 'p-partial',  inKpi: true  },
  repealed:           { label: 'ยกเลิกแล้ว',        cls: 'p-repealed', inKpi: false },
  uncertain:          { label: 'รอตรวจสอบ',         cls: 'p-uncertain', inKpi: false },
}
export const LAW_STATUS_ORDER = ['in_force', 'amended', 'partially_repealed', 'repealed', 'uncertain']
// ฉบับที่ยกเลิกแล้ว ไม่นำข้อปฏิบัติมาคิดอัตราความสอดคล้อง (ข้อ 2.8)
// "ยกเลิกบางส่วน" และ "แก้ไขเพิ่มเติม" ยังนับ เพราะส่วนที่เหลือยังต้องปฏิบัติอยู่
export const lawInForce = l => LAW_STATUS[l?.law_status || 'in_force']?.inKpi !== false && l?.status !== 'repealed'
export const REPEAL_CONFIDENCE = { high: 'สูง', medium: 'ปานกลาง', low: 'ต่ำ' }

// ── เรียก endpoint ตรวจสถานะ (รายฉบับหรือหลายฉบับ) ──────────────────────────
// คืนผลดิบจาก API · ผลถูกลงคิว lg_repeal_checks ฝั่ง server แล้ว ยังไม่แตะ lg_laws
export async function runRepealCheck(lawIds) {
  const ids = (Array.isArray(lawIds) ? lawIds : [lawIds]).map(Number).filter(Number.isFinite)
  if (!ids.length) throw new Error('ยังไม่ได้เลือกกฎหมายที่จะตรวจ')
  const r = await fetch('/api/law-repeal-check', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ lawIds: ids }) })
  const out = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(out?.error || `ตรวจสอบไม่สำเร็จ (${r.status})`)
  return out
}

export async function fetchRepealChecks(status = 'pending') {
  if (!hasSupabase) return []
  let q = supabase.from('lg_repeal_checks').select('*').order('created_at', { ascending: false })
  if (status) q = q.eq('status', status)
  const { data } = await q
  return data || []
}

/**
 * ยืนยันผลตรวจแล้วเขียนลงทะเบียนจริง — ทางเดียวที่ lg_laws.law_status เปลี่ยนได้จากผล AI
 *
 * ⚠ confirmed ต้องเป็น true เท่านั้น · พารามิเตอร์นี้มีไว้ให้เป็นไปไม่ได้ที่จะ "เผลอ" เรียก
 * ผลจาก AI ห้ามลงทะเบียนทางการอัตโนมัติ (ข้อ 2.7) และทะเบียนนี้ใช้ตรวจ ISO
 * edits = ค่าที่เจ้าหน้าที่แก้เอง ทับค่าที่ AI เสนอมาได้ทุกช่อง
 */
export async function applyRepealCheck(check, edits = {}, { confirmed = false, verifiedBy = '' } = {}) {
  if (!confirmed) throw new Error('ต้องติ๊กยืนยันก่อนบันทึกลงทะเบียน')
  const by = String(verifiedBy || '').trim() || currentUserName()
  if (!by) throw new Error('ต้องระบุชื่อผู้ยืนยัน')

  const v = { ...check, ...edits }
  const lawStatus = v.law_status
  if (!LAW_STATUS[lawStatus]) throw new Error('สถานะการบังคับใช้ไม่ถูกต้อง: ' + lawStatus)
  const rb = v.repealed_by || {}
  const rp = v.replacement || {}
  const sourceUrl = String(v.repeal_source_url || rb.source_url || '').trim()
  // ด่านเดียวกับ CHECK ในฐาน — ดักที่นี่ด้วยเพื่อให้ผู้ใช้เห็นข้อความไทยแทน error ของ Postgres
  if ((lawStatus === 'repealed' || lawStatus === 'partially_repealed') && !sourceUrl)
    throw new Error('สถานะนี้ต้องมีที่อยู่อ้างอิง (URL) ของฉบับที่ยกเลิก')

  const now = new Date().toISOString()
  const patch = {
    law_status: lawStatus,
    repealed_by_title:     rb.law_title || null,
    repeal_date:           rb.effective_date || null,      // ใช้คอลัมน์เดิม ไม่สร้างซ้ำ
    repeal_scope:          v.repeal_scope || null,
    repeal_reason:         v.repeal_reason || null,
    repealed_by_authority: rb.gazette_reference || null,
    replacement_law_title: rp.exists ? (rp.law_title || null) : null,
    repeal_source_url:     sourceUrl || null,
    repeal_sources:        Array.isArray(v.sources) ? v.sources : [],
    repeal_confidence:     v.confidence || null,
    repeal_detected_by:    'ai:' + (check.model || 'unknown'),
    repeal_checked_at:     check.created_at || now,
    repeal_verified_by:    by,
    repeal_verified_at:    now,
    updated_at:            now,
  }
  // ฉบับที่ยกเลิกทั้งฉบับ ให้ธง active เดิมสอดคล้องกันด้วย (หน้าจอเก่าอ่านธงนี้อยู่)
  // ห้ามแตะ status (ok/bad) — นั่นคือผลความสอดคล้อง คนละเรื่องกัน
  if (lawStatus === 'repealed') patch.active = false

  const { error } = await supabase.from('lg_laws').update(patch).eq('id', check.law_id)
  if (error) throw error

  await supabase.from('lg_repeal_checks')
    .update({ status: 'applied', reviewed_by: by, reviewed_at: now, review_note: edits.review_note || null })
    .eq('id', check.id)

  await logActivity({ action: 'repeal_verify', law_id: check.law_id,
    detail: `ยืนยันสถานะการบังคับใช้เป็น "${LAW_STATUS[lawStatus].label}" โดย ${by}` })
  return patch
}

// ปัดผลตรวจทิ้ง (ไม่ตรง/ไม่เกี่ยว) — ไม่แตะทะเบียน แต่เก็บไว้ให้สอบย้อนได้
export async function dismissRepealCheck(checkId, note = '') {
  const by = currentUserName()
  const { error } = await supabase.from('lg_repeal_checks').update({
    status: 'dismissed', reviewed_by: by, reviewed_at: new Date().toISOString(),
    review_note: String(note || '').trim() || null,
  }).eq('id', checkId)
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
      gazette_ref: first.gazette_ref || null,  // mig 037
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
    // Skill 3 · lg_import_staging เก็บ from_related_law มาตั้งแต่ 034 (api/law-analyze.js เขียนค่าลงไปแล้ว)
    // แต่ตอนย้ายเข้า lg_requirements เคยตกหล่น — ที่มาจึงหายตอนอนุมัติเข้าทะเบียน
    from_related_law: r.from_related_law || null,
    ref_answers: Array.isArray(r.ref_answers) ? r.ref_answers : [],   // P17 (mig 040) · ทางอนุมัติจาก staging
  }))
  const { error: e2 } = await supabase.from('lg_requirements').insert(reqRows)
  if (e2) throw e2
  const { data: allReq } = await supabase.from('lg_requirements').select('status,evaluated_at').eq('law_id', law.id)
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

// ── ขั้น 3 · ประเมินรายข้อปฏิบัติ (C / NC / Ack / ไม่เกี่ยวข้อง) — บังคับชื่อผู้ประเมิน ──
export async function assessRequirement(req, law, status, assessorName, statusReason = '') {
  assertReqStatus(status, statusReason)
  const { error } = await supabase.from('lg_requirements')
    .update({ status, status_reason: String(statusReason || '').trim() || null,
              evaluated_at: new Date().toISOString(), evaluated_by: assessorName }).eq('id', req.id)
  if (error) throw error
  const { data: allReq } = await supabase.from('lg_requirements').select('status,evaluated_at').eq('law_id', law.id)
  await recomputeLawStatus(law.id, allReq || [])
  await logActivity({ action: 'assess', law_id: law.id, law_code: law.code, law_name: law.name,
    detail: `${assessorName} ประเมิน ${reqStatusLabel(status)}: ${(req.text || '').slice(0, 80)}` })
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
      .update({ status: 'met', status_reason: null, evaluated_at: new Date().toISOString(), evaluated_by: by }).eq('id', plan.requirement_id)
    if (plan.law_id) {
      const { data: allReq } = await supabase.from('lg_requirements').select('status,evaluated_at').eq('law_id', plan.law_id)
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
  'เพื่อทราบ':   { cls: 'p-ack'  },   // P21
  'ไม่เกี่ยวข้อง': { cls: 'p-na'   },   // P21
  'เสร็จสิ้น':   { cls: 'p-ok'   },
}

// ---- AI-discovered laws (source for Workflow A · Process 1) ----
export async function fetchDiscoveredLaws() {
  if (!hasSupabase) return []
  // ดึงทุกสถานะรวม deleted — หน้า "ประวัติการสรุปด้วย AI" ต้องเห็นรายการที่ลบทิ้งไปแล้วด้วย
  // (ลบเป็น soft delete อยู่แล้ว) · คิว "รอเข้าทะเบียน" กรอง deleted/registered ออกเองที่ฝั่ง UI
  const { data } = await supabase.from('lg_ai_discovered_laws')
    .select('*').order('created_at', { ascending: false })
  return data || []
}
// lg_ai_discovered_laws เก็บวันที่เป็นชนิด date จริง (ต่างจาก lg_laws ที่เป็น text "วว/ดด/ปปปป" พ.ศ.)
// AI ส่งมาเป็น "วว/ดด/ปปปป" พ.ศ. — ถ้าปล่อยเข้าไปตรงๆ Postgres (DateStyle=MDY) จะอ่านเป็น เดือน/วัน/ปี
// แล้วสลับวันกับเดือน จึงต้องแปลงเป็น ปปปป-ดด-วว ค.ศ. ก่อน · แปลงไม่ได้ = null (คอลัมน์ nullable)
// เขียนซ้ำในไฟล์นี้แทน import beToISO จาก ui.jsx เพราะ ui.jsx import supabase.js อยู่แล้ว (กัน circular import)
function beDateToISO(v) {
  const m = String(v || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{3,4})$/)
  if (!m) return /^\d{4}-\d{2}-\d{2}$/.test(String(v || '').trim()) ? v : null
  let [, d, mo, y] = m; y = +y; if (y > 2400) y -= 543
  const dt = new Date(y, +mo - 1, +d)
  if (isNaN(dt) || dt.getMonth() !== +mo - 1 || dt.getDate() !== +d) return null
  const pad = n => String(n).padStart(2, '0')
  return `${y}-${pad(+mo)}-${pad(+d)}`
}
export async function saveDiscoveredLaw(row) {
  const payload = {
    law_name: row.law_name, source: row.source || 'manual', summary: row.summary || null,
    source_url: row.source_url || null,
    announced_date: beDateToISO(row.announced_date), effective_date: beDateToISO(row.effective_date),
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
// P21 · result = 'สอดคล้อง' | 'ไม่สอดคล้อง' | 'เพื่อทราบ' | 'ไม่เกี่ยวข้อง'
//   ไม่สอดคล้อง         → ต้องมี plan/reverifyDate และแฟ้มงานค้างไว้เป็น 'ไม่สอดคล้อง'
//   เพื่อทราบ/ไม่เกี่ยวข้อง → ต้องมี reason และปิดแฟ้มงานได้ทันที (ไม่มีอะไรให้แก้ไข)
// อัปเดตความสอดคล้องของกฎหมายให้ตรงกับผล (พลิกทั้งฉบับ) เพื่อให้ทะเบียน sync.
export async function submitWorkflowAssessment(wf, law, { assessorName, result, plan, measure, reverifyDate, reason = '' }) {
  const status = STATUS_BY_ASSESS_RESULT[result]
  if (!status) throw new Error('ผลการประเมินไม่ถูกต้อง: ' + result)
  assertReqStatus(status, reason)
  const nc = status === 'unmet'
  const now = new Date().toISOString()
  const { error } = await supabase.from('lg_law_workflow').update({
    assessor_name: assessorName || currentUserName(), assessed_at: now, assess_result: result,
    assess_reason: String(reason || '').trim() || null,
    improvement_plan: nc ? (plan || null) : null,
    measure: nc ? (measure || null) : null,
    reverify_date: nc ? (reverifyDate || null) : null,
    stage: 3, status: nc ? 'ไม่สอดคล้อง' : 'เสร็จสิ้น',
    completed_at: nc ? null : now, updated_at: now,
  }).eq('id', wf.id)
  if (error) throw error
  if (law?.id) await bulkSetReqStatus([law.id], status, reason)
  await logActivity({ action: 'assess', law_id: law?.id || null, law_code: law?.code || '', law_name: law?.name || '',
    detail: `${assessorName || currentUserName()} ประเมิน: ${result}${nc ? ' — ' + (plan || '').slice(0, 60) : ''}` })
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
