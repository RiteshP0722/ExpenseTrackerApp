import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { colors } from "../constants/colors";

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string | null;
}

export default function TextField({ label, error, style, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.grayLight}
        accessibilityLabel={label}
        {...inputProps}
        style={[styles.input, !!error && styles.inputError, style]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export const fieldStyles = StyleSheet.create({
  label: { fontSize: 15, fontWeight: "600", color: colors.dark, marginBottom: 8 },
  error: { color: colors.red, fontSize: 14, marginTop: 6 },
});

const styles = StyleSheet.create({
  wrap: { marginTop: 16 },
  label: fieldStyles.label,
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.dark,
  },
  inputError: { borderColor: colors.red },
  error: fieldStyles.error,
});
