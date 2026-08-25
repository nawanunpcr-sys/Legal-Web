// Vercel serverless function — Skill 3 อย่างเดียว (ตามอ่านกฎหมายที่ตัวบทอ้างถึง)
//
// ทำไมต้องแยกออกมาจาก /api/law-analyze:
//   เดิมคำขอเดียวทำ 4 ด่านต่อกัน (สรุปฉบับหลัก → Skill 3 ชั้น 1 → ชั้น 2 → เรียบเรียงข้อ)
//   รวมแล้วชนเพดาน maxDuration 300 วิ เป็นประจำ โค้ดจึงต้องข้ามงานทิ้งเมื่อเวลาไม่พอ
//   ผลคือได้ข้อมูลไม่ครบ ไม่ใช่แค่ช้า
//   แยกเป็น 2 คำขอแล้ว แต่ละฝั่งได้เวลา 300 วิของตัวเอง ไม่ต้องข้ามอะไรอีก
//   และผู้ใช้เห็นตารางฉบับหลักได้ก่อน ไม่ต้องรอ Skill 3 ให้จบ
//
// endpoint นี้ "เชื่อว่า caller กรอง refs มาแล้ว" ด้วย verifyRelatedRefs ใน law-analyze
// (ด่านนั้นต้องใช้ตัวบทเต็มซึ่งอยู่ที่คำขอแรกเท่านั้น ทำซ้ำที่นี่ไม่ได้)
// ตรวจซ้ำได้แค่แบบเบา — ตัดตัวที่ไม่มีชื่อกฎหมายหรือไม่ได้ตั้ง needs_lookup ทิ้ง
import { relateAndMerge } from './_lib/osh-law-relate.js'
import { flagUnverifiedNumbers } from './_lib/verify-numbers.js'
import { sameOrigin, clientIp, rateLimited, tooManyRequests } from './_lib/guard.js'

const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY

// vercel.json ตั้ง maxDuration = 300 วิ (เพดานสูงสุดของแพลนนี้)
// กันไว้ 45 วิให้ส่งผลกลับ · ตัวเลขนี้ต้องขยับตาม maxDuration เสมอ
const FN_BUDGET_MS = 255_000

export default async function handler(req, res){
  const startedAt = Date.now()
  if(req.method !== 'POST') return res.status(405).json({ error: 'POST only' })
  if(!sameOrigin(req)) return res.status(403).json({ error: 'คำขอไม่ได้มาจากโดเมนของแอป' })
  const wait = rateLimited(clientIp(req)); if(wait) return tooManyRequests(res, wait)
  if(!SUPA_URL || !SUPA_KEY) return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)' })
  if(!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY ใน Vercel' })

  try{
    const { refs = [], requirements = [], lawName = '' } = req.body || {}
    const mainReqs = Array.isArray(requirements) ? requirements : []

    // ตรวจซ้ำแบบเบา — ด่านหนักทำไปแล้วที่คำขอแรก
    const clean = (Array.isArray(refs) ? refs : []).filter(
      r => r && String(r.law_name || '').trim() && r.needs_lookup === true)

    // เรียกแม้ refs ว่าง — relateAndMerge จะข้ามการดึงแล้วไปทำ inlineSectionRefs ต่อ
    // ซึ่งจำเป็นสำหรับข้อที่อ้างมาตราอื่น "ในฉบับเดียวกัน" (ไม่ต้องดึงอะไรเพิ่มก็เขียนใหม่ได้)
    const merged = await relateAndMerge(clean, mainReqs, lawName, startedAt + FN_BUDGET_MS)

    // ข้อที่เพิ่งดึงเข้ามาจากกฎหมายอ้างอิงยังไม่เคยผ่านด่านตัวเลข — ตรวจทั้งชุดอีกครั้ง
    // (ตัวบทเต็มอยู่ที่คำขอแรก ที่นี่จึงใช้ source_excerpt ของแต่ละข้อเป็นหลักฐานอย่างเดียว)
    const numCheck = flagUnverifiedNumbers(merged.requirements, '')

    return res.status(200).json({
      requirements: numCheck.reqs,
      related_laws: merged.related_laws,
      related_count: merged.related_count,
      unresolved_count: merged.unresolved_count,
      ref_answers: merged.ref_answers || [],
      answered_count: merged.answered_count || 0,
      pending_issuance_count: merged.pending_issuance_count || 0,
      inlined_count: merged.inlined_count || 0,
      manual_ref_count: merged.manual_ref_count || 0,
      skipped_for_time: merged.skipped_for_time || 0,
      skipped_for_quota: merged.skipped_for_quota || 0,
      unverified_number_count: numCheck.flagged,
      elapsed_ms: Date.now() - startedAt,
    })
  }catch(e){
    return res.status(500).json({ error: String(e && e.message || e) })
  }
}
