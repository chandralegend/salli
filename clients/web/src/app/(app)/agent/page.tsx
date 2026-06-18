"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AgentMessage } from "@/components/AgentMessage";
import { streamAgent } from "@/lib/stream-agent";
import { getStoredToken } from "@/lib/store";
import { useSalliStore } from "@/lib/store";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

export default function AgentPage() {
  const { threadId, setThreadId } = useSalliStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    const token = getStoredToken();
    if (!token) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let accumulated = "";
      for await (const event of streamAgent(
        token,
        text,
        threadId,
        controller.signal
      )) {
        if (
          event.type === "token" ||
          event.type === "text" ||
          event.type === "content"
        ) {
          const chunk = String(event.payload ?? "");
          accumulated += chunk;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: accumulated, streaming: true }
                : m
            )
          );
        } else if (event.type === "done" || event.type === "end") {
          break;
        }
      }
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, streaming: false } : m
        )
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content:
                    "Sorry, I encountered an error. Please try again.",
                  streaming: false,
                }
              : m
          )
        );
      }
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, threadId]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function newThread() {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setThreadId(crypto.randomUUID());
    setStreaming(false);
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div>
          <h1 className="text-base font-semibold text-foreground">
            Tax Agent
          </h1>
          <p className="text-xs text-muted-foreground font-mono">{threadId}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={newThread}
          className="border-border text-muted-foreground hover:text-foreground gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          New thread
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-4">
        {messages.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-20">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary text-xl font-semibold font-mono">
                S
              </span>
            </div>
            <h2 className="text-base font-semibold text-foreground">
              How can I help with your taxes?
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Ask about your tax position, available deductions, or how to
              interpret your IRD return.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {[
                "What is my tax payable for YA 2025/26?",
                "How does APIT work?",
                "What deductions can I claim?",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs bg-secondary text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-full border border-border transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <AgentMessage
            key={m.id}
            role={m.role}
            content={m.content}
            streaming={m.streaming}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-border bg-card">
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your taxes… (Enter to send, Shift+Enter for new line)"
            className="resize-none bg-secondary border-border min-h-[52px] max-h-32"
            rows={1}
            disabled={streaming}
          />
          <Button
            onClick={send}
            disabled={streaming || !input.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 h-[52px] w-[52px] p-0 shrink-0"
          >
            {streaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2 max-w-3xl mx-auto">
          Agent responses are informational only. Tax numbers come from the
          deterministic engine, not the LLM.
        </p>
      </div>
    </div>
  );
}
