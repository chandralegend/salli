"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Send, Loader2, Paperclip, X, ArrowDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { AssistantBubble, UserBubble, type MessagePart, type SubagentPart } from "@/components/AgentMessage";
import { streamAgent, streamResume, uploadAgentFile, type ApprovalAction } from "@/lib/stream-agent";
import { getStoredToken } from "@/lib/store";
import { apiFetch } from "@/lib/api-fetch";

type ChatMessage =
  | { id: string; role: "user"; content: string; attachments?: string[] }
  | { id: string; role: "assistant"; parts: MessagePart[]; streaming: boolean };

const SUGGESTIONS = [
  "What is my tax payable for YA 2025/26?",
  "Search for the latest IRD filing deadlines",
  "Show my account balances",
  "How does APIT work?",
];

export default function AgentPage() {
  return (
    <Suspense fallback={null}>
      <AgentChat />
    </Suspense>
  );
}

function AgentChat() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // The active session id lives in the URL (?s=...). For a brand-new chat with no
  // URL param yet, we use a stable local id and only promote it to the URL once the
  // user sends the first message — this avoids ever overwriting an existing ?s=.
  const urlThreadId = searchParams.get("s");
  const [freshId, setFreshId] = useState(() => crypto.randomUUID());
  const threadId = urlThreadId ?? freshId;
  // The thread currently being streamed in THIS view. While a thread is "live"
  // its in-memory messages are authoritative, so the history effect must not
  // refetch/wipe it (e.g. when bare /agent is promoted to /agent?s=<freshId> on
  // first send). Cleared when navigating to a different thread. This is a ref, so
  // it is stable across React StrictMode's double effect-invoke in dev.
  const liveThreadRef = useRef<string | null>(null);
  const queryClient = useQueryClient();

  // Landing on a bare /agent (no ?s=) starts a genuinely new chat — mint a fresh id
  // so it can't collide with a session id that was just promoted to the URL.
  useEffect(() => {
    if (!urlThreadId) setFreshId(crypto.randomUUID());
  }, [urlThreadId]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const awaitingApprovalRef = useRef<{ msgId: string; partIndex: number } | null>(null);
  // Scroll state — ref for sync access inside callbacks, state for render
  const atBottomRef = useRef(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [quotaBlocked, setQuotaBlocked] = useState(false);

  // Load history for the active session. Keyed only on urlThreadId so first-send
  // URL promotion is handled by the liveThreadRef guard, not by clearing.
  useEffect(() => {
    // Bare new chat — nothing to load from the server.
    if (!urlThreadId) {
      setMessages([]);
      setStreaming(false);
      setHistoryLoading(false);
      return;
    }

    // The thread we are actively streaming — keep its in-memory messages intact.
    if (urlThreadId === liveThreadRef.current) return;

    // Genuine navigation to a persisted session: reset and load its history.
    liveThreadRef.current = null;
    setMessages([]);
    setStreaming(false);
    if (awaitingApprovalRef.current) {
      abortRef.current?.abort();
      awaitingApprovalRef.current = null;
    }

    const token = getStoredToken();
    if (!token) {
      setHistoryLoading(false);
      return;
    }

    let cancelled = false;
    setHistoryLoading(true);

    type HistoryMsg =
      | { role: "user"; content: string }
      | { role: "assistant"; parts: MessagePart[] };

    apiFetch<{ messages: HistoryMsg[] }>(
      "GET",
      `/agent/history/${urlThreadId}`,
    )
      .then(({ messages: history }) => {
        if (cancelled) return;
        setMessages(
          (history ?? []).map((m) =>
            m.role === "user"
              ? { id: crypto.randomUUID(), role: "user" as const, content: m.content }
              : {
                  id: crypto.randomUUID(),
                  role: "assistant" as const,
                  parts: m.parts ?? [],
                  streaming: false,
                },
          ),
        );
      })
      .catch(console.error)
      .finally(() => { if (!cancelled) setHistoryLoading(false); });

    return () => { cancelled = true; };
  }, [urlThreadId]);

  // ── Scroll helpers ────────────────────────────────────────────────────────

  function scrollToBottom(smooth = false) {
    const el = scrollRef.current;
    if (!el) return;
    if (smooth) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    } else {
      el.scrollTop = el.scrollHeight; // direct — useLayoutEffect guarantees DOM is ready
    }
    // Sync button state immediately so it doesn't linger after a programmatic scroll
    atBottomRef.current = true;
    setShowScrollBtn(false);
  }

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = distFromBottom < 80;
    atBottomRef.current = near;
    setShowScrollBtn(!near);
  }

  function goToBottom() {
    scrollToBottom(true);
  }

  // useLayoutEffect: runs after DOM mutations are flushed, so scrollHeight is the true
  // post-render value — no race with requestAnimationFrame needed
  useLayoutEffect(() => {
    if (atBottomRef.current) {
      scrollToBottom(false);
    }
  }, [messages]);

  function updateAssistantParts(msgId: string, updater: (parts: MessagePart[]) => MessagePart[]) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.role === "assistant"
          ? { ...m, parts: updater([...m.parts]) }
          : m
      )
    );
  }

  async function processEventStream(
    eventIter: AsyncGenerator<import("@/lib/stream-agent").AgentEvent>,
    msgId: string,
    parts: MessagePart[],
    signal: AbortSignal,
  ) {
    function getOrCreateTextPart(): Extract<MessagePart, { type: "text" }> {
      const last = parts[parts.length - 1];
      if (last && last.type === "text") return last;
      const newPart: Extract<MessagePart, { type: "text" }> = { type: "text", content: "" };
      parts.push(newPart);
      return newPart;
    }

    function getOrCreateSubagentSection(agentName: string): Extract<MessagePart, { type: "subagent_section" }> {
      const last = parts[parts.length - 1];
      if (last && last.type === "subagent_section" && last.agent === agentName && last.active) {
        return last;
      }
      const newSection: Extract<MessagePart, { type: "subagent_section" }> = {
        type: "subagent_section",
        agent: agentName,
        parts: [],
        active: true,
      };
      parts.push(newSection);
      return newSection;
    }

    function flushSubagentSection() {
      const last = parts[parts.length - 1];
      if (last && last.type === "subagent_section") {
        last.active = false;
      }
    }

    function sync() {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId && m.role === "assistant" ? { ...m, parts: [...parts] } : m
        )
      );
    }

    for await (const event of eventIter) {
      if (signal.aborted) break;

      if (event.type === "token") {
        flushSubagentSection();
        const part = getOrCreateTextPart();
        part.content += event.content;
        sync();

      } else if (event.type === "subagent_start") {
        getOrCreateSubagentSection(event.agent);
        sync();

      } else if (event.type === "subagent_end") {
        flushSubagentSection();
        sync();

      } else if (event.type === "subagent_token") {
        const section = getOrCreateSubagentSection(event.agent);
        const lastSubPart = section.parts[section.parts.length - 1];
        if (lastSubPart && lastSubPart.type === "token") {
          lastSubPart.content += event.content;
        } else {
          section.parts.push({ type: "token", content: event.content });
        }
        sync();

      } else if (event.type === "tool_call") {
        if (event.agent) {
          const section = getOrCreateSubagentSection(event.agent);
          const subPart: SubagentPart = { type: "tool_call", name: event.name, input: event.input, done: false };
          section.parts.push(subPart);
        } else {
          parts.push({ type: "tool_call", name: event.name, input: event.input, done: false });
        }
        sync();

      } else if (event.type === "tool_result") {
        if (event.agent) {
          const section = [...parts].reverse().find(
            (p) => p.type === "subagent_section" && p.agent === event.agent
          ) as Extract<MessagePart, { type: "subagent_section" }> | undefined;
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
        const approvalPart: Extract<MessagePart, { type: "approval" }> = {
          type: "approval",
          action: event.action as ApprovalAction,
          status: "pending",
        };
        parts.push(approvalPart);
        awaitingApprovalRef.current = { msgId, partIndex: parts.length - 1 };
        sync();
        // Stop processing — agent is paused waiting for resume
        return "awaiting_approval";

      } else if (event.type === "quota_exceeded") {
        setQuotaBlocked(true);
        sync();
        return "quota";

      } else if (event.type === "error") {
        const part = getOrCreateTextPart();
        part.content += `\n\n_Error: ${event.message}_`;
        sync();
        break;

      } else if (event.type === "done") {
        break;
      }
    }
    return "done";
  }

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    const token = getStoredToken();
    if (!token) return;

    // Upload any pending files first
    let fileRefs: string[] = [];
    const fileNames: string[] = pendingFiles.map((f) => f.name);
    if (pendingFiles.length > 0) {
      setUploadingFiles(true);
      try {
        const results = await Promise.all(pendingFiles.map((f) => uploadAgentFile(token, f)));
        fileRefs = results.map((r) => r.file_ref);
      } catch {
        // continue without files on upload failure
      } finally {
        setUploadingFiles(false);
        setPendingFiles([]);
      }
    }

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text, attachments: fileNames.length ? fileNames : undefined };
    const assistantId = crypto.randomUUID();
    const assistantMsg: ChatMessage = { id: assistantId, role: "assistant", parts: [], streaming: true };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setStreaming(true);

    // Mark this thread as live BEFORE any URL change so the history effect won't
    // refetch/wipe the messages we're about to stream.
    liveThreadRef.current = threadId;

    // First message in a brand-new chat: promote the local id into the URL so the
    // session becomes bookmarkable and survives navigation.
    if (!urlThreadId) {
      router.replace(`/agent?s=${threadId}`);
    }

    const controller = new AbortController();
    abortRef.current = controller;
    const parts: MessagePart[] = [];

    try {
      const result = await processEventStream(
        streamAgent(token, text, threadId, controller.signal, fileRefs.length ? fileRefs : undefined),
        assistantId,
        parts,
        controller.signal,
      );
      if (result === "awaiting_approval") return; // keep streaming=true until resume
      if (result === "quota") {
        // Drop the empty assistant + user bubbles; the banner explains the block.
        setMessages((prev) => prev.filter((m) => m.id !== assistantId && m.id !== userMsg.id));
        setInput(text); // restore what they typed
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        const textPart = parts.find((p) => p.type === "text") as Extract<MessagePart, { type: "text" }> | undefined;
        if (textPart) {
          textPart.content = textPart.content || "Sorry, something went wrong. Please try again.";
        } else {
          parts.push({ type: "text", content: "Sorry, something went wrong. Please try again." });
        }
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId && m.role === "assistant" ? { ...m, parts: [...parts] } : m))
        );
      }
    } finally {
      if (!awaitingApprovalRef.current) {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId && m.role === "assistant" ? { ...m, streaming: false } : m))
        );
        setStreaming(false);
        // Refetch sessions so sidebar title updates after Haiku generates it
        setTimeout(() => queryClient.invalidateQueries({ queryKey: ["agent-sessions"] }), 1800);
      }
    }
  }, [input, streaming, threadId, urlThreadId, pendingFiles, queryClient, router]);

  const handleApprove = useCallback(async (msgId: string, partIndex: number) => {
    const token = getStoredToken();
    if (!token) return;

    // Mark approved immediately
    updateAssistantParts(msgId, (parts) => {
      const p = parts[partIndex];
      if (p && p.type === "approval") p.status = "approved";
      return parts;
    });

    awaitingApprovalRef.current = null;
    const controller = new AbortController();
    abortRef.current = controller;

    // Find the parts buffer from the message
    setMessages((prev) => {
      const msg = prev.find((m) => m.id === msgId && m.role === "assistant");
      if (!msg || msg.role !== "assistant") return prev;
      const parts = [...msg.parts];

      (async () => {
        try {
          await processEventStream(
            streamResume(token, threadId, "approved", controller.signal),
            msgId,
            parts,
            controller.signal,
          );
        } finally {
          setMessages((p) =>
            p.map((m) => (m.id === msgId && m.role === "assistant" ? { ...m, streaming: false } : m))
          );
          setStreaming(false);
        }
      })();

      return prev;
    });
  }, [threadId]);

  const handleDeny = useCallback(async (msgId: string, partIndex: number) => {
    const token = getStoredToken();
    if (!token) return;

    updateAssistantParts(msgId, (parts) => {
      const p = parts[partIndex];
      if (p && p.type === "approval") p.status = "denied";
      return parts;
    });

    awaitingApprovalRef.current = null;
    const controller = new AbortController();

    setMessages((prev) => {
      const msg = prev.find((m) => m.id === msgId && m.role === "assistant");
      if (!msg || msg.role !== "assistant") return prev;
      const parts = [...msg.parts];

      (async () => {
        try {
          await processEventStream(
            streamResume(token, threadId, "denied", controller.signal),
            msgId,
            parts,
            controller.signal,
          );
        } finally {
          setMessages((p) =>
            p.map((m) => (m.id === msgId && m.role === "assistant" ? { ...m, streaming: false } : m))
          );
          setStreaming(false);
        }
      })();

      return prev;
    });
  }, [threadId]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function newThread() {
    if (abortRef.current) abortRef.current.abort();
    setStreaming(false);
    setPendingFiles([]);
    // Navigating changes the URL thread id, which drives the history effect
    router.push(`/agent?s=${crypto.randomUUID()}`);
  }

  function removeFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) setPendingFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  }

  return (
    <div className="flex flex-col h-[calc(100vh-44px)]">
      {/* Message list */}
      <div className="relative flex-1 min-h-0">
        <div ref={scrollRef} onScroll={handleScroll} className="h-full overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-6 pb-4">
            {historyLoading && (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className={`h-12 ${i % 2 === 0 ? "w-3/4" : "w-1/2 ml-auto"}`} />
                ))}
              </div>
            )}

            {!historyLoading && messages.length === 0 && (
              <div className="flex flex-col items-center text-center gap-5 pt-16">
                <div className="w-11 h-11 rounded-xl bg-foreground text-background flex items-center justify-center text-base font-bold">
                  S
                </div>
                <div className="space-y-1">
                  <h2 className="text-[15px] font-semibold">How can I help with your finances?</h2>
                  <p className="text-[13px] text-muted-foreground max-w-sm">
                    Ask about your tax position, search for IRD updates, analyse documents, or manage your ledger.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="text-[12px] border border-border/70 rounded-full px-3.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-accent hover:border-border transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => (
              <div key={m.id} style={{ animation: "msg-in 0.18s ease-out both" }}>
                {m.role === "user" ? (
                  <UserBubble content={m.content} attachments={m.attachments} />
                ) : (
                  <AssistantBubble
                    parts={m.parts}
                    streaming={m.streaming}
                    onApprove={(partIndex) => handleApprove(m.id, partIndex)}
                    onDeny={(partIndex) => handleDeny(m.id, partIndex)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {showScrollBtn && (
          <div
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10"
            style={{ animation: "msg-in 0.15s ease-out both" }}
          >
            <button
              onClick={goToBottom}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-foreground text-background text-[12px] font-medium shadow-lg hover:bg-foreground/90 active:scale-95 transition-all"
            >
              <ArrowDown className="size-3" />
              Go to bottom
            </button>
          </div>
        )}
      </div>

      {/* Centered floating composer */}
      <div className="px-4 pb-4 pt-2 shrink-0">
        <div className="max-w-2xl mx-auto">
          {/* Quota-exceeded notice */}
          {quotaBlocked && (
            <div className="flex items-center justify-between gap-3 mb-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5">
              <p className="text-[12px] text-amber-900">
                You&apos;ve used all your AI messages this month. Upgrade to keep chatting.
              </p>
              <Link
                href="/settings"
                className="shrink-0 text-[12px] font-medium bg-foreground text-background rounded-md px-3 py-1.5 hover:bg-foreground/90 transition-colors"
              >
                Upgrade
              </Link>
            </div>
          )}

          {/* File chips above the box */}
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2 px-1">
              {pendingFiles.map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 text-[11px] bg-muted border border-border rounded-full px-2.5 py-0.5 text-foreground/70"
                >
                  {f.name}
                  <button
                    onClick={() => removeFile(i)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Composer box */}
          <div className="flex items-end gap-2 bg-card border border-border/70 rounded-2xl shadow-sm px-3 py-2.5 focus-within:border-border transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.txt,.csv,.png,.jpg,.jpeg,.xlsx"
              multiple
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={streaming || uploadingFiles}
              aria-label="Attach file"
              className="shrink-0 text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors pb-1"
            >
              {uploadingFiles ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Paperclip className="size-4" />
              )}
            </button>

            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your finances…"
              className="resize-none min-h-[36px] max-h-40 text-[13px] py-1.5 border-0 shadow-none focus-visible:ring-0 bg-transparent px-0 flex-1"
              rows={1}
              disabled={streaming}
            />

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={newThread}
                aria-label="New session"
                className="text-muted-foreground hover:text-foreground transition-colors pb-0.5"
                title="New session"
              >
                <Plus className="size-4" />
              </button>
              <Button
                onClick={send}
                disabled={streaming || !input.trim()}
                size="icon"
                className="h-8 w-8 rounded-xl"
                aria-label="Send"
              >
                {streaming ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Send className="size-3.5" />
                )}
              </Button>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
            Numbers from the deterministic engine · Write actions require your approval
          </p>
        </div>
      </div>
    </div>
  );
}
