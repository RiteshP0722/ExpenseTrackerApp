import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

/**
 * Fetches this month's expenses for the logged-in user's shop,
 * and exposes a function to add a new one.
 */
export function useExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error: fetchError } = await supabase
        .from("expenses")
        .select("*")
        .gte("created_at", startOfMonth.toISOString())
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setExpenses(data || []);
    } catch (err) {
      setError(err.message || "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addExpense({ item_name, category, amount, note }) {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;

    const { data, error: insertError } = await supabase
      .from("expenses")
      .insert({
        item_name,
        category,
        amount,
        note: note || null,
        created_by: user?.id,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    setExpenses((prev) => [data, ...prev]);
    return data;
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const byItem = expenses.reduce((acc, e) => {
    acc[e.item_name] = (acc[e.item_name] || 0) + Number(e.amount);
    return acc;
  }, {});

  const byCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {});

  return {
    expenses,
    loading,
    error,
    total,
    byItem,
    byCategory,
    refresh: load,
    addExpense,
  };
}
