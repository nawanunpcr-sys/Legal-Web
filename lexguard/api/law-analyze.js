// Vercel serverless function — Skills 1+2 (osh-law-fetch + osh-law-analyze) behind the Analysis page.
// Fetches a law (URL or pasted text), asks Claude to summarize it into registry-ready requirements,
// and stages them in lg_import_staging for the user to approve on the "นำเข้า/รออนุมัติ" page.
// No hardcoded fallbacks — secrets must come from the environment (never committed to git).
const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

const SYSTEM = `คุณคือผู้ช่วย จป.วิชาชีพ ทำหน้าที่อ่าน-วิเคราะห์-สรุปกฎหมายความปลอดภัย/อาชีวอนามัย/สิ่งแวดล้อม (SHE) ของไทยให้เข้าทะเบียนกฎหมาย
หน้าที่:
1) ระบุชื่อกฎหมายเต็ม ประเภท (พ.ร.บ./พ.ร.ก./พ.ร.ฎ./กฎกระทรวง/ประกาศ/ระเบียบ/คำสั่ง) และหน่วยงาน/กระทรวงที่ออก
2) ระบุ "วันที่ประกาศ" (วันที่ลงราชกิจจานุเบกษา) และ "วันที่บังคับใช้" — ถ้าตัวบทเขียนว่า "ให้ใช้บังคับเมื่อพ้นกำหนด N วันนับแต่วันประกาศ" ให้คำนวณวันที่จริงและระบุไว้ ถ้าไม่ระบุให้ใส่ค่าว่าง
3) รวบรวม "เอกสาร/แบบฟอร์ม/หลักฐาน" ทั้งหมดที่กฎหมายกำหนดให้จัดทำ/ยื่น/เก็บ (เช่น แบบ จป., รายงาน, ใบรับรอง) ลงในฟิลด์ documents ของกฎหมาย
4) แตกเป็น "ข้อกำหนด" รายมาตรา/ข้อ ให้ครบทุกข้อที่สร้างหน้าที่ต้องปฏิบัติ (ข้ามนิยาม/บทเฉพาะกาลที่ไม่สร้างหน้าที่) — อย่ารวบ อย่าตกหล่น แต่ละข้อสรุปครบ: ใคร(ผู้รับผิดชอบ) ทำอะไร ที่ไหน อย่างไร เอกสาร/หลักฐาน ความถี่ และเงื่อนไข/กำหนดเวลา ระบุเลขมาตรา/ข้อเสมอ
เลือกหมวด: LA=บริหารจัดการความปลอดภัย/อาชีวอนามัย/จป./คปอ./ระบบการจัดการ, LB=ไฟฟ้าและพลังงาน (รวมน้ำมันเชื้อเพลิง/เครื่องกำเนิดไฟฟ้า), LC=การป้องกันและระงับอัคคีภัย, LD=ความร้อน/แสงสว่าง/เสียง/สภาพแวดล้อมในการทำงาน, LE=ก่อสร้าง/ลิฟต์/เครื่องจักร/ปั้นจั่น/ที่อับอากาศ/ที่สูง/งานเสี่ยงอื่นๆ, LF=Service (งานบริการ/ธุรกิจโทรคมนาคมของบริษัท), LG=คณะกรรมการสวัสดิการในสถานประกอบกิจการ (พ.ร.บ.คุ้มครองแรงงาน หมวดสวัสดิการ), CC=CCS คุ้มครองข้อมูลส่วนบุคคล(PDPA)/ไซเบอร์/ประกาศ สคส.
ตอบกลับเป็น JSON เท่านั้น ไม่มีคำอธิบายอื่น ไม่มี markdown:
{"law":{"name":"","type":"","ministry":"","announce_date":"","effective_date":"","documents":"","cat":"LA","code_suggestion":""},
 "requirements":[{"section_ref":"มาตรา X","req_text":"","responsible":"","applicability":"","method":"","documents":"","frequency":"","other_terms":""}]}`

function strip(html){
  return html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ')
             .replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim()
}

