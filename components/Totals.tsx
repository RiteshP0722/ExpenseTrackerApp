import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../constants/colors";
import { fill, strings } from "../constants/strings";
import { formatCurrency } from "../lib/formatCurrency";
import { barPercent } from "../lib/money";
import type { TotalRow } from "../types/expense";
import Card from "./Card";

const BAR_COLORS = [colors.green, colors.purpleText, colors.orangeText, colors.blue];

/** The big "calculator" number at the top of Home and Summary. */
export function TotalCard({ label, amount, sub }: { label: string; amount: number; sub: string }) {
  return (
    <Card dark style={styles.totalCard}>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={styles.totalAmount} adjustsFontSizeToFit numberOfLines={1} accessibilityRole="header">
        {formatCurrency(amount)}
      </Text>
      <Text style={styles.totalSub}>{sub}</Text>
    </Card>
  );
}

interface TotalsListProps {
  rows: readonly TotalRow[];
  onPressRow?: (row: TotalRow) => void;
}

/** One line per item/category/person with a bar; tappable when onPressRow is given. */
export function TotalsList({ rows, onPressRow }: TotalsListProps) {
  const max = rows[0]?.total ?? 0;
  return (
    <View style={styles.list}>
      {rows.map((row, i) => (
        <Pressable
          key={row.id}
          disabled={!onPressRow}
          onPress={() => onPressRow?.(row)}
          accessibilityRole={onPressRow ? "button" : undefined}
          accessibilityLabel={`${row.name}: ${formatCurrency(row.total)}`}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <View style={styles.rowHeader}>
            <Text style={styles.rowName} numberOfLines={1}>
              {row.name}
            </Text>
            <Text style={styles.rowValue}>{formatCurrency(row.total)}</Text>
            {onPressRow ? <Ionicons name="chevron-forward" size={18} color={colors.gray} /> : null}
          </View>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${barPercent(row.total, max)}%`,
                  backgroundColor: BAR_COLORS[i % BAR_COLORS.length],
                },
              ]}
            />
          </View>
          <Text style={styles.count}>{fill(strings.entriesCount, { count: row.entry_count })}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  totalCard: { padding: 20, marginBottom: 20 },
  totalLabel: { fontSize: 15, color: colors.totalLabel },
  totalAmount: { fontSize: 38, fontWeight: "700", color: colors.white, marginTop: 6 },
  totalSub: { fontSize: 15, color: colors.totalSub, marginTop: 6 },
  list: { gap: 8, marginBottom: 20 },
  row: {
    backgroundColor: colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    minHeight: 56,
  },
  pressed: { opacity: 0.8 },
  rowHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  rowName: { flex: 1, fontSize: 16, color: colors.dark },
  rowValue: { fontSize: 16, fontWeight: "700", color: colors.dark },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.border, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
  count: { fontSize: 13, color: colors.gray, marginTop: 6 },
});
