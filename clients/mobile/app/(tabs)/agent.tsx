import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Send, MessageCircle, ChevronDown, ChevronUp, CheckCircle2, XCircle, ShieldAlert, Loader2 } from "lucide-react-native";
import Markdown from "react-native-markdown-display";
import EventSource from "react-native-sse";
import { useQueryClient } from "@tanstack/react-query";
import { Logo } from "@/components/Logo";
import { AvatarMoreButton } from "@/components/layout/AvatarMoreButton";
import { useThemeColors } from "@/lib/theme";
import { useSalliStore } from "@/lib/store";
import { API_URL } from "@/lib/api-client";

// ── Types — mirrors clients/web/src/lib/stream-agent.ts + AgentMessage.tsx ────

type ApprovalAction = {
  type: string;
  action: string;
  description: string;
  params: Record<string, unknown>;
};

type AgentEvent =
  | { type: "token"; content: string }
  | { type: "tool_call"; name: string; input: Record<string, unknown>; agent?: string }
  | { type: "tool_result"; name: string; output: string; agent?: string }
  | { type: "approval_required"; action: ApprovalAction }
  | { type: "subagent_start"; agent: string }
  | { type: "subagent_end"; agent: string }
  | { type: "subagent_token"; agent: string; content: string }
  | { type: "interrupt"; data: Record<string, unknown> }
  | { type: "quota_exceeded"; metric: string; limit: number; plan: string }
  | { type: "error"; message: string }
  | { type: "done" };

type SubagentPart =
  | { type: "token"; content: string }
  | { type: "tool_call"; name: string; input: Record<string, unknown>; done: boolean; output?: string };

type MessagePart =
  | { type: "text"; content: string }
  | { type: "tool_call"; name: string; input: Record<string, unknown>; done: boolean; output?: string }
  | { type: "approval"; action: ApprovalAction; status: "pending" | "approved" | "denied" }
  | { type: "subagent_section"; agent: string; parts: SubagentPart[]; active: boolean };

type ChatMessage =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; parts: MessagePart[]; streaming: boolean };

const SUGGESTIONS = [
  "What is my tax payable for YA 2025/26?",
  "How is my money bin growing?",
  "Where am I wasting money?",
];

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── SSE stream helper (react-native-sse) ───────────────────────────────────────

/**
 * Opens an SSE POST connection and forwards parsed AgentEvents to onEvent.
 * Returns a close() fn. react-native-sse fires named events for "message"
 * and any custom `event:` lines; the backend here only sends `data:` lines
 * (all typed via the JSON payload's `type` field), so we only listen on
 * "message" and "error".
 */
function openAgentStream(
  url: string,
  token: string,
  body: unknown,
  onEvent: (event: AgentEvent) => void,
  onClose: (err?: Error) => void,
): () => void {
  const es = new EventSource(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
  });

  let closed = false;
  const finish = (err?: Error) => {
    if (closed) return;
    closed = true;
    es.close();
    onClose(err);
  };

  es.addEventListener("message", (event) => {
    const raw = event.data;
    if (!raw || raw === "[DONE]") return;
    try {
      const parsed = JSON.parse(raw) as AgentEvent;
      onEvent(parsed);
      if (parsed.type === "done" || parsed.type === "error") finish();
    } catch {
      // malformed JSON — skip
    }
  });

  es.addEventListener("error", (event) => {
    finish(new Error((event as { message?: string })?.message ?? "Stream error"));
  });

  es.addEventListener("close", () => finish());

  return () => finish();
}

// ── Tool label lookup (trimmed port of AgentMessage.tsx's getToolLabel) ────────

