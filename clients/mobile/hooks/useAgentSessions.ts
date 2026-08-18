import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteSessionAgentSessionsThreadIdDelete,
  getHistoryAgentHistoryThreadIdGet,
  listSessionsAgentSessionsGet,
} from "@/lib/api/sdk.gen";

export type AgentSessionMeta = { thread_id: string; title: string | null; last_active_at: string };

export type HistoryPart =
  | { type: "text" | "token"; content: string }
  | { type: "tool_call"; name: string; done?: boolean }
  | { type: "subagent_section"; agent: string; parts: HistoryPart[] };
export type HistoryMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; parts: HistoryPart[] };

export type AgentPersona = "scrooge" | "buddy";

export function useAgentSessions(persona: AgentPersona = "scrooge") {
  return useQuery({
    queryKey: ["agent-sessions", persona],
    queryFn: async () => {
      const { data } = await listSessionsAgentSessionsGet({ query: { persona }, throwOnError: true });
      return (data as unknown as { sessions: AgentSessionMeta[] }).sessions;
    },
  });
}

export async function fetchThreadHistory(
  threadId: string,
  persona: AgentPersona = "scrooge",
): Promise<HistoryMessage[]> {
  const { data } = await getHistoryAgentHistoryThreadIdGet({
    path: { thread_id: threadId },
    query: { persona },
    throwOnError: true,
  });
  return (data as unknown as { messages: HistoryMessage[] }).messages;
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (threadId: string) => {
      await deleteSessionAgentSessionsThreadIdDelete({ path: { thread_id: threadId }, throwOnError: true });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent-sessions"] }),
  });
}
