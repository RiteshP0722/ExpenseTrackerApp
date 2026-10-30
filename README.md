# Expense Tracker App

A React Native (Expo) app for a small company to record daily expenses
(milk, cake, chai, stationery, travel). It replaces the Excel sheet and the
WhatsApp group with structured entries and automatic totals.

## What it does

|                                                                             | Staff                        | Admin / Owner       |
| --------------------------------------------------------------------------- | ---------------------------- | ------------------- |
| Add an expense (item from a list, amount, category, date, note, bill photo) | ✅                           | ✅                  |
| See entries                                                                 | Only their own               | Everyone's          |
| Edit / delete an entry                                                      | Own entries, within 24 hours | Any entry, any time |
| Month totals, item / category totals                                        | Own entries                  | All entries         |
| Person-wise totals, date-range filter                                       | —                            | ✅                  |
| Share summary on WhatsApp                                                   | ✅                           | ✅                  |
| Export to Excel (.xlsx)                                                     | —                            | ✅                  |
| Manage staff (add/remove by mobile number)                                  | —                            | ✅                  |
| Manage items (add, rename, disable, approve requests)                       | Can request a new item       | ✅                  |

The same rules are enforced **twice**: the app hides what a role cannot use,
and the database (Row Level Security in `supabase/schema.sql`) refuses it
anyway, so a modified app cannot get around them.

## Folder structure

```
app/              Screens (Expo Router)
  (tabs)/         Home, Summary, Admin tabs (Admin tab only for admins)
  admin/          Staff and Items screens (admin only)
  expense/[id]    Expense details (photo, edit, delete)
  add-expense     Add / edit form
  entries         List with search + filters
  item-entries    All entries of one item (opened from a total)
components/       Reusable UI (Button, Card, pickers, totals, photo, states)
hooks/            useAuth (session + role), useExpenses, useItems, useQuery
lib/              Supabase client, API calls, money/date/format helpers,
                  validation, Excel + WhatsApp builders, sharing, bill photos
store/            NEW — zustand store shared by all screens (see below)
constants/        Colors and ALL text strings (ready for Hindi)
types/            TypeScript types
__tests__/        NEW — Jest unit tests
supabase/         schema.sql, seed.sql, migrate_from_v1.sql
assets/           App icon and splash screen
```

`store/dataStore.ts` holds a shared "data version". Any save, edit or delete
increases it, and every open screen re-loads, so a new expense appears
everywhere at once.

---

## 0. Quickest start: run everything on your PC (local Supabase in Docker)

No Supabase account, Twilio or SMS needed. Requires **Docker Desktop** running.

```bash
npm install
npm run db:start        # local Supabase: PostgreSQL, login, API, photo storage
npx expo start          # then press w (browser) or scan the QR with Expo Go
```

- `npm run db:start` applies `supabase/migrations/` (a copy of `schema.sql`)
  and `supabase/seed.local.sql` automatically.
- The app uses `.env.local` (local URL and key), which Expo reads before `.env`.
  Delete or rename `.env.local` to use the cloud project again.
- Ports are 553xx (API `55321`, DB `55322`, Studio `55323`) so they don't
  clash with other local Supabase projects on the same PC.
- **Database viewer:** Supabase Studio at http://127.0.0.1:55323, or pgAdmin
  with host `127.0.0.1`, port `55322`, user `postgres`, password `postgres`.

**Test logins (fixed OTPs, no SMS sent, set in `supabase/config.toml`):**

| Mobile     | OTP    | Role                                       |
| ---------- | ------ | ------------------------------------------ |
| 7489186674 | 123456 | Owner (admin)                              |
| 9000000001 | 111111 | Test Admin                                 |
| 9000000002 | 222222 | Ramesh (staff)                             |
| 9000000003 | 333333 | Not invited, shows "Number not registered" |

| Command            | What it does                                                |
| ------------------ | ----------------------------------------------------------- |
| `npm run db:stop`  | Stop local Supabase (data is kept)                          |
| `npm run db:reset` | Wipe local data and re-apply schema + seed                  |
| `npm run db:sync`  | Copy `schema.sql` into the local migration after editing it |

