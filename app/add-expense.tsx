import { zodResolver } from "@hookform/resolvers/zod";
import * as Crypto from "expo-crypto";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BillPhotoField } from "../components/BillPhoto";
import Button from "../components/Button";
import CategoryChip from "../components/CategoryChip";
import DateField from "../components/DateField";
import { ErrorState, InlineError, LoadingState } from "../components/ScreenState";
import ScreenHeader from "../components/ScreenHeader";
import SelectField, { type SelectOption } from "../components/SelectField";
import TextField, { fieldStyles } from "../components/TextField";
import { colors } from "../constants/colors";
import { strings } from "../constants/strings";
import { useAuth } from "../hooks/useAuth";
import { useExpense, useExpenseMutations } from "../hooks/useExpenses";
import { useItems } from "../hooks/useItems";
import { createItemRequest } from "../lib/api";
import { pickBillPhoto, type PhotoSource } from "../lib/billPhoto";
import { notify } from "../lib/confirm";
import { addDaysISO, isWithinHours, todayISO } from "../lib/dates";
import { friendlyError } from "../lib/errors";
import {
  cleanExpenseForm,
  expenseFormSchema,
  firstError,
  itemNameSchema,
  type ExpenseFormValues,
} from "../lib/validation";
import { CATEGORIES, type Item } from "../types/expense";

