-- 050 · P22 ขั้นที่ 5 · สรุปภาพรวมทั้งฉบับแบบข้ามมาตรา
--
-- ข้อเสนอแนะของผู้ประเมินข้อ 5: "การสรุปกฎหมายควรสรุปทั้งฉบับ ไม่ใช่แยกรายมาตรา
-- เพราะใจความไม่จบสมบูรณ์ในมาตราเดียว ต้องอ่านหลายมาตราประกอบกัน"
--
-- ═══ ไม่มีตารางใหม่ ═══
-- ใช้คอลัมน์ lg_laws.ai_summary เดิม (migration 029) ตามที่แผนกำหนด
-- เพิ่มเฉพาะฟังก์ชันที่ทำให้การเขียน "ปลอดภัยต่อคีย์เดิม" เท่านั้น
--
-- ═══ ทำไมต้องเป็นฟังก์ชัน ไม่ใช่ update ตรงๆ จากแอป ═══
-- กติกา 9.4: คอลัมน์ jsonb ที่มีข้อมูลอยู่แล้ว ให้เติมด้วย jsonb_set เฉพาะคีย์ใหม่
-- ห้ามเขียนทับทั้งก้อน
-- แต่แอปยิงผ่าน PostgREST ซึ่งเขียน jsonb ได้แค่แบบ "แทนที่ทั้งค่า" เท่านั้น
-- ทางเดียวที่จะรับประกันว่าคีย์เดิม (law, requirements, meta) ไม่หายคือทำ jsonb_set
-- ในฝั่งฐานข้อมูล · ถ้าปล่อยให้แอปอ่าน-แก้-เขียนเอง จะมีช่วงที่สองคนกดพร้อมกัน
-- แล้วผลของคนหนึ่งหายไปเงียบๆ (lost update) ซึ่งจับไม่ได้เลยเวลาเกิดขึ้นจริง
--
-- ═══ ฟังก์ชันนี้ไม่ใช่ "UPDATE ข้อมูลเดิม" ตามความหมายของกติกา 9.2/9.3 ═══
-- 9.3 ห้าม migration มีคำสั่ง UPDATE — ไฟล์นี้ไม่มี UPDATE ที่รันตอน migrate
-- มีแต่การประกาศฟังก์ชันที่จะทำงานเมื่อ "ผู้ใช้กดปุ่มสร้างสรุปภาพรวม" เท่านั้น
-- ซึ่งเข้าข้อยกเว้นของ 9.2 (ผู้ใช้กดยืนยันเองผ่านหน้าจอ)
-- และฟังก์ชันแตะได้เฉพาะคีย์ overview เท่านั้น — เขียนคีย์อื่นไม่ได้แม้จะอยากเขียน

begin;

create or replace function lg_set_law_overview(p_law_id bigint, p_overview jsonb)
returns jsonb
language plpgsql
security invoker
as $$
declare
  v_result jsonb;
begin
  if p_overview is null or jsonb_typeof(p_overview) <> 'object' then
    raise exception 'overview ต้องเป็น JSON object';
  end if;

  update lg_laws
     set ai_summary = jsonb_set(coalesce(ai_summary, '{}'::jsonb), '{overview}', p_overview, true),
         ai_summary_at = now()
   where id = p_law_id
  returning ai_summary into v_result;

  if v_result is null then
    raise exception 'ไม่พบกฎหมาย id=%', p_law_id;
  end if;
  return v_result;
end;
$$;

comment on function lg_set_law_overview(bigint, jsonb) is
  'เติมเฉพาะคีย์ overview ใน lg_laws.ai_summary ด้วย jsonb_set — คีย์เดิม (law/requirements/meta) คงอยู่ครบเสมอ (P22 ขั้นที่ 5 · กติกา 9.4)';

grant execute on function lg_set_law_overview(bigint, jsonb) to anon, authenticated;

-- ── มุมมองรวม (กติกา 9.6) — ดูได้ว่าฉบับไหนมีสรุปภาพรวมแล้ว ────────────────
create or replace view lg_law_overview_view as
select l.id                                          as law_id,
       l.code, l.cat, l.name,
       l.ai_summary -> 'overview'                    as overview,
       (l.ai_summary ? 'overview')                   as has_overview,
       (l.ai_summary ? 'requirements')               as has_req_summary,
       jsonb_array_length(coalesce(l.ai_summary #> '{overview,read_together}', '[]'::jsonb)) as read_together_count,
       jsonb_array_length(coalesce(l.ai_summary #> '{overview,duty_groups}',  '[]'::jsonb)) as duty_group_count,
       l.ai_summary_at
  from lg_laws l;

comment on view lg_law_overview_view is
  'สถานะสรุปภาพรวมรายฉบับ — read_together_count = จำนวนเรื่องที่ต้องอ่านหลายมาตราประกอบกัน (P22 ขั้นที่ 5)';

commit;

-- DOWN
-- drop view if exists lg_law_overview_view;
-- drop function if exists lg_set_law_overview(bigint, jsonb);
