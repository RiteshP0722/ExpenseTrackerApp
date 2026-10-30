import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../constants/colors";
import { strings } from "../constants/strings";
import { getBillPhotoUrl } from "../lib/billPhoto";
import Button from "./Button";

/** Turns a storage path into a signed URL (or passes a local file:// URI straight through). */
export function usePhotoUrl(source: string | null): {
  url: string | null;
  loading: boolean;
  failed: boolean;
} {
  const isLocal = !!source && /^(file|content|data|blob|ph):/.test(source);
  const [remote, setRemote] = useState<{ path: string; url: string | null; failed: boolean } | null>(null);

  useEffect(() => {
    if (!source || isLocal) return;
    let alive = true;
    getBillPhotoUrl(source)
      .then((url) => alive && setRemote({ path: source, url, failed: false }))
      .catch(() => alive && setRemote({ path: source, url: null, failed: true }));
    return () => {
      alive = false;
    };
  }, [source, isLocal]);

  if (!source) return { url: null, loading: false, failed: false };
  if (isLocal) return { url: source, loading: false, failed: false };
  if (remote?.path !== source) return { url: null, loading: true, failed: false };
  return { url: remote.url, loading: false, failed: remote.failed };
}

/** Thumbnail; tap opens the full-screen preview. */
export function BillThumbnail({ source, size = 96 }: { source: string; size?: number }) {
  const { url, loading, failed } = usePhotoUrl(source);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => url && setOpen(true)}
        accessibilityRole="imagebutton"
        accessibilityLabel={`${strings.billPhoto}. ${strings.viewPhoto}`}
        style={[styles.thumb, { width: size, height: size }]}
      >
        {loading ? <ActivityIndicator color={colors.green} /> : null}
        {failed ? <Ionicons name="image-outline" size={28} color={colors.grayLight} /> : null}
        {url ? <Image source={{ uri: url }} style={styles.thumbImage} resizeMode="cover" /> : null}
      </Pressable>
      <PhotoPreview url={open ? url : null} onClose={() => setOpen(false)} />
    </>
  );
}

export function PhotoPreview({ url, onClose }: { url: string | null; onClose: () => void }) {
  return (
    <Modal visible={!!url} animationType="fade" onRequestClose={onClose} transparent>
      <SafeAreaView style={styles.preview}>
        {url ? <Image source={{ uri: url }} style={styles.previewImage} resizeMode="contain" /> : null}
        <Button
          title={strings.close}
          icon="close"
          variant="outline"
          onPress={onClose}
          style={styles.closeButton}
        />
      </SafeAreaView>
    </Modal>
  );
}

interface BillPhotoFieldProps {
  /** Local URI of a newly picked photo, or the storage path of the saved one. */
  source: string | null;
  onPick: () => void;
  onRemove: () => void;
  disabled?: boolean;
}

/** Add Expense form block: "Attach bill photo" button, or thumbnail + change/remove. */
export function BillPhotoField({ source, onPick, onRemove, disabled = false }: BillPhotoFieldProps) {
  if (!source) {
    return (
      <Button
        title={strings.attachBill}
        icon="camera-outline"
        variant="outline"
        onPress={onPick}
        disabled={disabled}
        style={styles.attach}
      />
    );
  }
  return (
    <View style={styles.row}>
      <BillThumbnail source={source} />
      {disabled ? null : (
        <View style={styles.actions}>
          <Button
            title={strings.changePhoto}
            icon="camera-outline"
            variant="outline"
            compact
            onPress={onPick}
          />
          <Button
            title={strings.removePhoto}
            icon="trash-outline"
            variant="danger"
            compact
            onPress={onRemove}
          />
        </View>
      )}
    </View>
  );
}

export function NoPhoto() {
  return <Text style={styles.noPhoto}>{strings.noPhoto}</Text>;
}

const styles = StyleSheet.create({
  thumb: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbImage: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  preview: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: 16, gap: 16 },
  previewImage: { flex: 1, width: "100%" },
  closeButton: { alignSelf: "stretch" },
  attach: { marginTop: 8 },
  row: { flexDirection: "row", gap: 12, alignItems: "center", marginTop: 8 },
  actions: { flex: 1, gap: 8 },
  noPhoto: { fontSize: 15, color: colors.gray },
});
