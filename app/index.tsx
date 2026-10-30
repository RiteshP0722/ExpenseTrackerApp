import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Button from "../components/Button";
import { ErrorState, LoadingState } from "../components/ScreenState";
import { colors } from "../constants/colors";
import { fill, strings } from "../constants/strings";
import { useAuth } from "../hooks/useAuth";
import { isSupabaseConfigured } from "../lib/supabase";

/** Start screen: spinner while checking login, or "number not registered". AuthGate does the redirects. */
export default function Index() {
  const { loading, isLoggedIn, isActive, profile, profileError, reloadProfile, signOut, user } = useAuth();
  const [checking, setChecking] = useState(false);

  if (!isSupabaseConfigured) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState message={strings.errorNotConfigured} />
      </SafeAreaView>
    );
  }

  if (loading || !isLoggedIn || isActive) {
    return (
      <SafeAreaView style={styles.safe}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (profileError) {
    return (
      <SafeAreaView style={styles.safe}>
        <ErrorState message={profileError} onRetry={() => void reloadProfile()} />
        <Button
          title={strings.logout}
          variant="outline"
          onPress={() => void signOut()}
          style={styles.logout}
        />
      </SafeAreaView>
    );
  }

  const phone = profile?.phone ?? user?.phone ?? "";
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.box}>
        <Ionicons name="person-circle-outline" size={64} color={colors.orangeText} />
        <Text style={styles.title}>{strings.notRegisteredTitle}</Text>
        <Text style={styles.body}>{fill(strings.notRegisteredBody, { phone })}</Text>
        <Button
          title={strings.checkAgain}
          icon="refresh"
          loading={checking}
          onPress={async () => {
            setChecking(true);
            await reloadProfile();
            setChecking(false);
          }}
          style={styles.button}
        />
        <Button
          title={strings.logout}
          variant="outline"
          onPress={() => void signOut()}
          style={styles.button}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, justifyContent: "center" },
  box: { padding: 24, alignItems: "center", gap: 12 },
  title: { fontSize: 22, fontWeight: "700", color: colors.dark, textAlign: "center" },
  body: { fontSize: 16, color: colors.gray, textAlign: "center", lineHeight: 23 },
  button: { alignSelf: "stretch" },
  logout: { marginHorizontal: 24 },
});
