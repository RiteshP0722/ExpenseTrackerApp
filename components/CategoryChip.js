import { Pressable, Text, StyleSheet } from "react-native";
import { colors } from "../constants/colors";

export default function CategoryChip({ label, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.label, active && styles.labelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  label: {
    fontSize: 13,
    color: colors.dark,
  },
  labelActive: {
    color: colors.white,
    fontWeight: "700",
  },
});