function getToolLabel(name: string, input: Record<string, unknown>): { doing: string; done: string } {
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const trunc = (s: string, n = 52) => (s.length > n ? s.slice(0, n) + "…" : s);
  const query = str(input?.query);
  const title = str(input?.title);
  const acct = str(input?.name);
  const desc = str(input?.description);

  switch (name) {
    case "transfer_to_tax_specialist":
      return { doing: "Routing to Tax Specialist", done: "Routed to Tax Specialist" };
    case "transfer_to_finance_specialist":
      return { doing: "Routing to Finance Specialist", done: "Routed to Finance Specialist" };
    case "tavily_search_results_json":
    case "web_search":
      return {
        doing: query ? `Searching the web for "${trunc(query)}"` : "Searching the web",
        done: query ? `Searched the web for "${trunc(query)}"` : "Searched the web",
      };
    case "save_document":
      return { doing: title ? `Saving "${trunc(title)}"` : "Saving document", done: title ? `Saved "${trunc(title)}"` : "Saved document" };
    case "get_trial_balance":
      return { doing: "Fetching trial balance", done: "Fetched trial balance" };
    case "get_accounts":
      return { doing: "Fetching accounts", done: "Fetched accounts" };
    case "get_tax_computation":
      return { doing: "Computing tax", done: "Computed tax" };
    case "list_tax_packs":
      return { doing: "Loading tax packs", done: "Loaded tax packs" };
    case "create_account":
      return { doing: acct ? `Creating account "${trunc(acct)}"` : "Creating account", done: acct ? `Created account "${trunc(acct)}"` : "Created account" };
    case "create_reminder":
      return { doing: desc ? `Creating reminder: ${trunc(desc, 44)}` : "Creating reminder", done: desc ? `Created reminder: ${trunc(desc, 44)}` : "Created reminder" };
    case "post_journal_entry":
      return { doing: "Posting journal entry", done: "Posted journal entry" };
    default:
      return { doing: name.replace(/_/g, " "), done: name.replace(/_/g, " ") };
  }
}

const ACTION_LABELS: Record<string, string> = {
  create_account: "Create Account",
  create_reminder: "Create Reminder",
  post_journal_entry: "Post Journal Entry",
};

// ── UI subcomponents ────────────────────────────────────────────────────────

function markdownStyle(theme: ReturnType<typeof useThemeColors>) {
  return {
    body: { color: theme.foreground, fontSize: 13, lineHeight: 20 },
    heading1: { color: theme.foreground, fontSize: 16, fontWeight: "700" as const, marginTop: 8, marginBottom: 6 },
    heading2: { color: theme.foreground, fontSize: 14, fontWeight: "700" as const, marginTop: 8, marginBottom: 6 },
    heading3: { color: theme.foreground, fontSize: 13, fontWeight: "700" as const, marginTop: 6, marginBottom: 4 },
    strong: { color: theme.foreground, fontWeight: "700" as const },
    bullet_list: { marginBottom: 6 },
    ordered_list: { marginBottom: 6 },
    code_inline: { backgroundColor: theme.muted, color: theme.foreground },
    code_block: { backgroundColor: theme.muted, color: theme.foreground },
    fence: { backgroundColor: theme.muted, color: theme.foreground },
  };
}

function ToolCallLine({ name, input, done }: { name: string; input: Record<string, unknown>; done: boolean }) {
  const theme = useThemeColors();
  const { doing, done: doneLabel } = getToolLabel(name, input);
  return (
    <Text style={{ fontSize: 12, color: theme.mutedForeground, marginVertical: 2, lineHeight: 16 }}>
      <Text style={{ opacity: 0.4 }}>{"› "}</Text>
      {done ? doneLabel : doing}
    </Text>
  );
}

