-- Local Supabase migration: an exact copy of supabase/schema.sql.
-- If you change schema.sql, copy it here again (npm run db:sync).

-- ============================================================
-- Expense Tracker App — Supabase schema (single file)
--
-- How to use: open Supabase → SQL Editor → New query, paste this
-- WHOLE file and press Run. It is written for a fresh project but
-- is safe to re-run (it uses "if not exists" / "drop ... if exists").
--
-- Sections:
--   0. Extensions
--   1. Tables (profiles, items, item_requests, staff_invites, expenses)
--   2. Indexes
--   3. Helper functions (role checks)
--   4. Triggers (new user, name cleanup, protected columns)
--   5. Row Level Security policies
--   6. View: expenses_view (adds item name + person name)
--   7. RPC functions for summaries
--   8. Storage bucket "bills" + policies
--   9. Default items
--  10. >>> MAKE THE FIRST ADMIN <<<  (read this!)
-- ============================================================


-- ------------------------------------------------------------
-- 0. Extensions
-- ------------------------------------------------------------
create extension if not exists pgcrypto;


-- ------------------------------------------------------------
-- 1. Tables
-- ------------------------------------------------------------

-- One row per logged-in person. Created automatically on first login.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  phone       text,                       -- 10 digits, no +91
  role        text not null default 'staff' check (role in ('staff', 'admin')),
  active      boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Older versions of this project created profiles without these columns.
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists active boolean not null default false;

-- Fixed list of items so "milk" and "Milk" are always the same thing.
create table if not exists public.items (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  default_category  text not null default 'Other'
                    check (default_category in ('Food', 'Travel', 'Stationery', 'Other')),
  active            boolean not null default true,
  is_other          boolean not null default false,   -- the special "Other" item
  created_at        timestamptz not null default now()
);

-- Staff can ask the admin to add a new item.
create table if not exists public.item_requests (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 2 and 60),
  requested_by  uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at    timestamptz not null default now()
);

-- Mobile numbers the admin has allowed to use the app.
-- A number in this table gets its role on first login.
create table if not exists public.staff_invites (
  phone       text primary key check (phone ~ '^[6-9][0-9]{9}$'),   -- 10 digits
  full_name   text not null check (char_length(full_name) between 1 and 60),
  role        text not null default 'staff' check (role in ('staff', 'admin')),
  invited_by  uuid default auth.uid(),
  created_at  timestamptz not null default now()
);

-- The old schema had a free-text item_name. The new one uses item_id.
-- (See README → "Migrating from the old schema" if you ran the old file.)
create table if not exists public.expenses (
  id              uuid primary key default gen_random_uuid(),   -- app sends its own id (blocks double saves)
  item_id         uuid not null references public.items(id),
  custom_name     text check (custom_name is null or char_length(custom_name) between 1 and 60),
  category        text not null check (category in ('Food', 'Travel', 'Stationery', 'Other')),
  amount          numeric(12, 2) not null check (amount > 0),   -- stored with 2 decimals; the app rejects more
  expense_date    date not null default ((now() at time zone 'Asia/Kolkata')::date),
  note            text check (note is null or char_length(note) <= 200),
  bill_photo_url  text,                    -- storage path inside bucket "bills": <user_id>/<expense_id>.jpg
  created_by      uuid not null default auth.uid() references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);


-- ------------------------------------------------------------
-- 2. Indexes
-- ------------------------------------------------------------
create unique index if not exists items_name_unique on public.items (lower(name));
create unique index if not exists items_single_other on public.items (is_other) where is_other;
create index if not exists idx_expenses_date        on public.expenses (expense_date desc);
create index if not exists idx_expenses_created_by  on public.expenses (created_by, expense_date desc);
create index if not exists idx_expenses_item        on public.expenses (item_id, expense_date desc);
create index if not exists idx_expenses_category    on public.expenses (category);
create index if not exists idx_profiles_phone       on public.profiles (phone);
create index if not exists idx_item_requests_status on public.item_requests (status, created_at desc);


-- ------------------------------------------------------------
-- 3. Helper functions
--    "security definer" so they can read profiles without
--    running into the profiles RLS policies (no recursion).
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and active
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and active
  );
$$;

-- "+91 98765 43210" / "919876543210" -> "9876543210"
create or replace function public.normalize_phone(p text)
returns text
language sql immutable
as $$
  select right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 10);
$$;

