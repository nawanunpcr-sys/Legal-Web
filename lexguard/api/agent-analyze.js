// Agent 2 — Analyst & Summarizer
// Pulls pending items from lg_agent_queue, asks Claude to summarize each into
// registry-ready requirements, writes them to lg_import_staging (status 'proposed'),
// and marks the queue item processed/error. Runnable by Vercel cron (GET) or POST.
// No hardcoded fallbacks — secrets must come from the environment (never committed to git).
const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'
const BATCH = 5  // max items per run

const SYSTEM = `คุณคือผู้ช่วย จป.วิชาชีพ สรุปกฎหมาย SHE ของไทยให้เข้าทะเบียนกฎหมาย
อ่านชื่อ/เนื้อหากฎหมายที่ได้รับ แล้ว:
1) ระบุ ชื่อเต็ม, ประเภท, กระทรวง/หน่วยงาน, วันที่ประกาศ, วันที่บังคับใช้, เอกสาร/แบบฟอร์มที่ต้องจัดทำ
2) แตกเป็น "ข้อกำหนด" รายมาตรา/ข้อ ครบทุกข้อที่สร้างหน้าที่ต้องปฏิบัติ ระบุ ใคร/ทำอะไร/ที่ไหน/อย่างไร/เอกสาร/ความถี่/เงื่อนไข
เลือกหมวด: LA=บริหาร/จป., LB=ไฟฟ้า, LC=อัคคีภัย, LD=ความร้อน/แสง/เสียง/สภาพแวดล้อม, LE=ก่อสร้าง/เครื่องจักร, LF=โทรคมนาคม/ไซเบอร์/PDPA, LG=สวัสดิการ
ตอบกลับเป็น JSON เท่านั้น ไม่มี markdown:
{"law":{"name":"","type":"","ministry":"","announce_date":"","effective_date":"","documents":"","cat":"LA","code_suggestion":""},
 "requirements":[{"section_ref":"","req_text":"","responsible":"","applicability":"","method":"","documents":"","frequency":"","other_terms":""}]}`

const strip = h => h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

async function supa(method, path, body, prefer) {
  const h = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'content-type': 'application/json' }
  if (prefer) h.Prefer = prefer
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined })
  const t = await r.text()
  if (!r.ok) throw new Error(`supabase ${path} ${r.status} ${t.slice(0, 160)}`)
  return t ? JSON.parse(t) : []
}

async function analyzeItem(item) {
  // prefer queued raw_text; otherwise fetch the source page
  let text = item.raw_text || ''
  if (text.length < 200 && item.source_url && /^https?:\/\//i.test(item.source_url)) {
    try { const r = await fetch(item.source_url, { headers: { 'user-agent': 'Mozilla/5.0 ComplyRegisterAgent' } }); if (r.ok) text = strip(await r.text()).slice(0, 16000) } catch (_) {}
  }
  const content = `ชื่อกฎหมาย: ${item.title || ''}\nวันที่ประกาศ: ${item.publication_date || ''}\nวันที่บังคับใช้: ${item.effective_date || ''}\n\nเนื้อหา/บริบท:\n${text || item.title || ''}`
  const ar = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 8000, system: SYSTEM, messages: [{ role: 'user', content }] }),
  })
  if (!ar.ok) throw new Error('Claude ' + (await ar.text()).slice(0, 160))
  let txt = (await ar.json()).content.filter(b => b.type === 'text').map(b => b.text).join('').trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim()
  const parsed = JSON.parse(txt)
  const law = parsed.law || {}, reqs = parsed.requirements || []
  const batch = 'agent-' + Date.now()
  const rows = reqs.map((r, i) => ({
    batch, law_code: law.code_suggestion || ('NEW-' + (Date.now() % 10000)), law_name: law.name || item.title || '',
    cat: law.cat || item.category_guess || 'LA', ministry: law.ministry || '',
    issue_date: law.announce_date || item.publication_date || '',
    announce_date: law.announce_date || item.publication_date || '', effective_date: law.effective_date || item.effective_date || '', doc_list: law.documents || '',
    req_seq: i, section_ref: r.section_ref || '', req_text: r.req_text || '', responsible: r.responsible || '',
    applicability: r.applicability || '', method: r.method || '', documents: r.documents || '',
    frequency: r.frequency || '', other_terms: r.other_terms || '', source_url: item.source_url || '', status: 'proposed',
  }))
  if (rows.length) await supa('POST', 'lg_import_staging', rows, 'return=minimal')
  return rows.length
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'GET/POST only' })
  // ตรวจสิทธิ์: ต้องมี header Authorization: Bearer <CRON_SECRET> ให้ตรง (Vercel Cron ส่งให้อัตโนมัติ)
  if (!process.env.CRON_SECRET || (req.headers.authorization || '') !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  if (!SUPA_URL || !SUPA_KEY) return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)' })
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY' })
  const run = (await supa('POST', 'lg_agent_runs', [{ agent: 'analyze' }], 'return=representation'))[0]
  let scanned = 0, created = 0, errors = 0
  try {
    const pending = await supa('GET', `lg_agent_queue?status=eq.pending&order=created_at.asc&limit=${BATCH}`)
    scanned = pending.length
    for (const item of pending) {
      try {
        const n = await analyzeItem(item)
        created += n
        await supa('PATCH', `lg_agent_queue?id=eq.${item.id}`, { status: 'processed', processed_at: new Date().toISOString(), error: null }, 'return=minimal')
      } catch (e) {
        errors++
        await supa('PATCH', `lg_agent_queue?id=eq.${item.id}`, { status: 'error', error: String(e.message || e).slice(0, 300) }, 'return=minimal').catch(() => {})
      }
    }
    await supa('PATCH', `lg_agent_runs?id=eq.${run.id}`, { finished_at: new Date().toISOString(), scanned, created, errors }, 'return=minimal')
    return res.status(200).json({ agent: 'analyze', scanned, created, errors })
  } catch (e) {
    await supa('PATCH', `lg_agent_runs?id=eq.${run.id}`, { finished_at: new Date().toISOString(), scanned, created, errors: errors + 1, note: String(e.message || e).slice(0, 400) }, 'return=minimal').catch(() => {})
    return res.status(500).json({ error: String(e.message || e) })
  }
}
