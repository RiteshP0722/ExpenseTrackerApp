import { View, Text, StyleSheet } from "react-native";
import { colors } from "../constants/colors";
import { formatCurrency, formatDate } from "../lib/formatCurrency";

const CATEGORY_STYLES = {
  Food: { bg: colors.greenLight, fg: colors.green },
  Travel: { bg: colors.purpleBg, fg: colors.purpleText },
  Stationery: { bg: colors.purpleBg, fg: colors.purpleText },
  Other: { bg: colors.orangeBg, fg: colors.orangeText },
};

export default function ExpenseRow({ expense }) {
  const style = CATEGORY_STYLES[expense.category] || CATEGORY_STYLES.Other;
  const initial = (expense.item_name || "?").charAt(0).toUpperCase();

  return (
    <View style={styles.row}>
      <View style={[styles.avatar, { backgroundColor: style.bg }]}>
        <Text style={[styles.avatarText, { color: style.fg }]}>
          {initial}
        </Text>
      </View>

      <View style={styles.middle}>
        <Text style={styles.name}>{expense.item_name}</Text>
        <Text style={styles.meta}>
          {expense.created_by_name || "You"} · {formatDate(expense.created_at)}
        </Text>
      </View>

      <Text style={styles.amount}>{formatCurrency(expense.amount)}</Text>
    </View>
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
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "700",
  },
  middle: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.dark,
  },
  meta: {
    fontSize: 12,
    color: colors.gray,
    marginTop: 2,
  },
  amount: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.dark,
  },
});