-- "  mIlK   powder " -> "Milk Powder"
create or replace function public.clean_name(p text)
returns text
language sql immutable
as $$
  select initcap(btrim(regexp_replace(coalesce(p, ''), '\s+', ' ', 'g')));
$$;


-- ------------------------------------------------------------
-- 4. Triggers
-- ------------------------------------------------------------

-- 4a. New auth user -> profile. Role and name come from staff_invites.
--     A number that was NOT invited gets an inactive profile and
--     cannot read or add anything until the admin invites it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_phone  text := public.normalize_phone(new.phone);
  v_invite public.staff_invites%rowtype;
begin
  select * into v_invite from public.staff_invites where phone = v_phone;

  insert into public.profiles (id, full_name, phone, role, active)
  values (
    new.id,
    coalesce(v_invite.full_name, new.raw_user_meta_data->>'full_name'),
    v_phone,
    coalesce(v_invite.role, 'staff'),
    v_invite.phone is not null
  )
  on conflict (id) do update
    set phone     = excluded.phone,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        role      = excluded.role,
        active    = excluded.active;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4b. Invite added/changed -> activate an existing profile with that number.
--     Invite removed -> deactivate it.
create or replace function public.sync_invite_to_profile()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.phone = (select phone from public.profiles where id = auth.uid()) then
      raise exception 'You cannot remove your own number';
    end if;
    update public.profiles set active = false where phone = old.phone;
    return old;
  end if;

  new.phone := public.normalize_phone(new.phone);
  new.full_name := btrim(new.full_name);
  return new;
end;
$$;

create or replace function public.sync_invite_after()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.profiles
     set active = true, role = new.role, full_name = new.full_name
   where phone = new.phone;
  return new;
end;
$$;

drop trigger if exists staff_invites_before on public.staff_invites;
create trigger staff_invites_before
  before insert or update or delete on public.staff_invites
  for each row execute function public.sync_invite_to_profile();

drop trigger if exists staff_invites_after on public.staff_invites;
create trigger staff_invites_after
  after insert or update on public.staff_invites
  for each row execute function public.sync_invite_after();

-- 4c. Profiles: only an admin may change role / active / phone.
create or replace function public.protect_profile()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- auth.uid() is null when run from the SQL editor / triggers above: allow.
  if auth.uid() is not null and not public.is_admin() then
    if new.role is distinct from old.role
       or new.active is distinct from old.active
       or new.phone is distinct from old.phone then
      raise exception 'Only an admin can change role, status or phone';
    end if;
  end if;
  new.full_name := nullif(btrim(new.full_name), '');
  return new;
end;
$$;

drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect
  before update on public.profiles
  for each row execute function public.protect_profile();

-- 4d. Items: keep names in one consistent case.
create or replace function public.clean_item()
returns trigger
language plpgsql
as $$
begin
  new.name := public.clean_name(new.name);
  if char_length(new.name) < 2 or char_length(new.name) > 60 then
    raise exception 'Item name must be 2 to 60 characters';
  end if;
  return new;
end;
$$;

drop trigger if exists items_clean on public.items;
create trigger items_clean
  before insert or update on public.items
  for each row execute function public.clean_item();

create or replace function public.clean_item_request()
returns trigger
language plpgsql
as $$
begin
  new.name := public.clean_name(new.name);
  return new;
end;
$$;

drop trigger if exists item_requests_clean on public.item_requests;
create trigger item_requests_clean
  before insert or update on public.item_requests
  for each row execute function public.clean_item_request();

-- 4e. Expenses: tidy text, and nobody can change who created a row
--     or when (so the 24-hour edit window cannot be cheated).
create or replace function public.prepare_expense()
returns trigger
language plpgsql
as $$
begin
  new.custom_name := nullif(public.clean_name(new.custom_name), '');
  new.note := nullif(btrim(new.note), '');

  if tg_op = 'INSERT' then
    new.created_at := now();
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.id := old.id;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists expenses_prepare on public.expenses;
create trigger expenses_prepare
  before insert or update on public.expenses
  for each row execute function public.prepare_expense();


-- ------------------------------------------------------------
-- 5. Row Level Security (on EVERY table)
-- ------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.items          enable row level security;
alter table public.item_requests  enable row level security;
alter table public.staff_invites  enable row level security;
alter table public.expenses       enable row level security;

