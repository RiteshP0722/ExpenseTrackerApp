import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../constants/colors";

interface ScreenHeaderProps {
  title: string;
  /** Show a back arrow (for screens opened on top of the tabs). */
  back?: boolean;
  right?: ReactNode;
}

export default function ScreenHeader({ title, back = false, right }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      {back ? (
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/home"))}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.back}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={26} color={colors.dark} />
        </Pressable>
      ) : null}
      <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    minHeight: 56,
  },
  back: { width: 48, height: 48, alignItems: "center", justifyContent: "center", marginLeft: -12 },
  title: { flex: 1, fontSize: 20, fontWeight: "700", color: colors.dark },
});
