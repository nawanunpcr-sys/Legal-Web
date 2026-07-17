// supabase/functions/_shared/anthropic.ts
// ตัวช่วยกลางสำหรับเรียก Anthropic API — ใช้ร่วมกันทุก Edge Function
// API key อ่านจาก Supabase secret เท่านั้น ไม่มีวันหลุดไปฝั่ง client

export const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ค่าเริ่มต้นเป็น claude-sonnet-4-6 (โมเดล id ที่ถูกต้อง — คุ้มค่าสำหรับงานค้น/สรุปกฎหมาย);
// override ได้ด้วย secret ANTHROPIC_MODEL
export const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";

type AnthropicBlock =
  | { type: "text"; text: string }
  | { type: "server_tool_use"; name: string; input: unknown }
  | { type: "web_search_tool_result"; content: unknown }
  | { type: string; [k: string]: unknown };

interface CallOpts {
  system: string;
  prompt: string;
  maxTokens?: number;
  /** เปิด web search tool (ใช้ตอนค้นหา/สรุปกฎหมายจากเว็บจริง) */
  webSearch?: boolean;
  /** จำกัดโดเมนที่ค้นได้ — กันไม่ให้ AI ไปหยิบข้อมูลจากบล็อกมั่วๆ */
  allowedDomains?: string[];
  maxUses?: number;
}

/** เรียก Anthropic Messages API แล้วคืน text ทั้งหมดที่รวมกันแล้ว */
export async function callClaude(opts: CallOpts): Promise<{
  text: string;
  searchCount: number;
  usage: unknown;
}> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ไม่พบ ANTHROPIC_API_KEY ใน environment");

  const body: Record<string, unknown> = {
    model: MODEL,
    max_tokens: opts.maxTokens ?? 8000,
    system: opts.system,
    messages: [{ role: "user", content: opts.prompt }],
  };

  if (opts.webSearch) {
    body.tools = [
      {
        type: "web_search_20250305",
        name: "web_search",
        max_uses: opts.maxUses ?? 8,
        ...(opts.allowedDomains ? { allowed_domains: opts.allowedDomains } : {}),
      },
    ];
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Anthropic API ตอบกลับ ${res.status}: ${detail}`);
  }

  const data = await res.json();
  const blocks: AnthropicBlock[] = data.content ?? [];

  // ดึงเฉพาะ block ที่เป็น text — อย่า assume ว่า content[0] คือคำตอบ
  const text = blocks
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("\n")
    .trim();

  const searchCount = blocks.filter((b) => b.type === "server_tool_use").length;

  return { text, searchCount, usage: data.usage };
}

/** แกะ JSON ออกจากคำตอบ เผื่อโมเดลใส่ ```json ครอบมา */
export function parseJson<T>(raw: string): T {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  // เผื่อมีข้อความนำหน้า/ต่อท้าย — ตัดเอาเฉพาะช่วง { } หรือ [ ] ชั้นนอกสุด
  const first = s.search(/[[{]/);
  const last = Math.max(s.lastIndexOf("]"), s.lastIndexOf("}"));
  if (first > 0 || last < s.length - 1) s = s.slice(first, last + 1);
  return JSON.parse(s) as T;
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

export function fail(message: string, status = 400): Response {
  console.error("[edge-error]", message);
  return json({ ok: false, error: message }, status);
}