-- Drop old and new policies so this section can be re-run.
drop policy if exists "Authenticated users can read expenses" on public.expenses;
drop policy if exists "Authenticated users can insert their own expenses" on public.expenses;
drop policy if exists "Users can update their own expenses, admins can update any" on public.expenses;
drop policy if exists "Only admins can delete expenses" on public.expenses;
drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update on public.profiles;
drop policy if exists items_select on public.items;
drop policy if exists items_admin_insert on public.items;
drop policy if exists items_admin_update on public.items;
drop policy if exists items_admin_delete on public.items;
drop policy if exists item_requests_select on public.item_requests;
drop policy if exists item_requests_insert on public.item_requests;
drop policy if exists item_requests_admin_update on public.item_requests;
drop policy if exists item_requests_admin_delete on public.item_requests;
drop policy if exists staff_invites_admin_all on public.staff_invites;
drop policy if exists expenses_select on public.expenses;
drop policy if exists expenses_insert on public.expenses;
drop policy if exists expenses_update on public.expenses;
drop policy if exists expenses_delete on public.expenses;

-- profiles: you see yourself; admin sees everyone.
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- profiles: you can edit your own name; admin can edit anyone.
-- (Trigger 4c stops staff from changing role / active / phone.)
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- items: every active user reads; only admin writes.
create policy items_select on public.items
  for select to authenticated
  using (public.is_active_user());
create policy items_admin_insert on public.items
  for insert to authenticated with check (public.is_admin());
create policy items_admin_update on public.items
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy items_admin_delete on public.items
  for delete to authenticated using (public.is_admin());

-- item_requests: staff create and see their own; admin sees and handles all.
create policy item_requests_select on public.item_requests
  for select to authenticated
  using (requested_by = auth.uid() or public.is_admin());
create policy item_requests_insert on public.item_requests
  for insert to authenticated
  with check (requested_by = auth.uid() and public.is_active_user() and status = 'pending');
create policy item_requests_admin_update on public.item_requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy item_requests_admin_delete on public.item_requests
  for delete to authenticated using (public.is_admin());

-- staff_invites: admin only.
create policy staff_invites_admin_all on public.staff_invites
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- expenses: staff read ONLY their own rows; admin reads all.
create policy expenses_select on public.expenses
  for select to authenticated
  using (
    public.is_admin()
    or (created_by = auth.uid() and public.is_active_user())
  );

create policy expenses_insert on public.expenses
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.is_active_user()
    and exists (select 1 from public.items i where i.id = item_id and i.active)
  );

-- Staff: own rows, only within 24 hours of creating them. Admin: any row.
create policy expenses_update on public.expenses
  for update to authenticated
  using (
    public.is_admin()
    or (created_by = auth.uid() and public.is_active_user()
        and created_at > now() - interval '24 hours')
  )
  with check (
    public.is_admin()
    or (created_by = auth.uid() and created_at > now() - interval '24 hours')
  );

create policy expenses_delete on public.expenses
  for delete to authenticated
  using (
    public.is_admin()
    or (created_by = auth.uid() and public.is_active_user()
        and created_at > now() - interval '24 hours')
  );


-- ------------------------------------------------------------
-- 6. View: expenses with item name and person name
--    security_invoker = true → the expenses RLS above still applies.
-- ------------------------------------------------------------
drop view if exists public.expenses_view;
create view public.expenses_view
with (security_invoker = true)
as
select
  e.id,
  e.item_id,
  i.name                                     as item_name,
  e.custom_name,
  case when i.is_other and e.custom_name is not null
       then i.name || ' (' || e.custom_name || ')'
       else i.name end                       as display_name,
  e.category,
  e.amount,
  e.expense_date,
  e.note,
  e.bill_photo_url,
  e.created_by,
  coalesce(p.full_name, p.phone, 'Unknown')  as created_by_name,
  e.created_at,
  e.updated_at
from public.expenses e
join public.items i on i.id = e.item_id
left join public.profiles p on p.id = e.created_by;

grant select on public.expenses_view to authenticated;


-- ------------------------------------------------------------
-- 7. RPC functions for summaries
--    "security invoker" (the default) → RLS applies, so staff only
--    get totals of their own entries and admin gets everyone's.
--    The sums run in Postgres; the phone never adds up rows.
-- ------------------------------------------------------------

-- The old, unused function is replaced by expense_summary.
drop function if exists public.monthly_summary(date);

