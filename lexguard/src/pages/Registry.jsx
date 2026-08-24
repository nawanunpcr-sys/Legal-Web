// Registry & Compliance page (ทะเบียน & ความสอดคล้อง).
// Includes Register, MonthlyCheckPanel, ComplianceLawRow, Compliance.
// Moved verbatim from App.jsx (pure refactor).
// P19 · รับ History + Repealed เข้ามาเป็นแท็บในหน้าเดียว (ลดเมนูหลักเหลือ 4 อัน)
import { useState, useMemo, useEffect } from 'react'
import { LAW_TYPES, fetchStaging, REQ_STATUS, REQ_STATUS_ORDER, WAITING_STATUS } from '../lib/supabase.js'
import { useAuth, NO_PERM } from '../lib/auth.js'
import { I } from '../components/icons.jsx'
import AssessForm from '../components/AssessForm.jsx'
import DeleteLawModal from '../components/DeleteLawModal.jsx'
import { exportLawsToExcel } from '../lib/integrations.js'
import { usePageFilters, Pill, Tag, ActiveBadge, thDate, TH_MONTHS, prog, lawBEYear, sumReqStats, reqStats, reqKind, reqEvalTitle } from '../lib/ui.jsx'
import History from './History.jsx'
import Repealed from './Repealed.jsx'

/* P13 · Task 3 — ไฮไลต์คำค้นในข้อความ (ตัดสั้น ~80 ตัวอักษรรอบคำที่เจอ) */
function markSnippet(text, q) {
  if (!text) return null
  if (!q) return text.slice(0, 80)
  const lc = text.toLowerCase()
  const idx = lc.indexOf(q)
  const start = idx >= 0 ? Math.max(0, idx - 20) : 0
  const snip = text.slice(start, start + 80)
  const pre = start > 0 ? '…' : ''
  const suf = start + 80 < text.length ? '…' : ''
  const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = snip.split(new RegExp('(' + esc + ')', 'ig'))
  return <>{pre}{parts.map((s, i) => s.toLowerCase() === q ? <mark key={i}>{s}</mark> : s)}{suf}</>
}

/* แยกวันที่ประกาศ / วันที่บังคับใช้ ที่ถูกยัดรวมในช่องเดียว (issue_date)
   ข้อมูลนำเข้ามีหลายรูปแบบ: มี \n, มีเลขไทย, บางอันไม่มีตัวคั่น เช่น
   "วันที่ประกาศใช้ : 09/01/2568\nวันที่บังคับใช้ : 10/01/2568"
   "ประกาศ: 27 กันยายน 2554บังคับใช้ : 28 กันยายน 2554"
   วิธี: ตัดที่คำว่า "บังคับใช้" — ส่วนหน้า = วันประกาศ, ส่วนหลัง = วันบังคับใช้ */
function cleanDatePart(t){
  return String(t||'')
    .replace(/​/g,'')                                  // ตัด zero-width space
    .replace(/วันที่ประกาศใช้|ประกาศใช้|ประกาศ|วันที่บังคับใช้|มีผลใช้บังคับ|มีผลบังคับใช้|มีผลบังคับ|บังคับใช้|ใช้บังคับ|มีผล|บังคับ|ตั้งแต่วันที่|วันที่/g,'')
    .replace(/[\s:.\-–—]+$/g,'').replace(/^[\s:.\-–—]+/g,'') // ตัดตัวคั่นหัว-ท้าย
    .replace(/\s+/g,' ')
    .trim()
}

// แปลงวันที่ทุกรูปแบบให้เป็นแบบเดียว → "วว/ดด/ปปปป" (พ.ศ.)
// รองรับ: เลขไทย, ชื่อเดือนเต็ม/ย่อ, มี "พ.ศ.", มีชื่อวัน, ปี 2 หลัก, และรูปแบบ dd/mm/yyyy อยู่แล้ว
const TH_MONTH_NUM={
  มกราคม:1,กุมภาพันธ์:2,มีนาคม:3,เมษายน:4,พฤษภาคม:5,มิถุนายน:6,
  กรกฎาคม:7,สิงหาคม:8,กันยายน:9,ตุลาคม:10,พฤศจิกายน:11,ธันวาคม:12,
}
const TH_MONTH_ABBR={มค:1,กพ:2,มีค:3,เมย:4,พค:5,มิย:6,กค:7,สค:8,กย:9,ตค:10,พย:11,ธค:12}
function thMonthNum(tok){
  const t=String(tok||'').replace(/[.\s]/g,'')
  for(const k in TH_MONTH_NUM) if(t.indexOf(k)>=0) return TH_MONTH_NUM[k]
  if(TH_MONTH_ABBR[t]) return TH_MONTH_ABBR[t]
  for(const k in TH_MONTH_ABBR) if(t.indexOf(k)>=0) return TH_MONTH_ABBR[k]
  return 0
}
function fmtDate(d,mo,y){
  if(y<100) y+=2500                                   // ปี 2 หลัก → พ.ศ. (65 → 2565)
  const pad=n=>String(n).padStart(2,'0')
  return pad(d)+'/'+pad(mo)+'/'+y
}
function normThaiDate(raw){
  if(!raw) return ''
  let s=String(raw).replace(/[๐-๙]/g,d=>'๐๑๒๓๔๕๖๗๘๙'.indexOf(d)) // เลขไทย → อารบิก
    .replace(/พ\.?\s?ศ\.?/g,' ').replace(/\s+/g,' ').trim()      // ตัด "พ.ศ."
  let m=s.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})/)    // รูปแบบ dd/mm/yyyy
  if(m) return fmtDate(+m[1],+m[2],+m[3])
  m=s.match(/^\D*?(\d{1,2})\s*([^\d]+?)\s*(\d{2,4})\s*$/)         // วัน ชื่อเดือน ปี
  if(m){ const mo=thMonthNum(m[2]); if(mo) return fmtDate(+m[1],mo,+m[3]) }
  return String(raw).trim()                                       // แปลงไม่ได้ → คงข้อความเดิม
}
function splitLawDates(law){
  const raw=String(law?.issue_date||'').replace(/​/g,'')
  const idx=raw.search(/มีผล|บังคับ/)   // จุดตัด: มีผลใช้บังคับ / บังคับใช้ / บังคับ / มีผล
  if(idx===-1){
    // ไม่มีวันบังคับใช้ฝังอยู่ — ใช้ค่าตามฟิลด์เดิม
    return { announce:normThaiDate(cleanDatePart(raw))||(law?.issue_date||''), effective:normThaiDate(law?.effective_date) }
  }
  const announce=normThaiDate(cleanDatePart(raw.slice(0,idx)))
  const embedded=cleanDatePart(raw.slice(idx))
  // ถ้ามี effective_date จริงในฟิลด์อยู่แล้ว ให้ค่านั้นชนะ
  return { announce, effective:normThaiDate(law?.effective_date||embedded) }
}

