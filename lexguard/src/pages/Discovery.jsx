// P10 · Task 4 — หน้าค้นหาและสรุปกฎหมาย (AI).
// ค้นหากฎหมายใหม่จากราชกิจจาฯ + Shawpat → เลือก → นำเข้า → สรุป (AI) → แก้ไข → Save.
// รายการที่นำเข้าเก็บใน lg_ai_discovered_laws และเป็น source ให้ Workflow A (เพิ่มกฎหมาย).
import { useState } from 'react'
import { saveDiscoveredLaw, deleteDiscoveredLaw } from '../lib/supabase.js'
import { searchNewLaws, summarizeLaw } from '../lib/aiLaw.js'
import { I } from '../components/icons.jsx'
import { thDate } from '../lib/ui.jsx'
import { useAuth, NO_PERM, currentUserName } from '../lib/auth.js'
import { toast } from '../lib/toast.js'
import { confirmDialog } from '../lib/confirm.js'

// แปลง key_points ของผลสรุป AI → บรรทัดข้อความ (ใช้กับฟอร์มแก้ไข + Workflow A)
function keyPointsToLines(s) {
  const kp = Array.isArray(s?.key_points) ? s.key_points : []
  return kp.map(k => `${k.clause ? k.clause + ': ' : ''}${k.action_required || k.content || ''}`.trim()).filter(Boolean)
}

/* Editable summary form (ผลสรุป AI แก้ไขได้) */
function EditModal({ row, onClose, onSaved }) {
  const [ministry, setMinistry] = useState(row.ministry || '')
  const [announced, setAnnounced] = useState(row.announced_date || '')
  const [effective, setEffective] = useState(row.effective_date || '')
  const [docs, setDocs] = useState((row.related_docs || []).join('\n'))
  const [summary, setSummary] = useState((Array.isArray(row.summary) ? row.summary : []).join('\n'))
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await saveDiscoveredLaw({
        ...row,
        ministry, announced_date: announced || null, effective_date: effective || null,
        related_docs: docs.split('\n').map(s => s.trim()).filter(Boolean),
        summary: summary.split('\n').map(s => s.trim()).filter(Boolean),
        status: row.status === 'registered' ? 'registered' : 'imported',
      })
      toast('บันทึกผลสรุปแล้ว', 'success'); onSaved(); onClose()
    } catch (e) { toast('บันทึกไม่สำเร็จ: ' + e.message) }
    setSaving(false)
  }

  return (<>
    <div className="scrim" style={{zIndex:300}} onClick={onClose}/>
    <div className="modal" style={{zIndex:301,width:620,maxHeight:'88vh',overflow:'auto'}}>
      <div className="modal-head"><h3>แก้ไขผลสรุป · {(row.law_name||'').slice(0,50)}</h3><button className="close" onClick={onClose}><I n="x"/></button></div>
      <div className="modal-body">
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:12}}>
          <div><label className="form-label">กระทรวง</label><input className="form-input" value={ministry} onChange={e=>setMinistry(e.target.value)}/></div>
          <div><label className="form-label">วันที่ประกาศ</label><input className="form-input" type="date" value={announced} onChange={e=>setAnnounced(e.target.value)}/></div>
          <div><label className="form-label">วันบังคับใช้</label><input className="form-input" type="date" value={effective} onChange={e=>setEffective(e.target.value)}/></div>
        </div>
        <label className="form-label">สาระสำคัญ (1 ข้อ ต่อบรรทัด)</label>
        <textarea className="form-input" rows={8} value={summary} onChange={e=>setSummary(e.target.value)} placeholder="กด “สรุป (AI)” เพื่อให้ระบบเติมให้ หรือพิมพ์เอง…"/>
        <label className="form-label">เอกสารที่เกี่ยวข้อง (1 รายการ ต่อบรรทัด)</label>
        <textarea className="form-input" rows={3} value={docs} onChange={e=>setDocs(e.target.value)}/>
      </div>
      <div className="modal-foot">
        <button className="btn btn-ghost" onClick={onClose}>ยกเลิก</button>
        <button className="btn btn-primary" disabled={saving} onClick={save}>{saving?'กำลังบันทึก…':'Save'}</button>
      </div>
    </div>
  </>)
}

