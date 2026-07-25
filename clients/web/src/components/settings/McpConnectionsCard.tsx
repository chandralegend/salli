"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bot, Copy, Loader2, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  useMcpEnabled,
  useSetMcpEnabled,
  useMcpConnections,
  useRevokeMcpConnection,
} from "@/hooks/useMcp";
import { API_URL } from "@/lib/api-client";
import { formatDate } from "@/lib/format";

/**
 * Lets the user connect Salli to Claude, ChatGPT, or any other MCP-capable AI
 * client via OAuth. Toggling off immediately revokes read access for every
 * connected app — enforced server-side at token-verification time, not just
 * by hiding this card.
 */
export function McpConnectionsCard() {
  const enabled = useMcpEnabled();
  const setEnabled = useSetMcpEnabled();
  const connections = useMcpConnections();
  const revoke = useRevokeMcpConnection();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function toggle(next: boolean) {
    try {
      await setEnabled.mutateAsync(next);
      toast.success(next ? "MCP access enabled" : "MCP access disabled — all connections revoked");
    } catch {
      toast.error("Couldn't update MCP access — try again shortly.");
    }
  }

  async function handleRevoke(tokenId: string) {
    setRevokingId(tokenId);
    try {
      await revoke.mutateAsync(tokenId);
      toast.success("Connection revoked");
    } catch {
      toast.error("Couldn't revoke that connection — try again shortly.");
    } finally {
      setRevokingId(null);
    }
  }

  function copyServerUrl() {
    navigator.clipboard.writeText(`${API_URL}/mcp`);
    toast.success("MCP server URL copied");
  }

  return (
    <div className="rounded-lg border bg-card p-5 lg:col-span-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="size-4 text-muted-foreground" />
          <h2 className="text-[15px] font-semibold">Connect an AI assistant</h2>
        </div>
        {enabled.isLoading ? (
          <Skeleton className="h-5 w-9 rounded-full" />
        ) : (
          <Switch
            checked={enabled.data ?? false}
            onCheckedChange={toggle}
            disabled={setEnabled.isPending}
            aria-label="Enable MCP access"
          />
        )}
      </div>
      <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">
        Let Claude, ChatGPT, or any other MCP-capable AI read and manage your Salli account — net
        worth, budgets, debt payoff plans, portfolio, subscriptions, insurance, tax, and posting
        entries or reminders — the same access Scrooge has in-app, authorized the same way you
        sign in anywhere else.
      </p>

      {enabled.data && (
        <>
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-1.5">MCP server URL</p>
            <div className="flex items-center gap-2">
              <code className="rounded-md bg-muted px-3 py-1.5 font-mono text-[13px] truncate">
                {API_URL}/mcp
              </code>
              <Button variant="ghost" size="icon-sm" aria-label="Copy MCP server URL" onClick={copyServerUrl}>
                <Copy className="size-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Paste this into Claude&apos;s or ChatGPT&apos;s &ldquo;add custom connector&rdquo; screen —
              you&apos;ll be asked to sign in and approve access.
            </p>
          </div>

          <div className="mt-5">
            <p className="text-xs text-muted-foreground mb-2">Connected apps</p>
            {connections.isLoading ? (
              <Skeleton className="h-12" />
            ) : connections.data && connections.data.length > 0 ? (
              <ul className="divide-y divide-border rounded-md border">
                {connections.data.map((c) => (
                  <li key={c.token_id} className="flex items-center justify-between px-3 py-2.5">
                    <div>
                      <p className="text-[13px] font-medium">{c.client_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Connected {formatDate(c.connected_at)}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRevoke(c.token_id)}
                      disabled={revokingId === c.token_id}
                    >
                      {revokingId === c.token_id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <ShieldOff className="size-3.5" />
                      )}
                      Revoke
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-muted-foreground">No apps connected yet.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
