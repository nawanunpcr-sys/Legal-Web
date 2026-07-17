-- P10 · Task 7 — แจ้งเตือนส่งรายงานราชการล่วงหน้า 30 วัน.
-- เพิ่มฟิลด์ report_due_date บนกฎหมาย + pg_cron รายวันเพื่อบันทึกการแจ้งเตือนลง
-- lg_notification_log (ระบบ bell เดิม). Bell ใน UI คำนวณฝั่ง client ตอนโหลดแอปด้วย
-- (App.jsx bellNotifications) — cron นี้ทำหน้าที่ persist/audit เพิ่มเติม.

alter table lg_laws add column if not exists report_due_date date;

-- ฟังก์ชัน: บันทึกแจ้งเตือนสำหรับกฎหมายที่เหลือ ≤ 30 วันก่อนครบกำหนดส่งรายงาน
-- (กันซ้ำ: ไม่เพิ่มถ้ามีแถวที่ยังไม่ dismiss ของกฎหมายเดียวกันภายใน 20 ชม.)
create or replace function lg_notify_report_due() returns void language plpgsql as $fn$
begin
  insert into lg_notification_log (type, ref_id, ref_type, message, due_date)
  select 'report_due_law', l.id, 'law',
         l.code || ' ใกล้ครบกำหนดส่งรายงานราชการ (' || to_char(l.report_due_date, 'DD/MM/YYYY') || ')',
         l.report_due_date
  from lg_laws l
  where l.report_due_date is not null
    and l.status <> 'repealed'
    and l.report_due_date between current_date and current_date + interval '30 days'
    and not exists (
      select 1 from lg_notification_log n
      where n.type = 'report_due_law' and n.ref_id = l.id and n.dismissed_at is null
        and n.created_at > now() - interval '20 hours'
    );
end $fn$;

-- ตั้ง cron รายวัน 08:00 (ถ้ายังไม่มี)
do $do$ begin
  if not exists (select 1 from cron.job where jobname = 'lg-report-due-daily') then
    perform cron.schedule('lg-report-due-daily', '0 8 * * *', $cron$select lg_notify_report_due();$cron$);
  end if;
end $do$;

-- ── DOWN ────────────────────────────────────────────────────────────────────
-- select cron.unschedule('lg-report-due-daily');
-- drop function if exists lg_notify_report_due();
-- alter table lg_laws drop column if exists report_due_date;
