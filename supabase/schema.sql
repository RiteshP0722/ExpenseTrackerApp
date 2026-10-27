-- ============================================================
-- Expense Tracker App — Supabase schema
-- Paste this whole file into Supabase SQL Editor and run it.
-- ============================================================

-- 1. Table: expenses
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  category text not null check (category in ('Food', 'Travel', 'Stationery', 'Other')),
  amount numeric(10, 2) not null check (amount > 0),
  note text,
  bill_photo_url text,
  created_by uuid references auth.users(id) not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_expenses_created_at on public.expenses (created_at desc);
create index if not exists idx_expenses_created_by on public.expenses (created_by);

-- 2. Table: profiles (links auth user -> display name + role)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'staff' check (role in ('staff', 'admin')),
  created_at timestamptz not null default now()
);

-- 3. Row Level Security
alter table public.expenses enable row level security;
alter table public.profiles enable row level security;

-- Make this section safe to rerun after a partial SQL Editor execution.
drop policy if exists "Authenticated users can read expenses" on public.expenses;
drop policy if exists "Authenticated users can insert their own expenses" on public.expenses;
drop policy if exists "Users can update their own expenses, admins can update any" on public.expenses;
drop policy if exists "Only admins can delete expenses" on public.expenses;
drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;

-- Any logged-in user can read all expenses in this simple single-shop setup.
-- (For a multi-shop setup, add a shop_id column and scope these policies to it.)
create policy "Authenticated users can read expenses"
  on public.expenses for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert their own expenses"
  on public.expenses for insert
  with check (auth.uid() = created_by);

create policy "Users can update their own expenses, admins can update any"
  on public.expenses for update
  using (
    auth.uid() = created_by
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Only admins can delete expenses"
  on public.expenses for delete
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 4. Auto-create a profile row whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'New User'), 'staff');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. RPC: monthly summary (total, by item, by category) for the current user's shop
create or replace function public.monthly_summary(month_start date)
returns table (
  total numeric,
  entry_count bigint
) as $$
  select
    coalesce(sum(amount), 0) as total,
    count(*) as entry_count
  from public.expenses
  where created_at >= month_start
    and created_at < (month_start + interval '1 month');
$$ language sql stable;
