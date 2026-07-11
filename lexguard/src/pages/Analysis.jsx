// Analysis page (วิเคราะห์ & AI) — AI summarise-to-registry + manual add.
// Includes its ReqEditor, AnalyzePanel & ManualAddPanel helpers.
// Moved verbatim from App.jsx (pure refactor).
import { useState } from 'react'
import { LAW_TYPES, uploadLawDoc } from '../lib/supabase.js'
import { useAuth, NO_PERM } from '../lib/auth.js'
import { I } from '../components/icons.jsx'
import { toast } from '../lib/toast.js'
import { confirmDialog } from '../lib/confirm.js'
import { nextCode, dupCheck } from '../lib/ui.jsx'

function ReqEditor({reqs,setReqs,suggest}){
  const setReq=(i,k,v)=>setReqs(p=>p.map((r,j)=>j===i?{...r,[k]:v}:r))
  return <>
    {reqs.map((r,i)=>(
      <div key={i} style={{border:'1px solid var(--line)',borderRadius:8,padding:'8px 10px',marginBottom:6}}>
        <div style={{display:'flex',gap:8,alignItems:'flex-start'}}>
          <span className="num" style={{paddingTop:9,minWidth:20,color:'var(--ink-faint)'}}>{i+1}.</span>
          <textarea className="form-input" rows={1} style={{marginTop:0}} value={r.text||''} onChange={e=>setReq(i,'text',e.target.value)} placeholder="เนื้อหาข้อกำหนด (มาตรา/ข้อ…)"/>
          <select className="form-input" style={{marginTop:0,width:130}} value={r.status||'met'} onChange={e=>setReq(i,'status',e.target.value)}>
            <option value="met">สอดคล้อง</option><option value="unmet">ยังไม่สอดคล้อง</option>
          </select>
          {reqs.length>1 && <button className="btn btn-ghost" style={{padding:'7px 9px'}} onClick={()=>setReqs(p=>p.filter((_,j)=>j!==i))}><I n="x"/></button>}
        </div>
        <div style={{display:'flex',gap:8,marginTop:6,marginLeft:28}}>
          <input className="form-input" style={{marginTop:0}} list="dl-resp" value={r.responsible||''} onChange={e=>setReq(i,'responsible',e.target.value)} placeholder="ผู้รับผิดชอบ"/>
          <input className="form-input" style={{marginTop:0}} value={r.frequency||''} onChange={e=>setReq(i,'frequency',e.target.value)} placeholder="ความถี่ (เช่น รายปี)"/>
        </div>
      </div>
    ))}
    <datalist id="dl-resp">{(suggest?.responsibles||[]).map(x=><option key={x} value={x}/>)}</datalist>
  </>
}

