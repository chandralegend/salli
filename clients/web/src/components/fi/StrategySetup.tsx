"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/lib/api-client";
import { getStoredToken } from "@/lib/store";

type StrategyEvent =
  | { type: "status"; message: string }
  | { type: "done"; strategy: unknown }
  | { type: "error"; message: string };

/** First-run card: SSE strategy generation with a live status log. */
export function StrategySetup() {
  const qc = useQueryClient();
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function generate() {
    const token = getStoredToken();
    if (!token || running) return;
    setRunning(true);
    setError(null);
    setLog([]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${API_URL}/fi/strategy/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          for (const line of frame.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6)) as StrategyEvent;
              if (event.type === "status") setLog((prev) => [...prev, event.message]);
              else if (event.type === "done") {
                await qc.invalidateQueries({ queryKey: ["fi"] });
                return;
              } else if (event.type === "error") {
                setError(event.message);
                return;
              }
            } catch {
              // malformed frame — skip
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError("Strategy generation failed. Try again.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="max-w-[560px] mx-auto rounded-lg border bg-card p-10 text-center">
      <div className="size-14 rounded-lg bg-muted mx-auto flex items-center justify-center">
        <Sparkles className="size-7 text-muted-foreground" />
      </div>
      <h2 className="text-[22px] font-semibold mt-5">Generate your FIRE strategy</h2>
      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
        Salli analyzes your ledger, income mix, and risk appetite to design allocation buckets
        and a projection. Takes about 30 seconds.
      </p>
      <Button className="mt-6" onClick={generate} disabled={running}>
        {running ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Generating…
          </>
        ) : (
          "Generate strategy"
        )}
      </Button>
      {error && <p className="text-[13px] text-destructive mt-4">{error}</p>}
      {log.length > 0 && (
        <div className="mt-6 rounded-md bg-muted/60 border p-4 text-left font-mono text-xs text-muted-foreground space-y-1.5 max-h-40 overflow-y-auto">
          {log.map((line, i) => (
            <p key={i} className={i === log.length - 1 && running ? "text-foreground" : undefined}>
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
