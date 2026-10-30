import { buildExcelRows, excelColumnWidths, excelFileName } from "../lib/excelRows";
import type { Expense } from "../types/expense";

type Row = Pick<
  Expense,
  "expense_date" | "display_name" | "category" | "amount" | "created_by_name" | "note"
>;

const expenses: Row[] = [
  {
    expense_date: "2026-10-05",
    display_name: "Cake",
    category: "Food",
    amount: 450,
    created_by_name: "Asha",
    note: "Birthday",
  },
  {
    expense_date: "2026-10-01",
    display_name: "Milk",
    category: "Food",
    amount: 50.5,
    created_by_name: "Ramesh",
    note: null,
  },
  {
    expense_date: "2026-10-03",
    display_name: "Other (Bulb)",
    category: "Other",
    amount: 0.1,
    created_by_name: "Ramesh",
    note: null,
  },
];

describe("Excel row builder", () => {
  const rows = buildExcelRows(expenses);

  it("starts with the required headers", () => {
    expect(rows[0]).toEqual(["Date", "Item", "Category", "Amount", "Added by", "Note"]);
  });

  it("has one row per expense, oldest first, dates as DD-MM-YYYY", () => {
    expect(rows.slice(1, -1)).toEqual([
      ["01-10-2026", "Milk", "Food", 50.5, "Ramesh", ""],
      ["03-10-2026", "Other (Bulb)", "Other", 0.1, "Ramesh", ""],
      ["05-10-2026", "Cake", "Food", 450, "Asha", "Birthday"],
    ]);
  });

  it("ends with a correct total row", () => {
    expect(rows[rows.length - 1]).toEqual(["", "Total", "", 500.6, "", ""]);
  });

  it("keeps the amount as a number so Excel can sum it", () => {
    expect(typeof rows[1]?.[3]).toBe("number");
  });

  it("works for an empty list (header + zero total)", () => {
    expect(buildExcelRows([])).toEqual([
      ["Date", "Item", "Category", "Amount", "Added by", "Note"],
      ["", "Total", "", 0, "", ""],
    ]);
  });

  it("does not change the input order", () => {
    buildExcelRows(expenses);
    expect(expenses[0]?.display_name).toBe("Cake");
  });

  it("names the file after the range", () => {
    expect(excelFileName({ from: "2026-10-01", to: "2026-10-31" })).toBe(
      "Expenses_2026-10-01_to_2026-10-31.xlsx",
    );
  });

  it("sizes columns to the content", () => {
    const widths = excelColumnWidths(rows);
    expect(widths).toHaveLength(6);
    expect(widths[1]).toBe("Other (Bulb)".length + 2);
  });
});
