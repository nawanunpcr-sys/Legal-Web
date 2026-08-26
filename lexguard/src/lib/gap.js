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
// ⚠ 3 กลุ่มถูกซ่อนไว้ (hidden: true) ตามที่ผู้ใช้สั่ง 26/08/2569
// เหตุผล: ทั้งสามกลุ่มสะท้อน "ข้อมูลที่ยังไม่มี" ไม่ใช่ช่องว่างที่องค์กรทำผิดจริง
//   · C แต่ไม่มีหลักฐาน   — ทั้งระบบยังไม่มีไฟล์แนบสักไฟล์ ตัวเลขจึงเท่ากับ C ทั้งหมด
//   · ยังไม่มีผู้ประเมิน   — เป็นผลจากข้อมูลนำเข้าย้อนหลัง ไม่ใช่การละเลยของทีมงาน
//   · ยังไม่คัดกรอง        — ฟีเจอร์คัดกรองเพิ่งมี ยังไม่มีใครได้เริ่มใช้
// ปล่อยไว้จะทำให้รายงานขึ้น 1,189 รายการ ทั้งที่ช่องว่างจริงมี 11 รายการ
// ซึ่งกลบเรื่องที่ต้องแก้จริงจนมองไม่เห็น
// นิยามยังอยู่ครบ เปลี่ยน hidden เป็น false เมื่อข้อมูลพร้อมก็กลับมาใช้ได้ทันที
export const GAP_GROUPS_ALL = [
  { key: 'nc_no_plan',   title: 'NC ที่ยังไม่มีแผนปรับปรุง',
    why: 'ตรวจพบว่าไม่สอดคล้องแล้ว แต่ยังไม่มีใครรับผิดชอบแก้ไข — ความเสี่ยงสูงสุด',
    todo: 'เปิดแผนปรับปรุง ระบุผู้รับผิดชอบและวันแล้วเสร็จ' },
  { key: 'plan_overdue', title: 'NC ที่มีแผนแล้วแต่เลยกำหนด',
    why: 'มีแผนแต่ไม่ปิดตามกำหนด — ผู้ตรวจจะถามหาสาเหตุและมาตรการชั่วคราว',
    todo: 'ปิดแผน หรือทบทวนกำหนดเวลาพร้อมบันทึกเหตุผล' },
  { key: 'met_no_evidence', hidden: true, title: 'สอดคล้อง (C) แต่ไม่มีหลักฐานแนบ',
    why: 'อ้างว่าปฏิบัติแล้วแต่พิสูจน์ไม่ได้ — ความเสี่ยงที่ซ่อนอยู่ ตอบผู้ตรวจไม่ได้',
    todo: 'แนบหลักฐานที่ข้อนั้น หรือทบทวนสถานะใหม่' },
  { key: 'not_assessed', hidden: true, title: 'ยังไม่มีผู้ประเมินบันทึกไว้',
    why: 'สถานะในระบบมาจากการนำเข้าข้อมูลเดิม ไม่ใช่จากการประเมินของคน',
    todo: 'ให้ผู้รับผิดชอบประเมินและบันทึกชื่อผู้ประเมิน' },
  { key: 'unscreened', hidden: true,   title: 'ยังไม่ผ่านการคัดกรองความเกี่ยวข้อง',
    why: 'ยังไม่มีใครยืนยันว่ากฎหมายฉบับนี้ใช้บังคับกับองค์กรหรือไม่ (ISO 45001 ข้อ 6.1.3)',
    todo: 'คัดกรองแล้วกดยืนยันผลในหน้ารายละเอียดกฎหมาย' },
]

