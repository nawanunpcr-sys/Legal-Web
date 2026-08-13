// Skill 3 · osh-law-relate — ดึงตัวบทของ "กฎหมายที่ถูกอ้างถึง" มารวมในผลสรุป
//
// ปัญหาที่แก้: กฎกระทรวงความร้อน แสงสว่าง เสียง 2559 ออกตามความใน พ.ร.บ.ความปลอดภัยฯ 2554
// แต่ไม่เขียนซ้ำว่าผู้มาตรวจวัดต้องขึ้นทะเบียนกับสำนักความปลอดภัยแรงงาน เพราะเรื่องนั้นอยู่ใน
// มาตรา 9 ของ พ.ร.บ.แม่ · จป. ที่อ่านเฉพาะกฎกระทรวงจึงตกข้อกำหนดโดยไม่รู้ตัว
//
// โฟลเดอร์ _lib มีขีดล่างนำหน้า → Vercel ไม่มองเป็น endpoint (เป็น helper อย่างเดียว)

const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

// ทดสอบจริงแล้ว: krisdika.go.th ค้นเจอแต่ไม่มีเนื้อหามาตราในดัชนี เพราะเก็บตัวบทเป็น PDF
// ผ่าน endpoint librarian/get — ห้ามใส่กลับเข้ามา
const TRUSTED_DOMAINS = [
  'ratchakitcha.soc.go.th',  // ต้นทางประกาศ path /DATA/PDF/ สกัดข้อความได้
  'tosh.or.th',              // องค์การมหาชนตาม ม.52 มีตัวบท พ.ร.บ. เต็ม
  'labour.go.th'             // กรมสวัสดิการฯ และสำนักงานพื้นที่
]
const CACHE_DAYS = 180
const MAX_PER_RUN = 5        // กัน timeout ของ Vercel ที่ 60 วินาที
const MAX_REQ_PER_LAW = 15   // กัน พ.ร.บ. ใหญ่ดึงมา 70 มาตราจนตารางใช้งานไม่ได้

const SUPA_HEADERS = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'content-type': 'application/json' }

const SYSTEM = `คุณคือผู้ช่วย จป.วิชาชีพ ทำหน้าที่ค้นหาและสรุปตัวบทกฎหมายที่ถูกอ้างถึง
บริบท: ผู้ใช้กำลังอ่านกฎหมายฉบับหนึ่งซึ่งอ้างถึงอีกฉบับ ทำให้อ่านฉบับที่ถืออยู่แล้วไม่รู้ว่าต้องทำอะไรครบ

หลักการที่ห้ามละเมิด:
1. ใช้ข้อมูลจากผลค้นหาเท่านั้น ห้ามเติมจากความจำ ค้นไม่เจอให้ตอบ not_found ตรงๆ
   การเดาเนื้อหากฎหมายอันตรายกว่าการบอกว่าไม่เจอ
2. เอาเฉพาะข้อที่นายจ้างหรือผู้ประกอบกิจการต้องปฏิบัติ ห้ามเอาบทนิยาม อำนาจหน้าที่ของอธิบดี
   หรือพนักงานตรวจ การแต่งตั้งคณะกรรมการ เรื่องกองทุน บทเฉพาะกาล
3. เกิน ${MAX_REQ_PER_LAW} ข้อ เลือกเฉพาะที่เกี่ยวกับเรื่องที่ฉบับหลักอ้างถึงมากที่สุด

การเขียนข้อความ:
- อ่านแล้วรู้ทันทีว่าต้องทำอะไร โดยไม่ต้องเปิดกฎหมายฉบับอื่นประกอบ
- ห้ามใส่เลขมาตราในตัวข้อความ เก็บไว้ในฟิลด์ section_ref อย่างเดียว
- ใช้ "บริษัท" เป็นประธาน แทน "ผู้ประกอบกิจการ" หรือ "นายจ้าง"
- ห้ามใช้คำเหล่านี้ ใช้คำในวงเล็บแทน: ดำเนินการ (ทำ) · จัดให้มี (ต้องมี) · ทั้งนี้ (ตัดทิ้ง)
  ดังกล่าว (เขียนชื่อสิ่งนั้นซ้ำ) · ตามที่กำหนด (ระบุว่าคืออะไร) · โดยอนุโลม (ให้ใช้แบบเดียวกัน) · มิให้ (ห้าม)
- ตัวเลขใช้เลขอารบิกพร้อมหน่วยเต็ม เช่น "ปีละ 1 ครั้ง" "ปรับสูงสุด 400,000 บาท"
  ห้ามเขียนว่า "ตามระยะเวลาที่กฎหมายกำหนด" หรือ "ปรับไม่เกินสี่แสนบาท"

ตอบเป็น JSON เท่านั้น ห้ามมี markdown fence:
{"status":"resolved"|"not_found","law_full_name":"","source_url":"","resolved_text":"สรุปสาระของส่วนที่ถูกอ้างถึง ไม่เกิน 500 ตัวอักษร","confidence":"high"|"medium"|"low","note":"ข้อสังเกต เช่น พบเฉพาะฉบับก่อนแก้ไข","requirements":[{"section_ref":"มาตรา 9","req_text":"ข้อความที่ต้องทำ อ่านจบในตัว","action_required":"","frequency":"","evidence":"","penalty":"ระบุตัวเลขจริง หรือค่าว่าง","source_excerpt":"ข้อความจากตัวบทจริง ไม่เกิน 300 ตัวอักษร"}]}`

