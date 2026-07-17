# ตั้งค่า Claude API (AI ค้นหา/สรุปกฎหมาย) — LexGuard

## โครงสร้าง

```
หน้าเว็บ (React)  →  Supabase Edge Function  →  Anthropic API
 supabase.functions.invoke   ถือ key ไว้ที่นี่ (secret)   web_search + สรุป
```

ไฟล์ในโปรเจค:

```
supabase/functions/_shared/anthropic.ts        ตัวช่วยเรียก API + CORS + parse JSON (web_search)
supabase/functions/ai-law-search/index.ts      ค้นหากฎหมายใหม่ประจำเดือน (Task 4.1–4.2, Task 12)
supabase/functions/ai-law-summary/index.ts     สรุปสาระสำคัญรายฉบับ (Task 4.3)
src/lib/aiLaw.js                                client wrapper (searchNewLaws / summarizeLaw)
supabase/migrations/026_discovered_source_url.sql  เพิ่มคอลัมน์ source_url
```

> ⚠️ ตาราง `lg_ai_discovered_laws` และ `lg_search_log` **มีอยู่แล้ว** (migration 022/025)
> โดย `lg_laws.id` เป็น **bigint** และ RLS เป็นแบบ public (ตรงกับ anon key ที่แอปใช้).
> จึง **ไม่ต้องรัน** ไฟล์ `20260717_ai_law_tables.sql` ที่แนบมา (FK แบบ uuid จะ error และ
> policy `to authenticated` จะบล็อกแอป). ใช้ migration 026 ที่เพิ่มเฉพาะ `source_url` แทน.

## ขั้นตอนติดตั้ง

### 1. เอา API key
console.anthropic.com → API Keys → Create Key → ได้ key ขึ้นต้น `sk-ant-`
ต้องเติมเครดิต pay-as-you-go (แยกจาก Claude Pro/Max)

### 2. ตั้ง secret (key ไม่เข้า git)

```bash
supabase login
supabase link --project-ref exugnmdsyqbqtxsrwhbm

supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxx
supabase secrets set ANTHROPIC_MODEL=claude-sonnet-4-6        # โมเดล id ที่ถูกต้อง (ค่าเริ่มต้นในโค้ดก็ค่านี้)
supabase secrets set ALLOWED_ORIGIN=https://lexguard-delta-swart.vercel.app
```

`SUPABASE_URL` และ `SUPABASE_SERVICE_ROLE_KEY` Supabase ใส่ให้อัตโนมัติ ไม่ต้อง set เอง

### 3. deploy edge functions

```bash
supabase functions deploy ai-law-search
supabase functions deploy ai-law-summary
```

(migration 026 apply แล้วบน project — ถ้ารันเองใหม่: `supabase db push`)

### 4. ทดสอบ
เปิดหน้า “ค้นหากฎหมาย” ในแอป → กดปุ่ม “ค้นหากฎหมาย”. ถ้ายังไม่ deploy/ตั้ง secret
จะขึ้น toast แจ้ง error อย่างนุ่มนวล (ไม่ crash).

## ข้อควรระวัง
- **ห้าม** ใส่ key ใน `.env` ของ Vite — `VITE_*` ถูก bundle ให้ผู้ใช้เห็นได้หมด
- ถ้าเคย commit key ให้ revoke แล้วสร้างใหม่
- `allowed_domains` จำกัดที่ราชกิจจาฯ / Shawpat / กรมสวัสดิการฯ เท่านั้น
- ทุกผลสรุปต้องผ่านการตรวจทานโดย จป. ก่อนเข้าทะเบียนเสมอ (ดู `confidence` ประกอบ)

## ค่าใช้จ่ายโดยประมาณ
ค้นเดือนละครั้ง + สรุป ~5 ฉบับ ≈ $1–1.5/เดือน (web search คิดแยก $10/1,000 ครั้ง).
คุมด้วย Spend limit ใน console → Billing.
