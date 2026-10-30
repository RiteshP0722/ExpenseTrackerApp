import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../constants/colors";
import { strings } from "../constants/strings";

/** Red strip at the top of the app while the phone has no internet. */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      // isInternetReachable is null while unknown; only show the banner when we are sure.
      setOffline(state.isConnected === false || state.isInternetReachable === false);
    });
  }, []);

  if (!offline) return null;
  return (
    <View style={[styles.banner, { paddingTop: insets.top + 6 }]} accessibilityLiveRegion="assertive">
      <Text style={styles.text}>{strings.offlineBanner}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: colors.red, paddingHorizontal: 16, paddingBottom: 8 },
  text: { color: colors.white, fontSize: 14, fontWeight: "600", textAlign: "center" },
});
