import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { strings } from "../constants/strings";
import { AppError } from "./errors";
import { BILLS_BUCKET, supabase } from "./supabase";

export type PhotoSource = "camera" | "gallery";

const MAX_WIDTH = 1280;
const JPEG_QUALITY = 0.6;

/** Opens the camera or gallery. Returns a local file URI, or null if the user cancelled. */
export async function pickBillPhoto(source: PhotoSource): Promise<string | null> {
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new AppError("PERMISSION", strings.cameraDenied);
  } else {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new AppError("PERMISSION", strings.galleryDenied);
  }

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    quality: 0.8,
    allowsEditing: false,
  };
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset) return null;
  return compressPhoto(asset.uri, asset.width);
}

/** Resizes to at most 1280px wide and saves as JPEG (~100–300 KB for a bill). */
export async function compressPhoto(uri: string, width: number): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  if (width > MAX_WIDTH) context.resize({ width: MAX_WIDTH });
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
  return saved.uri;
}

/** Path inside the "bills" bucket: <user_id>/<expense_id>.jpg */
export function billPhotoPath(userId: string, expenseId: string): string {
  return `${userId}/${expenseId}.jpg`;
}

/** Uploads a local JPEG and returns its storage path. */
export async function uploadBillPhoto(localUri: string, userId: string, expenseId: string): Promise<string> {
  const path = billPhotoPath(userId, expenseId);
  const bytes = await new File(localUri).bytes();
  const { error } = await supabase.storage.from(BILLS_BUCKET).upload(path, bytes, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error) throw error;
  return path;
}

export async function deleteBillPhoto(path: string): Promise<void> {
  await supabase.storage.from(BILLS_BUCKET).remove([path]);
}

/** The bucket is private, so photos are shown through a short-lived signed URL. */
export async function getBillPhotoUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BILLS_BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
