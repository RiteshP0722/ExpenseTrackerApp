import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../constants/colors";
import { strings } from "../constants/strings";
import { formatDate } from "../lib/dates";
import { formatCurrency } from "../lib/formatCurrency";
import type { Expense, ExpenseCategory } from "../types/expense";

const CATEGORY_STYLES: Record<ExpenseCategory, { bg: string; fg: string }> = {
  Food: { bg: colors.greenLight, fg: colors.green },
  Travel: { bg: colors.purpleBg, fg: colors.purpleText },
  Stationery: { bg: colors.purpleBg, fg: colors.purpleText },
  Other: { bg: colors.orangeBg, fg: colors.orangeText },
};

interface ExpenseRowProps {
  expense: Expense;
  /** Id of the logged-in user, to show "You" instead of their name. */
  currentUserId?: string | null;
  onPress?: () => void;
}

export default function ExpenseRow({ expense, currentUserId, onPress }: ExpenseRowProps) {
  const style = CATEGORY_STYLES[expense.category] ?? CATEGORY_STYLES.Other;
  const initial = (expense.display_name || "?").charAt(0).toUpperCase();
  const who = expense.created_by === currentUserId ? strings.you : expense.created_by_name;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.avatar, { backgroundColor: style.bg }]}>
        <Text style={[styles.avatarText, { color: style.fg }]}>{initial}</Text>
      </View>

      <View style={styles.middle}>
        <Text style={styles.name} numberOfLines={1}>
          {expense.display_name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {who} · {formatDate(expense.expense_date)}
        </Text>
      </View>

      {expense.bill_photo_url ? (
        <Ionicons
          name="receipt-outline"
          size={18}
          color={colors.gray}
          accessibilityLabel={strings.billPhoto}
        />
      ) : null}
      <Text style={styles.amount}>{formatCurrency(expense.amount)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 64,
  },
  pressed: { opacity: 0.8 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 16, fontWeight: "700" },
  middle: { flex: 1 },
  name: { fontSize: 16, fontWeight: "600", color: colors.dark },
  meta: { fontSize: 13, color: colors.gray, marginTop: 2 },
  amount: { fontSize: 16, fontWeight: "700", color: colors.dark },
});