function AnalyzePanel({cats,allLaws,onCreateFull,suggest,goView,onAnalyzed}){
  const { can }=useAuth()
  const [src,setSrc]=useState('')
  const [busy,setBusy]=useState(false)
  const [err,setErr]=useState('')
  const [res,setRes]=useState(null)      // {law, reqs:[{...,_add:true}]}
  const [cat,setCat]=useState('')
  const [done,setDone]=useState(null)

  async function analyze(){
    if(!src.trim()) return
    setBusy(true); setErr(''); setRes(null); setDone(null)
    try{
      const r=await fetch('/api/law-analyze',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({source:src})})
      const d=await r.json()
      if(!r.ok){ setErr(d.error||'วิเคราะห์ไม่สำเร็จ') }
      else{
        const law=d.law||{}
        setCat(law.cat||cats[0]?.code||'')
        setRes({law,reqs:(d.requirements||[]).map(q=>({
          text:(q.section_ref?q.section_ref+': ':'')+(q.req_text||''),
          responsible:q.responsible||'', frequency:q.frequency||'', status:'met', _add:true,
        }))})
        onAnalyzed&&onAnalyzed()
      }
    }catch(e){ setErr('เรียก API ไม่สำเร็จ (ต้อง deploy บน Vercel + ตั้ง ANTHROPIC_API_KEY): '+e.message) }
    setBusy(false)
  }

  async function addSelected(){
    const law=res.law||{}
    const chosen=res.reqs.filter(r=>r._add && r.text.trim())
    if(!chosen.length){ setErr('ยังไม่ได้เลือกข้อย่อย'); return }
    const code=nextCode(allLaws, cat)
    const dup=dupCheck(allLaws, law.name||'')
    if(dup && !(await confirmDialog(`พบกฎหมายคล้ายกันอยู่แล้ว: ${dup.code} — ${dup.name.slice(0,50)}\nยืนยันเพิ่มซ้ำ?`,{danger:true}))) return
    setBusy(true); setErr('')
    try{
      const nl=await onCreateFull(
        {code,cat,name:(law.name||'').trim(),hierarchy_level:'4',ministry:law.ministry||'',
         announce_date:law.announce_date||'',effective_date:law.effective_date||'',doc_list:law.documents||'',source_url:''},
        chosen)
      setDone(`เพิ่ม ${nl.code} เข้าหมวด ${cat} แล้ว (${chosen.length} ข้อย่อย)`)
      setRes(null); setSrc('')
    }catch(e){ setErr('บันทึกไม่สำเร็จ: '+e.message) }
    setBusy(false)
  }

  const setReqs = fn => setRes(p=>({...p,reqs:typeof fn==='function'?fn(p.reqs):fn}))

  return (
    <div className="panel" style={{marginBottom:16}}>
      <div className="panel-h"><h3>วิเคราะห์กฎหมาย</h3><span className="sub" style={{marginLeft:'auto'}}>Skill: fetch + analyze</span></div>
      <div className="panel-b">
        <p style={{fontSize:12.5,color:'var(--ink-faint)',marginBottom:10,lineHeight:1.6}}>วาง URL ราชกิจจาฯ / กฤษฎีกา / ShawPat หรือวางตัวบทกฎหมาย → ระบบสรุปเป็นข้อย่อย แล้ว “เลือกเพิ่มทีละข้อ” เข้าหมวดที่ต้องการได้เลย</p>
        <textarea className="form-input" rows={4} placeholder="วาง URL หรือตัวบทกฎหมายที่นี่…" value={src} onChange={e=>setSrc(e.target.value)} style={{marginTop:0}}/>
        <div style={{display:'flex',gap:8,alignItems:'center',marginTop:12}}>
          <button className="btn btn-primary" disabled={busy||!src.trim()||!can('edit')} title={can('edit')?'':NO_PERM} onClick={analyze}>{busy?'กำลังวิเคราะห์…':'วิเคราะห์'}</button>
          <button className="btn btn-ghost" onClick={()=>goView&&goView('staging')}>ดูหน้านำเข้า / รออนุมัติ →</button>
        </div>
        {err && <div className="login-err" style={{marginTop:12}}>{err}</div>}
        {done && <div className="login-msg" style={{marginTop:12}}>{done}</div>}

        {res && (
          <div style={{marginTop:16,borderTop:'1px solid var(--line)',paddingTop:14}}>
            <div style={{fontSize:14,fontWeight:600,marginBottom:6}}>{res.law.name||'(ไม่พบชื่อ)'}</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}>
              {res.law.ministry && <span className="meta-chip">{res.law.ministry}</span>}
              {res.law.announce_date && <span className="meta-chip">ประกาศ: {res.law.announce_date}</span>}
              {res.law.effective_date && <span className="meta-chip">บังคับใช้: {res.law.effective_date}</span>}
              {res.law.documents && <span className="meta-chip">เอกสาร: {String(res.law.documents).slice(0,80)}</span>}
            </div>
            <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:10}}>
              <label className="form-label" style={{margin:0}}>เพิ่มเข้าหมวด:</label>
              <select className="form-input" style={{marginTop:0,width:280}} value={cat} onChange={e=>setCat(e.target.value)}>
                {cats.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
              </select>
              <span className="sub">รหัสที่จะได้: <b className="num" style={{color:'var(--brand)'}}>{cat?nextCode(allLaws,cat):'—'}</b></span>
              <span className="sub" style={{marginLeft:'auto'}}>
                <button className="btn btn-ghost" style={{padding:'3px 8px',fontSize:11}} onClick={()=>setReqs(p=>p.map(r=>({...r,_add:true})))}>เลือกทั้งหมด</button>
                <button className="btn btn-ghost" style={{padding:'3px 8px',fontSize:11,marginLeft:4}} onClick={()=>setReqs(p=>p.map(r=>({...r,_add:false})))}>ไม่เลือก</button>
              </span>
            </div>
            {res.reqs.map((r,i)=>(
              <div key={i} style={{display:'flex',gap:8,alignItems:'flex-start',padding:'8px 10px',border:'1px solid var(--line)',borderRadius:8,marginBottom:6,background:r._add?'var(--brand-tint)':'var(--surface)'}}>
                <input type="checkbox" checked={r._add} onChange={e=>setReqs(p=>p.map((x,j)=>j===i?{...x,_add:e.target.checked}:x))} style={{marginTop:4}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,lineHeight:1.5}}>{r.text}</div>
                  <div style={{display:'flex',gap:8,marginTop:6}}>
                    <input className="form-input" style={{marginTop:0}} list="dl-resp" value={r.responsible} onChange={e=>setReqs(p=>p.map((x,j)=>j===i?{...x,responsible:e.target.value}:x))} placeholder="ผู้รับผิดชอบ"/>
                    <input className="form-input" style={{marginTop:0}} value={r.frequency} onChange={e=>setReqs(p=>p.map((x,j)=>j===i?{...x,frequency:e.target.value}:x))} placeholder="ความถี่"/>
                    <select className="form-input" style={{marginTop:0,width:130}} value={r.status} onChange={e=>setReqs(p=>p.map((x,j)=>j===i?{...x,status:e.target.value}:x))}>
                      <option value="met">สอดคล้อง</option><option value="unmet">ยังไม่สอดคล้อง</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
            <datalist id="dl-resp">{(suggest?.responsibles||[]).map(x=><option key={x} value={x}/>)}</datalist>
            <button className="btn btn-primary" style={{marginTop:8}} disabled={busy||!can('edit')} title={can('edit')?'':NO_PERM} onClick={addSelected}>
              เพิ่มข้อที่เลือก ({res.reqs.filter(r=>r._add).length}) เข้าหมวด {cat}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ManualAddPanel({cats,allLaws,onCreateFull,suggest}){
  const { can }=useAuth()
  const [cat,setCat]=useState(cats[0]?.code||'')
  const [name,setName]=useState('')
  const [ministry,setMinistry]=useState('')
  const [level,setLevel]=useState('4')
  const [announce,setAnnounce]=useState('')
  const [effective,setEffective]=useState('')
  const [review,setReview]=useState('')
  const [docs,setDocs]=useState('')
  const [resp,setResp]=useState('')
  const [srcUrl,setSrcUrl]=useState('')
  const [uploading,setUploading]=useState(false)
  const [reqs,setReqs]=useState([{text:'',status:'met'}])
  const [busy,setBusy]=useState(false)
  const [msg,setMsg]=useState(null)
  const code = cat ? nextCode(allLaws, cat) : '—'
  const valid = cat && name.trim()

  async function save(){
    if(!valid) return
    const dup=dupCheck(allLaws, name)
    if(dup && !(await confirmDialog(`พบกฎหมายคล้ายกันอยู่แล้ว: ${dup.code} — ${dup.name.slice(0,50)}\nยืนยันเพิ่มซ้ำ?`,{danger:true}))) return
    setBusy(true); setMsg(null)
    try{
      const nl=await onCreateFull(
        {code,cat,name:name.trim(),hierarchy_level:level,ministry,announce_date:announce,effective_date:effective,review_date:review,doc_list:docs,responsible:resp,source_url:srcUrl},
        reqs.filter(r=>r.text.trim()))
      setMsg({ok:`เพิ่ม ${nl.code} เข้าหมวด ${cat} แล้ว (${reqs.filter(r=>r.text.trim()).length} ข้อ)`})
      setName('');setMinistry('');setAnnounce('');setEffective('');setReview('');setDocs('');setResp('');setSrcUrl('');setReqs([{text:'',status:'met'}])
    }catch(e){ setMsg({err:'บันทึกไม่สำเร็จ: '+e.message}) }
    setBusy(false)
  }

  return (
    <div className="panel">
      <div className="panel-h"><h3>เพิ่มเข้าทะเบียนเอง</h3><span className="sub" style={{marginLeft:'auto'}}>เลือกหมวดแล้วกรอกได้เลย · รหัสที่จะได้: <b className="num" style={{color:'var(--brand)'}}>{code}</b></span></div>
      <div className="panel-b">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
          <div><label className="form-label">หมวด</label>
            <select className="form-input" value={cat} onChange={e=>setCat(e.target.value)}>
              {cats.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
            </select></div>
          <div><label className="form-label">ลำดับชั้น</label>
            <select className="form-input" value={level} onChange={e=>setLevel(e.target.value)}>
              {LAW_TYPES.map(t=><option key={t.level} value={t.level}>ชั้น {t.level} — {t.label}</option>)}
            </select></div>
          <div><label className="form-label">กระทรวง / หน่วยงาน</label>
            <input className="form-input" list="dl-min" value={ministry} onChange={e=>setMinistry(e.target.value)}/>
            <datalist id="dl-min">{(suggest?.ministries||[]).map(x=><option key={x} value={x}/>)}</datalist></div>
        </div>
        <label className="form-label">ชื่อกฎหมาย</label>
        <textarea className="form-input" rows={2} value={name} onChange={e=>setName(e.target.value)} placeholder="ชื่อกฎหมายฉบับเต็ม…"/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:10}}>
          <div><label className="form-label">วันที่ประกาศ</label><input className="form-input" value={announce} onChange={e=>setAnnounce(e.target.value)} placeholder="17 มี.ค. 2553"/></div>
          <div><label className="form-label">วันที่บังคับใช้</label><input className="form-input" value={effective} onChange={e=>setEffective(e.target.value)} placeholder="18 มี.ค. 2553"/></div>
          <div><label className="form-label">รอบทบทวนถัดไป</label><input className="form-input" type="date" value={review} onChange={e=>setReview(e.target.value)}/></div>
          <div><label className="form-label">เอกสาร/แบบฟอร์ม</label><input className="form-input" value={docs} onChange={e=>setDocs(e.target.value)} placeholder="แบบ จป., รายงาน"/></div>
          <div><label className="form-label">หน่วยงานที่รับผิดชอบ</label><input className="form-input" list="dl-resp" value={resp} onChange={e=>setResp(e.target.value)} placeholder="จป.วิชาชีพ / ฝ่าย…"/></div>
        </div>
        <label className="form-label">ลิงก์ต้นฉบับ (URL ราชกิจจาฯ / PDF) หรืออัปโหลดไฟล์</label>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <input className="form-input" style={{marginTop:0}} value={srcUrl} onChange={e=>setSrcUrl(e.target.value)} placeholder="https://ratchakitcha.soc.go.th/… หรืออัปโหลด PDF"/>
          <label className="btn btn-ghost" style={{whiteSpace:'nowrap',cursor:'pointer'}}>
            {uploading?'กำลังอัปโหลด…':'อัปโหลด PDF'}
            <input type="file" accept="application/pdf,image/*" style={{display:'none'}} disabled={uploading}
              onChange={async e=>{ const f=e.target.files?.[0]; if(!f)return; setUploading(true); try{ const url=await uploadLawDoc(f); setSrcUrl(url) }catch(err){ toast('อัปโหลดไม่สำเร็จ: '+err.message) } setUploading(false); e.target.value='' }}/>
          </label>
        </div>
        {srcUrl && <a href={srcUrl} target="_blank" rel="noreferrer" style={{fontSize:12,color:'var(--brand)',marginTop:4,display:'inline-block'}}>เปิดไฟล์/ลิงก์ที่แนบ ↗</a>}

        <div className="sec-t" style={{marginTop:14,display:'flex'}}>สาระสำคัญ (ข้อย่อย)
          <button className="btn btn-ghost" style={{marginLeft:'auto',padding:'3px 10px',fontSize:12}} onClick={()=>setReqs(p=>[...p,{text:'',status:'met'}])}><I n="plus"/>เพิ่มข้อ</button>
        </div>
        <ReqEditor reqs={reqs} setReqs={setReqs} suggest={suggest}/>

        {msg?.ok && <div className="login-msg" style={{marginTop:12}}>{msg.ok}</div>}
        {msg?.err && <div className="login-err" style={{marginTop:12}}>{msg.err}</div>}
        <div style={{marginTop:14}}>
          <button className="btn btn-primary" disabled={!valid||busy||!can('edit')} title={can('edit')?'':NO_PERM} onClick={save}>{busy?'กำลังบันทึก…':`บันทึกเข้าหมวด ${cat||''}`}</button>
        </div>
      </div>
    </div>
  )
}

export default function Analysis({laws,cats,catMap,allLaws,onAnalyzed,goView,onCreateFull,suggest}){
  return <div className="view">
    <div className="sec-t" style={{margin:'0 0 10px'}}>ส่วนที่ 1 · วิเคราะห์ด้วย AI แล้วเลือกเพิ่มทีละข้อ</div>
    <AnalyzePanel cats={cats} allLaws={allLaws} onCreateFull={onCreateFull} suggest={suggest} goView={goView} onAnalyzed={onAnalyzed}/>
    <div className="sec-t" style={{margin:'22px 0 10px'}}>ส่วนที่ 2 · เพิ่มเข้าทะเบียนเอง</div>
    <ManualAddPanel cats={cats} allLaws={allLaws} onCreateFull={onCreateFull} suggest={suggest}/>
  </div>
}