create or replace function public.expense_summary(p_from date, p_to date)
returns jsonb
language sql stable security invoker set search_path = public
as $$
  with e as (
    select x.*, i.name as item_name
    from public.expenses x
    join public.items i on i.id = x.item_id
    where x.expense_date between p_from and p_to
  )
  select jsonb_build_object(
    'total',       coalesce((select sum(amount) from e), 0),
    'entry_count', (select count(*) from e),
    'by_item', coalesce((
      select jsonb_agg(t order by t.total desc, t.name) from (
        select item_id as id, item_name as name, sum(amount) as total, count(*) as entry_count
        from e group by item_id, item_name
      ) t), '[]'::jsonb),
    'by_category', coalesce((
      select jsonb_agg(t order by t.total desc, t.name) from (
        select category as id, category as name, sum(amount) as total, count(*) as entry_count
        from e group by category
      ) t), '[]'::jsonb),
    'by_person', case when public.is_admin() then coalesce((
      select jsonb_agg(t order by t.total desc, t.name) from (
        select e.created_by as id,
               coalesce(p.full_name, p.phone, 'Unknown') as name,
               sum(e.amount) as total, count(*) as entry_count
        from e left join public.profiles p on p.id = e.created_by
        group by e.created_by, p.full_name, p.phone
      ) t), '[]'::jsonb) else '[]'::jsonb end
  );
$$;

grant execute on function public.expense_summary(date, date) to authenticated;

-- Admin approves an item request: creates the item (or re-activates it).
create or replace function public.approve_item_request(p_request_id uuid, p_category text default 'Other')
returns uuid
language plpgsql security invoker set search_path = public
as $$
declare
  v_name text;
  v_item uuid;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can approve items';
  end if;

  select name into v_name from public.item_requests where id = p_request_id;
  if v_name is null then
    raise exception 'Request not found';
  end if;

  select id into v_item from public.items where lower(name) = lower(public.clean_name(v_name));
  if v_item is null then
    insert into public.items (name, default_category) values (v_name, p_category) returning id into v_item;
  else
    update public.items set active = true where id = v_item;
  end if;

  update public.item_requests set status = 'approved' where id = p_request_id;
  return v_item;
end;
$$;

grant execute on function public.approve_item_request(uuid, text) to authenticated;


-- ------------------------------------------------------------
-- 8. Storage: private bucket "bills"
--    Path inside the bucket: <user_id>/<expense_id>.jpg
--    A user reads/writes only their own folder; admin reads all.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('bills', 'bills', false, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists bills_select on storage.objects;
drop policy if exists bills_insert on storage.objects;
drop policy if exists bills_update on storage.objects;
drop policy if exists bills_delete on storage.objects;

create policy bills_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'bills'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy bills_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'bills'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_active_user()
  );

create policy bills_update on storage.objects
  for update to authenticated
  using (bucket_id = 'bills' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'bills' and (storage.foldername(name))[1] = auth.uid()::text);

create policy bills_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'bills'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );


-- ------------------------------------------------------------
-- 9. Default items (skipped if they already exist)
-- ------------------------------------------------------------
insert into public.items (name, default_category, is_other) values
  ('Milk',       'Food',       false),
  ('Cake',       'Food',       false),
  ('Chai',       'Food',       false),
  ('Stationery', 'Stationery', false),
  ('Travel',     'Travel',     false),
  ('Other',      'Other',      true)
on conflict do nothing;

-- Users who existed before staff_invites (old schema) keep access
-- and show up in Admin → Staff.
insert into public.staff_invites (phone, full_name, role)
select phone, coalesce(full_name, 'Staff'), role
from public.profiles
where active and phone ~ '^[6-9][0-9]{9}$'
on conflict (phone) do nothing;


-- ============================================================
-- 10. >>> MAKE THE FIRST ADMIN <<<
--
-- Do ONE of these. Replace 9876543210 with the owner's 10-digit
-- mobile number (no +91, no spaces). Remove the leading "--"
-- from the lines you use, select them and press Run.
--
-- Option A (best) — BEFORE the owner logs in for the first time:
--
-- insert into public.staff_invites (phone, full_name, role)
-- values ('9876543210', 'Owner', 'admin')
-- on conflict (phone) do update set role = 'admin';
--
--   Then log in on the app with that number. The account is admin.
--
-- Option B — the owner ALREADY logged in once (shows "not registered"):
--   run the same insert as Option A. The trigger finds the existing
--   profile with that phone and makes it an active admin at once.
--   Then pull down to refresh / restart the app.
--
-- Check it worked:
--   select id, full_name, phone, role, active from public.profiles;
--
-- After that, the admin adds staff numbers from the app:
--   Admin tab → Staff → Add staff.
-- ============================================================
