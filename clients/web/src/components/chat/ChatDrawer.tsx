"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Loader2,
  Maximize2,
  Minimize2,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { AssistantMessage, UserBubble, type MessagePart } from "./ChatMessage";
import { streamAgent, streamResume, uploadAgentFile, type AgentEvent, type ApprovalAction } from "@/lib/stream-agent";
import { getStoredToken, useScroogePanel, PANEL_MIN_WIDTH } from "@/lib/store";
import { apiFetch } from "@/lib/api-fetch";
import { useAgentSessions, useDeleteSession } from "@/hooks/useAgentSessions";
import { cn } from "@/lib/utils";

type ChatMessage =
  | { id: string; role: "user"; content: string; attachments?: string[] }
  | { id: string; role: "assistant"; parts: MessagePart[]; streaming: boolean };

const SUGGESTIONS = [
  "What's my tax payable this year?",
  "Am I on track for FIRE?",
  "Where did I overspend last month?",
  "Explain my APIT credit",
];

const ACCEPT = ".pdf,.txt,.csv,.png,.jpg,.jpeg,.xlsx";

function truncate(s: string | null | undefined, n = 26): string {
  if (!s) return "Untitled";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function SessionDropdown({
  currentThreadId,
  onSelect,
  onNew,
}: {
  currentThreadId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  const { data: sessions = [] } = useAgentSessions();
  const { mutate: deleteSession } = useDeleteSession();
  const current = sessions.find((s) => s.thread_id === currentThreadId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="flex items-center gap-1 text-[12px] text-white/50 hover:text-white transition-colors max-w-44"
          />
        }
      >
        <span className="truncate">{current?.title ? truncate(current.title, 22) : "New chat"}</span>
        <ChevronDown className="size-3 shrink-0 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuItem onClick={onNew} className="gap-2 text-[12px]">
          <Plus className="size-3.5" /> New chat
        </DropdownMenuItem>
        {sessions.length > 0 && <DropdownMenuSeparator />}
        {sessions.slice(0, 8).map((s) => (
          <DropdownMenuItem
            key={s.thread_id}
            className={cn(
              "group flex items-center justify-between gap-2 text-[12px]",
              s.thread_id === currentThreadId && "font-medium"
            )}
            onClick={() => onSelect(s.thread_id)}
          >
            <span className="truncate flex-1">{truncate(s.title)}</span>
            <button
              type="button"
              aria-label="Delete session"
              className="shrink-0 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                deleteSession(s.thread_id);
                if (s.thread_id === currentThreadId) onNew();
              }}
            >
              <Trash2 className="size-3" />
            </button>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ChatDrawer() {
  const {
    isOpen,
    close,
    threadId,
    setThread,
    width,
    isFullPage,
    setWidth,
    toggleFullPage,
    pendingPrompt,
    consumePendingPrompt,
  } = useScroogePanel();
  const queryClient = useQueryClient();

  // Threads created in this panel — no history fetch needed for them.
  const freshRef = useRef<Set<string>>(new Set([threadId]));
  const liveThreadRef = useRef<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [quotaBlocked, setQuotaBlocked] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const awaitingApprovalRef = useRef<{ msgId: string; partIndex: number } | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const resumingRef = useRef(false);
  const atBottomRef = useRef(true);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // A CTA queued a question (dashboard pills) — put it in the composer.
  useEffect(() => {
    if (isOpen && pendingPrompt) {
      const t = setTimeout(() => {
        setInput(pendingPrompt);
        consumePendingPrompt();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [isOpen, pendingPrompt, consumePendingPrompt]);

  // Load history when the thread changes or the panel opens.
  useEffect(() => {
    if (!isOpen) return;
    if (threadId === liveThreadRef.current) return;

    liveThreadRef.current = null;
    if (awaitingApprovalRef.current) {
      abortRef.current?.abort();
      awaitingApprovalRef.current = null;
    }

    if (freshRef.current.has(threadId)) {
      const t = setTimeout(() => {
        setMessages([]);
        setStreaming(false);
        setHistoryLoading(false);
      }, 0);
      return () => clearTimeout(t);
    }

    const token = getStoredToken();
    if (!token) return;

    let cancelled = false;
    const t = setTimeout(() => {
      setMessages([]);
      setStreaming(false);
      setHistoryLoading(true);
    }, 0);

    type HistoryMsg =
      | { role: "user"; content: string }
      | { role: "assistant"; parts: MessagePart[] };

    apiFetch<{ messages: HistoryMsg[] }>("GET", `/agent/history/${threadId}`)
      .then(({ messages: history }) => {
        if (cancelled) return;
        setMessages(
          (history ?? []).map((m) =>
            m.role === "user"
              ? { id: crypto.randomUUID(), role: "user" as const, content: m.content }
              : { id: crypto.randomUUID(), role: "assistant" as const, parts: m.parts ?? [], streaming: false }
          )
        );
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [threadId, isOpen]);

  // ── Scroll ──────────────────────────────────────────────────────────────────

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && atBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // ── Stream processing (shared by send + resume) ─────────────────────────────

  async function processEventStream(
    eventIter: AsyncGenerator<AgentEvent>,
    msgId: string,
    parts: MessagePart[],
    signal: AbortSignal
  ): Promise<"done" | "awaiting_approval" | "quota"> {
    const textPart = () => {
      const last = parts[parts.length - 1];
      if (last && last.type === "text") return last;
      const p: Extract<MessagePart, { type: "text" }> = { type: "text", content: "" };
      parts.push(p);
      return p;
    };
    const subagentSection = (agent: string) => {
      const last = parts[parts.length - 1];
      if (last && last.type === "subagent_section" && last.agent === agent && last.active) return last;
      const s: Extract<MessagePart, { type: "subagent_section" }> = {
        type: "subagent_section",
        agent,
        parts: [],
        active: true,
      };
      parts.push(s);
      return s;
    };
    const flushSubagent = () => {
      const last = parts[parts.length - 1];
      if (last && last.type === "subagent_section") last.active = false;
    };
    const sync = () =>
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId && m.role === "assistant" ? { ...m, parts: [...parts] } : m))
      );

    for await (const event of eventIter) {
      if (signal.aborted) break;

      if (event.type === "token") {
        flushSubagent();
        textPart().content += event.content;
      } else if (event.type === "subagent_start") {
        subagentSection(event.agent);
      } else if (event.type === "subagent_end") {
        flushSubagent();
      } else if (event.type === "subagent_token") {
        const s = subagentSection(event.agent);
        const last = s.parts[s.parts.length - 1];
        if (last && last.type === "token") last.content += event.content;
        else s.parts.push({ type: "token", content: event.content });
      } else if (event.type === "tool_call") {
        const target = event.agent ? subagentSection(event.agent).parts : parts;
        target.push({ type: "tool_call", name: event.name, input: event.input, done: false });
      } else if (event.type === "tool_result") {
        const pool = event.agent
          ? ([...parts].reverse().find((p) => p.type === "subagent_section" && p.agent === event.agent) as
              | Extract<MessagePart, { type: "subagent_section" }>
              | undefined)?.parts ?? []
          : parts;
        for (let i = pool.length - 1; i >= 0; i--) {
          const p = pool[i];
          if (p.type === "tool_call" && p.name === event.name && !p.done) {
            p.done = true;
            p.output = String(event.output ?? "");
            break;
          }
        }
      } else if (event.type === "approval_required") {
        parts.push({ type: "approval", action: event.action as ApprovalAction, status: "pending" });
        awaitingApprovalRef.current = { msgId, partIndex: parts.length - 1 };
        sync();
        return "awaiting_approval";
      } else if (event.type === "quota_exceeded") {
        setQuotaBlocked(true);
        sync();
        return "quota";
      } else if (event.type === "error") {
        textPart().content += `\n\n_Error: ${event.message}_`;
        sync();
        break;
      } else if (event.type === "done") {
        break;
      }
      sync();
    }
    return "done";
  }

  // ── Send / resume ───────────────────────────────────────────────────────────

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    const token = getStoredToken();
    if (!token) return;

    let fileRefs: string[] = [];
    const fileNames = pendingFiles.map((f) => f.name);
    if (pendingFiles.length > 0) {
      setUploadingFiles(true);
      try {
        const results = await Promise.all(pendingFiles.map((f) => uploadAgentFile(token, f)));
        fileRefs = results.map((r) => r.file_ref);
      } catch {
        // continue without files
      } finally {
        setUploadingFiles(false);
        setPendingFiles([]);
      }
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      attachments: fileNames.length ? fileNames : undefined,
    };
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", parts: [], streaming: true }]);
    setInput("");
    setStreaming(true);
    liveThreadRef.current = threadId;
    atBottomRef.current = true;

    const controller = new AbortController();
    abortRef.current = controller;
    const parts: MessagePart[] = [];

    try {
      const result = await processEventStream(
        streamAgent(token, text, threadId, controller.signal, fileRefs.length ? fileRefs : undefined),
        assistantId,
        parts,
        controller.signal
      );
      if (result === "awaiting_approval") return;
      if (result === "quota") {
        setMessages((prev) => prev.filter((m) => m.id !== assistantId && m.id !== userMsg.id));
        setInput(text);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        if (!parts.some((p) => p.type === "text" && p.content)) {
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
        // Session titles are AI-generated after the stream ends.
        setTimeout(() => queryClient.invalidateQueries({ queryKey: ["agent-sessions"] }), 1800);
      }
    }
     
  }, [input, streaming, threadId, pendingFiles, queryClient]);

  const resumeDecision = useCallback(
    async (msgId: string, partIndex: number, decision: "approved" | "denied") => {
      const token = getStoredToken();
      if (!token || resumingRef.current) return;
      resumingRef.current = true;
      awaitingApprovalRef.current = null;

      const msg = messagesRef.current.find((m) => m.id === msgId && m.role === "assistant");
      const parts: MessagePart[] = msg && msg.role === "assistant" ? [...msg.parts] : [];
      const ap = parts[partIndex];
      if (ap && ap.type === "approval") parts[partIndex] = { ...ap, status: decision };
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId && m.role === "assistant" ? { ...m, parts: [...parts] } : m))
      );

      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);
      try {
        await processEventStream(streamResume(token, threadId, decision, controller.signal), msgId, parts, controller.signal);
      } finally {
        resumingRef.current = false;
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId && m.role === "assistant" ? { ...m, streaming: false } : m))
        );
        setStreaming(false);
      }
    },
     
    [threadId]
  );

  // ── Thread management ───────────────────────────────────────────────────────

  function handleNewThread() {
    abortRef.current?.abort();
    const id = crypto.randomUUID();
    freshRef.current.add(id);
    setThread(id);
    setMessages([]);
    setStreaming(false);
    setPendingFiles([]);
    setQuotaBlocked(false);
  }

  function handleSelectThread(id: string) {
    abortRef.current?.abort();
    setThread(id);
    setPendingFiles([]);
    setQuotaBlocked(false);
  }

  function handleResizeMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    const onMove = (ev: MouseEvent) => {
      setWidth(Math.max(PANEL_MIN_WIDTH, Math.min(window.innerWidth - 80, window.innerWidth - ev.clientX)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      suppressHydrationWarning
      className={cn(
        "fixed z-50 flex flex-col overflow-hidden bg-[#0A2540] text-white border-l border-white/10",
        "transition-transform duration-200 ease-in-out",
        isOpen ? "translate-x-0" : "translate-x-full",
        isFullPage ? "inset-0 md:pl-16" : "inset-y-0 right-0"
      )}
      style={!isFullPage ? { width } : undefined}
    >
      {!isFullPage && (
        <div
          aria-hidden
          className="absolute left-0 top-0 h-full w-2 cursor-col-resize z-10 group"
          onMouseDown={handleResizeMouseDown}
        >
          <div className="absolute left-0 top-0 h-full w-px bg-white/10 group-hover:bg-white/30 transition-colors" />
        </div>
      )}

      <div className={cn("flex flex-col h-full", isFullPage && "max-w-[720px] w-full mx-auto")}>
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <p className="text-[15px] font-semibold flex items-center gap-2 shrink-0">
              Salli AI <span className="size-1.5 rounded-full bg-[var(--status-success-text)]" />
            </p>
            <SessionDropdown currentThreadId={threadId} onSelect={handleSelectThread} onNew={handleNewThread} />
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleFullPage}
              aria-label={isFullPage ? "Dock panel" : "Expand to full page"}
              className="size-8 rounded-md hidden md:flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10"
            >
              {isFullPage ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="size-8 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {historyLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-9 w-2/3 ml-auto bg-white/10" />
              <Skeleton className="h-20 w-5/6 bg-white/10" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 pb-10">
              <div className="size-14 rounded-lg bg-white/10 flex items-center justify-center">
                <Sparkles className="size-6 text-[var(--status-success-text)]" />
              </div>
              <p className="text-base font-semibold">Ask about your money</p>
              <p className="text-[13px] text-white/60 max-w-60">
                Answers come from your real ledger — never guessed.
              </p>
              <div className="w-full max-w-xs space-y-2 mt-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setInput(s)}
                    className="w-full text-left rounded-md bg-white/[0.08] hover:bg-white/[0.14] px-3 py-2.5 text-[13px] text-white/90 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) =>
              m.role === "user" ? (
                <UserBubble key={m.id} content={m.content} attachments={m.attachments} />
              ) : (
                <AssistantMessage
                  key={m.id}
                  parts={m.parts}
                  streaming={m.streaming}
                  onApprove={(i) => resumeDecision(m.id, i, "approved")}
                  onDeny={(i) => resumeDecision(m.id, i, "denied")}
                />
              )
            )
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-white/10 p-3 shrink-0 space-y-2">
          {quotaBlocked && (
            <div className="flex items-center gap-2 rounded-md bg-[#B45309]/25 px-3 py-2 text-[12px] text-[#FCD34D]">
              <TriangleAlert className="size-3.5 shrink-0" />
              <span>
                Monthly AI messages used up ·{" "}
                <Link href="/settings?upgrade=1" className="font-semibold underline underline-offset-2" onClick={close}>
                  Upgrade
                </Link>
              </span>
            </div>
          )}
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {pendingFiles.map((f, i) => (
                <span
                  key={`${f.name}-${i}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px]"
                >
                  <Paperclip className="size-3" /> {truncate(f.name, 24)}
                  <button
                    type="button"
                    aria-label={`Remove ${f.name}`}
                    onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="text-white/50 hover:text-white"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className={cn("flex items-end gap-2 rounded-lg bg-white/[0.08] p-2", quotaBlocked && "opacity-40 pointer-events-none")}>
            <button
              type="button"
              aria-label="Attach file"
              onClick={() => fileInputRef.current?.click()}
              className="size-8 shrink-0 rounded-md flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10"
            >
              <Paperclip className="size-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) setPendingFiles((prev) => [...prev, ...files]);
                e.target.value = "";
              }}
            />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={Math.min(4, Math.max(1, input.split("\n").length))}
              placeholder="Ask about your money…"
              className="flex-1 resize-none bg-transparent text-[13px] text-white placeholder:text-white/40 outline-none py-1.5 max-h-32"
            />
            <button
              type="button"
              aria-label="Send"
              onClick={send}
              disabled={!input.trim() || streaming || uploadingFiles}
              className="size-8 shrink-0 rounded-md bg-[var(--status-success-text)] text-[#0A2540] flex items-center justify-center disabled:opacity-40 transition-opacity"
            >
              {streaming || uploadingFiles ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
          <p className="text-[10px] text-white/30 text-center">
            Answers come from your ledger &amp; the deterministic engine.
          </p>
        </div>
      </div>
    </div>
  );
}
