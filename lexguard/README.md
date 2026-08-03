# Compliance Register — ทะเบียนกฎหมาย SHE และการติดตามความสอดคล้อง
> ชื่อโค้ดภายใน (repo/codename): LexGuard · ชื่อทางการ/ผู้ใช้เห็น: **Compliance Register**

ระบบเว็บแอปสำหรับ จป.วิชาชีพ ของ **บริษัท จัสเทล เน็ทเวิร์ค จำกัด** ใช้จัดการทะเบียนกฎหมาย
ความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน (SHE) รวมถึงกฎหมายอื่นที่เกี่ยวข้อง
พร้อมประเมินความสอดคล้องรายข้อ ติดตามงานที่ต้องทำ สรุปกฎหมายด้วย AI และตารางการสื่อสารองค์กร (ISD-86)

สร้างด้วย **React + Vite + Supabase (PostgreSQL) + Vercel + Claude API**

---

## เมนูหลัก (4 อัน + เมนูย่อย)
1. **Dashboard** — KPI ภาพรวม (จำนวนกฎหมาย/ข้อปฏิบัติ/ยังไม่สอดคล้อง/% ความสอดคล้อง),
   ความสอดคล้องรายหมวด, รายการยังไม่สอดคล้อง (NC), สถิติรายเดือน (พับเก็บได้)
2. **ทะเบียนกฎหมาย** — 3 แท็บในหน้าเดียว:
   - *ทะเบียนกฎหมาย* — ค้นหา/กรอง, ดูรายละเอียด, ประเมิน C/NC รายข้อ (บันทึกลงฐานทันที),
     เพิ่มกฎหมาย, ตรวจรายเดือน, ลิงก์ตัวบทต้นฉบับ (📄), ส่งออก Excel / PDF (F-259)
   - *กฎหมายที่ยกเลิก* — ดู/กู้คืน/แทนที่
   - *ประวัติการทำรายการ* — audit trail แยกตามหมวด
3. **รายการที่ต้องทำ** — รวมงานค้างจาก 3 แหล่ง (ทวนสอบกฎหมาย · รายงานราชการ · การสื่อสาร)
   อ่านจาก view `lg_tasks` แท็บ ต้องทำ / กำลังดำเนินการ / เสร็จแล้ว จัดกลุ่มตามกำหนดเวลา
4. **สื่อสาร & ส่งรายงาน** — ตารางการสื่อสาร (ISD-86) + ส่งรายงานราชการ (เพิ่ม/แก้/บันทึกการส่ง)
5. **สรุปกฎหมาย (AI)** — วางข้อความ/ลิงก์/PDF ให้ AI สรุปเป็นข้อปฏิบัติ พร้อมส่งต่อเข้าทะเบียน

เมนูรอง: **การแจ้งเตือน** (กระดิ่งบน header) · **ตั้งค่า** (ปุ่มเฟืองมุมล่างซ้าย / เมนูผู้ใช้ — เฉพาะ admin)

## โมเดลการประเมินความสอดคล้อง (P18)
- สถานะข้อปฏิบัติในฐานมีแค่ `met` / `unmet` — "ยังไม่ประเมิน" ระบุด้วย `evaluated_at IS NULL`
- ประเมินรายข้อ **inline ในหน้าเพิ่มกฎหมาย**: สอดคล้อง / ไม่สอดคล้อง / รอผู้เกี่ยวข้องประเมิน
  ("รอผู้เกี่ยวข้องประเมิน" = `unmet` + `evaluated_at` NULL + note `รอผู้เกี่ยวข้องประเมิน:`)
- **% ความสอดคล้อง = met / (met + unmet ที่ประเมินแล้ว)** — ข้อที่ "รอประเมิน" ไม่รวมทั้งเศษและส่วน

## ข้อมูล (ยึดฐานข้อมูลสดเป็นหลัก)
- **7 หมวด**: LA–LG (CCS/CC ถูกถอดออกแล้ว)
- ~**160 ฉบับ** (บังคับใช้ ~150 + ยกเลิก ~10) · ~**522 ข้อปฏิบัติ** (ยังไม่สอดคล้องจริง ~13 ข้อ)
- รายงานราชการ ~19 รายการ · การสื่อสาร ~26 รายการ · แผนก (lg_departments) 16 แผนก
- ตารางทั้งหมดใช้ prefix `lg_`

> ⚠️ ตัวเลขด้านบนเป็นค่าประมาณ ณ เวลาเขียน — ให้ยึดหน้า Dashboard ในแอป หรือ `SELECT count(*) …`
> จากฐานข้อมูลสดเสมอ

