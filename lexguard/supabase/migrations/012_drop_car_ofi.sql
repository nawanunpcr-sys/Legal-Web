-- Remove the CAR/OFI module entirely (feature dropped from the app).
-- WARNING: irreversible — drops the CAR tables and their data.

-- Detach the optional tracker link to a CAR first
alter table if exists lg_process_tracker drop column if exists car_ofi_id;

-- Remove any CAR-scoped file attachments (report/comm attachments are kept)
delete from lg_attachments where ref_type = 'car';

-- Drop CAR tables (both the current lg_car family and the legacy lg_car_ofi one)
drop table if exists lg_car_followups cascade;
drop table if exists lg_car_approvals cascade;
drop table if exists lg_car          cascade;
drop table if exists lg_car_ofi      cascade;
