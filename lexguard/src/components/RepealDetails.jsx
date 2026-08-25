// P22 ขั้นที่ 6 · รายละเอียดการยกเลิกกฎหมาย — 4 อย่างที่ผู้ประเมินขอมา
//
// ข้อเสนอแนะข้อ 6: "ต้องการเหตุผลการยกเลิกกฎหมายและฉบับที่ยกเลิก"
//
// ═══ ปัญหาเดิม ═══
// ข้อมูลทั้ง 4 อย่างมีอยู่ในฐานครบแล้วตั้งแต่ migration 046 และทั้ง 10 ฉบับผ่านการยืนยัน
// โดยเจ้าหน้าที่แล้ว แต่หน้าจอ "กฎหมายที่ยกเลิก" แสดงแค่ 4 ช่อง (วันที่ · รหัสที่แทน ·
// เลขอ้างอิง · เหตุผล) — ชื่อเต็มของฉบับที่ยกเลิก ลิงก์ราชกิจจาฯ ขอบเขตการยกเลิก
// และผลกระทบต่อข้อกำหนดที่เคยประเมินไว้ ไม่เคยถูกแสดงเลย
//
// ═══ กติกา ═══
// คอมโพเนนต์นี้ "แสดงผล" อย่างเดียว ไม่มีคำสั่งเขียนลงฐานข้อมูล
// โดยเฉพาะส่วนที่ 4 (ผลกระทบ) — ห้ามเปลี่ยนสถานะข้อกำหนดใดโดยอัตโนมัติ
// ข้อมูลที่ยังไม่ผ่านการยืนยันต้องขึ้นว่า "รอตรวจสอบ" ไม่ใช่เว้นว่างเงียบๆ
import { LAW_STATUS, REQ_STATUS, REPEAL_CONFIDENCE } from '../lib/supabase.js'
import { reqKind, thDate } from '../lib/ui.jsx'

// ค่าว่างต้องอ่านออกว่า "ยังไม่มีข้อมูล" ไม่ใช่ขีดกลางลอยๆ ที่ตีความได้หลายแบบ
const PENDING = <span style={{ color: 'var(--warn)', fontWeight: 500 }}>รอตรวจสอบ</span>
const val = (v, fallback = PENDING) => (v !== null && v !== undefined && String(v).trim() !== '') ? v : fallback

function Row({ label, children }) {
  return (<>
    <dt>{label}</dt>
    <dd style={{ fontSize: 12.5, lineHeight: 1.7 }}>{children}</dd>
  </>)
}

