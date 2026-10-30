import { strings } from "../constants/strings";
import type { DateRange, Expense } from "../types/expense";
import { formatDateDMY } from "./dates";
import { sumAmounts } from "./money";

export type ExcelCell = string | number;
export type ExcelRow = ExcelCell[];

type ExportableExpense = Pick<
  Expense,
  "expense_date" | "display_name" | "category" | "amount" | "created_by_name" | "note"
>;

/**
 * Builds the sheet as rows of cells:
 *   header row, one row per expense (oldest first), then a Total row.
 * Amount stays a number so Excel can add it up.
 */
export function buildExcelRows(expenses: readonly ExportableExpense[]): ExcelRow[] {
  const sorted = [...expenses].sort((a, b) => a.expense_date.localeCompare(b.expense_date));
  const body: ExcelRow[] = sorted.map((e) => [
    formatDateDMY(e.expense_date),
    e.display_name,
    strings.categories[e.category],
    Number(e.amount),
    e.created_by_name,
    e.note ?? "",
  ]);
  const total = sumAmounts(sorted.map((e) => e.amount));
  return [[...strings.excelHeaders], ...body, ["", strings.excelTotal, "", total, "", ""]];
}

/** "Expenses_2026-10-01_to_2026-10-31.xlsx" */
export function excelFileName(range: DateRange): string {
  return `${strings.excelFilePrefix}_${range.from}_to_${range.to}.xlsx`;
}

/** Column widths (in characters) that fit the data reasonably. */
export function excelColumnWidths(rows: readonly ExcelRow[]): number[] {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, i) => {
      const len = String(cell).length;
      widths[i] = Math.min(40, Math.max(widths[i] ?? 8, len + 2));
    });
  }
  return widths;
}
