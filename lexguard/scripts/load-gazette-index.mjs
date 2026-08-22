#!/usr/bin/env node
/**
 * โหลดดัชนีราชกิจจานุเบกษาเข้า lg_gazette_index
 *
 * ทำไมต้องมี — เว็บราชกิจจาฯ ค้นเองไม่ได้ ทุก path ยกเว้น /documents/<id>.pdf
 * ติด Cloudflare managed challenge (ตรวจ 2026-08-22: / · /search · /robots.txt · /sitemap.xml
 * คืน 403 พร้อมส่วนหัว cf-mitigated: challenge ทั้งหมด)
 * แปลว่า "รู้เลขเอกสารแล้วดึงไฟล์ได้ แต่หาเลขเอกสารเองไม่ได้"
 *
 * แต่ สลค. เปิดข้อมูลชุดเดียวกันไว้บน GD Catalog ซึ่งไม่มี Cloudflare ขวาง
 * เป็น JSON รายเดือน ฟิลด์: วันที่ · เรื่อง · เล่ม · ตอน · ประเภท · หน้า · URL
 * และ URL เป็นรูปแบบ /documents/<id>.pdf ครบ ซึ่งเป็นที่อยู่เดียวที่ยังเปิดได้จริง
 *
 * ⚠ ขอบเขตข้อมูล: dump ชุดนี้เริ่มที่ **มิถุนายน 2566** เท่านั้น
 * กฎหมายที่ประกาศก่อนหน้านั้นไม่มีในดัชนี ต้องเติมด้วย API ของ สลค. (ต้องมี Bearer Token
 * ขอที่ www2.soc.go.th) ซึ่งย้อนได้ทั้งคลัง · สคริปต์นี้ตั้ง source='gdcatalog'
 * ให้แถวที่โหลดจากทางนี้ เพื่อให้เติมทางที่สองทับได้โดยไม่ชนกัน
 *
 * วิธีรัน (ต้องมี VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY):
 *   node --env-file=.env scripts/load-gazette-index.mjs
 *   node --env-file=.env scripts/load-gazette-index.mjs --dry          # ดูสถิติ ไม่เขียน DB
 *   node --env-file=.env scripts/load-gazette-index.mjs --all          # ไม่กรอง noise (เก็บทุกแถว)
 *   node --env-file=.env scripts/load-gazette-index.mjs --out=x.json   # เขียนผลที่กรองแล้วลงไฟล์
 *
 * รันซ้ำได้ · upsert ด้วย doc_url จึงไม่เกิดแถวซ้ำ
 */

const CKAN = 'https://soc.gdcatalog.go.th/api/3/action/package_show?id=dataset_02_04'
const UA = 'Mozilla/5.0 LexRegistry'

const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY

const args = process.argv.slice(2)
const DRY = args.includes('--dry')
const KEEP_ALL = args.includes('--all')
const OUT = (args.find(a => a.startsWith('--out=')) || '').slice(6)

// ── ตัวกรอง ─────────────────────────────────────────────────────────────────
// ราชกิจจาฯ 1 เดือนมี 2,000–3,200 รายการ แต่ตัวบทกฎหมายจริงมีไม่กี่สิบ
// (วัดเดือน เม.ย. 2569: 2,175 รายการ · ประเภท ก มีแค่ 7 เรื่อง)
// ที่เหลือเป็นประกาศเจ้าพนักงานพิทักษ์ทรัพย์ ข้อบัญญัติ อบต. เทศบัญญัติ ฯลฯ
// ซึ่งไม่มีทางเป็น "กฎหมายที่ตัวบทฉบับอื่นอ้างถึง" — เก็บไว้ก็มีแต่ทำให้เข็มค้นชนขยะ
//
// เกณฑ์เก็บ: เป็นประเภท ก (ฉบับกฤษฎีกา = ตัวบทกฎหมายลำดับสูง) **หรือ** ชื่อเรื่องขึ้นต้น
// ด้วยชนิดกฎหมายที่สร้างหน้าที่ได้ · แล้วตัด noise ที่รู้จักออกอีกชั้น
const LAWLIKE = /^(?:พระราชบัญญัติ|พระราชกำหนด|พระราชกฤษฎีกา|กฎกระทรวง|กฎ\s*ก\.|ประกาศกระทรวง|ประกาศกรม|ประกาศคณะกรรมการ|ประกาศสำนักงาน|ประกาศสำนักนายกรัฐมนตรี|ระเบียบ|ข้อบังคับ|คำสั่งกระทรวง|คำสั่งหัวหน้า)/

