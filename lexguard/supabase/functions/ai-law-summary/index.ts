// supabase/functions/ai-law-summary/index.ts
// Task 4 ข้อ 3 : ปุ่ม "สรุป" รายกฎหมาย → สาระสำคัญทุกข้อ + เอกสารเกี่ยวข้อง + วันที่ + กระทรวง
// ผลลัพธ์ที่ได้ให้ฝั่ง client เอาไปแสดงในฟอร์มที่แก้ไขข้อความได้ก่อน Save

import {
  callClaude,
  corsHeaders,
  fail,
  json,
  parseJson,
} from "../_shared/anthropic.ts";

const ALLOWED_DOMAINS = [
  "ratchakitcha.soc.go.th",
  "shawpat.or.th",
  "labour.go.th",
  "oshthai.org",
];

interface LawSummary {
  law_name: string;
  ministry: string | null;
  announced_date: string | null;
  effective_date: string | null;
  scope: string | null;
  key_points: { clause: string; content: string; action_required: string }[];
  related_docs: string[];
  penalties: string | null;
  applies_to_office: boolean;
  confidence: "high" | "medium" | "low";
  notes: string | null;
}

// SKILL: law-analysis — สอดคล้องกับ SKILL.md ที่มีใน repo
const SYSTEM = `คุณคือ จป.วิชาชีพ ที่ทำหน้าที่สรุปกฎหมายเข้าทะเบียนกฎหมาย (F-259) ตามระบบ ISO 45001

หลักการสรุป:
1. สรุป "สาระสำคัญทุกข้อ" ของกฎหมาย ไม่ใช่แค่ภาพรวม — ไล่ทีละมาตรา/ข้อ ตามที่ปรากฏจริง
2. แต่ละข้อต้องระบุว่า "องค์กรต้องทำอะไร" (action_required) เป็นภาษาที่นำไปประเมินความสอดคล้องได้ทันที
   ตัวอย่างที่ดี: "จัดให้มีการตรวจวัดความเข้มแสงสว่างในพื้นที่ทำงานอย่างน้อยปีละ 1 ครั้ง และเก็บผลไว้ไม่น้อยกว่า 2 ปี"
   ตัวอย่างที่ไม่ดี: "ปฏิบัติตามที่กฎหมายกำหนด"
3. ระบุ related_docs = แบบฟอร์ม/รายงาน/ใบรับรองที่กฎหมายบังคับให้จัดทำหรือส่งราชการ
4. applies_to_office = กฎหมายนี้บังคับใช้กับสำนักงาน/ธุรกิจโทรคมนาคมหรือไม่

กฎเหล็ก:
- ใช้ web_search หาตัวบทจริงจากราชกิจจานุเบกษาก่อนเสมอ ห้ามสรุปจากความจำ
- ห้ามคัดลอกตัวบทมาทั้งดุ้น ให้เรียบเรียงใหม่เป็นภาษาที่ใช้งานได้จริง
- ข้อไหนไม่พบข้อมูลยืนยัน ให้ใส่ null และตั้ง confidence เป็น "low" พร้อมอธิบายใน notes
- แปลง พ.ศ. เป็น ค.ศ. (พ.ศ. - 543) รูปแบบ YYYY-MM-DD
- ผลสรุปนี้จะถูกมนุษย์ตรวจทานก่อนใช้เสมอ — ความถูกต้องสำคัญกว่าความครบถ้วน ไม่รู้ให้บอกว่าไม่รู้

ตอบกลับเป็น JSON object ล้วนเท่านั้น ห้ามมี markdown fence หรือคำอธิบายนอก JSON`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { law_name, source_url = null, extra_context = "" } = await req
      .json()
      .catch(() => ({}));

    if (!law_name || typeof law_name !== "string") {
      return fail("ต้องระบุ law_name", 422);
    }

    const prompt = `สรุปกฎหมายฉบับนี้เข้าทะเบียนกฎหมาย

ชื่อกฎหมาย: ${law_name}
${source_url ? `แหล่งอ้างอิง: ${source_url}` : ""}
${extra_context ? `ข้อมูลเพิ่มเติม: ${extra_context}` : ""}

ขั้นตอน: ค้นหาตัวบทจริงก่อน แล้วจึงสรุปตาม schema นี้

{
  "law_name": "ชื่อเต็มตามที่ประกาศจริง",
  "ministry": "กระทรวงที่ออก หรือ null",
  "announced_date": "YYYY-MM-DD หรือ null",
  "effective_date": "YYYY-MM-DD หรือ null",
  "scope": "ขอบเขตการบังคับใช้ ใครต้องปฏิบัติ",
  "key_points": [
    {
      "clause": "ข้อ 5 / มาตรา 12",
      "content": "สาระสำคัญของข้อนั้น",
      "action_required": "สิ่งที่องค์กรต้องทำ ระบุความถี่/ระยะเวลาเก็บเอกสารถ้ามี"
    }
  ],
  "related_docs": ["แบบ สอ.1", "รายงานผลการตรวจวัด"],
  "penalties": "บทลงโทษ หรือ null",
  "applies_to_office": true,
  "confidence": "high | medium | low",
  "notes": "ข้อสังเกต/สิ่งที่หาไม่พบ หรือ null"
}`;

    const { text, searchCount, usage } = await callClaude({
      system: SYSTEM,
      prompt,
      webSearch: true,
      allowedDomains: ALLOWED_DOMAINS,
      maxUses: 8,
      maxTokens: 12000,
    });

    let summary: LawSummary;
    try {
      summary = parseJson<LawSummary>(text);
    } catch (_e) {
      console.error("[parse-fail] คำตอบดิบ:", text.slice(0, 500));
      return fail("AI ตอบกลับในรูปแบบที่อ่านไม่ได้ กรุณากดสรุปใหม่อีกครั้ง", 502);
    }

    if (!summary.key_points?.length) {
      summary.confidence = "low";
      summary.notes = (summary.notes ?? "") +
        " [ระบบ: ไม่พบสาระสำคัญรายข้อ กรุณาแนบไฟล์ตัวบทแล้วตรวจสอบด้วยตนเอง]";
    }

    return json({
      ok: true,
      summary,
      meta: { web_searches: searchCount, model_generated_at: new Date().toISOString() },
      usage,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e), 500);
  }
});
