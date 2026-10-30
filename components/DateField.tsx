import Ionicons from "@expo/vector-icons/Ionicons";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../constants/colors";
import { formatDate, isISODate, parseISODate, toISODate } from "../lib/dates";
import { fieldStyles } from "./TextField";

interface DateFieldProps {
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (iso: string) => void;
  maximumDate?: string;
  minimumDate?: string;
  error?: string | null;
  compact?: boolean;
}

/** Shows "6 Oct 2026"; tapping opens the phone's own date picker. */
export default function DateField({
  label,
  value,
  onChange,
  maximumDate,
  minimumDate,
  error,
  compact = false,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [webText, setWebText] = useState(value);

  if (Platform.OS === "web") {
    return (
      <View style={[styles.wrap, compact && styles.compactWrap]}>
        {label ? <Text style={fieldStyles.label}>{label}</Text> : null}
        <TextInput
          value={webText}
          onChangeText={(t) => {
            setWebText(t);
            if (isISODate(t)) onChange(t);
          }}
          placeholder="YYYY-MM-DD"
          style={styles.field}
        />
        {error ? <Text style={fieldStyles.error}>{error}</Text> : null}
      </View>
    );
  }

  const handleChange = (event: DateTimePickerEvent, date?: Date) => {
    setOpen(Platform.OS === "ios");
    if (event.type === "set" && date) onChange(toISODate(date));
    if (event.type === "dismissed") setOpen(false);
  };

  return (
    <View style={[styles.wrap, compact && styles.compactWrap]}>
      {label ? <Text style={fieldStyles.label}>{label}</Text> : null}
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${formatDate(value)}` : formatDate(value)}
        style={[styles.field, !!error && styles.fieldError]}
      >
        <Ionicons name="calendar-outline" size={20} color={colors.gray} />
        <Text style={styles.value}>{formatDate(value)}</Text>
      </Pressable>
      {error ? <Text style={fieldStyles.error}>{error}</Text> : null}
      {open ? (
        <DateTimePicker
          value={parseISODate(value)}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          maximumDate={maximumDate ? parseISODate(maximumDate) : undefined}
          minimumDate={minimumDate ? parseISODate(minimumDate) : undefined}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 16 },
  compactWrap: { flex: 1, marginTop: 0 },
  field: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  fieldError: { borderColor: colors.red },
  value: { fontSize: 16, color: colors.dark },
});