For a phone on the same Wi-Fi, `.env.local` uses this PC's network address
(`192.168.0.27`). If it changes, update `.env.local`. If the phone can't
connect, allow port 55321 in Windows Firewall.

## 1. Set up Supabase in the cloud (one time)

1. **Create a project** at [supabase.com](https://supabase.com) (the free plan is enough).
2. **Run the schema:** open **SQL Editor → New query**, paste the whole of
   `supabase/schema.sql` and press **Run**. It creates:
   - the tables `profiles`, `items`, `item_requests`, `staff_invites`, `expenses`
   - indexes, Row Level Security on every table, and triggers
   - the view `expenses_view` and the summary function `expense_summary`
   - the **private storage bucket `bills`** and its policies
   - the default items (Milk, Cake, Chai, Stationery, Travel, Other)

   You do **not** need to create the storage bucket by hand.

3. **Enable phone login:** go to **Authentication → Sign In / Providers → Phone**
   and turn it on.
   - For real SMS you need an SMS provider (Twilio, MessageBird, Vonage or
     Textlocal) and its keys in the same screen.
   - **For testing without SMS**, add _test phone numbers_ in the same Phone
     settings, e.g. `919000000001=123456`. Logging in with `9000000001`
     then accepts the OTP `123456` and no SMS is sent.
4. **Make the first admin.** Only invited numbers can use the app. In the SQL
   Editor, run this (with the owner's 10-digit number):

   ```sql
   insert into public.staff_invites (phone, full_name, role)
   values ('9876543210', 'Owner', 'admin')
   on conflict (phone) do update set role = 'admin';
   ```

   It works both before and after the owner's first login (see section 10 of
   `schema.sql`). After that, the admin adds staff from the app:
   **Admin → Staff → Add staff**.

5. **(Optional) Sample data:** after the admin has logged in once, run
   `supabase/seed.sql` for extra items and 15 sample expenses.
6. **Copy the keys:** **Project Settings → API**: the _Project URL_ and the
   _anon / publishable_ key.

### Migrating from the old schema

If you already ran the **old** `schema.sql` (expenses had a free-text
`item_name` column), run these files in this order. Do not drop your tables.

1. `supabase/migrate_from_v1.sql`. It turns every distinct item name into
   one row in `items`, so "milk" and "Milk" are merged into "Milk". It moves
   expenses to `item_id`, adds `expense_date`, and keeps existing users active.
2. `supabase/schema.sql`. It replaces the old policies (staff can no longer
   read everyone's rows), drops the unused `monthly_summary` function, and
   adds every existing user to the staff list.

Existing users created by the old schema are called "New User". Re-add them
in **Admin → Staff** with their real name (same number) to fix it.

## 2. Configure the app

```bash
cp .env.example .env
```

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

`.env` is in `.gitignore`. Never commit it. The app also still accepts the
older name `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. If both are missing, the
app shows a "not set up yet" message instead of crashing.

## 3. Run the app

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** (Android/iOS), or press `a` for an Android
emulator. Log in with your mobile number and the OTP.

| Command             | What it does                             |
| ------------------- | ---------------------------------------- |
| `npm run typecheck` | TypeScript strict check (`tsc --noEmit`) |
| `npm run lint`      | ESLint (Expo config + no `any`)          |
| `npm test`          | Jest unit tests                          |
| `npm run check`     | All three above                          |
| `npm run format`    | Prettier                                 |

## 4. Build an APK (Android) with EAS

```bash
npm install -g eas-cli
eas login
eas init                      # links the project to your Expo account (first time)

# The .env file is NOT uploaded to the build server. Add the two values once:
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://xxx.supabase.co" --environment preview --visibility plaintext
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-key" --environment preview --visibility plaintext

eas build --platform android --profile preview
```

The `preview` profile in `eas.json` builds an **APK** you can install
directly. EAS gives you a download link, and you do not need Android Studio.
For the Play Store, use `--profile production` (an `.aab` file) and create
the same variables for the `production` environment.

---

## Assumptions

Choices I made where the brief was unclear or did not match the code:

1. **Expo SDK 57, not 51.** The brief says SDK 51, but the project was
   already on SDK 57 (React Native 0.86, React 19). Moving down would mean
   reinstalling everything on older, unsupported versions. All new packages
   were installed with `npx expo install` and `npx expo install --check`
   passes.
2. **Supabase key name.** The existing `.env` used
   `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, but the brief asks for
   `EXPO_PUBLIC_SUPABASE_ANON_KEY`. The app reads `ANON_KEY` first and falls
   back to the old name.
3. **Only invited numbers can use the app.** A number that logs in without
   an invite gets an inactive profile and sees "Number not registered". The
   admin's own number is also invited (see section 1, step 4).
4. **Mobile numbers are Indian (+91)** and stored as 10 digits.
5. **"Other" item.** Picking "Other" asks "What was it?" (e.g. "Bulb"). All
   "Other" entries are totalled together as one item. When staff tap
   **Request new item**, the request goes to the admin and that expense is
   saved as "Other (name)" for now.
6. **Item names are stored in Title Case** ("milk powder" → "Milk Powder").
   Names are unique ignoring case. Items are **disabled**, never deleted, so
   old entries keep their name.
7. **Each expense has an expense date** (default today; "Yesterday" or any
   past date can be chosen). Totals and filters use this date. The 24-hour
   edit window for staff counts from when the entry was **created**.
8. **Double-tap protection:** the app creates the expense id when the form
   opens. A second tap or a retry sends the same id, the database rejects
   the duplicate, and the app treats it as already saved.
9. **Amounts:** more than 0, at most 2 decimals, up to 99,99,99,999.99.
   The app rejects 3+ decimals. If something writes to the database
   directly, Postgres rounds to 2 decimals.
10. **Bill photos** are resized to at most 1280 px wide and saved as JPEG
    (quality 0.6) at `bills/<user_id>/<expense_id>.jpg`. They are shown
    through signed links that expire after 1 hour. When an admin edits
    someone else's entry, the photo cannot be changed, because the photo
    lives in the owner's folder.
11. **Excel:** one sheet, columns Date (DD-MM-YYYY), Item, Category, Amount,
    Added by, Note, oldest first, with a Total row. It covers the month or
    date range chosen on Summary. The app uses SheetJS 0.20.3 from the
    official SheetJS CDN, because the npm copy (0.18.5) has known security
    issues.
12. **WhatsApp:** "Share on WhatsApp" opens `wa.me` with the text ready.
    "Share" opens the phone's share sheet. Admins also get person-wise lines.
13. **Company name** "Acme Traders" is in `constants/strings.ts`
    (`companyName`). Change it there.
14. **Lists show at most 300 entries.** Narrow the filters to see more.
    Totals always come from the database and are never cut off. The Excel
    export pages through every row.

## Known limitations

- **No offline saving.** Without internet, the app shows a red "You are
  offline" bar and friendly error messages with a **Try again** button, but
  entries are not queued to sync later.
- **Real OTP SMS** needs a paid SMS provider configured in Supabase. Use test
  numbers until then.
- **Screens refresh on your own phone only.** After a save, edit or delete,
  every screen on that phone updates at once. Changes made on _another_
  phone show up when you pull down to refresh or reopen a screen (Supabase
  Realtime is not used).
- **Search** matches item name, note and person name, and is not
  accent/Hindi aware yet.
- **Hindi:** all text is in `constants/strings.ts`, but no Hindi translation
  or language switch is included yet.
- **Web** (`npm run web`) mostly works but is not a target. Date fields
  become plain text boxes there.
- `assets/icon.png` and `assets/splash.png` are placeholders.
- **Testing done so far:** the database rules were tested on a local
  PostgreSQL 17 with stand-ins for Supabase's `auth` and `storage` schemas
  (staff/admin/uninvited access, 24-hour window, duplicates, storage
  folders, invites, migration). The screens have no automated UI tests.
  Use `TESTING.md` on a real phone.