function ApprovalCard({
  action,
  status,
  onApprove,
  onDeny,
}: {
  action: ApprovalAction;
  status: "pending" | "approved" | "denied";
  onApprove: () => void;
  onDeny: () => void;
}) {
  const actionLabel = ACTION_LABELS[action.action] ?? action.action;

  if (status === "approved") {
    return (
      <View className="flex-row items-center gap-2 px-3 py-2 rounded-xl border my-2" style={{ borderColor: "#a7f3d0", backgroundColor: "#ecfdf5" }}>
        <CheckCircle2 color="#059669" size={14} />
        <Text style={{ fontSize: 12, color: "#047857" }}>
          <Text style={{ fontWeight: "700" }}>{actionLabel}</Text> — approved
        </Text>
      </View>
    );
  }
  if (status === "denied") {
    return (
      <View className="flex-row items-center gap-2 px-3 py-2 rounded-xl border my-2" style={{ borderColor: "#fecdd3", backgroundColor: "#fff1f2" }}>
        <XCircle color="#e11d48" size={14} />
        <Text style={{ fontSize: 12, color: "#be123c" }}>
          <Text style={{ fontWeight: "700" }}>{actionLabel}</Text> — denied
        </Text>
      </View>
    );
  }

  return (
    <View className="rounded-2xl p-4 my-3" style={{ borderWidth: 1, borderColor: "#fde68a", backgroundColor: "#fffbeb" }}>
      <View className="flex-row items-start gap-2">
        <ShieldAlert color="#d97706" size={16} style={{ marginTop: 2 }} />
        <View className="flex-1">
          <View className="flex-row items-center gap-2 mb-1 flex-wrap">
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#78350f" }}>Action requires approval</Text>
            <View className="rounded-full px-2 py-0.5" style={{ borderWidth: 1, borderColor: "#fcd34d" }}>
              <Text style={{ fontSize: 10, color: "#92400e" }}>{actionLabel}</Text>
            </View>
          </View>
          <Text style={{ fontSize: 12, color: "#92400e", lineHeight: 17 }}>{action.description}</Text>
          {Object.keys(action.params).length > 0 && (
            <View className="mt-2 rounded-lg px-3 py-2" style={{ backgroundColor: "#fef3c7" }}>
              {Object.entries(action.params).map(([k, v]) => (
                <View key={k} className="flex-row gap-2 mb-0.5">
                  <Text style={{ fontSize: 11, color: "#b45309", minWidth: 72 }}>{k}</Text>
                  <Text style={{ fontSize: 11, color: "#78350f", flex: 1 }}>{String(v)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
      <View className="flex-row justify-end gap-2 mt-3">
        <Pressable
          onPress={onDeny}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg active:opacity-70"
          style={{ borderWidth: 1, borderColor: "#fecdd3" }}
        >
          <XCircle color="#be123c" size={13} />
          <Text style={{ fontSize: 12, color: "#be123c", fontWeight: "600" }}>Deny</Text>
        </Pressable>
        <Pressable
          onPress={onApprove}
          className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-lg active:opacity-70"
          style={{ backgroundColor: "#059669" }}
        >
          <CheckCircle2 color="#fff" size={13} />
          <Text style={{ fontSize: 12, color: "#fff", fontWeight: "600" }}>Approve</Text>
        </Pressable>
      </View>
    </View>
  );
}

const WORKER_LABELS: Record<string, string> = {
  tax_specialist: "Tax Specialist",
  finance_specialist: "Finance Specialist",
};

function SubagentSection({ section }: { section: Extract<MessagePart, { type: "subagent_section" }> }) {
  const theme = useThemeColors();
  const [expanded, setExpanded] = useState(false);
  const label = WORKER_LABELS[section.agent] ?? section.agent;
  const textContent = section.parts
    .filter((p): p is Extract<SubagentPart, { type: "token" }> => p.type === "token")
    .map((p) => p.content)
    .join("");
  const toolCalls = section.parts.filter((p): p is Extract<SubagentPart, { type: "tool_call" }> => p.type === "tool_call");

  return (
    <View className="my-2 pl-3" style={{ borderLeftWidth: 2, borderLeftColor: theme.border }}>
      <View className="flex-row items-center gap-1.5 mb-1">
        <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: theme.muted }}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: theme.mutedForeground }}>{label}</Text>
        </View>
        {section.active && <ActivityIndicator size="small" color={theme.mutedForeground} />}
      </View>
      {toolCalls.map((p, i) => (
        <ToolCallLine key={i} name={p.name} input={p.input} done={p.done} />
      ))}
      {textContent.length > 0 && (
        <>
          <Pressable onPress={() => setExpanded((e) => !e)} className="flex-row items-center gap-1 mt-1">
            {expanded ? <ChevronUp size={12} color={theme.mutedForeground} /> : <ChevronDown size={12} color={theme.mutedForeground} />}
            <Text style={{ fontSize: 11, color: theme.mutedForeground }}>{expanded ? "Hide detail" : "Show detail"}</Text>
          </Pressable>
          {expanded && (
            <View className="mt-1.5">
              <Markdown style={markdownStyle(theme)}>{textContent}</Markdown>
            </View>
          )}
        </>
      )}
    </View>
  );
}

function AssistantBubble({
  parts,
  streaming,
  onApprove,
  onDeny,
}: {
  parts: MessagePart[];
  streaming: boolean;
  onApprove: (i: number) => void;
  onDeny: (i: number) => void;
}) {
  const theme = useThemeColors();
  return (
    <View className="flex-row w-full pr-8">
      <Logo size={26} className="mt-0.5 mr-2.5" />
      <View className="flex-1 min-w-0">
        {parts.map((part, i) => {
          if (part.type === "text") {
            if (!part.content && !streaming) return null;
            return (
              <View key={i}>
                <Markdown style={markdownStyle(theme)}>{part.content || " "}</Markdown>
              </View>
            );
          }
          if (part.type === "tool_call") {
            return <ToolCallLine key={i} name={part.name} input={part.input} done={part.done} />;
          }
          if (part.type === "approval") {
            return (
              <ApprovalCard
                key={i}
                action={part.action}
                status={part.status}
                onApprove={() => onApprove(i)}
                onDeny={() => onDeny(i)}
              />
            );
          }
          if (part.type === "subagent_section") {
            return <SubagentSection key={i} section={part} />;
          }
          return null;
        })}
        {streaming && parts.length === 0 && <ActivityIndicator size="small" color={theme.mutedForeground} />}
      </View>
    </View>
  );
}

function UserBubble({ content }: { content: string }) {
  const theme = useThemeColors();
  return (
    <View className="flex-row justify-end w-full">
      <View
        className="px-4 py-2.5 rounded-2xl max-w-[85%]"
        style={{ backgroundColor: theme.foreground, borderBottomRightRadius: 4 }}
      >
        <Text style={{ fontSize: 13, lineHeight: 18, color: theme.background }}>{content}</Text>
      </View>
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────────

export default function AgentScreen() {
  const theme = useThemeColors();
  const insets = useSafeAreaInsets();
  const token = useSalliStore((s) => s.token);
  const queryClient = useQueryClient();

  const [threadId, setThreadId] = useState(() => uuid());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [quotaBlocked, setQuotaBlocked] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvt, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const closeStreamRef = useRef<(() => void) | null>(null);
  const awaitingApprovalRef = useRef<{ msgId: string; partIndex: number } | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    return () => {
      closeStreamRef.current?.();
    };
  }, []);

  function scrollToBottom() {
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }

  // ── Stream event → message-part folding (port of ScroogePanel's processEventStream) ──

  function runStream(
    url: string,
    body: unknown,
    msgId: string,
    parts: MessagePart[],
  ): Promise<"done" | "awaiting_approval" | "quota" | "error"> {
    return new Promise((resolve) => {
      function getOrCreateTextPart(): Extract<MessagePart, { type: "text" }> {
        const last = parts[parts.length - 1];
        if (last && last.type === "text") return last;
        const p: Extract<MessagePart, { type: "text" }> = { type: "text", content: "" };
        parts.push(p);
        return p;
      }
      function getOrCreateSubagentSection(agent: string): Extract<MessagePart, { type: "subagent_section" }> {
        const last = parts[parts.length - 1];
        if (last && last.type === "subagent_section" && last.agent === agent && last.active) return last;
        const s: Extract<MessagePart, { type: "subagent_section" }> = { type: "subagent_section", agent, parts: [], active: true };
        parts.push(s);
        return s;
      }
      function flushSubagentSection() {
        const last = parts[parts.length - 1];
        if (last && last.type === "subagent_section") last.active = false;
      }
      function sync() {
        setMessages((prev) => prev.map((m) => (m.id === msgId && m.role === "assistant" ? { ...m, parts: [...parts] } : m)));
        scrollToBottom();
      }

      let settled = false;
      const settle = (result: "done" | "awaiting_approval" | "quota" | "error") => {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      const close = openAgentStream(
        url,
        token ?? "",
        body,
        (event) => {
          if (event.type === "token") {
            flushSubagentSection();
            getOrCreateTextPart().content += event.content;
            sync();
          } else if (event.type === "subagent_start") {
            getOrCreateSubagentSection(event.agent);
            sync();
          } else if (event.type === "subagent_end") {
            flushSubagentSection();
            sync();
          } else if (event.type === "subagent_token") {
            const section = getOrCreateSubagentSection(event.agent);
            const last = section.parts[section.parts.length - 1];
            if (last && last.type === "token") last.content += event.content;
            else section.parts.push({ type: "token", content: event.content });
            sync();
          } else if (event.type === "tool_call") {
            if (event.agent) {
              const section = getOrCreateSubagentSection(event.agent);
              section.parts.push({ type: "tool_call", name: event.name, input: event.input, done: false });
            } else {
              parts.push({ type: "tool_call", name: event.name, input: event.input, done: false });
            }
            sync();
          } else if (event.type === "tool_result") {
            if (event.agent) {
              const section = [...parts].reverse().find(
                (p): p is Extract<MessagePart, { type: "subagent_section" }> => p.type === "subagent_section" && p.agent === event.agent,
              );
              if (section) {
                for (let i = section.parts.length - 1; i >= 0; i--) {
                  const p = section.parts[i];
                  if (p.type === "tool_call" && p.name === event.name && !p.done) {
                    p.done = true;
                    p.output = String(event.output ?? "");
                    break;
                  }
                }
              }
            } else {
              for (let i = parts.length - 1; i >= 0; i--) {
                const p = parts[i];
                if (p.type === "tool_call" && p.name === event.name && !p.done) {
                  p.done = true;
                  p.output = String(event.output ?? "");
                  break;
                }
              }
            }
            sync();
          } else if (event.type === "approval_required") {
            parts.push({ type: "approval", action: event.action, status: "pending" });
            awaitingApprovalRef.current = { msgId, partIndex: parts.length - 1 };
            sync();
            settle("awaiting_approval");
          } else if (event.type === "quota_exceeded") {
            setQuotaBlocked(true);
            sync();
            settle("quota");
          } else if (event.type === "error") {
            getOrCreateTextPart().content += `\n\n_Error: ${event.message}_`;
            sync();
            settle("error");
          } else if (event.type === "done") {
            settle("done");
          }
        },
        (err) => {
          if (err) {
            const tp = parts.find((p): p is Extract<MessagePart, { type: "text" }> => p.type === "text");
            if (tp) tp.content = tp.content || "Sorry, something went wrong. Please try again.";
            else parts.push({ type: "text", content: "Sorry, something went wrong. Please try again." });
            sync();
          }
          settle(settled ? "done" : "error");
        },
      );
      closeStreamRef.current = close;
    });
  }

  // ── Send ──────────────────────────────────────────────────────────────────

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming || !token) return;

    const userMsg: ChatMessage = { id: uuid(), role: "user", content: text };
    const assistantId = uuid();
    const assistantMsg: ChatMessage = { id: assistantId, role: "assistant", parts: [], streaming: true };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setErrorText(null);
    setStreaming(true);
    scrollToBottom();

    const parts: MessagePart[] = [];
    try {
      const result = await runStream(
        `${API_URL}/agent/chat`,
        { message: text, thread_id: threadId, file_refs: [] },
        assistantId,
        parts,
      );
      if (result === "awaiting_approval") return;
      if (result === "quota") {
        setMessages((prev) => prev.filter((m) => m.id !== assistantId && m.id !== userMsg.id));
        setInput(text);
      }
    } finally {
      if (!awaitingApprovalRef.current) {
        setMessages((prev) => prev.map((m) => (m.id === assistantId && m.role === "assistant" ? { ...m, streaming: false } : m)));
        setStreaming(false);
        setTimeout(() => queryClient.invalidateQueries({ queryKey: ["agent-sessions"] }), 1800);
      }
    }
  }, [input, streaming, token, threadId, queryClient]);

  const resumeDecision = useCallback(
    async (msgId: string, partIndex: number, decision: "approved" | "denied") => {
      if (!token) return;
      awaitingApprovalRef.current = null;

      const msg = messagesRef.current.find((m) => m.id === msgId && m.role === "assistant");
      const parts: MessagePart[] = msg && msg.role === "assistant" ? [...msg.parts] : [];
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== msgId || m.role !== "assistant") return m;
          const next = [...m.parts];
          const p = next[partIndex];
          if (p && p.type === "approval") next[partIndex] = { ...p, status: decision };
          return { ...m, parts: next };
        }),
      );
      const p = parts[partIndex];
      if (p && p.type === "approval") parts[partIndex] = { ...p, status: decision };

      setStreaming(true);
      try {
        await runStream(
          `${API_URL}/agent/resume`,
          { thread_id: threadId, decision, workflow: "chat" },
          msgId,
          parts,
        );
      } finally {
        setMessages((prev) => prev.map((m) => (m.id === msgId && m.role === "assistant" ? { ...m, streaming: false } : m)));
        setStreaming(false);
      }
    },
    [token, threadId],
  );

  function handleNewThread() {
    closeStreamRef.current?.();
    setThreadId(uuid());
    setMessages([]);
    setStreaming(false);
    setQuotaBlocked(false);
    setErrorText(null);
    awaitingApprovalRef.current = null;
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {/* Header — tapping the title also dismisses the keyboard, in case
            there's too little message content to scroll-to-dismiss. */}
        <View className="flex-row items-center justify-between px-5 py-3">
          <Pressable onPress={() => Keyboard.dismiss()} className="flex-row items-center gap-2.5">
            <Logo size={32} />
            <Text className="text-foreground" style={{ fontFamily: "DMSans_900Black", fontSize: 16, letterSpacing: -0.5 }}>
              Scrooge
            </Text>
          </Pressable>
          <View className="flex-row items-center gap-2.5">
            <Pressable onPress={handleNewThread} className="px-3 py-1.5 rounded-full active:opacity-70" style={{ backgroundColor: theme.muted }}>
              <Text className="text-foreground" style={{ fontSize: 12, fontFamily: "DMSans_700Bold" }}>
                New chat
              </Text>
            </Pressable>
            <AvatarMoreButton />
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: theme.border }} />

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{ padding: 16, gap: 20, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScrollBeginDrag={Keyboard.dismiss}
          onContentSizeChange={scrollToBottom}
        >
          {messages.length === 0 ? (
            <View className="flex-1 items-center justify-center gap-5 px-4">
              <View className="w-20 h-20 rounded-3xl items-center justify-center" style={{ backgroundColor: theme.muted }}>
                <MessageCircle color={theme.mutedForeground} size={32} />
              </View>
              <View className="items-center gap-1.5">
                <Text className="text-foreground" style={{ fontFamily: "DMSans_900Black", fontSize: 17 }}>
                  Scrooge McDuck
                </Text>
                <Text className="text-muted-foreground text-center" style={{ fontSize: 12.5, lineHeight: 18, maxWidth: 240 }}>
                  Hah! You&apos;ve come to the right place. I know every rupee in your money bin.
                </Text>
              </View>
              <View className="w-full gap-2">
                {SUGGESTIONS.map((q) => (
                  <Pressable
                    key={q}
                    onPress={() => setInput(q)}
                    className="px-4 py-3 rounded-2xl active:opacity-70"
                    style={{ backgroundColor: theme.muted }}
                  >
                    <Text className="text-foreground" style={{ fontSize: 12, fontWeight: "500" }}>
                      {q}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            messages.map((m) => (
              <View key={m.id}>
                {m.role === "user" ? (
                  <UserBubble content={m.content} />
                ) : (
                  <AssistantBubble
                    parts={m.parts}
                    streaming={m.streaming}
                    onApprove={(i) => resumeDecision(m.id, i, "approved")}
                    onDeny={(i) => resumeDecision(m.id, i, "denied")}
                  />
                )}
              </View>
            ))
          )}
          {errorText && (
            <Text style={{ fontSize: 12, color: theme.destructive, textAlign: "center" }}>{errorText}</Text>
          )}
        </ScrollView>

        {/* Composer — bottom padding clears the floating dock (see FloatingTabBar) */}
        {/* Dock clearance only applies when the keyboard is closed — while it's
            open, KeyboardAvoidingView already sits the composer above it, and
            the dock is covered by the keyboard anyway. */}
        <View className="px-4 pt-2" style={{ paddingBottom: keyboardVisible ? 12 : insets.bottom + 92 }}>
          {quotaBlocked && (
            <View className="flex-row items-center justify-between gap-2 mb-3 px-4 py-2.5 rounded-2xl" style={{ backgroundColor: theme.muted }}>
              <Text className="text-muted-foreground" style={{ fontSize: 11, flex: 1 }}>
                Monthly messages used up. Upgrade to continue.
              </Text>
            </View>
          )}
          <View
            className="flex-row items-end rounded-[20px] px-3"
            style={{ backgroundColor: theme.muted, borderWidth: 1, borderColor: theme.border }}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Ask Scrooge…"
              placeholderTextColor={theme.mutedForeground}
              multiline
              editable={!streaming}
              style={{
                flex: 1,
                fontSize: 13,
                color: theme.foreground,
                paddingVertical: 12,
                maxHeight: 120,
              }}
            />
            <Pressable
              onPress={send}
              disabled={streaming || !input.trim()}
              className="w-8 h-8 rounded-xl items-center justify-center mb-2 ml-1 active:opacity-80"
              style={{
                backgroundColor: theme.primary,
                opacity: streaming || !input.trim() ? 0.35 : 1,
              }}
            >
              {streaming ? <Loader2 color={theme.primaryForeground} size={15} /> : <Send color={theme.primaryForeground} size={15} />}
            </Pressable>
          </View>
          <Text className="text-muted-foreground text-center mt-2" style={{ fontSize: 9 }}>
            Numbers from deterministic engine · Write actions need your approval
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
