// Agent 1 — Gazette Watcher & Retriever
// Fetches public legal sources, asks Claude to extract SHE-relevant new laws,
// dedupes against the registry, and enqueues fresh items in lg_agent_queue.
// Runnable by Vercel cron (GET) or manually (POST). Logs to lg_agent_runs.
// No hardcoded fallbacks — secrets must come from the environment (never committed to git).
const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

const SOURCES = [
  'https://ratchakitcha.soc.go.th',
  'https://www.shawpat.or.th/th/safety-law',
  'https://www.dlpw.go.th',
]

const SYSTEM = `คุณคือเอเจนต์เฝ้าระวังกฎหมายความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน (SHE) ของไทย
จากข้อความหน้าเว็บราชการ/แหล่งกฎหมายที่ให้มา ให้ดึงเฉพาะ "กฎหมาย/ประกาศ/กฎกระทรวง/พระราชบัญญัติ" ที่เกี่ยวข้องกับ SHE
คำสำคัญที่เกี่ยวข้อง: ความปลอดภัย, อาชีวอนามัย, สภาพแวดล้อมในการทำงาน, ไฟฟ้า/พลังงาน, อัคคีภัย, ความร้อน/แสง/เสียง,
ก่อสร้าง/เครื่องจักร/ปั้นจั่น/ที่อับอากาศ/ที่สูง, สารเคมีอันตราย, สิ่งแวดล้อม, จป., คปอ., คุ้มครองแรงงาน, สวัสดิการ, ไซเบอร์/PDPA
ตอบกลับเป็น JSON เท่านั้น ไม่มี markdown:
{"items":[{"title":"ชื่อกฎหมายเต็ม","publication_date":"วันที่ประกาศ (ถ้ามี)","effective_date":"วันที่บังคับใช้ (ถ้ามี)","category_guess":"LA|LB|LC|LD|LE|LF|LG","summary":"สรุปสั้น 1 บรรทัด"}]}
หมวด: LA=บริหาร/จป./ระบบ, LB=ไฟฟ้า/พลังงาน, LC=อัคคีภัย, LD=ความร้อน/แสง/เสียง/สภาพแวดล้อม, LE=ก่อสร้าง/เครื่องจักร, LF=โทรคมนาคม/ไซเบอร์/PDPA, LG=สวัสดิการ
เก็บเฉพาะรายการที่เป็นชื่อกฎหมายจริงและเกี่ยวข้องกับ SHE ข้ามเมนู/ข่าว/อบรม/บทความ`

const strip = h => h.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
const norm = s => (s || '').toLowerCase().replace(/[\s฀-ฏ.,()"'’\-]/g, '')

async function supa(method, path, body, prefer) {
  const h = { apikey: SUPA_KEY, Authorization: 'Bearer ' + SUPA_KEY, 'content-type': 'application/json' }
  if (prefer) h.Prefer = prefer
  const r = await fetch(`${SUPA_URL}/rest/v1/${path}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined })
  const t = await r.text()
  if (!r.ok) throw new Error(`supabase ${path} ${r.status} ${t.slice(0, 160)}`)
  return t ? JSON.parse(t) : []
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'GET/POST only' })
  if (!SUPA_URL || !SUPA_KEY) return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)' })
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY' })
  const run = (await supa('POST', 'lg_agent_runs', [{ agent: 'gazette' }], 'return=representation'))[0]
  let scanned = 0, created = 0, errors = 0, note = ''
  try {
    // 1) gather page text from all sources (best-effort)
    let text = ''
    for (const u of SOURCES) {
      try { const r = await fetch(u, { headers: { 'user-agent': 'Mozilla/5.0 ComplyRegisterAgent' } }); if (r.ok) text += '\n\n[' + u + ']\n' + strip(await r.text()) }
      catch (e) { note += `fetch fail ${u}; ` }
    }
    text = text.slice(0, 16000)
    if (text.length < 200) throw new Error('ดึงเนื้อหาจากแหล่งข้อมูลไม่ได้')

    // 2) Claude extract
    const ar = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 3000, system: SYSTEM, messages: [{ role: 'user', content: 'เนื้อหาหน้าเว็บ:\n\n' + text }] }),
    })
    if (!ar.ok) throw new Error('Claude ' + (await ar.text()).slice(0, 160))
    let txt = (await ar.json()).content.filter(b => b.type === 'text').map(b => b.text).join('').trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim()
    const items = (JSON.parse(txt).items) || []
    scanned = items.length

    // 3) dedupe against registry + queue + updates
    const [laws, queue, updates] = await Promise.all([
      supa('GET', 'lg_laws?select=name'),
      supa('GET', 'lg_agent_queue?select=title'),
      supa('GET', 'lg_law_updates?select=title'),
    ])
    const known = new Set([...laws, ...queue, ...updates].map(x => norm(x.name || x.title)))
    const fresh = items.filter(it => it.title && ![...known].some(k => k && (k.includes(norm(it.title).slice(0, 18)) || norm(it.title).includes(k.slice(0, 18)))))

    // 4) enqueue
    if (fresh.length) {
      const rows = fresh.map(it => ({
        source_url: SOURCES[0], title: it.title, raw_text: it.summary || '',
        publication_date: it.publication_date || '', effective_date: it.effective_date || '',
        category_guess: it.category_guess || '', status: 'pending',
      }))
      await supa('POST', 'lg_agent_queue', rows, 'return=minimal')
      created = rows.length
    }
    await supa('PATCH', `lg_agent_runs?id=eq.${run.id}`, { finished_at: new Date().toISOString(), scanned, created, errors, note: note || null }, 'return=minimal')
    return res.status(200).json({ agent: 'gazette', scanned, created })
  } catch (e) {
    errors = 1
    await supa('PATCH', `lg_agent_runs?id=eq.${run.id}`, { finished_at: new Date().toISOString(), scanned, created, errors, note: (note + String(e.message || e)).slice(0, 400) }, 'return=minimal').catch(() => {})
    return res.status(500).json({ error: String(e.message || e) })
  }
}
