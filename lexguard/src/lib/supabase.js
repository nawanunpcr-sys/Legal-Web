import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const hasSupabase = Boolean(url && key)
export const supabase = hasSupabase ? createClient(url, key) : null

// Category metadata (colors / order) kept client-side for styling
export const CAT_COLOR = {
  LA:'#0f6b58', LB:'#cf8a12', LC:'#cf4040',
  LD:'#4f72c4', LE:'#7a5bbf', LF:'#1f9d6b', LG:'#bd9a2e'
}
export const STATUS = {
  ok:{ label:'สอดคล้อง', cls:'p-ok' },
  bad:{ label:'ยังไม่สอดคล้อง', cls:'p-bad' }
}

// ---- Data access ----
export async function fetchAll() {
  const [{ data: cats }, { data: laws }, { data: reqs }, { data: comms }] = await Promise.all([
    supabase.from('lg_categories').select('*').order('sort_order'),
    supabase.from('lg_laws').select('*').order('code'),
    supabase.from('lg_requirements').select('*').order('seq'),
    supabase.from('lg_communications').select('*').order('id'),
  ])
  const reqByLaw = {}
  ;(reqs||[]).forEach(r => { (reqByLaw[r.law_id] = reqByLaw[r.law_id] || []).push(r) })
  const fullLaws = (laws||[]).map(l => ({ ...l, reqs: reqByLaw[l.id] || [] }))
  return { cats: cats||[], laws: fullLaws, comms: comms||[] }
}

// Toggle a requirement status and recompute the parent law status
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
