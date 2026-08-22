-- 043 · เก็บฉบับที่ระบบ "เจอเองแล้วอ่านสำเร็จ" ลงดัชนีด้วย
--
-- ปัญหาที่แก้: ดัชนีจาก GD Catalog (mig 042) เริ่มที่ **มิ.ย. 2566** เท่านั้น
-- ตรวจแล้ว 2026-08-22 ว่าแก้ที่ต้นทางไม่ได้ — ชุดข้อมูลของ สลค. มีชุดกฎหมายชุดเดียว
-- และไฟล์เก่าสุดคือเดือนนั้นจริง ๆ · ทางลัดที่ลองแล้วไม่ผ่าน: เลขเอกสารแบบยาว
-- (140A033N0000000000100) ถอดรหัสได้จริง สูตร {เล่ม}{ก=A..ง=D}{ตอน}{N|S}{หน้า×100}
-- ตรง 2,395 จาก 2,421 ฉบับ **แต่ใช้ได้เฉพาะเล่ม 140–142** — สร้าง URL ของฉบับเก่า
-- 5 ฉบับแล้วได้ 404 ทั้งหมด (เล่ม 125/134/135/137/138) เพราะฉบับเก่าใช้เลขทึบที่เดาไม่ได้
--
-- ของใหม่: เลิกทิ้งสิ่งที่ระบบหามาได้เอง
-- ทุกครั้งที่ Skill 3 ตอบคำถามสำเร็จ มันได้ (ชื่อกฎหมาย + URL ที่เพิ่งเปิดอ่านจริง) มาแล้ว
-- แต่เดิมเก็บแค่ "คำตอบ" ลง lg_ref_answers ส่วนที่อยู่ของตัวบทถูกทิ้ง
-- เขียนกลับลงดัชนีด้วย source='discovered' → ดัชนีโตไปตามเอกสารที่ทะเบียนอ้างถึงจริง
-- ซึ่งเป็นชุดเล็กและวนซ้ำ (กฎกระทรวงควบคุมอาคาร ฉ.39 · ฉ.55 · ตรวจสุขภาพปัจจัยเสี่ยง 2563)
-- และครอบคลุมฉบับก่อน มิ.ย. 2566 ได้เองโดยไม่ต้องพึ่ง dump หรือ Token
--
-- ⚠ แถวชนิดนี้ "แทรกอย่างเดียว ห้ามทับของเดิม" (ฝั่งโค้ดใช้ Prefer: resolution=ignore-duplicates)
-- เพราะมันมีแค่ ชื่อ + URL ไม่มี เล่ม/ตอน/หน้า ปล่อยให้ทับแถวจาก gdcatalog
-- = ลบเลขอ้างอิงที่ผู้ตรวจ ISO ใช้ทิ้งไปเฉย ๆ
--
-- idempotent · รันซ้ำได้

alter table lg_gazette_index drop constraint if exists lg_gazette_index_source_check;
alter table lg_gazette_index add constraint lg_gazette_index_source_check
  check (source in ('gdcatalog','soc_api','discovered'));

-- discovered ไม่มีวันที่ประกาศ จึงตกดัชนี publish_date เดิมซึ่ง order by ใช้อยู่
-- ใส่ดัชนีบน source ไว้ดูสัดส่วนและกวาดล้างเฉพาะกลุ่มได้
create index if not exists lg_gazette_index_source_idx
  on lg_gazette_index (source, loaded_at desc);

comment on column lg_gazette_index.source is
  'gdcatalog = dump รายเดือนของ สลค. (มิ.ย. 2566+) · soc_api = api.soc.go.th (ต้อง Token · ทั้งคลัง) · discovered = ระบบเปิดอ่านไฟล์นี้สำเร็จเองระหว่างตอบคำถาม';

-- ── DOWN ────────────────────────────────────────────────────────────────────
-- delete from lg_gazette_index where source = 'discovered';
-- drop index if exists lg_gazette_index_source_idx;
-- alter table lg_gazette_index drop constraint if exists lg_gazette_index_source_check;
-- alter table lg_gazette_index add constraint lg_gazette_index_source_check
--   check (source in ('gdcatalog','soc_api'));
