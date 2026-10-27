export type PaymentType = "cash" | "upi" | "card";

export type ExpenseCategory = "Food" | "Travel" | "Stationery" | "Other";

export interface Expense {
  id: string;
  shop_id: string;
  item_name: string;
  category: ExpenseCategory;
  amount: number;
  note: string | null;
  bill_photo_url: string | null;
  created_by: string;
  created_by_name: string;
  created_at: string;
}

export interface NewExpenseInput {
  item_name: string;
  category: ExpenseCategory;
  amount: number;
  note?: string;
}

export interface MonthSummary {
  total: number;
  entryCount: number;
  byItem: Record<string, number>;
  byCategory: Record<string, number>;
}
