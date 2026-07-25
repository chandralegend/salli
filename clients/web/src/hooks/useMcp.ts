"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

export type McpConnection = {
  token_id: string;
  client_id: string;
  client_name: string;
  scope: string;
  connected_at: string;
};

export type McpConsentInfo = {
  client_name: string;
  scope: string;
  resource: string | null;
};

export function useMcpEnabled() {
  return useQuery({
    queryKey: ["mcp", "enabled"],
    queryFn: () => apiFetch<{ enabled: boolean }>("GET", "/mcp/connections/enabled").then((d) => d.enabled),
  });
}

export function useSetMcpEnabled() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => apiFetch<void>("PUT", "/mcp/connections/enabled", { enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp", "enabled"] });
      queryClient.invalidateQueries({ queryKey: ["mcp", "connections"] });
    },
  });
}

export function useMcpConnections() {
  return useQuery({
    queryKey: ["mcp", "connections"],
    queryFn: () =>
      apiFetch<{ connections: McpConnection[] }>("GET", "/mcp/connections/").then((d) => d.connections),
  });
}

export function useRevokeMcpConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tokenId: string) => apiFetch<void>("DELETE", `/mcp/connections/${tokenId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mcp", "connections"] });
    },
  });
}

export function useMcpConsentInfo(rt: string | null) {
  return useQuery({
    queryKey: ["mcp", "consent-info", rt],
    queryFn: () => apiFetch<McpConsentInfo>("GET", `/mcp/oauth/consent-info?rt=${encodeURIComponent(rt!)}`),
    enabled: !!rt,
    retry: false,
  });
}

export function useMcpConsentDecision() {
  return useMutation({
    mutationFn: ({ rt, approve }: { rt: string; approve: boolean }) =>
      apiFetch<{ redirect_url: string }>("POST", "/mcp/oauth/consent", { rt, approve }),
  });
}
