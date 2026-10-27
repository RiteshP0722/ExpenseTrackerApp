import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import { colors } from "../constants/colors";

export default function Index() {
  const { isLoggedIn, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (isLoggedIn) {
      router.replace("/(tabs)/home");
    } else {
      router.replace("/login");
    }
  }, [loading, isLoggedIn]);

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.green} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },
});