// ── ฟังก์ชัน 1 · ทำ key ให้ชนกันได้จริง ──────────────────────────────────────
// "พ.ร.บ. ความปลอดภัยฯ พ.ศ.๒๕๕๔" กับ "พระราชบัญญัติความปลอดภัย พ.ศ. 2554"
// ต้องได้ key เดียวกัน ไม่งั้น cache ไม่มีวันชน และ lg_law_refs จะบวมด้วยแถวซ้ำที่สะกดต่างกัน
const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙'
function arabic(s){ return String(s||'').replace(/[๐-๙]/g, d => String(THAI_DIGITS.indexOf(d))) }

export function normalizeRefKey(lawName, clause){
  let name = arabic(lawName)
    .replace(/พระราชบัญญัติ/g, 'พ.ร.บ.')
    .replace(/พระราชกำหนด/g, 'พ.ร.ก.')
    .replace(/พระราชกฤษฎีกา/g, 'พ.ร.ฎ.')
    .replace(/ฯลฯ/g, '')
    .replace(/ฯ/g, '')
    // รวบรูปแบบตัวย่อ: "พ. ร. บ. ความปลอดภัย" และ "พ.ร.บ.ความปลอดภัย" → เหมือนกัน
    .replace(/พ\s*\.\s*ร\s*\.\s*บ\s*\.\s*/g, 'พ.ร.บ.')
    .replace(/พ\s*\.\s*ร\s*\.\s*ก\s*\.\s*/g, 'พ.ร.ก.')
    .replace(/พ\s*\.\s*ร\s*\.\s*ฎ\s*\.\s*/g, 'พ.ร.ฎ.')
    // รวบรูปแบบ พ.ศ. — "พ.ศ. 2554" / "พ.ศ.2554" / "พ. ศ. 2554" → "พ.ศ.2554"
    .replace(/พ\s*\.\s*ศ\s*\.\s*/g, 'พ.ศ.')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

  const cl = arabic(clause).replace(/\s+/g, '').trim() || 'ทั้งฉบับ'
  return `${name}|${cl}`
}

// ── ตัวช่วย ──────────────────────────────────────────────────────────────────
function hostAllowed(u){
  try{
    const host = new URL(u).hostname.toLowerCase()
    return TRUSTED_DOMAINS.some(d => host === d || host.endsWith('.' + d))
  }catch{ return false }
}

