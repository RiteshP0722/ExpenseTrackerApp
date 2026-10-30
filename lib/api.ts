/**
 * All database calls in one place. Screens never talk to Supabase
 * directly; they use the hooks in /hooks, which call these.
 * Row Level Security in schema.sql decides what each user may see.
 */
import type {
  DateRange,
  Expense,
  ExpenseCategory,
  ExpenseFilters,
  ExpenseInput,
  ExpenseSummary,
  Item,
  ItemRequest,
  Profile,
  Role,
  StaffMember,
  TotalRow,
} from "../types/expense";
import { AppError, isDuplicateError } from "./errors";
import { toAmount } from "./money";
import { BILLS_BUCKET, supabase } from "./supabase";

export const LIST_LIMIT = 300;

type Row = Record<string, unknown>;

const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const strOrNull = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);

function toExpense(r: Row): Expense {
  return {
    id: str(r.id),
    item_id: str(r.item_id),
    item_name: str(r.item_name),
    custom_name: strOrNull(r.custom_name),
    display_name: str(r.display_name) || str(r.item_name),
    category: str(r.category) as ExpenseCategory,
    amount: toAmount(r.amount),
    expense_date: str(r.expense_date),
    note: strOrNull(r.note),
    bill_photo_url: strOrNull(r.bill_photo_url),
    created_by: str(r.created_by),
    created_by_name: str(r.created_by_name),
    created_at: str(r.created_at),
    updated_at: str(r.updated_at),
  };
}

function toTotalRows(v: unknown): TotalRow[] {
  if (!Array.isArray(v)) return [];
  return v.map((x: Row) => ({
    id: str(x.id),
    name: str(x.name),
    total: toAmount(x.total),
    entry_count: Number(x.entry_count) || 0,
  }));
}

// ---------- Profile ----------

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, active")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const r = data as Row;
  return {
    id: str(r.id),
    full_name: strOrNull(r.full_name),
    phone: strOrNull(r.phone),
    role: r.role === "admin" ? "admin" : "staff",
    active: r.active === true,
  };
}

export async function fetchPeople(): Promise<Pick<Profile, "id" | "full_name" | "phone">[]> {
  const { data, error } = await supabase.from("profiles").select("id, full_name, phone").order("full_name");
  if (error) throw error;
  return ((data ?? []) as Row[]).map((r) => ({
    id: str(r.id),
    full_name: strOrNull(r.full_name),
    phone: strOrNull(r.phone),
  }));
}

// ---------- Expenses ----------