export default function RepealDetails({ law, replacementLaw, compact = false }) {
  const st = law.law_status || (law.status === 'repealed' ? 'repealed' : 'in_force')
  const verified = !!law.repeal_verified_by
  const reqs = law.reqs || []

  // (4) ผลกระทบต่อข้อกำหนดที่เคยประเมินไว้ — นับอย่างเดียว ไม่แตะสถานะใด
  const byKind = reqs.reduce((m, r) => { const k = reqKind(r); m[k] = (m[k] || 0) + 1; return m }, {})
  const partial = st === 'partially_repealed' || st === 'amended'

  return (
    <div>
      {!verified && (
        <div style={{ marginBottom: 12, padding: '9px 12px', borderRadius: 7, background: 'var(--warn-bg)',
          color: 'var(--warn)', fontSize: 12.5, lineHeight: 1.6 }}>
          ข้อมูลการยกเลิกนี้<b>ยังไม่ผ่านการยืนยันโดยเจ้าหน้าที่</b> — ยังไม่ถือเป็นข้อมูลทางการของทะเบียน
        </div>
      )}

      <dl className="kv">
        {/* (1) ถูกยกเลิกโดยกฎหมายฉบับใด */}
        <Row label="ถูกยกเลิกโดย">
          {val(law.repealed_by_title)}
          {law.repealed_by_authority && (
            <div style={{ color: 'var(--ink-faint)', fontSize: 12 }}>อ้างอิงราชกิจจาฯ: {law.repealed_by_authority}</div>
          )}
          {law.repeal_source_url
            ? <div style={{ marginTop: 3 }}>
                <a href={law.repeal_source_url} target="_blank" rel="noreferrer"
                  style={{ color: 'var(--brand)', fontSize: 12, wordBreak: 'break-all' }}>เปิดตัวบทที่อ้างอิง ↗</a>
              </div>
            : <div style={{ marginTop: 3, fontSize: 12 }}>ลิงก์ราชกิจจาฯ: {PENDING}</div>}
        </Row>

        {/* (2) ยกเลิกทั้งฉบับหรือบางมาตรา + สาระของการยกเลิก */}
        <Row label="ขอบเขตการยกเลิก">
          <span className={'pill ' + (LAW_STATUS[st]?.cls || 'p-uncertain')} style={{ fontSize: 10.5 }}>
            {LAW_STATUS[st]?.label || st}
          </span>
          {law.repeal_scope && <div style={{ marginTop: 4 }}>{law.repeal_scope}</div>}
          {!law.repeal_scope && <div style={{ marginTop: 4 }}>{PENDING}</div>}
        </Row>
        <Row label="สาระของการยกเลิก">{val(law.repeal_reason)}</Row>

        {/* (3) วันที่มีผล */}
        <Row label="วันที่มีผล">
          {law.repeal_date
            ? <span style={{ color: 'var(--bad)', fontWeight: 600 }}>{thDate(law.repeal_date)}</span>
            : PENDING}
        </Row>

        <Row label="ฉบับใหม่ที่ใช้แทน">
          {(law.replacement_law_title || law.replaced_by_code)
            ? <>
                {law.replacement_law_title || ''}
                {law.replaced_by_code && <span className="num" style={{ color: 'var(--brand)', fontWeight: 600 }}>
                  {law.replacement_law_title ? ' · ' : ''}{law.replaced_by_code}
                </span>}
              </>
            : <span style={{ color: 'var(--ink-faint)' }}>ไม่มีฉบับใหม่ใช้แทน (ตามที่ตรวจสอบ)</span>}
        </Row>

        {!compact && law.repeal_confidence && (
          <Row label="ความมั่นใจของผลค้น">{REPEAL_CONFIDENCE[law.repeal_confidence] || law.repeal_confidence}</Row>
        )}
        {!compact && (
          <Row label="ตรวจสอบ / ยืนยัน">
            {law.repeal_checked_at ? `ตรวจเมื่อ ${thDate(law.repeal_checked_at)}` : 'ยังไม่เคยตรวจอัตโนมัติ'}
            <div style={{ color: verified ? 'var(--ok)' : 'var(--warn)' }}>
              {verified
                ? `ยืนยันโดย ${law.repeal_verified_by}${law.repeal_verified_at ? ' · ' + thDate(law.repeal_verified_at) : ''}`
                : 'ยังไม่มีเจ้าหน้าที่ยืนยัน'}
            </div>
          </Row>
        )}
      </dl>

      {/* (4) ผลกระทบต่อข้อกำหนดที่เคยประเมินไว้ */}
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-faint)', marginBottom: 6 }}>
          ผลกระทบต่อข้อกำหนดที่เคยประเมินไว้
        </div>
        {reqs.length === 0 ? (
          <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', lineHeight: 1.7, margin: 0 }}>
            ฉบับนี้ไม่มีข้อกำหนดบันทึกไว้ในทะเบียน จึงไม่มีผลประเมินใดได้รับผลกระทบ
          </p>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 8 }}>
              {Object.entries(byKind).map(([k, n]) => (
                <span key={k} className="meta-chip">
                  {(REQ_STATUS[k]?.label) || 'ยังไม่ประเมิน'} {n} ข้อ
                </span>
              ))}
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.75, margin: 0 }}>
              {partial
                ? <>ฉบับนี้ถูกยกเลิก<b>บางส่วน</b> — ข้อกำหนดที่ยังไม่ถูกยกเลิก<b>ยังต้องปฏิบัติตามอยู่</b>
                   กรุณาเทียบขอบเขตการยกเลิกข้างบนกับข้อกำหนดรายข้อ แล้วปรับสถานะเฉพาะข้อที่ตกไปด้วยตนเอง</>
                : <>ข้อกำหนดทั้ง {reqs.length} ข้อของฉบับนี้<b>ตกไปพร้อมกับการยกเลิก</b> และไม่ถูกนับในอัตราความสอดคล้องอีกต่อไป</>}
            </p>
            {(law.replacement_law_title || law.replaced_by_code) && (
              <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.75, marginTop: 8, marginBottom: 0 }}>
                หน้าที่ที่เคยอยู่ในฉบับนี้ถูกแทนที่ด้วย <b>{law.replaced_by_code || law.replacement_law_title}</b>
                {replacementLaw
                  ? <> ซึ่งมีข้อกำหนดในทะเบียนแล้ว {(replacementLaw.reqs || []).length} ข้อ — กรุณาตรวจว่าครอบคลุมเรื่องเดิมครบหรือไม่</>
                  : <> ซึ่ง<b>ยังไม่ได้นำเข้าทะเบียน</b> — ควรนำเข้าและประเมินก่อนรอบตรวจถัดไป</>}
              </p>
            )}
            <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', lineHeight: 1.6, marginTop: 8, marginBottom: 0 }}>
              ระบบ<b>ไม่เปลี่ยนสถานะข้อกำหนดใดให้อัตโนมัติ</b> — ผลประเมินเดิมถูกเก็บไว้ตามที่บันทึกไว้
              เพื่อให้ตรวจย้อนหลังได้ว่าองค์กรปฏิบัติอย่างไรในช่วงที่กฎหมายยังบังคับใช้
            </p>
          </>
        )}
      </div>
    </div>
  )
}
