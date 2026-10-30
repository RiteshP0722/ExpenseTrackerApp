import { useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";
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
import { useAuth } from "../../hooks/useAuth";
import { useStaff } from "../../hooks/useItems";
import { addStaff, removeStaff } from "../../lib/api";
import { confirm, notify } from "../../lib/confirm";
import { friendlyError } from "../../lib/errors";
import { firstError, staffFormSchema } from "../../lib/validation";
import { invalidateData } from "../../store/dataStore";
import type { Role, StaffMember } from "../../types/expense";

function AddStaffForm() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (saving) return;
    const parsed = staffFormSchema.safeParse({ fullName, phone, role });
    if (!parsed.success) {
      setError(firstError(parsed));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addStaff(parsed.data.phone, parsed.data.fullName, parsed.data.role);
      setFullName("");
      setPhone("");
      setRole("staff");
      invalidateData();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={styles.form}>
      <Text style={styles.formTitle}>{strings.addStaff}</Text>
      <Text style={styles.help}>{strings.staffHelp}</Text>
      <TextField
        label={strings.staffName}
        value={fullName}
        onChangeText={setFullName}
        placeholder={strings.staffNamePlaceholder}
        maxLength={60}
      />
      <TextField
        label={strings.mobileNumber}
        value={phone}
        onChangeText={setPhone}
        placeholder={strings.mobilePlaceholder}
        keyboardType="phone-pad"
        maxLength={14}
      />
      <Text style={[fieldStyles.label, styles.gap]}>{strings.role}</Text>
      <View style={styles.chips}>
        <CategoryChip label={strings.roleStaff} active={role === "staff"} onPress={() => setRole("staff")} />
        <CategoryChip label={strings.roleAdmin} active={role === "admin"} onPress={() => setRole("admin")} />
      </View>
      {error ? <InlineError message={error} /> : null}
      <Button
        title={strings.addStaff}
        icon="person-add-outline"
        onPress={submit}
        loading={saving}
        style={styles.gap}
      />
    </Card>
  );
}

function StaffRow({ member, isSelf }: { member: StaffMember; isSelf: boolean }) {
  const [removing, setRemoving] = useState(false);

  async function handleRemove() {
    if (isSelf) {
      notify(strings.cannotRemoveSelf);
      return;
    }
    const ok = await confirm(
      fill(strings.removeStaffTitle, { name: member.full_name }),
      fill(strings.removeStaffBody, { phone: member.phone }),
      strings.remove,
    );
    if (!ok) return;
    setRemoving(true);
    try {
      await removeStaff(member.phone);
      invalidateData();
    } catch (err) {
      notify(friendlyError(err));
      setRemoving(false);
    }
  }

  return (
    <Card style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.name}>
          {member.full_name}
          {isSelf ? ` (${strings.you})` : ""}
        </Text>
        <Text style={styles.meta}>
          {member.phone} · {member.role === "admin" ? strings.roleAdmin : strings.roleStaff}
        </Text>
        <Text style={[styles.meta, member.profile_id ? styles.joined : null]}>
          {member.profile_id ? strings.joined : strings.notJoined}
        </Text>
      </View>
      {isSelf ? null : (
        <Button
          title={strings.remove}
          icon="person-remove-outline"
          variant="danger"
          compact
          loading={removing}
          onPress={handleRemove}
        />
      )}
    </Card>
  );
}

export default function StaffScreen() {
  const { profile } = useAuth();
  const staff = useStaff();

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title={strings.staff} back />
      <AdminOnly>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <FlatList
            data={staff.data ?? []}
            keyExtractor={(m) => m.phone}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <>
                <AddStaffForm />
                {staff.error && staff.data ? (
                  <InlineError message={staff.error} onRetry={staff.reload} />
                ) : null}
              </>
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => <StaffRow member={item} isSelf={item.phone === profile?.phone} />}
            ListEmptyComponent={
              staff.loading ? (
                <LoadingState />
              ) : staff.error ? (
                <ErrorState message={staff.error} onRetry={staff.reload} />
              ) : (
                <EmptyState text={strings.emptyStaff} />
              )
            }
          />
        </KeyboardAvoidingView>
      </AdminOnly>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  form: { marginBottom: 20, padding: 16 },
  formTitle: { fontSize: 18, fontWeight: "700", color: colors.dark },
  help: { fontSize: 14, color: colors.gray, marginTop: 4 },
  gap: { marginTop: 16 },
  chips: { flexDirection: "row", gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowText: { flex: 1 },
  name: { fontSize: 17, fontWeight: "700", color: colors.dark },
  meta: { fontSize: 14, color: colors.gray, marginTop: 2 },
  joined: { color: colors.green },
  separator: { height: 8 },
});
