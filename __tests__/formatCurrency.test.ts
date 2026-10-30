import {
  formatAmount,
  formatCurrency,
  formatRupeesText,
  groupIndian,
  toDisplayName,
} from "../lib/formatCurrency";

describe("currency formatting (Indian style)", () => {
  it("groups digits as lakh/crore", () => {
    expect(groupIndian("1")).toBe("1");
    expect(groupIndian("999")).toBe("999");
    expect(groupIndian("1000")).toBe("1,000");
    expect(groupIndian("123456")).toBe("1,23,456");
    expect(groupIndian("12345678")).toBe("1,23,45,678");
  });

  it("formats rupees with the ₹ sign", () => {
    expect(formatCurrency(0)).toBe("₹0");
    expect(formatCurrency(123456)).toBe("₹1,23,456");
    expect(formatCurrency(1200)).toBe("₹1,200");
    expect(formatCurrency("99.5")).toBe("₹99.50");
    expect(formatCurrency(10000000.25)).toBe("₹1,00,00,000.25");
  });

  it("handles negatives, null and junk safely", () => {
    expect(formatCurrency(-50)).toBe("-₹50");
    expect(formatCurrency(null)).toBe("₹0");
    expect(formatCurrency(undefined)).toBe("₹0");
    expect(formatCurrency("abc")).toBe("₹0");
  });

  it("rounds to 2 decimals", () => {
    expect(formatAmount(10.005)).toBe("10.01");
    expect(formatAmount(10.004)).toBe("10");
  });

  it("formats plain text for WhatsApp", () => {
    expect(formatRupeesText(1200)).toBe("Rs 1,200");
  });

  it("shows item names in one consistent case", () => {
    expect(toDisplayName("milk")).toBe("Milk");
    expect(toDisplayName("  mIlK   powder ")).toBe("Milk Powder");
    expect(toDisplayName("pen & files")).toBe("Pen & Files");
    expect(toDisplayName("2nd floor tea")).toBe("2nd Floor Tea");
  });
});
