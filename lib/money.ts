import type { TotalRow } from "../types/expense";

/**
 * Money is added up in whole paise (integers) so that
 * 0.1 + 0.2 style floating-point errors never show up in totals.
 */
export function toPaise(value: number | string | null | undefined): number {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  if (!Number.isFinite(n) || n === 0) return 0;
  // The tiny nudge fixes cases like 1.005 * 100 = 100.49999999999999.
  return Math.sign(n) * Math.round(Math.abs(n) * 100 + 1e-7);
}

export function fromPaise(paise: number): number {
  return paise / 100;
}

export function sumAmounts(values: readonly (number | string | null | undefined)[]): number {
  return fromPaise(values.reduce<number>((sum, v) => sum + toPaise(v), 0));
}

/**
 * Groups rows and adds up their amounts, biggest total first.
 * Used for small lists already on the phone (e.g. the item-entries
 * screen); month totals come from the `expense_summary` RPC.
 */
export function groupTotals<T>(
  rows: readonly T[],
  getId: (row: T) => string,
  getName: (row: T) => string,
  getAmount: (row: T) => number | string,
): TotalRow[] {
  const map = new Map<string, { name: string; paise: number; count: number }>();
  for (const row of rows) {
    const id = getId(row);
    const current = map.get(id) ?? { name: getName(row), paise: 0, count: 0 };
    current.paise += toPaise(getAmount(row));
    current.count += 1;
    map.set(id, current);
  }
  return [...map.entries()]
    .map(([id, v]) => ({ id, name: v.name, total: fromPaise(v.paise), entry_count: v.count }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

/** Width of a bar (0–100) relative to the biggest value; at least `min` so tiny values stay visible. */
export function barPercent(value: number, max: number, min = 4): number {
  if (max <= 0 || value <= 0) return 0;
  return Math.max(min, Math.min(100, (value / max) * 100));
}

/** Turns a value from the database (number or numeric string) into a number. */
export function toAmount(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}
