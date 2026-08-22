#!/usr/bin/env node
/**
 * ตรวจแถว discovered ในดัชนีว่า "ลิงก์ยังเปิดได้ และเนื้อหาตรงกับชื่อที่เก็บไว้จริง"
 *
 * ทำไมต้องมี — แถว discovered มาจากชื่อที่โมเดลตั้งให้ตอนตอบคำถามครั้งก่อน
 * ซึ่งพลาดได้ 2 แบบ และทั้งสองแบบเจอจริงแล้ว:
 *   1. จับคู่ชื่อกับไฟล์ผิด — แถวชื่อ "ค่ามาตรฐานมลพิษทางเสียงฯ 2561" ชี้ไปไฟล์ที่เปิดดูแล้ว
 *      เป็น "ข้อบัญญัติ อบต.หาดส้มแป้น พ.ศ. 2565"
 *   2. ลิงก์ตายไปแล้ว — ratchakitcha.soc.go.th/documents/2556E185P042.pdf คืน 404
 *
 * ดัชนีที่มีแถวเสียอันตรายกว่าดัชนีที่เล็ก เพราะระบบเอาไปเสนอโมเดลพร้อมป้ายว่า
 * "ระบบเคยเปิดอ่านไฟล์นี้สำเร็จ" ซึ่งอ่านแล้วน่าเชื่อจนไม่มีใครไปตรวจซ้ำ
 *
 * เทียบเนื้อหาแบบ "ตัดวรรณยุกต์" เพราะไฟล์ราชกิจจาฯ/ASA ฝังฟอนต์ที่ทำ ่ ้ หาย
 * และ า เพี้ยนเป็น ำ — เทคนิคเดียวกับ pdfPagesAround ใน law-source.js
 * ไม่ตัดแล้วจะได้ false alarm เพียบ (ทดสอบครั้งแรกได้ "ไม่ตรง" 5 จาก 17 ซึ่งผิดเกือบหมด)
 *
 * วิธีรัน:
 *   node --env-file=.env scripts/verify-gazette-index.mjs          # ตรวจอย่างเดียว
 *   node --env-file=.env scripts/verify-gazette-index.mjs --prune  # ลบแถวที่ลิงก์ตายออกด้วย
 */
import { PDFParse } from 'pdf-parse'

const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY
if(!SUPA_URL || !SUPA_KEY){ console.error('ยังไม่ได้ตั้ง VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY'); process.exit(1) }
const H = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'content-type': 'application/json' }
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36'
const PRUNE = process.argv.includes('--prune')

const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙'
const loose = s => String(s || '')
  .replace(/[๐-๙]/g, d => String(THAI_DIGITS.indexOf(d)))
  .replace(/[่-๎]/g, '')     // วรรณยุกต์ · ทัณฑฆาต — หายบ่อยในไฟล์ที่ฟอนต์เพี้ยน
  .replace(/[ำา]/g, '')      // า / ำ สลับกันได้ในไฟล์เดียวกัน
  .replace(/[\s ]+/g, '').toLowerCase()

// คำหลักที่ต้องปรากฏในไฟล์ = "เรื่อง" ของกฎหมาย โดยตัดคำนำหน้าชนิดและปีออก
function keyPhrase(t){
  const core = String(t).split(/\(|—|\/|,/)[0]
    .replace(/^(พระราชบัญญัติ|พระราชกำหนด|พระราชกฤษฎีกา|กฎกระทรวง|ประกาศกระทรวง\S*|ประกาศกรม\S*|ประกาศอธิบดี\S*|ประกาศ|ระเบียบ|ประมวลรัษฎากร)\s*/, '')
    .replace(/^เรื่อง\s*/, '')
    // ตัด "ฉบับที่ N" ออกจากคำหลักด้วย — มันเป็น "เลขประจำฉบับ" ไม่ใช่ "เรื่อง"
    // และเป็นจุดที่ฟอนต์ในไฟล์ ASA เพี้ยนบ่อยที่สุด ("ฉบับที  39" ไม่มีวรรณยุกต์)
    // ใช้เป็นคำหลักแล้วจะได้ false alarm ทั้งที่ไฟล์ถูกฉบับ — ทดสอบจริงพลาด 2 จาก 3
    .replace(/^ฉบับที่\s*[\d๐-๙]+\s*/, '')
    .replace(/พ\.?\s?ศ\.?\s?[\d๐-๙]{4}\s*/, '')
    .replace(/^\(\s*\)\s*/, '').trim()
  return core.length >= 10 ? core.slice(0, 24) : ''
}

// ── ด่านที่สอง · เลข "ฉบับที่ N" ต้องตรง ─────────────────────────────────────
// ตัด "ฉบับที่ N" ออกจากคำหลักเพื่อกัน false alarm จากฟอนต์เพี้ยน แต่เลขฉบับคือ
// "ตัวระบุฉบับ" ที่สำคัญที่สุด ทิ้งไปเฉย ๆ = ปล่อยคู่ที่ผิดฉบับผ่าน
// (เจอจริง: ไฟล์ mr35-33-upd69.pdf เป็นกฎกระทรวง ฉบับที่ 33 แต่ชื่อในดัชนีขึ้นต้นว่า "ฉบับที่ 39")
// จึงตรวจแยกอีกด่าน โดยจับแบบทนฟอนต์: "ฉบับท" + อะไรก็ได้ไม่เกิน 3 ตัว + ตัวเลข
const ISSUE_LOOSE = /ฉบับท\S{0,3}?\s*([\d๐-๙]{1,3})/
function issueNo(s){
  const m = String(s || '').match(ISSUE_LOOSE)
  if(!m) return 0
  return Number(m[1].replace(/[๐-๙]/g, d => String(THAI_DIGITS.indexOf(d)))) || 0
}

async function textOf(url){
  const r = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(25_000) })
  if(!r.ok) return { err: 'HTTP ' + r.status }
  const ct = r.headers.get('content-type') || ''
  const buf = new Uint8Array(await r.arrayBuffer())
  if(ct.includes('pdf')){
    const p = new PDFParse({ data: buf, verbosity: 0 })
    const t = String((await p.getText())?.text || '')
    await p.destroy()
    return { t }
  }
  return { t: new TextDecoder().decode(buf).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ') }
}

