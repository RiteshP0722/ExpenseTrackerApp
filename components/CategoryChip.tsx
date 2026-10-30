import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../constants/colors";

interface CategoryChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

export default function CategoryChip({ label, active, onPress }: CategoryChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 16,
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
    fontSize: 15,
    color: colors.dark,
  },
  labelActive: {
    color: colors.white,
    fontWeight: "700",
  },
});
