// สคริปต์ครั้งเดียว · ค้น "เหตุผลการยกเลิกของจริง" ให้กฎหมายที่ทะเบียนทำเครื่องหมายว่ายกเลิกไว้แล้ว
//
// ทำไมต้องมี: 10 ฉบับที่ยกเลิกในทะเบียนมีเหตุผลเป็นข้อความเดียวกันหมด
// "ยกเลิกตามทะเบียน F-259 (ส่วนกฎหมายที่ยกเลิก)" ซึ่งไม่ใช่เหตุผล — มันแค่บอกว่าลอกมาจากไฟล์
// ผู้ตรวจ ISO ถามว่า "ยกเลิกด้วยฉบับไหน เมื่อไร" แล้วตอบไม่ได้
//
// ⚠ สคริปต์นี้ **ไม่เขียนลง lg_laws** เด็ดขาด — ลงคิว lg_repeal_checks (pending) อย่างเดียว
// เหมือน endpoint ทุกประการ แล้วรอเจ้าหน้าที่กดยืนยันในหน้าเว็บ (ข้อ 2.7)
// ใช้ sanitize + askWithSearch ตัวเดียวกับ endpoint เพื่อไม่ให้กติกาสองที่เพี้ยนจากกัน
//
// รัน: node --env-file=.env scripts/check-repealed-laws.mjs
import { sanitize, askWithSearch } from '../api/law-repeal-check.js'

const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY
const H = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'content-type': 'application/json' }
const sleep = ms => new Promise(r => setTimeout(r, ms))

const r = await fetch(`${SUPA_URL}/rest/v1/lg_laws?select=id,code,name,issue_date,ministry,gazette_ref,source_url&status=eq.repealed&order=code`, { headers: H })
const laws = await r.json()
console.log(`พบกฎหมายที่ทำเครื่องหมายยกเลิกไว้ ${laws.length} ฉบับ\n`)

const pend = await (await fetch(`${SUPA_URL}/rest/v1/lg_repeal_checks?select=law_id&status=eq.pending`, { headers: H })).json()
const done = new Set((Array.isArray(pend) ? pend : []).map(x => x.law_id))
if (done.size) console.log(`ข้าม ${done.size} ฉบับที่มีผลค้างคิวอยู่แล้ว\n`)

const searchDate = new Date().toISOString().slice(0, 10)
const rows = []
for (let i = 0; i < laws.length; i++) {
  const law = laws[i]
  if (done.has(law.id)) continue
  if (i) await sleep(1500)
  const t0 = Date.now()
  process.stdout.write(`[${i + 1}/${laws.length}] ${law.code} … `)

  const q = [
    'ตรวจสอบสถานะการบังคับใช้ของกฎหมายฉบับนี้:',
    `ชื่อเต็ม: ${law.name}`,
    law.ministry ? `หน่วยงาน/กระทรวง: ${law.ministry}` : '',
    law.issue_date ? `วันที่ประกาศตามทะเบียน: ${law.issue_date}` : '',
    law.gazette_ref ? `อ้างอิงราชกิจจานุเบกษา: ${law.gazette_ref}` : '',
    '',
    'หมายเหตุ: ทะเบียนของเราบันทึกไว้ว่าฉบับนี้ถูกยกเลิกแล้ว แต่ไม่มีหลักฐานว่ายกเลิกด้วยฉบับใด',
    'กรุณาหาว่าถูกยกเลิก/แทนที่ด้วยฉบับใด เมื่อใด และมีฉบับใหม่ใช้แทนหรือไม่',
    'ถ้าหาหลักฐานไม่ได้ ให้ตอบ uncertain ตามกติกา ห้ามเดา',
    '',
    `วันที่ค้น (ใส่ลงฟิลด์ search_date): ${searchDate}`,
  ].filter(Boolean).join('\n')

  const out = await askWithSearch(q, 60_000)
  if (out.error || !out.json) { console.log('ไม่สำเร็จ —', out.error || 'อ่าน JSON ไม่ได้'); continue }
  const rec = sanitize(out.json, law, searchDate, out.foundUrls)
  console.log(`${rec.law_status} · ความมั่นใจ ${rec.confidence} · แหล่งอ้างอิง ${rec.sources.length} · ${((Date.now() - t0) / 1000).toFixed(0)} วิ`)
  if (rec.repealed_by?.law_title) console.log(`        ยกเลิกโดย: ${rec.repealed_by.law_title}`)
  // บันทึกทีละฉบับทันทีที่ได้ผล — ไม่รอจบทั้งชุด
  // ถ้ารันขาดกลางคัน (หมดเวลา/เน็ตหลุด) ฉบับที่ค้นไปแล้วต้องไม่สูญเปล่า
  // และรันซ้ำได้โดยข้ามฉบับที่มีผลค้างคิวอยู่แล้ว
  const row = { ...rec, raw: out.json, elapsed_ms: Date.now() - t0, status: 'pending' }
  delete row.code; delete row.name; delete row.registry_match
  const ir = await fetch(`${SUPA_URL}/rest/v1/lg_repeal_checks`, {
    method: 'POST', headers: H, body: JSON.stringify(row) })
  if (!ir.ok) console.log(`        ลงคิวไม่สำเร็จ: ${(await ir.text()).slice(0, 200)}`)
  else rows.push(row)
}

console.log(`\nลงคิวรอยืนยันแล้ว ${rows.length} จาก ${laws.length} ฉบับ`)
console.log('ทั้งหมดยังไม่ถูกบันทึกลงทะเบียน — เปิดหน้าทะเบียนแล้วกด "ตรวจสอบ / ยืนยัน" ทีละรายการ')