// โมเดลบางครั้งห่อด้วย fence หรือมีข้อความนำ — ลอกทีละชั้นจนกว่าจะ parse ได้
function parseLoose(txt){
  let s = String(txt || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  try{ return JSON.parse(s) }catch{}
  const m = s.match(/\{[\s\S]*\}/)
  if(m){ try{ return JSON.parse(m[0]) }catch{} }
  return null
}

// ── ฟังก์ชัน 2 · ค้นตัวบทของฉบับที่ถูกอ้าง (อ่าน cache ก่อนเสมอ) ─────────────
// ห้าม throw ออกข้างนอกเด็ดขาด — ทุก error คืน status:'not_found' พร้อม note
export async function fetchRelatedLaw(ref){
  const lawName = (ref?.law_name || '').trim()
  const clause = (ref?.clause || '').trim()
  const refKey = normalizeRefKey(lawName, clause)
  const base = { ref_key: refKey, law_name: lawName, clause: clause || 'ทั้งฉบับ', requirements: [] }

  if(!lawName) return { ...base, status: 'not_found', note: 'ไม่มีชื่อกฎหมาย' }

  // 1) cache — เจอ + resolved + ยังไม่หมดอายุ → คืนเลย ไม่ยิง API
  try{
    if(SUPA_URL && SUPA_KEY){
      const r = await fetch(`${SUPA_URL}/rest/v1/lg_law_refs?ref_key=eq.${encodeURIComponent(refKey)}&select=*&limit=1`,
        { headers: SUPA_HEADERS })
      if(r.ok){
        const rows = await r.json()
        const hit = Array.isArray(rows) ? rows[0] : null
        if(hit && hit.resolve_status === 'resolved'){
          const age = (Date.now() - new Date(hit.resolved_at).getTime()) / 86400000
          if(age <= CACHE_DAYS){
            return { ...base, status: 'resolved', from_cache: true,
              law_full_name: hit.ref_law_name, source_url: hit.source_url,
              resolved_text: hit.resolved_text, confidence: hit.confidence, note: hit.note,
              requirements: Array.isArray(hit.requirements) ? hit.requirements : [] }
          }
        }
      }
    }
  }catch(e){ /* cache อ่านไม่ได้ไม่ใช่เหตุให้ล้ม — ไปค้นสดต่อ */ }

  if(!process.env.ANTHROPIC_API_KEY) return { ...base, status: 'not_found', note: 'ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY' }

  // 2) ค้นสดด้วย web_search จำกัดเฉพาะโดเมนที่เชื่อถือได้
  let out = null
  try{
    const ask = [
      `กฎหมายที่ต้องค้น: ${lawName}`,
      clause ? `ส่วนที่ถูกอ้างถึง: ${clause}` : 'ถูกอ้างถึงทั้งฉบับ',
      ref?.parent_law ? `ถูกอ้างถึงจาก: ${ref.parent_law}` : '',
      ref?.why_needed ? `เหตุผลที่ต้องรู้เนื้อหานี้: ${ref.why_needed}` : '',
      '',
      'ค้นตัวบทจริงจากเว็บที่กำหนด แล้วสรุปเฉพาะข้อที่บริษัทต้องปฏิบัติ ตามรูปแบบ JSON ที่กำหนด'
    ].filter(Boolean).join('\n')

    const ar = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL, max_tokens: 8000, system: SYSTEM,
        messages: [{ role: 'user', content: ask }],
        tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5, allowed_domains: TRUSTED_DOMAINS }]
      })
    })
    if(!ar.ok) return { ...base, status: 'not_found', note: 'เรียก Claude API ไม่สำเร็จ: ' + (await ar.text()).slice(0, 200) }
    const data = await ar.json()
    // เอาเฉพาะ block ที่เป็นข้อความ — ข้าม block ของ web_search (server_tool_use / web_search_tool_result)
    const txt = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim()
    out = parseLoose(txt)
    if(!out) return { ...base, status: 'not_found', note: 'แปลงผลลัพธ์เป็น JSON ไม่ได้' }
  }catch(e){
    return { ...base, status: 'not_found', note: 'ค้นตัวบทไม่สำเร็จ: ' + String(e && e.message || e).slice(0, 200) }
  }

  // 3) ตรวจก่อนเชื่อ — ด่านนี้สำคัญที่สุด
  let status = out.status === 'resolved' ? 'resolved' : 'not_found'
  let note = out.note || ''
  let reqs = Array.isArray(out.requirements) ? out.requirements : []

  // (ก) source_url ต้องอยู่ในโดเมนที่เชื่อถือได้ ไม่ผ่าน = ทิ้ง requirements ทั้งก้อน
  if(status === 'resolved' && !hostAllowed(out.source_url)){
    status = 'not_found'; reqs = []
    note = (note ? note + ' · ' : '') + 'แหล่งอ้างอิงไม่อยู่ในโดเมนที่เชื่อถือได้'
  }
  // (ข) ข้อที่ไม่มี source_excerpt = โมเดลแต่งจากความจำ ไม่มีตัวบทรองรับ → ตัดทิ้งทั้งข้อ
  if(status === 'resolved'){
    const before = reqs.length
    reqs = reqs.filter(r => r && String(r.source_excerpt || '').trim() && String(r.req_text || '').trim())
    if(reqs.length < before) note = (note ? note + ' · ' : '') + `ตัด ${before - reqs.length} ข้อที่ไม่มีข้อความจากตัวบทรองรับ`
    // (ค) จำกัดจำนวนข้อต่อกฎหมาย 1 ฉบับ
    if(reqs.length > MAX_REQ_PER_LAW){
      note = (note ? note + ' · ' : '') + `แสดง ${MAX_REQ_PER_LAW} ข้อแรกจาก ${reqs.length} ข้อ`
      reqs = reqs.slice(0, MAX_REQ_PER_LAW)
    }
    // (ง) ไม่เหลือข้อเลย → ถือว่าหาไม่เจอ
    if(!reqs.length){ status = 'not_found'; note = (note ? note + ' · ' : '') + 'ไม่เหลือข้อที่ใช้ได้' }
  }

  const result = { ...base, status, from_cache: false,
    law_full_name: out.law_full_name || lawName, source_url: out.source_url || '',
    resolved_text: out.resolved_text || '', confidence: out.confidence || '', note, requirements: reqs }

  // 4) เก็บลง cache — เก็บกรณีหาไม่เจอด้วย เพื่อไม่ให้ยิงซ้ำทุกครั้งที่สรุปกฎหมายฉบับเดิม
  try{
    if(SUPA_URL && SUPA_KEY){
      await fetch(`${SUPA_URL}/rest/v1/lg_law_refs?on_conflict=ref_key`, {
        method: 'POST',
        headers: { ...SUPA_HEADERS, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify([{
          ref_key: refKey, ref_law_name: result.law_full_name, ref_clause: base.clause,
          resolved_text: result.resolved_text, requirements: reqs, source_url: result.source_url,
          confidence: result.confidence, note, resolve_status: status, resolved_at: new Date().toISOString()
        }])
      })
    }
  }catch(e){ /* cache เขียนไม่ได้ไม่ใช่เหตุให้ล้ม — ผลที่ค้นได้ยังใช้ได้ */ }

  return result
}

