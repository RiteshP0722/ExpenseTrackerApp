import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SafeAreaView } from "react-native-safe-area-context";
import { useExpenses } from "../hooks/useExpenses";
import CategoryChip from "../components/CategoryChip";
import Button from "../components/Button";
import { colors } from "../constants/colors";
import { strings } from "../constants/strings";

const CATEGORIES = ["Food", "Travel", "Stationery", "Other"];
const ITEM_SUGGESTIONS = ["Milk", "Cake", "Chai", "Stationery"];

const schema = z.object({
  item_name: z.string().min(1, "Item name is required"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, {
      message: "Enter a valid amount greater than 0",
    }),
  category: z.enum(["Food", "Travel", "Stationery", "Other"]),
  note: z.string().optional(),
});

export default function AddExpense() {
  const { addExpense } = useExpenses();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const { control, handleSubmit, formState: { errors }, setValue, watch } =
    useForm({
      resolver: zodResolver(schema),
      defaultValues: {
        item_name: "",
        amount: "",
        category: "Food",
        note: "",
      },
    });

  const selectedCategory = watch("category");

  async function onSubmit(values) {
    if (submitting) return; // guard against double-tap
    setSubmitting(true);
    setSubmitError("");
    try {
      await addExpense({
        item_name: values.item_name,
        category: values.category,
        amount: Number(values.amount),
        note: values.note,
      });
      router.back();
    } catch (err) {
      setSubmitError(err.message || strings.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{strings.addExpense}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.label}>{strings.item}</Text>
          <Controller
            control={control}
            name="item_name"
            render={({ field }) => (
              <TextInput
                style={styles.input}
                value={field.value}
                onChangeText={field.onChange}
                placeholder="e.g. Milk"
              />
            )}
          />
          {!!errors.item_name && (
            <Text style={styles.error}>{errors.item_name.message}</Text>
          )}
          <View style={styles.suggestRow}>
            {ITEM_SUGGESTIONS.map((s) => (
              <CategoryChip
                key={s}
                label={s}
                active={watch("item_name") === s}
                onPress={() => setValue("item_name", s)}
              />
            ))}
          </View>

          <Text style={styles.label}>{strings.amount}</Text>
          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <View style={styles.amountBox}>
                <Text style={styles.rupee}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={field.value}
                  onChangeText={field.onChange}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
            )}
          />
          {!!errors.amount && (
            <Text style={styles.error}>{errors.amount.message}</Text>
          )}

          <Text style={styles.label}>{strings.category}</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((c) => (
              <CategoryChip
                key={c}
                label={c}
                active={selectedCategory === c}
                onPress={() => setValue("category", c)}
              />
            ))}
          </View>

          <Text style={styles.label}>{strings.note}</Text>
          <Controller
            control={control}
            name="note"
            render={({ field }) => (
              <TextInput
                style={styles.input}
                value={field.value}
                onChangeText={field.onChange}
                placeholder="e.g. for staff tea"
              />
            )}
          />

          {!!submitError && <Text style={styles.error}>{submitError}</Text>}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={strings.save}
            onPress={handleSubmit(onSubmit)}
            loading={submitting}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 },
  title: { fontSize: 18, fontWeight: "700", color: colors.dark },
  content: { paddingHorizontal: 24, paddingBottom: 24, gap: 4 },
  label: { fontSize: 13, fontWeight: "600", color: colors.dark, marginTop: 16, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
  },
  amountBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  rupee: { fontSize: 18, color: colors.gray, marginRight: 6 },
  amountInput: { flex: 1, paddingVertical: 14, fontSize: 18, fontWeight: "700", color: colors.dark },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  suggestRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  error: { color: "#C0392B", fontSize: 12, marginTop: 6 },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
});
