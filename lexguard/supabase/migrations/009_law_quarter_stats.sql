-- Quarterly added/repealed law counts per category, sourced from the
-- original F-259 Excel masterlist (Masterlist SHE Law sheets), one
-- snapshot per ปี พ.ศ. Year stored as Gregorian (BE - 543).
create table if not exists lg_law_quarter_stats (
  id bigint generated always as identity primary key,
  year int not null,
  quarter smallint not null check (quarter between 1 and 4),
  cat text not null references lg_categories(code),
  added int not null default 0,
  repealed int not null default 0,
  created_at timestamptz not null default now(),
  unique (year, quarter, cat)
);

alter table lg_law_quarter_stats enable row level security;
create policy lg_lqs_all on lg_law_quarter_stats for all using (true) with check (true);

insert into lg_law_quarter_stats (year, quarter, cat, added, repealed) values
(2024, 4, 'LA', 2, 0),
(2024, 1, 'LB', 1, 2),
(2024, 2, 'LB', 1, 0),
(2024, 1, 'LF', 6, 0),
(2024, 3, 'LF', 1, 0),
(2025, 1, 'LA', 2, 0),
(2025, 4, 'LA', 1, 0),
(2025, 1, 'LB', 1, 1),
(2026, 1, 'LA', 2, 0),
(2026, 1, 'LB', 1, 1),
(2026, 1, 'LF', 2, 0)
on conflict (year, quarter, cat) do update set added = excluded.added, repealed = excluded.repealed;
