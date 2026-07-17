// supabase/functions/ai-law-search/index.ts
// Task 4 ข้อ 1–2 : ปุ่ม "ค้นหากฎหมาย" → AI ค้นกฎหมายใหม่จากราชกิจจานุเบกษา + Shawpat
// Task 12       : บันทึกทุกครั้งลง lg_search_log รวมถึงกรณีไม่เจอกฎหมายใหม่

import { createClient } from "jsr:@supabase/supabase-js@2";
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

interface DiscoveredLaw {
  law_name: string;
  source: "ratchakitcha" | "shawpat";
  source_url: string | null;
  ministry: string | null;
  announced_date: string | null; // YYYY-MM-DD
  effective_date: string | null;
  category_guess: string | null; // LA–LG
  short_note: string | null;
}

const SYSTEM = `คุณคือผู้ช่วยนักกฎหมายความปลอดภัยอาชีวอนามัยและสภาพแวดล้อมในการทำงาน (จป.วิชาชีพ) ของบริษัทโทรคมนาคมไทย

หน้าที่: ค้นหากฎหมายไทยที่ "ออกใหม่หรือแก้ไข" ในช่วงเวลาที่ระบุ เฉพาะที่เกี่ยวข้องกับความปลอดภัย อาชีวอนามัย สภาพแวดล้อมในการทำงาน สิ่งแวดล้อม อาคารสถานที่ อัคคีภัย ไฟฟ้า และการทำงานสำนักงาน/โทรคมนาคม

กฎเหล็ก:
- ใช้ web_search เท่านั้นในการหาข้อมูล ห้ามเดาจากความจำ
- ถ้าไม่พบข้อมูลยืนยันในเว็บ ให้ตอบเป็น array ว่าง [] ห้ามแต่งขึ้นมาเอง
- วันที่ต้องเป็นวันที่ที่พบจริงในเอกสาร แปลง พ.ศ. เป็น ค.ศ. (พ.ศ. - 543) รูปแบบ YYYY-MM-DD ถ้าไม่พบให้ใส่ null
- source_url ต้องเป็น URL จริงที่ได้จากผลค้นหา ห้ามประกอบ URL ขึ้นเอง

หมวดหมู่สำหรับ category_guess:
LA = ความปลอดภัยทั่วไป/บริหารจัดการ | LB = อาชีวอนามัยและสภาพแวดล้อม
LC = เครื่องจักร/อุปกรณ์/ไฟฟ้า | LD = อัคคีภัยและภาวะฉุกเฉิน
LE = สิ่งแวดล้อม | LF = อาคารสถานที่ | LG = อื่นๆ/แรงงาน
ถ้าไม่แน่ใจให้ใส่ null

ตอบกลับเป็น JSON array ล้วนเท่านั้น ห้ามมีคำอธิบายหรือ markdown fence`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      month, // 1-12 (ไม่ส่ง = เดือนปัจจุบัน)
      year, // ค.ศ.
      searched_by = "ไม่ระบุ",
      keywords = "",
    } = await req.json().catch(() => ({}));

    const now = new Date();
    const m = Number(month) || now.getMonth() + 1;
    const y = Number(year) || now.getFullYear();
    const thYear = y + 543;

    const prompt = `ค้นหากฎหมายไทยด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน ที่ประกาศใหม่หรือแก้ไขในเดือน ${m}/${y} (พ.ศ. ${thYear})

แหล่งที่ต้องค้น:
1. เว็บไซต์ราชกิจจานุเบกษา (ratchakitcha.soc.go.th) — กฎกระทรวง ประกาศกระทรวง ประกาศกรม
2. เว็บไซต์ Shawpat / สมาคมส่งเสริมความปลอดภัยฯ (shawpat.or.th) — สรุปกฎหมายใหม่ประจำเดือน
${keywords ? `\nคำค้นเพิ่มเติมที่ผู้ใช้ระบุ: ${keywords}` : ""}

คืนค่าเป็น JSON array ตาม schema นี้ (ถ้าไม่พบให้คืน []):
[
  {
    "law_name": "ชื่อกฎหมายเต็มตามที่ประกาศ",
    "source": "ratchakitcha" หรือ "shawpat",
    "source_url": "URL จริงที่พบ หรือ null",
    "ministry": "กระทรวงที่ออก หรือ null",
    "announced_date": "YYYY-MM-DD หรือ null",
    "effective_date": "YYYY-MM-DD หรือ null",
    "category_guess": "LA-LG หรือ null",
    "short_note": "สรุปสั้น 1 บรรทัดว่าเกี่ยวกับอะไร"
  }
]`;

    const { text, searchCount, usage } = await callClaude({
      system: SYSTEM,
      prompt,
      webSearch: true,
      allowedDomains: ALLOWED_DOMAINS,
      maxUses: 10,
      maxTokens: 8000,
    });

    let laws: DiscoveredLaw[] = [];
    try {
      laws = parseJson<DiscoveredLaw[]>(text);
      if (!Array.isArray(laws)) laws = [];
    } catch (_e) {
      console.error("[parse-fail] คำตอบดิบ:", text.slice(0, 500));
      return fail("AI ตอบกลับในรูปแบบที่อ่านไม่ได้ กรุณาลองใหม่อีกครั้ง", 502);
    }

    // ---- Task 12: บันทึก search log ทุกครั้ง รวมถึงตอนไม่เจอ ----
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: logRow, error: logErr } = await supabase
      .from("lg_search_log")
      .insert({
        searched_by,
        sources: ["ratchakitcha", "shawpat"],
        results_count: laws.length,
        result_summary: { period: `${m}/${y}`, laws, web_searches: searchCount },
        no_new_laws: laws.length === 0,
      })
      .select("id, searched_at")
      .single();

    if (logErr) console.error("[search-log-fail]", logErr.message);

    return json({
      ok: true,
      period: { month: m, year: y, thai_year: thYear },
      count: laws.length,
      laws,
      search_log_id: logRow?.id ?? null,
      searched_at: logRow?.searched_at ?? new Date().toISOString(),
      usage,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e), 500);
  }
});