function askPhotoSource(): Promise<PhotoSource | null> {
  if (Platform.OS === "web") return Promise.resolve("gallery");
  return new Promise((resolve) => {
    Alert.alert(
      strings.attachBill,
      undefined,
      [
        { text: strings.takePhoto, onPress: () => resolve("camera") },
        { text: strings.chooseFromGallery, onPress: () => resolve("gallery") },
        { text: strings.cancel, style: "cancel", onPress: () => resolve(null) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

export default function AddExpense() {
  const params = useLocalSearchParams<{ id?: string }>();
  const editId = typeof params.id === "string" && params.id ? params.id : undefined;
  const isNew = !editId;

  const { user, isAdmin } = useAuth();
  const items = useItems(false);
  const existing = useExpense(editId);
  const { saveExpense } = useExpenseMutations();

  // The id is created once, when the form opens. Sending the same id twice
  // (double tap, retry) can never create two expenses.
  const [expenseId] = useState(() => editId ?? Crypto.randomUUID());
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** undefined = keep saved photo, null = removed, string = new local photo */
  const [photoUri, setPhotoUri] = useState<string | null | undefined>(undefined);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [requestOpen, setRequestOpen] = useState(false);
  const loadedRef = useRef(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      itemId: "",
      isOther: false,
      customName: "",
      amount: "",
      category: "Food",
      expenseDate: todayISO(),
      note: "",
    },
  });

  const expense = existing.data ?? null;

  // Edit mode: fill the form once the expense has loaded.
  useEffect(() => {
    if (!expense || loadedRef.current) return;
    loadedRef.current = true;
    reset({
      itemId: expense.item_id,
      isOther: !!expense.custom_name,
      customName: expense.custom_name ?? "",
      amount: String(expense.amount),
      category: expense.category,
      expenseDate: expense.expense_date,
      note: expense.note ?? "",
    });
  }, [expense, reset]);

  const itemList: Item[] = useMemo(() => {
    const list = items.data ?? [];
    // Keep a disabled item selectable when editing an old entry that uses it.
    if (expense && !list.some((i) => i.id === expense.item_id)) {
      return [
        ...list,
        {
          id: expense.item_id,
          name: expense.item_name,
          default_category: expense.category,
          active: false,
          is_other: !!expense.custom_name,
        },
      ];
    }
    return list;
  }, [items.data, expense]);

  const options: SelectOption[] = itemList.map((i) => ({ id: i.id, label: i.name }));
  const otherItem = itemList.find((i) => i.is_other);

  const [itemId, isOther, category, expenseDate] = useWatch({
    control,
    name: ["itemId", "isOther", "category", "expenseDate"],
  });

  const isOwner = !expense || expense.created_by === user?.id;
  const canEdit = isNew || (!!expense && (isAdmin || (isOwner && isWithinHours(expense.created_at, 24))));
  // Photos live in the owner's folder; only the owner can change them.
  const photoLocked = !isOwner;
  const photoSource = photoUri === undefined ? (expense?.bill_photo_url ?? null) : photoUri;

  function selectItem(id: string | null) {
    const item = itemList.find((i) => i.id === id);
    setValue("itemId", id ?? "", { shouldValidate: true });
    setValue("isOther", !!item?.is_other);
    if (item) setValue("category", item.default_category);
  }

  async function handlePickPhoto() {
    setPhotoError(null);
    const source = await askPhotoSource();
    if (!source) return;
    try {
      const uri = await pickBillPhoto(source);
      if (uri) setPhotoUri(uri);
    } catch (err) {
      setPhotoError(friendlyError(err));
    }
  }

  async function onSubmit(values: ExpenseFormValues) {
    if (savingRef.current || !user) return; // second tap while saving is ignored
    savingRef.current = true;
    setSaving(true);
    setSubmitError(null);
    try {
      const clean = cleanExpenseForm(values);
      await saveExpense({
        isNew,
        userId: user.id,
        photoUri: photoLocked ? undefined : photoUri,
        previousPhotoPath: expense?.bill_photo_url ?? null,
        input: {
          id: expenseId,
          item_id: clean.itemId,
          custom_name: clean.customName,
          category: clean.category,
          amount: clean.amount,
          expense_date: clean.expenseDate,
          note: clean.note,
          bill_photo_url: expense?.bill_photo_url ?? null,
        },
      });
      router.back();
    } catch (err) {
      setSubmitError(friendlyError(err));
      savingRef.current = false;
      setSaving(false);
    }
  }

  const title = isNew ? strings.addExpense : strings.editExpense;

  if (items.loading || (!isNew && existing.loading)) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title={title} back />
        <LoadingState />
      </SafeAreaView>
    );
  }
  const loadError = items.error ?? (!isNew ? existing.error : null);
  if (loadError || (!isNew && !expense)) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title={title} back />
        <ErrorState
          message={loadError ?? strings.errorGeneric}
          onRetry={() => {
            items.reload();
            existing.reload();
          }}
        />
      </SafeAreaView>
    );
  }

  const today = todayISO();

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScreenHeader title={title} back />

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {!canEdit ? <InlineError message={strings.editWindowOver} /> : null}

          <SelectField
            label={strings.item}
            placeholder={strings.chooseItem}
            options={options}
            value={itemId || null}
            onChange={selectItem}
            searchable
            error={errors.itemId?.message}
            disabled={!canEdit}
            footer={
              isAdmin
                ? undefined
                : (close) => (
                    <Button
                      title={strings.requestNewItem}
                      icon="add-circle-outline"
                      variant="outline"
                      onPress={() => {
                        close();
                        setRequestOpen(true);
                      }}
                    />
                  )
            }
          />

          {isOther ? (
            <Controller
              control={control}
              name="customName"
              render={({ field }) => (
                <TextField
                  label={strings.otherName}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder={strings.otherNamePlaceholder}
                  maxLength={60}
                  editable={canEdit}
                  error={errors.customName?.message}
                />
              )}
            />
          ) : null}

          <Text style={[fieldStyles.label, styles.labelGap]}>{strings.amount}</Text>
          <Controller
            control={control}
            name="amount"
            render={({ field }) => (
              <View style={[styles.amountBox, !!errors.amount && styles.amountError]}>
                <Text style={styles.rupee}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="0"
                  placeholderTextColor={colors.grayLight}
                  keyboardType="decimal-pad"
                  maxLength={13}
                  editable={canEdit}
                  accessibilityLabel={strings.amount}
                />
              </View>
            )}
          />
          {errors.amount ? <Text style={fieldStyles.error}>{errors.amount.message}</Text> : null}

          <Text style={[fieldStyles.label, styles.labelGap]}>{strings.category}</Text>
          <View style={styles.chipRow}>
            {CATEGORIES.map((c) => (
              <CategoryChip
                key={c}
                label={strings.categories[c]}
                active={category === c}
                onPress={() => canEdit && setValue("category", c)}
              />
            ))}
          </View>

          <Text style={[fieldStyles.label, styles.labelGap]}>{strings.date}</Text>
          <View style={styles.chipRow}>
            <CategoryChip
              label={strings.today}
              active={expenseDate === today}
              onPress={() => canEdit && setValue("expenseDate", today, { shouldValidate: true })}
            />
            <CategoryChip
              label={strings.yesterday}
              active={expenseDate === addDaysISO(today, -1)}
              onPress={() =>
                canEdit && setValue("expenseDate", addDaysISO(today, -1), { shouldValidate: true })
              }
            />
          </View>
          <DateField
            value={expenseDate}
            maximumDate={today}
            onChange={(d) => canEdit && setValue("expenseDate", d, { shouldValidate: true })}
            error={errors.expenseDate?.message}
          />

          <Controller
            control={control}
            name="note"
            render={({ field }) => (
              <TextField
                label={strings.note}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder={strings.notePlaceholder}
                maxLength={200}
                editable={canEdit}
                error={errors.note?.message}
              />
            )}
          />

          <Text style={[fieldStyles.label, styles.labelGap]}>{strings.billPhoto}</Text>
          <BillPhotoField
            source={photoSource}
            onPick={handlePickPhoto}
            onRemove={() => setPhotoUri(null)}
            disabled={!canEdit || photoLocked}
          />
          {photoError ? <Text style={fieldStyles.error}>{photoError}</Text> : null}

          {submitError ? <InlineError message={submitError} /> : null}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={saving ? strings.saving : isNew ? strings.save : strings.saveChanges}
            onPress={() => void handleSubmit(onSubmit)()}
            loading={saving}
            disabled={!canEdit || saving}
          />
        </View>
      </KeyboardAvoidingView>

      <RequestItemModal
        visible={requestOpen}
        onClose={() => setRequestOpen(false)}
        onSent={(name) => {
          setRequestOpen(false);
          if (otherItem) {
            selectItem(otherItem.id);
            setValue("customName", name);
          }
          notify(strings.requestSent);
        }}
      />
    </SafeAreaView>
  );
}

