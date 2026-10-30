import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../constants/colors";

interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  dark?: boolean;
}

export default function Card({ children, style, dark = false }: CardProps) {
  return <View style={[styles.card, dark && styles.dark, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dark: {
    backgroundColor: colors.dark,
    borderWidth: 0,
  },
});
