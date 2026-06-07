# open-notebook — บริการอ่าน/สรุป PDF กฎหมาย

ใช้คู่กับ Edge Function `read-law-pdf` เพื่ออ่านไฟล์ PDF จาก URL
(เช่น ราชกิจจานุเบกษา) แล้วสรุปด้วย AI และนำไปลงทะเบียนในหน้า Analysis

> อ้างอิงโปรเจกต์ต้นทาง: https://github.com/lfnovo/open-notebook

## 1. เริ่มรัน

```bash
cd lexguard/open-notebook
cp .env.example .env          # แล้วแก้ค่าในไฟล์ .env
docker compose up -d
```

- Web UI: http://localhost:8502
- REST API: http://localhost:5055

ครั้งแรกเข้า Web UI → **Settings → API Keys** ใส่คีย์ผู้ให้บริการ AI
(OpenAI / Anthropic / Google) ถ้ายังไม่ได้ใส่ในไฟล์ `.env`

## 2. หา NOTEBOOK_ID และ TRANSFORMATION_ID

1. ใน Web UI สร้าง notebook ใหม่ 1 อัน (เช่นชื่อ "Thai Laws")
2. ดึง id ผ่าน API (แทน `<PASSWORD>` ด้วยค่า `OPEN_NOTEBOOK_PASSWORD`):

```bash
# notebook id
curl -s http://localhost:5055/api/notebooks \
  -H "Authorization: Bearer <PASSWORD>" | jq '.[].id'

# transformation id ที่ใช้สรุป (เลือกอันที่เป็น Summary)
curl -s http://localhost:5055/api/transformations \
  -H "Authorization: Bearer <PASSWORD>" | jq '.[] | {id, name}'
```

## 3. เปิดให้ Supabase เข้าถึง API ได้

Edge Function รันบนคลาวด์ จึงต้องเข้าถึง `http://localhost:5055` จากภายนอกได้
เลือกวิธีใดวิธีหนึ่ง:

- **ทดสอบเร็ว:** `cloudflared tunnel --url http://localhost:5055`
  หรือ `ngrok http 5055` → ได้ URL https สาธารณะ
- **ใช้งานจริง:** รันบน VPS แล้วชี้โดเมน + reverse proxy (Caddy/Nginx) มาที่พอร์ต 5055

## 4. ตั้งค่า secret ฝั่ง Supabase

Dashboard → Project → **Edge Functions → Manage secrets** (หรือใช้ CLI):

```bash
supabase secrets set \
  OPEN_NOTEBOOK_API_URL=https://<โดเมน-หรือ-tunnel-ของคุณ> \
  OPEN_NOTEBOOK_PASSWORD=<รหัสเดียวกับใน .env> \
  OPEN_NOTEBOOK_NOTEBOOK_ID=<notebook id จากขั้นตอน 2> \
  OPEN_NOTEBOOK_SUMMARY_TRANSFORMATION_ID=<transformation id (ไม่บังคับ)>
```

เสร็จแล้วกลับไปที่หน้า **Analysis → อ่านกฎหมายจากลิงก์/PDF** วางลิงก์ PDF
ระบบจะดึงเนื้อหามาสรุปจริงและให้กดลงทะเบียนได้ทันที

## 5. ตั้งค่าให้อ่าน PDF ภาษาไทยได้ดี

open-notebook อ่านเอกสารผ่านไลบรารี **content-core** ตั้งค่าผ่านตัวแปร `CCORE_*` ใน `.env`

**เลือกเอนจินอ่านเอกสาร (`CCORE_DOCUMENT_ENGINE`)**
| ค่า | เหมาะกับ | หมายเหตุ |
| --- | --- | --- |
| `auto` (ค่าเริ่มต้น) | ทั่วไป | เดาให้เอง |
| `simple` | PDF ที่เป็น "ข้อความจริง" | เร็ว — **ราชกิจจาฯ สมัยใหม่ส่วนใหญ่เป็นแบบนี้** เลือกตัวนี้ก็พอ |
| `docling` | PDF "สแกน/เป็นรูปภาพ" | ทำ layout + OCR (ใช้ EasyOCR รองรับไทย) ช้าและกินแรงเครื่องกว่า |

> เคล็ดลับ: ลองด้วย `auto`/`simple` ก่อน ถ้าสรุปออกมาว่างหรืออ่านไม่ออก
> (มักเป็นเอกสารสแกน) ค่อยเปลี่ยนเป็น `docling` แล้วรัน `docker compose restart`

**โมเดลที่แนะนำสำหรับภาษาไทย**
- **สรุป (LLM):** `gemini-2.0-flash` หรือ `gpt-4o-mini` — อ่านไทยแม่น context ยาว ราคาถูก
  เอกสารกฎหมายยาวมาก ควรเลี่ยงโมเดล context สั้น
- **Embedding:** `text-embedding-3-small` (OpenAI) หรือ embedding ของ Gemini
- ตั้งคีย์ของ provider ที่เลือกในไฟล์ `.env` หรือใน UI → Settings → API Keys

**ถ้าใช้ `docling` แล้ว OCR ไทยยังเพี้ยน**
- docling ดึงโมเดล OCR ครั้งแรกอัตโนมัติ (รอสักครู่/ต้องต่อเน็ต)
- เอกสารคุณภาพต่ำ ลองสแกนใหม่ความละเอียดสูงขึ้น หรือส่งไฟล์ PDF ต้นฉบับที่เป็นข้อความแทนลิงก์สแกน

## หมายเหตุ
- `.env` มีความลับ — อย่า commit ขึ้น git (มี `.gitignore` กันไว้แล้ว)
- โฟลเดอร์ `surreal_data/` และ `notebook_data/` คือข้อมูลถาวร อย่าลบ
- เครื่องที่รัน `docling` ควรมี RAM ≥ 4–8GB เพราะโหลดโมเดล OCR
