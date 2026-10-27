-- ============================================================
-- Sample data for testing.
-- Run AFTER schema.sql, and AFTER you've created at least one
-- user (sign up once in the app), then replace the UUID below
-- with that user's id from the auth.users table.
-- ============================================================

-- Find your user id first:
-- select id, phone from auth.users;

-- Then run (replace 'YOUR-USER-ID-HERE'):
/*
insert into public.expenses (item_name, category, amount, note, created_by) values
  ('Milk', 'Food', 50, null, 'YOUR-USER-ID-HERE'),
  ('Cake', 'Food', 300, 'for staff birthday', 'YOUR-USER-ID-HERE'),
  ('Chai', 'Food', 20, null, 'YOUR-USER-ID-HERE'),
  ('Pen & Files', 'Stationery', 220, null, 'YOUR-USER-ID-HERE'),
  ('Milk', 'Food', 50, null, 'YOUR-USER-ID-HERE'),
  ('Auto fare', 'Travel', 80, 'bank visit', 'YOUR-USER-ID-HERE');
*/
