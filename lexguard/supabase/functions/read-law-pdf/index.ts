// ───────────────────────────────────────────────────────────────
// read-law-pdf — reads a PDF / law URL (e.g. ratchakitcha.soc.go.th)
// using a self-hosted open-notebook instance (https://github.com/lfnovo/open-notebook)
// and returns an AI summary + suggested registry fields.
//
// Required secrets (Supabase → Edge Functions → Secrets):
//   OPEN_NOTEBOOK_API_URL      e.g. https://your-open-notebook.example.com
//   OPEN_NOTEBOOK_PASSWORD     the OPEN_NOTEBOOK_PASSWORD of your instance
//   OPEN_NOTEBOOK_NOTEBOOK_ID  a notebook id to attach sources to
// Optional:
//   OPEN_NOTEBOOK_SUMMARY_TRANSFORMATION_ID  transformation id used to summarise
// ───────────────────────────────────────────────────────────────
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } })

const API   = Deno.env.get("OPEN_NOTEBOOK_API_URL")
const PASS   = Deno.env.get("OPEN_NOTEBOOK_PASSWORD")
const NB     = Deno.env.get("OPEN_NOTEBOOK_NOTEBOOK_ID")
const TRANSF = Deno.env.get("OPEN_NOTEBOOK_SUMMARY_TRANSFORMATION_ID")

const headers = () => ({
  "Content-Type": "application/json",
  ...(PASS ? { Authorization: `Bearer ${PASS}` } : {}),
})

async function on(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, { ...init, headers: { ...headers(), ...(init?.headers || {}) } })
  if (!res.ok) throw new Error(`open-notebook ${path} → ${res.status} ${await res.text()}`)
  return res.json()
}

function deriveSuggestion(text: string, url: string) {
  const isRatcha = /ratchakitcha\.soc\.go\.th/i.test(url)
  // crude first-line / title heuristic for the register form
  const firstLine = (text || "").split("\n").map(s => s.trim()).find(s => s.length > 8) || ""
  const levelGuess =
    /พระราชบัญญัติ|พระราชกำหนด/.test(text) ? "1" :
    /พระราชกฤษฎีกา/.test(text) ? "2" :
    /กฎกระทรวง/.test(text) ? "3" :
    /ประกาศ|ระเบียบ/.test(text) ? "4" : "5"
  const ministry = (text.match(/กระทรวง[ก-๙]+/) || [])[0] || ""
  return {
    name: firstLine.slice(0, 160),
    ministry,
    hierarchy_level: levelGuess,
    effective_date: "",
    source: isRatcha ? "ราชกิจจานุเบกษา" : "เอกสาร PDF",
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  try {
    const { url } = await req.json()
    if (!url || !/^https?:\/\//i.test(url)) return json({ error: "invalid url" }, 400)

    // Not configured yet → graceful placeholder (frontend handles `pending`)
    if (!API || !NB) {
      return json({
        pending: true,
        url,
        source: /ratchakitcha/i.test(url) ? "ราชกิจจานุเบกษา" : "เอกสาร PDF",
        summary: "ยังไม่ได้ตั้งค่า open-notebook (OPEN_NOTEBOOK_API_URL / OPEN_NOTEBOOK_NOTEBOOK_ID). " +
          "เมื่อเชื่อมต่อแล้ว ระบบจะดึงข้อความจาก " + url + " มาสรุปและให้ลงทะเบียนได้อัตโนมัติ",
        suggested: { name: "", ministry: "", hierarchy_level: "4", effective_date: "" },
      })
    }

    // 1) create a "link" source — synchronous so we get full_text back
    const source = await on("/api/sources/json", {
      method: "POST",
      body: JSON.stringify({
        type: "link", url, notebook_id: NB,
        embed: false, delete_source: false, async_processing: false,
        transformations: TRANSF ? [TRANSF] : [],
      }),
    })

    const sourceId = source.id
    let summary = ""
    const fullText = source.full_text || source.content || ""

    // 2) prefer an insight (transformation output) when available
    let insights = source.insights || []
    if ((!insights || insights.length === 0) && TRANSF && sourceId) {
      try {
        const ins = await on(`/api/sources/${sourceId}/insights`, {
          method: "POST",
          body: JSON.stringify({ transformation_id: TRANSF }),
        })
        insights = Array.isArray(ins) ? ins : [ins]
      } catch (_) { /* fall back to full_text */ }
    }
    summary = insights?.[0]?.content || insights?.[0]?.insight || fullText.slice(0, 2000)

    return json({
      pending: false,
      url,
      sourceId,
      summary: summary || "อ่านเอกสารสำเร็จแต่ไม่พบเนื้อหาสรุป",
      suggested: deriveSuggestion(fullText || summary, url),
      source: deriveSuggestion(fullText || summary, url).source,
    })
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500)
  }
})
