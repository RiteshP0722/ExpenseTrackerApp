import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useExpenses } from "../../hooks/useExpenses";
import Card from "../../components/Card";
import { colors } from "../../constants/colors";
import { strings } from "../../constants/strings";
import { formatCurrency, monthLabel } from "../../lib/formatCurrency";

const BAR_COLORS = [colors.green, colors.purpleText, colors.orangeText, colors.blue];

export default function Summary() {
  const { total, expenses, byItem, byCategory, loading } = useExpenses();

  const itemEntries = Object.entries(byItem).sort((a, b) => b[1] - a[1]);
  const maxItemAmount = itemEntries.length ? itemEntries[0][1] : 1;
  const categoryEntries = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{strings.summary}</Text>

        <Card dark style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total this month</Text>
          <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
          <Text style={styles.totalSub}>
            {monthLabel()} · {expenses.length} entries
          </Text>
        </Card>

        <Text style={styles.sectionTitle}>{strings.byItem}</Text>
        {itemEntries.length === 0 && !loading && (
          <Text style={styles.emptyText}>{strings.emptyExpenses}</Text>
        )}
        {itemEntries.map(([name, amount], i) => (
          <View key={name} style={styles.barRow}>
            <View style={styles.barHeader}>
              <Text style={styles.barLabel}>{name}</Text>
              <Text style={styles.barValue}>{formatCurrency(amount)}</Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.max(8, (amount / maxItemAmount) * 100)}%`,
                    backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                  },
                ]}
              />
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>{strings.byCategory}</Text>
        {categoryEntries.map(([name, amount], i) => (
          <Card key={name} style={styles.categoryCard}>
            <View style={styles.categoryRow}>
              <View style={styles.categoryLeft}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: BAR_COLORS[i % BAR_COLORS.length] },
                  ]}
                />
                <Text style={styles.categoryName}>{name}</Text>
              </View>
              <Text style={styles.categoryValue}>{formatCurrency(amount)}</Text>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingBottom: 60 },
  title: { fontSize: 18, fontWeight: "700", color: colors.dark, marginBottom: 12 },
  totalCard: { padding: 22, marginBottom: 24 },
  totalLabel: { fontSize: 13, color: "#C9CFC9" },
  totalAmount: { fontSize: 36, fontWeight: "700", color: colors.white, marginTop: 6 },
  totalSub: { fontSize: 13, color: "#9FD9BC", marginTop: 6 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.dark, marginBottom: 12, marginTop: 8 },
  emptyText: { color: colors.gray, fontSize: 13, marginBottom: 12 },
  barRow: { marginBottom: 16 },
  barHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  barLabel: { fontSize: 14, color: colors.dark },
  barValue: { fontSize: 14, fontWeight: "700", color: colors.dark },
  barTrack: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  categoryCard: { marginBottom: 8 },
  categoryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  categoryLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  categoryName: { fontSize: 14, color: colors.dark },
  categoryValue: { fontSize: 14, fontWeight: "700", color: colors.dark },
});