// noise ที่เจอซ้ำทุกเดือนและไม่มีวันถูกกฎหมายฉบับอื่นอ้างถึง
const NOISE = new RegExp([
  'เจ้าพนักงานพิทักษ์ทรัพย์',
  'ข้อบัญญัติองค์การบริหารส่วน', 'เทศบัญญัติ', 'ข้อบัญญัติตำบล',
  'คำพิพากษาให้จัดการทรัพย์มรดก', 'พิทักษ์ทรัพย์เด็ดขาด', 'ล้มละลาย',
  'จ่ายเงินสมทบ', 'เปลี่ยนชื่อสกุล', 'ตั้งชื่อสกุล',
  'รายชื่อผู้ได้รับเลือก', 'ผลการเลือกตั้ง',
  'พระราชทานเครื่องราชอิสริยาภรณ์', 'พระราชทานยศ', 'แต่งตั้งข้าราชการ',
  'ประกาศจังหวัด', 'ประกาศเจ้าพนักงาน', 'ประกาศศาล',
].join('|'))

function keep(rec){
  const t = String(rec['เรื่อง'] || '').trim()
  if(!t) return false
  if(NOISE.test(t)) return false
  if(KEEP_ALL) return true
  if(String(rec['ประเภท'] || '').trim().startsWith('ก')) return true
  return LAWLIKE.test(t)
}

