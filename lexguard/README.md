# Comply Register — ระบบทะเบียนกฎหมาย SHE และกฎหมายอื่นๆ ที่เกี่ยวข้อง & ติดตามความสอดคล้อง
> ชื่อโค้ดภายใน (repo/codename): LexGuard · ชื่อทางการ/ผู้ใช้เห็น: **Comply Register**

ระบบเว็บแอปสำหรับ จป.วิชาชีพ ของ **บริษัท จัสเทล เน็ทเวิร์ค จำกัด** ใช้จัดการทะเบียนกฎหมาย
ความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน (SHE) รวมถึงกฎหมายอื่นที่เกี่ยวข้อง
พร้อมติดตามความสอดคล้อง วิเคราะห์/สรุปด้วย AI และตารางการสื่อสารองค์กร (ISD-86)

สร้างด้วย **React + Vite + Supabase (PostgreSQL) + Vercel + Claude API**

## ฟีเจอร์ (เมนูหลัก 10 รายการ)
- **Dashboard (ภาพรวม)** — วงแหวน % ความสอดคล้อง, สถิติรายหมวด, รายการยังไม่สอดคล้อง (NC)
- **ทะเบียน & ความสอดคล้อง** — ค้นหา/กรอง, ดูรายละเอียด, เพิ่มกฎหมาย, บันทึกสถานะ C/NC (บันทึกลงฐานข้อมูลทันที)
- **ปฏิทินกฎหมาย** — วันครบกำหนดทบทวนแบบปฏิทินรายเดือน
- **สรุปกฎหมาย (AI)** — ป้อนข้อความ/ลิงก์/PDF แล้วให้ AI สรุปเป็นข้อกำหนดพร้อมเข้าทะเบียน
- **Process Tracker** — ติดตามสถานะกระบวนการประเมินแต่ละรอบ
- **สื่อสาร & ส่งรายงาน (ISD-86)** — ตารางการสื่อสารภายใน/ภายนอกองค์กร
- **ประวัติการทำรายการ** — บันทึกการแก้ไขทั้งหมด (Audit trail)
- **กฎหมายที่ถูกยกเลิก** — ดู/กู้คืน/แทนที่กฎหมายที่ยกเลิก
- **การแจ้งเตือน** — รายการ NC และใกล้ครบกำหนดทบทวน (≤ 60 วัน)
- **ตั้งค่า** — ค่าส่วนตัว, โหมดสว่าง/มืด, ข้อมูลระบบ
- **ส่งออก**: Excel (`.xls`) และ PDF ตามฟอร์ม **F-259** (สำหรับ audit ISO 45001)

## ข้อมูล (อ้างอิงไฟล์ `supabase/seed-data.json`)
- **8 หมวด**: LA–LG และ CC (CCS คุ้มครองข้อมูลส่วนบุคคล/ไซเบอร์ — รหัส CC-xxx)
- **191 ฉบับบังคับใช้ (+10 ยกเลิก) = 201 ฉบับ** · **464 ข้อกำหนด** · ยังไม่สอดคล้อง **9 ข้อ ใน 5 ฉบับ** (LA-031, LA-032, LA-040, LA-041, LA-042)
- ปรับปรุงตาม **F-259 Rev.1 รอบที่ 1 (ม.ค.–มี.ค.) ปี 2569** (อัปเดต 26 ธ.ค. 2568)
- ตารางใช้ prefix `lg_` แยกจากตารางเดิมในโครงการ

> ⚠️ **ตัวเลขจริงให้ยึดฐานข้อมูลสด**: หน้า Dashboard ในแอป (หรือ `SELECT count(*) FROM lg_laws`) คือค่าที่ถูกต้อง — ตัวเลขด้านบนมาจากไฟล์ seed อาจต่างจาก DB ปัจจุบัน ให้ตรวจสอบและปรับให้ตรงกันก่อนอ้างอิงในเอกสาร

## โครงสร้างโปรเจกต์
```
lexguard/
├─ src/
│  ├─ App.jsx                 # แอปหลัก + sidebar + แจ้งเตือน + ส่งออก
│  ├─ index.css               # ดีไซน์ระบบทั้งหมด (รวม @media print)
│  ├─ pages/                  # 10 หน้า (Dashboard, Registry, LawCalendar, LawSummary,
│  │                          #   ProcessTracker, Communications, History, Repealed,
│  │                          #   Notifications, Settings)
│  ├─ components/
│  │  ├─ LawDrawer.jsx        # แผงรายละเอียดกฎหมาย + แก้ไขสถานะ
│  │  ├─ PdfExport.jsx        # ตัวสร้างรายงาน PDF ตามฟอร์ม F-259
│  │  ├─ ExportPdfModal.jsx   # กล่องเลือกขอบเขตการส่งออก PDF
│  │  ├─ AddLawFlow.jsx / AssessForm.jsx / ReviewModal.jsx ...
│  └─ lib/
│     ├─ supabase.js          # client + data access
│     ├─ auth.js              # ชั้น auth (demo / supabase / microsoft)
│     └─ integrations.js      # ส่งออก Excel
├─ api/                       # Vercel serverless (law-analyze, law-update, agent-analyze)
├─ supabase/schema.sql        # โครงสร้างฐานข้อมูล + migrations/
├─ .env.example               # ตัวอย่างค่าเชื่อมต่อ (ห้าม commit .env จริง)
└─ package.json
```

## การติดตั้งและรันในเครื่อง
```bash
npm install
npm run dev        # เปิด http://localhost:5173
```

## Environment Variables (ตั้งใน Vercel)
- `VITE_SUPABASE_URL` — URL ของโครงการ Supabase
- `VITE_SUPABASE_ANON_KEY` — publishable key (ปลอดภัยที่จะฝังใน client)
- `VITE_AUTH_MODE` — `demo` (ทดลอง) หรือ `supabase` (ใช้จริง)
- `VITE_DEMO_PASSWORD` — รหัสผ่านบัญชี demo; ถ้าไม่ตั้งจะล็อกอินโหมด demo ไม่ได้
- `ANTHROPIC_API_KEY` — คีย์ Claude สำหรับฟีเจอร์วิเคราะห์/สรุป (server-side เท่านั้น)
- `CRON_SECRET` — โทเคนลับสำหรับ Vercel Cron (`api/agent-*`)
- `ALLOWED_ORIGIN` — โดเมนของแอปเอง ใช้ตรวจ Origin/Referer ของ `api/law-*`

## ⚠️ หมายเหตุด้านความปลอดภัย (สำคัญ — ทำก่อนขึ้นใช้จริง / ก่อนเปิด repo สาธารณะ)
1. **ลบบัญชีที่ฝังรหัสในโค้ด** ออกจาก `src/lib/auth.js` (ตัวแปร `APP_ACCOUNTS`) — ปัจจุบันมี username/password แบบ hardcode หากรีโปเป็น public = ใครก็ล็อกอินเป็น admin ได้ ให้ย้ายไปใช้ Supabase Auth และ **เปลี่ยนรหัสผ่านทันที**
2. **RLS เปิดอยู่** (อ่าน/เขียนด้วย anon key) — สิทธิ์ในหน้าเว็บเป็นเพียง UI ยังไม่กันที่ฐานข้อมูล ให้เพิ่ม policy จำกัดสิทธิ์ก่อนใช้งานวงกว้าง
3. ปิด `VITE_SKIP_LOGIN` ใน production (ค่านี้ให้สิทธิ์ guest = admin)
4. พิจารณาตั้งรีโปเป็น **private** (ถ้าเคย push รหัสไปแล้ว ให้ล้างประวัติ git ด้วย)
