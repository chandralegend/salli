"use client";

import { useQuery } from "@tanstack/react-query";

import { getAuditLogAgentAuditLogGet } from "@/lib/api/sdk.gen";

export type AuditLogEntry = {
  created_at: string;
  action: string;
  decision: "approved" | "denied";
  params: Record<string, unknown>;
};

export function useAuditLog() {
  return useQuery({
    queryKey: ["audit-log"],
    queryFn: async () => {
      const { data } = await getAuditLogAgentAuditLogGet({ throwOnError: true });
      const payload = data as unknown as { entries?: AuditLogEntry[] } | AuditLogEntry[] | null;
      if (Array.isArray(payload)) return payload;
      if (payload && "entries" in payload) return payload.entries ?? [];
      return [];
    },
  });
}
