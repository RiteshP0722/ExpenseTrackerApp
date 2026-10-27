# Expense Tracker App

A React Native (Expo) app for tracking a small company's daily expenses
(milk, cake, stationery, etc.) — replacing Excel sheets and WhatsApp groups.

## What's included

- Login with mobile number + OTP (Supabase Auth)
- Home screen: this month's total, item-wise totals, recent expenses
- Add Expense form with validation (react-hook-form + zod)
- Summary screen: item-wise and category-wise breakdown with bar charts
- Supabase backend with Row Level Security
- Fully working navigation (Expo Router — tabs + stack)

## 1. Install dependencies

```bash
npm install
```

## 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to the **SQL Editor** and run the contents of `supabase/schema.sql`
3. Go to **Authentication → Providers** and enable **Phone** auth
   - For real SMS OTP you'll need to connect a provider like Twilio
   - For quick testing, Supabase lets you add test phone numbers with a fixed OTP (Authentication → Settings)
4. Go to **Project Settings → API** and copy your **Project URL** and **anon public key**

## 3. Add your environment variables

Copy `.env.example` to `.env` and fill in your Supabase values:

```bash
cp .env.example .env
```

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key-here
```

## 4. Run the app

```bash
npx expo start
```

- Scan the QR code with the **Expo Go** app on your phone, or
- Press `a` for Android emulator / `i` for iOS simulator

## 5. (Optional) Add sample data

After you log in once, find your user id in Supabase under
**Authentication → Users**, then paste it into `supabase/seed.sql`
and run that file in the SQL Editor to add a few test expenses.

## 6. Build for Android (APK/AAB)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android
```

This builds in the cloud and gives you a download link — no Android
Studio required.

## Folder structure

```
app/              Screens and navigation (Expo Router)
components/       Reusable UI pieces (Button, Card, ExpenseRow...)
hooks/            useAuth, useExpenses — data and auth logic
lib/              Supabase client, currency/date formatting
constants/        Colors and text strings
types/            TypeScript types for Expense data
supabase/         schema.sql and seed.sql for the database
assets/           App icon and splash screen (replace with your own)
```

## Known limitations / Next steps

- `assets/icon.png` and `assets/splash.png` are placeholders — replace
  them with your own 1024x1024 PNGs before publishing
- Bill photo attach (camera) is in the UI design but not yet wired up —
  add `expo-image-picker` and upload to Supabase Storage to complete it
- WhatsApp share and Excel export buttons are not yet wired up — use
  the `Linking` API (wa.me) and the `xlsx` library respectively
- No automated tests yet — see the React Native course guide for how
  to add Jest tests
- Admin-only views (seeing everyone's expenses, staff management) are
  not built yet; the database schema already supports roles (see
  `profiles.role` in schema.sql) to build this on top of
