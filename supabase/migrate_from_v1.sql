-- ============================================================
-- ONLY for projects that already ran the OLD schema.sql
-- (expenses had a free-text "item_name" column).
--
-- Run order:
--   1. this file (migrate_from_v1.sql)
--   2. schema.sql
--
-- It keeps all existing expenses: every distinct item name becomes
-- one row in "items" (case is merged, so "milk" and "Milk" become
-- "Milk"), and existing users stay active.
-- ============================================================

create extension if not exists pgcrypto;

-- 1. Items table (same definition as schema.sql)
create table if not exists public.items (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  default_category  text not null default 'Other'
                    check (default_category in ('Food', 'Travel', 'Stationery', 'Other')),
  active            boolean not null default true,
  is_other          boolean not null default false,
  created_at        timestamptz not null default now()
);
create unique index if not exists items_name_unique on public.items (lower(name));

-- 2. One item per distinct (case-insensitive) old item name
insert into public.items (name, default_category)
select distinct on (lower(btrim(item_name)))
       initcap(btrim(regexp_replace(item_name, '\s+', ' ', 'g'))),
       category
from public.expenses
where item_name is not null and char_length(btrim(item_name)) >= 2
order by lower(btrim(item_name)), created_at
on conflict do nothing;

insert into public.items (name, default_category, is_other)
values ('Other', 'Other', true)
on conflict do nothing;

-- 3. New expense columns
alter table public.expenses add column if not exists item_id uuid references public.items(id);
alter table public.expenses add column if not exists custom_name text;
alter table public.expenses add column if not exists expense_date date;
alter table public.expenses add column if not exists updated_at timestamptz not null default now();

update public.expenses e
   set item_id = i.id
  from public.items i
 where e.item_id is null
   and lower(i.name) = lower(initcap(btrim(regexp_replace(e.item_name, '\s+', ' ', 'g'))));

-- Anything that could not be matched (e.g. 1-letter names) goes to "Other"
update public.expenses
   set item_id = (select id from public.items where is_other limit 1),
       custom_name = left(btrim(item_name), 60)
 where item_id is null;

update public.expenses
   set expense_date = (created_at at time zone 'Asia/Kolkata')::date
 where expense_date is null;

alter table public.expenses alter column item_id set not null;
alter table public.expenses alter column expense_date set not null;
alter table public.expenses alter column expense_date set default ((now() at time zone 'Asia/Kolkata')::date);
alter table public.expenses alter column amount type numeric(12, 2);
alter table public.expenses drop column if exists item_name;

-- 4. Profiles: new columns, keep existing users active
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists active boolean not null default false;

update public.profiles p
   set phone = right(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), 10),
       active = true
  from auth.users u
 where u.id = p.id;

-- created_by must point at a profile (new foreign key in schema.sql)
insert into public.profiles (id, phone, role, active)
select u.id, right(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), 10), 'staff', true
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

alter table public.expenses drop constraint if exists expenses_created_by_fkey;
alter table public.expenses
  add constraint expenses_created_by_fkey foreign key (created_by) references public.profiles(id);

-- Now run schema.sql.
