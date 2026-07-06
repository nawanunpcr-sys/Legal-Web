// Vercel serverless function — Skill 3 (osh-law-update-watch) behind the Updates page.
// Fetches the ShawPat safety-law listing, asks Claude to extract laws, compares with the
// registry + existing alerts, and inserts genuinely new items into lg_law_updates.
// No hardcoded fallbacks — secrets must come from the environment (never committed to git).
const SUPA_URL = process.env.VITE_SUPABASE_URL
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'
const SOURCES = ['https://www.shawpat.or.th/th/safety-law','https://www.shawpat.or.th/th/other-service/osh-law']

const SYSTEM = `คุณคือผู้ช่วยเฝ้าระวังกฎหมายความปลอดภัย อาชีวอนามัย และสิ่งแวดล้อม (SHE) ของไทย จากข้อความหน้าเว็บที่ให้มา
ให้ดึง "รายการกฎหมาย/ประกาศ/กฎกระทรวง/พระราชบัญญัติ" ที่เกี่ยวข้องกับ SHE ออกมาเป็น JSON เท่านั้น (ไม่มี markdown):
{"items":[{"title":"ชื่อกฎหมายเต็ม","published_date":"ปี/วันที่ถ้ามี","category_guess":"LA..LG","summary":"สรุปสั้น 1 บรรทัดว่าออกมาเรื่องอะไรและกระทบใคร"}]}
หมวด: LA=บริหาร/จป., LB=ไฟฟ้า, LC=อัคคีภัย, LD=ความร้อน/แสง/เสียง, LE=ก่อสร้าง/เครื่องจักร, LF=โทรคมนาคม/ไซเบอร์/PDPA, LG=สวัสดิการ
กฎ: เก็บเฉพาะรายการที่เป็น "ชื่อกฎหมายจริง" และ "เกี่ยวข้องกับ SHE" เท่านั้น ข้ามเมนู/ข่าวทั่วไป/หลักสูตรอบรม/บทความ
ถ้าระบุปีหรือวันที่ประกาศได้ให้ใส่ใน published_date เสมอ`

function strip(html){return html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim()}
const norm = s => (s||'').toLowerCase().replace(/[\s\u0e00-\u0e0f.,()"'’]/g,'')

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'POST only'})
  if(!SUPA_URL||!SUPA_KEY) return res.status(500).json({error:'ยังไม่ได้ตั้งค่า Supabase (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)'})
  if(!process.env.ANTHROPIC_API_KEY) return res.status(500).json({error:'ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY ใน Vercel'})
  try{
    let pageText=''
    for(const u of SOURCES){
      try{ const r=await fetch(u,{headers:{'user-agent':'Mozilla/5.0 LexRegistry'}}); if(r.ok) pageText+=' '+strip(await r.text()) }catch{}
    }
    pageText = pageText.slice(0,16000)
    if(pageText.length<200) return res.status(502).json({error:'ดึงหน้า ShawPat ไม่สำเร็จ (เว็บอาจล่มหรือเปลี่ยนโครงสร้าง)'})
    const ar = await fetch('https://api.anthropic.com/v1/messages',{method:'POST',
      headers:{'content-type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:MODEL,max_tokens:3000,system:SYSTEM,messages:[{role:'user',content:'เนื้อหาหน้า ShawPat:\n\n'+pageText}]})})
    if(!ar.ok) return res.status(502).json({error:'เรียก Claude API ไม่สำเร็จ: '+(await ar.text()).slice(0,200)})
    const data = await ar.json()
    let txt=(data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('').trim().replace(/^```json\s*/i,'').replace(/```$/,'').trim()
    let items=[]; try{ items=(JSON.parse(txt).items)||[] }catch{ return res.status(500).json({error:'แปลงผลลัพธ์เป็น JSON ไม่ได้',raw:txt.slice(0,400)}) }
    // existing names to dedupe against
    const [lawsR,updR] = await Promise.all([
      fetch(`${SUPA_URL}/rest/v1/lg_laws?select=name`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY}}),
      fetch(`${SUPA_URL}/rest/v1/lg_law_updates?select=title`,{headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY}})
    ])
    const existing = new Set([...(await lawsR.json()).map(x=>norm(x.name)), ...(await updR.json()).map(x=>norm(x.title))])
    const fresh = items.filter(it=>it.title && ![...existing].some(e=>e&&(e.includes(norm(it.title).slice(0,18))||norm(it.title).includes(e.slice(0,18)))))
    let inserted=0
    if(fresh.length){
      const rows = fresh.map(it=>({source:'shawpat',title:it.title,ref_url:SOURCES[0],published_date:it.published_date||'',
        category_guess:it.category_guess||'',summary:it.summary||'',status:'new'}))
      const sr = await fetch(`${SUPA_URL}/rest/v1/lg_law_updates`,{method:'POST',
        headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY,'content-type':'application/json',Prefer:'return=minimal'},
        body:JSON.stringify(rows)})
      if(sr.ok) inserted=rows.length; else return res.status(502).json({error:'บันทึกแจ้งเตือนไม่สำเร็จ: '+(await sr.text()).slice(0,200)})
    }
    return res.status(200).json({scanned:items.length,new:inserted,items:fresh})
  }catch(e){ return res.status(500).json({error:String(e&&e.message||e)}) }
}
