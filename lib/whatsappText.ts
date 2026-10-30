import { fill, strings } from "../constants/strings";
import type { ExpenseSummary, TotalRow } from "../types/expense";
import { formatRupeesText } from "./formatCurrency";

interface WhatsAppTextOptions {
  periodLabel: string;
  summary: ExpenseSummary;
  includePeople?: boolean;
  company?: string;
}

function section(title: string, rows: readonly TotalRow[]): string[] {
  if (rows.length === 0) return [];
  return [
    "",
    title,
    ...rows.map((r) => fill(strings.waLine, { name: r.name, amount: formatRupeesText(r.total) })),
  ];
}

/**
 * Plain-text summary, one readable line per total, e.g.
 *
 *   *Acme Traders — Expenses*
 *   October 2026
 *   Total: Rs 12,345 (23 entries)
 *
 *   By item:
 *   Milk: Rs 1,200
 */
export function buildWhatsAppText({
  periodLabel,
  summary,
  includePeople = false,
  company = strings.companyName,
}: WhatsAppTextOptions): string {
  const lines = [
    fill(strings.waTitle, { company }),
    periodLabel,
    fill(strings.waTotal, {
      amount: formatRupeesText(summary.total),
      count: summary.entry_count,
    }),
    ...section(strings.waByItem, summary.by_item),
    ...section(strings.waByCategory, summary.by_category),
    ...(includePeople ? section(strings.waByPerson, summary.by_person) : []),
  ];
  return lines.join("\n");
}

export function whatsAppUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
