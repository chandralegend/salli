"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

export type AuditLogEntry = {
  id: string;
  user_id: string;
  action: string;
  params: Record<string, unknown>;
  decision: string;
  created_at: string;
};

export function useAuditLog(limit = 100) {
  return useQuery({
    queryKey: ["audit-log", limit],
    queryFn: () =>
      apiFetch<{ entries: AuditLogEntry[] }>("GET", `/agent/audit-log?limit=${limit}`).then((d) => d.entries),
    staleTime: 15_000,
  });
}
