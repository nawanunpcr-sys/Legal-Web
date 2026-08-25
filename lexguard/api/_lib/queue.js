// ── งานเป็นชุด: เข้าคิวและประมวลผลทีละรายการ (ใช้ lg_agent_queue / lg_agent_runs เดิม) ──
//
// ═══ ทำไมต้องมีไฟล์นี้ ═══
// กติกาข้อ 6: งานที่ทำหลายฉบับ ห้ามวนยิงจากฝั่งหน้าจอ · เหตุผลคือหน้าจอวนยิง 150 คำขอ
// จะได้ผลอย่างใดอย่างหนึ่งเสมอ — โดนด่าน rate limit ตั้งแต่ฉบับที่ 11, หรือผู้ใช้ปิดแท็บ
// กลางคันแล้วงานหายไปโดยไม่มีใครรู้ว่าค้างอยู่ตรงไหน · คิวทำให้ "ค้างอยู่ตรงไหน" ตอบได้เสมอ
//
// ═══ ทำไมยัดลงคอลัมน์เดิม ไม่เพิ่มคอลัมน์ใหม่ ═══
// เกณฑ์ผ่านของขั้นที่ 0 ระบุว่า "ไม่มี migration ในขั้นนี้ ข้อมูลในฐานต้องไม่เปลี่ยนแม้แต่แถวเดียว"
// lg_agent_queue (migration 006) ออกแบบมาสำหรับงานกวาดราชกิจจาฯ จึงไม่มีคอลัมน์ประเภทงาน
// และรหัสอ้างอิง · แทนที่จะรอ migration เราจับคู่ลงคอลัมน์เดิมที่ชนิดข้อมูลตรงกันพอดี:
//
//   category_guess  → ประเภทงาน (kind)      เช่น 'law_screen'
//   source_url      → รหัสอ้างอิง (ref)     เช่น 'law:123'  (text ไม่บังคับว่าต้องเป็น URL)
//   title           → ป้ายให้คนอ่าน         เช่น 'LA-001 ประกาศกรมสวัสดิการฯ'
//   raw_text        → payload เป็น JSON string
//   status/error/created_at/processed_at → ใช้ตามความหมายเดิมทุกประการ
//
// ตารางนี้มี 0 แถวใน production จึงไม่มีข้อมูลเดิมของใครให้ชนกัน
// ถ้าภายหลังอยากได้คอลัมน์จริง ให้เพิ่มด้วย `add column if not exists` (กติกา 9.1 อนุญาต)
// แล้วแก้เฉพาะค่าคงที่ COL ข้างล่างนี้ — ที่เหลือทั้งไฟล์ไม่ต้องแตะ

const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY
const H = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'content-type': 'application/json' }

export const COL = { kind: 'category_guess', ref: 'source_url', label: 'title', payload: 'raw_text' }

const enc = encodeURIComponent

