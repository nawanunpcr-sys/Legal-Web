import { useEffect, useMemo, useState } from 'react'
import { supabase, hasSupabase, fetchAll, setRequirementStatus, recomputeLawStatus,
         CAT_COLOR, STATUS } from './lib/supabase.js'
import { I } from './components/icons.jsx'
import LawDrawer from './components/LawDrawer.jsx'
import { buildReport } from './components/report.jsx'

const prog = l => !l.reqs.length ? 100 : Math.round(l.reqs.filter(r=>r.status==='met').length/l.reqs.length*100)
const thDate = s => { if(!s) return '—'; const m=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']; const d=new Date(s); return d.getDate()+' '+m[d.getMonth()]+' '+(d.getFullYear()+543) }
const daysTo = s => Math.ceil((new Date(s)-new Date())/86400000)
const Pill = ({s}) => <span className={'pill '+(STATUS[s]?.cls||'p-ok')}>{STATUS[s]?.label||s}</span>
const Tag = ({c}) => <span className="tag" style={{borderColor:CAT_COLOR[c]+'33',color:CAT_COLOR[c]}}>{c}</span>

const NAV = [
  { id:'dashboard', label:'ภาพรวม', icon:'grid' },
  { id:'register', label:'ทะเบียนกฎหมาย', icon:'book' },
  { id:'compliance', label:'ติดตามความสอดคล้อง', icon:'check' },
  { id:'comm', label:'การสื่อสาร (ISD-86)', icon:'chat' },
  { id:'analysis', label:'วิเคราะห์ & สรุป AI', icon:'spark' },
]
const TITLES = {
  dashboard:['ภาพรวม','สรุปสถานะความสอดคล้องตามกฎหมาย SHE'],
  register:['ทะเบียนกฎหมาย','กฎหมายที่เกี่ยวข้องและสถานะการปฏิบัติ'],
  compliance:['ติดตามความสอดคล้อง','สถานะรายข้อกำหนดแยกตามหมวด'],
  comm:['ตารางการสื่อสาร','การสื่อสารภายในและภายนอกองค์กร (ISD-86)'],
  analysis:['วิเคราะห์ & สรุป AI','ข้อค้นพบและข้อเสนอแนะจากการประเมิน'],
}

export default function App(){
  const [view,setView]=useState('dashboard')
  const [collapsed,setCollapsed]=useState(false)
  const [cats,setCats]=useState([]); const [laws,setLaws]=useState([]); const [comms,setComms]=useState([])
  const [loading,setLoading]=useState(true); const [err,setErr]=useState('')
  const [search,setSearch]=useState(''); const [openLaw,setOpenLaw]=useState(null)
  const [showBell,setShowBell]=useState(false)

  useEffect(()=>{ (async()=>{
    if(!hasSupabase){ setErr('ยังไม่ได้ตั้งค่า Supabase (.env) — กำลังแสดงหน้าเปล่า'); setLoading(false); return }
    try{ const d=await fetchAll(); setCats(d.cats); setLaws(d.laws); setComms(d.comms) }
    catch(e){ setErr('เชื่อมต่อฐานข้อมูลไม่สำเร็จ: '+e.message) }
    setLoading(false)
  })() },[])

  const catName = useMemo(()=>Object.fromEntries(cats.map(c=>[c.code,c.name])),[cats])
  const stats = useMemo(()=>{
    let req=0,met=0; laws.forEach(l=>l.reqs.forEach(r=>{req++;if(r.status==='met')met++}))
    return { total:laws.length, req, met, nc:req-met, pct: req?Math.round(met/req*100):100 }
  },[laws])
  const notifications = useMemo(()=>{
    const out=[]
    laws.forEach(l=>{ if(l.status==='bad') out.push({type:'bad',law:l,text:l.code+' ยังไม่สอดคล้อง',sub:l.name.slice(0,60)}) })
    laws.forEach(l=>{ const d=daysTo(l.review_date); if(d>=0&&d<=60) out.push({type:'review',law:l,days:d,text:l.code+' ครบกำหนดทบทวนใน '+d+' วัน',sub:thDate(l.review_date)}) })
    return out.sort((a,b)=> (a.type==='bad'?-1:0)-(b.type==='bad'?-1:0))
  },[laws])

  async function toggleReq(law, req){
    const next = req.status==='met' ? 'unmet' : 'met'
    setLaws(prev=>prev.map(l=>{
      if(l.id!==law.id) return l
      const reqs=l.reqs.map(r=>r.id===req.id?{...r,status:next}:r)
      const status=reqs.some(r=>r.status==='unmet')?'bad':'ok'
      return {...l,reqs,status}
    }))
    setOpenLaw(prev=> prev && prev.id===law.id ? {...prev,reqs:prev.reqs.map(r=>r.id===req.id?{...r,status:next}:r), status: prev.reqs.map(r=>r.id===req.id?{...r,status:next}:r).some(r=>r.status==='unmet')?'bad':'ok'} : prev)
    try{ await setRequirementStatus(req.id,next); const fresh=law.reqs.map(r=>r.id===req.id?{...r,status:next}:r); await recomputeLawStatus(law.id,fresh) }
    catch(e){ alert('บันทึกไม่สำเร็จ: '+e.message) }
  }

  function exportPDF(){ buildReport({laws,stats,catName}); window.print() }

  if(loading) return <div className="loading"><div className="spin"></div>กำลังโหลดข้อมูลจากฐานข้อมูล…</div>

  return (
    <div className="app">
      <aside className={'sidebar'+(collapsed?' collapsed':'')}>
        <button className="collapse-btn" onClick={()=>setCollapsed(c=>!c)} title="ย่อ/ขยายแถบเมนู">
          <I n="chevron" style={{transform:collapsed?'rotate(180deg)':'none'}}/>
        </button>
        <div className="brand">
          <div className="mark"><I n="shield" stroke="#fff"/></div>
          <div className="brand-txt"><h1>LexGuard</h1><span>ทะเบียนกฎหมาย SHE</span></div>
        </div>
        <div className="nav-label">เมนูหลัก</div>
        {NAV.map(n=>(
          <button key={n.id} className={'nav-item'+(view===n.id?' active':'')} onClick={()=>{setView(n.id);setShowBell(false)}} title={n.label}>
            <I n={n.icon}/><span className="label">{n.label}</span>
            {n.id==='register' && <span className="badge">{laws.length}</span>}
            {n.id==='compliance' && stats.nc>0 && <span className="badge" style={{background:'var(--bad)'}}>{stats.nc}</span>}
          </button>
        ))}
        <div className="side-foot">
          <div className="av">จ</div>
          <div><div className="nm">จป. วิชาชีพ</div><div className="rl">จัสเทล เน็ทเวิร์ค</div></div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="vt">{TITLES[view][0]}<small>{TITLES[view][1]}</small></div>
          <div className="spacer"/>
          {view==='register' && (
            <div className="search"><I n="search"/><input placeholder="ค้นหากฎหมาย, รหัส, กระทรวง…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
          )}
          <button className="btn btn-ghost no-print" onClick={exportPDF} title="ส่งออกรายงาน PDF"><I n="download"/>ส่งออก PDF</button>
          <div style={{position:'relative'}} className="no-print">
            <button className="bell" onClick={()=>setShowBell(s=>!s)} title="การแจ้งเตือน">
              <I n="bell"/>{notifications.length>0 && <span className="dot">{notifications.length}</span>}
            </button>
            {showBell && (
              <div className="popover">
                <h4>การแจ้งเตือน ({notifications.length})</h4>
                {notifications.length===0 && <div className="noti"><div className="s" style={{padding:'8px 12px'}}>ไม่มีการแจ้งเตือน</div></div>}
                {notifications.map((n,i)=>(
                  <div className="noti" key={i} onClick={()=>{setOpenLaw(n.law);setShowBell(false)}}>
                    <div className="ico" style={{background:n.type==='bad'?'var(--bad-bg)':'var(--review-bg)',color:n.type==='bad'?'var(--bad)':'var(--review)'}}>
                      <I n={n.type==='bad'?'alert':'clock'}/>
                    </div>
                    <div><div className="t">{n.text}</div><div className="s">{n.sub}</div></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>

        <div className="content">
          {err && <div className="banner">{err}</div>}
          {view==='dashboard' && <Dashboard laws={laws} cats={cats} stats={stats} catName={catName} onOpen={setOpenLaw}/>}
          {view==='register' && <Register laws={laws} catName={catName} search={search} onOpen={setOpenLaw}/>}
          {view==='compliance' && <Compliance laws={laws} cats={cats} stats={stats} onOpen={setOpenLaw}/>}
          {view==='comm' && <Communication comms={comms}/>}
          {view==='analysis' && <Analysis laws={laws} cats={cats} stats={stats} catName={catName} onOpen={setOpenLaw}/>}
        </div>
      </div>

      {openLaw && <LawDrawer law={openLaw} catName={catName} onClose={()=>setOpenLaw(null)} onToggle={toggleReq} prog={prog} thDate={thDate}/>}
      <div id="print-report"></div>
    </div>
  )
}

/* ---------- DASHBOARD ---------- */
function Ring({pct}){
  const r=62, c=2*Math.PI*r
  return <div className="ring"><svg width="150" height="150" viewBox="0 0 150 150">
    <circle cx="75" cy="75" r={r} fill="none" stroke="var(--line-soft)" strokeWidth="14"/>
    <circle cx="75" cy="75" r={r} fill="none" stroke="var(--brand)" strokeWidth="14" strokeLinecap="round"
      strokeDasharray={c} strokeDashoffset={c-(c*pct/100)} style={{transition:'stroke-dashoffset 1s'}}/>
  </svg><div className="center"><div className="pct">{pct}%</div><div className="pl">สอดคล้อง</div></div></div>
}
function CatBars({laws,cats}){
  const byCat={}; laws.forEach(l=>{(byCat[l.cat]=byCat[l.cat]||[]).push(l)})
  return cats.filter(c=>byCat[c.code]).map(c=>{
    let r=0,m=0; byCat[c.code].forEach(l=>l.reqs.forEach(x=>{r++;if(x.status==='met')m++}))
    const p=r?Math.round(m/r*100):100
    return <div className="catbar" key={c.code}><div className="top"><span className="nm">{c.code} · {c.name}</span><b className="num" style={{color:c.color}}>{p}%</b></div>
      <div className="track"><div className="fill" style={{width:p+'%',background:c.color}}/></div></div>
  })
}
function Dashboard({laws,cats,stats,catName,onOpen}){
  const bad=laws.filter(l=>l.status==='bad')
  const cards=[
    {cls:'s-total',icon:'book',lab:'กฎหมายที่เกี่ยวข้องทั้งหมด',val:stats.total,unit:'ฉบับ',delta:cats.length+' หมวด',dc:'var(--brand)'},
    {cls:'s-ok',icon:'check',lab:'ข้อกำหนดที่สอดคล้อง',val:stats.met,unit:'ข้อ',delta:stats.pct+'% ของข้อกำหนด',dc:'var(--ok)'},
    {cls:'s-warn',icon:'list',lab:'ข้อกำหนดทั้งหมด',val:stats.req,unit:'ข้อ',delta:'ประเมินครบทุกข้อ',dc:'var(--review)'},
    {cls:'s-bad',icon:'alert',lab:'ยังไม่สอดคล้อง',val:stats.nc,unit:'ข้อ',delta:'ต้องติดตาม',dc:'var(--bad)'},
  ]
  return <div className="view">
    <div className="grid stats">
      {cards.map((c,i)=>(<div className={'stat '+c.cls} key={i}>
        <div className="ic"><I n={c.icon}/></div>
        <div className="lab">{c.lab}</div>
        <div className="val num">{c.val} <small>{c.unit}</small></div>
        <div className="delta" style={{color:c.dc}}>{c.delta}</div>
      </div>))}
    </div>
    <div className="cols">
      <div className="panel"><div className="panel-h"><h3>อัตราความสอดคล้องโดยรวม</h3><span className="sub" style={{marginLeft:'auto'}}>รอบ 1 (ม.ค.–มี.ค.) 2569</span></div>
        <div className="panel-b"><div className="ring-wrap"><Ring pct={stats.pct}/>
          <div className="legend">
            <div className="row"><span className="dot" style={{background:'var(--ok)'}}/>ข้อกำหนดสอดคล้อง (C)<b className="num">{stats.met}</b></div>
            <div className="row"><span className="dot" style={{background:'var(--bad)'}}/>ยังไม่สอดคล้อง (NC)<b className="num">{stats.nc}</b></div>
            <div className="row"><span className="dot" style={{background:'var(--brand)'}}/>กฎหมายทั้งหมด<b className="num">{stats.total}</b></div>
            <div className="row"><span className="dot" style={{background:'var(--gold)'}}/>เอกสารอ้างอิง<b className="num">F-259</b></div>
          </div></div></div></div>
      <div className="panel"><div className="panel-h"><h3>ความสอดคล้องตามหมวดกฎหมาย</h3></div>
        <div className="panel-b"><CatBars laws={laws} cats={cats}/></div></div>
    </div>
    <div className="panel" style={{marginTop:16}}>
      <div className="panel-h"><h3>รายการที่ยังไม่สอดคล้อง — ต้องติดตาม</h3><span className="sub" style={{marginLeft:'auto'}}>คลิกเพื่อดูรายละเอียด</span></div>
      <div className="tablewrap"><table><thead><tr><th>รหัส / ชื่อกฎหมาย</th><th>หมวด</th><th>กระทรวง</th><th>สถานะ</th></tr></thead><tbody>
        {bad.length===0 && <tr><td colSpan="4" style={{textAlign:'center',color:'var(--ok)',fontWeight:600,padding:30}}>ทุกข้อกำหนดสอดคล้องครบถ้วน ✓</td></tr>}
        {bad.map(l=>(<tr key={l.id} onClick={()=>onOpen(l)}>
          <td><div className="law-code">{l.code}</div><div className="law-title" style={{fontSize:13}}>{l.name.slice(0,70)}{l.name.length>70?'…':''}</div></td>
          <td><Tag c={l.cat}/></td><td style={{fontSize:12.5,color:'var(--ink-soft)'}}>{l.ministry||'—'}</td><td><Pill s={l.status}/></td>
        </tr>))}
      </tbody></table></div>
    </div>
  </div>
}

/* ---------- REGISTER ---------- */
function Register({laws,catName,search,onOpen}){
  const [cat,setCat]=useState('all')
  const catsList=[...new Set(laws.map(l=>l.cat))].sort()
  const q=search.toLowerCase()
  const rows=laws.filter(l=>(cat==='all'||l.cat===cat)&&(!q||l.name.toLowerCase().includes(q)||l.code.toLowerCase().includes(q)||(l.ministry||'').toLowerCase().includes(q)))
  return <div className="view">
    <div className="filterbar">
      <span className={'chip'+(cat==='all'?' active':'')} onClick={()=>setCat('all')}>ทุกหมวด ({laws.length})</span>
      {catsList.map(c=>(<span key={c} className={'chip'+(cat===c?' active':'')} onClick={()=>setCat(c)}>{c} · {catName[c]} ({laws.filter(l=>l.cat===c).length})</span>))}
      <span className="right">พบ {rows.length} ฉบับ</span>
    </div>
    <div className="panel"><div className="tablewrap"><table>
      <thead><tr><th>รหัส / ชื่อกฎหมาย</th><th>หมวด</th><th>กระทรวง</th><th>สถานะ</th><th>ความสอดคล้อง</th></tr></thead>
      <tbody>{rows.map(l=>{const p=prog(l);return(<tr key={l.id} onClick={()=>onOpen(l)}>
        <td><div className="law-code">{l.code}</div><div className="law-title">{l.name}</div></td>
        <td><Tag c={l.cat}/></td><td style={{fontSize:12.5,color:'var(--ink-soft)'}}>{l.ministry||'—'}</td><td><Pill s={l.status}/></td>
        <td><div className="mini-prog"><div className="track"><div className="fill" style={{width:p+'%',background:p===100?'var(--ok)':'var(--bad)'}}/></div><span className="num">{p}%</span></div></td>
      </tr>)})}
      {rows.length===0 && <tr><td colSpan="5" style={{textAlign:'center',color:'var(--ink-faint)',padding:40}}>ไม่พบกฎหมายที่ตรงกับเงื่อนไข</td></tr>}
      </tbody></table></div></div>
  </div>
}

/* ---------- COMPLIANCE ---------- */
function Compliance({laws,cats,stats,onOpen}){
  const byCat={}; laws.forEach(l=>{(byCat[l.cat]=byCat[l.cat]||[]).push(l)})
  return <div className="view">
    <div className="grid" style={{gridTemplateColumns:'repeat(3,1fr)',marginBottom:16}}>
      <div className="panel" style={{padding:18}}><div style={{fontSize:13,color:'var(--ink-faint)'}}>ข้อกำหนดทั้งหมด</div><div className="num" style={{fontSize:28,fontWeight:700}}>{stats.req}</div></div>
      <div className="panel" style={{padding:18}}><div style={{fontSize:13,color:'var(--ink-faint)'}}>ผ่านการประเมิน (C)</div><div className="num" style={{fontSize:28,fontWeight:700,color:'var(--ok)'}}>{stats.met}</div></div>
      <div className="panel" style={{padding:18}}><div style={{fontSize:13,color:'var(--ink-faint)'}}>ยังไม่สอดคล้อง (NC)</div><div className="num" style={{fontSize:28,fontWeight:700,color:'var(--bad)'}}>{stats.nc}</div></div>
    </div>
    <div className="panel"><div className="panel-h"><h3>สถานะรายหมวด</h3><span className="sub" style={{marginLeft:'auto'}}>คลิกที่กฎหมายเพื่อดูข้อกำหนดและแก้ไข</span></div>
      <div className="panel-b">
        {cats.filter(c=>byCat[c.code]).map(c=>{
          let r=0,m=0; byCat[c.code].forEach(l=>l.reqs.forEach(x=>{r++;if(x.status==='met')m++}))
          const p=r?Math.round(m/r*100):100
          return <details key={c.code} style={{marginBottom:12}} open={c.code==='LA'}>
            <summary style={{cursor:'pointer',display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'var(--surface-2)',border:'1px solid var(--line)',borderRadius:11,listStyle:'none'}}>
              <span style={{width:10,height:10,borderRadius:3,background:c.color}}/>
              <b style={{fontFamily:'Bai Jamjuree'}}>{c.code}</b><span style={{flex:1}}>{c.name}</span>
              <span className="num" style={{color:c.color,fontWeight:700}}>{p}%</span>
              <span style={{fontSize:12,color:'var(--ink-faint)'}}>{byCat[c.code].length} ฉบับ</span>
            </summary>
            <div style={{padding:'6px 14px'}}>{byCat[c.code].map(l=>(
              <div key={l.id} onClick={()=>onOpen(l)} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderBottom:'1px solid var(--line-soft)',cursor:'pointer'}}>
                <span className="law-code">{l.code}</span>
                <span style={{fontSize:13,flex:1}}>{l.name.slice(0,60)}{l.name.length>60?'…':''}</span>
                <span style={{fontSize:12,color:'var(--ink-faint)'}} className="num">{l.reqs.filter(r=>r.status==='met').length}/{l.reqs.length} ข้อ</span>
                <Pill s={l.status}/>
              </div>))}
            </div>
          </details>
        })}
      </div></div>
  </div>
}

/* ---------- COMMUNICATION (ISD-86) ---------- */
function Communication({comms}){
  const [scope,setScope]=useState('internal')
  const rows=comms.filter(c=>c.scope===scope)
  return <div className="view">
    <div className="filterbar">
      <span className={'chip'+(scope==='internal'?' active':'')} onClick={()=>setScope('internal')}>ภายในองค์กร ({comms.filter(c=>c.scope==='internal').length})</span>
      <span className={'chip'+(scope==='external'?' active':'')} onClick={()=>setScope('external')}>ภายนอกองค์กร ({comms.filter(c=>c.scope==='external').length})</span>
      <span className="right">เอกสารอ้างอิง ISD-86 Rev.7</span>
    </div>
    <div className="panel"><div className="tablewrap"><table>
      <thead><tr><th style={{width:'34%'}}>ประเภทข้อมูล</th><th>ผู้สื่อสาร</th><th>ผู้รับสาร</th><th>ความถี่</th><th>วิธีการสื่อสาร</th></tr></thead>
      <tbody>{rows.map(c=>(<tr key={c.id} style={{cursor:'default'}}>
        <td style={{fontWeight:500,maxWidth:320,lineHeight:1.4}}>{c.topic}</td>
        <td style={{fontSize:12.5,color:'var(--ink-soft)',whiteSpace:'pre-line'}}>{c.sender}</td>
        <td style={{fontSize:12.5,color:'var(--ink-soft)'}}>{c.receiver}</td>
        <td style={{fontSize:12.5,color:'var(--ink-soft)'}}>{c.frequency}</td>
        <td style={{fontSize:12.5,color:'var(--ink-soft)'}}>{c.method}</td>
      </tr>))}</tbody></table></div></div>
  </div>
}

/* ---------- ANALYSIS ---------- */
function Analysis({laws,cats,stats,catName,onOpen}){
  const bad=laws.filter(l=>l.status==='bad')
  const byCat={}; laws.forEach(l=>{(byCat[l.cat]=byCat[l.cat]||[]).push(l)})
  return <div className="view">
    <div className="ai-box" style={{marginBottom:20}}>
      <span className="ai-tag"><I n="spark"/>บทสรุปผู้บริหาร (สรุปโดย AI)</span>
      <p>จากทะเบียนกฎหมาย SHE ของ <b>บริษัท จัสเทล เน็ทเวิร์ค</b> (F-259, รอบ 1 ปี 2569) มีกฎหมายที่เกี่ยวข้องทั้งสิ้น <b>{stats.total} ฉบับ</b> ใน {cats.length} หมวด รวมข้อกำหนดที่ต้องปฏิบัติ <b>{stats.req} ข้อ</b> โดยมีอัตราความสอดคล้องโดยรวม <b>{stats.pct}%</b> ({stats.met} ข้อ) คงเหลือข้อกำหนดที่ยังไม่สอดคล้องเพียง <b>{stats.nc} ข้อ</b> ซึ่งอยู่ในหมวด LA และอยู่ระหว่างรอภาครัฐประกาศหลักสูตร/แนวทางปฏิบัติ จึงเป็นความเสี่ยงระดับต่ำที่อยู่นอกเหนือการควบคุมโดยตรง — ภาพรวมระบบจัดการกฎหมายอยู่ในเกณฑ์ดีเยี่ยมและพร้อมต่อการตรวจประเมิน</p>
    </div>
    <div className="cols" style={{marginTop:0}}>
      <div>
        <div className="panel-h" style={{border:'none',padding:'0 0 13px'}}><h3>ข้อค้นพบสำคัญ & ข้อเสนอแนะ</h3></div>
        {bad.map(l=>l.reqs.filter(r=>r.status==='unmet').map(r=>(
          <div className="insight" key={r.id} onClick={()=>onOpen(l)} style={{cursor:'pointer'}}>
            <div className="ii" style={{background:'var(--bad-bg)',color:'var(--bad)'}}><I n="alert"/></div>
            <div><span className="ic-code">{l.code} · ยังไม่สอดคล้อง</span><h4>{l.name.slice(0,70)}</h4><p>{(r.note||r.text).slice(0,150)}…</p></div>
          </div>)))}
        <div className="insight"><div className="ii" style={{background:'var(--ok-bg)',color:'var(--ok)'}}><I n="check"/></div>
          <div><span className="ic-code">จุดแข็ง</span><h4>5 หมวดสอดคล้องครบ 100%</h4><p>หมวดไฟฟ้า, อัคคีภัย, สภาพแวดล้อม, เครื่องจักร และ Service ผ่านการประเมินทุกข้อกำหนด เป็นฐานที่มั่นคงต่อการรับรองมาตรฐาน ISO 45001</p></div></div>
        <div className="insight"><div className="ii" style={{background:'var(--review-bg)',color:'var(--review)'}}><I n="clock"/></div>
          <div><span className="ic-code">ข้อเสนอแนะ</span><h4>ติดตามประกาศหลักสูตรผู้ชำนาญการ</h4><p>มอบหมายผู้รับผิดชอบติดตามประกาศกระทรวงแรงงานเรื่องหลักสูตรอบรม เพื่อขึ้นทะเบียนผู้ชำนาญการและปิดข้อ NC ทั้ง {stats.nc} ข้อทันทีเมื่อมีผลบังคับ</p></div></div>
      </div>
      <div>
        <div className="panel-h" style={{border:'none',padding:'0 0 13px'}}><h3>สัดส่วนกฎหมายรายหมวด</h3></div>
        <div className="panel"><div className="panel-b">
          {cats.filter(c=>byCat[c.code]).map(c=>{const n=byCat[c.code].length;const p=Math.round(n/stats.total*100);
            return <div className="catbar" key={c.code}><div className="top"><span className="nm">{c.code} · {c.name}</span><b className="num">{n} ฉบับ</b></div>
              <div className="track"><div className="fill" style={{width:p+'%',background:c.color}}/></div></div>})}
        </div></div>
      </div>
    </div>
  </div>
}