// กลุ่มที่แสดงจริงบนหน้าจอและในไฟล์ export — ตัวเลขสรุปทุกตัวนับจากชุดนี้เท่านั้น
export const GAP_GROUPS = GAP_GROUPS_ALL.filter(g => !g.hidden)

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
// respMap = { [requirement_id]: responsible } จาก lg_req_f259_source (migration 052)
//   ค่าที่ผู้ใช้กรอกในระบบชนะเสมอ · ค่าจากเอกสารเป็นตัวสำรอง — ตรรกะเดียวกับ view lg_req_effective
export function buildGapAnalysis(laws = [], plans = [], lawFiles = {}, respMap = {}) {
  const t = today()
  const planByReq = {}, planByLaw = {}
  plans.forEach(p => {
    if (p.requirement_id) (planByReq[p.requirement_id] = planByReq[p.requirement_id] || []).push(p)
    if (p.law_id) (planByLaw[p.law_id] = planByLaw[p.law_id] || []).push(p)
  })
  const openPlansOf = r => (planByReq[r.id] || []).filter(p => p.status !== 'done')
  // แผนที่ผูกไว้ระดับฉบับ (requirement_id = null) — เช่นแผนที่สร้างจาก "หลักฐานที่ยังไม่มี"
  // ⚠ เดิมสร้าง planByLaw ไว้แต่ไม่มีใครเรียก ทำให้ฉบับที่มีแผนอยู่แล้วยังขึ้นว่า "ไม่มีแผน"
  //   ไม่ถือว่าแผนระดับฉบับปิดช่องว่างรายข้อให้อัตโนมัติ เพราะมันอาจไม่ได้ครอบคลุมข้อนั้น
  //   แต่ต้องบอกให้คนรู้ว่ามีแผนอยู่ จะได้ไม่เปิดแผนซ้ำ
  const lawPlansOf = l => (planByLaw[l.id] || []).filter(p => p.status !== 'done' && !p.requirement_id)
  // ผู้รับผิดชอบที่ใช้ได้จริง — ระบบก่อน แล้วค่อยของฉบับ แล้วค่อยค่าที่กู้จาก F-259
  const respOf = (r, l) => String(r.responsible || '').trim()
    || String(l.responsible || '').trim()
    || String(respMap[r.id] || '').trim()
    || '—'

  const groups = Object.fromEntries(GAP_GROUPS_ALL.map(g => [g.key, []]))
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
          law: l, section: sectionOf(r), responsible: respOf(r, l),
          todo: 'แนบหลักฐานที่ข้อนี้ หรือทบทวนสถานะใหม่', due: '', detail: r.text,
        })
      }

      if (kind === 'unmet') {
        const open = openPlansOf(r)
        if (!open.length) {
          const lp = lawPlansOf(l)
          groups.nc_no_plan.push({
            law: l, section: sectionOf(r), responsible: respOf(r, l),
            todo: lp.length
              ? `เปิดแผนปรับปรุงสำหรับข้อนี้ — ฉบับนี้มีแผนระดับฉบับอยู่แล้ว ${lp.length} รายการ ตรวจว่าครอบคลุมข้อนี้หรือไม่ก่อนเปิดซ้ำ`
              : 'เปิดแผนปรับปรุง ระบุผู้รับผิดชอบและวันแล้วเสร็จ',
            due: '', hasLawPlan: lp.length,
            detail: r.status_reason || r.note || r.text,
          })
        }
        else {
          const late = open.filter(p => p.due_date && p.due_date < t)
          late.forEach(p => groups.plan_overdue.push({
            law: l, section: sectionOf(r), responsible: p.owner_name || r.responsible || '—',
            todo: p.plan_text || 'ปิดแผนปรับปรุง', due: p.due_date, detail: r.text, plan: p,
          }))
        }
      }

      if (!assessedByHuman(r)) groups.not_assessed.push({
        law: l, section: sectionOf(r), responsible: respOf(r, l),
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
      // นับเฉพาะกลุ่มที่แสดงจริง — ไม่งั้นหัวรายงานจะขึ้นตัวเลขที่หน้าจอไม่มีให้ดู
      counts: Object.fromEntries(GAP_GROUPS.map(g => [g.key, groups[g.key].length])),
      totalGaps: GAP_GROUPS.reduce((n, g) => n + groups[g.key].length, 0),
      countsAll: Object.fromEntries(GAP_GROUPS_ALL.map(g => [g.key, groups[g.key].length])),
    },
  }
}

// ── P22 · ตัวช่วยสำหรับหน้าจอ Gap Analysis ──────────────────────────────────
// แยกจาก buildGapAnalysis เพราะเป็นเรื่องการ "แสดงผล" ล้วน ไม่กระทบตัวเลขในรายงาน
// ตัวเลขสรุปทุกตัวยังมาจาก summary ชุดเดิม จึงไม่มีทางที่หน้าจอกับ PDF/Excel จะไม่ตรงกัน

// รายชื่อหน่วยงานพร้อมจำนวนช่องว่าง — ใช้ทำชิปกรอง
// คนที่ต้องลงมือแก้คือเจ้าของหน่วยงาน ถ้าหาแถวของตัวเองไม่เจอ รายงานก็ไม่มีประโยชน์
export const UNSPEC = 'ยังไม่ระบุหน่วยงาน'

// ค่าผู้รับผิดชอบใน F-259 หลายช่องเป็นหลายบรรทัด ("Safety⏎Data center⏎MTN")
// ขึ้นบนชิปแล้วดันความสูงจนแถบตัวกรองเละ · ยุบเป็นบรรทัดเดียวคั่นด้วย /
export const normDept = v => {
  const s = String(v || '').replace(/\s*[\r\n]+\s*/g, ' / ').replace(/\s+/g, ' ').trim()
  return (!s || s === '—') ? UNSPEC : s
}

