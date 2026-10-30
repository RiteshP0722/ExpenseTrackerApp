# Plan — Expense Tracker App

## Bugs to fix first (spec section 3)

| #   | Problem                                                                                | Fix                                                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Add Expense has its own copy of `useExpenses` state, so Home and Summary do not update | One zustand store (`store/dataStore.ts`) holds a data version. Every save, edit or delete bumps it, and every screen re-fetches                                         |
| 2   | `created_by_name` does not exist                                                       | `expenses_view` (security-invoker view) joins `profiles` and `items`                                                                                                    |
| 3   | Every user can read every expense; `monthly_summary` is unused                         | New RLS: staff read only their own rows, admin reads all. `monthly_summary` is replaced by `expense_summary` (used by Summary)                                          |
| 4   | No role in the app                                                                     | `useAuth` loads `profiles` and exposes `role`, `isAdmin`, `isActive`                                                                                                    |
| 5   | Items are free text                                                                    | `items` table (unique, case-insensitive names, kept in Title Case) plus an item picker. "Other" item with a short custom name. `item_requests` table for staff requests |
| 6   | Bill photo, Excel export, WhatsApp share not built                                     | Features A, C, D                                                                                                                                                        |
| 7   | Summary shows only the current month                                                   | Month picker for everyone, date range for admin                                                                                                                         |
| 8   | No loading, empty or error states                                                      | `ScreenState` component (loading / empty / error + Retry) on every screen                                                                                               |
| 9   | Dependency versions                                                                    | `npx expo install --check` / `--fix`                                                                                                                                    |
| 10  | No tests or lint                                                                       | Jest (jest-expo), ESLint (eslint-config-expo), Prettier                                                                                                                 |

## Features (spec section 4, built in order A to G)

- **A. Bill photo:** camera or gallery → resize and compress → private `bills` bucket at `<uid>/<expenseId>.jpg` → thumbnail and full-screen preview through a signed URL.
- **B. Totals:** `expense_summary(from, to)` RPC returns total, by item, by category and by person in one call. Tapping an item opens its entries.
- **C. Excel (admin):** `xlsx` → base64 → cache file → `expo-sharing`.
- **D. WhatsApp:** plain-text summary → `wa.me`, falling back to the native share sheet.
- **E. Admin area:** entries with search and filters, edit and delete, staff list (`staff_invites`), items, item requests.
- **F. Staff edit and delete:** only their own rows, only within 24 hours. Enforced by RLS and by an immutable-columns trigger.
- **G. Safety:** client-generated expense id (a second tap fails on the primary key and is treated as already saved) and a disabled Save while saving. Zod validation (amount > 0, at most 2 decimals), trimmed text, confirm before delete.

## Order of work

1. Tooling: TypeScript strict, ESLint, Prettier, Jest, dependency check
2. Database: `schema.sql` and `seed.sql`
3. Pure libraries and tests: money, format, dates, validation, Excel rows, WhatsApp text
4. Data layer: supabase client, api, store, hooks, auth with role
5. Screens: login, home, add/edit, summary, entries, expense detail, admin
6. Docs: README, TESTING.md
7. Final check: `tsc`, lint, tests, `expo start`
