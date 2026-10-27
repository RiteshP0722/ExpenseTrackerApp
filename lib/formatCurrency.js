/**
 * Formats a number as Indian Rupees with lakh/crore style grouping.
 * e.g. 123456 -> "₹1,23,456"
 */
export function formatCurrency(amount) {
  const value = Number(amount) || 0;
  const formatted = new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Math.abs(value));
  return (value < 0 ? "-₹" : "₹") + formatted;
}

/**
 * Formats a date string/Date into "6 Oct 2026" style.
 */
export function formatDate(dateInput) {
  const date = new Date(dateInput);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function monthLabel(date = new Date()) {
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}
