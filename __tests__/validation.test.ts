import { strings } from "../constants/strings";
import { addDaysISO, todayISO } from "../lib/dates";
import { otpSendError } from "../lib/errors";
import {
  cleanExpenseForm,
  expenseFormSchema,
  firstError,
  itemFormSchema,
  normalizePhone,
  otpSchema,
  parseAmount,
  phoneSchema,
  staffFormSchema,
  type ExpenseFormValues,
} from "../lib/validation";

const valid: ExpenseFormValues = {
  itemId: "item-1",
  isOther: false,
  customName: "",
  amount: "120",
  category: "Food",
  expenseDate: todayISO(),
  note: "",
};

function errorFor(values: Partial<ExpenseFormValues>): string | null {
  return firstError(expenseFormSchema.safeParse({ ...valid, ...values }));
}

describe("expense form validation", () => {
  it("accepts a normal expense", () => {
    expect(errorFor({})).toBeNull();
    expect(errorFor({ amount: "45.50" })).toBeNull();
    expect(errorFor({ amount: "1,250" })).toBeNull();
    expect(errorFor({ amount: " 99.9 " })).toBeNull();
  });

  it("requires an amount greater than 0", () => {
    expect(errorFor({ amount: "" })).toBe(strings.amountRequired);
    expect(errorFor({ amount: "0" })).toBe(strings.amountPositive);
    expect(errorFor({ amount: "0.00" })).toBe(strings.amountPositive);
    expect(errorFor({ amount: "-5" })).toBe(strings.amountInvalid);
    expect(errorFor({ amount: "abc" })).toBe(strings.amountInvalid);
    expect(errorFor({ amount: "1e3" })).toBe(strings.amountInvalid);
  });

  it("allows at most 2 decimals", () => {
    expect(errorFor({ amount: "10.123" })).toBe(strings.amountDecimals);
    expect(errorFor({ amount: "10.12" })).toBeNull();
  });

  it("rejects absurdly large amounts", () => {
    expect(errorFor({ amount: "99999999999" })).toBe(strings.amountTooLarge);
  });

  it("requires an item", () => {
    expect(errorFor({ itemId: "" })).toBe(strings.itemRequired);
  });

  it("requires a name when the item is Other", () => {
    expect(errorFor({ isOther: true, customName: "  " })).toBe(strings.otherNameRequired);
    expect(errorFor({ isOther: true, customName: "Bulb" })).toBeNull();
  });

  it("does not allow future dates", () => {
    expect(errorFor({ expenseDate: addDaysISO(todayISO(), 1) })).toBe(strings.dateFuture);
    expect(errorFor({ expenseDate: "2026-02-30" })).toBe(strings.dateRequired);
  });

  it("limits the note to 200 characters", () => {
    expect(errorFor({ note: "x".repeat(201) })).toBe(strings.noteTooLong);
  });

  it("trims and converts values before saving", () => {
    const cleaned = cleanExpenseForm({
      ...valid,
      isOther: true,
      customName: "  led   bulb ",
      amount: "1,250.5",
      note: "   ",
    });
    expect(cleaned).toEqual({
      itemId: "item-1",
      customName: "led bulb",
      amount: 1250.5,
      category: "Food",
      expenseDate: valid.expenseDate,
      note: null,
    });
  });

  it("drops the custom name when the item is not Other", () => {
    expect(cleanExpenseForm({ ...valid, customName: "leftover" }).customName).toBeNull();
  });

  it("parses amounts", () => {
    expect(parseAmount("12.5")).toBe(12.5);
    expect(parseAmount("12.")).toBeNull();
    expect(parseAmount("")).toBeNull();
  });
});

describe("phone, OTP, staff and item validation", () => {
  it("normalizes Indian mobile numbers", () => {
    expect(normalizePhone("+91 98765-43210")).toBe("9876543210");
    expect(normalizePhone("919876543210")).toBe("9876543210");
    expect(phoneSchema.safeParse("98765 43210").success).toBe(true);
    expect(phoneSchema.safeParse("12345").success).toBe(false);
    expect(phoneSchema.safeParse("1234567890").success).toBe(false);
  });

  it("checks the OTP is 6 digits", () => {
    expect(otpSchema.safeParse(" 123456 ").success).toBe(true);
    expect(otpSchema.safeParse("1234").success).toBe(false);
  });

  it("validates the staff form and trims names", () => {
    const ok = staffFormSchema.safeParse({ fullName: "  Asha   Rao ", phone: "9876543210", role: "staff" });
    expect(ok.success && ok.data.fullName).toBe("Asha Rao");
    expect(staffFormSchema.safeParse({ fullName: " ", phone: "9876543210", role: "staff" }).success).toBe(
      false,
    );
  });

  it("validates item names", () => {
    expect(itemFormSchema.safeParse({ name: "Bread", defaultCategory: "Food" }).success).toBe(true);
    expect(itemFormSchema.safeParse({ name: " a ", defaultCategory: "Food" }).success).toBe(false);
  });
});

describe("OTP send errors", () => {
  it("hides raw SMS provider errors", () => {
    const err = {
      message:
        "Error sending confirmation OTP to provider: invalid character '<' looking for beginning of value",
    };
    expect(otpSendError(err)).toBe(strings.otpProviderError);
    expect(otpSendError({ message: "Network request failed" })).toBe(strings.errorOffline);
    expect(otpSendError({ status: 429, message: "x" })).toBe(strings.otpTooMany);
  });
});
