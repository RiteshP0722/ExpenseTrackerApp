import { router } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../../components/Button";
import PeriodPicker, { initialPeriod, periodRange, type Period } from "../../components/PeriodPicker";
import { EmptyState, ErrorState, InlineError, LoadingState } from "../../components/ScreenState";
import ScreenHeader from "../../components/ScreenHeader";
import { TotalCard, TotalsList } from "../../components/Totals";
import { colors } from "../../constants/colors";
import { fill, strings } from "../../constants/strings";
import { useAuth } from "../../hooks/useAuth";
import { useSummary } from "../../hooks/useExpenses";
import { fetchAllExpenses } from "../../lib/api";
import { rangeLabel } from "../../lib/dates";
import { friendlyError } from "../../lib/errors";
import { exportExpensesToExcel, shareOnWhatsApp, shareText } from "../../lib/share";
import { buildWhatsAppText } from "../../lib/whatsappText";

export default function Summary() {
  const { isAdmin } = useAuth();
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const range = periodRange(period);
  const label = rangeLabel(range);
  const summary = useSummary(range);
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const data = summary.data;
  const hasEntries = !!data && data.entry_count > 0;

  function whatsAppText(): string {
    if (!data) return "";
    return buildWhatsAppText({ periodLabel: label, summary: data, includePeople: isAdmin });
  }

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    setActionError(null);
    try {
      const expenses = await fetchAllExpenses({ range });
      await exportExpensesToExcel(expenses, range);
    } catch (err) {
      setActionError(friendlyError(err));
    } finally {
      setExporting(false);
    }
  }

  async function handleShare(kind: "whatsapp" | "other") {
    setActionError(null);
    try {
      if (kind === "whatsapp") await shareOnWhatsApp(whatsAppText());
      else await shareText(whatsAppText());
    } catch (err) {
      setActionError(friendlyError(err));
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScreenHeader title={strings.summary} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={summary.refreshing}
            onRefresh={summary.reload}
            colors={[colors.green]}
          />
        }
      >
        <PeriodPicker value={period} onChange={setPeriod} allowRange={isAdmin} />

        {summary.loading ? (
          <LoadingState />
        ) : summary.error && !data ? (
          <ErrorState message={summary.error} onRetry={summary.reload} />
        ) : data ? (
          <>
            {summary.error ? <InlineError message={summary.error} onRetry={summary.reload} /> : null}
            <TotalCard
              label={period.mode === "month" ? strings.monthTotal : fill(strings.totalFor, { period: label })}
              amount={data.total}
              sub={`${label} · ${fill(strings.entriesCount, { count: data.entry_count })}`}
            />

            {actionError ? <InlineError message={actionError} /> : null}
            {hasEntries ? (
              <View style={styles.actions}>
                <View style={styles.actionRow}>
                  <Button
                    title={strings.shareWhatsApp}
                    icon="logo-whatsapp"
                    onPress={() => void handleShare("whatsapp")}
                    style={styles.flex}
                  />
                  <Button
                    title={strings.shareOther}
                    icon="share-social-outline"
                    variant="outline"
                    onPress={() => void handleShare("other")}
                  />
                </View>
                {isAdmin ? (
                  <Button
                    title={exporting ? strings.exporting : strings.exportExcel}
                    icon="document-outline"
                    variant="outline"
                    loading={exporting}
                    onPress={handleExport}
                  />
                ) : null}
              </View>
            ) : (
              <EmptyState text={strings.emptyPeriod} />
            )}

            {data.by_item.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>{strings.byItem}</Text>
                <TotalsList
                  rows={data.by_item}
                  onPressRow={(row) =>
                    router.push({
                      pathname: "/item-entries",
                      params: { itemId: row.id, name: row.name, from: range.from, to: range.to },
                    })
                  }
                />
              </>
            ) : null}

            {data.by_category.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>{strings.byCategory}</Text>
                <TotalsList rows={data.by_category} />
              </>
            ) : null}

            {isAdmin && data.by_person.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>{strings.byPerson}</Text>
                <TotalsList rows={data.by_person} />
              </>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingBottom: 60 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: colors.dark, marginBottom: 10, marginTop: 4 },
  actions: { gap: 10, marginBottom: 24 },
  actionRow: { flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
});
