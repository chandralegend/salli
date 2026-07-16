import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { API_URL } from "@/lib/api-client";
import { useSalliStore } from "@/lib/store";

/** Downloads a CSV export from the API and hands it to the native share sheet. */
export async function downloadReportCsv(reportType: "balance-sheet" | "net-worth" | "goal-progress") {
  const token = useSalliStore.getState().token;
  const res = await fetch(`${API_URL}/reports/${reportType}/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`Failed to export ${reportType}: HTTP ${res.status}`);
  const csv = await res.text();
  const file = new File(Paths.cache, `${reportType}.csv`);
  file.write(csv);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: "text/csv", UTI: "public.comma-separated-values-text" });
  }
}
