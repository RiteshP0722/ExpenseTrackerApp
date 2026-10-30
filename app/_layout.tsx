import { router, Stack, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import OfflineBanner from "../components/OfflineBanner";
import { colors } from "../constants/colors";
import { AuthProvider, useAuth } from "../hooks/useAuth";

/**
 * Sends people to the right place:
 *   not logged in            -> /login
 *   logged in, not invited   -> / (shows "number not registered")
 *   logged in and active     -> /home (when on login or the start screen)
 */
function AuthGate() {
  const { loading, isLoggedIn, isActive } = useAuth();
  const segments = useSegments();
  const first = segments[0] as string | undefined;

  useEffect(() => {
    if (loading) return;
    const onLogin = first === "login";
    const onStart = first === undefined || first === "index";
    if (!isLoggedIn) {
      if (!onLogin) router.replace("/login");
    } else if (!isActive) {
      if (!onStart) router.replace("/");
    } else if (onLogin || onStart) {
      router.replace("/home");
    }
  }, [loading, isLoggedIn, isActive, first]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <View style={styles.root}>
        <OfflineBanner />
        <AuthGate />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add-expense" options={{ presentation: "modal" }} />
          <Stack.Screen name="expense/[id]" />
          <Stack.Screen name="entries" />
          <Stack.Screen name="item-entries" />
          <Stack.Screen name="admin/staff" />
          <Stack.Screen name="admin/items" />
        </Stack>
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
