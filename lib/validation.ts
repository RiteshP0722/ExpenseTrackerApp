import { z } from "zod";
import { strings } from "../constants/strings";
import { CATEGORIES } from "../types/expense";
import { isISODate, todayISO } from "./dates";

export const MAX_AMOUNT = 9999999999.99; // numeric(12, 2)
const AMOUNT_RE = /^\d+(\.\d+)?$/;

/** "1,250.5 " -> 1250.5, or null when it is not a plain positive number. */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.trim().replace(/,/g, "");
  if (!AMOUNT_RE.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const amountField = z.string().superRefine((raw, ctx) => {
  const cleaned = raw.trim().replace(/,/g, "");
  if (cleaned === "") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: strings.amountRequired });
    return;
  }
  const n = parseAmount(cleaned);
  if (n === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: strings.amountInvalid });
    return;
  }
  if ((cleaned.split(".")[1] ?? "").length > 2) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: strings.amountDecimals });
    return;
  }
  if (n <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: strings.amountPositive });
    return;
  }
  if (n > MAX_AMOUNT) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: strings.amountTooLarge });
  }
});

export const expenseFormSchema = z
  .object({
    itemId: z.string().min(1, strings.itemRequired),
    isOther: z.boolean(),
    customName: z.string(),
    amount: amountField,
    category: z.enum(CATEGORIES),
    expenseDate: z.string(),
    note: z.string().max(200, strings.noteTooLong),
  })
  .superRefine((v, ctx) => {
    if (v.isOther) {
      const len = v.customName.trim().replace(/\s+/g, " ").length;
      if (len < 2 || len > 60) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customName"],
          message: strings.otherNameRequired,
        });
      }
    }
    if (!isISODate(v.expenseDate)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["expenseDate"], message: strings.dateRequired });
    } else if (v.expenseDate > todayISO()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["expenseDate"], message: strings.dateFuture });
    }
  });

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

/** Form values -> cleaned values ready to save (trimmed, number amount). */
export function cleanExpenseForm(v: ExpenseFormValues): {
  itemId: string;
  customName: string | null;
  amount: number;
  category: ExpenseFormValues["category"];
  expenseDate: string;
  note: string | null;
} {
  const customName = v.isOther ? v.customName.trim().replace(/\s+/g, " ") : "";
  const note = v.note.trim();
  return {
    itemId: v.itemId,
    customName: customName === "" ? null : customName,
    amount: parseAmount(v.amount) ?? 0,
    category: v.category,
    expenseDate: v.expenseDate,
    note: note === "" ? null : note,
  };
}

/** "+91 98765-43210" -> "9876543210" */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .refine((p) => /^[6-9]\d{9}$/.test(p), strings.phoneInvalid);

export const otpSchema = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => /^\d{6}$/.test(s), strings.otpInvalid);

export const personNameSchema = z
  .string()
  .transform((s) => s.trim().replace(/\s+/g, " "))
  .refine((s) => s.length >= 1 && s.length <= 60, strings.nameRequired);

export const itemNameSchema = z
  .string()
  .transform((s) => s.trim().replace(/\s+/g, " "))
  .refine((s) => s.length >= 2 && s.length <= 60, strings.itemNameInvalid);

export const staffFormSchema = z.object({
  fullName: personNameSchema,
  phone: phoneSchema,
  role: z.enum(["staff", "admin"]),
});

export const itemFormSchema = z.object({
  name: itemNameSchema,
  defaultCategory: z.enum(CATEGORIES),
});

/** Returns the first error message of a zod result, or null. */
export function firstError(result: z.SafeParseReturnType<unknown, unknown>): string | null {
  if (result.success) return null;
  return result.error.issues[0]?.message ?? strings.errorGeneric;
}
