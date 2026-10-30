import { useCallback } from "react";
import * as api from "../lib/api";
import { deleteBillPhoto, uploadBillPhoto } from "../lib/billPhoto";
import { invalidateData } from "../store/dataStore";
import type { DateRange, Expense, ExpenseFilters, ExpenseInput } from "../types/expense";
import { useQuery } from "./useQuery";

export function useExpenseList(filters: ExpenseFilters, enabled = true) {
  return useQuery(`expenses:${JSON.stringify(filters)}`, () => api.fetchExpenses(filters), enabled);
}

export function useRecentExpenses(limit: number) {
  return useQuery(`recent:${limit}`, () => api.fetchRecentExpenses(limit));
}

export function useExpense(id: string | undefined) {
  return useQuery(`expense:${id ?? ""}`, () => api.fetchExpense(id ?? ""), !!id);
}

/** Totals come from the `expense_summary` RPC — summed in Postgres, not on the phone. */
export function useSummary(range: DateRange) {
  return useQuery(`summary:${range.from}:${range.to}`, () => api.fetchSummary(range));
}

export interface SaveExpenseArgs {
  input: ExpenseInput;
  isNew: boolean;
  userId: string;
  /** A new local photo to upload, `null` to remove the photo, `undefined` to keep it. */
  photoUri: string | null | undefined;
  previousPhotoPath: string | null;
}

/** Save / edit / delete. Each one bumps the shared data version so every screen refreshes. */
export function useExpenseMutations() {
  const saveExpense = useCallback(async (args: SaveExpenseArgs) => {
    const { input, isNew, userId, photoUri, previousPhotoPath } = args;
    let billPath = previousPhotoPath;

    if (photoUri) {
      billPath = await uploadBillPhoto(photoUri, userId, input.id);
    } else if (photoUri === null) {
      billPath = null;
    }

    const row: ExpenseInput = { ...input, bill_photo_url: billPath };
    if (isNew) {
      await api.insertExpense(row);
    } else {
      const { id, ...patch } = row;
      await api.updateExpense(id, patch);
    }

    if (photoUri === null && previousPhotoPath) {
      await deleteBillPhoto(previousPhotoPath).catch(() => undefined);
    }
    invalidateData();
  }, []);

  const removeExpense = useCallback(async (expense: Pick<Expense, "id" | "bill_photo_url">) => {
    await api.deleteExpense(expense);
    invalidateData();
  }, []);

  return { saveExpense, removeExpense };
}
