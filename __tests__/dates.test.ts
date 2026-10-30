import {
  formatDate,
  formatDateDMY,
  isISODate,
  isWithinHours,
  monthLabel,
  monthRange,
  rangeLabel,
  shiftMonth,
} from "../lib/dates";

describe("date helpers", () => {
  it("builds month ranges including leap years", () => {
    expect(monthRange({ year: 2026, month: 9 })).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(monthRange({ year: 2028, month: 1 })).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  });

  it("moves between months across years", () => {
    expect(shiftMonth({ year: 2026, month: 0 }, -1)).toEqual({ year: 2025, month: 11 });
    expect(shiftMonth({ year: 2026, month: 11 }, 1)).toEqual({ year: 2027, month: 0 });
  });

  it("formats labels", () => {
    expect(monthLabel({ year: 2026, month: 9 })).toBe("October 2026");
    expect(formatDate("2026-10-06")).toBe("6 Oct 2026");
    expect(formatDateDMY("2026-10-06")).toBe("06-10-2026");
    expect(rangeLabel({ from: "2026-10-01", to: "2026-10-31" })).toBe("October 2026");
    expect(rangeLabel({ from: "2026-10-01", to: "2026-10-15" })).toBe("1 Oct 2026 – 15 Oct 2026");
  });

  it("validates ISO dates", () => {
    expect(isISODate("2026-10-06")).toBe(true);
    expect(isISODate("2026-02-30")).toBe(false);
    expect(isISODate("06-10-2026")).toBe(false);
  });

  it("checks the 24-hour edit window", () => {
    const now = new Date("2026-10-30T12:00:00Z");
    expect(isWithinHours("2026-10-29T13:00:00Z", 24, now)).toBe(true);
    expect(isWithinHours("2026-10-29T11:59:00Z", 24, now)).toBe(false);
  });
});
