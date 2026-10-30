import { Alert, Platform } from "react-native";
import { strings } from "../constants/strings";

/** Yes/No question. Resolves true only when the user taps the confirm button. */
export function confirm(title: string, message: string, confirmText: string = strings.yes): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(globalThis.confirm?.(`${title}\n\n${message}`) ?? false);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: strings.cancel, style: "cancel", onPress: () => resolve(false) },
        { text: confirmText, style: "destructive", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

export function notify(title: string, message?: string): void {
  if (Platform.OS === "web") {
    globalThis.alert?.(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