export function deptCounts(groups) {
  const m = {}
  for (const g of GAP_GROUPS)
    for (const x of (groups[g.key] || [])) {
      const d = normDept(x.responsible)
      m[d] = (m[d] || 0) + 1
    }
  // ดัน 'ยังไม่ระบุหน่วยงาน' ไปท้ายสุดเสมอ — มันไม่ใช่หน่วยงานที่สั่งงานได้
  return Object.entries(m).sort((a, b) =>
    (a[0] === UNSPEC) - (b[0] === UNSPEC) || b[1] - a[1])
}

// กรองรายการตามหน่วยงาน + คำค้น (รหัส / ชื่อกฎหมาย / มาตรา / สิ่งที่ต้องทำ)
export function filterRows(rows = [], { dept = 'all', q = '' } = {}) {
  const s = String(q || '').trim().toLowerCase()
  return rows.filter(x => {
    if (dept !== 'all') {
      if (normDept(x.responsible) !== dept) return false
    }
    if (!s) return true
    return [x.law?.code, x.law?.name, x.section, x.todo, x.detail]
      .some(v => String(v || '').toLowerCase().includes(s))
  })
}

// ยุบรายการเป็นรายกฎหมาย — 509 แถวเรียงรวดอ่านไม่ไหว แต่ 120 ฉบับพับไว้อ่านไหว
// เรียงตามจำนวนช่องว่างมากไปน้อย เพื่อให้เห็นว่าปัญหากระจุกอยู่ที่ฉบับไหน
// (ไม่ใช่คะแนนความเสี่ยง — เป็นแค่การนับว่าฉบับไหนมีรายการเยอะสุด)
export function groupByLaw(rows = []) {
  const m = new Map()
  for (const x of rows) {
    const k = x.law?.id ?? x.law?.code ?? '—'
    if (!m.has(k)) m.set(k, { law: x.law, items: [] })
    m.get(k).items.push(x)
  }
  return [...m.values()].sort((a, b) => b.items.length - a.items.length
    || String(a.law?.code || '').localeCompare(String(b.law?.code || '')))
}

// "เริ่มจากตรงนี้" — สามอย่างที่ทำแล้วปิดช่องว่างได้มากที่สุด
// คำนวณจากจำนวนจริงล้วนๆ ไม่มีการให้น้ำหนักหรือตัดสินว่าอะไรเสี่ยงกว่ากัน
export function topActions(groups, summary) {
  const out = []
  for (const g of GAP_GROUPS) {
    const n = (groups[g.key] || []).length
    if (!n) continue
    const laws = new Set((groups[g.key] || []).map(x => x.law?.id)).size
    out.push({
      key: g.key, title: g.title, n, laws, todo: g.todo,
      pct: summary.totalGaps ? Math.round(n / summary.totalGaps * 100) : 0,
    })
  }
  return out.sort((a, b) => b.n - a.n).slice(0, 3)
}

// ── P24 · ช่องว่างระดับข้อย่อย ─────────────────────────────────────────────
// กลุ่มนี้ต่างจาก "NC ที่ยังไม่มีแผน" ตรงที่ละเอียดถึงระดับ "การกระทำ"
// ตัวอย่างจริง: ตรวจวัดเสียงแล้ว แต่เก็บผลไว้ 2 ปี ไม่ครบ 5 ปี
//   ระดับข้อกำหนดเห็นแค่ NC ทั้งข้อ · ระดับข้อย่อยชี้ได้ว่าติดที่ระยะเวลาจัดเก็บ
export const SUB_GAP_GROUP = {
  key: 'sub_unmet', title: 'ข้อย่อยที่ยังไม่ได้ดำเนินการ',
  why: 'ผู้ประเมินติ๊กว่ายังไม่ทำในระดับข้อย่อย — ระบุได้ว่าติดตรงจุดใดของข้อกำหนด',
  todo: 'ดำเนินการตามข้อย่อยแล้วแนบหลักฐาน',
}

// subs = ผลจาก fetchUnmetSubs() · lawById/reqById ใช้เติมบริบท
export function buildSubGaps(subs = [], laws = []) {
  const lawById = Object.fromEntries(laws.map(l => [l.id, l]))
  const reqById = {}
  laws.forEach(l => (l.reqs || []).forEach(r => { reqById[r.id] = r }))
  return subs.map(s => {
    const law = lawById[s.law_id]
    const req = reqById[s.requirement_id]
    if (!law) return null
    return {
      law, section: req ? sectionOf(req) : '—',
      responsible: String(req?.responsible || law.responsible || '').trim() || '—',
      todo: s.action_required || s.title,
      due: '', risk: s.risk_level, subTitle: s.title,
      detail: [s.check_note ? `ติดตรง: ${s.check_note}` : '', s.evidence_required ? `หลักฐานที่ต้องมี: ${s.evidence_required}` : '']
        .filter(Boolean).join(' · ') || s.title,
    }
  }).filter(Boolean)
}
