// ── P22 ขั้นที่ 4 · การคำนวณช่องว่าง (Gap Analysis) ───────────────────────────
//
// ข้อเสนอแนะของผู้ประเมินข้อ 4: "ต้องการ Gap Analysis พร้อมข้อเสนอแนะ
// และความพร้อมสำหรับการตรวจประเมินตาม ISO 45001"
//
// ═══ ทำไมต้องแยกไฟล์ ═══
// ตัวเลขบนหน้ารายงาน ไฟล์ PDF และไฟล์ Excel ต้องมาจากสูตรเดียวกันทุกตัว
// ถ้าคำนวณซ้ำในสามที่ วันหนึ่งมันจะไม่ตรงกัน แล้วผู้ตรวจจะเจอเอกสารสองฉบับที่ขัดกันเอง
// ซึ่งเสียหายกว่าการไม่มีรายงานเลย
//
// ═══ กติกา ═══
// ไฟล์นี้อ่านอย่างเดียว ไม่มีคำสั่งเขียนลงฐานข้อมูลแม้แต่บรรทัดเดียว
// อัตราความสอดคล้องใช้สูตรเดียวกับ sumReqStats ใน ui.jsx (ฐาน C + NC ตาม migration 044)

import { reqKind } from './supabase.js'

// ── นิยามกลุ่มช่องว่าง 5 กลุ่ม เรียงตามความเสี่ยง ────────────────────────────
//
// ⚠ กลุ่ม 4 และ 5 ต่างจากที่แผนเขียนไว้ เพราะนิยามเดิมให้ผลว่างถาวรทั้งคู่:
//   · กลุ่ม 4 เดิม "evaluated_at is null" — migration 044 เติมค่าให้ครบ 575 แถวไปแล้ว
//     จึงเหลือ 0 แถวตลอดกาล · เปลี่ยนเป็น "ไม่มีผู้ประเมินบันทึกไว้ (evaluated_by ว่าง)"
//     ซึ่งตรงกับความจริงมากกว่า และตรงกับที่ขั้นที่ 3 ใช้
//   · กลุ่ม 5 เดิม "Ack/ไม่เกี่ยวข้อง ที่ไม่ระบุเหตุผล" — CHECK ใน migration 044
//     บังคับเหตุผลไว้แล้วตั้งแต่ชั้นฐานข้อมูล จึงเป็นไปไม่ได้ที่จะมีแถวแบบนั้น
//     เปลี่ยนเป็น "ยังไม่ผ่านการคัดกรองความเกี่ยวข้อง" ซึ่งเป็นช่องว่างจริงที่เหลืออยู่
//     (ผู้ตรวจ ISO 45001 ข้อ 6.1.3 ถามว่าองค์กรชี้บ่งกฎหมายที่ใช้บังคับครบหรือยัง)
export const GAP_GROUPS = [
  { key: 'nc_no_plan',   title: 'NC ที่ยังไม่มีแผนปรับปรุง',
    why: 'ตรวจพบว่าไม่สอดคล้องแล้ว แต่ยังไม่มีใครรับผิดชอบแก้ไข — ความเสี่ยงสูงสุด',
    todo: 'เปิดแผนปรับปรุง ระบุผู้รับผิดชอบและวันแล้วเสร็จ' },
  { key: 'plan_overdue', title: 'NC ที่มีแผนแล้วแต่เลยกำหนด',
    why: 'มีแผนแต่ไม่ปิดตามกำหนด — ผู้ตรวจจะถามหาสาเหตุและมาตรการชั่วคราว',
    todo: 'ปิดแผน หรือทบทวนกำหนดเวลาพร้อมบันทึกเหตุผล' },
  { key: 'met_no_evidence', title: 'สอดคล้อง (C) แต่ไม่มีหลักฐานแนบ',
    why: 'อ้างว่าปฏิบัติแล้วแต่พิสูจน์ไม่ได้ — ความเสี่ยงที่ซ่อนอยู่ ตอบผู้ตรวจไม่ได้',
    todo: 'แนบหลักฐานที่ข้อนั้น หรือทบทวนสถานะใหม่' },
  { key: 'not_assessed', title: 'ยังไม่มีผู้ประเมินบันทึกไว้',
    why: 'สถานะในระบบมาจากการนำเข้าข้อมูลเดิม ไม่ใช่จากการประเมินของคน',
    todo: 'ให้ผู้รับผิดชอบประเมินและบันทึกชื่อผู้ประเมิน' },
  { key: 'unscreened',   title: 'ยังไม่ผ่านการคัดกรองความเกี่ยวข้อง',
    why: 'ยังไม่มีใครยืนยันว่ากฎหมายฉบับนี้ใช้บังคับกับองค์กรหรือไม่ (ISO 45001 ข้อ 6.1.3)',
    todo: 'คัดกรองแล้วกดยืนยันผลในหน้ารายละเอียดกฎหมาย' },
]

