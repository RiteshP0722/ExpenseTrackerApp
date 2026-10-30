export const CATEGORIES = ["Food", "Travel", "Stationery", "Other"] as const;
export type ExpenseCategory = (typeof CATEGORIES)[number];

export type Role = "staff" | "admin";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: Role;
  active: boolean;
}

export interface Item {
  id: string;
  name: string;
  default_category: ExpenseCategory;
  active: boolean;
  is_other: boolean;
}

/** A row of the `expenses_view` view (expense + item name + person name). */
export interface Expense {
  id: string;
  item_id: string;
  item_name: string;
  custom_name: string | null;
  display_name: string;
  category: ExpenseCategory;
  amount: number;
  expense_date: string; // YYYY-MM-DD
  note: string | null;
  bill_photo_url: string | null;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

/** What the app writes to the `expenses` table. */
export interface ExpenseInput {
  id: string;
  item_id: string;
  custom_name: string | null;
  category: ExpenseCategory;
  amount: number;
  expense_date: string;
  note: string | null;
  bill_photo_url: string | null;
}

export interface TotalRow {
  id: string;
  name: string;
  total: number;
  entry_count: number;
}

export interface ExpenseSummary {
  total: number;
  entry_count: number;
  by_item: TotalRow[];
  by_category: TotalRow[];
  by_person: TotalRow[];
}

/** Inclusive range of calendar days, both as YYYY-MM-DD. */
export interface DateRange {
  from: string;
  to: string;
}

export interface ExpenseFilters {
  range: DateRange;
  search?: string;
  category?: ExpenseCategory | null;
  itemId?: string | null;
  personId?: string | null;
}

export interface StaffMember {
  phone: string;
  full_name: string;
  role: Role;
  created_at: string;
  profile_id: string | null;
  active: boolean;
}

export interface ItemRequest {
  id: string;
  name: string;
  requested_by: string;
  requested_by_name: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}
