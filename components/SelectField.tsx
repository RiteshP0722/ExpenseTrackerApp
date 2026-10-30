import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState, type ReactNode } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../constants/colors";
import { strings } from "../constants/strings";
import Button from "./Button";
import { fieldStyles } from "./TextField";

export interface SelectOption {
  id: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  placeholder: string;
  options: readonly SelectOption[];
  value: string | null;
  onChange: (id: string | null) => void;
  error?: string | null;
  /** Adds an "All" option that clears the value (for filters). */
  allowClear?: boolean;
  searchable?: boolean;
  /** Extra content under the list, e.g. "Request new item". */
  footer?: (close: () => void) => ReactNode;
  disabled?: boolean;
}

/** A big tappable field that opens a full-screen list — easier than a tiny dropdown. */
export default function SelectField({
  label,
  placeholder,
  options,
  value,
  onChange,
  error,
  allowClear = false,
  searchable = false,
  footer,
  disabled = false,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((o) => o.id === value);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
    return allowClear ? [{ id: "", label: strings.all }, ...list] : list;
  }, [options, query, allowClear]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <View style={styles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        style={[styles.field, !!error && styles.fieldError, disabled && styles.disabled]}
      >
        <Text style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={22} color={colors.gray} />
      </Pressable>
      {error ? <Text style={fieldStyles.error}>{error}</Text> : null}

      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label}</Text>
            <Button title={strings.close} variant="outline" compact onPress={close} />
          </View>
          {searchable ? (
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={strings.searchItems}
              placeholderTextColor={colors.grayLight}
              style={styles.search}
              autoCorrect={false}
            />
          ) : null}
          <FlatList
            data={visible}
            keyExtractor={(o) => o.id || "__all"}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const isSelected = item.id === (value ?? "");
              return (
                <Pressable
                  onPress={() => {
                    onChange(item.id === "" ? null : item.id);
                    close();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  style={({ pressed }) => [
                    styles.option,
                    isSelected && styles.optionActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>{item.label}</Text>
                  {isSelected ? <Ionicons name="checkmark" size={22} color={colors.green} /> : null}
                </Pressable>
              );
            }}
            ListFooterComponent={footer ? <View style={styles.footer}>{footer(close)}</View> : null}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 16 },
  field: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 8,
  },
  fieldError: { borderColor: colors.red },
  disabled: { opacity: 0.6 },
  value: { flex: 1, fontSize: 16, color: colors.dark },
  placeholder: { color: colors.grayLight },
  modal: { flex: 1, backgroundColor: colors.bg },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: colors.dark, flex: 1 },
  search: {
    marginHorizontal: 20,
    marginBottom: 8,
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.dark,
  },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 8 },
  option: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
  },
  optionActive: { borderColor: colors.green, backgroundColor: colors.greenLight },
  pressed: { opacity: 0.8 },
  optionText: { fontSize: 17, color: colors.dark },
  optionTextActive: { fontWeight: "700", color: colors.green },
  footer: { marginTop: 16, gap: 10 },
});
