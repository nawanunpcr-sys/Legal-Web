#!/usr/bin/env node
/**
 * เติมดัชนีราชกิจจาฯ ย้อนหลังจากสิ่งที่ระบบเคยหามาได้แล้ว
 *
 * ทำไมต้องมี — ดัชนีจาก GD Catalog (mig 042) เริ่มที่ มิ.ย. 2566 และแก้ที่ต้นทางไม่ได้
 * แต่ระบบเคยเปิดอ่านตัวบทฉบับก่อนหน้านั้นสำเร็จมาแล้วหลายฉบับ ระหว่างตอบคำถามของ Skill 3
 * คู่ (ชื่อกฎหมาย, URL) เหล่านั้นถูกเก็บไว้ในตาราง cache อยู่แล้ว แค่ไม่เคยถูกใช้เป็นดัชนี
 *
 * อ่านจาก 3 ที่ · ทุกที่ผ่านด่านโดเมนชุดเดียวกับที่ Skill 3 ใช้ (hostAllowed)
 *   lg_ref_answers  source_url + law_name   — คำตอบของ whole_law / pending recheck
 *   lg_law_refs     source_url + ref_law_name — ตัวบทของการอ้างเจาะจงมาตรา
 *   lg_laws         source_url + name        — กฎหมายในทะเบียนที่ผู้ใช้ใส่ลิงก์ไว้เอง
 *
 * แทรกอย่างเดียว ไม่ทับของเดิม — แถวจาก gdcatalog มี เล่ม/ตอน/หน้า ครบกว่า
 *
 * วิธีรัน:
 *   node --env-file=.env scripts/backfill-gazette-discovered.mjs
 *   node --env-file=.env scripts/backfill-gazette-discovered.mjs --dry
 */

const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY
const DRY = process.argv.includes('--dry')

if(!SUPA_URL || !SUPA_KEY){
  console.error('ยังไม่ได้ตั้ง VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}
const H = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'content-type': 'application/json' }

const { hostAllowed } = await import('../api/_lib/law-source.js')
const { normalizeGazetteTitle, rememberGazetteDoc, looksLikeDocumentUrl } = await import('../api/_lib/gazette-index.js')

async function read(table, urlCol, nameCol){
  const r = await fetch(`${SUPA_URL}/rest/v1/${table}?select=${urlCol},${nameCol}&${urlCol}=not.is.null&limit=5000`, { headers: H })
  if(!r.ok){ console.warn(`  อ่าน ${table} ไม่ได้ — HTTP ${r.status}`); return [] }
  return (await r.json()).map(x => ({ url: String(x[urlCol] || '').trim(), title: String(x[nameCol] || '').trim() }))
}

const SOURCES = [
  ['lg_ref_answers', 'source_url', 'law_name'],
  ['lg_law_refs',    'source_url', 'ref_law_name'],
  ['lg_laws',        'source_url', 'name'],
]

const cand = new Map()          // url → title (ตัวแรกที่เจอชนะ)
let seen = 0, noUrl = 0, badHost = 0, notDoc = 0, shortTitle = 0

for(const [t, u, n] of SOURCES){
  const rows = await read(t, u, n)
  let ok = 0
  for(const row of rows){
    seen++
    if(!row.url){ noUrl++; continue }
    if(!hostAllowed(row.url)){ badHost++; continue }
    // ตัดหน้าสารบัญ/โดเมนเปล่า/สตริงที่มีหลาย URL — ด่านเดียวกับที่ rememberGazetteDoc ใช้
    if(!looksLikeDocumentUrl(row.url)){ notDoc++; continue }
    if(normalizeGazetteTitle(row.title).length < 12){ shortTitle++; continue }
    if(!cand.has(row.url)){ cand.set(row.url, row.title); ok++ }
  }
  console.log(`  ${t.padEnd(16)} อ่าน ${String(rows.length).padStart(4)} แถว → ใช้ได้ ${ok}`)
}

console.log(`\n── สรุป ──`)
console.log(`  อ่านมา              ${seen}`)
console.log(`  ไม่มี URL           ${noUrl}`)
console.log(`  โดเมนไม่ผ่านด่าน     ${badHost}`)
console.log(`  ไม่ใช่ตัวเอกสาร      ${notDoc}`)
console.log(`  ชื่อสั้นเกินเป็นเข็ม  ${shortTitle}`)
console.log(`  พร้อมเข้าดัชนี       ${cand.size}`)

for(const [url, title] of cand) console.log(`   · ${title.slice(0, 68).padEnd(70)} ${url.slice(0, 66)}`)

if(DRY){ console.log('\n--dry · ไม่ได้เขียนลง DB'); process.exit(0) }

let added = 0
for(const [url, title] of cand) if(await rememberGazetteDoc({ title, url })) added++
console.log(`\nเขียนแล้ว ${added} / ${cand.size} (ที่ซ้ำกับของเดิมจะถูกข้าม ไม่ทับ)`)