## โครงสร้างโปรเจกต์
```
lexguard/
├─ src/
│  ├─ App.jsx                 # แอปหลัก · sidebar 4 เมนู · header (ค้นหา/กระดิ่ง/ส่งออก) · routing
│  ├─ index.css               # ดีไซน์ระบบทั้งหมด (รวม @media print สำหรับ F-259)
│  ├─ pages/
│  │  ├─ Dashboard.jsx        # KPI strip + CatBars + NC list + สถิติรายเดือน
│  │  ├─ Registry.jsx         # ทะเบียน + แท็บ (Register/Repealed/History) + ประเมิน C/NC
│  │  ├─ Tasks.jsx            # "รายการที่ต้องทำ" อ่านจาก view lg_tasks (แทน Calendar+Tracker เดิม)
│  │  ├─ LawSummary.jsx       # สรุปกฎหมายด้วย AI + คลังสรุป
│  │  ├─ Communications.jsx   # ตารางการสื่อสาร (ISD-86)
│  │  ├─ History.jsx / Repealed.jsx / Notifications.jsx / Settings.jsx / Improvements.jsx
│  ├─ components/
│  │  ├─ AddLawFlow.jsx       # เพิ่มกฎหมาย + ประเมินรายข้อ inline + date picker + datalist แผนก
│  │  ├─ CaseParts.jsx        # WFStepper / CaseDrawer / MonitorModal (ใช้ใน Tasks)
│  │  ├─ LawDrawer.jsx        # แผงรายละเอียดกฎหมาย + แก้สถานะข้อปฏิบัติ
│  │  ├─ Reports.jsx          # ส่งรายงานราชการ (เพิ่ม/แก้/บันทึกการส่ง)
│  │  ├─ AssessForm.jsx / Attachments.jsx / NotifyPopup.jsx / DeleteLawModal.jsx …
│  │  ├─ PdfExport.jsx        # สร้างรายงาน PDF ตามฟอร์ม F-259
│  │  └─ ExportPdfModal.jsx / ImportLawsModal.jsx (createLawsBatch — UI ปิดไว้)
│  └─ lib/
│     ├─ supabase.js          # client + data access ทั้งหมด
│     ├─ ui.jsx               # helper (วันที่ไทย/BE, prog, reqStats, Pill, ฯลฯ)
│     ├─ auth.js              # ชั้น auth (demo / supabase)
│     └─ integrations.js      # ส่งออก Excel
├─ api/law-analyze.js         # Vercel serverless: AI สรุปกฎหมาย (Claude, server-side)
├─ supabase/schema.sql        # โครงสร้างฐานข้อมูล + migrations/ (ถึง 031)
├─ vercel.json                # build config + SPA rewrites (ไม่มี cron แล้ว)
├─ .env.example               # ตัวอย่างค่าเชื่อมต่อ (ห้าม commit .env จริง)
└─ package.json
```

## ตารางฐานข้อมูลหลัก (prefix `lg_`)
- `lg_laws` · `lg_requirements` · `lg_categories` — ทะเบียนกฎหมาย + ข้อปฏิบัติ + หมวด
- `lg_law_workflow` — งานทวนสอบ/ประเมินรายกฎหมาย (2 workflow: add / monitor)
- `lg_reports` · `lg_communications` — รายงานราชการ + ตารางการสื่อสาร
- `lg_tasks` (**view**, migration 030) — รวมงานที่ต้องทำจาก workflow/report/comm, `security_invoker`
- `lg_departments` — รายชื่อแผนก (ช่วยเติมช่องผู้รับผิดชอบ)
- `lg_review_log` · `lg_activity_log` · `lg_notification_log` · `lg_ai_discovered_laws` · `lg_settings`
- migration 031: default `lg_requirements.status = 'met'` (คงสถานะเป็น met/unmet เท่านั้น)

## การติดตั้งและรันในเครื่อง
```bash
npm install
npm run dev        # เปิด http://localhost:5173
npm run build      # สร้าง production build ไป dist/
```

## Environment Variables (ตั้งใน Vercel)
- `VITE_SUPABASE_URL` — URL ของโครงการ Supabase
- `VITE_SUPABASE_ANON_KEY` — publishable key (ฝังใน client ได้)
- `VITE_AUTH_MODE` — `demo` (ทดลอง) หรือ `supabase` (ใช้จริง)
- `VITE_DEMO_PASSWORD` — รหัสผ่านบัญชี demo (ถ้าไม่ตั้ง จะล็อกอินโหมด demo ไม่ได้)
- `ANTHROPIC_API_KEY` — คีย์ Claude สำหรับ "สรุปกฎหมาย (AI)" (server-side เท่านั้น)
- `ALLOWED_ORIGIN` — โดเมนของแอปเอง ใช้ตรวจ Origin/Referer ของ `api/law-analyze`

> หมายเหตุ: flow "เฝ้าระวังกฎหมายอัตโนมัติ" (Vercel Cron + `api/agent-*`, `api/law-update`)
> ถูกถอดออกแล้ว — ไม่ต้องตั้ง `CRON_SECRET` อีก

## ⚠️ หมายเหตุด้านความปลอดภัย (ทำก่อนขึ้นใช้จริง / ก่อนเปิด repo สาธารณะ)
1. **ลบบัญชีที่ฝังรหัสในโค้ด** ใน `src/lib/auth.js` (`APP_ACCOUNTS`) — มี username/password hardcode
   ถ้ารีโปเป็น public = ใครก็ล็อกอินเป็น admin ได้ · ให้ย้ายไป Supabase Auth และเปลี่ยนรหัสทันที
2. **RLS**: สิทธิ์ในหน้าเว็บเป็นเพียง UI · ให้เพิ่ม policy จำกัดสิทธิ์ที่ฐานข้อมูลก่อนใช้งานวงกว้าง
3. ปิด `VITE_SKIP_LOGIN` ใน production (ให้สิทธิ์ guest = admin)
4. พิจารณาตั้งรีโปเป็น **private** (ถ้าเคย push รหัสไปแล้ว ให้ล้างประวัติ git ด้วย)
