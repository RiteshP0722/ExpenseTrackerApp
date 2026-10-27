import { View, Text, StyleSheet, FlatList, RefreshControl } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useExpenses } from "../../hooks/useExpenses";
import Card from "../../components/Card";
import ExpenseRow from "../../components/ExpenseRow";
import Button from "../../components/Button";
import { colors } from "../../constants/colors";
import { strings } from "../../constants/strings";
import { formatCurrency, monthLabel } from "../../lib/formatCurrency";

const CATEGORY_ITEMS = ["Milk", "Cake", "Chai", "Stationery"];

export default function Home() {
  const { expenses, loading, error, total, byItem, refresh } = useExpenses();

  const topItems = Object.entries(byItem)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <FlatList
        data={expenses.slice(0, 5)}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.shopName}>Acme Traders</Text>
            <Text style={styles.title}>Daily Expenses</Text>

            <Card dark style={styles.totalCard}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>
                  {strings.thisMonth} · {monthLabel()}
                </Text>
              </View>
              <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
              <Text style={styles.totalSub}>
                {expenses.length} entries this month
              </Text>
            </Card>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <Text style={styles.sectionTitle}>{strings.byItem}</Text>
            <View style={styles.grid}>
              {(topItems.length ? topItems : CATEGORY_ITEMS.map((n) => [n, 0])).map(
                ([name, amount]) => (
                  <Card key={name} style={styles.gridCard}>
                    <Text style={styles.gridLabel}>{name}</Text>
                    <Text style={styles.gridValue}>
                      {formatCurrency(amount)}
                    </Text>
                  </Card>
                )
              )}
            </View>

            <Text style={styles.sectionTitle}>{strings.recent}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ marginBottom: 8 }}>
            <ExpenseRow expense={item} />
          </View>
        )}
        ListEmptyComponent={
          !loading && (
            <Text style={styles.emptyText}>{strings.emptyExpenses}</Text>
          )
        }
      />

      <Button
        title={"+  " + strings.addExpense}
        onPress={() => router.push("/add-expense")}
        style={styles.fab}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  listContent: { paddingHorizontal: 24, paddingBottom: 110 },
  header: { paddingTop: 12 },
  shopName: { fontSize: 13, color: colors.gray },
  title: { fontSize: 22, fontWeight: "700", color: colors.dark, marginBottom: 16 },
  totalCard: { padding: 20, marginBottom: 20 },
  totalRow: { flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { fontSize: 13, color: "#C9CFC9" },
  totalAmount: { fontSize: 34, fontWeight: "700", color: colors.white, marginTop: 6 },
  totalSub: { fontSize: 13, color: "#9FD9BC", marginTop: 6 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.dark, marginBottom: 10, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  gridCard: { width: "47%" },
  gridLabel: { fontSize: 13, color: colors.gray },
  gridValue: { fontSize: 17, fontWeight: "700", color: colors.dark, marginTop: 4 },
  errorText: { color: "#C0392B", marginBottom: 12, fontSize: 13 },
  emptyText: { textAlign: "center", color: colors.gray, marginTop: 40, fontSize: 14 },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 24,
    paddingHorizontal: 22,
    shadowColor: colors.green,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
});