function RequestItemModal({
  visible,
  onClose,
  onSent,
}: {
  visible: boolean;
  onClose: () => void;
  onSent: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function send() {
    const parsed = itemNameSchema.safeParse(name);
    if (!parsed.success) {
      setError(firstError(parsed));
      return;
    }
    setSending(true);
    setError(null);
    try {
      await createItemRequest(parsed.data);
      setName("");
      onSent(parsed.data);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.dialogTitle}>{strings.requestItemTitle}</Text>
          <Text style={styles.dialogHelp}>{strings.requestItemHelp}</Text>
          <TextField
            label={strings.itemName}
            value={name}
            onChangeText={setName}
            placeholder={strings.itemNamePlaceholder}
            maxLength={60}
            autoFocus
            error={error}
          />
          <View style={styles.dialogButtons}>
            <Button title={strings.cancel} variant="outline" onPress={onClose} style={styles.flex} />
            <Button title={strings.requestSend} onPress={send} loading={sending} style={styles.flex} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  labelGap: { marginTop: 20 },
  amountBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 60,
  },
  amountError: { borderColor: colors.red },
  rupee: { fontSize: 22, color: colors.gray, marginRight: 6 },
  amountInput: { flex: 1, paddingVertical: 12, fontSize: 24, fontWeight: "700", color: colors.dark },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  backdrop: { flex: 1, backgroundColor: colors.backdrop, justifyContent: "center", padding: 20 },
  dialog: { backgroundColor: colors.bg, borderRadius: 16, padding: 20 },
  dialogTitle: { fontSize: 20, fontWeight: "700", color: colors.dark },
  dialogHelp: { fontSize: 15, color: colors.gray, marginTop: 6, lineHeight: 21 },
  dialogButtons: { flexDirection: "row", gap: 10, marginTop: 20 },
});
