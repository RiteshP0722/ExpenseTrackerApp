import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "../constants/colors";
import { strings } from "../constants/strings";
import Button from "./Button";

export function LoadingState({ text = strings.loading }: { text?: string }) {
  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.green} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.box} accessibilityLiveRegion="polite">
      <Ionicons name="cloud-offline-outline" size={40} color={colors.red} />
      <Text style={[styles.text, styles.error]}>{message}</Text>
      {onRetry ? (
        <Button title={strings.retry} icon="refresh" onPress={onRetry} style={styles.button} />
      ) : null}
    </View>
  );
}

export function EmptyState({
  text,
  icon = "file-tray-outline",
}: {
  text: string;
  icon?: "file-tray-outline";
}) {
  return (
    <View style={styles.box}>
      <Ionicons name={icon} size={40} color={colors.grayLight} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

/** Small inline error line with a retry link, used above data that is already shown. */
export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.inline}>
      <Text style={styles.inlineText}>{message}</Text>
      {onRetry ? (
        <Button
          title={strings.retry}
          variant="outline"
          compact
          onPress={onRetry}
          style={styles.inlineButton}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 12,
  },
  text: { fontSize: 16, color: colors.gray, textAlign: "center", lineHeight: 22 },
  error: { color: colors.red },
  button: { alignSelf: "stretch", marginTop: 8 },
  inline: {
    backgroundColor: colors.redBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  inlineText: { color: colors.red, fontSize: 15 },
  inlineButton: { alignSelf: "flex-start" },
});
