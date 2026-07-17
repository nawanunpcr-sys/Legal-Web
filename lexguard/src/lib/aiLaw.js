// src/lib/aiLaw.js
// ฝั่ง client เรียก AI ผ่าน Supabase Edge Functions เท่านั้น — ไม่มี API key อยู่ในไฟล์นี้
// (คีย์เก็บเป็น Supabase secret ให้ Edge Function ถือไว้)
import { supabase, hasSupabase } from './supabase.js'

// Task 4 ข้อ 1–2 · ค้นหากฎหมายใหม่ประจำเดือน (Edge Function `ai-law-search`)
// คืน { laws, count, searched_at, search_log_id, period }
export async function searchNewLaws({ month, year, searchedBy, keywords = '' } = {}) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')
  const { data, error } = await supabase.functions.invoke('ai-law-search', {
    body: { month, year, searched_by: searchedBy || 'ไม่ระบุ', keywords },
  })
  if (error) throw new Error(`ค้นหากฎหมายไม่สำเร็จ: ${error.message}`)
  if (!data?.ok) throw new Error(data?.error || 'ค้นหากฎหมายไม่สำเร็จ')
  return data
}

// Task 4 ข้อ 3 · สรุปสาระสำคัญกฎหมายรายฉบับ (Edge Function `ai-law-summary`)
// คืน LawSummary { ministry, announced_date, effective_date, scope, key_points[],
//   related_docs[], penalties, applies_to_office, confidence, notes }
export async function summarizeLaw({ lawName, sourceUrl = null, extraContext = '' } = {}) {
  if (!hasSupabase) throw new Error('ยังไม่ได้ตั้งค่า Supabase')
  const { data, error } = await supabase.functions.invoke('ai-law-summary', {
    body: { law_name: lawName, source_url: sourceUrl, extra_context: extraContext },
  })
  if (error) throw new Error(`สรุปกฎหมายไม่สำเร็จ: ${error.message}`)
  if (!data?.ok) throw new Error(data?.error || 'สรุปกฎหมายไม่สำเร็จ')
  return data.summary
}
