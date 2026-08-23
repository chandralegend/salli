"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

/**
 * The scheduled daily advisor run. Available on every plan but off by default:
 * it spends one of the user's own monthly advisor runs, so it has to be
 * something they asked for rather than something that quietly drains their
 * allowance.
 */
export function useDailyBriefing() {
  return useQuery({
    queryKey: ["daily-briefing"],
    queryFn: () => apiFetch<{ enabled: boolean }>("GET", "/advisor/daily-briefing"),
    staleTime: 30_000,
  });
}

export function useSetDailyBriefing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) =>
      apiFetch<void>("PUT", "/advisor/daily-briefing", { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["daily-briefing"] }),
  });
}
