# Migrations — ลำดับการรันและหมายเหตุ

รันไฟล์ `.sql` ใน Supabase SQL editor **เรียงตามหมายเลข 001 → 016** (ต้องเรียงลำดับ
เพราะบางไฟล์อ้างถึงตาราง/คอลัมน์ที่สร้างในไฟล์ก่อนหน้า) `schema.sql` ที่โฟลเดอร์แม่คือ
โครงสร้างฐานเริ่มต้น — รันก่อนไฟล์ในโฟลเดอร์นี้ทั้งหมด

ทุกไฟล์เขียนแบบ idempotent (`create table if not exists`, `add column if not exists`,
`drop constraint if exists`) รันซ้ำได้ปลอดภัย ยกเว้นที่ระบุไว้เป็นพิเศษด้านล่าง

## ประวัติหมายเลข (สำคัญ)
- เดิมมีไฟล์เลข **007 ซ้ำกัน 2 ไฟล์** (`007_law_quarter_stats.sql` กับ `007_process_items.sql`)
  และ **ข้ามเลข 009** — ได้ rename `007_law_quarter_stats.sql` → **`009_law_quarter_stats.sql`**
  เพื่อให้ลำดับต่อเนื่อง (`007_process_items.sql` คงเลข 007 ไว้)
- การ rename ไม่กระทบสิ่งที่รันไปแล้วใน production เพราะ Supabase ไม่ได้ผูกกับชื่อไฟล์
  (เรารันด้วยมือใน SQL editor ไม่ได้ใช้ระบบ migration ที่ track ชื่อไฟล์)

## ลำดับและสถานะ

| ไฟล์ | สร้าง/แก้ | รันใน production แล้ว? | หมายเหตุ |
|------|----------|----------------------|----------|
| `schema.sql` (โฟลเดอร์แม่) | เดิม | ✅ ใช่ | โครงสร้างฐาน lg_categories / lg_laws / lg_requirements / lg_communications / lg_notification_log |
| `001_add_compliance_months.sql` | เดิม | ✅ ใช่ | ตาราง lg_compliance_months |
| `002_add_law_updates.sql` | เดิม | ✅ ใช่ | ตาราง lg_law_updates |
| `003_add_activity_log.sql` | เดิม | ✅ ใช่ | ตาราง lg_activity_log |
| `004_add_car_ofi.sql` | เดิม | ✅ ใช่ (ถูกยกเลิกภายหลังโดย 012) | — |
| `005_law_docs_storage.sql` | เดิม | ✅ ใช่ | bucket `law-docs` + policy |
| `006_agent_queue_runs.sql` | เดิม | ✅ ใช่ | lg_agent_queue / lg_agent_runs |
| `007_process_items.sql` | เดิม | ✅ ใช่ | lg_process_items (คงเลข 007) |
| `008_process_tracker.sql` | เดิม | ✅ ใช่ | lg_process_tracker / lg_process_substatus |
| `009_law_quarter_stats.sql` | **rename** (เดิมคือ 007_law_quarter_stats) | ✅ ใช่ | lg_law_quarter_stats + seed จาก F-259 |
| `010_requirement_evidence.sql` | เดิม | ✅ ใช่ | คอลัมน์ evidence บน lg_requirements |
| `011_attachments.sql` | เดิม | ✅ ใช่ | lg_attachments |
| `012_drop_car_ofi.sql` | เดิม | ✅ ใช่ | ยกเลิกตารางจาก 004 |
| `013_monthly_review_status.sql` | เดิม | ✅ ใช่ | คอลัมน์ status/checked_by บน lg_compliance_months |
| `014_code_unique_per_cat.sql` | **ใหม่** | ✅ ใช่ (รันแล้ว 2026-07-11) | เปลี่ยน unique ของ lg_laws จาก (code) → (cat, code) เพื่อรองรับรหัสซ้ำข้ามหมวด (LF/LG) |
| `015_missing_tables.sql` | **ใหม่** | ✅ ใช่ (รันแล้ว 2026-07-11 · no-op — ตารางมีอยู่ก่อนแล้ว) | formalize lg_settings / lg_import_staging / lg_reports — รันเพื่อ setup เครื่องใหม่; ใน prod เป็น no-op เพราะ `if not exists` |
| `016_law_active_flag.sql` | **ใหม่** | ✅ ใช่ (รันแล้ว 2026-07-11 · no-op — คอลัมน์มีอยู่ก่อนแล้ว เพิ่มด้วยมือ 2026-06-20 เป็น `add_law_active`) | คอลัมน์ `lg_laws.active` = กฎหมายยังบังคับใช้ / "ไม่ใช้แล้ว" (ใช้โดย `setLawActive` / `ActiveBadge`) — รันเพื่อ setup เครื่องใหม่; ใน prod เป็น no-op เพราะ `if not exists` |

## หมายเหตุพิเศษ
- **014** รันใน production แล้วเมื่อ 2026-07-11 — constraint `lg_laws_code_key` (UNIQUE code)
  ถูกแทนที่ด้วย `lg_laws_cat_code_key` (UNIQUE cat, code) เรียบร้อย พร้อม import กฎหมาย LF/LG
  ที่รหัสชนกันข้ามหมวดได้แล้ว
- **015** ใน production ตาราง 3 ตัวนี้ถูกสร้างด้วยมือไว้ก่อนแล้ว การรันซ้ำจะไม่ทับข้อมูลเดิม
  (`create table if not exists`) แต่ถ้า schema ที่สร้างด้วยมือ **ต่างจากไฟล์นี้** จะไม่ถูกแก้ให้
  ตรงกันอัตโนมัติ — ควรเทียบคอลัมน์ให้ตรงเองหากพบความต่าง
- **016** ใน production มีคอลัมน์ `lg_laws.active` อยู่แล้ว (เพิ่มด้วยมือเมื่อ 2026-06-20 ผ่าน
  migration ชื่อ `add_law_active`) การรันไฟล์นี้จึงเป็น **no-op** เพราะ `add column if not exists`
  ไฟล์นี้มีไว้ให้ setup ฐานใหม่ได้ schema ตรงกับที่โค้ดคาดหวัง
