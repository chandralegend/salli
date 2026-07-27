import {
  ArrowUpRight,
  Bell,
  Check,
  LoaderCircle,
  Menu,
  Paperclip,
  PiggyBank,
  Send,
  SquarePen,
  Trash2,
} from "lucide-react-native";
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
import Markdown from "react-native-markdown-display";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Drawer } from "@/components/ui/drawer";
import {
  fetchThreadHistory,
  useAgentSessions,
  useDeleteSession,
  type HistoryMessage,
  type HistoryPart,
} from "@/hooks/useAgentSessions";
import { type AgentEvent, streamAgentChat } from "@/lib/agent-stream";
import { QuotaBanner } from "@/components/shared/QuotaBanner";
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

/** Renders an assistant text part as markdown (bold, lists, tables) rather than
 * raw text, matching the mockup's formatted responses. */
function AssistantMarkdown({ content }: { content: string }) {
  const colors = useThemeColors();
  return (
    <Markdown
      style={{
        body: { color: colors.foreground, fontSize: 13, lineHeight: 20, fontFamily: "Archivo_400Regular" },
        strong: { color: colors.foreground, fontFamily: "Archivo_600SemiBold" },
        em: { fontStyle: "italic" },
        bullet_list: { marginTop: 2 },
        ordered_list: { marginTop: 2 },
        list_item: { marginVertical: 1 },
        code_inline: {
          color: colors.foreground,
          backgroundColor: "rgba(127,127,127,0.15)",
          borderWidth: 0,
          borderRadius: 4,
          paddingHorizontal: 4,
          fontFamily: "Archivo_500Medium",
        },
        heading1: { color: colors.foreground, fontFamily: "Archivo_700Bold", fontSize: 15 },
        heading2: { color: colors.foreground, fontFamily: "Archivo_600SemiBold", fontSize: 14 },
        link: { color: colors.accent },
      }}
    >
      {content}
    </Markdown>
  );
}

/** Inline write-tool approval gate (mockup's approval card). Surfaces the tool
 * name in the subtitle and the real parameter rows (the event's `action` may be
 * flat or wrap the fields under `params`). */
