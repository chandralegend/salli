import { PiggyBank, SendHorizontal, SquarePen } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
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

import { type AgentEvent, streamAgentChat } from "@/lib/agent-stream";
import { useThemeColors } from "@/lib/theme";
import { randomId } from "@/lib/utils";
import { cn } from "@/lib/utils";

type ToolCallPart = { kind: "tool_call"; name: string; agent?: string; done: boolean };
type TextPart = { kind: "text"; content: string };
type ApprovalPart = { kind: "approval"; action: Record<string, unknown>; resolved?: "approved" | "denied" };
type AssistantPart = ToolCallPart | TextPart | ApprovalPart;

type Message =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; parts: AssistantPart[]; streaming: boolean };

const SUGGESTED_PROMPTS = [
  "What's my tax payable?",
  "How is my money bin growing?",
  "Where am I wasting money?",
  "Am I on track for FIRE?",
];

export default function AgentScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Message>>(null);
  const threadIdRef = useRef(randomId());

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [quotaBanner, setQuotaBanner] = useState<string | null>(null);
  const closeStreamRef = useRef<(() => void) | null>(null);

  const appendToLastAssistant = useCallback((updater: (parts: AssistantPart[]) => AssistantPart[]) => {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.role === "assistant") {
        next[next.length - 1] = { ...last, parts: updater(last.parts) };
      }
      return next;
    });
  }, []);

  const handleEvent = useCallback(
    (event: AgentEvent) => {
      switch (event.type) {
        case "token":
          appendToLastAssistant((parts) => {
            const last = parts[parts.length - 1];
            if (last?.kind === "text") {
              return [...parts.slice(0, -1), { kind: "text", content: last.content + event.content }];
            }
            return [...parts, { kind: "text", content: event.content }];
          });
          break;
        case "tool_call":
          appendToLastAssistant((parts) => [
            ...parts,
            { kind: "tool_call", name: event.name, agent: event.agent, done: false },
          ]);
          break;
        case "tool_result":
          appendToLastAssistant((parts) =>
            parts.map((p) => (p.kind === "tool_call" && p.name === event.name ? { ...p, done: true } : p)),
          );
          break;
        case "approval_required":
          appendToLastAssistant((parts) => [...parts, { kind: "approval", action: event.action }]);
          break;
        case "done":
          setStreaming(false);
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") next[next.length - 1] = { ...last, streaming: false };
            return next;
          });
          break;
        case "error":
          if (event.message.toLowerCase().includes("quota")) {
            setQuotaBanner("Monthly messages used up — upgrade to continue.");
            setMessages((prev) => prev.slice(0, -2)); // remove the attempted user + empty assistant turn
          }
          setStreaming(false);
          break;
      }
    },
    [appendToLastAssistant],
  );

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    setInput("");
    setQuotaBanner(null);
    setMessages((prev) => [
      ...prev,
      { id: randomId(), role: "user", content: trimmed },
      { id: randomId(), role: "assistant", parts: [], streaming: true },
    ]);
    setStreaming(true);

    closeStreamRef.current = streamAgentChat(
      "/agent/chat",
      { thread_id: threadIdRef.current, message: trimmed },
      handleEvent,
      (message) => {
        setStreaming(false);
        appendToLastAssistant((parts) => [...parts, { kind: "text", content: `⚠ ${message}` }]);
      },
    );
  };

  const resolveApproval = (decision: "approved" | "denied") => {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last?.role === "assistant") {
        next[next.length - 1] = {
          ...last,
          parts: last.parts.map((p) => (p.kind === "approval" && !p.resolved ? { ...p, resolved: decision } : p)),
        };
      }
      return next;
    });
    streamAgentChat(
      "/agent/resume",
      { thread_id: threadIdRef.current, decision, workflow: "chat" },
      handleEvent,
      () => setStreaming(false),
    );
  };

  useEffect(() => () => closeStreamRef.current?.(), []);

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View className="flex-row items-center border-b border-foreground/[0.08] px-4 py-2.5">
        <View className="h-9 w-9" />
        <View className="flex-1 items-center gap-0.5">
          <Text className="font-sans-semibold text-[16px] text-foreground">Scrooge</Text>
          <View className="flex-row items-center gap-1.5">
            <View className="h-1.5 w-1.5 rounded-full bg-salli-accent" />
            <Text className="text-[11px] text-foreground/30">AI Financial Advisor</Text>
          </View>
        </View>
        <Pressable
          onPress={() => {
            threadIdRef.current = randomId();
            setMessages([]);
          }}
          className="h-9 w-9 items-center justify-center"
        >
          <SquarePen size={18} color={colors.mutedForeground} strokeWidth={1.8} />
        </Pressable>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {messages.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-3 px-8">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-salli-accent/15">
              <PiggyBank size={24} color={colors.accent} strokeWidth={1.8} />
            </View>
            <Text className="text-center font-sans-semibold text-[15px] text-foreground">
              Ask Scrooge anything about your money.
            </Text>
            <View className="mt-1 flex-row flex-wrap justify-center gap-1.5">
              {SUGGESTED_PROMPTS.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => send(p)}
                  className="rounded-pill border border-foreground/10 bg-card px-3 py-1.5"
                >
                  <Text className="text-[12px] text-foreground/60">{p}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <FlatList<Message>
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 14, gap: 12 }}
            renderItem={({ item }) =>
              item.role === "user" ? (
                <View className="flex-row justify-end">
                  <View className="max-w-[76%] rounded-[18px] rounded-br-[4px] bg-salli-accent px-3.5 py-2.5">
                    <Text className="text-[13px] leading-5 text-white">{item.content}</Text>
                  </View>
                </View>
              ) : (
                <View className="gap-1.5 pl-0.5">
                  {item.parts.map((part, i) =>
                    part.kind === "tool_call" ? (
                      <View key={i} className="flex-row items-center gap-1.5">
                        <View className="h-[7px] w-[7px] rounded-full border border-foreground/25" />
                        <Text className="text-[11px] text-foreground/25">
                          {part.agent ? `${part.agent}: ` : ""}
                          {part.name.replace(/_/g, " ")}
                        </Text>
                      </View>
                    ) : part.kind === "approval" ? (
                      <View key={i} className="ml-8 rounded-[16px] border border-foreground/10 bg-card p-3">
                        <Text className="mb-2.5 font-sans-semibold text-[12px] text-foreground">
                          Proposed action
                        </Text>
                        <View className="mb-2.5 gap-1 rounded-[9px] bg-foreground/[0.04] px-2.5 py-2">
                          {Object.entries(part.action).map(([k, v]) => (
                            <View key={k} className="flex-row justify-between">
                              <Text className="text-[11px] text-foreground/35 capitalize">
                                {k.replace(/_/g, " ")}
                              </Text>
                              <Text className="text-[11px] font-sans-medium text-foreground">{String(v)}</Text>
                            </View>
                          ))}
                        </View>
                        {part.resolved ? (
                          <Text
                            className={cn(
                              "text-center text-[12px] font-sans-semibold",
                              part.resolved === "approved" ? "text-salli-accent" : "text-destructive",
                            )}
                          >
                            {part.resolved === "approved" ? "Approved" : "Denied"}
                          </Text>
                        ) : (
                          <View className="flex-row gap-2">
                            <Pressable
                              onPress={() => resolveApproval("approved")}
                              className="h-[34px] flex-1 items-center justify-center rounded-[10px] bg-primary"
                            >
                              <Text className="font-sans-semibold text-[13px] text-primary-foreground">Approve</Text>
                            </Pressable>
                            <Pressable
                              onPress={() => resolveApproval("denied")}
                              className="h-[34px] flex-1 items-center justify-center rounded-[10px] border border-foreground/10 bg-foreground/[0.06]"
                            >
                              <Text className="font-sans-semibold text-[13px] text-foreground/45">Deny</Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    ) : (
                      <View key={i} className="flex-row items-start gap-2">
                        <View className="mt-0.5 h-[26px] w-[26px] items-center justify-center rounded-full bg-salli-accent">
                          <PiggyBank size={12} color="#FFFFFF" strokeWidth={2} />
                        </View>
                        <View className="max-w-[85%] rounded-[18px] rounded-tl-[4px] border border-foreground/[0.08] bg-card px-3.5 py-3">
                          <Text className="text-[13px] leading-5 text-foreground/80">{part.content}</Text>
                        </View>
                      </View>
                    ),
                  )}
                </View>
              )
            }
          />
        )}

        {quotaBanner ? (
          <View className="mx-4 mb-2 rounded-control border border-destructive/25 bg-destructive/10 px-3.5 py-2.5">
            <Text className="text-[12px] text-destructive">{quotaBanner}</Text>
          </View>
        ) : null}

        <View className="border-t border-foreground/[0.08] px-3.5 pb-2 pt-2" style={{ paddingBottom: insets.bottom + 8 }}>
          <View className="flex-row items-center gap-2.5 rounded-[20px] border border-foreground/10 bg-card py-1.5 pl-3.5 pr-1.5">
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Message Scrooge..."
              placeholderTextColor="rgba(128,128,128,0.4)"
              className="flex-1 text-[14px] text-foreground"
              multiline
              onSubmitEditing={() => send(input)}
            />
            <Pressable
              onPress={() => send(input)}
              disabled={!input.trim() || streaming}
              className={cn(
                "h-[34px] w-[34px] items-center justify-center rounded-full bg-salli-accent",
                (!input.trim() || streaming) && "opacity-40",
              )}
            >
              <SendHorizontal size={14} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
          </View>
          <Text className="mt-1.5 text-center text-[10px] text-foreground/20">
            Numbers from deterministic engine · Write actions need your approval.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
