import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AdminOnly from "../../components/AdminOnly";
import Button from "../../components/Button";
import Card from "../../components/Card";
import CategoryChip from "../../components/CategoryChip";
import { EmptyState, ErrorState, InlineError, LoadingState } from "../../components/ScreenState";
import ScreenHeader from "../../components/ScreenHeader";
import TextField, { fieldStyles } from "../../components/TextField";
import { colors } from "../../constants/colors";
import { fill, strings } from "../../constants/strings";
import { useItemRequests, useItems } from "../../hooks/useItems";
import { addItem, approveItemRequest, rejectItemRequest, updateItem } from "../../lib/api";
import { notify } from "../../lib/confirm";
import { friendlyError, isDuplicateError } from "../../lib/errors";
import { toDisplayName } from "../../lib/formatCurrency";
import { firstError, itemFormSchema } from "../../lib/validation";
import { invalidateData } from "../../store/dataStore";
import { CATEGORIES, type ExpenseCategory, type Item, type ItemRequest } from "../../types/expense";

function itemError(err: unknown): string {
  return isDuplicateError(err) ? strings.errorDuplicateItem : friendlyError(err);
}

function CategoryPicker({
  value,
  onChange,
}: {
  value: ExpenseCategory;
  onChange: (c: ExpenseCategory) => void;
}) {
  return (
    <>
      <Text style={[fieldStyles.label, styles.gap]}>{strings.defaultCategory}</Text>
      <View style={styles.chips}>
        {CATEGORIES.map((c) => (
          <CategoryChip
            key={c}
            label={strings.categories[c]}
            active={value === c}
            onPress={() => onChange(c)}
          />
        ))}
      </View>
    </>
  );
}

type EditorTarget =
  { kind: "new" } | { kind: "edit"; item: Item } | { kind: "approve"; request: ItemRequest };

