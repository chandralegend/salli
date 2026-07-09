"use client";

import { useState, useEffect, useRef } from "react";
import { API_URL } from "@/lib/api-client";
import { getStoredToken } from "@/lib/store";

type Props = {
  isRefresh?: boolean;
  onComplete: () => void;
};

export function StrategySetup({ isRefresh = false, onComplete }: Props) {
  const [generating, setGenerating] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function startGeneration() {
    setGenerating(true);
    setMessages([]);
    setError(null);

    const token = getStoredToken();
    abortRef.current = new AbortController();

    try {
      const res = await fetch(`${API_URL}/fi/strategy/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "status") {
              setMessages((prev) => [...prev, event.message]);
            } else if (event.type === "done") {
              onComplete();
              return;
            } else if (event.type === "error") {
              setError(event.message || "Generation failed");
              return;
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError(e instanceof Error ? e.message : "Generation failed");
      }
    } finally {
      setGenerating(false);
    }
  }

  if (generating) {
    return (
      <div className="flex items-center justify-center min-h-[560px]">
        <div className="max-w-[420px] w-full">
          <div className="flex items-center gap-3.5 mb-9">
            <div
              className="w-9 h-9 shrink-0 rounded-full animate-spin"
              style={{ border: "3px solid #E8FC85", borderTopColor: "transparent" }}
            />
            <h2 className="text-[18px] font-extrabold tracking-[-0.03em]">
              Generating your FIRE strategy…
            </h2>
          </div>
          <div className="flex flex-col gap-2">
            {messages.map((m, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-[13px] bg-card rounded-[14px]"
              >
                <div
                  className="w-[22px] h-[22px] rounded-[7px] flex items-center justify-center shrink-0"
                  style={{ background: "#E8FC85" }}
                >
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="#181816" strokeWidth="2.5">
                    <polyline points="1.5 5.5 4.5 8.5 9.5 2" />
                  </svg>
                </div>
                <span className="text-[13.5px] font-semibold">{m}</span>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="flex items-center gap-3 px-4 py-[13px] bg-card rounded-[14px] animate-pulse">
                <div className="w-[22px] h-[22px] rounded-[7px] bg-muted shrink-0" />
                <div className="h-3 bg-muted rounded flex-1" />
              </div>
            )}
          </div>
          {error && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[560px]">
      <div className="max-w-[500px] w-full text-center">
        <div
          className="flex items-center justify-center mx-auto mb-8"
          style={{ width: 88, height: 88, background: "#E8FC85", borderRadius: 28 }}
        >
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#181816" strokeWidth="2.2">
            <polyline points="4 30 12 22 17 26 26 16" />
            <polyline points="23 16 26 16 26 19" />
          </svg>
        </div>
        <h2 className="text-[30px] font-black tracking-[-0.05em] mb-2.5">
          {isRefresh ? "Refresh your FIRE strategy" : "Generate your FIRE strategy"}
        </h2>
        <p className="text-[14px] text-[#7DA6A9] leading-[1.7] mb-7 max-w-[400px] mx-auto">
          {isRefresh
            ? "Scrooge re-analyses your current income, expenses, and goals to evolve your strategy — preserving decisions that are still sound."
            : "Scrooge's finance sub-agent analyses your income, expenses, net worth, goals, and risk appetite to produce a personalised FIRE roadmap."}
        </p>
        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] text-rose-700">
            {error}
          </div>
        )}
        <button
          onClick={startGeneration}
          className="mb-3 cursor-pointer transition-colors"
          style={{
            padding: "15px 40px",
            background: "#010001",
            color: "#fff",
            border: "none",
            borderRadius: 999,
            fontSize: 16,
            fontWeight: 800,
            fontFamily: "inherit",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#1a1a1a")}
          onMouseOut={(e) => (e.currentTarget.style.background = "#010001")}
        >
          {isRefresh ? "Refresh My Strategy" : "Generate My Strategy"}
        </button>
        <p className="text-[12.5px] text-muted-foreground">
          Takes 15–60 seconds. Reads real ledger data — no guesses.
        </p>
      </div>
    </div>
  );
}
