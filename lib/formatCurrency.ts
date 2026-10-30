import { toPaise } from "./money";

/**
 * Indian digit grouping without relying on Intl (which differs
 * between Hermes on Android and iOS): "123456" -> "1,23,456".
 */
export function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${rest},${last3}`;
}

/**
 * 123456 -> "1,23,456"; 45.5 -> "45.50". Whole rupees have no decimals.
 */
export function formatAmount(amount: number | string | null | undefined): string {
  const paise = Math.abs(toPaise(amount));
  const rupees = Math.floor(paise / 100);
  const rest = paise % 100;
  const whole = groupIndian(String(rupees));
  return rest === 0 ? whole : `${whole}.${String(rest).padStart(2, "0")}`;
}

/** 123456 -> "₹1,23,456", -50 -> "-₹50". */
export function formatCurrency(amount: number | string | null | undefined, symbol = "₹"): string {
  const negative = toPaise(amount) < 0;
  return `${negative ? "-" : ""}${symbol}${formatAmount(amount)}`;
}

/** Plain-text version for WhatsApp / SMS: 1200 -> "Rs 1,200". */
export function formatRupeesText(amount: number | string | null | undefined): string {
  return formatCurrency(amount, "Rs ");
}

/** Title Case with single spaces: "  mIlK   powder " -> "Milk Powder". Mirrors clean_name() in SQL. */
export function toDisplayName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/(^|[^a-z0-9])([a-z])/g, (_m, before: string, letter: string) => before + letter.toUpperCase());
}
