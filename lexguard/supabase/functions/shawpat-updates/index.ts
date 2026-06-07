// ───────────────────────────────────────────────────────────────
// shawpat-updates — scrapes the SHAWPAT OSH-law page for newly
// released laws/announcements, stores them, and raises a
// notification (lg_notification_log) for each new item.
//
// Source: https://www.shawpat.or.th/th/other-service/osh-law
// Can be called from the app (refresh button) or on a schedule
// (pg_cron + pg_net). Uses the service-role key to write.
// ───────────────────────────────────────────────────────────────
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } })

const PAGE = "https://www.shawpat.or.th/th/other-service/osh-law"
const ORIGIN = "https://www.shawpat.or.th"

function decode(s: string) {
  return s.replace(/&amp;/g, "&").replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim()
}

async function scrape() {
  const res = await fetch(PAGE, { headers: { "User-Agent": "Mozilla/5.0 ComplyRegisterBot" } })
  if (!res.ok) throw new Error(`shawpat ${res.status}`)
  const html = await res.text()

  const items: { id: string; title: string; url: string }[] = []
  const seen = new Set<string>()
  // anchors that point to a downloadable law document
  const re = /<a[^>]+href="([^"]*download=([^":&]+)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    const href = decode(m[1])
    const dlId = decode(m[2])
    const title = decode(m[3].replace(/<[^>]+>/g, " ").replace(/\s+/g, " "))
    if (!title || title.length < 6) continue
    const id = `shawpat-${dlId}`
    if (seen.has(id)) continue
    seen.add(id)
    items.push({ id, title, url: href.startsWith("http") ? href : ORIGIN + (href.startsWith("/") ? "" : "/") + href })
  }
  return items
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  try {
    const url = Deno.env.get("SUPABASE_URL")!
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const db = createClient(url, key)

    let items: { id: string; title: string; url: string }[] = []
    try { items = await scrape() } catch (e) {
      // fallback sample so the UI still works if the site blocks the request
      items = [{ id: "shawpat-sample", title: "ไม่สามารถดึงข้อมูลจาก SHAWPAT ได้ (" + String(e?.message || e) + ")", url: PAGE }]
    }

    // figure out which are new
    const { data: known } = await db.from("lg_law_updates").select("id")
    const knownIds = new Set((known || []).map((r: { id: string }) => r.id))
    const fresh = items.filter(i => i.id !== "shawpat-sample" && !knownIds.has(i.id))

    if (fresh.length) {
      const now = new Date().toISOString()
      await db.from("lg_law_updates").upsert(
        fresh.map(i => ({ id: i.id, title: i.title, url: i.url, source: "ShawPat · OSH Law", seen_at: now })),
        { onConflict: "id" },
      )
      await db.from("lg_notification_log").insert(
        fresh.map(i => ({
          type: "law_update",
          ref_type: "law_update",
          message: "กฎหมายความปลอดภัยใหม่: " + i.title,
          link: i.url,
          created_at: now,
        })),
      )
    }

    // return full current feed (newest first)
    const { data: feed } = await db.from("lg_law_updates")
      .select("*").order("seen_at", { ascending: false }).limit(50)

    return json({ items: (feed || []).map((r: any) => ({
      id: r.id, title: r.title, url: r.url, source: r.source, date: (r.seen_at || "").slice(0, 10),
    })), new: fresh.length })
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500)
  }
})