/** One dialog for: add item, rename/re-categorise/disable item, approve a staff request. */
function ItemEditor({ target, onClose }: { target: EditorTarget | null; onClose: () => void }) {
  const initialName =
    target?.kind === "edit" ? target.item.name : target?.kind === "approve" ? target.request.name : "";
  const initialCategory = target?.kind === "edit" ? target.item.default_category : "Other";
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState<ExpenseCategory>(initialCategory);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!target) return null;
  const isOtherItem = target.kind === "edit" && target.item.is_other;

  async function run(action: () => Promise<void>) {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await action();
      invalidateData();
      onClose();
    } catch (err) {
      setError(itemError(err));
      setSaving(false);
    }
  }

  function save() {
    const parsed = itemFormSchema.safeParse({ name, defaultCategory: category });
    if (!parsed.success) {
      setError(firstError(parsed));
      return;
    }
    const { name: clean, defaultCategory } = parsed.data;
    if (!target) return;
    if (target.kind === "new") void run(() => addItem(clean, defaultCategory));
    else if (target.kind === "edit")
      void run(() => updateItem(target.item.id, { name: clean, default_category: defaultCategory }));
    else void run(() => approveItemRequest(target.request.id, defaultCategory));
  }

  const title =
    target.kind === "new" ? strings.addItem : target.kind === "edit" ? strings.renameItem : strings.approve;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.dialog}>
          <Text style={styles.dialogTitle}>{title}</Text>
          <TextField
            label={strings.itemName}
            value={name}
            onChangeText={setName}
            placeholder={strings.itemNamePlaceholder}
            maxLength={60}
            editable={target.kind !== "approve" && !isOtherItem}
          />
          {name.trim().length >= 2 ? <Text style={styles.preview}>→ {toDisplayName(name)}</Text> : null}
          <CategoryPicker value={category} onChange={setCategory} />
          {error ? <InlineError message={error} /> : null}

          <View style={styles.dialogButtons}>
            <Button title={strings.cancel} variant="outline" onPress={onClose} style={styles.flex} />
            <Button
              title={target.kind === "approve" ? strings.approve : strings.saveChanges}
              onPress={save}
              loading={saving}
              style={styles.flex}
            />
          </View>
          {target.kind === "edit" && !isOtherItem ? (
            <Button
              title={target.item.active ? strings.disableItem : strings.enableItem}
              icon={target.item.active ? "eye-off-outline" : "eye-outline"}
              variant={target.item.active ? "danger" : "outline"}
              onPress={() => void run(() => updateItem(target.item.id, { active: !target.item.active }))}
              style={styles.gap}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function RequestRow({ request, onApprove }: { request: ItemRequest; onApprove: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <Card style={styles.requestCard}>
      <Text style={styles.itemName}>{request.name}</Text>
      <Text style={styles.meta}>{fill(strings.requestedBy, { name: request.requested_by_name })}</Text>
      <View style={styles.requestButtons}>
        <Button title={strings.approve} icon="checkmark" compact onPress={onApprove} style={styles.flex} />
        <Button
          title={strings.reject}
          icon="close"
          variant="danger"
          compact
          loading={busy}
          style={styles.flex}
          onPress={async () => {
            setBusy(true);
            try {
              await rejectItemRequest(request.id);
              invalidateData();
            } catch (err) {
              notify(friendlyError(err));
              setBusy(false);
            }
          }}
        />
      </View>
    </Card>
  );
}

export default function ItemsScreen() {
  const items = useItems(true);
  const requests = useItemRequests(true);
  const [editor, setEditor] = useState<EditorTarget | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  const open = (t: EditorTarget) => {
    setEditorKey((k) => k + 1); // fresh form state each time
    setEditor(t);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title={strings.items} back />
      <AdminOnly>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.help}>{strings.itemsHelp}</Text>
          <Button title={strings.addItem} icon="add" onPress={() => open({ kind: "new" })} />

          <Text style={styles.section}>{strings.itemRequests}</Text>
          {requests.loading ? (
            <LoadingState />
          ) : requests.error ? (
            <ErrorState message={requests.error} onRetry={requests.reload} />
          ) : requests.data && requests.data.length > 0 ? (
            requests.data.map((r) => (
              <RequestRow key={r.id} request={r} onApprove={() => open({ kind: "approve", request: r })} />
            ))
          ) : (
            <Text style={styles.meta}>{strings.noRequests}</Text>
          )}

          <Text style={styles.section}>{strings.items}</Text>
          {items.loading ? (
            <LoadingState />
          ) : items.error ? (
            <ErrorState message={items.error} onRetry={items.reload} />
          ) : items.data && items.data.length > 0 ? (
            items.data.map((item) => (
              <Card key={item.id} style={[styles.itemRow, !item.active && styles.inactive]}>
                <View style={styles.flex}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.meta}>
                    {strings.categories[item.default_category]} ·{" "}
                    {item.active ? strings.active : strings.disabled}
                  </Text>
                </View>
                <Button
                  title={strings.edit}
                  icon="create-outline"
                  variant="outline"
                  compact
                  onPress={() => open({ kind: "edit", item })}
                />
              </Card>
            ))
          ) : (
            <EmptyState text={strings.emptyItems} />
          )}
        </ScrollView>
        <ItemEditor key={editorKey} target={editor} onClose={() => setEditor(null)} />
      </AdminOnly>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40, gap: 8 },
  help: { fontSize: 15, color: colors.gray, marginBottom: 8, lineHeight: 21 },
  section: { fontSize: 18, fontWeight: "700", color: colors.dark, marginTop: 20, marginBottom: 4 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  inactive: { opacity: 0.55 },
  itemName: { fontSize: 17, fontWeight: "700", color: colors.dark },
  meta: { fontSize: 14, color: colors.gray, marginTop: 2 },
  requestCard: { gap: 4 },
  requestButtons: { flexDirection: "row", gap: 8, marginTop: 8 },
  gap: { marginTop: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  preview: { fontSize: 14, color: colors.green, marginTop: 6 },
  backdrop: { flex: 1, backgroundColor: colors.backdrop, justifyContent: "center", padding: 20 },
  dialog: { backgroundColor: colors.bg, borderRadius: 16, padding: 20 },
  dialogTitle: { fontSize: 20, fontWeight: "700", color: colors.dark },
  dialogButtons: { flexDirection: "row", gap: 10, marginTop: 20 },
});