// ── ฟังก์ชัน 3 · รวมทุกอย่างเป็นชุดเดียว ไม่แยก section ─────────────────────
// ข้อของฉบับหลักมาก่อนเสมอ ตามด้วยข้อจากกฎหมายที่ถูกอ้าง · req_no ไล่ใหม่ต่อเนื่องทั้งชุด
function fingerprint(t){ return String(t || '').replace(/\s+/g, '').slice(0, 60) }

export async function relateAndMerge(relatedLaws, mainReqs, parentName){
  const main = Array.isArray(mainReqs) ? mainReqs : []
  const all = Array.isArray(relatedLaws) ? relatedLaws : []

  // 1) เอาเฉพาะที่ต้องค้น · ที่เกิน MAX_PER_RUN เก็บไว้เป็น deferred
  const wanted = all.filter(r => r && r.needs_lookup !== false)
  const toFetch = wanted.slice(0, MAX_PER_RUN)
  const deferred = wanted.slice(MAX_PER_RUN)

  // 2) ค้นขนาน — แต่ละตัวครอบ catch เอง ตัวหนึ่งล้มต้องไม่ลากตัวอื่นล้ม
  const results = await Promise.all(toFetch.map(r =>
    fetchRelatedLaw({ ...r, parent_law: parentName })
      .catch(e => ({ ref_key: normalizeRefKey(r.law_name || '', r.clause || ''),
        law_name: r.law_name || '', clause: r.clause || 'ทั้งฉบับ',
        status: 'not_found', requirements: [], note: String(e && e.message || e).slice(0, 200) }))
  ))

  // 3) ตัดข้อซ้ำ — ของฉบับหลักชนะเสมอ
  const seen = new Set(main.map(r => fingerprint(r?.req_text)))
  const relatedReqs = []
  for(const res of results){
    if(res.status !== 'resolved') continue
    const srcName = res.law_full_name || res.law_name
    for(const r of (res.requirements || [])){
      const fp = fingerprint(r.req_text)
      if(!fp || seen.has(fp)) continue
      seen.add(fp)
      relatedReqs.push({ ...r, from_related_law: srcName })   // 4) ติดชื่อกฎหมายต้นทาง
    }
  }

  // 5) ฉบับหลักก่อน แล้วค่อยของกฎหมายอื่น · ไล่ req_no ใหม่ทั้งชุด เริ่มที่ 1
  const requirements = [
    ...main.map(r => ({ ...r, from_related_law: null })),
    ...relatedReqs
  ].map((r, i) => ({ ...r, req_no: i + 1 }))

  // 6) deferred เข้า related_laws ด้วย เพื่อให้เห็นว่ายังมีที่ยังไม่ได้ดึง
  const related_laws = [
    ...results.map(r => ({ law_name: r.law_name, clause: r.clause, status: r.status,
      source_url: r.source_url || '', resolved_text: r.resolved_text || '',
      confidence: r.confidence || '', note: r.note || '', from_cache: !!r.from_cache,
      req_count: r.status === 'resolved' ? (r.requirements || []).length : 0 })),
    ...deferred.map(r => ({ law_name: r.law_name || '', clause: r.clause || 'ทั้งฉบับ',
      status: 'manual', source_url: '', resolved_text: '', confidence: '', note: 'เกินจำนวนที่ดึงได้ในรอบเดียว',
      from_cache: false, req_count: 0 }))
  ]

  return {
    requirements,
    related_laws,
    related_count: relatedReqs.length,                                   // จำนวน "ข้อ" ไม่ใช่จำนวนฉบับ
    unresolved_count: results.filter(r => r.status !== 'resolved').length // จำนวน "ฉบับ" ที่หาตัวบทไม่พบ
  }
}