const today = () => new Date().toISOString().slice(0, 10)
const hasEvidence = r => !!String(r?.evidence_url || '').trim()
const assessedByHuman = r => !!String(r?.evaluated_by || '').trim()
// section_ref สำหรับแสดงในรายงาน — เลขมาตราถ้ามี ไม่มีก็ตัดข้อความให้สั้น
export const sectionOf = r => {
  const txt = String(r?.text || '').trim()
  const m = txt.match(/^\s*((?:มาตรา|ข้อ|หมวด)\s*[๐-๙0-9]+(?:\/[๐-๙0-9]+)?)/)
  return m ? m[1].replace(/\s+/g, ' ') : (txt.slice(0, 40) + (txt.length > 40 ? '…' : ''))
}

// laws     = กฎหมายที่ยังบังคับใช้ พร้อม reqs และ relevance (จาก App.lawsWithRel)
// plans    = แถวจาก lg_improvement_plans
// lawFiles = { [law_id]: จำนวนไฟล์แนบระดับฉบับ } — ใช้เสริมกรณีหลักฐานผูกที่ระดับฉบับ
export function buildGapAnalysis(laws = [], plans = [], lawFiles = {}) {
  const t = today()
  const planByReq = {}, planByLaw = {}
  plans.forEach(p => {
    if (p.requirement_id) (planByReq[p.requirement_id] = planByReq[p.requirement_id] || []).push(p)
    if (p.law_id) (planByLaw[p.law_id] = planByLaw[p.law_id] || []).push(p)
  })
  const openPlansOf = r => (planByReq[r.id] || []).filter(p => p.status !== 'done')

  const groups = Object.fromEntries(GAP_GROUPS.map(g => [g.key, []]))
  let met = 0, unmet = 0, ack = 0, na = 0, waiting = 0, evidenceHave = 0, evidenceNeed = 0

  for (const l of laws) {
    // กลุ่ม 5 · ระดับฉบับ — ยังไม่มีใครยืนยันผลคัดกรอง
    if (!l.relevance?.confirmed_verdict) {
      groups.unscreened.push({
        law: l, section: '—', responsible: l.responsible || '—',
        todo: l.relevance?.suggested_at
          ? `AI เสนอว่า “${l.relevance.verdict === 'relevant' ? 'เกี่ยวข้อง' : l.relevance.verdict === 'not_relevant' ? 'ไม่เกี่ยวข้อง' : 'ต้องข้อมูลเพิ่ม'}” — รอเจ้าหน้าที่ยืนยัน`
          : 'ยังไม่เคยคัดกรอง — สั่งคัดกรองแล้วยืนยันผล',
        due: '', detail: l.name,
      })
    }

    for (const r of (l.reqs || [])) {
      const kind = reqKind(r)
      if (kind === 'met') met++; else if (kind === 'unmet') unmet++
      else if (kind === 'acknowledged') ack++; else if (kind === 'not_applicable') na++
      else waiting++

      // ฐานความครบถ้วนของหลักฐาน = ข้อที่ประเมินว่าสอดคล้องเท่านั้น
      // (NC ยังไม่ต้องมีหลักฐาน · Ack/ไม่เกี่ยวข้อง ไม่ต้องมีอยู่แล้ว)
      if (kind === 'met') {
        evidenceNeed++
        if (hasEvidence(r) || (lawFiles[l.id] || 0) > 0) evidenceHave++
        else groups.met_no_evidence.push({
          law: l, section: sectionOf(r), responsible: r.responsible || l.responsible || '—',
          todo: 'แนบหลักฐานที่ข้อนี้ หรือทบทวนสถานะใหม่', due: '', detail: r.text,
        })
      }

      if (kind === 'unmet') {
        const open = openPlansOf(r)
        if (!open.length) groups.nc_no_plan.push({
          law: l, section: sectionOf(r), responsible: r.responsible || l.responsible || '—',
          todo: 'เปิดแผนปรับปรุง ระบุผู้รับผิดชอบและวันแล้วเสร็จ', due: '',
          detail: r.status_reason || r.note || r.text,
        })
        else {
          const late = open.filter(p => p.due_date && p.due_date < t)
          late.forEach(p => groups.plan_overdue.push({
            law: l, section: sectionOf(r), responsible: p.owner_name || r.responsible || '—',
            todo: p.plan_text || 'ปิดแผนปรับปรุง', due: p.due_date, detail: r.text, plan: p,
          }))
        }
      }

      if (!assessedByHuman(r)) groups.not_assessed.push({
        law: l, section: sectionOf(r), responsible: r.responsible || l.responsible || '—',
        todo: 'ให้ผู้รับผิดชอบประเมินและบันทึกชื่อผู้ประเมิน', due: '', detail: r.text,
      })
    }
  }

  const assessed = met + unmet
  return {
    groups,
    summary: {
      laws: laws.length,
      req: met + unmet + ack + na + waiting,
      met, unmet, ack, na, waiting, assessed,
      // สูตรเดียวกับ sumReqStats — ห้ามคำนวณต่างจาก Dashboard เด็ดขาด
      pct: assessed ? Math.round(met / assessed * 100) : null,
      evidenceNeed, evidenceHave,
      evidencePct: evidenceNeed ? Math.round(evidenceHave / evidenceNeed * 100) : null,
      counts: Object.fromEntries(GAP_GROUPS.map(g => [g.key, groups[g.key].length])),
      totalGaps: GAP_GROUPS.reduce((n, g) => n + groups[g.key].length, 0),
    },
  }
}
