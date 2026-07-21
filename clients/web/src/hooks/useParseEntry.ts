"use client";

import { useMutation } from "@tanstack/react-query";
import { parseEntryEntriesParsePost } from "@/lib/api/sdk.gen";
import type { ParsedEntryDraft } from "@/lib/api/types.gen";

export type EntryDraft = ParsedEntryDraft;

/** AI-parse a free-text / dictated note into a draft entry (never posts).
 * The caller opens the entry form pre-filled with the draft for review. */
export function useParseEntry() {
  return useMutation({
    mutationFn: async (text: string): Promise<EntryDraft> => {
      const res = await parseEntryEntriesParsePost({ body: { text }, throwOnError: true });
      return res.data as unknown as EntryDraft;
    },
  });
}
