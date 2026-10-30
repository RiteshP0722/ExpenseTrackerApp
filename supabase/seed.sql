-- ============================================================
-- Sample data for testing.
--
-- Run AFTER schema.sql, and AFTER the first admin has logged in
-- once (see schema.sql section 10). The expenses below are added
-- in the name of that admin, spread over this month and last month.
-- Safe to run more than once (it adds another set each time).
-- ============================================================

-- More items (default ones are already created by schema.sql)
insert into public.items (name, default_category) values
  ('Biscuits',     'Food'),
  ('Water Bottle', 'Food'),
  ('Samosa',       'Food'),
  ('Auto Fare',    'Travel'),
  ('Courier',      'Other'),
  ('Printer Paper','Stationery'),
  ('Pen',          'Stationery')
on conflict do nothing;

-- Sample expenses
do $$
declare
  v_user uuid;
  v_month date := date_trunc('month', (now() at time zone 'Asia/Kolkata'))::date;
begin
  select id into v_user from public.profiles where role = 'admin' and active order by created_at limit 1;
  if v_user is null then
    raise exception 'No active admin found. Make the first admin (schema.sql section 10) and log in once, then run this file again.';
  end if;

  insert into public.expenses (item_id, category, amount, note, expense_date, created_by)
  select i.id, i.default_category, s.amount, s.note,
         least(s.day_date, (now() at time zone 'Asia/Kolkata')::date), v_user
  from (values
    ('Milk',          50.00,  null,                 v_month + 0),
    ('Milk',          50.00,  null,                 v_month + 1),
    ('Chai',          20.00,  null,                 v_month + 1),
    ('Cake',         450.00,  'Staff birthday',     v_month + 2),
    ('Biscuits',      35.50,  null,                 v_month + 3),
    ('Printer Paper',260.00,  '1 ream A4',          v_month + 4),
    ('Auto Fare',     80.00,  'Bank visit',         v_month + 5),
    ('Milk',          55.00,  null,                 v_month + 6),
    ('Samosa',       120.00,  'Client meeting',     v_month + 7),
    ('Courier',      150.00,  'Documents to Pune',  v_month + 8),
    -- last month
    ('Milk',          50.00,  null,                 v_month - 25),
    ('Chai',          40.00,  null,                 v_month - 20),
    ('Pen',           60.00,  null,                 v_month - 15),
    ('Cake',         380.00,  'Diwali',             v_month - 10),
    ('Water Bottle', 100.00,  null,                 v_month - 5)
  ) as s(item_name, amount, note, day_date)
  join public.items i on i.name = s.item_name;
end $$;

-- Optional: invite two sample staff numbers (use Supabase test numbers).
-- insert into public.staff_invites (phone, full_name, role) values
--   ('9000000001', 'Ramesh', 'staff'),
--   ('9000000002', 'Sita',   'staff')
-- on conflict (phone) do nothing;