const REGISTRY_TABS = [['register','ทะเบียนกฎหมาย'],['repealed','กฎหมายที่ยกเลิก'],['history','ประวัติการทำรายการ']]

/* ─────────── REGISTRY + COMPLIANCE (merged view) ─────────── */
// P19 · เพิ่ม 3 แท็บบนสุด: ทะเบียนกฎหมาย / ประวัติการทำรายการ / กฎหมายที่ยกเลิก
// History.jsx และ Repealed.jsx render ตรงๆ ไม่ได้แก้ไข component ทั้งสองไฟล์เลย
export default function RegistryCompliance({regLaws,cats,catMap,stats,search,onOpen,onCreate,onBulk,allLaws,round,onExportF259,onAddLaw,onImported,
    workflow=[],suggest={},onAssess,focus,onDelete,
    monthsData=[],monthYear,setMonthYear,onToggleMonth,onMarkNoNewLaws,onMarkHasNewLaws,
    // P19 · props ใหม่สำหรับแท็บ ประวัติ/ยกเลิก
    activity=[],settings={},searchLog=[],repealedLaws=[],onRestore}){
  // จำแท็บที่เลือกไว้ (namespace แยกจาก 'registry' ที่ Register() ใช้อยู่แล้ว
  // เพื่อกัน state ชนกันเวลาสอง component เขียน localStorage.lg_filters.registry พร้อมกัน)
  const [tabF,setTabF]=usePageFilters('registryTabs',{tab:'register'})
  const tab=tabF.tab, setTab=t=>setTabF('tab',t)

  const kpis=[
    {lab:'ข้อปฏิบัติทั้งหมด',   val:stats.req, accent:'#1C2431'},
    {lab:'ผ่านการประเมิน (C)', val:stats.met, accent:'#5F7A61'},
    {lab:'ยังไม่สอดคล้อง (NC)', val:stats.nc, accent:'#B4553F'},
    {lab:'รอผู้เกี่ยวข้องประเมิน', val:stats.waiting||0, accent:'#8A8F98'},
  ]
  return <div className="view">
    <div className="seg" style={{marginBottom:14}}>
      {REGISTRY_TABS.map(([k,lbl])=>(
        <button key={k} className={'seg-btn'+(tab===k?' active':'')} onClick={()=>setTab(k)}>
          {lbl}{k==='repealed'&&repealedLaws.length>0?` (${repealedLaws.length})`:''}
        </button>
      ))}
    </div>

    {tab==='register' && <>
      <div className="rc-stats">
        {kpis.map((k,i)=>(
          <div className="stat" key={i} style={{borderTopColor:k.accent}}>
            <div className="lab">{k.lab}</div>
            <div className="val num" style={{color:k.accent}}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* การตรวจสอบรายเดือน (ย้ายมาจาก Dashboard) */}
      {onToggleMonth && <div style={{marginBottom:16}}>
        <MonthlyCheckPanel months={monthsData} year={monthYear||new Date().getFullYear()} setYear={setMonthYear}
          onToggle={onToggleMonth} onMarkNoNewLaws={onMarkNoNewLaws} onMarkHasNewLaws={onMarkHasNewLaws}/>
      </div>}

      <Register laws={regLaws} cats={cats} catMap={catMap} search={search} onOpen={onOpen} onCreate={onCreate} onBulk={onBulk} allLaws={allLaws}
        round={round} onExportF259={onExportF259} onAddLaw={onAddLaw} onImported={onImported}
        workflow={workflow} suggest={suggest} onAssess={onAssess} focus={focus} onDelete={onDelete}/>
    </>}

    {tab==='history' && <History activity={activity} laws={allLaws} catMap={catMap} settings={settings}
      workflowRows={workflow} searchLog={searchLog} onDeleteLaw={onDelete}/>}

    {tab==='repealed' && <Repealed laws={repealedLaws} catMap={catMap} search={search} onOpen={onOpen} onRestore={onRestore}/>}
  </div>
}

/* ─────────────────────────── REGISTER ─────────────────────────── */
// จัดลำดับหมวด: LA→LG
const catOrder=(a,b)=>a.localeCompare(b)

// P20d · รายการที่ค้างรออนุมัติใน lg_import_staging (ดูอย่างเดียว — ไม่ลบ/แก้ข้อมูล)
function StagingModal({ laws=[], catMap={}, onClose }){
  return (<>
    <div className="scrim" style={{zIndex:300}} onClick={onClose}/>
    <div className="modal" style={{zIndex:301,width:620,maxWidth:'94vw'}}>
      <div className="modal-head"><h3>รายการรออนุมัติเข้าทะเบียน ({laws.length})</h3><button className="close" onClick={onClose}><I n="x"/></button></div>
      <div className="modal-body">
        <div style={{fontSize:12.5,color:'var(--ink-faint)',marginBottom:12,lineHeight:1.6}}>
          รายการเหล่านี้ค้างอยู่ใน staging (เสนอเข้าทะเบียนแต่ยังไม่อนุมัติ) — ตรวจแล้วเพิ่มเข้าทะเบียนได้ที่ปุ่ม “เพิ่มกฎหมาย” หรือปล่อยไว้ก็ได้ (ไม่ถูกลบ)
        </div>
        {laws.map((l,i)=>(
          <div key={i} className="panel" style={{padding:'10px 14px',marginBottom:8,display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <Tag c={l.cat} color={catMap[l.cat]?.color}/>
            <span className="law-code">{l.law_code}</span>
            <span style={{flex:1,minWidth:180,fontSize:13}}>{(l.law_name||'').slice(0,70)}</span>
            <span style={{fontSize:11.5,color:'var(--ink-faint)'}}>{l.ministry||'—'}</span>
            <span style={{fontSize:11.5,color:'var(--ink-faint)'}}>{l.reqs} ข้อ</span>
          </div>
        ))}
        {laws.length===0 && <div style={{textAlign:'center',color:'var(--ink-faint)',padding:24,fontSize:13}}>ไม่มีรายการรออนุมัติ</div>}
      </div>
      <div className="modal-foot"><button className="btn btn-primary" onClick={onClose}>ปิด</button></div>
    </div>
  </>)
}

function Register({laws,cats,catMap,search,onOpen,onCreate,onBulk,allLaws,round={q:1,by:new Date().getFullYear()+543},onExportF259,onAddLaw,onImported,
    workflow=[],suggest={},onAssess,focus,onDelete}){
  const { can }=useAuth()
  // P20d · รายการรออนุมัติใน lg_import_staging (badge ข้างปุ่มเพิ่มกฎหมาย)
  const [staging,setStaging]=useState([])
  const [showStaging,setShowStaging]=useState(false)
  useEffect(()=>{ let live=true; fetchStaging().then(r=>{ if(live) setStaging(r) }).catch(()=>{}); return ()=>{ live=false } },[])
  const stagingLaws=useMemo(()=>{ const m={}; staging.forEach(r=>{ const k=(r.cat||'')+'|'+r.law_code; (m[k]=m[k]||{cat:r.cat,law_code:r.law_code,law_name:r.law_name,ministry:r.ministry,created_at:r.created_at,reqs:0}).reqs++ }); return Object.values(m) },[staging])
  // Task 6.1 · จำ filter ต่อหน้า (lg_filters.registry)
  // P21 · เพิ่มตัวกรองสถานะการประเมิน (st) — 'all' | 4 สถานะ | 'waiting'
  const [f,setF,resetF,filterActive]=usePageFilters('registry',{cat:'all',act:'all',st:'all',sortKey:'code',sortDir:1})
  const {cat,act,st,sortKey,sortDir}=f
  const setCat=v=>setF('cat',v), setAct=v=>setF('act',v), setSt=v=>setF('st',v)
  // นับจำนวน "ฉบับ" ที่มีข้อปฏิบัติสถานะนั้นอย่างน้อย 1 ข้อ (ไม่ใช่จำนวนข้อ)
  // ตัวกรองทำงานระดับกฎหมาย จึงต้องนับระดับเดียวกัน ไม่งั้นตัวเลขบน chip จะไม่ตรงกับผลที่กรองได้
  const hasKind=(l,k)=>(l.reqs||[]).some(r=>reqKind(r)===k)
  const countKind=k=>laws.filter(l=>hasKind(l,k)).length
  const [flashId,setFlashId]=useState(null)       // P14·T1 · แถวที่เพิ่งเพิ่ม (ไฮไลต์ 2 วิ)
  const [assessTarget,setAssessTarget]=useState(null)   // P14·T2 · { law, wf } เปิด popup ประเมิน
  const [deleteTarget,setDeleteTarget]=useState(null)   // ลบกฎหมายจากแถวทะเบียน (admin)

  // P14·T1 · workflow ที่ยังเปิดอยู่ต่อกฎหมาย (ใช้ทำ badge "รอประเมิน")
  const openWfByLaw=useMemo(()=>{
    const m={}
    ;(workflow||[]).forEach(w=>{ if(w.status!=='เสร็จสิ้น' && !m[w.law_id]) m[w.law_id]=w })
    return m
  },[workflow])

  // P14·T1 · หลังเพิ่มกฎหมาย → สลับหมวดไปที่กฎหมายใหม่ + scroll + ไฮไลต์แถว 2 วิ
  useEffect(()=>{ if(!focus?.ts) return
    if(focus.cat) setF('cat',focus.cat)
    setFlashId(focus.lawId)
    const t1=setTimeout(()=>{ document.getElementById('reg-law-'+focus.lawId)?.scrollIntoView({behavior:'smooth',block:'center'}) },140)
    const t2=setTimeout(()=>setFlashId(null),2200)
    return ()=>{ clearTimeout(t1); clearTimeout(t2) }
  },[focus?.ts])   // eslint-disable-line react-hooks/exhaustive-deps
  const [sel,setSel]=useState(new Set())
  const toggleSel=id=>setSel(p=>{ const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n })
  const clearSel=()=>setSel(new Set())
  async function bulk(met){ await onBulk([...sel],met); clearSel() }
  function exportSel(){ const m=Object.fromEntries(cats.map(c=>[c.code,c])); exportLawsToExcel(laws.filter(l=>sel.has(l.id)),m); }
  const catsList=[...new Set(laws.map(l=>l.cat))].sort(catOrder)
  const q=search.toLowerCase()
  // ค้นหา (item 7): รหัส · ชื่อกฎหมาย · กระทรวง (ตรงกับชื่อ/รหัส) — Task 3.3 แยกกรณี match จากข้อปฏิบัติ
  const nameHit=l=>l.code.toLowerCase().includes(q)||l.name.toLowerCase().includes(q)||(l.ministry||'').toLowerCase().includes(q)
  const reqHit=l=>(l.reqs||[]).find(r=>(r.text||'').toLowerCase().includes(q)||(r.responsible||'').toLowerCase().includes(q))
  const matchQ=l=>!q||nameHit(l)||!!reqHit(l)
  // ข้อความข้อปฏิบัติที่เจอ (แสดงใต้ชื่อกฎหมาย) — เฉพาะแถวที่ match จากข้อปฏิบัติ ไม่ใช่ชื่อ/รหัส
  const reqMatchText=l=>{ if(!q||nameHit(l)) return null; const r=reqHit(l); return r?(r.text||r.responsible||''):null }
  const rows=laws.filter(l=>(cat==='all'||l.cat===cat)
    &&(act==='all'||(act==='active'?l.active!==false:l.active===false))
    &&(st==='all'||hasKind(l,st))
    &&matchQ(l))
  // Task 3.1 · comparator ตาม sortKey/sortDir (ใช้ภายในแต่ละกลุ่มหมวด/ชั้น)
  const sortCmp=(a,b)=>{
    let d=0
    if(sortKey==='announce')  d=(lawBEYear(a.issue_date)||0)-(lawBEYear(b.issue_date)||0)
    else if(sortKey==='pct')  d=prog(a)-prog(b)
    if(d===0) d=a.code.localeCompare(b.code)
    return d*sortDir
  }
  const toggleSort=k=>{ if(sortKey===k) setF('sortDir',x=>-x); else { setF('sortKey',k); setF('sortDir',1) } }
  const sortArrow=k=>sortKey===k?(sortDir===1?' ↑':' ↓'):''
  const grouped=useMemo(()=>{ const byCat={}; rows.forEach(l=>{ const c=l.cat; if(!byCat[c])byCat[c]={}; const t=l.hierarchy_level||5; if(!byCat[c][t])byCat[c][t]=[]; byCat[c][t].push(l) }); return byCat },[rows])
  const activeCats=catsList.filter(c=>cat==='all'||c===cat)
  return <div className="view">
    <div className="filterbar">
      <span className={'chip'+(act==='all'?' active':'')} onClick={()=>setAct('all')}>ทั้งหมด</span>
      <span className={'chip'+(act==='active'?' active':'')} onClick={()=>setAct('active')}>ใช้อยู่ ({laws.filter(l=>l.active!==false).length})</span>
      <span className={'chip'+(act==='inactive'?' active':'')} onClick={()=>setAct('inactive')}>ไม่ใช้แล้ว ({laws.filter(l=>l.active===false).length})</span>
      <span style={{margin:'0 6px',color:'var(--line)'}}>|</span>
      {/* P21 · กรองตามสถานะการประเมิน — แสดงฉบับที่มีข้อปฏิบัติสถานะนั้นอย่างน้อย 1 ข้อ */}
      <span className={'chip'+(st==='all'?' active':'')} onClick={()=>setSt('all')} title="ไม่กรองตามสถานะการประเมิน">ทุกสถานะ</span>
      {REQ_STATUS_ORDER.map(k=>(
        <span key={k} className={'chip'+(st===k?' active':'')} onClick={()=>setSt(k)} title={REQ_STATUS[k].desc}>
          {REQ_STATUS[k].code} {REQ_STATUS[k].label} ({countKind(k)})
        </span>
      ))}
      <span className={'chip'+(st==='waiting'?' active':'')} onClick={()=>setSt('waiting')} title="มีข้อที่ยังไม่มีใครประเมิน">
        ยังไม่ประเมิน ({countKind('waiting')})
      </span>
      {filterActive && <span className="chip" style={{marginLeft:'auto',cursor:'pointer'}} onClick={resetF} title="ล้างตัวกรองทั้งหมด">✕ ล้างตัวกรอง</span>}
    </div>
    <div className="cat-cards">
      <button type="button" className={'cat-card'+(cat==='all'?' active':'')} onClick={()=>setCat('all')}>
        <div className="cc-top"><span className="cc-dot" style={{background:'var(--ink-faint)'}}/><span className="cc-code">ทั้งหมด</span></div>
        <span className="cc-count">{laws.length} ฉบับ</span>
      </button>
      {catsList.map(c=>(
        <button type="button" key={c} className={'cat-card'+(cat===c?' active':'')} onClick={()=>setCat(c)}>
          <div className="cc-top"><span className="cc-dot" style={{background:catMap[c]?.color||'var(--ink-faint)'}}/><span className="cc-code">{c}</span></div>
          <span className="cc-name">{catMap[c]?.name}</span>
          <span className="cc-count">{laws.filter(l=>l.cat===c).length} ฉบับ</span>
        </button>
      ))}
    </div>
    <div className="filterbar">
      <span className="right" style={{marginLeft:'auto'}}>พบ {rows.length} ฉบับ</span>
      <div style={{position:'relative',display:'inline-flex'}}>
        <button className="btn btn-primary" style={{padding:'6px 14px',fontSize:12.5}} disabled={!can('edit')||!onAddLaw} title={can('edit')?'':NO_PERM} onClick={()=>onAddLaw&&onAddLaw()}><I n="plus"/>เพิ่มกฎหมาย</button>
        {stagingLaws.length>0 && (
          <button title={`มี ${stagingLaws.length} รายการรออนุมัติเข้าทะเบียน — คลิกเพื่อดู`} onClick={()=>setShowStaging(true)}
            style={{position:'absolute',top:-8,right:-8,minWidth:20,height:20,padding:'0 5px',borderRadius:999,border:'2px solid var(--surface)',background:'var(--warn)',color:'#fff',fontSize:11,fontWeight:800,cursor:'pointer',lineHeight:1}}>
            {stagingLaws.length}
          </button>
        )}
      </div>
    </div>
    {showStaging && <StagingModal laws={stagingLaws} catMap={catMap} onClose={()=>setShowStaging(false)}/>}
    {sel.size>0 && (
      <div className="bulkbar">
        <b>เลือก {sel.size} ฉบับ</b>
        <button className="btn btn-ghost" disabled={!can('edit')} title={can('edit')?'':NO_PERM} onClick={()=>bulk(true)}>ทำเครื่องหมายสอดคล้องทั้งหมด</button>
        <button className="btn btn-ghost" disabled={!can('edit')} title={can('edit')?'':NO_PERM} onClick={()=>bulk(false)}>ทำเครื่องหมายยังไม่สอดคล้อง</button>
        <button className="btn btn-ghost" onClick={exportSel}>Export ที่เลือก ({sel.size})</button>
        <button className="btn btn-ghost" style={{marginLeft:'auto'}} onClick={clearSel}>ล้างที่เลือก</button>
      </div>
    )}
    {activeCats.map(c=>(
      <div key={c} style={{marginBottom:20}}>
        <div className="hier-cat-header" style={{borderLeftColor:catMap[c]?.color||'var(--brand)'}}>
          <span style={{color:catMap[c]?.color,fontWeight:700}}>{c}</span>
          <span style={{marginLeft:8,color:'var(--ink-soft)'}}>{catMap[c]?.name}</span>
          {(()=>{ const ls=rows.filter(l=>l.cat===c); const s=sumReqStats(ls);
            const col=s.pct==null?'var(--ink-faint)':s.pct===100?'var(--ok)':s.pct>=70?'var(--review)':'var(--bad)';
            return <span style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
              <span className="pill" style={{fontSize:11.5,fontWeight:700,background:'color-mix(in srgb,'+col+' 12%,transparent)',color:col}}>{s.pct==null?'ยังไม่ประเมิน':'สอดคล้อง '+s.pct+'%'}</span>
              <span style={{fontSize:12,color:'var(--ok)'}}>C {s.met}/{s.assessed} ข้อ</span>
              {s.unmet>0 && <span style={{fontSize:12,color:'var(--bad)'}}>NC {s.unmet} ข้อ</span>}
              {s.waiting>0 && <span style={{fontSize:12,color:'var(--ink-faint)'}}>รอผู้เกี่ยวข้องประเมิน {s.waiting} ข้อ</span>}
              <span style={{fontSize:12,color:'var(--ink-faint)'}}>{ls.length} ฉบับ</span>
            </span> })()}
        </div>
        {LAW_TYPES.filter(t=>grouped[c]?.[t.level]?.length).map(t=>(
          <div key={t.level} style={{marginBottom:8}}>
            <div className="hier-tier-label"><span className="tier-badge">ชั้น {t.level}</span>{t.label}</div>
            <div className="panel" style={{marginTop:0,borderTopLeftRadius:0,borderTopRightRadius:0}}>
              <div className="tablewrap"><table className="reg-table" style={{tableLayout:'fixed'}}>
                {/* คอลัมน์กว้างเท่ากันทุกตาราง (ทุกหมวด/ทุกชั้น) เพื่อให้แถวตรงกัน */}
                <colgroup>
                  <col style={{width:40}}/>
                  <col/>
                  <col style={{width:200}}/>
                  <col style={{width:120}}/>
                  <col style={{width:120}}/>
                  <col style={{width:160}}/>
                </colgroup>
                <thead><tr>
                  <th></th>
                  <th className="th-sort" style={{cursor:'pointer'}} onClick={()=>toggleSort('code')} title="เรียงตามรหัส">รหัส / ชื่อกฎหมาย{sortArrow('code')}</th>
                  <th>กระทรวง</th>
                  <th className="th-sort" style={{cursor:'pointer',whiteSpace:'nowrap'}} onClick={()=>toggleSort('announce')} title="เรียงตามวันที่ประกาศ">วันที่ประกาศ{sortArrow('announce')}</th>
                  <th style={{whiteSpace:'nowrap'}}>วันที่บังคับใช้</th>
                  <th className="th-sort" style={{cursor:'pointer',whiteSpace:'nowrap'}} onClick={()=>toggleSort('pct')} title="เรียงตาม % สอดคล้อง">สถานะ{sortArrow('pct')}</th>
                </tr></thead>
                <tbody>{[...grouped[c][t.level]].sort(sortCmp).map(l=>{ const openWf=openWfByLaw[l.id]; const pending=openWf?.status==='รอประเมิน'; return (
                  <tr key={l.id} id={'reg-law-'+l.id} className={(sel.has(l.id)?'row-sel':'')+(flashId===l.id?' row-flash':'')} style={l.active===false?{opacity:.55}:null}>
                    <td onClick={e=>{e.stopPropagation();toggleSel(l.id)}} style={{textAlign:'center'}}><input type="checkbox" checked={sel.has(l.id)} onChange={()=>toggleSel(l.id)} onClick={e=>e.stopPropagation()}/></td>
                    <td onClick={()=>onOpen(l)}><div className="law-code" style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>{l.code}<ActiveBadge active={l.active!==false} size="sm"/>{l.source_url && <a href={l.source_url} target="_blank" rel="noopener noreferrer" title={"เปิดตัวบท: "+l.source_url} onClick={e=>e.stopPropagation()} style={{fontSize:12,textDecoration:'none',color:'var(--brand)',fontWeight:600}}>📄 แหล่งที่มา</a>}</div><div className="law-title">{l.name}</div>{(()=>{ const rt=reqMatchText(l); return rt?<div style={{fontSize:11.5,color:'var(--ink-faint)',marginTop:3,lineHeight:1.4}}>↳ {markSnippet(rt,q)}</div>:null })()}</td>
                    <td data-lb="กระทรวง" onClick={()=>onOpen(l)} style={{fontSize:12.5,color:'var(--ink-soft)',lineHeight:1.5}}>{l.ministry||'—'}</td>
                    {(()=>{ const d=splitLawDates(l); return <>
                    <td data-lb="วันที่ประกาศ" onClick={()=>onOpen(l)} style={{fontSize:12,color:'var(--ink-soft)',lineHeight:1.5}}>{d.announce||'—'}</td>
                    <td data-lb="วันที่บังคับใช้" onClick={()=>onOpen(l)} style={{fontSize:12,color:'var(--ink-soft)',lineHeight:1.5}}>{d.effective||'—'}</td>
                    </> })()}
                    <td data-lb="สถานะ"><div style={{display:'flex',alignItems:'center',gap:8}}><span onClick={()=>onOpen(l)}>{pending?<span className="pill pill-pending" title="ยังไม่ได้ประเมิน — รอผู้ประเมิน">รอประเมิน</span>:<Pill s={l.status}/>}</span>{pending&&can('edit')&&onAssess&&<button className="btn btn-primary" style={{padding:'3px 10px',fontSize:11}} title="ประเมินความสอดคล้อง" onClick={e=>{e.stopPropagation();setAssessTarget({law:l,wf:openWf})}}>ประเมิน</button>}{onDelete&&can('delete')&&<button className="btn btn-ghost" style={{padding:'3px 8px',fontSize:11,color:'var(--bad)'}} title="ลบกฎหมายถาวร" onClick={e=>{e.stopPropagation();setDeleteTarget(l)}}><I n="ban"/></button>}</div></td>
                  </tr>
                )})}</tbody>
              </table></div>
            </div>
          </div>
        ))}
      </div>
    ))}
    {rows.length===0 && (()=>{
      // Task 6.2 · ไม่เจอในหมวดที่กรอง แต่เจอในหมวดอื่น → เสนอให้ดูทุกหมวด
      const otherCount = cat==='all' ? 0 : laws.filter(l=>l.cat!==cat
        &&(act==='all'||(act==='active'?l.active!==false:l.active===false))
        &&matchQ(l)).length
      return <div className="panel"><div style={{textAlign:'center',color:'var(--ink-faint)',padding:40}}>
        {otherCount>0
          ? <>ไม่พบใน หมวด {catMap[cat]?.name||cat} — พบ {otherCount} รายการในหมวดอื่น{' '}
              <button className="btn btn-ghost" style={{padding:'3px 10px',fontSize:12.5,marginLeft:4}} onClick={()=>setCat('all')}>ดูทุกหมวด</button></>
          : 'ไม่พบกฎหมายที่ตรงกับเงื่อนไข'}
      </div></div>
    })()}
    {/* P14·T2 · popup ประเมินกลางจอ — reuse AssessForm + logic เดียวกับ Process Tracker */}
    {assessTarget && <AssessPopup target={assessTarget} suggest={suggest} onAssess={onAssess} onClose={()=>setAssessTarget(null)}/>}
    {/* ลบกฎหมายจากแถวทะเบียน (ยืนยันด้วยการพิมพ์รหัส) */}
    {deleteTarget && <DeleteLawModal law={deleteTarget} onConfirm={()=>{ const l=deleteTarget; setDeleteTarget(null); onDelete(l) }} onClose={()=>setDeleteTarget(null)}/>}
  </div>
}

/* ─────────── P14·T2 · Popup ประเมินความสอดคล้อง (กลางจอ) ─────────── */
function AssessPopup({ target, suggest, onAssess, onClose }){
  useEffect(()=>{ const h=e=>{ if(e.key==='Escape') onClose() }; window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h) },[onClose])
  const { law, wf }=target
  // P15·T2 · ถ้า onAssess โยน error (save พัง) → ไม่ปิด popup (คงข้อมูลที่พิมพ์) · toast แจ้งแล้วใน App
  async function submit(payload){ try{ await onAssess(wf, law, payload); onClose() }catch{ /* คง popup ไว้ให้แก้/ลองใหม่ */ } }
  return (<>
    <div className="scrim" style={{zIndex:320}} onClick={onClose}/>
    <div className="modal" style={{zIndex:321,width:560,maxHeight:'88vh',overflow:'auto'}}>
      <div className="modal-head"><h3>ประเมินความสอดคล้อง · {law.code}</h3><button className="close" onClick={onClose}><I n="x"/></button></div>
      <div className="modal-body">
        <div style={{fontSize:12.5,color:'var(--ink-soft)',marginBottom:10,paddingBottom:10,borderBottom:'1px solid var(--line-soft)'}}>{(law.name||'').slice(0,90)}</div>
        <AssessForm law={law} suggest={suggest} onSubmit={submit} onCancel={onClose}/>
      </div>
    </div>
  </>)
}

/* ─────────────────────────── COMPLIANCE ─────────────────────────── */

export function MonthlyCheckPanel({ months, year, setYear, onToggle, onMarkNoNewLaws, onMarkHasNewLaws }) {
  const { can }=useAuth()
  const toBE = y => y + 543
  const getMonth = m => months.find(r=>r.year===year && r.month===m) || {checked:false}
  const reviewedCount = months.filter(m=>m.year===year && (m.status||m.checked)).length
  const now = new Date()
  const curMonth = now.getMonth()+1
  const curYear = now.getFullYear()

  return (
    <div className="panel month-panel">
      <div className="panel-h">
        <h3>การตรวจสอบรายเดือน</h3>
        {setYear
          ? <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:'auto'}}>
              <button className="month-yr-btn" onClick={()=>setYear(y=>y-1)}>‹</button>
              <span style={{fontSize:13,fontWeight:600,minWidth:60,textAlign:'center'}}>ปี {toBE(year)}</span>
              <button className="month-yr-btn" onClick={()=>setYear(y=>y+1)}>›</button>
            </div>
          : <span style={{fontSize:13,fontWeight:600,marginLeft:'auto'}}>ปี {toBE(year)}</span>}
        <span className="sub">ตรวจแล้ว {reviewedCount}/12 เดือน</span>
      </div>

      <div className="month-grid">
        {TH_MONTHS.map((label, i) => {
          const m = i + 1
          const rec = getMonth(m)
          const isCurrent = year===curYear && m===curMonth
          const reviewed = !!(rec.status || rec.checked)
          const cls = 'month-cell'
            + (isCurrent?' month-current':'')
            + (reviewed?' month-checked':'')
          return (
            <button key={m} className={cls} disabled={!can('edit')} onClick={()=>can('edit')&&onToggle(year, m)}
              title={rec.checked_at ? 'ตรวจโดย '+(rec.checked_by||'—')+' · '+thDate(rec.checked_at) : (can('edit')?'คลิกเพื่อทำเครื่องหมายว่าตรวจแล้ว':'อ่านอย่างเดียว')}>
              <span className="month-name">{label}</span>
              <span className="month-tick">{reviewed ? '✓' : ''}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ComplianceLawRow({l,onToggle,onOpen}){
  const { can }=useAuth()
  const [open,setOpen]=useState(false)
  const s=reqStats(l)
  return (
    <div style={{borderBottom:'1px solid var(--line-soft)'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',paddingLeft:8}}>
        <button onClick={()=>setOpen(o=>!o)} title="กางข้อปฏิบัติ" style={{border:'none',background:'none',cursor:'pointer',color:'var(--ink-faint)',width:18}}>{open?'▾':'▸'}</button>
        <span className="law-code">{l.code}</span>
        <span style={{fontSize:13,flex:1,cursor:'pointer'}} onClick={()=>setOpen(o=>!o)}>{l.name.slice(0,60)}{l.name.length>60?'…':''}</span>
        <span style={{fontSize:12,color:'var(--ink-faint)'}} className="num"
          title={`สอดคล้อง ${s.met} · ไม่สอดคล้อง ${s.unmet} · เพื่อทราบ ${s.ack} · ไม่เกี่ยวข้อง ${s.na} · ยังไม่ประเมิน ${s.waiting}`}>
          {/* pct เป็น null = ไม่มีข้อที่เข้าฐาน C+NC เลย (เช่นมีแต่ Ack/ไม่เกี่ยวข้อง) → N/A ไม่ใช่ 0% */}
          {s.pct==null?(s.ack+s.na>0?'N/A':'ยังไม่ประเมิน'):`C ${s.met}/${s.assessed}`}
          {s.ack>0?` · Ack ${s.ack}`:''}{s.na>0?` · ไม่เกี่ยวข้อง ${s.na}`:''}{s.waiting>0?` · รอ ${s.waiting}`:''}</span>
        <Pill s={l.status}/>
        <button className="btn btn-ghost" style={{padding:'2px 9px',fontSize:11}} onClick={()=>onOpen(l)}>เปิด</button>
      </div>
      {open && (
        <div style={{paddingLeft:34,paddingBottom:10}}>
          {l.reqs.length===0 && <div style={{fontSize:12,color:'var(--ink-faint)',padding:'4px 0'}}>ไม่มีข้อปฏิบัติ</div>}
          {l.reqs.map(r=>{ const k=reqKind(r)
            const st=REQ_STATUS[k]||WAITING_STATUS
            // P21 · ปุ่มนี้เคยสลับ met↔unmet ในคลิกเดียว ซึ่งใช้กับ 4 สถานะไม่ได้
            // (Ack/ไม่เกี่ยวข้อง ต้องกรอกเหตุผลก่อนบันทึก) จึงพาไปที่แผงเลือกเต็มในหน้ารายละเอียดแทน
            return (
            <div key={r.id} style={{display:'flex',gap:9,padding:'6px 0',alignItems:'flex-start'}}>
              <button onClick={()=>onOpen(l)} title={reqEvalTitle(r)+' · เปิดรายละเอียดเพื่อเปลี่ยนสถานะ'}
                style={{flexShrink:0,minWidth:26,height:22,padding:'0 5px',borderRadius:5,border:'none',cursor:'pointer',fontSize:k==='waiting'?9.5:11,fontWeight:700,fontFamily:'var(--mono)',
                  background:st.bg,color:st.color}}>{st.code}</button>
              <span style={{fontSize:12.5,flex:1,lineHeight:1.5,color:k==='met'?'var(--ink-soft)':'var(--ink)'}} title={reqEvalTitle(r)}>{r.text}
                {r.status_reason && <em style={{display:'block',fontSize:11.5,color:'var(--ink-faint)',fontStyle:'normal',marginTop:2}}>เหตุผล: {r.status_reason}</em>}
              </span>
            </div>
          )})}
        </div>
      )}
    </div>
  )
}

function Compliance({laws,cats,onOpen,onToggle}){
  const byCat={}; laws.forEach(l=>{(byCat[l.cat]=byCat[l.cat]||[]).push(l)})
  return <div className="view">
    <div className="panel" style={{marginTop:0}}><div className="panel-h"><h3>สถานะรายหมวด / ลำดับชั้นกฎหมาย</h3><span className="sub" style={{marginLeft:'auto'}}>คลิกที่กฎหมายเพื่อดูข้อปฏิบัติและแก้ไข</span></div>
      <div className="panel-b">
        {cats.filter(c=>byCat[c.code]).map(c=>{
          const s=sumReqStats(byCat[c.code])
          const byTier={}; byCat[c.code].forEach(l=>{ const t=l.hierarchy_level||5; (byTier[t]=byTier[t]||[]).push(l) })
          return <details key={c.code} style={{marginBottom:12}} open={c.code==='LA'}>
            <summary style={{cursor:'pointer',display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'var(--surface-2)',border:'1px solid var(--line)',borderRadius:8,listStyle:'none'}}>
              <span style={{width:8,height:8,borderRadius:2,background:c.color,flexShrink:0}}/>
              <b style={{}}>{c.code}</b><span style={{flex:1}}>{c.name}</span>
              {s.waiting>0 && <span style={{fontSize:11.5,color:'var(--ink-faint)'}}>รอประเมิน {s.waiting}</span>}
              <span className="num" style={{color:c.color,fontWeight:700}} title="% นับเฉพาะข้อที่ประเมินแล้ว">{s.pct==null?'ยังไม่ประเมิน':s.pct+'%'}</span>
              <span style={{fontSize:12,color:'var(--ink-faint)'}}>{byCat[c.code].length} ฉบับ</span>
            </summary>
            <div style={{padding:'6px 14px'}}>
              {LAW_TYPES.filter(t=>byTier[t.level]?.length).map(tier=>(
                <div key={tier.level} style={{marginBottom:10}}>
                  <div className="hier-tier-label" style={{margin:'8px 0 4px'}}>
                    <span className="tier-badge">ชั้น {tier.level}</span>{tier.label}
                  </div>
                  {byTier[tier.level].map(l=>(
                    <ComplianceLawRow key={l.id} l={l} onToggle={onToggle} onOpen={onOpen}/>
                  ))}
                </div>
              ))}
            </div>
          </details>
        })}
      </div></div>
  </div>
}

