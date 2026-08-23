import * as Clipboard from "expo-clipboard";
import { Bot, Copy, ShieldOff } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { Card } from "@/components/ui/card";
import { useMcpConnections, useMcpEnabled, useRevokeMcpConnection, useSetMcpEnabled } from "@/hooks/useMcp";
import { API_URL } from "@/lib/api-client";
import { useThemeColors } from "@/lib/theme";
import { useToast } from "@/lib/toast";

function formatShortDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

/**
 * Lets the user connect Salli to Claude, ChatGPT, or any other MCP-capable AI
 * client via OAuth. Toggling off immediately revokes read access for every
 * connected app — enforced server-side, not just by hiding this card. Only
 * connection management lives here; the OAuth consent screen a third-party
 * client redirects the user's browser to already works fine on a phone
 * browser today and needs no native screen.
 */
export function McpConnectionsCard() {
  const colors = useThemeColors();
  const enabled = useMcpEnabled();
  const setEnabled = useSetMcpEnabled();
  const connections = useMcpConnections();
  const revoke = useRevokeMcpConnection();
  const showToast = useToast();
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function toggle() {
    if (setEnabled.isPending) return;
    try {
      await setEnabled.mutateAsync(!(enabled.data ?? false));
    } catch {
      showToast("Couldn't update MCP access. Please try again shortly.", "error");
    }
  }

  async function handleRevoke(tokenId: string) {
    setRevokingId(tokenId);
    try {
      await revoke.mutateAsync(tokenId);
    } catch {
      showToast("Couldn't revoke that connection. Please try again shortly.", "error");
    } finally {
      setRevokingId(null);
    }
  }

  async function copyServerUrl() {
    await Clipboard.setStringAsync(`${API_URL}/mcp`);
    showToast("MCP server URL copied to your clipboard.", "success");
  }

  return (
    <Card className="p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Bot size={15} color={colors.mutedForeground} strokeWidth={2} />
          <Text className="font-sans-semibold text-[14px] text-foreground">Connect an AI assistant</Text>
        </View>
        {enabled.isLoading ? (
          <ActivityIndicator size="small" color={colors.mutedForeground} />
        ) : (
          <Pressable
            onPress={toggle}
            disabled={setEnabled.isPending}
            className="rounded-pill p-0.5"
            style={{ backgroundColor: enabled.data ? colors.accent : "rgba(128,128,128,0.25)" }}
          >
            <View className="h-[22px] w-[38px] justify-center">
              <View
                className="h-[18px] w-[18px] rounded-full bg-white"
                style={{ marginLeft: enabled.data ? 18 : 2 }}
              />
            </View>
          </Pressable>
        )}
      </View>

      <Text className="mt-1.5 text-[12px] leading-4 text-foreground/40">
        Let Claude, ChatGPT, or any other MCP-capable AI read and manage your Salli account — the
        same access Salli AI has in-app, authorized the same way you sign in anywhere else.
      </Text>

      {enabled.data ? (
        <>
          <View className="mt-4">
            <Text className="mb-1.5 text-[11px] text-foreground/35">MCP server URL</Text>
            <View className="flex-row items-center gap-2">
              <View className="flex-1 rounded-control bg-muted px-3 py-2">
                <Text className="font-mono text-[12px] text-foreground/70" numberOfLines={1}>
                  {API_URL}/mcp
                </Text>
              </View>
              <Pressable onPress={copyServerUrl} hitSlop={8} className="h-[34px] w-[34px] items-center justify-center rounded-control bg-foreground/[0.06]">
                <Copy size={13} color={colors.mutedForeground} strokeWidth={2} />
              </Pressable>
            </View>
            <Text className="mt-1.5 text-[11px] leading-4 text-foreground/30">
              Paste this into Claude&rsquo;s or ChatGPT&rsquo;s &ldquo;add custom connector&rdquo; screen.
            </Text>
          </View>

          <View className="mt-4">
            <Text className="mb-2 text-[11px] text-foreground/35">Connected apps</Text>
            {connections.isLoading ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : connections.data && connections.data.length > 0 ? (
              <View className="overflow-hidden rounded-control border border-foreground/10">
                {connections.data.map((c, i) => (
                  <View
                    key={c.token_id}
                    className={`flex-row items-center justify-between px-3 py-2.5 ${i < connections.data.length - 1 ? "border-b border-foreground/[0.06]" : ""}`}
                  >
                    <View className="flex-1">
                      <Text className="font-sans-medium text-[13px] text-foreground">{c.client_name}</Text>
                      <Text className="text-[11px] text-foreground/35">Connected {formatShortDate(c.connected_at)}</Text>
                    </View>
                    <Pressable
                      onPress={() => handleRevoke(c.token_id)}
                      disabled={revokingId === c.token_id}
                      className="flex-row items-center gap-1 px-2 py-1"
                    >
                      {revokingId === c.token_id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <>
                          <ShieldOff size={12} color="#EF4444" strokeWidth={2} />
                          <Text className="text-[11px] font-sans-medium text-destructive">Revoke</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="text-[12px] text-foreground/30">No apps connected yet.</Text>
            )}
          </View>
        </>
      ) : null}
    </Card>
  );
}