async function rest(path, init = {}) {
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } })
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${(await r.text()).slice(0, 300)}`)
  const t = await r.text()
  return t ? JSON.parse(t) : []
}

// ── เข้าคิว ─────────────────────────────────────────────────────────────────
// items = [{ kind, ref, label, payload }] · คืนจำนวนที่เพิ่มจริงกับที่ข้าม
// ข้ามรายการที่ยัง pending อยู่แล้วสำหรับ (kind, ref) เดียวกัน — กดปุ่มซ้ำจึงไม่ทำให้คิวบวม
export async function enqueue(items = []) {
  const list = items.filter(it => it && it.kind && it.ref)
  if (!list.length) return { queued: 0, skipped: 0, ids: [] }

  const kinds = [...new Set(list.map(it => it.kind))]
  const existing = await rest(
    `lg_agent_queue?select=${COL.kind},${COL.ref}&status=eq.pending&${COL.kind}=in.(${kinds.map(enc).join(',')})`)
  const seen = new Set(existing.map(r => r[COL.kind] + '|' + r[COL.ref]))

  const rows = []
  for (const it of list) {
    const key = it.kind + '|' + it.ref
    if (seen.has(key)) continue
    seen.add(key)   // กันซ้ำภายในชุดเดียวกันด้วย
    rows.push({
      [COL.kind]: it.kind, [COL.ref]: String(it.ref),
      [COL.label]: (it.label || '').slice(0, 300),
      [COL.payload]: it.payload === undefined ? null : JSON.stringify(it.payload),
      status: 'pending',
    })
  }
  if (!rows.length) return { queued: 0, skipped: list.length, ids: [] }
  const ins = await rest('lg_agent_queue?select=id', {
    method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(rows) })
  return { queued: rows.length, skipped: list.length - rows.length, ids: ins.map(r => r.id) }
}

// ── นับงานค้าง (ให้หน้าจอบอกได้ว่า "เหลืออีกกี่ฉบับ") ────────────────────────
export async function queueCounts(kind) {
  const q = kind ? `&${COL.kind}=eq.${enc(kind)}` : ''
  const out = {}
  for (const st of ['pending', 'processing', 'processed', 'error']) {
    const r = await fetch(`${SUPA_URL}/rest/v1/lg_agent_queue?select=id&status=eq.${st}${q}`,
      { headers: { ...H, Prefer: 'count=exact', Range: '0-0' } })
    out[st] = Number((r.headers.get('content-range') || '/0').split('/')[1]) || 0
  }
  return out
}

// ── หยิบงานถัดไปมาทำ ────────────────────────────────────────────────────────
// จองด้วยการเปลี่ยนสถานะเป็น 'processing' แบบมีเงื่อนไข (status=eq.pending)
// PostgREST คืนแถวที่อัปเดตจริงกลับมา — ถ้าคืนว่าง แปลว่ามีคนอื่นชิงไปก่อนแล้ว
// ไม่ใช่การล็อกระดับฐานข้อมูลจริง แต่พอสำหรับงานที่ทำครั้งละคน และไม่ต้องแก้ schema
export async function claimNext(kind) {
  const found = await rest(
    `lg_agent_queue?select=*&status=eq.pending&${COL.kind}=eq.${enc(kind)}&order=created_at.asc,id.asc&limit=1`)
  if (!found.length) return null
  const row = found[0]
  const claimed = await rest(`lg_agent_queue?id=eq.${row.id}&status=eq.pending`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ status: 'processing' }) })
  if (!claimed.length) return null
  const c = claimed[0]
  let payload = null
  try { payload = c[COL.payload] ? JSON.parse(c[COL.payload]) : null } catch { payload = null }
  return { id: c.id, kind: c[COL.kind], ref: c[COL.ref], label: c[COL.label], payload, row: c }
}

export async function completeItem(id, note = '') {
  await rest(`lg_agent_queue?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({
    status: 'processed', error: note ? String(note).slice(0, 500) : null,
    processed_at: new Date().toISOString() }) })
}

