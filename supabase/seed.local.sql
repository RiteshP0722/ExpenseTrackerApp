-- ============================================================
-- LOCAL DEVELOPMENT seed (runs automatically on `npx supabase start`
-- and `npx supabase db reset`). Not for the cloud project.
--
-- Invited numbers + their test OTPs (set in config.toml):
--   7489186674  OTP 123456  -> Owner (admin)
--   9000000001  OTP 111111  -> Test Admin (admin)
--   9000000002  OTP 222222  -> Ramesh (staff)
--   9000000003  OTP 333333  -> NOT invited (shows "Number not registered")
-- ============================================================

insert into public.staff_invites (phone, full_name, role) values
  ('7489186674', 'Owner',      'admin'),
  ('9000000001', 'Test Admin', 'admin'),
  ('9000000002', 'Ramesh',     'staff')
on conflict (phone) do nothing;

insert into public.items (name, default_category) values
  ('Biscuits',      'Food'),
  ('Water Bottle',  'Food'),
  ('Samosa',        'Food'),
  ('Auto Fare',     'Travel'),
  ('Courier',       'Other'),
  ('Printer Paper', 'Stationery'),
  ('Pen',           'Stationery')
on conflict do nothing;
