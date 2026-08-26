-- 053 · P22 · เติม note และ f259_remark เข้า view lg_req_effective
--
-- ทำไม: api/law-screen.js ต้องใช้ lg_requirements.note ซึ่งเก็บ applicability
-- ("ตัวบทใช้กับใคร") ที่ถูกยุบรวมไว้ตั้งแต่ตอนนำเข้า — เป็นข้อมูลสำคัญที่สุดของการคัดกรอง
-- view รอบแรก (052) ไม่มีคอลัมน์นี้ endpoint จึงยังต้องอ่านตารางดิบ แล้วพลาดค่าที่กู้จาก F-259
-- เติมเข้า view แล้วทุก endpoint อ่านจากที่เดียวกันได้
--
-- ⚠ คอลัมน์ใหม่ต้อง "ต่อท้าย" เท่านั้น — CREATE OR REPLACE VIEW เปลี่ยนลำดับหรือชื่อคอลัมน์เดิมไม่ได้
--   (Postgres ตอบ 42P16: cannot change name of view column)
-- ไม่มี UPDATE/DELETE · เป็น DDL อย่างเดียว

create or replace view lg_req_effective as
select r.id as requirement_id,
       r.law_id, r.seq, r.text, r.status, r.status_reason,
       r.evaluated_by, r.evaluated_at, r.evidence_url, r.evidence_label,
       coalesce(nullif(btrim(r.responsible), ''), f.responsible) as responsible,
       coalesce(nullif(btrim(r.frequency),   ''), f.frequency)   as frequency,
       coalesce(nullif(btrim(r.documents),   ''), f.documents)   as documents,
       f.report_to,
       case when nullif(btrim(r.responsible),'') is not null then 'system'
            when f.responsible is not null then 'f259' end as responsible_src,
       case when nullif(btrim(r.frequency),'')   is not null then 'system'
            when f.frequency   is not null then 'f259' end as frequency_src,
       case when nullif(btrim(r.documents),'')   is not null then 'system'
            when f.documents   is not null then 'f259' end as documents_src,
       f.match_kind, f.source_sheet, f.source_row,
       r.note,
       f.remark as f259_remark
  from lg_requirements r
  left join lg_req_f259_source f on f.requirement_id = r.id;

comment on view lg_req_effective is
  'ข้อกำหนดพร้อมค่าที่ใช้ได้จริง — ค่าที่ผู้ใช้กรอกชนะ ค่าจาก F-259 เป็นตัวสำรอง · *_src บอกที่มา · note/f259_remark ต่อท้าย (P22 · migration 052/053)';
