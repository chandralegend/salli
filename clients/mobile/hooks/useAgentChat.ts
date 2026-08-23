import { useCallback, useEffect, useRef, useState } from "react";

import { type AgentEvent, streamAgentChat } from "@/lib/agent-stream";
import { randomId } from "@/lib/utils";

import {
  type AgentPersona,
  fetchThreadHistory,
  type HistoryMessage,
  type HistoryPart,
  useAgentSessions,
  useDeleteSession,
} from "./useAgentSessions";

export type ToolCallPart = { kind: "tool_call"; name: string; agent?: string; done: boolean };
export type TextPart = { kind: "text"; content: string };
export type ApprovalPart = { kind: "approval"; action: Record<string, unknown>; resolved?: "approved" | "denied" };
export type AssistantPart = ToolCallPart | TextPart | ApprovalPart;

export type ChatMessage =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; parts: AssistantPart[]; streaming: boolean };

/** Flatten the backend's rich history parts into the chat's assistant-part model. */
function historyToMessages(history: HistoryMessage[]): ChatMessage[] {
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

/**
 * The protocol/state half of the agent chat screens — SSE event reducing,
 * session list/history, and the write-approval flow. Identical, safety-relevant
 * behavior in both Pro Mode's "Salli AI" tab and Buddy Mode's chat screen;
 * only `persona` (and the presentation built on top of this hook) differs.
 */
export function useAgentChat({ persona }: { persona: AgentPersona }) {
  const threadIdRef = useRef(randomId());
  const closeStreamRef = useRef<(() => void) | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [quotaBanner, setQuotaBanner] = useState<string | null>(null);

  const sessions = useAgentSessions(persona);
  const deleteSession = useDeleteSession();

  const startNewChat = useCallback(() => {
    threadIdRef.current = randomId();
    setMessages([]);
  }, []);

  const loadThread = useCallback(
    async (threadId: string) => {
      const history = await fetchThreadHistory(threadId, persona);
      threadIdRef.current = threadId;
      setMessages(historyToMessages(history));
    },
    [persona],
  );

  /** react-native-sse's EventSource treats a completed request like long-polling:
   * once the XHR reaches DONE (on success OR error), it silently reopens the
   * same request again after a few seconds unless explicitly closed — left
   * unclosed, a single chat turn replays itself (and its side effects: quota
   * increments, write-approval prompts) forever in the background. Every
   * terminal event (done, app-level error, transport error) must close it. */
  const closeStream = useCallback(() => {
    closeStreamRef.current?.();
    closeStreamRef.current = null;
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
          // Resolve the first not-yet-done call with this name (FIFO per name) —
          // matching by name alone (there's no call-id in the wire protocol) would
          // flip every in-flight same-name call at once if the model calls the
          // same tool twice in one turn before either resolves.
          appendToLastAssistant((parts) => {
            const idx = parts.findIndex((p) => p.kind === "tool_call" && p.name === event.name && !p.done);
            if (idx === -1) return parts;
            const next = [...parts];
            next[idx] = { ...(next[idx] as ToolCallPart), done: true };
            return next;
          });
          break;
        case "approval_required":
          appendToLastAssistant((parts) => [...parts, { kind: "approval", action: event.action }]);
          break;
        case "done":
          closeStream();
          setStreaming(false);
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (last?.role === "assistant") next[next.length - 1] = { ...last, streaming: false };
            return next;
          });
          break;
        case "error":
          closeStream();
          setStreaming(false);
          if (/quota|limit|upgrade/i.test(event.message)) {
            setQuotaBanner("You've used all your monthly Salli AI messages — upgrade to keep chatting.");
            setMessages((prev) => prev.slice(0, -2)); // remove the attempted user + empty assistant turn
          }
          break;
      }
    },
    [appendToLastAssistant, closeStream],
  );

  /** Turns a transport/stream error into either the friendly quota banner or a
   * plain-language notice — never a raw JSON dump in the chat. */
  const handleStreamError = useCallback(
    (message: string) => {
      closeStream();
      setStreaming(false);
      if (/quota|limit|upgrade/i.test(message)) {
        setQuotaBanner("You've used all your monthly Salli AI messages — upgrade to keep chatting.");
        setMessages((prev) => prev.slice(0, -2)); // drop the attempted user + empty assistant turn
        return;
      }
      appendToLastAssistant((parts) => [
        ...parts,
        { kind: "text", content: "Something went wrong reaching Salli AI. Please try again." },
      ]);
    },
    [appendToLastAssistant, closeStream],
  );

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || streaming) return;
      setQuotaBanner(null);
      setMessages((prev) => [
        ...prev,
        { id: randomId(), role: "user", content: trimmed },
        { id: randomId(), role: "assistant", parts: [], streaming: true },
      ]);
      setStreaming(true);

      closeStream(); // defensive: never let two streams run concurrently
      closeStreamRef.current = streamAgentChat(
        "/agent/chat",
        { thread_id: threadIdRef.current, message: trimmed, persona },
        handleEvent,
        handleStreamError,
      );
    },
    [streaming, persona, handleEvent, handleStreamError, closeStream],
  );

  const resolveApproval = useCallback(
    (decision: "approved" | "denied") => {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = {
            ...last,
            streaming: true,
            parts: last.parts.map((p) => (p.kind === "approval" && !p.resolved ? { ...p, resolved: decision } : p)),
          };
        }
        return next;
      });
      // The approval_required batch already closed with its own "done" (setting
      // streaming false) before the user could act on it — re-arm both the
      // hook-level and per-message flags so consumers (typing indicators, Voice
      // Mode's turn-completion detection) see the resumed continuation as still
      // in flight, not as an already-finished turn.
      setStreaming(true);
      closeStream(); // defensive: never let two streams run concurrently
      closeStreamRef.current = streamAgentChat(
        "/agent/resume",
        { thread_id: threadIdRef.current, decision, workflow: "chat", persona },
        handleEvent,
        handleStreamError,
      );
    },
    [persona, handleEvent, handleStreamError, closeStream],
  );

  useEffect(() => () => closeStreamRef.current?.(), []);

  return {
    messages,
    streaming,
    quotaBanner,
    sessions,
    deleteSession,
    send,
    resolveApproval,
    startNewChat,
    loadThread,
  };
}
