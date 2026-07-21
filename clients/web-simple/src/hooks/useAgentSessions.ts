"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

export type AgentSession = {
  thread_id: string;
  title: string | null;
  created_at: string;
  last_active_at: string;
};

export function useAgentSessions(limit = 50) {
  return useQuery({
    queryKey: ["agent-sessions"],
    queryFn: () =>
      apiFetch<{ sessions: AgentSession[] }>("GET", `/agent/sessions?limit=${limit}`).then(
        (d) => d.sessions,
      ),
    staleTime: 15_000,
    refetchInterval: false,
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) =>
      apiFetch("DELETE", `/agent/sessions/${threadId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-sessions"] }),
  });
}