export default function Discovery({ discovered = [], onReload, searchLog = [], onSearchLogged }) {
  const { can } = useAuth()
  const [tab, setTab] = useState('search')       // search | log
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState(null)   // null=ยังไม่ค้น, []=ไม่พบ
  const [sel, setSel] = useState(new Set())
  const [busy, setBusy] = useState(false)
  const [summId, setSummId] = useState(null)      // id ที่กำลังสรุป
  const [editRow, setEditRow] = useState(null)

  const imported = discovered.filter(d => d.status !== 'deleted')
  const lastSearch = searchLog[0] || null   // เรียงใหม่→เก่าอยู่แล้ว

  async function search() {
    setSearching(true); setResults(null)
    try {
      // เรียก Edge Function `ai-law-search` (Task 4). ฟังก์ชันบันทึก lg_search_log ให้เอง
      // (Task 12 · service_role) รวมกรณีไม่พบกฎหมายใหม่ — ฝั่ง client ไม่ต้อง log ซ้ำ
      const res = await searchNewLaws({ searchedBy: currentUserName() })
      const list = (res.laws || []).map(l => ({
        law_name: l.law_name, source: l.source, source_url: l.source_url || '',
        ministry: l.ministry, category_guess: l.category_guess,
        announced_date: l.announced_date, effective_date: l.effective_date,
        summary: l.short_note || '',
      }))
      setResults(list); setSel(new Set())
      onSearchLogged && onSearchLogged()
    }
    catch (e) { toast('ค้นหาไม่สำเร็จ: ' + e.message); setResults([]) }
    setSearching(false)
  }

  function toggle(i) { setSel(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n }) }

  async function importSelected() {
    if (!sel.size) return
    setBusy(true)
    try {
      for (const i of sel) { const it = results[i]
        await saveDiscoveredLaw({
          law_name: it.law_name, source: it.source || 'ratchakitcha', source_url: it.source_url || null,
          summary: it.summary ? [it.summary] : [], announced_date: it.announced_date || null,
          effective_date: it.effective_date || null, ministry: it.ministry || null,
          related_docs: [], status: 'imported', searched_at: new Date().toISOString(),
        })
      }
      toast(`นำเข้า ${sel.size} รายการแล้ว`, 'success')
      setResults(prev => prev.filter((_, i) => !sel.has(i))); setSel(new Set()); onReload && onReload()
    } catch (e) { toast('นำเข้าไม่สำเร็จ: ' + e.message) }
    setBusy(false)
  }

  async function summarize(row) {
    setSummId(row.id)
    try {
      const s = await summarizeLaw({ lawName: row.law_name, sourceUrl: row.source_url || '' })
      const lines = keyPointsToLines(s)
      await saveDiscoveredLaw({ ...row,
        ministry: s.ministry || row.ministry, announced_date: s.announced_date || row.announced_date,
        effective_date: s.effective_date || row.effective_date,
        related_docs: (s.related_docs && s.related_docs.length) ? s.related_docs : row.related_docs,
        summary: lines.length ? lines : row.summary, status: 'imported' })
      toast('สรุปด้วย AI แล้ว — ตรวจ/แก้ไขได้', 'success'); onReload && onReload()
    } catch (e) { toast('สรุปไม่สำเร็จ: ' + e.message) }
    setSummId(null)
  }

  async function remove(row) {
    if (!(await confirmDialog(`ลบ "${(row.law_name||'').slice(0,40)}" ออกจากรายการ?`, { danger: true }))) return
    try { await deleteDiscoveredLaw(row.id); onReload && onReload(); toast('ลบแล้ว', 'success') }
    catch (e) { toast('ลบไม่สำเร็จ: ' + e.message) }
  }

  return (
    <div className="view">
      <div className="seg" style={{marginBottom:14}}>
        <button className={'seg-btn'+(tab==='search'?' active':'')} onClick={()=>setTab('search')}>ค้นหา & นำเข้า</button>
        <button className={'seg-btn'+(tab==='log'?' active':'')} onClick={()=>setTab('log')}>ประวัติการค้นหา ({searchLog.length})</button>
      </div>

      {tab==='log' && (
        <div className="panel">
          <div className="panel-h"><h3>ประวัติการค้นหากฎหมาย</h3>
            <span className="sub" style={{marginLeft:'auto'}}>หลักฐานการติดตามกฎหมายสม่ำเสมอ (ISO 45001 ข้อ 6.1.3)</span></div>
          <div className="tablewrap"><table>
            <thead><tr><th>วันเวลา</th><th>ผู้ค้นหา</th><th>แหล่ง</th><th style={{textAlign:'center'}}>ผลลัพธ์</th><th>รายการที่พบ</th></tr></thead>
            <tbody>
              {searchLog.length===0 && <tr><td colSpan="5" style={{textAlign:'center',color:'var(--ink-faint)',padding:30}}>ยังไม่มีประวัติการค้นหา</td></tr>}
              {searchLog.map(s=>(
                <tr key={s.id}>
                  <td style={{whiteSpace:'nowrap',fontSize:12.5}}>{thDate(s.searched_at)} {new Date(s.searched_at).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})}</td>
                  <td style={{fontSize:12.5}}>{s.searched_by}</td>
                  <td style={{fontSize:12}}>{(s.sources||[]).join(', ')||'—'}</td>
                  <td style={{textAlign:'center'}}>{s.no_new_laws
                    ? <span className="pill" style={{fontSize:11,background:'var(--grayfill)',color:'var(--ink-soft)'}}>ไม่มีใหม่</span>
                    : <span className="pill p-ok" style={{fontSize:11}}>{s.results_count} รายการ</span>}</td>
                  <td style={{fontSize:12,color:'var(--ink-soft)'}}>{(()=>{ const rs=s.result_summary
                    const names = Array.isArray(rs) ? rs : (Array.isArray(rs?.laws) ? rs.laws.map(x=>typeof x==='string'?x:(x.law_name||'')) : [])
                    return names.length ? names.slice(0,3).join(' · ')+(names.length>3?' …':'') : '—' })()}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}

      {tab==='search' && (<>
      {/* ── ค้นหา ── */}
      <div className="panel" style={{padding:'16px 18px'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{flex:1}}>
            <h3 style={{margin:0,fontSize:15}}>ค้นหากฎหมายใหม่ประจำเดือน</h3>
            <p style={{margin:'2px 0 0',fontSize:12.5,color:'var(--ink-faint)'}}>ค้นจากราชกิจจานุเบกษา และ Shawpat ด้วย AI</p>
          </div>
          <button className="btn btn-primary" disabled={searching||!can('edit')} title={can('edit')?'':NO_PERM} onClick={search}>
            {searching ? <><span className="spin" style={{width:14,height:14,display:'inline-block',marginRight:6}}/>กำลังค้นหา…</> : <><I n="search"/>ค้นหากฎหมาย</>}
          </button>
        </div>

        {!searching && lastSearch && <div style={{marginTop:10,fontSize:12,color:'var(--ink-faint)'}}>
          ค้นหาล่าสุด: {thDate(lastSearch.searched_at)} {new Date(lastSearch.searched_at).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})} โดย {lastSearch.searched_by}
          {lastSearch.no_new_laws ? ' · ไม่พบกฎหมายใหม่' : ' · พบ '+lastSearch.results_count+' รายการ'}
        </div>}

        {searching && <div style={{marginTop:14,fontSize:13,color:'var(--brand)'}}>⏳ กำลังดึงข้อมูลจากแหล่งกฎหมายและวิเคราะห์ด้วย AI…</div>}

        {results && !searching && (
          <div style={{marginTop:14}}>
            {results.length===0 && <div style={{fontSize:13,color:'var(--ink-faint)',padding:'8px 0'}}>
              ไม่มีกฎหมายที่ออกมาล่าสุด{lastSearch?` — ค้นหาล่าสุด: ${thDate(lastSearch.searched_at)} โดย ${lastSearch.searched_by}`:''}
            </div>}
            {results.length>0 && (<>
              <div style={{display:'flex',alignItems:'center',marginBottom:8}}>
                <span style={{fontSize:12.5,color:'var(--ink-soft)'}}>พบ {results.length} รายการ · เลือกที่ต้องการแล้วกดนำเข้า</span>
                <button className="btn btn-primary" style={{marginLeft:'auto',padding:'5px 12px',fontSize:12.5}} disabled={!sel.size||busy} onClick={importSelected}>
                  {busy?'กำลังนำเข้า…':`นำเข้า (${sel.size})`}
                </button>
              </div>
              {results.map((it,i)=>(
                <div key={i} style={{display:'flex',gap:10,alignItems:'flex-start',padding:'9px 10px',border:'1px solid '+(sel.has(i)?'var(--brand)':'var(--line)'),borderRadius:8,marginBottom:6,cursor:'pointer',background:sel.has(i)?'var(--brand-tint)':'transparent'}} onClick={()=>toggle(i)}>
                  <input type="checkbox" checked={sel.has(i)} onChange={()=>toggle(i)} style={{marginTop:3}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600}}>{it.law_name}</div>
                    <div style={{fontSize:11.5,color:'var(--ink-faint)'}}>{it.ministry||'—'}{it.category_guess?' · '+it.category_guess:''}{it.announced_date?' · ประกาศ '+it.announced_date:''} · {it.source}</div>
                    {it.summary && <div style={{fontSize:12,color:'var(--ink-soft)',marginTop:2}}>{it.summary}</div>}
                  </div>
                  {it.source_url && <a href={it.source_url} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()} style={{fontSize:14,textDecoration:'none'}}>📄</a>}
                </div>
              ))}
            </>)}
          </div>
        )}
      </div>

      {/* ── รายการที่นำเข้าแล้ว (source ของ Workflow A) ── */}
      <div className="panel" style={{marginTop:16}}>
        <div className="panel-h"><h3>กฎหมายที่นำเข้าแล้ว ({imported.length})</h3>
          <span className="sub" style={{marginLeft:'auto'}}>ใช้เป็นตัวเลือกใน “เพิ่มกฎหมาย” (Process Tracker)</span></div>
        <div className="panel-b">
          {imported.length===0 && <div style={{textAlign:'center',color:'var(--ink-faint)',padding:28,fontSize:13}}>ยังไม่มีรายการ — กด “ค้นหากฎหมาย” แล้วนำเข้า</div>}
          {imported.map(d=>{
            const summ = Array.isArray(d.summary) ? d.summary : []
            const registered = d.status === 'registered'
            return (
              <div key={d.id} style={{borderBottom:'1px solid var(--line-soft)',padding:'10px 0'}}>
                <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13.5,fontWeight:600}}>{d.law_name}
                      {registered && <span className="pill p-ok" style={{marginLeft:8,fontSize:10.5}}>เข้าทะเบียนแล้ว</span>}</div>
                    <div style={{fontSize:11.5,color:'var(--ink-faint)',marginTop:2}}>
                      {d.ministry||'—'}{d.announced_date?' · ประกาศ '+thDate(d.announced_date):''}{d.effective_date?' · บังคับใช้ '+thDate(d.effective_date):''} · {d.source||'manual'}</div>
                    {summ.length>0 && <div style={{fontSize:12,color:'var(--ink-soft)',marginTop:4}}>สาระสำคัญ {summ.length} ข้อ — {summ[0].slice(0,80)}{summ[0].length>80?'…':''}</div>}
                  </div>
                  {!registered && <div style={{display:'flex',gap:6,flexShrink:0}}>
                    <button className="btn btn-ghost" style={{padding:'4px 10px',fontSize:11.5}} disabled={summId===d.id||!can('edit')} onClick={()=>summarize(d)}>
                      {summId===d.id?'กำลังสรุป…':<><I n="spark"/>สรุป (AI)</>}</button>
                    <button className="btn btn-ghost" style={{padding:'4px 10px',fontSize:11.5}} disabled={!can('edit')} onClick={()=>setEditRow(d)}>แก้ไข</button>
                    <button className="btn btn-ghost" style={{padding:'4px 10px',fontSize:11.5}} disabled={!can('edit')} onClick={()=>remove(d)}>ลบ</button>
                  </div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      </>)}

      {editRow && <EditModal row={editRow} onClose={()=>setEditRow(null)} onSaved={onReload}/>}
    </div>
  )
}