function ApprovalCard({
  action,
  resolved,
  onResolve,
}: {
  action: Record<string, unknown>;
  resolved?: "approved" | "denied";
  onResolve: (d: "approved" | "denied") => void;
}) {
  const colors = useThemeColors();
  const toolName = String(action.action ?? action.type ?? action.tool ?? "action");
  const rawParams = (
    action.params && typeof action.params === "object" ? action.params : action
  ) as Record<string, unknown>;
  const paramEntries = Object.entries(rawParams).filter(
    ([k]) => !["type", "action", "tool", "params"].includes(k),
  );
  return (
    <View className="rounded-[16px] border border-foreground/[0.12] bg-card p-3">
      <View className="mb-2.5 flex-row items-center gap-2">
        <View className="h-[22px] w-[22px] items-center justify-center rounded-[6px] bg-foreground/[0.08]">
          <Bell size={11} color={colors.mutedForeground} strokeWidth={2} />
        </View>
        <View className="flex-1">
          <Text className="font-sans-semibold text-[12px] text-foreground">Proposed action</Text>
          <Text className="text-[10px] text-foreground/25">{toolName} · approve to proceed</Text>
        </View>
      </View>
      {paramEntries.length ? (
        <View className="mb-2.5 gap-1.5 rounded-[9px] bg-foreground/[0.04] px-2.5 py-2">
          {paramEntries.map(([k, v]) => (
            <View key={k} className="flex-row justify-between gap-3">
              <Text className="text-[11px] capitalize text-foreground/35">{k.replace(/_/g, " ")}</Text>
              <Text className="flex-1 text-right text-[11px] font-sans-medium text-foreground" numberOfLines={1}>
                {typeof v === "object" ? JSON.stringify(v) : String(v)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {resolved ? (
        <Text
          className={cn(
            "text-center text-[12px] font-sans-semibold",
            resolved === "approved" ? "text-salli-accent" : "text-destructive",
          )}
        >
          {resolved === "approved" ? "Approved" : "Denied"}
        </Text>
      ) : (
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => onResolve("approved")}
            className="h-[34px] flex-1 items-center justify-center rounded-[10px] bg-primary"
          >
            <Text className="font-sans-semibold text-[13px] text-primary-foreground">Approve</Text>
          </Pressable>
          <Pressable
            onPress={() => onResolve("denied")}
            className="h-[34px] flex-1 items-center justify-center rounded-[10px] border border-foreground/10 bg-foreground/[0.06]"
          >
            <Text className="font-sans-semibold text-[13px] text-foreground/45">Deny</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

/** Flatten the backend's rich history parts into the chat's assistant-part model. */
function historyToMessages(history: HistoryMessage[]): Message[] {
  return history.map((m, idx) => {
    if (m.role === "user") return { id: `h-${idx}`, role: "user", content: m.content };
    const parts: AssistantPart[] = [];
    const push = (p: HistoryPart) => {
      if (p.type === "text" || p.type === "token") parts.push({ kind: "text", content: p.content });
      else if (p.type === "tool_call") parts.push({ kind: "tool_call", name: p.name, done: true });
      else if (p.type === "subagent_section") p.parts.forEach(push);
    };
    m.parts.forEach(push);
    return { id: `h-${idx}`, role: "assistant", parts, streaming: false };
  });
}

export default function AgentScreen() {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<Message>>(null);
  const threadIdRef = useRef(randomId());

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  // Holds the quota metric that was exceeded (null = no banner).
  const [quotaBanner, setQuotaBanner] = useState<string | null>(null);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const closeStreamRef = useRef<(() => void) | null>(null);

  const sessions = useAgentSessions();
  const deleteSession = useDeleteSession();

  const startNewChat = useCallback(() => {
    threadIdRef.current = randomId();
    setMessages([]);
  }, []);

  const loadThread = useCallback(async (threadId: string) => {
    setSessionsOpen(false);
    const history = await fetchThreadHistory(threadId);
    threadIdRef.current = threadId;
    setMessages(historyToMessages(history));
  }, []);

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
        case "quota_exceeded":
          setStreaming(false);
          setQuotaBanner(event.metric ?? "agent_messages");
          setMessages((prev) => prev.slice(0, -2)); // remove the attempted user + empty assistant turn
          break;
        case "error":
          setStreaming(false);
          break;
      }
    },
    [appendToLastAssistant],
  );

  /** Turns a transport/stream error into a plain-language notice — never a raw JSON
   * dump in the chat. (Quota 402s arrive as a structured quota_exceeded event.) */
  const handleStreamError = useCallback((message: string) => {
    void message;
    setStreaming(false);
    appendToLastAssistant((parts) => [
      ...parts,
      { kind: "text", content: "Something went wrong reaching Scrooge. Please try again." },
    ]);
  }, [appendToLastAssistant]);

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
      handleStreamError,
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
      handleStreamError,
    );
  };

  useEffect(() => () => closeStreamRef.current?.(), []);

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View className="flex-row items-center border-b border-foreground/[0.08] px-4 py-2.5">
        <Pressable
          onPress={() => {
            sessions.refetch();
            setSessionsOpen(true);
          }}
          className="h-9 w-9 items-center justify-center"
        >
          <Menu size={18} color={colors.mutedForeground} strokeWidth={2} />
        </Pressable>
        <View className="flex-1 items-center gap-0.5">
          <Text className="font-sans-semibold text-[16px] text-foreground">Scrooge</Text>
          <View className="flex-row items-center gap-1.5">
            <View className="h-1.5 w-1.5 rounded-full bg-salli-accent" />
            <Text className="text-[11px] text-foreground/30">AI Financial Advisor</Text>
          </View>
        </View>
        <Pressable onPress={startNewChat} className="h-9 w-9 items-center justify-center">
          <SquarePen size={18} color={colors.mutedForeground} strokeWidth={1.8} />
        </Pressable>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {messages.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <View className="h-[68px] w-[68px] items-center justify-center rounded-full border border-salli-accent/25 bg-salli-accent/15">
              <PiggyBank size={30} color={colors.accent} strokeWidth={1.8} />
            </View>
            <Text className="mt-4 text-center font-sans-bold text-[19px] text-foreground">Meet Scrooge</Text>
            <Text className="mt-1.5 text-center text-[13px] leading-5 text-foreground/40">
              Your AI advisor for tax, budgets, and FIRE. Every number comes from the deterministic engine — not guessed.
            </Text>
            <View className="mt-5 w-full gap-2">
              <Text className="pl-0.5 text-[11px] font-sans-semibold uppercase tracking-wide text-foreground/25">
                Try asking
              </Text>
              {SUGGESTED_PROMPTS.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => send(p)}
                  className="flex-row items-center justify-between rounded-control border border-foreground/[0.08] bg-card px-4 py-3"
                >
                  <Text className="flex-1 text-[13px] text-foreground/70">{p}</Text>
                  <ArrowUpRight size={15} color={colors.mutedForeground} strokeWidth={2} />
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
            ListHeaderComponent={
              <View className="flex-row items-center gap-2.5">
                <View className="h-px flex-1 bg-foreground/[0.08]" />
                <Text className="text-[11px] text-foreground/20">Today</Text>
                <View className="h-px flex-1 bg-foreground/[0.08]" />
              </View>
            }
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
                      <View key={i} className="flex-row items-center gap-[7px] pl-0.5">
                        <LoaderCircle size={11} color={colors.mutedForeground} strokeWidth={2} />
                        <Text className="text-[11px] capitalize text-foreground/30">
                          {part.agent ? `${part.agent.replace(/_/g, " ")}: ` : ""}
                          {part.name.replace(/_/g, " ")}
                        </Text>
                        {part.done ? <Check size={9} color={colors.accent} strokeWidth={2.5} /> : null}
                      </View>
                    ) : part.kind === "approval" ? (
                      <ApprovalCard
                        key={i}
                        action={part.action}
                        resolved={part.resolved}
                        onResolve={resolveApproval}
                      />
                    ) : (
                      <View key={i} className="pl-0.5 pr-1">
                        <AssistantMarkdown content={part.content} />
                      </View>
                    ),
                  )}
                </View>
              )
            }
          />
        )}

        {quotaBanner ? <QuotaBanner metric={quotaBanner} className="mx-4 mb-2" /> : null}

        <View className="border-t border-foreground/[0.08] px-3.5 pt-2" style={{ paddingBottom: insets.bottom + 64 + 10 }}>
          <View className="flex-row items-center gap-2.5 rounded-[20px] border border-foreground/10 bg-card py-1.5 pl-3.5 pr-1.5">
            <Paperclip size={17} color={colors.mutedForeground} strokeWidth={1.8} />
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
              <Send size={14} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
          </View>
          <Text className="mt-1.5 text-center text-[10px] text-foreground/20">
            Numbers from deterministic engine · Write actions need your approval.
          </Text>
        </View>
      </KeyboardAvoidingView>

      <Drawer visible={sessionsOpen} onClose={() => setSessionsOpen(false)} keyboardAvoiding={false}>
        <View className="flex-row items-center justify-between px-1 pb-3 pt-1">
          <Text className="font-sans-bold text-[17px] text-foreground">Chats</Text>
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
              <Pressable className="flex-1" onPress={() => loadThread(s.thread_id)}>
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
