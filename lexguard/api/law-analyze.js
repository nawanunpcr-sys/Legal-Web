// Vercel serverless function — Skills 1+2 (osh-law-fetch + osh-law-analyze) behind the Analysis page.
// Fetches a law (URL or pasted text), asks Claude to summarize it into registry-ready requirements,
// and stages them in lg_import_staging for the user to approve on the "นำเข้า/รออนุมัติ" page.
const SUPA_URL = process.env.VITE_SUPABASE_URL || 'https://exugnmdsyqbqtxsrwhbm.supabase.co'
const SUPA_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_b4R7_X6YJS2JaRarc2iaNQ_NBrJWUaC'
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'

const SYSTEM = `คุณคือผู้ช่วย จป.วิชาชีพ ทำหน้าที่อ่าน-วิเคราะห์-สรุปกฎหมายความปลอดภัย/อาชีวอนามัย/สิ่งแวดล้อม (SHE) ของไทยให้เข้าทะเบียนกฎหมาย
หน้าที่:
1) ระบุชื่อกฎหมายเต็ม ประเภท (พ.ร.บ./พ.ร.ก./พ.ร.ฎ./กฎกระทรวง/ประกาศ/ระเบียบ/คำสั่ง) และหน่วยงาน/กระทรวงที่ออก
2) ระบุ "วันที่ประกาศ" (วันที่ลงราชกิจจานุเบกษา) และ "วันที่บังคับใช้" — ถ้าตัวบทเขียนว่า "ให้ใช้บังคับเมื่อพ้นกำหนด N วันนับแต่วันประกาศ" ให้คำนวณวันที่จริงและระบุไว้ ถ้าไม่ระบุให้ใส่ค่าว่าง
3) รวบรวม "เอกสาร/แบบฟอร์ม/หลักฐาน" ทั้งหมดที่กฎหมายกำหนดให้จัดทำ/ยื่น/เก็บ (เช่น แบบ จป., รายงาน, ใบรับรอง) ลงในฟิลด์ documents ของกฎหมาย
4) แตกเป็น "ข้อกำหนด" รายมาตรา/ข้อ ให้ครบทุกข้อที่สร้างหน้าที่ต้องปฏิบัติ (ข้ามนิยาม/บทเฉพาะกาลที่ไม่สร้างหน้าที่) — อย่ารวบ อย่าตกหล่น แต่ละข้อสรุปครบ: ใคร(ผู้รับผิดชอบ) ทำอะไร ที่ไหน อย่างไร เอกสาร/หลักฐาน ความถี่ และเงื่อนไข/กำหนดเวลา ระบุเลขมาตรา/ข้อเสมอ
เลือกหมวด: LA=บริหารจัดการ/จป./ระบบ, LB=ไฟฟ้า/พลังงาน, LC=อัคคีภัย, LD=ความร้อน/แสง/เสียง/สภาพแวดล้อม, LE=ก่อสร้าง/เครื่องจักร/ที่อับอากาศ/ที่สูง, LF=โทรคมนาคม/ไซเบอร์/PDPA, LG=สวัสดิการ
ตอบกลับเป็น JSON เท่านั้น ไม่มีคำอธิบายอื่น ไม่มี markdown:
{"law":{"name":"","type":"","ministry":"","announce_date":"","effective_date":"","documents":"","cat":"LA","code_suggestion":""},
 "requirements":[{"section_ref":"มาตรา X","req_text":"","responsible":"","applicability":"","method":"","documents":"","frequency":"","other_terms":""}]}`

function strip(html){
  return html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ')
             .replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim()
}
export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'POST only'})
  if(!process.env.ANTHROPIC_API_KEY) return res.status(400).json({error:'ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY ใน Vercel'})
  try{
    const { source='', kind='auto' } = req.body||{}
    if(!source.trim()) return res.status(400).json({error:'กรุณาใส่ URL หรือวางตัวบทกฎหมาย'})
    let text = source, srcUrl = ''
    const isUrl = /^https?:\/\//i.test(source.trim())
    if(isUrl && kind!=='text'){
      srcUrl = source.trim()
      const r = await fetch(srcUrl,{headers:{'user-agent':'Mozilla/5.0 LexRegistry'}})
      const ct = r.headers.get('content-type')||''
      if(ct.includes('pdf')) return res.status(415).json({error:'ลิงก์เป็น PDF — กรุณาเปิดไฟล์แล้ววางตัวบทเป็นข้อความแทน'})
      text = strip(await r.text()).slice(0,16000)
      if(text.length<200) return res.status(422).json({error:'ดึงเนื้อหาจากหน้าได้น้อยเกินไป ลองวางตัวบทเป็นข้อความ'})
    }
    const ar = await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'content-type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
      body:JSON.stringify({model:MODEL,max_tokens:8000,system:SYSTEM,
        messages:[{role:'user',content:`ตัวบทกฎหมาย${srcUrl?` (จาก ${srcUrl})`:''}:\n\n${text}`}]})
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
      frequency: r.frequency||'', other_terms: r.other_terms||'', source_url: srcUrl, status:'proposed'
    }))
    if(rows.length){
      const sr = await fetch(`${SUPA_URL}/rest/v1/lg_import_staging`,{method:'POST',
        headers:{apikey:SUPA_KEY,Authorization:'Bearer '+SUPA_KEY,'content-type':'application/json',Prefer:'return=minimal'},
        body:JSON.stringify(rows)})
      if(!sr.ok) return res.status(502).json({error:'บันทึกลง staging ไม่สำเร็จ: '+(await sr.text()).slice(0,200)})
    }
    return res.status(200).json({law,count:rows.length,batch,requirements:reqs})
  }catch(e){ return res.status(500).json({error:String(e&&e.message||e)}) }
}
