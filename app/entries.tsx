import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../components/Button";
import ExpenseRow from "../components/ExpenseRow";
import PeriodPicker, { initialPeriod, periodRange, type Period } from "../components/PeriodPicker";
import { EmptyState, ErrorState, InlineError, LoadingState } from "../components/ScreenState";
import ScreenHeader from "../components/ScreenHeader";
import SelectField from "../components/SelectField";
import { colors } from "../constants/colors";
import { fill, strings } from "../constants/strings";
import { useAuth } from "../hooks/useAuth";
import { useExpenseList } from "../hooks/useExpenses";
import { useItems, usePeople } from "../hooks/useItems";
import { LIST_LIMIT } from "../lib/api";
import { formatCurrency } from "../lib/formatCurrency";
import { sumAmounts } from "../lib/money";
import { CATEGORIES, type ExpenseCategory, type ExpenseFilters } from "../types/expense";

/** Staff: their own entries. Admin: everyone's, with search and filters. (RLS decides the rows.) */
export default function Entries() {
  const { user, isAdmin } = useAuth();
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);

  // Wait until typing stops before searching.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchText.trim()), 400);
    return () => clearTimeout(t);
  }, [searchText]);

  const items = useItems(true);
  const people = usePeople(isAdmin);
  const range = periodRange(period);
  const filters: ExpenseFilters = useMemo(
    () => ({ range, search, category, itemId, personId: isAdmin ? personId : null }),
    // range is rebuilt each render; its from/to strings are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [range.from, range.to, search, category, itemId, personId, isAdmin],
  );
  const list = useExpenseList(filters);
  const rows = list.data ?? [];
  const filtered = !!(search || category || itemId || personId);

  const header = (
    <View>
      <PeriodPicker value={period} onChange={setPeriod} allowRange={isAdmin} />
      <TextInput
        value={searchText}
        onChangeText={setSearchText}
        placeholder={strings.searchPlaceholder}
        placeholderTextColor={colors.grayLight}
        style={styles.search}
        accessibilityLabel={strings.search}
        autoCorrect={false}
      />
      <SelectField
        label={strings.filterCategory}
        placeholder={strings.all}
        options={CATEGORIES.map((c) => ({ id: c, label: strings.categories[c] }))}
        value={category}
        onChange={(v) => setCategory((v as ExpenseCategory | null) ?? null)}
        allowClear
      />
      <SelectField
        label={strings.filterItem}
        placeholder={strings.all}
        options={(items.data ?? []).map((i) => ({ id: i.id, label: i.name }))}
        value={itemId}
        onChange={setItemId}
        allowClear
        searchable
      />
      {isAdmin ? (
        <SelectField
          label={strings.filterPerson}
          placeholder={strings.all}
          options={(people.data ?? []).map((p) => ({ id: p.id, label: p.full_name || p.phone || "?" }))}
          value={personId}
          onChange={setPersonId}
          allowClear
          searchable
        />
      ) : null}
      {filtered ? (
        <Button
          title={strings.clearFilters}
          variant="outline"
          compact
          onPress={() => {
            setSearchText("");
            setCategory(null);
            setItemId(null);
            setPersonId(null);
          }}
          style={styles.clear}
        />
      ) : null}

      {list.error && list.data ? <InlineError message={list.error} onRetry={list.reload} /> : null}
      {list.data && rows.length > 0 ? (
        <Text style={styles.summary}>
          {fill(strings.entriesCount, { count: rows.length })}
          {rows.length < LIST_LIMIT ? ` · ${formatCurrency(sumAmounts(rows.map((r) => r.amount)))}` : ""}
        </Text>
      ) : null}
      {rows.length >= LIST_LIMIT ? (
        <Text style={styles.limit}>{fill(strings.showingFirst, { count: LIST_LIMIT })}</Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title={isAdmin ? strings.allEntries : strings.myEntries} back />
      <FlatList
        data={rows}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl refreshing={list.refreshing} onRefresh={list.reload} colors={[colors.green]} />
        }
        renderItem={({ item }) => (
          <ExpenseRow
            expense={item}
            currentUserId={user?.id}
            onPress={() => router.push({ pathname: "/expense/[id]", params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={
          list.loading ? (
            <LoadingState />
          ) : list.error ? (
            <ErrorState message={list.error} onRetry={list.reload} />
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
  search: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.dark,
  },
  clear: { marginTop: 12, alignSelf: "flex-start" },
  summary: { fontSize: 16, fontWeight: "700", color: colors.dark, marginTop: 20, marginBottom: 10 },
  limit: { fontSize: 14, color: colors.orangeText, marginBottom: 10 },
  separator: { height: 8 },
});