/** Removes characters that have a meaning in PostgREST filter strings. */
function safeSearch(text: string): string {
  return text.replace(/[,()*%\\:"']/g, " ").trim();
}

function expensesQuery(filters: ExpenseFilters) {
  let q = supabase
    .from("expenses_view")
    .select("*")
    .gte("expense_date", filters.range.from)
    .lte("expense_date", filters.range.to);

  if (filters.category) q = q.eq("category", filters.category);
  if (filters.itemId) q = q.eq("item_id", filters.itemId);
  if (filters.personId) q = q.eq("created_by", filters.personId);
  const s = safeSearch(filters.search ?? "");
  if (s) {
    q = q.or(`display_name.ilike.*${s}*,note.ilike.*${s}*,created_by_name.ilike.*${s}*`);
  }

  return q.order("expense_date", { ascending: false }).order("created_at", { ascending: false });
}

export async function fetchExpenses(filters: ExpenseFilters, limit = LIST_LIMIT): Promise<Expense[]> {
  const { data, error } = await expensesQuery(filters).limit(limit);
  if (error) throw error;
  return ((data ?? []) as Row[]).map(toExpense);
}

/** Every matching row, fetched 1000 at a time (Supabase's per-request maximum). Used for Excel. */
export async function fetchAllExpenses(filters: ExpenseFilters): Promise<Expense[]> {
  const PAGE = 1000;
  const all: Expense[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await expensesQuery(filters)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Row[];
    all.push(...rows.map(toExpense));
    if (rows.length < PAGE) return all;
  }
}

export async function fetchRecentExpenses(limit: number): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses_view")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as Row[]).map(toExpense);
}

export async function fetchExpense(id: string): Promise<Expense | null> {
  const { data, error } = await supabase.from("expenses_view").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toExpense(data as Row) : null;
}

export async function fetchSummary(range: DateRange): Promise<ExpenseSummary> {
  const { data, error } = await supabase.rpc("expense_summary", { p_from: range.from, p_to: range.to });
  if (error) throw error;
  const r = (data ?? {}) as Row;
  return {
    total: toAmount(r.total),
    entry_count: Number(r.entry_count) || 0,
    by_item: toTotalRows(r.by_item),
    by_category: toTotalRows(r.by_category),
    by_person: toTotalRows(r.by_person),
  };
}

/**
 * Inserts an expense. The app creates the id itself, so if the same
 * save is sent twice (double tap, retry after a timeout) the second
 * insert hits the primary key and we treat it as already saved.
 */
export async function insertExpense(input: ExpenseInput): Promise<void> {
  const { error } = await supabase.from("expenses").insert(input);
  if (error && !isDuplicateError(error)) throw error;
}

export async function updateExpense(id: string, patch: Omit<ExpenseInput, "id">): Promise<void> {
  // .select() makes RLS refusals visible: a blocked update returns 0 rows instead of an error.
  const { data, error } = await supabase.from("expenses").update(patch).eq("id", id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new AppError("42501", "permission denied");
}

export async function deleteExpense(expense: Pick<Expense, "id" | "bill_photo_url">): Promise<void> {
  const { data, error } = await supabase.from("expenses").delete().eq("id", expense.id).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new AppError("42501", "permission denied");
  if (expense.bill_photo_url) {
    // Best effort: the entry is already gone, a left-over photo is harmless.
    await supabase.storage.from(BILLS_BUCKET).remove([expense.bill_photo_url]);
  }
}

// ---------- Items ----------

function toItem(r: Row): Item {
  return {
    id: str(r.id),
    name: str(r.name),
    default_category: str(r.default_category) as ExpenseCategory,
    active: r.active === true,
    is_other: r.is_other === true,
  };
}

export async function fetchItems(includeInactive: boolean): Promise<Item[]> {
  let q = supabase.from("items").select("id, name, default_category, active, is_other");
  if (!includeInactive) q = q.eq("active", true);
  const { data, error } = await q.order("is_other").order("name");
  if (error) throw error;
  return ((data ?? []) as Row[]).map(toItem);
}

export async function addItem(name: string, defaultCategory: ExpenseCategory): Promise<void> {
  const { error } = await supabase.from("items").insert({ name, default_category: defaultCategory });
  if (error) throw error;
}

export async function updateItem(
  id: string,
  patch: Partial<Pick<Item, "name" | "default_category" | "active">>,
): Promise<void> {
  const { error } = await supabase.from("items").update(patch).eq("id", id);
  if (error) throw error;
}

export async function createItemRequest(name: string): Promise<void> {
  const { error } = await supabase.from("item_requests").insert({ name });
  if (error) throw error;
}

export async function fetchItemRequests(): Promise<ItemRequest[]> {
  const { data, error } = await supabase
    .from("item_requests")
    .select("id, name, requested_by, status, created_at, profiles(full_name, phone)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Row[]).map((r) => {
    const p = (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles) as Row | null | undefined;
    return {
      id: str(r.id),
      name: str(r.name),
      requested_by: str(r.requested_by),
      requested_by_name: str(p?.full_name) || str(p?.phone),
      status: "pending",
      created_at: str(r.created_at),
    };
  });
}

export async function approveItemRequest(id: string, category: ExpenseCategory): Promise<void> {
  const { error } = await supabase.rpc("approve_item_request", { p_request_id: id, p_category: category });
  if (error) throw error;
}

export async function rejectItemRequest(id: string): Promise<void> {
  const { error } = await supabase.from("item_requests").update({ status: "rejected" }).eq("id", id);
  if (error) throw error;
}

// ---------- Staff ----------

export async function fetchStaff(): Promise<StaffMember[]> {
  const [invites, profiles] = await Promise.all([
    supabase.from("staff_invites").select("phone, full_name, role, created_at").order("full_name"),
    supabase.from("profiles").select("id, phone, active"),
  ]);
  if (invites.error) throw invites.error;
  if (profiles.error) throw profiles.error;
  const byPhone = new Map(((profiles.data ?? []) as Row[]).map((p) => [str(p.phone), p]));
  return ((invites.data ?? []) as Row[]).map((r) => {
    const p = byPhone.get(str(r.phone));
    return {
      phone: str(r.phone),
      full_name: str(r.full_name),
      role: (r.role === "admin" ? "admin" : "staff") as Role,
      created_at: str(r.created_at),
      profile_id: p ? str(p.id) : null,
      active: p ? p.active === true : false,
    };
  });
}

export async function addStaff(phone: string, fullName: string, role: Role): Promise<void> {
  const { error } = await supabase
    .from("staff_invites")
    .upsert({ phone, full_name: fullName, role }, { onConflict: "phone" });
  if (error) throw error;
}

export async function removeStaff(phone: string): Promise<void> {
  const { error } = await supabase.from("staff_invites").delete().eq("phone", phone);
  if (error) throw error;
}