const rows = await (await fetch(
  `${SUPA_URL}/rest/v1/lg_gazette_index?source=eq.discovered&select=title,doc_url&limit=2000`,
  { headers: H })).json()
console.log(`ตรวจแถว discovered ${rows.length} แถว\n`)

const dead = [], mismatch = [], ok = [], skipped = []
for(const row of rows){
  const kp = keyPhrase(row.title)
  try{
    const { t, err } = await textOf(row.doc_url)
    if(err){ dead.push([row, err]); continue }
    // ── เลขฉบับต้องตรวจก่อนเสมอ แม้สกัดคำหลักไม่ได้ ──
    // ชื่อที่โมเดลเขียนคร่อมสองฉบับ ("ฉบับที่ 39 … / กฎกระทรวง ฉบับที่ 33 …")
    // ทำให้ keyPhrase() คืนค่าว่าง แล้วตกไปกอง "ตรวจไม่ได้" ทั้งที่เป็นแถวที่ผิดจริง
    // เลขฉบับเป็นตัวระบุที่หนักแน่นกว่าชื่อเรื่อง จึงต้องมาก่อน ไม่ใช่มาหลัง
    const wantIssue = issueNo(row.title), gotIssue = issueNo(t.slice(0, 400))
    if(wantIssue && gotIssue && wantIssue !== gotIssue){
      mismatch.push([row, `ฉบับที่ ${wantIssue}`, `ไฟล์เป็นฉบับที่ ${gotIssue} · ` + t.replace(/\s+/g, ' ').slice(0, 64)])
      continue
    }
    if(!kp){ skipped.push(row); continue }
    if(loose(t).includes(loose(kp))) ok.push(row)
    else mismatch.push([row, kp, t.replace(/\s+/g, ' ').slice(0, 80)])
  }catch(e){ dead.push([row, String(e.message).slice(0, 40)]) }
}

console.log(`✓ ลิงก์เปิดได้และเนื้อหาตรง   ${ok.length}`)
console.log(`✗ เนื้อหาไม่ตรงกับชื่อ         ${mismatch.length}`)
for(const [r, kp, head] of mismatch)
  console.log(`    ${r.title.slice(0, 58)}\n      ${r.doc_url}\n      หา "${kp}" ไม่เจอ · ไฟล์ขึ้นต้น: ${head}`)
console.log(`⚠ ลิงก์เปิดไม่ได้              ${dead.length}`)
for(const [r, e] of dead) console.log(`    [${e}] ${r.title.slice(0, 52)}\n      ${r.doc_url}`)
console.log(`– ชื่อสั้นเกินตรวจอัตโนมัติ     ${skipped.length}`)

// ลบเฉพาะ "ลิงก์ตาย" เท่านั้น — เปิดไม่ได้คือข้อเท็จจริงที่ยืนยันได้จากรหัสตอบกลับ
// ส่วน "เนื้อหาไม่ตรง" ยังมีโอกาสเป็น false alarm จากฟอนต์เพี้ยน จึงแค่รายงาน ให้คนตัดสิน
// ลบอัตโนมัติจากการเดาแล้วทิ้งของถูกไป แย่กว่าปล่อยของผิดไว้แล้วมีคนเห็นรายงาน
if(PRUNE && dead.length){
  for(const [r] of dead){
    await fetch(`${SUPA_URL}/rest/v1/lg_gazette_index?doc_url=eq.${encodeURIComponent(r.doc_url)}&source=eq.discovered`,
      { method: 'DELETE', headers: H })
  }
  console.log(`\nลบแถวที่ลิงก์ตายออกแล้ว ${dead.length} แถว`)
} else if(dead.length){
  console.log(`\nรันซ้ำด้วย --prune เพื่อลบแถวที่ลิงก์ตายออก`)
}
