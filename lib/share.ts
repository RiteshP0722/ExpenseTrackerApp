import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Linking, Platform, Share } from "react-native";
import * as XLSX from "xlsx";
import { strings } from "../constants/strings";
import type { DateRange, Expense } from "../types/expense";
import { AppError } from "./errors";
import { buildExcelRows, excelColumnWidths, excelFileName } from "./excelRows";
import { whatsAppUrl } from "./whatsappText";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Builds the .xlsx file in the cache folder and opens the share sheet (WhatsApp, email, Drive…). */
export async function exportExpensesToExcel(expenses: readonly Expense[], range: DateRange): Promise<void> {
  if (expenses.length === 0) throw new AppError("EMPTY", strings.exportEmpty);

  const rows = buildExcelRows(expenses);
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = excelColumnWidths(rows).map((wch) => ({ wch }));
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, strings.excelSheet);
  const data = XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  const fileName = excelFileName(range);

  if (Platform.OS === "web") {
    XLSX.writeFile(book, fileName);
    return;
  }

  if (!(await Sharing.isAvailableAsync())) throw new AppError("SHARE", strings.sharingUnavailable);

  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  file.write(new Uint8Array(data));

  await Sharing.shareAsync(file.uri, {
    mimeType: XLSX_MIME,
    UTI: "org.openxmlformats.spreadsheetml.sheet",
    dialogTitle: strings.exportExcel,
  });
}

/** Opens WhatsApp with the text ready to send; falls back to the normal share sheet. */
export async function shareOnWhatsApp(text: string): Promise<void> {
  try {
    await Linking.openURL(whatsAppUrl(text));
  } catch {
    await Share.share({ message: text });
  }
}

export async function shareText(text: string): Promise<void> {
  await Share.share({ message: text });
}
