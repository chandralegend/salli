"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiFetch } from "@/lib/api-fetch";
import type { ReportContext } from "@/lib/report-context";
import { uploadAgentFile } from "@/lib/stream-agent";
import { getStoredToken, type BugSeverity } from "@/lib/store";

/** Mirrors the client-side cap in StatementFlow. */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export type BugReportInput = {
  title: string;
  description: string;
  severity: BugSeverity;
  area: string | null;
  contact_ok: boolean;
  file: File | null;
  /** Frozen when the dialog opened — the exact object shown in the preview. */
  context: ReportContext;
};

/**
 * Submits a bug report, uploading an optional screenshot first.
 *
 * Uses apiFetch rather than the generated SDK deliberately: the SDK function does
 * not exist until the backend endpoint ships *and* openapi.json is refreshed and
 * codegen rerun, apiFetch throws ApiError with a `.status` the dialog can branch
 * on, and `context` is free-form so generated types would degrade to
 * Record<string, unknown> anyway.
 *
 * Both phases live in one mutationFn so `isPending` covers the upload and a failed
 * upload never loses the text the user typed.
 */
export function useSubmitBugReport() {
  return useMutation({
    mutationFn: async (input: BugReportInput) => {
      let fileRef: string | null = null;

      if (input.file) {
        if (input.file.size > MAX_ATTACHMENT_BYTES) {
          throw new Error("Screenshot is over 10 MB.");
        }
        const token = getStoredToken();
        if (!token) throw new Error("You're signed out — sign in and try again.");
        const uploaded = await uploadAgentFile(token, input.file);
        fileRef = uploaded.file_ref;
      }

      return apiFetch<{ id: string }>("POST", "/bug-reports/", {
        title: input.title,
        description: input.description,
        severity: input.severity,
        area: input.area,
        contact_ok: input.contact_ok,
        file_ref: fileRef,
        context: input.context,
      });
    },
    onSuccess: () => toast.success("Report sent — thank you. We read every one."),
    // No onError toast, unlike the rest of the app's mutations: the dialog is
    // still on screen, so the failure belongs on its inline error line next to the
    // user's draft rather than in a toast they must dismiss before retrying.
  });
}
