import { barPercent, groupTotals, sumAmounts, toAmount, toPaise } from "../lib/money";

describe("total calculations", () => {
  it("adds amounts without floating point errors", () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(sumAmounts([0.1, 0.2])).toBe(0.3);
    expect(sumAmounts([19.99, 0.01, 30])).toBe(50);
  });

  it("accepts numeric strings from the database and ignores junk", () => {
    expect(sumAmounts(["50.00", 20, "abc", null, undefined])).toBe(70);
  });

  it("returns 0 for an empty list", () => {
    expect(sumAmounts([])).toBe(0);
  });

  it("converts to paise with rounding", () => {
    expect(toPaise(45.5)).toBe(4550);
    expect(toPaise("1.005")).toBe(101);
    expect(toPaise(Number.NaN)).toBe(0);
  });

  it("groups totals by key, biggest first, with counts", () => {
    const rows = [
      { item: "milk", name: "Milk", amount: 50 },
      { item: "cake", name: "Cake", amount: 300 },
      { item: "milk", name: "Milk", amount: 55.5 },
      { item: "chai", name: "Chai", amount: 20 },
    ];
    const totals = groupTotals(
      rows,
      (r) => r.item,
      (r) => r.name,
      (r) => r.amount,
    );
    expect(totals).toEqual([
      { id: "cake", name: "Cake", total: 300, entry_count: 1 },
      { id: "milk", name: "Milk", total: 105.5, entry_count: 2 },
      { id: "chai", name: "Chai", total: 20, entry_count: 1 },
    ]);
  });

  it("computes bar widths", () => {
    expect(barPercent(50, 100)).toBe(50);
    expect(barPercent(1, 1000)).toBe(4);
    expect(barPercent(0, 100)).toBe(0);
    expect(barPercent(10, 0)).toBe(0);
  });

  it("reads amounts from unknown database values", () => {
    expect(toAmount("12.50")).toBe(12.5);
    expect(toAmount(7)).toBe(7);
    expect(toAmount(null)).toBe(0);
    expect(toAmount("x")).toBe(0);
  });
});
