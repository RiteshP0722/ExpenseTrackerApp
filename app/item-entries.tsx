import { router, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { EmptyState, ErrorState, LoadingState } from "../components/ScreenState";
import ScreenHeader from "../components/ScreenHeader";
import { TotalCard } from "../components/Totals";
import { colors } from "../constants/colors";
import { fill, strings } from "../constants/strings";
import { useAuth } from "../hooks/useAuth";
import { useExpenseList } from "../hooks/useExpenses";
import { formatDate, isISODate, rangeLabel } from "../lib/dates";
import { formatCurrency } from "../lib/formatCurrency";
import { sumAmounts } from "../lib/money";

/** All entries of one item in a period: date, person, amount. Opened by tapping an item total. */
export default function ItemEntries() {
  const params = useLocalSearchParams<{ itemId: string; name: string; from: string; to: string }>();
  const { user } = useAuth();
  const itemId = typeof params.itemId === "string" ? params.itemId : "";
  const name = typeof params.name === "string" ? params.name : "";
  const from = typeof params.from === "string" && isISODate(params.from) ? params.from : "";
  const to = typeof params.to === "string" && isISODate(params.to) ? params.to : "";
  const valid = !!itemId && !!from && !!to;

  const filters = useMemo(() => ({ range: { from, to }, itemId }), [from, to, itemId]);
  const list = useExpenseList(filters, valid);
  const rows = list.data ?? [];
  const title = fill(strings.itemEntriesTitle, { name });

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title={title} back />
      <FlatList
        data={rows}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={list.refreshing} onRefresh={list.reload} colors={[colors.green]} />
        }
        ListHeaderComponent={
          list.data ? (
            <TotalCard
              label={valid ? rangeLabel({ from, to }) : ""}
              amount={sumAmounts(rows.map((r) => r.amount))}
              sub={fill(strings.entriesCount, { count: rows.length })}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: "/expense/[id]", params: { id: item.id } })}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.date}>{formatDate(item.expense_date)}</Text>
              <Text style={styles.person} numberOfLines={1}>
                {item.created_by === user?.id ? strings.you : item.created_by_name}
                {item.custom_name ? ` · ${item.custom_name}` : ""}
              </Text>
            </View>
            <Text style={styles.amount}>{formatCurrency(item.amount)}</Text>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          list.loading ? (
            <LoadingState />
          ) : list.error || !valid ? (
            <ErrorState message={list.error ?? strings.errorGeneric} onRetry={list.reload} />
          ) : (
            <EmptyState text={strings.emptyPeriod} />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    minHeight: 64,
    gap: 12,
  },
  pressed: { opacity: 0.8 },
  rowLeft: { flex: 1 },
  date: { fontSize: 16, fontWeight: "600", color: colors.dark },
  person: { fontSize: 14, color: colors.gray, marginTop: 2 },
  amount: { fontSize: 17, fontWeight: "700", color: colors.dark },
  separator: { height: 8 },
});
