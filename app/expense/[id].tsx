import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BillThumbnail, NoPhoto } from "../../components/BillPhoto";
import Button from "../../components/Button";
import Card from "../../components/Card";
import { ErrorState, InlineError, LoadingState } from "../../components/ScreenState";
import ScreenHeader from "../../components/ScreenHeader";
import { colors } from "../../constants/colors";
import { fill, strings } from "../../constants/strings";
import { useAuth } from "../../hooks/useAuth";
import { useExpense, useExpenseMutations } from "../../hooks/useExpenses";
import { confirm } from "../../lib/confirm";
import { formatDate, isWithinHours } from "../../lib/dates";
import { friendlyError } from "../../lib/errors";
import { formatCurrency } from "../../lib/formatCurrency";

function Line({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.line}>
      <Text style={styles.lineLabel}>{label}</Text>
      <Text style={styles.lineValue}>{value}</Text>
    </View>
  );
}

export default function ExpenseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isAdmin } = useAuth();
  const query = useExpense(typeof id === "string" ? id : undefined);
  const { removeExpense } = useExpenseMutations();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const expense = query.data;

  if (query.loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title={strings.expenseDetails} back />
        <LoadingState />
      </SafeAreaView>
    );
  }
  if (query.error || !expense) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title={strings.expenseDetails} back />
        <ErrorState message={query.error ?? strings.errorGeneric} onRetry={query.reload} />
      </SafeAreaView>
    );
  }

  const isOwner = expense.created_by === user?.id;
  // Same rule as the RLS policies in schema.sql.
  const canChange = isAdmin || (isOwner && isWithinHours(expense.created_at, 24));

  async function handleDelete() {
    if (!expense || deleting) return;
    const ok = await confirm(
      strings.deleteConfirmTitle,
      fill(strings.deleteConfirmBody, { name: expense.display_name, amount: formatCurrency(expense.amount) }),
      strings.delete,
    );
    if (!ok) return;
    setDeleting(true);
    setError(null);
    try {
      await removeExpense(expense);
      router.back();
    } catch (err) {
      setError(friendlyError(err));
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title={strings.expenseDetails} back />
      <ScrollView contentContainerStyle={styles.content}>
        <Card dark style={styles.top}>
          <Text style={styles.name}>{expense.display_name}</Text>
          <Text style={styles.amount}>{formatCurrency(expense.amount)}</Text>
        </Card>

        <Card>
          <Line label={strings.date} value={formatDate(expense.expense_date)} />
          <Line label={strings.category} value={strings.categories[expense.category] ?? expense.category} />
          <Line label={strings.addedBy} value={isOwner ? strings.you : expense.created_by_name} />
          {expense.note ? <Line label={strings.note} value={expense.note} /> : null}
        </Card>

        <Text style={styles.section}>{strings.billPhoto}</Text>
        {expense.bill_photo_url ? <BillThumbnail source={expense.bill_photo_url} size={140} /> : <NoPhoto />}

        {error ? <InlineError message={error} /> : null}

        {canChange ? (
          <View style={styles.actions}>
            <Button
              title={strings.edit}
              icon="create-outline"
              onPress={() => router.push({ pathname: "/add-expense", params: { id: expense.id } })}
            />
            <Button
              title={strings.delete}
              icon="trash-outline"
              variant="danger"
              loading={deleting}
              onPress={handleDelete}
            />
          </View>
        ) : isOwner ? (
          <Text style={styles.hint}>{strings.editWindowOver}</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  top: { padding: 20 },
  name: { fontSize: 18, color: colors.totalLabel },
  amount: { fontSize: 34, fontWeight: "700", color: colors.white, marginTop: 4 },
  line: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.bg },
  lineLabel: { fontSize: 14, color: colors.gray },
  lineValue: { fontSize: 17, color: colors.dark, marginTop: 2 },
  section: { fontSize: 17, fontWeight: "700", color: colors.dark, marginTop: 8 },
  actions: { gap: 10, marginTop: 12 },
  hint: { fontSize: 15, color: colors.gray, marginTop: 12, lineHeight: 21 },
});
