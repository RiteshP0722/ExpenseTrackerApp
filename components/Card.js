import { View, StyleSheet } from "react-native";
import { colors } from "../constants/colors";

export default function Card({ children, style, dark = false }) {
  return (
    <View style={[styles.card, dark && styles.dark, style]}>{children}</View>
  );
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
