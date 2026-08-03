import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getMcpEnabledMcpConnectionsEnabledGet,
  listConnectionsMcpConnectionsGet,
  revokeConnectionMcpConnectionsTokenIdDelete,
  setMcpEnabledMcpConnectionsEnabledPut,
} from "@/lib/api/sdk.gen";

export type McpConnection = {
  token_id: string;
  client_id: string;
  client_name: string;
  scope: string;
  connected_at: string;
};

// Only connection-management is ported here — the OAuth consent screen a
// third-party AI client (Claude, ChatGPT) redirects a user's browser to is
// inherently a browser flow, already works fine on a phone's browser today,
// and needs no native screen.

export function useMcpEnabled() {
  return useQuery({
    queryKey: ["mcp", "enabled"],
    queryFn: async () => {
      const { data } = await getMcpEnabledMcpConnectionsEnabledGet({ throwOnError: true });
      return (data as unknown as { enabled: boolean }).enabled;
    },
  });
}

export function useSetMcpEnabled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      await setMcpEnabledMcpConnectionsEnabledPut({ body: { enabled }, throwOnError: true });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mcp", "enabled"] });
      qc.invalidateQueries({ queryKey: ["mcp", "connections"] });
    },
  });
}

export function useMcpConnections() {
  return useQuery({
    queryKey: ["mcp", "connections"],
    queryFn: async () => {
      const { data } = await listConnectionsMcpConnectionsGet({ throwOnError: true });
      return (data as unknown as { connections: McpConnection[] }).connections;
    },
  });
}

export function useRevokeMcpConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tokenId: string) => {
      await revokeConnectionMcpConnectionsTokenIdDelete({ path: { token_id: tokenId }, throwOnError: true });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mcp", "connections"] }),
  });
}
