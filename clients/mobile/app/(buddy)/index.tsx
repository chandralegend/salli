import { useRouter } from "expo-router";
import { Mic, Paperclip, Send, SquarePen, Trash2 } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ApprovalGateCard } from "@/components/agent/ApprovalGateCard";
import { AssistantMarkdown } from "@/components/agent/AssistantMarkdown";
import { ToolActivityBlock } from "@/components/agent/ToolActivityBlock";
import { Drawer } from "@/components/ui/drawer";
import { SalliBackground } from "@/components/ui/SalliBackground";
import { type ChatMessage, useAgentChat } from "@/hooks/useAgentChat";
import { useIsTablet } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Buddy Mode's opening line — no suggestion chips, no mascot/avatar: Salli's
 * identity here comes from typography, conversation, motion, and the brand
 * mark only, per the UI refresh spec. */
const WELCOME_MESSAGE =
  "Hey, I'm Salli. I'm here to help you feel more in control of your money. What's on your mind today?";

/** On tablet, chat content (messages + composer) is capped to a readable
 * column and centered instead of stretching edge-to-edge across the screen —
 * same idea as AuthShell's form column, wider here since it needs to hold
 * message bubbles rather than form fields. */
const TABLET_CHAT_WIDTH = 640;

export default function BuddyScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const chatColumnStyle = {
    width: "100%" as const,
    maxWidth: isTablet ? TABLET_CHAT_WIDTH : undefined,
    alignSelf: "center" as const,
  };

  const [input, setInput] = useState("");
  const [sessionsOpen, setSessionsOpen] = useState(false);

  const {
    messages,
    streaming,
    quotaBanner,
    sessions,
    deleteSession,
    send: sendMessage,
    resolveApproval,
    startNewChat,
    loadThread,
  } = useAgentChat({ persona: "buddy" });

  const send = (text: string) => {
    if (!text.trim() || streaming) return;
    setInput("");
    sendMessage(text);
  };

  const handleLoadThread = async (threadId: string) => {
    setSessionsOpen(false);
    await loadThread(threadId);
  };

  const openSessions = () => {
    sessions.refetch();
    setSessionsOpen(true);
  };

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <SalliBackground intensity="strong" />
      {/* No hamburger/new-chat icons in the header — tapping the title opens
          the same session-history drawer that used to sit behind a menu icon,
          per the spec's "no hamburger menu on Buddy Mode". */}
      <Pressable onPress={openSessions} className="items-center py-2.5">
        <Text className="font-sans-semibold text-[15px] text-foreground">Buddy Mode</Text>
        <Text className="mt-0.5 text-[11px] text-foreground/35">Swipe left for Pro Mode</Text>
      </Pressable>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {messages.length === 0 ? (
          <View className="flex-1 justify-end px-4 pb-3">
            <View style={chatColumnStyle}>
              <View className="max-w-[78%] rounded-[14px] rounded-bl-[6px] px-4 py-3" style={{ backgroundColor: colors.bubbleAgent }}>
                <Text className="text-[14px] leading-5 text-foreground">{WELCOME_MESSAGE}</Text>
              </View>
            </View>
          </View>
        ) : (
          <FlatList<ChatMessage>
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 14, gap: 14, ...chatColumnStyle }}
            renderItem={({ item }) =>
              item.role === "user" ? (
                <View className="flex-row justify-end">
                  <View
                    className="max-w-[78%] rounded-[14px] rounded-br-[6px] px-4 py-3"
                    style={{ backgroundColor: colors.bubbleUser }}
                  >
                    <Text className="text-[14px] leading-5 text-foreground">{item.content}</Text>
                  </View>
                </View>
              ) : (
                <View className="pr-8">
                  <ToolActivityBlock parts={item.parts} />
                  <View className="gap-1.5">
                    {item.parts.map((part, i) =>
                      part.kind === "tool_call" ? null : part.kind === "approval" ? (
                        <ApprovalGateCard
                          key={i}
                          action={part.action}
                          resolved={part.resolved}
                          onResolve={resolveApproval}
                        />
                      ) : (
                        <View
                          key={i}
                          className="max-w-[78%] rounded-[14px] rounded-bl-[6px] px-4 py-3"
                          style={{ backgroundColor: colors.bubbleAgent }}
                        >
                          <AssistantMarkdown content={part.content} />
                        </View>
                      ),
                    )}
                  </View>
                </View>
              )
            }
          />
        )}

        {quotaBanner ? (
          <View className="mb-2 px-4">
            <View
              className="rounded-control border border-destructive/25 bg-destructive/10 px-3.5 py-2.5"
              style={chatColumnStyle}
            >
              <Text className="text-[12px] text-destructive">{quotaBanner}</Text>
            </View>
          </View>
        ) : null}

        <View className="px-3.5 pt-2" style={{ paddingBottom: insets.bottom + 16 }}>
          <View
            className="flex-row items-center gap-2 rounded-[16px] border border-foreground/10 bg-card py-1.5 pl-2 pr-1.5"
            style={chatColumnStyle}
          >
            <Pressable className="h-9 w-9 items-center justify-center" accessibilityLabel="Attach a file">
              <Paperclip size={17} color={colors.mutedForeground} strokeWidth={1.8} />
            </Pressable>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Tell me what's up..."
              placeholderTextColor="rgba(128,128,128,0.4)"
              className="flex-1 text-[14px] text-foreground"
              multiline
              onSubmitEditing={() => send(input)}
            />
            {input.trim() ? (
              <Pressable
                onPress={() => send(input)}
                disabled={streaming}
                className={cn(
                  "h-[36px] w-[36px] items-center justify-center rounded-full bg-salli-accent",
                  streaming && "opacity-40",
                )}
              >
                <Send size={15} color="#FFFFFF" strokeWidth={2.5} />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => router.push("/voice")}
                className="h-[36px] w-[36px] items-center justify-center rounded-full bg-foreground/[0.06]"
                accessibilityLabel="Start voice mode"
              >
                <Mic size={15} color={colors.mutedForeground} strokeWidth={2} />
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>

      <Drawer visible={sessionsOpen} onClose={() => setSessionsOpen(false)} keyboardAvoiding={false}>
        <View className="flex-row items-center justify-between px-1 pb-3 pt-1">
          <Text className="font-sans-bold text-[17px] text-foreground">Conversations</Text>
          <Pressable
            onPress={() => {
              startNewChat();
              setSessionsOpen(false);
            }}
            className="flex-row items-center gap-1.5 rounded-pill bg-salli-accent px-3 py-1.5"
          >
            <SquarePen size={13} color="#FFFFFF" strokeWidth={2} />
            <Text className="font-sans-semibold text-[12px] text-white">New chat</Text>
          </Pressable>
        </View>
        {(sessions.data ?? []).length === 0 ? (
          <View className="items-center px-1 py-10">
            <Text className="text-[13px] text-foreground/35">No conversations yet.</Text>
          </View>
        ) : (
          (sessions.data ?? []).map((s) => (
            <View
              key={s.thread_id}
              className="flex-row items-center gap-3 border-t border-foreground/[0.05] px-1 py-3"
            >
              <Pressable className="flex-1" onPress={() => handleLoadThread(s.thread_id)}>
                <Text numberOfLines={1} className="font-sans-medium text-[14px] text-foreground">
                  {s.title || "New conversation"}
                </Text>
                <Text className="mt-0.5 text-[11px] text-foreground/30">
                  {new Date(s.last_active_at).toLocaleDateString()}
                </Text>
              </Pressable>
              <Pressable onPress={() => deleteSession.mutate(s.thread_id)} className="p-1">
                <Trash2 size={15} color={colors.mutedForeground} strokeWidth={2} />
              </Pressable>
            </View>
          ))
        )}
      </Drawer>
    </View>
  );
}