// ── แปลงรูปแบบ ──────────────────────────────────────────────────────────────
// วันที่ใน dump เป็น DD/MM/YYYY แบบ ค.ศ. ("01/04/2026") — เก็บลง date เป็น ISO
function toIso(d){
  const m = String(d || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if(!m) return null
  const [, dd, mm, yyyy] = m
  // ปีที่มากกว่า 2400 แปลว่าเป็น พ.ศ. ปนมา — ลบ 543 ไม่ใช่เดา แต่เป็นการแก้หน่วยที่ผิดชัด
  const y = Number(yyyy) > 2400 ? Number(yyyy) - 543 : Number(yyyy)
  return `${y}-${mm}-${dd}`
}
const toInt = v => { const n = parseInt(String(v ?? '').replace(/[^\d]/g, ''), 10); return Number.isFinite(n) ? n : null }

async function getJson(url){
  const r = await fetch(url, { headers: { 'user-agent': UA } })
  if(!r.ok) throw new Error(`HTTP ${r.status} — ${url}`)
  // ไฟล์บางเดือนมี BOM นำหน้า ซึ่ง JSON.parse ไม่รับ
  return JSON.parse((await r.text()).replace(/^﻿/, ''))
}

// รูปแบบไฟล์ไม่นิ่ง — ส่วนใหญ่เป็น array ตรง ๆ แต่ มิ.ย./ก.ค. 2567 ห่อไว้เป็น {"Worksheet":[...]}
// (ร่องรอยของการ export จาก Excel) · ข้อมูลข้างในเหมือนกันทุกฟิลด์
// เดิมโค้ดข้ามไฟล์แบบนี้เงียบ ๆ ทำให้หายไป 7,622 รายการโดยไม่มีอะไรฟ้อง
function toRecords(j){
  if(Array.isArray(j)) return j
  if(j && typeof j === 'object'){
    const arr = Object.values(j).find(v => Array.isArray(v))
    if(arr) return arr
  }
  return null
}

async function upsert(batch){
  const r = await fetch(`${SUPA_URL}/rest/v1/lg_gazette_index?on_conflict=doc_url`, {
    method: 'POST',
    headers: {
      apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY,
      'content-type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(batch),
  })
  if(!r.ok) throw new Error(`upsert ล้มเหลว HTTP ${r.status} — ${(await r.text()).slice(0, 300)}`)
}

async function main(){
  if(!DRY && (!SUPA_URL || !SUPA_KEY)){
    console.error('ยังไม่ได้ตั้ง VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — ใช้ --dry เพื่อดูสถิติอย่างเดียว')
    process.exit(1)
  }
  // นำเข้าหลังตรวจ env เพราะโมดูลอ่าน env ตอน import
  const { normalizeGazetteTitle } = await import('../api/_lib/gazette-index.js')

  console.log('อ่านรายการไฟล์จาก GD Catalog …')
  const pkg = await getJson(CKAN)
  const resources = (pkg?.result?.resources || []).filter(r => String(r.format).toUpperCase() === 'JSON')
  console.log(`  พบไฟล์ JSON ${resources.length} เดือน\n`)

  const seen = new Map()          // doc_url → row (กันซ้ำข้ามเดือน)
  let rawTotal = 0, dropped = 0, badUrl = 0
  const perType = {}

  let skippedFiles = 0
  for(const res of resources){
    let list
    try{ list = toRecords(await getJson(res.url)) }
    catch(e){ console.warn(`  ⚠ ข้าม ${res.name} — ${e.message}`); skippedFiles++; continue }
    if(!list){ console.warn(`  ⚠ ข้าม ${res.name} — หา array ของรายการในไฟล์ไม่เจอ`); skippedFiles++; continue }

    let kept = 0
    for(const rec of list){
      rawTotal++
      const url = String(rec['URL'] || '').trim()
      // แถวที่ไม่มี URL หรือชี้ไปที่อยู่แบบเก่า เก็บไปก็เปิดไม่ได้
      if(!/^https:\/\/ratchakitcha\.soc\.go\.th\/documents\//.test(url)){ badUrl++; continue }
      if(!keep(rec)){ dropped++; continue }

      const title = String(rec['เรื่อง']).trim()
      const type = String(rec['ประเภท'] || '').trim() || null
      perType[type] = (perType[type] || 0) + 1
      seen.set(url, {
        doc_url: url,
        title,
        title_norm: normalizeGazetteTitle(title),
        doc_type: type,
        book_no: toInt(rec['เล่ม']),
        part: String(rec['ตอน'] ?? '').trim() || null,
        page_no: toInt(rec['หน้า']),
        publish_date: toIso(rec['วันที่']),
        source: 'gdcatalog',
      })
      kept++
    }
    console.log(`  ${res.name.padEnd(42)} ${String(list.length).padStart(5)} → เก็บ ${String(kept).padStart(4)}`)
  }

  const out = [...seen.values()].sort((a, b) => String(b.publish_date).localeCompare(String(a.publish_date)))
  const dates = out.map(r => r.publish_date).filter(Boolean).sort()

  console.log(`\n── สรุป ──`)
  console.log(`  อ่านมาทั้งหมด      ${rawTotal.toLocaleString()} รายการ`)
  console.log(`  URL ใช้ไม่ได้/ว่าง  ${badUrl.toLocaleString()}`)
  console.log(`  กรอง noise ออก     ${dropped.toLocaleString()}`)
  console.log(`  เก็บเข้าดัชนี       ${out.length.toLocaleString()} รายการ (ตัดซ้ำแล้ว)`)
  console.log(`  ช่วงวันที่         ${dates[0]} → ${dates[dates.length - 1]}`)
  console.log(`  แยกตามประเภท       ${JSON.stringify(perType)}`)
  if(skippedFiles) console.log(`  ⚠ ไฟล์ที่อ่านไม่ได้  ${skippedFiles} เดือน — ดัชนีจะมีช่องโหว่`)

  if(OUT){
    const fs = await import('node:fs')
    fs.writeFileSync(OUT, JSON.stringify(out, null, 0))
    console.log(`  เขียนไฟล์          ${OUT}`)
  }
  if(DRY){ console.log('\n--dry · ไม่ได้เขียนลง DB'); return }

  // ด่านกันโหลดพัง — ถ้า สลค. เปลี่ยนโครงสร้าง resource บน GD Catalog สคริปต์จะได้ผลน้อยผิดปกติ
  // แล้ว upsert ทับของเดิมด้วยชุดที่ขาด · ดัชนีจะโหว่โดยไม่มีใครรู้จนกว่าจะมีคนถามคำถามที่ตอบไม่ได้
  // เกณฑ์นี้มาจากของจริง: 35 เดือนให้ 17,410 รายการ · ต่ำกว่าครึ่งแปลว่ามีอะไรผิด
  const MIN_ROWS = 8000
  if(out.length < MIN_ROWS && !args.includes('--force')){
    console.error(`\nหยุดไว้ก่อน — ได้แค่ ${out.length.toLocaleString()} รายการ ซึ่งน้อยกว่าเกณฑ์ ${MIN_ROWS.toLocaleString()}`)
    console.error('แปลว่ารูปแบบข้อมูลต้นทางน่าจะเปลี่ยน · ตรวจก่อนแล้วค่อยรันซ้ำด้วย --force ถ้ายืนยันว่าถูกต้อง')
    process.exit(1)
  }

  console.log('\nเขียนลง lg_gazette_index …')
  const SIZE = 500
  for(let i = 0; i < out.length; i += SIZE){
    await upsert(out.slice(i, i + SIZE))
    process.stdout.write(`  ${Math.min(i + SIZE, out.length)}/${out.length}\r`)
  }
  console.log(`\nเสร็จ · ${out.length.toLocaleString()} รายการ`)
}

main().catch(e => { console.error('ล้มเหลว:', e.message); process.exit(1) })