export async function failItem(id, err) {
  await rest(`lg_agent_queue?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({
    status: 'error', error: String(err?.message || err).slice(0, 500),
    processed_at: new Date().toISOString() }) })
}

// คืนงานที่ค้างสถานะ processing กลับเป็น pending (เช่น instance ตายกลางคัน)
// ⚠ ตารางไม่มีคอลัมน์ "เวลาที่หยิบงาน" จึงต้องใช้ created_at เป็นตัวประมาณ
//   แปลว่างานเก่าที่เพิ่งถูกหยิบไปทำเมื่อครู่ก็เข้าเงื่อนไขด้วย · เรียกใช้เฉพาะตอนที่แน่ใจว่า
//   ไม่มีคำขอไหนกำลังทำงานอยู่ (คิวนิ่งแล้ว) ห้ามเรียกอัตโนมัติระหว่างประมวลผล
export async function requeueStale(kind, olderThanMs = 15 * 60_000) {
  const cutoff = new Date(Date.now() - olderThanMs).toISOString()
  const rows = await rest(
    `lg_agent_queue?select=id&status=eq.processing&${COL.kind}=eq.${enc(kind)}&created_at=lt.${cutoff}`)
  if (!rows.length) return 0
  await rest(`lg_agent_queue?id=in.(${rows.map(r => r.id).join(',')})`, {
    method: 'PATCH', body: JSON.stringify({ status: 'pending' }) })
  return rows.length
}

// คืนงานที่ค้างสถานะ processing ทั้งหมดของประเภทนี้กลับเป็น pending
// ต่างจาก requeueStale ตรงที่ไม่พึ่ง created_at (ซึ่งเป็นตัวประมาณที่ผิดได้)
// ⚠ เรียกได้เฉพาะตอนที่แน่ใจว่าไม่มีรอบอื่นกำลังทำงาน — ปัจจุบันคือต้นรอบใน queue-run.js
export async function resetProcessing(kind) {
  const rows = await rest(`lg_agent_queue?select=id&status=eq.processing&${COL.kind}=eq.${enc(kind)}`)
  if (!rows.length) return 0
  await rest(`lg_agent_queue?id=in.(${rows.map(r => r.id).join(',')})`, {
    method: 'PATCH', body: JSON.stringify({ status: 'pending', error: 'รอบก่อนหน้าถูกตัดกลางคัน — นำกลับเข้าคิวอัตโนมัติ' }) })
  return rows.length
}

// ── บันทึกรอบการทำงาน (lg_agent_runs) ───────────────────────────────────────
export async function startRun(agent) {
  const r = await rest('lg_agent_runs?select=id', {
    method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ agent, started_at: new Date().toISOString() }) })
  return r[0]?.id || null
}

export async function finishRun(id, { scanned = 0, created = 0, errors = 0, note = '' } = {}) {
  if (!id) return
  await rest(`lg_agent_runs?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({
    finished_at: new Date().toISOString(), scanned, created, errors, note: String(note).slice(0, 500) }) })
}

// ── ประมวลผลคิวทีละรายการภายในงบเวลาของฟังก์ชัน ─────────────────────────────
// handler(item) → { ok: true, note? } | โยน error
// หยุดเองเมื่อเวลาเหลือไม่พอสำหรับอีก 1 รายการ แล้วบอกว่าเหลือค้างกี่งาน
// (แบบเดียวกับที่ api/law-repeal-check.js กันเวลาไว้ 270 วิ — เริ่มแล้วโดนตัดกลางคัน
//  เสียทั้งเวลาและโควตา AI โดยไม่ได้ผลอะไรกลับมา)
export async function processQueue(kind, handler, {
  budgetMs = 270_000, perItemMs = 60_000, gapMs = 1_200, agent = kind, max = 50,
} = {}) {
  const startedAt = Date.now()
  const runId = await startRun(agent)
  let done = 0, failed = 0, stopped = ''
  try {
    while (done + failed < max) {
      if (budgetMs - (Date.now() - startedAt) < perItemMs) { stopped = 'หมดงบเวลาของคำขอนี้'; break }
      const item = await claimNext(kind)
      if (!item) { stopped = 'คิวว่าง'; break }
      try {
        const r = await handler(item)
        await completeItem(item.id, r?.note || '')
        done++
      } catch (e) {
        await failItem(item.id, e)
        failed++
      }
      if (gapMs) await new Promise(r => setTimeout(r, gapMs))   // กันชน rate limit ฝั่ง Anthropic
    }
  } finally {
    await finishRun(runId, { scanned: done + failed, created: done, errors: failed, note: stopped })
  }
  const left = await queueCounts(kind)
  return { done, failed, stopped, remaining: left.pending + left.processing, counts: left, run_id: runId }
}
