import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors } from "../constants/colors";

export type IconName = ComponentProps<typeof Ionicons>["name"];

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "outline" | "danger";
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Smaller height for secondary buttons inside lists (still ≥ 48px). */
  compact?: boolean;
}

export default function Button({
  title,
  onPress,
  variant = "primary",
  icon,
  loading = false,
  disabled = false,
  style,
  compact = false,
}: ButtonProps) {
  const isPrimary = variant === "primary";
  const textColor = isPrimary ? colors.white : variant === "danger" ? colors.red : colors.dark;
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        isPrimary ? styles.primary : variant === "danger" ? styles.danger : styles.outline,
        inactive && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.inner}>
          {icon ? <Ionicons name={icon} size={20} color={textColor} /> : null}
          <Text style={[styles.text, { color: textColor }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  compact: { minHeight: 48, paddingVertical: 10 },
  primary: { backgroundColor: colors.green },
  outline: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.redBg, borderWidth: 1, borderColor: colors.red },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  inner: { flexDirection: "row", alignItems: "center", gap: 8 },
  text: { fontWeight: "700", fontSize: 16 },
});
