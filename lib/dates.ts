import { strings } from "../constants/strings";
import type { DateRange } from "../types/expense";

/**
 * Dates are passed around as "YYYY-MM-DD" strings (the same format
 * as the Postgres `date` column) to avoid time-zone surprises.
 */

export interface YearMonth {
  year: number;
  month: number; // 0 = January
}

const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isISODate(value: string): boolean {
  const m = ISO_RE.exec(value);
  if (!m) return false;
  const d = parseISODate(value);
  return toISODate(d) === value;
}

/** Local-time Date at midnight for "YYYY-MM-DD". */
export function parseISODate(iso: string): Date {
  const m = ISO_RE.exec(iso);
  if (!m) return new Date(NaN);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function currentYearMonth(now: Date = new Date()): YearMonth {
  return { year: now.getFullYear(), month: now.getMonth() };
}

export function shiftMonth(ym: YearMonth, delta: number): YearMonth {
  const total = ym.year * 12 + ym.month + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

export function compareYearMonth(a: YearMonth, b: YearMonth): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

export function monthRange(ym: YearMonth): DateRange {
  const lastDay = new Date(ym.year, ym.month + 1, 0).getDate();
  return {
    from: `${ym.year}-${pad(ym.month + 1)}-01`,
    to: `${ym.year}-${pad(ym.month + 1)}-${pad(lastDay)}`,
  };
}

/** "October 2026" */
export function monthLabel(ym: YearMonth = currentYearMonth()): string {
  return `${strings.monthsLong[ym.month]} ${ym.year}`;
}

/** "2026-10-06" -> "6 Oct 2026" */
export function formatDate(iso: string): string {
  const d = parseISODate(iso.slice(0, 10));
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${strings.monthsShort[d.getMonth()]} ${d.getFullYear()}`;
}

/** "2026-10-06" -> "06-10-2026" (used in Excel) */
export function formatDateDMY(iso: string): string {
  const m = ISO_RE.exec(iso.slice(0, 10));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : iso;
}

/** Label for a range: a full month shows "October 2026", otherwise "1 Oct 2026 – 15 Oct 2026". */
export function rangeLabel(range: DateRange): string {
  const from = parseISODate(range.from);
  const ym = { year: from.getFullYear(), month: from.getMonth() };
  const full = monthRange(ym);
  if (full.from === range.from && full.to === range.to) return monthLabel(ym);
  if (range.from === range.to) return formatDate(range.from);
  return `${formatDate(range.from)} – ${formatDate(range.to)}`;
}

/** True if `createdAt` (ISO timestamp) is less than `hours` hours before `now`. */
export function isWithinHours(createdAt: string, hours: number, now: Date = new Date()): boolean {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return false;
  return now.getTime() - created < hours * 60 * 60 * 1000;
}
