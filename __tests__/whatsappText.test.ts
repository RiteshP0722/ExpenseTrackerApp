import { buildWhatsAppText, whatsAppUrl } from "../lib/whatsappText";
import type { ExpenseSummary } from "../types/expense";

const summary: ExpenseSummary = {
  total: 12345,
  entry_count: 23,
  by_item: [
    { id: "1", name: "Cake", total: 10645, entry_count: 3 },
    { id: "2", name: "Milk", total: 1200, entry_count: 18 },
    { id: "3", name: "Chai", total: 500, entry_count: 2 },
  ],
  by_category: [{ id: "Food", name: "Food", total: 12345, entry_count: 23 }],
  by_person: [
    { id: "a", name: "Asha", total: 12000, entry_count: 20 },
    { id: "b", name: "Ramesh", total: 345, entry_count: 3 },
  ],
};

describe("WhatsApp text builder", () => {
  it("builds readable lines with Indian amounts", () => {
    const text = buildWhatsAppText({ periodLabel: "October 2026", summary });
    expect(text).toBe(
      [
        "*Acme Traders — Expenses*",
        "October 2026",
        "Total: Rs 12,345 (23 entries)",
        "",
        "By item:",
        "Cake: Rs 10,645",
        "Milk: Rs 1,200",
        "Chai: Rs 500",
        "",
        "By category:",
        "Food: Rs 12,345",
      ].join("\n"),
    );
  });

  it("adds people only when asked (admin)", () => {
    const staffText = buildWhatsAppText({ periodLabel: "October 2026", summary });
    expect(staffText).not.toContain("By person:");

    const adminText = buildWhatsAppText({ periodLabel: "October 2026", summary, includePeople: true });
    expect(adminText).toContain("By person:\nAsha: Rs 12,000\nRamesh: Rs 345");
  });

  it("skips empty sections", () => {
    const text = buildWhatsAppText({
      periodLabel: "September 2026",
      summary: { total: 0, entry_count: 0, by_item: [], by_category: [], by_person: [] },
    });
    expect(text).toBe("*Acme Traders — Expenses*\nSeptember 2026\nTotal: Rs 0 (0 entries)");
  });

  it("encodes the text into a wa.me link", () => {
    expect(whatsAppUrl("Milk: Rs 1,200\nTotal & more")).toBe(
      "https://wa.me/?text=Milk%3A%20Rs%201%2C200%0ATotal%20%26%20more",
    );
  });
});
