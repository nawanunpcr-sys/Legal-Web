-- 017_sync_f259_2569r1.sql — ซิงก์ทะเบียน F-259 รอบที่ 1 ปี 2569 (สร้างอัตโนมัติโดย scripts/sync_f259.py)
-- ปลอดภัยต่อข้อมูลผู้ใช้:
--   • lg_laws: upsert on conflict (cat, code) — อัปเดตเฉพาะฟิลด์ทะเบียน (ชื่อ/กระทรวง/วันที่/สถานะ)
--     ไม่แตะ review_date, active, หรือฟิลด์อื่นที่ผู้ใช้แก้ในแอป
--   • lg_requirements: insert เฉพาะกฎหมายที่ 'ยังไม่มีข้อกำหนดในฐาน' เท่านั้น
--     (กฎหมายเดิมที่ผู้ใช้ประเมิน C/NC หรือแนบหลักฐานไว้แล้ว จะไม่ถูกเขียนทับ)
--   • ไม่แตะ lg_attachments / lg_process_tracker / lg_requirements.evaluated_* / evidence

begin;

-- (0) หมวดใหม่ CCS
insert into lg_categories (code, name, color, sort_order) values
  ('CC', 'CCS (คุ้มครองข้อมูลส่วนบุคคล/ไซเบอร์)', '#00b3a4', 80)
on conflict (code) do update set name = excluded.name;

-- (1) upsert กฎหมายทั้งหมด
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-001', 'กระทรวงแรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน  เรื่อง แบบการแจ้งการดำเนินการหรือส่งเอกสารตามมาตรฐานในการบริหารและการจัดการด้านความปลอดภัยอาชีวอนามัย และสภาพแวดล้อมในการทำงานทางสื่ออิเล็กทรอนิกส์ พ.ศ.2553', 'ประกาศ : 17 มีนาคม 2553
บังคับใช้ : 18 มีนาคม 2553', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-002', 'กระทรวงแรงงาน', 'พระราชบัญญัติ ความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน พ.ศ. ๒๕๕๔', '17/01/1954', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-003', 'กระทรวงสาธารณสุข', 'ประกาศคณะกรรมการการแพทย์ฉุกเฉิน เรื่อง กำหนดให้การใช้เครื่องฟื้นคืนคลื่นหัวใจด้วยไฟฟ้าแบบอัตโนมัติเป็นการปฐมพยาบาล พ.ศ. 2558', 'ประกาศ 22 เม.ย. 58', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-004', 'กระทรวงแรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง กำหนดแบบและวิธีการแจ้งการเกิดอุบัติภัยร้ายแรง หรือลูกจ้างประสบอันตรายจากการทำงานและการส่งสำเนาหนังสือแจ้งการประสบอันตรายหรือเจ็บป่วยต่อสำนักงานประกันสังคมตามกฎหมายว่าด้วยเงินทดแทน ทางสื่ออิเล็กทรอนิกส์', '05/10/1959', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-005', 'กระทรวงสาธารณสุข', 'กฎกระทรวง ควบคุมสถานประกอบกิจการที่เป็นอันตรายต่อสุขภาพ พ.ศ. 2560', '04/08/1960', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-006', 'กระทรวงแรงงาน', 'กฎกระทรวง กำหนดมาตรฐานเกี่ยวกับระบบการจัดการด้านความปลอดภัย พ.ศ. ๒๕๖๕', 'วันที่ประกาศในราชกิจจานุเบกษา  11 เม.ย. 65
บังคับใช้วันที่ 11 มิ.ย. 65', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-007', NULL, 'กฎกระทรวง การจัดให้มีเจ้าหน้าที่ความปลอดภัยในการทำงาน บุคลากร หน่วยงาน หรือคณะบุคคลเพื่อดำเนินการด้านความปลอดภัย ในสถานประกอบกิจการ พ.ศ. 2565', 'ประกาศ. ๑๗ มิถุนายน ๒๕๖๕
บังคับใช้ 17 ส.ค. 65', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-008', 'กระทรวงแรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง สัญลักษณ์เตือนอันตราย เครื่องหมายเกี่ยวกับความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน และข้อความแสดงสิทธิและหน้าที่ของนายจ้างและลูกจ้าง พ.ศ. 2554', 'ประกาศ:30พฤศจิกายน2554
บังคับใช้: 30 พฤศจิกายน 2554', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-009', 'กระทรวงแรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน
เรื่อง การแจ้งการขึ้นทะเบียน การพ้นจากตาแหน่งหรือพ้นจากหน้าที่
ของเจ้าหน้าที่ความปลอดภัยในการทางาน และผู้บริหารหน่วยงานความปลอดภัย', 'ประกาศ 10 ต.ค. 65', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-010', 'กระทรวงแรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน
เรื่อง การฝึกอบรมหรือการพัฒนาความรู้ของเจ้าหน้าที่ความปลอดภัยในการท างานระดับเทคนิค
ระดับเทคนิคขั้นสูง และระดับวิชาชีพ เกี่ยวกับความปลอดภัยในการทำงานเพิ่มเติม', 'ประกาศ 26 ต.ค. 65
บังคับใช้ ศ 27 ต.ค. 65', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-011', 'กระทรวงแรงงาน', 'ประกาศกระทรวงอุตสาหกรรมฉบับที่ 2 (พ.ศ.2513) ออกตามความในพระราชบัญญัติโรงงาน พ.ศ. 2512', NULL, 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-012', 'กระทรวงแรงงาน', 'กฎกระทรวง  ว่าด้วยการจัดสวัสดิการในสถานประกอบกิจการ  พ.ศ. 2548            ประกาศ :29  มีนาคม  2548บังคับใช้ :25  กันยายน  2548', NULL, 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-013', 'กระทรวงแรงงาน', 'กฎกระทรวง กำหนดอัตราน้ำหนักที่นายจ้างให้ลูกจ้างทำงานได้ พ.ศ. 2547', 'ประกาศ : 10 มิถุนายน 2547
 บังคับใช้ : 7 ธันวาคม 2547', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-014', NULL, 'กฎกระทรวงฉบับที่ 2 (พ.ศ. 2541) ออกตามความในพระราชบัญญัติคุ้มครอง แรงงาน พ.ศ. 2541             ประกาศ : 19 สิงหาคม 2541บังคับใช้ : 19 สิงหาคม 2541', NULL, 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-015', NULL, 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง กำหนดมาตรฐานอุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคล  พ.ศ. 2554', 'ประกาศ: 27 กันยายน 2554บังคับใช้ : 28 กันยายน 2554', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-016', NULL, 'ประกาศกระทรวง อุตสาหกรรมฉบับที่ 4349 (พ.ศ. 2554)ออกตามความในระราชบัญญัติมาตรฐานลิตภัณฑ์อุตสาหกรรม พ.ศ. 2511 เรื่อง ยกเลิกและ กำหนดมาตรฐานลิตภัณฑ์ ตสาหกรรมรองเท้าหนังนิรภัย 

แก้คำผิดประกาศกระทรวงอุตสาหกรรม  ฉบับที่ 4349 (พ.ศ. 2554) ออกตามความในพระราชบัญญัติมาตรฐานผลิตภัณฑ์อุตสาหกรรม พ.ศ. 2511  เรื่อง  ยกเลิกและกำหนดมาตรฐานผลิตภัณฑ์อุตสาหกรรม  รองเท้านิรภัย  ประกาศ ; 20 กุมภาพันธ์ 2556', 'ประกาศ:15 กันยายน 2554 บังคับ:270 วันนับจากประกาศ', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-017', NULL, 'ประกาศกระทรวง อุตสาหกรรมฉบับที่ 4386  (พ.ศ. 2554) ออกตามความในพระราชบัญญัติมาตรฐานผลิตภัณฑ์อุตสาหกรรม พ.ศ. 2511 เรื่อง ยกเลิกมาตรฐานผลิตภัณฑ์อุตสาหกรรม        สีและเครื่องหมายเพื่อความปลอดภัยเล่ม 1 สีและรูปแบบ เล่ม 2 สมบัติทางสีและแสงของวัสดุและกำหนด มาตรฐานผลิตภัณฑ์ อุตสาหกรรมสีและ เครื่องหมายเพื่อความ ปลอดภัย                   ประกาศ : 1 มีนาคม 2555      บังคับใช้ : 1 มีนาคม 2555', NULL, 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-018', NULL, 'ประกาศกระทรวงอุตสาหกรรม ฉบับที่ 4429 (พ.ศ. 2555) ออกตามความในพระราชบัญญัติมาตรฐานผลิตภัณฑ์ อุตสาหกรรม พ.ศ. 2511 เรื่อง กำหนดมาตรฐานผลิตภัณฑ์ อุตสาหกรรม หลักการและแนวทางการบริหารความเสี่ยง( 24 สิงหาคม 2555)', NULL, 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-019', NULL, 'พระราชบัญญัติเงินทดแทน (ฉบับที่ 2) พ.ศ. 2561', NULL, 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-020', NULL, 'ประกาศกรมสวัสดิการและคุ้มครองแรงงานเรื่องกำหนดแบบแจ้งการเกิดอุบัติภัย ร้ายแรง หรือการประสบอันตรายจากการ ทำงาน   พ.ศ. 2554', 'ประกาศ: 19 ตุลาคม 2554  บังคับใช้: 19 ตุลาคม 2554', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-022', NULL, 'ประกาศกระทรวงอุตสาหกรรม ฉบับที่ 5114 (พ.ศ. 2561) ออกตามความในพระราชบัญญัติมาตรฐานผลิตภัณฑ์อุตสาหกรรม พ.ศ. 2511 เรื่อง กำหนดมาตรฐานผลิตภัณฑ์อุตสาหกรรมระบบการจัดการอาชีวอนามัยและความปลอดภัย  – ข้อกำหนดและข้อแนะนำในการใช้', NULL, 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-023', 'กระทรวงแรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง การฝึกอบรมหรือการพัฒนาความรู้ของเจ้าหน้าที่ความปลอดภัยในการทำงานระดับเทคนิค ระดับเทคนิคขั้นสูง และระดับวิชาชีพ เกี่ยวกับความปลอดภัยในการทำงาน', 'ประกาศ 26  ตุลาคม พ.ศ. 2565  
บังคับใช้ตั้งแต่วันที่ 27 ตุลาคม พ.ศ. 2565', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-024', 'กระทรวงแรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง แบบรายงานผลการดำเนินงานของเจ้าหน้าที่ความปลอดภัยในการทำงานระดับเทคนิค ระดับเทคนิคขั้นสูง และระดับวิชาชีพ', '06/10/2565', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-025', 'กระทรวงแรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง การแจ้งการขึ้นทะเบียน การพ้นจากตำแหน่งหรือพ้นจากหน้าที่ของเจ้าหน้าที่ความปลอดภัยในการทำงาน และผู้บริหารหน่วยงานความปลอดภัย', '06/10/2565', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-026', 'กระทรวงสาธารณสุข', 'ประกาศกระทรวงสาธารณสุข เรื่อง การแจ้งและการรายงานในกรณีพบผู้ซึ่งเป็นหรือมีเหตุอันควรสงสัยว่าเป็น โรคจากการประกอบอาชีพหรือโรคจากสิ่งแวดล้อม พ.ศ. ๒๕๖๕', '19/12/1965', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-027', 'กระทรวงแรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน
เรื่อง หลักสูตรการฝึกอบรม คุณสมบัติวิทยากร และการดำเนินการฝึกอบรมเจ้าหน้าที่ความปลอดภัย
ในการทำางานระดับหัวหน้างานและระดับบริหาร', 'ประกาศ 27 กุมภาพันธ์ 2566
บังคับใช้ 28 กุมภาพันธ์ 2566', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-028', 'กระทรวงแรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง หลักสูตรการฝึกอบรม คุณสมบัติวิทยากร และการดำเนินการฝึกอบรมคณะกรรมการความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงานของสถานประกอบกิจการ และผู้บริหารหน่วยงานความปลอดภัย', 'ประกาศ  30 มีนาคม 2566
บังคับใช้  31 มีนาคม 2566', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-029', 'กระทรวงแรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง  การแจ้งกำหนดการให้บริการ  และการรายงานสรุปผลการให้บริการด้านความปลอดภัย     อาชีวอนามัย  และสภาพแวดล้อมในการทำงาน  ของผู้รับใบสำคัญและผู้รับใบอนุญาต', 'ประกาศ 7 กันยายน   2566
บังคับใช้ 8 กันยายน   2566', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-030', 'กระทรวงแรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง หลักเกณฑ์ วิธีการ และเงื่อนไขการฝึกอบรมผู้บริหาร หัวหน้างาน และลูกจ้างด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อม ในการทำงาน (ฉบับที่ 2)', 'ประกาศ 26 กันยายน   2566
บังคับใช้ 27 กันยายน   2566', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-031', 'กระทรวงแรงงาน', 'กฎกระทรวงการอนุญาตเป็นผู้ชำนาญการด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน พ.ศ. 2567', 'วันที่ประกาศใช้ : 14/11/2567
วันที่บังคับใช้ : 12/5/2568', 'bad')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-032', 'กระทรวงแรงงาน', 'ประกาศกระทรวงแรงงาน เรื่อง การประเมินอันตราย การศึกษาผลกระทบของสภาพแวดล้อมในการทำงานและการจัดทำแผนควบคุมดูแลลูกจ้างและสถานประกอบกิจการ', 'วันที่ประกาศใช้ : 22/11/2567
วันที่บังคับใช้ : 23/5/2568', 'bad')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-033', 'กระทรวงแรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง การเทียบเท่าวุฒิการศึกษาไม่ต่ำกว่าปริญญาตรีสาขาอาชีวอนามัยและความปลอดภัย​ พ.ศ.2568', 'วันที่ประกาศใช้ : 09/01/2568 ​
วันที่บังคับใช้     : 10/01/2568 ​', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-034', 'กระทรวงอุตสาหกรรม', 'ประกาศกระทรวงอุตสาหกรรม เรื่อง กำหนดมาตรฐานผลิตภัณฑ์อุตสาหกรรม เครื่องดับเพลิงยกหิ้ว : คาร์บอนไดออกไซด์ พ.ศ.2568', 'วันที่ประกาศใช้ : 21/01/2568
วันที่บังคับใช้ : 20/05/2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-035', 'กระทรวงสาธารณสุข', 'ประกาศกรมควบคุมโรค เรื่อง กำหนดแบบการแจ้ง การรับแจ้ง การรายงาน และวิธีการแจ้งและการรายงานเพิ่มเติม ในกรณีพบผู้ซึ่งเป็นหรือมีเหตุอันควรสงสัยว่าเป็นโรคจากการประกอบอาชีพหรือโรคจากสิ่งแวดล้อม พ.ศ. 2568 (กฏหมายฉบับเพิ่มเติม)', 'วันที่ประกาศใช้ : 01/10/2568
วันที่บังคับใช้ : 02/10/2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-036', 'กระทรวงสาธารณสุข', 'ประกาศกระทรวงสาธารณสุข เรื่อง ชื่อหรืออาการสำคัญของโรคจากการประกอบอาชีพ พ.ศ. 2568', 'วันที่ประกาศใช้ : 31/10/2568
วันที่บังคับใช้ : 01/11/2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-037', 'กระทรวงสาธารณสุข', 'ประกาศกระทรวงสาธารณสุข เรื่อง ชื่อหรืออาการสำคัญของโรคจากสิ่งแวดล้อม  พ.ศ. 2568', 'วันที่ประกาศใช้ : 31/10/2568
วันที่บังคับใช้ : 01/11/2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-038', 'กระทรวงทรัพยากรธรรมชาติและสิ่งแวดล้อม', 'ประกาศคณะกรรมการสิ่งแวดล้อมแห่งชาติ เรื่อง กำหนดมาตรฐานคุณภาพอากาศในบรรยากาศโดยทั่วไป พ.ศ. 2569', 'วันที่ประกาศใช้ : 21/01/2569', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-039', 'สวัสดิการและคุ้มครองแรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง ข้อความแสดงสิทธิและหน้าที่ของนายจ้างและลูกจ้าง สัญลักษณ์เตือนอันตราย และเครื่องหมายเกี่ยวกับความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน', 'ประกาศวันที่		
1 พฤษภาคม 2569
มีผลบังคับใช้วันที่
	1 กรกฎาคม 2569', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-040', 'สวัสดิการและคุ้มครองแรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง แบบคำขอ ใบรับคำขอ ใบอนุญาต และใบแทนใบอนุญาตเป็นผู้ชำนาญการด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน', 'ประกาศวันที่		
1 พฤษภาคม 2569
มีผลบังคับใช้วันที่
	1 กรกฎาคม 2569', 'bad')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-041', 'สวัสดิการและคุ้มครองแรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง หลักสูตรการฝึกอบรม คุณสมบัติของวิทยากร การดำเนินการฝึกอบรม และการประเมินผู้ชำนาญการด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน', 'ประกาศวันที่		
1 พฤษภาคม 2569
มีผลบังคับใช้วันที่
	1 กรกฎาคม 2569', 'bad')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-042', 'สวัสดิการและคุ้มครองแรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง แบบแจ้งกำหนดการ และแบบรายงานสรุปผลการปฏิบัติงานของผู้ชำนาญการด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน', 'ประกาศวันที่ 
1 พฤษภาคม 2569 
มีผลบังคับใช้วันที่ 
2 พฤษภาคม 2569', 'bad')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LA', 'LA-043', 'สาธารณสุข', 'ประกาศกระทรวงสาธารณสุข เรื่อง ชื่อและอาการสำคัญของโรคติดต่ออันตราย (ฉบับที่ 5) พ.ศ. 2569', 'ประกาศวันที่ 
15 พฤษภาคม 2569 
มีผลบังคับใช้วันที่ 
16 พฤษภาคม 2569', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status, repeal_reason) values
  ('LA', 'LA-R01', NULL, 'กฎกระทรวง กำหนดมาตรฐานในการบริหารและการจัดการด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน พ.ศ. ๒๕๔๙', NULL, 'repealed', 'ยกเลิกตามทะเบียน F-259 (ส่วนกฎหมายที่ยกเลิก)')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name, issue_date = excluded.issue_date,
  status = 'repealed', repeal_reason = excluded.repeal_reason, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status, repeal_reason) values
  ('LA', 'LA-R02', 'กระทรวงแรงงาน', 'กฎกระทรวง กำหนดมาตรฐานในการบริหารและการจัดการด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน พ.ศ. ๒๕๔๙ (ต่อ)', NULL, 'repealed', 'ยกเลิกตามทะเบียน F-259 (ส่วนกฎหมายที่ยกเลิก)')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name, issue_date = excluded.issue_date,
  status = 'repealed', repeal_reason = excluded.repeal_reason, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status, repeal_reason) values
  ('LA', 'LA-021', NULL, 'ประกาศกระทรวงสาธารณสุข เรื่อง ชื่อหรืออาการสำคัญของโรคจากสิ่งแวดล้อม พ.ศ. 2563', NULL, 'repealed', 'ยกเลิกตามทะเบียน F-259 (ส่วนกฎหมายที่ยกเลิก)')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name, issue_date = excluded.issue_date,
  status = 'repealed', repeal_reason = excluded.repeal_reason, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status, repeal_reason) values
  ('LA', 'LA-008-R', 'กระทรวงแรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง สัญลักษณ์เตือนอันตราย เครื่องหมายเกี่ยวกับความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน และข้อความแสดงสิทธิและหน้าที่ของนายจ้างและลูกจ้าง พ.ศ. 2554', 'ประกาศ:30พฤศจิกายน2554
บังคับใช้: 30 พฤศจิกายน 2554', 'repealed', 'ยกเลิกตามทะเบียน F-259 (ส่วนกฎหมายที่ยกเลิก)')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name, issue_date = excluded.issue_date,
  status = 'repealed', repeal_reason = excluded.repeal_reason, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status, repeal_reason) values
  ('LA', 'LA-022-R', NULL, 'ประกาศกระทรวงสาธารณสุข เรื่อง ชื่อหรืออาการสำคัญของโรคจากสิ่งแวดล้อม2563', NULL, 'repealed', 'ยกเลิกตามทะเบียน F-259 (ส่วนกฎหมายที่ยกเลิก)')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name, issue_date = excluded.issue_date,
  status = 'repealed', repeal_reason = excluded.repeal_reason, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status, repeal_reason) values
  ('LA', 'LA-023-R', NULL, 'ประกาศกระทรวงสาธารณสุข เรื่อง ชื่อหรืออาการสำคัญของโรคจากสิ่งแวดล้อม (ฉบับที่ 2) พ.ศ. 2565 (ลงวันที่ 7 มีนาคม 2565)', NULL, 'repealed', 'ยกเลิกตามทะเบียน F-259 (ส่วนกฎหมายที่ยกเลิก)')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name, issue_date = excluded.issue_date,
  status = 'repealed', repeal_reason = excluded.repeal_reason, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LB', 'LB-001', 'กระทรวงพลังงาน', 'พระราชบัญญัติควบคุมน้ำมันเชื้อเพลิง พ.ศ.2542', 'ประกาศ : 2 ธันวาคม 2542', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LB', 'LB-003', NULL, 'ประกาศคณะกรรมการส่งเสริมการพัฒนาฝีมือแรงงาน เรื่อง วิธีการทดสอบมาตรฐานฝีมือแรงงาน และการออกหนังสือรับรองว่าเป็นผู้ผ่านการทดสอบ มาตรฐานฝีมือแรงงานแห่งชาติ สาขาอาชีพช่างไฟฟ้า เล็กทรอนิกส์และคอมพิวเตอร์ สาขาช่างไฟฟ้าภายในอาคารระดับ 1', '23 ธันวาคม พ.ศ. 2552', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LB', 'LB-004', 'กระทรวงอุตสาหกรรม', 'ประกาศกระทรวงอุตสาหกรรม  ฉบับที่ 4474  (พ.ศ. 2555)  ออกตามความในพระราชบัญญัติมาตรฐานผลิตภัณฑ์อุตสาหกรรม  พ.ศ. 2511 เรื่อง กำหนดมาตรฐานผลิตภัณฑ์อุตสาหกรรม  เต้าเสียบและเต้ารับสำหรับใช้ในที่อยู่อาศัยและงานทั่วไปที่มีจุดประสงค์คล้ายกัน : เต้ารับ  ประกาศ : 16 มกราคม 2556', '16/01/2556', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LB', 'LB-005', 'กระทรวงพลังงาน', 'กฎกระทรวงกำหนดหลักเกณฑ์ วิธีการและเงื่อนไขเกี่ยวกับการแจ้ง การอนุญาตและอัตราค่าธรรมเนียมเกี่ยวกับการประกอบกิจการน้ำมันเชื้อเพลิง พ.ศ.2556', 'ประกาศ:27 มีนาคม 2556 บังคับใช้:27 กันยายน  2556', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LB', 'LB-006', 'กระทรวงแรงงาน', 'กฎกระทรวงกำหนดมาตรฐานในการบริหาร จัดการ และดำเนินการด้านความปลอดภัย อาชีวอนามัยและสภาพแวดล้อมในการทำงานเกี่ยวกับไฟฟ้าพ.ศ. 2558
กฎกระทรวงกำหนด มาตรฐานในการบริหารและการจัดการด้านความ ปลอดภัย อาชีวอนามัยและสภาพแวดล้อมในการทำงานเกี่ยวกับไฟฟ้าพ.ศ. 2554
ประกาศใช้:21 มกราคม2554 บังคับใช้:21กรกฎาคม 2554', 'ประกาศ: 6 กุมภาพันธ์ 2558', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LB', 'LB-008', 'กระทรวงแรงงาน', 'ประกาศกระทรวงแรงงาน เรื่อง กำหนดสาขาอาชีพ ที่อาจเป็นอันตรายต่อสาธารณะ
ซึ่งต้องดำเนินการโดยผู้ได้รับหนังสือรับรองความรู้ความสามารถ', 'ประกาศ : 27 ตุลาคม 2558', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LB', 'LB-009', 'กระทรวงแรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง หลักเกณฑ์ วิธีการ และเงื่อนไขการฝึกอบรมความปลอดภัยในการทำงานเกี่ยวกับไฟฟ้า สำหรับลูกจ้างซึ่งปฏิบัติงานเกี่ยวกับไฟฟ้า 2558

ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง หลักเกณฑ์ วิธีการ และเงื่อนไขการฝึกอบรมความปลอดภัยในการทำงานเกี่ยวกับไฟฟ้าสำหรับลูกจ้างซึ่งปฏิบัติงานเกี่ยวกับไฟฟ้า (ฉบับที่ 2) 2559', '30 ธันวาคม 2558
และฉบับที่ 2  : 29 พฤศจิกายน 2559', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LB', 'LB-010', 'กระทรวงแรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง หลักเกณฑ์ วิธีการ และเงื่อนไขการฝึกอบรมความปลอดภัยในการทำงานเกี่ยวกับไฟฟ้า สำหรับลูกจ้างซึ่งปฏิบัติงานเกี่ยวกับไฟฟ้า 
(ฉบับที่ 2)', '24 ธันวาคม พ.ศ. 2558', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LB', 'LB-011', 'กรมพัฒนาพลังงานทดแทนและอนุรักษ์พลังงาน กระทรวงพลังงาน', 'ประกาศ กรมพัฒนาและส่งเสริมพลังงาน พ.ศ. 2535 เรื่อง การมีเครื่องกำเนิดไฟฟ้าอยู่ในครอบครอง', '31/03/2559', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LB', 'LB-012', 'การไฟฟ้านครหลวง', 'MEA หลักเกณฑ์การติดตั้งสายสื่อสารบนเสาการไฟฟ้านครหลวง 2566', '28/06/1966', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LB', 'LB-013', 'การไฟฟ้าส่วนภูมิภาค', 'PEA  ระเบียบการไฟฟ้าส่วนภูมิภาค ว่าด้วยหลักเกณฑ์การพาดสายและหรือติดตั้งสายสื่อสารโทรคมนาคมบนเสาการไฟฟ้าส่วนภูมิภาค 2566', '01/11/1966', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LB', 'LB-015', 'พัฒนาฝีมือแรงงาน', 'ประกาศคณะกรรมการส่งเสริมการพัฒนาฝีมือแรงงาน เรื่อง คุณสมบัติของผู้เข้ารับการทดสอบ สาขาอาชีพช่างไฟฟ้า อิเล็กทรอนิกส์และคอมพิวเตอร์ สาขาช่างไฟฟ้าภายในอาคาร', '08/03/2562', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LB', 'LB-016', 'พัฒนาฝีมือแรงงาน', 'ประกาศคณะกรรมการส่งเสริมการพัฒนาฝีมือแรงงาน เรื่อง วิธีการทดสอบมาตรฐานฝีมือแรงงานแห่งชาติ และการออกหนังสือรับรองว่าเป็นผู้ผ่านการทดสอบมาตรฐานฝีมือแรงงานแห่งชาติ สาขาอาชีพช่างไฟฟ้า อิเล็กทรอนิกส์และคอมพิวเตอร์ สาขาช่างไฟฟ้าภายในอาคาร ระดับ 2', '27/09/2565', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LB', 'LB-017', 'กระทรวงพลังงาน', 'กฎกระทรวงสถานที่เก็บรักษาน้ำมัน พ.ศ. 2567

ยกเลิก
1. กฎกระทรวงสถานที่เก็บรักษาน้ำมันเชื้อเพลิง พ.ศ. 2551
2. กฎกระทรวงสถานที่เก็บรักษาน้ำมันเชื้อเพลิง (ฉบับที่ 2) พ.ศ. 2560', '22/02/1967', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LB', 'LB-018', 'กระทรวงพลังงาน', 'ประกาศกรมธุรกิจพลังงาน เรื่อง การลงทะเบียนใช้งานระบบรับแจ้งและอนุญาตให้ประกอบกิจการตามกฎหมายว่าด้วยการควบคุมน้ำมันเชื้อเพลิงโดยวิธีการทางอิเล็กทรอนิกส์ (SAFETY) พ.ศ. 2567 
(ลงประกาศ 19 มิถุนายน 2567)', '04/06/2567', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LB', 'LB-019', 'กระทรวงแรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง หลักเกณฑ์ วิธีการ และเงื่อนไขการจัดทำบันทึกผลการตรวจสอบและรับรองระบบไฟฟ้าและบริภัณฑ์ไฟฟ้า​ พ.ศ.2568', 'วันที่ประกาศใช้  : 13/01/2568 ​

วันที่บังคับใช้      : 14/01/2568 ​', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status, repeal_reason) values
  ('LB', 'LB-002', 'กระทรวงพลังงาน', 'กฎกระทรวง สถานที่เก็บรักษาน้ำมันเชื้อเพลิง พ.ศ. ๒๕๕๑', 'ประกาศ 14 มี.ค. 51
บังคับใช้ 14 มิ.ย. 51', 'repealed', 'ตรวจสอบทราย
จัดซื้อวัสดุดูดซับมาเรียบร้อยแล้ว')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name, issue_date = excluded.issue_date,
  status = 'repealed', repeal_reason = excluded.repeal_reason, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status, repeal_reason) values
  ('LB', 'LB-014', 'กระทรวงพลังงาน', 'กฎกระทรวงสถานที่เก็บรักษาน้ำมันเชื้อเพลิง (ฉบับที่ 2) พ.ศ. 2560', '12/10/2560', 'repealed', '-แผนการตรวจสอบถังน้ำมัน ต.ค. 67 ตาม Memo No.	
DO 67/01380')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name, issue_date = excluded.issue_date,
  status = 'repealed', repeal_reason = excluded.repeal_reason, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status, repeal_reason) values
  ('LB', 'LB-007', 'กระทรวงแรงงาน', 'ประกาศกรมสวัสดิการ หลักเกณฑ์ วิธีการ และเงื่อนไขการจัดทำบันทึกผลการตรวจสอบและรับรองระบบไฟฟ้าและบริภัณฑ์ไฟฟ้า 2558', '30/12/2558', 'repealed', 'ตรวจไฟฟ้าเป็นไปตามแผน')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name, issue_date = excluded.issue_date,
  status = 'repealed', repeal_reason = excluded.repeal_reason, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LC', 'LC-001', 'กระทรวงอุตสาหกรรม', 'ประกาศกระทรวงอุตสาหกรรม
เรื่อง การป้องกันและระงับอัคคีภัยในโรงงาน
พ.ศ. 2552  (หน่วยงานบังคับใช้: กระทรวงแรงงาน/กรมสวัสดินการและคุ้มครองแรงงาน)', '30/09/1952', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LC', 'LC-002', 'กระทรวงอุตสาหกรรม', 'ประกาศกระทรวงอุตสาหกรรม ฉบับที่ 4411 (พ.ศ. 2555) ออกตามความในพระราชบัญญัติมาตรฐานผลิตภัณฑ์ อุตสาหกรรม พ.ศ. 2511 เรื่อง กำหนดมาตรฐานผลิตภัณฑ์ อุตสาหกรรม การจัดการหน่วยดับเพลิงสำหรับสถานประกอบการ', '03/04/2555', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LC', 'LC-003', 'กระทรวงแรงงาน', 'กฎกระทรวง กำหนดมาตรฐานในการบริหาร จัดการ และดำเนินการด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงานเกี่ยวกับการป้องกันและระงับอัคคีภัย พ.ศ. ๒๕๕๕', '09/01/2556', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LC', 'LC-004', 'กระทรวงแรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง กำหนดมาตรฐานเครื่องดับเพลิงแบบเคลื่อนย้ายได้', '12/03/2556', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LC', 'LC-005', NULL, 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง กำหนดแบบรายงานผลการฝึกซ้อมดับเพลิงและฝึกซ้อมอพยพหนีไฟ', '12/03/2556', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LC', 'LC-006', NULL, 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง กำหนดแบบและวิธีการรายงานผลการฝึกซ้อมดับเพลิงและฝึกซ้อมอพยพ
หนีไฟทางสื่ออิเล็กทรอนิกส์', '05/10/2559', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LC', 'LC-007', 'กระทรวงอุตสาหกรรม', 'ประกาศกระทรวงอุตสาหกรรม ฉบับที่ 4887 (พ.ศ. 2559) 
ออกตามความในระราชบัญญัติมาตรฐานผลิตภัณฑ์อุตสาหกรรม พ.ศ. 2511 เรื่อง กำหนดมาตรฐานผลิตภัณฑ์
อุตสาหกรรม ข้อกำหนดในการป้องกันอัคคีภัย เล่ม 7 ศูนย์สั่งการดับเพลิงในอาคาร', '15/12/1959', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LC', 'LC-008', 'กระทรวงแรงงาน', 'กฎกระทรวง กำหนดมาตรฐานในการบริหาร จัดการ และดำเนินการด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงานเกี่ยวกับการป้องกันและระงับอัคคีภัย (ฉบับที่ 2) พ.ศ. 2561', '15/08/1961', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LC', 'LC-009', 'กระทรวงอุตสาหกรรม', 'ประกาศกระทรวงอุตสาหกรรม ฉบับที่ 5404 (พ.ศ. 2562) ออกตามความในพระราชบัญญัติมาตรฐานผลิตภัณฑ์อุตสาหกรรม พ.ศ. 2511 เรื่อง กำหนดมาตรฐานผลิตภัณฑ์อุตสาหกรรมข้อกำหนดในการป้องกันอัคคีภัย เล่ม 8 การติดตั้งระบบส่งน้ำดับเพลิง', '06/01/2563', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LC', 'LC-010', 'กระทรวงแรงงาน', 'กฎกระทรวงการขึ้นทะเบียนและการอนุญาตให้บริการเพื่อส่งเสริมความปลอดภัย
อาชีวอนามัย และสภาพแวดล้อมในการท างาน
พ.ศ. ๒๕๖๔
ยกเลิกกฎกระทรวง
การเป็นหน่วยงานฝึกอบรมการดับเพลิงขั้นต้น
และการเป็นหน่วยงานฝึกซ้อมดับเพลิงและฝึกซ้อมอพยพหนีไฟ พ.ศ.2556', 'ประกาศ 19 มีนาคม 2564 
บังคับใช้ วันที่ 26 กันยายน 2564', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LC', 'LC-011', 'กระทรวงอุตสาหกรรม', 'กฎกระทรวง ฉบับที่ 69 (พ.ศ. 2564) ออกตามความในพระราชบัญญัติควบคุมอาคาร พ.ศ. 2522', 'ประกาศ 4 มิ.ย. 2564 
บังคับใช้ วันที่ 4 ธ.ค. 64', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LD', 'LD-001', 'กระทรวงแรงงาน', 'กฎกระทรวงกำหนดมาตรฐานในการบริหาร จัดการ และดําเนินการด้านความปลอดภัย อาชีวอนามัย
และสภาพแวดล้อมในการทำงานเกี่ยวกับความร้อน แสงสว่าง และเสียง พ.ศ. ๒๕๕๙', 'ประกาศ 17 ต.ค. 59', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LD', 'LD-002', 'แรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน
เรื่อง หลักเกณฑ์ วิธีการตรวจวัด และการวิเคราะห์สภาวะการทำงานเกี่ยวกับระดับความร้อน แสงสว่าง หรือเสียง รวมทั้งระยะเวลาและประเภทกิจการที่ต้องดำเนินการ', '11/01/1965', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LD', 'LD-003', 'แรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน
เรื่อง หลักเกณฑ์ วิธีการตรวจวัด และการวิเคราะห์สภาวะการทำงานเกี่ยวกับระดับความร้อน
แสงสว่าง หรือเสียง รวมทั้งระยะเวลาและประเภทกิจการที่ต้องดำเนินการ  (ต่อ)', NULL, 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LD', 'LD-004', NULL, 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง หลักเกณฑ์และวิธีการจัดทำมาตรการอนุรักษ์การได้ยินในสถานประกอบกิจการ', 'ประกาศ 12 มิ.ย. 61
บังคับใช้ 13 มิ.ย. 61', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LD', 'LD-005', 'อุตสาหกรรม', 'ประกาศกระทรวง   อุตสาหกรรม เรื่องกำหนดค่าระดับเสียงการรบกวนและระดับเสียงที่เกิดจากการประกอบกิจการโรงงาน      พ.ศ. 2548', 'ประกาศ: 25 มกราคม 2549บังคับใช้: 26 มกราคม 2549', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LD', 'LD-006', 'อุตสาหกรรม', 'ประกาศกรมโรงงานอุตสาหกรรม เรื่อง วิธีการตรวจวัดระดับเสียงการรบกวน ระดับเสียงเฉลี่ย 24 ชั่วโมง และระดับเสียงสูงสุดที่เกิดจากการประกอบกิจการ โรงงาน  พ.ศ. 2553', 'ประกาศใช้ :7 มกราคม 2554 บังคับใช้ : 8 มกราคม 2554', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LD', 'LD-007', 'กระทรวงสาธารณสุข', 'ประกาศกระทรวงสาธารณสุข เรื่อง กำหนดค่ามาตรฐานมลพิษทางเสียงอันเกิดจากการประกอบกิจการที่เป็นอันตรายต่อสุขภาพ พ.ศ. 2561', 'ประกาศ 7 ธ.ค 61
บังคับใช้ 8 ธ.ค 61', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LD', 'LD-008', 'กระทรวงแรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง มาตรฐานความเข้มของแสงสว่าง', 'ประกาศ 21 ก.พ. 61
บังคับใช้ 22 ก.พ. 61', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LD', 'LD-009', 'กระทรวงแรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง การคำนวณระดับเสียงที่สัมผัสในหูเมื่อสวมใส่อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคล', 'ประกาศ 14 ก.พ. 61
บังคับใช้ 15 ก.พ. 61', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LD', 'LD-010', 'กระทรวงอุตสาหกรรม', 'ประกาศกระทรวงอุตสาหกรรม ฉบับที่ 4745 (พ.ศ. 2558) ออกตามความในพระราชบัญญัติมาตรฐานผลิตภัณฑ์อุตสาหกรรม พ.ศ.2511 เรื่องกำหนดมาตรฐานผลิตภัณฑ์อุตสาหกรรมการติดตั้งระบบการให้แสงสว่างฉุกเฉิน', '09/12/2558', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LD', 'LD-011', 'กระทรวงสาธารณสุข', 'ประกาศกระทรวงสาธารณสุข เรื่อง การแจ้งข้อมูลที่จำเป็นเกี่ยวกับ
การเฝ้าระวัง การป้องกัน และ
การควบคุมโรคจากการประกอบอาชีพแก่ลูกจ้าง พ.ศ. 2565', '23/3/2565
บังคับใช้ 23/3/66', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LD', 'LD-015', NULL, 'พระราชบัญญัติเงินทดแทน พ.ศ. 2537', NULL, 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LD', 'LD-013', 'กระทรวงแรงงาน', 'กฎกระทรวงกำหนดงานที่มีลักษณะอาจเป็นอันตรายต่อสุขภาพและความปลอดภัยของหญิงมีครรภ์หรือเด็กซึ่งมีอายุต่ำกว่าสิบห้าปี พ.ศ. 2560 ประกาศ : 18 พฤษภาคม 2560', 'ประกาศ : 18 พฤษภาคม 2560', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LD', 'LD-014', 'กระทรวงแรงงาน', 'ประกาศกระทรวงแรงงาน เรื่อง กำหนดชนิดของโรคซึ่งเกิดขึ้นตามลักษณะหรือสภาพของงานหรือเนื่องจากการทำงาน', '07/02/2566', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status, repeal_reason) values
  ('LD', 'LD-012', NULL, 'เรื่อง กำหนดชนิดของโรคซึ่งเกิดขึ้นตามลักษณะหรือสภาพของงานหรือเนื่องจากการทำงาน
ประกาศ: 15 สิงหาคม 2550', NULL, 'repealed', 'ยกเลิกตามทะเบียน F-259 (ส่วนกฎหมายที่ยกเลิก)')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name, issue_date = excluded.issue_date,
  status = 'repealed', repeal_reason = excluded.repeal_reason, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LE', 'LE-001', 'แรงงาน', 'กฎกระทรวงกำหนดมาตรฐานในการบริหาร จัดการ และดำเนินการด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงานเกี่ยวกับนั่งร้านและค้ำยัน พ.ศ. 2564', 'ประกาศ 1 มี.ค. 64 
บังคับ 1 มิ.ย.64', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LE', 'LE-002', 'แรงงาน', 'กฎกระทรวงกำหนดมาตรฐานในการบริหาร จัดการ และดำเนินการด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงานเกี่ยวกับงานก่อสร้าง พ.ศ. 2564', '2 มี.ค. 64
บังคับ 2 มิ.ย.64', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LE', 'LE-003', 'แรงงาน', 'กฎกระทรวงกำหนดมาตรฐานในการบริหาร จัดการ และดำเนินการด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน ในสถานที่ที่มีอันตรายจากการตกจากที่สูงและที่ลาดชัน จากวัสดุกระเด็น ตกหล่น และพังทลายและจากการตกลงไปในภาชนะเก็บหรือรองรับวัสดุ พ.ศ. 2564', '2 มี.ค. 64
บังคับ 2 มิ.ย.64', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LE', 'LE-004', 'แรงงาน', 'กฎกระทรวงกำหนดมาตรฐานในการบริหารและการจัดการด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงานในที่อับอากาศ พ.ศ. 2547
บังคับใช้ : 27 ตุลาคม 2547', 'บังคับใช้ : 27 ตุลาคม 2547', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LE', 'LE-005', 'แรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่องกำหนดแบบใบอนุญาตให้พนักงานเข้าทำงานในสถานที่อับอากาศ
บังคับใช้ : 29 กันยายน 2540', 'บังคับใช้ : 29 กันยายน 2540', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LE', 'LE-006', 'แรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่องกำหนดมาตรฐานอุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคล อุปกรณ์ช่วยเหลือและช่วยชีวิตสำหรับการทำงานในที่อับอากาศ
บังคับใช้ :  21 ตุลาคม 2548', 'บังคับใช้ :  21 ตุลาคม 2548', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LE', 'LE-007', 'แรงงาน', 'กฎกระทรวงกำหนดมาตรฐานในการบริหาร จัดการ และดำเนินการด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงานเกี่ยวกับที่อับอากาศ พ.ศ. 2562', '15/02/1962', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LE', 'LE-008', NULL, 'ประกาศคณะกรรมการกำหนดมาตรฐานด้านการตรวจสอบและรับรอง ฉบับที่ 1 (พ.ศ. 2561)ออกตามความในพระราชบัญญัติการมาตรฐาน แห่งชาติ พ.ศ. 2551 เรื่องกำหนดมาตรฐานการตรวจสอบและรับรองแห่งชาติข้อปฏิบัติการทำงานในที่อับอากาศ', '22 ก.พ. 62', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LE', 'LE-009', 'แรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง หลักเกณฑ์ วิธีการ และหลักสูตรการฝึกอบรมความปลอดภัยในการทำงานในที่อับอากาศ', '11 มี.ค. 64
บังคับ 11 เม.ย. 64', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LE', 'LE-10', NULL, 'กฎกระทรวงกำหนดมาตรฐานในการบริหาร จัดการ และดำเนินการด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงานเกี่ยวกับเครื่องจักร ปั้นจั่น และหม้อน้ำ พ.ศ. 2564', '6 ส.ค. 64
บังคับ 6 พ.ย. 64', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-001', 'สำนักงานคณะกรรมการกิจการกระจายเสียง กิจการโทรทัศน์ และกิจการโทรคมนาคมแห่งชาติ', 'พรบ.การประกอบกิจการโทรคมนาคม 2544', 'วันที่ประกาศใช้ : 16/11/2564
วันที่บังคับใช้ : 17/11/2564', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-002', 'สำนักงานคณะกรรมการกิจการกระจายเสียง กิจการโทรทัศน์ และกิจการโทรคมนาคมแห่งชาติ', 'ประกาศ กสทช. ข้อกำหนดด้านวิชาชีพวิศวกรสำหรับผู้รับใบอนุญาตประกอบกิจการโทรคมนาคม 3', 'วันที่ประกาศใช้ : 16/11/2564
วันที่บังคับใช้ : 17/11/2564', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-003', 'กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม, สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล', 'พรบ.ข้อมูลส่วนบุคคล 2562', 'วันที่ประกาศใช้ : 27/05/2562
วันที่บังคับใช้ : 1/06/2565', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-004', 'สำนักงานคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ', 'พรบ.การรักษาความมั่นคงปลอดภัยไซเบอร์', 'วันที่ประกาศใช้ : 27/05/2562
วันที่บังคับใช้ : 28/05/2562', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-005', 'ประกาศกระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม', 'พระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ พ.ศ.2550 และ พระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ (ฉบับที่ 2) พ.ศ. 2560 และ/หรือที่จะมีการแก้ไขเพิ่มเติมในภายหน้า', 'วันที่ประกาศใช้ : 24/01/2560
วันที่บังคับใช้ : 24/04/2560', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-006', 'ประกาศกระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม', 'ประกาศกระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม เรื่องหลักเกณฑ์ ระยะเวลา และวิธีการปฏิบัติสำหรับการระงีบการทำให้แพร่หลายหรือลบข้อมูลคอมพิวเตอร์ของพนักงานเจ้าหน้าที่หรือผู้ให้บริการ พศ 2560', 'วันที่ประกาศใช้ : 22/07/2560
วันที่บังคับใช้ : 23/07/2560', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-007', 'กระทรวงพาณิชย์, กรมทรัพย์สินทางปัญญา', 'พรบ. ลิขสิทธิ์ พ.ศ. 2537 แก้ไขเพิ่มเติมโดยพระราชบัญญัติลิขสิทธิ์ (ฉบับที่ 2) พ.ศ. 2558, พระราชบัญญัติลิขสิทธิ์ (ฉบับที่ 3) พ.ศ. 2558 และพระราชบัญญัติลิขสิทธิ์ (ฉบับที่ 4) พ.ศ. 2561', 'วันที่ประกาศใช้ : 9/12/2537
วันที่บังคับใช้ : 9/1/2538

(ฉบับที่ 4)
วันที่ประกาศใช้ : 11/11/2561
วันที่บังคับใช้ : 11/3/2562', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-008', 'กระทรวงพาณิชย์, กรมทรัพย์สินทางปัญญา', 'พรบ.ความลับทางการค้า พ.ศ. 2545 และ พรบ.ความลับทางการค้า (ฉบับที่ 2) พ.ศ. 2558', 'วันที่ประกาศใช้ : 12/04/2545
วันที่บังคับใช้ : 12/07/2545', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-009', 'กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม', 'ประกาศกระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม เรื่อง หลักเกณฑ์การเก็บรักษาข้อมูลจราจรทางคอมพิวเตอร์ของผู้ให้บริการ พ.ศ.  ประกาศวันที่ 2564', 'วันที่ประกาศใช้ : 13/08/2564
วันที่บังคับใช้ : 14/08/2564', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-010', 'สำนักงานคณะกรรมการกิจการกระจายเสียง กิจการโทรทัศน์ และกิจการโทรคมนาคมแห่งชาติ', 'ประกาศ กสทช. เรื่อง เงื่อนไขมาตรฐานในการอนุญาตประกอบกิจการโทรคมนาคม 2564', 'วันที่ประกาศใช้ : 6/07/2550
วันที่บังคับใช้ : -', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-011', 'สำนักงานคณะกรรมการกิจการกระจายเสียง กิจการโทรทัศน์ และกิจการโทรคมนาคมแห่งชาติ', 'ประกาศ กสทช. เรื่อง ประกาศคณะกรรมการกำกับดูแลด้านความมั่นคงปลอดภัยไซเบอร์ เรื่อง ประมวลแนวทางปฏิบัติและกรอบมาตรฐานด้านการรักษาความมั่นคงปลอดภัยไซเบอร์ สำหรับหน่วยงานของรัฐและหน่วยงานโครงสร้างพื้นฐานสำคัญทางสารสนเทศ พ.ศ. 2564', 'วันที่ประกาศใช้ : 6/09/2564
วันที่บังคับใช้ : 6/09/2565', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-012', 'สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล', 'ประกาศคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล เรื่อง มาตรการรักษาความมั่นคงปลอดภัยของผู้ควบคุมข้อมูลส่วนบุคคล พ.ศ. 2565', NULL, 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-013', 'กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม', 'ประกาศกระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม เรื่อง ขั้นตอนการแจ้งเตือน การระงับการทำให้แพร่หลายของข้อมูลคอมพิวเตอร์ และการนำข้อมูลคอมพิวเตอร์ออกจากระบบคอมพิวเตอร์ พ.ศ. 2565 แทนที่ประกาศฉบับเดิม (พ.ศ. 2560)', 'วันที่ประกาศใช้ : 26/10/2565
วันที่บังคับใช้ : 26/12/2565', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-014', 'สำนักงานคณะกรรมการ
คุ้มครองข้อมูลส่วนบุคคล', 'ประกาศคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล เรื่อง หลักเกณฑ์และวิธีการในการแจ้งเหตุการละเมิดข้อมูลส่วนบุคคล พ.ศ. 2565', 'วันที่ประกาศใช้ : 15/12/2565
วันที่บังคับใช้ : 15/12/2565', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-015', 'สำนักงานคณะกรรมการ
คุ้มครองข้อมูลส่วนบุคคล', 'ประกาศคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล เรื่อง  หลักเกณฑ์และวิธีการในการจัดทำและเก็บรักษาบันทึกรายการของกิจกรรมการประมวลผลข้อมูลส่วนบุคคลสำหรับผู้ประมวลผลข้อมูลส่วนบุคคล พ.ศ. 2565', 'วันที่ประกาศใช้ : 20/06/2565
วันที่บังคับใช้ : 20/12/2565', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-016', 'สำนักงานคณะกรรมการกิจการกระจายเสียง กิจการโทรทัศน์ และกิจการโทรคมนาคมแห่งชาติ', 'ประกาศคณะกรรมการกิจการกระจายเสียง กิจการโทรทัศน์ และกิจการโทรคมนาคมแห่งชาติ เรื่อง มาตรการคุ้มครองสิทธิของผู้ใช้บริการโทรคมนาคมเกี่ยวกับข้อมูลส่วนบุคคล สิทธิในความเป็นส่วนตัว และเสรีภาพในการสื่อสารถึงกันโดยทางโทรคมนาคม', 'วันที่ประกาศใช้ : 04/09/2566
วันที่บังคับใช้ : 05/09/2566', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-017', 'กระทรวงพาณิชย์, 
กรมทรัพย์สินทางปัญญา', 'พระราชบัญญัติลิขสิทธิ์ (ฉบับที่ 5) พ.ศ. 2565', 'วันที่ประกาศใช้ : 24/04/2565
วันที่บังคับใช้ : 24/08/2565', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-018', 'กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม', 'พระราชกำหนด มาตรการป้องกันและปราบปรามอาชญากรรมทางเทคโนโลยี พ.ศ. 2566', 'วันที่ประกาศใช้ : 16/03/2566
วันที่บังคับใช้ : 17/03/2566', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-019', 'สำนักงานคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ', 'ประกาศคณะกรรมการกำกับดูแลด้านความมั่นคงปลอดภัยไซเบอร์ เรื่อง  หลักเกณฑ์และวิธีการรายงานภัยคุกคามทางไซเบอร์ พ.ศ. 2566', 'วันที่ประกาศใช้ : 09/05/2566
วันที่บังคับใช้ : 10/05/2566', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-020', 'สำนักงานคณะกรรมการ
คุ้มครองข้อมูลส่วนบุคคล', 'ประกาศคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล เรื่อง  การจัดให้มีเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคลตามมาตรา  41 (2) แห่งพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562', 'วันที่ประกาศใช้ : 14/09/2566
วันที่บังคับใช้ : 14/12/2566', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-021', 'สำนักงานคณะกรรมการ
คุ้มครองข้อมูลส่วนบุคคล', 'ประกาศคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล เรื่อง หลักเกณฑ์การให้ความคุ้มครองข้อมูลส่วนบุคคลที่ส่งหรือโอนไปยังต่างประเทศตามมาตรา 28 แห่งพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ.2562 พ.ศ. 2566', 'วันที่ประกาศใช้ : 25/12/2566
วันที่บังคับใช้ : 25/03/2567', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-022', 'สำนักงานคณะกรรมการ
คุ้มครองข้อมูลส่วนบุคคล', 'ประกาศคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล เรื่อง หลักเกณฑ์การให้ความคุ้มครองข้อมูลส่วนบุคคลที่ส่งหรือโอนไปยังต่างประเทศตามมาตรา 29 แห่งพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ.2562 พ.ศ. 2566', 'วันที่ประกาศใช้ : 25/12/2566
วันที่บังคับใช้ : 25/03/2567', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-023', 'สำนักงานคณะกรรมการ
คุ้มครองข้อมูลส่วนบุคคล', 'ประกาศคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล เรื่อง หลักเกณฑ์เกี่ยวกับมาตรการคุ้มครองสำหรับการเก็บรวบรวมข้อมูลส่วนบุคคลเกี่ยวกับประวัติอาชญากรรมที่มิได้กระทำภายใต้การควบคุมของหน่วยงานที่มีอำนาจหน้าที่ตามกฎหมาย พ.ศ. 2566', 'วันที่ประกาศใช้ : 08/01/2567
วันที่บังคับใช้ : 08/04/2567', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-024', 'สำนักงานคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ', 'ประกาศ กมช. เรื่อง มาตรฐานและแนวทางส่งเสริมพัฒนาระบบการให้บริการเกี่ยวกับการรักษาความมั่นคงปลอดภัยไซเบอร์ พ.ศ. 2566', 'วันที่ประกาศใช้ : 18/01/2567
วันที่บังคับใช้ : 19/01/2567', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-025', 'สำนักงานคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ', 'ประกาศ กมช. เรื่อง มาตรฐานการกำหนดคุณลักษณะความมั่นคงปลอดภัยไซเบอร์ให้แก่ข้อมูลหรือระบบสารสนเทศ พ.ศ. 2566', 'วันที่ประกาศใช้ : 18/01/2567
วันที่บังคับใช้ : 18/01/2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-026', 'สำนักงานคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ', 'ประกาศ กมช. เรื่อง มาตรฐานขั้นต่ำของข้อมูลหรือระบบสารสนเทศ พ.ศ. 2566', 'วันที่ประกาศใช้ : 18/01/2567
วันที่บังคับใช้ : 18/01/2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-027', 'สำนักงานคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ', 'ประกาศ สกมช. เรื่อง แนวทางการจัดทำแผนการรักษาความมั่นคงปลอดภัยไซเบอร์ พ.ศ. 2567', 'วันที่ประกาศใช้ : 08/02/2567
วันที่บังคับใช้ : 09/02/2567', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-028', 'สำนักงานคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ', 'ประกาศ  กกม. เรื่อง หน้าที่ของหน่วยงานโครงสร้างพื้นฐานสำคัญทางสารสนเทศและหน่วยงานควบคุมหรือกำกับดูแล พ.ศ. 2567', 'วันที่ประกาศใช้ : 22/02/2567
วันที่บังคับใช้ : 23/06/2567', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-029', 'สำนักงานคณะกรรมการ
คุ้มครองข้อมูลส่วนบุคคล', 'ประกาศคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล
เรื่อง หลักเกณฑ์ในการลบหรือทำลาย หรือทำให้ข้อมูลส่วนบุคคลเป็นข้อมูลที่ไม่สามารถระบุตัวบุคคลที่เป็นเจ้าของข้อมูลส่วนบุคคลได้ พ.ศ. 2567', 'วันที่ประกาศใช้ : 13/08/2567
วันที่บังคับใช้ : 13/11/2567', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-030', 'คณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ', 'ประกาศ  กกม. เรื่อง มาตรฐานด้านการรักษาความมั่นคงปลอดภัยไซเบอร์ระบบคลาวด์ พ.ศ.2567', 'วันที่ประกาศใช้ : 10/09/2567
วันที่บังคับใช้ : 10/09/2569', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-031', NULL, 'พระราชกฤษฎีกาออกตามความในประมวลรัษฎากร ว่าด้วยการลดอัตราภาษีมูลค่าเพิ่ม (ฉบับที่ 790) พ.ศ.2567', 'วันที่ประกาศใช้ : 19/9/2567
วันที่บังคับใช้ : 1/10/2567', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-032', 'กระทรวงการคลัง', 'ประกาศคณะกรรมการความร่วมมือป้องกันการทุจริต เรื่อง วงเงินในการจัดซื้อจัดจ้างและมาตรฐานขั้นต่ำของนโยบายและแนวทางป้องกันการทุจริตในการจัดซื้อจัดจ้างที่ผู้ประกอบการต้องจัดให้มี ตามมาตรา 19 แห่งพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ.2560', 'วันที่ประกาศใช้ : 25/9/2567
วันที่บังคับใช้ : 23/3/2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-033', 'ประกาศกระทรวงอุตสาหกรรม', 'เรื่อง กำหนดมาตรฐานผลิตภัณฑ์อุตสาหกรรม เส้นใยนำแสง เล่ม 1 (1) วิธีการวัดและขั้นตอนการทดสอบ - ทั่วไปและข้อแนะนำ พ.ศ.2567', 'วันที่ประกาศ : 19/9/2567
วันที่บังคับใช้ : 17/1/2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-034', 'ประกาศกระทรวงอุตสาหกรรม', 'เรื่อง กำหนดมาตรฐานผลิตภัณฑ์อุตสาหกรรม เส้นใยนำแสง เล่ม 1 (31) วิธีการวัดและขั้นตอนการทดสอบ - ความต้านแรงดึง พ.ศ.2567', 'วันที่ประกาศ : 19/9/2567
วันที่บังคับใช้ : 17/1/2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-035', 'ประกาศกระทรวงอุตสาหกรรม', 'เรื่อง กำหนดมาตรฐานผลิตภัณฑ์อุตสาหกรรม เส้นใยนำแสง เล่ม 1 (32) วิธีการวัดและขั้นตอนการทดสอบ - ความสามารถในการลอกของสารเคลือบ พ.ศ.2567', 'วันที่ประกาศ : 19/9/2567
วันที่บังคับใช้ : 17/1/2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-036', 'ประกาศกระทรวงอุตสาหกรรม', 'เรื่อง กำหนดมาตรฐานผลิตภัณฑ์อุตสาหกรรม เส้นใยนำแสง เล่ม 1 (34) วิธีการวัดและขั้นตอนการทดสอบ - ความคดเส้นใย  พ.ศ.2567', 'วันที่ประกาศ : 19/9/2567
วันที่บังคับใช้ : 17/1/2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-037', NULL, 'พระราชกฤษฎีกา กำหนดระยะเวลาเริ่มดำเนินการจัดเก็บเงินสะสมและเงินสมทบกองทุนสงเคราะห์ลูกจ้าง พ.ศ.2567', 'วันที่ประกาศใช้ : 15/11/2567
วันที่บังคับใช้ : 16/11/2567', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-038', '-', 'กฎกระทรวงกำหนดค่าใช้เขตทางหลวงท้องถิ่น พ.ศ.2567', 'วันที่ประกาศใช้ : 26/11/2567
วันที่บังคับใช้ : 24/5/2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-039', '-', 'กฎกระทรวง ฉบับที่ 396 (พ.ศ.2567) ออกตามความในประมวลรัษฎากร ว่าด้วยการยกเว้นรัษฎากร', 'วันที่ประกาศใช้ : 20/12/2567
วันที่บังคับใช้ : ปีภาษี พ.ศ.2567', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-040', '-', 'พระราชกฤษฎีกาออกตามความในประมวลรัษฎากร ว่าด้วยการยกเว้นรัษฎากร (ฉบับที่ 794) พ.ศ.2568', 'ประกาศ		24 มีนาคม 2568
มีผลใช้บังคับ	25 มีนาคม 2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-041', '-', 'พระราชกฤษฎีกาออกตามความในประมวลรัษฎากร ว่าด้วยการยกเว้นรัษฎากร (ฉบับที่ 795) พ.ศ.2568', 'ประกาศ		24 มีนาคม 2568
มีผลใช้บังคับ	25 มีนาคม 2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-042', 'กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม (DE)', 'พระราชกำหนด มาตรการป้องกันและปราบปรามอาชญากรรมทางเทคโนโลยี (ฉบับที่ 2) พ.ศ.2568', 'ประกาศ		12 เมษายน 2568
มีผลใช้บังคับ	13 เมษายน 2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-043', NULL, 'กฎกระทรวง กำหนดเรื่องการจัดซื้อจัดจ้างกับหน่วยงานของรัฐที่ใช้สิทธิอุทธรณ์ไม่ได้ พ.ศ.2568', 'ประกาศ		18 เมษายน 2568
มีผลใช้บังคับ	19 เมษายน 2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-044', 'กระทรวงแรงงาน', 'กฎกระทรวง กำหนดค่าล่วงเวลาและค่าตอบแทนการทำงานที่เกินวันละแปดชั่วโมง ในงานเฝ้าดูแลสถานที่ หรือทรัพย์สินอันเป็นหน้าที่การทำงานปกติของลูกจ้าง', 'ประกาศ		24 เมษายน 2568
มีผลใช้บังคับ	24 เมษายน 2569', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-045', 'กระทรวงแรงงาน', 'กฎกระทรวง การขออนุญาตทำงาน การออกใบอนุญาตทำงาน และการแจ้งการทำงานของคนต่างด้าว (ฉบับที่ 2) พ.ศ.2568', 'ประกาศ		8 สิงหาคม 2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-046', NULL, 'พระราชกฤษฎีกา ออกตามความในประมวลรัษฎากร ว่าด้วยการลดอัตราภาษีมูลค่าเพิ่ม (ฉบับที่ 799) พ.ศ.2568', 'วันที่ประกาศ	14/9/2568
วันที่บังคับใช้	1/10/2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-047', NULL, 'ประกาศคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ เรื่อง หลักเกณฑ์ ลักษณะหน่วยงานที่มีภารกิจหรือให้บริการ เป็นหน่วยงานโครงสร้างพื้นฐานสำคัญทางสารสนเทศ และการมอบหมายการควบคุมและกำกับดูแล พ.ศ.2568', 'วันที่ประกาศ	16/9/2568
วันที่บังคับใช้	17/9/2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-048', NULL, 'พระราชบัญญัติคุ้มครองแรงงาน (ฉบับที่ 9) พ.ศ.2568', 'วันที่ประกาศ 7/11/2568
วันที่บังคับใช้ 7/12/2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-049', NULL, 'กฎกระทรวง ฉบับที่ 72 (พ.ศ. 2568) ออกตามความในพระราชบัญญัติควบคุมอาคาร พ.ศ.2522', 'วันที่ประกาศ 19/11/2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-050', NULL, 'กฎกระทรวงค่าจ้างขั้นต่ำและขั้นสูง ที่ใช้เป็นฐานในการคำนวณเงินสมทบของผู้ประกันตนตามมาตรา 33 พ.ศ. 2568', 'วันที่ประกาศ 12/12/2568
วันที่บังคับใช้ 1/1/2569', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-051', NULL, 'พระราชกฤษฎีกาออกตามความในประมวลรัษฎากรว่าด้วยการยกเว้นรัษฎากร (ฉบับที่ 804) พ.ศ.2569', 'ประกาศ		2 มีนาคม 2569
มีผลใช้บังคับ	3 มีนาคม 2569', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-052', NULL, 'พระราชกฤษฎีกาออกตามความในประมวลรัษฎากรว่าด้วยการยกเว้นรัษฎากร (ฉบับที่ 805) พ.ศ.2569', 'ประกาศ		2 มีนาคม 2569
มีผลใช้บังคับ	3 มีนาคม 2569', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-053', NULL, 'คำสั่งสำนักงานทะเบียนหุ้นส่วนบริษัทกลาง ที่ 1/2569 เรื่อง หลักเกณฑ์และวิธีการจดทะเบียนกรณีแก้ไขเพิ่มเติมให้คนต่างด้าวเป็นหุ้นส่วนของห้างหุ้นส่วนหรือแก้ไขเพิ่มเติมให้คนต่างด้าวเป็นกรรมการผู้มีอำนาจลงนามในบริษัทจำกัด', 'ประกาศ		26 มีนาคม 2569
มีผลใช้บังคับ	1 เมษายน 2569', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-054', NULL, 'ประกาศสำนักงานคณะกรรมการกิจการกระจายเสียง กิจการโทรทัศน์ และกิจการโทรคมนาคมแห่งชาติ เรื่อง มาตรการเพื่อป้องกันอาชญากรรมทางเทคโนโลยี สำหรับผู้รับใบอนุญาตประกอบกิจการโทรคมนาคม (ฉบับที่ 2)', 'ประกาศ		15 พฤษภาคม 2569
มีผลใช้บังคับ	16 พฤษภาคม 2569', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LF', 'LF-055', NULL, 'ประกาศอธิบดีกรมสรรพากร (ฉบับที่ 57) เรื่อง กำหนดหลักเกณฑ์ วิธีการ และเงื่อนไข เพื่อการยกเว้นภาษีเงินได้ ภาษีมูลค่าเพิ่ม ภาษีธุรกิจเฉพาะ และอากรแสตมป์ สำหรับการบริจาคเพื่อสนับสนุนโครงการสร้างพระสถูปเจดีย์บรรจุพระบรมสารีริกธาตุ บริเวณพื้นที่พระมหาธาตุนภเมทนีดล นภพลภูมิสิริ จังหวัดเชียงใหม่', 'ประกาศ		22 พฤษภาคม 2569
มีผลใช้บังคับ	1 มกราคม 2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LG', 'LG-001', 'กระทรวงแรงงาน', 'พระราชบัญญัติคุ้มครองแรงงาน พ.ศ. 2541', 'ประกาศใช้ 22 เม.ย. 2541', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('LG', 'LG-002', 'กรมสวัสดิการและคุ้มครองแรงงาน', 'ประกาศกรมสวัสดิการและ คุ้มครองแรงงาน เรื่อง หลักเกณฑ์และวิธีการเลือกตั้งคณะกรรมการสวัสดิการในสถานประกอบกิจการ ลงวันที่ 14 พฤษภาคม พ.ศ. 2545', 'ลงวันที่ 14 พฤษภาคม 2545', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-001', 'กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม, สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล', 'พรบ.ข้อมูลส่วนบุคคล 2562', 'วันที่ประกาศใช้ : 27/05/2562
วันที่บังคับใช้ : 1/06/2565', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-002', 'สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล', 'ประกาศคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล เรื่อง มาตรการรักษาความมั่นคงปลอดภัยของผู้ควบคุมข้อมูลส่วนบุคคล พ.ศ. 2565', NULL, 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-003', 'ประกาศคณะกรรมการ
คุ้มครองข้อมูลส่วนบุคคล', 'ประกาศคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล เรื่อง หลักเกณฑ์และวิธีการในการแจ้งเหตุการละเมิดข้อมูลส่วนบุคคล พ.ศ. 2565', 'วันที่ประกาศใช้ : 15/12/2565
วันที่บังคับใช้ : 15/12/2565', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-004', 'สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล', 'ประกาศคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล เรื่อง  หลักเกณฑ์และวิธีการในการจัดทำและเก็บรักษาบันทึกรายการของกิจกรรมการประมวลผลข้อมูลส่วนบุคคลสำหรับผู้ประมวลผลข้อมูลส่วนบุคคล พ.ศ. 2565', 'วันที่ประกาศใช้ : 20/06/2565', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-005', 'สำนักงานคณะกรรมการ
คุ้มครองข้อมูลส่วนบุคคล', 'ประกาศคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล เรื่อง หลักเกณฑ์การให้ความคุ้มครองข้อมูลส่วนบุคคลที่ส่งหรือโอนไปยังต่างประเทศตามมาตรา 28 แห่งพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ.2562 พ.ศ. 2566', 'วันที่ประกาศใช้ : 25/12/2566
วันที่บังคับใช้ : 25/03/2567', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-006', 'สำนักงานคณะกรรมการ
คุ้มครองข้อมูลส่วนบุคคล', 'ประกาศคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล เรื่อง หลักเกณฑ์การให้ความคุ้มครองข้อมูลส่วนบุคคลที่ส่งหรือโอนไปยังต่างประเทศตามมาตรา 29 แห่งพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ.2562 พ.ศ. 2566', 'วันที่ประกาศใช้ : 25/12/2566
วันที่บังคับใช้ : 25/03/2567', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-007', 'สำนักงานคณะกรรมการ
คุ้มครองข้อมูลส่วนบุคคล', 'ประกาศคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล เรื่อง หลักเกณฑ์เกี่ยวกับมาตรการคุ้มครองสำหรับการเก็บรวบรวมข้อมูลส่วนบุคคลเกี่ยวกับประวัติอาชญากรรมที่มิได้กระทำภายใต้การควบคุมของหน่วยงานที่มีอำนาจหน้าที่ตามกฎหมาย พ.ศ. 2566', 'วันที่ประกาศใช้ : 08/01/2567
วันที่บังคับใช้ : 08/04/2567', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-008', 'สำนักงานคณะกรรมการ
คุ้มครองข้อมูลส่วนบุคคล', 'ประกาศคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล เรื่อง  การจัดให้มีเจ้าหน้าที่คุ้มครองข้อมูลส่วนบุคคลตามมาตรา  41 (2) แห่งพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562', 'วันที่ประกาศใช้ : 14/09/2566
วันที่บังคับใช้ : 14/12/2566', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-009', 'สำนักงานคณะกรรมการ
คุ้มครองข้อมูลส่วนบุคคล', 'ประกาศคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล เรื่อง หลักเกณฑ์การให้ความคุ้มครองข้อมูลส่วนบุคคลที่ส่งหรือโอนไปยังต่างประเทศตามมาตรา 28 แห่งพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ.2562 พ.ศ. 2566', 'วันที่ประกาศใช้ : 25/12/2566
วันที่บังคับใช้ : 25/03/2567', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-010', 'สำนักงานคณะกรรมการ
คุ้มครองข้อมูลส่วนบุคคล', 'ประกาศคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล เรื่อง หลักเกณฑ์การให้ความคุ้มครองข้อมูลส่วนบุคคลที่ส่งหรือโอนไปยังต่างประเทศตามมาตรา 29 แห่งพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ.2562 พ.ศ. 2566', 'วันที่ประกาศใช้ : 25/12/2566
วันที่บังคับใช้ : 25/03/2567', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-011', 'สำนักงานคณะกรรมการ
คุ้มครองข้อมูลส่วนบุคคล', 'ประกาศคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล เรื่อง หลักเกณฑ์เกี่ยวกับมาตรการคุ้มครองสำหรับการเก็บรวบรวมข้อมูลส่วนบุคคลเกี่ยวกับประวัติอาชญากรรมที่มิได้กระทำภายใต้การควบคุมของหน่วยงานที่มีอำนาจหน้าที่ตามกฎหมาย พ.ศ. 2566', 'วันที่ประกาศใช้ : 08/01/2567
วันที่บังคับใช้ : 08/04/2567', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-012', 'สำนักงานคณะกรรมการ
คุ้มครองข้อมูลส่วนบุคคล', 'ประกาศคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล
เรื่อง หลักเกณฑ์ในการลบหรือทำลาย หรือทำให้ข้อมูลส่วนบุคคลเป็นข้อมูลที่ไม่สามารถระบุตัวบุคคลที่เป็นเจ้าของข้อมูลส่วนบุคคลได้ พ.ศ. 2567', 'วันที่ประกาศใช้ : 13/08/2567
วันที่บังคับใช้ : 13/11/2567', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-013', 'สำนักงานคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ', 'พรบ.การรักษาความมั่นคงปลอดภัยไซเบอร์', 'วันที่ประกาศใช้ : 27/05/2562
วันที่บังคับใช้ : 28/05/2562', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-014', 'สำนักงานคณะกรรมการกิจการกระจายเสียง กิจการโทรทัศน์ และกิจการโทรคมนาคมแห่งชาติ', 'ประกาศ กสทช. เรื่อง ประกาศคณะกรรมการกำกับดูแลด้านความมั่นคงปลอดภัยไซเบอร์ เรื่อง ประมวลแนวทางปฏิบัติและกรอบมาตรฐานด้านการรักษาความมั่นคงปลอดภัยไซเบอร์ สำหรับหน่วยงานของรัฐและหน่วยงานโครงสร้างพื้นฐานสำคัญทางสารสนเทศ พ.ศ. 2564', 'วันที่ประกาศใช้ : 6/09/2564
วันที่บังคับใช้ : 6/09/2565', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-015', 'สำนักงานคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ', 'ประกาศคณะกรรมการกำกับดูแลด้านความมั่นคงปลอดภัยไซเบอร์ เรื่อง  หลักเกณฑ์และวิธีการรายงานภัยคุกคามทางไซเบอร์ พ.ศ. 2566', 'วันที่ประกาศใช้ : 09/05/2566
วันที่บังคับใช้ : 10/05/2566', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-016', 'สำนักงานคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ', 'ประกาศ กมช. เรื่อง มาตรฐานและแนวทางส่งเสริมพัฒนาระบบการให้บริการเกี่ยวกับการรักษาความมั่นคงปลอดภัยไซเบอร์ พ.ศ. 2566', 'วันที่ประกาศใช้ : 18/01/2567
วันที่บังคับใช้ : 19/01/2567', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-017', 'สำนักงานคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ', 'ประกาศ กมช. เรื่อง มาตรฐานการกำหนดคุณลักษณะความมั่นคงปลอดภัยไซเบอร์ให้แก่ข้อมูลหรือระบบสารสนเทศ พ.ศ. 2566', 'วันที่ประกาศใช้ : 18/01/2567
วันที่บังคับใช้ : 18/01/2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-018', 'สำนักงานคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ', 'ประกาศ กมช. เรื่อง มาตรฐานขั้นต่ำของข้อมูลหรือระบบสารสนเทศ พ.ศ. 2566', 'วันที่ประกาศใช้ : 18/01/2567
วันที่บังคับใช้ : 18/01/2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-019', 'สำนักงานคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ', 'ประกาศ สกมช. เรื่อง แนวทางการจัดทำแผนการรักษาความมั่นคงปลอดภัยไซเบอร์ พ.ศ. 2567', 'วันที่ประกาศใช้ : 08/02/2567
วันที่บังคับใช้ : 09/02/2567', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-020', 'สำนักงานคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ', 'ประกาศ  กกม. เรื่อง หน้าที่ของหน่วยงานโครงสร้างพื้นฐานสำคัญทางสารสนเทศและหน่วยงานควบคุมหรือกำกับดูแล พ.ศ. 2567', 'วันที่ประกาศใช้ : 22/02/2567
วันที่บังคับใช้ : 23/06/2567', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-021', 'กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม', 'พระราชกำหนด มาตรการป้องกันและปราบปรามอาชญากรรมทางเทคโนโลยี พ.ศ. 2566', 'วันที่ประกาศใช้ : 16/03/2566
วันที่บังคับใช้ : 17/03/2566', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-022', 'สำนักงานคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ', 'ประกาศคณะกรรมการกำกับดูแลด้านความมั่นคงปลอดภัยไซเบอร์ เรื่อง  หลักเกณฑ์และวิธีการรายงานภัยคุกคามทางไซเบอร์ พ.ศ. 2566', 'วันที่ประกาศใช้ : 09/05/2566
วันที่บังคับใช้ : 10/05/2566', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-023', 'สำนักงานคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ', 'ประกาศ กมช. เรื่อง มาตรฐานการกำหนดคุณลักษณะความมั่นคงปลอดภัยไซเบอร์ให้แก่ข้อมูลหรือระบบสารสนเทศ พ.ศ. 2566', 'วันที่ประกาศใช้ : 18/01/2567
วันที่บังคับใช้ : 18/01/2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-024', 'สำนักงานคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ', 'ประกาศ กมช. เรื่อง มาตรฐานขั้นต่ำของข้อมูลหรือระบบสารสนเทศ พ.ศ. 2566', 'วันที่ประกาศใช้ : 18/01/2567
วันที่บังคับใช้ : 18/01/2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-025', 'สำนักงานคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ', 'ประกาศ สกมช. เรื่อง แนวทางการจัดทำแผนการรักษาความมั่นคงปลอดภัยไซเบอร์ พ.ศ. 2567', 'วันที่ประกาศใช้ : 08/02/2567
วันที่บังคับใช้ : 09/02/2567', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-026', 'สำนักงานคณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ', 'ประกาศ  กกม. เรื่อง หน้าที่ของหน่วยงานโครงสร้างพื้นฐานสำคัญทางสารสนเทศและหน่วยงานควบคุมหรือกำกับดูแล พ.ศ. 2567', 'วันที่ประกาศใช้ : 22/02/2567
วันที่บังคับใช้ : 23/06/2567', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-027', 'คณะกรรมการการรักษาความมั่นคงปลอดภัยไซเบอร์แห่งชาติ', 'ประกาศ  กกม. เรื่อง มาตรฐานด้านการรักษาความมั่นคงปลอดภัยไซเบอร์ระบบคลาวด์ พ.ศ.2567', 'วันที่ประกาศใช้ : 10/09/2567
วันที่บังคับใช้ : 10/09/2569', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-028', 'กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม (DE)', 'พระราชกำหนด มาตรการป้องกันและปราบปรามอาชญากรรมทางเทคโนโลยี (ฉบับที่ 2) พ.ศ.2568', 'ประกาศ		12 เมษายน 2568
มีผลใช้บังคับ	13 เมษายน 2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-029', NULL, 'พรบ.ว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ.2544', 'วันที่ประกาศใช้ : 4/12/2544
วันที่บังคับใช้ : 4/03/2545', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-030', NULL, 'ประกาศคณะกรรมการธุรกรรมทางอิเล็กทรอนิกส์ เรื่อง แนวทางการใช้บริการคลาวด์ พ.ศ.2562', 'วันที่ประกาศใช้ : 11/06/2562
วันที่บังคับใช้ : 12/06/2562', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-031', 'ประกาศกระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม', 'พระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ พ.ศ.2550 และ พระราชบัญญัติว่าด้วยการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ (ฉบับที่ 2) พ.ศ. 2560 และ/หรือที่จะมีการแก้ไขเพิ่มเติมในภายหน้า', 'วันที่ประกาศใช้ : 24/01/2560
วันที่บังคับใช้ : 24/04/2560', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-032', 'ประกาศกระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม', 'ประกาศกระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม เรื่องหลักเกณฑ์ ระยะเวลา และวิธีการปฏิบัติสำหรับการระงีบการทำให้แพร่หลายหรือลบข้อมูลคอมพิวเตอร์ของพนักงานเจ้าหน้าที่หรือผู้ให้บริการ พศ 2560', 'วันที่ประกาศใช้ : 22/07/2560
วันที่บังคับใช้ : 23/07/2560', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-033', 'กระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม', 'ประกาศกระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม เรื่อง หลักเกณฑ์การเก็บรักษาข้อมูลจราจรทางคอมพิวเตอร์ของผู้ให้บริการ พ.ศ.  ประกาศวันที่ 2564', 'วันที่ประกาศใช้ : 13/08/2564
วันที่บังคับใช้ : 14/08/2564', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-034', 'ประกาศกระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม', 'ประกาศกระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม เรื่อง ขั้นตอนการแจ้งเตือน การระงับการทำให้แพร่หลายของข้อมูลคอมพิวเตอร์ และการนำข้อมูลคอมพิวเตอร์ออกจากระบบคอมพิวเตอร์ พ.ศ. 2565 แทนที่ประกาศฉบับเดิม (พ.ศ. 2560)', 'วันที่ประกาศใช้ : 26/10/2565
วันที่บังคับใช้ : 26/12/2565', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-035', 'กระทรวงพาณิชย์, กรมทรัพย์สินทางปัญญา', 'พรบ. ลิขสิทธิ์ พ.ศ. 2537 แก้ไขเพิ่มเติมโดยพระราชบัญญัติลิขสิทธิ์ (ฉบับที่ 2) พ.ศ. 2558, พระราชบัญญัติลิขสิทธิ์ (ฉบับที่ 3) พ.ศ. 2558 และพระราชบัญญัติลิขสิทธิ์ (ฉบับที่ 4) พ.ศ. 2561', 'วันที่ประกาศใช้ : 9/12/2537
วันที่บังคับใช้ : 9/1/2538

(ฉบับที่ 4)
วันที่ประกาศใช้ : 11/11/2561
วันที่บังคับใช้ : 11/3/2562', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-036', 'กระทรวงพาณิชย์, 
กรมทรัพย์สินทางปัญญา', 'พระราชบัญญัติลิขสิทธิ์ (ฉบับที่ 5) พ.ศ. 2565', 'วันที่ประกาศใช้ : 24/04/2565
วันที่บังคับใช้ : 24/08/2565', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-037', 'กระทรวงพาณิชย์, กรมทรัพย์สินทางปัญญา', 'พรบ.ความลับทางการค้า พ.ศ. 2545 และ พรบ.ความลับทางการค้า (ฉบับที่ 2) พ.ศ. 2558', 'วันที่ประกาศใช้ : 12/04/2545
วันที่บังคับใช้ : 12/07/2545', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-038', 'กระทรวงการคลัง', 'ประกาศคณะกรรมการความร่วมมือป้องกันการทุจริต เรื่อง วงเงินในการจัดซื้อจัดจ้างและมาตรฐานขั้นต่ำของนโยบายและแนวทางป้องกันการทุจริตในการจัดซื้อจัดจ้างที่ผู้ประกอบการต้องจัดให้มี ตามมาตรา 19 แห่งพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ.2560', 'วันที่ประกาศใช้ : 25/9/2567
วันที่บังคับใช้ : 23/3/2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-039', 'กระทรวงการคลัง', 'กฎกระทรวง กำหนดเรื่องการจัดซื้อจัดจ้างกับหน่วยงานของรัฐที่ใช้สิทธิอุทธรณ์ไม่ได้ พ.ศ.2568', 'ประกาศ		18 เมษายน 2568
มีผลใช้บังคับ	19 เมษายน 2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-040', 'แรงงาน', 'พระราชบัญญัติคุ้มครองแรงงาน (ฉบับที่ 9) พ.ศ.2568', 'วันที่ประกาศ 7/11/2568
วันที่บังคับใช้ 7/12/2568', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();
insert into lg_laws (cat, code, ministry, name, issue_date, status) values
  ('CC', 'CC-041', 'สวัสดิการและคุ้มครองแรงงาน', 'ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง ข้อความแสดงสิทธิและหน้าที่ของนายจ้างและลูกจ้าง สัญลักษณ์เตือนอันตราย และเครื่องหมายเกี่ยวกับความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน', 'ประกาศวันที่		
1 พฤษภาคม 2569
มีผลบังคับใช้วันที่
	1 กรกฎาคม 2569', 'ok')
on conflict (cat, code) do update set
  ministry = excluded.ministry, name = excluded.name,
  issue_date = excluded.issue_date, status = excluded.status, updated_at = now();

-- (2) insert ข้อกำหนด เฉพาะกฎหมายที่ยังไม่มีข้อกำหนดในฐาน (กันเขียนทับงานผู้ใช้)
insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-001') L,
  (values
    (0, '3. การแจ้งการดำเนินการหรือส่งเอกสารต่ออธิบดี ผู้ซึ่งอธิบดีมอบหมายหรือพนักงานตรวจแรงงาน นายจ้างอาจแจ้งหรือส่งทางสื่ออิเล็กทรอนิกส์สำหรับการแจ้งหรือส่งดังต่อไปนี้', 'met', 'Safety', 'ตามกฎหมายกำหนด (ระบุไว้ใน PD การสื่อสาร)', '-(ระบุไว้ใน PD การสื่อสาร)
การรายงานผล: ตามกฎหมายกำหนด (ระบุไว้ใน PD การสื่อสาร)', NULL),
    (1, 'แบบการแจ้งทางสื่ออิเล็กทรอนิกส์ ให้เป็นไปตามแบบท้ายประกาศนี้แนบท้าย
- แบบแจ้งรายละเอียดของสารเคมีอันตรายในสถานประกอบการ(แบบ สอ.1)
- แบบรายงานผลการฝึกซ้อมดับเพลิงและฝึกซ้อมหนีไฟ 
- แบบรายงานการแจ้งผลการตรวจสุขภาพที่พบความผิดปกติหรือการเจ็บป่วย การให้การรักษาพยาบาล และการป้องกัน แก้ไข
- แบบรายงานผลการตรวจสุขภาพของลูกจ้างที่ผิดปกติหรือเจ็บป่วยซึ่งได้รับอันตรายจากความร้อน แสง เสียง
- แบบรายงานผลการดำเนินงานของเจ้าหน้าที่ความปลอดภัยในการทำงานระดับวิชาชีพ (แบบ จป.(ว))', 'met', NULL, NULL, NULL, NULL),
    (2, '4. นายจ้างที่มีรายชื่อสถานประกอบการอยู่ในระบบฐานข้อมูลของกรมสวัสดิการและคุ้มครองแรงงาน หากประสงค์จะแจ้งการดำเนินการหรือส่งเอกสาร ต้องลงทะเบียนเพื่อขอรับชื่อผู้ใช้ (user name) และรหัสผู้ใช้(password) ทางระบบเครือข่ายอินเตอร์เน็ต (www.labour.go.th)  *** การลงทะเบียนเพื่อขอรับชื่อผู้ใช้และรหัสผู้ใช้ทางระบบเครือข่ายอินเตอร์เน็ตเพื่อแจ้งการดำเนินการหรือส่งเอกสารทางสื่ออิเล็กทรอนิกส์ ไม่เป็นการตัดสิทธิของนายจ้างในการแจ้งการดำเนินการหรือส่งเอกสารด้วยตนเอง ทางไปรษณีย์ หรือทางโทรสาร แต่อย่างใด', 'met', 'Safety', NULL, '-บ.จัสเทล มีการขอ username&Password โดย HR
การรายงานผล: https://eservice.labour.go.th/', NULL),
    (3, '5. เมื่อนายจ้างได้รับชื่อผู้ใช้และรหัสผู้ใช้แล้ว นายจ้างสามารถแจ้งการดำเนินการหรือส่งเอกสารทางสื่ออิเล็กทรอนิกส์ผ่านระบบเครือข่ายอินเตอร์เน็ต (www.labour.go.th)*** การแจ้งการดำเนินการหรือส่งเอกสาร ให้ถือว่าอธิบดี ผู้ซึ่งอธิบดีมอบหมายหรือพนักงานตรวจแรงงานได้รับแจ้งหรือได้รับเอกสารในวันและเวลาตามที่ปรากฏที่เครื่องคอมพิวเตอร์แม่ข่ายกรมสวัสดิการและคุ้มครองแรงงาน', 'met', 'Safety', NULL, '-บ.จัสเทล มีการขอ username&Password โดย HR', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-002') L,
  (values
    (0, 'มาตรา ๖ ให้นายจ้างมีหน้าที่จัดและดูแลสถานประกอบกิจการและลูกจ้างให้มีสภาพการทำงานและสภาพแวดล้อมในการทำงานที่ปลอดภัยและถูกสุขลักษณะ รวมทั้งส่งเสริมสนับสนุนการปฏิบัติงานของลูกจ้างมิให้ลูกจ้างได้รับอันตรายต่อชีวิต ร่างกาย จิตใจ และสุขภาพอนามัย', 'met', 'จป.ทุกระดับ', 'สรุปเดือนละ 1 ครั้ง', '- F-255 แบบตรวจความปลอดภัย จป. หัวหน้างาน ประจำเดือน
การรายงานผล: ไซต์สื่อสาร Jastel Safety', NULL),
    (1, 'มาตรา ๘ ให้นายจ้างบริหาร จัดการ และดำเนินการด้านความปลอดภัย อาชีวอนามัยและสภาพแวดล้อมในการทำงาน ให้เป็นไปตามมาตรฐานที่กำหนดในกฎกระทรวง', 'met', 'Safety', 'ทบทวน 1 ครั้ง/ปี โดยที่ผ่านการประชุมคปอ.', 'นโยบายความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน
การรายงานผล: ไซต์สื่อสาร Jastel Safety', NULL),
    (2, 'มาตรา ๑๓ ให้นายจ้างจัดให้มีเจ้าหน้าที่ความปลอดภัยในการทำงานและจะต้องขึ้นทะเบียนต่อกรมสวัสดิการและคุ้มครองแรงงาน', 'met', 'Safety', 'ทุุกครั้งที่มีการเปลี่ยนแปลง', '- ประกาศแต่งตั้งจป. ที่มีคุณสมบัติตามที่กฎหมายกำหนด                                   ''- แบบขึ้นทะเบียนจป.(กภ.จพ.)
การรายงานผล: สวัสดิการและคุ้มครองแรงงาน https://eservice.labour.go.th/', NULL),
    (3, 'มาตรา ๑๖ ให้นายจ้างจัดให้ผู้บริหาร หัวหน้างาน และลูกจ้างทุกคนได้รับการฝึกอบรม ความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน ในกรณีที่นายจ้างรับลูกจ้างเข้างาน เปลี่ยนงาน เปลี่ยนสถานที่ทำงาน หรือเปลี่ยนแปลงเครื่องจักรหรืออุปกรณ์', 'met', 'Safety', 'Annual', 'จัดหลักสูตรโดยทีม QA & Training', NULL),
    (4, 'มาตรา ๑๗ ให้นายจ้างติดประกาศสัญลักษณ์เตือนอันตรายและเครื่องหมายเกี่ยวกับความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน', 'met', 'Safety', 'Annual', '- แสดงไว้ในคู่มือความปลอดภัย
การรายงานผล: ไซต์สื่อสาร Jastel Safety', NULL),
    (5, 'มาตรา ๒๒ ให้นายจ้างจัดและดูแลให้ลูกจ้างสวมใส่อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลที่ได้มาตรฐานตามที่อธิบดีประกาศกำหนด', 'met', 'Safety', 'Annual', '- F-255 แบบตรวจความปลอดภัย จป. หัวหน้างาน ประจำเดือน', NULL),
    (6, 'มาตรา ๒๘ การประชุมคณะกรรมการต้องมีกรรมการมาประชุมไม่น้อยกว่ากึ่งหนึ่งของจำนวนกรรมการทั้งหมด', 'met', 'Safety', 'Annual', 'บันทึกการประชุม คปอ.ประจำเดือน
การรายงานผล: สวัสดิการและคุ้มครองแรงงาน  (ส่งพร้อมรายงาน จป.ว 2ครั้ง/ปี)', NULL),
    (7, 'มาตรา ๓๒ เพื่อประโยชน์ในการควบคุม กำกับ ดูแลการดำเนินการด้านความปลอดภัยอาชีวอนามัย และสภาพแวดล้อมในการทำงาน', 'met', 'Safety', 'Annual', 'มีการทวนสอบนโยบายโดยที่ประชุม คปอ.', NULL),
    (8, '5.  ติดประกาศสัญลักษณ์เตือนอันตรายและเครื่องหมายเกี่ยวกับความปลอดภัย อาชีวอนามัยและสภาพแวดล้อมในการทำงาน', 'met', 'Safety', NULL, 'ป้ายเตือนอันตรายตามความเสี่ยง', NULL),
    (9, '6. ติดข้อความแสดงสิทธิและหน้าที่ของนายจ้างและลูกจ้างในที่เห็นได้ง่าย ณ สถานประกอบการ', 'met', 'Safety', NULL, '- แสดงไว้ในคู่มือความปลอดภัย
การรายงานผล: ไซต์สื่อสาร Jastel Safety', NULL),
    (10, '9. กรณีที่สถานประกอบกิจการเกิดอุบัติภัย - กรณีที่ลูกจ้างเสียชีวิต แจ้งต่อพนักงานตรวจความปลอดภัยทันทีที่ทราบโดย โทรศัพท์ สาร หรือวิธีอื่นใด และแจ้งรายละ
เอียดและสาเหตุเป็นหนังสือภายใน 7 วันนับแต่วันที่ลูกจ้างเสียชีวิต', 'met', 'Safety', '-ทุกครั้งเมื่อเกิดเหตุการณ์
-แจ้งภายใน 7 วันนับแต่วันที่ลูกจ้างเสียชีวิต', 'สปร.5
การรายงานผล: สวัสดิการและคุ้มครองแรงงาน', NULL),
    (11, 'กรณีที่ต้องใช้เงินกองทุนทดแทน ให้เขียน กท.16 และ กท.44 
หมายเหตุ  กรณีใช้กองทุนเงินทดแทน ต้องส่ง กท.16 และ กท.44  แจ้งนั้นต่อพนักงานตรวจความปลอดภัย ภายใน 7 วัน', 'met', 'Safety
HR', '-ทุกครั้งเมื่อเกิดเหตุการณ์
-แจ้งภายใน 7 วัน นับตั้งแต่วันเกิดเหตุ', 'กท.16 และ กท.44
การรายงานผล: สวัสดิการและคุ้มครองแรงงาน', NULL),
    (12, 'มาตรา 14 กรณีที่ทำงานในสภาพแวดล้อมที่อาจทำให้ลูกจ้างได้รับอันตรายต่อชีวิต ร่างกาย จิตใจ หรือสุขภาพอนามัย ให้นายจ้างทราบถึงอันตรายที่จะเกิดขึ้นจากการ
ทำงานและแจกคู่มือปฏิบัติงานให้ลูกจ้างทุกคนก่อนที่ ลูกจ้างจะเข้าทำงาน เปลี่ยนงาน หรือเปลี่ยนสถานที่ทำงาน
กรณีเป็นผู้รับเหมา ให้กระทำเช่นเดียวกันกับข้อกำหนดของโรงงาน', 'met', 'Safety', NULL, '- คู่มือความปลอดภัย', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-003') L,
  (values
    (0, 'กำหนดให้การใช้เครื่องฟื้นคืนคลื่นหัวใจด้วยไฟฟ้าแบบอัตโนมัติ 
(Automated External Defibrillator : AED) เป็นการปฐมพยาบาล', 'met', 'Safety
Coporate Affair', 'ทุกรอบการประเมินกฎหมาย', 'Office จัสเทล ชั้น 7 จัดให้มีเครื่อง AED  เครื่อง อยู่บริเสณหน้าห้องผู้บริหาร', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-004') L,
  (values
    (0, '1. การแจ้งการเกิดอุบัติภัยร้ายแรง หรือลูกจ้างประสบอันตรายจากการทำงาน
และการส่งสำเนาหนังสือแจ้งการประสบอันตรายหรือเจ็บป่วยต่อสำนักงานประกันสังคมตามกฎหมาย
ว่าด้วยเงินทดแทน ตามมาตรา ๓๔ แห่งพระราชบัญญัติความปลอดภัย อาชีวอนามัย และสภาพแวดล้อม
ในการทำงาน พ.ศ. ๒๕๕๔ นายจ้างอาจดำเนินการแจ้งหรือส่งโดยใช้แบบการแจ้งทางสื่ออิเล็กทรอนิกส์
2. กรณีมีความประสงค์จะแจ้งการเกิดอุบัติภัยร้ายแรง หรือลูกจ้างประสบอันตราย
จากการทำงาน และส่งสำเนาหนังสือแจ้งการประสบอันตรายหรือเจ็บป่วยต่อสำนักงานประกันสังคม
ตามกฎหมายว่าด้วยเงินทดแทนทางสื่ออิเล็กทรอนิกส์ตามข้อ ๓ ต้องลงทะเบียนเพื่อขอรหัสผู้ใช้ (User ID)
และรหัสผ่าน (Password) ทางเว็บไซต์ของกรมสวัสดิการและคุ้มครองแรงงาน (http://eservice.labour.go.th)', 'met', 'Safety', 'เมื่อเกิดอุบัติเหตุร้ายแรง', 'เมื่อเกิดอุบัติภัย หรือลูกจ้างประสบอุบัติเหตุจากการทำงาน สามารถส่งรายงานได้ทั้งทางอิเล็คทรอนิคส์และส่งที่สำนักงานสวัสดิการฯ
การรายงานผล: สวัสดิการและคุ้มครองแรงงาน', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-005') L,
  (values
    (0, 'ยกเลิก
กฎกระทรวงกำหนดหลักเกณฑ์ วิธีการ และมาตรการในการควบคุมสถานประกอบกิจการที่เป็นอันตราย
ต่อสุขภาพ พ.ศ. 2545
ข้อ 4. สถานประกอบกิจการที่มีอาคาร  ต้องมีลักษณะตามที่กำหนด
 - อาคารที่ความมั่นคงแข็งแรง  มีทางหนีไฟ บันไดหนีไฟ ทางออกฉุกเฉิน มีแสงสว่างเพียงพอ  มีป้ายหรือเครื่องหมายแสดงชัดเจน   และทางออกฉุกเฉินต้องมีไฟส่องสว่างฉุกเฉินเมื่อระบบไฟฟ้าปกติขัดข้อง
 - มีแสงสว่างและการระบายอากาศที่เหมาะสม', 'met', '- Premium Asset
- SHE', 'ทุกรอบการประเมินกฎหมาย', NULL, NULL),
    (1, 'ข้อ 5. สถานประกอบกิจการต้องมีมาตรการความปลอดภัยในการทำงานและปฏิบัติให้เป็นไปตามกฎหมาย
ว่าด้วยความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงานและกฎหมายอื่นที่เกี่ยวข้อง', 'met', '- SHE
-ทุกหน่วยงาน', 'ทุกรอบการประเมินกฎหมาย', NULL, NULL),
    (2, 'ข้อ 6. สถานประกอบกิจการต้องดำเนินการดังนี้
- ดำเนินการเกี่ยวกับวัตถุอันตรายต้องมีสถานที่ที่ปลอดภัยในการจัดเก็บ  
- กรณีผู้ปฏิบัติงานที่อาจเปรอะเปื้อนจากสารเคมี  ต้องจัดให้มีที่ล้างตัวและที่ล้างตาฉุกเฉิน
- การใช้อุปกรณ์ เครื่องมือ หรือเครื่องจักร ต้องติดตั้งในลักษณะที่แข็งแรง มั่นคง มีป้ายเตือนหรือคำแนะนำ
ในการป้องกันอันตราย
- การจัดให้มีการตรวจสุขภาพพนักงานตามที่กฎหมายกำหนด 
- กรณีที่อาจก่อให้เกิดมลพิษทางเสียง มลพิษทางอากาศ  มลพิษทางน้ำ  มลพิษทางแสง มลพิษทางความร้อน มลพิษทางความสั่นสะเทือนของเสียอันตราย เป็นต้น  ให้ทำการควบคุมและป้องกันผลกระทบ เหตุรำคาญ หรืออันตรายต่อสุชภาพของพนักงานและผู้อยู่อาศัยใกล้เคียง', 'met', '- พื้นที่เสียงดัง ราชบุรี
-SHE', NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-006') L,
  (values
    (0, 'สถานประกอบกิจการตามที่ระบุไว้ในบัญชีท้ายกฎกระทรวงนี้
มีลูกจ้าง 50 คนขึ้นไปต้องจัดให้มีระบบการจัดการความปลอดภัย
ระบบการจัดการความปลอดภัย อย่างน้อยต้องประกอบด้วย
1.  นโยบายด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน
2.  การจัดองค์กรด้านความปลอดภัยฯ
3.แผนงานด้านความปลอดภัย
4. การประเมินผลทบทวน
5. การปรับปรุงและพัฒนาระบบการจัดการด้านความปลอดภัย', 'met', 'Safety
คปอ.
ISO 45001', 'ทุกรอบการประเมินกฎหมาย', 'บริษัทจัสเทล จัดอยู่ในสถานประกอบกิจการลำดับที่ 45
ปัจจุบันบริษัท จัสเทล ดำเนินการขอรับรองระบบ ISO 45001', NULL),
    (1, 'ในกรณีที่นายจ้างได้จัดให้มีระบบการจัดการด้านความปลอดภัยตามมาตรฐาน
ผลิตภัณฑ์อุตสาหกรรม มาตรฐำนขององค์การมาตรฐานสากล
(International Standardization for Organization : ISO) มาตรฐานขององค์การแรงงานระหว่างประเทศ (International Labour Organization : ILO) มาตรฐานของสถาบันมาตรฐานสหราชอาณาจักร (British Standards Institution : BSI) มาตรฐานของสำนักงานบริหารความปลอดภัยและอาชีวอนามัยแห่งชาติ
(Occupational Safety and Health Administration : OSHA) มาตรฐานของสถาบันมาตรฐาน
แห่งชาติประเทศสหรัฐอเมริกา (American National Standards Institute : ANSI) มาตรฐานของ
ประเทศออสเตรเลียและประเทศนิวซีแลนด์
(Australia Standards/New Zealand Standards : AS/NZS) มาตรฐานของสมาพันธ์การกำหนดมาตรฐานของประเทศแคนาดา
(Canadian Standards Association : CSA) หรือมาตรฐานอื่นที่เทียบเท่าตามที่อธิบดีประกาศกำหนด ให้ถือว่าได้จัดให้มีระบบการจัดการด้านความปลอดภัยตามกฎกระทรวงนี้แล้ว', 'met', NULL, NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-007') L,
  (values
    (0, 'ข้อ ๘ เจ้าหน้าที่ความปลอดภัยในการทำงานระดับหัวหน้างานต้องเป็นลูกจ้างระดับหัวหน้างาน
        (๓) จัดทำคู่มือว่าด้วยความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงานของ หน่วยงานที่รับผิดชอบ โดยร่วมดำเนินการกับเจ้าหน้าที่ความปลอดภัยในการทำงานระดับเทคนิค ระดับ เทคนิคขั้นสูง หรือระดับวิชาชีพ เพื่อเสนอคณะกรรมการความปลอดภัยหรือนายจ้าง แล้วแต่กรณี และทบทวนคู่มือดังกล่าวตามที่นายจ้างกำาหนด โดยนายจ้างต้องกำหนดให้มีการทบทวนอย่างน้อยทุกหกเดือน ข้อ ๓ ให้นายจ้างจัดให้มีข้อบังคับและคู่มือว่าด้วยความปลอดภัยในการทำงานไว้ในสถานประกอบกิจการ', 'met', 'Safety', 'Annual', 'คู่มือว่าด้วยความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน', NULL),
    (1, 'ข้อ ๑๑ เจ้าหน้าที่ความปลอดภัยในการทำงานระดับบริหารต้องเป็นลูกจ้างระดับผู้บริหาร ข้อ ๔ ให้นายจ้างซึ่งมีผู้รับเหมาชั้นต้นหรือผู้รับเหมาช่วงเข้ามาปฏิบัติงานในสถานประกอบกิจการ จัดให้มีข้อบังคับและคู่มือตามข้อ ๓', 'met', 'Safety', 'Annual', 'ประกาศแต่งตั้งเจ้าหน้าที่ความปลอดภัยในการทำงานระดับบริหาร', NULL),
    (2, 'ข้อ ๕ ให้นายจ้างจัดการอบรมลูกจ้างให้มีความรู้เกี่ยวกับข้อบังคับและคู่มือตามข้อ ๓ ก่อนการปฏิบัติงาน', 'met', 'Safety', 'Annual', 'Training ประจำปี', NULL),
    (3, 'ข้อ ๗ ให้นายจ้างในสถานประกอบกิจการที่มีลูกจ้างตั้งแต่ยี่สิบคนขึ้นไป แต่งตั้งลูกจ้างระดับหัวหน้างาน', 'met', 'Safety', 'Annual', 'ประกาศแต่งตั้งเจ้าหน้าที่ความปลอดภัยในการทำงานระดับหัวหน้างาน', NULL),
    (4, 'ข้อ ๒๐ นายจ้างของสถานประกอบกิจการตามบัญชี ๑ ที่มีลูกจ้างจำนวนสองคนขึ้นไป และสถานประกอบกิจการตามบัญชี ๒ ที่มีลูกจ้างจำนวนหนึ่งร้อยคนขึ้นไป ต้องจัดให้ลูกจ้างซึ่งมีคุณสมบัติ ตามข้อ ๒๑ อย่างน้อยหนึ่งคน เป็นเจ้าหน้าที่ความปลอดภัยในการทำงานระดับวิชาชีพ เพื่อปฏิบัติหน้าที่ประจำสถานประกอบกิจการ ทั้งนี้ ภายในหนึ่งร้อยแปดสิบวันนับแต่วันที่มีลูกจ้างครบจำนวนดังกล่าว ข้อ ๑๖ ให้นายจ้างในสถานประกอบกิจการที่มีลูกจ้างตั้งแต่หนึ่งร้อยคนขึ้นไป แต่งตั้งลูกจ้างเป็นเจ้าหน้าที่ความปลอดภัยในการทำงานระดับวิชาชีพประจำสถานประกอบกิจการอย่างน้อยหนึ่งคน เพื่อปฏิบัติงานเฉพาะด้านความปลอดภัย', 'met', 'Safety', 'Annual', 'ประกาศแต่งตั้ง จป วิชาชีพ', NULL),
    (5, 'ข้อ ๒๓ นายจ้างต้องจัดให้เจ้าหน้าที่ความปลอดภัยในการทำงานระดับเทคนิค ระดับเทคนิคขั้นสูง และระดับวิชาชีพได้รับการฝึกอบรมหรือมีการพัฒนาความรู้เกี่ยวกับความปลอดภัยในการทำงานเพิ่มเติมปีละไม่น้อยกว่าสิบสองชั่วโมงตามหลักสูตรที่อธิบดีประกาศกำหนด โดยนายจ้างต้องแจ้งให้อธิบดีหรือผู้ซึ่งอธิบดีมอบหมายทราบภายในสามสิบวันนับแต่วันที่การดำเนินการดังกล่าวแล้วเสร็จ ข้อ ๑๙ ให้นายจ้างในสถานประกอบกิจการที่มีลูกจ้างตั้งแต่ยี่สิบคนขึ้นไป แต่งตั้งลูกจ้างระดับบริหารทุกคนเป็นเจ้าหน้าที่ความปลอดภัยในการทำงานระดับบริหารของสถานประกอบกิจการ', 'met', 'Safety', 'Annual', 'ประกาศแต่งตั้ง จป วิชาชีพ', NULL),
    (6, 'ข้อ ๒๕ นายจ้างของสถานประกอบกิจการที่มีลูกจ้างจำนวนห้าสิบคนขึ้นไป ต้องจัดให้มีคณะกรรมการความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงานของสถานประกอบกิจการภายในสามสิบวันนับแต่วันที่มีลูกจ้างครบจำนวนดังกล่าว 
          คณะกรรมการความปลอดภัยตามวรรคหนึ่ง ต้องประกอบด้วย นายจ้างหรือผู้แทนนายจ้างระดับบริหาร เป็นประธานกรรมการความปลอดภัย ผู้แทนนายจ้างระดับบังคับบัญชา และผู้แทนลูกจ้าง เป็นกรรมการความปลอดภัย ในการแต่งตั้งคณะกรรมการความปลอดภัยตามวรรคสอง 
         หากสถานประกอบกิจการตามวรรคหนึ่ง เป็นสถานประกอบกิจการในบัญชี ๑ หรือบัญชี ๒ ให้นายจ้างแต่งตั้งผู้แทนนายจ้าง ระดับบังคับบัญชาซึ่งเป็นเจ้าหน้าที่ความปลอดภัยในการทำงานระดับเทคนิคขั้นสูงหรือระดับวิชาชีพ จำนวนหนึ่งคน แล้วแต่กรณี เป็นกรรมกาความปลอดภัยและเลขานุการ
         (จำนวนคณะกรรมการความปลอดภัย (๒) ไม่น้อยกว่าเจ็ดคน ส าหรับสถานประกอบกิจการที่มีลูกจ้างจำนวนหนึ่งร้อยคนขึ้นไปแต่ไม่ถึงห้าร้อยคน) ข้อ ๒๓ สถานประกอบกิจการที่มีลูกจ้างตั้งแต่หนึ่งร้อยคนขึ้นไปแต่ไม่ถึงห้าร้อยคน ให้มีกรรมการไม่น้อยกว่าเจ็ดคน ประกอบด้วย นายจ้างหรือผู้แทนนายจ้างระดับบริหาร เป็นประธานกรรมการผู้แทนนายจ้างระดับบังคับบัญชาสองคนและผู้แทนลูกจ้างสามคน เป็นกรรมการ โดยมีเจ้าหน้าที่ความปลอดภัยในการทำงานระดับวิชาชีพ เป็นกรรมการและเลขานุการ', 'met', 'Safety', 'Annual', 'ประกาศแต่งตั้งคณะกรรมการความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงานของสถานประกอบกิจการ', NULL),
    (7, 'ข้อ ๓๓ ให้นายจ้างในสถานประกอบกิจการที่มีลูกจ้างตั้งแต่สองร้อยคนขึ้นไป จัดให้มีหน่วยงานความปลอดภัยภายในสามร้อยหกสิบวันนับแต่วันที่กฎกระทรวงนี้มีผลใช้บังคับ หรือภายในสามร้อยหกสิบวันนับแต่วันที่มีลูกจ้างครบสองร้อยคน', 'met', 'Safety', 'Annual', 'ติดตามจำนวนคนในที่ประชุม คปอ', NULL),
    (8, 'ข้อ ๔๒ นายจ้างต้องนำรายชื่อเจ้าหน้าที่ความปลอดภัยในการทำงานระดับหัวหน้างาน ระดับบริหาร ระดับเทคนิค ระดับเทคนิคขั้นสูง หรือระดับวิชาชีพ และผู้บริหารหน่วยงานความปลอดภัย ไปขึ้นทะเบียนต่อกรมสวัสดิการและคุ้มครองแรงงาน พร้อมเอกสารหรือหลักฐานตามที่ระบุไว้ในแบบคำขอ ภายในสามสิบวันนับแต่วันที่นายจ้างแต่งตั้งบุคคลดังกล่าว ข้อ ๓๖ ให้นายจ้างแจ้งชื่อเจ้าหน้าที่ความปลอดภัยในการทำงานตามหมวด ๑ เพื่อขึ้นทะเบียนต่อกรมสวัสดิการและคุ้มครองแรงงาน ตามหลักเกณฑ์และวิธีการที่อธิบดีประกาศกำหนด', 'met', 'Safety', 'Annual', 'เอกสารขึ้นทะเบียน จป ระดับต่างๆ ต่อกรมสวัสดิการและคุ้มครองแรงงาน', NULL),
    (9, 'ข้อ ๔๗ ให้นายจ้างจัดส่งรายงานผลการดำเนินงานของเจ้าหน้าที่ความปลอดภัยในการทำงาน ระดับเทคนิค ระดับเทคนิคขั้นสูง และระดับวิชาชีพ ต่ออธิบดีหรือผู้ซึ่งอธิบดีมอบหมาย สองครั้ง โดยครั้งแรกภายในสามสิบวันนับแต่วันที่ ๓๐ มิถุนายน และครั้งที่สองภายในสามสิบวันนับแต่วันที่ ๓๑ ธันวาคม ของทุกปี ทั้งนี้ ตามแบบที่อธิบดีประกาศกำหนด ข้อ ๓๗ ให้นายจ้างส่งรายงานผลการดำเนินงานของเจ้าหน้าที่ความปลอดภัยในการทำงานระดับเทคนิคขั้นสูงและระดับวิชาชีพต่ออธิบดีหรือผู้ซึ่งอธิบดีมอบหมายตามแบบที่อธิบดีประกาศกำหนด ทุกสามเดือนตามปีปฏิทิน ทั้งนี้ ภายในเวลาไม่เกินสามสิบวันนับแต่วันที่ครบกำหนด', 'met', 'Safety', 'Annual', 'รายงานผลการดำเนินงานของเจ้าหน้าที่ความปลอดภัยในการทำงาน รระดับวิชาชีพ', NULL),
    (10, 'ข้อ ๓๘ เมื่อลูกจ้างประสบอันตราย เจ็บป่วย หรือสูญหายตามกฎหมายว่าด้วยเงินทดแทนให้นายจ้างแจ้งการประสบอันตราย เจ็บป่วย หรือสูญหายต่ออธิบดีหรือผู้ซึ่งอธิบดีมอบหมายตามหลักเกณฑ์และวิธีการที่อธิบดีประกาศกำหนด ภายในสิบห้าวันนับแต่วันที่นายจ้างทราบหรือควรจะได้ทราบถึงการประสบอันตราย เจ็บป่วย หรือสูญหาย', 'met', 'Safety', 'Annual', NULL, NULL),
    (11, 'ข้อ ๔๖ เมื่อมีคำสั่งแต่งตั้งคณะกรรมการความปลอดภัยหรือกรรมการความปลอดภัย ให้นายจ้างส่งสำเนาคำสั่งดังกล่าวต่ออธิบดีหรือผู้ซึ่งอธิบดีมอบหมาย ภายในสิบห้าวันนับแต่วันที่มีคำสั่ง แต่งตั้ง ข้อ ๔๐ นายจ้างต้องจัดทำสำเนาบันทึก รายงานการดำเนินงาน หรือรายงานการประชุมเกี่ยวกับการดำเนินการของคณะกรรมการและหน่วยงานความปลอดภัย เก็บไว้ในสถานประกอบกิจการเป็นเวลาไม่น้อยกว่าสองปีนับแต่วันจัดทำ และพร้อมที่จะให้พนักงานตรวจแรงงานตรวจสอบ', 'met', 'Safety', 'Annual', 'รายงานการดำเนินงาน หรือรายงานการประชุมเกี่ยวกับการดำเนินการของคณะกรรมการและหน่วยงานความปลอดภัย', NULL),
    (12, 'ข้อ ๔๑ ให้นายจ้างส่งสำเนารายชื่อคณะกรรมการและหน้าที่รับผิดชอบตามข้อ ๓๒ ต่ออธิบดีหรือผู้ซึ่งอธิบดีมอบหมายภายในสิบห้าวันนับแต่วันที่แต่งตั้งหรือเปลี่ยนแปลงกรรมการ', 'met', 'Safety', 'Annual', 'การรายงานผล: สวัสดิการและคุ้มครองแรงงาน', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-008') L,
  (values
    (0, '2. ให้นายจ้างติดประกาศสัญลักษณ์เตือนอันตราย และเครื่องหมายเกี่ยวกับความปลอดภัยฯ ให้เหมาะสมกับลักษณะและสภาพการทำงานในที่ที่เห็นได้ง่าย ณ สถานประกอบกิจการ', 'met', 'Safety
Data center
MTN
Implement', NULL, NULL, NULL),
    (1, '3. ให้นายจ้างติดประกาศข้อความแสดงสิทธิและหน้าที่ของนายจ้างและลูกจ้างตามที่กำหนดไว้ในประกาศฉบับนี้ ในที่ที่เห็นได้ง่าย ณ สถานประกอบกิจการ ซึ่งต้องประกอบด้วยข้อความต่อไปนี้', 'met', 'Safety', NULL, NULL, NULL),
    (2, '(1) นายจ้างและลูกจ้างมีหน้าที่ในการปฏิบัติตามพระราชบัญญัติความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน พ.ศ. 2554', 'met', 'Safety', NULL, NULL, NULL),
    (3, '(2) นายจ้างมีหน้าที่จัดและดูแลสถานประกอบการและลูกจ้างให้มีสภาพการทำงานและสภาพแวดล้อมในการทำงานที่ปลอดภัยและถูกสุขลักษณะ', 'met', 'Safety', NULL, NULL, NULL),
    (4, '(3) นายจ้างมีหน้าที่จัดและดูแลให้ลูกจ้างสวมใส่อุปกรณ์ป้องกันอันตรายส่วนบุคคล', 'met', 'Safety
Data center
MTN
Implement', NULL, NULL, NULL),
    (5, '(4) นายจ้างมีหน้าที่จัดให้ผู้บริหาร หัวหน้างานและลูกจ้างทุกคนได้รับการฝึกอบรมให้สามารถบริหารจัดการและดำเนินงานด้านความปลอดภัย อาชีวอนามัยและสภาพแวดล้อมในการทำงานได้อย่างปลอดภัย', 'met', 'Safety
QA', NULL, NULL, NULL),
    (6, '(5) นายจ้างมีหน้าที่แจ้งให้ลูกจ้างทราบถึงอันตรายที่อาจเกิดขึ้นจากการทำงานและแจกคู่มือปฏิบัติงานให้ลูกจ้างทุกคน', 'met', 'Safety', NULL, NULL, NULL),
    (7, '(6) นายจ้างมีหน้าที่ติดประกาศ คำเตือน คำสั่ง หรือคำวินิจฉัยของอธิบดีกรมสวัสดิการและคุ้มครองแรงงาน พนักงานตรวจความปลอดภัย หรือคณะกรรมการความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน แล้วแต่กรณี', 'met', 'Safety', NULL, NULL, NULL),
    (8, '(7) นายจ้างเป็นผู้ออกค่าใช้จ่ายในการดำเนินงานด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน', 'met', 'Safety
OFP', NULL, NULL, NULL),
    (9, '(8) ลูกจ้างมีหน้าที่ให้ความร่วมมือกับนายจ้างในการดำเนินการและส่งเสริมด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน โดยคำนึงถึงสภาพของงานและหน้าที่รับผิดชอบ', 'met', 'ทุกคน', NULL, NULL, NULL),
    (10, '(9) ลูกจ้างมีหน้าที่แจ้งข้อบกพร่องของสภาพการทำงานหรือการชำรุดเสียหายของอาคาร สถานที่ เครื่องมือ เครื่องจักร หรืออุปกรณ์ ที่ไม่สามารถแก้ไขด้วยตนเองต่อเจ้าหน้าที่ความปลอดภัยในการทำงาน หัวหน้างาน หรือผู้บริหาร', 'met', 'ทุกคน', NULL, NULL, NULL),
    (11, '(10) ลูกจ้างมีหน้าที่สวมใส่อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลที่นายจ้างจัดให้และดูแลให้สามารถใช้งานได้', 'met', 'ทุกคน', NULL, NULL, NULL),
    (12, '(11) ในสถานที่ที่มีสถานประกอบกิจการหลายแห่ง ลูกจ้างมีหน้าที่ปฏิบัติตามหลักเกณฑ์เกี่ยวกับความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงานของนายจ้าง และสถานประกอบกิจการอื่นที่ไม่ใช่ของนายจ้างด้วย', 'met', 'ทุกคน', NULL, NULL, NULL),
    (13, '(12) ลูกจ้างมีสิทธิได้รับความคุ้มครองจากการเลิกจ้าง หรือถูกโยกย้ายหน้าที่การงานเพราะเหตุที่ฟ้องร้อง เป็นพยาน ให้หลักฐาน หรือให้ข้อมูลเกี่ยวกับความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงานต่อพนักงานตรวจความปลอดภัย คณะกรรมการความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน หรือศาล', 'met', 'ทุกคน', NULL, NULL, NULL),
    (14, '(13) ลูกจ้างมีสิทธิได้รับค่าจ้างหรือสิทธิประโยชน์อื่นใด ในระหว่างหยุดการทำงานหรือหยุดกระบวนการผลิตตามคำสั่งของพนักงานตรวจความปลอดภัย เว้นแต่ลูกจ้างที่จงใจกระทำการอันเป็นเหตุให้มีการหยุดการทำงานหรือหยุดกระบวนการผลิต', 'met', 'ทุกคน', NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-009') L,
  (values
    (0, 'กำหนดให้นายจ้างต้องนารายชื่อเจ้าหน้าที่ความปลอดภัยในการทางานระดับ
หัวหน้างาน ระดับบริหาร ระดับเทคนิค ระดับเทคนิคขั้นสูง หรือระดับวิชาชีพ และผู้บริหารหน่วยงาน
ความปลอดภัย แจ้งการขึ้นทะเบียน การพ้นจากตาแหน่งหรือพ้นจากหน้าที่ของบุคคลดังกล่าวให้กรมสวัสดิการและคุ้มครองแรงงานทราบภายในสามสิบวัน', 'met', 'SHE', 'กรมสวัสดิการและคุ้มครองแรงงาน', 'แบบคำขอการแจ้งการขึ้นทะเบียน การพ้นจากตำแหน่งหรือพ้นจากหน้าที่
ของเจ้าหน้าที่ความปลอดภัยในการทำงาน และผู้บริหารหน่วยงานความปลอดภัย
การรายงานผล: ภายในสามสิบวันหลังแต่งตั้ง', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-010') L,
  (values
    (0, 'กำหนดให้นายจ้างต้องจัดให้เจ้าหน้าที่ความปลอดภัยในการทำงานระดับเทคนิค ระดับเทคนิคขั้นสูง และระดับวิชาชีพ ได้รับการฝึกอบรมหรือการพัฒนาความรู้เกี่ยวกับความปลอดภัยในการทำงานเพิ่มเติม ปีละไม่น้อยกว่าสิบสองชั่วโมงตามหลักสูตรที่อธิบดีประกาศกำหนด
หลักสูตรการฝึกอบรมหรือการพัฒนาความรู้เกี่ยวกับความปลอดภัยในการทำงาน
1.การฝึกอบรม
  1.1 ด้านกฎหมายความปลอดภัย
  1.3 ด้านวิชาการเกี่ยวกับความปลอดภัย
  1.4  ด้านอื่น ๆ ที่เกี่ยวข้องกับความปลอดภัย
2.  การพัฒนาความรู้ 
  2.1 การเข้าร่วมการประชุมหรือการสัมมนาวิชาการ
  2.2 การนำเสนอผลงานทางวิชาการ
  2.3 การศึกษาดูงานทั้งในประเทศและต่างประเทศ
แจ้งรายงานผลที่ สนง.สวัสดิการหรือทางอิเลคทรอนิคส์ภายในสามสิบวันนับแต่วันที่ดำเนินการดังกล่าวแล้วเสร็จ', 'met', 'SHE', 'กรมสวัสดิการและคุ้มครองแรงงาน', 'แบบแจ้งการฝึกอบรมหรือการพัฒนาความรู้เกี่ยวกับความปลอดภัยในการทำงานเพิ่มเติม
การรายงานผล: ภายในสามสิบวันนับแต่วันที่ดำเนินการดังกล่าวแล้วเสร็จ', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-011') L,
  (values
    (0, 'ข้อ 41. ผู้รับใบอนุญาตประกอบกิจการโรงงาน ต้องจัดให้มีน้ำสะอาดสำหรับดื่มตามมาตรฐานน้ำบริโภคอย่างพอเพียงไว้เป็นที่ต่างหาก อย่างน้อยในอัตราคนงานไม่เกิน 40 คน 1 ที่ คนงานไม่เกิน 80 คน 2 ที่ และเพิ่มขึ้นต่อจากนี้อัตราส่วน 1 ที่ ต่อจำนวนคนงานไม่เกิน 50 คน
ข้อ 42. ต้องจัดหาและรักษาอุปกรณ์การดื่ม และภาชนะที่บรรจุน้ำดื่มให้พอเพียงและอยู่ในสภาพที่สะอาดถูกสุขลักษณะ”', 'met', 'corporate affair', NULL, 'น้ำยี่ห้อ Sprinkle ถัง 18.9 ลิตร มีผลตรวจน้ำดื่มประจำเดือน', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-012') L,
  (values
    (0, 'ข้อ ๑ ในสถานที่ทํางานของลูกจ้าง ให้นายจ้างจัดให้มี
(1)ต้องจัดให้มีน้ำสะอาดสำหรับดื่มตามมาตรฐานน้ำบริโภคอย่างพอเพียงไว้เป็นที่ต่างหาก อย่างน้อยในอัตราคนงานไม่เกิน 40 คน 1 ที่ เศษของสี่สิบคนถ้าเกินยี่สิบคนให้ถือเป็นสี่สิบคน', 'met', 'corporate affair', NULL, 'น้ำยี่ห้อ Sprinkle ถัง 18.9 ลิตร มีผลตรวจน้ำดื่มประจำเดือน
https://jastelnet.sharepoint.com/:f:/s/JastelNetworkCompanyLimited/EitsqNlsITNIpn3wMSoD2d0B-AkptZ5cxxsDvNKz5aYuRA?e=eNevVN', NULL),
    (1, '(2) ห้องน้ำและห้องส้วมตามแบบและจำนวนที่กำหนดในกฎหมายและมีการดูแลรักษาความสะอาดให้อยู่ในสภาพที่ถูกสุขลักษณะเป็นประจำทุกวัน ให้นายจ้างจัดให้มีห้องน้ำและห้องส้วมแยกสำหรับลูกจ้างชายและลูกจ้างหญิง และในกรณีที่มีลูกจ้างที่เป็นคนพิการ ให้นายจ้างจัดให้มีห้องน้ำและห้องส้วมสำหรับคนพิการแยกไว้โดยเฉพาะ', 'met', 'PA
corporate affair', NULL, NULL, NULL),
    (2, 'ข้อ 2.ในสถานที่ทำงานของลูกจ้าง ให้นายจ้างจัดให้มีสิ่งจำเป็นในการปฐมพยาบาลและการรักษาพยาบาล ดังต่อไปนี้
(2.1) สถานที่ทำงานที่มีลูกจ้างทำงานตั้งแต่สิบคนขึ้นไป ต้องจัดให้มีเวชภัณฑ์และยาเพื่อใช้ในการปฐมพยาบาลในจำนวนที่เพียงพอ อย่างน้อยตามรายการที่กำหนด ดังนี้
ให้นายจ้างจัดให้มีสิ่งจำเป็นในการปฐมพยาบาลและการรักษาพยาบาล ดังต่อไปนี้
- กรรไกร  - แก้วยาน้ำ และแก้วยาเม็ด  - เข็มกลัด  - ถ้วยน้ำ
- ที่ป้ายยา  - ปรอทวัดไข้  - ปากคีบปลายทู่  - ผ้าพันยืด  - ผ้าสามเหลี่ยม
- สายยางรัดห้ามเลือด  - สำลี ผ้าก๊าซ ผ้าพันแผล และผ้ายางปลาสเตอร์ปิดแผล
- หลอดหยดยา  - ขี้ผึ้งแก้ปวดบวม  - ทิงเจอร์ไอโอดีน หรือโพวิโดน-ไอโอดีน
- น้ำยาโพวิโดน-ไอโอดีน ชนอดฟอกแผล  - ผงน้ำตาลเกลือแร่
- ยาแก้ผดผื่นที่ไม่ได้มาจากการติดเชื้อ  - ยาแก้แพ้  - ยาทาแก้ผดผื่นคัน
- ยาธาตุน้ำแดง - ยาบรรเทาปวดลดไข้  - ยารักษาแผลน้ำร้อนลวก
- ยาลดกรดในกระเพาะอาหาร  - เหล้าแอมโมเนียหอม  - แอลกอฮอล์เช็ดแผล
- ขี้ผึ้งป้ายตา  - ถ้วยล้างตา  - น้ำกรดบอริคล้างตา  - ยาหยอดตา', 'met', 'Safety Officer
corporate affair', NULL, 'รายการยาและเวชภัณฑ์และการตรวจสอบประจำเดือน', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-013') L,
  (values
    (0, '1. ให้นายจ้างใช้ลูกจ้างทำงานยก แบก หาม หาบ ทูน ลาก หรือเข็นของหนักไม่เกินอัตราน้ำหนักโดยเฉลี่ยต่อลูกจ้างหนึ่งคน ดังต่อไปนี้  
(1)  20 กิโลกรัมสำหรับลูกจ้างซึ่งเป็นเด็กหญิงอายุตั้งแต่ 15 ปีแต่ยังไม่ถึง 18 ปี
 (2) 25 กิโลกรัมสำหรับลูกจ้างซึ่งเป็นเด็กชายอายุตั้งแต่ 15 ปีแต่ยังไม่ถึง 18 ปี
 (3) 25 กิโลกรัมสำหรับลูกจ้างซึ่งเป็นหญิง
 (4) 55 กิโลกรัมสำหรับลูกจ้างซึ่งเป็นชาย', 'met', 'Safety', NULL, '-ระบุเป็นข้อปฏิบัติไว้ในคูมือความปลอดภัยฯ ISD-125
-มีการนำไปสอนในหลักสูตรความปลอดภัยสำหรับพนักงานใหม่ พนักงานทั่วไป', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-014') L,
  (values
    (0, '1. ให้งานทุกประเภทมีเวลาทำงานปกติไม่เกิน 8 ชั่วโมง 
2. งานที่อาจเป็นอันตรายต่อสุขภาพและความปลอดภัยของลูกจ้าง ได้แก่  
(1) งานที่ต้องทำใต้ดิน ใต้น้ำ ในถ้ำ อุโมงค์ หรือในที่อับอากาศ  
(3) งานเชื่อมโลหะ
(6) งานที่ต้องทำด้วยเครื่องมือหรือเครื่องจักรซึ่งผู้ทำได้รับความสั่นสะเทือน อันอาจเป็นอันตราย', 'met', 'Safety', NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-015') L,
  (values
    (0, '3. มาตรฐานอุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคล ได้แก่ มาตรฐานผลิตภัณฑ์อุตสาหกรรม มาตรฐานขององค์กรมาตรฐานสากลโลก  (International Standardization and Organization : ISO) มาตรฐานสหภาพยุโรป (European Standards : EN) มาตรฐานประเทศออสเตรเลียและ ประเทศนิวซีแลนด์ (Australia Standards/New Zealand Standards :  AS/NZS) มาตรฐานสถาบันมาตรฐานแห่งชาติประเทศสหรัฐอเมริกา   (American National Standaeds Institute : ANSI) มาตรฐานอุตสาหกรรมประเทศญี่ปุ่น(Japanese Industrial Standards : JIS) มาตรฐานสถาบัน ความปลอดภัยและอนามัยในการทำงานแห่งชาติประเทศสหรัฐอเมริกา (The National Institute for Ocupational Safety and Health : NIOSH)  มาตรฐานสำนักงานบริหารความปลอดภัย และอาชีวอนามัยแห่งชาติ         กรมแรงงานประเทศสหรัฐอเมริกา  (Occupational Safety and Health Administration : OSHA) และมาตรฐานสมาคมป้องกันอัคคีภัยแห่งชาติสหรัฐอเมริกา(National Fire Protection Association : NFPA)', 'met', 'Safety
Data center
MTN
Implement', NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-016') L,
  (values
    (0, 'ออกประกาศกำหนดมาตรฐานผลิตภัณฑ์อุตสาหกรรม รองเท้าหนังนิรภัย มาตรฐานเลขที่ มอก. 523-2554 ขึ้นใหม่ ดังท้ายประกาศนี้  ครอบคลุมเฉพาะรองเท้านิรภัยที่ทำด้วยหนังแท้หรือหนังเทียมเท่านั้น', 'met', 'Safety
Data center
MTN
Implement', NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-017') L,
  (values
    (0, 'ยกเลิกประกาศกระทรวงอุตสาหกรรมฉบับที่ 1086 (พ.ศ. 2529) และฉบับที่ 1087 (พ.ศ. 2529) ออกตามความในพระราชบัญญัติมาตรฐานผลิตภัณฑ์อุตสาหกรรม พ.ศ. 2511 เรื่อง ยกเลิกและกำหนดมาตรฐานผลิตภัณฑ์อุตสาหกรรม สีและเครื่องหมายเพื่อความปลอดภัย เล่ม 1 สีและรูปแบบ และเรื่อง กำหนดมาตรฐานผลิตภัณฑ์อุตสาหกรรม สีและเครื่องหมายเพื่อความปลอดภัย เล่ม 2 สมบัติทางสีและแสงของวัสดุ และออกประกาศกำหนดมาตรฐานลิตภัณฑ์อุตสาหกรรม สีและเครื่องหมายเพื่อความปลอดภัยมาตรฐานที่ มอก.635-2554 ขึ้นใหม่', 'met', 'Safety', NULL, NULL, NULL),
    (1, 'กำหนดรายละเอียดเกี่ยวกับสีที่ใช้ในการชี้บ่งความปลอดภัยและหลักการออกแบบเครื่องหมายเพื่อความปลอดภัยที่ใช้ในสถานที่ทำงานและพื้นที่สาธารณะ', 'met', NULL, NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-018') L,
  (values
    (0, 'กำหนดมาตรฐานผลิตภัณฑ์อุตสาหกรรม หลักการและแนวทางการบริหารความเสี่ยง  มาตรฐานเลขที่ มอก. 31000-2555 (ISO 31000 : 2009)
1. ขอบข่าย
2. บทนิยาม
3. หลักการ
4. กรอบงาน
 ทั่วไป
 ข้อบังคับและความมุ่งมั่นของผู้บริหาร
 การกำหนดกรอบการบริหารความเสี่ยง
 การนำการบริหารความเสี่ยงไปปฏิบัติ
 การเฝ้าติดตามและการทบทวนกรอบการบริหารความเสี่ยง
 การปรับปรุงกรอบการบริหารความเสี่ยงอย่างต่อเนื่อง', 'met', 'Safety', NULL, NULL, NULL),
    (1, '5. กระบวนการ
 ทั่วไป
 การสื่อสารและการปรึกษา
  การกำหนดบริบท
  การประเมินความเสี่ยง
  การจัดการความเสี่ยง
  การติดตามตรวจสอบและการทบทวน
  การบันทึกกระบวนการบริหารความเสี่ยง
ภาคผนวก ก. คุณลักษณะในการส่งเสริมการบริหารความเสี่ยง', 'met', NULL, NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-019') L,
  (values
    (0, 'มาตรา 18    เมื่อลูกจ้างประสบอันตราย  หรือเจ็บป่วย  หรือสูญหาย  ให้นายจ้างจ่ายค่าทดแทนเป็นรายเดือนให้แก่ลูกจ้างหรือผู้มีสิทธิแล้วแต่กรณี ดังนี้', 'met', 'Safety
OFP
HR', 'เมื่อเกิดอุบัติเหตุร้ายแรง', 'การรายงานผล: สวัสดิการและคุ้มครองแรงงาน', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-020') L,
  (values
    (0, '3. การแจ้งเป็นหนังสือในกรณีที่สถานประกอบกิจการเกิดอุบัติภัยร้ายแรง หรือลูกจ้างประสบอันตรายจากการทำงาน และสภาพแวดล้อมในการทำงาน ตามมาตรา 34 วรรคสอง แห่งพระราชบัญญัติความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน พ.ศ. 2554 ให้เป็นไปตามแบบ สปร. 5 ท้ายประกาศนี้', 'met', 'Safety
OFP
HR', 'เมื่อเกิดอุบัติเหตุร้ายแรง', 'การรายงานผล: สวัสดิการและคุ้มครองแรงงาน', NULL),
    (1, '(1) กรณีลูกจ้างเสียชีวิต ให้แจ้งในทันทีที่ทราบโดยโทรศัพท์ โทรสาร หรือวิธีอื่นใดที่มีรายละเอียดพอสมควร และแจ้งเป็นหนังสือต่อพนักงานตรวจความปลอดภัยตามแบบ สปร. 5  ภายใน 7 วัน', 'met', NULL, NULL, NULL, NULL),
    (2, '(2) กรณีที่สถานประกอบกิจการได้รับความเสียหายหรือต้องหยุดการผลิต หรือมีบุคคลประสบอันตรายหรือได้รับความเสียหายอันเนื่องมาจากเพลิงไหม้ การระเบิด สารเคมีรั่วไหล หรืออุบัติภัยร้ายแรงอื่น ให้นายจ้างแจ้งต่อพนักงานตรวจความปลอดภัยในทันทีที่ทราบโดยโทรศัพท์ โทรสาร', 'met', NULL, NULL, NULL, NULL),
    (3, 'หรือวิธีอื่นใด และให้แจ้งเป็นหนังสือโดยระบุสาเหตุอันตรายที่เกิดขึ้น ความเสียหาย การแก้ไขและวิธีการป้องกันการเกิดซ้ำอีกตามแบบ สปร. 5  ภายใน 7 วัน', 'met', NULL, NULL, NULL, NULL),
    (4, '(3) กรณีที่มีลูกจ้างประสบอันตราย หรือเจ็บป่วยตามกฎหมายว่าด้วยเงินทดแทน เมื่อนายจ้างแจ้งการประสบอันตรายหรือเจ็บป่วยต่อสำนักงานประกันสังคมตามกฎหมายดังกล่าวแล้ว ให้นายจ้างนำสำเนา กท. 16 เพียงอย่างเดียวแจ้งต่อพนักงานตรวจความปลอดภัยภายใน 7 วัน ทั้งนี้ อาจแนบแบบ สปร.5 ไปด้วยหรือไม่ก็ได้', 'met', NULL, NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-022') L,
  (values
    (0, 'กำหนดมาตรฐานผลิตภัณฑ์อุตสาหกรรมระบบการจัดการอาชีวอนามัยและความปลอดภัย – ข้อกำหนดและข้อแนะนำในการใช้มาตรฐานเลขที่ มอก. 45001 - 2561', 'met', 'Safety
QA', 'ทุกรอบการประเมินกฎหมาย', 'การรายงานผล: สวัสดิการและคุ้มครองแรงงาน', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-023') L,
  (values
    (0, 'นายจ้างต้องจัดให้เจ้าหน้าที่ความปลอดภัยระดับเทคนิค ระดับเทคนิคขั้นสูง และระดับวิชาชีพ ได้รับการฝึกอบรมหรือการพัฒนาความรู้เกี่ยวกับความปลอดภัยในการทำงานเพิ่มเติม ปีละไม่น้อยกว่า 12 ชั่วโมงตามหลักสูตรแนบท้ายประกาศนี้ ได้แก่
   (1) การฝึกอบรม
          1.1 ด้านกฎหมายความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงานและกฎหมายที่เกี่ยวข้อง หรือกฎหมายที่เกี่ยวข้องกับความปลอดภัยในการทำงาน เช่น พ.ร.บ.ควบคุมโรคจากการประกอบอาชีพและโรคจากสิ่งแวดล้อม พ.ศ. 2562 เป็นต้น
          1.2 ด้านวิชาการเกี่ยวกับความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน เช่น การระบายอากาศในงานอุตสาหกรรม การควบคุมมลพิษอากาศ ระบบการจัดการอาชีวอนามัยและความปลอดภัย เป็นต้น
          1.3 ด้านอื่น ๆ ที่เกี่ยวข้องกับความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน เช่น เทคนิคการเป็นวิทยากร เทคโนโลยีสะอาด สภาวะโลกร้อน  เป็นต้น
    (2) การพัฒนาความรู้
          2.1 การเข้าร่วมการประชุมหรือการสัมมนาวิชาการ
          2.2 การนำเสนอผลงานทางวิชาการ และการเข้าร่วมกิจกรรมต่างๆ ที่เกี่ยวข้องกับงานความปลอดภัยอาชีวอนามัย และสภาพแวดล้อมในการทำงาน ที่จัดโดยสถาบันการศึกษา หรือหน่วยงานอื่น
          2.3 การศึกษาดูงานทั้งในประเทศและต่างประเทศ', 'met', 'Safety
QA', 'ทุกรอบการประเมินกฎหมาย', 'การรายงานผล: สวัสดิการและคุ้มครองแรงงาน', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-024') L,
  (values
    (0, 'ให้นายจ้างจัดส่งรายงานผลการดำเนินงานของ จป. ระดับเทคนิค จป.ระดับเทคนิคขั้นสูง และ จป.ระดับวิชาชีพ ตามแบบ จป.ท จป.ส และ จป.ว ท้ายประกาศนี้ จำนวน 2 ครั้ง  โดยครั้งแรกภายใน 30 วันนับแต่วันที่ 30 มิถุนายน และครั้งที่สอง ภายใน 30 วันนับแต่วันที่ 31 ธันวาคม ของทุกปี', 'met', 'Safety', 'ทุกรอบการประเมินกฎหมาย', '-รายชื่อ จป.แต่ละระดับ
-เอกสารแต่งตั้ง และแจ้งชื่อ จป.
การรายงานผล: สวัสดิการและคุ้มครองแรงงาน', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-025') L,
  (values
    (0, 'ให้นายจ้างนำรายชื่อ จป. ระดับหัวหน้างาน ระดับบริหาร ระดับเทคนิค ระดับเทคนิคขั้นสูง หรือระดับวิชาชีพ และผู้บริหารหน่วยงานความปลอดภัยไปแจ้งเพื่อขึ้นทะเบียนภายใน 30 วันนับแต่วันที่นายจ้างแต่งตั้งบุคคลดังกล่าว  พร้อมเอกสารหรือหลักฐานดังนี้
     1) สำเนาเอกสารการแต่งตั้งเป็นเจ้าหน้าที่ความปลอดภัยในการทำงาน และผู้บริหารหน่วยงานความปลอดภัย
     2) สำเนาใบรับรองผ่านการฝึกอบรมหลักสูตรเจ้าหน้าที่ความปลอดภัยในการทำงาน และผู้บริหารหน่วยงานความปลอดภัย หรือสำเนาวุฒิการศึกษาในกรณีที่มีคุณสมบัติโดยใช้วุฒิการศึกษา
     3) สำเนาหนังสือเดินทางหรือสำเนาใบอนุญาตทำงาน กรณีบุคคลซึ่งไม่มีสัญชาติไทย
     4) สำเนาเอกสารหรือหลักฐานการขึ้นทะเบียน', 'met', 'Safety', 'ทุกรอบการประเมินกฎหมาย', '-รายชื่อ จป.แต่ละระดับ
-เอกสารแต่งตั้ง และแจ้งชื่อ จป.
การรายงานผล: สวัสดิการและคุ้มครองแรงงาน', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-026') L,
  (values
    (0, 'หากพบผู้ซึ่งเป็นหรือมีเหตุอันควรสงสัยว่าเป็นโรคจากการประกอบอาชีพหรือ โรคจากสิ่งแวดล้อมในเขตจังหวัด ภายในสามวันนับแต่พบผู้ซึ่งเป็นหรือมีเหตุ อันควรสงสัยว่าเป็นโรคจากการประกอบอาชีพหรือโรคจากสิ่งแวดล้อม', 'met', 'Safety และหน่วยงานต้นสังกัดพนักงาน', 'ทุกรอบการประเมินกฎหมาย', 'เฝ้าระวังผู้ปฏิบัติงาน
ผลตรวจสุขภาพพนักงาน
การรายงานผล: สวัสดิการและคุ้มครองแรงงาน', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-027') L,
  (values
    (0, 'หลักสูตร การฝึกอบรม คุณสมบัติของวิทยากร และการดำเนินการฝึกอบรมของนายจ้างหรือผู้ให้บริการ
ด้านการฝึกอบรมให้เป็นไปตามที่อธิบดีประกาศกาหนด', 'met', 'Safety
QA
และหน่วยงานต้นสังกัดพนักงาน', 'ทุกรอบการประเมินกฎหมาย', '-รายชื่อ จป.แต่ละระดับ
-เอกสารแต่งตั้ง และแจ้งชื่อ จป. หลังอบรมเรียบร้อย
การรายงานผล: สวัสดิการและคุ้มครองแรงงาน', '-กำนดแผนฝึกอบรมโดย QA Training 
- อยู่ระหว่างติดตามการเปืดคอร์สอบรม  
ดูข้อมูลเพิ่มเติมคลิกที่ลิ้งค์ด้านล่าง')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-028') L,
  (values
    (0, 'กำหนดหลักสูตรคณะกรรมการความฯ ระยะเวลาการฝึกอบรม 12 ชั่วโมง ประกอบด้วย 3 หมวดวิชา ดังต่อไปนี้
    (1) หมวดวิชาที่ 1 การบริหารคณะกรรมการความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงานของสถานประกอบกิจการ (3 ชั่วโมง)
    (2) หมวดวิชาที่ 2 กฎหมายความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน (3 ชั่วโมง)
    (3) หมวดวิชาที่ 3 การบริหาร จัดการด้านความปลอดภัยตามบทบาทหน้าที่ของคณะกรรมการความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงานของสถานประกอบกิจการ (6 ชั่วโมง)
    โดยหัวข้อวิชาเป็นไปตามที่ประกาศนี้กำหนด', 'met', 'Safety
QA
และหน่วยงานต้นสังกัดพนักงาน', 'ทุกรอบการประเมินกฎหมาย', 'เอกสาแต่งตั้ง คปอ. (ยังไม่มีการเปลี่ยนแปลง คปอ. คนใหม่ ที่ต้องส่งอบรม)
การรายงานผล: สวัสดิการและคุ้มครองแรงงาน', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-029') L,
  (values
    (0, 'ให้ผู้รับใบสำคัญและผู้รับใบอนุญาต ที่ให้บริการการจัดฝึกอบรมหรือให้คำปรึกษา แจ้งกำหนดการให้บริการแต่ละครั้งก่อนการให้บริการไม่น้อยกว่า 7 วัน (แบบกภ.จ.1   ถึงแบบ  กภ.จ.4)
 และส่งรายงานสรุปผล การให้บริการพร้อมด้วยเอกสารภายใน 30 วัน นับแต่วันที่เสร็จสิ้นการให้บริการ (แบบ  กภ.รง.1  ถึงแบบ  กภ.รง.9)', 'met', 'Safety
QA Training', 'ทุกรอบการประเมินกฎหมาย', 'แบบกภ.จ.1   ถึงแบบ  กภ.จ.4
แบบ  กภ.รง.1  ถึงแบบ  กภ.รง.9
ตรวจสอบการแจ้งเอกสารต่อสวัสดิการของหน่วยงานอบรม กรณีจัดจ้างหน่วยงานภายนอก
-แจ้งอบรมอับอากาศและรายงานผล
การรายงานผล: สวัสดิการและคุ้มครองแรงงาน', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-030') L,
  (values
    (0, '(ข้อ 7) หลักสูตรฝึกอบรมด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทํางาน สําหรับลูกจ้างทั่วไป
และลูกจ้างเข้าทํางานใหม่ มีระยะเวลาการฝึกอบรม 6 ชั่วโมง ประกอบด้วยหัวข้อวิชา
       (1) ความรู้เกี่ยวกับความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทํางาน ระยะเวลา 1 ชั่วโมง 30 นาที
       (2) กฎหมายความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทํางาน ระยะเวลา 1 ชั่วโมง 30 นาที
       (3) คู่มือว่าด้วยความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทํางานของหน่วยงาน ระยะเวลา 3 ชั่วโมง
     ลูกจ้างที่ผ่านการอบรมตามวรรคหนึ่งจากสถานประกอบกิจการเดิมแล้ว ให้ฝึกอบรมเฉพาะ (3) เท่านั้น
(ข้อ 8) หลักสูตรฝึกอบรมด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทํางาน สําหรับลูกจ้างเปลี่ยนงาน เปลี่ยนสถานที่ทํางาน หรือเปลี่ยนแปลงเครื่องจักรหรืออุปกรณ์ซึ่งมีปัจจัยเสี่ยง แตกต่างไปจากเดิม มีระยะเวลา
การฝึกอบรม 3 ชั่วโมง ประกอบด้วยหัวข้อวิชา
       (1) ปัจจัยเสี่ยงจากการทํางาน ระยะเวลา 1 ชั่วโมง 30 นาที
       (2) คู่มือว่าด้วยความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทํางานของหน่วยงาน ระยะเวลา 1 ชั่วโมง 30 นาที
(ข้อ 10) ผู้ผ่านการฝึกอบรมหลักสูตร จป. หัวหน้างานหรือ จป. บริหาร หรือเป็น จป. บริหารตาม พ.ร.บ. ความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน พ.ศ. 2554  ให้ถือว่าผู้นั้นผ่านการฝึกอบรมสำหรับลูกจ้าง
ระดับหัวหน้างานหรือระดับบริหารตามประกาศนี้', 'met', 'Safety
QA Training', 'ทุกรอบการประเมินกฎหมาย', 'Slide อบรม
การรายงานผล: เก็บผลการอบรมไว้ที่สถานประกอบการ', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-031') L,
  (values
    (0, 'คุณสมบัติผู้ที่จะขอรับใบอนุญาตเป็นผู้ชำนาญการด้านความปลอดภัย
1. มีสัญชาติไทย
2. มีอายุไม่ต่ำกว่า 25 ปี
3. ไม่เป็นคนไร้ความสามารถหรือคนเสมือนไร้ความสามารถ
4. ไม่เป็นผู้เคยถูกไล่ออก ปลดออก หรือให้ออกจากราชการ หน่วยงานของรัฐ หรือรัฐวิสาหกิจเพราะกระทำผิดวินัยร้ายแรง
5. ไม่เคยถูกพักใช้หรือถูกเพิกถอนใบอนุญาตตามกฎกระทรวงนี้ เว้นแต่พ้นกำหนด 5 ปี นับแต่วันถูกพักใช้หรือถูกเพิกถอนใบอนุญาต
6. มีความรู้ ความเข้าใจ มีประสบการณ์เกี่ยวกับการประเมินอันตราย การศึกษาผลกระทบของสภาพแวดล้อมในการทำงานที่มีผลต่อลูกจ้าง การจัดทำแผนการควบคุมดูแลลูกจ้าง และสถานประกอบกิจการ ไม่น้อยกว่า 5 ปี
7. และมีคุณสมบัติอย่างใดอย่างหนึ่งดังต่อไปนี้
a. สำเร็จการศึกษาไม่ต่ำกว่าปริญญาตรี สาขาอาชีวอนามัยและความปลอดภัยหรือเทียบเท่า
b. สำเร็จการศึกษาไม่ต่ำกว่าปริญญาตรีทางวิทยาศาสตร์ ปริญญาตรีทางสาธารณสุขศาสตร์ หรือปริญญาตรีทางวิศวกรรมศาสตร์ ที่มีการเรียนการสอนทางด้านอาชีวอนามัยและความปลอดภัยและการประเมินอันตรายหรือประเมินความเสี่ยง ไม่น้อยกว่า 18 หน่วยกิต
c. เป็นผู้ได้รับใบอนุญาตประกอบวิชาชีพวิทยาศาสตร์และเทคโนโลยีควบคุม สาขาอาชีวอนามัยและความปลอดภัย ตามกฎหมายว่าด้วยการส่งเสริมวิชาชีพวิทยาศาสตร์และเทคโนโลยี หรือเป็นผู้ได้รับใบอนุญาตประกอบวิชาชีพเกี่ยวกับอาชีวอนามัยและความปลอดภัยอื่นตามที่อธิบดีกำหนดโดยประกาศในราชกิจจานุเบกษา', 'unmet', 'SHE', NULL, 'เอกสารขึ้นทะเบียนผู้ชำนาญการด้านความปลอดภัย ต่อกรมสวัสดิการและคุ้มครองแรงงาน
การรายงานผล: สวัสดิการและคุ้มครองแรงงาน', 'กฎกระทรวงการอนุญาตเป็นผู้ชำนาญการด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน พ.ศ. 2567 (ยังไม่มีประกาศหลักสูตรอบรม)')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-032') L,
  (values
    (0, 'ข้อ 5 ให้นายจ้างดำเนินการประเมินอันตรายฯ และทบทวนการดำเนินการทุก 3 ปี
       การเปลี่ยนแปลงใดๆ รวมถึงการเปลี่ยนแปลงที่เกิดจากภัยธรรมชาติหรือเพื่อการช่วยเหลือ การบรรเทาเหตุ หรือปัจจัยอื่นๆ และส่งผลให้สภาวะการทำงานเปลี่ยนแปลง ให้นายจ้างดำเนินการให้ครอบคลุมก่อน ระหว่าง และหลังดำเนินการปรับปรุง/เปลี่ยนแปลง
       นายจ้างต้องจัดให้ลูกจ้างปฏิบัติงานซึ่งมีความรู้ในขั้นตอนการทำงานนั้นฯ อย่างน้อย 1 คน มีส่วนร่วมกับ จป./คปอ. ในการดำเนินการ โดยต้องปฏิบัติตามคำแนะนำและได้รับการรับรองผลจากผู้ชำนาญการด้านความปลอดภัยฯ
ข้อ 6 ให้นายจ้างประเมินอันตรายด้วยการใช้วิธีการชี้บ่งอันตรายโดยครอบคลุมทุกขั้นตอนวิธีการปฏิบัติงานและทุกกิจกรรม โดยเลือกใช้วิธีใดวิธีการหนึ่งหรือหลายวิธีร่วมกัน (1)-(9)
ข้อ 7 ให้นายจ้างนำผลการชี้บ่งอันตรายตามข้อ 6 มาวิเคราะห์โอกาสและความรุนแรงเพื่อจัดระดับอันตรายฯ
ข้อ 8 กรณีที่ผลการวิเคราะห์ตามข้อ 7 อยู่ในระดับอันตรายที่ยอมรับไม่ได้ ให้นายจ้างจัดทำแผนการดำเนินงานด้านความปลอดภัยฯ
ข้อ 9 ให้นายจ้างจัดทำรายงานผลการประเมินอันตรายฯ ตามแบบแนบท้ายประกาศ พร้อมส่งรายงานผลทางอิเล็กทรอนิกส์ของกรมสวัสดิ์ฯหรือเป็นเอกสารด้วยตนเอง/ไปรษณีย์ ภายใน 60 วันนับแต่วันที่เสร็จสิ้น
        ให้นายจ้างเก็บเอกสารหลักฐานเกี่ยวกับการประเมินอันตรายฯ ไว้ ณ สถานประกอบการ ไม่น้อยกว่า 3 ปี ในรูปแบบใดก็ได้', 'unmet', 'SHE', 'ปีละ 1 ครั้ง', 'PD-68
การรายงานผล: สวัสดิการและคุ้มครองแรงงาน', 'ยังไม่มีหน่วยงานไหนเปิดอบรม | ประกาศกระทรวงแรงงาน เรื่อง การประเมินอันตราย การศึกษาผลกระทบของสภาพแวดล้อมในการทำงานและการจัดทำแผนควบคุมดูแลลูกจ้างและสถานประกอบกิจการ (รอประกาศหลักสูตรอบรมแล้วดำเนินการส่งขึ้นทะเบียนผู้ชำนาญการก่อนถึงจะดำเนินการตามข้อนี้ได้)')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-033') L,
  (values
    (0, 'ข้อ 2 ยกเลิกประกาศกรมฯ เรื่อง การเทียบเท่าวุฒิการศึกษาไม่ต่ำกว่าปริญญาตรีสาขาอาชีวอนามัยและความปลอดภัย (26 กันยายน 2566) ข้อ 3', 'met', 'Safety
HR', NULL, 'คุณสมบัติตามที่กฏหมยกำหนด
การรายงานผล: สวัสดิการและคุ้มครองแรงงาน', NULL),
    (1, 'ข้อ 3 คุณสมบัติเป็นจป.วิชาชีพที่สำเร็จการศึกษาไม่ต่ำกว่าระดับปริญญาตรี สาขาอาชีวอนามัยและความปลอดภัยหรือเทียบเท่า ต้องสำเร็จการศึกษาในหลักสูตรการศึกษาจากกระทรวงการอุดมการศึกษา วิทยาศาสตร์ วิจัยและนวัตกรรม', 'met', NULL, NULL, NULL, NULL),
    (2, 'ข้อ 4  ผู้ที่สำเร็จการศึกษาไม่ต่ำกว่าระดับปริญญาตรี สาขาอาชีวอนามัยและความปลอดภัยหรือเทียบเท่าจากกรมสวัสดิการคุ้มครองแรงงาน ก่อนที่ประกาศนี้มีผลใช้บังคับถือเป็นผู้มีคุณสมบัติตามข้อ 2(1) แห่งกฎกระทรวงการจัดให้มีเจ้าหน้าที่ความปลอดภัยในการทำงาน บุคลากร หน่วยงาน หรือคณะบุคคล เพื่อดำเนินการด้านความปลอดภัยในสถานประกอบกิจการตามข้อบังคับพ.ศ. 2565', 'met', NULL, NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-034') L,
  (values
    (0, 'ข้อ 3 ยกเลิกมาตราฐานผลิตภัณฑ์อุตสาหกรรม เครื่องดับเพลิงยกหิ้วชนิทคาร์บอนไดออกไซด์', 'met', 'SHE', NULL, 'การรายงานผล: เก็บหลักฐานไว้ที่สถานประกอบการ', 'สมอ. อนุโลมให้ใช้ถังดับเพลิง ที่เป็นมาตรฐานก่อนประกาศนี้ใช้บังคับไปจนกว่าจะหมดอายุตามที่ผู้ผลิตกำหนด จากนั้นต้องเปลี่ยนเป็นถังดับเพลิงที่เป็นไปตามมาตรฐานใหม่'),
    (1, 'ข้อ 4 กำหนดมาตราฐานผลิตภัณฑ์อุตสาหกรรม เครื่องดับเพลิงยกหิ้วชนิทคาร์บอนไดออกไซด์ มาตรฐานเลขที่ มอก.881-2567 ขึ้นใหม่', 'met', NULL, NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-035') L,
  (values
    (0, 'ข้อ ๓ การกำหนดแบบฟอร์มการแจ้งและรายงาน
กำหนดให้ใช้ แบบฟอร์มตามที่แนบท้ายประกาศ สำหรับการดำเนินงานในแต่ละขั้นตอน ได้แก่
1.แบบการรับแจ้งของพนักงานเจ้าหน้าที่ (ใช้บันทึกข้อมูลที่ได้รับจากนายจ้าง) แบบฟอร์ม บจ ๓๐/๑ บจ ๓๐/๒ หรือ บจ ๓๐/๓
2.แบบการแจ้งของผู้รับผิดชอบในสถานพยาบาล (ใช้สำหรับแจ้งข้อมูลต่อพนักงานเจ้าหน้าที่)
3.แบบการรายงานของพนักงานเจ้าหน้าที่ 
ใช้รายงานข้อมูลต่อกรมควบคุมโรค และคณะกรรมการควบคุมโรคจากการประกอบอาชีพและโรคจากสิ่งแวดล้อมจังหวัดหรือกรุงเทพมหานคร แบบฟอร์ม บร ๓๑/๑
แบบทั้งหมดต้องเป็นไปตามรูปแบบที่แนบท้ายประกาศ เพื่อให้เป็นมาตรฐานเดียวกันทั่วประเทศ', 'met', NULL, NULL, 'แบบฟอร์ม 
บจ ๓๐/๑, บจ ๓๐/๒, บจ ๓๐/๓ และ บร ๓๑/๑
การรายงานผล: กรมควบคุมโรค กระทรวงสาธารณสุข', 'เพื่อทราบ'),
    (1, 'ข้อ ๔ วิธีการแจ้งและรายงานข้อมูล
นายจ้าง, ผู้รับผิดชอบในสถานพยาบาล และพนักงานเจ้าหน้าที่สามารถแจ้งหรือรายงานข้อมูลได้โดยวิธีการทางอิเล็กทรอนิกส์หรือ ช่องทางดิจิทัล โปรแกรม หรือแอปพลิเคชันช่องทางเหล่านี้ต้องเป็น ระบบที่จัดทำหรือควบคุมโดยกรมควบคุมโรค กระทรวงสาธารณสุข', 'met', 'Safety และหน่วยงานต้นสังกัดพนักงาน', 'ทุกรอบการประเมินกฎหมาย', 'เฝ้าระวังผู้ปฏิบัติงาน
ผลตรวจสุขภาพพนักงาน
การรายงานผล: กรมควบคุมโรค กระทรวงสาธารณสุข', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-036') L,
  (values
    (0, 'ข้อ 3 ยกเลิกประกาศกระทรวงสาธารณสุข เรื่อง ชื่อหรืออาการสำคัญของโรคจากการประกอบอาชีพ พ.ศ. 2563 (ลงวันที่ 29 ธันวาคม 2563)', 'met', 'Safety', NULL, NULL, NULL),
    (1, 'ข้อ 4 กำหนดให้โรคหรืออาการสำคัญดังต่อไปนี้เป็นโรคจากการประกอบอาชีพ
(1) โรคหรืออาการที่เกิดจากตะกั่วหรือสารประกอบของตะกั่ว
(2) โรคหรืออาการที่เกิดจากฝุ่นซิลิกา (รวมถึงโรคซิลิโคสิสและมะเร็งปอด)
(3) โรคหรืออาการที่เกิดจากภาวะอับอากาศ
(4) โรคหรืออาการที่เกิดจากแอสเบสตอส (แร่ใยหิน) หรือโรคมะเร็งที่เกิดจากแอสเบสตอส (รวมถึงแอสเบสโตสิส ภาวะเยื่อหุ้มปอดหนากระจาย โรคมะเร็งเยื่อหุ้มปอด และมะเร็งปอด)
(5) โรคหรืออาการที่เกิดจากพิษจากสารกำจัดศัตรูพืช (กลุ่มออร์กาโนฟอสเฟตหรือคาร์บาเมต, สารพาราควอต, สารไกลโฟเสท, สารเอทอิลีนบิสไดโทโอคาร์บาเมต, กลุ่มเบนซิมิตาโซล)
(6) โรคหรืออาการที่เกิดจากรังสีแตกตัวหรือจากรังสีชนิดก่อไอออน (รวมถึงอาการผิดปกติเฉียบพลันจากรังสี อาการบาดเจ็บเฉพาะที่จากรังสี และอาการที่เกิดในระยะยาว)', 'met', NULL, 'ทุกรอบการประเมินกฎหมาย', 'เฝ้าระวังผู้ปฏิบัติงาน
ผลตรวจสุขภาพพนักงาน
การรายงานผล: สวัสดิการและคุ้มครองแรงงาน', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-037') L,
  (values
    (0, 'ข้อ 3 ยกเลิกประกาศกระทรวงสาธารณสุข เรื่อง ชื่อหรืออาการสำคัญของโรคจากสิ่งแวดล้อม พ.ศ. 2563 (ลงวันที่ 29 ธันวาคม 2563) และ3.	ประกาศกระทรวงสาธารณสุข เรื่อง ชื่อหรืออาการสำคัญของโรคจากสิ่งแวดล้อม (ฉบับที่ 2) พ.ศ. 2565 (ลงวันที่ 7 มีนาคม 2565)', 'met', 'Safety', NULL, NULL, NULL),
    (1, 'ข้อ 2 กำหนดให้โรคหรืออาการสำคัญดังต่อไปนี้เป็นโรคจากสิ่งแวดล้อม
(1) โรคหรืออาการที่เกิดจากตะกั่วหรือสารประกอบของตะกั่ว โดยมีอาการสำคัญที่แตกต่างกันในบุคคลที่มีอายุต่ำกว่าสิบห้าปีบริบูรณ์ และหญิงตั้งครรภ์
(2) โรคหรืออาการที่เกิดจากการสัมผัสฝุ่นละอองขนาดไม่เกิน ๒.๕ ไมครอน โดยมีอาการสำคัญเกี่ยวข้องกับระบบทางเดินหายใจ หัวใจ ดวงตา และผิวหนัง
(3) โรคหรืออาการที่เกิดจากรังสีแตกตัวหรือจากรังสีชนิดก่อไอออน โดยมีอาการผิดปกติเฉียบพลัน อาการบาดเจ็บเฉพาะที่ และอาการที่เกิดในระยะยาว ซึ่งรวมถึงความผิดปกติทางร่างกายหรือทางพันธุกรรมในทารกในครรภ์', 'met', NULL, 'ทุกรอบการประเมินกฎหมาย', 'เฝ้าระวังผู้ปฏิบัติงาน
ผลตรวจสุขภาพพนักงาน
การรายงานผล: สวัสดิการและคุ้มครองแรงงาน', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-038') L,
  (values
    (0, 'กำหนดค่ามาตรฐานสารมลพิษทางอากาศ เช่น PM2.5, PM10, SO₂, NO₂, CO, O³ เพื่อควบคุมคุณภาพอากาศให้อยู่ในระดับปลอดภัยต่อสุขภาพประชาชน', 'met', 'Safety', 'ทุกรอบการประเมินกฎหมาย', '✔ มีการตรวจวัดคุณภาพอากาศตามรอบ
✔ มีรายงานผลตรวจวัด', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-039') L,
  (values
    (0, 'ข้อ 2 ยกเลิกประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง สัญลักษณ์เตือนอันตราย เครื่องหมายเกี่ยวกับความปลอดภัยฯ และข้อความแสดงสิทธิและหน้าที่ของนายจ้างและลูกจ้าง พ.ศ. 2554', 'met', 'Safety', 'ปีละ 1 ครั้ง และเมื่อกฎหมายเปลี่ยนแปลง', '- แสดงไว้ในคู่มือความปลอดภัย
- ไซต์สื่อสาร Jastel Safety
- ไฟล์อบรมอบรมความปลอดภัย
การรายงานผล: ไซต์สื่อสาร Jastel Safety', NULL),
    (1, 'ข้อ 3 นายจ้างต้องติดประกาศข้อความแสดงสิทธิและหน้าที่ของนายจ้างและลูกจ้างด้านความปลอดภัยฯ ในที่ที่เห็นได้ง่าย ณ สถานประกอบกิจการ', 'met', NULL, NULL, 'การรายงานผล: ประกาศ ฉบับที่ 012/2569', NULL),
    (2, 'ข้อ 4 นายจ้างต้องติดประกาศสัญลักษณ์เตือนอันตรายและเครื่องหมายเกี่ยวกับความปลอดภัยฯ ให้เหมาะสมกับลักษณะและสภาพการทำงาน ในที่ที่เห็นได้ง่าย', 'met', NULL, '1 ครั้ง/เดือน หรือพบว่าชำรุด ซีดจาง ถูกบัง หรือไม่ตรงกับความเสี่ยง', 'แบบตรวจสอบความปลอดภัย', NULL),
    (3, 'ข้อ 5 สัญลักษณ์เตือนอันตรายและเครื่องหมายความปลอดภัยต้องเป็นไปตามมาตรฐานผลิตภัณฑ์อุตสาหกรรม หรือมาตรฐานสากล เช่น ISO, EN, AS/NZS, ANSI, JIS, NIOSH, OSHA, KSA หรือมาตรฐานอื่นที่เทียบเท่า', 'met', NULL, NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-040') L,
  (values
    (0, 'ข้อ 2 แบบคำขอรับใบอนุญาต ใบแทนใบอนุญาต หรือการต่ออายุใบอนุญาตเป็นผู้ชำนาญการฯ ต้องเป็นไปตามแบบ กภ.คบญ.33 ท้ายประกาศ', 'unmet', 'Safety', 'ปีละ 1 ครั้ง และเมื่อกฎหมายเปลี่ยนแปลง', '- แบบ กภ.คบญ.33, สำเนาบัตรประชาชน, เอกสารคุณสมบัติ, 
- หลักฐานการยื่นคำขอย
การรายงานผล: ทุกครั้งที่มีการยื่นขอ รับใบแทน หรือต่ออายุใบอนุญาตต่อสวัสดิการ ฯ', NULL),
    (1, 'ข้อ 3 ใบรับคำขอเป็นผู้ชำนาญการฯ ต้องเป็นไปตามแบบ กภ.รบญ.33 ท้ายประกาศ', 'unmet', NULL, NULL, '- ใบรับคำขอ กภ.รบญ.33
- หลักฐานการยื่น, เลขรับคำขอ, Email หรือหลักฐานจากระบบราชการ  ระบบ e-Service
การรายงานผล: ทุกครั้งที่ยื่นคำขอ', NULL),
    (2, 'ข้อ 4 ใบอนุญาตเป็นผู้ชำนาญการด้านความปลอดภัยฯ ต้องเป็นไปตามแบบ กภ.บญ.33-1 และ กภ.บญ.33-2 ท้ายประกาศ', 'unmet', NULL, 'ปีละ 1 ครั้ง', '- ใบอนุญาต กภ.บญ.33-1, กภ.บญ.33-2, 
- รายชื่อผู้ชำนาญการ
การรายงานผล: สถานประกอบการ', NULL),
    (3, 'ข้อ 5 ใบแทนใบอนุญาตเป็นผู้ชำนาญการฯ ต้องเป็นไปตามแบบ กภ.บทญ.33-1 และ กภ.บทญ.33-2 ท้ายประกาศ', 'unmet', NULL, 'กรณีใบอนุญาตสูญหาย ชำรุด', '- แบบคำขอ, ใบแทนใบอนุญาต, 
- หลักฐานการแจ้งสูญหายหรือชำรุด
- ใบรับคำขอ', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-041') L,
  (values
    (0, 'ข้อ 2 ผู้ที่มีคุณสมบัติตามกฎกระทรวงและประสงค์ขอรับใบอนุญาต ต้องเข้ารับการฝึกอบรมหลักสูตรผู้ชำนาญการจากกรมสวัสดิการและคุ้มครองแรงงานหรือผู้ให้บริการฝึกอบรม เพื่อพัฒนาศักยภาพในการปฏิบัติหน้าที่ไม่น้อยกว่า 6 ชั่วโมงต่อปี และต้องผ่านเกณฑ์การประเมินโดยวิธีการทดสอบตามตารางแนบท้ายประกาศ', 'unmet', 'Safety', 'เมื่อมีบุคลากรจะขอใบอนุญาต หรือทบทวนปีละ 1 ครั้ง', '- รายชื่อบุคลากร,
- แผนอบรม
- หลักฐานการอบรม,
- หลักฐานการประเมิน
การรายงานผล: แจ้งกรมสวัสดิการและคุ้มครอง', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-042') L,
  (values
    (0, 'ข้อ 2 กำหนดให้แบบแจ้งกำหนดการ พร้อมรายชื่อสถานประกอบกิจการที่เข้าดำเนินการ และรายชื่อผู้ชำนาญการ ต้องเป็นไปตามแบบท้ายประกาศ', 'unmet', 'Safety', 'ทุกครั้งก่อนการเข้าปฏิบัติงาน', '- หลักฐานการส่งแบบแจ้ง, Email, ระบบ e-Serviceย
การรายงานผล: แจ้งกรมสวัสดิการและคุ้มครองก่อนดำเนินการไม่น้อยกว่า 7 วัน', NULL),
    (1, 'ข้อ 3 กำหนดให้แบบรายงานสรุปผลการปฏิบัติงานของผู้ชำนาญการ ต้องเป็นไปตามแบบท้ายประกาศ', 'unmet', NULL, 'ทุกครั้งหลังเสร็จสิ้นการปฏิบัติงาน', '- หลักฐานการส่งรายงาน, Email, ใบนำส่ง, ระบบ e-Service ถ้ามี, รายงานฉบับสมบูรณ์
การรายงานผล: ส่งรายงานต่อสวัสดิการ ฯ ภายใน 30 วันหลังเสร็จงาน', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-043') L,
  (values
    (0, 'ข้อ 3 เพิ่ม “โรคติดเชื้อไวรัสฮันตา (Hantavirus Disease)” เป็นลำดับที่ 14 ของโรคติดต่ออันตราย

อาการสำคัญของโรคติดเชื้อไวรัสฮันตา
มีอาการไข้ หนาวสั่น ปวดศีรษะ ปวดกล้ามเนื้อ อ่อนเพลีย และอาจมีอาการทางระบบทางเดินอาหาร เช่น ปวดท้อง คลื่นไส้ อาเจียน หรือถ่ายเหลว

อาการรุนแรงของโรค
ในรายที่มีอาการรุนแรง อาจมีไอ หายใจลำบาก ปอดอักเสบ มีของเหลวคั่งในปอด ช็อก ความดันโลหิตต่ำ เลือดออกจากส่วนต่าง ๆ ของร่างกาย ไตวายเฉียบพลัน ระบบทางเดินหายใจล้มเหลว และอาจเสียชีวิต', 'met', 'Safety', 'ปีละ 1 ครั้ง หรือเมื่อมีการเปลี่ยนแปลงพื้นที่ / พบการระบาด / พบหนูในพื้นที่', '- Risk Assessment,
- รายงานผลการทบทวนแผนและซ้อมแผน
- ใช้ร่วมกับแผนรับมือโรคระบาดหรือโรคติดต่ออื่น
การรายงานผล: ไซต์สื่อสาร Jastel Safety
ViVa Engage
อีเมล / Line
คปอ', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-R01') L,
  (values
    (0, 'ข้อ ๓ ให้นายจ้างจัดให้มีข้อบังคับและคู่มือว่าด้วยความปลอดภัยในการทำงานไว้ในสถานประกอบกิจการ', 'met', 'Safety', 'Annual', 'คู่มือความปลอดภัย อาชีวอนามัย และสภาพแวดบ้อมในการทำงานของบริษัท', NULL),
    (1, 'ข้อ ๔ ให้นายจ้างซึ่งมีผู้รับเหมาชั้นต้นหรือผู้รับเหมาช่วงเข้ามาปฏิบัติงานในสถานประกอบกิจการ จัดให้มีข้อบังคับและคู่มือตามข้อ ๓', 'met', 'Safety', 'Annual', 'จัดหลักสูตรอบรมโดยทีม QA & Training', NULL),
    (2, 'ข้อ ๕ ให้นายจ้างจัดการอบรมลูกจ้างให้มีความรู้เกี่ยวกับข้อบังคับและคู่มือตามข้อ ๓ ก่อนการปฏิบัติงาน', 'met', 'Safety', 'Annual', 'จัดหลักสูตรอบรมโดยทีม QA & Training', NULL),
    (3, 'ข้อ ๗ ให้นายจ้างในสถานประกอบกิจการที่มีลูกจ้างตั้งแต่ยี่สิบคนขึ้นไป แต่งตั้งลูกจ้างระดับหัวหน้างาน', 'met', 'Safety', 'Annual', 'ประกาศแต่งตั้ง จป.หัวหน้างาน', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-R02') L,
  (values
    (0, 'ข้อ ๑๖ ให้นายจ้างในสถานประกอบกิจการที่มีลูกจ้างตั้งแต่หนึ่งร้อยคนขึ้นไป แต่งตั้งลูกจ้างเป็นเจ้าหน้าที่ความปลอดภัยในการทำงานระดับวิชาชีพประจำสถานประกอบกิจการอย่างน้อยหนึ่งคน เพื่อปฏิบัติงานเฉพาะด้านความปลอดภัย', 'met', 'Safety', 'Annual', 'ประกาศแต่งตั้ง จป.วิชาชีพ', NULL),
    (1, 'ข้อ ๑๙ ให้นายจ้างในสถานประกอบกิจการที่มีลูกจ้างตั้งแต่ยี่สิบคนขึ้นไป แต่งตั้งลูกจ้างระดับบริหารทุกคนเป็นเจ้าหน้าที่ความปลอดภัยในการทำงานระดับบริหารของสถานประกอบกิจการ', 'met', 'Safety', 'Annual', 'ประกาศแต่งตั้ง จป.บริหาร', NULL),
    (2, 'ข้อ ๒๓ สถานประกอบกิจการที่มีลูกจ้างตั้งแต่หนึ่งร้อยคนขึ้นไปแต่ไม่ถึงห้าร้อยคน ให้มีกรรมการไม่น้อยกว่าเจ็ดคน ประกอบด้วย นายจ้างหรือผู้แทนนายจ้างระดับบริหาร เป็นประธานกรรมการผู้แทนนายจ้างระดับบังคับบัญชาสองคนและผู้แทนลูกจ้างสามคน เป็นกรรมการ โดยมีเจ้าหน้าที่ความปลอดภัยในการทำงานระดับวิชาชีพ เป็นกรรมการและเลขานุการ', 'met', 'Safety', 'Annual', 'ประกาศแต่งตั้ง คปอ.', NULL),
    (3, 'ข้อ ๓๓ ให้นายจ้างในสถานประกอบกิจการที่มีลูกจ้างตั้งแต่สองร้อยคนขึ้นไป จัดให้มีหน่วยงานความปลอดภัยภายในสามร้อยหกสิบวันนับแต่วันที่กฎกระทรวงนี้มีผลใช้บังคับ หรือภายในสามร้อยหกสิบวันนับแต่วันที่มีลูกจ้างครบสองร้อยคน', 'met', 'Safety', 'Annual', 'จำนวนพนักงานในบริษัทฯ', NULL),
    (4, 'ข้อ ๓๖ ให้นายจ้างแจ้งชื่อเจ้าหน้าที่ความปลอดภัยในการทำงานตามหมวด ๑ เพื่อขึ้นทะเบียนต่อกรมสวัสดิการและคุ้มครองแรงงาน ตามหลักเกณฑ์และวิธีการที่อธิบดีประกาศกำหนด', 'met', 'Safety', 'Annual', 'ส่งเอกสารแต่งตั้งจป. เพื่อแจ้งขึ้นทะเบียนกับ กรมสวัสดิการและคุ้มครองแรงงานจังหวัด', NULL),
    (5, 'ข้อ ๓๗ ให้นายจ้างส่งรายงานผลการดำเนินงานของเจ้าหน้าที่ความปลอดภัยในการทำงานระดับเทคนิคขั้นสูงและระดับวิชาชีพต่ออธิบดีหรือผู้ซึ่งอธิบดีมอบหมายตามแบบที่อธิบดีประกาศกำหนด ทุกสามเดือนตามปีปฏิทิน ทั้งนี้ ภายในเวลาไม่เกินสามสิบวันนับแต่วันที่ครบกำหนด', 'met', 'Safety', 'Annual', 'รายงานผลการดำเนินการเจ้าหน้าที่ความปลอดภัยในการทำงาน (จปว.)', NULL),
    (6, 'ข้อ ๓๘ เมื่อลูกจ้างประสบอันตราย เจ็บป่วย หรือสูญหายตามกฎหมายว่าด้วยเงินทดแทนให้นายจ้างแจ้งการประสบอันตราย เจ็บป่วย หรือสูญหายต่ออธิบดีหรือผู้ซึ่งอธิบดีมอบหมายตามหลักเกณฑ์และวิธีการที่อธิบดีประกาศกำหนด ภายในสิบห้าวันนับแต่วันที่นายจ้างทราบหรือควรจะได้ทราบถึงการประสบอันตราย เจ็บป่วย หรือสูญหาย', 'met', 'Safety', 'Annual', 'รายงานผลการดำเนินการเจ้าหน้าที่ความปลอดภัยในการทำงาน (จปว.)', NULL),
    (7, 'ข้อ ๔๐ นายจ้างต้องจัดทำสำเนาบันทึก รายงานการดำเนินงาน หรือรายงานการประชุมเกี่ยวกับการดำเนินการของคณะกรรมการและหน่วยงานความปลอดภัย เก็บไว้ในสถานประกอบกิจการเป็นเวลาไม่น้อยกว่าสองปีนับแต่วันจัดทำ และพร้อมที่จะให้พนักงานตรวจแรงงานตรวจสอบ', 'met', 'Safety', 'Annual', 'บันทึกการประชม คปอ.ประจำเดือน', NULL),
    (8, 'ข้อ ๔๑ ให้นายจ้างส่งสำเนารายชื่อคณะกรรมการและหน้าที่รับผิดชอบตามข้อ ๓๒ ต่ออธิบดีหรือผู้ซึ่งอธิบดีมอบหมายภายในสิบห้าวันนับแต่วันที่แต่งตั้งหรือเปลี่ยนแปลงกรรมการ', 'met', 'Safety', 'Annual', 'จัดทำประกาศแต่งตั้ง และส่งสำเนาประกาศ', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-021') L,
  (values
    (0, 'กำหนดให้โรคหรืออาการสำคัญดังต่อไปนี้เป็นโรคจากสิ่งแวดล้อม เพื่อประโยชน์ในการเฝ้าระวัง ป้องกันและควบคุมโรคจากสิ่งแวดล้อม 
     1. โรคจากตะกั่วหรือสารประกอบของตะกั่ว 
     2. โรคหรืออาการที่เกิดจากการสัมผัสฝุ่นละอองขนาดไม่เกิน 2.5 ไมครอน', 'met', 'Safety', 'ทุกรอบการประเมินกฎหมาย', 'การรายงานผล: สวัสดิการและคุ้มครองแรงงาน', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LA' and code='LA-008-R') L,
  (values
    (0, '2. ให้นายจ้างติดประกาศสัญลักษณ์เตือนอันตราย และเครื่องหมายเกี่ยวกับความปลอดภัยฯ ให้เหมาะสมกับลักษณะและสภาพการทำงานในที่ที่เห็นได้ง่าย ณ สถานประกอบกิจการ', 'met', 'Safety
Data center
MTN
Implement', NULL, NULL, NULL),
    (1, '3. ให้นายจ้างติดประกาศข้อความแสดงสิทธิและหน้าที่ของนายจ้างและลูกจ้างตามที่กำหนดไว้ในประกาศฉบับนี้ ในที่ที่เห็นได้ง่าย ณ สถานประกอบกิจการ ซึ่งต้องประกอบด้วยข้อความต่อไปนี้', 'met', 'Safety', NULL, NULL, NULL),
    (2, '(1) นายจ้างและลูกจ้างมีหน้าที่ในการปฏิบัติตามพระราชบัญญัติความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน พ.ศ. 2554', 'met', 'Safety', NULL, NULL, NULL),
    (3, '(2) นายจ้างมีหน้าที่จัดและดูแลสถานประกอบการและลูกจ้างให้มีสภาพการทำงานและสภาพแวดล้อมในการทำงานที่ปลอดภัยและถูกสุขลักษณะ', 'met', 'Safety', NULL, NULL, NULL),
    (4, '(3) นายจ้างมีหน้าที่จัดและดูแลให้ลูกจ้างสวมใส่อุปกรณ์ป้องกันอันตรายส่วนบุคคล', 'met', 'Safety
Data center
MTN
Implement', NULL, NULL, NULL),
    (5, '(4) นายจ้างมีหน้าที่จัดให้ผู้บริหาร หัวหน้างานและลูกจ้างทุกคนได้รับการฝึกอบรมให้สามารถบริหารจัดการและดำเนินงานด้านความปลอดภัย อาชีวอนามัยและสภาพแวดล้อมในการทำงานได้อย่างปลอดภัย', 'met', 'Safety
QA', NULL, NULL, NULL),
    (6, '(5) นายจ้างมีหน้าที่แจ้งให้ลูกจ้างทราบถึงอันตรายที่อาจเกิดขึ้นจากการทำงานและแจกคู่มือปฏิบัติงานให้ลูกจ้างทุกคน', 'met', 'Safety', NULL, NULL, NULL),
    (7, '(6) นายจ้างมีหน้าที่ติดประกาศ คำเตือน คำสั่ง หรือคำวินิจฉัยของอธิบดีกรมสวัสดิการและคุ้มครองแรงงาน พนักงานตรวจความปลอดภัย หรือคณะกรรมการความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน แล้วแต่กรณี', 'met', 'Safety', NULL, NULL, NULL),
    (8, '(7) นายจ้างเป็นผู้ออกค่าใช้จ่ายในการดำเนินงานด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน', 'met', 'Safety
OFP', NULL, NULL, NULL),
    (9, '(8) ลูกจ้างมีหน้าที่ให้ความร่วมมือกับนายจ้างในการดำเนินการและส่งเสริมด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน โดยคำนึงถึงสภาพของงานและหน้าที่รับผิดชอบ', 'met', 'ทุกคน', NULL, NULL, NULL),
    (10, '(9) ลูกจ้างมีหน้าที่แจ้งข้อบกพร่องของสภาพการทำงานหรือการชำรุดเสียหายของอาคาร สถานที่ เครื่องมือ เครื่องจักร หรืออุปกรณ์ ที่ไม่สามารถแก้ไขด้วยตนเองต่อเจ้าหน้าที่ความปลอดภัยในการทำงาน หัวหน้างาน หรือผู้บริหาร', 'met', 'ทุกคน', NULL, NULL, NULL),
    (11, '(10) ลูกจ้างมีหน้าที่สวมใส่อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลที่นายจ้างจัดให้และดูแลให้สามารถใช้งานได้', 'met', 'ทุกคน', NULL, NULL, NULL),
    (12, '(11) ในสถานที่ที่มีสถานประกอบกิจการหลายแห่ง ลูกจ้างมีหน้าที่ปฏิบัติตามหลักเกณฑ์เกี่ยวกับความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงานของนายจ้าง และสถานประกอบกิจการอื่นที่ไม่ใช่ของนายจ้างด้วย', 'met', 'ทุกคน', NULL, NULL, NULL),
    (13, '(12) ลูกจ้างมีสิทธิได้รับความคุ้มครองจากการเลิกจ้าง หรือถูกโยกย้ายหน้าที่การงานเพราะเหตุที่ฟ้องร้อง เป็นพยาน ให้หลักฐาน หรือให้ข้อมูลเกี่ยวกับความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงานต่อพนักงานตรวจความปลอดภัย คณะกรรมการความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน หรือศาล', 'met', 'ทุกคน', NULL, NULL, NULL),
    (14, '(13) ลูกจ้างมีสิทธิได้รับค่าจ้างหรือสิทธิประโยชน์อื่นใด ในระหว่างหยุดการทำงานหรือหยุดกระบวนการผลิตตามคำสั่งของพนักงานตรวจความปลอดภัย เว้นแต่ลูกจ้างที่จงใจกระทำการอันเป็นเหตุให้มีการหยุดการทำงานหรือหยุดกระบวนการผลิต', 'met', 'ทุกคน', NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LB' and code='LB-001') L,
  (values
    (0, 'มาตรา ๖ พระราชบัญญัตินี้ไม่ใช้บังคับแก่น้ำมันเชื้อเพลิงที่ใช้ในราชการทหารโดยเฉพาะ แต่ให้นำหลักเกณฑ์และวิธีการตามที่กำหนดในพระราชบัญญัตินี้ไปเป็นแนวทางในการดำเนินงาน
 มาตรา ๗ เพื่อประโยชน์แก่การป้องกันหรือระงับเหตุเดือดร้อนรำคาญหรือความเสียหายหรืออันตรายที่จะมีผลกระทบต่อบุคคล สัตว์ พืช ทรัพย์ หรือสิ่งแวดล้อมหรือการกำหนดแนวทางหรือลักษณะการดำเนินการเกี่ยวกับการควบคุมน้ำมันเชื้อเพลิงให้สอดคล้องกับสภาพเศรษฐกิจและสังคม ให้รัฐมนตรีมีอำนาจออกกฎกระทรวงดังต่อไปนี้
(๑) กำหนดการเก็บรักษา การขนส่ง การใช้ การจำหน่าย การแบ่งบรรจุน้ำมันเชื้อเพลิง และการควบคุมอื่นใดเกี่ยวกับน้ำมันเชื้อเพลิง
(๒) กำหนดที่ตั้ง แผนผัง รูปแบบ และลักษณะของสถานที่เก็บรักษาน้ำมันเชื้อเพลิง สถานีบริการน้ำมันเชื้อเพลิง และคลังน้ำมันเชื้อเพลิง และการบำรุงรักษาสถานที่ดังกล่าว
(๓) กำหนดลักษณะของถังหรือภาชนะที่ใช้ในการบรรจุหรือขนส่ง และการบำรุงรักษาถังหรือภาชนะดังกล่าว
(๔) กำหนดคุณสมบัติและการฝึกอบรมผู้ปฏิบัติงานเกี่ยวกับการควบคุมน้ำมันเชื้อเพลิง', 'met', 'Safety', NULL, 'https://jastelnet.sharepoint.com/:f:/s/JastelNetworkCompanyLimited/Evk4ZzlhyPJDhShFnjH9jIwBUTKkRGiEcVgiCGx4m7XUVg?e=4NMnUB', 'จัสเทลเข้าข่าย ที่ ชั้น G และ P10ต้องแจ้ง
- Gen เกิน 2,500 ลิตร
- จัดอยู่สถานที่เก็บรักษาน้ำมัน ลักษณะที่สอง มีดีเซล (ชนิดไวไฟน้อย)รวมแล้วเกิน 454 ลิตร แต่ไม่เกิน 15,000 ลิตร
- อัพเดทการยื่นแจ้งเครื่องกำเนิดไฟฟ้าและสถานที่เก็บน้ำมัน
  1. ยื่นแจ้งเครื่องกำเนิดไฟฟ้าพค.1 ของจัสเทล ขอบเขตขั้น G และ P10 ยื่นแจ้งเมื่อ 24 ก.พ. พพ.ตอบรับคำขอเมื่อ 2 มี.ค. 66  ตามเอกสารตอบรับยืนยันว่าเอกสาร พค.1 ที่ได้รับจากทางจัสเทล ถูกต้อง ครบถ้วน ทั้งนี้ใบอนุญาตอยู่ในขั้นตอนของการรอประเมินสถานที่หน้างานจริงก่อนออกใบอนุญาต
-ได้โทรติดตามผลการยื่น เจ้าหน้าที่ตรวจสอบแล้วอยู่ในคิวตรวจซึ่งอาจจะเป็นปี 67 เนื่องจากปีนี้มีคิวตรวจให้สถานประกอบการที่ยื่นมาแล้วตั้งแต่ปี 65 จำนวน 500 คิว ทั้งนี้ให้สถานประกอบการยึดถือใบตอบรับการตรวจเอกสารจากเจ้าหน้าที่ พพ. เป็นการปฏิบัติตามกฎหมายหรือนำไปตรวจรับรองระบบต่างๆได้เลย
 
   2. ส่งแจ้งสถานที่เก็บน้ำมัน  2 มี.ค. ได้รับใบอนุญาตเรียบร้อยแล้วเมื่อ 
15 พ.ค. 66'),
    (1, 'หมวด ๓
การประกอบกิจการควบคุม
มาตรา ๑๗ เพื่อให้การควบคุมการประกอบกิจการเป็นไปอย่างมีประสิทธิภาพและเพื่อปกป้องประชาชน
ให้มีความปลอดภัย ให้รัฐมนตรีมีอำนาจออกกฎกระทรวงกำหนดประเภทกิจการควบคุมของการมีน้ำมันเชื้อเพลิง
ไว้ในครอบครอง สถานีบริการน้ำมันเชื้อเพลิง คลังน้ำมันเชื้อเพลิงและการขนส่งน้ำมันเชื้อเพลิง สำหรับน้ำมัน
เชื้อเพลิงชนิดใดชนิดหนึ่ง หรือทุกชนิดรวมกัน ให้สอดคล้องกับระดับอันตรายที่อาจจะเกิดขึ้น โดยแบ่งเป็น ๓
ประเภท ดังนี้
(๑) ประเภทที่ ๑ ได้แก่กิจการที่สามารถประกอบการได้ทันทีตามความประสงค์ของผู้ประกอบกิจการ
(๒) ประเภทที่ ๒ ได้แก่กิจการที่เมื่อจะประกอบการต้องแจ้งให้พนักงานเจ้าหน้าที่ทราบก่อน
(๓) ประเภทที่ ๓ ได้แก่กิจการที่ต้องได้รับใบอนุญาตจากผู้อนุญาตก่อนจึงจะประกอบการได้', 'met', NULL, NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LB' and code='LB-003') L,
  (values
    (0, '1. กำหนดวิธีการทดสอบมาตรฐานฝีมือแรงงานแห่งชาติ สาขาอาชีพช่างไฟฟ้า อิเล็กทรอนิกส์และคอมพิวเตอร์ 
สาขาช่างไฟฟ้าภายในอาคาร ระดับ 1 แบ่งเป็น
     1.1 การทดสอบความรู้ ความเข้าใจ
     1.2 การทดสอบความสามารถ
      ส่วนรายละเอียดวิธีการทดสอบให้เป็นไปตามที่คณะกรรมการประกาศกำหนด
2. การออกหนังสือรับรองว่าเป็นผู้ผ่านการทดสอบมาตรฐานฝีมือแรงงาน สาขาอาชีพช่างไฟฟ้า อิเล็กทรอนิกส์และคอมพิวเตอร์ สาขาช่างไฟฟ้าภายในอาคาร ระดับ 1 จะออกให้แก่ผู้ผ่านการทดสอบทั้งภาคความรู้ ความเข้าใจ 
และภาคความสามารถ  โดยผู้เข้ารับการทดสอบต้องได้คะแนนไม่น้อยกว่าร้อยละ 70 ของคะแนนทั้งหมด', 'met', 'QA&Training', NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LB' and code='LB-004') L,
  (values
    (0, 'ใช้บังคับตั้งแต่วันที่ 16 มกราคม 2556 เป็นต้นไป  
   กำหนดมาตรฐานผลิตภัณฑ์อุตสาหกรรมเต้าเสียบและเต้ารับสำหรับใช้ในที่อยู่อาศัยและงานทั่วไปที่มีจุดประสงค์คล้ายกัน : เต้าปรับ มาตรฐานเลขที่ มอก. 2431 – 2555 ไว้ ดังนี้
     1. ขอบข่าย
     ครอบคลุมเต้าปรับมีตัวปิดช่อง เต้าปรับไม่มีตัวปิดช่อง เต้าปรับมีฟิวส์ และเต้าปรับไม่มีฟิวส์ ทั้งชนิดที่มีและไม่มีขั้วสายดิน และใช้สำหรับไฟฟ้ากระแสสลับที่มีแรงดันไฟฟ้าที่กำหนดเกิน 250 โวลต์ และมีกระแสไฟฟ้าที่กำหนดไม่เกิน 16 แอมแปร์ เหมาะสำหรับใช้ในที่มีอุณหภูมิโดยรอบตามปกติไม่เกิน 40oC
     ไม่ครอบคลุมถึงเต้าปรับสำหรับแรงดันไฟฟ้าต่ำพิเศษ
โดยมีการกำหนดเกี่ยวกับ
     2. เอกสารอ้างอิง  
     3. บทนิยาม   
     4. คุณลักษณะที่ต้องการทั่วไป   
     5. ข้อสังเกตทั่วไปสำหรับการทดสอบ    
     6. พิกัด', 'met', 'ทุกส่วนงาน', NULL, 'ตรวจ 5ส  เก็บข้อมูลปลั๊กไม่ได้มาตรฐาน และมีโครงการจัดซื้อปลั๊กพ่วงที่มีมาตรฐานมาทดแทน', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LB' and code='LB-005') L,
  (values
    (0, '(๒) ลักษณะที่สอง ได้แก่ สถานที่เก็บน้ํามันชนิดใดชนิดหนึ่งหรือหลายชนิด ดังต่อไปนี้
 (ก) สถานที่เก็บน้ํามันชนิดไวไฟมากที่มีปริมาณเกิน ๔๐ ลิตร แต่ไม่เกิน ๔๕๔ ลิตร
 (ข) สถานที่เก็บน้ํามันชนิดไวไฟปานกลางที่มีปริมาณเกิน ๒๒๗ ลิตร แต่ไม่เกิน ๑,๐๐๐ ลิตร
 (ค) สถานที่เก็บน้ํามันชนิดไวไฟน้อยที่มีปริมาณเกิน ๔๕๔ ลิตร แต่ไม่เกิน ๑๕,๐๐๐ ลิตร', 'met', NULL, NULL, 'แบบ ธพ.ป1', 'จัสเทลเข้าข่าย ที่ ชั้น G และ P10ต้องแจ้ง
- Gen เกิน 2,500 ลิตร
- จัดอยู่สถานที่เก็บรักษาน้ำมัน ลักษณะที่สอง มีดีเซล (ชนิดไวไฟน้อย)รวมแล้วเกิน 454 ลิตร แต่ไม่เกิน 15,000 ลิตร
จัดส่งเอกสารแล้ว 2-3-66')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LB' and code='LB-006') L,
  (values
    (0, 'ข้อ ๓ ให้นายจ้างจัดให้มีข้อบังคับเกี่ยวกับการปฏิบัติงานด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงานเกี่ยวกับไฟฟ้า โดยให้มีมาตรฐานไม่ต่ำกว่าที่กำหนดไว้ในกฎกระทรวงนี้เพื่อให้ลูกจ้างปฏิบัติตาม', 'met', 'ทุกหน่วยงาน', 'Annual', 'WI การปฏิบัติงาน', NULL),
    (1, 'ข้อ ๔ ให้นายจ้างจัดให้มีการฝึกอบรมให้กับลูกจ้างซึ่งปฏิบัติงานเกี่ยวกับไฟฟ้าให้มีความรู้ความเข้าใจ และทักษะที่จำเป็นในการทำงานอย่างปลอดภัยตามหน้าที่ที่ได้รับมอบหมาย ทั้งนี้ตามหลักเกณฑ์ วิธีการ และเงื่อนไขที่อธิบดีประกาศกำหนด', 'met', 'Safety Officer
QA&Training
Power
_______', 'Annual', 'จัดหลักสูตรโดยทีม QA & Training', NULL),
    (2, 'ข้อ ๕ ให้นายจ้างจัดให้มีและเก็บรักษาแผนผังวงจรไฟฟ้าที่ติดตั้งภายในสถานประกอบกิจการทั้งหมดซึ่งได้รับการรับรองจากวิศวกรหรือการไฟฟ้าประจำ ท้องถิ่นไว้ให้พนักงานตรวจความปลอดภัยตรวจสอบ หากมีการแก้ไขเพิ่มเติมหรือเปลี่ยนแปลงไปจากเดิมต้องดำเนินการแก้ไขแผนผังนั้นให้ถูกต้อง', 'met', 'Safety Officer
Power
Implementation
Data Center
MTN (Node)', 'Annual', 'แผนผังจัดเก็บอยู่ทีม Power และทีม', NULL),
    (3, 'ข้อ ๖ ให้นายจ้างจัดให้มีแผ่นป้ายที่มีตัวอักษรหรือสัญลักษณ์เตือนให้ระวังอันตรายจากไฟฟ้าที่มองเห็นได้ชัดเจนติดตั้งไว้โดยเปิดเผยในบริเวณที่อาจเกิดอันตรายจากกระแสไฟฟ้า ทั้งนี้ให้เป็นไปตามแบบที่กำหนดไว้ในมาตรฐานผลิตภัณฑ์อุตสาหกรรมหรือมาตรฐานอื่นตามที่อธิบดีประกาศกำหนด', 'met', 'Safety Officer
Data center
Power', 'Annual', 'แบบตรวจสอบความปลอดภัยประจำเดือน', NULL),
    (4, 'ข้อ ๗ ห้ามนายจ้างให้ลูกจ้างซึ่งปฏิบัติงานเกี่ยวกับไฟฟ้าเข้าใกล้หรือนำสิ่งที่เป็นตัวนำไฟฟ้าที่ไม่มีที่ถือหุ้มด้วยฉนวนไฟฟ้าที่เหมาะสมกับแรงดันไฟฟ้าเข้าใกล้สิ่งที่มีกระแสไฟฟ้าในระยะที่น้อยกว่าระยะห่างตามมาตรฐานของสมาคมวิศวกรรมสถานแห่งประเทศไทย ในพระบรมราชูปถัมภ์ หากยังไม่มีมาตรฐานดังกล่าวให้ใช้มาตรฐานตามที่การไฟฟ้าประจำท้องถิ่นกำหนด เว้นแต่นายจ้างจะได้ดำเนินการดังต่อไปนี้
(๑) ให้ลูกจ้างสวมใส่อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลที่เป็นฉนวนไฟฟ้าที่เหมาะสมกับแรงดันไฟฟ้า หรือนำฉนวนไฟฟ้าที่สามารถป้องกันแรงดันไฟฟ้านั้นได้มาหุ้มสิ่งที่มีกระแสไฟฟ้า และ
(๒) จัดให้มีวิศวกร หรือกรณีการไฟฟ้าประจำท้องถิ่นอาจจัดให้ผู้ที่ได้รับการรับรองเป็นผู้ควบคุมงานจากการไฟฟ้าประจำท้องถิ่นดังกล่าว เพื่อควบคุมการปฏิบัติงานของลูกจ้าง', 'met', 'ทุกหน่วยงาน', 'Annual', 'แบบตรวจสอบความปลอดภัยประจำเดือน', NULL),
    (5, 'ข้อ ๙ ให้นายจ้างดูแลมิให้ลูกจ้างสวมใส่เครื่องนุ่งห่มที่เปียกหรือเป็นสื่อไฟฟ้าปฏิบัติงานเกี่ยวกับสิ่งที่มีกระแสไฟฟ้าที่มีแรงดันไฟฟ้าเกินกว่าห้าสิบโวลต์ โดยไม่มีฉนวนไฟฟ้าปิดกั้น เว้นแต่นายจ้างจะได้จัดให้ลูกจ้างสวมใส่อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลหรือใช้อุปกรณ์ป้องกันอันตรายที่เหมาะสมกับแรงดันไฟฟ้าสำหรับการปฏิบัติงานของลูกจ้าง', 'met', 'ทุกหน่วยงาน', 'Annual', 'แบบตรวจสอบความปลอดภัยประจำเดือน/ทวนสอบกับทีม Power อีกครั้ง', NULL),
    (6, 'ข้อ ๑๐ ในกรณีที่นายจ้างให้ลูกจ้างทำงานโดยใช้อุปกรณ์ในการปฏิบัติงานเกี่ยวกับกระแสไฟฟ้า หรืออยู่ในบริเวณใกล้เคียงกับสิ่งที่มีกระแสไฟฟ้า ให้นายจ้างจัดหาอุปกรณ์ชนิดที่เป็นฉนวนไฟฟ้า หรือหุ้มด้วยฉนวนไฟฟ้า หรืออุปกรณ์ป้องกันอันตรายที่เหมาะสมกับแรงดันไฟฟ้าสำหรับการปฏิบัติงานของลูกจ้าง', 'met', 'Safety Officer
Data center', 'Annual', 'แบบตรวจสอบความปลอดภัยประจำเดือน/ทวนสอบกับทีม Power อีกครั้ง', NULL),
    (7, 'ข้อ ๑๑ ให้นายจ้างดูแลบริภัณฑ์ไฟฟ้าและสายไฟฟ้าให้ใช้งานได้โดยปลอดภัย หากพบว่าชำรุด หรือมีกระแสไฟฟ้ารั่ว หรืออาจก่อให้เกิดอันตรายแก่ผู้ใช้งาน ให้ซ่อมแซมหรือดำเนินการให้อยู่ในสภาพที่ใช้งานได้อย่างปลอดภัย และจัดให้มีหลักฐานในการดำเนินการเพื่อให้พนักงานตรวจความปลอดภัยตรวจสอบได้', 'met', 'Safety Officer
Data center', 'Annual', 'แบบตรวจสอบความปลอดภัยประจำเดือน/ทวนสอบกับทีม Power อีกครั้ง', NULL),
    (8, 'ข้อ ๑๒ นายจ้างต้องจัดให้มีการตรวจสอบและจัดให้มีการบำรุงรักษาระบบไฟฟ้าและบริภัณฑ์ไฟฟ้าเพื่อให้ใช้งานได้อย่างปลอดภัย และให้บุคคลที่ขึ้นทะเบียนตามมาตรา ๙ หรือนิติบุคคลที่ได้รับใบอนุญาตตามมาตรา ๑๑ แห่งพระราชบัญญัติความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน พ.ศ. ๒๕๕๔ แล้วแต่กรณี เป็นผู้จัดทำบันทึกผลการตรวจสอบและรับรองไว้ เพื่อให้พนักงานตรวจความปลอดภัยตรวจสอบ ทั้งนี้ ตามหลักเกณฑ์ วิธีการ และเงื่อนไขที่อธิบดีประกาศกำหนด', 'met', 'Safety Officer
Data center
Site&Metronet', 'Annual', 'กำหนดแผนการตรวจวัดบริภัณฑ์ไฟฟ้า', 'เป็นไปตามแผน'),
    (9, 'ข้อ ๑๓ ให้นายจ้างจัดให้มีแผ่นภาพพร้อมคำบรรยายติดไว้ในบริเวณที่ทำงานที่ลูกจ้างสามารถมองเห็นได้ชัดเจนในเรื่อง ดังต่อไปนี้
(๑) วิธีปฏิบัติเมื่อประสบอันตรายจากไฟฟ้า
(๒) วิธีปฏิบัติเมื่อประสบอันตรายจากไฟฟ้าโดยการผายปอดด้วยวิธีปากเป่าอากาศเข้าทางปากหรือจมูกของผู้ประสบอันตราย และวิธีการนวดหัวใจจากภายนอก', 'met', 'Safety Officer
Data center
Site&Metronet', 'Annual', 'แผ่นป้ายวิธีปฏิบัติเมื่อประสบอันตรายจากไฟฟ้า และวิธีปฏิบัติเมื่อประสบอันตรายจากไฟฟ้า', 'ติดป้ายในทุกพื้นที่'),
    (10, 'ข้อ ๑๙. การใช้เครื่องกำเนิดไฟฟ้า ให้นายจ้างปฏิบัติ ดังต่อไปนี้
(1) ติดตั้งในบริเวณพื้นที่กว้างพอที่จะปฏิบัติงานได้
(2) จัดให้มีการระบายอากาศอย่างเพียงพอ กรณีติดตั้งเครื่องกำเนิดไฟฟ้าภายในห้องหากมีไอเสียจากเครื่องยนต์ให้ต่อท่อไอเสียออกสู่ภายนอก
(3) จัดให้มีเครื่องป้องกันกระแสไฟฟ้าไหลเกิน
(4) จัดให้มีเครื่องดับเพลิงชนิดที่ใช้ดับเพลิงที่เกิดจากไฟฟ้าและน้ำมันอย่างเพียงพอ 
(5) ในกรณีที่มีเครื่องกำเนิดไฟฟ้าสำรอง ต้องจัดให้มีเครื่องป้องกันการใช้ผิดหรือสวิตซ์สับโยกสองทาง', 'met', 'Safety Officer
Data center
Site&Metronet', 'Annual', NULL, NULL),
    (11, 'ข้อ ๒๑ ให้นายจ้างจัดอุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลที่เหมาะสมกับลักษณะงาน เช่น ถุงมือหนัง ถุงมือยาง แขนเสื้อยาง หมวกนิรภัย รองเท้าพื้นยางหุ้มข้อชนิดมีส้นหรือรองเท้าพื้นยางหุ้มส้น ให้ลูกจ้างซึ่งปฏิบัติงานเกี่ยวกับไฟฟ้าสวมใส่ตลอดเวลาที่ปฏิบัติงานและจัดให้มีอุปกรณ์ป้องกันอันตรายจากไฟฟ้าที่เหมาะสมกับลักษณะงาน เช่น แผ่นฉนวนไฟฟ้า ฉนวนหุ้มสาย ฉนวนครอบลูกถ้วย กรงฟาราเดย์ (Faraday Cage) ชุดตัวนำไฟฟ้า (Conductive Suit) ในกรณีที่ลูกจ้างต้องปฏิบัติงานในที่สูงกว่าพื้นตั้งแต่สี่เมตรขึ้นไป ให้นายจ้างจัดให้มีการใช้สายหรือเชือกช่วยชีวิตและเข็มขัดนิรภัยพร้อมอุปกรณ์ หรืออุปกรณ์ที่ป้องกันการตกจากที่สูงได้อย่างมีประสิทธิภาพ และหมวกนิรภัยที่เหมาะสมตามมาตรฐานที่กำหนดสำหรับให้ลูกจ้างสวมใส่ตลอดเวลาที่ปฏิบัติงาน เว้นแต่อุปกรณ์ดังกล่าวจะทำให้ลูกจ้างเสี่ยงต่ออันตรายมากขึ้น ให้นายจ้างจัดให้มีอุปกรณ์เพื่อความปลอดภัยอื่นที่สามารถใช้คุ้มครองความปลอดภัยได้อย่างมีประสิทธิภาพแทน', 'met', 'Safety', 'Annual', 'จัดให้มีถุงมือยางกันไฟฟ้า ถุงมือหนังสวมทับในการปฏิบัติงานที่เกี่ยวข้องกับไฟฟ้า และสวมใส่เข็มขัดนิรภัย รองเท้านิรภัย หมวกนิรภัยในการปฏิบัติงาน', NULL),
    (12, 'ข้อ ๒๒ อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลและอุปกรณ์ป้องกันอันตรายจากไฟฟ้าต้องเป็นไปตามมาตรฐานที่กำหนดไว้และต้องมีคุณสมบัติ ดังต่อไปนี้
(๑) อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลและอุปกรณ์ที่ใช้ป้องกันกระแสไฟฟ้าต้องเหมาะสมกับแรงดันไฟฟ้าสูงสุดในบริเวณที่ปฏิบัติงานหรือบริเวณใกล้เคียงที่อาจก่อให้เกิดอันตรายได้
(๒) ถุงมือยางป้องกันไฟฟ้า ต้องมีลักษณะสวมกับนิ้วมือได้ทุกนิ้ว
(๓) ถุงมือหนังที่ใช้สวมทับถุงมือยาง ต้องมีความยาวหุ้มถึงข้อมือและมีความคงทนต่อการฉีกขาดได้ดี การใช้ถุงมือยางต้องใช้ร่วมกับถุงมือหนังทุกครั้งที่ปฏิบัติงาน', 'met', 'Safety', 'Annual', 'จัดให้มีถุงมือยางกันไฟฟ้า และถุงมือหนังสวมทับในการปฏิบัติงานที่เกี่ยวข้องกับไฟฟ้า', NULL),
    (13, 'ข้อ ๒๔ นายจ้างต้องบำรุงรักษาและจัดเก็บอุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลและอุปกรณ์ป้องกันอันตรายจากไฟฟ้าให้อยู่ในสภาพที่ใช้งานได้อย่างปลอดภัย รวมทั้งต้องตรวจสอบและทดสอบตามมาตรฐานและวิธีที่ผู้ผลิตกำหนด', 'met', 'Safety', 'Annual', 'แบบตรวจสอบความปลอดภัยประจำเดือน', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LB' and code='LB-008') L,
  (values
    (0, 'กำหนดให้สาขาอาชีพช่างไฟฟ้า อิเล็กทรอนิกส์และคอมพิวเตอร์ เฉพาะสาขาช่างไฟฟ้าภายในอาคาร เป็นสาขาอาชีพที่อาจเป็นอันตรายต่อสาธารณะ ซึ่งต้องดำเนินการโดยผู้ได้รับหนังสือรับรองความรู้ความสามารถตามกฎหมายว่าด้วยการส่งเสริมการพัฒนาฝีมือแรงงาน', 'met', NULL, 'เมื่อมีช่างไฟฟ้าในอาคาร', 'หนังสือรับรองความรู้ความสามารถ หลักสูตรช่างไฟฟ้าในอาคาร', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LB' and code='LB-009') L,
  (values
    (0, 'ข้อ ๒ การจัดฝึกอบรมให้กับลูกจ้างซึ่งปฏิบัติงานเกี่ยวกับไฟฟ้าเข้ารับการฝึกอบรมความปลอดภัยในการทำงานเกี่ยวกับไฟฟ้า ให้นายจ้างจัดทำทะเบียนรายชื่อผู้ที่ผ่านการฝึกอบรม วัน เวลาที่ฝึกอบรมพร้อมรายชื่อวิทยากรเก็บไว้ ณ สถานประกอบกิจการ และให้แจ้งทะเบียนรายชื่อผู้ที่ผ่านการฝึกอบรม วัน เวลาที่ฝึกอบรมพร้อมรายชื่อวิทยากรต่อพนักงานตรวจความปลอดภัยในเขตพื้นที่รับผิดชอบภายในสิบห้าวันนับแต่วันที่เสร็จสิ้นการฝึกอบรม', 'met', 'Safety Officer
QA&Training
Power', 'Annual', 'จัดหลักสูตรโดยทีม QA & Training
การรายงานผล: กรมสวัสดิการและคุ้มครองแรงงาน', NULL),
    (1, 'ข้อ ๓ การฝึกอบรมความปลอดภัยในการทำงานเกี่ยวกับไฟฟ้าให้กับลูกจ้างซึ่งปฏิบัติงานเกี่ยวกับไฟฟ้า ต้องมีระยะเวลาการฝึกอบรมไม่น้อยกว่าสามชั่วโมง และอย่างน้อยต้องมีหัวข้อวิชาตามกำหนด', 'met', NULL, 'Annual', 'จัดหลักสูตรโดยทีม QA & Training', NULL),
    (2, 'ข้อ ๕ วิทยากรผู้ทำการฝึกอบรมความปลอดภัยในการทำงานเกี่ยวกับไฟฟ้า ต้องมีคุณสมบัติตามกำหนด', 'met', NULL, 'Annual', 'วิทยากร K.อาร์ม', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LB' and code='LB-010') L,
  (values
    (0, 'เพิ่มความต่อไปนี้เป็นวรรค 4 ของข้อ 2 แห่งประกาศกรมสวัสดิการและคุ้มครองแรงงานเรื่อง หลักเกณฑ์ 
วิธีการ และเงื่อนไขการฝึกอบรมความปลอดภัยในการทำงานเกี่ยวกับไฟฟ้าสำหรับลูกจ้าง ซึ่งปฏิบัติงานเกี่ยวกับ ไฟฟ้า ลงวันที่ 24 ธันวาคม พ.ศ. 2558
      “ในกรณีที่ลูกจ้างได้รับหนังสือรับรองความรู้ความสามารถ สาขาช่างไฟฟ้าภายในอาคารของกรมพัฒนาฝีมือแรงงาน ให้ถือว่าเป็นผู้ที่ผ่านการฝึกอบรมความปลอดภัยในการทำงานเกี่ยวกับไฟฟ้าตามประกาศฉบับนี้”', 'met', 'QA&Training', NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LB' and code='LB-011') L,
  (values
    (0, 'ผู้ที่มีเครื่องกำเนิดไฟฟ้าซึ่งมีกำลังผลิตรวมตั้งแต่ 200กิโลโวลต์แอมแปร์ขึ้นไป อยู่ในครอบครอง เพื่อทำการผลิตไฟฟ้า จะต้อง ขออนุญาต ทำการผลิตพลังงานควบคุม ต่อ กรมพัฒนาและส่งเสริมพลังงาน 


ผู้ยื่นคำขอทำหน้าที่ผู้ตรวจสอบระบบผลิตพลังงานควบคุม สามารถยื่นคำขอผ่านช่องทางอิเล็กทรอนิกส์ (http://eaudit.dede.go.th) ได้ตั้งแต่วันที่ 28 ตุลาคม พ.ศ. 2565 เป็นต้นไป จนถึงวันที่ 30 พฤศจิกายน พ.ศ. 2565)
-ประกาศกรมพัฒนาพลังงานทดแทนและอนุรักษ์พลังงาน เรื่อง การรับขึ้นทะเบียนผู้ตรวจสอบระบบผลิตพลังงานควบคุม', 'met', 'Safety Officer
Data center', NULL, '-ยื่นแบบ พค.1 พร้อมหลักฐาน
- ครั้งละไม่เกิน 4 ปีนับตั้งแต่วันที่ได้รับอนุญาต
-ต้องตรวจสอบทุก 4 ปี
https://jastelnet.sharepoint.com/:f:/s/JastelNetworkCompanyLimited/Evk4ZzlhyPJDhShFnjH9jIwBUTKkRGiEcVgiCGx4m7XUVg?e=4NMnUB
การรายงานผล: กรมพัฒนาพลังงานทดแทนและอนุรักษ์พลังงาน', 'จัสเทลเข้าข่าย พบ gen ที่ตั้งในตึกจัสมิน 
ชั้น G 550 kVA 1 เครื่อง
P10 550 kVA x 3 เครื่อง
ยื่นเอกสารเรียบร้อยแล้ว 24-2-66

-จนท.พลังงานมาตรวจ')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LB' and code='LB-012') L,
  (values
    (0, '- กำหนดวิธี ระเบียบปฏิบัติในการขออนุญาตพาดสาย
ข้อ 14 ผู้ควบคุมงานและผู้ปฏิบัติงานเกี่ยวกับสายสื่อสารที่ได้รับอนุญาตต้องผ่านการอบรม และทบทวนแนวทางการปฏิบัติจากการไฟฟ้านครหลวงทุก ๒ ปี
ข้อ 15 ผู้ควบคุมงานและผู้ปฏิบัติงานเกี่ยวกับสายสื่อสาร ต้องแสดงบัตรหรือวุฒิบัตร และสำเนาWork Permit ให้เจ้าหน้าที่ของการไฟฟ้านครหลวงตรวจสอบ
- หมวด 7 ข้อ 13 (4) ผู้ควบคุมงานและผู้ปฏิบัติงานเกี่ยวกับสายสื่อสารที่ไม่มีวุฒิบัตร หรือบัตรผ่านการอบรมตามหมวด ๔ ข้อ๘ (๑๔) การไฟฟ้านครหลวงจะคิดเบี้ยปรับ ๑๐,๐๐๐ บาทต่อคน และสั่งหยุดการปฏิบัติงานบนเสาไฟฟ้าทันที', 'met', 'Safety Officer
Implemaentation
MTN
ผู้รับเหมา', 'Annual', '-WI การปฏิบัติงาน
-บัตรอนุญาตการทำงานบนเสาไฟฟ้า', 'ยกเลิก หลักเกณฑ์การติดตั้งสายสื่อสารบนเสาการไฟฟ้าส่วนภูมิภาค 2563')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LB' and code='LB-013') L,
  (values
    (0, 'กำหนดวิธี ระเบียบปฏิบัติในการขออนุญาตพาดสาย
-ข้อ 10.20 ในระหว่างปฏิบัติงาน ผู้ขออนุญาตต้องมีผู้ควบคุมงานที่ได้รับบัตร อนุญาตทํางานบนเสาไฟฟ้า จากการไฟฟ้าส่วนภูมิภาค พร้อมมีสําเนาใบอนุญาตให้ปฏิบัติงาน Work Pemit ให้เจ้าหน้าที่ของการไฟฟ้าส่วนภูมิภาคตรวจสอบตลอดเวลาทีปฏิบัติงาน
-ข้อ 14 กําหนดโทษ 14.1 ผู้ควบคุมงานที่ไม่มีบัตรอนุญาตทํางานบนเสาไฟฟ้าของการไฟฟ้าส่วนภูมิภาค หรือไม่สามารถนํามาแสดงให้เจ้าหน้าที่การไฟฟ้าส่วนภูมิภาคตรวจสอบในขณะที่ปฏิบัติงาน หรือไม่ สามารถแสดงสําเนาใบอนุญาต (Work Permit) ให้ปฏิบัติงานได้ เจ้าหน้าที่การไฟฟ้าส่วนภูมิภาค จะสังหยุดงานทันที จนกว่าผู้ขออนุญาตจะปฏิบัติตามข้อ ๑๐.๒๐ ครบถ้วน', 'met', 'Safety Officer
Implemaentation
MTN
ผู้รับเหมา', 'Annual', '-WI การปฏิบัติงาน
-บัตรอนุญาตการทำงานบนเสาไฟฟ้า', 'ยกเลิก หลักเกณฑ์การติดตั้งสายสื่อสารบนเสาการไฟฟ้าส่วนภูมิภาค 2558')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LB' and code='LB-015') L,
  (values
    (0, '1. มาตรฐานฝีมือแรงงานแห่งชาติ  สาขาอาชีพช่างไฟฟ้า อิเล็กทรอนิกส์และคอมพิวเตอร์ สาขาช่างไฟฟ้าภายในอาคาร ระดับ 1 
      1.1  อายุไม่ต่ำกว่า 18 ปีบริบูรณ์นับถึงวันสมัครเข้ารับการทดสอบ และ
      1.2  มีประสบการณ์การทำงานหรือประกอบอาชีพเกี่ยวกับสาขาอาชีพช่างไฟฟ้า อิเล็กทรอนิกส์และคอมพิวเตอร์      สาขาช่างไฟฟ้าภายในอาคารไม่น้อยกว่า 1 ปี หรือ
     1.3  ผ่านการฝึกอบรมฝีมือแรงงานหรือฝึกอาชีพ ในสาขาอาชีพช่างไฟฟ้า อิเล็กทรอนิกส์และคอมพิวเตอร์ 
           สาขาช่างไฟฟ้าภายในอาคารไม่น้อยกว่า 60 ชั่วโมง และมีประสบการณ์ฝึกงานหรือปฏิบัติงานในสาขา
           ช่างไฟฟ้าภายในอาคารไม่น้อยกว่า 160 ชั่วโมง หรือ 
     1.4  จบการศึกษาไม่ต่ำกว่าระดับประกาศนียบัตรวิชาชีพ ในสาขาที่เกี่ยวข้องกับอาชีพนี้', 'met', 'QA&Training', NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LB' and code='LB-016') L,
  (values
    (0, '1. กำหนดวิธีการทดสอบมาตรฐานฝีมือแรงงานแห่งชาติ สาขาอาชีพช่างไฟฟ้า อิเล็กทรอนิกส์และคอมพิวเตอร์ 
สาขาช่างไฟฟ้าภายในอาคาร ระดับ 2 ดังนี้
       (1) การทดสอบความรู้  โดยผู้เข้ารับการทดสอบต้องได้คะแนนไม่น้อยกว่าร้อยละ 60 ของคะแนนภาคความรู้ 
            จึงมีสิทธิเข้ารับการทดสอบภาคความสามารถ
       (2) การทดสอบความสามารถ  
       (3) รายละเอียดวิธีการทดสอบให้เป็นไปตามที่คณะกรรมการกำหนด 

2. การออกหนังสือรับรองว่าเป็นผู้ผ่านการทดสอบมาตรฐานฝีมือแรงงานแห่งชาติ สาขาอาชีพช่างไฟฟ้า อิเล็กทรอนิกส์และคอมพิวเตอร์ สาขาช่างไฟฟ้าภายในอาคาร ระดับ 2 จะออกให้แก่ผู้ผ่านการทดสอบทั้งภาคความรู้และภาคความสามารถ และต้องทดสอบได้คะแนนไม่น้อยกว่าร้อยละ 70 ของคะแนนทั้งหมด', 'met', 'QA&Training', NULL, NULL, 'ระดับ ๑ หมายถึง ช่างซึ่งประกอบอาชีพในงานติดตั้งระบบไฟฟ้าและอุปกรณ์ไฟฟ้าภายในอาคาร
 ระดับ ๒ หมายถึง ช่างซึ่งประกอบอาชีพในงานติดตั้งระบบไฟฟ้าและอุปกรณ์ไฟฟ้าภายในอาคารและการแก้ไขปัญหาข้อขัดข้อง
ระดับ ๓ หมายถึง ช่างซึ่งประกอบอาชีพในงานติดตั้งระบบไฟฟ้าและอุปกรณ์ไฟฟ้าภายในอาคารและการตรวจสอบระบบไฟฟ้า')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LB' and code='LB-017') L,
  (values
    (0, 'หมวด 3 สถานที่เก็บรักษาน้ำมัน ลักษณะที่สอง
ส่วนที่ 1 การเก็บน้ำมันและระยะปลอดภัยภายใน
8. (ข้อ 14-15) การเก็บภาชนะบรรจุน้ำมันไว้ในอาคาร ต้องมีระยะปลอดภัยตามตารางที่ 1 กรณีเก็บไว้นอกอาคารต้องเป็นไปตามตารางที่ 2 
9. (ข้อ 16) ห้ามเก็บภาชนะบรรจุน้ำมันไว้ต่ำกว่าระดับพื้นดิน เว้นแต่ภาชนะบรรจุน้ำมันนั้นเก็บน้ำมันชนิดไวไฟน้อยที่มีจุดวาบไฟเกิน 93 องศาเชลเซียสขึ้นไปและอยู่ภายในอาคาร
ส่วนที่ 2 ลักษณะของแผนผังและแบบก่อสร้าง
10. (ข้อ 17-19) สถานที่เก็บรักษาน้ำมัน ลักษณะที่สอง ต้องมีแผนผังและแบบก่อสร้างตามที่กำหนด 
1)	ต้องมีแผนผังโดยสังเขปแสดงตำแหน่งที่ตั้งของสถานที่เก็บรักษาน้ำมัน พร้อมสิ่งก่อสร้างต่างๆ โดยรอบ ในระยะไม่น้อยกว่า 50 เมตร
2)	ต้องมีแผนผังบริเวณแสดงเขตสถานที่เก็บรักษาน้ำมัน ภาชนะบรรจุน้ำมัน แนวท่อน้ำมัน และอาคารเก็บภาชนะบรรจุน้ำมัน
3)	กรณีถังเก็บน้ำมันขนาดใหญ่ที่มีปริมาณความจุเกิน 2,500 ลิตรขึ้นไป แบบก่อสร้างต้องมีรายละเอียดเพิ่มเติม เช่น แปลนส่วนบน แปลนส่วนราก แปลนฐานราก รายละเอียดการก่อสร้าง และการติดตั้ง เป็นต้น 
ส่วนที่ 3 ถังเก็บน้ำมัน
11. (ข้อ 20-21) ถังเก็บน้ำมันใต้พื้นดินและเหนือพื้นดิน สำหรับสถานที่เก็บรักษาน้ำมัน ลักษณะที่สอง ต้องมีลักษณะ และวิธีการติดตั้งตามที่กฎกระทรวงนี้กำหนด

12. (ข้อ 22) เมื่อติดตั้งถังเก็บน้ำมันใต้พื้นดินและเหนือพื้นดินแล้ว ต้องทำการทดสอบและตรวจสอบตามหลักเกณฑ์ และวิธีการที่รัฐมนตรีประกาศกำหนด และให้ทำการทดสอบและตรวจสอบถังเก็บน้ำมันทุก 1 ปีและ 10 ปีตามวิธีการ ที่กำหนดในกฎกระทรวงว่าด้วยการซ่อมบำรุงถังเก็บน้ำมันและถังขนส่งน้ำมันที่ออกตามมาตรา 7', 'met', 'Safety', NULL, 'https://jastelnet.sharepoint.com/:f:/s/JastelNetworkCompanyLimited/Evk4ZzlhyPJDhShFnjH9jIwBUTKkRGiEcVgiCGx4m7XUVg?e=4NMnUB', 'จัสเทลเข้าข่าย ที่ ชั้น G และ P10ต้องแจ้ง
- Gen เกิน 2,500 ลิตร
- จัดอยู่สถานที่เก็บรักษาน้ำมัน ลักษณะที่สอง มีดีเซล (ชนิดไวไฟน้อย)รวมแล้วเกิน 454 ลิตร แต่ไม่เกิน 15,000 ลิตร
- อัพเดทการยื่นแจ้งเครื่องกำเนิดไฟฟ้าและสถานที่เก็บน้ำมัน
  1. ยื่นแจ้งเครื่องกำเนิดไฟฟ้าพค.1 ของจัสเทล ขอบเขตขั้น G และ P10 ยื่นแจ้งเมื่อ 24 ก.พ. พพ.ตอบรับคำขอเมื่อ 2 มี.ค. 66  ตามเอกสารตอบรับยืนยันว่าเอกสาร พค.1 ที่ได้รับจากทางจัสเทล ถูกต้อง ครบถ้วน ทั้งนี้ใบอนุญาตอยู่ในขั้นตอนของการรอประเมินสถานที่หน้างานจริงก่อนออกใบอนุญาต
-ได้โทรติดตามผลการยื่น เจ้าหน้าที่ตรวจสอบแล้วอยู่ในคิวตรวจซึ่งอาจจะเป็นปี 67 เนื่องจากปีนี้มีคิวตรวจให้สถานประกอบการที่ยื่นมาแล้วตั้งแต่ปี 65 จำนวน 500 คิว ทั้งนี้ให้สถานประกอบการยึดถือใบตอบรับการตรวจเอกสารจากเจ้าหน้าที่ พพ. เป็นการปฏิบัติตามกฎหมายหรือนำไปตรวจรับรองระบบต่างๆได้เลย 
   2. ส่งแจ้งสถานที่เก็บน้ำมัน  2 มี.ค. ได้รับใบอนุญาตเรียบร้อยแล้วเมื่อ 
15 พ.ค. 66')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LB' and code='LB-018') L,
  (values
    (0, 'เพิ่มช่องทางการขออนุญาตตามกฎหมายว่าด้วยการควบคุมน้ำมันเชื้อเพลิงโดยวิธีการทางอิเล็กทรอนิกส์  ผ่านเว็บไซต์https://safety.doeb.go.th 
(เดิม : ยื่นเอกสารกับหน่วยงานท้องถิ่นตามที่ตั้งของสถานประกอบกิจการ)', 'met', 'Safety', NULL, 'แบบอนุญาตตามกฎหมายว่าด้วยการควบคุมน้ำมันเชื้อเพลิงโ', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LB' and code='LB-019') L,
  (values
    (0, 'ข้อ 2 ยกเลิกประกาศกรมฯ เรื่องประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง หลักเกณฑ์ วิธีการ และเงื่อนไขการจัดทำบันทึกผลการตรวจสอบและรับรองระบบไฟฟ้าและบริภัณฑ์ไฟฟ้า พ.ศ.2558', 'met', 'Safety Officer
Data center', '1 ครั้ง/ปี', 'แบบบันทึกผลการตรวจสอบและรับรองระบบไฟฟ้าและบริภัณฑ์ไฟฟ้า
การรายงานผล: กรมสวัสดิการและคุ้มครองแรงงาน', NULL),
    (1, 'ข้อ 3 กรณีนายจ้างได้ดำเนินการตรวจสอบและรับรองระบบไฟฟ้าและบริภัณฑ์ไฟฟ้าตามกฎหมายว่าด้วยโรงงานหรือกฎหมายว่าด้วยการควบคุมอาคารแล้ว ให้ถือว่าเป็นการตรวจสอบและรับรองระบบไฟฟ้าและบริภัณฑ์ไฟฟ้าตามประกาศฉบับนี้ ​ (แบบฟอร์มเปลี่ยนใหม่)​', 'met', NULL, NULL, NULL, NULL),
    (2, 'ข้อ 4  เปลี่ยนแปลงวันแจ้งบันทึกผลการตรวจสอบและรับรองระบบไฟฟ้าและบริภัณฑ์ไฟฟ้าต่อสวัสดิการและคุ้มครองแรงงานจังหวัด จากภานใน 15 วันเป็นภายใน 30 วัน นับแต่วันที่ได้ทำการตรวจสอบ ทาง e-Service ของกรมสวัสดิการและคุ้มครองแรงงานเป็นหลัก​', 'met', NULL, NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LB' and code='LB-002') L,
  (values
    (0, 'หมวด 3
สถานที่เก็บรักษาน้ำมันเชื้อเพลิง ลักษณะที่สอง
ส่วนที่ 1 การเก็บน้ำมันเชื้อเพลิงและระยะปลอดภัยภายใน
ข้อ 14 การเก็บภาชนะบรรจุน้ำมันเชื้อเพลิงไว้ในอาคารต้องมีระยะปลอดภัยตามที่กำหนดไว้ในตารางที่ 1
ตารางที่ 1 ระยะปลอดภัยในการเก็บภาชนะบรรจุน้ำมันเชื้อเพลิงไว้ในอาคาร', 'met', NULL, NULL, NULL, NULL),
    (1, 'ข้อ 15 การเก็บภาชนะบรรจุน้ำมันเชื้อเพลิงไว้นอกอาคารต้องมีระยะปลอดภัยตามที่กำหนดไว้ในตารางที่ 2', 'met', NULL, NULL, NULL, NULL),
    (2, 'ข้อ 16 การเก็บภาชนะบรรจุน้ำมันเชื้อเพลิงให้ปฏิบัติตามที่กำหนดไว้ในข้อ 7 
    ข้อ 7 ห้ามเก็บภาชนะบรรจุน้ำมันเชื้อเพลิงไว้ต่ำกว่าระดับพื้นดิน เว้นแต่เก็บอยู่ภายในอาคารที่มีพื้นที่ต่ำกว่าระดับพื้นดิน และภาชนะบรรจุน้ำมันเชื้อเพลิงดังกล่าวเก็บน้ำมันเชื้อเพลิงชนิดไวไฟน้อยที่มีจุดวาบไฟเกิน 93 องศาเซลเซียสขึ้นไป', 'met', NULL, NULL, NULL, NULL),
    (3, 'ส่วนที่ 5  การป้องกันและระงับอัคคีภัย
ข้อ 26 การป้องกันและระงับอัคคีภัยในสถานที่เก็บรักษาน้ำมันเชื้อเพลิง ลักษณะที่สอง ให้ปฏิบัติตามที่กำหนดไว้ในข้อ 9 ข้อ 10 ข้อ 11 และข้อ 13
          ข้อ 9 ภาชนะบรรจุน้ำมันเชื้อเพลิงต้องปิดฝาไว้ตลอดเวลาที่ไม่ใช้งาน
         ข้อ 10 ห้ามทำการถ่ายเท หรือแบ่งบรรจุน้ำมันเชื้อเพลิงภายในบริเวณที่มีการจำหน่าย หรือขายน้ำมันเชื้อเพลิง
         ข้อ 11 ห้ามต่อท่อน้ำมันเชื้อเพลิงระหว่างถังน้ำมันเชื้อเพลิงเข้าด้วยกัน
  ข้อ 13 บริเวณที่ตั้งภาชนะบรรจุน้ำมันเชื้อเพลิงเพื่อการจำหน่ายต้องจัดให้มีป้ายเตือนโดยมีข้อความ ลักษณะ และที่ตั้ง ดังต่อไปนี้
(1) ป้ายต้องมีข้อความอย่างน้อย ดังต่อไปนี้
“อันตราย
1. ห้ามสูบบุหรี่
2. ห้ามก่อประกายไฟ”
(2) ข้อความในป้ายต้องมองเห็นได้ชัดเจนและอ่านได้ง่าย โดยมีความสูงของอักษรไม่น้อยกว่า 2.50 เซนติเมตร
(3) ป้ายต้องตั้งอยู่ห่างจากบริเวณที่ตั้งภาชนะบรรจุน้ำมันเชื้อเพลิงระยะไม่เกิน 2.00 เมตร และต้องติดตั้งไว้ในที่ที่เห็นได้ง่าย', 'met', NULL, NULL, NULL, NULL),
    (4, 'ข้อ 27 การเก็บน้ำมันเชื้อเพลิงชนิดไวไฟมาก ชนิดไวไฟปานกลาง หรือชนิดไวไฟน้อยที่มีจุดวาบไฟไม่เกิน 93 องศาเซลเซียสเพื่อการจำหน่าย บริเวณที่ตั้งภาชนะบรรจุน้ำมันเชื้อเพลิงต้องจัดให้มีอุปกรณ์ป้องกันและระงับอัคคีภัย ดังต่อไปนี้
       (1) เครื่องดับเพลิงชนิดผงเคมีแห้งหรือน้ำยาดับเพลิงขนาดบรรจุไม่น้อยกว่า 6.80 กิโลกรัม มีความสามารถในการดับเพลิงไม่น้อยกว่า 3A 40B ตามมาตรฐานระบบป้องกันอัคคีภัยของวิศวกรรมสถานแห่งประเทศไทยในพระบรมราชูปถัมภ์หรือมาตรฐานอื่นที่เทียบเท่าตามที่รัฐมนตรีกำหนดโดยประกาศในราชกิจจานุเบกษา จำนวนไม่น้อยกว่าสองเครื่อง
(2) เครื่องดับเพลิงต้องอยู่ในสภาพที่ใช้งานได้ดี และผู้ประกอบกิจการควบคุมต้องตรวจสอบและบำรุงรักษาทุกหกเดือน โดยมีหลักฐานการตรวจสอบติดหรือแขวนไว้ที่เครื่องดับเพลิง
(3) ทรายในปริมาณไม่น้อยกว่า 200 ลิตร และสามารถนำมาใช้ได้สะดวกตลอดเวลา', 'met', NULL, NULL, NULL, 'ตรวจสอบทราย
จัดซื้อวัสดุดูดซับมาเรียบร้อยแล้ว')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LB' and code='LB-014') L,
  (values
    (0, '“ให้ทำการทดสอบและตรวจสอบถังเมื่อใช้งานครบหนึ่งปีและสิบปี ตามวิธีการที่กำหนดในกฎกระทรวงว่าด้วยการซ่อมบำรุงถังเก็บน้ำมันและถังขนส่งน้ำมัน”
“ข้อ ๖๖ ถังเก็บน้ำมันเชื้อเพลิงเหนือพื้นดินขนาดใหญ่ตามแนวตั้ง เมื่อใช้งานครบหนึ่งปีและสิบปีต้องทำการทดสอบและตรวจสอบตามวิธีการที่กำหนดในกฎกระทรวงว่าด้วยการซ่อมบำรุงถังเก็บน้ำมันและถังขนส่งน้ำมัน”
“ข้อ ๘๑ ระบบท่อน้ำมันเชื้อเพลิงและอุปกรณ์ เมื่อใช้งานครบหนึ่งปีและสิบปี ต้องทำการทดสอบและตรวจสอบตามวิธีการที่กำหนดในกฎกระทรวงว่าด้วยการซ่อมบำรุงถังเก็บน้ำมันและถังขนส่งน้ำมัน”', 'met', 'Data center', NULL, 'เริ่มยื่นแจ้งก่อน รอครบ 10 ปี ในปี 2567-2568
การรายงานผล: ทุก 1 ปี
และครบ 10 ปี', '-แผนการตรวจสอบถังน้ำมัน ต.ค. 67 ตาม Memo No.	
DO 67/01380')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LB' and code='LB-007') L,
  (values
    (0, '1. ให้จัดทำการบันทึกผลการตรวจสอบและบำรุงรักษาระบบไฟฟ้าและบริภัณฑ์ไฟฟ้าประจำปี ตามแบบท้ายประกาศนี้
2. กรณีตรวจสอบและรับรองตามกฎหมายว่าด้วยโรงงานหรือควบคุมอาคาร โดยมีวิศวกรไฟฟ้าเป็นผู้บันทึกผลการตรวจสอบให้ถือว่าเป็นการตรวจสอบและรับรองตามประกาศฉบับนี้
3. ผู้จัดทำบันทึกผลการตรวจสอบต้องขึ้นทะเบียนตามมาตรา 9 หรือเป็นนิติบุคคลที่ได้รับใบอนุญาตตามมาตรา 11 แห่ง พ.ร.บ. ความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน พ.ศ. 2554 แล้วแต่กรณี
4. จัดส่งผลการตรวจสอบและรับรองระบบไฟฟ้าและบริภัณฑ์ไฟฟ้าต่อพนักงานตรวจความปลอดภัยในเขตพื้นที่รับผิดชอบภายใน 15 วันนับ แต่วันที่ตรวจสอบ', 'met', 'Safety Officer
Data center', NULL, 'ยกเลิกด้วย LB-019', 'ตรวจไฟฟ้าเป็นไปตามแผน')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LC' and code='LC-001') L,
  (values
    (0, '9. เครื่องดับเพลิงแบบมือถือที่ติดตั้งแต่ละเครื่องต้องมีระยะห่างกันไม่เกิน 20 เมตรและให้ส่วนบนสุดอยู่สูงจากพื้นไม่เกิน 1.50 เมตร มีป้ายหรือสัญลักษณ์ที่มองเห็นได้ชัดเจน ไม่มีสิ่งกีดขวาง และต้องสามารถนำมาใช้งานได้สะดวก (ปก.มท 1-1.4 ม.)', 'met', 'PA 
Safety Officer', NULL, NULL, NULL),
    (1, '10. ผู้ประกอบกิจการโรงงานต้องจัดเตรียมน้ำสำหรับดับเพลิงในปริมาณที่เพียงพอ
ที่จะส่งจ่ายน้ำให้กับอุปกรณ์ฉีดน้ำดับเพลิงได้อย่างต่อเนื่องเป็นเวลาไม่น้อยกว่า 30 นาที', 'met', 'PA', NULL, NULL, NULL),
    (2, '22. โรงงานต้องจัดเส้นทางหนีไฟที่อพยพคนงานทั้งหมดออกจากบริเวณที่ทำงานสู่บริเวณที่ปลอดภัย เช่น ถนนหรือสนามนอกอาคารโรงงานได้ภายใน 5 นาที', 'met', 'PA', NULL, NULL, NULL),
    (3, '23. การจัดเก็บวัตถุสิ่งของที่ติดไฟได้ หากเป็นการเก็บกองวัตถุมิได้เก็บในชั้นวางความสูงของกองวัตถุนั้นต้องไม่เกิน 6 เมตร และต้องมีระยะห่างจากโคมไฟไม่น้อยกว่า 60 เซนติเมตร', 'met', 'ทุกหน่วยงาน', NULL, NULL, NULL),
    (4, '1.2 การทดสอบ ทุก ๆ 5 ปี เครื่องดับเพลิงแบบมือถือจะต้องทดสอบการรับความดัน (hydrostatic test) เพื่อพิจารณาว่ายังสามารถใช้งานได้หรือไม่', 'met', 'Safety Officer, Implement, Data center', NULL, 'รายการถังดับเพลิงของ Jastel และแผนงบประมาณประจำปี
การรายงานผล: ทุก 5 ปี', NULL),
    (5, '2.1 เครื่องสูบน้ำดับเพลิงขับด้วยเครื่องยนต์ดีเซล
(1) ทดสอบการทำงานของเครื่องสูบน้ำดับเพลิงทุก ๆ สัปดาห์ที่อัตราความเร็วรอบทำงานด้วยระยะเวลาอย่างน้อย 30 นาทีเพื่อให้เครื่องยนต์ร้อนถึงอุณหภูมิทำงาน ตรวจสภาพของเครื่องสูบน้ำ, ชุดควบคุมการทำงานของเครื่องสูบน้ำ
2.2 เครื่องสูบน้ำดับเพลิงขับด้วยมอเตอร์ไฟฟ้า
(1) ทดสอบการทำงานของเครื่องสูบน้ำทุก ๆ เดือน
3.2 หัวรับน้ำดับเพลิงควรจะได้รับการตรวจสอบเดือนละหนึ่งครั้ง
(2) หัวดับเพลิงในสถานประกอบการควรตรวจสอบเดือนละครั้งว่าอยู่ในสภาพที่เห็นชัดเจนและเข้าถึงได้ง่ายโดยมีฝาครอบปิดอยู่เรียบร้อย
(1) ทดสอบการทำงานของหัวดับเพลิงอย่างน้อยปีละหนึ่งครั้ง โดยการเปิดและปิดเพื่อให้แน่ใจได้ว่ามีน้ำไหลออกจากหัวดับเพลิง
5.1 ตรวจสอบระดับน้ำในถังน้ำดับเพลิงเดือนละครั้ง
6.1 ตรวจสอบตู้เก็บสายฉีดเดือนละหนึ่งครั้งเพื่อให้แน่ใจว่ามีอุปกรณ์ฉีดน้ำดับเพลิงอยู่ครบและอยู่ในสภาพดี
7.1 หัวกระจายน้ำดับเพลิงจะต้องได้รับการตรวจสอบด้วยสายตาเป็นระยะ ๆ อย่างสม่ำเสมอ สภาพของหัวกระจายน้ำดับเพลิงต้องไม่ผุกร่อน, ถูกทาสีทับหรือชำรุดเสียหาย', 'met', 'PA', NULL, 'อ้างอิงผลการตรวจสอบและทดสอบระบบป้องกันและระงับอัคคีภัยของ PA
การรายงานผล: เดือนละ 1 ครั้ง', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LC' and code='LC-002') L,
  (values
    (0, 'กำหนดมาตรฐานผลิตภัณฑ์อุตสาหกรรม การจัดการหน่วยดับเพลิงสำหรับสถานประกอบการ มาตรฐาน
เลขที่ มอก. 2563-2555
1. ขอบข่าย
2. บทนิยาม
3. ข้อกำหนดการจัดการหน่วยดับเพลิงสำหรับสถานประกอบการ', 'met', 'PA', 'การตรวจสอบระบบตามระยะเวลาตามมอก. 2541 
(ทดสอบระบบปีละ 1  ครั้ง)', NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LC' and code='LC-003') L,
  (values
    (0, 'ข้อ ๒ ให้นายจ้างจัดให้มีระบบป้องกันและระงับอัคคีภัยในสถานประกอบกิจการตามกฎกระทรวงนี้ และต้องดูแลระบบป้องกันและระงับอัคคีภัยให้อยู่ในสภาพพร้อมใช้งานได้อย่างมีประสิทธิภาพและปลอดภัย', 'met', 'PA', 'Annual', 'PA จัดให้มีการตรวจสอบระบบป้องกัน และระงับอัคคีภัยในอาคาร
การรายงานผล: -', NULL),
    (1, 'ข้อ ๓ ในสถานประกอบกิจการทุกแห่ง ให้นายจ้างจัดทำป้ายข้อปฏิบัติเกี่ยวกับการดับเพลิงและการอพยพหนีไฟ และปิดประกาศให้เห็นได้อย่างชัดเจน', 'met', 'PA 
Safety Officer', 'Annual', 'แบบตรวจสอบความปลอดภัยประจำเดือน
การรายงานผล: -', NULL),
    (2, 'ข้อ ๔ ในสถานประกอบกิจการที่มีลูกจ้างตั้งแต่สิบคนขึ้นไป นอกจากต้องปฏิบัติตามข้อ ๓ แล้วให้นายจ้างจัดให้มีแผนป้องกันและระงับอัคคีภัย ประกอบด้วยการตรวจตรา การอบรม การรณรงค์ป้องกันอัคคีภัย การดับเพลิง การอพยพหนีไฟ และการบรรเทาทุกข์', 'met', 'PA 
Safety Officer', 'Annual', 'แผนป้องกันและระงับอัคคีภัยของอาคาร
การรายงานผล: -', NULL),
    (3, 'ข้อ ๕ อาคารที่มีสถานประกอบกิจการหลายแห่งตั้งอยู่รวมกัน ให้นายจ้างทุกรายของสถานประกอบกิจการในอาคารนั้นมีหน้าที่ร่วมกันในการจัดให้มีระบบป้องกันและระงับอัคคีภัย รวมทั้งแผนป้องกันและระงับอัคคีภัยด้วย', 'met', 'PA 
Safety Officer', 'Annual', 'แผนป้องกันและระงับอัคคีภัยของบริษัทฯ
การรายงานผล: -', NULL),
    (4, 'ข้อ ๖ ในกรณีที่นายจ้างสั่งให้ลูกจ้างทำงานที่มีลักษณะงานหรือไปทำงาน ณ สถานที่ที่เสี่ยงหรืออาจเสี่ยงต่อการเกิดอัคคีภัย ให้นายจ้างแจ้ง
ข้อปฏิบัติเกี่ยวกับความปลอดภัยในการทำงานให้ลูกจ้างทราบก่อนการปฏิบัติงาน', 'met', 'Safety Officer
ทุกหน่วยงาน', NULL, 'การรายงานผล: -', NULL),
    (5, 'ข้อ ๘ ให้นายจ้างจัดให้มีเส้นทางหนีไฟทุกชั้นของอาคารอย่างน้อยชั้นละสองเส้นทางซึ่งสามารถอพยพลูกจ้างที่ทำงานในเวลาเดียวกันทั้งหมดสู่จุดที่ปลอดภัยได้โดยปลอดภัยภายในเวลาไม่เกินห้านาที
 เส้นทางหนีไฟจากจุดที่ลูกจ้างทำงานไปสู่จุดที่ปลอดภัยต้องปราศจากสิ่งกีดขวาง
 ประตูที่ใช้ในเส้นทางหนีไฟต้องทำด้วยวัสดุทนไฟ ไม่มีธรณีประตูหรือขอบกั้น และเป็นชนิดที่บานประตูเปิดออกไปตามทิศทางของการหนีไฟกับต้องติดอุปกรณ์ที่บังคับให้บานประตูปิดได้เอง ห้ามใช้ประตูเลื่อน ประตูม้วน หรือประตูหมุน และห้ามปิดตาย ใส่กลอน กุญแจ ผูก ล่ามโซ่ หรือทำให้เปิดออกไม่ได้ในขณะที่มีลูกจ้างทำงาน', 'met', 'PA
Safety', NULL, 'การรายงานผล: -', NULL),
    (6, 'ข้อ ๙ สถานประกอบกิจการที่มีอาคารตั้งแต่สองชั้นขึ้นไป หรือมีพื้นที่ประกอบกิจการตั้งแต่สามร้อยตารางเมตรขึ้นไป ให้นายจ้างจัดให้มีระบบสัญญาณแจ้งเหตุเพลิงไหม้ในสถานประกอบกิจการทุกชั้นโดยให้ปฏิบัติ ดังต่อไปนี้
(๑) ระบบสัญญาณแจ้งเหตุเพลิงไหม้อย่างน้อยต้องประกอบด้วย
(ก) อุปกรณ์แจ้งเหตุเพลิงไหม้ทั้งที่ใช้ระบบแจ้งเหตุอัตโนมัติและระบบแจ้งเหตุที่ใช้มือเพื่อให้อุปกรณ์ส่งสัญญาณแจ้งเหตุเพลิงไหม้ทำงาน
(ข) อุปกรณ์ส่งสัญญาณแจ้งเหตุเพลิงไหม้ต้องสามารถส่งเสียงหรือสัญญาณให้ทุกคนภายในอาคารได้ยินหรือทราบอย่างทั่วถึงเพื่อการหนีไฟ
(๒) อุปกรณ์แจ้งเหตุที่ใช้มือต้องอยู่ในที่เห็นได้อย่างชัดเจน เข้าถึงได้ง่าย หรืออยู่ในเส้นทางหนีไฟโดยติดตั้งห่างจากจุดที่ลูกจ้างทางานไม่เกินสามสิบเมตร
(๓) เสียงหรือสัญญาณที่ใช้ในการแจ้งเหตุเพลิงไหม้ต้องมีเสียงหรือสัญญาณที่แตกต่างไปจากเสียงหรือสัญญาณที่ใช้ในสถานประกอบกิจกา', 'met', 'PA', NULL, 'PA จัดให้มีการตรวจสอบระบบป้องกัน และระงับอัคคีภัยในอาคาร
การรายงานผล: -', NULL),
    (7, 'ข้อ ๑๑ ให้นายจ้างจัดให้มีป้ายบอกทางหนีไฟที่มีลักษณะ ดังต่อไปนี้
(๑) ขนาดของตัวหนังสือต้องสูงไม่น้อยกว่าสิบห้าเซนติเมตร และเห็นได้อย่างชัดเจน
(๒) ป้ายบอกทางหนีไฟต้องมีแสงสว่างในตัวเองหรือใช้ไฟส่องให้เห็นได้อย่างชัดเจนตลอดเวลา
ทั้งนี้ ต้องไม่ใช้สีหรือรูปร่างที่กลมกลืนไปกับการตกแต่งหรือป้ายอื่น ๆ ที่ติดไว้ใกล้เคียง หรือโดยประการใด
ที่ท าให้เห็นป้ายไม่ชัดเจน
นายจ้างอาจใช้รูปภาพบอกทางหนีไฟตามมาตรฐานของสมาคมวิศวกรรมสถานแห่งประเทศไทย
ในพระบรมราชูปถัมภ์ ได้ ทั้งนี้ ต้องให้เห็นได้อย่างชัดเจน', 'met', '-PA: ตึกจัสมิน, Office Jastel
-Corporate Affair :  Office Jastel
-SafetyOfficer : All area of Jastel
- IPLC Network Management/Site & Metronet Support : Site & Metronet area
-Data center : พื้นที่ในการควบคุมของ Data center ทั้งหมด เช่น ห้องไฟฟ้า, ห้อง Generator', NULL, 'การรายงานผล: -', NULL),
    (8, 'ข้อ ๑๓ ให้นายจ้างจัดให้มีเครื่องดับเพลิงแบบเคลื่อนย้ายได้ โดยต้องปฏิบัติ ดังต่อไปนี้
(๑) จัดให้มีเครื่องดับเพลิงแบบเคลื่อนย้ายได้ตามประเภทของเพลิง ซึ่งเป็นไปตามมาตรฐาน
(๒) เครื่องดับเพลิงแบบเคลื่อนย้ายได้ทุกเครื่อง ต้องจัดให้มีเครื่องหมายหรือสัญลักษณ์
แสดงว่าเป็นชนิดใด ใช้ดับเพลิงประเภทใด และเครื่องหมายหรือสัญลักษณ์นั้นต้องมีขนาดที่มองเห็นได้อย่างชัดเจนในระยะไม่น้อยกว่าหนึ่งเมตรห้าสิบเซนติเมตร
(๓) ห้ามใช้เครื่องดับเพลิงแบบเคลื่อนย้ายได้ที่อาจเกิดไอระเหยของสารพิษ เช่น
คาร์บอนเตตราคลอไรด์
(๔) จัดให้มีเครื่องดับเพลิงแบบเคลื่อนย้ายได้ตามจำนวน ความสามารถของเครื่องดับเพลิง
(๕) จัดให้มีการดูแลรักษาและตรวจสอบเครื่องดับเพลิงให้อยู่ในสภาพที่ใช้งานได้ดี โดยการตรวจสอบ ต้องไม่น้อยกว่าหกเดือนต่อหนึ่งครั้ง พร้อมกับติดป้ายแสดงผลการตรวจสอบและวันที่ทำการตรวจสอบ', 'met', NULL, 'ตรวจสอบเดือนละ 1 ครั้ง', NULL, NULL),
    (9, 'ข้อ ๑๔ กรณีที่นายจ้างจัดให้มีระบบดับเพลิงอัตโนมัติ ให้ปฏิบัติ ดังต่อไปนี้
(๑) ระบบดับเพลิงอัตโนมัติต้องเป็นไปตามมาตรฐานของสมาคมวิศวกรรมสถานแห่งประเทศไทยในพระบรมราชูปถัมภ์
(๒) ต้องเปิดวาล์วประธานที่ควบคุมระบบจ่ายน้ำเข้าหรือสารดับเพลิงอื่นอยู่ตลอดเวลา และจัดให้มีผู้ควบคุมดูแลให้ใช้งานได้ตลอดเวลา
(๓) ต้องติดตั้งสัญญาณเพื่อเตือนภัยในขณะที่ระบบดับเพลิงอัตโนมัติกำลังทำงาน
(๔) ต้องไม่มีสิ่งกีดขวางทางน้ำหรือสารดับเพลิงอื่นจากหัวฉีดดับเพลิงโดยรอบ', 'met', '-SafetyOfficer : All area of Jastel
- Site & Metronet Support : Site & Metronet area
''-Data center : พื้นที่ในการควบคุมของ Data center ทั้งหมด เช่น ห้องไฟฟ้า, ห้อง Generator', NULL, '-มีการติดตั้งสารดับเพลิงอัตโนมัติที่ห้อง Data centet 
-มีการติดตั้งสารดับเพลิงอัตโนมัติที่ Site Node : น้ำยาเหลวระเหย HFC 236-FA type ABC', NULL),
    (10, 'ข้อ ๑๖ ให้นายจ้างปฏิบัติเกี่ยวกับอุปกรณ์ดับเพลิง ดังต่อไปนี้ (๑) ติดตั้งป้ายแสดงจุดติดตั้งอุปกรณ์ดับเพลิงที่เห็นได้อย่างชัดเจน (๒) ติดตั้งอุปกรณ์ดับเพลิงในที่เห็นได้อย่างชัดเจน ไม่มีสิ่งกีดขวาง และสามารถนำมาใช้งาน ได้โดยสะดวกตลอดเวลา (๓) จัดให้มีการดูแลรักษาและตรวจสอบอุปกรณ์ดับเพลิงให้อยู่ในสภาพที่ใช้งานได้ดี โดยในการตรวจสอบนั้นต้องไม่น้อยกว่าเดือนละหนึ่งครั้งหรือตามระยะเวลาที่ผู้ผลิตกำหนด พร้อมกับติดป้าย แสดงผลการตรวจสอบและวันที่ทำการตรวจสอบครั้งสุดท้ายไว้ที่อุปกรณ์ดังกล่าว และเก็บผลการตรวจสอบ ไว้ให้พนักงานตรวจความปลอดภัยตรวจสอบได้ตลอดเวลา', 'met', NULL, 'ตรวจสอบเดือนละ 1 ครั้ง', NULL, 'พบถังดับเพลิงที่ซื้อมาติดตั้งเพิ่มในพื้นที่ Data center ยังมีป้ายแสดงจุดติดตั้งและข้อปฏิบัติไม่ครบถ้วน'),
    (11, 'ข้อ ๑๘ ให้นายจ้างป้องกันอัคคีภัยจากแหล่งก่อเกิดการกระจายตัวของความร้อน ดังต่อไปนี้
(๑) กระแสไฟฟ้าลัดวงจร ให้เป็นไปตามกฎหมายเกี่ยวกับความปลอดภัยในการทำงาน
เกี่ยวกับไฟฟ้า
(๕) การสะสมของไฟฟ้าสถิต โดยต่อสายดินกับถังหรือท่อน้ำมันเชื้อเพลิง สารเคมี หรือ
ของเหลวไวไฟ ทั้งนี้ ให้เป็นไปตามกฎหมายเกี่ยวกับความปลอดภัยในการทำงานเกี่ยวกับไฟฟ้า', 'met', 'Data center : ห้อง generator', NULL, 'การรายงานผล: -', 'มีการต่อสายดินกับท่อน้ำมันเชื้อเพลิง เครื่อง gen'),
    (12, 'ข้อ ๒๕ ให้นายจ้างจัดให้มีระบบป้องกันอันตรายจากฟ้าผ่าสำหรับอาคารหรือสิ่งก่อสร้าง
๑) อาคารที่มีวัตถุไวไฟหรือวัตถุระเบิด
(๒) สิ่งก่อสร้างที่มีความสูง ประเภท ปล่องควัน หอคอย เสาธง ถังเก็บน้ำหรือสารเคมี
หรือสิ่งก่อสร้างอื่นใดที่มีความสูงในทำนองเดียวกัน
ข้อ ๒๖ ให้นายจ้างจัดให้มีมาตรการป้องกันผลกระทบจากฟ้าผ่าเข้าสู่ระบบไฟฟ้าของอาคาร', 'met', 'PA', 'ตรวจสอบปีละ 1 ครั้ง', NULL, 'ขอเอกสารตรวจอาคารและสายล่อฟ้า OK'),
    (13, 'ข้อ ๒๗ ให้นายจ้างจัดให้ลูกจ้างไม่น้อยกว่าร้อยละสี่สิบของจำนวนลูกจ้างในแต่ละหน่วยงานของสถานประกอบกิจการรับการฝึกอบรมการดับเพลิงขั้นต้น โดยให้ผู้ที่ได้รับใบอนุญาตจากกรมสวัสดิการและคุ้มครองแรงงานเป็นผู้ดาเนินการฝึกอบรม', 'met', 'Safety Offcer
QA&Training', 'ทบทวนเป็นระยะๆ', 'HQ : รายงานอบรมดับเพลิงขั้นต้น
ตจว.:รายงานอบรมดับเพลิงขั้นต้น', NULL),
    (14, 'ข้อ ๓๐ ให้นายจ้างจัดให้ลูกจ้างทุกคนฝึกซ้อมดับเพลิงและฝึกซ้อมอพยพหนีไฟพร้อมกันอย่างน้อยปีละหนึ่งครั้ง', 'met', '-Safety Offcer, QA&Training, Corporate Affair :
ประสานงาน PA
-ทุกหน่วยงาน', 'ปีละ 1 ครั้ง', 'HQ : รายงานฝึกซ้อมดับเพลิงและอพยพหนีไฟร่วมกับอาคาร
ตจว.:รายงานฝึกซ้อมดับเพลิงและอพยพหนีไฟตามแผน
การรายงานผล: สวัสดิการและคุ้มครองแรงงาน', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LC' and code='LC-004') L,
  (values
    (0, 'ใช้บังคับตั้งแต่วันที่ 12 มีนาคม 2556 เป็นต้นไป
     1. มาตรฐานเครื่องดับเพลิงแบบเคลื่อนย้ายได้  ได้แก่ 
        1.1 มาตรฐานสมาคมป้องกันอัคคีภัยแห่งชาติ สหรัฐอเมริกา (NFPA) 
        1.2 มาตรฐานสถาบันมาตรฐานแห่งชาติ ประเทศสหรัฐอเมริกา (ANSI) 
        1.3 มาตรฐานประเทศออสเตรเลีย (AS) 
        1.4 มาตรฐานประเทศอังกฤษ (BS)
        1.5 มาตรฐานองค์การมาตรฐานสากล  (ISO)', 'met', 'Safety', 'เมื่อจัดซื้อเครื่องดับเพลิง', NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LC' and code='LC-005') L,
  (values
    (0, 'ใช้บังคับตั้งแต่วันที่ 12 มีนาคม 2556 เป็นต้นไป
การรายงานผลการฝึกซ้อมดับเพลิงและฝึกซ้อมอพยพหนีไฟให้เป็นไปตามแบบรายงานผลการฝึกซ้อมดับเพลิงและฝึกซ้อมอพยพหนีไฟ ตามท้ายประกาศนี้', 'met', 'PA', 'ปีละ 1 ครั้ง', 'การรายงานผล: สนง.สวัสสดิการและคุ้มครองแรงงาน', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LC' and code='LC-006') L,
  (values
    (0, '- การรายงานผลการฝึกซ้อมดับเพลิงและฝึกซ้อมอพยพหนีไฟตามข้อ ๓๐ แห่งกฎกระทรวงฯ การป้องกันและระงับอัคคีภัย พ.ศ. ๒๕๕๕ ต่ออธิบดีหรือผู้ซึ่งอธิบดีมอบหมาย นายจ้างอาจรายงานทางสื่ออิเล็กทรอนิกส์ตามแบบรายงานผลการฝึกซ้อมดับเพลิงและฝึกซ้อมอพยพหนีไฟทางสื่ออิเล็กทรอนิกส์
 - นายจ้างที่มีความประสงค์จะรายงานผลการฝึกซ้อมดับเพลิงและฝึกซ้อมอพยพหนีไฟทางสื่ออิเล็กทรอนิกส์ตามข้อ ๓ ต้องลงทะเบียนเพื่อขอรหัสผู้ใช้ (User ID) และรหัสผ่าน (Password)
ทางเว็บไซต์ของกรมสวัสดิการและคุ้มครองแรงงาน (http://eservice.labour.go.th)', 'met', 'PA', 'ปีละ 1 ครั้ง', 'การรายงานผล: สนง.สวัสสดิการและคุ้มครองแรงงาน', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LC' and code='LC-007') L,
  (values
    (0, 'กำหนดมาตรฐานผลิตภัณฑ์อุตสาหกรรม ข้อกำหนดในการป้องกันอัคคีภัย เล่ม 7 ศูนย์สั่งการดับเพลิงในอาคาร มาตรฐานเลขที่ มอก.2541 เล่ม 7 – 2559 ไว้ดังมีรายละเอียดต่อท้ายประกาศนี้
โดยหัวข้อมีดังนี้ 
1. ขอบข่าย
          มาตรฐานผลิตภัณฑ์อุตสาหกรรมนี้ ครอบคลุมหลักปฏิบัติของศูนย์สั่งการดับเพลิงในอาคารเป็นมาตรฐาน
เพื่อใช้สำหรับอาคารสูง อาคารชุมนุมคน อาคารขนาดใหญ่พิเศษ และอาคารสาธารณะ ใช้เป็นแนวทางในการจัดการ
ด้านความปลอดภัยและปฏิบัติการตอบโต้ภาวะฉุกเฉินที่อาจเกิดขึ้นกับอาคารเหล่านั้น
2. บทนิยาม
             กำหนดความหมายของคำที่ใช้ในมาตรฐานผลิตภัณฑ์อุตสาหกรรมนี้ ยกตัวอย่างเช่น ศูนย์สั่งการดับเพลิง  แผนปฏิบัติการฉุกเฉิน  เป็นต้น
3. ข้อกำหนดของศูนย์สั่งการดับเพลิงในอาคาร
ภาคผนวก ก. แผนบัญชาการศูนย์สั่งการ', 'met', 'PA', NULL, 'PA ดำเนินการติดตั้งจัดให้มีการตรวจสอบระบบป้องกัน และระงับอัคคีภัยในอาคาร', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LC' and code='LC-008') L,
  (values
    (0, 'ข้อ 1 ให้ยกเลิกความใน (1) ของข้อ 11 แห่งกฎกระทรวงกำหนดมาตรฐานในการบริหาร จัดการ และดำเนินการด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงานเกี่ยวกับการป้องกัน และระงับอัคคีภัย พ.ศ. 2555 และให้ใช้ความต่อไปนี้แทน
“(1) ตัวอักษรต้องมีขนาดไม่เล็กกว่าสิบเซนติเมตร และมองเห็นได้อย่ำงชัดเจน”
[จากเดิม : ข้อ 11 ให้นายจ้างจัดให้มีป้ายบอกทางหนีไฟที่มีลักษณะ ดังต่อไปนี้
(1) ขนาดของตัวหนังสือต้องสูงไม่น้อยกว่าสิบห้าเซนติเมตร และเห็นได้อย่างชัดเจน', 'met', 'Safety', NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LC' and code='LC-009') L,
  (values
    (0, 'กำหนดมาตรฐานผลิตภัณฑ์อุตสาหกรรม ข้อกำหนดในการป้องกันอัคคีภัย เล่ม 8 การติดตั้งระบบส่งน้ำดับเพลิง มาตรฐานเลขที่ มอก. 2541 เล่ม 8 - 2560 ไว้  รายละเอียดตามท้ายประกาศนี้
ขอบข่าย :   ครอบคลุมองค์ประกอบและข้อกำหนดการติดตั้ง การทดสอบ การทำงานเพื่อตรวจรับงาน รวมทั้งการตรวจสอบและทดสอบระบบส่งน้ำดับเพลิง  แหล่งน้ำดับเพลิง ระบบส่งน้ำดับเพลิง  และวัสดุอุปกรณ์ที่ใช้กับอาคารทั่วไปรวมทั้งโรงงาน', 'met', 'PA', NULL, 'PA จัดให้มีการตรวจสอบระบบป้องกัน และระงับอัคคีภัยในอาคาร', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LC' and code='LC-010') L,
  (values
    (0, 'ข้อ ๗ ผู้ประสงค์จะขอขึ้นทะเบียนเป็นผู้ให้บริการด้านความปลอดภัย อาชีวอนามัย
และสภาพแวดล้อมในการท างานต้องมีคุณสมบัติ ตามที่กฎหมายกำหนด', 'met', '-Safety Offcer, QA&Training', '-ตรวจสอบใบอนุญาตหน่วยงานฝึกอบรม เช่น ดับเพลิงและซ้อมอพยพหนีไฟ 
''-ตรวจสอบใบอนุญาตหน่วยงานตรวจววัด ตรวจสอบ', NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LC' and code='LC-011') L,
  (values
    (0, 'ข้อ ๒๘ อาคารสูงต้องจัดให้มีช่องทางเฉพาะสาหรับบุคคลภายนอกเข้าไปบรรเทาสาธารณภัย
ที่เกิดในอาคารได้ทุกชั้น ช่องทางเฉพาะนี้จะเป็นลิฟต์ดับเพลิงหรือช่องบันไดหนีไฟก็ได้และทุกชั้น
ต้องจัดให้มีห้องว่างที่มีพื้นที่ไม่น้อยกว่า ๖.๐๐ ตารางเมตร มีด้านแคบที่สุดไม่น้อยกว่า ๒.๕๐ เมตร
ข้อ ๒๙/๑ อาคารสูงหรืออาคารขนาดใหญ่พิเศษต้องจัดให้มีพื้นที่สาหรับยานพาหนะ รถดับเพลิง อย่างน้อย 1 คัน และรถพยาบาล อย่างน้อย 1 คน 
-เจ้าของอาคารหรือผู้ครอบครองอาคารต้องดูแลพื้นที่ปฏิบัติการตามวรรคหนึ่ง ให้รถดับเพลิง รถพยาบาลหรือรถปฏิบัติการฉุกเฉินสามารถเข้าถึงได้สะดวกตลอดเวลาโดยไม่มีสิ่งกีดขวาง
-รูปแบบ สัญลักษณ์ และรายละเอียดเกี่ยวกับพื้นที่สาหรับยานพาหนะตามวรรคหนึ่ง
ให้เป็นไปตามที่กาหนดท้ายกฎกระทรวงนี้
ข้อ ๔๓ ลิฟต์โดยสารที่ใช้กับอาคารสูงให้มีขนาดมวลบรรทุกไม่น้อยกว่า ๖๓๐ กิโลกรัม
ข้อ ๔๔ อาคารสูงต้องจัดให้มีลิฟต์ดับเพลิงอย่างน้อยหนึ่งชุด
ข้อ ๒๙/๒ อาคารสูงหรืออาคารขนาดใหญ่พิเศษ ที่เป็นอาคารสาธารณะต้องจัดให้มีพื้นที่
หรือตำแหน่งเพื่อติดตั้งเครื่องฟื้นคืนคลื่นหัวใจด้วยไฟฟ้าแบบอัตโนมัติ', 'met', 'PA', NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LD' and code='LD-001') L,
  (values
    (0, 'หมวด 1 ความร้อน
1. ให้นายจ้างควบคุมและรักษาระดับความร้อนภายในสถานประกอบกิจการที่มีลูกจ้างทำงานอยู่มิให้เกินมาตรฐาน
2.  กรณีสถานประกอบกิจการมีแหล่งความร้อนที่อาจเป็นอันตราย ให้นายจ้างดำเนินการดังนี้
o ติดป้ายหรือประกาศเตือนอันตรายในบริเวณดังกล่าวให้มองเห็นได้ชัดเจน
o กรณีมีระดับความร้อนเกินกว่าที่มาตรฐานกำหนด  ให้ปรับปรุงหรือแก้ไขสภาวะการทำงานทางด้าน
วิศวกรรม   และปิดประกาศการปรับปรุงหรือแก้ไขดังกล่าวไว้ด้วย
o กรณีที่ไม่สามารถปรับปรุงหรือแก้ไขสภาวะการทำงานดังกล่าวได้  ต้องจัดให้มีมาตรการควบคุมหรือลดภาระงาน และให้ลูกจ้างสวมใส่อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลตลอดเวลาที่ทำงาน', 'met', 'Safety', NULL, 'รายงานผลการตรวจวัดสภาพแวดล้อมในการทำงาน ตรวจวัดและจัดทำรายงานโดย จป.วิชาชีพ', NULL),
    (1, 'หมวด 2 แสงสว่าง
3. นายจ้างต้องจัดให้สถานประกอบกิจการมีความเข้มของแสงสว่างไม่ต่ำกว่ามาตรฐานกำหนด 4. ต้องใช้หรือจัดให้มีฉาก แผ่นฟิล์มกรองแสง หรือมาตรการอื่นที่เหมาะสมและเพียงพอเพื่อป้องกันมิให้แสงตรงหรือ
แสงสะท้อนจากแหล่งกำเนิดแสงหรือดวงอาทิตย์ที่มีแสงจ้าส่องเข้านัยน์ตาลูกจ้างโดยตรงในขณะทำงาน    กรณีไม่อาจป้องกันได้  ต้องจัดให้ลูกจ้างสวมใส่อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลตลอดเวลาที่ทำงาน
5. ทำงานในที่มืด ทึบ และคับแคบ  ต้องจัดให้มีอุปกรณ์ส่องแสงสว่าง โดยอาจเป็นชนิดติดอยู่ในพื้นที่ทำงานหรือติดตัวบุคคลก็ได้  หากไม่สามารถทำได้ต้องจัดให้มีอุปกรณ์ป้องกันอันตรายส่วนบุคคลตลอดเวลาที่ทำงานหมวด 3 เสียง
6.  ต้องควบคุมระดับเสียงมิให้ลูกจ้างได้รับสัมผัสเสียงที่มีระดับเสียงสูงสุดของเสียงกระทบหรือเสียงกระแทกเกิน 140 เดซิเบล หรือได้รับสัมผัสเสียงที่มีระดับเสียงดังต่อเนื่องแบบคงที่เกินกว่า 115 เดซิเบลเอ', 'met', 'Safety', NULL, 'รายงานผลการตรวจวัดสภาพแวดล้อมในการทำงาน ตรวจวัดและจัดทำรายงานโดย จป.วิชาชีพ', NULL),
    (2, '7.  ต้องควบคุมระดับเสียงที่ลูกจ้างได้รับเฉลี่ยตลอดเวลาการทำงานในแต่ 
ละวันไม่ให้เกินมาตรฐานที่กำหนด
8. หากในสถานประกอบกิจการมีระดับเสียงเกินมาตรฐานที่กำหนด ให้นายจ้างดำเนินการดังนี้
o ให้ลูกจ้างหยุดทำงานจนกว่าจะได้ปรับปรุงให้ระดับเสียงเป็นไปตามมาตรฐานที่กำหนด โดยให้ปรับปรุงหรือแก้ไขทางด้านวิศวกรรม 
o ปิดประกาศในการปรับปรุงหรือแก้ไขระดับเสียงที่เกินมาตรฐาน
o กรณีที่ไม่สามารถปรับปรุงหรือแก้ไขสภาวะการทำงานดังกล่าวได้ ต้องจัดให้ลูกจ้างสวมใส่อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลตลอดเวลาที่ทำงาน
9. ในบริเวณที่มีระดับเสียงเกินมาตรฐานที่กำหนด ต้องจัดให้มีเครื่องหมายเตือนให้ใช้อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลติดไว้ให้ลูกจ้างเห็นได้โดยชัดเจน
10.  กรณีมีระดับเสียงเฉลี่ยตลอดระยะเวลาการทำงาน 8 ชั่วโมงตั้งแต่ 85 เดซิเบลเอขึ้นไป ให้จัดให้มีมาตรการอนุรักษ์การได้ยินในสถานประกอบกิจการตามหลักเกณฑ์และวิธีการที่กำหนด
หมวด 4 อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคล', 'met', 'Safety', NULL, NULL, NULL),
    (3, '11. นายจ้างต้องจัดให้มีและดูแลให้ลูกจ้างใช้อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคล และต้องบำรุงรักษาอุปกรณ์ให้อยู่ในสภาพที่ใช้งานได้อย่างปลอดภัย 
12. จัดให้ลูกจ้างได้รับการฝึกอบรมเกี่ยวกับวิธีการใช้และบำรุงรักษาอุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคล พร้อมเก็บหลักฐานการฝึกอบรมไว้ ณ สถานประกอบกิจการ', 'met', 'Safety', NULL, NULL, NULL),
    (4, 'หมวด 5 การตรวจวัดและวิเคราะห์สภาวะการทำงาน และการรายงานผล
13. นายจ้างต้องจัดให้มีการตรวจวัดและวิเคราะห์สภาวะการทำงานเกี่ยวกับระดับความร้อน แสงสว่าง หรือเสียงภายในสถานประกอบกิจการตามหลักเกณฑ์และวิธีการที่กำหนด  14. กรณีไม่สามารถตรวจวัดและวิเคราะห์สภาวะการทำงานเองได้  ต้องให้ผู้ที่ขึ้นทะเบียนตามมาตรา 9 หรือนิติบุคคลที่ได้รับใบอนุญาตตามมาตรา 11 แห่ง พ.ร.บ. ความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน พ.ศ. 2554 
เป็นผู้ตรวจวัดแทน 15. จัดทำรายงานผลการตรวจวัดและวิเคราะห์สภาวะการทำงานตามแบบที่กำหนด  พร้อมส่งรายงานผลดังกล่าวต่ออธิบดีหรือผู้ซึ่งอธิบดีมอบหมายภายใน 30 วันนับแต่วันที่เสร็จสิ้นการตรวจวัด พร้อมเก็บรายงานผลการตรวจวัดและวิเคราะห์สภาวะการทำงานดังกล่าวด้วย', 'met', 'Safety', NULL, NULL, NULL),
    (5, 'หมวด 6 การตรวจสุขภาพและการรายงานผล
16. ให้ตรวจสุขภาพลูกจ้างที่ทำงานในสภาวะการทำงานที่อาจได้รับอันตรายจากความร้อน แสงสว่าง หรือเสียง และรายงานผล รวมทั้งดำเนินการที่เกี่ยวข้องกับการตรวจสุขภาพของลูกจ้างตาม พ.ร.บ. ความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน พ.ศ. 2554', 'met', 'Safety', NULL, 'ปัจจุบันงานยังไม่เข้าข่ายตรวจสุขถาพตามปัจจัยเสี่ยง', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LD' and code='LD-002') L,
  (values
    (0, 'ข้อ ๒ ให้นายจ้างจัดให้มีการตรวจวัดและวิเคราะห์สภาวะการทำงานเกี่ยวกับระดับความร้อน แสงสว่าง หรือเสียง ภายในสถานประกอบกิจการในสภาวะที่เป็นจริงของสภาพการทำงานอย่างน้อยปีละหนึ่งครั้ง', 'met', 'Safety', 'Annual', 'รายงานผลการตรวจวัดสภาพแวดล้อมในการทำงาน ตรวจวัดและจัดทำรายงานโดย จป.วิชาชีพ', 'ตรวจแสงประจำปี 66 - ม.ค. 66 
ตรวจเสียงประจำปี 66 มี.ค. 66')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LD' and code='LD-003') L,
  (values
    (0, 'ข้อ ๑๕ ผู้ที่ดำเนินการตรวจวัดและวิเคราะห์สภาวะการทำงานในสถานประกอบกิจการ
ต้องมีคุณสมบัติอย่างหนึ่งอย่างใด ดังต่อไปนี้
(๑) เป็นบุคคลที่ขึ้นทะเบียนเป็นเจ้าหน้าที่ความปลอดภัยในการทำงานระดับวิชาชีพของสถานประกอบกิจการกับกรมสวัสดิการและคุ้มครองแรงงาน สามารถดำเนินการตรวจวัดและวิเคราะห์สภาวะการทำงานเกี่ยวกับความร้อน แสงสว่าง หรือเสียง ภายในสถานประกอบกิจการของตนเอง
(๒) เป็นบุคคลที่ผู้สำเร็จการศึกษาไม่ต่ำกว่าปริญญาตรีสาขาอาชีวอนามัยหรือเทียบเท่า
ที่ขึ้นทะเบียนเป็นเจ้าหน้าที่ความปลอดภัยในการทำงานของสถานประกอบกิจการกับกรมสวัสดิการและคุ้มครองแรงงาน สามารถดำเนินการตรวจวัดและวิเคราะห์สภาวะการทำงานเกี่ยวกับความร้อน แสงสว่าง หรือเสียง ภายในสถานประกอบกิจการของตนเอง
(๓) เป็นบุคคลหรือนิติบุคคลที่ขึ้นทะเบียนตามมาตรา ๙ หรือมาตรา ๑๑ แห่งพระราชบัญญัติความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน พ.ศ. ๒๕๕๔ แล้วแต่กรณี', 'met', 'Safety', 'Annual', 'ให้จป.วิชาชีพ เป็นผู้ตรวจวัด และจัดทำรายงาน', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LD' and code='LD-004') L,
  (values
    (0, 'ข้อ ๒ ให้นายจ้างจัดทำมาตรการอนุรักษ์การได้ยินในสถานประกอบกิจการเป็นลายลักษณ์อักษรในกรณีที่สภาวะการทำงานในสถานประกอบกิจการมีระดับเสียงที่ลูกจ้างได้รับเฉลี่ยตลอดระยะเวลาการทำงานแปดชั่วโมงตั้งแต่แปดสิบห้าเดซิเบลเอขึ้นไป
ให้นายจ้างประกาศมาตรการอนุรักษ์การได้ยินในสถานประกอบกิจการให้ลูกจ้างทราบ
ข้อ ๓ ให้นายจ้างจัดให้มีการเฝ้าระวังเสียงดัง โดยการสำรวจและตรวจวัดระดับเสียง
การศึกษาระยะเวลาสัมผัสเสียงดัง และการประเมินการสัมผัสเสียงดังของลูกจ้างในสถานประกอบกิจการแล้วแจ้งผลให้ลูกจ้างทราบ
ข้อ ๔ ให้นายจ้างจัดให้มีการเฝ้าระวังการได้ยินโดยให้ดำเนินการ ดังนี้
(๑) ทดสอบสมรรถภาพการได้ยิน (Audiometric sting) แก่ลูกจ้างที่สัมผัสเสียงดังที่ได้ รับเฉลี่ยตลอดระยะเวลาการทำงานแปดชั่วโมงตั้งแต่แปดสิบห้าเดซิเบลเอขึ้นไป และให้ทดสอบสมรรถภาพการได้ยินของลูกจ้างครั้งต่อไปอย่างน้อยปีละหนึ่งครั้ง
(๒) แจ้งผลการทดสอบสมรรถภาพการได้ยินให้ลูกจ้างทราบภายในเจ็ดวันนับแต่วันที่นายจ้างทราบผลการทดสอบ
(๓) ทดสอบสมรรถภาพการได้ยินของลูกจ้างซ้ำอีกครั้งภายในสามสิบวันนับแต่วันที่นายจ้างทราบผลการทดสอบ กรณีพบว่าลูกจ้างมีสมรรถภาพการสูญเสียการได้ยิน', 'met', 'Safety
ทีมราชบุรี', NULL, NULL, NULL),
    (1, '- การทดสอบสมรรถภาพการได้ยินครั้งแรกของลูกจ้างที่ความถี่ ๕๐๐ ๑๐๐๐ ๒๐๐๐ ๓๐๐๐ ๔๐๐๐ และ ๖๐๐๐ เฮิรตซ์ ของหูทั้งสองข้างเป็นข้อมูลพื้นฐาน (Baseline Audiogram)
ข้อ ๖ หากผลการทดสอบสมรรถภาพการได้ยิน พบว่าลูกจ้างสูญเสียการได้ยินที่หูข้างใดข้างหนึ่งตั้งแต่สิบห้าเดซิเบลขึ้นไปที่ความถี่ใดความถี่หนึ่ง ให้นายจ้างจัดให้มีมาตรการป้องกันอันตรายอย่างหนึ่งอย่างใดแก่ลูกจ้าง ดังนี้
(๑) จัดให้ลูกจ้างสวมใส่อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลที่สามารถลดระดับเสียงที่ลูกจ้างได้รับเฉลี่ยตลอดระยะเวลาการทำงานแปดชั่วโมงน้อยกว่าแปดสิบห้าเดซิเบลเอ
(๒) เปลี่ยนงานให้ลูกจ้าง หรือหมุนเวียนสลับหน้าที่ระหว่างลูกจ้างด้วยกันเพื่อให้ระดับเสียงที่ลูกจ้างได้รับเฉลี่ยตลอดระยะเวลาการทำงานแปดชั่วโมงน้อยกว่าแปดสิบห้าเดซิเบลเอ', 'met', 'Safety
ทีมราชบุรี', NULL, NULL, NULL),
    (2, 'ข้อ ๗ ให้นายจ้างจัดทำและติดแผนผังแสดงระดับเสียง (Noise Contour Map) ในแต่ละพื้นที่เกี่ยวกับผลการตรวจวัดระดับเสียง ติดป้ายบอกระดับเสียงและเตือนให้ระวังอันตรายจากเสียงดังรวมถึงจัดให้มีเครื่องหมายเตือนให้ใช้อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลในแต่ละพื้นที่ที่มีความเสี่ยงจากเสียงดังและทุกพื้นที่ที่มีระดับเสียงดังตั้งแต่แปดสิบห้าเดซิเบลเอขึ้นไป ตามประกาศกำหนด
ข้อ ๘ ให้นายจ้างอบรมให้ความรู้ความเข้าใจเกี่ยวกับมาตรการอนุรักษ์การได้ยินแก่ลูกจ้างที่ทำงานในบริเวณที่มีระดับเสียงดังที่ได้รับเฉลี่ยตลอดระยะเวลาการทำงานแปดชั่วโมงตั้งแต่แปดสิบห้าเดซิเบลเอขึ้นไป และลูกจ้างที่เกี่ยวข้องในสถานประกอบกิจการ
ข้อ ๙ ให้นายจ้างประเมินผลและทบทวนการจัดการมาตรการอนุรักษ์การได้ยินในสถาน
ประกอบกิจการไม่น้อยกว่าปีละหนึ่งครั้ง
ข้อ ๑๐ ให้นายจ้างบันทึกข้อมูลและจัดทำเอกสารการดำเนินการ เก็บไว้ในสถานประกอบกิจการไม่น้อยกว่าห้าปี พร้อมที่จะให้พนักงานตรวจความปลอดภัยตรวจสอบได้', 'met', 'Safety
ทีมราชบุรี', NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LD' and code='LD-005') L,
  (values
    (0, '1.ค่าระดับการรบกวนที่เกิดจากการประกอบกิจการไม่เกิน 10 เดซิเบลเอ
2.ค่าระดับเสียงเฉลี่ย 24 ชม ที่เกิดจากการประกอบกิจการไม่เกิน 70  เดซิเบลเอ
3.ค่าระดับเสียงสูงสุด ที่เกิดจากการประกอบกิจการไม่เกิน 115  เดซิเบลเอ', 'met', 'Safety
ทีมราชบุรี', NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LD' and code='LD-006') L,
  (values
    (0, '4. วิธีการตรวจวัดระดับเสียงการรบกวน ระดับเสียงเฉลี่ย 24 ชั่วโมง และระดับเสียงสูงสุดที่เกิดจากการประกอบกิจการโรงงาน ให้ดำเนินการดังนี้', 'met', 'Safety
ทีมราชบุรี', NULL, NULL, NULL),
    (1, '(1) การเตรียมเครื่องมือก่อนการตรวจวัด ให้ปรับเทียบมาตรระดับเสียงด้วยเครื่องกำเนิดเสียง มาตรฐาน เช่น พิสตันโฟน (Piston Phone) หรืออะคูสติคคาลิเบรเตอร์ (Acoustic Calibrator) เป็นต้น หรือตรวจสอบตามคู่มือการใช้งานหรือวิธีการที่ผู้ผลิตมาตรระดับเสียงกำหนดไว้ โดยต้อง   ปรับเทียบมาตรระดับเสียงทุกครั้งก่อนที่จะตรวจวัดระดับเสียงพื้นฐาน ระดับเสียงขณะไม่มีการรบกวน ระดับเสียงขณะมีการรบกวน ระดับเสียงเฉลี่ย 24 ชั่วโมง และระดับเสียงสูงสุด โดยต้องปรับมาตร ระดับเสียงไว้ที่วงจรถ่วงน้ำหนัก “A” (WeigRAing Network “A”) และลักษณะความไวตอบรับเสียง “Fast” (Dynamic Characteristics “Fast”)', 'met', NULL, NULL, NULL, NULL),
    (2, '(2) การตั้งไมโครโฟนของมาตรระดับเสียงในการตรวจวัดระดับเสียงพื้นฐาน ระดับเสียงขณะไม่มีการรบกวน ระดับเสียงขณะมีการรบกวน ระดับเสียงเฉลี่ย 24 ชั่วโมง และระดับเสียงสูงสุดให้เป็นไปตามหลักเกณฑ์', 'met', NULL, NULL, NULL, NULL),
    (3, '(3) การตรวจวัดระดับเสียงการรบกวน ให้ดำเนินการดังนี้  (3.1) การตรวจวัดระดับเสียงพื้นฐานและระดับเสียงขณะไม่มีการรบกวน ให้ตรวจวัดเป็นเวลาไม่น้อยกว่า 5 นาที ในขณะที่ไม่มีเสียงจากการประกอบกิจการโรงงานในช่วงเวลาใดเวลาหนึ่ง', 'met', NULL, NULL, NULL, NULL),
    (4, '(4) การตรวจวัดระดับเสียงเฉลี่ย 24 ชั่วโมง ให้ใช้มาตรระดับเสียงตรวจวัดระดับเสียงอย่างต่อเนื่องตลอดเวลา 24 ชั่วโมงใด ๆ เป็นค่าระดับเสียงเฉลี่ย 24 ชั่วโมง (LAeq, 24 hr)              (5) การตรวจวัดระดับเสียงสูงสุด ให้ใช้มาตรระดับเสียงตรวจวัดระดับเสียงสูงสุดที่เกิดขึ้นในขณะใดขณะหนึ่งระหว่างการตรวจวัดเสียง', 'met', NULL, NULL, NULL, NULL),
    (5, '(6) การบันทึกการตรวจวัดเสียง ให้ผู้ตรวจวัดบันทึกการตรวจวัดเสียง โดยมีรายละเอียดอย่างน้อย ดังต่อไปนี้    (6.1) ชื่อ ชื่อสกุล ตำแหน่งและสังกัดของผู้ตรวจวัด', 'met', NULL, NULL, NULL, NULL),
    (6, '(6.2) ลักษณะเสียงและช่วงเวลาการเกิดเสียงจากการประกอบกิจการโรงงาน', 'met', NULL, NULL, NULL, NULL),
    (7, '(6.3) สถานที่ ตำแหน่งที่ตรวจวัด วัน และเวลาการตรวจวัดเสียง', 'met', NULL, NULL, NULL, NULL),
    (8, '(6.4) ผลการตรวจวัดระดับเสียงพื้นฐาน ระดับเสียงขณะไม่มีการรบกวน ระดับเสียงขณะมีการรบกวน ระดับเสียงเฉลี่ย 24 ชั่วโมง หรือระดับเสียงสูงสุด แล้วแต่กรณี', 'met', NULL, NULL, NULL, NULL),
    (9, '(7) การรายงานผลการตรวจวัดระดับเสียงพื้นฐาน ระดับเสียงขณะมีการรบกวน ค่าระดับการรบกวน ระดับเสียงเฉลี่ย 24 ชั่วโมงและระดับเสียงสูงสุด ให้รายงานที่ทศนิยม 1 ตำแหน่ง', 'met', NULL, NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LD' and code='LD-007') L,
  (values
    (0, 'ข้อ ๔ ค่ามาตรฐานมลพิษทางเสียง คือ ค่าระดับเสียงรบกวนอันเกิดจากการประกอบกิจการของสถานประกอบกิจการ ไม่เกิน 10 เดซิเบลเอ', 'met', NULL, NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LD' and code='LD-008') L,
  (values
    (0, '1. กำหนดให้สถานประกอบกิจการมีความเข้มของแสงสว่างไม่ต่ำกว่ามาตรฐานที่กำหนดไว้ในตารางแนบท้ายประกาศ', 'met', 'Safety', NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LD' and code='LD-009') L,
  (values
    (0, '1. การคํานวณระดับเสียงที่สัมผัสในหูเมื่อสวมใส่อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคล ที่สอดคล้องกับข้อมูลการลดเสียงของผู้ผลิตอย่างหนึ่งอย่างใด  ดังนี้
(1) การคำนวณโดยใช้ค่า Noise Reduction Rating (NRR) ที่ระบุไว้บนผลิตภัณฑ์กับค่าตรวจวัดระดับเสียงเฉลี่ย
ตลอดระยะเวลาการทำงาน
Protected dBA = Sound Level dBC – NRRadj หรือ
Protected dBA = Sound Level dBA – [NRRadj – 7]
(2) การคำนวณโดยใช้ค่า Single Number Rating (SNR) ที่ระบุไว้บนผลิตภัณฑ์กับค่าตรวจวัดระดับเสียงเฉลี่ยตลอดระยะเวลาการทำงาน
                    L’AX = (LC – SNRx) + 4
(3) การคำนวณระดับเสียงที่สัมผัสในหูเมื่อสวมใส่อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลนอกเหนือ
จาก (1) และ (2)  ให้ใช้วิธีการคำนวนตามที่กำหนดไว้ในประกาศกระทรวงอุตสาหกรรม ฉบับที่ 4456 
(พ.ศ. 2555) ออกตามความพระราชบัญญัติผลิตภัณฑ์อุตสาหกรรม พ.ศ. 2511 เรื่อง กำหนดมาตรฐานผลิตภัณฑ์อุตสาหกรรมข้อแนะนำในการเลือก การใช้ การดูแล และการบำรุงรักษาอุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคล เล่ม 1 อุปกรณ์การปกป้องการได้ยิน ข้อ 4 หลักเกณฑ์การเลือกอุปกรณ์ปกป้องการได้ยิน ลงวันที่ 28 สิงหาคม พ.ศ. 2555', 'met', 'Safety', NULL, NULL, NULL),
    (1, '2. กรณีที่ฉลากหรืออุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลมีการระบุค่าการลดเสียงมากกว่า 1 ค่า ให้นายจ้างใช้ค่าที่ลดเสียงที่สัมผัสในหูเมื่อสวมใส่อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลที่ได้จากการคำนวณน้อยที่สุดเป็นหลักในการพิจารณาลดระดับความดังเสียงจากสภาพแวดล้อมในการทำงาน', 'met', NULL, NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LD' and code='LD-010') L,
  (values
    (0, 'กำหนดมาตรฐานผลิตภัณฑ์อุตสาหกรรมการติดตั้งระบบการให้แสงสว่างฉุกเฉิน มาตรฐานเลขที่ มอก. 2690 – 2558 ไว้ ดังมีรายละเอียดต่อท้ายประกาศนี้
1. ขอบข่าย
     มาตรฐานนี้ ครอบคลุมคุณลักษณะที่ต้องการสำหรับการติดตั้ง ระบบการให้แสงสว่างฉุกเฉินสำหรับภายในอาคาร โดยครอบคลุมการออกแบบ การติดตั้งใหม่ การเปลี่ยนแปลง และการตรวจสอบภาคสนามสำหรับงานติดตั้งและบำรุงรักษาระบบการให้แสงสว่างฉุกเฉิน เพื่อให้บุคคลออกจากพื้นที่ได้อย่างรวดเร็วจนถึงทางออกที่ปลอดภัย
     และครอบคลุมข้อกาหนดการติดตั้งการตรวจสอบ ใบรับรองและสมุดบันทึก
2. บทนิยาม กำหนดความหมายของคำที่ใช้ในมาตรฐานนี้
3. การให้แสงสว่างฉุกเฉิน โดยแบ่งเป็นการให้แสงสว่างเพื่อการหนีภัย และการให้แสงสว่างสำรอง
4. ความสว่างเพื่อการหนีภัย
5. การออกแบบการให้แสงสว่างฉุกเฉิน
6. การติดตั้งระบบการให้แสงสว่างฉุกเฉิน
7. ข้อกำหนดการติดตั้ง
8. การตรวจสอบและการทดสอบ
9. ใบรับรองและสมุดบันทึก
ภาคผนวก ก. ตัวอย่างใบรับรองการทำงานแล้วเสร็จ
ภาคผนวก ข. ตารางระยะห่างสูงสุดระหว่างโคมไฟแสงสว่างฉุกเฉิน ชนิดติดตั้งกับฝ้าเพดาน', 'met', 'Safety', NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LD' and code='LD-011') L,
  (values
    (0, '1. นายจ้างต้องแจ้งข้อมูลที่จำเป็นเกี่ยวกับการเฝ้าระวัง การป้องกัน และ
การควบคุมโรคจากการประกอบอาชีพดังต่อไปนี้ ให้ลูกจ้างทราบ
(1) ปัจจัยเสี่ยงหรือพฤติกรรมเสี่ยงทางสุขภาพที่ก่อให้เกิดโรคจากการประกอบอาชีพ
(2) วิธีการป้องกันตนเองจากโรคจากการประกอบอาชีพ
(3) อาการสำคัญหรืออาการแสดงของโรคจากการประกอบอาชีพ
(4) มาตรการในการเฝ้าระวัง การป้องกัน และการควบคุมโรคจากการประกอบอาชีพ รวมถึงการบริการอาชีวเวชกรรมที่เกี่ยวข้องซึ่งสถานประกอบกิจการจัดให้กับลูกจ้าง
(5) สิทธิของลูกจ้างตามพระราชบัญญัติควบคุมโรคจากการประกอบอาชีพและโรคจากสิ่งแวดล้อม พ.ศ. 2562
(6) ข้อมูลเกี่ยวกับการสวมอุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคล หรือข้อมูลอื่น ๆ เกี่ยวกับการเฝ้าระวัง การป้องกันหรือการควบคุมโรค
2. กรณีนายจ้างเป็นนายจ้างตามกฎหมายว่าด้วยการคุ้มครองแรงงาน และนายจ้างตามกฎหมายว่าด้วยความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน ให้แจ้งข้อมูลให้ลูกจ้างทราบก่อนที่ลูกจ้างจะเข้าทำงาน หรือเปลี่ยนลักษณะงาน หรือเปลี่ยนสภาพแวดล้อมในการทำงานที่มีความเสี่ยงหรือ
อันตรายที่แตกต่างไปจากเดิม โดยให้จัดเก็บหลักฐานในการแจ้งข้อมูลและหลักฐานในการรับทราบข้อมูลนั้นของลูกจ้าง เพื่อให้พนักงานเจ้าหน้าที่ใช้ในการตรวจสอบ', 'met', 'Safety', NULL, NULL, NULL),
    (1, '3. กรณีนายจ้างเป็นผู้จ้างงานตามกฎหมายว่าด้วยการคุ้มครองผู้รับงานไปทำที่บ้าน ให้แจ้งข้อมูลเมื่อมีการจ้างงาน โดยให้จัดเก็บหลักฐานในการแจ้งข้อมูลและหลักฐานในการรับทราบข้อมูลนั้นของลูกจ้าง เพื่อให้พนักงานเจ้าหน้าที่ใช้ในการตรวจสอบ
4. การแจ้งให้ลูกจ้างทราบให้ดำเนินการแจ้งตามวิธีการหนึ่งวิธีการใด ดังต่อไปนี้
(1) แจ้งโดยตรงต่อลูกจ้าง
(2) แจ้งเป็นหนังสือ
(3) แจ้งผ่านสื่ออิเล็กทรอนิกส์ที่สามารถระบุการรับทราบข้อมูลได้
(4) แจ้งผ่านการฝึกอบรมที่นายจ้างจัดอบรมให้แก่ลูกจ้าง
(5) วิธีการอื่นใดที่อธิบดีกรมควบคุมโรคประกาศกำหนดเพิ่มเติม', 'met', NULL, NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LD' and code='LD-015') L,
  (values
    (0, 'ปฏิบัติตามสิทิ์ประกันพระราชบัญญัติเงินทดแทนกรณีผู้ประกันตนประสบอันตรายเจ็บป่วยจากการทำงาน', 'met', NULL, NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LD' and code='LD-013') L,
  (values
    (0, 'กำหนดงานที่มีลักษณะอาจเป็นอันตรายต่อสุขภาพและความปลอดภัยของหญิงมีครรภ์หรือเด็กซึ่งมีอายุต่ำกว่า 15 ปี ตาม พ.ร.บ. คุ้มครองผู้รับงานไปทำที่บ้าน พ.ศ. 2553 ดังนี้
1. งานที่เป็นอันตรายต่อสุขภาพและความปลอดภัยของหญิงมีครรภ์ ได้แก่
(1) งานเกี่ยวกับเครื่องจักรหรือเครื่องยนต์อันอาจเกิดอันตรายจากความสั่นสะเทือน
(2) งานยก แบก หาบ หาม ทูน ลาก หรือเข็นของหนักเกิน 15 กิโลกรัม
(3) งานที่ต้องสัมผัสละออง ไอ ก๊าซ จากวัตถุดิบหรือกระบวนการผลิตอันอาจเป็นอันตรายต่อสุขภาพ เช่น งานพ่นสี งานฟอกย้อม
(4) งานที่ต้องสัมผัสกับฝุ่น ฟูม เส้นใย จากวัตถุดิบหรือกระบวนการผลิตอันอาจเป็นอันตรายต่อสุขภาพ เช่น งานเชื่อมโลหะ หลอมโลหะ งานขัด เจียโลหะ
2. งานที่เป็นอันตรายต่อสุขภาพและความปลอดภัยของเด็กซึ่งมีอายุต่ำกว่า 15 ปี ได้แก่
(1) งานเกี่ยวกับเครื่องจักร เครื่องมือ หรืออุปกรณ์ซึ่งอาจก่อให้เกิดอันตรายจากเครื่องจักรเครื่องมือ หรือ อุปกรณ์นั้น
(2) งานยก แบก หาบ หาม ทูน ลาก หรือเข็นของหนักเกินสิบห้ากิโลกรัม', 'met', 'Safety', NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LD' and code='LD-014') L,
  (values
    (0, 'กำหนดชนิดของโรคซึ่งเกิดขึ้นตามลักษณะหรือสภาพของงานหรือเนื่องจากการทำงาน 

 กลุ่มโรคเฝ้าระวังที่อาจมีโอกาสเกิด 
(2.3) โรคและความผิดปกติในระบบกระดูก กล้ามเนื้อ เอ็นและข้อ : 
(2.4) ความผิดปกติทางจิตและพฤติกรรม', 'met', 'Safety', NULL, 'ยังไม่มีความเสี่ยงที่ก่อให้เกิดโรคจากการประกอบอาชีพ และปัจจุบันยังไม่มีการเกิดโรคอันเนื่องจากการประกอบอาชีพ นำมาประเมินไว้เพื่อทวนสอบกระบวนการทำงานและเป็นหนึ่งในหัวข้ออบรมพนักงาน ตามหน้าที่ของ จป.วิชาชีพ เพื่อให้พนักงานรับทราบ', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LD' and code='LD-012') L,
  (values
    (0, 'ข้อ ๑ ให้ยกเลิกประกาศกระทรวงแรงงานและสวัสดิการสังคม เรื่อง กำหนดชนิดของโรคซึ่งเกิดขึ้นตามลักษณะหรือสภาพของงานหรือเนื่องจากการทำงาน ลงวันที่ ๒ กุมภาพันธ์ พ.ศ. ๒๕๓๘ บังคับใช้
ข้อ ๒ ประกาศฉบับนี้ให้ใช้บังคับตั้งแต่วันถัดจากวันประกาศในราชกิจจานุเบกษาเป็นต้นไปข้อ ๓ กำหนดชนิดของโรคซึ่งเกิดขึ้นตามลักษณะหรือสภาพของงานหรือเนื่องจากการทำงานไว้ดังต่อไปนี้
(๑) โรคที่เกิดขึ้นจากสารเคมีดังต่อไปนี้
๑) เบริลเลียมหรือสารประกอบของเบริลเลียม
๒) แคดเมียม หรือสารประกอบของแคดเมียม
๓) ฟอสฟอรัส หรือสารประกอบของฟอสฟอรัส
๔) โครเมียม หรือสารประกอบของโครเมียม
๕) แมงกานีส หรือสารประกอบของแมงกานีส
๖) สารหนู หรือสารประกอบของสารหนู
๗) ปรอท หรือสารประกอบของปรอท
๘) ตะกั่ว หรือสารประกอบของตะกั่ว
๙) ฟลูออรีน หรือสารประกอบของฟลูออรีน
๑๐) คลอรีน หรือสารประกอบคลอรีน
๑๑) แอมโมเนีย
๑๒) คาร์บอนไดซัลไฟด์', 'met', 'Safety', NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LE' and code='LE-001') L,
  (values
    (0, '1. นายจ้างต้องจัดให้มีอุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลที่เหมาะสมกับงานนั่งร้านและค้ำยัน  และดูแลให้ลูกจ้าง
สวมใส่ตลอดระยะเวลาที่ลูกจ้างทำงาน
2. นายจ้างต้องจัดให้มีข้อบังคับและขั้นตอนการปฏิบัติงานเพื่อความปลอดภัยในการทำงานกับนั่งร้านหรือค้ำยัน รวมทั้ง
ต้องอบรมหรือชี้แจงให้ลูกจ้างทราบก่อนปฏิบัติงานอย่างเคร่งครัด และต้องมีสำเนาเอกสารเพื่อให้พนักงานตรวจสอบได้
3. นายจ้างต้องกำหนดเขตอันตรายในบริเวณพื้นที่ที่มีการติดตั้ง การใช้ การเคลื่อนย้ายและการรื้อถอนนั่งร้านหรือ
ค้ำยัน  และจัดทำรั้วหรือกั้นเขต   และมีป้าย “เขตอันตราย” แสดงให้เห็นได้ชัดเจน   
   เวลากลางคืนต้องจัดให้มีสัญญาณไฟสีส้มตลอดเวลา และห้ามให้บุคคลซึ่งไม่เกี่ยวข้องเข้าไปในเขตอันตราย
4. นายจ้างต้องติดหรือตั้งป้ายสัญลักษณ์เตือนอันตรายและเครื่องหมายป้ายบังคับเกี่ยวกับความปลอดภัย', 'met', 'Safety', NULL, NULL, NULL),
    (1, '5. ในการสร้าง ประกอบ ติดตั้ง ทดสอบ ตรวจสอบ ใช้ เคลื่อนย้าย และรื้อถอนนั่งร้านและค้ำยัน นายจ้างต้องปฏิบัติ
ตามรายละเอียดคุณลักษณะและคู่มือการใช้งานที่ผู้ผลิตกำหนดไว้   หากไม่มีรายละเอียดคุณลักษณะและคู่มือการใช้งาน ต้องให้วิศวกรจัดทำรายละเอียดคุณลักษณะและคู่มือการใช้งานเป็นหนังสือ และต้องมีสำเนาเอกสารเพื่อให้พนักงานตรวจสอบได้
6. นายจ้างต้องจัดให้มีการคำนวณออกแบบและควบคุมการใช้นั่งร้านโดยวิศวกรตามหลักเกณฑ์ วิธีการ และเงื่อนไข
ที่กำหนด
7. นายจ้างต้องไม่ให้ลูกจ้างทำงานบนนั่งร้านที่มีพื้นลื่น  ชำรุดหรือมีสภาพที่อาจก่อให้เกิดอันตราย  และนั่งร้านที่อยู่ภายนอกอาคารหรือส่วนอื่นที่อาจเกิดอันตรายในขณะที่มีพายุ ลมแรง ฝนตก หรือฟ้าคะนอง 8. นายจ้างต้องจัดให้มีมาตรการป้องกันวัสดุร่วงหล่น สำหรับการทำงานบนนั่งร้านหลายชั้นพร้อมกัน 
9. นายจ้างต้องตรวจสอบนั่งร้านทุกครั้งก่อนการใช้งานและทำรายงานผลการตรวจสอบ และต้องมีสำเนาเอกสารเพื่อให้พนักงานตรวจสอบได้', 'met', NULL, NULL, NULL, NULL),
    (2, '10. การสร้าง ประกอบ หรือติดตั้งค้ำยัน นายจ้างต้องจัดให้มีการคำนวณ ออกแบบ และควบคุมโดยวิศวกร ตามรายละเอียดที่กำหนดในกฎกระทรวงนี้
11. นายจ้างต้องจัดให้มีการตรวจสอบส่วนประกอบของค้ำยันและที่รองรับค้ำยันทุกครั้งก่อนการใช้งานและระหว่างใช้งาน หากพบว่าไม่มั่นคงแข็งแรงและปลอดภัย  
12.  กรณีที่ใช้ค้ำยันรองรับการเทคอนกรีต อุปกรณ์ เครื่องจักร หรือรองรับสิ่งอื่นใดที่มีลักษณะคล้ายกัน นายจ้างต้องควบคุมดูแลมิให้บุคคลที่ไม่เกี่ยวข้องเข้าไปอยู่ในหรือใต้บริเวณนั้น   
13. สำเนาเอกสารที่กำหนดให้ทำเป็นหนังสือ สามารถอยู่ในรูปแบบอิเล็กทรอนิกส์ได้', 'met', NULL, NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LE' and code='LE-002') L,
  (values
    (0, '1. ให้นายจ้างแจ้งข้อมูลงานก่อสร้างดังต่อไปนี้   ก่อนเริ่มงานไม่น้อยกว่า 15 วัน ต่ออธิบดีหรือผู้ซึ่งอธิบดีมอบหมาย 
2. ให้นายจ้างที่มีการดำเนินงานเกี่ยวกับงานก่อสร้างต้องปฏิบัติ ดังนี้
1) พื้นที่ทำงานก่อสร้างต้องมีความมั่นคงแข็งแรง สามารถรองรับน้ำหนักเครื่องจักร อุปกรณ์ และวัสดุในงานก่อสร้างได้อย่างปลอดภัย
2) จัดให้มีผู้ควบคุมงานทำหน้าที่ตรวจความปลอดภัยในการทำงาน  ก่อนการทำงานและขณะทำงานทุกขั้นตอน
3) รักษาความสะอาดในบริเวณเขตก่อสร้าง  แยกขยะที่อันตรายและไม่อันตราย
4) จัดให้มีแสงสว่างฉุกเฉินในเขตก่อสร้างให้เพียงพอเพื่อใช้ในเวลาที่ไฟฟ้าดับ
3. กรณีที่มีการขนย้ายดินที่ขุดออกจากเขตก่อสร้าง ต้องจัดให้มีสถานที่เก็บกองดินที่จะขนย้ายที่เหมาะสมและต้องกำหนดมาตรการป้องกันอันตรายอันเกิดจากการเก็บกองดินนั้น รวมทั้งการฟุ้งกระจายของฝุ่นอันเกิดจากดินดังกล่าว
4. กรณีที่ลูกจ้างทำงานก่อสร้างบนพื้นต่างระดับที่มีความสูงตั้งแต่ 1.50 เมตรขึ้นไป ต้องจัดให้มีบันไดหรือทางลาดพร้อมทั้งติดตั้งราวกันตกตามมาตรฐานสมาคมวิศวกรรมสถานแห่งประเทศไทยฯ หรือมาตรการอื่นใดเพื่อความปลอดภัย', 'met', 'Safety', NULL, NULL, NULL),
    (1, '5. นายจ้างต้องไม่ให้ลูกจ้างทำงานก่อสร้างในขณะที่เกิดภัยธรรมชาติ หรือมีเหตุอื่นใดที่อาจจะทำให้เกิดความไม่ปลอดภัยในการทำงานของลูกจ้าง  
6. นายจ้างต้องติดตั้งป้าย ดังนี้
1) ติดป้ายเตือนอันตราย สัญญาณแสงสีส้ม ณ ทางเข้าออกของยานพาหนะทุกแห่ง และจัดให้มีผู้ให้สัญญาณในขณะที่มียานพาหนะเข้าออกเขตก่อสร้าง
2) ติดป้ายแสดงหมายเลขโทรศัพท์ของหน่วยงานที่เกี่ยวข้อง เพื่อขอความช่วยเหลือในยามฉุกเฉิน
3) ติดหรือตั้งป้ายสัญลักษณ์เตือนอันตรายและเครื่องหมายป้ายบังคับเกี่ยวกับความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงานที่เหมาะสมกับลักษณะงาน 
4) กรณีมีทางร่วมหรือทางแยกในเขตก่อสร้าง ต้องติดตั้งป้ายสัญลักษณ์เตือนหรือบังคับ และสัญญาณแสงสีส้ม 
เพื่อแสดงว่าข้างหน้าเป็นทางร่วมหรือทางแยก และต้องติดตั้งกระจกนูนขนาดเส้นผ่านศูนย์กลางไม่น้อยกว่า 
50 เซนติเมตร บริเวณทางขนส่งที่เลี้ยวโค้งหรือหัก', 'met', NULL, NULL, NULL, NULL),
    (2, '7. กำหนดบริเวณเขตก่อสร้าง โดยทำรั้วสูงไม่น้อยกว่า 2 เมตร ที่มั่นคงแข็งแรงไว้ตลอดแนวเขตก่อสร้าง และมีป้าย 
“เขตก่อสร้าง” และห้ามให้บุคคลซึ่งไม่เกี่ยวข้องเข้าไปในเขตก่อสร้าง
8. กำหนดเขตอันตรายในเขตก่อสร้าง โดยจัดทำรั้วหรือกั้นเขตด้วยวัสดุที่เหมาะสมกับอันตรายนั้น และมีป้าย “เขตอันตราย” และในเวลากลางคืนต้องจัดให้มีสัญญาณไฟสีส้มตลอดเวลา และห้ามให้บุคคลซึ่งไม่เกี่ยวข้องเข้าไปในเขตอันตราย
10. นายจ้างต้องจัดและดูแลให้ลูกจ้างใช้อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลตลอดเวลาที่ทำงานก่อสร้าง
งานเจาะและงานขุด
งานก่อสร้างที่มีเสาเข็มและกำแพงพืด
ลิฟต์ชั่วคราวที่ใช้ในงานก่อสร้าง
เชือก ลวดสลิง และรอก
ทางเดินชั่วคราวยกระดับสูง
งานอุโมงค์
งานก่อสร้างในน้ำ
งานรื้อถอนหรือทำลายสิ่งก่อสร้าง', 'met', NULL, NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LE' and code='LE-003') L,
  (values
    (0, '“ทำงานในที่สูง” หมายความว่า การทำงานในพื้นที่ปฏิบัติงานที่สูงจากพื้นดิน หรือจากพื้นอาคารตั้งแต่ 2 เมตรขึ้นไป 
ซึ่งลูกจ้างอาจพลัดตกลงมาได้
1. จัดให้มีข้อบังคับและขั้นตอนการปฏิบัติงานเพื่อความปลอดภัยในที่สูง ที่ลาดชัน ที่อาจมีการกระเด็น ตกหล่นหรือพังทลายของวัสดุสิ่งของ และที่อาจทำให้ลูกจ้างพลัดตกลงไปในภาชนะเก็บหรือรองรับวัสดุ  รวมทั้งต้องอบรมหรือชี้แจงให้ลูกจ้างทราบก่อนเริ่มปฏิบัติงาน  และเก็บสำเนาเอกสารดังกล่าวไว้ให้พนักงานตรวจความปลอดภัยตรวจสอบได้  
2. ให้ปฏิบัติตามรายละเอียดคุณลักษณะ และคู่มือการใช้งานที่ผู้ผลิตกำหนดไว้   หากไม่มี ต้องดำเนินการให้วิศวกรเป็นผู้จัดทำรายละเอียดขึ้นเป็นหนังสือ และต้องมีสำเนาเอกสารไว้ให้พนักงานตรวจความปลอดภัยตรวจสอบได้
3. จัดให้มีอุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลที่มีมาตรฐานเหมาะสมกับการทำงาน และลักษณะของอันตรายที่อาจเกิดขึ้นได้ตลอดเวลาที่ลูกจ้างทำงาน  และจัดให้มีการตรวจสอบสภาพก่อนการใช้งานทุกครั้ง และต้องมีสำเนาเอกสารดังกล่าวไว้ให้พนักงานตรวจความปลอดภัยตรวจสอบได้', 'met', 'Safety', NULL, NULL, NULL),
    (1, '4. ราวกั้นหรือรั้วกันตกต้องมีความสูงไม่น้อยกว่า 90 เซนติเมตร แต่ไม่เกิน 1.10 เมตร   ในกรณีที่ใช้แผงทึบแทนราวกั้นหรือรั้วกันตก แผงทึบต้องมีความสูงไม่น้อยกว่า 90 เซนติเมตร
5. สำเนาเอกสารสามารถอยู่ในรูปแบบอิเล็กทรอนิกส์ได้
6. การทำงานในที่สูง  นายจ้างต้องจัดให้มีนั่งร้านหรือวิธีการอื่นที่เหมาะสมกับสภาพของการทำงานในที่สูง
7. การทำงานในที่สูงตั้งแต่ 4 เมตรขึ้นไป นายจ้างต้องจัดทำราวกั้นหรือรั้วกันตก ตาข่ายนิรภัย หรืออุปกรณ์ป้องกันอื่น
ที่เหมาะสมกับสภาพของการทำงาน ทั้งนี้ ต้องจัดให้มีการใช้เข็มขัดนิรภัยและเชือกนิรภัยหรือสายช่วยชีวิตตลอดระยะเวลาการทำงาน
8. กรณีที่มีปล่องหรือช่องเปิดต่าง ๆ ซึ่งอาจทำให้ลูกจ้างพลัดตกลงไปได้ ต้องจัดทำฝาปิดที่แข็งแรง ราวกั้น รั้วกันตก หรือแผงทึบ พร้อมทั้งติดป้ายเตือนอันตรายให้ชัดเจน
9. นายจ้างต้องไม่ให้ลูกจ้างทำงานในที่สูงนอกอาคารหรือพื้นที่เปิดโล่ง ในขณะที่มีพายุลมแรง ฝนตกหรือฟ้าคะนอง
10. การใช้บันไดไต่ชนิดเคลื่อนย้ายได้, บันไดไต่ชนิดติดตรึงกับที่ที่มีความสูงเกิน 6 เมตรขึ้นไป, ขาหยั่งหรือม้ายืน นายจ้างต้องดูแลบันได ขาหยั่งหรือม้ายืนให้ปลอดภัยต่อการใช้งาน และเป็นไปตามที่กฎกระทรวงฉบับนี้กำหนด', 'met', 'Safety', NULL, NULL, NULL),
    (2, '11. การทำงานบนที่ลาดชัน  และมีความสูงของพื้นระดับที่เอียงตั้งแต่ 2 เมตรขึ้นไป  นายจ้างต้องจัดให้มีนั่งร้าน เข็มขัดนิรภัยและเชือกนิรภัย หรือสายช่วยชีวิต หรือมาตรการป้องกันการพลัดตก ทั้งนี้ ขึ้นอยู่กับความเหมาะสมและสภาพของการทำงาน   
12. การลำเลียงวัสดุสิ่งของบนที่สูง ต้องจัดให้มีราง ปล่อง เครื่องจักร หรืออุปกรณ์ที่เหมาะสมในการลำเลียง 
13. กำหนดเขตอันตรายในบริเวณพื้นที่ที่อาจมีการกระเด็น ตกหล่น หรือพังทลายของวัสดุสิ่งของ และติดป้ายเตือนอันตรายบริเวณพื้นที่ดังกล่าว พร้อมทั้งจัดให้มีมาตรการควบคุมดูแลเพื่อให้เกิดความปลอดภัย
14. กรณีที่มีวัสดุสิ่งของอยู่บนที่สูงที่อาจกระเด็น ตกหล่น หรือพังทลายลงมาได้ ให้นายจ้างดำเนินการ ดังนี้
     O จัดทำขอบกันของตกหรือมาตรการป้องกันที่เหมาะสม
     O จัดให้มีมาตรการควบคุมดูแลเพื่อให้เกิดความปลอดภัยแก่ลูกจ้างตลอดระยะเวลาการทำงาน
     O จัดเรียงวัสดุสิ่งของให้เกิดความมั่นคงปลอดภัย ทำผนังกั้น   ในกรณีที่มีการเคลื่อนย้ายวัสดุสิ่งของ ให้จัดให้มีมาตรการป้องกันอันตรายจากการตกหล่น หรือพังทลายของวัสดุสิ่งของที่จะทำการเคลื่อนย้ายนั้นด้วย', 'met', 'Safety', NULL, NULL, NULL),
    (3, '15. กรณีที่มีการทำงานในท่อ ช่อง โพรง บ่อ ที่อาจเกิดการพังทลายได้ ให้จัดทำผนังกั้น ค้ำยัน ที่สามารถป้องกันอันตรายที่อาจเกิดขึ้น
16. กรณีที่ลูกจ้างทำงานที่อาจได้รับอันตรายจากการพลัดตกลงไปในภาชนะเก็บหรือรองรับวัสดุ นายจ้างต้องจัดให้มี
สิ่งปิดกั้น จัดทำราวกั้นหรือรั้วกันตกที่มั่นคงแข็งแรงล้อมรอบภาชนะนั้น   หากไม่อาจดำเนินการได้ นายจ้างต้องจัดให้ลูกจ้างสวมใส่เข็มขัดนิรภัยและเชือกนิรภัยหรือสายช่วยชีวิตตลอดระยะเวลาการทำงาน
17. กรณีที่ลูกจ้างทำงานบนภาชนะเก็บหรือรองรับวัสดุที่มีความสูงตั้งแต่ 4 เมตรขึ้นไป นายจ้างต้องจัดให้มีสิ่งปิดกั้น จัดทำราวกั้นหรือรั้วกันตกที่มั่นคงแข็งแรงเหมาะสมกับสภาพของการทำงาน และต้องให้ลูกจ้างสวมใส่เข็มขัดนิรภัยและเชือกนิรภัยหรือสายช่วยชีวิตตลอดระยะเวลาการทำงานด้วย', 'met', NULL, NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LE' and code='LE-004') L,
  (values
    (0, 'หมวด ๑ บททั่วไป
ข้อ ๓ ให้นายจ้างจัดทำป้ายแจ้งข้อความว่า “ที่อับอากาศ อันตราย ห้ามเข้า” ให้มีขนาดมองเห็นได้ชัดเจน ติดตั้งไว้โดยเปิดเผยบริเวณทางเข้าออกของที่อับอากาศทุกแห่ง
ข้อ ๔ ห้ามนายจ้างให้ลูกจ้างหรือบุคคลใดเข้าไปในที่อับอากาศ เว้นแต่นายจ้างได้ดำเนินการให้มีความปลอดภัยตามกฎกระทรวงนี้แล้ว และลูกจ้างหรือบุคคลนั้นได้รับอนุญาตจากผู้มีหน้าที่รับผิดชอบในการอนุญาตตามข้อ ๑๘ และเป็นผู้ผ่านการอบรมตามข้อ ๒๑
ข้อ ๕ ห้ามนายจ้างอนุญาตให้ลูกจ้างหรือบุคคลใดเข้าไปในที่อับอากาศหากนายจ้างรู้หรือควรรู้ว่าลูกจ้างหรือบุคคลนั้นเป็นโรคเกี่ยวกับทางเดินหายใจ โรคหัวใจ หรือโรคอื่นซึ่งแพทย์เห็นว่าการเข้าไปในที่อับอากาศอาจเป็นอันตรายต่อบุคคลดังกล่าว', 'met', 'Safety', NULL, NULL, NULL),
    (1, 'หมวด ๒ มาตรการความปลอดภัย
ข้อ ๖ ให้นายจ้างจัดให้มีการตรวจวัด บันทึกผลการตรวจวัด และประเมินสภาพอากาศในที่อับอากาศว่ามีบรรยากาศอันตรายหรือไม่ โดยให้ดำเนินการทั้งก่อนให้ลูกจ้างเข้าไปทำงานและในระหว่างที่ลูกจ้างทำงานในที่อับอากาศ', 'met', NULL, NULL, NULL, NULL),
    (2, 'ข้อ ๗ กรณีที่นายจ้างให้ลูกจ้างทำงานในที่อับอากาศให้นายจ้างแต่งตั้งลูกจ้างที่มีความรู้ความสามารถและได้รับการฝึกอบรมความปลอดภัยในการทำงานในที่อับอากาศตามข้อ ๒๑ ให้เป็นผู้ควบคุมงานคนหนึ่งหรือหลายคนตามความจำเป็น', 'met', NULL, NULL, NULL, NULL),
    (3, 'ข้อ ๘ ให้นายจ้างจัดให้ลูกจ้างซึ่งได้รับการฝึกอบรมความปลอดภัยในการทำงานในที่อับอากาศตามข้อ ๒๑ คนหนึ่งหรือหลายคนตามความจำเป็น เป็นผู้ช่วยเหลือ พร้อมด้วยอุปกรณ์ช่วยเหลือและช่วยชีวิตที่เหมาะสมกับลักษณะงาน คอยเฝ้าดูแลบริเวณทางเข้าออกที่อับอากาศโดยให้สามารถติดต่อสื่อสารกับลูกจ้างที่ทำงานในที่อับอากาศได้ตลอดเวลา เพื่อช่วยเหลือลูกจ้างออกจากที่อับอากาศ', 'met', NULL, NULL, NULL, NULL),
    (4, 'ข้อ ๙ ให้นายจ้างจัดให้มีอุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคล อุปกรณ์ช่วยเหลือและช่วยชีวิตที่เหมาะสมกับลักษณะงานตามมาตรฐานที่อธิบดีประกาศกำหนด และนายจ้างต้องควบคุมดูแลให้ลูกจ้างซึ่งทำงานในที่อับอากาศและผู้ช่วยเหลือสวมใส่หรือใช้อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลและอุปกรณ์ช่วยเหลือและช่วยชีวิตนั้น', 'met', NULL, NULL, NULL, NULL),
    (5, 'ข้อ ๑๐ ให้นายจ้างจัดให้มีสิ่งปิดกั้นมิให้บุคคลใดเข้าหรือตกลงไปในที่อับอากาศที่มีลักษณะเป็นช่อง โพรง หลุม ถังเปิด หรือที่มีลักษณะคล้ายกัน', 'met', NULL, NULL, NULL, NULL),
    (6, 'ข้อ ๑๑ ให้นายจ้างปิด กั้น หรือกระทำโดยวิธีการอื่นใดที่มีผลในการป้องกันมิให้พลังงานสาร หรือสิ่งที่เป็นอันตรายเข้าสู่บริเวณที่อับอากาศในระหว่างที่ลูกจ้างกำลังทำงาน', 'met', NULL, NULL, NULL, NULL),
    (7, 'ข้อ ๑๒ ให้นายจ้างจัดบริเวณทางเดินหรือทางเข้าออกที่อับอากาศให้มีความสะดวกและปลอดภัย', 'met', NULL, NULL, NULL, NULL),
    (8, 'ข้อ ๑๓ ให้นายจ้างประกาศห้ามลูกจ้างสูบบุหรี่ หรือพกพาอุปกรณ์สำหรับจุดไฟหรือ ติดไฟ ที่ไม่เกี่ยวข้องกับการทำงานเข้าไปในที่อับอากาศปิดไว้บริเวณทางเข้าออกที่อับอากาศ', 'met', NULL, NULL, NULL, NULL),
    (9, 'ข้อ ๑๔ ให้นายจ้างจัดให้มีอุปกรณ์ไฟฟ้าที่เหมาะสมในการใช้งานในที่อับอากาศ และตรวจสอบให้อุปกรณ์ไฟฟ้านั้นมีสภาพสมบูรณ์และปลอดภัยพร้อมใช้งาน ถ้าที่อับอากาศนั้นมีบรรยากาศที่ไวไฟหรือระเบิดได้ ต้องเป็นอุปกรณ์ไฟฟ้าชนิดที่สามารถป้องกันมิให้ติดไฟหรือระเบิดได้', 'met', NULL, NULL, NULL, NULL),
    (10, 'ข้อ ๑๕ ให้นายจ้างจัดให้มีเครื่องดับเพลิงที่มีประสิทธิภาพและจำนวนเพียงพอที่จะใช้ได้ทันทีเมื่อมีการทำงานที่อาจก่อให้เกิดการลุกไหม้', 'met', NULL, NULL, NULL, NULL),
    (11, 'ข้อ ๑๖ ห้ามนายจ้างอนุญาตให้ลูกจ้างทำงานที่ก่อให้เกิดความร้อน หรือประกายไฟในที่อับอากาศ เช่น การเชื่อม การเผาไหม้ การย้ำหมุด การเจาะ หรือการขัด เว้นแต่จะได้จัดให้มีมาตรการความปลอดภัยที่เหมาะสมตามหมวดนี้', 'met', NULL, NULL, NULL, NULL),
    (12, 'ข้อ ๑๗ ห้ามนายจ้างอนุญาตให้ลูกจ้างทำงานที่ใช้สารระเหยง่าย สารพิษ สารไวไฟในที่อับอากาศ เว้นแต่จะได้จัดให้มีมาตรการความปลอดภัยที่เหมาะสมตามหมวดนี้', 'met', NULL, NULL, NULL, NULL),
    (13, 'หมวด ๓ การอนุญาต', 'met', NULL, NULL, NULL, NULL),
    (14, 'ข้อ ๑๘ ให้นายจ้างเป็นผู้มีหน้าที่รับผิดชอบในการอนุญาตให้ลูกจ้างทำงานในที่อับอากาศ ในการนี้นายจ้างจะมอบหมายเป็นหนังสือให้ลูกจ้างซึ่งได้รับการฝึกอบรมความปลอดภัยในการทำงานในที่อับอากาศตามข้อ ๒๑ คนหนึ่งหรือหลายคนตามความจำเป็น เป็นผู้มีหน้าที่รับผิดชอบในการอนุญาตแทนก็ได้', 'met', NULL, NULL, NULL, NULL),
    (15, 'ให้นายจ้างเก็บหนังสือมอบหมายไว้ ณ สถานประกอบกิจการพร้อมที่จะให้พนักงานตรวจแรงงานตรวจสอบได้', 'met', NULL, NULL, NULL, NULL),
    (16, 'ข้อ ๑๙ ให้นายจ้างจัดให้มีหนังสืออนุญาตให้ลูกจ้างทำงานในที่อับอากาศทุกครั้ง', 'met', NULL, NULL, NULL, NULL),
    (17, 'ข้อ ๒๐ ให้นายจ้างเก็บหนังสืออนุญาตให้ลูกจ้างทำงานในที่อับอากาศตามข้อ ๑๙ ไว้ ณ สถานที่ประกอบกิจการพร้อมที่จะให้พนักงานตรวจแรงงานตรวจสอบได้ และให้ปิดสำเนาหนังสือดังกล่าวไว้ที่บริเวณทางเข้าที่อับอากาศให้เห็นชัดเจนตลอดเวลาที่ลูกจ้างทำงาน', 'met', NULL, NULL, NULL, NULL),
    (18, 'หมวด ๔ การฝึกอบรม', 'met', NULL, NULL, NULL, NULL),
    (19, 'ข้อ ๒๑ ให้นายจ้างจัดให้มีการฝึกอบรมความปลอดภัยในการทำงานในที่อับอากาศตามหลักเกณฑ์ วิธีการ และหลักสูตรที่อธิบดีประกาศกำหนดแก่ลูกจ้างทุกคนที่ทำงานในที่อับอากาศ รวมทั้งผู้ที่เกี่ยวข้องให้มีความรู้ความเข้าใจทักษะที่จำเป็นในการทำงานอย่างปลอดภัย ตามหน้าที่ที่ได้รับมอบหมาย พร้อมทั้งวิธีการและขั้นตอนในการปฏิบัติงาน', 'met', NULL, NULL, NULL, NULL),
    (20, 'ข้อ ๒๒ ให้นายจ้างเก็บหลักฐานการฝึกอบรมความปลอดภัยในการทำงานในที่อับอากาศตามข้อ ๒๑ ไว้พร้อมที่จะให้พนักงานตรวจแรงงานตรวจสอบได้', 'met', NULL, NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LE' and code='LE-005') L,
  (values
    (0, 'เพื่อปฏิบัติการให้เป็นไปตามประกาศคณะกรรมการรัฐวิสาหกิจสัมพันธ์ เรื่อง ความปลอดภัยในการทำงานในสถานที่อับอากาศ ลงวันที่ 12 กันยายน พ.ศ. 2534 ข้อ 3 (4) ซึ่งกำหนดให้รัฐวิสาหกิจจัดให้มีใบอนุญาตให้พนักงานเข้าทำงานในสถานที่อับอากาศทุกครั้งตามแบบที่อธิบดีกรมแรงงานกำหนด ประกอบด้วยพระราชบัญญัติโอนอำนาจหน้าที่และกิจการบริหารบางส่วนของกระทรวงมหาดไทยไปเป็นของกระทรวงแรงงานและสวัสดิการสังคม พ.ศ. 2536 มาตรา 10 อธิบดีกรมสวัสดิการและคุ้มครองแรงงานจึงออกประกาศไว้ดังต่อไปนี้
ใบอนุญาตให้พนักงานเข้าทำงานในสถานที่อับอากาศให้เป็นไปตามแบบ อร.1 ท้ายประกาศนี้', 'met', 'Safety', NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LE' and code='LE-006') L,
  (values
    (0, 'ข้อ ๒ ประกาศนี้ให้ใช้บังคับตั้งแต่วันประกาศเป็นต้นไป
ข้อ ๓ อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลสำหรับการทำงานในที่อับอากาศต้องเป็นไป
ตามมาตรฐานผลิตภัณฑ์อุตสาหกรรม หรือมาตรฐานอื่นที่กรมสวัสดิการและคุ้มครองแรงงานยอมรับ
ข้อ ๔ อุปกรณ์ช่วยเหลือและช่วยชีวิตสำหรับการทำงานในที่อับอากาศต้องเป็นไปตามมาตรฐานผลิตภัณฑ์อุตสาหกรรม หรือมาตรฐานอื่นที่กรมสวัสดิการและคุ้มครองแรงงานยอมรับ', 'met', 'Safety', NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LE' and code='LE-007') L,
  (values
    (0, '1. จัดทำป้ายแจ้งข้อความว่า “ที่อับอากาศ อันตราย ห้ามเข้า” ให้มีขนาด
มองเห็นได้ชัดเจน ติดตั้งไว้โดยเปิดเผยบริเวณทางเข้าออกของที่อับอากาศทุกแห่ง
2. ห้ามให้ลูกจ้างหรือบุคคลใดเข้าไปในที่อับอากาศ  ยกเว้นว่าจะได้รับอนุญาตจากผู้มีหน้าที่ในการอนุญาตก่อน
3. ห้ามอนุญาตให้ลูกจ้างหรือบุคคลใดเข้าไปในที่อับอากาศ  หากรู้หรือควรรู้ว่าลูกจ้างหรือบุคคลนั้นเป็นโรคเกี่ยวกับทางเดินหายใจ  โรคหัวใจ หรือโรคอื่นซึ่งแพทย์เห็นว่าการเข้าไปในที่อับอากาศอาจเป็นอันตราย   
4.  ให้ประเมินสภาพอันตรายในที่อับอากาศ  หากพบว่ามีสภาพอันตรายต้องจัดให้มีมาตรการควบคุมสภาพอันตรายเพื่อให้เกิดความปลอดภัยต่อลูกจ้าง  
5. ต้องจัดให้มีการตรวจวัด บันทึกผลการตรวจวัด และประเมินสภาพอากาศในที่อับอากาศก่อนเข้าไปทำงานและในระหว่างทำงานในที่อับอากาศ  หากพบว่ามีสภาวะที่เป็นบรรยากาศอันตรายให้ดำเนินการตามที่กำหนด และต้องจัดเก็บผลดังกล่าวไว้อย่างน้อย 1 ปี
6.  หากดำเนินการตามข้อ 6 แล้ว แต่ยังมีบรรยากาศอันตรายอยู่และจำเป็นต้องเข้าไปในที่อับอากาศ  ต้องให้บุคคลนั้นๆ สวมใส่หรือใช้อุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลที่เหมาะสม และใช้อุปกรณ์การทำงานที่ปลอดภัย
7.  ต้องจัดให้มีผู้ควบคุมงานที่ผ่านการอบรมความปลอดภัยในการทำงานในที่อับอากาศ ประจำในพื้นที่ทำงานตลอดเวลาเพื่อทำหน้าที่ที่กำหนดในกฎกระทรวงนี้', 'met', 'Safety', NULL, NULL, NULL),
    (1, '8. ให้นายจ้างดำเนินการต่างๆ ได้แก่ 
o จัดให้มีอุปกรณ์ PPE อุปกรณ์ช่วยเหลือ และช่วยชีวิตที่เหมาะสมกับงาน
o จัดให้ลูกจ้างที่ผ่านการอบรมความปลอดภัยในที่อับอากาศเป็นผู้ช่วยเหลือ และทำหน้าที่เป็นผู้ช่วยเหลือพร้อมให้จัดให้มีอุปกรณ์ช่วยเหลือและช่วยชีวิต
9. จัดให้มีสิ่งที่ปิดกั้นเพื่อป้องกันไม่ให้บุคคลใดเข้าไปหรือตกลงไปในที่อับอากาศ
10. หากที่อับอากาศที่ให้ลูกจ้างทำงานมีผนังต่อหรืออาจมีพลังงาน สาร หรือสิ่งที่เป็นอันตรายซึ่งจะรั่วไหลเข้าสู่บริเวณที่อับอากาศที่ทำงานอยู่  ให้นายจ้างปิดกั้นหรือกระทำการใดที่จะป้องกันไม่ให้พลังงาน สาร หรือสิ่งที่เป็นอันตรายเข้าสู่บริเวณที่อับอากาศในระหว่างที่ลูกจ้างกำลังทำงาน
11. จัดบริเวณทางเดินหรือทางเข้าออกที่อับอากาศให้มีความสะดวกและปลอดภัย
12. ประกาศห้ามลูกจ้างหรือบุคคลใดสูบบุหรี่  หรือพกอุปกรณ์สำหรับจุดไฟหรือติดไฟที่ไม่เกี่ยวข้องกับงานเข้าไปในที่อับอากาศ   โดยให้ปิดป้ายประกาศห้ามไว้บริเวณทางเข้า-ออกที่อับอากาศ
13. จัดให้มีอุปกรณ์ไฟฟ้าที่เหมาะสมในการใช้งานในที่อับอากาศ และตรวจสอบให้มีสภาพสมบูรณ์พร้อมใช้งาน  กรณีที่อับอากาศมีบรรยากาศอันตรายที่ไวไฟหรือระเบิดได้  ต้องเป็นอุปกรณ์ไฟฟ้าชนิดที่ไม่เป็นต้นเหตุที่ก่อให้เกิดการติดไฟหรือระเบิดได้
14. จัดให้มีอุปกรณ์ดับเพลิงที่เหมาะสมและมีประสิทธิภาพในจำนวนที่เพียงพอ', 'met', NULL, NULL, NULL, NULL),
    (2, '15. ห้ามนายจ้างอนุญาตให้ลูกจ้างทำงานที่ก่อให้เกิดความร้อนหรือประกายไฟ   และงานที่ใช้สารระเหยง่าย สารพิษ หรือสารไวไฟในที่อับอากาศ เว้นแต่ได้จัดให้มีมาตรการความปลอดภัยตามกฎกระทรวงนี้แล้ว   และหากลูกจ้างเห็นว่าการทำงานไม่มีมาตรการรองรับเพื่อให้เกิดความปลอดภัย  ลูกจ้างสามารถปฏิเสธไม่ทำงานดังกล่าวได้ 
16. นายจ้างเป็นผู้มีหน้าที่รับผิดชอบในการอนุญาตให้ลูกจ้างทำงานในที่อับอากาศ  หรือจะมอบหมายเป็นหนังสือ
ให้ลูกจ้างที่ได้รับการอบรมฯ เป็นผู้รับผิดชอบในการอนุญาตแทนก็ได้ และต้องเก็บหนังสือมอบหมายไว้ ณ สถานประกอบกิจการหรือสถานที่ทำงาน
17. ให้นายจ้างจัดให้มีหนังสืออนุญาตให้ลูกจ้างทำงานในที่อับอากาศทุกครั้ง โดยอย่างน้อยต้องมีรายละเอียด 12 ข้อตามที่กำหนด 
18.  ต้องเก็บหนังสืออนุญาตดังกล่าวไว้ ณ สถานประกอบกิจการหรือสถานที่ทำงาน รวมทั้งปิดหรือแสดงหนังสือสำเนาไว้ที่บริเวณทางเข้าที่อับอากาศให้เห็นชัดเจนตลอดเวลาที่ลูกจ้างทำงาน
19.  จัดให้มีการฝึกอบรมความปลอดภัยในการทำงานในที่อับอากาศแก่ลูกจ้างทุกคนที่ทำงานในที่อับอากาศ  รวมทั้งผู้ที่เกี่ยวข้อง   
20.  เก็บหลักฐานการฝึกอบรมความปลอดภัยในการทำงานในที่อับอากาศไว้ ณ สถานประกอบกิจการหรือสถานที่ทำงาน  เพื่อให้พนักงานตรวจความปลอดภัยตรวจสอบได้', 'met', NULL, NULL, NULL, NULL),
    (3, '21. ให้ประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง หลักเกณฑ์ วิธีการ และหลักสูตรการฝึกอบรมความปลอดภัยในการทำงานในที่อับอากาศ พ.ศ. 2549 และที่แก้ไขเพิ่มเติม ใช้ได้ต่อไปเท่าที่ไม่ขัดหรือแย้งกับกฎกระทรวงนี้ จนกว่าจะมีประกาศตามกฎกระทรวงนี้ใช้บังคับ และให้หน่วยงานฝึกอบรมความปลอดภัยในการทำงานในที่อับอากาศที่ได้ขึ้นทะเบียนก่อนวันที่ 15 กุมภาพันธ์ 2562 ดำเนินการได้ต่อไป และให้ถือเป็นนิติบุคคลที่ได้รับใบอนุญาต  จนกว่าจะมีนิติบุคคลที่ได้รับใบอนุญาตตามมาตรา 11 ดำเนินการ
22.กรณีที่นายจ้างจัดให้มีการฝึกอบรมความปลอดภัยในการทำงานในที่อับอากาศตามกฎกระทรวงกำหนดมาตรฐานในการบริหารและการจัดการด้านความปลอดภัย อาชีวอนามัยและสภาพแวดล้อมในการทำงานในที่อับอากาศ พ.ศ. 2547 
ให้ถือว่าได้จัดให้มีการฝึกอบรมแก่ลูกจ้างและลูกจ้างได้รับการฝึกอบรมตามข้อ 20 แล้ว', 'met', NULL, NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LE' and code='LE-008') L,
  (values
    (0, 'มาตรฐานการตรวจสอบและรับรองแห่งชาตินี้ ระบุแนวทางในการทำงานในที่อับอากาศอย่างปลอดภัย ซึ่งประกอบด้วย
ข้อปฏิบัติทั่วไป ขั้นตอนการเข้าปฏิบัติงานในที่อับอากาศ ระบบการขออนุญาต เอกสารการขออนุญาต การฝึกอบรม และหน้าที่ความรับผิดชอบ มาตรฐานการตรวจสอบและรับรองแห่งชาตินี้เป็นข้อกำหนดทั่วไป ซึ่งใช้ได้กับสถานประกอบ
กิจการทุกขนาดและทุกประเภท สามารถประยุกต์ใช้ให้เหมาะสมกับสภาพการดำเนินงาน และความซับซ้อนของงาน', 'met', 'Safety', NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LE' and code='LE-009') L,
  (values
    (0, '1. ให้นายจ้างจัดฝึกอบรมความปลอดภัยในการทำงานในที่อับอากาศให้กับลูกจ้างที่มีหน้าที่รับผิดชอบในการอนุญาต ผู้ควบคุมงาน ผู้ช่วยเหลือ และผู้ปฏิบัติงานในที่อับอากาศ  และจัดฝึกอบรมเพื่อทบทวนความปลอดภัยในการทำงานในที่อับอากาศ
    กรณีลูกจ้างเปลี่ยนงาน หรือเปลี่ยนสถานที่ทำงานที่อาจได้รับอันตรายจากงาน ให้นายจ้างจัดฝึกอบรมภาคปฏิบัติให้กับลูกจ้างผู้มีหน้าที่รับผิดชอบในการอนุญาต ผู้ควบคุมงาน ผู้ช่วยเหลือและผู้ปฏิบัติงานในที่อับอากาศ ก่อนเริ่มการทำงาน
2. ในการฝึกอบรมความปลอดภัยในการทำงานในที่อับอากาศ  นายจ้างหรือนิติบุคคลที่ได้รับอนุญาตต้องดำเนินการดังนี้ 
1) แจ้งกำหนดการ หลักสูตรการฝึกอบรม รายชื่อและคุณสมบัติวิทยากร ต่ออธิบดีไม่น้อยกว่า 7 วันทำการก่อนการจัดฝึกอบรม 
3. กรณีนายจ้างเป็นผู้จัดฝึกอบรมฯ ให้จัดฝึกอบรมภาคปฏิบัติในสถานที่จริงหรือมีลักษณะเหมือนสถานที่จริง 
กรณีนิติบุคคลเป็นผู้จัดฝึกอบรมฯ ให้จัดฝึกอบรมภาคปฏิบัติในสถานที่ตั้งที่ได้รับอนุญาต
4. ผู้เข้ารับการฝึกอบรมภาคปฏิบัติต้องมีอายุไม่ต่ำกว่า 18 ปี และมีใบรับรองแพทย์ว่าเป็นผู้มีสุขภาพสมบูรณ์ ร่างกายแข็งแรง ไม่เป็นโรคเกี่ยวกับทางเดินหายใจ โรคหัวใจ หรือโรคอื่นซึ่งแพทย์เห็นว่าการเข้าไปในที่อับอากาศอาจเป็นอันตรายต่อผู้เข้ารับการฝึกอบรม', 'met', 'Safety', NULL, NULL, NULL),
    (1, '7. จัดฝึกอบรมทบทวนความปลอดภัยในการทำงานในที่อับอากาศทุก 5 ปี โดยให้ฝึกอบรมให้แล้วเสร็จภายใน 30 วันก่อนครบกำหนด 5 ปี
8. ผู้เข้ารับการฝึกอบรมความปลอดภัยในการทำงานในที่อับอากาศ ต้องเป็นผู้ที่ผ่านการฝึกการอบรมดับเพลิงขั้นต้น 
10. ให้นายจ้างจัดทำทะเบียนรายชื่อผู้ที่ผ่านการฝึกอบรม วัน เวลาที่ฝึกอบรมพร้อมรายชื่อวิทยากรเก็บไว้พร้อมที่จะให้พนักงานตรวจความปลอดภัยตรวจสอบได้ 
11. ให้นายจ้างจัดทำรายงานผลการฝึกอบรมความปลอดภัยในการทำงานในที่อับอากาศตามแบบท้ายประกาศนี้ ภายใน 30 วันนับแต่วันที่อบรมเสร็จสิ้น 
12. ผู้ที่เคยผ่านการฝึกอบรมหลักสูตรอนุญาต ผู้ควบคุมงาน ผู้ช่วยเหลือ และผู้ปฏิบัติงานในที่อับอากาศมาแล้ว ตามประกาศกรมฯ เดิม  ก่อนวันที่ประกาศนี้มีผลบังคับใช้ ให้ถือว่าผ่านการอบรมตามที่ประกาศนี้กำหนด    
      โดยผู้ผ่านการอบรมจะต้องเข้ารับการฝึกอบรมทบทวน โดยต้องเข้ารับการฝึกอบรมทบทวนให้แล้วเสร็จภายใน 30 วันก่อนครบกำหนด 5 ปีนับแต่วันที่ผ่านการฝึกอบรม   เว้นแต่กรณีเป็นผู้ที่ผ่านการฝึกอบรมมาแล้วตั้งแต่ 5 ปีขึ้นไป ต้องเข้ารับการฝึกอบรมทบทวนให้แล้วเสร็จภายใน 90 วันนับแต่วันประกาศนี้มีผลบังคับใช้', 'met', 'Safety', NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LE' and code='LE-10') L,
  (values
    (0, 'หมวด ๑ เครื่องจักร
2. ในบริเวณที่มีการติดตั้ง การซ่อมแซม หรือการตรวจสอบเครื่องจักรหรือเครื่องป้องกันอันตรายจากเครื่องจักร ต้องติดป้ายแสดงการดำเนินการดังกล่าว รวมทั้งจัดให้มีระบบ วิธีการ หรืออุปกรณ์ป้องกันมิให้เครื่องจักรนั้นทำงาน 
3. ในการประกอบ การติดตั้ง การทดสอบ การใช้ การซ่อมแซม การบำรุงรักษา การตรวจสอบ การรื้อถอน หรือการเคลื่อนย้ายเครื่องจักร รถยก ลิฟต์ เครื่องจักรสำหรับใช้ในการยกคนขึ้นทำงานบนที่สูง นายจ้างต้องปฏิบัติตามรายละเอียดคุณลักษณะและคู่มือการใช้งานที่ผู้ผลิตกำหนดไว้ ในกรณีที่มีการเคลื่อนย้ายเครื่องจักรที่มีน้ำหนักตั้งแต่ 1 ตันขึ้นไป ต้องจัดให้มีแผนป้องกันอันตรายจากการเคลื่อนย้าย 
4. เครื่องจักรดังต่อไปนี้ ต้องจัดให้มีการตรวจสอบประจำปี โดยต้องมีสำเนาเอกสารการตรวจสอบไว้ให้พนักงานตรวจความปลอดภัยตรวจสอบได้ 
5. นายจ้างต้องไม่ใช้หรือยอมให้ลูกจ้างใช้เครื่องจักรทำงานเกินพิกัดของเครื่องจักร 
7. นายจ้างต้องจัดให้มีการประเมินอันตรายของเครื่องจักรที่อาจก่อให้เกิดอันตรายจากการใช้งานถึงขั้นสูญเสียอวัยวะ ได้แก่ เครื่องจักรประเภทเครื่องบด เครื่องโม่ เครื่องตัดน้ำแข็ง หรือเครื่องจักรอื่นตามที่อธิบดีประกาศกำหนด
8. ในการทำงานเกี่ยวกับเครื่องปั๊มโลหะ เครื่องเชื่อมไฟฟ้า เครื่องเชื่อมก๊าซ หรือเครื่องจักรชนิดอื่น ลูกจ้างต้องผ่านการอบรมเกี่ยวกับขั้นตอนและวิธีการทำงานที่ปลอดภัยในการทำงานของเครื่องจักร เป็นต้น โดยวิทยากรซึ่งมีคุณสมบัติตามหลักสูตรที่อธิบดีประกาศกำหนด
9. ต้องดูแลให้พื้นบริเวณรอบเครื่องจักรมีความปลอดภัย', 'met', 'Safety', NULL, NULL, NULL),
    (1, '10. นายจ้างต้องจัดให้มีวิธีการดำเนินการเพื่อป้องกันอันตรายจากเครื่องจักร ดังต่อไปนี้
(1) เครื่องจักรที่ใช้พลังงานไฟฟ้าต้องมีระบบหรือวิธีการป้องกันกระแสไฟฟ้ารั่วเข้าตัวบุคคลหรือเครื่องจักรและต้องต่อสายดิน 
(2) เครื่องจักรที่ใช้พลังงานไฟฟ้า สายไฟฟ้าที่ต่อเข้าเครื่องจักรต้องเดินมาจากที่สูง 
(3) เครื่องจักรชนิดอัตโนมัติต้องมีสีเครื่องหมายปิด - เปิด ที่สวิตช์อัตโนมัติตามหลักสากลและมีเครื่องป้องกันมีสิ่งใดมากระทบสวิตช์อันเป็นเหตุให้เครื่องจักรทำงาน
(4) เครื่องจักรที่มีการถ่ายทอดพลังงานโดยใช้เพลา สายพาน รอก ต้องมีตะแกรงหรือที่ครอบปิดคลุมส่วนที่หมุนได้และส่วนส่งถ่ายกำลังให้มิดชิด 
11. ต้องบำรุงรักษาและดูแลเครื่องป้องกันอันตรายจากเครื่องจักรให้อยู่ในสภาพที่สามารถป้องกันอันตรายได้
12. ต้องจัดให้ทางเดินเข้าออกจากพื้นที่สำหรับปฏิบัติงานเกี่ยวกับเครื่องจักรมีความกว้างไม่น้อยกว่า 80 เซนติเมตร', 'met', NULL, NULL, NULL, NULL),
    (2, 'ส่วนที่ ๓ เครื่องเชื่อมไฟฟ้าและเครื่องเชื่อมก๊าซ
(๑) จัดให้มีเครื่องดับเพลิงแบบเคลื่อนย้ายได้ติดตั้งไว้ในบริเวณใกล้เคียงที่สามารถนำมาใช้ดับเพลิงได้ทันที
(๒) จัดให้มีอุปกรณ์คุ้มครองความปลอดภัยส่วนบุคคลให้ลูกจ้างสวมใส่
(๓) จัดบริเวณที่ปฏิบัติงานไม่ให้มีวัสดุที่ติดไฟง่ายวางอยู่
(๔) จัดให้มีฉากกั้นหรืออุปกรณ์ป้องกันอันตรายอื่น ๆ ที่เหมาะสมเพื่อป้องกันอันตรายจากประกายไฟและแสงจ้า
(๕) จัดสถานที่ปฏิบัติงานให้มีแสงสว่างและการระบายอากาศอย่างเหมาะสม
ข้อ ๒๘ นายจ้างต้องจัดให้มีมาตรการด้านความปลอดภัยและควบคุมดูแลให้ลูกจ้างปฏิบัติโดยเคร่งครัด เมื่อใช้เครื่องเชื่อมไฟฟ้าหรือเครื่องเชื่อมก๊าซกับภาชนะบรรจุสารไวไฟ หรือในบริเวณที่อาจก่อให้เกิดอันตรายจากการรระเบิด เพลิงไหม้หรือไฟลามจากก๊าซนำมัน หรือวัตถุไวไฟอื่น', 'met', NULL, NULL, NULL, NULL),
    (3, 'ส่วนที่ ๖ เครื่องจักรสำหรับใช้ในการยกคนขึ้นทำงานบนที่สูง
(1) จัดให้มีการป้องกันการตกจากที่สูงตามกฎกระทรวงฯ 
(2) จัดให้มีป้ายบอกพิกัดน้ำหนักและจำนวนคนที่สามารถยกได้อย่างปลอดภัย
(3) ตรวจสอบสภาพเครื่องจักรสำหรับใช้ในการยกคนขึ้นทำงานบนที่สูงและอุปกรณ์ที่เกี่ยวข้องก่อนการใช้งานทุกครั้ง และต้องมีสำเนาเอกสารการตรวจสอบไว้ให้พนักงานตรวจความปลอดภัยตรวจสอบได้
(4) จัดให้มีสัญญาณเสียงหรือแสงไฟเตือนภัยขณะทำงาน
(5) จัดให้มีอุปกรณ์ตัดระบบการทำงานเมื่อมีการใช้งานเกินพิกัดที่ผู้ผลิตกำหนด
48. นายจ้างต้องจัดให้มีการอบรมลูกจ้างเกี่ยวกับการปฏิบัติตามรายละเอียดคุณลักษณะและคู่มือการใช้งานเครื่องจักรสำหรับใช้ในการยกคนขึ้นทำงานบนที่สูงเพื่อความปลอดภัยในการทำงาน', 'met', NULL, NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-001') L,
  (values
    (0, 'ต้องเผยแพร่แบบของสัญญาและการกำหนดเงื่อนไขในการให้บริการของตนเป็นการทั่วไป', 'met', 'Legal', 'ทุกรอบการประเมินกฎหมาย', 'ปรากฎในเว็ปไซต์
การรายงานผล: -', NULL),
    (1, 'บริษัทจะเรียกเก็บเงินประกันหรือเงินอื่นที่มีลักษณะเก็บล่วงหน้าไม่ได้', 'met', 'Legal', 'ทุกรอบการประเมินกฎหมาย', 'ปรากฎในสัญญา
การรายงานผล: -', NULL),
    (2, 'บริษัทต้องเผยแพร่อัตราค่าธรรมเนียมและบริการเป็นการทั่วไป', 'met', 'Legal', 'ทุกรอบการประเมินกฎหมาย', 'ปรากฎในเว็ปไซต์
การรายงานผล: -', NULL),
    (3, 'บริษัทต้องมีใบอนุญาตโทรคมนาคมครบถ้วนกับกิจการที่ประกอบ', 'met', 'Legal', 'ทุกรอบการประเมินกฎหมาย', 'License
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-002') L,
  (values
    (0, 'สำหรับกิจการที่มีโครงข่ายที่ไม่มีการใช้คลื่นความถี่ในการให้บริการกำหนดให้มีวิศวกรควบคุมงาน 1 คน
“วิศวกรควบคุมงาน” หมายความว่า วิศวกรผู้รับผิดชอบงานด้านการกากับดูแลการดำเนินบริการโทรคมนาคม การออกแบบและควบคุมการติดตั้ง ควบคุมการตรวจสอบและสั่งการแก้ไขความเสียหายของโครงข่ายโทรคมนาคมทั้งหมด และหน้าที่ที่เกี่ยวข้องอื่นใดโดยปฏิบัติหน้าที่ประจาศูนย์ปฏิบัติการโครงข่าย (Network Operation Center)', 'met', 'Legal', 'ทุกรอบการประเมินกฎหมาย', '1) สำเนาประกอบวิชาชีพวิศวกรของคุณพารณี
2) แบบรายงาน กสทช 1 ครั้ง / ปี
การรายงานผล: สำนักงานคณะกรรมการกิจการกระจายเสียง กิจการโทรทัศน์ และกิจการโทรคมนาคมแห่งชาติ', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-003') L,
  (values
    (0, 'แต่งตั้ง Data Protection Officer', 'met', 'Legal', 'ทุกรอบการประเมินกฎหมาย', '1) ประกาศ DPO
2) Mail / จดหมายแจ้งรายชื่อ DPO ต่อ สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล
การรายงานผล: สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล', NULL),
    (1, 'จัดนโยบายข้อมูลส่วนบุคคล', 'met', 'Legal', 'ทุกรอบการประเมินกฎหมาย', '1) นโยบายการคุ้มครองข้อมูลส่วนบุคคล
2) ปรากฎในเว็ปไซต์
การรายงานผล: สื่อสารให้เจ้าของข้อมูลทราบผ่านทางเว็ปไซต์', NULL),
    (2, 'จัดแก้ไขเพิ่มเติมสัญญามาตรฐานให้สอดคล้องกฎหมายข้อมูลส่วนบุคคล', 'met', 'Legal', 'ทุกรอบการประเมินกฎหมาย', 'เอกสารสัญญา
การรายงานผล: -', NULL),
    (3, 'สร้างความตระหนักรู้ในกฎหมายดังกล่าวต่อคนในองค์กร', 'met', 'Legal', 'ทุกรอบการประเมินกฎหมาย', 'Memo: LG 63/00687 + สื่อนำเสนอการคุ้มครอง
ข้อมูลส่วนบุคคล
การรายงานผล: -', NULL),
    (4, 'จัดทำมาตรการรักษาความมั่นคงปลอดภัยของข้อมูลส่วนบุคคล', 'met', 'คณะทำงานและ DPO', 'ทุกรอบการประเมินกฎหมาย', 'ได้รับการรับรอง ISO27001 และขอการรับรองอย่างต่อเนื่อง
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-004') L,
  (values
    (0, 'เผยแพร่ข้อมูลให้คนในองค์กรณ์ตะหนักถึงการรับมือภัยคุกคามไซเบอร์
จัดทำแผนรับมือภัยคุกคามทางไซเบอร์
จัดทำนโยบายการรักษาความมั่นคงปลอดภัยไซเบอร์', 'met', 'Legal / ADS', 'ทุกรอบการประเมินกฎหมาย', 'อบรมหลักสูตร Information security / ที่เกี่ยวข้อง 1 ครั้ง/ปี
แผนรับมือภัยคุกคามทางไซเบอร์
นโยบายการรักษาความมั่นคงปลอดภัยไซเบอร์
การรายงานผล: -', 'สำนักกำกับดูแลกิจการโทรคมนาคม กสทช. แจ้งว่า JasTel ไม่อยู่ในรายชื่อหน่วยงาน CII ที่เข้าข่ายจะต้องปฏิบัติตามพระราชบัญญัตินี้ อย่างไรก็ตาม JasTel ยังคงมีหน้าที่ในการให้ข้อมูลเป็นหนังสือเกี่ยวกับภัยคุกคามไซเบอร์ เมื่อมีการร้องขอหรือคำสั่งจาก กกม. เป็นรายกรณีไป (update 23 มิ.ย. 66)')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-005') L,
  (values
    (0, 'บริษัทต้องเก็บรักษาข้อมูลจราจรคอมพิวเตอร์ไว้ไม่น้อยกว่า 90 วันนับแต่วันที่ข้อมูลนั้นเข้าสู่ระบบคอมพิวเตอร์', 'met', 'Planning Engineer', 'ทุกรอบการประเมินกฎหมาย', 'เก็บข้อมูลบนโปรแกรม
การรายงานผล: -', NULL),
    (1, 'บริษัทจะต้องเก็บรักษาข้อมูลของผู้ใช้บริการเท่าที่จําเป็นเพื่อให้สามารถระบุตัวผู้ใช้บริการนับตั้งแต่เริ่มใช้บริการและต้องเก็บรักษาไว้เป็นเวลาไม่น้อยกว่า 90 วันนับตั้งแต่การใช้บริการสิ้นสุดลง', 'met', 'Planning Engineer', 'ทุกรอบการประเมินกฎหมาย', 'เก็บข้อมูลบนโปรแกรม
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-006') L,
  (values
    (0, 'เมื่อได้รับคำสั่งให้ระงับการทำให้แพร่หลายของข้อมูล ต้องดำเนินการระงับในทันทีหรือต้องไม่เกินกว่าระยะเวลาที่ระบุในคำสั่ง เว้นแต่มีเหตุสมควรที่เจ้าพนักงานสั่งได้ ทั้งนี้ห้ามเกิน 15 วัน ในการระงับนี้ ให้ดำเนินการด้วยมาตรการทางเทคนิคใดๆ (Technical Measure) ที่ได้มาตรฐาน', 'met', 'Provisioning
(คุณพีรศักดิ์)', 'ทุกรอบการประเมินกฎหมาย', 'เว็ปไซต์รายงานการระงับข้อมูล
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-007') L,
  (values
    (0, 'จัดให้มีการขึ้นทะเบียน  Software ที่ใช้ในงาน O&M ของ  Co-Location โดยถูกควบคุมจุดใช้งานเสมือนเป็นเอกสารต้นฉบับตามระบบควบคุมเอกสารข้อมูล PD-01', 'met', 'ADS', 'ทุกรอบการประเมินกฎหมาย', 'ทะเบียน Software
การรายงานผล: -', NULL),
    (1, 'ให้แผนก IT ระบุ Licensed ของ Software ที่ติดตั้งลงในเครื่องคอมพิวเตอร์ที่ให้บริการแก่   Co-Location', 'met', 'ADS', 'ทุกรอบการประเมินกฎหมาย', 'ทะเบียน License
การรายงานผล: -', NULL),
    (2, 'กำหนดกฎระเบียบความปลอดภัยของข้อมูลสารสนเทศ (P-02)  ห้ามใช้ Software ที่ละเมิดลิขสิทธิ์', 'met', 'ADS', 'ทุกรอบการประเมินกฎหมาย', 'P-02 กฎระเบียบความปลอดภัยของข้อมูลสารสนเทศ
การรายงานผล: -', NULL),
    (3, 'กำหนดให้เครื่องคอมพิวเตอร์ที่ใช้ในงาน O&M ไม่สามารถติดตั้ง Software โดยไม่ได้รับอนุญาต', 'met', 'ADS', 'ทุกรอบการประเมินกฎหมาย', 'P-02 กฎระเบียบความปลอดภัยของข้อมูลสารสนเทศ
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-008') L,
  (values
    (0, 'กำหนดให้ผู้เกี่ยวข้องลงนามในบันทึกข้อตกลงรักษาความลับ (NDA)', 'met', 'Contract', 'ทุกรอบการประเมินกฎหมาย', 'NDA
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-009') L,
  (values
    (0, 'ผู้ให้บริการต้องจัดให้มีระบบการพิสูจน์และยืนยันตัวตนทางดิจิทัลสาหรับผู้ใช้บริการทุกคน
โดยใช้เทคโนโลยีที่สอดคล้องกับเงื่อนไขและมาตรฐานขั้นต่าในระดับความน่าเชื่อถือและสื่ออิเล็กทรอนิกส์ที่ใช้ยืนยันตัวตนตามที่สานักงานพัฒนาธุรกรรมทางอิเล็กทรอนิกส์กาหนดในหมวด ๓/๑ เรื่องระบบการพิสูจน์ยืนยันตัวตนทางดิจิทัลของพระราชบัญญัติว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. ๒๕๔๔', 'met', 'Planning Engineer', 'ทุกรอบการประเมินกฎหมาย', 'Log + ระบบ Saleforce
ที่แสดงรายชื่อลูกค้า
การรายงานผล: -', NULL),
    (1, 'ผู้ให้บริการต้องจัดให้มีมาตรการรักษาความมั่นคงปลอดภัยของข้อมูลในระบบการพิสูจน์และยืนยันตัวตนซึ่งควรครอบคลุมถึงมาตรการป้องกันด้านการบริหารจัดการ (administrative safeguard) มาตรการป้องกันด้านเทคนิค (technical safeguard)และมาตรการป้องกันทางกายภาพ (physical safeguard) ในเรื่องการเข้าถึงหรือควบคุมการใช้งานข้อมูลในระบบการพิสูจน์และยืนยันตัวตน (access control)', 'met', 'Planning Engineer, ADS', 'ทุกรอบการประเมินกฎหมาย', 'หลักฐานการยืนยันตัวตน
การรายงานผล: -', NULL),
    (2, 'การเก็บรักษาข้อมูลจราจรทางคอมพิวเตอร์ ผู้ให้บริการต้องใช้วิธีการที่มั่นคงปลอดภัย ตามรายละเอียดของกฎหมาย ข้อ 9', 'met', 'ADS', 'ทุกรอบการประเมินกฎหมาย', 'ได้รับการรับรอง ISO27001 และขอการรับรองอย่างต่อเนื่อง
การรายงานผล: -', NULL),
    (3, 'ผู้ให้บริการยังคงมีหน้าที่ตามกฎหมายที่ต้องเก็บรักษาทำสำเนาข้อมูลจราจรคอมพิวเตอร์ และครอบครองไว้ซึ่งข้อมูลสำเนาที่เกี่ยวข้องกับข้อมูลจราจรคอมพิวเตอร์ซึ่งสามารถระบุตัวตนได้ กรณีที่ผู้ให้บริการมีข้อตกลง สัญญา หรือมีการว่าจ้างบุคคลภายนอกที่ไม่ใช่ผู้ให้บริการให้ทาหน้าที่หรือเกี่ยวข้องกับการเก็บรักษาข้อมูลจราจรคอมพิวเตอร์แทนหน้าที่ของตนเอง', 'met', 'Planning Engineer', 'ทุกรอบการประเมินกฎหมาย', 'สำเนาข้อมูลจราจรคอมพิวเตอร์
การรายงานผล: -', NULL),
    (4, 'ผู้ให้บริการต้องตั้งนาฬิกาของอุปกรณ์บริการทุกชนิดให้ตรงกับเวลาอ้างอิงสากล (Stratum 0) ให้ตรงกับอุปกรณ์คอมพิวเตอร์ที่เกี่ยวข้อง (Clock Synchronization) และมาตรฐานการเก็บรักษาข้อมูลจราจรคอมพิวเตอร์ต้องเป็นไปตามมาตรฐานสากลตามที่กาหนดไว้ในภาคผนวกท้ายประกาศฉบับนี้', 'met', 'Planning Engineer, ADS', 'ทุกรอบการประเมินกฎหมาย', 'ผล Test ทดสอบนาฬิกาของอุปกรณ์บริการทุกชนิดให้ตรงกับเวลาอ้างอิงสากล (Stratum 0)
การรายงานผล: -', NULL),
    (5, 'ผู้ให้บริการต้องเก็บรักษาข้อมูลจราจรคอมพิวเตอร์ตามกำหนดระยะเวลา ดังต่อไปนี้
(๑) กรณีทั่วไป ให้ผู้ให้บริการเก็บรักษาข้อมูลจราจรคอมพิวเตอร์ไว้ไม่น้อยกว่าเก้าสิบวัน
นับแต่วันที่ข้อมูลนั้นเข้าสู่ระบบคอมพิวเตอร์
(2) กรณีพนักงานเจ้าหน้าที่มีคำสั่งให้ผู้ให้บริการผู้ใดเก็บรักษาข้อมูลจราจรคอมพิวเตอร์ของผู้ใช้บริการเป็นกรณีพิเศษเฉพาะรายต่อไปอีกคราวละไม่เกินหกเดือนต่อเนื่องกัน แต่ต้องไม่เกินสองปี
หมายเหตุ: ข้อมูลจราจรคอมพิวเตอร์ให้จัดเก็บตามภาคผนวก ข แนบท้ายประกาศกระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม เรื่อง หลักเกณฑ์การเก็บรักษาข้อมูลจราจรทางคอมพิวเตอร์ของผู้ให้บริการ พ.ศ. ๒๕๖๔', 'met', 'Planning Engineer', 'ทุกรอบการประเมินกฎหมาย', 'Log ข้อมูลจราจรคอมพิวเตอร์
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-010') L,
  (values
    (0, 'จัดส่งแผนรักษา ความมั่นคงปลอดภัยไซเบอร์และแผนการคุ้มครองข้อมูลส่วนบุคคลตามข้อ  ๑๔  ของเงื่อนไข ในการอนุญาตให้สำนักงาน กสทช. พร้อมการนำส่งรายงานผลประกอบการประจำปี  ในปี   พ.ศ.  ๒๕๖๕', 'met', 'Legal', 'ทุกรอบการประเมินกฎหมาย', 'Mail นำส่งข้อมูลให้ กสทช
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-011') L,
  (values
    (0, 'แผนรับมือภัยคุกคามไซเบอร์ต้องประกอบไปด้วยรายละเอียดในประกาศนี้', 'met', 'ADS', 'ทุกรอบการประเมินกฎหมาย', 'ISD_การรับมือภัยคุกคามและตอบสนองต่อเหตุการณ์ผิดปกติทางไซเบอร์ (Cyber Incident Response Plan CIRP)
การรายงานผล: -', 'สำนักกำกับดูแลกิจการโทรคมนาคม กสทช. แจ้งว่า JasTel ไม่อยู่ในรายชื่อหน่วยงาน CII ที่เข้าข่ายจะต้องปฏิบัติตามพระราชบัญญัตินี้ อย่างไรก็ตาม JasTel ยังคงมีหน้าที่ในการให้ข้อมูลเป็นหนังสือเกี่ยวกับภัยคุกคามไซเบอร์ เมื่อมีการร้องขอหรือคำสั่งจาก กกม. เป็นรายกรณีไป (update 23 มิ.ย. 66)')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-012') L,
  (values
    (0, '(1) มาตรการรักษาความมั่นคงปลอดภัยดังกล่าว จะต้องครอบคลุมการเก็บรวบรวม ใช้
และเปิดเผยข้อมูลส่วนบุคคล ตามกฎหมายว่าด้วยการคุ้มครองข้อมูลส่วนบุคคล ไม่ว่าข้อมูลส่วนบุคคลดังกล่าวจะอยู่ในรูปแบบเอกสารหรือในรูปแบบอิเล็กทรอนิกส์ หรือรูปแบบอื่นใดก็ตาม', 'met', 'Legal, DPO', 'ทุกรอบการประเมินกฎหมาย', 'PD-60 การตรวจสอบความสอดคล้องทางกฎหมาย
การรายงานผล: -', NULL),
    (1, '(2) มาตรการรักษาความมั่นคงปลอดภัยดังกล่าว จะต้องประกอบด้วยมาตรการเชิงองค์กร
(organizational measures) และมาตรการเชิงเทคนิค (technical measures) ที่เหมาะสม ซึ่งอาจ
รวมถึงมาตรการทางกายภาพ (physical measures) ที่จำเป็นด้วย โดยคำนึงถึงระดับความเสี่ยง
ตามลักษณะและวัตถุประสงค์ของการเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคล ตลอดจนโอกาสเกิดและผลกระทบจากเหตุการละเมิดข้อมูลส่วนบุคคล', 'met', 'Legal, DPO', 'ทุกรอบการประเมินกฎหมาย', 'PD-60 การตรวจสอบความสอดคล้องทางกฎหมาย
ISD-07 SOA
ISD-37 รายงานการประเมินความเสี่ยง 
นโยบายการคุ้มครองข้อมูลส่วนบุคคล
การรายงานผล: -', NULL),
    (2, '(3) มาตรการรักษาความมั่นคงปลอดภัย ระบุความเสี่ยงที่สำคัญที่อาจจะเกิดขึ้นกับทรัพย์สินสารสนเทศ (information assets) ที่สำคัญการป้องกันความเสี่ยงที่สำคัญที่อาจจะเกิดขึ้น การตรวจสอบและเฝ้าระวังภัยคุกคามและเหตุการละเมิดข้อมูลส่วนบุคคล การเผชิญเหตุเมื่อมีการตรวจพบภัยคุกคามและเหตุการละเมิดข้อมูลส่วนบุคคล และการรักษาและฟื้นฟูความเสียหายที่เกิดจากภัยคุกคามหรือเหตุการละเมิดข้อมูลส่วนบุคคลด้วย ทั้งนี้ เท่าที่จำเป็นเหมาะสม และเป็นไปได้ตามระดับความเสี่ยง', 'met', 'ADS, Planning Engineer', 'ทุกรอบการประเมินกฎหมาย', 'ISD-37 รายงานการประเมินความเสี่ยง
การรายงานผล: -', NULL),
    (3, '(4) มาตรการรักษาความมั่นคงปลอดภัยดังกล่าว จะต้องคำนึงถึงความสามารถในการธำรงไว้
ซึ่งความลับ (confidentiality) ความถูกต้องครบถ้วน (integrity) และสภาพพร้อมใช้งาน (availability)ของข้อมูลส่วนบุคคลไว้ได้อย่างเหมาะสมตามระดับความเสี่ยง', 'met', 'ADS, Planning Engineer', 'ทุกรอบการประเมินกฎหมาย', 'ISD-37 รายงานการประเมินความเสี่ยง
การรายงานผล: -', NULL),
    (4, '(5) สำหรับการเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลในรูปแบบอิเล็กทรอนิกส์
มาตรการรักษาความมั่นคงปลอดภัย จะต้องครอบคลุมส่วนประกอบต่างๆ ของระบบ
สารสนเทศที่เกี่ยวข้องกับการเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคล เช่น ระบบแลอุปกรณ์จัดเก็บข้อมูลส่วนบุคคล เครื่องคอมพิวเตอร์แม่ข่าย(servers) เครื่องคอมพิวเตอร์ลูกข่าย(clients)และอุปกรณ์ต่างๆ ที่ใช้ ระบบเครือข่าย ซอฟต์แวร์และแอปพลิเคชัน อย่างเหมาะสมตามระดับความเสี่ยง โดยคำนึงถึงหลักการป้องกันเชิงลึก(defense in depth) ที่ควรประกอบด้วยมาตรการป้องกันหลายชั้น(multiple layers of security controls) เพื่อลดความเสี่ยงในกรณีที่มาตรการบางมาตรการมีข้อจ ากัดในการป้องกันความมั่นคงปลอดภัยในบางสถานการณ์', 'met', 'ADS', 'ทุกรอบการประเมินกฎหมาย', 'ISD-07 SOA
การรายงานผล: -', NULL),
    (5, '(ก) การควบคุมการเข้าถึงข้อมูลส่วนบุคคลและส่วนประกอบของระบบสารสนเทศที่สำคัญ (access control) ที่มีการพิสูจน์และยืนยันตัวตน (identity proofing and authentication) และการอนุญาตหรือการกำหนดสิทธิในการเข้าถึงและใช้งาน(authorization) ที่เหมาะสม โดยคำนึงถึงหลักการให้สิทธิเท่าที่จำเป็น (need-to-know basis) ตามหลักการให้สิทธิที่น้อยที่สุดเท่าที่จำเป็น(principle of least privilege)', 'met', 'ADS', 'ทุกรอบการประเมินกฎหมาย', 'ISD-07 SOA
การรายงานผล: -', NULL),
    (6, '(ข) การบริหารจัดการการเข้าถึงของผู้ใช้งาน (user access management) ที่เหมาะสม
ซึ่งอาจรวมถึงการลงทะเบียนและการถอนสิทธิผู้ใช้งาน(user registration and de-registration)
การจัดการสิทธิการเข้าถึงของผู้ใช้งาน(user access provisioning) การบริหารจัดการสิทธิการเข้าถึงตามสิทธิ (management of privileged access rights) การบริหารจัดการข้อมูลความลับสำหรับการพิสูจน์ตัวตนของผู้ใช้งาน (management of secret authentication information of users)การทบทวนสิทธิการเข้าถึงของผู้ใช้งาน (review of user access rights) และการถอดถอนหรือปรับปรุงสิทธิการเข้าถึง (removal or adjustment of access rights)', 'met', 'ADS', 'ทุกรอบการประเมินกฎหมาย', 'ISD-07 SOA
การรายงานผล: -', NULL),
    (7, '(ค) การกำหนดหน้าที่ความรับผิดชอบของผู้ใช้งาน (user responsibilities) เพื่อป้องกัน
การเข้าถึง ใช้ เปลี่ยนแปลง แก้ไข ลบ หรือเปิดเผยข้อมูลส่วนบุคคลโดยปราศจากอำนาจหรือโดยมิชอบซึ่งรวมถึงกรณีที่เป็นการกระท านอกเหนือบทบาทหน้าที่ที่ได้รับมอบหมาย ตลอดจนการลักลอบทำสำเนาข้อมูลส่วนบุคคลโดยปราศจากอำนาจหรือโดยมิชอบ และการลักขโมยอุปกรณ์จัดเก็บหรือประมวลผลข้อมูลส่วนบุคคล', 'met', 'Legal, DPO', 'ทุกรอบการประเมินกฎหมาย', 'P-02 กฎระเบียบความปลอดภัยของข้อมูลสารสนเทศ
การรายงานผล: -', NULL),
    (8, '(ง) การจัดให้มีวิธีการเพื่อให้สามารถตรวจสอบย้อนหลังเกี่ยวกับการเข้าถึง เปลี่ยนแปลง
แก้ไข หรือลบข้อมูลส่วนบุคคล (audit trails) ที่เหมาะสมกับวิธีการและสื่อที่ใช้ในการเก็บรวบรวม ใช้หรือเปิดเผยข้อมูลส่วนบุคคล', 'met', 'ผู้ที่เก็บข้อมูลส่วนบุคคล', 'ทุกรอบการประเมินกฎหมาย', 'Log
การรายงานผล: -', NULL),
    (9, '(7) ต้องรวมถึงการสร้างเสริมความตระหนักรู้ด้านความสำคัญของการคุ้มครองข้อมูลส่วนบุคคลและการรักษาความมั่นคงปลอดภัย (privacy and security awareness)', 'met', 'QA', 'ทุกรอบการประเมินกฎหมาย', 'Training need ประจำปี
การรายงานผล: -', NULL),
    (10, 'ข้อ 5 ผู้ควบคุมข้อมูลส่วนบุคคลต้องทบทวนมาตรการรักษาความมั่นคงปลอดภัยตามข้อ 4 เมื่อมีความจำเป็นหรือเมื่อเทคโนโลยีเปลี่ยนแปลงไป', 'met', 'ADS, Planning Engineer', 'ทุกรอบการประเมินกฎหมาย', 'ISD-37 รายงานการประเมินความเสี่ยง
การรายงานผล: -', NULL),
    (11, 'ข้อ 6 ในการจัดให้มีข้อตกลงระหว่างผู้ควบคุมข้อมูลส่วนบุคคลและผู้ประมวลผลข้อมูล
ส่วนบุคคล ให้ผู้ควบคุมข้อมูลส่วนบุคคลพิจารณากำหนดให้ผู้ประมวลผลข้อมูลส่วนบุคคลจัดให้มาตรการรักษาความมั่นคงปลอดภัยที่เหมาะสม เพื่อป้องกันการสูญหาย เข้าถึง ใช้ เปลี่ยนแปลงแก้ไข หรือเปิดเผยข้อมูลส่วนบุคคล', 'met', 'Legal', 'ทุกรอบการประเมินกฎหมาย', 'เอกสารสัญญา Data Processer Agreement
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-013') L,
  (values
    (0, 'จัดมาตรการ takedown notice เป็นลายลักษณ์อักษรเพื่อระงับการแพร่หลายหรือลบข้อมูลคอมพิวเตอร์ที่ผิดกฎหมายออกจากระบบคอมพิวเตอร์ที่อยู่ในความควบคุมดูแลของตน', 'met', 'Legal', 'ทุกรอบการประเมินกฎหมาย', 'เอกสาร Takedown notice ปรากฎบนเว็ปไซต์ www.jastel.co.th
การรายงานผล: -', NULL),
    (1, 'กรณีมีการร้องเรียนจากผู้ร้องเรียนโดยตรง _ กำหนดระยะเวลาการนำข้อมูลผิดกฎหมายออกจากระบบ กรณีที่มีผู้ใช้บริการหรือบุคคลทั่วไปร้องเรียนเป็นไม่เกินกว่า 24 ชั่วโมง นับแต่ได้รับข้อร้องเรียน', 'met', 'Planning Engineer', 'ทุกรอบการประเมินกฎหมาย', 'เข้าถึง Website นั้นไม่ได้ด้วย Interner Jasel
การรายงานผล: -', NULL),
    (2, 'กรณีมีคำสั่งจากเจ้าหน้าที่ _ กำหนดระยะเวลาการในการระงับการทำให้แพร่หลายหรือนำข้อมูลออกจากระบบคอมพิวเตอร์ โดยหลักจะต้องทำทันที เว้นแต่มีเหตุสุดวิสัย ให้ดำเนินการภายหลังเหตุสิ้นสุด แต่ต้องไม่เกินระยะเวลาดังนี้
- ข้อมูลทุจริต หรือ หลอกลวง ประเภท 1  ไม่เกิน 7 วันนับแต่ได้รับคำสั่ง
- ข้อมูลกระทบต่อความมั่นคง ประเภท 2 3  ไม่เกิน 24 ชั่วโมงนับแต่ได้รับคำสั่ง
- ข้อมูลที่มีลักษณะลามก ประเภท 4  ไม่เกิน 3 วัน นับแต่ได้รับคำสั่ง
- ข้อมูลที่เป็นภาพลามกอนาจารเด็ก  ไม่เกิน 24 ชั่วโมงนับแต่ได้รับคำสั่ง', 'met', 'Planning Engineer', 'ทุกรอบการประเมินกฎหมาย', 'เข้าถึง Website นั้นไม่ได้ด้วย Interner Jasel
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-014') L,
  (values
    (0, 'เมื่อมีการละเมิด CIA ของข้อมูลส่วนบุคคล นอกเหนือจากการดำเนินการเพื่อระงับเหตุ บริษัทฯ ยังมีหน้าที่ในการแจ้งเหตุการละเมิดข้อมูลส่วนบุคคล โดยแบ่ง 3 กรณี ดังนี้
1. กรณีที่เหตุการละเมิดไม่มีความเสี่ยงต่อสิทธิและเสรีภาพของบุคคล
ไม่จำเป็นต้องแจ้งเหตุการละเมิด แต่ต้องนำส่งข้อมูลหรือเอกสารหลักฐานว่าเพราะเหตุใด เหตุการละเมิดดังกล่าวจึงไม่ก่อให้เกิดความเสี่ยง
2. กรณีที่เหตุการละเมิดมีความเสี่ยงต่อสิทธิและเสรีภาพของบุคคล
ต้องแจ้งสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคลภายใน 72 ชั่วโมง นับแต่เหตุการละเมิดเกิด
3.  กรณีที่เหตุการละเมิดมีความเสี่ยงสูงต่อสิทธิและเสรีภาพของบุคคล
ต้องแจ้งให้สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคลทราบภายใน 72 ชั่วโมง นับแต่เหตุการละเมิดเกิด และแจ้งเจ้าของข้อมูลส่วนบุคคลที่ได้รับผลกระทบโดยไม่ชักช้า', 'met', 'DPO', 'ทุกรอบการประเมินกฎหมาย', 'หลักฐานการแจ้งเหตุ
การรายงานผล: กรณีทีการละเมิด : ต้องแจ้งสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคลภายใน 72 ชั่วโมง นับแต่เหตุการละเมิดเกิด', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-015') L,
  (values
    (0, 'บริษัทฯ ในฐานะผู้ประมวลผลข้อมูลส่วนบุคคล (processor) ต้องจัดทำรายการกิจกรรมการประมวลผลข้อมูลส่วนบุคคล (ROPA) เป็นลายลักษณ์อักษร (ทางอิเล็กทรอนิกส์ก็ได้) โดยมีรายการต่อไปนี้
(1) ชื่อและข้อมูลเกี่ยวกับผู้ประมวลผลข้อมูลส่วนบุคคล  และตัวแทน (ถ้ามี)
(2) ชื่อและข้อมูลเกี่ยวกับผู้ควบคุมข้อมูลส่วนบุคคล และตัวแทน (ถ้ามี) 
(3) ชื่อและข้อมูลเกี่ยวกับ DPO  รวมถึงสถานที่ติดต่อและวิธีการติดต่อ
(4) ประเภทหรือลักษณะของการเก็บรวบรวม  ใช้  หรือเปิดเผยข้อมูลส่วนบุคคล 
รวมถึงวัตถุประสงค์ของการเก็บรวบรวม  ใช้  หรือเปิดเผยข้อมูลส่วนบุคคล
(5) ประเภทหน่วยงานที่ได้รับข้อมูลส่วนบุคคล  ในกรณีที่โอนข้อมูลส่วนบุคคลไปยังต่างประเทศ 
(6) คำอธิบายเกี่ยวกับมาตรการรักษาความมั่นคงปลอดภัย', 'met', 'Legal / ADS', 'ทุกรอบการประเมินกฎหมาย', 'ROPA แต่ละหน่วยงาน
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-016') L,
  (values
    (0, 'กำหนดหลักเกณฑ์เฉพาะในการคุ้มครองข้อมูลส่วนบุคคลผู้ใช้บริการโทรคมนาคม (ยกเว้นผู้ใช้บริการที่เป็นผู้รับใบอนุญาตฯ ด้วยกัน) โดยมีหลักเกณฑ์สำคัญ ๆ ที่แตกต่างจาก PDPA ดังนี้
1. โดยหลัก การเก็บรวบรวมข้อมูลส่วนบุคคลจะต้องเป็นไปเพื่อการให้บริการโทรคมนาคม
2. ห้ามเก็บรวบรวมข้อมูลอ่อนไหว เว้นแต่ได้รับความยินยอม และเป็นไปเพื่อประโยชน์ในการให้บริการให้เหมาะสมกับลักษณะพิการทางร่างกาย
3. ต้องจัดให้มีช่องทางปรับปรุงข้อมูล รวมถึงช่องทางการเลือกรับ/ยกเลิกการรับข้อมูล โดยมีระบบการพิสูจน์และยืนยันตัวบุคคลที่รัดกุม
4. กำหนดกรอบระยะเวลาการเก็บรักษาข้อมูลส่วนบุคคล โดยให้เก็บรักษาเป็นระยะเวลา 90 วัน ย้อนหลังตลอดระยะเวลาการใช้บริการ หรือเก็บรักษา 90 วัน นับแต่สัญญาสิ้นสุด เว้นแต่มีความจำเป็นอื่นตามที่ประกาศ กสทช. กำหนด อาจเก็บรักษาไว้นานกว่านั้นได้
5. ต้องดำเนินการให้เป็นไปตามสิทธิเจ้าของข้อมูล ภายในเวลา 15 วัน นับแต่ได้รับคำขอ
6. กรณีมีเหตุละเมิดข้อมูลส่วนบุคคล ต้องแจ้ง กสทช. ด้วย โดยให้แจ้งภายใน 72 ชั่วโมง นับแต่ทราบเหตุ แต่ถ้าความเสี่ยงสูง ให้ระยะเวลาลดเหลือ 24 ชั่วโมง
7. กรณีได้รับคำขอจากหน่วยงานรัฐให้ดักฟัง ตรวจ กักสัญญาณ ฯลฯ ต้องรายงานข้อมูลให้ กสทช. เป็นรายไตรมาส
8. ต้องจัดส่งนโยบายคุ้มครองข้อมูลส่วนบุคคล ให้เลขาธิการ กสทช. รับรอง ภายใน 90 วัน นับแต่วันถัดจากวันประกาศกำหนด
9. ผู้ใช้บริการมีสิทธิร้องเรียนเกี่ยวกับการละเมิดข้อมูลส่วนบุคคลผ่าน กสทช.
10. กสทช. มีอำนาจขอให้ผู้รับใบอนุญาตส่งข้อมูลส่วนบุคคลของผู้ใช้บริการมาให้', 'met', 'Legal / ADS', 'ทุกรอบการประเมินกฎหมาย', 'ROPA แต่ละหน่วยงาน
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-017') L,
  (values
    (0, 'เพิ่มเติมข้อยกเว้นความรับผิดผู้ให้บริการ 4 ประเภท ตามเงื่อนไขที่กฎหมายกำหนด
ซึ่งผู้ให้บริการอินเตอร์เน็ตถือเป็นผู้ให้บริการประเภทเป็นสื่อกลางส่งผ่านข้อมูลคอมพิวเตอร์หรือให้สามารถติดต่อถึงกันได้โดยประการอื่นผ่านทางระบบคอมพิวเตอร์ หรือ Mere Conduit (มาตรา 43/2)
1. เงื่อนไขทั่วไป (มาตรา 43/1): ต้องประกาศมาตรการยกเลิกการให้บริการแก่ผู้ใช้บริการที่กระทำการละเมิดลิขสิทธิ์ซ้ำ
2. เงื่อนไขเฉพาะสำหรับ  Mere Conduit (มาตรา 43/2): ต้องให้บริการภายใต้เงื่อนไข 5 ข้อ ดังนี้
- ไม่ได้เป็นผู้ริเริ่มส่งข้อมูล 
- ไม่ได้เป็นผู้กำหนดผู้รับข้อมูล 
- ส่งข้อมูลผ่านกระบวนการทางเทคนิคโดยอัตโนมัติ 
- ไม่ได้กำหนดไม่ได้เปลี่ยนแปลงเนื้อหาของข้อมูล และ
- ไม่ได้เก็บสำเนาข้อมูลที่ทำซ้ำขึ้นในระหว่างกระบวนการพักข้อมูลเป็นการชั่วคราว
ในลักษณะที่ผู้อื่นสามารถเข้าถึงได้โดยทั่วไปและนานเกินกว่าที่จำเป็น', 'met', 'Legal / ADS', '-', 'รับทราบตามกฎหมาย
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-018') L,
  (values
    (0, 'ผู้ให้บริการโทรคมนาคมต้องเปิดเผยข้อมูลการลงทะเบียนผู้ใช้งานหรือข้อมูลจราจรทางคอมพิวเตอร์ตามคำสั่งของหน่วยงานผู้มีอำนาจหน้าที่ตามพระราชบัญญัตินี้ เท่าที่จำเป็น โดยการเปิดเผย การแลกเปลี่ยน การเข้าถึง การเก็บ การรวบรวม หรือการใช้ข้อมูลตามกฎหมายนี้จะไม่อยู่ภายใต้บังคับกฎหมายคุ้มครองข้อมูลส่วนบุคคล', 'met', 'Planning Engineer', 'ทุกรอบการประเมินกฎหมาย', 'Log ข้อมูลจราจรคอมพิวเตอร์
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-019') L,
  (values
    (0, 'กำหนดแนวทางปฏิบัติเกี่ยวกับการรายงานเหตุภัยคุกคามทางไซเบอร์ โดยกำหนดรายการข้อมูลที่ต้องแจ้งเป็นแบบฟอร์มตามเอกสารแนบท้ายประกาศ', 'met', '-', '-', '-
การรายงานผล: -', 'แม้ JasTel ไม่อยู่ในรายชื่อหน่วยงาน CII ที่เข้าข่ายจะต้องปฏิบัติตามพระราชบัญญัตินี้ แต่ในการให้ข้อมูลเป็นหนังสือเกี่ยวกับภัยคุกคามไซเบอร์ เมื่อมีการร้องขอหรือคำสั่งจาก กกม. เป็นรายกรณี ก็ยังคงต้องให้ข้อมูลตามรายการที่ปรากฏในแบบ ก.2')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-020') L,
  (values
    (0, 'ผู้ประกอบกิจการโทรคมนาคม ต้องจัดให้มี DPO ของตนเอง เนื่องจาก
1. การเก็บรวบรวม  ใช้  หรือเปิดเผยข้อมูลส่วนบุคคลของลูกค้าหรือผู้รับบริการโดยผู้ประกอบกิจการโทรคมนาคม ถือเป็นกรณีที่มีความจำเป็นต้องตรวจสอบข้อมูลส่วนบุคคลหรือระบบอย่างสม่ำเสมอ ตามข้อ 5 วรรคสอง (4) และ
2. การเก็บรวบรวม  ใช้  หรือเปิดเผยข้อมูลส่วนบุคคลของลูกค้าหรือผู้รับบริการโดยผู้รับใบอนุญาต ประกอบกิจการโทรคมนาคมแบบที่สามตามกฎหมายว่าด้วยการประกอบกิจการโทรคมนาคม  ให้ถือเป็นกรณีที่มีข้อมูลส่วนบุคคลเป็นจำนวนมาก  (on  a  large  scale) ตามข้อ 6 วรรคสอง (4)', 'met', 'Legal', 'ทุกรอบการประเมินกฎหมาย', '1) ประกาศ DPO
2) Mail / จดหมายแจ้งรายชื่อ DPO ต่อ สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล
การรายงานผล: สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-021') L,
  (values
    (0, '1. การส่งข้อมูลส่วนบุคคลไปยังต่างประเทศ มีเงื่อนไขว่าประเทศปลายทางต้องมีมาตรฐานการคุ้มครองข้อมูลส่วนบุคคลที่เพียงพอตามข้อ 5 แห่งประกาศ กล่าวคือ 
(1) ประเทศปลายทาง (ผู้รับโอนข้อมูล) ต้องมีมาตรการหรือกลไกทางกฎหมายที่สอดคล้องกับ PDPA ของไทย โดยอย่างน้อยที่สุด 
- มีการกำหนดหน้าที่ในการรักษาความมั่นคงปลอดภัย
- มีกลไกบังคับตามสิทธิและเยียวยาเจ้าของข้อมูล
(2) มีหน่วยงานหรือองค์กรบังคับใช้กฎหมาย', 'met', 'Legal', '-', 'สื่อสารให้ผู้เกี่ยวข้องทราบ
การรายงานผล: -', NULL),
    (1, '2. ข้อยกเว้นการส่งข้อมูลส่วนบุคคลไปยังต่างประเทศได้ แม้ประเทศปลายทางมีมาตรฐานการคุ้มครองข้อมูลส่วนบุคคลไม่เพียงพอ
(1) เป็นการปฏิบัติตามกฎหมาย
(2) ได้รับความยินยอมจากเจ้าของข้อมูล
(3) เป็นการปฏิบัติตามสัญญา', 'met', NULL, NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-022') L,
  (values
    (0, 'การโอนข้อมูลส่วนบุคคลไปให้นิติบุคคลต่างประเทศที่อยู่ในเครือกิจการหรือธุรกิจเดียวกัน สามารกระทำได้ หากมีนโยบายในการคุ้มครองข้อมูลส่วนบุคคลในเครือกิจการหรือเครือธุรกิจเดียวกัน (binding corporate rules: "BCR") ที่ได้รับการรับรองและตรวจสอบจากสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคลแล้ว', 'met', 'Legal', '-', 'สื่อสารให้ผู้เกี่ยวข้องทราบ
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-023') L,
  (values
    (0, '1. การเก็บข้อมูลประวัติอาชญากรรมจะกระทำได้ต่อเมื่อได้รับความยินยอมจากเจ้าของข้อมูล สำหรับวัตถุประสงค์ในการพิจารณารับบุคคลเข้าทำงาน หรือตรวจสอบคุณสมบัติ 
2. ในการขอความยินยอม ต้องแจ้งผลกระทบของการไม่ให้ความยินยอมโดยชัดแจ้ง
3. การจัดเก็บข้อมูลประวัติอาชญากรรมจะต้องจัดมาตรการรักษาความมั่นคงปลอดภัยที่เหมาะสม
4. เมื่อใช้ข้อมูลประวัติอาชญากรรมสำเร็จตามวัตถุประสงค์ ให้เก็บข้อมูลนั้นต่อไปได้อีกไม่เกิน 6 เดือน นับแต่ดำเนินการเสร็จสิ้น', 'met', 'HR Group', '-', 'ตามปกติการจัดเก็บข้อมูลประวัติอาชญากรรมเป็นความรับผิดของ HR ในกลุ่ม JAS/JTS Group
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-024') L,
  (values
    (0, 'ผู้ให้บริการด้านการรักษาความมั่นคงปลอดภัยไซเบอร์ สามารถขอการรับรองคุณภาพบริการได้ 
โดยแบ่งเป็น 3 ระดับ คือ ขั้นต้น ขั้นก้าวหน้า ขั้นสูง', 'met', '-', '-', '-
การรายงานผล: -', 'ประกาศฉบับนี้เป็นการกำหนดแนวทางการขอการรับรองคุณภาพการให้บริการด้านการรักษาความมั่นคงปลอดภัย ซึ่งไม่ได้เป็นธุรกิจหลักของ JasTel')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-025') L,
  (values
    (0, 'กำหนดคุณลักษณะของข้อมูล/ระบบสารสนเทศ โดยพิจารณาตาม CIA (วัตถุประสงค์ด้านความมั่นคงปลอดภัยไซเบอร์) และระดับผลกระทบ แบ่งเป็น (1) ระดับต่ำ (2) ระดับกลาง (3) ระดับสูง โดยพิจารณาผลกระทบในด้าน
- ความเสียหายทางการเงิน ทรัพย์สิน ชื่อเสียง
- จำนวนผู้ใช้บริการ บุคลากร หรือประชาชนที่จะได้รับความเสียหาย
- ผลกระทบต่อการดำเนินงานของหน่วยงาน
- ผลกระทบต่อความมั่นคงและความสงบเรียบร้อยของประเทศ
หมายเหตุ: ให้มีการทบทวนทุก 3 ปี เป็นอย่างน้อย หรือเมื่อข้อมูล/ระบบสารสนเทศหรือหน้าที่ของหน่วยงานเปลี่ยนแปลงอย่างมีนัยสำคัญ', 'met', '-', '-', '-
การรายงานผล: -', 'แม้ JasTel ไม่อยู่ในรายชื่อหน่วยงาน CII ที่เข้าข่ายจะต้องปฏิบัติตาม แต่อาจใช้เป็นมาตรฐานอ้างอิงในการรักษาความมั่นคงปลอดภัยได้')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-026') L,
  (values
    (0, 'หน่วยงานโครงสร้างพื้นฐานสำคัญทางสารสนเทศ 
1. กำหนดคุณลักษณะของข้อมูล/ระบบสารสนเทศ ตามประกาศ LF-026 โดยประเมินจากวัตถุประสงค์ด้านความมั่นคงปลอดภัยไซเบอร์และระดับผลกระทบเป็น (1) ระดับต่ำ (2) ระดับกลาง (3) ระดับสูง
2. กำหนดมาตรการควบคุมความมั่นคงปลอดภัยไซเบอร์ขั้นต่ำ ตามคุณลักษณะของข้อมูล ได้แก่
2.1 ความมั่นคงปลอดภัยไซเบอร์ระดับต่ำ
- การประเมินความเสี่ยง และกลยุทธ์จัดการความเสี่ยง
- แผนรับมือภัยคุกคาม แผนสื่อสารในภาวะวิกฤต
- การสร้างความตระหนักรู้ การฝึกซ้อม
-  Access control
- การทำให้ระบบมีความแข็งแกร่ง ตรวจสอบและเฝ้าระวังภัยคุกคามไซเบอร์
2.2 ความมั่นคงปลอดภัยไซเบอร์ระดับกลาง (เพิ่มเติมจาก 2.1) 
- แผนตรวจสอบการรักษาความมั่นคงปลอดภัยไซเบอร์
- Remote Connection
- Removable  Storage  Media
2.3 ความมั่นคงปลอดภัยไซเบอร์ระดับสูง (เพิ่มเติมจาก 2.1 และ 2.2)
 - การประเมินช่องโห่และทดสอบเจาะระบบ
- บริหารจัดการผู้ให้บริการภายนอก
- Information Sharing
- การรักษาและฟื้นฟูความเสียหายที่เกิด', 'met', 'Cyber security', '-', '-
การรายงานผล: -', 'แม้ JasTel ไม่อยู่ในรายชื่อหน่วยงาน CII ที่เข้าข่ายจะต้องปฏิบัติตาม แต่อาจใช้เป็นมาตรฐานอ้างอิงในการรักษาความมั่นคงปลอดภัยได้')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-027') L,
  (values
    (0, 'กำหนดแนวทางการจัดทำแผนการรักษาความมั่นคงปลอดภัยไซเบอร์  (มีเอกสารแนบท้ายประกาศ)
ประกอบด้วย  3 หัวข้อใหญ่
1. รายละเอียดระบบสารสนเทศ
- ชื่อและหมายเลขอ้างอิง
- คำอธิบายและวัตถุประสงค์ของระบบสารสนเทศ
- เจ้าหน้าที่ระดับอาวุโสด้านความมั่นคงปลอดภัยสารสนเทศ
- เจ้าของระบบสารสนเทศ
- เจ้าของสารสนเทศ
- เจ้าหน้าที่ที่มีอำนาจ
- ผู้ที่เกี่ยวข้องกับระบบสารสนเทศ
- การกำหนดคุณลักษณะความมั่นคงปลอดภัยไซเบอร์
- สถานะของระบบสารสนเทศ
- การเชื่อมต่อระบบและใช้งานข้อมูลร่วมกัน
- นโยบาย ระเบียบ หรือกฎหมายที่เกี่ยวข้อง
2. การควบคุมความมั่นคงปลอดภัยไซเบอร์
3. การบริการงานแผนการรักษาความมั่นคงปลอดภัยไซเบอร์', 'met', 'Data center
Cyber security
IT', '-', '-
การรายงานผล: -', 'แม้ JasTel ไม่อยู่ในรายชื่อหน่วยงาน CII ที่เข้าข่ายจะต้องปฏิบัติตาม แต่อาจใช้เป็นมาตรฐานอ้างอิงในการรักษาความมั่นคงปลอดภัยได้')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-028') L,
  (values
    (0, 'กำหนดหน้าที่ของหน่วยงานโครงสร้างพื้นฐานสำคัญทางสารสนเทศ (ข้อ 4)
(1) ป้องกัน รับมือ ลดความเสี่ยงจากภัยคุกคามไซเบอร์
(2) จัดทำเอกสาร
- ประมวลแนวทางปฏิบัติ: แผนการตรวจสอบด้านการรักษาความมั่นคงปลอดภัยไซเบอร์ + การประเมินความเสี่ยง + แผนการรับมือภัยคุกคามไซเบอร์
- กรอบมาตรฐานการรักษาความมั่นคงปลอดภัยไซเบอร์: การระบุความเสี่ยง มาตรการป้องกัน มาตรการตรวจสอบเฝ้าระวัง มาตรการเผชิญเหตุ มาตรการรักษาและฟื้นฟูความเสียหาย
(3) ทวนเอกสารปีละ 1 ครั้ง หรือเมื่อมีการเปลี่ยนแปลงอย่างมีนัยสำคัญ
(4) ให้ความร่วมมือและมีส่วนร่วมในการฝึกซ้อมรับมือภัยคุกคาม
(5) แจ้งรายชื่อเจ้าหน้าที่ระดับบริหารและระดับปฏิบัติการ พร้อมด้วยข้อมูลการติดต่อที่สามารถติดต่อได้ในกรณีมีเหตุฉุกเฉินภายในระยะเวลา 60 นาที (หากมีการเปลี่ยนแปลง ต้องแจ้งภายใน 15 วัน นับแต่เปลี่ยนแปลง)
(6) แจ้งรายชื่อหน่วยงานภายในหรือบุคคลที่เป็นเจ้าของกรรมสิทธิ์ ผู้ครอบครองคอมพิวเตอร์
และผู้ดูแลระบบคอมพิวเตอร์ พร้อมด้วยข้อมูลการติดต่อที่สามารถติดต่อในกรณีมีเหตุฉุกเฉินภายในระยะเวลา 60 นาที (หากมีการเปลี่ยนแปลง ต้องแจ้งภายใน 7 วัน นับแต่เปลี่ยนแปลง เว้นแต่มีเหตุจำเป็นอันมิอาจก้าวล่วงได้ ให้แจ้งภายใน 15 วัน)
(7)-(8) ดำเนินการตามนโยบายบริหารจัดการที่เกี่ยวกับการรักษาความมั่นคงปลอดภัยไซเบอร์ และทบทวนอย่างน้อยปีละครั้ง
(9) จัดให้มีการประเมินความเสี่ยงด้านการรักษาความมั่นคงปลอดภัยไซเบอร์ อย่างน้อยปีละครั้ง และจัดทำผลสรุปรายงานการดำเนินการ (แยกต่างหาก) และส่งสรุปรายงานการดำเนินการภายใน 30 วัน นับแต่ดำเนินการเสร็จ แต่ไม่เกินวันที่ 31 มกราคม ของปีถัดไป
(10) จัดให้มีการตรวจสอบด้านความมั่นคงปลอดภัยไซเบอร์ อย่างน้อยปีละครั้ง และจัดทำผลสรุปรายงานการดำเนินการ (แยกต่างหาก) และส่งสรุปรายงานการดำเนินการภายใน 30 วัน นับแต่ดำเนินการเสร็จ แต่ไม่เกินวันที่ 31 มกราคม ของปีถัดไป
(11)-(12) กำหนดกลไกตรวจสอบหรือเฝ้าระวังภัยคุกคามทางไซเบอร์ และทบทวนอย่างน้อยปีละครั้ง
(13) เข้าร่วมการทดสอบสถานะความพร้อมในการรับมือกับภัยคุกคามทางไซเบอร์ที่สำนักงานจัดขึ้น
(14) ตรวจสอบข้อมูลที่เกี่ยวข้อง ข้อมูลคอมพิวเตอร์ และระบบคอมพิวเตอร์ รวมถึงพฤติกรรมแวดล้อม
(15) ในกรณีที่มีภัยคุกคามไซเบอร์เกิด ให้เห็บพยานหลักฐาน แจ้งเหตุและส่งรายงานภัยคุกคาม
(16)-(17) จัดทำแผนความต่อเนื่องทางธุรกิจ และฝึกซ้อมอย่างน้อยปีละครั้ง
(18) จัดทำรายงานประจำปีเกี่ยวกับภัยตคุกคามไซเบอร์ โดยส่งภายในวันที่ 31 มกราคม ในแต่ละปี
(19) - (หน้าที่เฉพาะหน่วยงานรัฐ)
(20) - (21) ให้ความร่วมมือศูนย์ประสานการรักษาความมั่นคงปลอดภัยฯ และดำเนินการตามที่ กมช. หรือ กกม. มอบหมายหรือประกาศกำหนด', 'met', 'Cyber security', '-', '-
การรายงานผล: -', 'แม้ JasTel ไม่อยู่ในรายชื่อหน่วยงาน CII ที่เข้าข่ายจะต้องปฏิบัติตาม แต่อาจใช้เป็นมาตรฐานอ้างอิงในการรักษาความมั่นคงปลอดภัยได้')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-029') L,
  (values
    (0, '1. เมื่อเจ้าของข้อมูลส่วนบุคคลใช้สิทธิตามมาตรา 33 ขอให้มีการลบ ทำลาย หรือทำให้ข้อมูลส่วนบุคคลเป็นข้อมูลที่ไม่สามารถระบุตัวตนได้ ให้ดำเนินการดังต่อไปนี้
- ต้องดำเนินการภายใน 90 วัน นับแต่ได้รับคำขอ หากไม่สามารถดำเนินการได้ภายใน 90 วัน เนื่องจากเหตุผลทางเทคนิค ต้องดำเนินการให้การเก็บรวบรวม ใช้ หรือเปิดเผยข้อมูลส่วนบุคคลเป็นไปได้ยากจนกว่าจะดำเนินการลบ ทำลาย หรือทำให้ข้อมูลส่วนบุคคลเป็นข้อมูลที่ไม่สามารถระบุตัวตนได้แล้วเสร็จ
- กรณีสามารถปฏิเสธคำขอได้ตามกฎหมาย เช่น จำเป็นต้องเก็บรักษาข้อมูลตามกฎหมาย ต้องแจ้งเหตุผลและความจำเป็นให้เจ้าของข้อมูลทราบ
- การลบหรือทำลาย ต้องดำเนินการครอบคลุมถึงข้อมูลสำรองหรือสำเนา
- กรณีทำให้เป็นข้อมูลนิรนาม (anonymization) ต้องมีกระบวนการพิจารณาดำเนินการเพิ่มเติม เพื่อตรวจสอบว่าข้อมูลดังกล่าวไม่สามารถระบุตัวตนได้
- กรณีข้อมูลส่วนบุคคลเป็นข้อมูลที่เก็บรวบรวม ใช้ และเปิดเผยโดยไม่ชอบ และไม่ใช่กรณีที่ปฏิเสธคำขอได้ตามกฎหมาย ต้องดำเนินการทำลายหรือลบข้อมูลดังกล่าวเท่านั้น ไม่อาจใช้วิธีการทำให้เป็นข้อมูลนิรนาม (anonymization) ได้
2. นอกเหนือจากการลบ ทำลาย หรือทำให้ข้อมูลส่วนบุคคลเป็นข้อมูลที่ไม่สามารถระบุตัวตนได้ ตามคำขอของเจ้าของข้อมูลแล้ว ให้จัดให้มีระบบตรวจสอบเพื่อทำลายข้อมูลส่วนบุคคลที่พ้นระยะเวลาเก็บรักษา', 'met', 'DPO', 'ทุกรอบการประเมินกฎหมาย', '- เอกสารการร้องขอให้ลบจากเจ้าของข้อมูล 
- หลักฐานการลบข้อมูล
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-030') L,
  (values
    (0, 'เป็นการสร้างมาตรฐานเกี่ยวกับการรักษาความมั่นคงปลอดภัยของระบบคลาวด์ โดยมีการเพิ่มนิยาม ดังต่อไปนี้
"บริการคลาวด์" หมายความว่า กลุ่มของบริการคลาวด์ที่มีคุณสมบัติร่วมกันบางอย่าง โดยมีรูปแบบ ดังนี้
(1) การให้บริการโครงสร้างพื้นฐานเป็นหลัก (Infrastructure as a Service) ประกอบด้วยระบบประมวลผลข้อมูล ระบบการจัดเก็บข้อมูล ระบบเครือข่าย และทรัพยากรอื่นๆ ที่เกี่ยวข้องกับระบบประมวลผล โดยผู้ใช้บริการไม่ต้องบริหารจัดการโครงสร้างพื้นฐานที่จำเป็นด้วยตนเอง
(2) การให้บริการแพลตฟอร์ม (Platform as a Service) ประกอบด้วยระบบโปรแกรมงานคอมพิวเตอร์ ระบบฐานข้อมูล และระบบจัดการหรืองานบริการจากคอมพิวเตอร์ ผู้ใช้บริการสามารถพัฒนา ติดตั้ง แลัะปรับแต่งซอฟต์แวร์ได้ โดยไม่ต้องบริหารจัดการในส่วนที่เกี่ยวข้องกับโครงสร้างพื้นฐาน เครือข่าย ระบบปฏิบัติการ และระบบจัดการฐานข้อมูล
(3) การให้บริการซอฟต์แวร์ (Software as a Service) ผู้ให้บริการจัดเตรียมซอฟต์แวร์สำเร็จรูปแล้ว โดยผู้ใช้บริการสามารถกำหนดค่าความต้องการ พารามิเตอร์ ปริมาณหน่วย ประมวลผลข้อมูล หน่วยเก็บข้อมูล และบริหารจัดการเพื่อให้ได้บริการตามวัตถุประสงค์ หรือ
(4) การให้บริการตาม (1)-(3) หรือบริการอื่นตามที่สำนักงานประกาศกำหนด
"ผู้ให้บริการคลาวด์ (Cloud Service Provider : CSP)" หมายความว่า หน่วยงานรัฐหรือเอกชนที่ทำให้บริการคลาวด์ใช้ได้กับผู้ใช้บริการคลาวด์
ทั้งนี้ ผู้ใช้บริการคลาวด์ หมายความถึง หน่วยงาน (รัฐ) ที่มีข้อตกลงอย่างเป็นทางการในการใช้บริการคลาวด์ที่ให้บริการโดยผู้ให้บริการคลาวด์
หน่วยงานควบคุมหรือกำกับดูแลต้องจัดส่งผลสรุปรายงานการดำเนินการต่อสำนักงานภายใน 30 วันนับแต่วันที่ดำเนินการแล้วเสร็จ', 'met', 'QA/Legal', '-', '-
การรายงานผล: -', 'บริษัทจะเกี่ยวข้องกับประกาศฉบับนี้ในแง่ผู้ใช้บริการเป็นหลัก อย่างไรก็ดี ในส่วนของผู้ให้บริการ ที่ยังมีความคลุมเครือว่าการที่บริษัทเป็นผู้เข้าทำสัญญากับลูกค้าเพื่อให้บริการที่มี CS ประกอบอยู่ด้วยนั้น จะทำให้บริษัทต้องตกเป็นผู้ให้บริการตามนิยามของประกาศนี้ด้วยหรือไม่ อย่างไรก็ดี เพื่อป้องกันปัญหาดังกล่าว ฝ่ายกฎหมายจะดำเนินการรวบรวมข้อมูล และพูดคุยกับทีมเซลล์ และฝ่ายกฎหมาย CCS ต่อไป เกี่ยวกับการดำเนินการในการนำบริการ CS ไปขายต่อ
1. Consortium หรือ
2. ดำเนินกรเหมือน Microsoft ที่เราเป็นเพียง Authorized Dealer/Distributor โดยลูกค้าต้องลงนามยอมรับ End User Terms & Conditions โดยตรงกับ CCS เองด้วย')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-031') L,
  (values
    (0, 'ให้คงเก็บภาษีมูลค่าเพิ่มในอัตราร้อยละ 6.3 สำหรับการขายสินค้า การให้บริการ หรือการนำเข้าทุกกรณี ซึ่งความรับผิดในการเสียภาษีมูลค่าเพิ่มเกิดขึ้นตั้งแต่วันที่ 1 ตุลาคม 2560 ถึงวันที่ 30 กันยายน 2568', 'met', 'บัญชี', 'ดำเนินการอย่างต่อเนื่อง', 'เอกสารการเสียภาษีมูลค่าเพิ่ม
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-032') L,
  (values
    (0, '- การเข้ายื่นข้อเสนอกับหน่วยงานของรัฐในการจัดซื้อจัดจ้างที่มีวงเงินเกิน 300 ล้านบาทขึ้นไป ผู้ประกอบการต้องทำ ดังนี้
1.	ทำมาตรฐานขั้นต่ำของนโยบายและแนวทางป้องกันการทุจริตในการจัดซื้อจัดจ้างที่เหมาะสมเป็นหนังสือ
2.	ยื่นแบบตรวจสอบข้อมูลของผู้ประกอบการและหลักฐานอ้างอิง
- กรณีที่ผู้ประกอบการได้รับการรับรองมาตรฐานเกี่ยวกับการป้องกันการทุจริต ดังนี้ ถือว่าได้จัดให้มีมาตรฐานขั้นต่ำของนโยบายและแนวทางป้องกันการทุจริตในการจัดซื้อจัดจ้างแล้ว
1.	ISO 37001 ระบบการจัดการต่อต้านการให้และรับสินบน (Anti-Bribery Management Systems)
2.	การรับรองจากแนวร่วมต่อต้านคอร์รัปชันภาคเอกชนไทย (CAC Certified)
3.	หรืออื่นๆ ตามที่คณะกรรมการ ค.ป.ท. กำหนด', 'met', '-', '-', '-
การรายงานผล: -', 'จากการทวนสอบ จัสเทล ยังไม่มีงานยื่นข้อเสนอกับหน่วยงานของรัฐในการจัดซื้อจัดจ้างที่มีวงเงินเกิน 300 ล้านบาทขึ้นไป')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-033') L,
  (values
    (0, 'มาตรฐานเลขที่ มอก. 60793 เล่ม 1 (1) - 2567
-	ระบุรายการและให้ข้อแนะนำในการใช้เอกสารที่ระบุคุณลักษณะที่ต้องสำหรับการวัดและทดสอบเส้นใยนำแสง ซึ่งจะช่วยในการตรวจสอบเส้นใยนำแสงและเคเบิ้ลเพื่อจุดประสงค์เชิงพาณิชย์
-	วิธีการวัดและทดสอบแต่ละวิธีจะอธิบายไว้ในเล่มต่างๆ ของอนุกรม IEC 60793 โดยมีการระบุตาม IEC 60793-1-X โดยที่ X จะเป็นหมายเลขที่ระบุถึงเอกสารเล่มย่อยต่างๆ ในอนุกรม IEC 60793-1
-	โดยทั่วไปวิธีการวัดและทดสอบใช้ได้กับเส้นใยนำแสงแบบหลายโหมด ทุกประเภท A และเส้นใยนำแสงแบบโหมดเดี่ยวประเภทชั้น B และประเภทชั้น C ซึ่งครอบคลุมตามอนุกรม IEC 60793-2 ที่เกี่ยวกับข้อกำหนดคุณลักษณะผลิตภัณฑ์แต่อาจมีข้อยกเว้นในบางกรณี ในข้อ 1. ของแต่ละเล่มในอนุกรม IEC 60793 กล่าวถึงขอบข่ายสำหรับแต่ละคุณลักษณะเฉพาะตัวไว้', 'met', 'Implement', '-', '-
การรายงานผล: -', '1) ไม่เกี่ยวข้อง เนื่องจากบริษัท เป็นผู้ใช้งานสายใยนำแสง จึงไม่มีเครื่องมือสำหรับการทดสอบ
2) นำมาประยุกต์ใช้งาน โดยจัดซื้อมาตรฐานด้านเส้นใยนำแสงและเคเบิลเส้นใยนำแสงฉบับล่าสุด เพืออ่านและประยุกต์ใช้งาน กรณีที่สามารถทำได้ อ้างอิง 	
FE 67/01771
https://jastel.my.salesforce.com/a5MJ3000002Zfro')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-034') L,
  (values
    (0, 'มาตรฐานเลขที่ มอก. 60793 เล่ม  1 (31) - 2567
-	ระบุค่าความต้านแรงดึงภายใต้การโหลดเชิงพลวัติของตัวอย่างเส้นใยนำแสง โดยวิธีนี้จะทดสอบความยาวแต่ละส่วนของเส้นใยนำแสงที่ไม่เป็นสายเคเบิ้ลและไม่เป็นกลุ่มเส้นใยนำแสง การทำให้เส้นใยนำแสงเสียหายเกิดจากการควบคุมการเพิ่มขึ้นของค่าความเค้นและความเครียดอย่างสม่ำเสมอตลอดความยาวเส้นใยและส่วนหน้าตัด ค่าความเค้นและค่าความเครียดจะเพิ่มขึ้นในอัตราคงที่จนกระทั่งเส้นใยขาด
-	การกระจายของค่าความต้านแรงดึงของเส้นใยนำแสงที่ให้ไว้ขึ้นอยู่กับความยาวของตัวอย่างทดสอบ ความเร็วของโหลด และภาวะแวดล้อม การทดสอบสามารถใช้ตรวจสอบหากต้องการข้อมูลทางสถิติของความแข็งแรงเส้นใย ผลการทดสอบให้รายงานในรูปแบบของการกระจายเชิงสถิติของการควบคุมคุณภาพ โดยปกติควรดำเนินการทดสอบหลังการปรับสภาวะอุณหภูมิและความชื้นของตัวอย่างทดสอบ อย่างไรก็ตามบางกรณีอาจทำการทดสอบภายใต้ภาวะอุณหภูมิและความชื้นโดยรอบก็ได้
-	สามารถใช้วิธีนี้กับเส้นใยนำแสงประเภท A1 ประเภท A2 ประเภท A3 ประเภทชั้น B และประเภทชั้น C
-	วัตถุประสงค์ของมาตรฐานนี้คือ กำหนดคุณลักษณะที่ต้องการสำหรับลักษณะเฉพาะทางกลเรื่องความต้านแรงดึง', 'met', 'Implement', '-', '-
การรายงานผล: -', '1) ไม่เกี่ยวข้อง เนื่องจากบริษัท เป็นผู้ใช้งานสายใยนำแสง จึงไม่มีเครื่องมือสำหรับการทดสอบ
2) นำมาประยุกต์ใช้งาน โดยจัดซื้อมาตรฐานด้านเส้นใยนำแสงและเคเบิลเส้นใยนำแสงฉบับล่าสุด เพืออ่านและประยุกต์ใช้งาน กรณีที่สามารถทำได้ อ้างอิง 	
FE 67/01771
https://jastel.my.salesforce.com/a5MJ3000002Zfro')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-035') L,
  (values
    (0, 'มาตรฐานเลขที่ มอก. 60793 เล่ม 1 (32) – 2567 
-	มีจุดมุ่งหมายหลักเพื่อทดสอบเส้นใยแก้วทั้งที่ผลิตจากโรงงานหรือเส้นใยนำแสงที่ต่อมาถูกเคลือบเพิ่มเติม (tight buffered) ด้วยพอลิเมอร์ชนิดต่างๆ การทดสอบนี้สามารถใช้กับเส้นใยนำแสงทั้งหลังการผลิตหรือหลังจากเส้นใยนำแสงอยู่ในภาวะแวดล้อมต่างๆ แล้ว
-	สามารถใช้วิธีนี้กับเส้นใยนำแสงประเภท A1 ประเภท A2 ประเภท A3 ประเภทชั้น B และประเภทชั้น C ที่แก้วมีมิติระบุเป็น 125 µm
-	วัตถุประสงค์ของมาตรฐานนี้คือ กำหนดคุณลักษณะที่ต้องการสำหรับลักษณะเฉพาะทางกลเรื่องความสามารถในการลอกของสารเคลือบ การทดสอบนี้เพื่อหาปริมาณแรงที่ต้องใช้ในการลอกของสารเคลือบป้องกันออกจากเส้นใยนำแสงตามแนวยาว
-	การทดสอบนี้ไม่มีจุดมุ่งหมายเพื่อเพิ่มความแข็งแรงของเส้นใยนำแสงหลังลอกสารเคลือบรวมทั้งไม่มีเจตนาระบุภาวะที่ดีที่สุดในการลอกสารเคลือบ
-	การทดสอบนี้ออกแบบไว้สำหรับเส้นใยนำแสงที่มีการเคลือบพอลิเมอร์ ซึ่งมีเส้นผ่านศูนย์กลางภายนอกระบุอยู่ในช่วงพิสัย 200 µm ถึง 900 µm', 'met', 'Implement', '-', '-
การรายงานผล: -', '1) ไม่เกี่ยวข้อง เนื่องจากบริษัท เป็นผู้ใช้งานสายใยนำแสง จึงไม่มีเครื่องมือสำหรับการทดสอบ
2) นำมาประยุกต์ใช้งาน โดยจัดซื้อมาตรฐานด้านเส้นใยนำแสงและเคเบิลเส้นใยนำแสงฉบับล่าสุด เพืออ่านและประยุกต์ใช้งาน กรณีที่สามารถทำได้ อ้างอิง 	
FE 67/01771
https://jastel.my.salesforce.com/a5MJ3000002Zfro')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-036') L,
  (values
    (0, 'มาตรฐานเลขที่ มอก. 60793 เล่ม 1 (34) – 2567
-	กำหนดคุณลักษณะที่ต้องการสำหรับลักษณะเฉพาะทางกลเรื่องความคดเส้นใยหรือความคดแฝงในเส้นใยที่ไม่มีการเคลือบ เช่น ความยาวที่ระบุของเส้นใยที่ลอกสารเคลือบออกแล้ว ความคดเส้นใยเป็นพารามิเตอร์ที่สำคัญสำหรับการลดความสูญเสียของการเชื่อมเส้นใยนำแสง (splicing) เมื่อใช้เครื่องเชื่อมเส้นใยนำแสงแบบพาสซีฟ (passive alignment fusion splicer)
-	วิธีการวัดที่ใช้ในการวัดความคดเส้นใยในเส้นใยที่ไม่มีการเคลือบมี 2 วิธี คือ
o	วิธี A : การใช้กล้องจุลทรรศน์แบบมุมมองด้านข้าง (side view microscopy)
o	วิธี B : การกระเจิงของลำแสงแลเซอร์ (laser beam scattering)
-	วิธีการวัดทั้งสองวิธีใช้วัดรัศมีความคดของเส้นใยที่ไม่มีการเคลือบ ซึ่งหากได้จากค่าความเบี่ยงเบนที่เกิดขึ้นตรงจุดปลายเส้นใยนำแสงที่หมุนรอบแกนของเส้นใยนำแสงอย่างอิสระ วิธี A ใช้วีดิทัศน์แบบภาพหรือแบบดิจิทัลเพื่อหาความเบี่ยงเบนของเส้นใย ในขณะที่วิธี B ใช้เซนเซอร์แบบตรวจจับเส้นเพื่อวัดความเบี่ยงเบนสูงสุดของลำแสงเลเซอร์เทียบกับลำแสงเลเซอร์อ้างอิง
-	จากการวัดพฤติกรรมการเบี่ยงเบนของเส้นใยขณะหมุนรอบแกนของเส้นใยนำแสงและการพิจารณารูปร่างเรขาคณิตของอุปกรณ์วัดพบว่า รัศมีความคดของเส้นใยสามารถคำนวณได้จากแบบจำลองทรงอย่างง่ายซึ่งการเบี่ยงเบนให้ไว้ในภาคผนวก C
-	วิธีการวัดทั้งสองวิธีสามารถใช้ได้กับเส้นใยนำแสงประเภทชั้น B ตามที่อธิบายไว้ใน IEC 60793 (ทุกเล่ม)
-	วิธี A ใช้เป็นวิธีทดสอบอ้างอิงซึ่งใช้แก้ไขข้อพิพาท', 'met', 'Implement', '-', '-
การรายงานผล: -', '1) ไม่เกี่ยวข้อง เนื่องจากบริษัท เป็นผู้ใช้งานสายใยนำแสง จึงไม่มีเครื่องมือสำหรับการทดสอบ
2) นำมาประยุกต์ใช้งาน โดยจัดซื้อมาตรฐานด้านเส้นใยนำแสงและเคเบิลเส้นใยนำแสงฉบับล่าสุด เพืออ่านและประยุกต์ใช้งาน กรณีที่สามารถทำได้ อ้างอิง 	
FE 67/01771
https://jastel.my.salesforce.com/a5MJ3000002Zfro')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-037') L,
  (values
    (0, 'ให้ดำเนินการจัดเก็บเงินสะสมและเงินสมทบกองทุนสงเคราะห์ลูกจ้างตั้งแต่วันที่ 1 ตุลาคม 2568 เป็นต้นไป', 'met', 'Hr Group', 'ดำเนินการอย่างต่อเนื่อง', 'กองทุนสำรองเลี้ยงชีพ
การรายงานผล: -', 'QA-จากการทวนสอบกฎหมายที่เกี่ยวข้อง พรบ.คุ้มครองแรงงาน พ.ศ. 2551 หมวด 13 มาตรา 130 บริษัทฯ อาจได้รับการยกเว้นตามวรรคสอง (เรื่องจัดให้มีกองทุนสำรองเลี้ยงชีพแล้ว)')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-038') L,
  (values
    (0, 'ผู้ได้รับอนุญาตใช้เขตทางหลวงท้องถิ่น ให้ดำเนินการ
1.	สร้างอาคารหรือสิ่งอื่นใดในเขตทางหลวงท้องถิ่นหรือรุกล้ำเข้าไปในเขตทางหลวงท้องถิ่น
2.	ปักเสา พาดสาย วางท่อ หรือกระทำการใดๆในเขตทางหลวงท้องถิ่น

ค่าใช้เขตทางหลวงท้องถิ่น ดังนี้
1.	กิจกรรมประโยชน์สาธารณะ บริการสาธารณะแก่ประชาชนทั่วไป (ประชาชนใช้ประโยชน์/บริการได้โดยไม่ถูกเรียกเก็บค่าใช้บริการ) 500 บาท/การอนุญาตแต่ละครั้ง
2.	กิจกรรมให้บริการสาธารณะขั้นพื้นฐาน ประชาชนสามารถใช้ประโยชน์/บริการได้ และถูกเรียกเก็บค่าใช้บริการ ดังนี้
a.	กิจกรรมของหน่วยงานรัฐที่ให้บริการสาธารณะ คิดอัตรา 500 บาท/การอนุญาตแต่ละครั้ง
b.	กิจกรรมของผู้ได้รับอนุญาตนอกจากหน่วยงานรัฐ ให้ชำระเป็นรายปี ในอัตรากึ่งหนึ่งของอัตราที่กำหนดท้ายกฎกระทรวงนี้
3.	กิจกรรมมุ่งหวังประโยชน์ทางธุรกิจ แสวงหากำไรหรือเอื้อประโยชน์ต่อการดำเนินธุรกิจของผู้ได้รับอนุญาตใช้เขตทางหลวงท้องถิ่น ให้ชำระค่าใช้เขตทางหลวงท้องถิ่นเป็นรายปี ในอัตราตามที่กำหนดท้ายกฎกระทรวงนี้
การชำระค่าใช้เขตทางหลวง เป็นรายปี 
(1) ในปีแรก ให้ชำระภายในสามสิบวันนับแต่วันที่ได้รับอนุญาตใช้เขตทางหลวงท้องถิ่น  
(2) ในปีต่อไป ให้ชำระไม่เกินวันครบกำหนดรอบปีนับแต่วันที่ได้รับอนุญาต', 'met', 'Implementation
IPLC', 'ดำเนินการอย่างต่อเนื่อง', 'เอกสารการชำระเงิน
การรายงานผล: การชำระเงินต่อเขตทางหลวงท้องถิ่น', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-039') L,
  (values
    (0, '1.	การซ่อมแซมอาคารหรือทรัพย์ที่ประกอบกับตัวอาคารหรือในที่ดิน จากอุทกภัย ระหว่างวันที่ 16 สิงหาคม – 31 ธันวาคม 2567
a.	ทรัพย์สินที่อยู่ในพื้นที่ที่ทางราชการประกาศให้เป็นเขตพื้นที่ประสบสาธารณภัยหรือเขตการให้ความช่วยเหลือผู้ประสบภัยพิบัติกรณีฉุกเฉิน 
b.	ที่ได้รับความเสียหายจากอุทกภัยระหว่างวันที่ 16 สิงหาคม – 31 ธันวาคม 2567 
c.	เป็นเจ้าของกรรมสิทธิ์ / ผู้เช่า / ผู้ใช้ประโยชน์จากทรัพย์สินที่เสียหายนั้น
d.	เพื่อเป็นที่อยู่อาศัย / ใช้ประกอบกิจการ / ใช้ประโยชน์อื่น
e.	ได้จ่ายค่าซ่อมแซมหรือค่าวัสดุในการซ่อมแซมทรัพย์สินนั้นมากกว่า 1 แห่ง ให้รวมคำนวณเข้าด้วยกัน
f.	คิดตามจำนวนจริงแต่ไม่เกิน 1 แสนบาท เป็นเงินได้พึงประเมินที่ได้รับยกเว้นไม่ต้องรวมคำนวณเพื่อเสียภาษีเงินได้
2.	การซ่อมแซมรถ หรืออุปกรณ์หรือสิ่งอำนวยความสะดวกในรถ ได้รับความเสียหายจากอุทกภัย ระหว่างวันที่ 16 สิงหาคม – 31 ธันวาคม 2567
a.	ทรัพย์สินที่อยู่ในพื้นที่ที่ทางราชการประกาศให้เป็นเขตพื้นที่ประสบสาธารณภัยหรือเขตการให้ความช่วยเหลือผู้ประสบภัยพิบัติกรณีฉุกเฉิน
b.	ที่ได้รับความเสียหายจากอุทกภัยระหว่างวันที่ 16 สิงหาคม – 31 ธันวาคม 2567
c.	เป็นเจ้าของกรรมสิทธิ์ / ผู้เช่า 
d.	ได้จ่ายค่าซ่อมแซมหรือค่าวัสดุหรืออุปกรณ์ในการซ่อมแซมรถหรืออุปกรณ์หรือสิ่งอำนวยความสะดวกในรถ มากกว่า 1 คัน ให้ควมคำนวณเข้าด้วยกัน
e.	คิดตามจำนวนจริงแต่ไม่เกิน 3 หมื่นบาท เป็นเงินได้พึงประเมินที่ได้รับยกเว้นไม่ต้องรวมคำนวณเพื่อเสียภาษีเงินได้', 'met', 'Site support', 'ตามรอบการประเมินกฎหมาย', 'ตามราชการกำหนด
การรายงานผล: ส่วนราชการที่รับผิดชอบ', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-040') L,
  (values
    (0, '"เพื่อยกเว้นภาษีเงินได้ ภาษีมูลค่าเพิ่ม ภาษีธุรกิจเฉพาะ และอากรแสตมป์ในบางกรณี
-	ให้ยกเว้นภาษีเงินได้ สำหรับการบริจาคผ่านระบบบริจาคอิเล็คทรอนิกส์ให้แก่สำนักงานบริหารและพัฒนาองค์ความรู้ (องค์กรมหาชน)
ที่ได้กระทำตั้งแต่วันที่ 1 มกราคม 2568 – 31 ธันวาคม 2568 โดยสำหรับนิติบุคคล ให้ยกเว้นสำหรับเงินได้จำนวน 2 เท่าของรายจ่ายที่บริจาค ไม่ว่าจะได้จ่ายเป็นเงินหรือทรัพย์สิน
-	ต้องนำเงินได้ที่ได้รับยกเว้นข้างต้น มารวมคำนวณกับรายจ่ายที่ได้มีพระราชกฤษฎีกาที่ออกตามความในประมวลรัษฎากรกำหนดให้มีการได้รับยกเว้นภาษีเงินได้เป็นจำนวน 2 เท่าของรายจ่ายและไม่เกินร้อยละ 10 ของกำไรสุทธิก่อนหักรายจ่ายเพื่อการกุศลสาธารณะหรือเพื่อการสาธารณประโยชน์ และรายจ่ายเพื่อการศึกษาหรือเพื่อการกีฬาตามมาตรา 65 ตรี (3) (ข) แห่งประมวลรัษฎากร และ เมื่อรวมคำนวณรายจ่ายตามข้างต้นแล้ว ต้องไม่เกินร้อยละ 10 ของกำไรสุทธิก่อนหักรายจ่ายเพื่อการกุศลสาธารณะหรือเพื่อการสาธารณประโยชน์ และรายจ่ายเพื่อการศึกษาหรือเพื่อการกีฬาตามมาตรา 65 ตรี (3) (ข) แห่งประมวลรัษฎากร
-	ให้ยกเว้นภาษีเงินได้ ภาษีมูลค่าเพิ่ม ภาษีธุรกิจเฉพาะ และอากรแสตมป์ ให้แก่นิติบุคคล สำหรับเงินได้ที่ได้รับจากการโอนทรัพย์สิน หรือการขายสินค้า หรือสำหรับการกระทำตราสารอันเนื่องมาจากการบริจาคให้แก่สำนักงานบริหาร และพัฒนาองค์ความรู้ (องค์การมหาชน) โดยผู้โอนจะต้องไม่นำต้นทุนของทรัพย์สินหรือสินค้า ซึ่งได้รับยกเว้นภาษีดังกล่าวมาหักเป็นค่าใช้จ่ายในการคำนวณภาษีเงินได้ของนิติบุคคล สำหรับการบริจาคที่ได้กระทำตั้งแต่วันที่ 1 มกราคม 2568 – 31 ธันวาคม 2568 
-	นิติบุคคลที่ได้ใช้สิทธิยกเว้นภาษีเงินได้ ตามพระราชกฤษฎีกานี้ ต้องไม่นำเงินบริจาคที่ได้ใช้สิทธิยกเว้นภาษีเงินได้ดังกล่าวไปหักลดหย่อนเป็นเงินบริจาคตามมาตรา 47 (7) (ข) แห่งประมวลรัษฎากร หรือต้องไม่นำเงินหรือทรัพย์สินที่ได้ใช้สิทธิยกเว้นภาษีเงินได้ดังกล่าวไปหักเป็นรายจ่ายตามมาตรา 65 ตรี (3) (ข) แห่งประมวลรัษฎากร แล้วแต่กรณีอีก
"', 'met', 'บัญชี', 'ตามรอบการประเมินกฎหมาย', '-
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-041') L,
  (values
    (0, 'เพื่อยกเว้นภาษีเงินได้ ภาษีมูลค่าเพิ่ม ภาษีธุรกิจเฉพาะ และอากรแสตมป์ในบางกรณี
-	ให้ยกเว้นภาษีเงินได้ สำหรับการบริจาคผ่านระบบบริจาคอิเล็คทรอนิกส์ให้แก่สภากาชาดไทยหรือมูลนิธิที่ได้กระทำตั้งแต่วันที่ 1 มกราคม 2568 – 31 ธันวาคม 2568 โดยสำหรับนิติบุคคล ให้ยกเว้นสำหรับเงินได้จำนวน 2 เท่าของรายจ่ายที่บริจาค ไม่ว่าจะได้จ่ายเป็นเงินหรือทรัพย์สิน
-	ต้องนำเงินได้ที่ได้รับยกเว้นข้างต้น มารวมคำนวณกับรายจ่ายที่ได้มีพระราชกฤษฎีกาที่ออกตามความในประมวลรัษฎากรกำหนดให้มีการได้รับยกเว้นภาษีเงินได้เป็นจำนวน 2 เท่าของรายจ่ายและไม่เกินร้อยละ 10 ของกำไรสุทธิก่อนหักรายจ่ายเพื่อการกุศลสาธารณะหรือเพื่อการสาธารณประโยชน์ และรายจ่ายเพื่อการศึกษาหรือเพื่อการกีฬาตามมาตรา 65 ตรี (3) (ข) แห่งประมวลรัษฎากร และ เมื่อรวมคำนวณรายจ่ายตามข้างต้นแล้ว ต้องไม่เกินร้อยละ 10 ของกำไรสุทธิก่อนหักรายจ่ายเพื่อการกุศลสาธารณะหรือเพื่อการสาธารณประโยชน์ และรายจ่ายเพื่อการศึกษาหรือเพื่อการกีฬาตามมาตรา 65 ตรี (3) (ข) แห่งประมวลรัษฎากร
-	ให้ยกเว้นภาษีเงินได้ ภาษีมูลค่าเพิ่ม ภาษีธุรกิจเฉพาะ และอากรแสตมป์ ให้แก่นิติบุคคล สำหรับเงินได้ที่ได้รับจากการโอนทรัพย์สิน หรือการขายสินค้า หรือสำหรับการกระทำตราสารอันเนื่องมาจากการบริจาคให้แก่สำนักงานบริหาร และพัฒนาองค์ความรู้ (องค์การมหาชน) โดยผู้โอนจะต้องไม่นำต้นทุนของทรัพย์สินหรือสินค้า ซึ่งได้รับยกเว้นภาษีดังกล่าวมาหักเป็นค่าใช้จ่ายในการคำนวณภาษีเงินได้ของนิติบุคคล สำหรับการบริจาคที่ได้กระทำตั้งแต่วันที่ 1 มกราคม 2568 – 31 ธันวาคม 2568 
-	นิติบุคคลที่ได้ใช้สิทธิยกเว้นภาษีเงินได้ ตามพระราชกฤษฎีกานี้ ต้องไม่นำเงินบริจาคที่ได้ใช้สิทธิยกเว้นภาษีเงินได้ดังกล่าวไปหักลดหย่อนเป็นเงินบริจาคตามมาตรา 47 (7) (ข) แห่งประมวลรัษฎากร หรือต้องไม่นำเงินหรือทรัพย์สินที่ได้ใช้สิทธิยกเว้นภาษีเงินได้ดังกล่าวไปหักเป็นรายจ่ายตามมาตรา 65 ตรี (3) (ข) แห่งประมวลรัษฎากร แล้วแต่กรณีอีก', 'met', 'บัญชี', 'ตามรอบการประเมินกฎหมาย', '-
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-042') L,
  (values
    (0, 'จัสเทลอยู่ในนิยามความหมายของ “ผู้ให้บริการโทรคมนาคมรายอื่น”
1.	มาตรา 4/1 (เพิ่มใหม่) 
	วรรค 1 - กำหนดให้ ธปท. สำนักงาน กลต. กสทช. สำนักงาน กสทช. และคณะกรรมการธุรกรรมทางอิเล็คทรอนิกส์ มีอำนาจในการกำหนดมาตรฐานเพื่อป้องกันอาชญากรรมทางเทคโนโลยี
            วรรค 2 - กำหนดให้ ผู้ให้บริการเครือข่ายโทรศัพท์ และผู้ให้บริการโทรคมนาคมรายอื่น มีหน้าที่ตรวจสอบเพื่อคัดกรองเนื้อหาบริการสารสั้น (SMS) ที่อาจเกี่ยวข้องกับอาชญากรรมทางเทคโนโลยีตามมาตรฐาน หรือมาตรการที่ สำนักงาน กสทช. กำหนด
2.	มาตรา 5 วรรค 2 และ 3 (เพิ่มใหม่)
	วรรค 2 – กรณีปรากฏพยานหลักฐานอันควรเชื่อได้ว่ามีการใช้บริการโทรคมนาคมเพื่อกระทำผิดอาชญากรรมทางเทคโนโลยี สำนักงาน กสทช. สั่งให้ผู้ให้บริการเครือข่ายโทรศัพท์ ผู้ให้บริการโทรคมนาคมรายอื่น และผู้ให้บริการอื่นที่เกี่ยวข้องกับการกระทำนั้น ระงับการให้บริการโทรคมนาคมดังกล่าว
	วรรค 3 - การยกเลิกการระงับการให้บริการตามวรรค 2 ให้เป็นไปตามหลักเกณฑ์ วิธีการ และเงื่อนไขที่ สตช. DSI ปปง. สำนักงาน กสทช. และ ศปอท. เห็นชอบร่วมกัน
3.	มาตรา 8/10 (เพิ่มใหม่)
ให้สถาบันการเงินหรือผู้ประกอบธุรกิจ ผู้ให้บริการเครือข่ายโทรศัพท์ ผู้ให้บริการโทรคมนาคมรายอื่น ผู้ให้บริการอื่นที่เกี่ยวข้อง  หรือผู้ให้บริการสื่อสังคมออนไลน์ มีส่วนร่วมรับผิดชอบในความเสียหายที่เกิดจากอาชญากรรมทางเทคโนโลยี เว้นแต่ จะพิสูจน์ได้ว่าสถาบันการเงินหรือผู้ประกอบธุรกิจ ผู้ให้บริการเครือข่ายโทรศัพท์ ผู้ให้บริการโทรคมนาคมรายอื่น ผู้ให้บริการอื่นที่เกี่ยวข้อง หรือผู้ให้บริการสื่อสังคมออนไลน์ ได้ปฏิบัติตามมาตรฐานหรือมาตรการป้องกันอาชญากรรมทางเทคโนโลยีที่กำหนดโดย ธปท. สำนักงาน กลต. กสทช. สำนักงาน กสทช. หรือคณะกรรมการธุรกรรมทางอิเล็คทรอนิกส์ แล้วแต่กรณี', 'met', 'IPLC', 'ตามรอบการประเมินกฎหมาย', 'เอกสารตามแนวทางที่จัดการ
''• ก่อนการให้บริการ จัดให้มีการตรวจสอบสถานที่ติดตั้งที่ขอใช้บริการ โดยการ Survey และการประเมินความเสี่ยงสำหรับพื้นที่ติดตั้งที่ได้รับการร้องขอจากผู้ขอใช้บริการ
• ภายหลังการให้บริการ มีการตรวจสอบจุดติดตั้งการให้บริการทุก 6 เดือน และดำเนินการตรวจสอบพิเศษในกรณีที่เกิดเหตุขัดข้อง เพื่อป้องกันการนำระบบไปใช้ในทางที่ไม่เหมาะสมหรือก่อให้เกิดความเสียหาย
• มีมาตรการการระงับการให้บริการ และยกเลิกสัญญาบริการทันที หากตรวจพบผู้ใช้บริการนำบริการที่ได้รับจากบริษัทฯ ไปใช้โดยมิชอบด้วยกฎหมายหรือฝ่าฝืนต่อสัญญาโดยเป็นเงื่อนไขที่กำหนดอยู่ในสัญญาของบริษัทฯ
การรายงานผล: ตามกฎหมายกำหนด', 'รอความชัดเจนของกฎหมายลูกด้วย'),
    (1, 'ดังนั้น ตามที่ พรก. กำหนดเป็นการเพิ่มเติม ในส่วนที่บริษัทฯ จะต้องรับผิดชอบในความเสียหายที่เกิดจากอาชญากรรมทางเทคโนโลยีนั้น ยังคงต้องรอมาตรการป้องกันอาชญากรรมทางเทคโนโลยีที่กำหนดโดย กสทช / สำนักงาน กสทช. หรือหน่วยงานภาครัฐที่เกี่ยวเนื่อง และเกี่ยวข้องอีกครั้งหนึ่ง

นอกจากนี้ ในส่วนที่อาจเกี่ยวข้องกับบริษัทฯ หากบริษัทมีลูกค้าประเภท “ผู้ประกอบธุรกิจสินทรัพย์ดิจิทัล” ในมาตรา 7/1 ของพรก. โดยหากพนักงานเจ้าหน้าที่ตรวจพบการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ว่ามีผู้ประกอบธุรกิจสินทรัพย์ดิจิทอลโดยไม่ได้รับอนุญาตตามกฎหมายว่าด้วยการประกอบธุรกิจสินทรัพย์ดิจิทัล พนักงานเจ้าหน้าที่ดังกล่าวสามารถมีคำสั่ง “ระงับ” การทำให้แพร่หลายของข้อมูลคอมพิวเตอร์ หรือนำข้อมูลคอมพิวเตอร์ที่ผิดกฎหมายออกจากระบบคอมพิวเตอร์ทันที 

ทั้งนี้ หากผู้ได้รับคำสั่งไม่ปฏิบัติตามมาตรา 7/1 ตามมาตรา 8/12 ของ พรก. กำหนดให้ต้องระวางโทษจำคุกไม่เกิน 1 ปี หรือปรับไม่เกิน 100,000 บาท หรือทั้งจำทั้งปรับ', 'met', NULL, NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-043') L,
  (values
    (0, 'ผู้ที่ยื่นข้อเสนอเพื่อทำการจัดซื้อจัดจ้างกับหน่วยงานรัฐ ไม่มีสิทธิอุทธรณ์เกี่ยวกับการจัดซื้อจัดจ้างพัสดุ ในเรื่องดังนี้
1.	คุณสมบัติของผู้ยื่นข้อเสนอรายอื่นที่เข้าร่วมการจัดซื้อจัดจ้างพัสดุในครั้งนั้น ในกรณีที่หน่วยงานของรัฐจัดซื้อจัดจ้างโดยวิธีประกาศเชิญชวนทั่วไป ด้วยวิธีตลาดอิเล็กทรอนิกส์
2.	ขอบเขตของงานหรือรายลเอียดคุณลักษณะเฉพาะของพัสดุ ในกรณีที่หน่วยงานของรัฐเปิดโอกาสให้มีการรับฟังความคิดเห็นจากผู้ประกอบการก่อนจะทำการจัดซื้อจัดจ้าง และผู้ซึ่งได้ยื่นข้อเสนอนั้นมิได้วิจารณ์หรือเสนอแนะร่างขอบเขตของงานหรือรายละเอียดคุณลักษณะเฉพาะของพัสดุดังกล่าว
3.	การที่ผู้ซึ่งได้ยื่นข้อเสนอนั้นมิได้เป็นผู้ประกอบการงานก่อสร้างหรือผู้ประกอบการพัสดุอื่นที่ขึ้นทะเบียนไว้กับกรมบัญชีกลาง ในกรณีที่การจัดซื้อจัดจ้างนั้นเป็นงานก่อสร้างหรือผู้ประกอบการพัสดุอื่นที่ผู้ประกอบการต้องขึ้นทะเบียนไว้กับกรมบัญชีกลางตามมาตรา 51 หรือมาตรา 52 แล้วแต่กรณี
4.	ผลการพิจารณาผู้ได้รับการคัดเลือก ในกรณีที่หน่วยงานของรัฐจัดซื้อจัดจ้างด้วยวิธีคัดเลือกตามมาตรา 56 (1) (ค)
5.	การที่ผู้ซึ่งได้ยื่นข้อเสนอนั้นขาดคุณสมบัติหรือมีลักษณะต้องห้ามตามมาตรา 64 วรรคหนึ่ง
6.	การที่ผู้ซึ่งได้ยื่นข้อเสนอนั้นมิได้ยื่นหลักประกันการเสนอราคาหรือยื่นหลักประกันการเสนอราคาไม่เป็นไปตามที่กำหนดในระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ หรือไม่เป็นไปตามเงื่อนไขการยื่นหลักประกันการเสนอราคาตามที่กำหนดในเอกสารเชิญชวน
7.	การที่ผู้ซึ่งได้ยื่นข้อเสนอนั้นนำผลงานซึ่งเป็นของบุคคลอื่นหรือที่ได้รับโอนจากบุคคลอื่นมายื่นเป็นผลงานของตน อันไม่เป็นไปตามหลักเกณฑ์ที่กำหนดไว้ในเอกสารเชิญชวนหรือหนังสือเชิญชวน
8.	การเปลี่ยนแปลงประกาศผลผู้ชนะการจัดซื้อจัดจ้างหรือผู้ได้รับการคัดเลือก โดยให้ผู้ซึ่งเสนอราคาต่ำหรือผู้ซึ่งได้คะแนนรวมสูงรายถัดไปตามลำดับเป็นผู้ชนะการจัดซื้อจัดจ้างหรือผู้ได้รับการคัดเลือกแทน เนื่องจากผู้ยื่นข้อเสนอรายที่ชนะการจัดซื้อจัดจ้างหรือที่ได้รับการคัดเลือกไว้เดิมไม่ยอมเข้าทำสัญญาหรือข้อตกลงกับหน่วยงานของรัฐภายในเวลาที่กำหนด หรือถูกแจ้งเวียนให้เป็นผู้ทิ้งงานก่อนการทำสัญญาหรือข้อตกลงกับหน่วยงานของรัฐ', 'met', 'ฝ่ายขาย
ฝ่ายกฎหมาย', 'ตามรอบการประเมินกฎหมาย', 'เอกสารการจัดซื้อจัดจ้าง
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-044') L,
  (values
    (0, '1.	หากนายจ้างให้ลูกจ้างในงานเฝ้าดูแลฯ ทำงานล่วงเวลา ต้องจ่ายค่าล่วงเวลาไม่น้อยกว่า 1.25 เท่าของอัตราค่าจ้างต่อชั่วโมงในวันทำงานปกติ และไม่น้อยกว่า 2.5 เท่าของอัตราค่าจ้างต่อชั่วโมงในวันทำงานตามชั่วโมงที่ทำ
2.	สำหรับลูกจ้างที่ไม่ได้รับค่าจ้างเป็นรายเดือน หากตกลงให้ทำงานปกติเกินวันละ 8 ชั่วโมง แต่ไม่เกิน 48 ชั่วโมงต่อสัปดาห์
-	จ่ายค่าตอบแทนในวันทำงานไม่น้อยกว่า 1.25 เท่าของอัตราค่าจ้างต่อชั่วโมง สำหรับชั่วโมงที่ทำเกิน
-	จ่ายค่าตอบแทนในวันหยุดไม่น้อยกว่า 2.5 เท่าของอัตราค่าจ้างต่อชั่วโมง สำหรับชั่วโมงที่ทำเกิน', 'met', 'HR Group', 'ตามรอบการประเมินกฎหมาย', 'เอกสาร OT พนักงาน
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-045') L,
  (values
    (0, 'เดิมกฎหมายกำหนดให้คนต่างด้าวต้องมารับใบอนุญาตทำงานที่นายทะเบียนออกให้ด้วยตัวเองเท่านั้น แต่กฎหมายฉบับนี้แก้ไขให้คนต่างด้าวจะมารับด้วยตนเองก็ได้ หรือโดยวิธีการอื่นตามที่อธิบดีประกาศกำหนดก็ได้', 'met', 'HR', '-', '-
การรายงานผล: -', 'เพื่อทราบ ปัจจุบัน บริษัท ไม่มีพนักงานต่างด้าว')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-046') L,
  (values
    (0, 'ให้คงเก็บภาษีมูลค่าเพิ่มในอัตราร้อยละ 6.3 สำหรับการขายสินค้า การให้บริการ หรือการนำเข้าทุกกรณี ตั้งแต่วันที่ 1 ตุลาคม 2560 ถึงวันที่ 30 กันยายน 2569

*อธิบายเพิ่มเติม	การเก็บภาษีมูลค่าเพิ่ม จะมีภาษีท้องถิ่นอีก 0.7% จึงรวมแล้วเป็น 7%', 'met', 'ACC', '-', 'เอกสารทางบัญชี
การรายงานผล: -', 'เพื่ื่อทราบ')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-047') L,
  (values
    (0, 'กำหนดให้หน่วยงานที่มีภารกิจหรือเป็นผู้ให้บริการโทรคมนาคมระหว่างประเทศผ่านโครงข่ายภาคพื้นดินและภาคพื้นน้ำ เป็นหน่วยงานโครงสร้างพื้นฐานสำคัญทางสารสนเทศ ซึ่งต้องอยู่ภายใต้การกำกับดูแลของสำนักงานคณะกรรมการกิจการกระจายเสียง กิจการโทรทัศน์และกิจการโทรคมนาคมแห่งชาติ', 'met', 'Legal
DPO', NULL, '*** อยู่ระหว่างรอจดหมายแจ้งว่าเข้าข่ายโครงสร้างพื้นฐานหรือไม่', 'เพื่อทราบ')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-048') L,
  (values
    (0, '-	(มาตรา 41 วรรค 1) ลูกจ้างหญิงมีสิทธิลาคลอดได้ไม่เกิน 120 วัน หรือตามวันที่กำหนดในพระราชกฤษฎีกา โดยนายจ้างต้องจ่ายค่าจ้างในอัตราค่าจ้างในวันทำงานปกติแต่จ่ายไม่เกิน 60 วันหรือตามที่กำหนดในพระราชกฤษฎีก่า
-	(มาตรา 41 วรรค 4) ลูกจ้างหญิงที่ใช้สิทธิลาคลอดแล้ว มีสิทธิลาต่อเนื่องเพื่อเลี้ยงดูบุตรได้อีกไม่เกิน 15 วัน สำหรับกรณีที่บุตรเจ็บป่วยเสี่ยงต่อการเกิดโรคแทรกซ้อน มีความผิดปกติ หรือมีภาวะความพิการ (ต้องแสดงใบรับรองแพทย์) โดยนายจ้างต้องจ่ายค่าจ้างในอัตรา 15% ของค่าจ้างสำหรับวันที่ลา
-	(มาตรา 41/1) ลูกจ้างมีสิทธิลาเพื่อช่วยเหลือคู่สมรสที่คลอดบุตรได้ไม่เกิน 15 วัน (ต้องใช้สิทธิก่อนหรือในวันที่ลา ภายใน 90 วันนับแต่วันคลอดบุตร) โดยนายจ้างต้องจ่ายค่าจ้างในอัตราค่าจ้างในวันทำงานปกติตลอดระยะเวลาที่ลา แต่ไม่เกิน 15 วัน', 'met', 'HR', 'ตามรอบการประเมินกฎหมาย', 'คู่มือลูกจ้าง
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-049') L,
  (values
    (0, 'การติดตั้งแผงโซล่าเซลล์ที่มีน้ำหนักรวมในบริเวณที่ติดตั้งไม่เกิน 20 กิโลกรัม/ตารางเมตร บนหลังคาของอาคาร ไม่ต้องขออนุญาตก่อสร้าง (อ.1)', 'met', 'Facility
Metro suppot
Site Support', 'ตามรอบการประเมินกฎหมาย', 'หลักฐานการขออนุญาติดตั้ง
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-050') L,
  (values
    (0, '-	ตั้งแต่วันที่ 1 มกราคม 2569 – 31 ธันวาคม 2571 จำนวนค่าจ้างไม่ต่ำกว่าเดือนละ 1,650 บาท แต่ไม่เกิน 17,500 บาท
-	ตั้งแต่วันที่ 1 มกราคม 2572 – 31 ธันวาคม 2574 จำนวนไม่ต่ำกว่าเดือนละ 1,650 บาท แต่ไม่เกิน 20,000 บาท
-	ตั้งแต่วันที่ 1 มกราคม 2575 เป็นต้นไป จำนวนไม่ต่ำกว่าเดอนละ 1,650 บาท แต่ไม่เกิน 23,000 บาท', 'met', 'HR', 'ตามรอบการประเมินกฎหมาย', 'ตามเงื่อนไขของ HR
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-051') L,
  (values
    (0, '1.	ยกเว้นภาษีเงินสำหรับการบริจาคให้แก่กองทัพอากาศ เพื่อสนับสนุนโครงการสร้างพระสถูปเจดีย์บรรจุพระบรมสารีริกธาตุ บริเวณพื้นที่พระมหาธาตุนภเมทนีดล นภพลภูมิสิริ จังหวัดเชียงใหม่
2.	สำหรับการบริจาคตั้งแต่วันที่ 1 มกราคม 2568 – 31 ธันวาคม 2570
3.	โดยยกเว้นภาษีเงินได้เท่าจำนวนเงินหรือราคาทรัพย์สินที่บริจาค แต่เมื่อรวมกับรายจ่ายเพื่อการกุศลสาธารณะหรือเพื่อการสาธารณประโยชน์แล้วต้องไม่เกินร้อยละ 2 ของกำไรสุทธิ', 'met', 'ACC', '-', 'เอกสารทางบัญชี
การรายงานผล: -', 'เพื่ื่อทราบ')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-052') L,
  (values
    (0, '1.	ยกเว้นภาษีเงินได้ จำนวนเงิน 50% ของเงินที่บริษัทจ่ายในการลงทุนในเครื่องจักรหรืออุปกรณ์ที่มีประสิทธิภาพสูงหรือวัสดุหรืออุปกรณ์เพื่อการอนุรักษ์พลังงานที่มีผลต่อการประหยัดพลังงาน
2.	อุปกรณ์นั้นต้องได้รับการรับรองฉลากแสดงระดับประสิทธิภาพพลังงานระดับ 5 ดาว จากกรมพัฒนาพลังงานทดแทนและอนุรักษ์พลังงานและการไฟฟ้าฝ่ายผลิตแห่งประเทศไทย
3.	ตั้งแต่วันที่พระราชกฤษฎีกานี้ใช้บังคับ ถึงวันที่ 31 ธันวาคม 2571
4.	เกณฑ์การได้รับยกเว้นภาษีเงินได้ ตามกฎหมายนี้ คือ
-	จ่ายเงินแก่ผู้ขายที่จด VAT และต้องได้รับใบกำกับภาษีตามมาตรา 86/4 แบบอิเล็กทรอนิกส์
-	ต้องไม่นำค่าใช้จ่ายที่ใช้สิทธิตามกฎหมายฉบับนี้ไปใช้สิทธิยกเว้นภาษีเงินได้ตามกฎหมายอื่น รวมถึงไม่นำค่าใช้จ่ายไปใช้ในกิจการที่ได้รับยกเว้นภาษีเงินได้นิติบุคคลตามกฎหมายว่าด้วยการส่งเสริมการลงทุน กฎหมายว่าด้วยการเพิ่มขีดความสามารถในการแข่งขันของประเทศสำหรับอุตสาหกรรมเป้าหมาย หรือกฎหมายว่าด้วยเขตพัฒนาพิเศษภาคตะวันออกไม่ว่าทั้งหมดหรือบางส่วน

**หมายเหตุ**
ค่าใช้จ่าย 50% ของการลงทุนนี้ จะหักจากกำไรสุทธิก่อนคำนวณภาษีเงินได้นิติบุคคล', 'met', 'ACC', '-', 'เอกสารทางบัญชี
การรายงานผล: -', 'เพื่ื่อทราบ')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-053') L,
  (values
    (0, '1.	นิติบุคคลที่ประสงค์แก้ไขเพิ่มเติมให้คนต่างด้าวเป็นหุ้นส่วนของห้างหุ้นส่วน หรือให้เป็นกรรมการผู้มีอำนาจลงนามในบริษัทจำกัด

2.	กรณีห้างหุ้นส่วน
-	เดิมผู้เป็นหุ้นส่วนทั้งหมดเป็นสัญชาติไทย หรือมีต่างด้าวรวมหุ้นกันตั้งแต่ 50% ของเงินลงทุน
-	ประสงค์แก้ไขเพิ่มเติมให้คนต่างด้าวถือหุ้นรวมกันไม่ถึง 50% ของเงินลงทุน โดยไม่มีคนต่างด้าวเป็นหุ้นส่วนผู้จัดการ
-	ให้หุ้นส่วนผู้จัดการลงชื่อในหนังสือยืนยันการลงทุนตามแบบฟอร์มท้ายคำสั่ง

3.	กรณีบริษัทจำกัด
-	เดิมกรรมการผู้มีอำนาจลงนามทั้งหมดมีสัญชาติไทย
-	ประสงค์แก้ไขให้คนต่างด้าวเป็นกรรมการผู้มีอำนาจลงนามผูกพันบริษัท
-	ให้กรรมการลงชื่อในหนังสือยืนยันการลงทุนตามแบบฟอร์มท้ายคำสั่ง', 'met', 'Legal', 'เมื่อมีการเปลี่ยนกรรมการใหม่', 'หนังสือรับรองบริษัท
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-054') L,
  (values
    (0, 'ผู้รับใบอนุญาตที่ให้บริการโทรคมนาคมระหว่างประเทศ ต้องไม่นำ IP Address ที่จดทะเบียนในไทยไปให้บริการในต่างประเทศ', 'met', 'Legal / Sales', 'เมื่อมีการซื้อขาย', 'WI-76 การปฎิบัติกรณีรับเอกสารระงับ IP Address Rev.1
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LF' and code='LF-055') L,
  (values
    (0, '1.   สำหรับการบริจาคตั้งแต่วันที่ 1 มกราคม 2568 – 321 ธันวาคม 2570
2.   สำหรับการบริจาคให้แก่กองทัพอากาศ ตามมาตรา 3 (2) แห่งพระราชกฤษฎีกาออกตามความในประมวลรัษฎากรว่าด้วยการยกเว้นรัษฎากร (ฉบับที่ 805) พ.ศ.2569 
	2.1	กรณีบริจาคเป็นเงิน:
		บริจาคผ่านบัญชีธนาคารที่กองทัพอากาศ ชื่อบัญชี “รายได้เพื่อจัดสร้างพระสถูปเจดีย์บรรจุพระบรมสารีริกธาตุของ ทอ.”
	2.2	กรณีบริจาคเป็นทรัพย์สินหรือสินค้า (มูลค่าต้องไม่เกินราคาปกติที่ซื้อขายทั่วไป):
		-   กรณีซื้อทรัพย์สินมาบริจาค ต้องมีหลักฐานการซื้อ ระบุจำนวนและมูลค่าของทรัพย์สิน โดยถือมูลค่าตามหลักฐานเป็นมูลค่าของรายจ่ายที่บริจาค
		-   กรณีนำทรัพย์สินที่บนัทึกบัญชีทรัพย์สินของบริษัทมาบริจาค ให้ถือมูลบค่าต้นทุนส่วนที่เหลือจากการคำนวณหักค่าสึกหรอและค่าเสื่อมเป็นมูลค่ารายจ่ายที่บริจาค
		-   กรณีนำสินค้ามาบริจาค ไม่ว่าจะผลิตเองหรือซื้อมาเพื่อขาย ให้ถือมูลค่าต้นทุนสินค้าที่พิสูจน์ได้เป็นมูลค่ารายจ่ายที่บริจาค
3.   ผู้จะใช้สิทธิยกเว้นภาษีเงินได้ VAT ภาษีธุรกิจเฉพาะ และอากรแสตมป์ ต้องมีเอกสารการบริจาคให้กองทัพอากาศพร้อมให้เจ้าพนักงานประเมินตรวจสอบได้ คือ ใบเสร็จรับเงิน หรือหลักฐานเป็นหนังสืออื่นที่ออกโดยกองทัพอากาศ เช่น หนังสือขอบคุณ ใบประกาศเกียรติคุณ ใบอนุโมทนาบัตร ที่ระบุจำนวนเงิน
4. ถ้ากองทัพอากาศรับบริจาคผ่าน e-Donation ผู้บริจาคไม่ต้องแสดงหลักฐาน', 'met', 'บัญชี', '-', 'เอกสารทางบัญชี
การรายงานผล: -', 'เพื่ื่อทราบ')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LG' and code='LG-001') L,
  (values
    (0, 'มาตรา 96 กําหนดให้นายจ้างที่มีลูกจ้างตั้งแต่ 50 คน ขึ้นไป ต้องจัดให้มีคณะกรรมการสวัสดิการในสถานประกอบกิจการ ประกอบด้วยผู้แทนฝ่ายลูกจ้างแต่เพียงฝ่ายเดียวอย่างน้อย 5 คน เพื่อเป็นตัวแทนของลูกจ้างร่วมปรึกษาหารือกับนายจ้างเพื่อการจัดสวัสดิการภายในสถานประกอบกิจการให้แก่ลูกจ้าง', 'met', NULL, NULL, NULL, NULL),
    (1, 'มาตรา 97 คณะกรรมการสวัสดิการมีอำนาจหน้าที่ดังนี้', 'met', NULL, NULL, NULL, NULL),
    (2, '(1) ร่วมหารือกับนายจ้างเพื่อจัดสวัสดิการแก่ลูกจ้าง 
(2) ห้คำปรึกษาหารือและเสนอแนะความเห็นแก่นายจ้างในการจัดสวัสดิการสำหรับลูกจ้าง 
(3) ตรวจตรา ควบคุม ดูแล การจัดสวัสดิการที่นายจ้างจัดให้แก่ลูกจ้าง 
(4)เสนอข้อคิดเห็นและแนวทางในการจัดสวัสดิการที่เป็นประโยชน์สำหรับลูกจ้างต่อคณะกรรมการ', 'met', NULL, NULL, NULL, NULL),
    (3, 'มาตรา 98 นายจ้างต้องจัดให้มีการประชุมหารือกับคณะกรรมการสวัสดิการในสถานประกอบกิจการอย่างน้อย 3 เดือน ต่อ  1 ครั้ง', 'met', NULL, NULL, NULL, NULL),
    (4, 'มาตรา 99 ให้นายจ้างปิดประกาศการจัดสวัสดิการตามกฎกระทรวงให้ลูกจ้างได้รับทราบ', 'met', NULL, NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='LG' and code='LG-002') L,
  (values
    (0, 'ข้อ 4 ให้นายจ้างจัดให้มีคณะกรรมการสวัสดิการภายใน 30 วัน นับตั้งแต่วันที่มีลูกจ้างครบ 50 คน', 'met', NULL, NULL, NULL, NULL),
    (1, 'ข้อ 6', 'met', NULL, NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-001') L,
  (values
    (0, 'แต่งตั้ง Data Protection Officer', 'met', 'คณะทำงานและ DPO', 'ทุกรอบการประเมินกฎหมาย', '1) ประกาศ DPO
2) Mail / จดหมายแจ้งรายชื่อ DPO ต่อ สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล
การรายงานผล: สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล', NULL),
    (1, 'จัดนโยบายข้อมูลส่วนบุคคล', 'met', 'คณะทำงานและ DPO', 'ทุกรอบการประเมินกฎหมาย', '1) นโยบายการคุ้มครองข้อมูลส่วนบุคคล
2) ปรากฎในเว็ปไซต์ https://www.ccs.jasmine.com/policy_ccs.html
การรายงานผล: สื่อสารให้เจ้าของข้อมูลทราบผ่านทางเว็ปไซต์ CCS', NULL),
    (2, 'จัดแก้ไขเพิ่มเติมสัญญามาตรฐานให้สอดคล้องกฎหมายข้อมูลส่วนบุคคล', 'met', 'คณะทำงานและ DPO', 'ทุกรอบการประเมินกฎหมาย', 'เอกสารสัญญา
การรายงานผล: -', NULL),
    (3, 'สร้างความตระหนักรู้ในกฎหมายดังกล่าวต่อคนในองค์กร', 'met', 'คณะทำงานและ DPO', 'ทุกรอบการประเมินกฎหมาย', 'สื่อสาร /อบรมพนักงานให้ทราบเรื่องข้อมูลส่วนบุคคล
การรายงานผล: -', NULL),
    (4, 'จัดทำมาตรการรักษาความมั่นคงปลอดภัยของข้อมูลส่วนบุคคล', 'met', 'คณะทำงานและ DPO', 'ทุกรอบการประเมินกฎหมาย', 'ตาม WI การดำเนินการให้สอดคล้องกับกฎหมายข้อมูลส่วนบุคคล
การรายงานผล: -', 'อยู่ระหว่างการประเมินความเสี่ยง และจัดทำมาตรการรักษาความมั่นคงปลอดภัยของข้อมูลส่วนบุคคล')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-002') L,
  (values
    (0, '(1) มาตรการรักษาความมั่นคงปลอดภัยดังกล่าว จะต้องครอบคลุมการเก็บรวบรวม ใช้
และเปิดเผยข้อมูลส่วนบุคคล ตามกฎหมายว่าด้วยการคุ้มครองข้อมูลส่วนบุคคล ไม่ว่าข้อมูลส่วนบุคคลดังกล่าวจะอยู่ในรูปแบบเอกสารหรือในรูปแบบอิเล็กทรอนิกส์ หรือรูปแบบอื่นใดก็ตาม', 'met', 'คณะทำงานและ DPO', 'ทุกรอบการประเมินกฎหมาย', 'ตาม WI การดำเนินการให้สอดคล้องกับกฎหมายข้อมูลส่วนบุคคล
การรายงานผล: -', NULL),
    (1, '(2) มาตรการรักษาความมั่นคงปลอดภัยดังกล่าว จะต้องประกอบด้วยมาตรการเชิงองค์กร (organizational measures) และมาตรการเชิงเทคนิค (technical measures) ที่เหมาะสม ซึ่งอาจรวมถึงมาตรการทางกายภาพ (physical measures) ที่จำเป็นด้วย โดยคำนึงถึงระดับความเสี่ยงตามลักษณะและวัตถุประสงค์ของการเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคล ตลอดจนโอกาสเกิดและผลกระทบจากเหตุการละเมิดข้อมูลส่วนบุคคล', 'met', 'คณะทำงานและ DPO', 'ทุกรอบการประเมินกฎหมาย', 'ตาม WI การดำเนินการให้สอดคล้องกับกฎหมายข้อมูลส่วนบุคคล 
SOA
รายงานการประเมินความเสี่ยง 
นโยบายการคุ้มครองข้อมูลส่วนบุคคล
การรายงานผล: -', 'อยู่ระหว่างการประเมินความเสี่ยง และจัดทำมาตรการรักษาความมั่นคงปลอดภัยของข้อมูลส่วนบุคคล'),
    (2, '(3) มาตรการรักษาความมั่นคงปลอดภัย ระบุความเสี่ยงที่สำคัญที่อาจจะเกิดขึ้นกับทรัพย์สินสารสนเทศ (information assets) ที่สำคัญการป้องกันความเสี่ยงที่สำคัญที่อาจจะเกิดขึ้น การตรวจสอบและเฝ้าระวังภัยคุกคามและเหตุการละเมิดข้อมูลส่วนบุคคล การเผชิญเหตุเมื่อมีการตรวจพบภัยคุกคามและเหตุการละเมิดข้อมูลส่วนบุคคล และการรักษาและฟื้นฟูความเสียหายที่เกิดจากภัยคุกคามหรือเหตุการละเมิดข้อมูลส่วนบุคคลด้วย ทั้งนี้ เท่าที่จำเป็นเหมาะสม และเป็นไปได้ตามระดับความเสี่ยง', 'met', 'คณะทำงานและ DPO', 'ทุกรอบการประเมินกฎหมาย', 'รายงานการประเมินความเสี่ยง
การรายงานผล: -', 'อยู่ระหว่างการประเมินความเสี่ยง และจัดทำมาตรการรักษาความมั่นคงปลอดภัยของข้อมูลส่วนบุคคล'),
    (3, '(4) มาตรการรักษาความมั่นคงปลอดภัยดังกล่าว จะต้องคำนึงถึงความสามารถในการธำรงไว้
ซึ่งความลับ (confidentiality) ความถูกต้องครบถ้วน (integrity) และสภาพพร้อมใช้งาน (availability)ของข้อมูลส่วนบุคคลไว้ได้อย่างเหมาะสมตามระดับความเสี่ยง', 'met', 'คณะทำงานและ DPO', 'ทุกรอบการประเมินกฎหมาย', 'รายงานการประเมินความเสี่ยง
การรายงานผล: -', 'อยู่ระหว่างการประเมินความเสี่ยง และจัดทำมาตรการรักษาความมั่นคงปลอดภัยของข้อมูลส่วนบุคคล'),
    (4, '(5) สำหรับการเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคลในรูปแบบอิเล็กทรอนิกส์ มาตรการรักษาความมั่นคงปลอดภัย จะต้องครอบคลุมส่วนประกอบต่างๆ ของระบบสารสนเทศที่เกี่ยวข้องกับการเก็บรวบรวม ใช้ และเปิดเผยข้อมูลส่วนบุคคล เช่น ระบบและอุปกรณ์จัดเก็บข้อมูลส่วนบุคคล เครื่องคอมพิวเตอร์แม่ข่าย(servers) เครื่องคอมพิวเตอร์ลูกข่าย(clients)และอุปกรณ์ต่างๆ ที่ใช้ ระบบเครือข่าย ซอฟต์แวร์และแอปพลิเคชั่น อย่างเหมาะสมตามระดับความเสี่ยง โดยคำนึงถึงหลักการป้องกันเชิงลึก(defense in depth) ที่ควรประกอบด้วยมาตรการป้องกันหลายชั้น(multiple layers of security controls) เพื่อลดความเสี่ยงในกรณีที่มาตรการบางมาตรการมีข้อจำกัดในการป้องกันความมั่นคงปลอดภัยในบางสถานการณ์', 'met', 'คณะทำงานและ DPO', 'ทุกรอบการประเมินกฎหมาย', 'SOA
การรายงานผล: -', NULL),
    (5, '(ก) การควบคุมการเข้าถึงข้อมูลส่วนบุคคลและส่วนประกอบของระบบสารสนเทศที่สำคัญ (access control) ที่มีการพิสูจน์และยืนยันตัวตน (identity proofing and authentication) และการอนุญาตหรือการกำหนดสิทธิในการเข้าถึงและใช้งาน(authorization) ที่เหมาะสม โดยคำนึงถึงหลักการให้สิทธิเท่าที่จำเป็น (need-to-know basis) ตามหลักการให้สิทธิที่น้อยที่สุดเท่าที่จำเป็น(principle of least privilege)', 'met', 'คณะทำงานและ DPO', 'ทุกรอบการประเมินกฎหมาย', 'SOA
การรายงานผล: -', NULL),
    (6, '(ข) การบริหารจัดการการเข้าถึงของผู้ใช้งาน (user access management) ที่เหมาะสม
ซึ่งอาจรวมถึงการลงทะเบียนและการถอนสิทธิผู้ใช้งาน(user registration and de-registration)
การจัดการสิทธิการเข้าถึงของผู้ใช้งาน(user access provisioning) การบริหารจัดการสิทธิการเข้าถึงตามสิทธิ (management of privileged access rights) การบริหารจัดการข้อมูลความลับสำหรับการพิสูจน์ตัวตนของผู้ใช้งาน (management of secret authentication information of users)การทบทวนสิทธิการเข้าถึงของผู้ใช้งาน (review of user access rights) และการถอดถอนหรือปรับปรุงสิทธิการเข้าถึง (removal or adjustment of access rights)', 'met', 'คณะทำงานและ DPO', 'ทุกรอบการประเมินกฎหมาย', 'SOA
การรายงานผล: -', NULL),
    (7, '(ค) การกำหนดหน้าที่ความรับผิดชอบของผู้ใช้งาน (user responsibilities) เพื่อป้องกัน
การเข้าถึง ใช้ เปลี่ยนแปลง แก้ไข ลบ หรือเปิดเผยข้อมูลส่วนบุคคลโดยปราศจากอำนาจหรือโดยมิชอบซึ่งรวมถึงกรณีที่เป็นการกระทำนอกเหนือบทบาทหน้าที่ที่ได้รับมอบหมาย ตลอดจนการลักลอบทำสำเนาข้อมูลส่วนบุคคลโดยปราศจากอำนาจหรือโดยมิชอบ และการลักขโมยอุปกรณ์จัดเก็บหรือประมวลผลข้อมูลส่วนบุคคล', 'met', 'คณะทำงานและ DPO', 'ทุกรอบการประเมินกฎหมาย', 'P-01 กฎระเบียบความปลอดภัยของข้อมูลสารสนเทศ
การรายงานผล: -', NULL),
    (8, '(ง) การจัดให้มีวิธีการเพื่อให้สามารถตรวจสอบย้อนหลังเกี่ยวกับการเข้าถึง เปลี่ยนแปลง
แก้ไข หรือลบข้อมูลส่วนบุคคล (audit trails) ที่เหมาะสมกับวิธีการและสื่อที่ใช้ในการเก็บรวบรวม ใช้หรือเปิดเผยข้อมูลส่วนบุคคล', 'met', 'คณะทำงานและ DPO', 'ทุกรอบการประเมินกฎหมาย', 'Log
การรายงานผล: -', NULL),
    (9, '(7) ต้องรวมถึงการสร้างเสริมความตระหนักรู้ด้านความสำคัญของการคุ้มครองข้อมูลส่วนบุคคลและการรักษาความมั่นคงปลอดภัย (privacy and security awareness)', 'met', 'คณะทำงานและ DPO', 'ทุกรอบการประเมินกฎหมาย', 'สื่อสาร /อบรมพนักงานให้ทราบเรื่องข้อมูลส่วนบุคคล
การรายงานผล: -', NULL),
    (10, 'ข้อ 5 ผู้ควบคุมข้อมูลส่วนบุคคลต้องทบทวนมาตรการรักษาความมั่นคงปลอดภัยตามข้อ 4 เมื่อมีความจำเป็นหรือเมื่อเทคโนโลยีเปลี่ยนแปลงไป', 'met', 'คณะทำงานและ DPO', 'ทุกรอบการประเมินกฎหมาย', 'รายงานการประเมินความเสี่ยง
การรายงานผล: -', NULL),
    (11, 'ข้อ 6 ในการจัดให้มีข้อตกลงระหว่างผู้ควบคุมข้อมูลส่วนบุคคลและผู้ประมวลผลข้อมูลส่วนบุคคล ให้ผู้ควบคุมข้อมูลส่วนบุคคลพิจารณากำหนดให้ผู้ประมวลผลข้อมูลส่วนบุคคลจัดให้มาตรการรักษาความมั่นคงปลอดภัยที่เหมาะสม เพื่อป้องกันการสูญหาย เข้าถึง ใช้ เปลี่ยนแปลงแก้ไข หรือเปิดเผยข้อมูลส่วนบุคคล', 'met', 'คณะทำงานและ DPO', 'ทุกรอบการประเมินกฎหมาย', 'เอกสารสัญญา Data Processer Agreement
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-003') L,
  (values
    (0, 'เมื่อมีการละเมิด CIA ของข้อมูลส่วนบุคคล นอกเหนือจากการดำเนินการเพื่อระงับเหตุ บริษัทฯ ยังมีหน้าที่ในการแจ้งเหตุการละเมิดข้อมูลส่วนบุคคล โดยแบ่ง 3 กรณี ดังนี้
1. กรณีที่เหตุการละเมิดไม่มีความเสี่ยงต่อสิทธิและเสรีภาพของบุคคล
ไม่จำเป็นต้องแจ้งเหตุการละเมิด แต่ต้องนำส่งข้อมูลหรือเอกสารหลักฐานว่าเพราะเหตุใด เหตุการละเมิดดังกล่าวจึงไม่ก่อให้เกิดความเสี่ยง
2. กรณีที่เหตุการละเมิดมีความเสี่ยงต่อสิทธิและเสรีภาพของบุคคล
ต้องแจ้งสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคลภายใน 72 ชั่วโมง นับแต่เหตุการละเมิดเกิด
3.  กรณีที่เหตุการละเมิดมีความเสี่ยงสูงต่อสิทธิและเสรีภาพของบุคคล
ต้องแจ้งให้สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคลทราบภายใน 72 ชั่วโมง นับแต่เหตุการละเมิดเกิด และแจ้งเจ้าของข้อมูลส่วนบุคคลที่ได้รับผลกระทบโดยไม่ชักช้า', 'met', 'DPO', 'ทุกรอบการประเมินกฎหมาย', 'หลักฐานการแจ้งเหตุ
การรายงานผล: กรณีทีการละเมิด : ต้องแจ้งสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคลภายใน 72 ชั่วโมง นับแต่เหตุการละเมิดเกิด', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-004') L,
  (values
    (0, 'บริษัทฯ ในฐานะผู้ประมวลผลข้อมูลส่วนบุคคล (processor) ต้องจัดทำรายการกิจกรรมการประมวลผลข้อมูลส่วนบุคคล (ROPA) เป็นลายลักษณ์อักษร (ทางอิเล็กทรอนิกส์ก็ได้) โดยมีรายการต่อไปนี้
(1) ชื่อและข้อมูลเกี่ยวกับผู้ประมวลผลข้อมูลส่วนบุคคล  และตัวแทน (ถ้ามี)
(2) ชื่อและข้อมูลเกี่ยวกับผู้ควบคุมข้อมูลส่วนบุคคล และตัวแทน (ถ้ามี)
(3) ชื่อและข้อมูลเกี่ยวกับ DPO  รวมถึงสถานที่ติดต่อและวิธีการติดต่อ
(4) ประเภทหรือลักษณะของการเก็บรวบรวม  ใช้  หรือเปิดเผยข้อมูลส่วนบุคคล รวมถึงวัตถุประสงค์ของการเก็บรวบรวม  ใช้  หรือเปิดเผยข้อมูลส่วนบุคคล
(5) ประเภทหน่วยงานที่ได้รับข้อมูลส่วนบุคคล  ในกรณีที่โอนข้อมูลส่วนบุคคลไปยังต่างประเทศ
(6) คำอธิบายเกี่ยวกับมาตรการรักษาความมั่นคงปลอดภัย', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'ROPA แต่ละหน่วยงาน
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-005') L,
  (values
    (0, '1. การส่งข้อมูลส่วนบุคคลไปยังต่างประเทศ มีเงื่อนไขว่าประเทศปลายทางต้องมีมาตรฐานการคุ้มครองข้อมูลส่วนบุคคลที่เพียงพอตามข้อ 5 แห่งประกาศ กล่าวคือ 
(1) ประเทศปลายทาง (ผู้รับโอนข้อมูล) ต้องมีมาตรการหรือกลไกทางกฎหมายที่สอดคล้องกับ PDPA ของไทย โดยอย่างน้อยที่สุด 
- มีการกำหนดหน้าที่ในการรักษาความมั่นคงปลอดภัย
- มีกลไกบังคับตามสิทธิและเยียวยาเจ้าของข้อมูล
(2) มีหน่วยงานหรือองค์กรบังคับใช้กฎหมาย', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'แจ้งหน่วยงานรับทราบ
การรายงานผล: -', NULL),
    (1, '2. ข้อยกเว้นการส่งข้อมูลส่วนบุคคลไปยังต่างประเทศได้ แม้ประเทศปลายทางมีมาตรฐานการคุ้มครองข้อมูลส่วนบุคคลไม่เพียงพอ
(1) เป็นการปฏิบัติตามกฎหมาย
(2) ได้รับความยินยอมจากเจ้าของข้อมูล
(3) เป็นการปฏิบัติตามสัญญา', 'met', NULL, 'ทุกรอบการประเมินกฎหมาย', 'แจ้งหน่วยงานรับทราบ
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-006') L,
  (values
    (0, 'การโอนข้อมูลส่วนบุคคลไปให้นิติบุคคลต่างประเทศที่อยู่ในเครือกิจการหรือธุรกิจเดียวกัน สามารกระทำได้ หากมีนโยบายในการคุ้มครองข้อมูลส่วนบุคคลในเครือกิจการหรือเครือธุรกิจเดียวกัน (binding corporate rules: "BCR") ที่ได้รับการรับรองและตรวจสอบจากสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคลแล้ว', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'แจ้งหน่วยงานรับทราบ
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-007') L,
  (values
    (0, '1. การเก็บข้อมูลประวัติอาชญากรรมจะกระทำได้ต่อเมื่อได้รับความยินยอมจากเจ้าของข้อมูล สำหรับวัตถุประสงค์ในการพิจารณารับบุคคลเข้าทำงาน หรือตรวจสอบคุณสมบัติ 
2. ในการขอความยินยอม ต้องแจ้งผลกระทบของการไม่ให้ความยินยอมโดยชัดแจ้ง
3. การจัดเก็บข้อมูลประวัติอาชญากรรมจะต้องจัดมาตรการรักษาความมั่นคงปลอดภัยที่เหมาะสม
4. เมื่อใช้ข้อมูลประวัติอาชญากรรมสำเร็จตามวัตถุประสงค์ ให้เก็บข้อมูลนั้นต่อไปได้อีกไม่เกิน 6 เดือน นับแต่ดำเนินการเสร็จสิ้น', 'met', 'CCS', NULL, NULL, 'ตามปกติการจัดเก็บข้อมูลประวัติอาชญากรรมเป็นความรับผิดของ HR ในกลุ่ม JAS/JTS Group')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-008') L,
  (values
    (0, 'ผู้ประกอบกิจการโทรคมนาคม ต้องจัดให้มี DPO ของตนเอง เนื่องจาก
1. การเก็บรวบรวม  ใช้  หรือเปิดเผยข้อมูลส่วนบุคคลของลูกค้าหรือผู้รับบริการโดยผู้ประกอบกิจการโทรคมนาคม ถือเป็นกรณีที่มีความจำเป็นต้องตรวจสอบข้อมูลส่วนบุคคลหรือระบบอย่างสม่ำเสมอ ตามข้อ 5 วรรคสอง (4) และ
2. การเก็บรวบรวม  ใช้  หรือเปิดเผยข้อมูลส่วนบุคคลของลูกค้าหรือผู้รับบริการโดยผู้รับใบอนุญาต ประกอบกิจการโทรคมนาคมแบบที่สามตามกฎหมายว่าด้วยการประกอบกิจการโทรคมนาคม  ให้ถือเป็นกรณีที่มีข้อมูลส่วนบุคคลเป็นจำนวนมาก  (on  a  large  scale) ตามข้อ 6 วรรคสอง (4)', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', '1) ประกาศ DPO
2) Mail / จดหมายแจ้งรายชื่อ DPO ต่อ สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล
การรายงานผล: สำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคล', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-009') L,
  (values
    (0, '1. การส่งข้อมูลส่วนบุคคลไปยังต่างประเทศ มีเงื่อนไขว่าประเทศปลายทางต้องมีมาตรฐานการคุ้มครองข้อมูลส่วนบุคคลที่เพียงพอตามข้อ 5 แห่งประกาศ กล่าวคือ 
(1) ประเทศปลายทาง (ผู้รับโอนข้อมูล) ต้องมีมาตรการหรือกลไกทางกฎหมายที่สอดคล้องกับ PDPA ของไทย โดยอย่างน้อยที่สุด 
- มีการกำหนดหน้าที่ในการรักษาความมั่นคงปลอดภัย
- มีกลไกบังคับตามสิทธิและเยียวยาเจ้าของข้อมูล
(2) มีหน่วยงานหรือองค์กรบังคับใช้กฎหมาย

2. ข้อยกเว้นการส่งข้อมูลส่วนบุคคลไปยังต่างประเทศได้ แม้ประเทศปลายทางมีมาตรฐานการคุ้มครองข้อมูลส่วนบุคคลไม่เพียงพอ
(1) เป็นการปฏิบัติตามกฎหมาย
(2) ได้รับความยินยอมจากเจ้าของข้อมูล
(3) เป็นการปฏิบัติตามสัญญา', 'met', 'CCS', '-', 'สื่อสารให้ผู้เกี่ยวข้องทราบ
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-010') L,
  (values
    (0, 'การโอนข้อมูลส่วนบุคคลไปให้นิติบุคคลต่างประเทศที่อยู่ในเครือกิจการหรือธุรกิจเดียวกัน สามารถกระทำได้ หากมีนโยบายในการคุ้มครองข้อมูลส่วนบุคคลในเครือกิจการหรือเครือธุรกิจเดียวกัน (binding corporate rules: "BCR") ที่ได้รับการรับรองและตรวจสอบจากสำนักงานคณะกรรมการคุ้มครองข้อมูลส่วนบุคคลแล้ว', 'met', 'CCS', '-', 'สื่อสารให้ผู้เกี่ยวข้องทราบ
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-011') L,
  (values
    (0, '1. การเก็บข้อมูลประวัติอาชญากรรมจะกระทำได้ต่อเมื่อได้รับความยินยอมจากเจ้าของข้อมูล สำหรับวัตถุประสงค์ในการพิจารณารับบุคคลเข้าทำงาน หรือตรวจสอบคุณสมบัติ 
2. ในการขอความยินยอม ต้องแจ้งผลกระทบของการไม่ให้ความยินยอมโดยชัดแจ้ง
3. การจัดเก็บข้อมูลประวัติอาชญากรรมจะต้องจัดมาตรการรักษาความมั่นคงปลอดภัยที่เหมาะสม
4. เมื่อใช้ข้อมูลประวัติอาชญากรรมสำเร็จตามวัตถุประสงค์ ให้เก็บข้อมูลนั้นต่อไปได้อีกไม่เกิน 6 เดือน นับแต่ดำเนินการเสร็จสิ้น', 'met', 'CCS', '-', 'ตามปกติการจัดเก็บข้อมูลประวัติอาชญากรรมเป็นความรับผิดของ HR ในกลุ่ม JAS/JTS Group
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-012') L,
  (values
    (0, '1. เมื่อเจ้าของข้อมูลส่วนบุคคลใช้สิทธิตามมาตรา 33 ขอให้มีการลบ ทำลาย หรือทำให้ข้อมูลส่วนบุคคลเป็นข้อมูลที่ไม่สามารถระบุตัวตนได้ ให้ดำเนินการดังต่อไปนี้
- ต้องดำเนินการภายใน 90 วัน นับแต่ได้รับคำขอ หากไม่สามารถดำเนินการได้ภายใน 90 วัน เนื่องจากเหตุผลทางเทคนิค ต้องดำเนินการให้การเก็บรวบรวม ใช้ หรือเปิดเผยข้อมูลส่วนบุคคลเป็นไปได้ยากจนกว่าจะดำเนินการลบ ทำลาย หรือทำให้ข้อมูลส่วนบุคคลเป็นข้อมูลที่ไม่สามารถระบุตัวตนได้แล้วเสร็จ
- กรณีสามารถปฏิเสธคำขอได้ตามกฎหมาย เช่น จำเป็นต้องเก็บรักษาข้อมูลตามกฎหมาย ต้องแจ้งเหตุผลและความจำเป็นให้เจ้าของข้อมูลทราบ
- การลบหรือทำลาย ต้องดำเนินการครอบคลุมถึงข้อมูลสำรองหรือสำเนา
- กรณีทำให้เป็นข้อมูลนิรนาม (anonymization) ต้องมีกระบวนการพิจารณาดำเนินการเพิ่มเติม เพื่อตรวจสอบว่าข้อมูลดังกล่าวไม่สามารถระบุตัวตนได้
- กรณีข้อมูลส่วนบุคคลเป็นข้อมูลที่เก็บรวบรวม ใช้ และเปิดเผยโดยไม่ชอบ และไม่ใช่กรณีที่ปฏิเสธคำขอได้ตามกฎหมาย ต้องดำเนินการทำลายหรือลบข้อมูลดังกล่าวเท่านั้น ไม่อาจใช้วิธีการทำให้เป็นข้อมูลนิรนาม (anonymization) ได้
2. นอกเหนือจากการลบ ทำลาย หรือทำให้ข้อมูลส่วนบุคคลเป็นข้อมูลที่ไม่สามารถระบุตัวตนได้ ตามคำขอของเจ้าของข้อมูลแล้ว ให้จัดให้มีระบบตรวจสอบเพื่อทำลายข้อมูลส่วนบุคคลที่พ้นระยะเวลาเก็บรักษา', 'met', 'DPO', 'ทุกรอบการประเมินกฎหมาย', '- เอกสารการร้องขอให้ลบจากเจ้าของข้อมูล 
- หลักฐานการลบข้อมูล
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-013') L,
  (values
    (0, 'เผยแพร่ข้อมูลให้คนในองค์กรตะหนักถึงการรับมือภัยคุกคามไซเบอร์', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', '- ประกาศบริษัท 004_2565 นโยบายด้านความมั่นคงปลอดภัยสารสนเทศอบรมหลักสูตร 
-Information security / ที่เกี่ยวข้อง 1 ครั้ง/ปี
การรายงานผล: -', NULL),
    (1, 'จัดทำแผนรับมือภัยคุกคามทางไซเบอร์', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'ISD_การรับมือภัยคุกคามและตอบสนองต่อเหตุการณ์ผิดปกติทางไซเบอร์ (Cyber Incident Response Plan CIRP)
การรายงานผล: -', NULL),
    (2, 'จัดทำนโยบายการรักษาความมั่นคงปลอดภัยไซเบอร์', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', '- ประกาศบริษัท 004_2565 นโยบายด้านความมั่นคงปลอดภัยสารสนเทศอบรมหลักสูตร
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-014') L,
  (values
    (0, 'แผนรับมือภัยคุกคามไซเบอร์ต้องประกอบไปด้วยรายละเอียดในประกาศนี้', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'ISD_การรับมือภัยคุกคามและตอบสนองต่อเหตุการณ์ผิดปกติทางไซเบอร์ (Cyber Incident Response Plan CIRP)
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-015') L,
  (values
    (0, 'กำหนดแนวทางปฏิบัติเกี่ยวกับการรายงานเหตุภัยคุกคามทางไซเบอร์ โดยกำหนดรายการข้อมูลที่ต้องแจ้งเป็นแบบฟอร์มตามเอกสารแนบท้ายประกาศ', 'met', 'CCS', '-', '-
การรายงานผล: -', 'แม้ไม่อยู่ในรายชื่อหน่วยงาน CII ที่เข้าข่ายจะต้องปฏิบัติตามพระราชบัญญัตินี้ แต่ในการให้ข้อมูลเป็นหนังสือเกี่ยวกับภัยคุกคามไซเบอร์ เมื่อมีการร้องขอหรือคำสั่งจาก กกม. เป็นรายกรณี')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-016') L,
  (values
    (0, 'ผู้ให้บริการด้านการรักษาความมั่นคงปลอดภัยไซเบอร์ สามารถขอการรับรองคุณภาพบริการได้ 
โดยแบ่งเป็น 3 ระดับ คือ ขั้นต้น ขั้นก้าวหน้า ขั้นสูง', 'met', 'CCS', '-', '-
การรายงานผล: -', 'ประกาศฉบับนี้เป็นการกำหนดแนวทางการขอการรับรองคุณภาพการให้บริการด้านการรักษาความมั่นคงปลอดภัย ซึ่งไม่ได้เป็นธุรกิจหลักของบริษัท')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-017') L,
  (values
    (0, 'กำหนดคุณลักษณะของข้อมูล/ระบบสารสนเทศ โดยพิจารณาตาม CIA (วัตถุประสงค์ด้านความมั่นคงปลอดภัยไซเบอร์) และระดับผลกระทบ แบ่งเป็น (1) ระดับต่ำ (2) ระดับกลาง (3) ระดับสูง โดยพิจารณาผลกระทบในด้าน
- ความเสียหายทางการเงิน ทรัพย์สิน ชื่อเสียง
- จำนวนผู้ใช้บริการ บุคลากร หรือประชาชนที่จะได้รับความเสียหาย
- ผลกระทบต่อการดำเนินงานของหน่วยงาน
- ผลกระทบต่อความมั่นคงและความสงบเรียบร้อยของประเทศ
หมายเหตุ: ให้มีการทบทวนทุก 3 ปี เป็นอย่างน้อย หรือเมื่อข้อมูล/ระบบสารสนเทศหรือหน้าที่ของหน่วยงานเปลี่ยนแปลงอย่างมีนัยสำคัญ', 'met', 'CCS', '-', '-
การรายงานผล: -', 'แม้ไม่อยู่ในรายชื่อหน่วยงาน CII ที่เข้าข่ายจะต้องปฏิบัติตาม แต่อาจใช้เป็นมาตรฐานอ้างอิงในการรักษาความมั่นคงปลอดภัยได้')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-018') L,
  (values
    (0, 'หน่วยงานโครงสร้างพื้นฐานสำคัญทางสารสนเทศ 
1. กำหนดคุณลักษณะของข้อมูล/ระบบสารสนเทศ ตามประกาศ LF-026 โดยประเมินจากวัตถุประสงค์ด้านความมั่นคงปลอดภัยไซเบอร์และระดับผลกระทบเป็น (1) ระดับต่ำ (2) ระดับกลาง (3) ระดับสูง
2. กำหนดมาตรการควบคุมความมั่นคงปลอดภัยไซเบอร์ขั้นต่ำ ตามคุณลักษณะของข้อมูล ได้แก่
2.1 ความมั่นคงปลอดภัยไซเบอร์ระดับต่ำ
- การประเมินความเสี่ยง และกลยุทธ์จัดการความเสี่ยง
- แผนรับมือภัยคุกคาม แผนสื่อสารในภาวะวิกฤต
- การสร้างความตระหนักรู้ การฝึกซ้อม
-  Access control
- การทำให้ระบบมีความแข็งแกร่ง ตรวจสอบและเฝ้าระวังภัยคุกคามไซเบอร์
2.2 ความมั่นคงปลอดภัยไซเบอร์ระดับกลาง (เพิ่มเติมจาก 2.1) 
- แผนตรวจสอบการรักษาความมั่นคงปลอดภัยไซเบอร์
- Remote Connection
- Removable  Storage  Media
2.3 ความมั่นคงปลอดภัยไซเบอร์ระดับสูง (เพิ่มเติมจาก 2.1 และ 2.2)
 - การประเมินช่องโห่และทดสอบเจาะระบบ
- บริหารจัดการผู้ให้บริการภายนอก
- Information Sharing
- การรักษาและฟื้นฟูความเสียหายที่เกิด', 'met', 'CCS', '-', '-
การรายงานผล: -', 'แม้ไม่อยู่ในรายชื่อหน่วยงาน CII ที่เข้าข่ายจะต้องปฏิบัติตาม แต่อาจใช้เป็นมาตรฐานอ้างอิงในการรักษาความมั่นคงปลอดภัยได้')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-019') L,
  (values
    (0, 'กำหนดแนวทางการจัดทำแผนการรักษาความมั่นคงปลอดภัยไซเบอร์  (มีเอกสารแนบท้ายประกาศ)
ประกอบด้วย  3 หัวข้อใหญ๋
1. รายละเอียดระบบสารสนเทศ
- ชื่อและหมายเลขอ้างอิง
- คำอธิบายและวัตถุประสงค์ของระบบสารสนเทศ
- เจ้าหน้าที่ระดับอาวุโสด้านความมั่นคงปลอดภัยสารสนเทศ
- เจ้าของระบบสารสนเทศ
- เจ้าของสารสนเทศ
- เจ้าหน้าที่ที่มีอำนาจ
- ผู้ที่เกี่ยวข้องกับระบบสารสนเทศ
- การกำหนดคุณลักษณะความมั่นคงปลอดภัยไซเบอร์
- สถานะของระบบสารสนเทศ
- การเชื่อมต่อระบบและใช้งานข้อมูลร่วมกัน
- นโยบาย ระเบียบ หรือกฎหมายที่เกี่ยวข้อง
2. การควบคุมความมั่นคงปลอดภัยไซเบอร์
3. การบริการงานแผนการรักษาความมั่นคงปลอดภัยไซเบอร์', 'met', 'CCS', '-', '-
การรายงานผล: -', 'แม้ไม่อยู่ในรายชื่อหน่วยงาน CII ที่เข้าข่ายจะต้องปฏิบัติตาม แต่อาจใช้เป็นมาตรฐานอ้างอิงในการรักษาความมั่นคงปลอดภัยได้')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-020') L,
  (values
    (0, 'กำหนดหน้าที่ของหน่วยงานโครงสร้างพื้นฐานสำคัญทางสารสนเทศ (ข้อ 4)
(1) ป้องกัน รับมือ ลดความเสี่ยงจากภัยคุกคามไซเบอร์
(2) จัดทำเอกสาร
- ประมวลแนวทางปฏิบัติ: แผนการตรวจสอบด้านการรักษาความมั่นคงปลอดภัยไซเบอร์ + การประเมินความเสี่ยง + แผนการรับมือภัยคุกคามไซเบอร์
- กรอบมาตรฐานการรักษาความมั่นคงปลอดภัยไซเบอร์: การระบุความเสี่ยง มาตรการป้องกัน มาตรการตรวจสอบเฝ้าระวัง มาตรการเผชิญเหตุ มาตรการรักษาและฟื้นฟูความเสียหาย
(3) ทวนเอกสารปีละ 1 ครั้ง หรือเมื่อมีการเปลี่ยนแปลงอย่างมีนัยสำคัญ
(4) ให้ความร่วมมือและมีส่วนร่วมในการฝึกซ้อมรับมือภัยคุกคาม
(5) แจ้งรายชื่อเจ้าหน้าที่ระดับบริหารและระดับปฏิบัติการ พร้อมด้วยข้อมูลการติดต่อที่สามารถติดต่อได้ในกรณีมีเหตุฉุกเฉินภายในระยะเวลา 60 นาที (หากมีการเปลี่ยนแปลง ต้องแจ้งภายใน 15 วัน นับแต่เปลี่ยนแปลง)
(6) แจ้งรายชื่อหน่วยงานภายในหรือบุคคลที่เป็นเจ้าของกรรมสิทธิ์ ผู้ครอบครองคอมพิวเตอร์
และผู้ดูแลระบบคอมพิวเตอร์ พร้อมด้วยข้อมูลการติดต่อที่สามารถติดต่อในกรณีมีเหตุฉุกเฉินภายในระยะเวลา 60 นาที (หากมีการเปลี่ยนแปลง ต้องแจ้งภายใน 7 วัน นับแต่เปลี่ยนแปลง เว้นแต่มีเหตุจำเป็นอันมิอาจก้าวล่วงได้ ให้แจ้งภายใน 15 วัน)
(7)-(8) ดำเนินการตามนโยบายบริหารจัดการที่เกี่ยวกับการรักษาความมั่นคงปลอดภัยไซเบอร์ และทบทวนอย่างน้อยปีละครั้ง
(9) จัดให้มีการประเมินความเสี่ยงด้านการรักษาความมั่นคงปลอดภัยไซเบอร์ อย่างน้อยปีละครั้ง และจัดทำผลสรุปรายงานการดำเนินการ (แยกต่างหาก) และส่งสรุปรายงานการดำเนินการภายใน 30 วัน นับแต่ดำเนินการเสร็จ แต่ไม่เกินวันที่ 31 มกราคม ของปีถัดไป
(10) จัดให้มีการตรวจสอบด้านความมั่นคงปลอดภัยไซเบอร์ อย่างน้อยปีละครั้ง และจัดทำผลสรุปรายงานการดำเนินการ (แยกต่างหาก) และส่งสรุปรายงานการดำเนินการภายใน 30 วัน นับแต่ดำเนินการเสร็จ แต่ไม่เกินวันที่ 31 มกราคม ของปีถัดไป
(11)-(12) กำหนดกลไกตรวจสอบหรือเฝ้าระวังภัยคุกคามทางไซเบอร์ และทบทวนอย่างน้อยปีละครั้ง
(13) เข้าร่วมการทดสอบสถานะความพร้อมในการรับมือกับภัยคุกคามทางไซเบอร์ที่สำนักงานจัดขึ้น
(14) ตรวจสอบข้อมูลที่เกี่ยวข้อง ข้อมูลคอมพิวเตอร์ และระบบคอมพิวเตอร์ รวมถึงพฤติกรรมแวดล้อม
(15) ในกรณีที่มีภัยคุกคามไซเบอร์เกิด ให้เห็บพยานหลักฐาน แจ้งเหตุและส่งรายงานภัยคุกคาม
(16)-(17) จัดทำแผนความต่อเนื่องทางธุรกิจ และฝึกซ้อมอย่างน้อยปีละครั้ง
(18) จัดทำรายงานประจำปีเกี่ยวกับภัยตคุกคามไซเบอร์ โดยส่งภายในวันที่ 31 มกราคม ในแต่ละปี
(19) - (หน้าที่เฉพาะหน่วยงานรัฐ)
(20) - (21) ให้ความร่วมมือศูนย์ประสานการรักษาความมั่นคงปลอดภัยฯ และดำเนินการตามที่ กมช. หรือ กกม. มอบหมายหรือประกาศกำหนด', 'met', 'CCS', '-', '-
การรายงานผล: -', 'แม้ไม่อยู่ในรายชื่อหน่วยงาน CII ที่เข้าข่ายจะต้องปฏิบัติตาม แต่อาจใช้เป็นมาตรฐานอ้างอิงในการรักษาความมั่นคงปลอดภัยได้')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-021') L,
  (values
    (0, 'มุ่งเน้นการป้องกันและปราบปรามอาชญากรรมที่ใช้เทคโนโลยีเป็นเครื่องมือ เช่น การหลอกลวงผ่านช่องทางออนไลน์ การโจมตีระบบคอมพิวเตอร์ หรือการใช้ข้อมูลส่วนบุคคลโดยไม่ได้รับอนุญาต ซึ่งบริการคลาวด์อาจถูกใช้เป็นช่องทางในการกระทำความผิดเหล่านี้.
1) การเก็บรักษาและการเข้าถึงข้อมูล: ในกรณีที่ข้อมูลที่เกี่ยวข้องกับการกระทำความผิดถูกเก็บไว้ในระบบคลาวด์ ผู้ให้บริการคลาวด์อาจมีหน้าที่ในการให้ความร่วมมือกับเจ้าหน้าที่ในการเข้าถึงข้อมูลดังกล่าวตามที่กฎหมายกำหนด.
2) ความรับผิดชอบของผู้ให้บริการ: แม้กฎหมายจะไม่ได้ระบุถึงผู้ให้บริการคลาวด์โดยตรง แต่ในบริบทของการป้องกันอาชญากรรมทางเทคโนโลยี ผู้ให้บริการคลาวด์อาจมีบทบาทในการตรวจสอบและรายงานกิจกรรมที่น่าสงสัยบนแพลตฟอร์มของตน.', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'เอกสารตามที่เจ้าหน้าที่ร้องขอตามกฎหมาย
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-022') L,
  (values
    (0, '1) การรายงานภัยคุกคามที่เกิดขึ้นบนคลาวด์: หากองค์กรใช้บริการคลาวด์และเกิดเหตุการณ์ที่เข้าข่ายภัยคุกคามทางไซเบอร์ เช่น การโจมตีระบบ การรั่วไหลของข้อมูล หรือการเข้าถึงโดยไม่ได้รับอนุญาต องค์กรมีหน้าที่ต้องรายงานเหตุการณ์ดังกล่าวตามหลักเกณฑ์ที่กำหนดในประกาศนี้.', 'met', 'CCS', '-', '-
การรายงานผล: -', 'รายชื่อหน่วยงาน CII ที่เข้าข่ายจะต้องปฏิบัติตามพระราชบัญญัตินี้ แต่ในการให้ข้อมูลเป็นหนังสือเกี่ยวกับภัยคุกคามไซเบอร์ เมื่อมีการร้องขอหรือคำสั่งจาก กกม. เป็นรายกรณี ก็ยังคงต้องให้ข้อมูลตามรายการที่ปรากฏในแบบ ก.2')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-023') L,
  (values
    (0, 'กำหนดคุณลักษณะของข้อมูล/ระบบสารสนเทศ โดยพิจารณาตาม CIA (วัตถุประสงค์ด้านความมั่นคงปลอดภัยไซเบอร์) และระดับผลกระทบ แบ่งเป็น (1) ระดับต่ำ (2) ระดับกลาง (3) ระดับสูง โดยพิจารณาผลกระทบในด้าน
- ความเสียหายทางการเงิน ทรัพย์สิน ชื่อเสียง
- จำนวนผู้ใช้บริการ บุคลากร หรือประชาชนที่จะได้รับความเสียหาย
- ผลกระทบต่อการดำเนินงานของหน่วยงาน
- ผลกระทบต่อความมั่นคงและความสงบเรียบร้อยของประเทศ
หมายเหตุ: ให้มีการทบทวนทุก 3 ปี เป็นอย่างน้อย หรือเมื่อข้อมูล/ระบบสารสนเทศหรือหน้าที่ของหน่วยงานเปลี่ยนแปลงอย่างมีนัยสำคัญ', 'met', 'CCS', '-', '-
การรายงานผล: -', 'แม้ ไม่อยู่ในรายชื่อหน่วยงาน CII ที่เข้าข่ายจะต้องปฏิบัติตาม แต่อาจใช้เป็นมาตรฐานอ้างอิงในการรักษาความมั่นคงปลอดภัยได้')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-024') L,
  (values
    (0, 'หน่วยงานโครงสร้างพื้นฐานสำคัญทางสารสนเทศ 
1. กำหนดคุณลักษณะของข้อมูล/ระบบสารสนเทศ ตามประกาศ " ประกาศ กมช. เรื่อง มาตรฐานการกำหนดคุณลักษณะความมั่นคงปลอดภัยไซเบอร์ให้แก่ข้อมูลหรือระบบสารสนเทศ พ.ศ. 2566 "  โดยประเมินจากวัตถุประสงค์ด้านความมั่นคงปลอดภัยไซเบอร์และระดับผลกระทบเป็น (1) ระดับต่ำ (2) ระดับกลาง (3) ระดับสูง
2. กำหนดมาตรการควบคุมความมั่นคงปลอดภัยไซเบอร์ขั้นต่ำ ตามคุณลักษณะของข้อมูล ได้แก่
2.1 ความมั่นคงปลอดภัยไซเบอร์ระดับต่ำ
- การประเมินความเสี่ยง และกลยุทธ์จัดการความเสี่ยง
- แผนรับมือภัยคุกคาม แผนสื่อสารในภาวะวิกฤต
- การสร้างความตระหนักรู้ การฝึกซ้อม
-  Access control
- การทำให้ระบบมีความแข็งแกร่ง ตรวจสอบและเฝ้าระวังภัยคุกคามไซเบอร์
2.2 ความมั่นคงปลอดภัยไซเบอร์ระดับกลาง (เพิ่มเติมจาก 2.1) 
- แผนตรวจสอบการรักษาความมั่นคงปลอดภัยไซเบอร์
- Remote Connection
- Removable  Storage  Media
2.3 ความมั่นคงปลอดภัยไซเบอร์ระดับสูง (เพิ่มเติมจาก 2.1 และ 2.2)
 - การประเมินช่องโห่และทดสอบเจาะระบบ
- บริหารจัดการผู้ให้บริการภายนอก
- Information Sharing
- การรักษาและฟื้นฟูความเสียหายที่เกิด', 'met', 'CCS', '-', '-
การรายงานผล: -', 'แม้ไม่อยู่ในรายชื่อหน่วยงาน CII ที่เข้าข่ายจะต้องปฏิบัติตาม แต่อาจใช้เป็นมาตรฐานอ้างอิงในการรักษาความมั่นคงปลอดภัยได้')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-025') L,
  (values
    (0, 'กำหนดแนวทางการจัดทำแผนการรักษาความมั่นคงปลอดภัยไซเบอร์  (มีเอกสารแนบท้ายประกาศ)
ประกอบด้วย  3 หัวข้อใหญ่
1. รายละเอียดระบบสารสนเทศ
- ชื่อและหมายเลขอ้างอิง
- คำอธิบายและวัตถุประสงค์ของระบบสารสนเทศ
- เจ้าหน้าที่ระดับอาวุโสด้านความมั่นคงปลอดภัยสารสนเทศ
- เจ้าของระบบสารสนเทศ
- เจ้าของสารสนเทศ
- เจ้าหน้าที่ที่มีอำนาจ
- ผู้ที่เกี่ยวข้องกับระบบสารสนเทศ
- การกำหนดคุณลักษณะความมั่นคงปลอดภัยไซเบอร์
- สถานะของระบบสารสนเทศ
- การเชื่อมต่อระบบและใช้งานข้อมูลร่วมกัน
- นโยบาย ระเบียบ หรือกฎหมายที่เกี่ยวข้อง
2. การควบคุมความมั่นคงปลอดภัยไซเบอร์
3. การบริการงานแผนการรักษาความมั่นคงปลอดภัยไซเบอร์', 'met', 'CCS', '-', '-
การรายงานผล: -', 'แม้ไม่อยู่ในรายชื่อหน่วยงาน CII ที่เข้าข่ายจะต้องปฏิบัติตาม แต่อาจใช้เป็นมาตรฐานอ้างอิงในการรักษาความมั่นคงปลอดภัยได้')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-026') L,
  (values
    (0, 'กำหนดหน้าที่ของหน่วยงานโครงสร้างพื้นฐานสำคัญทางสารสนเทศ (ข้อ 4)
(1) ป้องกัน รับมือ ลดความเสี่ยงจากภัยคุกคามไซเบอร์
(2) จัดทำเอกสาร
- ประมวลแนวทางปฏิบัติ: แผนการตรวจสอบด้านการรักษาความมั่นคงปลอดภัยไซเบอร์ + การประเมินความเสี่ยง + แผนการรับมือภัยคุกคามไซเบอร์
- กรอบมาตรฐานการรักษาความมั่นคงปลอดภัยไซเบอร์: การระบุความเสี่ยง มาตรการป้องกัน มาตรการตรวจสอบเฝ้าระวัง มาตรการเผชิญเหตุ มาตรการรักษาและฟื้นฟูความเสียหาย
(3) ทวนเอกสารปีละ 1 ครั้ง หรือเมื่อมีการเปลี่ยนแปลงอย่างมีนัยสำคัญ
(4) ให้ความร่วมมือและมีส่วนร่วมในการฝึกซ้อมรับมือภัยคุกคาม
(5) แจ้งรายชื่อเจ้าหน้าที่ระดับบริหารและระดับปฏิบัติการ พร้อมด้วยข้อมูลการติดต่อที่สามารถติดต่อได้ในกรณีมีเหตุฉุกเฉินภายในระยะเวลา 60 นาที (หากมีการเปลี่ยนแปลง ต้องแจ้งภายใน 15 วัน นับแต่เปลี่ยนแปลง)
(6) แจ้งรายชื่อหน่วยงานภายในหรือบุคคลที่เป็นเจ้าของกรรมสิทธิ์ ผู้ครอบครองคอมพิวเตอร์
และผู้ดูแลระบบคอมพิวเตอร์ พร้อมด้วยข้อมูลการติดต่อที่สามารถติดต่อในกรณีมีเหตุฉุกเฉินภายในระยะเวลา 60 นาที (หากมีการเปลี่ยนแปลง ต้องแจ้งภายใน 7 วัน นับแต่เปลี่ยนแปลง เว้นแต่มีเหตุจำเป็นอันมิอาจก้าวล่วงได้ ให้แจ้งภายใน 15 วัน)
(7)-(8) ดำเนินการตามนโยบายบริหารจัดการที่เกี่ยวกับการรักษาความมั่นคงปลอดภัยไซเบอร์ และทบทวนอย่างน้อยปีละครั้ง
(9) จัดให้มีการประเมินความเสี่ยงด้านการรักษาความมั่นคงปลอดภัยไซเบอร์ อย่างน้อยปีละครั้ง และจัดทำผลสรุปรายงานการดำเนินการ (แยกต่างหาก) และส่งสรุปรายงานการดำเนินการภายใน 30 วัน นับแต่ดำเนินการเสร็จ แต่ไม่เกินวันที่ 31 มกราคม ของปีถัดไป
(10) จัดให้มีการตรวจสอบด้านความมั่นคงปลอดภัยไซเบอร์ อย่างน้อยปีละครั้ง และจัดทำผลสรุปรายงานการดำเนินการ (แยกต่างหาก) และส่งสรุปรายงานการดำเนินการภายใน 30 วัน นับแต่ดำเนินการเสร็จ แต่ไม่เกินวันที่ 31 มกราคม ของปีถัดไป
(11)-(12) กำหนดกลไกตรวจสอบหรือเฝ้าระวังภัยคุกคามทางไซเบอร์ และทบทวนอย่างน้อยปีละครั้ง
(13) เข้าร่วมการทดสอบสถานะความพร้อมในการรับมือกับภัยคุกคามทางไซเบอร์ที่สำนักงานจัดขึ้น
(14) ตรวจสอบข้อมูลที่เกี่ยวข้อง ข้อมูลคอมพิวเตอร์ และระบบคอมพิวเตอร์ รวมถึงพฤติกรรมแวดล้อม
(15) ในกรณีที่มีภัยคุกคามไซเบอร์เกิด ให้เห็บพยานหลักฐาน แจ้งเหตุและส่งรายงานภัยคุกคาม
(16)-(17) จัดทำแผนความต่อเนื่องทางธุรกิจ และฝึกซ้อมอย่างน้อยปีละครั้ง
(18) จัดทำรายงานประจำปีเกี่ยวกับภัยตคุกคามไซเบอร์ โดยส่งภายในวันที่ 31 มกราคม ในแต่ละปี
(19) - (หน้าที่เฉพาะหน่วยงานรัฐ)
(20) - (21) ให้ความร่วมมือศูนย์ประสานการรักษาความมั่นคงปลอดภัยฯ และดำเนินการตามที่ กมช. หรือ กกม. มอบหมายหรือประกาศกำหนด', 'met', 'CCS', '-', '-
การรายงานผล: -', 'แม้ไม่อยู่ในรายชื่อหน่วยงาน CII ที่เข้าข่ายจะต้องปฏิบัติตาม แต่อาจใช้เป็นมาตรฐานอ้างอิงในการรักษาความมั่นคงปลอดภัยได้')
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-027') L,
  (values
    (0, 'เป็นการสร้างมาตรฐานเกี่ยวกับการรักษาความมั่นคงปลอดภัยของระบบคลาวด์ โดยมีการเพิ่มนิยาม ดังต่อไปนี้
"บริการคลาวด์" หมายความว่า กลุ่มของบริการคลาวด์ที่มีคุณสมบัติร่วมกันบางอย่าง โดยมีรูปแบบ ดังนี้
(1) การให้บริการโครงสร้างพื้นฐานเป็นหลัก (Infrastructure as a Service) ประกอบด้วยระบบประมวลผลข้อมูล ระบบการจัดเก็บข้อมูล ระบบเครือข่าย และทรัพยากรอื่นๆ ที่เกี่ยวข้องกับระบบประมวลผล โดยผู้ใช้บริการไม่ต้องบริหารจัดการโครงสร้างพื้นฐานที่จำเป็นด้วยตนเอง
(2) การให้บริการแพลตฟอร์ม (Platform as a Service) ประกอบด้วยระบบโปรแกรมงานคอมพิวเตอร์ ระบบฐานข้อมูล และระบบจัดการหรืองานบริการจากคอมพิวเตอร์ ผู้ใช้บริการสามารถพัฒนา ติดตั้ง แลัะปรับแต่งซอฟต์แวร์ได้ โดยไม่ต้องบริหารจัดการในส่วนที่เกี่ยวข้องกับโครงสร้างพื้นฐาน เครือข่าย ระบบปฏิบัติการ และระบบจัดการฐานข้อมูล
(3) การให้บริการซอฟต์แวร์ (Software as a Service) ผู้ให้บริการจัดเตรียมซอฟต์แวร์สำเร็จรูปแล้ว โดยผู้ใช้บริการสามารถกำหนดค่าความต้องการ พารามิเตอร์ ปริมาณหน่วย ประมวลผลข้อมูล หน่วยเก็บข้อมูล และบริหารจัดการเพื่อให้ได้บริการตามวัตถุประสงค์ หรือ
(4) การให้บริการตาม (1)-(3) หรือบริการอื่นตามที่สำนักงานประกาศกำหนด
"ผู้ให้บริการคลาวด์ (Cloud Service Provider : CSP)" หมายความว่า หน่วยงานรัฐหรือเอกชนที่ทำให้บริการคลาวด์ใช้ได้กับผู้ใช้บริการคลาวด์
ทั้งนี้ ผู้ใช้บริการคลาวด์ หมายความถึง หน่วยงาน (รัฐ) ที่มีข้อตกลงอย่างเป็นทางการในการใช้บริการคลาวด์ที่ให้บริการโดยผู้ให้บริการคลาวด์
หน่วยงานควบคุมหรือกำกับดูแลต้องจัดส่งผลสรุปรายงานการดำเนินการต่อสำนักงานภายใน 30 วันนับแต่วันที่ดำเนินการแล้วเสร็จ', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'เอกสารตามภาครัฐร้องขอ
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-028') L,
  (values
    (0, 'การให้บริการระบบคลาวด์ (Cloud Services) ซึ่งเป็นส่วนหนึ่งของเทคโนโลยีสารสนเทศและการสื่อสาร ย่อมต้องปฏิบัติตามมาตรฐานและแนวทางที่กำหนดไว้ในพระราชกำหนดนี้ โดยเฉพาะอย่างยิ่งในส่วนที่เกี่ยวข้องกับการรักษาความมั่นคงปลอดภัยไซเบอร์ การป้องกันการสวมรอยทำธุรกรรมแทนผู้ใช้บริการ การจัดการบัญชีม้า และกระบวนการรับแจ้งเหตุที่รวดเร็ว ซึ่งเป็นข้อกำหนดที่ผู้ให้บริการระบบดิจิทัลต้องดำเนินการเพื่อป้องกันและลดความเสี่ยงจากอาชญากรรมทางเทคโนโลยี', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'เอกสารตามภาครัฐร้องขอกรณีพบว่าลูกค้านำธุรกรมที่ผิดกฎหมาย
การรายงานผล: -', NULL),
    (1, '1.	มาตรา 4/1 (เพิ่มใหม่) 
	วรรค 1 - กำหนดให้ ธปท. สำนักงาน กลต. กสทช. สำนักงาน กสทช. และคณะกรรมการธุรกรรมทางอิเล็คทรอนิกส์ มีอำนาจในการกำหนดมาตรฐานเพื่อป้องกันอาชญากรรมทางเทคโนโลยี
            วรรค 2 - กำหนดให้ ผู้ให้บริการเครือข่ายโทรศัพท์ และผู้ให้บริการโทรคมนาคมรายอื่น มีหน้าที่ตรวจสอบเพื่อคัดกรองเนื้อหาบริการสารสั้น (SMS) ที่อาจเกี่ยวข้องกับอาชญากรรมทางเทคโนโลยีตามมาตรฐาน หรือมาตรการที่ สำนักงาน กสทช. กำหนด
2.	มาตรา 5 วรรค 2 และ 3 (เพิ่มใหม่)
	วรรค 2 – กรณีปรากฏพยานหลักฐานอันควรเชื่อได้ว่ามีการใช้บริการโทรคมนาคมเพื่อกระทำผิดอาชญากรรมทางเทคโนโลยี สำนักงาน กสทช. สั่งให้ผู้ให้บริการเครือข่ายโทรศัพท์ ผู้ให้บริการโทรคมนาคมรายอื่น และผู้ให้บริการอื่นที่เกี่ยวข้องกับการกระทำนั้น ระงับการให้บริการโทรคมนาคมดังกล่าว
	วรรค 3 - การยกเลิกการระงับการให้บริการตามวรรค 2 ให้เป็นไปตามหลักเกณฑ์ วิธีการ และเงื่อนไขที่ สตช. DSI ปปง. สำนักงาน กสทช. และ ศปอท. เห็นชอบร่วมกัน
3.	มาตรา 8/10 (เพิ่มใหม่)
ให้สถาบันการเงินหรือผู้ประกอบธุรกิจ ผู้ให้บริการเครือข่ายโทรศัพท์ ผู้ให้บริการโทรคมนาคมรายอื่น ผู้ให้บริการอื่นที่เกี่ยวข้อง  หรือผู้ให้บริการสื่อสังคมออนไลน์ มีส่วนร่วมรับผิดชอบในความเสียหายที่เกิดจากอาชญากรรมทางเทคโนโลยี เว้นแต่ จะพิสูจน์ได้ว่าสถาบันการเงินหรือผู้ประกอบธุรกิจ ผู้ให้บริการเครือข่ายโทรศัพท์ ผู้ให้บริการโทรคมนาคมรายอื่น ผู้ให้บริการอื่นที่เกี่ยวข้อง หรือผู้ให้บริการสื่อสังคมออนไลน์ ได้ปฏิบัติตามมาตรฐานหรือมาตรการป้องกันอาชญากรรมทางเทคโนโลยีที่กำหนดโดย ธปท. สำนักงาน กลต. กสทช. สำนักงาน กสทช. หรือคณะกรรมการธุรกรรมทางอิเล็คทรอนิกส์ แล้วแต่กรณี', 'met', NULL, NULL, NULL, NULL),
    (2, 'ดังนั้น ตามที่ พรก. กำหนดเป็นการเพิ่มเติม ในส่วนที่บริษัทฯ จะต้องรับผิดชอบในความเสียหายที่เกิดจากอาชญากรรมทางเทคโนโลยีนั้น ยังคงต้องรอมาตรการป้องกันอาชญากรรมทางเทคโนโลยีที่กำหนดโดย กสทช / สำนักงาน กสทช. หรือหน่วยงานภาครัฐที่เกี่ยวเนื่อง และเกี่ยวข้องอีกครั้งหนึ่ง

นอกจากนี้ ในส่วนที่อาจเกี่ยวข้องกับบริษัทฯ หากบริษัทมีลูกค้าประเภท “ผู้ประกอบธุรกิจสินทรัพย์ดิจิทัล” ในมาตรา 7/1 ของพรก. โดยหากพนักงานเจ้าหน้าที่ตรวจพบการกระทำความผิดเกี่ยวกับคอมพิวเตอร์ว่ามีผู้ประกอบธุรกิจสินทรัพย์ดิจิทอลโดยไม่ได้รับอนุญาตตามกฎหมายว่าด้วยการประกอบธุรกิจสินทรัพย์ดิจิทัล พนักงานเจ้าหน้าที่ดังกล่าวสามารถมีคำสั่ง “ระงับ” การทำให้แพร่หลายของข้อมูลคอมพิวเตอร์ หรือนำข้อมูลคอมพิวเตอร์ที่ผิดกฎหมายออกจากระบบคอมพิวเตอร์ทันที 

ทั้งนี้ หากผู้ได้รับคำสั่งไม่ปฏิบัติตามมาตรา 7/1 ตามมาตรา 8/12 ของ พรก. กำหนดให้ต้องระวางโทษจำคุกไม่เกิน 1 ปี หรือปรับไม่เกิน 100,000 บาท หรือทั้งจำทั้งปรับ', 'met', NULL, NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-029') L,
  (values
    (0, 'ธุรกรรมทางอิเล็กทรอนิกส์
มาตรา 7 ห้ามมิให้ปฏิเสธความมีผลผูกพันและการบังคับใช้ทางกฎหมายของข้อความใดเพียงเพราะเหตุที่ข้อความนั้นอยู่ในรูปของข้อมูลอิเล็กทรอนิกส์', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'ใบเสนอราคาและเอกสารเงื่อนไขการให้และขอรับบริการ Coud
การรายงานผล: -', NULL),
    (1, 'มาตรา 8 ภายใต้บังคับบทบัญญัติแห่งมาตรา 9 ในกรณีที่กฎหมายกําหนดให้การใดต้องทําเป็นหนังสือ มีหลักฐานเป็นหนังสือ หรือมีเอกสารมาแสดง ถ้าได้มีการจัดทําข้อความขึ้นเป็นข้อมูลอิเล็กทรอนิกส์ที่สามารถเข้าถึงและนํากลับมาใช้ได้โดยความหมายไม่เปลี่ยนแปลง ให้ถือว่าข้อความนั้นได้ทําเป็นหนังสือ มีหลักฐานเป็นหนังสือ หรือมีเอกสารมาแสดงแล้ว', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'ใบเสนอราคาและเอกสารเงื่อนไขการให้และขอรับบริการ Coud
การรายงานผล: -', NULL),
    (2, 'มาตรา 9 ในกรณีที่บุคคลพึงลงลายมือชื่อในหนังสือ ให้ถือว่าข้อมูลอิเล็กทรอนิกส์นั้นมีการลงลายมือชื่อแล้ว ถ้า
(1) ใช้วิธีการที่สามารถระบุตัวเจ้าของลายมือชื่อ และสามารถแสดงได้ว่าเจ้าของลายมือชื่อรับรองข้อความในข้อมูลอิเล็กทรอนิกส์นั้นว่าเป็นของตน และ
(2) วิธีการดังกล่าวเป็นวิธีการที่เชื่อถือได้โดยเหมาะสมกับวัตถุประสงค์ของการสร้างหรือส่งข้อมูลอิเล็กทรอนิกส์โดยคํานึงถึงพฤติการณ์แวดล้อมหรือข้อตกลงของคู่กรณี', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'ใบเสนอราคาและเอกสารเงื่อนไขการให้และขอรับบริการ Coud
การรายงานผล: -', NULL),
    (3, 'มาตรา 10 ในกรณีที่กฎหมายกําหนดให้นําเสนอหรือเก็บรักษาข้อความใดในสภาพที่เป็นมาแต่เดิมอย่างเอกสารต้นฉบับ ถ้าได้นําเสนอหรือเก็บรักษาในรูปข้อมูลอิเล็กทรอนิกส์ตามหลักเกณฑ์ดังต่อไปนี้ให้ถือว่าได้มีการนําเสนอหรือเก็บรักษาเป็นเอกสารต้นฉบับตามกฎหมายแล้ว
(1) ข้อมูลอิเล็กทรอนิกส์ได้ใช้วิธีการที่เชื่อถือได้ในการรักษาความถูกต้องของข้อความตั้งแต่การสร้างข้อความเสร็จสมบูรณ์และ
(2) สามารถแสดงข้อความนั้นในภายหลังได้', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'ใบเสนอราคาและเอกสารเงื่อนไขการให้และขอรับบริการ Coud
การรายงานผล: -', NULL),
    (4, 'มาตรา 12 ภายใต้บังคับบทบัญญัติมาตรา 10 ในกรณีที่กฎหมายกําหนดให้เก็บรักษาเอกสารหรือข้อความใด ถ้าได้เก็บรักษาในรูปข้อมูลอิเล็กทรอนิกส์ตามหลักเกณฑ์ดังต่อไปนี้ ให้ถือว่าได้มีการเก็บรักษาเอกสารหรือข้อความตามที่กฎหมายต้องการแล้ว
(1) ข้อมูลอิเล็กทรอนิกส์นั้นสามารถเข้าถึงและนํากลับมาใช้ได้โดยความหมายไม่เปลี่ยนแปลง
(2) ได้เก็บรักษาข้อมูลอิเล็กทรอนิกส์นั้นให้อยู่ในรูปแบบที่เป็นอยู่ในขณะที่สร้าง ส่ง หรือได้รับข้อมูลอิเล็กทรอนิกส์นั้น หรืออยู่ในรูปแบบที่สามารถแสดงข้อความที่สร้าง ส่ง หรือได้รับให้ปรากฏอย่างถูกต้องได้และ
(3) ได้เก็บรักษาข้อความส่วนที่ระบุถึงแหล่งกําเนิด ต้นทาง และปลายทางของข้อมูลอิเล็กทรอนิกส์ตลอดจนวันและเวลาที่ส่งหรือได้รับข้อความดังกล่าว ถ้ามี', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'ใบเสนอราคาและเอกสารเงื่อนไขการให้และขอรับบริการ Coud
การรายงานผล: -', NULL),
    (5, 'มาตรา 12/17 ให้นําบทบัญญัติในมาตรา 10 มาตรา 11 และมาตรา 12 มาใช้บังคับกับเอกสารหรือข้อความที่ได้มีการจัดทําหรือแปลงให้อยู่ในรูปของข้อมูลอิเล็กทรอนิกส์ในภายหลังด้วยวิธีการทางอิเล็กทรอนิกส์และการเก็บรักษาเอกสารและข้อความดังกล่าวด้วยโดยอนุโลมการจัดทําหรือแปลงเอกสารและข้อความให้อยู่ในรูปของข้อมูลอิเล็กทรอนิกส์ตามวรรคหนึ่งให้เป็นไปตามหลักเกณฑ์และวิธีการที่คณะกรรมการกําหนด', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'ใบเสนอราคาและเอกสารเงื่อนไขการให้และขอรับบริการ Coud
การรายงานผล: -', NULL),
    (6, 'มาตรา 13  คําเสนอหรือคําสนองในการทําสัญญาอาจทําเป็นข้อมูลอิเล็กทรอนิกส์ก็ได้และห้ามมิให้ปฏิเสธการมีผลทางกฎหมายของสัญญาเพียงเพราะเหตุที่สัญญานั้นได้ทําคําเสนอหรือคําสนองเป็นข้อมูลอิเล็กทรอนิกส์', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'ใบเสนอราคาและเอกสารเงื่อนไขการให้และขอรับบริการ Coud
การรายงานผล: -', NULL),
    (7, 'มาตรา 26  ลายมือชื่ออิเล็กทรอนิกส์ที่มีลักษณะดังต่อไปนี้ให้ถือว่าเป็นลายมือชื่ออิเล็กทรอนิกส์ที่เชื่อถือได้
(1) ข้อมูลสําหรับใช้สร้างลายมือชื่ออิเล็กทรอนิกส์นั้นได้เชื่อมโยงไปยังเจ้าของลายมือชื่อโดยไม่เชื่อมโยงไปยังบุคคลอื่นภายใต้สภาพที่นํามาใช้
(2) ในขณะสร้างลายมือชื่ออิเล็กทรอนิกส์นั้น ข้อมูลสําหรับใช้สร้างลายมือชื่ออิเล็กทรอนิกส์อยู่ภายใต้การควบคุมของเจ้าของลายมือชื่อโดยไม่มีการควบคุมของบุคคลอื่น
(3) การเปลี่ยนแปลงใดๆ ที่เกิดแก่ลายมือชื่ออิเล็กทรอนิกส์นับแต่เวลาที่ได้สร้างขึ้นสามารถจะตรวจพบได้และ
(4) ในกรณีที่กฎหมายกําหนดให้การลงลายมือชื่ออิเล็กทรอนิกส์เป็นไปเพื่อรับรองความครบถ้วนและไม่มีการเปลี่ยนแปลงของข้อความ การเปลี่ยนแปลงใดแก่ข้อความนั้นสามารถตรวจพบได้นับแต่เวลาที่ลงลายมือชื่ออิเล็กทรอนิกส์', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'ใบเสนอราคาและเอกสารเงื่อนไขการให้และขอรับบริการ Coud
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-030') L,
  (values
    (0, 'เพื่อให้บริการธุรกรรมทางอิเล็กทรอนิกส์ที่ใช้บริการคลาวด์ มีความมั่นคงปลอดภัย ความน่าเชื่อถือ และมาตรฐานในการให้บริการซึ่งเป็นที่ยอมรับในระดับสากล  (ตามประกาศแนบท้าย)', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'ใบเสนอราคาและเอกสารเงื่อนไขการให้และขอรับบริการ Coud
การรายงานผล: -', NULL),
    (1, '3.1 นโยบายและแนวทางปฏิบัติขององค์กร 
ผู้ใช้บริการควรพิจารณานโยบายและแนวปฏิบัติในองค์กรของผู้ให้บริการที่เกี่ยวข้องกับกระบวนการทำงาน มาตรการป้องกันทางกายภาพ และมาตรการป้องกันทางเทคนิค', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'ใบเสนอราคาและเอกสารเงื่อนไขการให้และขอรับบริการ Coud
การรายงานผล: -', NULL),
    (2, '3.2 ประสิทธิภาพการให้บริการ 
ผู้ใช้บริการควรพิจารณาข้อตกลงระดับการให้บริการ (SLA) ที่เกี่ยวข้องกับสภาพพร้อมใช้งาน ระยะเวลาการตอบสนอง ความสามารถรองรับปริมาณงาน บริการสนับสนุน 
และกระบวนการยุติสัญญา', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'ใบเสนอราคาและเอกสารเงื่อนไขการให้และขอรับบริการ Coud
การรายงานผล: -', NULL),
    (3, '3.3 การรักษาความมั่นคงปลอดภัย 
ผู้ใช้บริการควรพิจารณามาตรการ การรักษาความมั่นคงปลอดภัยในระบบสารสนเทศในข้อตกลงระดับการให้บริการ (SLA) ที่เกี่ยวข้องกับความน่าเชื่อถือของบริการ การพิสูจน์ตัวตนและการอนุญาต การเข้ารหัส การรายงานเหตุการณ์และการจัดการรักษาความมั่นคงปลอดภัย การบันทึกและการตรวจสอบข้อมูลการใช้งานระบบ การตรวจสอบขั้นตอนกระบวนการทำงานและความปลอดภัย การจัดการช่องโหว่ และธรรมาภิบาล', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'ใบเสนอราคาและเอกสารเงื่อนไขการให้และขอรับบริการ Coud
การรายงานผล: -', NULL),
    (4, '3.4 การจัดการข้อมูล 
ผู้ใช้บริการควรพิจารณาข้อตกลงระดับการให้บริการ (SLA) ที่เกี่ยวข้องกับการจัดประเภทข้อมูล การสำรองข้อมูลและการเรียกคืนข้อมูล วงจรชีวิตของข้อมูล และ
การโอนย้ายข้อมูล', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'ใบเสนอราคาและเอกสารเงื่อนไขการให้และขอรับบริการ Coud
การรายงานผล: -', NULL),
    (5, '3.5 การคุ้มครองข้อมูลส่วนบุคคล 
ผู้ใช้บริการควรพิจารณาข้อตกลงระดับการให้บริการ (SLA) ที่เกี่ยวข้องกับแนวปฏิบัติตามมาตรฐานสากลในการคุ้มครองข้อมูลส่วนบุคคล การระบุวัตถุประสงค์การเก็บ
ข้อมูล การเก็บรักษาข้อมูลเท่าที่จำเป็น การใช้ เก็บรักษาและการเปิดเผย ความโปร่งใสและการแจ้งเตือน ความรับผิดชอบต่อข้อมูล สถานที่จัดเก็บข้อมูล และการอำนวยความสะดวกในการเข้าถึงข้อมูล', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'ใบเสนอราคาและเอกสารเงื่อนไขการให้และขอรับบริการ Coud
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-031') L,
  (values
    (0, 'บริษัทต้องเก็บรักษาข้อมูลจราจรคอมพิวเตอร์ไว้ไม่น้อยกว่า 90 วันนับแต่วันที่ข้อมูลนั้นเข้าสู่ระบบคอมพิวเตอร์', 'met', 'CCS / JasTel', 'ทุกรอบการประเมินกฎหมาย', '- Log Firewall
- Log JasTel อ้างอิงตามสัญญาการเช่าใช้ Link
การรายงานผล: -', NULL),
    (1, 'บริษัทจะต้องเก็บรักษาข้อมูลของผู้ใช้บริการเท่าที่จําเป็นเพื่อให้สามารถระบุตัวผู้ใช้บริการนับตั้งแต่เริ่มใช้บริการและต้องเก็บรักษาไว้เป็นเวลาไม่น้อยกว่า 90 วันนับตั้งแต่การใช้บริการสิ้นสุดลง', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', '- Log Firewall
- Log Cloud Service
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-032') L,
  (values
    (0, 'เมื่อได้รับคำสั่งให้ระงับการทำให้แพร่หลายของข้อมูล ต้องดำเนินการระงับในทันทีหรือต้องไม่เกินกว่าระยะเวลาที่ระบุในคำสั่ง เว้นแต่มีเหตุสมควรที่เจ้าพนักงานสั่งได้ ทั้งนี้ห้ามเกิน 15 วัน ในการระงับนี้ ให้ดำเนินการด้วยมาตรการทางเทคนิคใดๆ (Technical Measure) ที่ได้มาตรฐาน', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'เว็ปไซต์รายงานการระงับข้อมูล
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-033') L,
  (values
    (0, 'ผู้ให้บริการต้องจัดให้มีระบบการพิสูจน์และยืนยันตัวตนทางดิจิทัลสำหรับผู้ใช้บริการทุกคน โดยใช้เทคโนโลยีที่สอดคล้องกับเงื่อนไขและมาตรฐานขั้นต่ำในระดับความน่าเชื่อถือและสื่ออิเล็กทรอนิกส์ที่ใช้ยืนยันตัวตนตามที่สำนักงานพัฒนาธุรกรรมทางอิเล็กทรอนิกส์กำหนดในหมวด 3/1 เรื่องระบบการพิสูจน์ยืนยันตัวตนทางดิจิทัลของพระราชบัญญัติว่าด้วยธุรกรรมทางอิเล็กทรอนิกส์ พ.ศ. 2544', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'Log + ระบบการยืนยันตัวตน
การรายงานผล: -', NULL),
    (1, 'ผู้ให้บริการต้องจัดให้มีมาตรการรักษาความมั่นคงปลอดภัยของข้อมูลในระบบการพิสูจน์และยืนยันตัวตนซึ่งควรครอบคลุมถึงมาตรการป้องกันด้านการบริหารจัดการ (administrative safeguard) มาตรการป้องกันด้านเทคนิค (technical safeguard)และมาตรการป้องกันทางกายภาพ (physical safeguard) ในเรื่องการเข้าถึงหรือควบคุมการใช้งานข้อมูลในระบบการพิสูจน์และยืนยันตัวตน (access control)', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'หลักฐานการยืนยันตัวตน
การรายงานผล: -', NULL),
    (2, 'การเก็บรักษาข้อมูลจราจรทางคอมพิวเตอร์ ผู้ให้บริการต้องใช้วิธีการที่มั่นคงปลอดภัย ตามรายละเอียดของกฎหมาย ข้อ 9', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'อ้างอิงตามข้อกำหนด ISO27001 ที่ใช้บริหารจัดการ
การรายงานผล: -', NULL),
    (3, 'ผู้ให้บริการยังคงมีหน้าที่ตามกฎหมายที่ต้องเก็บรักษาทำสำเนาข้อมูลจราจรคอมพิวเตอร์ และครอบครองไว้ซึ่งข้อมูลสำเนาที่เกี่ยวข้องกับข้อมูลจราจรคอมพิวเตอร์ซึ่งสามารถระบุตัวตนได้ กรณีที่ผู้ให้บริการมีข้อตกลง สัญญา หรือมีการว่าจ้างบุคคลภายนอกที่ไม่ใช่ผู้ให้บริการให้ทำหน้าที่หรือเกี่ยวข้องกับการเก็บรักษาข้อมูลจราจรคอมพิวเตอร์แทนหน้าที่ของตนเอง', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'สำเนาข้อมูลจราจรคอมพิวเตอร์
การรายงานผล: -', NULL),
    (4, 'ผู้ให้บริการต้องตั้งนาฬิกาของอุปกรณ์บริการทุกชนิดให้ตรงกับเวลาอ้างอิงสากล (Stratum 0) ให้ตรงกับอุปกรณ์คอมพิวเตอร์ที่เกี่ยวข้อง (Clock Synchronization) และมาตรฐานการเก็บรักษาข้อมูลจราจรคอมพิวเตอร์ต้องเป็นไปตามมาตรฐานสากลตามที่กาหนดไว้ในภาคผนวกท้ายประกาศฉบับนี้', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'ผล Test ทดสอบนาฬิกาของอุปกรณ์บริการทุกชนิดให้ตรงกับเวลาอ้างอิงสากล (Stratum 0)
การรายงานผล: -', NULL),
    (5, 'ผู้ให้บริการต้องเก็บรักษาข้อมูลจราจรคอมพิวเตอร์ตามกำหนดระยะเวลา ดังต่อไปนี้
(1) กรณีทั่วไป ให้ผู้ให้บริการเก็บรักษาข้อมูลจราจรคอมพิวเตอร์ไว้ไม่น้อยกว่าเก้าสิบวัน
นับแต่วันที่ข้อมูลนั้นเข้าสู่ระบบคอมพิวเตอร์
(2) กรณีพนักงานเจ้าหน้าที่มีคำสั่งให้ผู้ให้บริการผู้ใดเก็บรักษาข้อมูลจราจรคอมพิวเตอร์ของผู้ใช้บริการเป็นกรณีพิเศษเฉพาะรายต่อไปอีกคราวละไม่เกินหกเดือนต่อเนื่องกัน แต่ต้องไม่เกินสองปี
หมายเหตุ: ข้อมูลจราจรคอมพิวเตอร์ให้จัดเก็บตามภาคผนวก ข แนบท้ายประกาศกระทรวงดิจิทัลเพื่อเศรษฐกิจและสังคม เรื่อง หลักเกณฑ์การเก็บรักษาข้อมูลจราจรทางคอมพิวเตอร์ของผู้ให้บริการ พ.ศ. 2564', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'Log ข้อมูลจราจรคอมพิวเตอร์
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-034') L,
  (values
    (0, 'จัดมาตรการ takedown notice เป็นลายลักษณ์อักษรเพื่อระงับการแพร่หลายหรือลบข้อมูลคอมพิวเตอร์ที่ผิดกฎหมายออกจากระบบคอมพิวเตอร์ที่อยู่ในความควบคุมดูแลของตน', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'เอกสาร Takedown notice ปรากฎบนเว็ปไซต์
การรายงานผล: -', NULL),
    (1, 'กรณีมีการร้องเรียนจากผู้ร้องเรียนโดยตรง _ กำหนดระยะเวลาการนำข้อมูลผิดกฎหมายออกจากระบบ กรณีที่มีผู้ใช้บริการหรือบุคคลทั่วไปร้องเรียนเป็นไม่เกินกว่า 24 ชั่วโมง นับแต่ได้รับข้อร้องเรียน', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'เข้าถึง Website นั้นไม่ได้ด้วย Internet Jastel
การรายงานผล: -', NULL),
    (2, 'กรณีมีคำสั่งจากเจ้าหน้าที่ _ กำหนดระยะเวลาการในการระงับการทำให้แพร่หลายหรือนำข้อมูลออกจากระบบคอมพิวเตอร์ โดยหลักจะต้องทำทันที เว้นแต่มีเหตุสุดวิสัย ให้ดำเนินการภายหลังเหตุสิ้นสุด แต่ต้องไม่เกินระยะเวลาดังนี้
- ข้อมูลทุจริต หรือ หลอกลวง ประเภท 1  ไม่เกิน 7 วันนับแต่ได้รับคำสั่ง
- ข้อมูลกระทบต่อความมั่นคง ประเภท 2 3  ไม่เกิน 24 ชั่วโมงนับแต่ได้รับคำสั่ง
- ข้อมูลที่มีลักษณะลามก ประเภท 4  ไม่เกิน 3 วัน นับแต่ได้รับคำสั่ง
- ข้อมูลที่เป็นภาพลามกอนาจารเด็ก  ไม่เกิน 24 ชั่วโมงนับแต่ได้รับคำสั่ง', 'met', 'CCS', 'ทุกรอบการประเมินกฎหมาย', 'เข้าถึง Website นั้นไม่ได้ด้วย Internet Jastel
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-035') L,
  (values
    (0, 'จัดให้มีการขึ้นทะเบียน  Software', 'met', 'IT Infra', 'ทุกรอบการประเมินกฎหมาย', 'ทะเบียน Software
การรายงานผล: -', NULL),
    (1, 'ระบุ Licensed ของ Software ที่ติดตั้งลงในเครื่องคอมพิวเตอร์', 'met', 'IT Infra', 'ทุกรอบการประเมินกฎหมาย', 'ทะเบียน License
การรายงานผล: -', NULL),
    (2, 'กำหนดกฎระเบียบความปลอดภัยของข้อมูลสารสนเทศ (P-01)  ห้ามใช้ Software ที่ละเมิดลิขสิทธิ์', 'met', 'IT Infra', 'ทุกรอบการประเมินกฎหมาย', 'P-01 กฎระเบียบความปลอดภัยของข้อมูลสารสนเทศ
การรายงานผล: -', NULL),
    (3, 'กำหนดให้เครื่องคอมพิวเตอร์ที่ใช้ในงาน ไม่สามารถติดตั้ง Software โดยไม่ได้รับอนุญาต', 'met', 'IT Infra', 'ทุกรอบการประเมินกฎหมาย', 'P-01 กฎระเบียบความปลอดภัยของข้อมูลสารสนเทศ
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-036') L,
  (values
    (0, 'เพิ่มเติมข้อยกเว้นความรับผิดผู้ให้บริการ 4 ประเภท ตามเงื่อนไขที่กฎหมายกำหนด
ซึ่งผู้ให้บริการอินเตอร์เน็ตถือเป็นผู้ให้บริการประเภทเป็นสื่อกลางส่งผ่านข้อมูลคอมพิวเตอร์หรือให้สามารถติดต่อถึงกันได้โดยประการอื่นผ่านทางระบบคอมพิวเตอร์ หรือ Mere Conduit (มาตรา 43/2)
1. เงื่อนไขทั่วไป (มาตรา 43/1): ต้องประกาศมาตรการยกเลิกการให้บริการแก่ผู้ใช้บริการที่กระทำการละเมิดลิขสิทธิ์ซ้ำ
2. เงื่อนไขเฉพาะสำหรับ  Mere Conduit (มาตรา 43/2): ต้องให้บริการภายใต้เงื่อนไข 5 ข้อ ดังนี้
- ไม่ได้เป็นผู้ริเริ่มส่งข้อมูล 
- ไม่ได้เป็นผู้กำหนดผู้รับข้อมูล 
- ส่งข้อมูลผ่านกระบวนการทางเทคนิคโดยอัตโนมัติ 
- ไม่ได้กำหนดไม่ได้เปลี่ยนแปลงเนื้อหาของข้อมูล และ
- ไม่ได้เก็บสำเนาข้อมูลที่ทำซ้ำขึ้นในระหว่างกระบวนการพักข้อมูลเป็นการชั่วคราว
ในลักษณะที่ผู้อื่นสามารถเข้าถึงได้โดยทั่วไปและนานเกินกว่าที่จำเป็น', 'met', 'IT Infra', '-', 'รับทราบตามกฎหมาย
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-037') L,
  (values
    (0, 'กำหนดให้ผู้เกี่ยวข้องลงนามในบันทึกข้อตกลงรักษาความลับ (NDA)', 'met', 'CCS / JTS', 'ทุกรอบการประเมินกฎหมาย', 'NDA
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-038') L,
  (values
    (0, '- การเข้ายื่นข้อเสนอกับหน่วยงานของรัฐในการจัดซื้อจัดจ้างที่มีวงเงินเกิน 300 ล้านบาทขึ้นไป ผู้ประกอบการต้องทำ ดังนี้
1.	ทำมาตรฐานขั้นต่ำของนโยบายและแนวทางป้องกันการทุจริตในการจัดซื้อจัดจ้างที่เหมาะสมเป็นหนังสือ
2.	ยื่นแบบตรวจสอบข้อมูลของผู้ประกอบการและหลักฐานอ้างอิง
- กรณีที่ผู้ประกอบการได้รับการรับรองมาตรฐานเกี่ยวกับการป้องกันการทุจริต ดังนี้ ถือว่าได้จัดให้มีมาตรฐานขั้นต่ำของนโยบายและแนวทางป้องกันการทุจริตในการจัดซื้อจัดจ้างแล้ว
1.	ISO 37001 ระบบการจัดการต่อต้านการให้และรับสินบน (Anti-Bribery Management Systems)
2.	การรับรองจากแนวร่วมต่อต้านคอร์รัปชันภาคเอกชนไทย (CAC Certified)
3.	หรืออื่นๆ ตามที่คณะกรรมการ ค.ป.ท. กำหนด', 'met', 'CCS', '-', 'สื่อสารให้ผู้เกี่ยวข้องทราบ
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-039') L,
  (values
    (0, 'ผู้ที่ยื่นข้อเสนอเพื่อทำการจัดซื้อจัดจ้างกับหน่วยงานรัฐ ไม่มีสิทธิอุทธรณ์เกี่ยวกับการจัดซื้อจัดจ้างพัสดุ ในเรื่องดังนี้
1.	คุณสมบัติของผู้ยื่นข้อเสนอรายอื่นที่เข้าร่วมการจัดซื้อจัดจ้างพัสดุในครั้งนั้น ในกรณีที่หน่วยงานของรัฐจัดซื้อจัดจ้างโดยวิธีประกาศเชิญชวนทั่วไป ด้วยวิธีตลาดอิเล็กทรอนิกส์
2.	ขอบเขตของงานหรือรายลเอียดคุณลักษณะเฉพาะของพัสดุ ในกรณีที่หน่วยงานของรัฐเปิดโอกาสให้มีการรับฟังความคิดเห็นจากผู้ประกอบการก่อนจะทำการจัดซื้อจัดจ้าง และผู้ซึ่งได้ยื่นข้อเสนอนั้นมิได้วิจารณ์หรือเสนอแนะร่างขอบเขตของงานหรือรายละเอียดคุณลักษณะเฉพาะของพัสดุดังกล่าว
3.	การที่ผู้ซึ่งได้ยื่นข้อเสนอนั้นมิได้เป็นผู้ประกอบการงานก่อสร้างหรือผู้ประกอบการพัสดุอื่นที่ขึ้นทะเบียนไว้กับกรมบัญชีกลาง ในกรณีที่การจัดซื้อจัดจ้างนั้นเป็นงานก่อสร้างหรือผู้ประกอบการพัสดุอื่นที่ผู้ประกอบการต้องขึ้นทะเบียนไว้กับกรมบัญชีกลางตามมาตรา 51 หรือมาตรา 52 แล้วแต่กรณี
4.	ผลการพิจารณาผู้ได้รับการคัดเลือก ในกรณีที่หน่วยงานของรัฐจัดซื้อจัดจ้างด้วยวิธีคัดเลือกตามมาตรา 56 (1) (ค)
5.	การที่ผู้ซึ่งได้ยื่นข้อเสนอนั้นขาดคุณสมบัติหรือมีลักษณะต้องห้ามตามมาตรา 64 วรรคหนึ่ง
6.	การที่ผู้ซึ่งได้ยื่นข้อเสนอนั้นมิได้ยื่นหลักประกันการเสนอราคาหรือยื่นหลักประกันการเสนอราคาไม่เป็นไปตามที่กำหนดในระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ หรือไม่เป็นไปตามเงื่อนไขการยื่นหลักประกันการเสนอราคาตามที่กำหนดในเอกสารเชิญชวน
7.	การที่ผู้ซึ่งได้ยื่นข้อเสนอนั้นนำผลงานซึ่งเป็นของบุคคลอื่นหรือที่ได้รับโอนจากบุคคลอื่นมายื่นเป็นผลงานของตน อันไม่เป็นไปตามหลักเกณฑ์ที่กำหนดไว้ในเอกสารเชิญชวนหรือหนังสือเชิญชวน
8.	การเปลี่ยนแปลงประกาศผลผู้ชนะการจัดซื้อจัดจ้างหรือผู้ได้รับการคัดเลือก โดยให้ผู้ซึ่งเสนอราคาต่ำหรือผู้ซึ่งได้คะแนนรวมสูงรายถัดไปตามลำดับเป็นผู้ชนะการจัดซื้อจัดจ้างหรือผู้ได้รับการคัดเลือกแทน เนื่องจากผู้ยื่นข้อเสนอรายที่ชนะการจัดซื้อจัดจ้างหรือที่ได้รับการคัดเลือกไว้เดิมไม่ยอมเข้าทำสัญญาหรือข้อตกลงกับหน่วยงานของรัฐภายในเวลาที่กำหนด หรือถูกแจ้งเวียนให้เป็นผู้ทิ้งงานก่อนการทำสัญญาหรือข้อตกลงกับหน่วยงานของรัฐ', 'met', 'ฝ่ายขาย
ฝ่ายกฎหมาย', 'ตามรอบการประเมินกฎหมาย', 'เอกสารการจัดซื้อจัดจ้าง
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-040') L,
  (values
    (0, '-	(มาตรา 41 วรรค 1) ลูกจ้างหญิงมีสิทธิลาคลอดได้ไม่เกิน 120 วัน หรือตามวันที่กำหนดในพระราชกฤษฎีกา โดยนายจ้างต้องจ่ายค่าจ้างในอัตราค่าจ้างในวันทำงานปกติแต่จ่ายไม่เกิน 60 วันหรือตามที่กำหนดในพระราชกฤษฎีก่า
-	(มาตรา 41 วรรค 4) ลูกจ้างหญิงที่ใช้สิทธิลาคลอดแล้ว มีสิทธิลาต่อเนื่องเพื่อเลี้ยงดูบุตรได้อีกไม่เกิน 15 วัน สำหรับกรณีที่บุตรเจ็บป่วยเสี่ยงต่อการเกิดโรคแทรกซ้อน มีความผิดปกติ หรือมีภาวะความพิการ (ต้องแสดงใบรับรองแพทย์) โดยนายจ้างต้องจ่ายค่าจ้างในอัตรา 15% ของค่าจ้างสำหรับวันที่ลา
-	(มาตรา 41/1) ลูกจ้างมีสิทธิลาเพื่อช่วยเหลือคู่สมรสที่คลอดบุตรได้ไม่เกิน 15 วัน (ต้องใช้สิทธิก่อนหรือในวันที่ลา ภายใน 90 วันนับแต่วันคลอดบุตร) โดยนายจ้างต้องจ่ายค่าจ้างในอัตราค่าจ้างในวันทำงานปกติตลอดระยะเวลาที่ลา แต่ไม่เกิน 15 วัน', 'met', 'HR', 'ตามรอบการประเมินกฎหมาย', 'คู่มือลูกจ้าง
การรายงานผล: -', NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

insert into lg_requirements (law_id, seq, text, status, responsible, frequency, documents, note)
select lid, v.seq, v.text, v.status, v.responsible, v.frequency, v.documents, v.note from
  (select id as lid from lg_laws where cat='CC' and code='CC-041') L,
  (values
    (0, 'ข้อ 2 ยกเลิกประกาศกรมสวัสดิการและคุ้มครองแรงงาน เรื่อง สัญลักษณ์เตือนอันตราย เครื่องหมายเกี่ยวกับความปลอดภัยฯ และข้อความแสดงสิทธิและหน้าที่ของนายจ้างและลูกจ้าง พ.ศ. 2554', 'met', 'Safety JTS', 'ปีละ 1 ครั้ง และเมื่อกฎหมายเปลี่ยนแปลง', '- แสดงไว้ในคู่มือความปลอดภัย
- ไซต์สื่อสาร Jastel Safety
- ไฟล์อบรมอบรมความปลอดภัย
การรายงานผล: หลักฐานการสื่อสาร', NULL),
    (1, 'ข้อ 3 นายจ้างต้องติดประกาศข้อความแสดงสิทธิและหน้าที่ของนายจ้างและลูกจ้างด้านความปลอดภัยฯ ในที่ที่เห็นได้ง่าย ณ สถานประกอบกิจการ', 'met', NULL, NULL, NULL, NULL),
    (2, 'ข้อ 4 นายจ้างต้องติดประกาศสัญลักษณ์เตือนอันตรายและเครื่องหมายเกี่ยวกับความปลอดภัยฯ ให้เหมาะสมกับลักษณะและสภาพการทำงาน ในที่ที่เห็นได้ง่าย', 'met', NULL, '1 ครั้ง/เดือน หรือพบว่าชำรุด ซีดจาง ถูกบัง หรือไม่ตรงกับความเสี่ยง', 'แบบตรวจสอบความปลอดภัย', NULL),
    (3, 'ข้อ 5 สัญลักษณ์เตือนอันตรายและเครื่องหมายความปลอดภัยต้องเป็นไปตามมาตรฐานผลิตภัณฑ์อุตสาหกรรม หรือมาตรฐานสากล เช่น ISO, EN, AS/NZS, ANSI, JIS, NIOSH, OSHA, KSA หรือมาตรฐานอื่นที่เทียบเท่า', 'met', NULL, NULL, NULL, NULL)
  ) as v(seq, text, status, responsible, frequency, documents, note)
where not exists (select 1 from lg_requirements r where r.law_id = L.lid);

commit;
