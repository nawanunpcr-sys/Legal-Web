-- Migration 016: ธงสถานะการบังคับใช้ของกฎหมาย (lg_laws.active)
-- คอลัมน์ `active` บอกว่ากฎหมายฉบับนั้นยัง "ใช้อยู่" หรือถูกยกเลิกไปแล้ว
-- ("ไม่ใช้แล้ว"). โค้ดฝั่งแอป (setLawActive / ActiveBadge) อ่าน-เขียนคอลัมน์นี้
-- แต่ยังไม่เคยถูกประกาศไว้ใน schema.sql หรือ migration ก่อนหน้า
-- ค่าเริ่มต้นเป็น true = ทุกฉบับถือว่ายังบังคับใช้อยู่จนกว่าจะถูกทำเครื่องหมายว่ายกเลิก

alter table lg_laws add column if not exists active boolean not null default true;