// ── โดเมนที่อนุญาตให้ fetch ได้ (กัน SSRF) — เฉพาะเว็บราชการ/แหล่งกฎหมาย รวม subdomain ──
const ALLOWED_HOSTS = ['ratchakitcha.soc.go.th','dlpw.go.th','labour.go.th','shawpat.or.th','ddc.moph.go.th','moph.go.th','diw.go.th']
function isAllowedUrl(u){
  try{
    const url = new URL(u)
    if(url.protocol!=='http:' && url.protocol!=='https:') return false
    const host = url.hostname.toLowerCase()
    return ALLOWED_HOSTS.some(d => host===d || host.endsWith('.'+d))
  }catch{ return false }
}

// ── การป้องกันขั้นต่ำ 2 ชั้น ──
// TODO: การป้องกันจริงต้องใช้ Supabase Auth JWT เมื่อเลิกโหมด demo
//       (rate-limit ในหน่วยความจำใช้ไม่ได้ข้าม serverless instance — เป็นเพียงเบรกชั่วคราว)
// (ก) ตรวจ Origin/Referer ว่ามาจากโดเมนของแอปเอง (อ่านจาก env ALLOWED_ORIGIN)
function sameOrigin(req){
  const origin = req.headers.origin || req.headers.referer || ''
  if(!origin) return false
  // (1) ตรงกับโดเมนที่ตั้งใน env ALLOWED_ORIGIN (รองรับหลายค่า คั่นด้วย comma)
  const allowed = (process.env.ALLOWED_ORIGIN||'').split(',').map(s=>s.trim()).filter(Boolean)
  if(allowed.some(a => origin.startsWith(a))) return true
  // (2) same-origin จริง: โฮสต์ของ origin ตรงกับโฮสต์ที่เสิร์ฟคำขอ
  //     → ใช้ได้ทุกโดเมน *.vercel.app ของแอปเองโดยไม่ต้องตั้ง env (กันเรียกข้ามโดเมนอยู่)
  try{ return new URL(origin).host === req.headers.host }catch{ return false }
}
// (ข) จำกัดความถี่แบบง่ายในหน่วยความจำ: ไม่เกิน 10 ครั้ง/นาที/IP
const RATE_LIMIT = 10, RATE_WINDOW = 60_000
const rateMap = new Map()
function clientIp(req){ return String(req.headers['x-forwarded-for']||'').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown' }
function rateLimited(ip){
  const now = Date.now()
  const hits = (rateMap.get(ip)||[]).filter(t => now-t < RATE_WINDOW)
  hits.push(now); rateMap.set(ip, hits)
  return hits.length > RATE_LIMIT
}

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'POST only'})
  if(!sameOrigin(req)) return res.status(403).json({error:'คำขอไม่ได้มาจากโดเมนของแอป'})
  if(rateLimited(clientIp(req))) return res.status(429).json({error:'เรียกใช้งานถี่เกินไป กรุณารอสักครู่แล้วลองใหม่'})
  if(!SUPA_URL||!SUPA_KEY) return res.status(500).json({error:'ยังไม่ได้ตั้งค่า Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)'})
  if(!process.env.ANTHROPIC_API_KEY) return res.status(500).json({error:'ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY ใน Vercel'})
  try{
    // stage=false (P12): ข้ามการเขียน lg_import_staging แล้ว return JSON ให้ client ไปเก็บเอง
    // (default true = พฤติกรรมเดิม เพื่อความ backward-compatible)
    // pdfBase64 (P12): แนบไฟล์ PDF ให้ Claude อ่านเป็นเอกสารโดยตรง (base64, ไม่มีส่วน data: นำหน้า)
    const { source='', kind='auto', sourceUrl='', stage=true, pdfBase64='', pdfName='' } = req.body||{}
    const hasPdf = !!(pdfBase64 && pdfBase64.length)
    if(!hasPdf && !source.trim()) return res.status(400).json({error:'กรุณาใส่ URL, วางตัวบทกฎหมาย หรือแนบไฟล์ PDF'})
    // กัน request body เกินลิมิตของ Vercel (~4.5MB) — base64 ~6M ≈ ไฟล์ ~4.5MB
    if(hasPdf && pdfBase64.length > 6_000_000) return res.status(413).json({error:'ไฟล์ PDF ใหญ่เกินไป — กรุณาแยกไฟล์ หรือ copy ตัวบทมาวางแทน'})
    let text = source, srcUrl = ''
    const isUrl = !hasPdf && /^https?:\/\//i.test(source.trim())
    if(isUrl && kind!=='text'){
      srcUrl = source.trim()
      if(!isAllowedUrl(srcUrl)) return res.status(400).json({error:'รองรับเฉพาะเว็บราชการ/แหล่งกฎหมายที่กำหนดไว้เท่านั้น'})
      const r = await fetch(srcUrl,{headers:{'user-agent':'Mozilla/5.0 LexRegistry'}})
      const ct = r.headers.get('content-type')||''
      if(ct.includes('pdf')) return res.status(415).json({error:'ลิงก์เป็น PDF — กรุณาเปิดไฟล์แล้ววางตัวบทเป็นข้อความแทน'})
      text = strip(await r.text()).slice(0,16000)
      if(text.length<200) return res.status(422).json({error:'ดึงเนื้อหาจากหน้าได้น้อยเกินไป ลองวางตัวบทเป็นข้อความ'})
    }
    // PDF → document content block (base64) · ข้อความ/URL → text ธรรมดา
    const userContent = hasPdf
      ? [ { type:'document', source:{ type:'base64', media_type:'application/pdf', data:pdfBase64 } },
          { type:'text', text:`ไฟล์ PDF ตัวบทกฎหมาย${pdfName?` (${pdfName})`:''}${sourceUrl?` · ลิงก์: ${sourceUrl}`:''} — โปรดอ่านและสรุปตามรูปแบบที่กำหนด` } ]
      : `ตัวบทกฎหมาย${srcUrl?` (จาก ${srcUrl})`:''}:\n\n${text}`
    const ar = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'content-type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:MODEL,max_tokens:8000,system:SYSTEM,
        messages:[{role:'user',content:userContent}]})
    })
    if(!ar.ok) return res.status(502).json({error:'เรียก Claude API ไม่สำเร็จ: '+(await ar.text()).slice(0,200)})
    const data = await ar.json()
    let txt = (data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('').trim()
    txt = txt.replace(/^```json\s*/i,'').replace(/```$/,'').trim()
    let parsed; try{ parsed = JSON.parse(txt) }catch{ return res.status(500).json({error:'แปลงผลลัพธ์เป็น JSON ไม่ได้',raw:txt.slice(0,400)}) }
    const law = parsed.law||{}, reqs = parsed.requirements||[]
    const batch = 'api-'+Date.now()
    const rows = reqs.map((r,i)=>({
      batch, law_code: law.code_suggestion||('NEW-'+Date.now()%10000), law_name: law.name||'',
      cat: law.cat||'LA', ministry: law.ministry||'',
      issue_date: law.announce_date||law.issue_date||'',
      announce_date: law.announce_date||'', effective_date: law.effective_date||'', doc_list: law.documents||'',
      req_seq: i, section_ref: r.section_ref||'', req_text: r.req_text||'', responsible: r.responsible||'',
      applicability: r.applicability||'', method: r.method||'', documents: r.documents||'',
      // กรณีวางตัวบทเป็นข้อความ (ไม่มี URL ที่ fetch) ให้ใช้ "ลิงก์ตัวบทจริง" ที่ผู้ใช้กรอกมา
      frequency: r.frequency||'', other_terms: r.other_terms||'', source_url: srcUrl || (sourceUrl||'').trim(), status:'proposed'
    }))
    if(stage && rows.length){
      const sr = await fetch(`${SUPA_URL}/rest/v1/lg_import_staging`,{method:'POST',
        headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY,'content-type':'application/json',Prefer:'return=minimal'},
        body:JSON.stringify(rows)})
      if(!sr.ok) return res.status(502).json({error:'บันทึกลง staging ไม่สำเร็จ: '+(await sr.text()).slice(0,200)})
    }
    return res.status(200).json({law,count:reqs.length,batch,requirements:reqs})
  }catch(e){ return res.status(500).json({error:String(e&&e.message||e)}) }
}
