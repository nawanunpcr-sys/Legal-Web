import { I } from './icons.jsx'
const STATUSP = { ok:'p-ok', bad:'p-bad' }
const STATUSL = { ok:'สอดคล้อง', bad:'ยังไม่สอดคล้อง' }

export default function LawDrawer({ law, catName, onClose, onToggle, prog, thDate }){
  const p = prog(law)
  const summary = law.reqs.slice(0,3).map(r=>r.text).join(' ').slice(0,280)
  return (
    <>
      <div className="scrim" onClick={onClose}/>
      <div className="drawer">
        <div className="dr-head">
          <button className="close" onClick={onClose}><I n="close"/></button>
          <div className="code">{law.code} · หมวด {law.cat} — {catName[law.cat]}</div>
          <h2>{law.name}</h2>
          <div className="meta">
            <span><I n="scale" style={{width:13,height:13}}/> {law.ministry||'—'}</span>
            {law.issue_date && <span><I n="clock" style={{width:13,height:13}}/> {law.issue_date}</span>}
            <span><I n="list" style={{width:13,height:13}}/> {law.reqs.length} ข้อกำหนด</span>
          </div>
        </div>
        <div className="dr-body">
          <div className="sec">
            <div className="sec-t"><I n="spark"/> สรุปสาระสำคัญ (สรุปโดย AI)</div>
            <div className="ai-box">
              <span className="ai-tag"><I n="spark"/> AI สรุปจากตัวบท</span>
              <p>{summary}… <br/><br/>กฎหมายฉบับนี้กำหนดข้อปฏิบัติรวม <b>{law.reqs.length} ข้อ</b> ปฏิบัติสอดคล้องแล้ว <b>{law.reqs.filter(r=>r.status==='met').length} ข้อ</b> ({p}%) ออกโดย {law.ministry||'—'}</p>
            </div>
          </div>
          <div className="sec">
            <div className="sec-t"><I n="check"/> ข้อกำหนด & การประเมิน
              <span style={{marginLeft:'auto',fontFamily:'Bai Jamjuree',color:p===100?'var(--ok)':'var(--bad)'}}>{p}%</span></div>
            <p style={{fontSize:11.5,color:'var(--ink-faint)',marginBottom:10}}>คลิกกล่องสถานะเพื่อสลับ สอดคล้อง ↔ ยังไม่สอดคล้อง (บันทึกอัตโนมัติ)</p>
            {law.reqs.map(r=>(
              <div className={'req '+r.status} key={r.id}>
                <button className="ck" onClick={()=>onToggle(law,r)} title="สลับสถานะ">
                  <I n={r.status==='met'?'check':'x'}/>
                </button>
                <div style={{flex:1}}>
                  <div className="rt">{r.text}</div>
                  <div className="rmeta">
                    {r.responsible && <span className="b">👤 {r.responsible}</span>}
                    {r.frequency && <span className="b">🔄 {r.frequency}</span>}
                    {r.documents && <span className="b">📄 {r.documents.slice(0,50)}</span>}
                  </div>
                  {r.status==='unmet' && r.note && <div className="note">⚠ {r.note}</div>}
                </div>
              </div>
            ))}
            {law.reqs.length===0 && <p style={{fontSize:13,color:'var(--ink-faint)'}}>ยังไม่มีข้อกำหนดบันทึกไว้</p>}
          </div>
          <div className="sec">
            <div className="sec-t"><I n="info"/> ข้อมูลทะเบียน</div>
            <div className="panel" style={{padding:18}}>
              <dl className="kv">
                <dt>รหัสกฎหมาย</dt><dd className="num">{law.code}</dd>
                <dt>หมวด</dt><dd>{law.cat} — {catName[law.cat]}</dd>
                <dt>กระทรวง/หน่วยงาน</dt><dd>{law.ministry||'—'}</dd>
                {law.issue_date && <><dt>วันที่ประกาศ/บังคับใช้</dt><dd>{law.issue_date}</dd></>}
                <dt>กำหนดทบทวนถัดไป</dt><dd className="num">{thDate(law.review_date)}</dd>
                <dt>สถานะ</dt><dd><span className={'pill '+STATUSP[law.status]}>{STATUSL[law.status]}</span></dd>
              </dl>
            </div>
          </div>
        </div>
        <div className="dr-foot">
          <button className="btn btn-ghost" style={{flex:1}} onClick={onClose}>ปิด</button>
          <button className="btn btn-primary" style={{flex:1}} onClick={()=>window.print()}><I n="download"/> พิมพ์/บันทึก PDF</button>
        </div>
      </div>
    </>
  )
}
