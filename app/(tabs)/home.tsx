import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/Button";
import Card from "../../components/Card";
import ExpenseRow from "../../components/ExpenseRow";
import { EmptyState, ErrorState, LoadingState } from "../../components/ScreenState";
import { TotalCard } from "../../components/Totals";
import { colors } from "../../constants/colors";
import { fill, strings } from "../../constants/strings";
import { useAuth } from "../../hooks/useAuth";
import { useRecentExpenses, useSummary } from "../../hooks/useExpenses";
import { confirm } from "../../lib/confirm";
import { currentYearMonth, monthLabel, monthRange } from "../../lib/dates";
import { formatCurrency } from "../../lib/formatCurrency";

const RECENT_COUNT = 5;

export default function Home() {
  const { user, profile, signOut } = useAuth();
  const month = useMemo(() => currentYearMonth(), []);
  const range = useMemo(() => monthRange(month), [month]);
  const summary = useSummary(range);
  const recent = useRecentExpenses(RECENT_COUNT);

  const topItems = summary.data?.by_item.slice(0, 4) ?? [];
  const name = profile?.full_name || profile?.phone || "";

  async function handleLogout() {
    if (await confirm(strings.logout, strings.logoutConfirm, strings.logout)) await signOut();
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={summary.refreshing || recent.refreshing}
            onRefresh={() => {
              summary.reload();
              recent.reload();
            }}
            colors={[colors.green]}
          />
        }
      >
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.shopName}>{strings.companyName}</Text>
            <Text style={styles.title}>{fill(strings.hello, { name })}</Text>
          </View>
          <Pressable
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel={strings.logout}
            style={styles.logout}
          >
            <Ionicons name="log-out-outline" size={22} color={colors.gray} />
            <Text style={styles.logoutText}>{strings.logout}</Text>
          </Pressable>
        </View>

        {summary.loading ? (
          <LoadingState />
        ) : summary.error && !summary.data ? (
          <ErrorState message={summary.error} onRetry={summary.reload} />
        ) : (
          <>
            <TotalCard
              label={`${strings.thisMonth} · ${monthLabel(month)}`}
              amount={summary.data?.total ?? 0}
              sub={fill(strings.entriesCount, { count: summary.data?.entry_count ?? 0 })}
            />

            {topItems.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>{strings.byItem}</Text>
                <View style={styles.grid}>
                  {topItems.map((row) => (
                    <Pressable
                      key={row.id}
                      style={styles.gridCell}
                      accessibilityRole="button"
                      onPress={() =>
                        router.push({
                          pathname: "/item-entries",
                          params: { itemId: row.id, name: row.name, from: range.from, to: range.to },
                        })
                      }
                    >
                      <Card>
                        <Text style={styles.gridLabel} numberOfLines={1}>
                          {row.name}
                        </Text>
                        <Text style={styles.gridValue}>{formatCurrency(row.total)}</Text>
                      </Card>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>{strings.recent}</Text>
          <Pressable onPress={() => router.push("/entries")} accessibilityRole="button" style={styles.seeAll}>
            <Text style={styles.seeAllText}>{strings.seeAll}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.green} />
          </Pressable>
        </View>

        {recent.loading ? (
          <LoadingState />
        ) : recent.error && !recent.data ? (
          <ErrorState message={recent.error} onRetry={recent.reload} />
        ) : recent.data && recent.data.length > 0 ? (
          <View style={styles.list}>
            {recent.data.map((e) => (
              <ExpenseRow
                key={e.id}
                expense={e}
                currentUserId={user?.id}
                onPress={() => router.push({ pathname: "/expense/[id]", params: { id: e.id } })}
              />
            ))}
          </View>
        ) : (
          <EmptyState text={strings.emptyExpenses} />
        )}
      </ScrollView>

      <Button
        title={`+  ${strings.addExpense}`}
        onPress={() => router.push("/add-expense")}
        style={styles.fab}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 120 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 16, gap: 8 },
  headerText: { flex: 1 },
  shopName: { fontSize: 15, color: colors.gray },
  title: { fontSize: 22, fontWeight: "700", color: colors.dark },
  logout: { minHeight: 48, minWidth: 48, alignItems: "center", justifyContent: "center" },
  logoutText: { fontSize: 12, color: colors.gray },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.dark, marginBottom: 10, marginTop: 4 },
  seeAll: { flexDirection: "row", alignItems: "center", minHeight: 48, paddingLeft: 12 },
  seeAllText: { fontSize: 16, color: colors.green, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  gridCell: { width: "48%", flexGrow: 1 },
  gridLabel: { fontSize: 15, color: colors.gray },
  gridValue: { fontSize: 19, fontWeight: "700", color: colors.dark, marginTop: 4 },
  list: { gap: 8 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    left: 20,
    shadowColor: colors.green,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
});
