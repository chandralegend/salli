"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api-fetch";

/**
 * Tags — a second way to classify spending, orthogonal to the chart of accounts.
 *
 * The account tree answers "which account did this hit". It can't also answer
 * "was this essential" without duplicating the whole tree under each answer, so
 * classification lives on its own dimension.
 *
 * Two axes. `category` is what the money was for (groceries, rent) — an open
 * set, created on demand. `need` is how necessary it was, the 50/30/20 split —
 * a closed, seeded set the reports reference by slug.
 *
 * A posting carries at most one tag per axis, which is what lets a breakdown
 * along either axis add up to the total without double counting.
 */
export type TagKind = "category" | "need";

export type Tag = {
  id: string;
  slug: string;
  name: string;
  kind: TagKind;
  color: string;
  is_system: boolean;
};

export function useTags(kind?: TagKind) {
  return useQuery({
    queryKey: ["tags", kind ?? "all"],
    queryFn: () =>
      apiFetch<{ tags: Tag[] }>("GET", `/tags/${kind ? `?kind=${kind}` : ""}`).then((r) => r.tags),
    // Tags change rarely and are read on every entry row.
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Retag a posting. The posted amounts are immutable; how they're classified is
 * not — otherwise a miscategorised expense could never be corrected.
 */
export function useSetPostingTags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postingId, tags }: { postingId: string; tags: Record<string, string> }) =>
      apiFetch("PUT", `/entries/postings/${postingId}/tags`, { tags }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["entries"] });
      qc.invalidateQueries({ queryKey: ["tags"] });
      // Spending breakdowns are keyed on these tags.
      qc.invalidateQueries({ queryKey: ["fi"] });
    },
  });
}
