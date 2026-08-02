import { useMutation } from "@tanstack/react-query";

import { API_URL } from "@/lib/api-client";
import { createBugReportBugReportsPost } from "@/lib/api/sdk.gen";
import type { BugContext } from "@/lib/api/types.gen";
import { useSalliStore } from "@/lib/store";

/** Mirrors the client-side cap in the statement-upload flow. */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export type BugSeverity = "low" | "medium" | "high" | "blocking";

export type BugReportInput = {
  title: string;
  description: string;
  severity: BugSeverity;
  area: string | null;
  contactOk: boolean;
  /** Picked-file result — {uri,name,type}, not a DOM File/Blob. */
  attachment: { uri: string; name: string; type: string } | null;
  context: BugContext;
};

/**
 * Submits a bug report, uploading an optional screenshot first.
 *
 * The screenshot upload bypasses the generated SDK (its body serializer
 * expects a DOM Blob/File; Expo's document-picker result is a
 * {uri,name,type} object that only React Native's native FormData/fetch
 * handle correctly — same reasoning as `uploadStatement`). The report POST
 * itself is plain JSON, so it goes through the generated client like every
 * other mutation in this app.
 */
export function useSubmitBugReport() {
  return useMutation({
    mutationFn: async (input: BugReportInput) => {
      let fileRef: string | null = null;

      if (input.attachment) {
        const token = useSalliStore.getState().token;
        const form = new FormData();
        form.append("file", input.attachment as unknown as Blob);

        const res = await fetch(`${API_URL}/agent/files`, {
          method: "POST",
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: form,
        });
        if (!res.ok) throw new Error(`Attachment upload failed (${res.status})`);
        const uploaded = (await res.json()) as { file_ref: string };
        fileRef = uploaded.file_ref;
      }

      const { data } = await createBugReportBugReportsPost({
        body: {
          title: input.title,
          description: input.description,
          severity: input.severity,
          area: input.area,
          contact_ok: input.contactOk,
          file_ref: fileRef,
          context: input.context,
        },
        throwOnError: true,
      });
      return data as unknown as { id: string };
    },
  });
}
