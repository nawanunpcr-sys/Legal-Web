// Registry & Compliance page (ทะเบียน & ความสอดคล้อง).
// Includes AddLawModal, Register, MonthlyCheckPanel, ComplianceLawRow, Compliance.
// Moved verbatim from App.jsx (pure refactor).
import { useState, useMemo } from 'react'
import { LAW_TYPES } from '../lib/supabase.js'
import { useAuth, NO_PERM } from '../lib/auth.js'
import { I } from '../components/icons.jsx'
import { exportLawsToExcel } from '../lib/integrations.js'
import { usePersist, Pill, ActiveBadge, thDate, TH_MONTHS, nextCode, roundLabel, roundCounts, quarterOfDate, daysTo, effectiveInfo } from '../lib/ui.jsx'
import RoundSelect from '../components/RoundSelect.jsx'

/* ─────────────────────────── ADD LAW MODAL ───────────────────────── */
function AddLawModal({ cats, allLaws, onSave, onClose }) {
  const { can } = useAuth()
  const [catCode, setCatCode] = useState(cats[0]?.code || '')
  const [level, setLevel] = useState('1')
  const [name, setName] = useState('')
  const [ministry, setMinistry] = useState('')
  const [announceDate, setAnnounceDate] = useState('')
  const [effectiveDate, setEffectiveDate] = useState('')
  const [docList, setDocList] = useState('')
  const [responsible, setResponsible] = useState('')
  const [saving, setSaving] = useState(false)

  const previewCode = catCode ? nextCode(allLaws, catCode) : '—'
  const valid = catCode && name.trim()

  async function save() {
    if (!valid) return
    setSaving(true)
    await onSave({ code: previewCode, cat: catCode, name: name.trim(), hierarchy_level: level, ministry, announce_date: announceDate, effective_date: effectiveDate, doc_list: docList, responsible, review_date: '' })
    setSaving(false)
    onClose()
  }

  return (
    <><div className="scrim" style={{zIndex:300}} onClick={onClose}/>
    <div className="modal" style={{zIndex:301,width:540}}>
      <div className="modal-head">
        <h3>เพิ่มกฎหมายใหม่</h3>
        <button className="close" onClick={onClose}><I n="x"/></button>
      </div>
      <div className="modal-body">
        {/* code preview */}
        <div style={{background:'var(--brand-tint)',border:'1px solid var(--brand)',borderRadius:9,padding:'10px 16px',marginBottom:8,display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:12,color:'var(--brand)',fontWeight:600}}>รหัสกฎหมายที่จะได้รับ</span>
          <span className="num" style={{fontSize:22,fontWeight:700,color:'var(--brand)',letterSpacing:-1,marginLeft:'auto'}}>{previewCode}</span>
        </div>

        <label className="form-label">หมวดกฎหมาย <span style={{color:'var(--bad)'}}>*</span></label>
        <select className="form-input" value={catCode} onChange={e=>setCatCode(e.target.value)}>
          {cats.map(c=><option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
        </select>

        <label className="form-label">ลำดับชั้น <span style={{color:'var(--bad)'}}>*</span></label>
        <select className="form-input" value={level} onChange={e=>setLevel(e.target.value)}>
          {LAW_TYPES.map(t=><option key={t.level} value={t.level}>ชั้น {t.level} — {t.label}</option>)}
        </select>

        <label className="form-label">ชื่อกฎหมาย <span style={{color:'var(--bad)'}}>*</span></label>
        <textarea className="form-input" rows={3} placeholder="ชื่อกฎหมายฉบับเต็ม…" value={name} onChange={e=>setName(e.target.value)}/>

        <label className="form-label">กระทรวง / หน่วยงาน</label>
        <input className="form-input" type="text" placeholder="เช่น กระทรวงแรงงาน" value={ministry} onChange={e=>setMinistry(e.target.value)}/>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div><label className="form-label">วันที่ประกาศ</label><input className="form-input" type="text" placeholder="เช่น 17 ม.ค. 2554" value={announceDate} onChange={e=>setAnnounceDate(e.target.value)}/></div>
          <div><label className="form-label">วันที่บังคับใช้</label><input className="form-input" type="text" placeholder="เช่น 18 ม.ค. 2554" value={effectiveDate} onChange={e=>setEffectiveDate(e.target.value)}/></div>
        </div>

        <label className="form-label">เอกสารที่เกี่ยวข้อง / ที่ใช้</label>
        <input className="form-input" type="text" placeholder="เช่น แบบ จป., รายงานการประชุม คปอ." value={docList} onChange={e=>setDocList(e.target.value)}/>

        <label className="form-label">หน่วยงานที่รับผิดชอบ</label>
        <input className="form-input" type="text" placeholder="เช่น จป.วิชาชีพ / ฝ่ายความปลอดภัย" value={responsible} onChange={e=>setResponsible(e.target.value)}/>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-primary" disabled={!valid||saving||!can('edit')} title={can('edit')?'':NO_PERM} onClick={save}>
          {saving ? 'กำลังบันทึก…' : `บันทึก ${previewCode}`}
        </button>
      </div>
    </div></>
  )
}

/* ─────────── REGISTRY + COMPLIANCE (merged view) ─────────── */
export default function RegistryCompliance({regLaws,compLaws,cats,catMap,stats,search,onOpen,onCreate,onBulk,onToggle,allLaws,months,monthYear,setMonthYear,onToggleMonth,onMarkNoNewLaws,onMarkHasNewLaws,round,setRound,roundYears,onExportF259}){
  const [mode,setMode]=usePersist('cr_registry_mode','register')
  const kpis=[
    {lab:'ข้อกำหนดทั้งหมด',   val:stats.req, accent:'#1C2431'},
    {lab:'ผ่านการประเมิน (C)', val:stats.met, accent:'#5F7A61'},
    {lab:'ยังไม่สอดคล้อง (NC)', val:stats.nc, accent:'#B4553F'},
  ]
  return <div className="view">
    <div className="rc-stats">
      {kpis.map((k,i)=>(
        <div className="stat" key={i} style={{borderTopColor:k.accent}}>
          <div className="lab">{k.lab}</div>
          <div className="val num" style={{color:k.accent}}>{k.val}</div>
        </div>
      ))}
    </div>

    <div className="seg" role="tablist" aria-label="สลับมุมมองทะเบียน / ความสอดคล้อง">
      <button role="tab" aria-selected={mode==='register'} className={'seg-btn'+(mode==='register'?' active':'')} onClick={()=>setMode('register')}>ทะเบียนกฎหมาย</button>
      <button role="tab" aria-selected={mode==='compliance'} className={'seg-btn'+(mode==='compliance'?' active':'')} onClick={()=>setMode('compliance')}>ติดตามความสอดคล้อง</button>
    </div>

    {mode==='register'
      ? <Register laws={regLaws} cats={cats} catMap={catMap} search={search} onOpen={onOpen} onCreate={onCreate} onBulk={onBulk} allLaws={allLaws}
          round={round} setRound={setRound} roundYears={roundYears} onExportF259={onExportF259}
          months={months} monthYear={monthYear} setMonthYear={setMonthYear} onToggleMonth={onToggleMonth} onMarkNoNewLaws={onMarkNoNewLaws} onMarkHasNewLaws={onMarkHasNewLaws}/>
      : <Compliance laws={compLaws} cats={cats} onOpen={onOpen} onToggle={onToggle}/>}
  </div>
}

/* ─────────────────────────── REGISTER ─────────────────────────── */
function Register({laws,cats,catMap,search,onOpen,onCreate,onBulk,allLaws,months,monthYear,setMonthYear,onToggleMonth,onMarkNoNewLaws,onMarkHasNewLaws,round={q:1,by:new Date().getFullYear()+543},setRound,roundYears,onExportF259}){
  const { can }=useAuth()
  const [cat,setCat]=usePersist('cr_reg_cat','all')
  const [act,setAct]=usePersist('cr_reg_act','all')
  const [quick,setQuick]=usePersist('cr_reg_quick',null)   // ตัวกรองด่วน: new|repealed|nc|review|cc
  const [showAdd,setShowAdd]=useState(false)
  const [sel,setSel]=useState(new Set())
  const toggleSel=id=>setSel(p=>{ const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n })
  const clearSel=()=>setSel(new Set())
  async function bulk(met){ await onBulk([...sel],met); clearSel() }
  function exportSel(){ const m=Object.fromEntries(cats.map(c=>[c.code,c])); exportLawsToExcel(laws.filter(l=>sel.has(l.id)),m); }
  const catsList=[...new Set(laws.map(l=>l.cat))].sort()
  const q=search.toLowerCase()
  // ── ตัวกรองด่วน (item 6) ──
  const gYear=round.by-543
  const inRound=s=>{ const x=new Date(s); return !isNaN(x)&&x.getFullYear()===gYear&&quarterOfDate(s)===round.q }
  const QUICK=[['new','มาใหม่รอบนี้'],['repealed','ยกเลิกรอบนี้'],['nc','NC'],['review','ใกล้ครบกำหนดทบทวน'],['cc','รหัสระบบสร้าง (CC-)']]
  const passQuick=(l,key)=>{
    switch(key){
      case 'new':      return !!(l.created_at&&inRound(l.created_at))
      case 'repealed': return l.status==='repealed'&&!!(l.repeal_date&&inRound(l.repeal_date))
      case 'nc':       return l.status==='bad'
      case 'review':   return !!(l.review_date&&daysTo(l.review_date)<=60)
      case 'cc':       return /^CC-/i.test(l.code||'')
      default:         return true
    }
  }
  const countFor=key=>(key==='repealed'?(allLaws||laws):laws).filter(l=>(cat==='all'||l.cat===cat)&&passQuick(l,key)).length
  const base = quick==='repealed' ? (allLaws||laws) : laws
  // ค้นหา (item 7): รหัส · ชื่อกฎหมาย · กระทรวง · สาระสำคัญของข้อกำหนด · ผู้รับผิดชอบ
  const matchQ=l=>!q||l.code.toLowerCase().includes(q)||l.name.toLowerCase().includes(q)||(l.ministry||'').toLowerCase().includes(q)
    ||(l.reqs||[]).some(r=>(r.text||'').toLowerCase().includes(q)||(r.responsible||'').toLowerCase().includes(q))
  const rows=base.filter(l=>(cat==='all'||l.cat===cat)
    &&(quick==='repealed'||act==='all'||(act==='active'?l.active!==false:l.active===false))
    &&passQuick(l,quick)
    &&matchQ(l))
  const grouped=useMemo(()=>{ const byCat={}; rows.forEach(l=>{ const c=l.cat; if(!byCat[c])byCat[c]={}; const t=l.hierarchy_level||5; if(!byCat[c][t])byCat[c][t]=[]; byCat[c][t].push(l) }); return byCat },[rows])
  const activeCats=catsList.filter(c=>cat==='all'||c===cat)
  return <div className="view">
    {showAdd && <AddLawModal cats={cats} allLaws={allLaws} onSave={onCreate} onClose={()=>setShowAdd(false)}/>}
    <div className="round-bar" style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap',marginBottom:14,padding:'10px 14px',background:'var(--surface)',border:'1px solid var(--line)',borderRadius:12}}>
      {setRound && <RoundSelect round={round} onChange={setRound} years={roundYears}/>}
      <span style={{fontSize:13,fontWeight:600,color:'var(--brand)'}}>{roundLabel(round.q, round.by)}</span>
    </div>
    <div style={{marginBottom:16}}>
      <MonthlyCheckPanel months={months} year={monthYear} setYear={setMonthYear} onToggle={onToggleMonth} onMarkNoNewLaws={onMarkNoNewLaws} onMarkHasNewLaws={onMarkHasNewLaws}/>
    </div>
    <div className="filterbar">
      <span style={{fontSize:12,color:'var(--ink-faint)',fontWeight:600,marginRight:2}}>ตัวกรองด่วน:</span>
      {QUICK.map(([key,lab])=>(
        <span key={key} className={'chip'+(quick===key?' active':'')} onClick={()=>setQuick(quick===key?null:key)}>{lab} ({countFor(key)})</span>
      ))}
      {quick && <span className="chip" style={{color:'var(--bad)'}} onClick={()=>setQuick(null)}>ล้าง ✕</span>}
    </div>
    <div className="filterbar">
      <span className={'chip'+(act==='all'?' active':'')} onClick={()=>setAct('all')}>ทั้งหมด</span>
      <span className={'chip'+(act==='active'?' active':'')} onClick={()=>setAct('active')}>ใช้อยู่ ({laws.filter(l=>l.active!==false).length})</span>
      <span className={'chip'+(act==='inactive'?' active':'')} onClick={()=>setAct('inactive')}>ไม่ใช้แล้ว ({laws.filter(l=>l.active===false).length})</span>
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
      {onExportF259 && <button className="btn btn-ghost" style={{padding:'6px 12px',fontSize:12.5}} title="พิมพ์/บันทึกเป็น PDF ตามฟอร์ม F-259 (สำหรับ audit ISO 45001)" onClick={onExportF259}><I n="download"/>ส่งออกแบบ F-259</button>}
      <button className="btn btn-ghost" style={{padding:'6px 12px',fontSize:12.5}} title="ส่งออกเฉพาะรายการที่กรองอยู่" onClick={()=>exportLawsToExcel(rows,Object.fromEntries(cats.map(c=>[c.code,c])))}>ส่งออกที่กรอง</button>
      <button className="btn btn-primary" style={{padding:'6px 14px',fontSize:12.5}} disabled={!can('edit')} title={can('edit')?'':NO_PERM} onClick={()=>setShowAdd(true)}><I n="plus"/>เพิ่มกฎหมาย</button>
    </div>
    {sel.size>0 && (
      <div className="bulkbar">
        <b>เลือก {sel.size} ฉบับ</b>
        <button className="btn btn-ghost" disabled={!can('edit')} title={can('edit')?'':NO_PERM} onClick={()=>bulk(true)}>ทำเครื่องหมายสอดคล้องทั้งหมด</button>
        <button className="btn btn-ghost" disabled={!can('edit')} title={can('edit')?'':NO_PERM} onClick={()=>bulk(false)}>ทำเครื่องหมายยังไม่สอดคล้อง</button>
        <button className="btn btn-ghost" onClick={exportSel}>ส่งออกที่เลือก</button>
        <button className="btn btn-ghost" style={{marginLeft:'auto'}} onClick={clearSel}>ล้างที่เลือก</button>
      </div>
    )}
    {activeCats.map(c=>(
      <div key={c} style={{marginBottom:20}}>
        <div className="hier-cat-header" style={{borderLeftColor:catMap[c]?.color||'var(--brand)'}}>
          <span style={{color:catMap[c]?.color,fontWeight:700}}>{c}</span>
          <span style={{marginLeft:8,color:'var(--ink-soft)'}}>{catMap[c]?.name}</span>
          {(()=>{ const ls=rows.filter(l=>l.cat===c); let r=0,m=0; ls.forEach(l=>l.reqs.forEach(x=>{r++;if(x.status==='met')m++})); const pc=r?Math.round(m/r*100):100;
            return <><span style={{marginLeft:'auto',fontSize:12.5,fontWeight:700,color:pc===100?'var(--ok)':pc>=70?'var(--review)':'var(--bad)'}}>สอดคล้อง {pc}%</span>
            <span style={{marginLeft:14,fontSize:12,color:'var(--ink-faint)'}}>{ls.length} ฉบับ</span></> })()}
        </div>
        {LAW_TYPES.filter(t=>grouped[c]?.[t.level]?.length).map(t=>(
          <div key={t.level} style={{marginBottom:8}}>
            <div className="hier-tier-label"><span className="tier-badge">ชั้น {t.level}</span>{t.label}</div>
            <div className="panel" style={{marginTop:0,borderTopLeftRadius:0,borderTopRightRadius:0}}>
              <div className="tablewrap"><table>
                <thead><tr><th style={{width:34}}></th><th>รหัส / ชื่อกฎหมาย</th><th>กระทรวง</th><th>วันที่ประกาศ</th><th>วันที่บังคับใช้</th><th>สถานะ</th></tr></thead>
                <tbody>{grouped[c][t.level].map(l=>(
                  <tr key={l.id} className={sel.has(l.id)?'row-sel':''} style={l.active===false?{opacity:.55}:null}>
                    <td onClick={e=>{e.stopPropagation();toggleSel(l.id)}} style={{textAlign:'center'}}><input type="checkbox" checked={sel.has(l.id)} onChange={()=>toggleSel(l.id)} onClick={e=>e.stopPropagation()}/></td>
                    <td onClick={()=>onOpen(l)}><div className="law-code" style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>{l.code}<ActiveBadge active={l.active!==false} size="sm"/>{(()=>{ const e=effectiveInfo(l); return e?<span className="pill" style={{fontSize:10,padding:'1px 7px',background:'var(--review-bg)',color:'var(--review)'}}>จะบังคับใช้ใน {e.days} วัน</span>:null })()}</div><div className="law-title">{l.name}</div></td>
                    <td onClick={()=>onOpen(l)} style={{fontSize:12.5,color:'var(--ink-soft)'}}>{l.ministry||'—'}</td>
                    <td onClick={()=>onOpen(l)} style={{fontSize:12,color:'var(--ink-soft)',whiteSpace:'nowrap'}}>{l.issue_date||'—'}</td>
                    <td onClick={()=>onOpen(l)} style={{fontSize:12,color:'var(--ink-soft)',whiteSpace:'nowrap'}}>{l.effective_date||'—'}</td>
                    <td onClick={()=>onOpen(l)}><Pill s={l.status}/></td>
                  </tr>
                ))}</tbody>
              </table></div>
            </div>
          </div>
        ))}
      </div>
    ))}
    {rows.length===0 && <div className="panel"><div style={{textAlign:'center',color:'var(--ink-faint)',padding:40}}>ไม่พบกฎหมายที่ตรงกับเงื่อนไข</div></div>}
  </div>
}

/* ─────────────────────────── COMPLIANCE ─────────────────────────── */

function MonthlyCheckPanel({ months, year, setYear, onToggle, onMarkNoNewLaws, onMarkHasNewLaws }) {
  const toBE = y => y + 543
  const getMonth = m => months.find(r=>r.year===year && r.month===m) || {checked:false}
  const checkedCount = months.filter(m=>m.year===year && m.checked).length
  const now = new Date()
  const curMonth = now.getMonth()+1
  const isViewingCurrentYear = year===now.getFullYear()
  const curRec = isViewingCurrentYear ? getMonth(curMonth) : null
  const curReviewed = !!(curRec && (curRec.status || curRec.checked))

  return (
    <div className="panel month-panel">
      <div className="panel-h">
        <h3>การตรวจสอบรายเดือน</h3>
        <div style={{display:'flex',alignItems:'center',gap:8,marginLeft:'auto'}}>
          <button className="month-yr-btn" onClick={()=>setYear(y=>y-1)}>‹</button>
          <span style={{fontSize:13,fontWeight:600,minWidth:60,textAlign:'center'}}>ปี {toBE(year)}</span>
          <button className="month-yr-btn" onClick={()=>setYear(y=>y+1)}>›</button>
        </div>
        <span className="sub">{checkedCount}/12 เดือน</span>
      </div>

      {isViewingCurrentYear && (
        <div className={'month-action-bar'+(curReviewed?(curRec.status==='has_new_laws'?' month-action-bar--active':' month-action-bar--ok'):'')}>
          {!curReviewed ? (<>
            <span className="month-action-lab">⏳ เดือน{TH_MONTHS[curMonth-1]}นี้ยังไม่ได้ตรวจสอบกฎหมายใหม่</span>
            <div className="month-action-btns">
              <button className="btn btn-ghost" onClick={onMarkHasNewLaws}>🔍 พบกฎหมายใหม่ — เริ่มกระบวนการ</button>
              <button className="btn btn-primary" onClick={onMarkNoNewLaws}>✓ ตรวจแล้ว ไม่มีกฎหมายใหม่เดือนนี้</button>
            </div>
          </>) : curRec.status==='no_new_laws' ? (
            <span className="month-action-badge month-action-badge--ok">ไม่มีกฎหมายใหม่ ✓ (ตรวจโดย {curRec.checked_by||'—'}{curRec.checked_at?' '+thDate(curRec.checked_at):''})</span>
          ) : curRec.status==='has_new_laws' ? (
            <span className="month-action-badge month-action-badge--active">🔍 พบกฎหมายใหม่ — อยู่ระหว่างดำเนินการ (ตรวจโดย {curRec.checked_by||'—'}{curRec.checked_at?' '+thDate(curRec.checked_at):''})</span>
          ) : (
            <span className="month-action-badge month-action-badge--ok">✓ ตรวจสอบแล้ว{curRec.checked_at?' — '+thDate(curRec.checked_at):''}</span>
          )}
        </div>
      )}

      <div className="month-grid">
        {TH_MONTHS.map((label, i) => {
          const m = i + 1
          const rec = getMonth(m)
          const isCurrentMonth = year===new Date().getFullYear() && m===new Date().getMonth()+1
          return (
            <button
              key={m}
              className={'month-cell'+(rec.checked?' month-checked':'')+(isCurrentMonth?' month-current':'')}
              onClick={()=>onToggle(year, m)}
              title={rec.checked && rec.checked_at ? 'ตรวจสอบแล้ว: '+new Date(rec.checked_at).toLocaleDateString('th-TH') : 'คลิกเพื่อทำเครื่องหมาย'}
            >
              <span className="month-name">{label}</span>
              <span className="month-tick">{rec.checked ? '✓' : ''}</span>
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
  const met=l.reqs.filter(r=>r.status==='met').length
  return (
    <div style={{borderBottom:'1px solid var(--line-soft)'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',paddingLeft:8}}>
        <button onClick={()=>setOpen(o=>!o)} title="กางข้อกำหนด" style={{border:'none',background:'none',cursor:'pointer',color:'var(--ink-faint)',width:18}}>{open?'▾':'▸'}</button>
        <span className="law-code">{l.code}</span>
        <span style={{fontSize:13,flex:1,cursor:'pointer'}} onClick={()=>setOpen(o=>!o)}>{l.name.slice(0,60)}{l.name.length>60?'…':''}</span>
        <span style={{fontSize:12,color:'var(--ink-faint)'}} className="num">{met}/{l.reqs.length} ข้อ</span>
        <Pill s={l.status}/>
        <button className="btn btn-ghost" style={{padding:'2px 9px',fontSize:11}} onClick={()=>onOpen(l)}>เปิด</button>
      </div>
      {open && (
        <div style={{paddingLeft:34,paddingBottom:10}}>
          {l.reqs.length===0 && <div style={{fontSize:12,color:'var(--ink-faint)',padding:'4px 0'}}>ไม่มีข้อกำหนด</div>}
          {l.reqs.map(r=>(
            <div key={r.id} style={{display:'flex',gap:9,padding:'6px 0',alignItems:'flex-start'}}>
              <button onClick={()=>onToggle(l,r)} disabled={!can('edit')} title={can('edit')?'สลับ สอดคล้อง/ยังไม่สอดคล้อง':NO_PERM}
                style={{flexShrink:0,width:22,height:22,borderRadius:5,border:'none',cursor:can('edit')?'pointer':'not-allowed',fontSize:11,fontWeight:700,fontFamily:'var(--mono)',
                  background:r.status==='met'?'var(--ok)':'var(--grayfill)',color:r.status==='met'?'#fff':'var(--ink-faint)'}}>{r.status==='met'?'C':'·'}</button>
              <span style={{fontSize:12.5,flex:1,lineHeight:1.5,color:r.status==='met'?'var(--ink-soft)':'var(--ink)'}}>{r.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Compliance({laws,cats,onOpen,onToggle}){
  const byCat={}; laws.forEach(l=>{(byCat[l.cat]=byCat[l.cat]||[]).push(l)})
  return <div className="view">
    <div className="panel" style={{marginTop:0}}><div className="panel-h"><h3>สถานะรายหมวด / ลำดับชั้นกฎหมาย</h3><span className="sub" style={{marginLeft:'auto'}}>คลิกที่กฎหมายเพื่อดูข้อกำหนดและแก้ไข</span></div>
      <div className="panel-b">
        {cats.filter(c=>byCat[c.code]).map(c=>{
          let r=0,m=0; byCat[c.code].forEach(l=>l.reqs.forEach(x=>{r++;if(x.status==='met')m++}))
          const p=r?Math.round(m/r*100):100
          const byTier={}; byCat[c.code].forEach(l=>{ const t=l.hierarchy_level||5; (byTier[t]=byTier[t]||[]).push(l) })
          return <details key={c.code} style={{marginBottom:12}} open={c.code==='LA'}>
            <summary style={{cursor:'pointer',display:'flex',alignItems:'center',gap:12,padding:'12px 14px',background:'var(--surface-2)',border:'1px solid var(--line)',borderRadius:8,listStyle:'none'}}>
              <span style={{width:8,height:8,borderRadius:2,background:c.color,flexShrink:0}}/>
              <b style={{}}>{c.code}</b><span style={{flex:1}}>{c.name}</span>
              <span className="num" style={{color:c.color,fontWeight:700}}>{p}%</span>
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

