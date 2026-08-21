import { useMemo } from "react";

import type { AssistantPart } from "./useAgentChat";
import { getToolLabel } from "@/lib/toolLabels";

export type ActivityRow = {
  key: string;
  label: string;
  status: string;
  state: "running" | "complete";
  agent?: string;
};

/**
 * Derives human-readable activity rows from one assistant message's parts.
 * "queued"/"failed" states aren't representable from the current SSE wire
 * protocol (tool_call only ever arrives once a call has started, and
 * tool_result carries no success/failure flag) — rather than fabricate a
 * signal that isn't really there, every row is either "running" or "complete".
 */
export function useToolActivity(parts: AssistantPart[]) {
  return useMemo(() => {
    const rows: ActivityRow[] = [];
    parts.forEach((p, i) => {
      if (p.kind !== "tool_call") return;
      const row: ActivityRow = {
        key: `${p.name}-${i}`,
        ...getToolLabel(p.name),
        state: p.done ? "complete" : "running",
        agent: p.agent,
      };
      rows.push(row);
    });

    const hasFinalText = parts.some((p) => p.kind === "text" && p.content.trim().length > 0);
    // Once the assistant's actual answer has started arriving, the activity
    // rows collapse into a compact summary rather than lingering — never a
    // permanent "thinking" panel once there's real content to read.
    const collapsed = rows.length > 0 && hasFinalText;

    return { rows, collapsed, hasFinalText };
  }, [parts]);
}
